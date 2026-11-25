// The only file that talks to the server. Components call these functions
// and never build URLs or call fetch() themselves.

const BASE_URL = import.meta.env.VITE_API_URL;

// Shared helper for every request.
// - sets Content-Type only when there is a body
// - checks response.ok and turns the server's { error } into an Error
// - handles 204 No Content (there is no JSON to read)
async function request(path, { method = 'GET', body, signal } = {}) {
  const options = { method, signal };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

  if (response.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data && data.error ? data.error : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data;
}

// filters: { q, genre, read, sort, order } — empty values are not sent.
export function getBooks(filters, signal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== null && value !== undefined) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return request(`/api/books${query ? `?${query}` : ''}`, { signal });
}

export function getStats(signal) {
  return request('/api/stats', { signal });
}

export function createBook(book) {
  return request('/api/books', { method: 'POST', body: book });
}

export function replaceBook(id, book) {
  return request(`/api/books/${encodeURIComponent(id)}`, { method: 'PUT', body: book });
}

export function updateBook(id, changes) {
  return request(`/api/books/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes });
}

export function deleteBook(id) {
  return request(`/api/books/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
