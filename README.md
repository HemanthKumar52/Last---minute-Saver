# Clutch — your last-minute life saver

> **Reminders tell you what to do. Clutch does the first step with you.**

Clutch is an AI deadline-survival companion. It doesn't just remind you — it **decides what matters** (with a visible reason), **proactively flags what's at risk** (the Last-Minute Radar), and **produces the actual deliverable** (the email draft, the game plan, the prep brief, the bill summary) one tap from done.

Built for the *"Last-Minute Life Saver"* hackathon. See [`DESIGN.md`](./DESIGN.md) for the design system.

---

## What makes it different

| Most apps | Clutch |
|---|---|
| Remind you a deadline exists | **Tell you the one thing to do next — and why** |
| Flat to-do list | **Explainable priority score** (urgency · stakes · effort · proximity) |
| You write the email / plan | **Save Me** drafts the deliverable for you, one tap from done |
| Notifications you ignore | **Last-Minute Radar** escalates GREEN → AMBER → RED as slack runs out |
| One big model call | **An agent pipeline** — each step is a focused agent with a deterministic guardrail |

---

## Monorepo

```
clutch/
├─ packages/
│  ├─ tokens/   # design tokens (colors, type, the coral→red Save Me blend)
│  └─ core/     # the brain: scoring, slack/Radar math, reasons, artifacts, planner, habits, seed
└─ apps/
   ├─ web/      # Next.js 16 + Tailwind v4 + Motion + Convex
   └─ mobile/   # Expo / React Native (in progress — reuses tokens + core, identical UI)
```

The deterministic **brain** lives in `@clutch/core` and is unit-tested. The UI binds to it; AI only *enhances* — it never invents the priority order, so the app is fully usable with **zero API keys**.

---

## Run it

```bash
pnpm install
pnpm web          # → http://localhost:3000
```

Test the brain:

```bash
pnpm test:core
```

Everything works **with zero keys** — AI falls back to a deterministic engine, Google/Microsoft actions run in a clearly-labelled demo mode, and data lives in a local optimistic store. Add credentials and those surfaces light up.

---

## The agent architecture

When you hit **Save Me** (or open the *Agents* tab), a coordinator runs a per-task pipeline. Each agent is LLM-driven when a provider is configured, and falls back to a deterministic rule when it isn't — so the pipeline never breaks:

1. **Context** — gather what's known about the task and the surrounding workload
2. **Prioritizer** — confirm where it sits in the ranked list and why
3. **Classifier** — task type (assignment / email / bill / interview / meeting / errand)
4. **Methodology** — pick the right execution method for that type
5. **SLA** — derive the real deadline pressure (slack math)
6. **Notification** — decide what/when to nudge
7. **Executor** — produce the deliverable (draft, outline, brief, bill summary)
8. **Presenter** — shape it for the UI
9. **Coordinator** — **clears context and moves to the next task**

---

## Integrations — bring your tasks in from anywhere

Open **Import** (top-right) or the **Connections** bar. All optional; all degrade gracefully.

| Source | How | Status |
|---|---|---|
| **Paste / Upload** | Paste an email, notes, a bill, a syllabus — or upload `.txt/.md/.csv/.json/.ics/.pdf`. Agents extract tasks + deadlines (PDF via pdf.js). | ✅ |
| **Calendar (.ics)** | Paste a secret `.ics` URL (Outlook, Apple, Notion, LMS). Deadlines → tasks; meetings → busy time the planner avoids. | ✅ |
| **Notion** | Integration token + database ID (title + date property). | ✅ |
| **Email (IMAP)** | Any inbox — Gmail, iCloud, Fastmail, work server. Uses an app password, **used once and never stored**. | ✅ |
| **Google Calendar + Gmail** | OAuth → free/busy sync + inbox scan for deadlines + draft replies. | ✅ (needs OAuth keys) |
| **Microsoft 365 / Outlook** | OAuth (Microsoft Graph) → calendar busy sync + mail scan. | ✅ (needs Entra app) |

---

## Configuration (copy `apps/web/.env.example` → `apps/web/.env.local`)

```bash
# ── AI (provider-agnostic; blank → built-in deterministic engine) ──
AI_PROVIDER=openai
AI_BASE_URL=http://localhost:20128/v1   # e.g. OmniRoute (free, OpenAI-compatible)
AI_MODEL=auto
AI_API_KEY=

# OpenAI:   AI_MODEL=gpt-4o-mini                    AI_API_KEY=sk-...   (omit AI_BASE_URL)
# Groq:     AI_MODEL=llama-3.3-70b-versatile  AI_BASE_URL=https://api.groq.com/openai/v1  AI_API_KEY=gsk_...
# Gemini:   AI_PROVIDER=gemini  AI_MODEL=gemini-1.5-flash  AI_API_KEY=...

# ── Google Calendar + Gmail (blank → demo mode) ──
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# ── Microsoft 365 / Outlook (blank → demo mode) ──
MS_CLIENT_ID=
MS_CLIENT_SECRET=
MS_TENANT=common
MS_REDIRECT_URI=http://localhost:3000/api/ms/callback

# ── Convex (persistence + server-side Radar) ──
# NEXT_PUBLIC_CONVEX_URL=        # set automatically by `npx convex dev`
```

---

## Tech stack

- **Web** — Next.js 16 (Turbopack) · React 19 · Tailwind v4 (`@theme` tokens) · Motion · Zustand · lucide-react
- **Mobile** — Expo / React Native (reuses `@clutch/tokens` + `@clutch/core`; identical UI, plus native home-screen widgets and live notification-center activities)
- **Backend** — Next.js route handlers (AI, Google, Microsoft, ICS, IMAP, Notion) · Convex (schema + Radar cron)
- **Design** — warm cream canvas + coral action, EB Garamond display / Inter body / JetBrains Mono timers; the only strong color is the Radar

### Responsive

Single focused column on phones and tablets; a two-column layout (task focus + sticky habits rail) engages on large laptops and monitors. Verified 360 px → 2560 px.

---

## Feature map (hackathon brief → implementation)

- **Intelligent prioritization** → explainable weighted score + ranked list + one "do this next" with its reason (`core/scoring.ts`)
- **Context-aware reminders** → the Last-Minute Radar (`slack = deadline − now − effort`), GREEN/AMBER/RED, browser notifications for RED
- **Autonomous planning & execution** → **Save Me** streams the deliverable (`core/artifacts.ts` + the agent pipeline), draft + one-tap confirm (never silent-send)
- **AI scheduling + calendar** → backward-scheduled focus blocks; auto-plan packs effort into free slots around your busy time and chronotype peak
- **Voice** → dictation capture + read-aloud nudge (Web Speech)
- **Goal & habit tracking** → streaks + weekly cadence (`core/habits.ts`)
