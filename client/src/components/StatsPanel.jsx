export default function StatsPanel({ stats, error }) {
  if (error) {
    return <section className="stats error">Could not load statistics: {error}</section>;
  }
  if (!stats) {
    return <section className="stats">Loading statistics…</section>;
  }

  return (
    <section className="stats">
      <h2>Statistics</h2>
      <ul>
        <li><strong>{stats.total}</strong> books</li>
        <li><strong>{stats.read}</strong> read</li>
        <li><strong>{stats.unread}</strong> not read</li>
        <li>
          Average rating: <strong>{stats.averageRating === null ? '—' : stats.averageRating}</strong>
        </li>
      </ul>
      <p className="by-genre">
        {Object.entries(stats.byGenre).map(([genre, count]) => (
          <span key={genre} className="tag">{genre}: {count}</span>
        ))}
      </p>
    </section>
  );
}
