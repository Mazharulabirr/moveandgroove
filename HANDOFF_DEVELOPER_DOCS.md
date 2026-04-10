# Move & Groove v2 - Developer Docs

Last updated: April 10, 2026
Primary branch: `main`
Hosting: Vercel
App type: Next.js athlete mobility platform with Supabase auth/data and Anthropic-powered routine generation

## Overview

Move & Groove is a mobility and readiness app for athletes. The current product combines:

- guided onboarding
- mobility screening
- premium movement battery testing
- AI-generated routines
- saved routine library
- pre/post session check-ins
- early premium planning flows
- results/profile history

The current visual direction is dark, metallic, and editorial, with inline React styles and a custom icon set.

## What Works Now

- auth is restored and usable
- dashboard access works
- live Anthropic routine generation works in production
- mobility screening works against the real Supabase schema
- movement battery works
- results/profile views work
- Basic vs Premium dashboard flow is visually distinct
- routine saving is explicit, not automatic
- pre-session readiness exists as a reusable modal
- routines can be progressed exercise-by-exercise with completion confirmation
- post-session check-in can be launched at the end of a routine
- landing page now includes a `TRUSTED BY` logo strip

## Current Product Logic

### Basic path

1. User completes mobility screening
2. User goes into sport/body-area routine builder
3. Readiness check is shown when they try to generate a session

### Premium path

1. User completes mobility screening
2. User completes movement battery
3. Dashboard presents a clear fork:
   - random workout
   - planned `4 / 8 / 12` week block
4. Premium users can run the readiness check from the top of the workout page

## Important Schema Reality

The original code assumed `screening_results` had richer columns than the real database actually provides.

The app now treats:

- `screening_questionnaires` as the source of truth for screening history
- saved questionnaire responses as the source for deriving:
  - hip score
  - shoulder score
  - spine score
  - overall score

This is a critical architectural truth for anyone touching the screening flow.

## Main Routes

### Public / auth

- `/`
  - landing page
  - includes hero, CTA, and `TRUSTED BY` logo section
- `/auth`
  - sign in / sign up / resend confirmation
- `/auth/reset`
  - password reset flow

### Core app

- `/dashboard`
  - guided user hub
  - branch logic for Basic vs Premium
  - dashboard preview mode via `?preview=basic` and `?preview=pro`
- `/screening`
  - mobility questionnaire
- `/battery`
  - premium movement screening battery
- `/quiz`
  - routine builder
  - now triggers pre-session readiness before routine generation when needed
- `/routine`
  - generated routine view
  - full workout visible
  - user must confirm current exercise completed before the next becomes active
  - post-session check-in available at session end
- `/results`
  - history/profile score views
- `/session-checkin`
  - standalone pre or post session check-in
- `/recovery`
  - recovery routine flow
- `/programs`
  - premium planning surface
  - supports visible `random workout` vs `planned block`
  - currently generates a structured plan view but does not yet persist a true long-term program model
- `/upgrade`
  - premium upsell

## Key Components and Files

### Core UI

- `src/components/Header.tsx`
- `src/components/Icons.tsx`
- `src/components/ProGate.tsx`
- `src/components/PreSessionReadinessModal.tsx`

### Core pages

- `src/app/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/quiz/page.tsx`
- `src/app/routine/page.tsx`
- `src/app/screening/page.tsx`
- `src/app/battery/page.tsx`
- `src/app/results/page.tsx`
- `src/app/session-checkin/page.tsx`
- `src/app/programs/page.tsx`

### Shared logic

- `src/lib/profiles.ts`
- `src/lib/readiness.ts`
- `src/lib/session-flow.ts`
- `src/lib/supabase/client.ts`

### API routes

- `src/app/api/routines/generate/route.ts`
- `src/app/api/routines/save/route.ts`

## Data Tables the App Uses

- `profiles`
- `progress`
- `routines`
- `routine_items`
- `screening_questionnaires`
- `screening_results`
- `test_results`
- `readiness_logs`

Notes:

- `screening_results` is not reliable enough to be the main screening history source
- `screening_questionnaires` is the safe source of truth right now

## Readiness Flow

### Reusable modal

`src/components/PreSessionReadinessModal.tsx` handles:

- sleep
- soreness
- mood
- soreness area selection
- soreness severity
- optional soreness notes

It writes into `readiness_logs`.

### Current placement

- removed from the top of the dashboard
- Basic: triggered after pressing `GENERATE ROUTINE`
- Premium: available as a dedicated button at the top of the workout page

### Session gating

`src/lib/session-flow.ts` contains the helper that checks whether a user already logged a pre-session readiness entry today.

## Routine Flow

`src/app/routine/page.tsx` now behaves like this:

- full workout remains visible
- user can read the whole plan from the start
- only the current exercise gets the active completion button
- once they confirm that exercise, the next one becomes active
- after the final exercise, the UI pushes them to post-session check-in

This was intentionally designed to guide completion without hiding the overall workout.

## Premium Programming

`src/app/programs/page.tsx` now gives a clearer premium split:

- random workout
- planned block

The planning page supports visible selection of:

- `4 weeks`
- `8 weeks`
- `12 weeks`

Current limitation:

- this is still a front-end planning surface driven from saved routine history
- it is not yet true persistent programming with scheduled workouts and durable calendar objects

## Landing Page Logos

Trusted-by assets currently live in:

- `public/trusted-by-bullets.avif`
- `public/trusted-by-heat.png`
- `public/trusted-by-logo.jpg`

These are rendered in a `TRUSTED BY` section on `src/app/page.tsx`.

## Recent UX Decisions

- less clutter is better
- saved routines should not dominate the dashboard
- readiness should appear in context, not as a random extra tool
- premium should feel like a clear fork, not just “more of the same”
- all users should be guided toward the next best step instead of seeing every option at once

## Known Limitations

- true program persistence is not built yet
- scheduled workouts are not saved as real calendar entities yet
- reminder emails do not exist yet
- videos are still not fully integrated
- routine page still uses video placeholders rather than a completed exercise video library
- the deeper screening save-feedback hardening in `src/app/screening/page.tsx` is still local-only and was intentionally not bundled into unrelated pushes

## Video Plan

Best target is Supabase Storage, not git hosting.

Recommended structure:

- `exercise-videos/release/...`
- `exercise-videos/activation/...`
- `exercise-videos/range/...`

Use body area in filenames rather than folder names.

Example:

- `release/shoulder-band-distraction.mp4`
- `activation/shoulder-wall-slide.mp4`
- `range/shoulder-cars.mp4`

## Highest Priority Next Steps

1. Build real exercise video support
2. Turn planned blocks into true persisted `4 / 8 / 12` week programming
3. Add scheduled workout records and calendar persistence
4. Add reminder emails
5. Make readiness modify workouts more intelligently
6. Decide whether to push the still-local screening save-status hardening

## Build / Deployment Notes

- Vercel is connected to GitHub `main`
- pushing `main` should auto-deploy
- recent build issue on `/session-checkin` was caused by `useSearchParams` and has already been fixed
- local `npm run build` can fail on this machine because Windows sometimes locks `.next` files with `EPERM unlink`
- `npx tsc --noEmit` is the reliable local validation step when that file-lock issue appears

## Practical Handoff Advice

If another developer or Claude continues from here, the most important truths are:

1. The product is functioning again
2. The dashboard is now onboarding-first
3. `screening_questionnaires` is the real screening history source
4. readiness is now context-driven
5. premium programming is started but not truly persistent yet
6. the next serious feature is video + real long-term program persistence
