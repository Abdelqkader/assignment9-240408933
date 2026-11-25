export default function BookItem({ book }) {
  return (
    <li className={book.read ? 'book read' : 'book'}>
      <div className="info">
        <strong>{book.title}</strong>
        <span>{book.author} · {book.year} · <span className="tag">{book.genre}</span></span>
      </div>
      <div className="actions">
        {book.read ? 'Read' : 'Not read'} · {book.rating === null ? 'no rating' : '★'.repeat(book.rating)}
      </div>
    </li>
  );
}
