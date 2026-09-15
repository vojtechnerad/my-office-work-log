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

Default types:

- analysis
- implementation
- testing
- bugfixing

### Work Entry

- account, required
- date, required
- start time, required
- end time, required
- ticket number, optional
- activity type, optional
- short description, optional

Times can be entered to any minute. Helper buttons adjust the time in 30-minute increments. An entry must not cross midnight, and the start time must be before the end time. Overlapping intervals only trigger a warning.

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

## Work Hour Reminders

- The user can enable or disable work hour reminders in application settings.
- The user can configure the interval after which the reminder notification is shown.
- When enabled, MOWL periodically sends a Windows system notification while the application is running.
- When disabled, no reminder notifications are sent.
- The enabled state and interval are persisted locally and restored when MOWL starts.
- Notification text must be localized in Czech and English.

## Reference Data Rules

- Customers, accounts, and activity types are edited directly in the application.
- Items used in history are not deleted but deactivated.
- Deactivated items are not offered for new entries.
- Historical entries remain unchanged.

## Testing

- domain rules and validation
- database CRUD operations and filtering
- React forms and lists
- reminder settings, interval scheduling, and notification behavior
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
7. Add persisted reminder settings and Electron Windows system notifications.
8. Add localization, themes, and color coding for customers and activity types.
9. Add tests.
10. Configure and verify the portable Windows build.
