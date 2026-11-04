import { Link } from 'react-router-dom';
import type { DocumentItem } from '../api';
import { formatBytes, formatDate, label } from '../format';
import { Badge } from './Badge';
import { Empty } from './States';

export function DocumentGrid({
  items,
  showCase = false,
}: {
  items: DocumentItem[];
  showCase?: boolean;
}) {
  if (!items.length) {
    return <Empty title="No documents" hint="Media attached in the app will appear here." />;
  }
  return (
    <div className="document-grid">
      {items.map((document) => {
        const isImage = document.mimeType.startsWith('image/') && document.url;
        return (
          <article className="document-card" key={document.documentId}>
            <div className="document-preview">
              {isImage ? (
                <a href={document.url ?? '#'} target="_blank" rel="noreferrer">
                  <img src={document.url ?? ''} alt={document.fileName} loading="lazy" />
                </a>
              ) : (
                <span className="document-file">{label(document.category)}</span>
              )}
            </div>
            <div className="document-body">
              <strong className="document-name">{document.fileName}</strong>
              <span className="muted">
                {formatBytes(document.sizeBytes)} · {formatDate(document.createdAt)}
              </span>
              <div className="document-meta">
                <Badge value={document.category} tone="ink" />
                <Badge value={document.uploadStatus} />
              </div>
              {showCase ? (
                <Link className="text-link" to={`/cases/${document.caseId}`}>
                  Case {document.caseId}
                  {document.caseTitle ? ` · ${document.caseTitle}` : ''}
                </Link>
              ) : null}
              {document.url ? (
                <a className="text-link" href={document.url} target="_blank" rel="noreferrer">
                  Open file
                </a>
              ) : (
                <span className="muted">File unavailable</span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
