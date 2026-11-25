// In-memory data store for the books.
// Every function is async and waits a little, to act like a slow data source
// (later this will be a real database). The array and the book objects are
// never changed in place: every change builds a new array / new object.

const DELAY_MS = 50;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let books = [
  { id: 1, title: 'The Little Prince', author: 'Antoine de Saint-Exupéry', year: 1943, genre: 'fiction', read: true, rating: 5 },
  { id: 2, title: 'The Hobbit', author: 'J. R. R. Tolkien', year: 1937, genre: 'fantasy', read: true, rating: 4 },
  { id: 3, title: 'A Brief History of Time', author: 'Stephen Hawking', year: 1988, genre: 'science', read: false, rating: null },
  { id: 4, title: 'Sapiens', author: 'Yuval Noah Harari', year: 2011, genre: 'history', read: true, rating: 4 },
  { id: 5, title: 'Harry Potter and the Philosopher\'s Stone', author: 'J. K. Rowling', year: 1997, genre: 'fantasy', read: true, rating: null },
  { id: 6, title: 'Atomic Habits', author: 'James Clear', year: 2018, genre: 'non-fiction', read: false, rating: null },
  { id: 7, title: 'One Hundred Years of Solitude', author: 'Gabriel García Márquez', year: 1967, genre: 'fiction', read: false, rating: null },
];

let nextId = books.length + 1;

export async function getAll() {
  await wait(DELAY_MS);
  return books;
}

export async function getById(id) {
  await wait(DELAY_MS);
  return books.find((book) => book.id === id);
}

// Two books are the same when title AND author match, ignoring case and
// extra spaces. exceptId lets PUT/PATCH skip the book that is being changed.
export async function findDuplicate(title, author, exceptId = null) {
  await wait(DELAY_MS);
  const t = title.trim().toLowerCase();
  const a = author.trim().toLowerCase();
  return books.find(
    (book) =>
      book.id !== exceptId &&
      book.title.toLowerCase() === t &&
      book.author.toLowerCase() === a,
  );
}

export async function create(data) {
  await wait(DELAY_MS);
  const book = { id: nextId, ...data };
  nextId += 1;
  books = [...books, book];
  return book;
}

// Replaces the whole book (used by PUT and by PATCH after merging).
export async function replace(id, data) {
  await wait(DELAY_MS);
  const updated = { id, ...data };
  books = books.map((book) => (book.id === id ? updated : book));
  return updated;
}

export async function remove(id) {
  await wait(DELAY_MS);
  const before = books.length;
  books = books.filter((book) => book.id !== id);
  return books.length < before;
}
