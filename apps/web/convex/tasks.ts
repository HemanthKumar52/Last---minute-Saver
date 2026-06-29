import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("tasks").collect(),
});

export const add = mutation({
  args: {
    title: v.string(),
    category: v.string(),
    deadline: v.union(v.number(), v.null()),
    hardDeadline: v.boolean(),
    estEffortMin: v.number(),
    impact: v.number(),
    irreversible: v.boolean(),
    source: v.optional(v.string()),
    artifact: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("tasks", { ...args, createdAt: Date.now(), status: "open", progress: 0 }),
});

export const complete = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => ctx.db.patch(id, { status: "done", progress: 1 }),
});

export const snooze = mutation({
  args: { id: v.id("tasks"), minutes: v.number() },
  handler: async (ctx, { id, minutes }) =>
    ctx.db.patch(id, { status: "snoozed", snoozedUntil: Date.now() + minutes * 60_000 }),
});

export const setProgress = mutation({
  args: { id: v.id("tasks"), progress: v.number() },
  handler: async (ctx, { id, progress }) =>
    ctx.db.patch(id, { progress: Math.max(0, Math.min(1, progress)) }),
});

export const start = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => ctx.db.patch(id, { status: "in_progress" }),
});
