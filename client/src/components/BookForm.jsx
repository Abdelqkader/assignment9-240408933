import { useState } from 'react';
import { GENRES } from './genres.js';

const EMPTY = { title: '', author: '', year: '', genre: 'fiction', read: false, rating: '' };

function toForm(book) {
  if (!book) return EMPTY;
  return {
    title: book.title,
    author: book.author,
    year: String(book.year),
    genre: book.genre,
    read: book.read,
    rating: book.rating === null ? '' : String(book.rating),
  };
}

// Used for both "add" (POST) and "edit" (PUT). The parent decides which
// request to send in onSubmit. The form only does light checks; the real
// validation is on the server and its message is shown here.
export default function BookForm({ book, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => toForm(book));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        title: form.title,
        author: form.author,
        year: form.year === '' ? null : Number(form.year),
        genre: form.genre,
        read: form.read,
        rating: form.rating === '' ? null : Number(form.rating),
      });
      if (!book) setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="book-form" onSubmit={handleSubmit}>
      <h2>{book ? `Edit "${book.title}"` : 'Add a book'}</h2>

      <label>
        Title
        <input value={form.title} onChange={(e) => update('title', e.target.value)} required maxLength={100} />
      </label>
      <label>
        Author
        <input value={form.author} onChange={(e) => update('author', e.target.value)} required maxLength={100} />
      </label>
      <label>
        Year
        <input type="number" value={form.year} onChange={(e) => update('year', e.target.value)} required />
      </label>
      <label>
        Genre
        <select value={form.genre} onChange={(e) => update('genre', e.target.value)}>
          {GENRES.map((genre) => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
      </label>
      <label className="inline">
        <input type="checkbox" checked={form.read} onChange={(e) => update('read', e.target.checked)} />
        Read
      </label>
      <label>
        Rating
        <select value={form.rating} onChange={(e) => update('rating', e.target.value)}>
          <option value="">No rating</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      {error && <p className="error">{error}</p>}

      <div className="buttons">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : book ? 'Save changes' : 'Add book'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
        )}
      </div>
    </form>
  );
}
