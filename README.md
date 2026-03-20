# Daily Dashboard

A personal productivity dashboard for daily task planning, tracking, and standup summary generation. Single-page app backed by a local server that persists data to plain text files.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

## Running

```bash
# Start both server and client
npm run dev
```

This runs the Express API server on `http://localhost:3001` and the Vite dev server on `http://localhost:5173`.

You can also run them separately:

```bash
npm run dev:server   # API server only
npm run dev:client   # Frontend only
```

## Data Storage

All data lives in the `data/` directory as plain text files (auto-created on first use):

| File | Purpose |
|------|---------|
| `today.txt` | Current day's active tasks |
| `completed.txt` | All completed tasks (append-only log) |
| `carryover.txt` | Incomplete tasks from previous days |

Each line is a pipe-delimited record:

```
id|created_timestamp|status|type|text
```

Completed tasks have an additional field:

```
id|created_timestamp|status|type|text|completed_timestamp
```

Files are human-readable, greppable, and safe to edit manually.

## Features

- **Task management** -- add, edit, reorder (drag-and-drop), complete, and delete tasks
- **Planned vs. unplanned** -- tag tasks as unplanned to track reactive work
- **Day rollover** -- incomplete tasks automatically carry over to the next day
- **Standup summary** -- generate a formatted standup with yesterday's completions, today's plan, and carried-over items; copy to clipboard with one click

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | Today's tasks |
| POST | `/api/tasks` | Add a task (`{ text, type }`) |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| POST | `/api/tasks/:id/complete` | Complete a task |
| PUT | `/api/tasks/reorder` | Reorder tasks (`{ orderedIds }`) |
| GET | `/api/completed?date=YYYY-MM-DD` | Completed tasks |
| GET | `/api/standup` | Generate standup summary |
| GET | `/api/rollover/check` | Check if rollover is needed |
| POST | `/api/rollover/execute` | Execute day rollover |
| GET | `/api/carryover` | List carryover tasks |
| POST | `/api/carryover/:id/accept` | Pull carryover task into today |
| POST | `/api/carryover/:id/drop` | Drop a carryover task |
