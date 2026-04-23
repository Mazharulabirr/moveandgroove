# Move & Groove v2 - Developer Docs

> Last updated: April 23, 2026
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
- early exercise-video mapping via unlisted YouTube
- live admin tooling for stats and exercise-video overrides
- early Premium battery/program surfaces

The app is now beyond the "structurally broken" stage. The priority is quality, specificity, and polish.

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
- readiness should materially modify the generated routine
- the routine page is allowed to feel sport-specific
- the rest of the site should stay cleaner and more editorial

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
- routine save works with RLS-aware auth token flow
- the save prompt no longer has to eject the user from the workout when they choose not to save
- exercise videos can now be mapped to unlisted YouTube clips and embedded on the routine page
- admin panel is now live at `/admin`
- admin video overrides now read from Supabase first, then fall back to the hardcoded video map

---

## Deployed State on `main`

Recent important commits on `main` include:

- `497dd72` `feat: match routine backgrounds to user focus`
- `b8b7eb2` `docs: update Claude recap and developer docs`
- `51e9026` `feat: add unlisted youtube exercise mappings`
- `1faf498` `feat: add admin panel and live exercise video manager`
- `feat: tighten anatomy rules for routine generation`
- `feat: sport-matched routine backgrounds and routine flow fix`
- `fix: remove wrong standing hip ir video alias`

Important practical truth:

- the app is now in refinement mode
- remaining issues are mostly exercise choice quality, alias coverage, and sport-specific polish rather than missing core architecture

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
- `/admin`
  - internal admin tooling, gated by `profiles.is_admin`
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
- `src/app/admin/page.tsx`
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
- `src/lib/supabase/admin.ts`

### API

- `src/app/api/routines/generate/route.ts`
- `src/app/api/routines/save/route.ts`
- `src/app/api/admin/overview/route.ts`
- `src/app/api/admin/exercise-videos/route.ts`
- `src/app/api/exercise-videos/route.ts`

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

### New anatomy logic

The prompt now explicitly enforces anatomy-driven structure.

#### Release phase

Release must cover the full structural surround of the target joint.

For hips:

- anterior
- posterior
- lateral
- medial

For shoulders:

- anterior
- posterior
- superior
- inferior

For spine:

- flexion
- extension
- rotation
- lateral flexion

This prevents token release blocks like "one pec stretch and one hip stretch."

#### Activation phase

Activation is no longer allowed to be generic.

Before writing activation, the model must decide whether the range phase is dominated by:

- `rotational`
- `linear`

If range is rotational, activation should prepare:

- piriformis
- deep hip rotators
- external rotators
- multifidus
- obliques

If range is linear, activation should prepare:

- hip flexors
- glutes
- rectus femoris
- erectors
- serratus anterior

This is one of the biggest prompt-quality improvements made so far.

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

Every exercise now includes:

- `movementPattern`
- `anatomicalQuadrants`

The approved exercise pool text passed into the prompt now includes those tags, so the AI can reason from anatomy metadata instead of only names.

Important cleanup truths already confirmed:

- `Forward Slides` and `Prone Chest Slides` are separate exercises
- `T / Y / I` and `W-Y` live only in shoulders activation
- `Alternate Swimmer` lives in shoulders activation

This file still needs ongoing refinement, but the structure is much better than before.

---

## Saved Workouts and Routine Flow

Saved workouts are surfaced more clearly on:

- `src/app/dashboard/page.tsx`
- `src/app/results/page.tsx`

The user can see:

- workout date
- routine name
- sport or area focus
- goal
- duration

Routine flow fixes live in:

- `src/app/api/routines/save/route.ts`
- `src/app/routine/page.tsx`

Current truths:

- routine save uses the signed-in user token so it works with RLS
- users can finish the workout without saving it
- the save prompt should not bounce the user to the dashboard when they choose not to save

---

## Routine Background Matching

Routine background matching exists in:

- `src/lib/routine-backgrounds.ts`

Current intended behavior:

- choose sport-specific background first
- otherwise choose body-area background
- otherwise use default mobility background

Currently supported sport-specific matches include:

- AFL
- Rugby
- Soccer
- Netball
- Basketball
- Volleyball
- Cricket
- Golf
- Tennis
- Padel
- Wrestling
- BJJ
- Weightlifting
- Kickboxing
- Muay Thai
- Water Polo
- High Jump
- Hurdles
- Handball

Area-based routines still use:

- Athletix mobility image for hips / shoulders / spine / general mobility

Important practical note:

- if the background looks wrong on live, the first thing to check is whether the mapped image file is actually committed and deployed

---

## Visual / Background Direction

Current visual decisions:

- home keeps its original hero image
- dashboard stays black
- recovery keeps the older stock barbell image
- general site pages should stay visually cleaner
- routine page is allowed to be the smart, user-specific image surface

Rule of thumb:

- site pages = cleaner and more restrained
- routine page = more personal and sport-specific

---

## Exercise Video Direction

Current product decision:

- exercise videos are being hosted first on an unlisted YouTube channel

Why:

- lighter app
- faster beta implementation
- easier content control

Current file:

- `src/lib/exercise-videos.ts`

Current implementation:

- manual exercise name -> YouTube ID mapping
- routine page embeds YouTube videos when an exercise name or alias matches
- the watch link opens the unlisted YouTube video directly
- live Supabase overrides can now replace or fill gaps without touching code

### Admin-managed video overrides

The app now has a working internal admin panel at:

- `/admin`

What the admin panel currently does:

- shows total registered users
- shows new signups this week
- shows total screenings completed
- shows total routines generated
- shows most popular sports selected
- shows most popular goals selected
- shows average session duration
- shows a searchable curated exercise list for video management
- lets an admin paste and save a YouTube ID per exercise

Current admin routing behavior:

- only users with `profiles.is_admin = true` should be able to access `/admin`
- non-admin users should be redirected to `/dashboard`
- unauthenticated users should be redirected to `/auth`

Current video override behavior:

- routine page now checks Supabase `exercise_videos` first
- if a mapping exists there, it uses that YouTube ID
- if not, it falls back to the hardcoded `src/lib/exercise-videos.ts` library

This is a major workflow improvement because new exercise-video coverage no longer always requires a code change.

Current live mapped coverage includes:

### Hips range / activation

- Kneeling Hurdle Pass
- Heel Taps
- Seated Hip Internal Rotation
- Seated Foam Roll Pass
- Seated Hip External Rotation

### Hips release

- Butterfly Stretch
- Groin Rocking Stretch
- Hip Drops
- Modified Pigeon Stretch
- Scorpion Stretch
- Couch Stretch
- Deep Squat Supported
- High Split Rock
- Quadruped Hamstring Stretch
- Rectus Femoris Assisted Stretch
- Spider Stretch
- Half-Kneeling Hip Flexor Stretch
- Hamstring Hinge

### Shoulder activation / range

- Prone T Raises
- Prone Y Lifts
- Prone Y-W Raises
- Quadruped Shrugs
- Seated Banded Driver
- Prone Alternate Swimmer

Important alias truth:

- bad alias overlap can produce a wrong video match
- one example was fixed:
  - `Standing Abducted Internal Rotation` was wrongly matching the seated IR clip
  - that alias was removed so a wrong clip is not shown as a false positive

Recommended working method:

1. test the live routine page
2. if a wrong video appears, fix the alias
3. if a placeholder appears, add the correct clip when available
4. keep uploads focused on exercises that actually show up often

---

## Database / Security

Important backend work now in place:

- screening cloud save works
- `responses` exists on `screening_questionnaires`
- RLS policies are now applied successfully to:
  - `profiles`
  - `progress`
  - `routines`
  - `routine_items`
  - `screening_questionnaires`
  - `screening_results`
  - `test_results`
  - `readiness_logs`

Important schema / policy truths:

- `profiles` uses `id`, not `user_id`
- `routine_items` ownership must be derived through `routines.user_id`
- `test_results` ownership must be derived through `screening_results.user_id`
- some owner comparisons needed `::text = auth.uid()::text` to work against the real schema

The one-shot SQL reference file exists in:

- `supabase/rls_core_tables.sql`

### Admin-specific schema / env truths

Admin now depends on a few extra backend requirements:

- `profiles.is_admin boolean default false`
- `exercise_videos` table with:
  - `exercise_name text primary key`
  - `youtube_id text`
  - `updated_at timestamptz default now()`

Current required Vercel/server environment variable:

- `SUPABASE_SERVICE_ROLE_KEY`
  - or legacy-compatible fallback `SUPABASE_SERVICE_KEY`

Important practical truth:

- `/admin` can render only if the service-role env is present
- if that env is missing, the admin page may render shell/UI but stats and overrides will fail
- one real deployment failure already happened because `src/lib/supabase/admin.ts` was accidentally omitted from the first admin commit
- the fix was simply to commit that missing helper and redeploy

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
- exercise video integration is still partial and alias-driven rather than admin-managed
- the admin panel currently assumes desktop/internal usage and is not optimized for mobile
- some sport or exercise mappings may still need refinement after real-user QA

---

## Current Local State / Noise

Common unrelated files that may exist locally and should not be committed casually:

- `src/lib/screening-cloud.ts` old unused helper
- `move-groove-dev.out.log`
- `move-groove-dev.err.log`
- `DEVELOPER_DOCS.rtf`

Also be careful with local UI files that may be mid-tweak and unrelated to the current task:

- `src/app/auth/page.tsx`
- `src/app/quiz/page.tsx`
- `src/app/screening/ScreeningClient.tsx`

---

## Practical Handoff Advice

If another developer or Claude continues from here, the most important truths are:

1. The app is functioning again at a real beta level.
2. Basic is the priority.
3. Screening has been rebuilt and is now cloud-backed with local fallback backup.
4. Readiness materially affects routine generation.
5. The curated mobility library is central to workout quality.
6. Anatomy-driven prompt rules are now live and matter.
7. Saved workouts now matter in the Basic experience.
8. The routine page now supports sport/body-area matched backgrounds.
9. Exercise videos are now testable via unlisted YouTube mappings.
10. Premium should stay secondary until Basic feels rock solid.

---

## Highest-Priority Next Steps

1. Continue Basic QA on deployed Vercel:
   - auth
   - dashboard
   - screening
   - results
   - quiz
   - routine

2. Keep improving workout quality using real generated examples:
   - `Golf + flexibility`
   - `BJJ + balanced`
   - `Basketball + balanced`
   - shoulder-focused routines
   - spine-focused routines

3. Keep tightening the curated mobility library:
   - duplicates
   - mis-bucketed drills
   - rationale wording cleanup
   - movement pattern / anatomy tag quality

4. Keep growing exercise video coverage only for exercises that actually appear often.

5. Use `/admin` as the first-choice workflow for adding new video mappings.

6. Keep fixing alias mismatches whenever the wrong video appears.

7. Continue screen-by-screen mobile refinement.

8. Only after Basic is strong, return to:
  - movement battery polish
  - true multi-week programming
  - scheduled workouts
   - calendar persistence
   - reminder systems
