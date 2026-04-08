# Move & Groove v2 - Developer Documentation

> Last updated: April 8, 2026
> Repo: https://github.com/marcomastrorocco/move-and-groove-v2
> Branch: `main`
> Status: working MVP with live routine generation, restored auth flow, guided dashboard onboarding, and local screening schema compatibility fixes

---

## 1. Project Overview

Move & Groove is a Next.js mobility app for athletes. The product currently combines:

- AI-generated mobility routines
- mobility screening
- movement battery testing
- readiness and session check-ins
- saved routines and results history
- recovery sessions
- basic programs/calendar views
- subscription-gated flows for Basic vs Premium

The UI direction is dark, editorial, and sport-focused, using inline styles, strong typography, and a shared custom SVG icon system.

---

## 2. Current Product Status

### Working now

- Email auth flow is usable again
- Sign-in works
- Dashboard loads
- Password visibility toggle exists on auth page
- Resend confirmation support exists on auth page
- Password reset flow was stabilized enough to get back into the app
- Live Anthropic routine generation works again on Vercel
- Mobility screening runs locally against the current Supabase schema
- Movement battery page works locally
- Results page works using questionnaire-derived screening history
- Guided dashboard flow now exists
- Local dashboard preview supports Basic vs Full/Premium views

### Implemented recently in this batch

- Guided first-user dashboard instead of a wall of options
- Shared first step for all users: mobility screening
- Screening retake window messaging for once every 30 days
- Basic path guidance after screening
- Premium path guidance after screening into movement battery
- Previous mobility score access from dashboard/results
- Metallic headline treatment and stronger hover states on dashboard cards
- Screening save flow hardened for mismatched Supabase schema
- Screening/result reads shifted to `screening_questionnaires` as the source of truth for mobility region scores
- Dashboard preview mode via querystring for Basic vs Premium comparison

### Still incomplete / future work

- 4 / 8 / 12 week program setup flow
- true random daily routine mode as a productized option
- real scheduled workout calendar persistence
- 30-minute email reminders before workouts
- deeper readiness pain logic that asks *where* the problem is
- automatic session-end follow-up that influences next-day recovery or modifications
- fully normalized and documented Supabase schema for screening summary tables

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 App Router |
| Language | TypeScript |
| UI | React 19 |
| Styling | Inline styles + `globals.css` tokens/utilities |
| Auth + DB | Supabase |
| AI | Anthropic SDK |
| Hosting | Vercel |
| Local dev | `next dev` / Turbopack |
| Linting | ESLint 9 |

---

## 4. High-Level Architecture

```text
Browser
  -> Next.js App Router pages
    -> Supabase browser client for auth + user data
    -> API routes for server-side generation

Core flows
  Auth
    -> Supabase Auth
    -> profiles.is_pro check

  Quiz / Recovery
    -> POST /api/routines/generate
    -> Anthropic
    -> save routines + routine_items

  Screening
    -> calculate region scores client-side
    -> save raw questionnaire responses to screening_questionnaires
    -> optionally save minimal summary row to screening_results
    -> dashboard/results derive mobility profile from questionnaire responses

  Battery
    -> score tests client-side
    -> save test_results

  Programs / Session start
    -> readiness questions
    -> save readiness_logs
    -> route to quiz
```

Important current note:

- The app originally assumed a richer `screening_results` schema with columns like `assessed_at`, `raw_scores`, and region scores.
- The real Supabase schema in this project does not currently match those assumptions.
- The current code now treats `screening_questionnaires` as the reliable source for screening history and derives the score summary from stored responses.

---

## 5. Directory Structure

```text
move-and-groove-v2/
|-- DEVELOPER_DOCS.md
|-- DEVELOPER_DOCS.rtf
|-- package.json
|-- next.config.ts
|-- tsconfig.json
|-- src/
|   |-- app/
|   |   |-- page.tsx
|   |   |-- auth/
|   |   |   |-- page.tsx
|   |   |   `-- reset/page.tsx
|   |   |-- dashboard/page.tsx
|   |   |-- quiz/page.tsx
|   |   |-- routine/page.tsx
|   |   |-- screening/page.tsx
|   |   |-- battery/page.tsx
|   |   |-- results/page.tsx
|   |   |-- readiness/page.tsx
|   |   |-- session-checkin/page.tsx
|   |   |-- recovery/page.tsx
|   |   |-- programs/page.tsx
|   |   |-- upgrade/page.tsx
|   |   `-- api/
|   |       |-- progress/route.ts
|   |       `-- routines/
|   |           |-- generate/route.ts
|   |           `-- [id]/route.ts
|   |-- components/
|   |   |-- Header.tsx
|   |   |-- Icons.tsx
|   |   `-- ProGate.tsx
|   `-- lib/
|       |-- profiles.ts
|       |-- readiness.ts
|       `-- supabase/client.ts
`-- public/
```

---

## 6. Main Routes and Current Purpose

| Route | Purpose | Current status |
|---|---|---|
| `/` | landing page and auth recovery handoff | built |
| `/auth` | sign in, sign up, resend confirmation, forgot password | working |
| `/auth/reset` | reset password after email recovery | working well enough for local use |
| `/dashboard` | guided user hub and next-step logic | recently refactored |
| `/quiz` | routine builder | working |
| `/routine` | generated routine viewer | working |
| `/screening` | mobility screening | working locally after schema compatibility fixes |
| `/battery` | movement battery | working |
| `/results` | screening and battery history view | now derives screening history from questionnaires |
| `/readiness` | standalone readiness page | present |
| `/session-checkin` | pre / post session check-in | present |
| `/recovery` | recovery session flow | working |
| `/programs` | basic weekly calendar / block view | present but not fully productized |
| `/upgrade` | upgrade / Pro upsell | working |

---

## 7. API Routes

### `POST /api/routines/generate`
File: `src/app/api/routines/generate/route.ts`

Responsibilities:

- accepts quiz/recovery inputs
- builds the Anthropic prompt
- calls Anthropic
- parses structured output
- saves routines and routine items to Supabase
- returns routine payload to the client

Recent stability work:

- Anthropic key usage is sanitized before client creation
- live Vercel generation has been verified working again
- temporary diagnostics used during the key-fix process were already removed

### Placeholder routes

- `src/app/api/progress/route.ts`
- `src/app/api/routines/[id]/route.ts`

These still exist only as placeholder `501`-style modules / stubs and are not real product endpoints yet.

---

## 8. Current Supabase Tables the App Depends On

### Auth / profile

- `profiles`
  - `id`
  - `is_pro`
  - `created_at`

### Routines

- `routines`
- `routine_items`

### Assessments / logs

- `screening_questionnaires`
- `screening_results`
- `test_results`
- `readiness_logs`
- `progress`

### Planning / future-facing tables seen in earlier project notes

- `programmes`
- `programme_sessions`
- `videos`

Important schema caveat:

- The existing codebase was originally written as if `screening_results` contained richer summary columns.
- Actual runtime testing showed missing columns such as:
  - `assessed_at`
  - `raw_scores`
  - `spine_score`
- The current implementation now avoids relying on those missing columns for the user-facing mobility history.

---

## 9. Current Business Logic

### Mobility screening

- 11 questions across general activity/pain plus hips, shoulders, and spine
- screening percentages are calculated client-side
- raw responses are stored in `screening_questionnaires`
- the dashboard/results derive region scores from those stored answers
- user is intended to retake only once every 30 days

### Subscription pathing

Current intended UX:

- All users start with mobility screening
- Basic users then go to sport-specific or body-part routine choice
- Premium users go from screening to movement battery
- After premium battery, users move into daily routine or programs/calendar flow

### Readiness / session logic

Current state:

- readiness exists and can be saved before a session
- session check-in exists pre and post session
- however, pain handling is still too shallow for real intelligent workout modification

Known product gap:

- If a user reports pain, the app still does not ask *where* the pain is
- This means AI cannot safely or accurately adapt the workout around the painful region yet

### Programs

Current state:

- programs page derives a weekly calendar and block summary from routine history
- it is not yet a true scheduled programming engine

Not built yet:

- plan length selection (`4 / 8 / 12 weeks`)
- scheduled workout persistence
- reminder orchestration
- auto-populated calendar from a selected plan

---

## 10. Dashboard Refactor Summary

The dashboard was recently changed substantially.

### Before

- users landed on a broad grid of options immediately
- it was unclear where to start

### Now

The dashboard decides the best next step from:

- whether screening exists
- whether battery exists
- whether the user is Basic or Premium
- whether routines already exist

It now emphasizes:

- one guided hero action
- saved mobility score access
- battery status
- cleaner progression language
- stronger hover styling
- metallic headline styling

### Preview mode

The dashboard now supports local preview switching via query string:

- `?preview=basic`
- `?preview=pro`

This is currently a local UI preview aid and does not change real subscription state.

---

## 11. Auth / Deployment Status

### Auth

Currently true:

- sign-in works
- dashboard access works
- password visibility toggles exist
- resend confirmation flow exists
- reset flow was stabilized enough to get back into the app

### Anthropic / deployment

Currently true:

- Vercel production was failing with `401 invalid x-api-key`
- the route was hardened to sanitize env input
- the issue was narrowed down and resolved
- live routine generation now works again

### Local development

Current local dev URL when the correct repo is running:

- `http://localhost:3001`

Reason:

- another process is occupying port `3000`

Useful local URLs right now:

- `http://localhost:3001/dashboard`
- `http://localhost:3001/dashboard?preview=basic`
- `http://localhost:3001/dashboard?preview=pro`
- `http://localhost:3001/screening`

---

## 12. Current Known Issues / Next Priorities

### Highest-priority product issue

Improve pre-session readiness depth.

Reason:

- current pain question is too generic
- if pain is reported, the app still does not know which region is affected
- workout modification cannot be smart without area-specific context

What should be added next:

- conditional pain follow-up questions
- painful area selection
- severity and type of pain
- whether the user wants lighter work / avoidance / recovery-only
- pass this structured context into generation

### Calendar / programming work still needed

1. Add a real plan setup flow
   - 4 weeks
   - 8 weeks
   - 12 weeks
   - random daily routine

2. Add a schedule data model
   - scheduled workouts
   - date/time
   - reminder state
   - completion state

3. Build calendar population logic
   - create workout instances from selected plan
   - persist them
   - display them consistently

4. Add email reminder system
   - 30-minute reminder
   - job/scheduler
   - delivery tracking

5. Link readiness and post-session feedback to actual scheduled workouts

### Technical cleanup still needed

- formalize the Supabase schema documentation against the real project schema
- decide whether `screening_results` should remain minimal or be rebuilt to include region summaries properly
- implement real versions of placeholder API routes if needed

---

## 13. Recent Commits Before This Current Uncommitted Batch

Already committed before the current local work:

- `9583b1c` `chore: remove temporary anthropic diagnostics`
- `0441859` `fix: clean UTF-8 encoding in generate route`
- `edaa1bb` `chore: add safe anthropic env diagnostics`
- `5811d43` `fix: sanitize anthropic env usage in generator route`
- `a4bc650` `fix: restore auth access and stabilize supabase client`
- `28c1faf` `fix: stabilize auth reset flow and build validation`

Current local batch still needed to commit at the moment this doc was updated:

- guided dashboard onboarding refactor
- screening schema compatibility fixes
- results/dashboard sourcing mobility history from questionnaires
- dashboard subscription preview mode

---

## 14. Practical Handoff Notes

If a new developer or Claude continues from here, the most important truths are:

1. The app is usable again.
2. Auth is working.
3. Live routine generation is working.
4. The dashboard has been refactored into a guided onboarding-first experience.
5. Screening data should currently be treated as questionnaire-driven, not dependent on a rich `screening_results` schema.
6. The next best product improvement is the deeper pre-session pain/readiness flow.
7. The next major systems feature after that is true program scheduling/calendar/reminders.

---

## 15. Suggested Next Build Order

1. Commit and push the current local dashboard/screening/results batch
2. Improve pre-session readiness with conditional pain detail
3. Define the real schedule/program schema
4. Build 4/8/12-week plan setup flow
5. Persist scheduled workouts and render them in calendar
6. Add reminder emails
7. Revisit subscription-specific polish around Basic vs Premium experience
