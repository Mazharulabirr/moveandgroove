# Move & Groove v2 - Developer Docs

> Last updated: April 17, 2026
> Repo: https://github.com/marcomastrorocco/move-and-groove-v2
> Primary branch: `main`
> Hosting: Vercel
> App type: Next.js athlete mobility platform with Supabase auth/data and Anthropic-powered routine generation
> Current focus: ship a strong Basic-tier beta first, then layer Premium back in carefully

---

## Overview

Move & Groove is a mobility and readiness app for athletes. The product currently combines:

- guided onboarding
- mobility screening
- premium movement battery testing
- AI-generated routines
- session check-ins
- results/profile views
- saved routine/program surfaces
- early premium planning flows

The current visual direction is dark, editorial, metallic, and sport-focused, with inline React styles plus a custom icon set.

---

## Current Product Direction

The most important product decision right now is:

- nail the Basic tier first

That means:

- Basic must feel complete on its own
- Basic should not feel like a broken Premium preview
- the dashboard should be compact, clear, and onboarding-first
- Premium should be visible, but secondary
- selected testers should be able to try a clean Basic beta before subscription rollout

Recent direction changes that reflect that:

- the Basic dashboard now uses a full black background
- the Basic dashboard is more compact and process-first
- bulky duplicate Basic panels were removed
- the right rail is slimmer and profile/stats-focused
- Premium messaging is now framed more as `coming soon` than as constant clutter
- Basic results should not push movement-battery actions unless that battery data is actually relevant

---

## What Works Now

- auth is working again
- dashboard access works
- sign-in / sign-up / resend confirmation / reset are usable
- live routine generation works in production again
- mobility screening now uses 6 simplified at-home self-assessments
- screening score can still appear through a device-local fallback
- screening images are now local app assets instead of generic stock placeholders
- results page works for screening
- Basic dashboard is visually much cleaner and more compact
- Premium battery no longer repeats the mobility baseline as closely as before
- routine generation has a fallback routine path if the AI request is slow/unavailable
- routine generation is now biased toward a curated internal exercise library built from real gym programming
- balanced routines now have a phase-coverage guardrail so they cannot collapse into weak one-phase outputs

---

## Deployed State on `main`

The currently deployed app includes these important fixes:

### Screening save/score workaround

The real Supabase schema does not match the older assumptions used by the codebase.

Missing/unsafe assumptions that were causing live failures:

- `screening_questionnaires.completed_at`
- `screening_questionnaires.responses`

Current safe workaround:

- the screening flow stores a local snapshot in browser storage
- dashboard/results can read that local snapshot
- the score can still be shown to the user on that device/browser
- screening queries now use `created_at` instead of `completed_at`

Important limitation:

- this is a beta workaround, not the final durable screening persistence model
- until schema alignment is done, screening score persistence is not fully cloud-backed in the intended way

### Routine generation hardening

The generator now behaves better when Anthropic is slow or unavailable:

- client-side generation request times out instead of spinning forever
- server-side generation has a built-in fallback routine library
- if Anthropic errors or times out, the API still returns a usable routine

### Curated routine quality layer

The app now has a curated internal exercise library in:

- `src/lib/curated-mobility.ts`

That library is built from real gym programming and groups exercises by:

- `hips`
- `shoulders`
- `spine`

Then by:

- `release`
- `activation`
- `range`

Current generation behavior:

- fallback routines now draw from this curated library instead of generic defaults
- the Anthropic prompt is given an approved exercise pool and told to stay close to that movement language
- if AI returns a weak balanced routine, the app rejects it and returns a properly phased curated fallback routine instead

### Basic results cleanup

Basic users should not be prompted to retake a Premium-only movement battery unnecessarily.

Current behavior:

- Basic results focus on mobility score language
- battery CTAs are only shown when battery is actually relevant or available

### Basic dashboard premium teaser

Basic now keeps Premium lighter:

- instead of a heavy upgrade push, the dashboard shows a compact `Premium coming soon` teaser
- clicking it expands a small explanation of what Premium is expected to include

---

## Current Basic Path

The intended Basic flow is:

1. user lands on the dashboard
2. completes mobility screening
3. chooses a goal / sport or body-area focus
4. generates a workout
5. views mobility score/results
6. continues using the app through the compact dashboard actions

Once onboarding is complete:

- the dashboard should stop emphasizing the initial 3-step process
- it should instead surface the ongoing core actions:
  - `Mobility Score`
  - `Create Your Own Workout`

Basic should stay intentionally limited:

- no movement battery
- no heavy routine-library emphasis
- no confusing Premium-only dead ends

---

## Current Premium Path

The intended Premium flow is still:

1. user completes mobility screening
2. user completes movement battery
3. user gets access to deeper planning/program direction

Premium is not the primary polish target right now.

Still true:

- Premium battery should measure movement quality
- it should not just repeat the mobility baseline

---

## Current UX Notes

### Dashboard

Basic dashboard has been heavily refactored.

Current intended structure:

- main area:
  - compact onboarding/process actions
  - then ongoing core actions after onboarding is complete
- side/profile rail:
  - mobility scores
  - sessions done
  - total minutes moved
- bottom strip:
  - Premium teaser / coming soon

Key recent decisions:

- less clutter is better
- dead space is bad
- giant side columns are bad
- big duplicate `account tier` cards are unnecessary for Basic
- the process needs to be obvious
- checklist state should only tick when real data exists

### Results

For Basic:

- the page should primarily feel like a mobility score/profile page
- it should not aggressively advertise the Premium movement battery

### Mobile

Mobile hardening has started, but not every page is fully polished yet.

Known reality:

- dashboard improved significantly
- other pages still need continued screen-by-screen mobile refinement

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
  - Basic-first guided dashboard
- `/screening`
  - mobility baseline screen
- `/battery`
  - Premium movement battery
- `/quiz`
  - routine builder
- `/routine`
  - generated routine view
- `/results`
  - score/profile results
- `/session-checkin`
  - pre/post session check-in
- `/recovery`
  - recovery routine flow
- `/programs`
  - premium planning/program surface
- `/upgrade`
  - premium upsell surface

---

## Key Files

### Core pages

- `src/app/dashboard/page.tsx`
- `src/app/screening/page.tsx`
- `src/app/screening/ScreeningClient.tsx`
- `src/app/quiz/page.tsx`
- `src/app/routine/page.tsx`
- `src/app/results/page.tsx`
- `src/app/battery/page.tsx`
- `src/app/programs/page.tsx`
- `src/app/session-checkin/page.tsx`

### Core components

- `src/components/Header.tsx`
- `src/components/Icons.tsx`
- `src/components/ProGate.tsx`
- `src/components/PreSessionReadinessModal.tsx`

### Shared logic

- `src/lib/profiles.ts`
- `src/lib/readiness.ts`
- `src/lib/session-flow.ts`
- `src/lib/supabase/client.ts`
- `src/lib/screening-storage.ts`
- `src/lib/mobility-screening.ts`
- `src/lib/assessment-media.ts`
- `src/lib/curated-mobility.ts`

### API

- `src/app/api/routines/generate/route.ts`

---

## Current Data Reality

### Tables the app uses

- `profiles`
- `progress`
- `routines`
- `routine_items`
- `screening_questionnaires`
- `screening_results`
- `test_results`
- `readiness_logs`

### Important schema truth

The app was originally built as if screening-related tables had richer columns than the real Supabase project actually exposes.

The most important practical truth right now is:

- do not assume `screening_questionnaires` contains `completed_at` or `responses` in production-safe form
- do not assume `screening_results` is a reliable rich summary table

Current safe behavior is a workaround, not the final architecture.

---

## Screening Flow

Current intent:

- screening is the shared first assessment for everyone
- it creates the mobility baseline
- it should drive the next best step

Current implementation reality:

- scores are calculated client-side
- screening completion can write a local snapshot to browser storage
- dashboard/results can fall back to that local snapshot
- the screening now uses 6 tests grouped by region:
  - `Shoulders`
    - `Back scratch test`
    - `Wall angel`
  - `Hips`
    - `Single leg balance squat`
    - `Seated hip rotation`
  - `Spine`
    - `Quadruped T rotation`
    - `Toe touch`
- each screening test now has movement-specific answer options
- the score screen now explains:
  - what the overall score means
  - which region is the main priority
  - what to focus on in the next routine phase

This means:

- screening can still function for beta users on the same device/browser
- cross-device durable history is not yet fully solved in the intended final way

Files involved:

- `src/app/screening/page.tsx`
- `src/app/screening/ScreeningClient.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/results/page.tsx`
- `src/lib/mobility-screening.ts`
- `src/lib/assessment-media.ts`
- `src/lib/screening-storage.ts`

---

## Assessment Media

Assessment media is centralized in:

- `src/lib/assessment-media.ts`

Current state:

- the 6 screening tests now use local still images in `public/movement-tests`
- screening no longer depends on generic stock test visuals
- current image paths:
  - `public/movement-tests/shoulder-back-scratch.webp`
  - `public/movement-tests/shoulder-wall-angel.jpg`
  - `public/movement-tests/hip-single-leg-squat.jpg`
  - `public/movement-tests/hip-seated-rotation.jpg`
  - `public/movement-tests/spine-quadruped-t-rotation.jpg`
  - `public/movement-tests/spine-toe-touch.webp`

---

## Routine Generation

Route:

- `src/app/api/routines/generate/route.ts`

Current behavior:

- quiz sends generation request to the API route
- route attempts Anthropic generation
- if the AI request is unavailable/slow, the route can now return a fallback routine

Important beta benefit:

- users are less likely to get stuck waiting forever with no workout

Client hardening:

- quiz page times out the request on the frontend if it hangs too long

Server hardening:

- the API route contains fallback structure split across:
  - release
  - activation
  - range
- fallback generation now uses the curated library
- AI is biased toward the same approved exercise pool
- balanced routine guardrails reject weak AI outputs and fall back to curated structure

Current limitation:

- AI routine quality still needs iterative QA even with the curated library and guardrails
- the curated library still needs manual cleanup of duplicates and mis-bucketed drills

---

## Exercise Video Plan

Current product decision:

- exercise videos will be uploaded to an unlisted YouTube channel first

Why:

- quicker than building full video hosting now
- lighter than shipping large assets in app/repo
- easier to manage for beta

Recommended implementation pattern:

- app-side curated mapping from exercise name -> YouTube video id/url
- do not rely on a raw YouTube channel feed as the source of truth

Current local-only work exists for:

- `src/lib/exercise-videos.ts`

Assessment tests currently use still images rather than exercise demo videos.

---

## Programs / Premium Planning

Programs/planning is still not truly built.

Current truth:

- there is a planning surface
- there is premium/path language around:
  - random workout
  - planned block
  - 4 / 8 / 12 week framing

But this is still not true durable programming yet.

Not yet built:

- persisted program model
- scheduled workout records
- real calendar-backed workout instances
- reminder emails

---

## Current Known Limitations

- screening persistence is still using a beta workaround
- true cloud-safe screening history still needs schema alignment
- mobile refinement is incomplete outside the most improved screens
- Premium programming is still more surface than system
- exercise videos are not fully integrated yet
- AI routine quality still needs iterative QA even with the curated library and guardrails
- deeper readiness-driven workout modification is still not fully mature
- the curated exercise library still needs more manual cleanup:
  - duplicates
  - misclassified drills
  - bucket cleanup by `hips / shoulders / spine`
  - bucket cleanup by `release / activation / range`

---

## Current Local State

At the time of this doc update:

- `CLAUDE_RECAP.md` and this doc are local until committed
- local noise files may exist such as:
  - `DEVELOPER_DOCS.rtf`
  - `dev-server.err.log`
  - `dev-server.out.log`

Do not assume those are meaningful app artifacts.

---

## Recent Important Commits

Recent commits on `main` include:

- `3d780dd` `feat: bias routines toward curated mobility library`
- `14474e1` `fix: enforce balanced routine phase coverage`
- `45a86a6` `feat: personalize screening answers and feedback`
- `3089a64` `fix: simplify screening test responses`
- `1283460` `feat: add screening test images`
- `e2b6c8d` `feat: replace screening with 6 self-assessment tests`

What those recent commits specifically changed:

### `e2b6c8d`

- replaced the old screening questionnaire with the new 6-test self-assessment flow

### `1283460`

- added local still images for the 6 screening tests

### `3089a64`

- simplified screening response UX back toward the older feel
- removed demo-video CTA and generic pass/flag boxes

### `45a86a6`

- gave each screening test movement-specific answer wording
- added usable result advice at the end of screening

### `3d780dd`

- created the curated mobility library from real gym programming
- biased both fallback and AI routine generation toward that pool

### `14474e1`

- added a guardrail so weak `balanced` AI routines are rejected in favor of a properly phased curated fallback

---

## Practical Handoff Advice

If another developer or Claude continues from here, the most important truths are:

1. The app is functioning again at a beta level.
2. The Basic tier is the priority.
3. The dashboard has been reshaped to be compact and onboarding-first.
4. Basic should stay lean and intentional.
5. Screening persistence is still using a temporary workaround because the live schema does not match earlier assumptions.
6. Screening media is now local and the test set has been significantly updated.
7. Routine generation now has both:
   - a reliability fallback
   - a curated exercise library
   - a phase-balance guardrail
8. Premium should remain secondary until Basic feels rock solid.

---

## Highest-Priority Next Steps

1. Verify the full Basic beta path end-to-end on deployed Vercel:
   - auth
   - dashboard
   - screening
   - results
   - quiz
   - routine

2. Keep cleaning the curated mobility library:
   - remove duplicates
   - split wrongly merged drills
   - correct bucket assignments

3. Continue improving workout quality using real generated examples:
   - `balanced`
   - `flexibility`
   - `sport relevant`
   - low-readiness cases

4. Align the real Supabase screening schema and remove the temporary local-storage workaround cleanly.

5. Continue screen-by-screen mobile refinement outside the dashboard.

6. Finish the YouTube exercise-video mapping integration.

7. Keep simplifying anything in Basic that still feels like leaked Premium complexity.

8. Only after Basic is solid, return to:
   - movement battery polish
   - real 4 / 8 / 12 week programming
   - scheduled workouts
   - calendar persistence
   - reminder emails
