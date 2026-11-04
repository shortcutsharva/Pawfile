import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getHearings } from '../api';
import { Badge } from '../components/Badge';
import { Empty, ErrorBanner, Loading } from '../components/States';
import { addDaysInput, formatDate, formatTime, todayInput } from '../format';
import { useAsync } from '../hooks/useAsync';

export function Hearings() {
  const [from, setFrom] = useState(todayInput());
  const [to, setTo] = useState(addDaysInput(30));
  const { data, loading, error, reload } = useAsync(
    () => getHearings({ from, to }),
    [from, to],
  );

  return (
    <div className="page-stack">
      <section className="card">
        <div className="filter-bar">
          <label className="field">
            <span>From</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
      </section>

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      <section className="card">
        {loading ? (
          <Loading rows={5} />
        ) : !data || !data.items.length ? (
          <Empty title="No hearings in this range" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Case</th>
                  <th>Court</th>
                  <th>Purpose</th>
                  <th>Attendee</th>
                  <th>Status</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((hearing) => (
                  <tr key={hearing.hearingId}>
                    <td>{formatDate(hearing.date)}</td>
                    <td>{formatTime(hearing.time)}</td>
                    <td>
                      <Link className="table-title" to={`/cases/${hearing.caseId}`}>
                        {hearing.caseTitle || `Case ${hearing.caseId}`}
                      </Link>
                      <span className="muted">#{hearing.caseId}</span>
                    </td>
                    <td>{hearing.court || '—'}</td>
                    <td>{hearing.purpose || '—'}</td>
                    <td>{hearing.attendeeName || '—'}</td>
                    <td>
                      <Badge value={hearing.status} />
                    </td>
                    <td>{hearing.outcome || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
