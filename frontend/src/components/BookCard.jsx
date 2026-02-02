import { updateBookStatus, deleteBook } from "../api";

function BookCard({ book, onUpdate }) {
  const placeholder =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/1280px-Placeholder_view_vector.svg.png";

  const handleToggleStatus = async () => {
    const newStatus = book.status === "finished" ? "to-read" : "finished";
    try {
      await updateBookStatus(book.id, newStatus);
      onUpdate();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this book?")) return;
    try {
      await deleteBook(book.id);
      onUpdate();
    } catch (err) {
      alert("Failed to delete book");
    }
  };

  return (
    <div className="book-card">
      <div className="cover-wrapper">
        <img
          className="book-cover"
          src={book.cover || placeholder}
          alt={book.title}
          onError={(e) => (e.target.src = placeholder)}
        />
        {book.status === "finished" && (
          <img
            className="checkmark"
            src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Bradelidu3.png"
            alt="Finished"
          />
        )}
      </div>
      <div className="book-title">{book.title}</div>
      <div className="book-author">{book.author}</div>
      <div className="book-actions">
        <button className="delete-btn" onClick={handleDelete}>
          Delete
        </button>
        <button className="finish-btn" onClick={handleToggleStatus}>
          {book.status === "finished" ? "Mark To-Read" : "Mark Finished"}
        </button>
      </div>
    </div>
  );
}

export default BookCard;