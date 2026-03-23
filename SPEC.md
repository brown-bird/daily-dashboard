# Personal Dashboard -- Feature Spec v1.0

**Author:** Richard
**Date:** March 20, 2026
**Status:** Draft

## 1. Overview

A personal productivity dashboard for daily task planning, task tracking throughout the day, and generating standup summaries. The app runs as a single-page application in the browser backed by a thin local server that persists data to plain text files.

### Goals

- Provide a single surface for planning, tracking, and reviewing daily work
- Support adding tasks at any point during the day, not just during a morning planning session
- Generate a copy-ready standup summary covering yesterday's completions and today's plan
- Keep persistence dead simple -- plain text files that are human-readable, greppable, and easy to back up or script against

### Non-Goals (v1)

- Multi-user support or authentication
- Cloud sync or remote access
- Integrations with external tools (Slack, Jira, etc.)
- Mobile-specific UI (responsive is fine, but not a priority)

## 2. Architecture

```
Browser (SPA)          HTTP/JSON         Local Server (API)
React + Vite       <------------->      Node/Express
                                             |
                                        fs read/write
                                             |
                                        Text Files (data/)
                                          today.txt
                                          completed.txt
                                          carryover.txt
```

### 2.1 Backend (Thin Local Server)

A minimal API server whose only job is reading/writing text files and exposing them over HTTP. No database, no ORM.

**Stack:** Node/Express

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tasks | Return today's task list |
| POST | /api/tasks | Add a new task to today's list |
| PUT | /api/tasks/:id | Update a task (edit text, change type) |
| DELETE | /api/tasks/:id | Remove a task from today's list |
| POST | /api/tasks/:id/start | Move a task from pending to in-progress |
| POST | /api/tasks/:id/unstart | Move a task from in-progress back to pending |
| POST | /api/tasks/:id/complete | Move a task from today to completed (with timestamp) |
| POST | /api/tasks/:id/uncomplete | Reopen a completed task; optional `status` body param (`in-progress` default, or `pending`) |
| PUT | /api/tasks/reorder | Rewrite today.txt in the given order |
| GET | /api/completed?date=YYYY-MM-DD | Return completed tasks, optionally filtered by date |
| PUT | /api/completed/:id | Update a completed task's text or type |
| DELETE | /api/completed/:id | Remove a completed task |
| POST | /api/completed/squash | Merge multiple completed tasks into one |
| GET | /api/standup | Generate standup payload (yesterday's completions + today's plan) |
| GET | /api/rollover/check | Check if end-of-day rollover is needed |
| POST | /api/rollover/execute | Trigger rollover: move incomplete tasks to carryover, clear today |
| GET | /api/carryover | Return tasks carried over from previous days |
| POST | /api/carryover/:id/accept | Move a carryover task into today's list |
| POST | /api/carryover/:id/drop | Remove a carryover task (won't be done) |

### 2.2 Frontend (SPA)

React app (Vite for tooling). Three primary views implemented as sections within a single page.

### 2.3 Text File Format

One task per line. Each line is a pipe-delimited record:

```
id|created_timestamp|status|type|text
```

**Fields:**

| Field | Format | Example |
|-------|--------|---------|
| id | UUID v4 (first 8 chars) | a1b2c3d4 |
| created_timestamp | ISO 8601 | 2026-03-20T08:15:00.000Z |
| status | pending, in-progress, done, carried | pending |
| type | planned or unplanned | planned |
| text | Free-form task description | Review PR #482 for auth refactor |

Completed tasks get an additional field appended:

```
id|created_timestamp|done|type|text|completed_timestamp
```

**Example today.txt:**

```
a1b2c3d4|2026-03-20T08:15:00.000Z|pending|planned|Review PR #482 for auth refactor
e5f6a7b8|2026-03-20T08:16:00.000Z|pending|planned|Write migration script for user table
c9d0e1f2|2026-03-20T09:30:00.000Z|pending|unplanned|Respond to Sarah's Slack thread about deploy timeline
```

**Example completed.txt:**

```
f3a4b5c6|2026-03-19T08:00:00.000Z|done|planned|Set up staging environment for QA|2026-03-19T14:22:00.000Z
d7e8f9a0|2026-03-19T09:15:00.000Z|done|unplanned|Fix flaky integration test in CI|2026-03-19T11:45:00.000Z
```

**Example carryover.txt:**

```
b1c2d3e4|2026-03-18T08:30:00.000Z|carried|planned|Update API docs for v2 endpoints
```

**File management rules:**

- today.txt is cleared at rollover; incomplete tasks move to carryover.txt
- completed.txt is append-only and cumulative (all history)
- carryover.txt holds incomplete tasks from any previous day until they're accepted into today or explicitly dropped

## 3. Features

### 3.1 Daily Task Planning (Main View)

The primary interface. Shows today's tasks in three vertical sections: **Todo**, **In Progress**, and **Done today**.

**Three-section layout:**

Tasks progress through three states in a single vertical column:
- **Todo** (top): New and pending tasks. Actions: "Start" (→ In Progress), "Complete" (→ Done).
- **In Progress** (middle): Tasks actively being worked on. Actions: "Todo" (→ Todo), "Done" (→ Done).
- **Done today** (bottom): Completed tasks with strikethrough styling. Actions: "In-progress" (→ In Progress), "Todo" (→ Todo).

The normal flow is Todo → In Progress → Done, but tasks can skip steps (e.g., complete directly from Todo) or move backwards at any point.

**Behaviors:**

- **Add task:** Text input at top of the page. Pressing Enter or clicking Add creates the task with a pending status and current timestamp. New tasks appear in the Todo section.
- **Start task:** "Start" button moves a task from Todo to In Progress (sets status to in-progress).
- **Complete task:** "Complete" or "Done" button moves a task from Todo or In Progress to Done (moves from today.txt to completed.txt with completed_timestamp).
- **Reopen to In Progress:** "In-progress" button on a completed task moves it back to In Progress (removes from completed.txt, adds to today.txt with in-progress status).
- **Reopen to Todo:** "Todo" button on a completed task moves it directly back to Todo (removes from completed.txt, adds to today.txt with pending status).
- **Move back:** "Todo" button on an In Progress task moves it back to Todo (sets status back to pending).
- **Edit task:** Inline editing -- click the task text to modify it. Saves on blur or Enter. Cancel with Escape. Works in all three sections.
- **Delete task:** Remove without completing. Delete button appears on hover. Works in all three sections.
- **Reorder:** Drag-and-drop to set priority order within both the Todo and In Progress sections independently.

**Carryover banner:** If carryover.txt has items when the app loads, show a notification section at the top: "You have N tasks carried over from previous days." Each carryover task has two actions: Pull into today (moves to today.txt as pending) or Drop (removes from carryover.txt).

### 3.2 Editable Completed Tasks

Completed tasks in the "Done today" section support inline editing and deletion.

- **Edit:** Click a completed task's text to edit inline. Same UX as active tasks (save on blur/Enter, cancel on Escape).
- **Delete:** Hover to reveal a delete button. Removes the task from completed.txt.

### 3.3 Squash Completed Tasks

Consolidate multiple completed tasks into a single summary task, similar to git squash.

**Flow:**

1. Click "Squash" button in the Done today section header (visible when 2+ tasks are completed)
2. Enter selection mode: checkboxes appear on each completed task
3. Select 2 or more tasks. Bottom bar shows selection count and a Squash action button.
4. Click Squash to open the summary editor, pre-populated with selected task texts joined by "; "
5. Edit the summary text as desired
6. Click Confirm to merge. The selected tasks are replaced by a single task with:
   - New unique ID
   - Earliest created timestamp from the selected tasks
   - Latest completed timestamp from the selected tasks
   - Type is "unplanned" if any selected task was unplanned, otherwise "planned"
   - User-provided summary text
7. Click Cancel at any point to exit squash mode

### 3.4 Standup Summary

Generates a formatted summary for daily standups.

**Trigger:** Dedicated "Standup" button in the header.

**Flow:**

1. App calls GET /api/standup which assembles:
   - **Yesterday:** All tasks from completed.txt where completed_timestamp falls on the previous workday
   - **Today:** All tasks currently in today.txt (the plan for the day). In-progress tasks are marked with a 🔄 indicator and listed before pending tasks.
   - **Carried over:** Any items in carryover.txt (flagged as unfinished)
2. Display the standup in a formatted preview panel
3. User can review the text before copying
4. Single button copies the formatted standup text to clipboard with visual confirmation

**Planned vs. unplanned in standup output:** Unplanned tasks are tagged with a lightning bolt marker so the standup gives a quick read on how much of the day was reactive.

**Edge cases:**

- If today's list is empty, prompt the user to plan their day before generating the standup
- On Monday, "Yesterday" references Friday
- If there are no carryover items, that section is omitted

### 3.5 Add Tasks Throughout the Day

The add-task input is always immediately accessible at the top of the main view.

**Planned/unplanned toggle:** Next to the text input, a toggle switches between planned (default) and unplanned. Unplanned tasks display a lightning bolt indicator in the task list.

New tasks added mid-day appear at the bottom of the active task list.

### 3.6 Day Rollover

Handles the transition between days.

**Automatic rollover:** On app load, the server checks if today.txt contains tasks with created_timestamp from a previous day. If so, rollover executes automatically before returning data.

**Rollover process:**

1. Any pending or in-progress tasks in today.txt move to carryover.txt with status "carried"
2. Clear today.txt
3. User sees the carryover banner on the fresh day's view

## 4. Data Directory Structure

```
data/
  today.txt           # Current day's task list
  completed.txt       # All completed tasks (append-only log)
  carryover.txt       # Incomplete tasks from previous days
```

All files are created automatically by the server if they don't exist.

## 5. Running the App

### General use (production mode)

The Express server serves both the API and the pre-built client from a single process:

```bash
npm run build   # Build the React client into client/dist/ (run once, or after pulling changes)
npm start       # Start the server at http://localhost:3001
```

The server resolves `client/dist/` as static files and falls back to `index.html` for SPA routing. No separate client process needed.

### Development

```bash
npm run dev     # Starts both the Express server (nodemon) and the Vite dev server concurrently
```

The Vite dev server proxies `/api` requests to `localhost:3001`. Hot module reload is available for the client.

### Port

Defaults to `3001`. Override with `PORT=XXXX npm start`.

## 6. UI Layout

```
+--------------------------------------------------+
|  Daily Dashboard                       [Standup]  |
+--------------------------------------------------+
|                                                   |
|  Warning: N tasks carried over from previous days |
|  +---------------------------------------------+ |
|  | Task description (date)                      | |
|  |                   [Pull into today] [Drop]   | |
|  +---------------------------------------------+ |
|                                                   |
|  +---------------------------------------------+ |
|  | + Add a task...          [Planned] [Add]     | |
|  +---------------------------------------------+ |
|                                                   |
|  TODO                                             |
|  :: Write migration script  [Start] [Complete] x  |
|  :: Update API docs         [Start] [Complete] x  |
|                                                   |
|  IN PROGRESS                                      |
|  :: Review PR #482          [Todo] [Done]      x  |
|                                                   |
|  DONE TODAY                            [Squash]   |
|  [check] Set up staging env  [In-progress][Todo]  |
|                                         10:30 AM  |
|                                                   |
+--------------------------------------------------+
|  Tasks: 2 todo · 1 in progress · 1 done           |
+--------------------------------------------------+
```

## 7. Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Plain text, pipe-delimited | Human-readable, greppable, trivially parseable. No binary format lock-in. |
| Timestamps on tasks | Enables standup generation, carryover age display, and future velocity tracking. |
| Planned/unplanned type field | Captures whether work was intentional or reactive. Low friction default. |
| Append-only completed.txt | Simple, no data loss. Serves as a permanent log. |
| Separate carryover.txt | Cleanly separates undecided tasks from today's active list. |
| Local server, not pure browser | Real text files on disk. Scriptable, backupable, versionable. |
| React SPA with Vite | Appropriate for a single-purpose interactive app. Fast dev experience. |
| Squash on completed tasks | Allows consolidating granular work items into meaningful summaries for standups. |

## 8. Future Considerations (Out of Scope for v1)

- Weekly/monthly review: Aggregate completed.txt to show productivity patterns
- Planned vs. unplanned ratio: Weekly view showing what percentage of completed work was reactive
- Tags or categories: Prefix convention in task text (e.g., [deploy], #backend)
- Priority levels: Additional pipe-delimited field
- Slack integration: POST standup output to a webhook
- Archive rotation: Monthly rotation of completed.txt
- Search: grep wrapper endpoint for searching across all files
- Multiple projects/contexts: Separate data directories per project
