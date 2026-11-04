import { Link } from 'react-router-dom';
import { getSummary } from '../api';
import { BarChart } from '../components/BarChart';
import { Badge } from '../components/Badge';
import { Kpi } from '../components/Kpi';
import { MonthlyChart } from '../components/MonthlyChart';
import { Empty, ErrorBanner, Loading } from '../components/States';
import { formatDate, formatDateTime, formatTime } from '../format';
import { useAsync } from '../hooks/useAsync';

export function Overview() {
  const { data, loading, error, reload } = useAsync(getSummary, []);

  if (loading) return <Loading rows={6} />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (!data) return <Empty title="No data yet" />;

  return (
    <div className="page-stack">
      <section className="kpi-grid">
        <Kpi label="Open cases" value={data.totals.openCases} hint={`${data.totals.cases} total`} />
        <Kpi
          label="Overdue actions"
          value={data.totals.overdueActions}
          hint={`${data.totals.openActions} open`}
          tone="brick"
        />
        <Kpi
          label="Hearings next 7 days"
          value={data.totals.hearingsNext7Days}
          tone="ochre"
        />
        <Kpi label="High urgency" value={data.totals.highUrgency} tone="ochre" />
        <Kpi label="Rescued this month" value={data.totals.rescuedThisMonth} tone="moss" />
        <Kpi label="Contacts" value={data.totals.contacts} tone="ink" />
      </section>

      <section className="split-grid">
        <article className="card">
          <div className="card-header">
            <h2>Open actions by status</h2>
          </div>
          <BarChart items={data.byStatus} />
        </article>
        <article className="card">
          <div className="card-header">
            <h2>Open cases by urgency</h2>
          </div>
          <BarChart items={data.byUrgency} tone="ochre" />
        </article>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Cases created</h2>
          <span className="muted">Last 6 months</span>
        </div>
        <MonthlyChart items={data.monthly} />
      </section>

      <section className="split-grid">
        <article className="card">
          <div className="card-header">
            <h2>Upcoming hearings</h2>
            <Link className="text-link" to="/hearings">
              View all
            </Link>
          </div>
          {data.upcomingHearings.length ? (
            <ul className="stack-list">
              {data.upcomingHearings.map((hearing) => (
                <li key={hearing.hearingId} className="stack-row">
                  <div>
                    <strong>{hearing.caseTitle || `Case ${hearing.caseId}`}</strong>
                    <span className="muted">
                      {formatDate(hearing.date)} · {formatTime(hearing.time)} · {hearing.court || 'Court not set'}
                    </span>
                  </div>
                  <Badge value={hearing.status} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No hearings in the next 7 days" />
          )}
        </article>

        <article className="card">
          <div className="card-header">
            <h2>Recent activity</h2>
            <Link className="text-link" to="/activity">
              View all
            </Link>
          </div>
          {data.recentActivity.length ? (
            <ul className="stack-list">
              {data.recentActivity.map((item) => (
                <li key={item.historyId} className="stack-row">
                  <div>
                    <strong>{item.description || item.eventType.replace(/_/g, ' ')}</strong>
                    <span className="muted">
                      Case {item.caseId} · {item.actorName || 'Unknown'} · {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  {item.isConflict ? <Badge value="conflict" tone="brick" /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No activity yet" />
          )}
        </article>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Recently updated cases</h2>
          <Link className="text-link" to="/cases">
            View all
          </Link>
        </div>
        {data.recentCases.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Urgency</th>
                  <th>Open actions</th>
                  <th>Next hearing</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCases.map((item) => (
                  <tr key={item.caseId}>
                    <td>
                      <Link className="table-title" to={`/cases/${item.caseId}`}>
                        {item.title}
                      </Link>
                      <span className="muted">#{item.caseId}</span>
                    </td>
                    <td>{[item.district, item.state].filter(Boolean).join(', ') || '—'}</td>
                    <td>
                      <Badge value={item.status} />
                    </td>
                    <td>
                      <Badge value={item.urgency} />
                    </td>
                    <td>{item.openActions}</td>
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
        ) : (
          <Empty title="No cases yet" hint="Cases created in the app will appear here." />
        )}
      </section>
    </div>
  );
}
