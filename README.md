[English](README.md) | [中文](README.zh.md)

# Fitness Planner

A full-stack workout planner built around a 1,324-exercise library. Browse movements by body part → target muscle, watch animated demos, build named workout lists, log live sessions with a rest timer, and track recovery, bodyweight, and strength-balance analytics. English and Chinese UI.
[![Demo](./media/demo.gif)](./media/demo.mp4)

## ▶️ Live Demo

<a href="https://gotham-citizen.github.io/Fitness-Planner/">
  <img src="./media/demo.png" alt="Fitness Planner Screenshot" width="600">
</a>

Click the link to try it! The deployed frontend talks to a live [Cloudflare Worker](https://fitness-planner.myenglishnameisbennie.workers.dev/api/health) API backed by Cloudflare D1. Browse the exercise library as a guest, or create an account to build workout lists, log sessions, and track your progress.

## Getting Started

### Prerequisites

- Node.js (v24+)
- Optional: a Cloudflare account — only needed to deploy your own API or run against a remote D1 database

### Setup

```bash
npm install
npm run fetch:data        # download the dataset + exercise media into public/ and server/data/
npm run db:gen           # generate server/seed.sql from the dataset
npm run db:schema:local  # create the local (Miniflare) D1 schema
npm run db:data:local    # load the seed data
npm run db:test:gen      # regenerate server/test-data.sql (test account; dates relative to today)
npm run db:test:local    # load the test data (sessions this week, one per comparison rung)
npm run dev              # Vite (web, :5173) + wrangler dev --local (API, :8787)
```

Opens at `http://localhost:5173` and works fully offline.

> `server/data/` and `server/seed.sql` are gitignored by design — a fresh clone regenerates them with `npm run fetch:data` + `npm run db:gen`. Auth also needs a `JWT_SECRET`; for local development put it in `server/.dev.vars` (gitignored), e.g. `JWT_SECRET=any-long-random-string`.

All configuration values are optional for local development (see `.env.example`):

| Variable | Meaning |
| --- | --- |
| `VITE_API_BASE` | Absolute Worker API URL when the frontend is hosted elsewhere (e.g. GitHub Pages); omit for same-origin |
| `VITE_BASE` | Base path the app is served from — `/` by default, `/<repo-name>/` on GitHub Pages (set by the deploy workflow) |
| `CORS_ORIGIN` | Server-side allowed API origin, `*` by default |
| `API_TARGET` | Vite dev-proxy target for `/api` — defaults to the local wrangler dev server (`http://localhost:8787`) |

### Deploy the Worker

```bash
npx wrangler login
npx wrangler d1 create fitness-db
#    paste the returned database_id into server/wrangler.jsonc

npm run db:schema:remote
npm run db:data:remote

npx wrangler secret put JWT_SECRET --config server/wrangler.jsonc
npm run deploy                     # builds the frontend and deploys everything as one Worker
```

The Worker serves the built frontend, all media, and the API from a single origin (`nodejs_compat` + static assets with SPA fallback). Alternatively run the web half separately:

```bash
npm run dev:web   # Vite only — /api is proxied (to the local Worker, or API_TARGET if set)
npm run dev:api   # wrangler dev --local only (port 8787)
```

### Deploy the frontend to GitHub Pages

GitHub Pages is static-only, so the API stays on Cloudflare Workers:

1. Deploy the Worker first (above) and note its URL, e.g. `https://fitness-planner.<your-subdomain>.workers.dev`.
2. Push the repo to GitHub and add a repository **Variable** named `VITE_API_BASE` set to that Worker URL.
3. In **Settings → Pages**, set Source to **"GitHub Actions"**.
4. Push to `main`. The [deploy workflow](.github/workflows/deploy-pages.yml) builds with `VITE_BASE=/<repo-name>/` and `VITE_API_BASE`, then publishes `dist/`.

Cross-origin calls are permitted by the CORS middleware in `server/app.js` (controlled by `CORS_ORIGIN`).

### Build for Production

```bash
npm run build
npm run preview
```

## Features

- **1,324-exercise library** — browse body part → target muscle → movements, with looping GIF demos, thumbnails, equipment, target/primary/secondary muscles, and step-by-step instructions
- **Search that speaks 中文** — matches English, Chinese, or pinyin (`wo tui` finds 腿部 movements); the search box is IME-safe so pinyin composition never trips it
- **Preset workouts** — 40+ curated, evidence-based routines (ACSM position-stand loading/sets/rest/frequency) grouped by goal (strength, muscle build, slim down, endurance), equipment (gym / dumbbells / bodyweight), and focus body part; shown on Home as "Recommended for you", "Popular", and per-body-part groups, or browsable with goal/equipment/muscle filters
- **Goals questionnaire** — asked once right after signup (skippable) and refillable from Account → Goals & plan; answers drive the Home recommendations and can auto-generate a weekly workout plan — one workout list per training day, with prescribed sets/reps shown while you train
- **Weekly plan scheduling** — two modes in Account → Schedule: **Fixed** (pick a specific list for each weekday) or **Rotation** (ordered list of workouts + rest days that cycles automatically); the active day's list is surfaced on Home and in the session starter
- **Equipment browser** — 23 photo cards (one PNG per equipment type in `public/equipment/`, "Other" pinned last) that drill down into that equipment's movements; sort by count, A→Z, or difficulty
- **Custom exercises** — create, edit, and delete your own movements (name, category, target muscle, equipment); they merge into the library and are scoped to your account; upload custom GIFs (base64-encoded, capped at 1.4 MB raw to fit D1's 2 MB row limit)
- **Accounts** — email + password signup/login with JWT sessions; profile with display name, gender, bodyweight + unit (kg/lb), effort scale, timer alert settings, and UI language
- **Workout lists** — named lists with add/remove exercises, per-exercise rest-timer settings, rename, and delete; duplicate names are caught case-insensitively; drag-to-reorder exercises in the list editor
- **Live sessions** — start a workout from any list; log sets with reps, weight, kg/lb, and effort; edit or delete sets; **Finish** blocks sets that have weight but no reps
- **RIR / RPE effort tracking** — rate sets as RIR (0–4, 0 = failure) or RPE (6–10, 10 = failure); averages, hard-set classification, and weekly effort stats require a minimum of rated sets; per-set scale is stored so legacy rows render correctly
- **Rest timer** — per-exercise rest settings with sound (beep / chime / bell), vibrate, and flash alerts, all configurable in Account → Timer Alerts
- **Session summary** — per-exercise set stats and rank progression after finishing (Iron → Challenger, calibrated on StrengthLevel entire-community 1RM averages), plus comparison against your previous sessions
- **Comparison pictures** — one image per volume rung (`<slug>.<ext>` in `public/comparisons/`, any of `.png`/`.jpg`/`.jpeg`/`.webp`/`.gif`); the summary shows the picture for the highest rung reached, or text only if missing
- **Volume comparison fun** — total session volume (Σ reps × kg) mapped to whimsical objects (a toilet → 2× a school bus) shown in the summary and journal
- **Per-list history** — revisit any past session's summary; delete single sessions or clear a list's history
- **Training journal** — day-by-day session log with list filters, plus bodyweight weigh-ins, a trend chart, and a target-weight goal
- **Muscle balance** — trained-vs-untrained muscle map, and **structural balance**: your estimated 1RMs (Epley-style formulas) against bodyweight-relative strength standards, gender-aware
- **Recovery tracking** — per-target-muscle recovery state computed from your recent sessions, shown on the Workouts page
- **Recent muscles** — recently viewed/trained targets resurface in the library's Recent tab, with "not explored yet" markers
- **Bodyweight tracking** — weigh-ins with trend chart, target weight goal, and unit toggle (kg/lbs); the latest weigh-in mirrors to your profile
- **Bilingual, themed, responsive** — English/中文 UI (browser detection, overridable per account), dark/light themes, and a mobile tab-bar layout
- **Zero external dependencies at runtime** — no third-party trackers, no external media CDN; every GIF, thumbnail, and equipment photo is bundled locally

## How It Works

1. The exercise library loads from the API (`/api/exercises`) — 1,324 movements from the [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) with GIFs and thumbnails bundled locally in `public/`.
2. Guests browse freely (the endpoint uses optional auth); signing in unlocks custom exercises, workout lists, and logging.
3. A live session is created from a list (`POST /api/workoutlists/:id/sessions`); every set is persisted individually as you log it, so the session survives reloads and can be edited mid-workout.
4. Finishing (`PUT /api/sessions/:id/complete`) validates sets, stores the summary, and feeds the journal, history, recovery, balance, and rank features — all computed client-side from your session history.
5. One Express app (`server/app.js`) runs both as a Cloudflare Worker (via `server/worker.js` + D1) and locally (via `wrangler dev --local` + Miniflare D1) — a single code path for both.

### API reference

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/health` | Liveness check |
| POST | `/api/auth/signup` | Create account `{ email, password, name, gender?, language? }` |
| POST | `/api/auth/login` | Log in `{ email, password }` |
| GET | `/api/auth/me` | Current user (includes `questionnaire` answers) |
| PUT | `/api/auth/questionnaire` | Save goal questionnaire answers `{ answers: { goal, experience, daysPerWeek, equipment, sessionMinutes? } }` |
| PUT | `/api/auth/profile` | Update `{ email?, name?, gender?, bodyweight?, bodyweightUnit?, effortScale?, timerSound?, timerPlaySound?, timerVibrate?, timerFlash?, language?, schedule? }` |
| DELETE | `/api/auth/me` | Delete account |
| GET | `/api/exercises` | All exercises (guests get the seed library; authed users also get their custom ones) |
| POST | `/api/exercises` | Create a custom exercise |
| GET | `/api/exercises/:id` | Single exercise detail |
| PUT | `/api/exercises/:id` | Update a custom exercise |
| DELETE | `/api/exercises/:id` | Delete a custom exercise |
| POST | `/api/exercises/:id/media` | Upload a custom GIF for a custom exercise (multipart, base64 in response) |
| GET | `/api/media/:id` | Serve a custom exercise GIF |
| DELETE | `/api/media/:id` | Delete a custom exercise GIF |
| GET | `/api/workoutlists` | All workout lists, with their exercises |
| POST | `/api/workoutlists` | Create a list `{ name, exerciseId? }` or a preset/plan list `{ name, exercises: [{ exerciseId, prescribedSets?, prescribedReps?, restSecs? }] }` |
| PUT | `/api/workoutlists/:id` | Rename a list `{ name }` |
| DELETE | `/api/workoutlists/:id` | Delete a list (sessions survive in the journal) |
| POST | `/api/workoutlists/:id/exercises` | Add an exercise `{ exerciseId, prescribedSets?, prescribedReps?, restSecs? }` |
| DELETE | `/api/workoutlists/:id/exercises/:exerciseId` | Remove an exercise from a list |
| PUT | `/api/workoutlists/:id/exercises/:exerciseId` | Update per-exercise settings (rest timer, prescribed sets/reps) |
| POST | `/api/workoutlists/:id/sessions` | Start a session |
| GET | `/api/workoutlists/:id/sessions` | Session history for one list |
| DELETE | `/api/workoutlists/:id/sessions` | Clear a list's history |
| GET | `/api/sessions` | All of your sessions (live + deleted lists) |
| GET | `/api/sessions/:sessionId` | One session with its sets |
| DELETE | `/api/sessions/:sessionId` | Delete a session |
| PUT | `/api/sessions/:sessionId/complete` | Validate and finish a session |
| PUT | `/api/sessions/:sessionId/bodyweight` | Log bodyweight from a session |
| POST | `/api/sessions/:sessionId/sets` | Log a set `{ exerciseId, setNumber, reps, weight, weightUnit, rir, effortScale }` |
| PUT | `/api/sessions/:sessionId/sets/:setId` | Edit a set |
| DELETE | `/api/sessions/:sessionId/sets/:setId` | Delete a set |
| GET | `/api/bodyweight` | Weigh-in history |
| POST | `/api/bodyweight` | Log a weigh-in `{ weight, unit, loggedAt }` |
| DELETE | `/api/bodyweight/:id` | Delete a weigh-in |
| PUT | `/api/bodyweight/goal` | Set a target weight |

## Tech Stack

### Frontend

- **React 19** — UI components and hooks
- **Vite** — dev server, proxy, and build tooling
- **i18next + react-i18next** — full i18n with browser detection and per-account language; translations live in `src/utils/locales/{en,zh}/translation.js`
- **pinyin-pro** — pinyin romanization so Chinese search also matches typed pinyin
- **Atomic component architecture** — `src/components/` is layered atoms → molecules → organisms → templates, each with a barrel `index.js`
- **CSS Modules / plain CSS** — scoped styling with global theme variables in `src/index.css`
- **ESLint flat config** — import sorting, React hooks, refresh, and simple-import-sort rules

### Backend / Infrastructure

- **Express 5** — API routes, mounted on Cloudflare Workers (`nodejs_compat`) via `server/worker.js`
- **Cloudflare D1** (SQLite) — exercises, custom exercises, users, workout lists, sessions, sets, weigh-ins (`server/schema.sql`)
- **jose** — JWT signing/verification (HS256) with the secret held server-side
- **Web Crypto PBKDF2** — password hashing (100k iterations, SHA-256, per-user salt)
- **Wrangler** — Workers/D1 CLI for local dev (Miniflare) and deployment
- **GitHub Actions** — CI/CD pipeline to build and deploy to GitHub Pages

## Project Structure

```
├── index.html                       # HTML shell
├── vite.config.js                   # Vite config (/api dev proxy, VITE_BASE)
├── eslint.config.js                 # ESLint flat config
├── .env.example                     # Template for the optional .env values
├── .github/workflows/
│   └── deploy-pages.yml             # GitHub Actions: build + deploy to Pages
├── public/                          # Static media served as-is
│   ├── images/                      # 1,324 exercise thumbnails
│   ├── videos/                      # 1,324 exercise GIF demos
│   ├── equipment/                   # Equipment card photos (<slug>.png, 23 cards)
│   ├── comparisons/                 # Volume-comparison pictures (<slug>.<ext>, 14 rungs)
│   ├── icons.svg                    # Inline SVG sprite for UI icons
│   └── favicon.svg
├── scripts/
│   ├── download-assets.mjs          # Fetch dataset + media into public/ and server/data/
│   ├── generate-seed.mjs            # Emit server/seed.sql from the dataset JSON (adds pinyin, difficulty)
│   └── generate-test-data.mjs       # Emit server/test-data.sql (test account, dates relative to today, level coverage)
├── shared/                          # Modules imported by BOTH client and server
│   ├── normalize.js                 # Effort-scale / language / unit normalization
│   └── setRules.js                  # Set validity rules (weight-but-no-reps etc.)
├── server/
│   ├── app.js                       # Express app: CORS, auth, all API routes
│   ├── worker.js                    # Cloudflare Workers entry point
│   ├── db.js                        # D1 repository (users, exercises, lists, sessions, weigh-ins)
│   ├── auth.js                      # PBKDF2 hashing + JWT create/verify (jose)
│   ├── authMiddleware.js            # requireAuth / optionalAuth guards
│   ├── validate.js                  # Email / gender / number validation
│   ├── schema.sql                   # D1 schema (destructive reset — fresh databases only)
│   ├── test-data.sql                # Local dev fixtures (test user + level-spread sessions, generated)
│   ├── wrangler.jsonc               # Worker config (assets, D1 binding, nodejs_compat)
│   ├── .dev.vars                    # Local secrets (gitignored) — JWT_SECRET
│   └── data/                        # Generated dataset + seed (gitignored)
└── src/
    ├── main.jsx                     # React mount point
    ├── index.css                    # Global styles + theme variables
    ├── app/                         # One folder per screen/view
    │   ├── App.jsx                  # Root state machine: auth, lists, sessions, navigation
    │   ├── HomePage.jsx             # Landing dashboard + search entry + schedule surfacing
    │   ├── PlannerPage.jsx          # Library browser (hierarchy / search / equipment)
    │   ├── WorkoutsPage.jsx         # Workout lists + recovery panel
    │   ├── SessionPage.jsx          # Live workout logging
    │   ├── SummaryPage.jsx          # Post-session summary (ranks, previous bests, volume comparison)
    │   ├── HistoryPage.jsx          # Per-list session history
    │   ├── JournalPage.jsx          # Day-by-day journal + bodyweight card
    │   ├── BalancePage.jsx          # Muscle balance + structural balance
    │   ├── AccountPage.jsx          # Profile settings (questionnaire, schedule, timer alerts)
    │   ├── AuthPage.jsx             # Login / signup
    │   └── TimerAlertsPage.jsx      # Rest-timer alert settings
    ├── components/
    │   ├── atoms/                   # Single-purpose UI (Button, TextInput, LineChart,
    │   │                            #   EquipmentImage, ThemeToggle, SegmentedToggle, …)
    │   ├── molecules/               # Atom combos (SearchBar, RestTimer, ExerciseBrowser,
    │   │                            #   CustomExerciseForm, MuscleBodyMap, WeighInsModal, …)
    │   ├── organisms/               # Full views (ExerciseLibrary, MovementDetail,
    │   │                            #   WorkoutSessionView, StructuralBalance, RecoveryPanel, …)
    │   └── templates/               # Page shells (AppShell, AuthTemplate, PlannerTemplate, …)
    ├── hooks/
    │   └── usePanelDrawer.js        # Drawer open/close a11y hook
    ├── lib/                         # Domain logic (pure modules, unit-testable)
    │   ├── api.js                   # API client (fetch + JWT + same-origin or VITE_API_BASE)
    │   ├── muscles.js               # Hierarchy builders, search (en/zh/pinyin), media URLs
    │   ├── presets/                 # Preset-workout library (41 ACSM-grounded routines):
    │   │                            #   goals.js (goal/equipment/level metadata), strength.js,
    │   │                            #   build.js, slim.js, endurance.js, focus.js (data) and
    │   │                            #   index.js (resolution, body-part grouping, payloads)
    │   ├── planGenerator.js         # Questionnaire answers -> weekly plan (one list per day)
    │   ├── equipmentGroups.js       # Canonical equipment grouping (23 cards, "Other" bucket)
    │   ├── effort.js                # RIR/RPE conversion + effort statistics
    │   ├── ranks.js                 # Iron→Challenger rank tables (StrengthLevel-calibrated)
    │   ├── onerm.js                 # Estimated 1RM formulas (Epley, Brzycki, etc.)
    │   ├── structuralBalance.js     # Strength standards vs bodyweight (gender-aware)
    │   ├── recovery.js              # Per-muscle recovery computation
    │   ├── bodyweight.js            # Bodyweight conversion + profile helpers
    │   ├── summary.js               # Session summary aggregation + volume comparison
    │   ├── journal.js               # Journal day keys + session grouping
    │   ├── timerAlert.js            # Timer sounds (beep/chime/bell), vibrate, flash
    │   ├── schedule.js              # Weekly plan schedule (fixed/rotation) normalization
    │   ├── dates.js                 # Date helpers (week boundaries, formatting)
    │   ├── units.js                 # kg/lbs conversion
    │   ├── storage.js               # localStorage helpers (theme, language, recent)
    │   ├── recent.js                # Recently viewed/trained muscle tracking
    │   ├── setValidation.js         # Client-side set rules (mirrors server)
    │   ├── format.js                # Number/date formatting
    │   └── validation.js            # Client-side form validation
    └── utils/
        ├── i18n.js                  # i18next setup + language persistence
        ├── locale.js                # App language → Intl locale mapping
        ├── format.js                # Number/date formatting
        ├── validation.js            # Client-side form validation
        └── locales/
            ├── en/translation.js    # English UI strings + muscle/equipment dictionary
            └── zh/translation.js    # Chinese UI strings + muscle/equipment dictionary
```

## Language Support

The UI follows your browser's language on first visit, remembers your choice (`localStorage`), and switches to your account's saved language after login. Search matches English, Chinese, or pinyin romanization.

| Language | UI detection | Search matching |
| --- | --- | --- |
| English | `navigator.language` fallback (default) | English text |
| 中文 | browser starts with `zh`, or profile setting | Chinese characters + typed pinyin (`pinyin-pro`) |

To add a new language: add a translation file under `src/utils/locales/<lang>/translation.js` (including the `muscles.*` taxonomy dictionary used for body-part/equipment names), register it in `src/utils/i18n.js`, extend the language mapping in `src/utils/locale.js`, and accept the new value in the server's profile update handler. Pinyin matching is Chinese-only and can be skipped.

## Development Workflow

### Data Pipeline

1. **`npm run fetch:data`** — Downloads `exercises.json` from the upstream dataset and all 1,324 GIFs + thumbnails into `public/videos/` and `public/images/` (mirroring the dataset's relative paths). Also saves the JSON to `server/data/exercises.json`.
2. **`npm run db:gen`** — Reads the local JSON, merges curated Chinese names from `server/data/exercise-names-zh.json`, computes pinyin + initials via `pinyin-pro`, assigns deterministic difficulty bands (1–3), and emits `server/seed.sql` with `INSERT` statements for the `exercises` table.
3. **`npm run db:schema:local`** — Applies the D1 schema to the local Miniflare database (destructive).
4. **`npm run db:data:local`** — Loads the seed data.
5. **`npm run db:test:gen`** — Generates deterministic test fixtures (`server/test-data.sql`) with a test user, 3 workout lists, 15 sessions across 4 time blocks (2025, 1Y, 90d, this week), 13 weigh-ins trending toward a goal, and questionnaire/schedule data. The script **asserts** coverage before writing:
   - Every comparison rung hit exactly once (kg and lbs ladders in agreement)
   - Full rank ladder coverage (Iron → Challenger + Unranked) on female tables
   - Per-block effort design (unrated, legacy hard, easy bias, full spread with RPE)
   - Monotonic weight progression per exercise (new-best badges always fire)
   - Recent sessions inside the current Sunday-start week
6. **`npm run db:test:local`** — Applies the test fixtures (idempotent: deletes and re-inserts test-prefixed rows).

### Local Dev Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Concurrently runs Vite (`:5173`) + wrangler dev (`:8787`) |
| `npm run dev:web` | Vite only — `/api` proxied to local Worker (or `API_TARGET`) |
| `npm run dev:api` | wrangler dev --local only (`:8787`) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the built output |
| `npm run lint` | ESLint on the whole project |

### Test Account

After running `npm run db:test:local`, log in with:

- **Email:** `123456@gmail.com`
- **Password:** `123456`

This account has questionnaire answers (goal: build, experience: intermediate, 3 days/week, gym, 60 min), a rotation schedule, and 15 sessions covering every rank tier and comparison rung.

## Database Schema

Key tables (see `server/schema.sql` for full DDL):

| Table | Purpose |
| --- | --- |
| `users` | Identity + preferences (questionnaire, schedule, bodyweight, effort scale, timer alerts, language) |
| `exercises` | Shared seed library (`user_id` NULL) + per-user custom exercises; includes zh name/pinyin/initials for search |
| `exercise_media` | Base64-encoded custom GIFs (capped at 1.4 MB raw) |
| `workout_lists` | Named lists per user; unique name per user (case-insensitive) |
| `workout_list_exercises` | Exercises in a list with per-exercise settings (rest, prescribed sets/reps, manual `position`) |
| `workout_sessions` | Completed sessions (snapshot of list name + bodyweight at training time) |
| `workout_session_sets` | Individual sets with reps, weight, unit, RIR, effort_scale |
| `bodyweight_log` | Weigh-in history with unit and timestamp |

Indexes support common query patterns: exercises by category/target/user, workout lists by user, sessions by list, sets by session/exercise, weigh-ins by user+date.

## Security Note

Passwords never leave the server in plain form — they are hashed with Web Crypto PBKDF2 (100k iterations, SHA-256, 16-byte per-user salt) in `server/auth.js`. Session tokens are JWTs signed with a server-side `JWT_SECRET` (a Worker secret in production, `server/.dev.vars` locally — both gitignored); the client only stores the token and sends it as a Bearer header. CORS is configurable via `CORS_ORIGIN` (default `*` — restrict it to your Pages domain in production). There are no third-party trackers or external media: every GIF, thumbnail, and equipment photo is bundled with the app.

## Extending the Project

### Add a new exercise to the seed library

1. Add it to the upstream [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) or fork the dataset.
2. Run `npm run fetch:data` to pull the updated JSON + media.
3. If the exercise needs a Chinese name, add an entry to `server/data/exercise-names-zh.json` (key = exercise id, value = Chinese name).
4. Run `npm run db:gen` → `npm run db:data:local` (or remote).

### Add a new preset workout

Edit the data files in `src/lib/presets/` (`strength.js`, `build.js`, `slim.js`, `endurance.js`, `focus.js`) following the existing schema, then rebuild. The `goals.js` metadata maps goal/equipment/level to the appropriate preset file.

### Add a new language

1. Create `src/utils/locales/<lang>/translation.js` with all UI strings + the `muscles.*` taxonomy.
2. Register it in `src/utils/i18n.js` (add to `resources`).
3. Extend `src/utils/locale.js` (language → Intl locale map).
4. Update `server/validate.js` and the profile update handler in `server/app.js` to accept the new language code.
5. Run `npm run dev` to test.

## License

MIT

### Attribution

This project uses data from:

- **[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)** — 1,324-exercise library (names, categories, muscles, equipment, instructions, GIFs, thumbnails)

UI/UX design inspired by:

- **[emilfunk/opengym](https://github.com/emilfunk/opengym)** — Workout tracker interface patterns and interactions

Both upstream projects are MIT-licensed. Thank you to their maintainers for making their work openly available.