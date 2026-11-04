# Pawfile server

Self-hosted Node + SQLite backend for Pawfile. A single process owns the shared SQLite database,
uploaded media, and the read-only dashboard API.

## Run locally

```bash
npm install
cp .env.example .env      # set APP_SHARED_SECRET
npm run dev
```

The API listens on `http://localhost:4000`. The dashboard is a separate Vite app:

```bash
npm --prefix dashboard install
npm --prefix dashboard run dev
```

Open <http://localhost:5173> and sign in with `APP_SHARED_SECRET`.

## Environment

| Variable | Required | Default | Notes |
|---|---|---|---|
| `APP_SHARED_SECRET` | yes | — | Minimum 16 characters. Shared by the app, the dashboard login, and file URLs. |
| `PORT` | no | `4000` | Render provides this. |
| `HOST` | no | `0.0.0.0` | |
| `DATABASE_PATH` | no | `./data/pawfile.db` | Put this on a persistent disk in production. |
| `UPLOADS_DIR` | no | `./data/uploads` | Case media. Put this on the same disk. |
| `DASHBOARD_DIR` | no | `../dashboard/dist` | Built dashboard files. |
| `CORS_ORIGINS` | no | `*` | Comma-separated browser origins. |
| `TZ` | no | `Asia/Kolkata` | Date handling is fixed to IST. |
| `NODE_ENV` | no | `development` | `production` enables secure cookies. |

## API

### `POST /api/sync`

The app's transport calls this endpoint. It keeps the original sync contract, but
**always returns HTTP 200** with an `{ ok }` body so the client can show the actual error.

| Action | Request | Response |
|---|---|---|
| `health` | `{ action: 'health' }` | `{ ok: true, service, time, schemaVersion }` |
| `pull` | `{ action: 'pull', sheet, since }` | `{ ok: true, rows, serverTime }` |
| `push` | `{ action: 'push', sheet, rows }` | `{ ok: true, succeeded, failed, versions, serverTime }` |
| `allocateBlock` | `{ action: 'allocateBlock', deviceId, size }` | `{ ok: true, block: { start, end } }` |
| `uploadMedia` | `{ action: 'uploadMedia', caseId, category, fileName, mimeType, base64 }` | `{ ok: true, file: { fileId, url } }` |

Authentication: `x-api-secret`, `Authorization: Bearer`, or `secret` in the body. The secret is
compared in constant time after SHA-256 hashing.

Push behavior:

- Columns are allow-listed from `PRAGMA table_info`; unknown keys are ignored.
- JSON booleans are converted to `0`/`1` before binding.
- `serverVersion` is `max(storedVersion, clientVersion) + 1`.
- `History` is immutable and insert-only.
- Per-row failures are returned in `failed[]`; good rows still commit.

Pull behavior:

- Sync tables filter on `COALESCE(syncedAt, updatedAt, createdAt) >= since - 2 minutes`.
- `History` filters on `syncedAt`.
- Every column is returned so the client's `INSERT OR REPLACE` cannot null fields.

### Dashboard

- `POST /api/auth/login` with `{ secret }` sets an HttpOnly `pawfile_session` cookie.
- `GET /api/dashboard/summary`, `/cases`, `/cases/:caseId`, `/contacts`, `/hearings`,
  `/documents`, `/activity` are read-only and require the cookie.
- `GET /api/dashboard/*` never exposes `documents.localUri` or stored `remoteUrl`; it mints
  fresh file URLs from `media_files`.

### Media

`uploadMedia` accepts JPEG, PNG, HEIC, HEIF, MP4, MOV, and PDF up to 25 MB. Files are stored in
`UPLOADS_DIR/<caseId>/<category>/`. `GET /api/files/:fileId?token=...` verifies an HMAC token
derived from the shared secret, then serves the file from the database-recorded path with
`nosniff` and the stored MIME type.

### Health

`GET /api/health` is unauthenticated and runs `SELECT 1`. Render uses it as the health check.

## Data and backups

- SQLite runs in WAL mode with `synchronous=NORMAL` and a 5-second busy timeout.
- A daily `VACUUM INTO` backup is written to `data/backups/pawfile-YYYY-MM-DD.db`; the newest 7
  are kept. Render disks are not backed up by the platform.
- The server is single-instance. Do not attach more than one instance to the same SQLite file.

## Tests

```bash
npm test
```

The integration tests use temporary databases and ephemeral HTTP ports. They cover the sync
contract, boolean coercion, version monotonicity, tombstones, ID allocation, media tokens,
path traversal, dashboard auth, timezone-safe dates, and rate limiting.
