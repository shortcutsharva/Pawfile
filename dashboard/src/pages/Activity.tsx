import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getActivity } from '../api';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { Empty, ErrorBanner, Loading } from '../components/States';
import { formatDateTime, label } from '../format';
import { useAsync } from '../hooks/useAsync';

export function Activity() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => getActivity(page), [page]);

  return (
    <div className="page-stack">
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      <section className="card">
        {loading ? (
          <Loading rows={6} />
        ) : !data || !data.items.length ? (
          <Empty title="No activity yet" hint="Changes made in the app will appear here." />
        ) : (
          <>
            <ol className="timeline">
              {data.items.map((item) => (
                <li key={item.historyId}>
                  <div className="timeline-dot" />
                  <div>
                    <div className="timeline-title">
                      <strong>{item.description || label(item.eventType)}</strong>
                      <Badge value={item.eventType} />
                      {item.isConflict ? <Badge value="conflict" tone="brick" /> : null}
                    </div>
                    <span className="muted">
                      {item.caseTitle ? (
                        <Link className="text-link" to={`/cases/${item.caseId}`}>
                          {item.caseTitle}
                        </Link>
                      ) : (
                        `Case ${item.caseId}`
                      )}{' '}
                      · {item.actorName || 'Unknown'} · {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
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
