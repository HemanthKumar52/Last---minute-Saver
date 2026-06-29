/** Domain types for Clutch. The deterministic brain operates on these. */

export type TaskCategory =
  | "assignment"
  | "email"
  | "bill"
  | "interview"
  | "meeting"
  | "errand"
  | "other";

export type TaskStatus = "open" | "in_progress" | "done" | "snoozed";

export type ImpactLevel = 1 | 2 | 3; // 1 = low, 2 = medium, 3 = high consequence

/** The Radar state — the only strong color signal in the UI. */
export type RadarState = "green" | "amber" | "red";

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  /** epoch ms when the task was captured */
  createdAt: number;
  /** epoch ms of the deadline; null = no hard deadline */
  deadline: number | null;
  /** external/irreversible deadline vs. a soft self-imposed one */
  hardDeadline: boolean;
  /** estimated minutes of work to complete (total) */
  estEffortMin: number;
  /** consequence of missing it */
  impact: ImpactLevel;
  /** missing it cannot be undone (scholarship close, flight, court date) */
  irreversible: boolean;
  status: TaskStatus;
  /** 0..1 fraction already done */
  progress: number;
  /** epoch ms; while > now and status === "snoozed", task is hidden from the list */
  snoozedUntil?: number;
  notes?: string;
  /** where it came from: "paste" | "voice" | "email" | "syllabus" | "manual" ... */
  source?: string;
  /** which Save Me artifact archetype applies, if any */
  artifact?: ArtifactKind;
}

export type ArtifactKind = "email" | "outline" | "brief" | "billSummary";

/** Canonical "create a task" input — shared by quick-add, the AI extractor, and the store. */
export interface TaskInput {
  title: string;
  category?: TaskCategory;
  deadline?: number | null;
  estEffortMin?: number;
  impact?: ImpactLevel;
  hardDeadline?: boolean;
  irreversible?: boolean;
  artifact?: ArtifactKind;
  source?: string;
  notes?: string;
}

export interface ScoreBreakdown {
  /** 0..40 — time pressure (slack decay) */
  urgency: number;
  /** 0..35 — consequence + irreversibility */
  impact: number;
  /** 0..15 — quick-win boost (shorter remaining work is easier to start) */
  effort: number;
  /** 0..10 — hard near-term deadline cliff */
  proximity: number;
  /** 0..100 */
  total: number;
}

export interface RankedTask extends Task {
  score: number;
  breakdown: ScoreBreakdown;
  radar: RadarState;
  /** one-line, human-readable justification for the rank */
  reason: string;
  /** hours of buffer = hoursLeft − remaining effort; null if no deadline */
  slack: number | null;
  /** minutes of work still remaining after progress */
  remainingMin: number;
  /** 1-based rank after sorting */
  rank: number;
}
