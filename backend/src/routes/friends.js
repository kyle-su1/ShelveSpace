import express from "express";
import pool from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { getSocketId } from "../socket.js";

const router = express.Router();

// GET /friends - list accepted friends
router.get("/", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email
       FROM friendships f
       JOIN users u ON (
         CASE 
           WHEN f.user_id = $1 THEN f.friend_id = u.id
           ELSE f.user_id = u.id
         END
       )
       WHERE (f.user_id = $1 OR f.friend_id = $1)
         AND f.status = 'accepted'`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

// GET /friends/requests - list pending requests received
router.get("/requests", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.id, f.user_id, u.username, u.email, f.created_at
       FROM friendships f
       JOIN users u ON f.user_id = u.id
       WHERE f.friend_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch friend requests" });
  }
});

// GET /friends/sent - list pending requests sent
router.get("/sent", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.id, f.friend_id, u.username, u.email, f.created_at
       FROM friendships f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sent requests" });
  }
});

// GET /friends/search?q=... - search users by username
router.get("/search", authenticate, async (req, res) => {
  const q = (req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({ error: "Search query required" });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, email
       FROM users
       WHERE username ILIKE $1 AND id != $2
       LIMIT 10`,
      [`%${q}%`, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

// POST /friends/request - send friend request
router.post("/request", authenticate, async (req, res) => {
  const { friendId } = req.body;

  if (!friendId) {
    return res.status(400).json({ error: "friendId required" });
  }

  if (friendId === req.user.id) {
    return res.status(400).json({ error: "Cannot add yourself" });
  }

  try {
    // Check if user exists
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [friendId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if friendship already exists (in either direction)
    const existing = await pool.query(
      `SELECT * FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) 
          OR (user_id = $2 AND friend_id = $1)`,
      [req.user.id, friendId]
    );

    if (existing.rows.length > 0) {
      const friendship = existing.rows[0];
      if (friendship.status === "accepted") {
        return res.status(400).json({ error: "Already friends" });
      }
      if (friendship.status === "pending") {
        return res.status(400).json({ error: "Request already pending" });
      }
    }

    // Create friend request
    const result = await pool.query(
      `INSERT INTO friendships (user_id, friend_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [req.user.id, friendId]
    );

    // Emit real-time notification to the friend
    const io = req.app.get("io");
    const targetSocketId = getSocketId(friendId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("friend_request_received", {
        from: req.user.username,
        friendshipId: result.rows[0].id,
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send request" });
  }
});

// PATCH /friends/:id/accept - accept friend request
router.patch("/:id/accept", authenticate, async (req, res) => {
  const requestId = Number(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE friendships
       SET status = 'accepted'
       WHERE id = $1 AND friend_id = $2 AND status = 'pending'
       RETURNING *`,
      [requestId, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Notify the original requester that their request was accepted
    const io = req.app.get("io");
    const requesterSocketId = getSocketId(result.rows[0].user_id);
    if (requesterSocketId) {
      io.to(requesterSocketId).emit("friend_request_accepted", {
        by: req.user.username,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to accept request" });
  }
});

// PATCH /friends/:id/reject - reject friend request
router.patch("/:id/reject", authenticate, async (req, res) => {
  const requestId = Number(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE friendships
       SET status = 'rejected'
       WHERE id = $1 AND friend_id = $2 AND status = 'pending'
       RETURNING *`,
      [requestId, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reject request" });
  }
});

// DELETE /friends/:id - remove friend
router.delete("/:id", authenticate, async (req, res) => {
  const friendId = Number(req.params.id);

  try {
    const result = await pool.query(
      `DELETE FROM friendships
       WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
         AND status = 'accepted'`,
      [req.user.id, friendId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Friendship not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove friend" });
  }
});

export default router;