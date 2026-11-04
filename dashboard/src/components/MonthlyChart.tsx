import type { MonthItem } from '../api';
import { monthLabel } from '../format';

export function MonthlyChart({ items }: { items: MonthItem[] }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="month-chart">
      {items.map((item) => (
        <div className="month-column" key={item.month}>
          <span className="month-value">{item.count}</span>
          <span className="month-track">
            <span
              className="month-fill"
              style={{ height: `${Math.max(3, (item.count / max) * 100)}%` }}
            />
          </span>
          <span className="month-label">{monthLabel(item.month)}</span>
        </div>
      ))}
    </div>
  );
}
