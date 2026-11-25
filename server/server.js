import express from 'express';
import cors from 'cors';
import * as store from './booksStore.js';
import { parseId, validateBook, validateQuery } from './validate.js';

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ---------- Middleware ----------

// Only the client's exact origin may call the API from a browser.
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    exposedHeaders: ['Location', 'X-Total-Count'],
  }),
);

// Must come before the routes, otherwise req.body is undefined.
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ---------- Helpers ----------

function compareBooks(field, direction) {
  return (a, b) => {
    if (field === 'rating') {
      // Books without a rating always go last, in both directions.
      if (a.rating === null && b.rating === null) return 0;
      if (a.rating === null) return 1;
      if (b.rating === null) return -1;
      return (a.rating - b.rating) * direction;
    }
    if (field === 'year') {
      return (a.year - b.year) * direction;
    }
    return a[field].localeCompare(b[field], undefined, { sensitivity: 'base' }) * direction;
  };
}

// Sends 400 (and returns null) when :id is not a positive integer.
function getIdOr400(req, res) {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: `Book id must be a positive integer, got "${req.params.id}"` });
    return null;
  }
  return id;
}

// ---------- Routes ----------

app.get('/api/books', async (req, res) => {
  const { error, value: options } = validateQuery(req.query);
  if (error) {
    return res.status(400).json({ error });
  }

  const all = await store.getAll();

  let result = all.filter((book) => {
    if (options.genre !== null && book.genre !== options.genre) return false;
    if (options.read !== null && book.read !== options.read) return false;
    if (options.q !== '') {
      const text = `${book.title} ${book.author}`.toLowerCase();
      if (!text.includes(options.q)) return false;
    }
    return true;
  });

  // filter() already returned a new array, but I copy again before sort()
  // so it is clear that the stored array is never sorted.
  const direction = options.order === 'desc' ? -1 : 1;
  if (options.sort !== null) {
    result = [...result].sort(compareBooks(options.sort, direction));
  } else {
    result = [...result].sort((a, b) => (a.id - b.id) * direction);
  }

  const start = (options.page - 1) * options.limit;
  res.set('X-Total-Count', String(result.length));
  res.json(result.slice(start, start + options.limit));
});

app.get('/api/books/:id', async (req, res) => {
  const id = getIdOr400(req, res);
  if (id === null) return;

  const book = await store.getById(id);
  if (!book) {
    return res.status(404).json({ error: `Book ${id} not found` });
  }
  res.json(book);
});

app.post('/api/books', async (req, res) => {
  const { error, value } = validateBook(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const duplicate = await store.findDuplicate(value.title, value.author);
  if (duplicate) {
    return res.status(409).json({
      error: `A book with this title and author already exists (id ${duplicate.id})`,
    });
  }

  const book = await store.create(value);
  res.status(201).location(`/api/books/${book.id}`).json(book);
});

app.put('/api/books/:id', async (req, res) => {
  const id = getIdOr400(req, res);
  if (id === null) return;

  const { error, value } = validateBook(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const existing = await store.getById(id);
  if (!existing) {
    return res.status(404).json({ error: `Book ${id} not found` });
  }

  const duplicate = await store.findDuplicate(value.title, value.author, id);
  if (duplicate) {
    return res.status(409).json({
      error: `A book with this title and author already exists (id ${duplicate.id})`,
    });
  }

  const book = await store.replace(id, value);
  res.json(book);
});

app.patch('/api/books/:id', async (req, res) => {
  const id = getIdOr400(req, res);
  if (id === null) return;

  if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  const existing = await store.getById(id);
  if (!existing) {
    return res.status(404).json({ error: `Book ${id} not found` });
  }

  // Merge: existing values + only the known fields that were sent.
  const changes = {};
  for (const key of ['title', 'author', 'year', 'genre', 'read', 'rating']) {
    if (key in req.body) changes[key] = req.body[key];
  }
  const merged = { ...existing, ...changes };

  // Un-marking a book as read also clears its rating, otherwise the merged
  // book would fail the "rating only when read" rule.
  if (changes.read === false && !('rating' in changes)) {
    merged.rating = null;
  }

  const { error, value } = validateBook(merged);
  if (error) {
    return res.status(400).json({ error });
  }

  const duplicate = await store.findDuplicate(value.title, value.author, id);
  if (duplicate) {
    return res.status(409).json({
      error: `A book with this title and author already exists (id ${duplicate.id})`,
    });
  }

  const book = await store.replace(id, value);
  res.json(book);
});

app.delete('/api/books/:id', async (req, res) => {
  const id = getIdOr400(req, res);
  if (id === null) return;

  const deleted = await store.remove(id);
  if (!deleted) {
    return res.status(404).json({ error: `Book ${id} not found` });
  }
  res.status(204).end();
});

app.get('/api/stats', async (req, res) => {
  const all = await store.getAll();

  const read = all.filter((book) => book.read).length;
  const rated = all.filter((book) => book.rating !== null);
  const averageRating =
    rated.length === 0
      ? null
      : Math.round((rated.reduce((sum, book) => sum + book.rating, 0) / rated.length) * 10) / 10;

  const byGenre = all.reduce(
    (counts, book) => ({ ...counts, [book.genre]: (counts[book.genre] || 0) + 1 }),
    {},
  );

  res.json({
    total: all.length,
    read,
    unread: all.length - read,
    averageRating,
    byGenre,
  });
});

// Deliberately throws inside an async handler, to prove that Express 5
// passes the rejected promise to the error middleware. Kept on purpose and
// documented in the README.
app.get('/api/crash', async (req, res) => {
  await store.getAll();
  throw new Error('Test crash from /api/crash');
});

// ---------- 404 fallback ----------
// No route matched anything under /api.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------- Error handling ----------
// Four parameters, registered after all routes.
app.use((err, req, res, next) => {
  // Broken JSON in the body: express.json() throws a SyntaxError with status 400.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON in request body' });
  }

  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Reading List API on http://localhost:${PORT} (allowed origin: ${CLIENT_ORIGIN})`);
});
