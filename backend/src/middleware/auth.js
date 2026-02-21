import { CognitoJwtVerifier } from "aws-jwt-verify";
import pool from "../db.js";

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "id",
  clientId: process.env.COGNITO_CLIENT_ID,
});

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify the Cognito JWT (checks signature, expiration, issuer, audience)
    const payload = await verifier.verify(token);

    // Look up the internal user ID from our database
    const result = await pool.query(
      "SELECT id, email, username FROM users WHERE cognito_sub = $1",
      [payload.sub]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "User not found in database" });
    }

    req.user = result.rows[0]; // Contains { id, email, username }
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}