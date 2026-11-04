# Security Review — Pawfile V1 (SQLite server)

Reviewed 2026-11-04. Covers the Expo app, the self-hosted Node/SQLite server, the read-only
dashboard, media storage, and the backup path.

This document records **what is protected, what is accepted risk, and what operators must do**.
Anything under "Accepted risk" is a deliberate V1 limitation, not an oversight.

---

## Threat model in one paragraph

The app has no user accounts. Everyone who has the server URL and the shared secret can read and
write every case, including complainant names and phone numbers, and can view every uploaded file.
The server is therefore protected by exactly one bearer credential, stored in `server/.env` on the
server and in the device keychain on the phone. The realistic attackers are:

1. Someone who obtains the secret (screenshot, chat message, extracted app bundle, lost phone).
2. Someone who can write data into the app and then read it in the dashboard or the database file.
3. A crafted media file or backup handed to a user.
4. A network attacker if the server is exposed over plain HTTP.

---

## Controls in place

### Credential handling

- **No baked-in credentials.** `src/config/env.ts` has no default endpoint or secret. A fresh
  install is local-only until someone enters a server URL and secret.
- **Secret length:** at least 16 characters, enforced by both the app and the server.
- **Constant-time comparison:** both sides SHA-256 the secret and use `timingSafeEqual`, so a
  wrong guess does not leak the matching prefix length.
- **No query-string secrets:** the app sends `x-api-secret`; the server also accepts a body
  `secret` for compatibility. `?secret=` is never accepted.
- **HTTPS required for public hosts:** the app allows plain HTTP only for localhost, `10.0.2.2`,
  and private LAN ranges. Public hosts must use HTTPS.
- **No URL credentials:** usernames, passwords, query strings, and fragments are rejected by the
  app's endpoint validation.
- **Secure storage:** the phone keeps the secret in SecureStore with
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; the web development fallback uses AsyncStorage and is not a
  shipped target.

### Dashboard authentication

- Login exchanges the shared secret for a stateless session token:
  `<expiry>.<HMAC(expiry)>`, signed with a key derived from the shared secret.
- The token is stored in an **HttpOnly**, `SameSite=Lax` cookie, marked `Secure` in production.
  Browser JavaScript never receives the master secret after login.
- Dashboard APIs accept the session cookie only. They do not accept the master secret in a header
  or query string.
- Five failed logins per 15 minutes per IP are rejected with HTTP 429. This is an in-memory
  limiter, appropriate for the single-instance model.
- Dashboard JSON responses are `Cache-Control: no-store`.
- The dashboard has no write routes. It cannot create, edit, or delete records.

### Sync API

- The sync route **always returns HTTP 200** with `{ ok: false, error }` for auth failures, bad
  JSON, unknown actions, and oversized bodies. This is deliberate: a proxy-generated 401/413
  would leak less useful information and break the client contract. The route does not expose
  stack traces.
- Request bodies are capped at 40 MB; pushes are capped at 500 rows; ID blocks at 500.
- **SQL injection:** all values are bound parameters. Column names come from `PRAGMA table_info`,
  never from the request. Unknown keys are ignored.
- **Boolean/type confusion:** JSON booleans are coerced to 0/1, finite numbers are preserved,
  non-finite numbers become `NULL`, and nested objects are JSON-encoded. This also prevents
  better-sqlite3 binding errors.
- **Schema drift:** the server asserts the presence of all shared tables and the sync columns at
  boot. It refuses to start on a mismatch instead of writing into a broken schema.
- **Case ID allocation:** `server_state.nextCaseId` is updated inside a transaction. Offline
  fallback IDs in the 900000–900999 band are excluded when seeding the counter, so one offline
  device cannot push the shared counter forward by 900,000.
- **Tombstones:** soft deletes are normal rows with `isDeleted = 1`; the server does not purge
  them. Dashboard queries filter them out.

### Media

- `uploadMedia` validates:
  - `caseId` against `^[A-Za-z0-9_-]{1,32}$`
  - category against `Photos`, `Evidence`, `Documents`
  - MIME type against the same seven types the app can produce
  - base64 charset
  - decoded size ≤ 25 MB, checked from the base64 length before decoding
- File names are stripped of control characters, path separators, and length beyond 120
  characters. The stored path is built from the validated case ID, category, a UUID, and the
  sanitized name.
- The file route resolves the path from the `media_files` table, then asserts the result stays
  under `UPLOADS_DIR`. A `../` value in the database is refused.
- Files are served with the stored MIME type, `X-Content-Type-Options: nosniff`,
  `Content-Disposition: inline`, and `Cache-Control: private, max-age=86400`. This prevents an
  uploaded HTML/SVG file from executing as a same-origin document.
- **Capability URLs:** `/api/files/:id?token=<HMAC(fileId)>` grants read access to that one file.
  The token has no expiry because the URL is persisted in `documents.remoteUrl`. A leaked URL is
  a leaked file; treat links and screenshots as sensitive.

### Dashboard data handling

- Every dashboard query filters `isDeleted = 0` for sync tables.
- Device-local paths (`documents.localUri`) are never returned to the browser.
- Stored `documents.remoteUrl` is not trusted or rendered; the dashboard mints a fresh signed URL
  from `media_files`.
- History `oldValue`, `newValue`, and `metadata` are truncated to 500 characters in API responses.
- Dates are treated as IST wall-clock strings. The dashboard does not parse date-only values
  through UTC, avoiding a one-day shift in hearings.
- The SPA fallback returns `index.html` only for non-`/api` GETs; unknown `/api` paths return JSON
  404. This avoids masking API mistakes as a blank dashboard.

### Operations

- SQLite runs with WAL, `synchronous=NORMAL`, `foreign_keys=ON`, and a 5-second busy timeout.
- `SIGTERM`/`SIGINT` close the HTTP server and then the database, so WAL checkpoints cleanly.
- A daily `VACUUM INTO` snapshot is written to `data/backups/`; the newest seven are kept. Render
  does not back up disks, so these snapshots are the server-side safety net.
- The server refuses to start without `APP_SHARED_SECRET`, and the session/file HMAC keys are
  derived from it.

---

## Accepted risk (V1, by design)

| Risk | Why it is accepted | Mitigation available today |
|---|---|---|
| One shared bearer secret — no per-user identity | Small trusted group; accounts were out of scope | Rotate `APP_SHARED_SECRET`, then update every client |
| Anyone with the secret can read and write every case | Same as above | Keep the secret in a password manager; rotate on loss |
| The secret can be extracted from a distributed build if placed in `EXPO_PUBLIC_API_SECRET` | Any client-side secret is extractable | Prefer entering it in Settings, not `.env.local` |
| Dashboard compromise exposes all cases to a read-only view | The dashboard has no write access, but it does show PII | Strong secret, HTTPS, short session lifetime |
| SQLite and uploads are unencrypted at rest | Disk encryption is the hosting platform's responsibility | Use a provider with encrypted volumes; restrict SSH/console access |
| Media capability URLs do not expire | Stored URLs must keep working across devices and restarts | Treat links as sensitive; rotate the secret invalidates every token |
| No rate limiting on `/api/sync` | The server cannot identify a caller beyond the secret | 40 MB body cap, 500-row push cap, 25 MB upload cap |
| CORS defaults to `*` | The mobile app does not use CORS, and self-hosters may run the Expo web preview from another origin | Set `CORS_ORIGINS` to the exact dashboard origin in production |
| Single instance, no horizontal scaling | SQLite is single-writer | Run one instance with a persistent disk |
| No automatic off-site backups | Render disks are not backed up by the platform | Daily `VACUUM INTO` snapshots; copy them off the server |
| History is append-only and client-authored | It is a deterrent, not a tamper-proof audit log | Restrict database access; keep the server private |
| Dashboard session is valid for 12 hours | Balances convenience and exposure | Sign out; rotate the secret |
| `/api/health` is unauthenticated | Render needs a health check | It only runs `SELECT 1` and returns no data |
| Login rate limiter is in-memory | Single instance; restart clears it | The secret should be long and random; five attempts per 15 minutes still applies between restarts |

---

## Operational requirements

1. **Use a long random secret** (32+ bytes). Never use a dictionary phrase.
2. **Serve over HTTPS** outside a trusted LAN. Render provides TLS automatically.
3. **Keep `server/.env` private.** It is gitignored. Do not commit it.
4. **Keep the persistent disk private.** It contains the database and every uploaded file.
5. **Copy backups off the server.** The daily snapshots are on the same disk as the database, so
   a lost disk loses both.
6. **Run exactly one server instance** against a given SQLite file.
7. **Rotate the secret** if a device is lost, a screenshot leaks, or someone leaves the group.
   Rotation invalidates dashboard sessions and every signed media URL.
8. **Do not put a real secret in `EXPO_PUBLIC_API_SECRET`** for a build you distribute. Prefer
   the in-app Settings screen, which stores it in the device keychain.
9. **Review the dashboard URL before sharing it.** Anyone with the secret can sign in.

---

## What is still not defended against

- A malicious member of the group who has the secret. History records a display name, but that is
  not an access control.
- A compromised server, hosting account, or persistent disk.
- A compromised phone with an unlocked screen.
- Traffic analysis by the device's network operator.
- Supply-chain compromise of an npm dependency or the Render build environment.
- Denial of service by someone holding the secret, bounded by the request size and row caps.
- A stolen signed media URL. It grants read access to that one file until the secret is rotated.

---

## Verification performed

- `npm run typecheck` — clean.
- `npm test` — 11 suites, 47 tests passing, including the new transport and credential tests.
- `npm run server:test` — 20 integration tests passing: auth, boolean coercion, monotonic
  versions, History idempotency, non-sync sheets, ID blocks, tombstones, pull overlap, media
  tokens, path traversal, dashboard auth, soft-delete filtering, date handling, rate limiting.
- `npm run dashboard:build` — dashboard typecheck and production build clean.
- Manual end-to-end smoke test: push cases/actions/hearings/documents/history, upload and fetch
  media, dashboard login, summary, case detail, SPA fallback, unauthorized dashboard access, and
  JSON 404 for unknown API routes.
