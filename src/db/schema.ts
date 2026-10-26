export const SYNC_COLUMNS = [
  'createdAt TEXT NOT NULL',
  'updatedAt TEXT NOT NULL',
  'syncedAt TEXT',
  'localVersion INTEGER NOT NULL DEFAULT 1',
  'serverVersion INTEGER NOT NULL DEFAULT 0',
  'isDeleted INTEGER NOT NULL DEFAULT 0',
].join(', ');

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS cases (
  caseId TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  animalType TEXT NOT NULL DEFAULT '',
  complaintCategory TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  locationText TEXT NOT NULL DEFAULT '',
  locationLat REAL,
  locationLng REAL,
  complaintSource TEXT NOT NULL DEFAULT '',
  complainantName TEXT NOT NULL DEFAULT '',
  complainantPhone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  rescueStatus TEXT NOT NULL DEFAULT 'na',
  legalStatus TEXT NOT NULL DEFAULT 'na',
  urgency TEXT NOT NULL DEFAULT 'Medium',
  ${SYNC_COLUMNS}
);

CREATE TABLE IF NOT EXISTS actions (
  actionId TEXT PRIMARY KEY,
  caseId TEXT NOT NULL,
  type TEXT NOT NULL,
  actionStatus TEXT NOT NULL,
  rescueStatus TEXT NOT NULL DEFAULT 'na',
  legalStatus TEXT NOT NULL DEFAULT 'na',
  assignedToId TEXT NOT NULL DEFAULT 'self',
  assignedToName TEXT NOT NULL DEFAULT 'Self',
  followUpById TEXT NOT NULL DEFAULT 'self',
  followUpByName TEXT NOT NULL DEFAULT 'Self',
  nextAction TEXT NOT NULL DEFAULT '',
  followUpDate TEXT,
  dueValue TEXT,
  isClosed INTEGER NOT NULL DEFAULT 0,
  closedAt TEXT,
  closedReason TEXT NOT NULL DEFAULT '',
  animalCondition TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL DEFAULT '',
  policeStation TEXT NOT NULL DEFAULT '',
  complaintDate TEXT,
  firNumber TEXT NOT NULL DEFAULT '',
  firDate TEXT,
  investigatingOfficerId TEXT NOT NULL DEFAULT '',
  investigatingOfficerName TEXT NOT NULL DEFAULT '',
  court TEXT NOT NULL DEFAULT '',
  courtCaseNumber TEXT NOT NULL DEFAULT '',
  ${SYNC_COLUMNS}
);

CREATE TABLE IF NOT EXISTS hearings (
  hearingId TEXT PRIMARY KEY,
  caseId TEXT NOT NULL,
  actionId TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  time TEXT NOT NULL DEFAULT '09:00',
  court TEXT NOT NULL DEFAULT '',
  purpose TEXT NOT NULL DEFAULT '',
  attendeeId TEXT NOT NULL DEFAULT 'self',
  attendeeName TEXT NOT NULL DEFAULT 'Self',
  outcome TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  nextHearingDate TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  reminder7d INTEGER NOT NULL DEFAULT 1,
  reminder3d INTEGER NOT NULL DEFAULT 1,
  reminder1d INTEGER NOT NULL DEFAULT 1,
  ${SYNC_COLUMNS}
);

CREATE TABLE IF NOT EXISTS contacts (
  contactId TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  phone2 TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'NGO',
  state TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  serviceArea TEXT NOT NULL DEFAULT '',
  specialization TEXT NOT NULL DEFAULT '',
  isActive INTEGER NOT NULL DEFAULT 1,
  isLocalOnly INTEGER NOT NULL DEFAULT 0,
  ${SYNC_COLUMNS}
);

CREATE TABLE IF NOT EXISTS documents (
  documentId TEXT PRIMARY KEY,
  caseId TEXT NOT NULL,
  actionId TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Photos',
  fileName TEXT NOT NULL DEFAULT '',
  mimeType TEXT NOT NULL DEFAULT '',
  sizeBytes INTEGER NOT NULL DEFAULT 0,
  localUri TEXT NOT NULL DEFAULT '',
  remoteUrl TEXT NOT NULL DEFAULT '',
  driveFileId TEXT NOT NULL DEFAULT '',
  uploadStatus TEXT NOT NULL DEFAULT 'device-only',
  uploadError TEXT NOT NULL DEFAULT '',
  ${SYNC_COLUMNS}
);

CREATE TABLE IF NOT EXISTS history (
  historyId TEXT PRIMARY KEY,
  caseId TEXT NOT NULL,
  actionId TEXT NOT NULL DEFAULT '',
  eventType TEXT NOT NULL,
  actorName TEXT NOT NULL DEFAULT '',
  actorDeviceId TEXT NOT NULL DEFAULT '',
  oldValue TEXT NOT NULL DEFAULT '',
  newValue TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  metadata TEXT NOT NULL DEFAULT '',
  isConflict INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  syncedAt TEXT
);

CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS outbound_queue (
  id TEXT PRIMARY KEY,
  sheet TEXT NOT NULL,
  type TEXT NOT NULL,
  entityId TEXT NOT NULL,
  payload TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  retries INTEGER NOT NULL DEFAULT 0,
  lastError TEXT
);

CREATE TABLE IF NOT EXISTS id_blocks (
  deviceId TEXT PRIMARY KEY,
  start INTEGER NOT NULL,
  end INTEGER NOT NULL,
  next INTEGER NOT NULL,
  source TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS draft_media (
  id TEXT PRIMARY KEY,
  uri TEXT NOT NULL,
  fileName TEXT NOT NULL DEFAULT '',
  mimeType TEXT NOT NULL DEFAULT '',
  sizeBytes INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_actions_case ON actions(caseId);
CREATE INDEX IF NOT EXISTS idx_actions_updated ON actions(updatedAt);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(actionStatus);
CREATE INDEX IF NOT EXISTS idx_hearings_case ON hearings(caseId);
CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(date);
CREATE INDEX IF NOT EXISTS idx_documents_case ON documents(caseId);
CREATE INDEX IF NOT EXISTS idx_history_case ON history(caseId);
CREATE INDEX IF NOT EXISTS idx_queue_created ON outbound_queue(createdAt);
`;
