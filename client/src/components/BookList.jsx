import BookItem from './BookItem.jsx';

export default function BookList({ books, loading, error, busyId, ...handlers }) {
  if (loading) {
    return <p className="state">Loading books…</p>;
  }
  if (error) {
    return <p className="state error">Could not load books: {error}</p>;
  }
  if (books.length === 0) {
    return <p className="state">No books match these filters.</p>;
  }

  return (
    <ul className="book-list">
      {books.map((book) => (
        <BookItem key={book.id} book={book} busy={busyId === book.id} {...handlers} />
      ))}
    </ul>
  );
}
