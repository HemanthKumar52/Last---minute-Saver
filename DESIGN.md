# Clutch — Design System

> **Built on the Claude design language** (warm cream canvas · coral action · dark-navy product surfaces · slab-serif display + humanist sans). This document is the Clutch-specific semantic layer on top of it. Both `apps/web` and `apps/mobile` consume the same tokens from `@clutch/tokens`.

## The core idea: calm canvas, urgent only where it counts

Clutch is about *panic* — but the worst thing a deadline app can do is feel as stressful as the deadline. So the warm cream editorial canvas **is the calm** ("breathe, we've got this"), and urgency is expressed **only** through scarce, semantic color (the Radar states and the one action that matters).

The emotional arc — **panic → handled → done** — is told through surface color:

```
 Cream (calm)  →  Coral "Save Me" (act)  →  Dark navy panel (AI works)  →  Cream + green check (relief)
```

This mirrors the Claude system's own rules: coral is scarce on individual elements; dark navy is where the product chrome shows its work.

## Color tokens

| Role | Token | Hex | Use |
|---|---|---|---|
| Calm base | `canvas` | `#faf9f5` | Every screen floor |
| Soft band | `surfaceSoft` | `#f5f0e8` | Section dividers |
| Task card | `surfaceCard` | `#efe9de` | Ranked list rows, content cards |
| Strong cream | `surfaceCreamStrong` | `#e8e0d2` | Selected / emphasized bands |
| **AI engine** | `surfaceDark` | `#181715` | The Save Me artifact panel — the AI's workspace |
| AI engine elevated | `surfaceDarkElevated` | `#252320` | Inner panels on dark |
| Primary text | `ink` | `#141413` | Titles |
| Body | `body` | `#3d3d3a` | Running text |
| Muted | `muted` | `#6c6a64` | Reasons, metadata, sub-labels |
| Muted soft | `mutedSoft` | `#8e8b82` | Captions, fine print |
| Hairline | `hairline` | `#e6dfd8` | 1px borders on cream |
| **The Action** | `action` (coral) | `#cc785c` | The Save Me button + primary CTAs ONLY |
| Action pressed | `actionPress` | `#a9583e` | Press state |
| On action | `onAction` | `#ffffff` | Text on coral |
| On dark | `onDark` | `#faf9f5` | Text on dark surfaces |
| On dark soft | `onDarkSoft` | `#a09d96` | Secondary text on dark |

### Radar (semantic — scarce, the only strong color signal)

| State | Token | Hex | Meaning |
|---|---|---|---|
| 🟢 On track | `radarGreen` | `#5db872` | Plenty of slack |
| 🟡 At risk | `radarAmber` | `#e8a55a` | Getting tight — start soon |
| 🔴 Critical | `radarRed` | `#c64545` | Unreachable if you don't start NOW |

**The Save Me button color interpolates from `action` (coral) → `radarRed` based on the most-urgent task's slack ratio.** The color itself encodes urgency: premium when calm, emergency-clear when critical.

## Typography

| Token | Family (substitute) | Use |
|---|---|---|
| Display (serif) | Copernicus → **EB Garamond / Cormorant** | "Do this next" title, screen headlines, big numbers |
| Body (sans) | StyreneB → **Inter** | All body, labels, buttons, metadata |
| Mono | **JetBrains Mono** (tabular numerals) | The live countdown — digits never shift width |

- Display weight stays **400** with negative letter-spacing. Never bold serif.
- The serif/sans split is unbreakable — it's the brand voice.

## Spacing & shape

4px base. Tokens: `xxs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · xxl 48 · section 96`.
Radius: `sm 6 · md 8` (buttons/inputs) · `lg 12` (cards) · `xl 16` (hero/sheets) · `pill 9999`.
Elevation: **color-block first, shadow rare.** Depth comes from cream-vs-dark contrast, not drop shadows.

## Component patterns

- **DoThisNextCard** — the hero. One task only. Radar chip + mono countdown + serif title + the one-line *reason* + coral Save Me. The only loud element on the screen.
- **TaskRow** — cream `surfaceCard` row: Radar dot · title · countdown · effort · muted reason. #1 elevated; the rest calm.
- **RadarBadge / RadarDot** — semantic pill/dot in the state color.
- **Countdown** — JetBrains Mono, tabular numerals, ticking. Color tracks Radar state.
- **SaveMeButton** — coral→red interpolated background, spring press.
- **ArtifactPanel** — `surfaceDark` sheet/rail. Streams the deliverable token-by-token; shows grounding chips; Edit + coral Confirm.

## Motion & the "no-lag" contract

- **Optimistic UI on every mutation** — check/reorder/snooze render on the same frame, no spinner.
- **Stream the AI behind a skeleton** — never freeze on a model call.
- **GPU-only animation** — animate `transform` / `opacity` only, never layout (`width`/`top`/etc.).
- **Tabular-numeral countdowns** — ticking timers don't reflow.
- Web: Motion (`motion/react`) + React 19 View Transitions. Mobile: Reanimated 3 + Moti.

## Don't

- No cool grays / pure white canvas. Cream is the brand.
- No coral anywhere except the primary action + full-bleed coral moments.
- No bold serif display. No sans-serif display.
- Don't let strong color (Radar / coral) appear where it isn't semantically earned.
