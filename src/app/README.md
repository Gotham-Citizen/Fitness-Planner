# App (routes)

Thin one-view compositions of templates and organisms (11 routes,
one per App view). No data fetching and no duplicated UI primitives —
data orchestration stays in `src/app/App.jsx`, which lives here alongside
the route folders.

- `HomePage` — welcome + search entry.
- `PlannerPage` — search / target / category / A-Z browser + library sidebar.
- `WorkoutsPage` — workout lists + recovery sidebar.
- `SessionPage` — active session logger (+ legacy library rail).
- `SummaryPage` — `summary` and `history-summary` modes.
- `HistoryPage` — per-workout session history (+ legacy library rail).
- `JournalPage` — journal calendar + bodyweight/effort cards.
- `BalancePage` — `balance` and `structural-balance` modes.
- `AccountPage` — account settings.
- `TimerAlertsPage` — timer alert settings.
- `AuthPage` — login / signup gate.

Routes may use any component layer but must not define new UI primitives —
no raw `.primary-button` / `.ghost-button` / `.nav-button` / `.text-input`
markup outside the shared atoms (enforced by ESLint).
