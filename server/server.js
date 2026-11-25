import express from 'express';
import cors from 'cors';
import * as store from './booksStore.js';
import { parseId, validateBook } from './validate.js';

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
  const all = await store.getAll();
  res.json(all);
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


app.listen(PORT, () => {
  console.log(`Reading List API on http://localhost:${PORT} (allowed origin: ${CLIENT_ORIGIN})`);
});

