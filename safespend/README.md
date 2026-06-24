# SafeSpend

A calm, premium **pay-cycle budget planner** PWA. SafeSpend isn't a traditional
expense tracker — it answers one question for each pay cycle:

> **How much can I safely spend before my next payday?**

Built with React + Vite + Tailwind. Works fully offline on `localStorage`, with a
clean data layer that's ready to swap in Supabase for auth + sync later.

```
Income − bills − savings − debt − planned spending = Safe to spend
Safe to spend ÷ days until payday = Daily allowance
```

---

## Features

- **Home dashboard** — a hero "Safe to spend" money card, days until payday,
  daily allowance, a cycle progress bar, upcoming items, and quick actions.
- **Pay-cycle planner** — give every part of your pay a job, grouped into bills,
  spending, savings, debt, and extra income, each with a live subtotal.
- **Timeline** — a vertical, date-grouped view of everything between now and
  payday, showing the running safe-to-spend balance after each item.
- **Scenario mode** — test a purchase ("Can I spend $300 on a weekend away?")
  and get a green / amber / red read with before-and-after numbers.
- **Fast add** — a low-friction sheet with example chips (Rent, Groceries, Fuel,
  Electricity, Childcare, Phone, Subscriptions, Savings, Debt repayment).
- **New pay cycle flow** — at payday, start a fresh cycle that carries forward
  your recurring items (each one editable) and re-dates them automatically.
- **Settings** — currency, pay frequency, next payday, export/import JSON,
  reset, and a placeholder for future account sync.
- **PWA** — installable, offline fallback, app icons, service worker.
- **Demo data** — the app looks complete on first open; first-time users get
  considered empty states instead.

The tone is deliberately encouraging, never shaming — "You have room for this",
"This may make the cycle tight", not "You overspent".

---

## Getting started

Requires **Node 18+**.

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build into /dist
npm run preview  # preview the production build locally
```

No environment variables or backend are needed — SafeSpend runs entirely on
`localStorage` out of the box.

---

## Project structure

```
src/
  lib/
    format.js          Currency + date helpers
    calculations.js    Safe-to-spend math (pure functions)
    db.js              Data repository — the ONLY module that persists
    supabaseClient.js  Supabase placeholder (inactive until keys are added)
    demoData.js        Demo cycle + example chips
    typeMeta.js        Icon/colour per expense type
  context/
    AppContext.jsx     App state + actions (optimistic updates over db.js)
  hooks/
    useCountUp.js      Animated hero number
  components/
    SafeSpendCard.jsx  The signature dark "money card"
    ExpenseSheet.jsx   Fast add/edit sheet
    NewCycleSheet.jsx  Start-new-cycle flow
    ExpenseRow.jsx     Shared list row
    ui/                Button, Card, Sheet primitives
    layout/            AppShell + BottomNav
  screens/
    Onboarding.jsx  Home.jsx  Timeline.jsx  Plan.jsx  Scenario.jsx  Settings.jsx
  App.jsx            Routing + onboarding/loading gate
  main.jsx           Entry + service-worker registration
```

### Data model

```
UserProfile { id, currency, payFrequency, nextPayday, typicalIncome }
PayCycle    { id, startDate, nextPayday, income, expenses[], createdAt }
Expense     { id, name, amount, dueDate, type, recurring, notes }
            type ∈ bill | saving | debt | spending | income
```

---

## Supabase: accounts + cloud backup

The app stays localStorage-first and fully offline; Supabase adds optional
accounts and cloud backup on top. Auth and snapshot backup are already wired —
to turn them on:

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env` and fill in:

   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   `src/lib/supabaseClient.js` only creates a client when these exist, so the
   app keeps working without keys. With no keys, Settings shows a gentle
   "add your Supabase keys" note instead of the sync controls.
3. Run `safespend-supabase.sql` in the Supabase SQL editor. It creates the
   `profiles` table (auto-provisioned on sign-up via trigger), the `backups`
   table for snapshots, and Row Level Security scoped to `auth.uid()`.
4. In the dashboard, enable your sign-up methods under
   **Authentication → Providers** (email is on by default).

That's it. **Settings → Cloud sync** now offers Create account / Sign in, and
once signed in, **Back up now** / **Restore** / **Sign out**.

### How sync works

- **Auth** lives in `src/context/AuthContext.jsx` (`useAuth()`), wrapping
  `supabase.auth`. The sheet UI is `src/components/AuthSheet.jsx`.
- **Backup** is snapshot-style: `src/lib/cloud.js` pushes exactly what
  `db.exportAll()` produces into one `jsonb` row per user, and restore runs that
  payload back through `db.importAll()`. So the cloud backup reuses the same
  format as the local Export/Import feature.
- Want per-record sync instead of snapshots? `safespend-supabase.sql` includes
  optional normalized `pay_cycles` + `expenses` tables (Part 3); swap the
  `db.js` bodies to query those and keep the same function signatures.

---

## Deploying to Cloudflare Pages

1. Push this project to a GitHub/GitLab repository.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to
   Git**, and pick the repo.
3. Set the build configuration:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. (Optional) Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under
   **Settings → Environment variables** once you wire up Supabase.
5. Deploy. Because the app uses client-side routing, add a `_redirects` file or a
   Pages rule mapping `/*` to `/index.html` (SPA fallback) if you add deep links.

The build output is a static site plus a generated service worker, so it installs
as a PWA and works offline once loaded.

---

## Notes

- Fonts (Plus Jakarta Sans + Inter) load from Google Fonts as progressive
  enhancement and are cached by the service worker; system fonts are used if
  offline before first load.
- All money uses tabular figures so digits never shift.
- Reduced-motion preferences are respected throughout.
