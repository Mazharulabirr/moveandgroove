# Claude Recap

Move & Groove v2 on `main` is now a solid Basic-first beta mobility app. The product is usable end to end, and the current priority is still to make the Basic tier feel complete, clean, and trustworthy before putting more energy into Premium complexity.

## Core Product Truth

The main product rule right now is:

- nail the Basic tier first

That means:

- Basic must feel complete on its own
- Basic should not feel like a broken Premium preview
- the dashboard should stay compact and directive
- screening should happen once, then the app should behave like a workout tool
- Premium should remain secondary while Basic is tightened

## What Is Working Now

### Auth

Working flows:

- sign in
- sign up
- resend confirmation
- password reset flow

Important auth note:

- password reset redirect is hardcoded to production reset route so reset emails do not inherit localhost during testing
- reset target is `https://move-and-groove-v2.vercel.app/auth/reset`

## Screening

The old screening is gone. The current screening is a 6-test at-home self-assessment.

Current tests:

- `Back scratch test`
- `Wall angel`
- `Single leg balance squat`
- `Seated hip rotation`
- `Quadruped T rotation`
- `Toe touch`

Current behavior:

- each test has a real local still image
- each test has movement-specific answer wording
- the end score screen explains:
  - what the score means
  - which region is weakest
  - what to focus on next

Important technical state:

- screening is now cloud-backed again through `screening_questionnaires.responses`
- local storage fallback still exists as safety backup
- dashboard and results read Supabase first, then fall back locally if cloud data is unavailable
- old legacy questionnaire rows are ignored unless they contain parseable mobility screening answers

Relevant files:

- `src/app/screening/page.tsx`
- `src/app/screening/ScreeningClient.tsx`
- `src/lib/mobility-screening.ts`
- `src/lib/assessment-media.ts`
- `src/lib/screening-storage.ts`
- `src/lib/screening-cloud-v2.ts`

## Readiness and Routine Generation

Routine generation is now more controlled and more product-shaped than earlier versions.

Current behavior:

- Anthropic is still the main generation path
- fallback generation exists when AI is slow or unavailable
- fallback routines are no longer generic nonsense; they now use curated movement logic
- readiness now modifies routine generation before the prompt is built

Readiness logic now does this:

- checks today’s readiness log before generating
- if soreness severity is high in an area, reduces work into that area and biases release
- if sleep is poor, shortens the session and biases release over range
- if mood is low, shortens and softens the session
- if readiness is good, generates normally

Relevant files:

- `src/lib/readiness.ts`
- `src/app/api/routines/generate/route.ts`

## Curated Exercise Library

The app now has a curated internal mobility library built from real gym programming.

File:

- `src/lib/curated-mobility.ts`

Structure:

- `hips`
- `shoulders`
- `spine`

Then within each:

- `release`
- `activation`
- `range`

Why it matters:

- fallback routines pull from it
- the AI prompt is biased toward it
- this is now one of the most important quality-control layers in the app

Important cleanup truths already identified:

- `Forward slides` and `Chest slides` are different exercises and must not be merged
- `T / Y / I` and `W-Y` belong in shoulders activation, not spine activation
- `Swimmers` should not be in spine range

The library still needs more cleanup, but it is already improving routine quality.

## Routine Page

The routine page now includes:

- better title naming structure
- clearer evidence/trust presentation
- visible saved-routine flow
- set ticking within a live block/circuit rather than forcing full completion of one exercise at a time
- direct post-session check-in handoff

Important new behavior:

- the routine background now matches the selected sport first, then body area, then a fallback image
- this logic lives in `src/lib/routine-backgrounds.ts`

Current mapping direction:

- uploaded real sport images are used where they exist
- area-based routines use the mobility-session image
- the routine page is the only page that should stay “smart” about user-specific image matching

## Dashboard / Results

The Basic dashboard is much cleaner now.

Current intended Basic experience:

- screen once
- come back to a compact dashboard
- create routines repeatedly as the main loop
- review score, sessions, and saved routines without clutter

Current improvements:

- dashboard is black, cleaner, and more compact
- saved workouts are surfaced more clearly
- results also shows saved workouts more clearly
- Basic does not keep screaming about Premium-only battery actions

## Background / Visual Direction

Current direction:

- home keeps the original hero image
- dashboard stays black
- non-routine pages are being moved back toward cleaner stock-style backgrounds because the uploaded athlete images looked too visually heavy for the core site pages
- routine page keeps the user-specific matched background behavior

This distinction is intentional:

- site pages should look clean and editorial
- routine page can feel more tailored and sport-specific

## Current Known Realities

### Screening schema

The live Supabase table is still legacy-shaped.

Confirmed truths:

- `screening_questionnaires.completed_at` does not exist
- `screening_questionnaires.responses` had to be added additively
- legacy required fields still exist:
  - `goal`
  - `activity_level`
  - `desk_hours_per_day`
  - `average_sleep_quality`
  - `stress_level`

So the new screening is working, but it is layered onto an older table model.

### Premium

Premium is still secondary.

True right now:

- movement battery exists
- planning/programming surface exists
- real persistent multi-week programming is not built yet

Do not let Premium complexity distract from Basic polish.

## Most Important Next Steps

1. Keep tightening Basic end-to-end quality on deployed Vercel.
2. Continue cleaning the curated mobility library.
3. Keep testing real generated routines across more sports and states.
4. Finish committing and deploying the expanded routine background image set.
5. Keep refining mobile page by page.
6. Only after Basic feels strong, return to deeper Premium work.

## Short Handoff Truth List

1. Basic is still the priority.
2. Screening is rebuilt and now saves to cloud with local fallback backup.
3. Readiness now affects routine generation.
4. The curated exercise library is central to workout quality.
5. The routine page now supports sport/area-matched backgrounds.
6. General site pages should stay cleaner and less image-heavy than the routine page.
7. Premium should stay secondary until Basic feels rock solid.
