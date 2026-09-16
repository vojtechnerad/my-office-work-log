# MOWL Implementation Prompts

This file contains prompts to give to the development agent one at a time. The agent should complete and validate each step before continuing with the next one.

## 1. Audit the Scaffold

```text
Review the current Electron + React + TypeScript scaffold against PLAN.md.

Do not implement application features yet. Identify:
- current main, preload, and renderer entry points
- current security configuration
- current build and packaging configuration
- missing dependencies and scripts
- mismatches with the MOWL requirements

Return a concise implementation proposal and wait for confirmation before making changes.
```

## 2. Configure MOWL Identity

```text
Implement the MOWL application identity from PLAN.md.

Update the Electron and electron-builder configuration so that:
- product name is MOWL
- executable name is mowl
- app ID is stable and appropriate for MOWL
- window title is MOWL
- the renderer shows a minimal empty screen with the text MOWL

Preserve the existing scaffold structure. Run:
- npm run typecheck
- npm run lint
- npm run build

Fix only issues caused by this change.
```

## 3. Set Up Secure IPC

```text
Set up the Electron main, preload, and renderer communication boundary.

Requirements:
- contextIsolation enabled
- nodeIntegration disabled
- no direct Node.js access from React
- expose only explicitly typed APIs through contextBridge
- create a typed IPC structure for database operations, settings, dialogs, and notifications

Do not implement SQLite yet. Add a minimal health-check IPC call.

Validate with:
- npm run typecheck
- npm run lint
- npm run build
```

## 4. Add SQLite and Drizzle

```text
Implement the SQLite persistence foundation according to PLAN.md.

Use SQLite with Drizzle ORM and migrations. Choose a suitable Electron-compatible SQLite driver and briefly explain the choice.

Requirements:
- database file extension .mowldb
- database metadata: display name, description, created time, and updated time
- migrations must run safely for a newly created database
- database access remains in the Electron main process
- renderer communicates through typed IPC only

Add tests for database initialization and migration execution.

Validate with:
- npm run typecheck
- npm run lint
- npm run build
- database tests
```

## 5. Implement Database Selection

```text
Implement database file management for MOWL.

Requirements:
- create a new .mowldb database manually
- use a default MOWL folder for new databases
- allow choosing another location with a native system dialog
- derive the file name from the database name by default
- allow changing the file name during creation
- list known databases on startup
- automatically select the last used database while allowing another selection
- show display name, description, file path, and file modification date
- mark missing databases as unavailable
- allow locating a missing database again or removing it from the list
- support opening a .mowldb file passed through Windows file association

Implement this through main-process services and typed IPC. Add tests for the file-management logic.
```

## 6. Create the Database Schema

```text
Implement the core Drizzle schema and migrations.

Create tables for:
- customers
- accounts
- activity types
- work days
- work entries
- customer checklist definitions
- work-entry checklist values

Requirements:
- globally unique account code
- customer color
- account validity period
- activity type category: work or filler
- activity type color and sort order
- work day status: draft or confirmed
- work entries with account, date, start time, end time, ticket, activity type, and description
- filler entries without an account
- customer checklist definitions inherited by work entries
- checklist values stored independently per work entry

Add foreign keys, indexes, uniqueness constraints, and migration tests.
```

## 7. Implement Domain Rules

```text
Implement domain services and validation for MOWL.

Rules:
- work entries require account, date, start time, and end time
- filler entries require date, start time, end time, and filler activity
- start time must be before end time
- entries must not cross midnight
- work and filler intervals share one overlap check
- overlaps may be saved with a warning
- a day with overlaps cannot be confirmed
- an empty day cannot be confirmed
- confirmed days cannot add or delete entries
- confirmed days cannot change entry date or time
- other entry fields remain editable after confirmation
- checklist values remain editable after confirmation
- returning a confirmed day to draft requires explicit confirmation
- only valid accounts may be selected for a given date

Write unit tests for every rule before connecting the UI.
```

## 8. Add CRUD and Default Activities

```text
Implement CRUD services and seed data for reference entities.

New databases must contain:
Work activities:
- analysis
- implementation
- testing
- bugfixing
- meeting

Filler activities:
- school
- doctor
- time off

Requirements:
- users can add custom filler activities
- users can manage customers, accounts, work activities, and filler activities
- used reference items cannot be hard-deleted
- used items can be deactivated
- inactive items are not offered for new entries
- historical entries remain readable

Add service-level tests for create, update, deactivate, and delete behavior.
```

## 9. Implement Customer Checklists

```text
Implement customer-specific checklist functionality.

Requirements:
- each customer can define any number of checklist items
- checklist definitions appear on work entries under all accounts of that customer
- checklist values are stored independently per work entry
- filler entries never show customer checklists
- checklist items are editable only in work-entry details
- checklist items can be renamed at any time
- deletion is allowed only when the item is unchecked on every entry
- deactivation hides the item from new entries
- a deactivated item remains visible in list and detail for historical entries while checked
- after it is unchecked, it disappears
- checklist values remain editable after the day is confirmed

Add database and domain tests for inheritance, rename, deletion, deactivation, and historical visibility.
```

## 10. Build the React UI

```text
Implement the main React UI using shadcn/ui.

Create:
- database selection/startup screen
- dashboard
- work-entry list
- work-entry detail/editor
- filler-entry editor
- customer management
- account management
- activity type management
- customer checklist management
- settings screen

Requirements:
- light and dark themes
- neutral black/white base palette
- customer and activity colors
- clear draft/confirmed day status
- actions for confirming and returning a day to draft
- disable only actions forbidden by confirmed-day rules
- customer checklists shown in work-entry detail
- no checklist controls in the main list
- use typed IPC APIs instead of direct database access
```

## 11. Add Filters and Dashboard

```text
Implement work-entry filtering and dashboard calculations.

Filters:
- date range
- customer
- account
- activity type
- description text
- ticket number

Dashboard:
- today's total
- this week's total
- recent entries
- summary by customer
- work and filler time shown consistently

Add loading, empty, error, and unavailable-database states. Add tests for filter combinations and dashboard totals.
```

## 12. Implement Work Hour Reminders

```text
Implement configurable work-hour reminders.

Requirements:
- disabled by default
- large always-visible toggle in the main toolbar
- intervals: 15, 30, 60, and 120 minutes
- default interval: 30 minutes
- settings persist locally
- Windows system notifications are sent while MOWL is running
- notifications continue while the window is minimized
- no notifications when disabled
- clicking a notification activates the MOWL window
- clicking does not open a specific entry form
- notification text supports Czech and English

Implement scheduling in the Electron main process and expose only typed controls to React. Add tests for enabling, disabling, interval changes, and cleanup on application exit.
```

## 13. Add Localization

```text
Implement Czech and English localization with Lingui.

Requirements:
- all visible UI text uses translations
- notification text uses translations
- confirmation dialogs and validation errors use translations
- language can be switched in settings
- selected language persists locally
- Czech is the default language

Do not leave hard-coded user-facing strings in React components or Electron notification code.
```

## 14. Add Windows Integration

```text
Implement the Windows-specific MOWL integration.

Requirements:
- register .mowldb file association
- opening a .mowldb file launches or focuses MOWL
- pass the selected file path safely to the main process
- handle opening a file when MOWL is already running
- handle a missing or invalid database gracefully
- configure portable Windows packaging
- preserve MOWL as product name and mowl as executable name

Test the behavior in a packaged Windows build, not only in development mode.
```

## 15. Complete Testing and Validation

```text
Complete the test coverage required by PLAN.md.

Cover:
- database migrations
- CRUD operations
- account validity
- work and filler entries
- shared overlap detection
- draft and confirmed day locking
- customer checklist behavior
- database selection and missing files
- reminder settings and notification scheduling
- filtering and dashboard totals
- core React workflows
- opening .mowldb through Windows file association

Add a documented validation command for the project and ensure these pass:
- npm run typecheck
- npm run lint
- npm run build
```

## Recommended Order

1. Audit the scaffold
2. Configure MOWL identity
3. Set up IPC
4. Add SQLite and Drizzle
5. Implement database selection
6. Create the database schema
7. Implement domain rules
8. Add CRUD and seed data
9. Implement customer checklists
10. Build the React UI
11. Add filters and dashboard
12. Implement reminders
13. Add localization
14. Add Windows integration
15. Complete testing and validation

Run each prompt as a separate task. Do not start the next task until the current task has been implemented and validated.
