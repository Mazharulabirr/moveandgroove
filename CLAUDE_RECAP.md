# Claude Recap

Move & Groove v2 on `main` is now a working guided mobility app with auth restored, live routine generation working again, a much cleaner Basic dashboard, a rebuilt screening flow, and a more controlled routine-generation system.

The most important current product priority is still:

- nail the Basic tier first

That means:

- Basic should feel complete on its own
- Basic should not feel like a broken Premium preview
- the dashboard should stay compact and directive
- Premium should remain secondary while the beta is being tightened

## Biggest Recent Changes

### Screening

The old screening flow has been replaced with a simplified 6-test at-home self-assessment.

Current screening tests:

- `Back scratch test`
- `Wall angel`
- `Single leg balance squat`
- `Seated hip rotation`
- `Quadruped T rotation`
- `Toe touch`

Important current behavior:

- test images are now local app assets rather than generic stock photos
- each test now has movement-specific answer wording
- the score screen now explains:
  - what the overall score means
  - which region is the main priority
  - what to focus on next
- screening still uses the local-storage fallback because the real Supabase schema is not yet aligned with older assumptions

Files involved:

- `src/app/screening/page.tsx`
- `src/app/screening/ScreeningClient.tsx`
- `src/lib/mobility-screening.ts`
- `src/lib/assessment-media.ts`
- `src/lib/screening-storage.ts`

### Routine generation

Routine generation is now more structured than it was before.

Current state:

- Anthropic is still the main generation path
- if Anthropic times out or returns poor output, the app has a stronger fallback path
- the fallback path is no longer just generic hardcoded movement logic

The app now includes a curated internal movement library in:

- `src/lib/curated-mobility.ts`

That library is based on real gym programming and is grouped by:

- `hips`
- `shoulders`
- `spine`

Then by:

- `release`
- `activation`
- `range`

The generator now uses that library in two ways:

1. fallback routines are built from the curated library
2. the Anthropic prompt is given the approved exercise pool and told to stay close to it

There is also now a guardrail for `balanced` routines:

- if AI returns a weak or imbalanced session that does not properly cover `release`, `activation`, and `range`, the app rejects it and returns the curated fallback instead

This was added because “balanced” sessions were still sometimes collapsing into mostly range work.

Main generator file:

- `src/app/api/routines/generate/route.ts`

## Current Basic user journey

The intended Basic loop is:

1. log in
2. complete screening once
3. return to the simplified dashboard
4. create a routine
5. do readiness when relevant
6. complete the workout
7. do post-session check-in
8. return to dashboard/results
9. repeat routine creation as the main loop

The product principle is:

- once screening is done, the app should feel like a workout tool, not like endless onboarding

## Current known realities

### Screening persistence

Still not final.

Important truth:

- do not assume the live Supabase screening schema safely supports the older `completed_at` / `responses` logic
- the app currently relies on a browser-local fallback snapshot for beta continuity

### Curated library cleanup

The curated library is a strong step forward, but it is not fully cleaned yet.

Still needs ongoing manual cleanup:

- duplicates
- wrong bucket assignments
- exercises that are too similar but not identical
- user-facing rationale wording cleanup where internal phrasing still leaks through

### Premium

Premium remains secondary.

Still true:

- movement battery exists
- planning/programming surface exists
- real persistent programming is not built yet
- do not let Premium complexity distract from Basic polish

## Most important next steps

1. continue cleaning the curated mobility library
2. test more real generated workouts and keep tightening output quality
3. align the real screening schema so the local fallback can eventually be removed
4. keep refining mobile screens beyond the dashboard
5. only after Basic is strong, go back to deeper Premium work

## Short handoff truth list

If another developer picks this up, the key truths are:

1. Basic is the priority.
2. Screening has been rebuilt and now uses 6 local-image tests.
3. Screening persistence is still using a workaround.
4. Routine generation now has:
   - AI generation
   - curated fallback generation
   - a balance guardrail
5. The curated exercise library is now one of the most important systems in the app and should be treated as an approved methodology layer, not random prompt filler.
