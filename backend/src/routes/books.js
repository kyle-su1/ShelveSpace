import express from "express";
import pool from "../db.js";
import { authenticate } from "../middleware/auth.js";

const GOOGLE_BOOKS_BASE = "https://www.googleapis.com/books/v1/volumes";

const router = express.Router();

// GET /books/search?q=... (public)
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").toString().trim();

  if (!q) {
    return res.status(400).json({ error: "Missing query parameter: q" });
  }

  try {
    const key = process.env.GOOGLE_BOOKS_API_KEY;
    const url =
      `${GOOGLE_BOOKS_BASE}?q=${encodeURIComponent(q)}` +
      `&maxResults=12&printType=books` +
      (key ? `&key=${encodeURIComponent(key)}` : "");

    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(502).json({ error: "Google Books request failed" });
    }

    const data = await resp.json();
    const items = Array.isArray(data.items) ? data.items : [];
    const results = items.map((item) => {
      const info = item.volumeInfo || {};
      const imageLinks = info.imageLinks || {};
      let cover = imageLinks.thumbnail || imageLinks.smallThumbnail || null;
      if (cover && cover.startsWith("http://")) cover = cover.replace("http://", "https://");
      return {
        googleId: item.id || null,
        title: info.title || "Untitled",
        authors: Array.isArray(info.authors) ? info.authors : [],
        cover,
        publishedDate: info.publishedDate || null,
      };
    });

    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search error" });
  }
});

// GET /books (protected - only user's books)
router.get("/", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM books WHERE user_id = $1 ORDER BY id ASC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /books (protected)
router.post("/", authenticate, async (req, res) => {
  const { title, author, cover } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: "Title and author required" });
  }

  try {
    const dup = await pool.query(
      "SELECT * FROM books WHERE title = $1 AND author = $2 AND user_id = $3",
      [title, author, req.user.id]
    );

    if (dup.rows.length > 0) {
      return res.status(400).json({ error: "Duplicate book" });
    }

    const result = await pool.query(
      "INSERT INTO books (user_id, title, author, cover) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.id, title, author, cover || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// PATCH /books/:id (protected)
router.patch("/:id", authenticate, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  if (!["to-read", "finished"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const result = await pool.query(
      "UPDATE books SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [status, id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /books/:id (protected)
router.delete("/:id", authenticate, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM books WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
