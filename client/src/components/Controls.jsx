import { GENRES } from './genres.js';

// Search, filters and sort. Every change goes up to App, which asks the
// server for a new list (nothing is filtered in the browser).
export default function Controls({ filters, onChange }) {
  function update(field, value) {
    onChange({ ...filters, [field]: value });
  }

  return (
    <section className="controls">
      <label>
        Search
        <input
          type="search"
          placeholder="Title or author"
          value={filters.q}
          onChange={(e) => update('q', e.target.value)}
        />
      </label>

      <label>
        Genre
        <select value={filters.genre} onChange={(e) => update('genre', e.target.value)}>
          <option value="">All genres</option>
          {GENRES.map((genre) => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
      </label>

      <label>
        Read
        <select value={filters.read} onChange={(e) => update('read', e.target.value)}>
          <option value="">All</option>
          <option value="true">Read</option>
          <option value="false">Not read</option>
        </select>
      </label>

      <label>
        Sort by
        <select value={filters.sort} onChange={(e) => update('sort', e.target.value)}>
          <option value="">Added (id)</option>
          <option value="title">Title</option>
          <option value="author">Author</option>
          <option value="year">Year</option>
          <option value="rating">Rating</option>
        </select>
      </label>

      <label>
        Order
        <select value={filters.order} onChange={(e) => update('order', e.target.value)}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </label>
    </section>
  );
}
