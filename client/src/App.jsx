import { useEffect, useState } from 'react';
import * as api from './api/books.js';
import BookList from './components/BookList.jsx';
import StatsPanel from './components/StatsPanel.jsx';

export default function App() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError('');

    api
      .getBooks({}, controller.signal)
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
  }, []);

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
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Reading List</h1>
        <p>A React client for my Express REST API (Assignment 9).</p>
      </header>

      <StatsPanel stats={stats} error={statsError} />

      <BookList books={books} loading={loading} error={listError} />
    </div>
  );
}
