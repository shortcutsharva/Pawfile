# Google Sheets + Drive backend setup

> New to this? Follow the non-technical, step-by-step
> [Google Backend Setup Guide](../../docs/backend-setup-guide.md). This file is the shorter
> technical reference.

The app is local-first and runs without this backend. When the values below are set, it
switches from `LocalOnlyTransport` to the Apps Script transport and syncs cases, actions,
hearings, contacts, documents, and history into one shared spreadsheet.

## 1. Create the spreadsheet

1. Create a Google Sheet named **Animal Welfare**.
2. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`

## 2. Create the Apps Script project

1. Open <https://script.google.com> and create a new project.
2. Replace the default `Code.gs` with `backend/apps-script/Code.gs`.
3. Open **Project Settings → Script Properties** and add:
   - `SPREADSHEET_ID` — the ID from step 1
   - `APP_SHARED_SECRET` — a long random string (this is the app's only credential)
   - `DRIVE_ROOT_FOLDER_ID` — optional folder ID for media; if empty the script creates
     an **Animal Rescue App** folder in the deploying account's Drive
4. Run the `setupSpreadsheet` function once and authorize the requested scopes
   (Sheets and Drive). This creates the eight sheets with their headers.
5. Deploy → **New deployment** → **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
6. Copy the deployment URL ending in `/exec`.

## 3. Configure the app

Preferred: open **Settings → Shared backend** in the app and enter the `/exec` URL and the same
shared secret. The values are stored in the device keychain (SecureStore) and take effect
immediately; unsynced device records are uploaded on the first sync. No rebuild is needed.

For build-time defaults, create `.env.local` in the project root instead (gitignored):

```dotenv
EXPO_PUBLIC_SHEETS_ENDPOINT=https://script.google.com/macros/s/XXXXXXXX/exec
EXPO_PUBLIC_SHEETS_SECRET=the-same-long-random-string
EXPO_PUBLIC_DEMO_MODE=true
```

Restart Expo (`npx expo start --clear`). In **Settings → Data and sync** the backend should
show **Google Sheets**. Writes queue locally and sync every five minutes, on network regain,
on app foreground, and with **Sync now**.

The app never needs the spreadsheet ID; it stays in the Apps Script `SPREADSHEET_ID` property.

## Security notes

Full review: [`docs/security.md`](../../docs/security.md).

- **The secret is the only credential.** Anyone with the `/exec` URL and the secret can read and
  write every case, including complainant details. It must be at least 16 characters; shorter
  values are rejected.
- The secret is sent in the POST body only. Query-string secrets are not accepted, because URLs
  end up in request logs.
- Comparisons are constant-time, and misconfiguration details are written to the Apps Script
  execution log rather than returned to the caller.
- Untrusted text is written to cells as literal text, so a case description cannot become a
  spreadsheet formula.
- Media uploads validate the case id, category, MIME type, file name, and decoded size (25 MB)
  before touching Drive.
- Case-number blocks are allocated under a script lock, so two devices cannot mint the same ids.
- No service-account key is embedded in the app. The client pins the endpoint to
  `https://script.google.com/.../exec`, so a pasted URL cannot receive the secret.
- Share the spreadsheet and Drive folder only with the deploying account and named admins.
- The Apps Script web app runs as the deploying account; it never needs the spreadsheet
  shared publicly. Turn on 2-Step Verification for that account.

**After editing `Code.gs`, always redeploy a new version** (Deploy → Manage deployments → pencil →
New version). Saving alone does not update the live `/exec` endpoint.

## Troubleshooting

- **Unauthorized** — the secret in `.env` does not match `APP_SHARED_SECRET`.
- **Unknown sheet** — run `setupSpreadsheet` again.
- **429 / quota** — the app batches 50 rows and retries with backoff; wait for the next sync.
- **Media upload fails** — confirm Drive is authorized and the file is under 25 MB.
