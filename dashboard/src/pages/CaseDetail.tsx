import { Link, useParams } from 'react-router-dom';
import { getCase } from '../api';
import { Badge } from '../components/Badge';
import { DocumentGrid } from '../components/DocumentGrid';
import { Empty, ErrorBanner, Loading } from '../components/States';
import { formatDate, formatDateTime, formatTime, label } from '../format';
import { useAsync } from '../hooks/useAsync';

function text(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const { data, loading, error, reload } = useAsync(
    () => getCase(caseId ?? ''),
    [caseId],
  );

  if (loading) return <Loading rows={6} />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (!data) return <Empty title="Case not found" />;

  const record = data.case;

  return (
    <div className="page-stack">
      <div>
        <Link className="text-link" to="/cases">
          ← Back to cases
        </Link>
      </div>

      <section className="card case-header">
        <div>
          <span className="eyebrow">Case #{text(record.caseId)}</span>
          <h2>{text(record.title)}</h2>
          <div className="badge-row">
            <Badge value={text(record.status)} />
            <Badge value={text(record.urgency)} />
            <Badge value={text(record.rescueStatus)} />
            <Badge value={text(record.legalStatus)} />
          </div>
        </div>
        <span className="muted">Updated {formatDateTime(text(record.updatedAt))}</span>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Details</h2>
        </div>
        <dl className="detail-grid">
          <div>
            <dt>Animal</dt>
            <dd>{text(record.animalType)}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{text(record.complaintCategory)}</dd>
          </div>
          <div>
            <dt>Complainant</dt>
            <dd>{text(record.complainantName)}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>
              {record.complainantPhone ? (
                <a className="text-link" href={`tel:${text(record.complainantPhone)}`}>
                  {text(record.complainantPhone)}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>
              {[record.district, record.state].filter(Boolean).join(', ') || '—'}
              <br />
              <span className="muted">{text(record.locationText)}</span>
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{text(record.complaintSource)}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDateTime(text(record.createdAt))}</dd>
          </div>
          <div>
            <dt>Description</dt>
            <dd>{text(record.description)}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Actions</h2>
        </div>
        {data.actions.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Next action</th>
                  <th>Due</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.actions.map((action) => (
                  <tr key={String(action.actionId)}>
                    <td>{label(text(action.type))}</td>
                    <td>
                      <Badge value={text(action.actionStatus)} />
                    </td>
                    <td>{text(action.assignedToName)}</td>
                    <td>{text(action.nextAction)}</td>
                    <td>{formatDateTime(text(action.dueValue ?? action.followUpDate))}</td>
                    <td>{text(action.outcome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No actions" />
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Hearings</h2>
        </div>
        {data.hearings.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Court</th>
                  <th>Purpose</th>
                  <th>Attendee</th>
                  <th>Status</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.hearings.map((hearing) => (
                  <tr key={String(hearing.hearingId)}>
                    <td>{formatDate(text(hearing.date))}</td>
                    <td>{formatTime(text(hearing.time))}</td>
                    <td>{text(hearing.court)}</td>
                    <td>{text(hearing.purpose)}</td>
                    <td>{text(hearing.attendeeName)}</td>
                    <td>
                      <Badge value={text(hearing.status)} />
                    </td>
                    <td>{text(hearing.outcome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No hearings" />
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Documents</h2>
        </div>
        <DocumentGrid items={data.documents} />
      </section>

      <section className="card">
        <div className="card-header">
          <h2>History</h2>
        </div>
        {data.history.length ? (
          <ol className="timeline">
            {data.history.map((item) => (
              <li key={item.historyId}>
                <div className="timeline-dot" />
                <div>
                  <strong>{item.description || label(item.eventType)}</strong>
                  <span className="muted">
                    {item.actorName || 'Unknown'} · {formatDateTime(item.createdAt)}
                  </span>
                  {item.isConflict ? <Badge value="conflict" tone="brick" /> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Empty title="No history" />
        )}
      </section>
    </div>
  );
}
