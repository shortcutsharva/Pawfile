# Animal Rescue & Legal Case Management App: Overview

Source: `Animal Rescue & Legal Case Management App.pdf` (Functional Note with Mobile Screen Wireframes, Version 1.0)

## 1. Purpose

A mobile-first tool for animal welfare activists to manage animal cruelty complaints, coordinate rescues, follow up with police, and track court proceedings.

It solves three problems:

1. **Rescue coordination.** Complaints arrive through WhatsApp, Facebook and phone. Rescues must be assigned, monitored and followed through.
2. **Legal case management.** Police complaints, FIRs, court hearings and follow-ups must be tracked systematically.
3. **Accountability.** Cases are assigned to different people and organizations. Pending actions and responsibilities must be visible.

**Core principle:** This is a daily action tracker, not an analytics dashboard. On opening the app, the user sees the cases needing attention, the next action, the responsible person and the due date.

## 2. V1 Scope

- Mobile-first application
- No login or user management
- Shared central database
- Case registration and tracking
- Rescue and legal workflows
- Assignment to Self, individuals or organizations
- Search and filtering by status, assignee and due date
- Follow-up reminders and court hearing alerts
- Contact directory
- Case history and document storage

## 3. Users and Roles

- There are no user accounts or roles in V1. The app is used by activists sharing one central database.
- **Assignee:** the person or organization expected to perform an action (Self, an individual, an NGO, an advocate, a family member).
- **Follow-up By:** the person responsible for checking that the action is completed. This can differ from the assignee.
- External contacts (rescue teams, vets, police, advocates) do not need app access in V1.

## 4. Screens and Navigation

Primary flow: **Home → Case Details → New/Update Case**

| Screen | Purpose |
|---|---|
| Home (Daily Worklist) | Rescue Actions and Legal Case Actions lists, search, filters, fixed `+ New Case` button |
| New Case | Three-step complaint registration |
| Case Details | Five sections: Details, Rescue, Legal, History, Documents |
| Update Case | Record action taken, status, assignee, next action, follow-up date, attachments |
| Assign Rescue | Location-based contact search, call, WhatsApp share, select |
| Court Hearing | Add/record a hearing for a legal case |
| Contacts | Directory of people and organizations |
| Calendar | Hearings and scheduled actions |

Menu items: Home, All Cases, Calendar, Contacts, Rescue Organizations, Reports, Settings, Backup / Export.

## 5. Home Screen: Daily Worklist

Two sections: **Rescue Actions** and **Legal Case Actions**. Each shows actual pending cases, not summary counts.

Each case card shows:
- Case ID (e.g. `#1042`)
- Case title / animal type (e.g. "Injured Dog")
- Location (e.g. "Mysuru, Karnataka")
- Status
- Assigned To
- Next Action
- Due date or hearing date
- Quick actions (Attend, Assign, Call, Update, Follow-up, Details, Reassign)

**Search:** case ID, FIR number, location, animal type, complainant, assignee.

**Filters:**
- Status: All, To Attend, Follow-up, In Progress, Closed
- Assigned To: All, Self, specific person or organization
- Due: All, Overdue, Today, Next 7 Days, Upcoming

## 6. New Case Registration

Three short steps. An FIR is **not** required to register a case.

1. **Complaint:** animal type (Dog, etc.), complaint category (e.g. Cruelty), description, photos and videos.
2. **Location & Contact:** state, district/city, location (address or map pin), complaint source (WhatsApp, Facebook, phone, etc.), complainant name (optional), mobile number (optional).
3. **Action:**
   - Rescue required: Yes / No / Not Sure
   - Legal action required: Yes / No / To Assess
   - Urgency: e.g. High
   - Assigned To: Self or a contact
   - Next action (free text, e.g. "Contact local rescue team")
   - Follow-up date and time

On save, the system generates a unique case ID. If both rescue and legal action are needed, separate actions are created under the same case. Police complaint and FIR details can be added later.

## 7. Case Details

Selecting a case opens its full record with a status header (Rescue status, Legal status), next action, assignee, follow-up owner and due date, and buttons for Update, Reassign and Call.

Sections:
- **Details:** complaint description, incident location, animal information, complainant.
- **Rescue:** assigned organization, animal condition, rescue status, outcome.
- **Legal:** police station, complaint, FIR number and date, investigating officer, court, court case number, hearings, next hearing, assigned person.
- **History:** chronological log of every activity, status change, assignment and follow-up.
- **Documents:** evidence, photos, FIR copies, veterinary reports, court orders.

Actions available from this screen: update the case, reassign an action, call a contact, schedule a follow-up, add a document, add a note.

## 8. Rescue Workflow

```
To Attend
  ├── Attend Yourself
  └── Assign Rescue Team
        → Select Contact
        → Share Case Details (call or WhatsApp)
        → Await Confirmation
              ├── Accepted → Rescue In Progress → Update Rescue Status
              │                                → Rescued / Unsuccessful
              │                                → Record Outcome
              └── Declined / No Response → Reassign
```

Rules:
- Contacts are searched by state, district or organization.
- After contacting a team, the user records whether they accepted and schedules a follow-up.
- A declined or unanswered request stays pending and can be reassigned.
- Completing a rescue does **not** automatically close the related legal case.

## 9. Legal Workflow

```
Complaint Registered
  → Police Complaint
  → Complaint Follow-up
        ├── FIR Registered
        │     → Court Case Details
        │     → Hearing Scheduled
        │     → Attend Hearing
        │     → Record Outcome
        │           ├── Next Hearing → repeat
        │           └── Case Concluded
        └── Other Police Outcome → Record / Follow Up
```

Rules:
- Cases can stay at the police complaint stage with no FIR.
- A case can have multiple hearings. Each hearing is its own record with its own reminder.
- Hearing record fields: date, time, court, purpose, person to attend, outcome, next hearing date, reminder (7 / 3 / 1 days before).
- After a hearing, the user records what happened and schedules the next action.
- A hearing whose outcome is not entered after it passes stays flagged for attention.

## 10. Assignment, Follow-ups and Reminders

- Every action has two fields: **Assigned To** (who does it) and **Follow-up By** (who checks it).
- Actions can be reassigned at any stage.
- Every update is automatically written to case history.
- An open case with no next action is flagged.
- Reminder flow: an action or hearing is scheduled → reminder is generated → user opens alert → opens case → updates, reschedules or completes → reminder is cleared or reset.

## 11. Contact Directory

- Searchable directory of rescue organizations, independent rescuers, veterinarians, shelters, police contacts, advocates and volunteers.
- Fields: name, organization, contact details, location (state/district), service area, specialization, type (NGO, Legal, etc.).
- Contacts are used when assigning actions, placing calls, or sharing rescue requests.
- Actions: Call, WhatsApp, Select, Add Contact.
- A "Rescue Directory" view finds rescue partners by location (Nearby / All).

## 12. Documents, Export and Settings

- **Documents:** photos, videos, FIR copies, veterinary reports, court orders, attached to a case.
- **Reports:** basic case summaries.
- **Calendar:** hearings and scheduled actions.
- **Settings:** reminder configuration, categories (animal types, complaint categories, statuses).
- **Backup / Export:** export records and maintain backups.

## 13. Business Rules

1. A case can have several rescue and legal actions.
2. Each action can have a different assignee and follow-up owner.
3. Rescue and legal proceedings have independent statuses.
4. Every hearing has its own record and reminder.
5. Completed actions stay visible in case history.
6. Overdue actions stay pending until explicitly resolved.
7. Cases can be reassigned or reopened.
8. Search and filters work across all cases.
9. Case registration does not require an FIR.
10. Sensitive complainant information must be protected when rescue details are shared externally.

## 14. Status Values

- **Action status (shared filter):** To Attend, Follow-up, In Progress, Closed.
- **Rescue status:** To Attend → Awaiting Confirmation → In Progress → Rescued / Unsuccessful.
- **Legal status:** Complaint Filed / Registered → Police Follow-up → FIR Registered → Hearing Scheduled → Concluded.

## 15. Open Questions

These are not answered in the source document and should be settled before or during build:

1. **Authentication:** V1 has no login. How is the shared database protected, and is there a need for device-level access control later?
2. **Sensitive data:** Which complainant fields are masked when sharing externally? What exact sharing format is used for WhatsApp?
3. **Facebook / WhatsApp intake:** Are messages entered manually, or is there an import or integration?
4. **Offline use:** Mobile field use suggests offline support may be needed. The PDF does not say.
5. **Reminder delivery:** Are reminders push notifications, in-app alerts, or both?
6. **Category lists:** Animal types, complaint categories and urgency levels are shown as examples. The full lists are not specified.
7. **Mapping:** "Use Map Location" implies map integration. Which provider, and is geocoding needed?
8. **Document storage:** Where are files stored, what is the size limit, and is there a retention policy?
9. **Backup format:** What format does Backup / Export use?
10. **Reports:** Which summaries are required beyond "basic case summaries"?
11. **Case closure:** What makes a case "Closed" versus "Concluded", and can a closed case be reopened by anyone?
12. **Duplicate complaints:** Is there a check for the same incident being reported twice?

## 16. Suggested Build Order

1. Data model: Case, Action (rescue/legal), Hearing, Contact, Document, HistoryEntry.
2. Home worklist with search, filters and the New Case button.
3. New Case (three-step form) with generated case ID.
4. Case Details with five sections and history logging.
5. Rescue workflow (assign, contact, status, outcome).
6. Legal workflow (police details, FIR, hearings, outcomes).
7. Contact directory and rescue directory.
8. Reminders and calendar.
9. Documents upload.
10. Settings, reports, backup/export.
