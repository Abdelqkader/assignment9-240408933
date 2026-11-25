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
