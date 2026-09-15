# MOWL (My Office Work Log)

## Application Identity

- The application abbreviation is `MOWL`.
- `MOWL` will be used as the application name displayed in Windows, including the window title, portable build metadata, and executable name.

## Goal

An offline local Windows application for tracking time spent on projects. The application will be used by a single user.

## Technology

- React + TypeScript
- Electron
- electron-vite
- SQLite
- Drizzle ORM
- shadcn/ui
- Lingui for Czech and English localization
- Light and dark theme
- Portable Windows build without an installer
- `.mowldb` file association with MOWL in Windows

## Data Model

### Customer

- name
- optional color
- database-generated identifier

### Account

- customer
- custom name
- globally unique code
- active from date
- active until date

When creating a work entry, only accounts valid for the selected date are offered. An account used in history is not deleted but deactivated.

### Activity Type

- name
- color
- sort order
- category: work or filler

Default work types:

- analysis
- implementation
- testing
- bugfixing
- meeting

Default filler types:

- school
- doctor
- time off

Filler types are separate from work activity types. The default filler types are included in every new database, and the user can add custom filler types.

### Work Day

- date
- status: draft or confirmed

Each day starts as a draft. A day is confirmed individually and then locks structural changes. A confirmed day can be returned to draft after a confirmation dialog.

### Work Entry

- account, required
- date, required
- start time, required
- end time, required
- ticket number, optional
- activity type, optional
- short description, optional

Times can be entered to any minute. Helper buttons adjust the time in 30-minute increments. An entry must not cross midnight, and the start time must be before the end time. Overlapping intervals only trigger a warning.

Work and filler entries belong to the same work day. Filler entries contain a date, start time, end time, filler type, and optional description, but do not require an account.

In a confirmed day, entries cannot be added or deleted, and their date or time cannot be changed. Other entry details remain editable. Checkbox values are exempt from this lock and remain editable after confirmation.

### Customer Checklist

- Each customer can define any number of custom checklist items.
- Checklist definitions are inherited by work entries under all accounts belonging to that customer.
- Checklist values are stored independently for each work entry.
- Filler entries do not have customer checklist items.
- Checklist items can be renamed at any time.
- An item can be deleted only when it is not checked on any entry.
- A deactivated item is hidden from new work entries, but remains visible in the list and detail of historical entries while it is checked. Once unchecked, it disappears.
- Checklist items are edited only in the work entry detail, not directly in the entry list.

## Database Files

- The main SQLite database file uses the `.mowldb` extension.
- Each database has a user-defined display name and a short description, both editable after creation.
- On startup, the user can choose a database; the last used database is selected automatically but can be changed.
- The database picker shows the file system modification date and time.
- New databases are created manually, with the MOWL default folder used by default and a system dialog available to choose another location.
- The file name is derived from the database name by default and can be changed during creation.
- Missing databases remain listed as unavailable and can be located again or removed from the list.
- Windows file association for `.mowldb` opens the selected database in MOWL when the user double-clicks the file.

## MVP

1. Dashboard with today's and this week's summaries.
2. Overview of recent entries.
3. Summary by customer.
4. Filterable list of all work entries.
5. Combined filtering by date range, customer, account, activity type, description, and ticket.
6. Editable entry details.
7. Permanent deletion of entries with confirmation.
8. Management of customers, accounts, and activity types.
9. Czech and English language switching.
10. Light and dark theme switching.
11. Configurable reminders to record work hours while the application is running.
12. Per-day draft and confirmation workflow.
13. Work and filler activity entries, including the default `meeting`, `school`, `doctor`, and `time off` types.
14. Customer-specific checklists inherited by work entries.
15. `.mowldb` database creation, selection, metadata, and Windows file association.

## Work Hour Reminders

- The user can enable or disable work hour reminders in application settings.
- The user can configure the interval after which the reminder notification is shown.
- When enabled, MOWL periodically sends a Windows system notification while the application is running.
- When disabled, no reminder notifications are sent.
- The enabled state and interval are persisted locally and restored when MOWL starts.
- The feature is disabled by default.
- Available intervals are 15, 30, 60, and 120 minutes; the default interval is 30 minutes.
- A large, always-visible toggle is shown in the main toolbar.
- Notifications are sent while MOWL is running, including when the window is minimized.
- Clicking a notification activates the MOWL window without opening a specific entry form.
- Notification text must be localized in Czech and English.

## Reference Data Rules

- Customers, accounts, and activity types are edited directly in the application.
- Items used in history are not deleted but deactivated.
- Deactivated items are not offered for new entries.
- Historical entries remain unchanged.
- A day cannot be confirmed while it contains overlapping work or filler intervals; overlaps may be saved with a warning but must be resolved before confirmation.
- An empty day cannot be confirmed; it must contain at least one work or filler entry.

## Testing

- domain rules and validation
- database CRUD operations and filtering
- React forms and lists
- reminder settings, interval scheduling, and notification behavior
- draft/confirmation locking and unlock workflow
- work and filler activity validation, including shared overlap detection
- customer checklist inheritance, history, deactivation, and deletion rules
- `.mowldb` creation, selection, metadata, missing-file handling, and Windows file association
- basic end-to-end workflow in Electron

## Deferred After MVP

- start/stop timer
- reports
- export and import
- database backup and restore
- multiple users
- synchronization
- Windows installer package

## Implementation Order

1. Initialize React, TypeScript, Electron, and electron-vite.
2. Set up a secure preload, contextBridge, and typed IPC.
3. Add SQLite, Drizzle ORM, and migrations.
4. Implement database tables and application services.
5. Implement validation and filtering.
6. Create the dashboard, entry list, entry details, and reference data management.
7. Add work-day status, draft/confirmation locking, and unlock workflow.
8. Add work and filler activity types and shared overlap validation.
9. Add customer checklist definitions and per-entry checklist values.
10. Add persisted reminder settings and Electron Windows system notifications.
11. Add `.mowldb` creation, database selection, metadata, missing-file handling, and Windows file association.
12. Add localization, themes, and color coding for customers and activity types.
13. Add tests.
14. Configure and verify the portable Windows build.
