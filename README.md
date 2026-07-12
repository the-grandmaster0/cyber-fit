# CYBER-FIT AI — AI-Powered Workout Protocol Generator

CYBER-FIT AI is a full-stack Progressive Web App that uses Google Gemini to generate personalised, multi-week progressive workout programs. Users authenticate via Supabase, receive AI-generated plans tailored to their goals and equipment, log completed workouts, and track streaks and training volume over time.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Health](#health)
  - [Plans](#plans)
  - [Logs](#logs)
  - [Progress](#progress)
- [Authentication](#authentication)
- [AI Plan Generation](#ai-plan-generation)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Scripts](#scripts)

---

## Features

- **AI Workout Generation** — Gemini generates week-by-week progressive programs (4, 8, or 12 weeks) with structured periodisation, deload weeks, and per-exercise notes. Generation streams back to the client via Server-Sent Events with a live progress bar.
- **Google & Email Auth** — Full authentication via Supabase (email/password + Google OAuth).
- **Workout Logging** — Log completed exercises with sets, reps, and weight per session.
- **Progress Tracking** — Automatic streak calculation, total workouts, longest streak, 30-day consistency grid, and weekly volume chart (Recharts).
- **Protocol Vault** — Archive old plans when generating new ones; restore any archived plan at any time.
- **PWA** — Installable on mobile and desktop with offline app shell support via Workbox.
- **Responsive UI** — Cyberpunk-themed design built with Tailwind CSS v4.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 8, Tailwind CSS v4, React Router v7 |
| UI Extras | Recharts, React Hook Form, Zod, Axios |
| PWA | vite-plugin-pwa, Workbox |
| Backend | Node.js 20, Express 4 |
| AI | Google Gemini (`@google/genai` v2) via Server-Sent Events |
| Database & Auth | Supabase (PostgreSQL + Row Level Security + GoTrue) |
| Deployment | Vercel (frontend) · AWS EC2 + Nginx + PM2 (backend) |

---

## Project Structure

```
genai-app/
├── client/                        # React + Vite frontend (deployed to Vercel)
│   ├── public/                    # PWA icons
│   ├── src/
│   │   ├── components/
│   │   │   ├── AsyncButton.jsx    # Button with built-in loading state
│   │   │   ├── ErrorBoundary.jsx  # React error boundary
│   │   │   ├── LogWorkoutModal.jsx# Workout logging form (react-hook-form + zod)
│   │   │   ├── Navbar.jsx         # Sticky responsive nav with avatar dropdown
│   │   │   ├── ProtectedRoute.jsx # Auth-gated route wrapper
│   │   │   ├── PwaUpdatePrompt.jsx# SW update toast
│   │   │   └── Skeleton.jsx       # Loading skeleton blocks
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Supabase session state + signOut
│   │   ├── hooks/
│   │   │   └── useAuth.js         # Shortcut hook for AuthContext
│   │   ├── lib/
│   │   │   ├── axios.js           # Axios instance with auth interceptor
│   │   │   ├── supabaseClient.js  # Supabase browser client (anon key)
│   │   │   └── utils.js           # getErrorMessage helper
│   │   ├── pages/
│   │   │   ├── AuthCallback.jsx   # OAuth redirect handler
│   │   │   ├── Dashboard.jsx      # Stats, active plan preview, quick nav
│   │   │   ├── GeneratePlan.jsx   # Plan generation form + SSE progress
│   │   │   ├── Home.jsx           # Landing page
│   │   │   ├── Login.jsx          # Email/password + Google OAuth
│   │   │   ├── PlanView.jsx       # Week/day navigator + log modal trigger
│   │   │   ├── Progress.jsx       # Recharts volume chart + 30-day grid
│   │   │   └── Protocols.jsx      # Archived plans vault
│   │   ├── App.jsx                # BrowserRouter + route definitions
│   │   ├── index.css              # Tailwind base + custom cyber theme
│   │   └── main.jsx               # React root + PWA update prompt
│   ├── vercel.json                # SPA rewrites + security headers
│   ├── vite.config.js             # Vite + Tailwind + PWA config
│   └── package.json
│
├── server/                        # Express API (deployed to AWS EC2)
│   ├── config/
│   │   └── supabase.js            # Supabase admin client (service role key)
│   ├── middleware/
│   │   ├── asyncHandler.js        # Async route error wrapper
│   │   ├── errorHandler.js        # Global error handler
│   │   ├── rateLimiter.js         # 5 req / 15 min on plan generation
│   │   └── verifyAuth.js          # Validates Supabase Bearer JWT
│   ├── routes/
│   │   ├── health.js              # GET /api/health
│   │   ├── logs.js                # POST /api/logs
│   │   ├── plans.js               # Full plan CRUD + SSE generate
│   │   └── progress.js            # GET /api/progress
│   ├── services/
│   │   └── genai.js               # Gemini integration, retry logic, SSE
│   ├── app.js                     # Express app, CORS, middleware mount
│   └── server.js                  # HTTP server entry point
│
├── supabase/
│   └── migrations/                # SQL migration files (run in order)
│       ├── 0001_init.sql
│       ├── 0002_add_columns.sql
│       ├── 0003_add_progress_and_log_columns.sql
│       └── 0004_add_archived_at.sql
│
├── .gitignore
├── .prettierrc
├── DEPLOYMENT.md                  # Full production deployment guide
├── package.json                   # Root workspace (npm workspaces)
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Google Gemini](https://aistudio.google.com/app/apikey) API key
- A [Google Cloud](https://console.cloud.google.com) OAuth 2.0 client (for Google Sign-In)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/genai-app.git
cd genai-app
```

### 2. Install dependencies

```bash
npm install
```

This installs dependencies for both `client/` and `server/` via npm workspaces.

### 3. Configure environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Fill in the values — see [Environment Variables](#environment-variables) below.

### 4. Run Supabase migrations

Open your Supabase project → SQL Editor and run each file in `supabase/migrations/` in order (0001 → 0004).

### 5. Start the development servers

```bash
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:3001](http://localhost:3001)

The Vite dev server proxies all `/api` requests to the Express server automatically — no `VITE_API_BASE_URL` needed in development.

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | ✅ | Port to listen on (default `3001`) |
| `CLIENT_ORIGIN` | ✅ | Frontend URL for CORS, e.g. `https://your-app.vercel.app` |
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Secret.** Supabase service role key — backend only |
| `GEMINI_API_KEY` | ✅ | **Secret.** Google Gemini API key — backend only |
| `GEMINI_MODEL` | ☑️ | Gemini 3.5 flash |
| `GOOGLE_CLIENT_ID` | ☑️ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ☑️ | **Secret.** Google OAuth client secret |

### Client (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase `anon` / public key (safe for browser) |
| `VITE_GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID (safe for browser) |
| `VITE_API_BASE_URL` | ✅ (prod) | Backend URL without trailing slash, e.g. `https://api.your-domain.com`. Leave empty in development. |

> `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must **never** appear in client environment variables or the Vite build.

---

## API Reference

All protected endpoints require a `Authorization: Bearer <supabase_access_token>` header. Tokens are obtained from the Supabase client after authentication and are automatically attached by the Axios interceptor in `client/src/lib/axios.js`.

**Base URL (production):** `https://your-api-domain.com/api`  
**Base URL (development):** `http://localhost:3001/api`

---

### Health

#### `GET /health`

Returns server status. No authentication required. Use to verify the backend is running.

**Response `200`**
```json
{
  "status": "ok",
  "message": "Hello World"
}
```

---

### Plans

#### `GET /plans/active`

Returns the authenticated user's current active workout plan.

**Auth:** Required

**Response `200`**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "4-Week Fat Loss Program",
  "goal": "lose_weight",
  "duration_weeks": 4,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "archived_at": null,
  "plan_json": {
    "program_title": "4-Week Fat Loss Program",
    "overall_coach_notes": "...",
    "weeks": [ /* array of week objects */ ]
  }
}
```

**Response `404`** — No active plan found.

---

#### `GET /plans/all`

Returns all plans for the user (active and archived), ordered by creation date descending.

**Auth:** Required

**Response `200`**
```json
[
  {
    "id": "uuid",
    "title": "4-Week Fat Loss Program",
    "goal": "lose_weight",
    "duration_weeks": 4,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "archived_at": null
  }
]
```

---

#### `GET /plans/:id`

Returns a specific plan by ID. The plan must belong to the authenticated user.

**Auth:** Required

**URL params:** `id` — plan UUID

**Response `200`** — Full plan object (same shape as `/plans/active`)

**Response `404`** — Plan not found or not owned by user.

---

#### `POST /plans/generate`

Generates a new AI workout plan using Google Gemini. Archives the current active plan (if any). Returns a **Server-Sent Events (SSE)** stream so the client can display a real-time progress bar.

**Auth:** Required  
**Rate limit:** 5 requests per 15 minutes per IP

**Request body**
```json
{
  "goal": "lose_weight",
  "experience_level": "beginner",
  "equipment": ["bodyweight", "dumbbells"],
  "days_per_week": 3,
  "duration_weeks": 4,
  "injuries_notes": "Bad left knee",
  "extra_suggestions": "Include yoga cooldowns"
}
```

| Field | Type | Values / Constraints |
|---|---|---|
| `goal` | `string` | `lose_weight` · `build_muscle` · `strength` · `endurance` · `general_fitness` |
| `experience_level` | `string` | `beginner` · `intermediate` · `advanced` |
| `equipment` | `string[]` | Min 1 item. e.g. `bodyweight`, `dumbbells`, `barbell`, `kettlebells`, `resistance bands`, `pull-up bar`, `bench`, `gym machines` |
| `days_per_week` | `integer` | 1 – 7 |
| `duration_weeks` | `integer` | 1 – 12 |
| `injuries_notes` | `string` | Optional |
| `extra_suggestions` | `string` | Optional, max 500 chars |

**SSE Response stream**

Each event is a `data: <json>\n\n` line. Event types:

```
// Generation started
data: {"type":"status","message":"Initializing AI coach..."}

// Per-week progress
data: {"type":"progress","completedWeek":1,"totalWeeks":4}

// Saving to database
data: {"type":"status","message":"Saving protocol..."}

// Success — full saved plan returned
data: {"type":"done","plan":{ /* full plan object */ }}

// Error at any stage
data: {"type":"error","error":"The AI service is rate-limited. Please wait a minute and try again."}
```

**Response `400`** — Validation error (before SSE stream opens).

---

#### `PATCH /plans/:id/restore`

Restores an archived plan as the active plan. Archives the current active plan.

**Auth:** Required

**URL params:** `id` — plan UUID to restore

**Response `200`** — The restored plan object.

**Response `400`** — Plan is already active.

**Response `404`** — Plan not found.

---

#### `DELETE /plans/:id`

Permanently deletes a plan and all its associated workout logs. Recalculates progress stats afterwards.

**Auth:** Required

**URL params:** `id` — plan UUID

**Response `200`**
```json
{
  "success": true,
  "wasActive": false
}
```

**Response `404`** — Plan not found.

---

### Logs

#### `POST /logs`

Saves a completed workout session and updates the user's streak and total workout count.

**Auth:** Required

**Request body**
```json
{
  "plan_id": "uuid",
  "day_label": "Day A — Push",
  "exercises_completed": [
    {
      "name": "Bench Press",
      "sets_completed": 3,
      "reps_completed": [10, 9, 8],
      "weight": 60
    }
  ],
  "duration_minutes": 45,
  "notes": "Felt strong today"
}
```

| Field | Type | Constraints |
|---|---|---|
| `plan_id` | `string` (UUID) | Must be a valid plan owned by the user |
| `day_label` | `string` | Min 1 char |
| `exercises_completed` | `object[]` | Min 1 item |
| `exercises_completed[].name` | `string` | Min 1 char |
| `exercises_completed[].sets_completed` | `integer` | Min 1 |
| `exercises_completed[].reps_completed` | `integer[]` | Non-empty array |
| `exercises_completed[].weight` | `number` | Min 0 (use 0 for bodyweight) |
| `duration_minutes` | `integer` | Min 1 |
| `notes` | `string` | Optional |

**Response `200`** — The created log record.

**Response `400`** — Validation error.

**Response `404`** — Plan not found.

---

### Progress

#### `GET /progress`

Returns aggregated training statistics for the authenticated user.

**Auth:** Required

**Response `200`**
```json
{
  "current_streak": 5,
  "longest_streak": 12,
  "total_workouts": 34,
  "weekly_volume": [
    { "week_start": "2024-01-01", "total_weight_lifted": 12400 }
  ],
  "consistency_last_30_days": [
    { "date": "2024-01-01", "completed": true },
    { "date": "2024-01-02", "completed": false }
  ]
}
```

| Field | Description |
|---|---|
| `current_streak` | Consecutive days with at least one logged workout |
| `longest_streak` | All-time longest streak |
| `total_workouts` | Total number of logged sessions |
| `weekly_volume` | Array of `{ week_start, total_weight_lifted }` — total kg × reps per week |
| `consistency_last_30_days` | One entry per day for the last 30 days, `completed: true` if a workout was logged |

---

## Authentication

Authentication is handled entirely by Supabase GoTrue. The Express backend validates tokens but never issues them.

**Flow:**

1. User signs in via Supabase client (email/password or Google OAuth).
2. Supabase returns a JWT access token.
3. The Axios instance in `client/src/lib/axios.js` attaches it as `Authorization: Bearer <token>` on every request.
4. `server/middleware/verifyAuth.js` calls `supabase.auth.getUser(token)` to verify the token and extract the user ID.
5. The user ID is attached to `req.user.id` for use in route handlers.

**Google OAuth redirect URI** (must be registered in Google Cloud Console and Supabase):
```
https://<supabase-project-ref>.supabase.co/auth/v1/callback
```

---

## AI Plan Generation

The AI layer lives entirely in `server/services/genai.js`. The key design decisions:

- **Backend-only** — the Gemini API key never reaches the browser. All requests go `client → Express → Gemini API`.
- **Structured output** — Gemini is constrained to return valid JSON matching a strict week schema via `responseMimeType: 'application/json'` and `responseSchema`.
- **Batched generation** — weeks are generated in batches of 2 (batch size) with a 1.5s stagger between requests and an 8s pause between batches to stay within Gemini free-tier RPM limits (10 req/min).
- **Retry logic** — each week attempt retries up to 4 times with exponential backoff. The server parses Gemini's `retry in Xs` hint from 429 responses and honours it exactly.
- **Progressive overload** — a pre-built progression table maps experience level (beginner / intermediate / advanced) and week position to sets, reps, rest, intensity, and phase labels (Foundation → Build → Intensify → Peak → Deload).

---

## Database Schema

Managed via SQL migrations in `supabase/migrations/`. All tables have **Row Level Security enabled** — users can only read and write their own rows.

### `profiles`
Stores user profile and fitness preferences.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, references `auth.users` |
| `full_name` | `text` | |
| `goal` | `text` | Fitness goal |
| `experience_level` | `text` | |
| `equipment` | `text[]` | Array of equipment items |
| `injuries_notes` | `text` | |
| `created_at` | `timestamptz` | |

### `workout_plans`
Stores AI-generated workout programs.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `auth.users` |
| `title` | `text` | e.g. `4-Week Fat Loss Program` |
| `goal` | `text` | |
| `duration_weeks` | `integer` | |
| `plan_json` | `jsonb` | Full plan including all weeks, days, exercises |
| `is_active` | `boolean` | Only one active plan per user at a time |
| `archived_at` | `timestamptz` | Set when a plan is deactivated |
| `created_at` | `timestamptz` | |

### `workout_logs`
One row per completed workout session.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `auth.users` |
| `workout_plan_id` | `uuid` | FK → `workout_plans` (nullable — preserved if plan deleted) |
| `day_label` | `text` | e.g. `Day A — Push` |
| `workout_date` | `date` | |
| `exercises_completed` | `jsonb` | Array of `{ name, sets_completed, reps_completed[], weight }` |
| `duration_minutes` | `integer` | |
| `notes` | `text` | |
| `created_at` | `timestamptz` | |

### `progress_stats`
One row per user, updated on every workout log.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | Unique FK → `auth.users` |
| `total_workouts` | `integer` | Incremented on each log |
| `current_streak` | `integer` | Consecutive days with a logged workout |
| `longest_streak` | `integer` | All-time best streak |
| `last_workout_date` | `date` | Used for streak calculation |

A `handle_new_user` trigger on `auth.users` automatically inserts rows into `profiles` and `progress_stats` when a new user signs up.

---

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full step-by-step production deployment guide covering Supabase, Google OAuth, Gemini API key, AWS EC2 (Ubuntu + PM2 + Nginx + Let's Encrypt), and Vercel.

---

## Scripts

### Root

| Script | Description |
|---|---|
| `npm run dev` | Start both client and server concurrently |
| `npm run build` | Build the Vite client for production |
| `npm run lint` | Lint all workspaces |
| `npm run format` | Prettier format all workspaces |

### Server (`cd server`)

| Script | Description |
|---|---|
| `npm run dev` | Start Express with nodemon (watch mode) |
| `npm start` | Start Express (`node server.js`) — used by Elastic Beanstalk |

### Client (`cd client`)

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server on port 5173 |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Serve the production build locally |

---

## License

MIT
