import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCases } from '../api';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { Empty, ErrorBanner, Loading } from '../components/States';
import { formatDate, formatDateTime, formatTime } from '../format';
import { useAsync } from '../hooks/useAsync';

export function Cases() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [urgency, setUrgency] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, loading, error, reload } = useAsync(
    () => getCases({ search, status, urgency, page, pageSize: 25 }),
    [search, status, urgency, page],
  );

  return (
    <div className="page-stack">
      <section className="card">
        <div className="filter-bar">
          <label className="field field-grow">
            <span>Search</span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Case number, title, complainant, district"
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="field">
            <span>Urgency</span>
            <select
              value={urgency}
              onChange={(event) => {
                setUrgency(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>
        </div>
      </section>

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      <section className="card">
        {loading ? (
          <Loading rows={5} />
        ) : !data || !data.items.length ? (
          <Empty title="No matching cases" hint="Try clearing the search or filters." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Animal</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Urgency</th>
                    <th>Actions</th>
                    <th>Next due</th>
                    <th>Next hearing</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.caseId}>
                      <td>
                        <Link className="table-title" to={`/cases/${item.caseId}`}>
                          {item.title}
                        </Link>
                        <span className="muted">#{item.caseId}</span>
                      </td>
                      <td>
                        {item.animalType || '—'}
                        <span className="muted">{item.complaintCategory}</span>
                      </td>
                      <td>{[item.district, item.state].filter(Boolean).join(', ') || '—'}</td>
                      <td>
                        <Badge value={item.status} />
                      </td>
                      <td>
                        <Badge value={item.urgency} />
                      </td>
                      <td>
                        {item.openActions}
                        {item.overdueActions ? (
                          <span className="text-critical"> · {item.overdueActions} overdue</span>
                        ) : null}
                      </td>
                      <td>{item.nextDue ? formatDateTime(item.nextDue) : '—'}</td>
                      <td>
                        {item.nextHearing
                          ? `${formatDate(item.nextHearing.date)} ${formatTime(item.nextHearing.time)}`
                          : '—'}
                      </td>
                      <td>{formatDateTime(item.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
