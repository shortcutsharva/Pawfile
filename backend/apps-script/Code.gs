/**
 * Animal Welfare — Google Sheets + Drive backend.
 *
 * Deploy this project as a Web App (Execute as: Me, Access: Anyone with the link).
 * Set Script Properties:
 *   SPREADSHEET_ID       - the target spreadsheet ID
 *   APP_SHARED_SECRET    - a long random string shared with the app (16+ characters)
 *   DRIVE_ROOT_FOLDER_ID - folder for case media (optional; created if empty)
 *
 * The app never holds a service-account key. It sends the shared secret in the POST body of
 * every request. Query-string secrets are deliberately not accepted, because URLs end up in
 * logs and browser history.
 */

const SHEETS = {
  Cases: [
    'caseId', 'title', 'animalType', 'complaintCategory', 'description', 'state', 'district',
    'locationText', 'locationLat', 'locationLng', 'complaintSource', 'complainantName',
    'complainantPhone', 'status', 'rescueStatus', 'legalStatus', 'urgency', 'createdAt',
    'updatedAt', 'syncedAt', 'localVersion', 'serverVersion', 'isDeleted',
  ],
  Actions: [
    'actionId', 'caseId', 'type', 'actionStatus', 'rescueStatus', 'legalStatus',
    'assignedToId', 'assignedToName', 'followUpById', 'followUpByName', 'nextAction',
    'followUpDate', 'dueValue', 'isClosed', 'closedAt', 'closedReason', 'animalCondition',
    'outcome', 'policeStation', 'complaintDate', 'firNumber', 'firDate',
    'investigatingOfficerId', 'investigatingOfficerName', 'court', 'courtCaseNumber',
    'createdAt', 'updatedAt', 'syncedAt', 'localVersion', 'serverVersion', 'isDeleted',
  ],
  Hearings: [
    'hearingId', 'caseId', 'actionId', 'date', 'time', 'court', 'purpose', 'attendeeId',
    'attendeeName', 'outcome', 'result', 'nextHearingDate', 'status', 'reminder7d',
    'reminder3d', 'reminder1d', 'createdAt', 'updatedAt', 'syncedAt', 'localVersion',
    'serverVersion', 'isDeleted',
  ],
  Contacts: [
    'contactId', 'name', 'organization', 'phone', 'phone2', 'email', 'type', 'state',
    'district', 'serviceArea', 'specialization', 'isActive', 'isLocalOnly', 'createdAt',
    'updatedAt', 'syncedAt', 'localVersion', 'serverVersion', 'isDeleted',
  ],
  Documents: [
    'documentId', 'caseId', 'actionId', 'category', 'fileName', 'mimeType', 'sizeBytes',
    'localUri', 'remoteUrl', 'driveFileId', 'uploadStatus', 'uploadError', 'createdAt',
    'updatedAt', 'syncedAt', 'localVersion', 'serverVersion', 'isDeleted',
  ],
  History: [
    'historyId', 'caseId', 'actionId', 'eventType', 'actorName', 'actorDeviceId',
    'oldValue', 'newValue', 'description', 'metadata', 'isConflict', 'createdAt', 'syncedAt',
  ],
  SyncMetadata: ['key', 'value', 'updatedAt'],
  Config: ['key', 'value', 'description'],
};

const PRIMARY_KEYS = {
  Cases: 'caseId',
  Actions: 'actionId',
  Hearings: 'hearingId',
  Contacts: 'contactId',
  Documents: 'documentId',
  History: 'historyId',
  SyncMetadata: 'key',
  Config: 'key',
};

// Mirrors MIN_SHARED_SECRET_LENGTH in src/utils/backend.ts.
const MIN_SECRET_LENGTH = 16;
const MAX_REQUEST_CHARS = 40 * 1024 * 1024;
const MAX_PUSH_ROWS = 500;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_BLOCK_SIZE = 500;
const MAX_FOLDER_SEGMENT = 48;
const MAX_FILE_NAME = 120;

const ALLOWED_MEDIA_CATEGORIES = ['Photos', 'Evidence', 'Documents'];

// Mirrors ALLOWED_MIME_TYPES in src/config/defaults.ts.
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
];

const CASE_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function has_(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function headersFor_(name) {
  return typeof name === 'string' && has_(SHEETS, name) ? SHEETS[name] : null;
}

function configuredSecret_() {
  return PropertiesService.getScriptProperties().getProperty('APP_SHARED_SECRET') || '';
}

/**
 * Compares two strings without short-circuiting on the first differing character, so response
 * timing does not reveal how much of the secret a caller guessed correctly.
 */
function safeEqual_(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) | 0) ^ (right.charCodeAt(index) | 0);
  }
  return difference === 0;
}

function authorize_(body) {
  const expected = configuredSecret_();
  if (!expected) return 'APP_SHARED_SECRET is not set in Script Properties.';
  if (expected.length < MIN_SECRET_LENGTH) {
    return 'APP_SHARED_SECRET must be at least ' + MIN_SECRET_LENGTH + ' characters.';
  }
  return safeEqual_(body && body.secret, expected) ? '' : 'Unauthorized';
}

/**
 * Google Sheets evaluates a leading =, +, -, @, tab, or carriage return as a formula. Untrusted
 * case text is stored as an explicit text cell instead, which also blocks formula-based data
 * exfiltration such as IMPORTXML. readCell_ reverses this on the way out.
 */
function writeCell_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (text.charAt(0) === "'") return text;
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function readCell_(value) {
  if (typeof value === 'string' && value.charAt(0) === "'") return value.slice(1);
  return value;
}

function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID is not set in Script Properties.');
  return SpreadsheetApp.openById(id);
}

function doGet() {
  return json_({ ok: true, service: 'animal-welfare', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
    if (raw.length > MAX_REQUEST_CHARS) {
      return json_({ ok: false, error: 'Request too large' });
    }

    let body;
    try {
      body = JSON.parse(raw || '{}');
    } catch (parseError) {
      return json_({ ok: false, error: 'Bad request' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json_({ ok: false, error: 'Bad request' });
    }

    const authError = authorize_(body);
    if (authError) {
      // The specific reason is only written to the owner's execution log; callers always get a
      // uniform response so a probe cannot distinguish "unset" from "wrong".
      console.error('Rejected request: ' + authError);
      return json_({ ok: false, error: 'Unauthorized' });
    }

    switch (body.action) {
      case 'pull':
        return json_({ ok: true, rows: pullSheet_(body.sheet, body.since) });
      case 'push':
        return json_({ ok: true, ...pushSheet_(body.sheet, body.rows || []) });
      case 'allocateBlock':
        return json_({ ok: true, block: allocateBlock_(body.deviceId, body.size || 50) });
      case 'uploadMedia':
        return json_({ ok: true, file: uploadMedia_(body) });
      case 'health':
        return json_({ ok: true });
      default:
        return json_({ ok: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return json_({ ok: false, error: 'Request failed' });
  }
}

function getSheet_(name) {
  const headers = headersFor_(name);
  if (!headers) throw new Error('Unknown sheet: ' + name);
  const ss = spreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function rowsToObjects_(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(function (row) {
    const object = Object.create(null);
    headers.forEach(function (header, index) {
      object[header] = readCell_(row[index]);
    });
    return object;
  });
}

function pullSheet_(sheetName, since) {
  const headers = headersFor_(sheetName);
  if (!headers) throw new Error('Unknown sheet: ' + sheetName);
  const sheet = getSheet_(sheetName);
  const rows = rowsToObjects_(sheet, headers).filter(function (row) {
    if (!since) return true;
    const stamp = row.updatedAt || row.syncedAt || row.createdAt;
    if (!stamp) return true;
    return new Date(stamp).getTime() >= new Date(since).getTime();
  });
  return rows;
}

function pushSheet_(sheetName, rows) {
  const headers = headersFor_(sheetName);
  const keyField = has_(PRIMARY_KEYS, sheetName) ? PRIMARY_KEYS[sheetName] : null;
  if (!headers || !keyField) throw new Error('Unknown sheet: ' + sheetName);
  if (!Array.isArray(rows)) throw new Error('Rows must be an array');
  if (rows.length > MAX_PUSH_ROWS) throw new Error('Too many rows in one push');

  const sheet = getSheet_(sheetName);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  const succeeded = [];
  const failed = [];
  try {
    const existing = rowsToObjects_(sheet, headers);
    const rowByKey = Object.create(null);
    existing.forEach(function (row, index) {
      rowByKey[String(row[keyField])] = index + 2;
    });

    rows.forEach(function (row) {
      try {
        if (!row || typeof row !== 'object') throw new Error('Row must be an object');
        const key = String(row[keyField] || '');
        if (!key) throw new Error('Missing ' + keyField);
        const now = new Date().toISOString();
        // Only known columns are copied, so a payload cannot smuggle extra fields or an own
        // __proto__ key into the object that is written.
        const next = Object.create(null);
        headers.forEach(function (header) {
          next[header] = row[header];
        });
        next.syncedAt = now;
        next.serverVersion = Number(row.serverVersion || 0) + 1;
        const values = headers.map(function (header) {
          return writeCell_(next[header]);
        });

        if (rowByKey[key]) {
          sheet.getRange(rowByKey[key], 1, 1, headers.length).setValues([values]);
        } else {
          sheet.appendRow(values);
          rowByKey[key] = sheet.getLastRow();
        }
        succeeded.push(key);
      } catch (rowError) {
        failed.push({ id: String(row[keyField] || ''), error: String(rowError.message || rowError) });
      }
    });
  } finally {
    lock.releaseLock();
  }
  return { succeeded: succeeded, failed: failed };
}

function allocateBlock_(deviceId, size) {
  const headers = SHEETS.SyncMetadata;
  const requested = Number(size);
  const blockSize = Math.min(
    Math.max(Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 50, 1),
    MAX_BLOCK_SIZE
  );

  // Two devices asking at the same moment must never receive the same block, or both would mint
  // the same case numbers and overwrite each other in the Cases sheet.
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_('SyncMetadata');
    const rows = rowsToObjects_(sheet, headers);
    const key = 'nextCaseId';
    let next = 0;
    rows.forEach(function (row) {
      if (row.key === key) next = Number(row.value || 0);
    });

    if (!next) {
      const cases = pullSheet_('Cases', null);
      let max = 1000;
      cases.forEach(function (row) {
        const value = Number(row.caseId);
        if (Number.isFinite(value) && value > max) max = value;
      });
      next = max + 1;
    }

    const start = next;
    const end = next + blockSize - 1;
    const now = new Date().toISOString();
    const existingIndex = rows.findIndex(function (row) { return row.key === key; });
    if (existingIndex >= 0) {
      sheet.getRange(existingIndex + 2, 1, 1, 3).setValues([[key, String(end + 1), now]]);
    } else {
      sheet.appendRow([key, String(end + 1), now]);
    }
    return { start: start, end: end };
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

/** Keeps Drive folder names inside a small, predictable alphabet. */
function safeSegment_(value, fallback) {
  const text = String(value === null || value === undefined ? '' : value)
    .replace(/[^A-Za-z0-9 _.-]/g, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, MAX_FOLDER_SEGMENT);
  return text || fallback;
}

function safeFileName_(value) {
  let text = String(value === null || value === undefined ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]/g, '_')
    .trim();
  if (!text) return 'file-' + Date.now();
  if (text.length > MAX_FILE_NAME) {
    const dot = text.lastIndexOf('.');
    const extension = dot > 0 ? text.slice(dot, dot + 10) : '';
    text = text.slice(0, MAX_FILE_NAME - extension.length) + extension;
  }
  return text;
}

function uploadMedia_(body) {
  const caseId = String(body.caseId || '');
  if (!CASE_ID_PATTERN.test(caseId)) throw new Error('Invalid caseId');

  const category = ALLOWED_MEDIA_CATEGORIES.indexOf(body.category) >= 0 ? body.category : 'Documents';

  const mimeType = String(body.mimeType || '');
  if (ALLOWED_MIME_TYPES.indexOf(mimeType) < 0) throw new Error('Unsupported file type');

  const fileName = safeFileName_(body.fileName);

  const base64 = typeof body.base64 === 'string' ? body.base64 : '';
  if (!base64) throw new Error('Missing file data');
  if (!/^[A-Za-z0-9+/=\s]*$/.test(base64)) throw new Error('Invalid file data');
  // Reject oversized payloads before decoding so a huge body cannot exhaust memory.
  if (Math.ceil((base64.length * 3) / 4) > MAX_UPLOAD_BYTES) throw new Error('File is too large');

  const rootId = PropertiesService.getScriptProperties().getProperty('DRIVE_ROOT_FOLDER_ID');
  const root = rootId ? DriveApp.getFolderById(rootId) : DriveApp.getRootFolder();
  const appFolder = getOrCreateFolder_(root, 'Animal Rescue App');
  const casesFolder = getOrCreateFolder_(appFolder, 'Cases');
  const caseFolder = getOrCreateFolder_(casesFolder, '#' + caseId);
  const categoryFolder = getOrCreateFolder_(caseFolder, safeSegment_(category, 'Documents'));

  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
  const file = categoryFolder.createFile(blob);
  file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  return { fileId: file.getId(), url: file.getUrl() };
}

/**
 * Run once from the Apps Script editor after setting SPREADSHEET_ID.
 */
function setupSpreadsheet() {
  Object.keys(SHEETS).forEach(function (name) {
    const sheet = getSheet_(name);
    const headers = SHEETS[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  });
  const config = getSheet_('Config');
  if (config.getLastRow() < 2) {
    config.getRange(2, 1, 6, 3).setValues([
      ['animalTypes', JSON.stringify(['Dog', 'Cat', 'Cow', 'Cattle', 'Bird', 'Other']), 'Editable in Settings'],
      ['complaintCategories', JSON.stringify(['Cruelty', 'Abandonment', 'Injury', 'Neglect', 'Illegal transport', 'Other']), ''],
      ['urgencyLevels', JSON.stringify(['High', 'Medium', 'Low']), ''],
      ['statusLabels', JSON.stringify({}), 'Override chip labels'],
      ['reminderDefaults', JSON.stringify({ hearingLeads: [7, 3, 1], followUpDefaultTime: '09:00' }), ''],
      ['shareDefaults', JSON.stringify({ maskComplainant: true, exactAddressDefault: false }), ''],
    ]);
  }

  const warnings = [];
  const secret = configuredSecret_();
  if (!secret) {
    warnings.push('APP_SHARED_SECRET is not set, so every request will be rejected.');
  } else if (secret.length < MIN_SECRET_LENGTH) {
    warnings.push(
      'APP_SHARED_SECRET is shorter than ' + MIN_SECRET_LENGTH + ' characters and will be rejected.'
    );
  }
  return warnings.length ? 'Spreadsheet ready. ' + warnings.join(' ') : 'Spreadsheet ready';
}
