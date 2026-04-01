# Move & Groove v2 — Developer Documentation

> **Last updated:** April 2026  
> **Repo:** https://github.com/marcomastrorocco/move-and-groove-v2  
> **Stack:** Next.js 15 · TypeScript · Supabase · Anthropic Claude API · Tailwind (minimal) · Vercel (target)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Database Schema](#5-database-schema)
6. [Pages & Routes](#6-pages--routes)
7. [API Routes](#7-api-routes)
8. [Core Logic](#8-core-logic)
9. [Design System](#9-design-system)
10. [Environment Variables](#10-environment-variables)
11. [Running Locally](#11-running-locally)
12. [Deployment](#12-deployment)
13. [What Is Done](#13-what-is-done)
14. [Roadmap — What Is Left](#14-roadmap--what-is-left)

---

## 1. Project Overview

Move & Groove is a joint mobility web application built for athletes. It generates evidence-based mobility routines powered by Claude AI, tracks mobility scores over time through a screening questionnaire and movement battery, and provides daily readiness and session check-in tools.

**Core value proposition:**
- AI-generated mobility routines personalised to sport and body area
- Mobility screening (11 questions) → regional scores (hips, shoulders, spine)
- Movement battery (5 tests, FMS-style 0–3 scoring)
- Daily readiness check-in → session recommendation
- Pre/post session logging
- Score history and progress tracking over time

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Auth + DB | Supabase (PostgreSQL + Auth) |
| AI | Anthropic Claude API (claude-sonnet-4) |
| Styling | Inline styles + CSS variables in globals.css |
| Fonts | Syncopate · DM Mono · DM Sans · Cormorant Garamond (Google Fonts) |
| Hosting (target) | Vercel |
| Version Control | GitHub |

---

## 3. Architecture

```
Browser (Next.js App Router)
        │
        ├── Pages (src/app/**/page.tsx)
        │       │
        │       ├── Auth → Supabase Auth
        │       ├── Quiz → API Route → Claude API → Supabase
        │       ├── Screening → Supabase (screening_results)
        │       ├── Battery → Supabase (test_results)
        │       ├── Readiness → Supabase (readiness_logs)
        │       ├── Session Check-in → Supabase (readiness_logs)
        │       └── Results → Supabase (read all tables)
        │
        └── API Routes (src/app/api/**)
                │
                └── /api/routines/generate
                        │
                        ├── Receives: userId, mode, sport, areas, duration, goal, includeFoamRoll
                        ├── Builds PREP phase locally (foam roll library)
                        ├── Calls Claude API → generates RELEASE + ACTIVATION + RANGE phases
                        ├── Parses JSON response
                        ├── Saves routine + items to Supabase
                        └── Returns full routine object
```

### Data Flow — Routine Generation

```
Quiz Page
  → POST /api/routines/generate
    → Build foam roll PREP phase (local library)
    → Build prompt with user profile
    → Call claude-sonnet-4
    → Parse JSON response
    → Save to routines + routine_items tables
    → Return to client
  → Store in localStorage (mg_routine)
  → Redirect to /routine
```

### Scoring Architecture

```
Screening Questionnaire (11 questions)
  → calcScores() → regional pct scores (hips, shoulders, spine)
  → overall pct score
  → Save to screening_results

Movement Battery (5 tests, 0-3 each)
  → totalScore() → x/15
  → Save to test_results

Readiness Check-in (5 questions, 1-4 each)
  → readinessScore() → 0-100
  → readinessLabel() → recommendation
  → Save to readiness_logs

Results Page
  → Pull latest from all tables
  → Display score history
  → Calculate priority recommendations
```

---

## 4. Directory Structure

```
move-and-groove-v2/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Home page (/)
│   │   ├── globals.css                   # Design tokens + global styles
│   │   │
│   │   ├── auth/
│   │   │   └── page.tsx                  # Sign in / Sign up / Forgot password
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # Dashboard with stats + quick actions
│   │   │
│   │   ├── quiz/
│   │   │   └── page.tsx                  # 5-step routine builder quiz
│   │   │
│   │   ├── routine/
│   │   │   └── page.tsx                  # Routine display with timers
│   │   │
│   │   ├── screening/
│   │   │   └── page.tsx                  # 11-question mobility screening
│   │   │
│   │   ├── battery/
│   │   │   └── page.tsx                  # 5-test movement battery (FMS-style)
│   │   │
│   │   ├── results/
│   │   │   └── page.tsx                  # Score history + priority recommendations
│   │   │
│   │   ├── readiness/
│   │   │   └── page.tsx                  # Daily readiness check-in (5 questions)
│   │   │
│   │   ├── session-checkin/
│   │   │   └── page.tsx                  # Pre/post session check-in
│   │   │
│   │   └── api/
│   │       └── routines/
│   │           └── generate/
│   │               └── route.ts          # AI routine generation endpoint
│   │
│   ├── components/
│   │   └── Header.tsx                    # Global navigation header
│   │
│   └── lib/
│       └── supabase/
│           └── client.ts                 # Supabase browser client
│
├── public/                               # Static assets
├── .env.local                            # Environment variables (not committed)
├── next.config.ts                        # Next.js config
├── tsconfig.json                         # TypeScript config
└── package.json
```

---

## 5. Database Schema

### Supabase Tables

#### `routines`
Stores AI-generated routine metadata.

| Column | Type | Description |
|---|---|---|
| id | int8 | Primary key |
| user_id | uuid | Foreign key → auth.users |
| title | text | Routine title |
| sport | text | Sport slug (golf, afl, etc.) |
| areas | text[] | Target areas array |
| goal | text | flexibility / strength / balanced / performance |
| duration_minutes | int | Session duration |
| difficulty | text | Beginner / Intermediate / Advanced |
| summary | text | 2-sentence overview |
| evidence_summary | text | Research summary |
| created_at | timestamptz | Auto |

#### `routine_items`
Individual exercises within a routine.

| Column | Type | Description |
|---|---|---|
| id | int8 | Primary key |
| routine_id | int8 | Foreign key → routines |
| video_id | text | Google Drive video ID (future) |
| pillar | text | prep / release / activation / range |
| exercise_name | text | Exercise name |
| target_area | text | Body area |
| sets | int | Number of sets |
| reps | int | Reps (nullable) |
| hold_seconds | int | Hold duration (nullable) |
| rationale | text | Why this exercise |
| study_citation | text | Peer-reviewed reference |
| order_index | int | Display order |

#### `screening_questionnaires`
Raw responses from the mobility screening.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key → auth.users |
| responses | jsonb | All question answers |
| completed_at | timestamptz | When completed |

#### `screening_results`
Calculated scores from screening.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key → auth.users |
| questionnaire_id | uuid | Foreign key → screening_questionnaires |
| hip_score | int | 0-100 |
| shoulder_score | int | 0-100 |
| spine_score | int | 0-100 |
| overall_score | int | 0-100 |
| raw_scores | jsonb | Full score breakdown |
| assessed_at | timestamptz | When assessed |

#### `test_results`
Movement battery results.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key → auth.users |
| scores | jsonb | Per-test scores (0-3 each) |
| total_score | int | Sum of all test scores |
| max_score | int | Always 15 (5 tests × 3) |
| assessed_at | timestamptz | When assessed |

#### `readiness_logs`
Daily readiness and session check-in logs.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key → auth.users |
| responses | jsonb | All question answers |
| readiness_score | int | 0-100 (readiness only) |
| checkin_type | text | null / pre / post |
| checked_at | timestamptz | When logged |

---

## 6. Pages & Routes

| Route | File | Description | Status |
|---|---|---|---|
| `/` | `app/page.tsx` | Home / landing page | ✅ Done |
| `/auth` | `app/auth/page.tsx` | Sign in, sign up, forgot password | ✅ Done |
| `/dashboard` | `app/dashboard/page.tsx` | Main dashboard with stats and quick actions | ✅ Done |
| `/quiz` | `app/quiz/page.tsx` | 5-step routine builder | ✅ Done |
| `/routine` | `app/routine/page.tsx` | Routine display with exercise timers | ✅ Done |
| `/screening` | `app/screening/page.tsx` | 11-question mobility assessment | ✅ Done |
| `/battery` | `app/battery/page.tsx` | 5-test movement battery | ✅ Done |
| `/results` | `app/results/page.tsx` | Score history and priority recommendations | ✅ Done |
| `/readiness` | `app/readiness/page.tsx` | Daily readiness check-in | ✅ Done |
| `/session-checkin` | `app/session-checkin/page.tsx` | Pre/post session check-in | ✅ Done |
| `/recovery` | `app/recovery/page.tsx` | Recovery session page | ⬜ To build |
| `/programs` | `app/programs/page.tsx` | Programs + Calendar view | ⬜ To build |

---

## 7. API Routes

### `POST /api/routines/generate`

Generates an AI-powered mobility routine using Claude.

**Request body:**
```json
{
  "userId": "uuid or null",
  "mode": "sport | area",
  "sport": "golf | afl | rugby | ...",
  "areas": ["hips", "shoulders", "spine"],
  "duration": 20,
  "goal": "flexibility | strength | balanced | performance",
  "includeFoamRoll": true
}
```

**Response:**
```json
{
  "routineTitle": "string",
  "summary": "string",
  "difficultyLevel": "Beginner | Intermediate | Advanced",
  "totalExercises": 8,
  "phases": [
    {
      "pillar": "prep | release | activation | range",
      "phaseDescription": "string",
      "exercises": [
        {
          "name": "string",
          "targetArea": "string",
          "sets": 2,
          "reps": null,
          "holdSeconds": 60,
          "rationale": "string",
          "study": "Author et al. (Year). Title. Journal."
        }
      ]
    }
  ],
  "evidenceSummary": "string",
  "savedId": 123
}
```

**Phase structure:**
- `PREP` — Foam roll (built locally from library, not AI)
- `RELEASE` — Stretches, PNF, passive holds (AI generated)
- `ACTIVATION` — Isometrics, CARs, eccentric loading (AI generated)
- `RANGE` — PAILS & RAILS, end-range strength (AI generated)

**Pillar weighting by goal:**

| Goal | Release | Activation | Range |
|---|---|---|---|
| flexibility | 50% | 25% | 25% |
| strength | 25% | 50% | 25% |
| balanced | 33% | 33% | 33% |
| performance | 25% | 25% | 50% |

---

## 8. Core Logic

### Scoring Engine

**Screening scores** (`src/app/screening/page.tsx`):
```ts
// Each region has 3 questions, max score = 9
// Score is expressed as a percentage 0-100
pct = Math.round((raw / max) * 100)

// Score labels
>= 80 → EXCELLENT (#00b4d8)
>= 60 → GOOD      (#4ac8e8)
>= 40 → FAIR      (#e8a94a)
<  40 → NEEDS WORK (#e74c3c)
```

**Battery scores** (`src/app/battery/page.tsx`):
```ts
// 5 tests, each scored 0-3
// Total max = 15
// Each test colour-coded: 3=cyan, 2=light cyan, 1=amber, 0=red
```

**Readiness scores** (`src/app/readiness/page.tsx`):
```ts
// 5 questions, each scored 1-4
// Max = 20, expressed as 0-100
score = Math.round((total / max) * 100)

>= 80 → READY TO PERFORM → push intensity
>= 60 → GOOD TO GO → stick to plan
>= 40 → MODIFIED SESSION → lighter work
<  40 → REST OR RECOVER → skip or walk
```

### Foam Roll Library

Hardcoded in `route.ts`. Organised by area: `hips`, `shoulders`, `spine`. Each entry has name, area, and coaching notes. Selected based on target areas and session duration:

- ≤ 20 min → max 2 exercises
- ≤ 30 min → max 3 exercises
- > 30 min → max 4 exercises

### Sports Library

14 sports mapped to their key biomechanical demands:
`golf, afl, rugby, soccer, wrestling, weightlifting, cricket, tennis, basketball, volleyball, netball, bjj, kickboxing, muaythai`

---

## 9. Design System

### CSS Variables (`globals.css`)

```css
--black:   #000000
--black2:  #080808
--black3:  #101010
--black4:  #181818
--white:   #ffffff
--silver:  #c8cdd4
--silver2: #8e9aa8
--silver3: #5a6470
--silver4: #2e3840
--cyan:    #00b4d8
--cyan2:   #4ac8e8
--cyan3:   #007a95
--border:  rgba(200,205,212,0.12)
--border2: rgba(200,205,212,0.06)
```

### Typography

| Font | Usage |
|---|---|
| Syncopate 700 | Headings, labels, navigation |
| DM Mono | Metadata, tags, counters, monospace labels |
| DM Sans | Body text, instructions, descriptions |
| Cormorant Garamond | Routine titles, editorial content |

### Button Classes

```css
.btn-primary   /* White background, black text — main CTA */
.btn-outline   /* Transparent, silver border — secondary */
.btn-ghost     /* No border, subtle — tertiary */
```

### Shared UI Patterns

- **Score cards**: Big number + label + colour bar
- **Question cards**: Two-column layout (instruction + options)
- **Progress bar**: Gradient cyan bar, 3px height
- **Region badge**: Coloured pill with icon + label
- **Priority callout**: Left border accent + description

---

## 10. Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

> ⚠️ Never commit `.env.local` to GitHub. It is in `.gitignore`.

---

## 11. Running Locally

```bash
# Clone the repo
git clone https://github.com/marcomastrorocco/move-and-groove-v2.git
cd move-and-groove-v2

# Install dependencies
npm install

# Add environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Run dev server
npm run dev

# Open in browser
http://localhost:3000
```

---

## 12. Deployment

### Target: Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **New Project** → Import from GitHub
3. Select `move-and-groove-v2`
4. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `ANTHROPIC_API_KEY`
5. Click **Deploy**

Vercel auto-deploys on every push to `main`.

---

## 13. What Is Done

### Infrastructure ✅
- [x] Next.js 15 app with App Router
- [x] Supabase project + 6 database tables
- [x] Anthropic Claude API integration
- [x] Supabase Auth (email + Google SSO)
- [x] GitHub repo with version control

### Backend ✅
- [x] Scoring engine v2 (configurable weights)
- [x] Types file (ScoringWeights, GoalWeights, RegionalScore)
- [x] Readiness engine (calcReadiness)
- [x] API route `/api/routines/generate` with robust JSON parsing
- [x] Foam roll library (hips, shoulders, spine)
- [x] Sports library (14 sports)
- [x] PREP → RELEASE → ACTIVATION → RANGE phase structure

### Pages ✅
- [x] Home page (`/`)
- [x] Auth page — sign in, sign up, forgot password (`/auth`)
- [x] Dashboard with stats + 7 quick action cards (`/dashboard`)
- [x] Quiz — 5-step routine builder with sport/area/duration/goal/foam roll (`/quiz`)
- [x] Routine display — phase breakdown with exercise timers (`/routine`)
- [x] Screening questionnaire — 11 questions, regional scoring, Supabase save (`/screening`)
- [x] Movement battery — 5 tests, 0-3 FMS scoring, Supabase save (`/battery`)
- [x] Results page — score history, breakdowns, priority recommendations (`/results`)
- [x] Daily readiness check-in — 5 questions, readiness score, recommendation (`/readiness`)
- [x] Session check-in — pre/post session, RPE, completion logging (`/session-checkin`)

### Components ✅
- [x] Header with navigation and auth state

---

## 14. Roadmap — What Is Left

### High Priority — Core Features

#### Recovery Session Page (`/recovery`)
A lighter version of the routine display, pre-set to foam roll + release work. No quiz needed — user picks duration and it generates a recovery-focused routine automatically.

**Files to create:**
- `src/app/recovery/page.tsx`

**Dependencies:** existing `/api/routines/generate` endpoint

---

#### Programs + Calendar Page (`/programs`)
Shows the user's training block structure, scheduled sessions, and progression over time.

**Features:**
- Weekly calendar view
- Block structure (e.g. 4-week blocks)
- Session history
- Next session recommendation

**Files to create:**
- `src/app/programs/page.tsx`

**Dependencies:** `routines` table, new `programs` or `blocks` table TBD

---

### Medium Priority

#### Subscription Gate (Free vs Pro)
Limit free users to a certain number of generated routines per month. Pro unlocks unlimited routines, score history, and programs.

**Implementation:**
- Add `is_pro` boolean to Supabase user profile table
- Wrap gated components in `<ProGate>` component
- Add upgrade prompt/modal
- Integrate Stripe (future)

**Files to create/modify:**
- `src/components/ProGate.tsx`
- `src/app/upgrade/page.tsx`
- `src/app/dashboard/page.tsx` — add upgrade prompt

---

#### Block Review + Next Block Recommendation
End-of-block summary screen showing progress across the block, with a recommendation for the next block based on scoring.

**Files to create:**
- `src/app/block-review/page.tsx`

---

#### Google Drive API for Videos
Replace static Unsplash photos and YouTube search links with actual exercise demonstration videos hosted on Google Drive.

**Implementation:**
- Service account authentication
- Store Drive file IDs in `routine_items.video_id`
- Fetch signed URLs on demand
- Embed via iframe or video player component

**Files to modify:**
- `src/app/api/routines/generate/route.ts`
- `src/app/routine/page.tsx`
- `src/lib/drive.ts` (new)

---

### Lower Priority

#### Mobile Responsiveness
Currently desktop-optimised. Before Vercel deploy, add proper mobile breakpoints.

**Approach:**
- Replace fixed pixel values with `clamp()` in all pages
- Add CSS media queries in `globals.css`
- Stack two-column layouts on mobile
- Reduce font sizes and padding on small screens

**Files to modify:** all `page.tsx` files + `globals.css`

---

#### Deploy to Vercel
Connect GitHub repo to Vercel, add environment variables, deploy.

**Estimated time:** 10–15 minutes

---

### Future / Post-MVP

| Feature | Description |
|---|---|
| Stripe integration | Payment processing for Pro subscriptions |
| Push notifications | Daily check-in reminders |
| Coach dashboard | View and manage athlete scores |
| PDF export | Export routine as printable PDF |
| Apple Health / Garmin sync | Import sleep and HRV data for readiness |
| Native mobile app | React Native version |

---

## Quick Reference — Git Workflow

```bash
# Save all changes to GitHub
git add .
git commit -m "feat: description of what you built"
git push

# Check what has changed
git status

# See commit history
git log --oneline
```

---

*Document generated April 2026. Update after each major feature is completed.*
