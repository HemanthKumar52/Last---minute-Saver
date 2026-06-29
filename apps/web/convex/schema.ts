import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Activate with: `npx convex dev` (run once, from apps/web). This generates the
// _generated/ client and provisions a dev deployment; NEXT_PUBLIC_CONVEX_URL is set
// for you. Until then, the app runs on the local optimistic store.

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    category: v.string(),
    createdAt: v.number(),
    deadline: v.union(v.number(), v.null()),
    hardDeadline: v.boolean(),
    estEffortMin: v.number(),
    impact: v.number(),
    irreversible: v.boolean(),
    status: v.string(),
    progress: v.number(),
    snoozedUntil: v.optional(v.number()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
    artifact: v.optional(v.string()),
  }).index("by_status", ["status"]),

  habits: defineTable({
    title: v.string(),
    cadencePerWeek: v.number(),
    completions: v.array(v.number()),
    createdAt: v.number(),
    emoji: v.optional(v.string()),
  }),
});
