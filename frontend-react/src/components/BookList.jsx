import BookCard from "./BookCard";

function BookList({ books, onUpdate }) {
  if (books.length === 0) {
    return <p className="empty-message">No books yet. Add one above!</p>;
  }

  return (
    <div className="book-list">
      {books.map((book) => (
        <BookCard key={book.id} book={book} onUpdate={onUpdate} />
      ))}
    </div>
  );
}

export default BookList;