# SQLite Server Setup Guide

**For non-technical users — no coding required.**

This guide connects the Pawfile app to a shared SQLite server that you run yourself. Once it is
done, every activist using the app can see the same cases, photos, and documents, and you can open
a read-only dashboard in a browser.

You only do this setup **once** per organization. The app remembers it afterwards.

---

## What you need

- A computer with Node.js 22.13 or newer. Install it from <https://nodejs.org>.
- The project files from this repository.
- A phone with the Pawfile app installed, for testing.
- About 20 minutes for local setup.
- Optional: a GitHub account and a Render account if you want the server on the internet.

You do **not** need:

- A Google account.
- A spreadsheet.
- A paid service for local use. Render requires a paid instance once you attach the persistent
  disk that SQLite needs.

> **Before you start:** the shared secret is the *only* thing protecting every case in this
> system, including complainant names and phone numbers. Anyone who has the server URL and the
> secret can read and change everything. Read [Security Review](security.md) for the full model
> and the accepted risks.

---

## How it works, in plain English

```text
Phone app
   │  sends data + a shared secret
   ▼
Pawfile server  ──►  SQLite database  (cases, actions, contacts, history)
   │
   ├───────────────►  Uploads folder  (photos, videos, PDFs)
   │
   └───────────────►  Dashboard website  (read-only view of the same data)
```

- The **server** is a small program that runs on your computer or on a hosting service.
- The **SQLite database** is a single file. It is the shared database.
- The **uploads folder** stores the actual photo, video, and PDF files.
- The **shared secret** is like a password. The app and the dashboard must include it, or the
  server refuses the request.
- The **dashboard** is a website served by the same server. It is read-only; editing happens in
  the app.

---

## Part 1 — Prepare the project

1. Download or clone this repository to a folder on your computer.
2. Open a terminal in that folder.
3. Install the app, server, and dashboard:

   ```bash
   npm install --include=dev
   npm run stack:install
   ```

4. Create the server settings file:

   ```bash
   cp server/.env.example server/.env
   ```

   On Windows PowerShell, use:

   ```powershell
   Copy-Item server\.env.example server\.env
   ```

5. Open `server/.env` in a text editor.

### Create the shared secret

Find the line:

```dotenv
APP_SHARED_SECRET=replace-with-a-long-random-string
```

Replace the placeholder with a long random password. **It must be at least 16 characters.**
A 64-character value is ideal.

Generate one with:

**Windows PowerShell:**

```powershell
[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
```

**Mac/Linux terminal:**

```bash
openssl rand -hex 32
```

Copy the result into `server/.env`. Treat it like a password:

- Do not add spaces or quotation marks.
- Do not share it in a public chat, screenshot, or document.
- Save it somewhere safe. If you lose it, you can replace it, but every phone and the dashboard
  will need the new value.

---

## Part 2 — Start the server and dashboard

Open a terminal in the project folder and run:

```bash
npm run server:dev
```

You should see:

```text
Pawfile server listening on http://0.0.0.0:4000
Database: .../server/data/pawfile.db
Uploads: .../server/data/uploads
```

Leave this terminal running.

In a second terminal, start the dashboard:

```bash
npm run dashboard:dev
```

Open <http://localhost:5173>. Sign in with the shared secret from Part 1. You should see the
dashboard overview.

You can also run both together with:

```bash
npm run stack:dev
```

### Check the server directly

Open <http://localhost:4000/api/health> in a browser. You should see:

```json
{"ok":true,"service":"pawfile-server"}
```

---

## Part 3 — Connect the app

The app needs a URL it can reach from the phone.

### Android emulator

Use:

```text
http://10.0.2.2:4000
```

`10.0.2.2` is the emulator's address for your computer.

### Physical phone on the same Wi-Fi

1. Find your computer's local IP address:
   - **Windows:** run `ipconfig` and look for **IPv4 Address** (for example `192.168.1.20`).
   - **macOS/Linux:** run `ifconfig` or `ip addr`.
2. Use:

   ```text
   http://192.168.1.20:4000
   ```

3. Make sure the phone and computer are on the same Wi-Fi network.
4. If the phone still cannot connect, allow Node.js through your computer's firewall.

### Internet

If you deployed the server to Render (Part 5), use the public URL:

```text
https://pawfile-server.onrender.com
```

### Enter it in the app

1. Open **More → Settings → Data and sync → Shared backend**.
2. Enter the **Server URL** (base URL only; do **not** include `/api/sync`).
3. Enter the **shared secret**.
4. Tap **Test connection**. You should see "Connection successful".
5. Tap **Save and sync**.
6. Wait for the sync to finish.

The app is still fully usable offline. Writes queue locally and drain on the next sync.

> **Plain HTTP is only accepted for localhost, `10.0.2.2`, and private LAN addresses.** A public
> server must use HTTPS, because the secret is sent with every request.

### If you have more than one phone

Connect **one phone first** and let it finish its first sync. Then connect the others. The sync
model is last-write-wins, so connecting several phones with different local records at the same
time can discard a local edit.

---

## Part 4 — Check that it worked

In the app:

- [ ] **Settings → Data and sync** shows **SQLite server**.
- [ ] Pending writes goes down to `0` after a sync.
- [ ] A new case appears in the dashboard.
- [ ] A photo attached to a case reaches the dashboard's Documents page.

In the dashboard:

- [ ] Overview shows the case count.
- [ ] Cases lists the case.
- [ ] Case detail shows actions, hearings, documents, and history.
- [ ] Documents show image previews.
- [ ] The **Sign out** button returns to the login screen.

On the server:

- [ ] `server/data/pawfile.db` exists.
- [ ] `server/data/uploads/` contains folders for case numbers.
- [ ] `server/data/backups/` contains a dated backup after the first day.

---

## Part 5 — Deploy to Render (optional)

Use this if the phone and server are not always on the same network, or if you want the dashboard
available anywhere.

The repository includes `render.yaml`, which defines:

- one Node web service
- a 1 GB persistent disk mounted at `/var/data`
- a generated `APP_SHARED_SECRET`
- the dashboard build and API start commands

### Steps

1. Push this repository to GitHub.
2. Sign in to <https://render.com>.
3. Choose **New → Blueprint**.
4. Connect the GitHub repository.
5. Render reads `render.yaml`. Approve the **Starter** plan. Persistent disks are not available
   on the free plan.
6. Wait for the deploy. The health check is `/api/health`.
7. Open the service and copy:
   - the public URL, for example `https://pawfile-server.onrender.com`
   - the generated `APP_SHARED_SECRET` from the environment variables
8. Enter both in the app's **Shared backend** screen.
9. Open the public URL in a browser. The dashboard login should appear.

### Important Render details

- **One instance only.** SQLite is single-writer. Do not scale the service horizontally.
- **The disk is required.** Without it, a redeploy loses the database and uploads.
- **Render does not back up disks.** The server writes a daily snapshot to
  `server/data/backups/` and keeps the newest seven. Download copies if the data matters.
- **Deploys restart the server.** An in-flight sync can fail; the app retries from its queue.
- **Changing the secret** requires updating Render, every phone, and the dashboard login.

---

## Part 6 — Backups, updates, and secret rotation

### Backups

- The server runs `VACUUM INTO` once a day and keeps seven dated files in
  `server/data/backups/`.
- The app also keeps local backups on each phone.
- For a manual copy, stop the server first, then copy `server/data/pawfile.db` and
  `server/data/uploads/`. Copying a live WAL database without care can produce an inconsistent
  file; prefer the dated snapshots.

### Updating the server code

1. Pull the new code.
2. Run `npm run stack:install` if dependencies changed.
3. Restart `npm run server:dev`, or redeploy on Render.
4. The database schema is versioned. The server refuses to start if the existing database is
   missing a required table or column, rather than silently corrupting data.

### Rotating the shared secret

1. Change `APP_SHARED_SECRET` in `server/.env` (or Render).
2. Restart or redeploy the server.
3. Update every phone in **Settings → Shared backend**.
4. Sign in to the dashboard again with the new secret.
5. Old clients show `Unauthorized` until updated.

---

## Keeping it safe

- **Use HTTPS outside your LAN.** The secret is a bearer credential.
- **Use a 16+ character random secret.** Short secrets are rejected.
- **Keep `server/.env` private.** It contains the only credential.
- **Do not commit the database or uploads.** They contain complainant names, phone numbers, and
  case media.
- **The dashboard session is an HttpOnly cookie.** The master secret is not stored in browser
  JavaScript after login.
- **Media links are capability URLs.** A signed file URL grants read access to that one file.
  Treat screenshots and links as sensitive.
- **Rate limiting:** the dashboard login allows five failed attempts per 15 minutes per IP.
- **The server is single-tenant.** There are no user accounts or roles; everyone with the secret
  has full access.

---

## Troubleshooting

| What you see | Likely cause | What to do |
|---|---|---|
| `APP_SHARED_SECRET must be at least 16 characters` | The secret is too short or missing | Set a long random value in `server/.env` |
| App shows **Unauthorized** | Secret mismatch | Re-enter the exact secret in the app |
| App cannot reach the server | Wrong URL, firewall, or different network | Use `10.0.2.2` on the emulator, or the computer's LAN IP on a phone |
| `Backend returned 404` | The URL includes `/api/sync` or a wrong path | Enter the base URL only |
| Dashboard login fails | Wrong secret, or rate-limited | Wait 15 minutes after five failures, then retry |
| Dashboard is blank | The dashboard was not built | Run `npm run dashboard:build` and restart the server |
| `database is locked` | More than one server is using the same file | Stop the extra instance |
| Images show a 403 | The signed file URL is invalid | Re-open the document from the dashboard; do not edit the URL |
| `File is too large` | Upload over 25 MB | Compress or trim the media |
| Render deploy fails | Build or native module error | Check the Render build log; Node 22.13 is pinned in `render.yaml` |
| Data disappears after deploy | The disk is not mounted at `/var/data` | Check the disk and `DATABASE_PATH` / `UPLOADS_DIR` |
| Node warns about install scripts | npm blocked native build scripts | Run `npm rebuild better-sqlite3 esbuild --foreground-scripts` inside `server/` and `dashboard/` |

---

## Frequently asked questions

**Do I need to keep my computer on?**
Only for a local server. If you deploy to Render, Render keeps it running.

**Do I have to pay for this?**
Local use is free. Render requires a paid instance for the persistent disk.

**Can I use Dropbox/OneDrive for the database?**
No. SQLite must live on a local disk that the server can lock. Syncing the file through a cloud
drive can corrupt it.

**Can several people edit at the same time?**
Yes, through the app. The sync model is last-write-wins at the record level. The dashboard is
read-only.

**Where are photos stored?**
In `server/data/uploads/<case number>/<category>/`. The app stores the file metadata in the
database and a signed URL for display.

**What happens if the server is offline?**
The app keeps working locally and queues writes. When the server returns, sync drains the queue.

**Can I change the animal types or categories?**
Yes. The defaults are in the app's **Settings → Categories**. To ship the same lists to everyone,
update `src/config/defaults.ts` before building the app.

---

## Final success checklist

- [ ] Node.js 22.13+ is installed.
- [ ] `npm install --include=dev` and `npm run stack:install` completed.
- [ ] `server/.env` has a random `APP_SHARED_SECRET` of at least 16 characters.
- [ ] `http://localhost:4000/api/health` returns `ok: true`.
- [ ] The dashboard opens at `http://localhost:5173` and accepts the secret.
- [ ] The app connects in **Settings → Shared backend**.
- [ ] A test case appears in the dashboard.
- [ ] A test photo appears in the Documents page.
- [ ] `server/data/backups/` receives a dated snapshot.
- [ ] If deployed, the Render disk is mounted and the public URL uses HTTPS.

When all of these are true, the shared SQLite backend is fully set up.
