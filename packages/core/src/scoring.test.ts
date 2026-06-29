import { test } from "bun:test";
import assert from "node:assert/strict";
import { makeSeedTasks } from "./seed";
import { rankTasks, doThisNext } from "./rank";
import { radarState, slackHours } from "./slack";
import { scoreTask } from "./scoring";

const NOW = 1_800_000_000_000; // fixed clock for deterministic tests
const tasks = makeSeedTasks(NOW);
const byId = (id: string) => tasks.find((t) => t.id === id)!;

test("the scholarship is the clear #1 (do this next)", () => {
  const top = doThisNext(tasks, NOW);
  assert.equal(top?.id, "t-scholarship");
});

test("done tasks and far-off habits never outrank an at-risk deadline", () => {
  const ranked = rankTasks(tasks, NOW);
  assert.ok(!ranked.some((t) => t.id === "t-done-1"), "done task excluded");
  const scholarship = ranked.find((t) => t.id === "t-scholarship")!;
  const gym = ranked.find((t) => t.id === "t-gym")!;
  assert.ok(scholarship.score > gym.score);
});

test("radar lights up correctly", () => {
  assert.equal(radarState(byId("t-scholarship"), NOW), "red"); // due in <3h
  assert.equal(radarState(byId("t-reading"), NOW), "green"); // 3 days out
  assert.equal(radarState(byId("t-bill"), NOW), "amber"); // due tomorrow
});

test("slack = time left - remaining work", () => {
  const slack = slackHours(byId("t-scholarship"), NOW);
  // 2.933h until deadline - 40min (0.667h) of work ~= 2.27h buffer
  assert.ok(slack !== null && Math.abs(slack - 2.27) < 0.05, `slack was ${slack}`);
});

test("score is bounded and irreversible high-impact work scores high", () => {
  const s = scoreTask(byId("t-scholarship"), NOW);
  assert.ok(s.total > 85 && s.total <= 100, `total was ${s.total}`);
  assert.ok(s.impact >= 30, "irreversible + impact 3 should max impact");
});

test("soft deadlines pull less than hard ones, all else equal", () => {
  const now = NOW;
  const base = {
    id: "x",
    title: "x",
    category: "other" as const,
    createdAt: now,
    deadline: now + 4 * 3_600_000,
    estEffortMin: 30,
    impact: 2 as const,
    irreversible: false,
    status: "open" as const,
    progress: 0,
  };
  const hard = scoreTask({ ...base, hardDeadline: true }, now);
  const soft = scoreTask({ ...base, hardDeadline: false }, now);
  assert.ok(hard.urgency > soft.urgency);
});
