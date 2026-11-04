import type { CountItem } from '../api';

export function BarChart({
  items,
  tone = 'pine',
}: {
  items: CountItem[];
  tone?: 'pine' | 'ochre' | 'brick' | 'moss';
}) {
  if (!items.length) return <p className="muted">No data yet.</p>;
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="bar-chart">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <span className="bar-label">{item.label}</span>
          <span className="bar-track">
            <span
              className={`bar-fill bar-${tone}`}
              style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
            />
          </span>
          <strong className="bar-value">{item.count}</strong>
        </div>
      ))}
    </div>
  );
}
