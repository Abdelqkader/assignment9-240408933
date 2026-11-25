// Hand-written validation (no libraries allowed).
// Each function returns { error } or { value } so the route decides the response.

export const GENRES = ['fiction', 'non-fiction', 'science', 'history', 'fantasy', 'other'];
export const SORT_FIELDS = ['title', 'author', 'year', 'rating'];

// Route parameter :id must be a positive integer written only with digits.
export function parseId(raw) {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return id;
}

function checkText(value, name) {
  if (typeof value !== 'string') return `${name} must be a string`;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    return `${name} must be 1 to 100 characters long (after trimming)`;
  }
  return null;
}

// Validates a COMPLETE book (POST, PUT, and the merged book of PATCH).
// Only the known fields are copied, so unknown fields and a body id are ignored.
export function validateBook(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object' };
  }

  const titleError = checkText(body.title, 'title');
  if (titleError) return { error: titleError };

  const authorError = checkText(body.author, 'author');
  if (authorError) return { error: authorError };

  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(body.year) || body.year < 1000 || body.year > currentYear) {
    return { error: `year must be an integer between 1000 and ${currentYear}` };
  }

  if (!GENRES.includes(body.genre)) {
    return { error: `genre must be one of: ${GENRES.join(', ')}` };
  }

  const read = body.read === undefined ? false : body.read;
  if (typeof read !== 'boolean') {
    return { error: 'read must be true or false' };
  }

  const rating = body.rating === undefined ? null : body.rating;
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return { error: 'rating must be an integer from 1 to 5, or null' };
  }
  if (rating !== null && !read) {
    return { error: 'rating is allowed only when read is true' };
  }

  return {
    value: {
      title: body.title.trim(),
      author: body.author.trim(),
      year: body.year,
      genre: body.genre,
      read,
      rating,
    },
  };
}

// Query options for GET /api/books.
// Express parses ?genre=a&genre=b into an array, which is how a repeated
// parameter is detected.
export function validateQuery(query) {
  const allowed = ['genre', 'read', 'q', 'sort', 'order', 'limit', 'page'];
  for (const key of allowed) {
    if (Array.isArray(query[key])) {
      return { error: `Query parameter "${key}" must be given only once` };
    }
    if (query[key] !== undefined && typeof query[key] !== 'string') {
      return { error: `Query parameter "${key}" has an invalid format` };
    }
  }

  const options = {
    genre: null,
    read: null,
    q: '',
    sort: null,
    order: 'asc',
    limit: 50,
    page: 1,
  };

  if (query.genre !== undefined) {
    if (!GENRES.includes(query.genre)) {
      return { error: `genre must be one of: ${GENRES.join(', ')}` };
    }
    options.genre = query.genre;
  }

  if (query.read !== undefined) {
    if (query.read !== 'true' && query.read !== 'false') {
      return { error: 'read must be "true" or "false"' };
    }
    options.read = query.read === 'true';
  }

  if (query.q !== undefined) {
    options.q = query.q.trim().toLowerCase();
  }

  if (query.sort !== undefined) {
    if (!SORT_FIELDS.includes(query.sort)) {
      return { error: `sort must be one of: ${SORT_FIELDS.join(', ')}` };
    }
    options.sort = query.sort;
  }

  if (query.order !== undefined) {
    if (query.order !== 'asc' && query.order !== 'desc') {
      return { error: 'order must be "asc" or "desc"' };
    }
    options.order = query.order;
  }

  if (query.limit !== undefined) {
    const limit = /^\d+$/.test(query.limit) ? Number(query.limit) : NaN;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return { error: 'limit must be an integer from 1 to 50' };
    }
    options.limit = limit;
  }

  if (query.page !== undefined) {
    const page = /^\d+$/.test(query.page) ? Number(query.page) : NaN;
    if (!Number.isInteger(page) || page < 1) {
      return { error: 'page must be a positive integer' };
    }
    options.page = page;
  }

  return { value: options };
}
