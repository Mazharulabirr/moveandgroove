# Claude Recap

Move & Groove v2 on `main` is now a working guided mobility app with auth restored, live Anthropic routine generation working, dashboard access working, and the onboarding flow split clearly by plan tier. All users begin with mobility screening. Basic users then move into sport/body-area routine generation. Premium users continue into movement battery and now see a clear fork between `random workout` and `planned 4 / 8 / 12 weeks`.

The biggest structural fix in the app is that the real Supabase schema does not match the original assumptions around `screening_results`. The app now treats `screening_questionnaires` as the source of truth for screening history and derives hip, shoulder, spine, and overall mobility scores from saved responses. Anyone touching screening should respect that reality.

Recent front-end/product changes:

- dashboard cleaned up and made more premium/basic distinct
- `GUIDED DASHBOARD` and personal welcome copy removed in favor of a cleaner `DASHBOARD`
- saved routines removed from the cluttered bottom layout and folded into profile/library handling
- routine saving is explicit with `SAVE TO LIBRARY`, not automatic
- movement battery recommendations now return a balanced recommendation when scores are broadly even
- movement screening uses the real provided images instead of placeholders
- landing page now includes a `TRUSTED BY` section with team logos

Readiness/session flow now works like this:

- Basic users see the pre-session readiness modal only when they click `GENERATE ROUTINE`
- Premium users have a `PRE TRAINING READINESS CHECK` button at the top of the workout page
- the routine screen shows the full workout from the start
- users must confirm the current exercise as completed before the next exercise becomes active
- after the final exercise, they are pushed toward post-session check-in

Premium planning now has a real visible fork:

- `RANDOM WORKOUT`
- `PLANNED 4 / 8 / 12 WEEKS`

This planning surface exists in the UI and feels real, but it is still not a true persisted programming engine yet. It currently generates structure from saved routine history rather than from durable scheduled-workout records.

The next best build order is:

1. add real exercise video support, ideally via Supabase Storage
2. build true persisted `4 / 8 / 12` week programming
3. add scheduled workout/calendar persistence
4. add reminder emails
5. deepen readiness so it can modify workouts intelligently from sleep, soreness location/severity, and mood

One important local note: there is still a separate uncommitted change in `src/app/screening/page.tsx` related to save-feedback hardening. It was intentionally kept out of unrelated deploys and should be reviewed separately before pushing.
