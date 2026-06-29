import { test } from "bun:test";
import assert from "node:assert/strict";
import { makeSeedTasks, makeSeedBusy } from "./seed";
import { planTasks, DEFAULT_PREFS } from "./planner";

// Fixed local clock: 2026-06-29, 1:00 PM — guarantees free time today.
const NOW = new Date(2026, 5, 29, 13, 0, 0, 0).getTime();
const tasks = makeSeedTasks(NOW);
const busy = makeSeedBusy(NOW);
const prefs = DEFAULT_PREFS;
const plan = planTasks(tasks, busy, NOW, prefs);
const allBlocks = plan.days.flatMap((d) => d.blocks);

test("the planner produces a real, non-empty schedule", () => {
  assert.ok(plan.totalMin > 0, "should schedule some work");
  assert.ok(allBlocks.length > 0, "should have blocks");
});

test("no block exceeds the focus cap", () => {
  for (const b of allBlocks) {
    assert.ok((b.end - b.start) / 60000 <= prefs.maxFocusMin + 0.01, `${b.title} block too long`);
  }
});

test("every block sits inside working hours", () => {
  for (const b of allBlocks) {
    const sh = new Date(b.start).getHours();
    const eh = new Date(b.end).getHours() + new Date(b.end).getMinutes() / 60;
    assert.ok(sh >= prefs.dayStartHour, `${b.title} starts before work hours`);
    assert.ok(eh <= prefs.dayEndHour + 0.01, `${b.title} ends after work hours`);
  }
});

test("no block collides with a busy interval", () => {
  for (const b of allBlocks) {
    for (const x of busy) {
      assert.ok(!(b.start < x.end && x.start < b.end), `${b.title} overlaps ${x.label}`);
    }
  }
});

test("blocks never overlap each other", () => {
  const sorted = [...allBlocks].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i += 1) {
    assert.ok(sorted[i].start >= sorted[i - 1].end, "blocks overlap");
  }
});

test("a split task is labelled part x of y", () => {
  const multi = allBlocks.filter((b) => b.parts > 1);
  for (const b of multi) {
    assert.ok(b.part >= 1 && b.part <= b.parts);
  }
});
