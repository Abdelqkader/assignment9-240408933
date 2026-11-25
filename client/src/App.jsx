import { useEffect, useState } from 'react';
import * as api from './api/books.js';
import Controls from './components/Controls.jsx';
import BookList from './components/BookList.jsx';
import BookForm from './components/BookForm.jsx';
import StatsPanel from './components/StatsPanel.jsx';

const START_FILTERS = { q: '', genre: '', read: '', sort: '', order: 'asc' };

export default function App() {
  const [filters, setFilters] = useState(START_FILTERS);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');

  // Increased after every successful change, so the list and the stats
  // are requested again from the server.
  const [version, setVersion] = useState(0);

  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  // Book list: a new request every time the filters change.
  // The cleanup aborts the previous request, so an old (slow) response can
  // never overwrite the list of a newer request.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError('');

    api
      .getBooks(filters, controller.signal)
      .then((data) => {
        setBooks(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setListError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [filters, version]);

  // Statistics: loaded at the start and after every successful change.
  useEffect(() => {
    const controller = new AbortController();
    api
      .getStats(controller.signal)
      .then((data) => {
        setStats(data);
        setStatsError('');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setStatsError(err.message);
      });
    return () => controller.abort();
  }, [version]);

  function refresh() {
    setVersion((v) => v + 1);
  }

  // Replaces one book in the list with the version the server sent back
  // (a new array, the old one is not changed).
  function replaceInList(saved) {
    setBooks((prev) => prev.map((book) => (book.id === saved.id ? saved : book)));
  }

  async function handleAdd(data) {
    await api.createBook(data); // throws with the server's message on 400/409
    refresh();
  }

  async function handleEdit(data) {
    const saved = await api.replaceBook(editing.id, data);
    replaceInList(saved);
    setEditing(null);
    refresh();
  }

  // Runs one row action (PATCH or DELETE) and shows the server's error if it fails.
  async function runAction(book, action) {
    setBusyId(book.id);
    setActionError('');
    try {
      await action();
      refresh();
    } catch (err) {
      setActionError(`"${book.title}": ${err.message}`);
    } finally {
      setBusyId(null);
    }
  }

  function handleToggleRead(book) {
    runAction(book, async () => {
      const saved = await api.updateBook(book.id, { read: !book.read });
      replaceInList(saved);
    });
  }

  function handleRate(book, rating) {
    runAction(book, async () => {
      const saved = await api.updateBook(book.id, { rating });
      replaceInList(saved);
    });
  }

  function handleDelete(book) {
    if (!window.confirm(`Delete "${book.title}"?`)) return;
    runAction(book, async () => {
      await api.deleteBook(book.id);
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
      if (editing && editing.id === book.id) setEditing(null);
    });
  }

  return (
    <div className="app">
      <header>
        <h1>Reading List</h1>
        <p>A React client for my Express REST API (Assignment 9).</p>
      </header>

      <StatsPanel stats={stats} error={statsError} />

      <Controls filters={filters} onChange={setFilters} />

      {actionError && (
        <p className="error banner">
          {actionError}
          <button type="button" onClick={() => setActionError('')}>×</button>
        </p>
      )}

      <main className="layout">
        <BookList
          books={books}
          loading={loading}
          error={listError}
          busyId={busyId}
          onToggleRead={handleToggleRead}
          onRate={handleRate}
          onEdit={setEditing}
          onDelete={handleDelete}
        />

        <aside>
          {editing ? (
            <BookForm key={editing.id} book={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />
          ) : (
            <BookForm key="new" onSubmit={handleAdd} />
          )}
        </aside>
      </main>
    </div>
  );
}
