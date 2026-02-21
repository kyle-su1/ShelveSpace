import express from "express";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import pool from "../db.js";

const router = express.Router();

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION,
});

const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

// POST /auth/signup
router.post("/signup", async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    // 1. Register user in Cognito
    const signUpResult = await cognitoClient.send(
      new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "preferred_username", Value: username },
        ],
      })
    );

    const cognitoSub = signUpResult.UserSub;

    // 2. Auto-confirm the user (skip email verification)
    await cognitoClient.send(
      new AdminConfirmSignUpCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      })
    );

    // 3. Insert user into our database (or link existing user to Cognito)
    const result = await pool.query(
      `INSERT INTO users (email, username, cognito_sub) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET cognito_sub = $3, username = $2
       RETURNING id, email, username`,
      [email, username, cognitoSub]
    );

    const user = result.rows[0];

    // 4. Log the user in immediately by calling Cognito auth
    const authResult = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      })
    );

    const tokens = authResult.AuthenticationResult;

    res.status(201).json({
      user: { id: user.id, email: user.email, username: user.username },
      token: tokens.IdToken,
      accessToken: tokens.AccessToken,
      refreshToken: tokens.RefreshToken,
    });
  } catch (err) {
    console.error("Signup error:", err);

    if (err.name === "UsernameExistsException") {
      return res.status(409).json({ error: "Email already exists" });
    }
    if (err.name === "InvalidPasswordException") {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: "Signup failed" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    // 1. Authenticate with Cognito
    const authResult = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      })
    );

    const tokens = authResult.AuthenticationResult;

    // 2. Decode the IdToken to get the sub
    const payload = JSON.parse(
      Buffer.from(tokens.IdToken.split(".")[1], "base64").toString()
    );

    // 3. Look up user in our database by cognito_sub
    let userResult = await pool.query(
      "SELECT id, email, username FROM users WHERE cognito_sub = $1",
      [payload.sub]
    );

    // If user doesn't exist in DB by cognito_sub, find by email or create
    if (userResult.rows.length === 0) {
      userResult = await pool.query(
        `INSERT INTO users (email, username, cognito_sub) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET cognito_sub = $3
         RETURNING id, email, username`,
        [payload.email, payload["preferred_username"] || payload.email, payload.sub]
      );
    }

    const user = userResult.rows[0];

    res.json({
      user: { id: user.id, email: user.email, username: user.username },
      token: tokens.IdToken,
      accessToken: tokens.AccessToken,
      refreshToken: tokens.RefreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);

    if (err.name === "NotAuthorizedException") {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (err.name === "UserNotFoundException") {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.status(500).json({ error: "Login failed" });
  }
});

// POST /auth/refresh
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken required" });
  }

  try {
    const authResult = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      })
    );

    const tokens = authResult.AuthenticationResult;

    res.json({
      token: tokens.IdToken,
      accessToken: tokens.AccessToken,
    });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(401).json({ error: "Token refresh failed" });
  }
});

export default router;