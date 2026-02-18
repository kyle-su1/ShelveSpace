import express from "express";
import pool from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { getSocketId } from "../socket.js";

const router = express.Router();

// GET /recommendations/inbox - books sent to me
router.get("/inbox", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.title, r.author, r.cover, r.message, r.status, r.created_at,
              u.id AS sender_id, u.username AS sender_username
       FROM recommendations r
       JOIN users u ON r.sender_id = u.id
       WHERE r.receiver_id = $1 AND r.status = 'pending'
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch inbox" });
  }
});

// GET /recommendations/sent - books I sent to others
router.get("/sent", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.title, r.author, r.cover, r.message, r.status, r.created_at,
              u.id AS receiver_id, u.username AS receiver_username
       FROM recommendations r
       JOIN users u ON r.receiver_id = u.id
       WHERE r.sender_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sent recommendations" });
  }
});

// POST /recommendations - send a book recommendation
router.post("/", authenticate, async (req, res) => {
  const { receiverId, title, author, cover, message } = req.body;

  if (!receiverId || !title || !author) {
    return res.status(400).json({ error: "receiverId, title, and author required" });
  }

  if (receiverId === req.user.id) {
    return res.status(400).json({ error: "Cannot send recommendation to yourself" });
  }

  try {
    // Check if receiver exists
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [receiverId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if they are friends
    const friendCheck = await pool.query(
      `SELECT * FROM friendships
       WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
         AND status = 'accepted'`,
      [req.user.id, receiverId]
    );

    if (friendCheck.rows.length === 0) {
      return res.status(403).json({ error: "You can only send recommendations to friends" });
    }

    // Create recommendation
    const result = await pool.query(
      `INSERT INTO recommendations (sender_id, receiver_id, title, author, cover, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, receiverId, title, author, cover || null, message || null]
    );

    // Emit real-time notification to the receiver
    const io = req.app.get("io");
    const targetSocketId = getSocketId(receiverId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("recommendation_received", {
        from: req.user.username,
        title,
        recommendationId: result.rows[0].id,
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send recommendation" });
  }
});

// PATCH /recommendations/:id/accept - add book to my list
router.patch("/:id/accept", authenticate, async (req, res) => {
  const recId = Number(req.params.id);

  try {
    // Get the recommendation
    const recResult = await pool.query(
      `SELECT * FROM recommendations WHERE id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [recId, req.user.id]
    );

    if (recResult.rows.length === 0) {
      return res.status(404).json({ error: "Recommendation not found" });
    }

    const rec = recResult.rows[0];

    // Check if book already exists in user's list
    const dupCheck = await pool.query(
      `SELECT * FROM books WHERE user_id = $1 AND title = $2 AND author = $3`,
      [req.user.id, rec.title, rec.author]
    );

    if (dupCheck.rows.length > 0) {
      // Just mark as accepted, don't add duplicate
      await pool.query(
        `UPDATE recommendations SET status = 'accepted' WHERE id = $1`,
        [recId]
      );
      return res.json({ message: "Book already in your list", alreadyExists: true });
    }

    // Add book to user's list
    await pool.query(
      `INSERT INTO books (user_id, title, author, cover) VALUES ($1, $2, $3, $4)`,
      [req.user.id, rec.title, rec.author, rec.cover]
    );

    // Update recommendation status
    await pool.query(
      `UPDATE recommendations SET status = 'accepted' WHERE id = $1`,
      [recId]
    );

    res.json({ message: "Book added to your list", added: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to accept recommendation" });
  }
});

// PATCH /recommendations/:id/dismiss - dismiss without adding
router.patch("/:id/dismiss", authenticate, async (req, res) => {
  const recId = Number(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE recommendations
       SET status = 'dismissed'
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
       RETURNING *`,
      [recId, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Recommendation not found" });
    }

    res.json({ message: "Recommendation dismissed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to dismiss recommendation" });
  }
});

export default router;