"use client";

import { create } from "zustand";
import {
  makeSeedTasks,
  makeSeedHabits,
  makeSeedBusy,
  DEFAULT_PREFS,
  type Task,
  type Habit,
  type TaskInput,
  type BusyInterval,
  type PlannerPrefs,
  type Peak,
} from "@clutch/core";

export type NewTaskInput = TaskInput;

interface TaskStore {
  tasks: Task[];
  habits: Habit[];
  busy: BusyInterval[];
  prefs: PlannerPrefs;
  setPeak: (peak: Peak) => void;
  addTask: (input: TaskInput) => string;
  addTasks: (inputs: TaskInput[]) => void;
  addBusy: (intervals: BusyInterval[]) => void;
  completeTask: (id: string) => void;
  uncompleteTask: (id: string) => void;
  snoozeTask: (id: string, minutes: number) => void;
  startTask: (id: string) => void;
  setProgress: (id: string, progress: number) => void;
  removeTask: (id: string) => void;
  checkInHabit: (id: string) => void;
  resetDemo: () => void;
}

let counter = 0;
const genId = () => `t-${Date.now().toString(36)}-${(counter++).toString(36)}`;

function toTask(input: TaskInput): Task {
  return {
    id: genId(),
    title: input.title.trim(),
    category: input.category ?? "other",
    createdAt: Date.now(),
    deadline: input.deadline ?? null,
    hardDeadline: input.hardDeadline ?? input.deadline != null,
    estEffortMin: input.estEffortMin ?? 30,
    impact: input.impact ?? 2,
    irreversible: input.irreversible ?? false,
    status: "open",
    progress: 0,
    source: input.source ?? "manual",
    artifact: input.artifact,
    notes: input.notes,
  };
}

const patch = (id: string, fn: (t: Task) => Task) => (s: TaskStore) => ({
  tasks: s.tasks.map((t) => (t.id === id ? fn(t) : t)),
});

/**
 * Local optimistic store. Every mutation is synchronous → it lands on the same
 * frame, no spinner. A Convex-backed implementation can drop in behind this shape.
 */
export const useTaskStore = create<TaskStore>((set) => ({
  tasks: makeSeedTasks(Date.now()),
  habits: makeSeedHabits(Date.now()),
  busy: makeSeedBusy(Date.now()),
  prefs: DEFAULT_PREFS,

  setPeak: (peak) => set((s) => ({ prefs: { ...s.prefs, peak } })),

  addTask: (input) => {
    const task = toTask(input);
    set((s) => ({ tasks: [task, ...s.tasks] }));
    return task.id;
  },
  addTasks: (inputs) => {
    const tasks = inputs.map(toTask);
    set((s) => ({ tasks: [...tasks, ...s.tasks] }));
  },
  addBusy: (intervals) => set((s) => ({ busy: [...s.busy, ...intervals] })),

  completeTask: (id) => set(patch(id, (t) => ({ ...t, status: "done", progress: 1 }))),
  uncompleteTask: (id) =>
    set(patch(id, (t) => ({ ...t, status: "open", progress: t.progress >= 1 ? 0 : t.progress }))),
  snoozeTask: (id, minutes) =>
    set(patch(id, (t) => ({ ...t, status: "snoozed", snoozedUntil: Date.now() + minutes * 60_000 }))),
  startTask: (id) => set(patch(id, (t) => ({ ...t, status: "in_progress" }))),
  setProgress: (id, progress) =>
    set(patch(id, (t) => ({ ...t, progress: Math.max(0, Math.min(1, progress)) }))),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  checkInHabit: (id) =>
    set((s) => ({
      habits: s.habits.map((h) =>
        h.id === id ? { ...h, completions: [...h.completions, Date.now()] } : h,
      ),
    })),

  resetDemo: () =>
    set({
      tasks: makeSeedTasks(Date.now()),
      habits: makeSeedHabits(Date.now()),
      busy: makeSeedBusy(Date.now()),
    }),
}));
