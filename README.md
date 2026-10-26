# Pawfile

A phone app for animal-rescue activists. It records complaints, tracks rescue and legal work
(police complaint, FIR, court hearings), assigns rescuers, keeps a contact directory, reminds you
about follow-ups, and backs up or syncs the data.

Built with Expo (React Native) and TypeScript. Every record is stored on the phone in SQLite, so
the app works with no account, no server, and no internet. Connecting the optional Google Sheets
backend lets several phones share one dataset.

**Installing on a phone:** a release APK is already published, so you do not need to build the
app. The setup and build sections below are only for running it from source or making changes.

## Screenshots

| Home | Cases | Contacts |
|:---:|:---:|:---:|
| <img src="assets/images/Screenshots/Home.jpeg" width="240" alt="Home worklist with attention strip and filters" /> | <img src="assets/images/Screenshots/Cases.jpeg" width="240" alt="All cases list with status and pending-sync chips" /> | <img src="assets/images/Screenshots/Contacts.jpeg" width="240" alt="Contacts directory of rescuers, NGOs, and legal contacts" /> |
| Worklist, search, filters, and today's priorities | Every case with status and pending-sync chips | Rescue, legal, and veterinary contacts |

| Calendar | More |
|:---:|:---:|
| <img src="assets/images/Screenshots/Calendar.jpeg" width="240" alt="Calendar month grid with day agenda" /> | <img src="assets/images/Screenshots/More.jpeg" width="240" alt="More menu with reports, backup, and settings" /> |
| Hearings and follow-ups by day | Reports, backup, and settings |

---

## Requirements

| Item | Version / note |
|---|---|
| Node.js | `^22.13`, `^24.3`, or newer. Verified on 24.18.0 |
| npm | Ships with Node |
| Phone or emulator | Android or iOS |
| Google account | Only needed for shared data between devices |

Nothing here requires a paid service. The shared backend runs on Google's free Apps Script quota.

---

## 1. Install

```bash
git clone <your-repository-url> animal-welfare
cd animal-welfare
npm install --include=dev
```

`--include=dev` matters if your global npm configuration sets `omit=dev`. The build needs
TypeScript and Jest.

Do not commit `node_modules/` or any `.env` file. `.gitignore` already excludes both.

---

## 2. Run it on a phone

1. Install **Expo Go** from the Play Store or the App Store.
2. Start the development server:

   ```bash
   npm start
   ```

3. Scan the QR code with Expo Go (Android) or the Camera app (iOS).
4. Keep the terminal running while you use the app.

On first launch the app seeds demo cases so the worklist is not empty. Before entering real data,
remove them with **More → Settings → Data and sync → Remove demo data**.

### Development build (needed for notifications)

Expo Go for SDK 58 is missing a native module that `expo-notifications` requires, so the app
deliberately skips notification scheduling there. Everything else works. The in-app Alerts inbox
still functions.

To test follow-up and hearing reminders you need a development build:

```bash
npx expo run:android      # Android Studio + a connected device or emulator
npx expo run:ios          # macOS only
```

A development build produces the `android/` or `ios/` folder locally. Both are gitignored because
Expo regenerates them.

---

## 3. Connect the shared Google backend (optional)

Skip this section if one phone is enough. Without it the app is fully functional offline.

With it, every device reads and writes the same Google Sheet, and photos, videos, and PDFs are
uploaded to Google Drive.

### Short version

1. Create a blank Google Sheet named **Animal Welfare**. Copy the ID from its URL
   (`https://docs.google.com/spreadsheets/d/<ID>/edit`).
2. Open <https://script.google.com>, create a project, and replace `Code.gs` with
   [`backend/apps-script/Code.gs`](backend/apps-script/Code.gs).
3. In **Project Settings → Script Properties**, add:
   - `SPREADSHEET_ID` — the ID from step 1
   - `APP_SHARED_SECRET` — a random string of **at least 16 characters**
   - `DRIVE_ROOT_FOLDER_ID` — optional; the Drive folder where case images and attachments are
     stored. If omitted, a folder is created automatically.
4. Run `setupSpreadsheet` once from the editor and approve the Google permissions.
5. **Deploy → New deployment → Web app**, with **Execute as: Me** and
   **Who has access: Anyone**. Copy the URL ending in `/exec`.
6. In the app: **More → Settings → Data and sync → Shared backend**. Paste the URL and the secret,
   tap **Test connection**, then **Save and sync**.

The full walkthrough, written for non-technical users, is
[`docs/backend-setup-guide.md`](docs/backend-setup-guide.md).

---

## 4. Build a release (optional)

**You do not need this section to use the app.** A release APK is already published; build only
if you want your own copy or are changing the code.

### Before building

Replace the placeholders in [`app.json`](app.json):

| Field | Current placeholder |
|---|---|
| `expo.name` | `Pawfile` |
| `expo.slug` | `pawfile` |
| `ios.bundleIdentifier` | `com.animalwelfare.app` |
| `android.package` | `com.animalwelfare.app` |
| `extra.eas.projectId` | empty |
| Icons and splash | files under `assets/images/` |

### With EAS (recommended)

```bash
npm install -g eas-cli
eas login
eas init                 # creates eas.json and fills extra.eas.projectId
eas build --platform android --profile preview
```

For a store release, use `--profile production` and follow the prompts to create signing
credentials. iOS builds require an Apple Developer account.

### Set production behaviour

Create `.env.local` (gitignored) before building:

```dotenv
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_DEMO_MODE=false
```

Demo seeding is off when `EXPO_PUBLIC_APP_ENV=production`, but setting `EXPO_PUBLIC_DEMO_MODE=false`
explicitly is safer. Prefer entering the backend URL and secret inside the app rather than putting
them in `.env.local`; a value in `.env.local` is compiled into the bundle and can be extracted.

### Local Android build

```bash
npx expo run:android --variant release
```

---

## 5. Verify a change

Run all four before pushing:

```bash
npm run typecheck        # tsc --noEmit
npm test                 # jest, 41 tests
npm run lint             # expo lint
npx expo-doctor          # dependency and config checks
```

Optional bundle check, which catches Metro resolution errors that typecheck misses:

```bash
npx expo export --platform android --output-dir dist
npx expo export --platform web --output-dir dist-web
```

`dist/` and `dist-web/` are build output and are gitignored.

---

## 6. Where the data lives

| Data | Location |
|---|---|
| Cases, actions, hearings, contacts, history | SQLite `animal-welfare.db` in the app sandbox |
| Copies of attached media | App-private `media/<case number>/` |
| Automatic backups | App-private `backups/` — JSON, newest 4 kept, complainant details excluded |
| Shared copy | Google Sheet tabs: `Cases`, `Actions`, `Hearings`, `Contacts`, `Documents`, `History`, `SyncMetadata`, `Config` |
| Shared media | Google Drive under `Animal Rescue App/Cases/#<case number>/` |

Backups are merge-only: a restore adds missing records and never deletes anything. Manual export
produces JSON or a ZIP with media; complainant details are excluded unless explicitly included.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `npm install` skips dev packages | Global npm config sets `omit=dev` | Run `npm install --include=dev` |
| Metro cache serves stale code | Cached bundle | `npx expo start -c` |
| Notifications never fire | Running in Expo Go | Use `npx expo run:android` or an EAS build |
| App shows **On this device** | No backend configured | More → Settings → Data and sync → Shared backend |
| `Unauthorized` | Secret mismatch, under 16 characters, or stale deployment | Re-enter the secret; redeploy a new version |
| `Backend returned 404` | `/dev` URL instead of `/exec` | Use the URL ending in `/exec` |
| Google login page in a browser | Deployment access is not **Anyone** | Edit the deployment settings |
| App shows `Unknown sheet` | Sheet tabs were never created | Run `setupSpreadsheet` again |
| Photos missing from Drive | Wrong Google account, or upload failed | Check the deploying account and the document status in the app |
| Sync stops after editing `Code.gs` | Old version still deployed | Deploy → Manage deployments → New version |
| `npm test` fails with a module error | `node_modules` from an older install | Delete `node_modules` and reinstall |

---

## 8. Current scope

Implemented:

- Worklist with search, filters, overdue-first ordering, and an attention strip
- Three-step case intake with dependent state/district pickers, location fill, and media drafts
- Case details across Details, Rescue, Legal, History, and Documents
- Update flow with rescue/legal status, assignee, next action, due date, FIR and court fields
- Rescue assignment with contact search, call, masked WhatsApp share, and decline/reassign
- Legal workflow with multiple hearings, reminders, and outcome recording
- Contacts and rescue directory with full CRUD
- Calendar agenda, alerts inbox, reports, and settings
- Offline queue, batched sync, last-write-wins conflict history, device case-ID blocks
- Weekly on-open backup with in-app restore, plus merge-only JSON/ZIP restore
- 36 states/UTs and 786 districts, with a custom-district fallback

Not in V1:

- No user accounts or per-person access control; one shared secret protects everything
- Reminders fire only on the device that created them; the Alerts inbox is shared
- No real-time sync — polling every five minutes
- No duplicate-complaint detection
- No web app; the web export exists for development
- Automatic backups run on app open, not as an OS background task, and exclude media

Security model, patched findings, and accepted risks: [`docs/security.md`](docs/security.md).

---

## 9. Documentation

| Document | Contents |
|---|---|
| [`docs/app-overview.md`](docs/app-overview.md) | What the app is and what V1 covers |
| [`docs/backend-setup-guide.md`](docs/backend-setup-guide.md) | Step-by-step Google backend setup, written for non-technical users |
| [`docs/security.md`](docs/security.md) | Threat model, fixes, accepted risks |
| [`backend/apps-script/README.md`](backend/apps-script/README.md) | Short technical backend reference |
