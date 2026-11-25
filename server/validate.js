// Hand-written validation (no libraries allowed).
// Each function returns { error } or { value } so the route decides the response.

export const GENRES = ['fiction', 'non-fiction', 'science', 'history', 'fantasy', 'other'];

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
