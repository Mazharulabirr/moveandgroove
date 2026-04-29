# Move & Groove v2 - Developer Docs

> Last updated: April 29, 2026
> Repo: https://github.com/marcomastrorocco/move-and-groove-v2
> Primary branch: `main`
> Hosting: Vercel
> App type: Next.js athlete mobility platform with Supabase auth/data and Anthropic-powered routine generation
> Current focus: ship a strong Basic-tier beta first, then layer Premium back in carefully

---

## Overview

Move & Groove is a mobility, screening, readiness, and routine-generation app for athletes. The current product combines:

- auth and onboarding
- 6-test mobility screening
- readiness check-ins
- AI-generated and fallback-generated routines
- results/profile views
- saved routine surfaces
- sport-matched routine backgrounds
- admin-managed exercise-video overrides
- live admin tooling for stats and exercise-video coverage
- early Premium battery/program surfaces

The app is past the "structurally broken" stage. The priority is now quality, specificity, clinical trust, and polish.

---

## Current Product Direction

The most important product decision right now is:

- nail the Basic tier first

That means:

- Basic must feel complete on its own
- Basic should not feel like a broken Premium preview
- the dashboard should be compact, clear, and action-led
- after screening is done, the app should feel like a workout tool, not endless onboarding
- Premium should remain visible, but secondary

Recent product direction that reflects that:

- dashboard remains black and compact
- screening is shared baseline for everyone
- Basic results/profile should stay mobility-first
- readiness should materially modify the generated routine
- the routine page is allowed to feel sport-specific
- the rest of the site should stay cleaner and more editorial

---

## What Works Now

- auth works again
- sign in / sign up / resend confirmation / reset are usable
- password reset redirects are forced to the production reset route
- mobility screening has been rebuilt into a 6-test at-home flow
- screening save is working against live Supabase with local fallback backup
- dashboard and results can read valid cloud screening rows
- routine generation works in production again
- fallback routine generation works when AI is slow or unavailable
- routine generation is biased toward a curated internal mobility library
- readiness now influences routine generation
- routine save works with authenticated RLS-aware auth token flow
- daily Basic routine limit works
- dashboard shows today’s routine count
- post-session check-in flow is hardened
- routine titles are stronger and more structured
- exercise videos can now be mapped through `/admin`
- routine page reads Supabase video overrides first, then falls back to the hardcoded library

---

## Recent Important Commits on `main`

- `f766d80` `fix: enforce minimum phase dose across targeted areas`
- `859147b` `fix: split auth and token-bound supabase clients`
- `0e0a8ba` `fix: enforce user jwt on server supabase auth client`
- `2c2effe` `fix: soften routine generation timeout errors`
- `578b72c` `fix: apply foam roll video overrides on routine page`
- `9534f6e` `fix: persist generated routines with authenticated client`
- `b6d39c2` `fix: group admin video manager by area and phase`
- `5cbc896` `fix: enforce exact approved exercise names`
- `58e5eac` `fix: remove unsafe exercise video aliases`
- `1c0b9dc` `fix: harden readiness log syncing and error visibility`
- `4f6073d` `fix: persist generated routines for daily basic limits`

Practical truth:

- the app is now in refinement mode
- remaining issues are mostly clinical quality, exercise choice quality, video coverage, and mobile polish rather than missing core architecture

---

## Current Basic User Journey

The intended Basic loop is:

1. user logs in
2. user completes screening once
3. user returns to the simplified dashboard
4. user creates a routine
5. user does readiness when relevant
6. user completes the workout
7. user completes post-session check-in
8. user returns to dashboard/results
9. user repeats routine creation as the main loop

Product rule:

- once screening is done, the app should feel like a workout tool, not like onboarding is still unfinished

---

## Main Routes

### Public / auth

- `/`
- `/auth`
- `/auth/reset`

### Core app

- `/dashboard`
- `/admin`
- `/screening`
- `/quiz`
- `/routine`
- `/results`
- `/session-checkin`
- `/recovery`

### Premium / secondary

- `/battery`
- `/programs`
- `/upgrade`

---

## Key Files

### Core pages

- `src/app/dashboard/page.tsx`
- `src/app/screening/ScreeningClient.tsx`
- `src/app/admin/page.tsx`
- `src/app/quiz/page.tsx`
- `src/app/routine/page.tsx`
- `src/app/results/page.tsx`
- `src/app/recovery/page.tsx`
- `src/app/session-checkin/page.tsx`

### Shared logic

- `src/lib/readiness.ts`
- `src/lib/readiness-log.ts`
- `src/lib/session-flow.ts`
- `src/lib/screening-cloud-v2.ts`
- `src/lib/curated-mobility.ts`
- `src/lib/routine-backgrounds.ts`
- `src/lib/sports.ts`
- `src/lib/exercise-videos.ts`
- `src/lib/supabase/admin.ts`

### API

- `src/app/api/routines/generate/route.ts`
- `src/app/api/routines/save/route.ts`
- `src/app/api/readiness-logs/route.ts`
- `src/app/api/admin/overview/route.ts`
- `src/app/api/admin/exercise-videos/route.ts`
- `src/app/api/exercise-videos/route.ts`

---

## Screening

The old screening was replaced with a 6-test at-home self-assessment.

Current tests:

- `Back scratch test`
- `Wall angel`
- `Single leg balance squat`
- `Seated hip rotation`
- `Quadruped T rotation`
- `Toe touch`

Current screening persistence:

- cloud-backed through `screening_questionnaires.responses`
- local storage fallback still exists as backup
- dashboard/results prefer valid Supabase rows first

Important schema truth:

- `screening_questionnaires` is still legacy-shaped and still requires legacy columns

---

## Readiness

Readiness is now meaningful rather than decorative.

Current logic:

- before routine generation, the app checks for today’s readiness log
- if soreness severity is high in an area, the session biases release and softens range volume/loading there
- if sleep quality is poor, duration is reduced and release bias increases
- if mood is low, the session gets shorter and gentler
- if readiness is good, generation proceeds normally

Important clinical rule now in place:

- readiness can reduce volume and intensity, but must never eliminate a phase entirely
- every targeted area must still have:
  - 1 release exercise
  - 1 activation exercise
  - 1 range exercise

This rule lives in:

- `src/lib/readiness.ts`
- `src/app/api/routines/generate/route.ts`

---

## Routine Generation

Route:

- `src/app/api/routines/generate/route.ts`

Current generation behavior:

- Anthropic is the main generation path
- the client request times out instead of hanging forever
- the server can still return a usable fallback session if AI is slow or unavailable
- AI is biased toward an approved internal exercise pool
- AI output is rejected if any targeted area is missing release, activation, or range
- curated fallback now seeds at least one exercise per targeted area per phase before adding extra volume

### Minimum dose rule

The prompt now explicitly includes:

- every targeted area must have at least 1 release, 1 activation, and 1 range exercise
- readiness modifiers can reduce volume within phases, but never eliminate a phase
- a routine missing any phase for a targeted area is clinically inadequate and must be rejected

### Curated mobility library

The app includes a curated internal exercise library in:

- `src/lib/curated-mobility.ts`

Grouped by:

- `hips`
- `shoulders`
- `spine`

Then by:

- `release`
- `activation`
- `range`

This library matters because:

- fallback routines use it directly
- the AI prompt is biased toward it
- it is now one of the main quality-control layers

---

## Saved Workouts and Auth/RLS

Current truths:

- routine save uses the signed-in user token
- routine generation persistence uses a token-bound Supabase client
- auth verification and RLS database access are now separated

Important files:

- `src/lib/supabase/admin.ts`
- `src/app/api/routines/generate/route.ts`
- `src/app/api/routines/save/route.ts`

Recent practical truth:

- this flow regressed during refactoring until auth verification and database access were split into:
  - `createAuthClient(...)`
  - `createAccessTokenClient(...)`

That split is easy to regress and should be treated as sensitive code.

---

## Exercise Videos and Admin

Current product decision:

- exercise videos are managed through a mix of hardcoded defaults and live Supabase overrides

Current implementation:

- `src/lib/exercise-videos.ts` holds the hardcoded library
- `/admin` can save YouTube IDs to Supabase `exercise_videos`
- routine page checks Supabase first, then falls back to the hardcoded library
- foam-roll drills now also respect admin-managed overrides

Admin video manager grouping now includes:

- Hips — Release
- Hips — Activation
- Hips — Range
- Shoulders — Release
- Shoulders — Activation
- Shoulders — Range
- Spine — Release
- Spine — Activation
- Spine — Range
- Foam Roll — Hips
- Foam Roll — Shoulders
- Foam Roll — Spine

---

## Routine Background Matching

Routine background matching exists in:

- `src/lib/routine-backgrounds.ts`

Current intended behavior:

- choose sport-specific background first
- otherwise choose body-area background
- otherwise use default mobility background

The routine page is the only page that should stay strongly user-specific in its imagery.

---

## Premium State

Premium remains secondary.

True right now:

- movement battery exists
- premium planning/program surface exists
- true persistent multi-week programming is not built yet

Do not let Premium complexity distract from Basic polish.

---

## Current Known Limitations

- screening is still layered onto a legacy Supabase table shape
- the curated mobility library still needs manual cleanup
- AI routine quality still needs sport-by-sport QA
- mobile refinement is still incomplete on some screens
- Premium programming is still more surface than true system
- admin is useful but still desktop-first

---

## Current Local State / Noise

Common unrelated files that may exist locally and should not be committed casually:

- `move-groove-dev.out.log`
- `move-groove-dev.err.log`
- `DEVELOPER_DOCS.rtf`

Also watch for BOM-only diffs in older files; those should not be bundled into unrelated commits.

---

## Practical Handoff Advice

If another developer or Claude continues from here, the most important truths are:

1. The app is functioning again at a real beta level.
2. Basic is still the priority.
3. Screening is rebuilt and now cloud-backed with local fallback backup.
4. Readiness materially affects routine generation.
5. Readiness must not eliminate a phase for a targeted area.
6. The curated mobility library is central to workout quality.
7. Auth and RLS around routine generation/save were recently hardened and are easy to regress.
8. Exercise videos are now testable and partly admin-managed.
9. Premium should stay secondary until Basic feels rock solid.

---

## Highest-Priority Next Steps

1. Continue Basic QA on deployed Vercel:
   - auth
   - dashboard
   - screening
   - results
   - quiz
   - routine

2. Clinically QA readiness-affected routines:
   - `Muay Thai + balanced + sore hips / upper back`
   - `BJJ + balanced`
   - `Golf + flexibility`

3. Confirm minimum-dose behavior on live:
   - every targeted area keeps release, activation, and range
   - soreness softens range dose but does not remove it

4. Keep tightening the curated mobility library.

5. Improve admin visibility for missing exercise-video coverage.

6. Continue mobile refinement page by page.

7. Only after Basic is strong, return to:
   - movement battery polish
   - true multi-week programming
   - scheduled workouts
   - calendar persistence
   - reminder systems
