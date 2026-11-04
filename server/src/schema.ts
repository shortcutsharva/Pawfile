export const SERVER_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS server_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_files (
  fileId TEXT PRIMARY KEY,
  caseId TEXT NOT NULL,
  category TEXT NOT NULL,
  fileName TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  sizeBytes INTEGER NOT NULL,
  storedPath TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_case ON media_files(caseId);
`;
