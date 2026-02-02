import { useState, useEffect } from "react";
import { getBooks } from "../api";
import BookList from "../components/BookList";
import AddBookForm from "../components/AddBookForm";
import SearchBooks from "../components/SearchBooks";

function Home() {
  const [books, setBooks] = useState([]);
  const [mode, setMode] = useState("manual"); // "manual" or "search"

  const loadBooks = async () => {
    try {
      const data = await getBooks();
      setBooks(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  return (
    <div className="home">
      <section className="add-book-section">
        <h2>Add Book</h2>
        <div className="modes">
          <button
            className={mode === "manual" ? "active" : ""}
            onClick={() => setMode("manual")}
          >
            Manual
          </button>
          <button
            className={mode === "search" ? "active" : ""}
            onClick={() => setMode("search")}
          >
            Search
          </button>
        </div>

        {mode === "manual" ? (
          <AddBookForm onBookAdded={loadBooks} />
        ) : (
          <SearchBooks onBookAdded={loadBooks} />
        )}
      </section>

      <section className="bookshelf-section">
        <h2>My Books</h2>
        <BookList books={books} onUpdate={loadBooks} />
      </section>
    </div>
  );
}

export default Home;