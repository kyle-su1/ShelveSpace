import { useState } from "react";
import { addBook } from "../api";

function AddBookForm({ onBookAdded }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [cover, setCover] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !author.trim()) {
      setError("Title and author are required");
      return;
    }

    try {
      const data = await addBook(title.trim(), author.trim(), cover.trim());
      if (data.error) {
        setError(data.error);
        return;
      }
      setTitle("");
      setAuthor("");
      setCover("");
      onBookAdded();
    } catch (err) {
      setError("Failed to add book");
    }
  };

  return (
    <form className="add-book-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Author"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        required
      />
      <input
        type="url"
        placeholder="Cover image URL (optional)"
        value={cover}
        onChange={(e) => setCover(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Add Book</button>
    </form>
  );
}

export default AddBookForm;