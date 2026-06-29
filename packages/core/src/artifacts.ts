import type { Task, ArtifactKind } from "./types";
import { formatDeadline, formatEffort } from "./time";
import { remainingMin } from "./slack";

export interface Artifact {
  kind: ArtifactKind;
  heading: string;
  /** the deliverable body, streamed token-by-token in the UI */
  body: string;
  /** the sources the draft was grounded in — shown as trust chips */
  grounding: string[];
  /** the coral confirm action label */
  confirmLabel: string;
}

/** Pick a sensible artifact archetype for a task. */
export function defaultArtifactKind(task: Task): ArtifactKind {
  if (task.artifact) return task.artifact;
  switch (task.category) {
    case "email":
      return "email";
    case "bill":
      return "billSummary";
    case "interview":
      return "brief";
    default:
      return "outline";
  }
}

const USER = "Arwin";

/**
 * Deterministic, context-aware deliverable generator. No API key required — this
 * is what makes the differentiator demoable offline. An optional Claude pass can
 * rewrite the prose, but the structure and grounding always come from here.
 */
export function generateArtifact(task: Task, now: number): Artifact {
  const kind = defaultArtifactKind(task);
  const due = formatDeadline(task.deadline, now);
  const effort = formatEffort(remainingMin(task) || task.estEffortMin);

  switch (kind) {
    case "email":
      return {
        kind,
        heading: `Email draft · ${task.title}`,
        confirmLabel: "Save to Gmail drafts",
        grounding: ["your profile", "the original thread", "deadline from the task"],
        body: [
          `Subject: ${emailSubject(task)}`,
          ``,
          `Hi there,`,
          ``,
          `I'm reaching out about "${task.title.toLowerCase()}". The deadline is ${due}, and I wanted to make sure this is handled in good time rather than at the last minute.`,
          ``,
          `Could you let me know if there's anything you need from me to move this forward? I've blocked time today to get my part done and can turn things around quickly.`,
          ``,
          `Thank you so much — I really appreciate it.`,
          ``,
          `Best,`,
          `${USER}`,
        ].join("\n"),
      };

    case "billSummary":
      return {
        kind,
        heading: `Payment summary · ${task.title}`,
        confirmLabel: "Save summary & set reminder",
        grounding: ["billing email", "amount on file", "due date from the task"],
        body: [
          `${task.title}`,
          `────────────────────────`,
          `Due:        ${due}`,
          `Estimated:  (confirm exact amount on the provider page)`,
          `Pay here:   → open the official payment link`,
          ``,
          `What to do (2 min):`,
          `1. Open the payment link above.`,
          `2. Confirm the amount and pay.`,
          `3. Mark this done — I'll stop reminding you.`,
          ``,
          `I won't pay it for you (that's your money), but I'll keep this front-and-center until it's cleared.`,
        ].join("\n"),
      };

    case "brief":
      return {
        kind,
        heading: `Prep brief · ${task.title}`,
        confirmLabel: "Add prep block to Calendar",
        grounding: ["role + company", "your background", "common interview patterns"],
        body: [
          `${task.title}`,
          ``,
          `Likely to come up:`,
          `• "Walk me through a project you're proud of." → pick ONE, lead with impact.`,
          `• "Why this team?" → tie your work to what they're building.`,
          `• A practical/technical exercise → think out loud, state assumptions.`,
          ``,
          `Your talking points:`,
          `• 2–3 concrete wins with numbers.`,
          `• One thoughtful question to ask them.`,
          ``,
          `Plan: I've reserved a ${effort} prep block. Do the project recap first.`,
        ].join("\n"),
      };

    case "outline":
    default:
      return {
        kind: "outline",
        heading: `Game plan · ${task.title}`,
        confirmLabel: "Add focus block to Calendar",
        grounding: ["the task", "your typical pace", `${effort} of work left`],
        body: [
          `${task.title}`,
          `Due ${due} · about ${effort} of work`,
          ``,
          `Break the freeze — just do step 1 now:`,
          `1. Open the document / portal and write the first line. (5 min)`,
          `2. Draft the messy middle — don't edit yet. (${effort})`,
          `3. Quick pass for mistakes, then submit.`,
          ``,
          `Starting is the hard part. I'll put a focus block on your calendar so this is the next thing you do.`,
        ].join("\n"),
      };
  }
}

function emailSubject(task: Task): string {
  const t = task.title.toLowerCase();
  if (t.includes("reference")) return "Quick reference request — time-sensitive";
  if (t.includes("extension")) return "Request for a short extension";
  if (t.includes("follow")) return "Following up";
  return task.title;
}
