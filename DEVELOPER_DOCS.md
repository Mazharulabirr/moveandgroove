# Move & Groove v2 - Developer Docs

> Last updated: April 21, 2026
> Repo: https://github.com/marcomastrorocco/move-and-groove-v2
> Primary branch: `main`
> Hosting: Vercel
> App type: Next.js athlete mobility platform with Supabase auth/data and Anthropic-powered routine generation
> Current focus: ship a strong Basic-tier beta first, then layer Premium back in carefully

---

## Overview

Move & Groove is a mobility, screening, readiness, and routine-generation app for athletes. The app currently combines:

- auth and onboarding
- 6-test mobility screening
- readiness check-ins
- AI-generated and fallback-generated routines
- results/profile views
- saved routine surfaces
- early Premium battery/program surfaces

The visual direction is dark, editorial, and sport-led, but the current UX rule is that Basic should stay clean and not feel visually or functionally overloaded.

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
- saved workouts should be visible and useful
- readiness should actually modify the generated routine
- the routine page can feel sport-specific, but the rest of the site should stay cleaner and more editorial

---

## What Works Now

- auth works again
- sign in / sign up / resend confirmation / reset are usable
- password reset redirects are forced to production reset route
- mobility screening has been rebuilt into a 6-test at-home flow
- screening save is working against live Supabase with local fallback backup
- dashboard and results can read valid cloud screening rows
- routine generation works in production again
- fallback routine generation works when AI is slow or unavailable
- routine generation is biased toward a curated internal mobility library
- balanced routines have phase-coverage guardrails
- readiness now influences routine generation
- saved workouts are surfaced more clearly on dashboard and results
- routine titles are stronger and more structured
- routine backgrounds can now match the selected sport or body area

---

## Deployed State on `main`

Recent important commits on `main` include:

- `618f5d2` `fix: hardcode production redirectTo for password reset email`
- `d59c5db` `feat: readiness-aware routine generation, saved routines view, creative workout names`
- `9d0f3c0` `feat: replace stock backgrounds with real athlete photos`
- `d1fbce2` `fix: tune athlete backgrounds and auth hero`
- `f70643c` `fix: lighten athlete background overlays`
- `9b18d68` `fix: reduce athlete background darkness`
- `6b10eb1` `fix: rebalance athlete page backgrounds`
- `497dd72` `feat: match routine backgrounds to user focus`

Important note:

- the expanded sport-image set for routine backgrounds exists locally right now and may not be committed yet depending on the exact working tree state

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
  - landing page
- `/auth`
  - sign in / sign up / resend confirmation
- `/auth/reset`
  - password reset flow

### Core app

- `/dashboard`
  - Basic-first dashboard
- `/screening`
  - mobility baseline screen
- `/quiz`
  - routine builder
- `/routine`
  - generated routine view
- `/results`
  - score/profile/results surface
- `/session-checkin`
  - pre/post session check-in
- `/recovery`
  - recovery routine flow

### Premium / secondary

- `/battery`
  - Premium movement battery
- `/programs`
  - premium planning/program surface
- `/upgrade`
  - premium upsell surface

---

## Key Files

### Core pages

- `src/app/page.tsx`
- `src/app/auth/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/screening/page.tsx`
- `src/app/screening/ScreeningClient.tsx`
- `src/app/quiz/page.tsx`
- `src/app/routine/page.tsx`
- `src/app/results/page.tsx`
- `src/app/recovery/page.tsx`
- `src/app/battery/page.tsx`
- `src/app/session-checkin/page.tsx`
- `src/app/programs/page.tsx`

### Shared logic

- `src/lib/readiness.ts`
- `src/lib/session-flow.ts`
- `src/lib/mobility-screening.ts`
- `src/lib/assessment-media.ts`
- `src/lib/screening-storage.ts`
- `src/lib/screening-cloud-v2.ts`
- `src/lib/curated-mobility.ts`
- `src/lib/routine-backgrounds.ts`
- `src/lib/sports.ts`
- `src/lib/exercise-videos.ts`

### API

- `src/app/api/routines/generate/route.ts`

---

## Screening

### Current screening model

The old screening was replaced with a 6-test at-home self-assessment.

Current tests:

- `Back scratch test`
- `Wall angel`
- `Single leg balance squat`
- `Seated hip rotation`
- `Quadruped T rotation`
- `Toe touch`

Current UX:

- each test has a real local still image
- each test has movement-specific answer wording
- the final score screen explains:
  - what the score means
  - which region is weakest
  - what to focus on next

### Current screening persistence

Screening save is now working against live Supabase, but the table shape is still legacy-shaped.

Confirmed schema truths:

- `screening_questionnaires.completed_at` does not exist
- `screening_questionnaires.responses` had to be added additively
- the table still requires legacy columns:
  - `goal`
  - `activity_level`
  - `desk_hours_per_day`
  - `average_sleep_quality`
  - `stress_level`

Current implementation:

- the app inserts new 6-test answers into `screening_questionnaires.responses`
- local storage fallback still exists as backup
- dashboard/results prefer valid Supabase rows first
- legacy questionnaire rows are ignored unless they contain parseable screening answers

Relevant files:

- `src/app/screening/ScreeningClient.tsx`
- `src/lib/screening-cloud-v2.ts`
- `src/lib/screening-storage.ts`
- `src/app/dashboard/page.tsx`
- `src/app/results/page.tsx`

### Assessment media

Assessment media is centralized in:

- `src/lib/assessment-media.ts`

Current screening stills live in:

- `public/movement-tests/shoulder-back-scratch.webp`
- `public/movement-tests/shoulder-wall-angel.jpg`
- `public/movement-tests/hip-single-leg-squat.jpg`
- `public/movement-tests/hip-seated-rotation.jpg`
- `public/movement-tests/spine-quadruped-t-rotation.jpg`
- `public/movement-tests/spine-toe-touch.webp`

---

## Readiness

Readiness is now meaningful rather than decorative.

Current logic:

- before routine generation, the app checks for today’s readiness log
- if soreness severity is high in an area, the session reduces work there and biases release
- if sleep quality is poor, duration is reduced and release bias increases
- if mood is low, the session gets shorter and gentler
- if readiness is good, generation proceeds normally

This logic lives in:

- `src/lib/readiness.ts`
- `src/app/api/routines/generate/route.ts`

Current limitation:

- it is still rule-based, not a fully explainable clinical engine
- user-facing explanation of adjustments can still improve further

---

## Routine Generation

Route:

- `src/app/api/routines/generate/route.ts`

Current generation behavior:

- Anthropic is the main generation path
- the client request times out instead of hanging forever
- the server can still return a usable fallback session if AI is slow or unavailable
- AI is biased toward an approved internal exercise pool
- balanced sessions are rejected if phase coverage is weak and replaced with curated fallback logic
- routine titles are instructed to follow a more athletic `[Focus] — [Context]` style

### Curated mobility library

The app now includes a curated internal exercise library in:

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
- it is now one of the main product-quality control layers

Known cleanup truths already identified:

- `Forward slides` and `Chest slides` are different exercises
- `T / Y / I` and `W-Y` belong in shoulders activation, not spine activation
- `Swimmers` should not be in spine range

This file still needs more cleanup over time.

---

## Saved Workouts

Saved workouts are now surfaced more clearly on:

- `src/app/dashboard/page.tsx`
- `src/app/results/page.tsx`

The user should be able to see:

- workout date
- routine name
- sport or area focus
- goal
- duration

This is a meaningful Basic-tier improvement because the app now feels more like an actual usable tool, not a one-off generator.

---

## Routine Background Matching

Routine background matching now exists in:

- `src/lib/routine-backgrounds.ts`

Current intended behavior:

- choose sport-specific background first
- otherwise choose body-area background
- otherwise use default mobility background

Current direction:

- routine page can stay tailored and sport-aware
- general site pages should stay visually cleaner

Currently supported uploaded-image matches include:

- AFL
- Rugby
- Cricket
- BJJ
- Kickboxing
- Muay Thai
- Golf
- Soccer
- Wrestling
- Weightlifting
- Tennis
- Basketball
- Volleyball
- Netball
- Water Polo
- High Jump
- Hurdles
- Handball
- Padel

Area-based routines still use:

- Athletix mobility image for hips / shoulders / spine / general mobility

Important note:

- depending on current uncommitted state, the expanded image set may still need committing/pushing

---

## Visual / Background Direction

Current visual decisions:

- home keeps its original hero image
- dashboard stays black
- recovery keeps the older stock barbell image
- general site pages are trending back toward cleaner stock/editorial backgrounds
- routine page is allowed to be the smart, user-specific image surface

This distinction is intentional.

Rule of thumb:

- site pages = cleaner and more restrained
- routine page = more personal and sport-specific

---

## Exercise Video Direction

Current product decision:

- exercise videos will be hosted first on an unlisted YouTube channel

Why:

- lighter app
- faster beta implementation
- easier content control

Recommended implementation pattern:

- maintain a curated exercise name -> YouTube ID mapping in app logic or later in a small admin-friendly table
- do not rely on a raw YouTube channel feed as the app’s source of truth

Current file:

- `src/lib/exercise-videos.ts`

---

## Premium State

Premium remains secondary.

True right now:

- movement battery exists
- premium planning/program surface exists
- true persistent multi-week programming is not built yet

Still not built:

- durable multi-week program model
- scheduled workout instances
- calendar-backed program structure
- reminder emails

Do not let Premium complexity distract from Basic polish.

---

## Current Known Limitations

- screening is working, but still layered onto a legacy Supabase table shape
- the curated mobility library still needs manual cleanup
- AI routine quality still needs ongoing QA across more sports and states
- mobile refinement is still incomplete on some screens
- Premium programming is still more surface than true system
- exercise video integration is still only partially built
- the routine background image expansion may still need a final commit/push depending on current local state

---

## Current Local State / Noise

Common unrelated files that may exist locally and should not be committed casually:

- `src/lib/curated-mobility.ts` when only encoding/noise changes are present
- `src/lib/screening-cloud.ts` old unused helper
- `move-groove-dev.out.log`
- `move-groove-dev.err.log`
- `DEVELOPER_DOCS.rtf`

---

## Practical Handoff Advice

If another developer or Claude continues from here, the most important truths are:

1. The app is functioning again at a real beta level.
2. Basic is the priority.
3. Screening has been rebuilt and is now cloud-backed with local fallback backup.
4. Readiness now materially affects routine generation.
5. The curated mobility library is central to workout quality.
6. Saved workouts now matter in the Basic experience.
7. The routine page now supports sport/body-area matched backgrounds.
8. The rest of the site should remain cleaner and less image-heavy than the routine page.
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

2. Keep cleaning the curated mobility library:
   - duplicates
   - mis-bucketed drills
   - wrong merges
   - rationale wording cleanup

3. Keep improving workout quality using real generated examples:
   - `balanced`
   - `flexibility`
   - `sport relevant`
   - low-readiness cases

4. Finish committing and deploying the expanded routine-background sport image set if still local.

5. Continue screen-by-screen mobile refinement.

6. Only after Basic is strong, return to:
   - movement battery polish
   - true multi-week programming
   - scheduled workouts
   - calendar persistence
   - reminder systems
