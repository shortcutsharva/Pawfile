import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section className="card">
      <h2>Page not found</h2>
      <p className="muted">The page you asked for does not exist in this dashboard.</p>
      <Link className="button button-primary" to="/">
        Back to overview
      </Link>
    </section>
  );
}
