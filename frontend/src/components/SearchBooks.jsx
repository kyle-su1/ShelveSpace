import { useState } from "react";
import { searchBooks, addBook } from "../api";

function SearchBooks({ onBookAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setError("");

    try {
      const data = await searchBooks(query.trim());
      setResults(data);
    } catch (err) {
      setError("Search failed");
    }
  };

  const handleAdd = async (book) => {
    try {
      await addBook(
        book.title,
        book.authors?.join(", ") || "Unknown",
        book.cover || ""
      );
      onBookAdded();
      setQuery("");
      setResults([]);
    } catch (err) {
      alert("Failed to add book");
    }
  };

  return (
    <div className="search-books">
      <div className="search-input-wrapper">
        <input
          type="text"
          placeholder="Search books..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="search-results">
        {results.map((book, index) => (
          <div key={index} className="search-card">
            <img
              src={book.cover || "https://via.placeholder.com/128x192?text=No+Cover"}
              alt={book.title}
            />
            <div>
              <strong>{book.title}</strong>
              <p>{book.authors?.join(", ") || "Unknown"}</p>
              <button onClick={() => handleAdd(book)}>Add</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SearchBooks;