import { useEffect, useState } from 'react';
import { getContacts } from '../api';
import { Badge } from '../components/Badge';
import { Empty, ErrorBanner, Loading } from '../components/States';
import { useAsync } from '../hooks/useAsync';

export function Contacts() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, loading, error, reload } = useAsync(
    () => getContacts({ search, type }),
    [search, type],
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
              placeholder="Name, organization, phone, email, district"
            />
          </label>
          <label className="field">
            <span>Type</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">All</option>
              <option value="NGO">NGO</option>
              <option value="Rescuer">Rescuer</option>
              <option value="Vet">Vet</option>
              <option value="Shelter">Shelter</option>
              <option value="Police">Police</option>
              <option value="Legal">Legal</option>
              <option value="Volunteer">Volunteer</option>
            </select>
          </label>
        </div>
      </section>

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      <section className="card">
        {loading ? (
          <Loading rows={5} />
        ) : !data || !data.items.length ? (
          <Empty title="No contacts" hint="Contacts added in the app will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((contact) => (
                  <tr key={contact.contactId}>
                    <td>{contact.name || '—'}</td>
                    <td>{contact.organization || '—'}</td>
                    <td>
                      <Badge value={contact.type} tone="ink" />
                    </td>
                    <td>
                      {contact.phone ? (
                        <a className="text-link" href={`tel:${contact.phone}`}>
                          {contact.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {contact.email ? (
                        <a className="text-link" href={`mailto:${contact.email}`}>
                          {contact.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {[contact.district, contact.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td>
                      <Badge
                        value={contact.isActive ? 'active' : 'inactive'}
                        tone={contact.isActive ? 'moss' : 'ink'}
                      />
                    </td>
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
