export default function BookItem({ book, busy, onToggleRead, onRate, onEdit, onDelete }) {
  return (
    <li className={book.read ? 'book read' : 'book'}>
      <div className="info">
        <strong>{book.title}</strong>
        <span>{book.author} · {book.year} · <span className="tag">{book.genre}</span></span>
      </div>

      <div className="actions">
        <label className="inline">
          <input type="checkbox" checked={book.read} disabled={busy} onChange={() => onToggleRead(book)} />
          Read
        </label>

        <select
          value={book.rating === null ? '' : book.rating}
          disabled={busy || !book.read}
          title={book.read ? 'Rate this book' : 'Mark the book as read to rate it'}
          onChange={(e) => onRate(book, e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">No rating</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{'★'.repeat(n)}</option>
          ))}
        </select>

        <button type="button" disabled={busy} onClick={() => onEdit(book)}>Edit</button>
        <button type="button" className="danger" disabled={busy} onClick={() => onDelete(book)}>Delete</button>
      </div>
    </li>
  );
}
