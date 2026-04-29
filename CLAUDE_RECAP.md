# Claude Recap

Move & Groove v2 on `main` is now a usable Basic-first beta mobility app. The product works end to end, and the priority is still to make the Basic tier feel complete, clinically trustworthy, and polished before spending more attention on Premium complexity.

## Core Product Truth

The main product rule right now is:

- nail the Basic tier first

That means:

- Basic must feel complete on its own
- Basic should not feel like a broken Premium preview
- screening should happen once, then the app should behave like a workout tool
- the dashboard should stay compact and action-led
- Premium should remain visible but secondary

## Latest Important Fixes

Recent important commits on `main`:

- `f766d80` `fix: enforce minimum phase dose across targeted areas`
- `859147b` `fix: split auth and token-bound supabase clients`
- `0e0a8ba` `fix: enforce user jwt on server supabase auth client`
- `2c2effe` `fix: soften routine generation timeout errors`
- `578b72c` `fix: apply foam roll video overrides on routine page`
- `9534f6e` `fix: persist generated routines with authenticated client`
- `b6d39c2` `fix: group admin video manager by area and phase`

What those fixes changed:

- generated routines now persist through an authenticated, token-bound Supabase client instead of failing RLS
- auth verification and RLS database access are now split into separate Supabase clients
- quiz generation timeout now fails more gracefully for the user
- foam-roll drills on the routine page can now use admin-managed Supabase video overrides
- readiness is no longer allowed to eliminate a phase for a targeted area
- AI routines are now rejected if any targeted area is missing release, activation, or range
- curated fallback now seeds at least one exercise per targeted area per phase before adding extra volume

## What Is Working Now

- auth works
- sign in / sign up / resend confirmation / reset are usable
- password reset redirect is hardcoded to production reset route
- 6-test at-home screening works and saves through `screening_questionnaires.responses`
- dashboard and results can read valid cloud screening rows
- readiness logging is working through a server API path
- routine generation works in production again
- fallback routine generation works when AI is slow or unavailable
- routine save works with authenticated RLS-aware flow
- daily Basic routine limit works
- dashboard shows today’s routine count
- post-session flow is hardened
- results shows recent screening trends
- routine backgrounds can match sport or body area
- exercise videos can be managed through `/admin`
- admin video overrides read from Supabase first, then fall back to the hardcoded library

## Readiness and Routine Generation

Readiness logic now does this:

- checks today’s readiness log before generating
- if soreness severity is high in an area, biases release and reduces range volume/loading there
- if sleep is poor, shortens the session and biases release over range
- if mood is low, shortens and softens the session
- if readiness is good, generates normally

Important clinical rule now in place:

- readiness can reduce volume and intensity, but must never eliminate a phase
- every targeted area must still have:
  - 1 release exercise
  - 1 activation exercise
  - 1 range exercise

This minimum-dose rule is enforced in:

- `src/lib/readiness.ts`
- `src/app/api/routines/generate/route.ts`

## Curated Exercise Library

The app now has a curated internal mobility library in:

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

## Routine Page

The routine page now includes:

- stronger title naming
- clearer evidence/trust presentation
- visible saved-routine flow
- set ticking within a live block/circuit
- direct post-session check-in handoff
- foam-roll video override support from Supabase

Important behavior:

- routine background matches selected sport first, then body area, then fallback
- foam-roll drills no longer ignore admin-managed video mappings

Relevant files:

- `src/app/routine/page.tsx`
- `src/lib/routine-backgrounds.ts`
- `src/lib/exercise-videos.ts`

## Admin + Video Direction

The app now has a working internal admin panel at:

- `/admin`

Current truths:

- only `profiles.is_admin = true` users should access it
- exercise-video mappings can be saved to Supabase
- routine page checks Supabase `exercise_videos` first
- grouped video management is already in place for:
  - hips release / activation / range
  - shoulders release / activation / range
  - spine release / activation / range
  - foam roll hips / shoulders / spine

## Current Known Realities

- `screening_questionnaires` is still legacy-shaped
- screening is layered onto an older table model
- the curated mobility library still needs ongoing cleanup
- AI routine quality still needs real-world sport-by-sport QA
- mobile polish is still incomplete on some screens
- Premium remains secondary and should not distract from Basic polish

## Highest-Priority Next Steps

1. Continue Basic QA on deployed Vercel.
2. Clinically QA readiness-affected routines:
   - Muay Thai + balanced + sore hips / upper back
   - BJJ + balanced
   - Golf + flexibility
3. Confirm the minimum-dose rule holds on live:
   - every targeted area keeps release, activation, and range
   - soreness softens range dose but does not remove it
4. Keep tightening the curated mobility library.
5. Improve admin visibility for missing exercise-video coverage.
6. Continue mobile refinement page by page.
7. Only after Basic feels strong, return to deeper Premium work.

## Short Handoff Truth List

1. Basic is still the priority.
2. Screening is rebuilt and now saves to cloud with local fallback backup.
3. Readiness now affects routine generation, but should never eliminate a phase for a targeted area.
4. The curated exercise library is central to workout quality.
5. The routine page now supports sport/area-matched backgrounds and foam-roll video overrides.
6. Auth and RLS around routine generation/save were recently hardened and are easy to regress.
7. Premium should stay secondary until Basic feels rock solid.
