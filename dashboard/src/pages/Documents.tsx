import { useState } from 'react';
import { getDocuments } from '../api';
import { DocumentGrid } from '../components/DocumentGrid';
import { ErrorBanner, Loading } from '../components/States';
import { useAsync } from '../hooks/useAsync';

const CATEGORIES = [
  'Photos',
  'Evidence',
  'FIR copies',
  'Veterinary reports',
  'Court orders',
  'Documents',
];

export function Documents() {
  const [category, setCategory] = useState('');
  const { data, loading, error, reload } = useAsync(
    () => getDocuments({ category }),
    [category],
  );

  return (
    <div className="page-stack">
      <section className="card">
        <div className="filter-bar">
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      <section className="card">
        {loading ? (
          <Loading rows={4} />
        ) : (
          <DocumentGrid items={data?.items ?? []} showCase />
        )}
      </section>
    </div>
  );
}
