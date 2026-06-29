import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * The server-side Last-Minute Radar. Runs even when the app is closed — this is
 * what makes reminders truly proactive rather than relying on an open tab.
 * (Delivering the nudge to a backgrounded device needs FCM/APNs push, wired
 * separately; this sweep is where at-risk tasks are detected and escalated.)
 */
export const radarSweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const open = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    const atRisk = open.filter((t) => {
      if (t.deadline == null) return false;
      const hoursLeft = (t.deadline - now) / 3_600_000;
      const effortHrs = (t.estEffortMin * (1 - t.progress)) / 60;
      const slack = hoursLeft - effortHrs;
      return slack <= 0.5 || hoursLeft <= 3; // RED
    });

    // Hook point: enqueue a push notification per at-risk task here.
    return { scanned: open.length, atRisk: atRisk.map((t) => t._id) };
  },
});

const crons = cronJobs();
crons.interval("last-minute radar sweep", { minutes: 15 }, internal.crons.radarSweep);
export default crons;
