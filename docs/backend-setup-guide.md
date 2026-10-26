# Google Backend Setup Guide

**For non-technical users — no coding required.**

This guide connects the Animal Welfare app to a shared Google Sheet and Google Drive folder.
Once it is done, every activist using the app can see the same cases, and case photos and
documents are uploaded to Drive.

You only do this setup **once** per organization. The app remembers it afterwards.

---

## What you need

- A Google account. This account will own the Sheet, the Drive folder, and the backend.
- A computer with a browser. The setup is much easier on a computer than on a phone.
- About 20 minutes.
- The Animal Welfare app installed on at least one phone for testing.
- The project files from this repository:
  - [`backend/apps-script/Code.gs`](../backend/apps-script/Code.gs)
  - [`backend/apps-script/appsscript.json`](../backend/apps-script/appsscript.json)

You do **not** need:

- A server.
- A paid Google Cloud account.
- A service-account key.
- Any programming experience.

> **Before you start:** the shared secret you create in Part 3 is the *only* thing protecting every
> case in this system, including complainant names and phone numbers. Anyone who has the `/exec`
> URL and the secret can read and change everything. Read
> [Security Review](security.md) for the full model and the accepted risks.

---

## How it works, in plain English

```text
Phone app
   │  sends data + a shared secret
   ▼
Google Apps Script  ──►  Google Sheet  (cases, actions, contacts, history)
   │
   └──────────────────►  Google Drive  (photos, videos, PDFs)
```

- The **Google Sheet** is the shared database. It stores text records.
- **Google Drive** stores the actual photo, video, and PDF files.
- **Google Apps Script** is a small program that sits between the app and Google. It checks the
  shared secret and moves data in and out.
- The **Apps Script URL** is the address the app sends data to.
- The **shared secret** is like a password. The app must include it, or Google refuses the request.

> The Sheet's **Documents** tab stores information *about* each photo (file name, case number,
> upload status, Drive link). It does **not** display the photo itself. The photo is in Drive.

---

## Part 1 — Create the Google Sheet

1. Open <https://sheets.google.com> in your browser.
2. Sign in with the Google account that should own the shared database.
3. Click **Blank spreadsheet**.
4. Rename it to **Animal Welfare**.
5. Look at the address bar. It looks like this:

```text
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz123456/edit#gid=0
                                      └──────────── SPREADSHEET_ID ────────────┘
```

6. Copy the long code between `/d/` and `/edit`. This is your **Spreadsheet ID**.
   - Copy only the code.
   - Do not copy the whole web address.

**Important:** if another person owns the Sheet, share it with the Google account that will
deploy the backend (see Part 2) and give that account **Editor** access.

---

## Part 2 — Create the Apps Script project

**Apps Script** is Google's built-in automation tool. You will paste one file into it.

1. Open <https://script.google.com>.
2. Make sure you are signed in with the **same Google account** that owns or can edit the Sheet.
3. Click **New project**.
4. At the top-left, rename it to **Animal Welfare Backend**.
5. In the editor you will see a file called `Code.gs` containing some sample code.
6. Select all of that sample code and delete it.
7. Open [`backend/apps-script/Code.gs`](../backend/apps-script/Code.gs) from this project in
   another tab or editor.
8. Copy the **entire** file and paste it into the Apps Script editor.
9. Press **Ctrl+S** (Windows) or **Cmd+S** (Mac) to save.

**Optional:** if you want the timezone and web-app access pre-set, also replace the
`appsscript.json` file:

1. In Apps Script, click **Project Settings** (gear icon).
2. Turn on **Show "appsscript.json" manifest file in editor**.
3. Open `appsscript.json` in the editor.
4. Replace its contents with [`backend/apps-script/appsscript.json`](../backend/apps-script/appsscript.json).
5. Save.

You can skip this optional step. If you skip it, you will choose the same settings manually in
Part 5.

---

## Part 3 — Add the three settings (Script Properties)

Script Properties are private settings stored inside the Apps Script project. The app never
contains these values.

1. In the Apps Script window, click the **gear icon → Project Settings** on the left.
2. Scroll down to **Script Properties**.
3. Click **Add script property** three times and fill in:

| Property name | What to enter | Required? |
|---|---|---|
| `SPREADSHEET_ID` | The ID you copied in Part 1 | Yes |
| `APP_SHARED_SECRET` | A long random password you create | Yes |
| `DRIVE_ROOT_FOLDER_ID` | The ID of a Drive folder for photos (optional) | No |

### Creating the shared secret

Use a password manager to generate a long random password (64 characters is ideal), or run one
of these commands.

**The backend rejects any secret shorter than 16 characters**, so do not invent a short one.

**Windows PowerShell:**

```powershell
[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
```

**Mac/Linux terminal:**

```bash
openssl rand -hex 32
```

Copy the result. You will paste it into the app in Part 7.

- Treat it like a password.
- Do not add spaces or quotation marks.
- Save it somewhere safe. If you lose it, you can replace it later, but every phone will need
  the new value.

### Optional: choosing the Drive folder for photos

If you leave `DRIVE_ROOT_FOLDER_ID` empty, the backend creates a folder called
**Animal Rescue App** in the deploying account's Google Drive.

If you want photos in a specific folder:

1. Open <https://drive.google.com>.
2. Create a folder, for example **Animal Welfare Media**.
3. Open the folder and copy the ID from the address bar:

```text
https://drive.google.com/drive/folders/1XyZ...ABC
                                        └─ FOLDER_ID ─┘
```

4. Paste that value into `DRIVE_ROOT_FOLDER_ID`.

**Important:** the Drive folder will be created inside the Google account that deploys the
script. If you later open Drive with a different Google account, you will not see the photos.

---

## Part 4 — Run `setupSpreadsheet` once

This creates the database tabs in the Sheet.

1. In the Apps Script toolbar, find the function dropdown next to **Run**.
2. Select `setupSpreadsheet`.
3. Click **Run**.
4. Google will ask for permission the first time:
   - Choose the same Google account.
   - Click **Review permissions**.
   - Click **Advanced**.
   - Click **Go to Animal Welfare Backend (unsafe)**.
   - Click **Allow**.

   The word "unsafe" appears because this is your own personal script, not a Google-verified
   app. This is normal for a private tool.

5. Look at the **Execution log** at the bottom. A successful run ends with:

```text
Spreadsheet ready
```

6. Open the Google Sheet. You should now see eight tabs:

```text
Cases · Actions · Hearings · Contacts · Documents · History · SyncMetadata · Config
```

Each tab has a frozen header row. The `Config` tab contains default category lists.

### If this step fails

| Message | What it means |
|---|---|
| `SPREADSHEET_ID is not set in Script Properties` | The property name is misspelled or the value is empty |
| `PERMISSION_DENIED` or `You do not have permission` | The Sheet ID is wrong, or this Google account cannot edit the Sheet |
| `Unknown sheet` | Run `setupSpreadsheet` again |
| The authorization window keeps returning | Try an incognito window or allow third-party cookies |

---

## Part 5 — Deploy the web app

This creates the address the phone app will call.

1. Click **Deploy → New deployment** in the top-right corner.
2. Click the gear icon next to **Select type** and choose **Web app**.
3. Fill in:

   - **Description:** `Animal Welfare V1`
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone`

4. Click **Deploy**.
5. If Google asks for permission again, repeat the approval steps from Part 4.
6. Copy the **Web app URL**. It looks like:

```text
https://script.google.com/macros/s/AKfycb.../exec
```

### Important details

- Use the URL ending in **`/exec`**.
- Do **not** use the URL ending in `/dev`. That one only works while you are signed in and is
  not the stable address.
- **Who has access** must be **Anyone**. The app cannot sign in with Google, so it needs a
  publicly reachable address.
- The shared secret is what protects the data. Anyone who has both the URL and the secret can
  use the backend, so treat the secret like a password.

---

## Part 6 — Test the backend before using the app

### Simple test

1. Paste the `/exec` URL into a browser address bar.
2. You should see a response like:

```json
{"ok":true,"service":"animal-welfare","time":"2026-10-26T..."}
```

If you see a Google sign-in page or "Sorry, unable to open the file", go back to Part 5 and set
**Who has access** to **Anyone**.

### Test the secret (optional, more technical)

**Windows PowerShell:**

```powershell
$body = @{
  action = 'health'
  secret = 'PASTE_YOUR_SECRET_HERE'
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri 'https://script.google.com/macros/s/PASTE_DEPLOYMENT_ID/exec' `
  -ContentType 'text/plain;charset=utf-8' `
  -Body $body
```

A correct secret returns:

```text
ok
--
True
```

`Unauthorized` means the secret in the request does not exactly match `APP_SHARED_SECRET`.

---

## Part 7 — Connect the app

1. Start the app.
2. Open **More → Settings → Data and sync → Shared backend**.
3. Enter:
   - **Apps Script URL:** the `/exec` URL from Part 5
   - **Shared secret:** the `APP_SHARED_SECRET` from Part 3
4. Tap **Test connection**. You should see "Connection successful".
5. Tap **Save and sync**.
6. Wait for the sync to finish.

If you prefer to set the values when building the app, put them in a `.env.local` file in the
project root instead:

```dotenv
EXPO_PUBLIC_SHEETS_ENDPOINT=https://script.google.com/macros/s/PASTE_DEPLOYMENT_ID/exec
EXPO_PUBLIC_SHEETS_SECRET=PASTE_YOUR_SECRET_HERE
```

Then restart the app with `npx expo start -c`. In-app setup is easier and does not require a
rebuild.

> **Demo data:** if the app currently contains sample/demo cases and you do not want them in the
> shared Sheet, remove them first with **Settings → Data → Remove demo data**.

---

## Part 8 — Check that it worked

In the app:

- [ ] Backend shows **Google Sheets** in **Settings → Data and sync**.
- [ ] Pending writes goes down to `0` after a sync.
- [ ] A new case appears in the Sheet's **Cases** tab.
- [ ] The **Actions**, **History**, and other tabs fill in as you use the app.
- [ ] `SyncMetadata` contains a `nextCaseId` row.
- [ ] **Retry sync** works if a temporary network error occurs.

In Google Drive (signed in as the **deploying account**):

- [ ] A folder called **Animal Rescue App** exists.
- [ ] Inside it: **Cases → #<case number> → Photos / Evidence**.
- [ ] New case photos appear there after they finish uploading.

In the app's **Case Details → Documents** tab:

- [ ] Each photo shows as uploaded.
- [ ] If it says **Pending** or **Failed**, tap retry.

### Where photos actually go

This is the most common point of confusion:

- **Google Sheets** shows a **row of information** about each photo in the `Documents` tab.
- **Google Drive** holds the actual image file.
- **The app** shows the photo preview.
- The Sheet will never display the image itself. That is expected.

If the photo is visible in the app but missing from Drive, check:

1. Are you signed in to the **same Google account** that deployed the script?
2. Does the Drive folder have an **Animal Rescue App** folder?
3. Is the file under **Cases → #<case number>**? The case number is shown at the top of the
   case in the app.
4. In the app, does the document say **uploaded** or **failed**?

---

## Part 9 — Updating the backend later

You only need this if you change `Code.gs` — including when you take a security update.

> **Security updates only take effect after a redeploy.** Editing and saving the file is not
> enough; the deployed version keeps running the old code. Follow the steps below every time.

1. Edit and save the file in Apps Script.
2. Click **Deploy → Manage deployments**.
3. Click the pencil icon on the existing deployment.
4. Change **Version** to **New version**.
5. Click **Deploy**.

The `/exec` URL stays the same. Do **not** create a new deployment unless you intentionally want
a new address.

Run `setupSpreadsheet` again only if the Sheet tabs or columns change.

---

## Keeping it safe

- **The app only accepts `https://script.google.com/.../exec`.** This is deliberate: the shared
  secret is a password, and a URL from a chat message or email should not be able to receive it.
- **Google Sheets treats a cell starting with `=`, `+`, `-`, or `@` as a formula.** The backend
  stores those values as plain text (you may see a leading apostrophe in the formula bar), so a
  case description can never run as a formula when you open the Sheet.
- **Uploads are checked before they reach Drive** — case numbers, categories, file types, file
  names, and the 25 MB size limit are all validated by the backend.
- The Google Sheet and Drive folder should stay private. Share them only with the deploying
  account and named admins.
- Never share the shared secret in a public chat, screenshot, or document.
- The app stores the secret on each phone using the device's secure storage.
- If the secret leaks:
  1. Change `APP_SHARED_SECRET` in Script Properties.
  2. Update every phone in **Settings → Shared backend**.
  3. Old phones will show `Unauthorized` until updated.
- The Apps Script runs using the deploying account's Google quota. This is normally fine for a
  small organization.
- The backend script sets uploaded Drive files to **private**.

---

## Troubleshooting

| What you see | Likely cause | What to do |
|---|---|---|
| `Unauthorized` in the app | The secret does not match | Re-enter the exact secret on the phone |
| `Backend returned 404` | Wrong URL | Use the URL ending in `/exec`, not `/dev` |
| "Use the https://script.google.com deployment URL" | The URL was edited, proxied, or shortened | Paste the original deployment URL exactly as Apps Script showed it |
| "The shared secret must be at least 16 characters" | The secret is too short | Generate a new 64-character secret and update Script Properties |
| Browser shows a Google login page | Access is not set to **Anyone** | Edit the deployment in Part 5 |
| App says `Unknown sheet` | `setupSpreadsheet` was not run | Run it again in Part 4 |
| `SPREADSHEET_ID is not set` | Property missing or misspelled | Check Script Properties in Part 3 |
| Case data syncs but photos do not appear in Drive | Looking at the wrong Google account, or upload failed | Check the account and the document status in the app |
| Photo upload fails | File is over 25 MB, or Drive permission is missing | Use a smaller file and re-authorize the script |
| `Unsupported file type` | The file is not JPEG, PNG, HEIC, MP4, MOV, or PDF | Convert the file or attach a supported type |
| `Invalid caseId` | The backend rejected a malformed case number | Sync from the app; do not hand-edit the `Cases` caseId column |
| `File is too large` | The upload exceeded the 25 MB decoded limit | Compress or trim the media |
| `Request failed` with a 500-style response | The backend hit an unexpected error | Open **Apps Script → Executions** to read the logged reason |
| `Unauthorized` even though the secret looks right | The secret is shorter than 16 characters, or has not been redeployed | Recreate a long secret and redeploy a **New version** |
| The Sheet's `Documents` row still says `device-only` | The Drive link has not synced yet | Open **Settings → Shared backend → Save and sync**, or restart the app so the pending row is pushed |
| `429` or quota messages | Google is temporarily rate-limiting | Wait, then tap **Retry sync** |
| Sync stops working after changing `Code.gs` | The old version is still deployed | Use **Manage deployments → New version** |
| Works on a phone but not in a browser | Browser security (CORS) blocks Apps Script requests | Test sync on a phone or emulator, not the web preview |

---

## Frequently asked questions

**Do I need to keep my computer on?**
No. Apps Script runs inside Google's servers.

**Do I have to pay for this?**
No. It uses a normal Google account and Google's free quotas. Heavy use can hit quotas.

**Can I use a different Google account for the Sheet and the script?**
Yes, but the deploying account must have Editor access to the Sheet. The Drive folder will be
created in the deploying account's Drive.

**Why can't I see images inside the Google Sheet?**
Sheets stores text and numbers. Photos are files, so they live in Drive. The Sheet keeps a
record of each file and its Drive link.

**Can other activists see the photos in the app?**
They see them after the upload finishes and the app syncs. They do not need access to your
Google Drive.

**What happens if I change the Sheet name?**
The name does not matter. The `SPREADSHEET_ID` does. Do not change the IDs.

**What happens if I delete the Sheet or Drive folder?**
The backend loses its storage and sync fails. Restore them from Google Drive's trash, or create
new ones and repeat Parts 1–3.

**Can I change the animal types or categories?**
Yes. The defaults are in the App's **Settings → Categories**. Note that this is stored per
device, not in the shared Sheet. To ship the same lists to everyone, update
`src/config/defaults.ts` before building the app.

---

## Final success checklist

- [ ] Google Sheet named **Animal Welfare** exists.
- [ ] Apps Script project contains the `Code.gs` from this repository.
- [ ] Script Properties include `SPREADSHEET_ID` and `APP_SHARED_SECRET`.
- [ ] `setupSpreadsheet` ran and created 8 tabs.
- [ ] Web app is deployed with **Execute as: Me** and **Who has access: Anyone**.
- [ ] The `/exec` URL returns `ok: true` in a browser.
- [ ] The app is connected in **Settings → Shared backend**.
- [ ] A test case appears in the Sheet.
- [ ] A test photo appears in Drive under `Animal Rescue App/Cases/#<case>/Photos`.
- [ ] The app's Documents tab shows the photo as **uploaded**.

When all of these are true, the shared backend is fully set up.
