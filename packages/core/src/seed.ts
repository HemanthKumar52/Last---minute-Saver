import type { Task } from "./types";
import type { BusyInterval } from "./planner";

const MIN = 60_000;
const HOUR = 3_600_000;

/**
 * A vivid, multi-persona demo set generated relative to `now` so the Radar always
 * looks live. Tuned so "Dean's scholarship" is the clear #1 (RED) with a believable
 * spread of AMBER/GREEN behind it.
 */
export function makeSeedTasks(now: number): Task[] {
  const t = (mins: number) => now + mins * MIN;
  return [
    {
      id: "t-scholarship",
      title: "Submit Dean's scholarship application",
      category: "assignment",
      createdAt: now - 5 * 24 * HOUR,
      deadline: t(176), // 2h 56m
      hardDeadline: true,
      irreversible: true,
      estEffortMin: 40,
      impact: 3,
      status: "open",
      progress: 0,
      source: "syllabus",
      artifact: "email",
      notes: "Portal closes at midnight. Still need the reference email from Prof. Lee.",
    },
    {
      id: "t-domain",
      title: "Renew clutch.app domain before it lapses",
      category: "errand",
      createdAt: now - 2 * 24 * HOUR,
      deadline: t(300), // 5h
      hardDeadline: true,
      irreversible: true,
      estEffortMin: 10,
      impact: 3,
      status: "open",
      progress: 0,
      source: "email",
      artifact: "billSummary",
    },
    {
      id: "t-profreply",
      title: "Reply to Prof. Lee about the extension",
      category: "email",
      createdAt: now - 6 * HOUR,
      deadline: t(360), // 6h
      hardDeadline: false,
      irreversible: false,
      estEffortMin: 10,
      impact: 2,
      status: "open",
      progress: 0,
      source: "email",
      artifact: "email",
    },
    {
      id: "t-bill",
      title: "Pay the electricity bill",
      category: "bill",
      createdAt: now - 3 * 24 * HOUR,
      deadline: t(22 * 60), // tomorrow
      hardDeadline: true,
      irreversible: false,
      estEffortMin: 5,
      impact: 2,
      status: "open",
      progress: 0,
      source: "email",
      artifact: "billSummary",
    },
    {
      id: "t-interview",
      title: "Prep for the Stripe internship interview",
      category: "interview",
      createdAt: now - 4 * 24 * HOUR,
      deadline: t(20 * 60), // ~20h
      hardDeadline: true,
      irreversible: false,
      estEffortMin: 90,
      impact: 3,
      status: "open",
      progress: 0.15,
      source: "manual",
      artifact: "brief",
    },
    {
      id: "t-expense",
      title: "File the Q2 expense report",
      category: "errand",
      createdAt: now - 2 * 24 * HOUR,
      deadline: t(30 * 60), // 30h
      hardDeadline: true,
      irreversible: false,
      estEffortMin: 15,
      impact: 2,
      status: "open",
      progress: 0,
      source: "manual",
      artifact: "outline",
    },
    {
      id: "t-groceries",
      title: "Buy groceries for the week",
      category: "errand",
      createdAt: now - 1 * 24 * HOUR,
      deadline: t(28 * 60), // ~tomorrow evening
      hardDeadline: false,
      irreversible: false,
      estEffortMin: 40,
      impact: 1,
      status: "open",
      progress: 0,
      source: "manual",
    },
    {
      id: "t-reading",
      title: "Read Chapter 4 for Thursday's seminar",
      category: "assignment",
      createdAt: now - 1 * 24 * HOUR,
      deadline: t(3 * 24 * 60), // 3 days
      hardDeadline: false,
      irreversible: false,
      estEffortMin: 60,
      impact: 1,
      status: "open",
      progress: 0,
      source: "syllabus",
      artifact: "outline",
    },
    {
      id: "t-gym",
      title: "Evening run (habit: 4× / week)",
      category: "errand",
      createdAt: now - 12 * HOUR,
      deadline: null,
      hardDeadline: false,
      irreversible: false,
      estEffortMin: 45,
      impact: 1,
      status: "open",
      progress: 0,
      source: "manual",
    },
    {
      id: "t-done-1",
      title: "Submit CS-201 problem set",
      category: "assignment",
      createdAt: now - 2 * 24 * HOUR,
      deadline: now - 3 * HOUR,
      hardDeadline: true,
      irreversible: true,
      estEffortMin: 90,
      impact: 3,
      status: "done",
      progress: 1,
      source: "syllabus",
    },
  ];
}

/** Existing commitments the planner schedules around (stands in for a real calendar). */
export function makeSeedBusy(now: number): BusyInterval[] {
  const startOfDay = (ms: number) => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const at = (dayOffset: number, hour: number, min = 0) =>
    startOfDay(now) + dayOffset * 24 * HOUR + hour * HOUR + min * MIN;
  return [
    { start: at(0, 14), end: at(0, 16), label: "Afternoon lecture" },
    { start: at(0, 19), end: at(0, 19, 45), label: "Dinner" },
    { start: at(1, 9), end: at(1, 12), label: "Classes" },
    { start: at(1, 15), end: at(1, 16), label: "Doctor appointment" },
    { start: at(2, 10), end: at(2, 13), label: "Group project meeting" },
    { start: at(3, 9), end: at(3, 12), label: "Classes" },
  ];
}
