"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { CalendarPlus, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { planTasks, type Peak, type PlanDay, type ScheduledBlock, type BusyInterval } from "@clutch/core";
import { useTaskStore } from "@/lib/data/store";
import { addPlanToCalendar } from "@/lib/google/client";
import { CATEGORY_ICON } from "./categoryIcon";

const PEAKS: { key: Peak; label: string; emoji: string }[] = [
  { key: "morning", label: "Morning", emoji: "🌅" },
  { key: "afternoon", label: "Afternoon", emoji: "☀️" },
  { key: "evening", label: "Evening", emoji: "🌆" },
  { key: "night", label: "Night", emoji: "🌙" },
];

const fmt = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function PlanView({ now, onToast }: { now: number; onToast: (m: string) => void }) {
  const tasks = useTaskStore((s) => s.tasks);
  const busy = useTaskStore((s) => s.busy);
  const prefs = useTaskStore((s) => s.prefs);
  const setPeak = useTaskStore((s) => s.setPeak);
  const [adding, setAdding] = useState(false);

  const plan = useMemo(() => planTasks(tasks, busy, now, prefs), [tasks, busy, now, prefs]);
  const hours = Math.floor(plan.totalMin / 60);
  const mins = plan.totalMin % 60;
  const totalLabel = hours ? `${hours}h${mins ? ` ${mins}m` : ""}` : `${mins}m`;

  const addAll = async () => {
    const blocks = plan.days.flatMap((d) => d.blocks).map((b) => ({ title: b.title, start: b.start, end: b.end }));
    if (!blocks.length) return;
    setAdding(true);
    try {
      const res = await addPlanToCalendar(blocks);
      onToast(
        res.simulated
          ? `Plan ready — connect Google to push ${res.count} blocks for real`
          : `✓ Added ${res.count} focus blocks to your Google Calendar`,
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight text-ink sm:text-[32px]">Your plan</h1>
          <p className="mt-1 text-[15px] text-muted">
            {plan.totalMin > 0
              ? `${totalLabel} of focused work, auto-scheduled around your day.`
              : "Nothing to schedule right now."}
          </p>
        </div>
        {plan.totalMin > 0 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={addAll}
            disabled={adding}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--color-action)" }}
          >
            {adding ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={15} />}
            Add all
          </motion.button>
        )}
      </div>

      {/* Peak selector */}
      <div className="mt-4">
        <div className="mb-1.5 px-0.5 text-[12px] text-muted">I focus best in the…</div>
        <div className="flex gap-1.5">
          {PEAKS.map((p) => {
            const active = prefs.peak === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setPeak(p.key)}
                className="flex-1 rounded-xl border px-2 py-2 text-[13px] font-medium transition-colors"
                style={
                  active
                    ? { borderColor: "var(--color-action)", background: "rgba(204,120,92,0.10)", color: "var(--color-ink)" }
                    : { borderColor: "var(--color-hairline)", color: "var(--color-muted)" }
                }
              >
                <span className="mr-1" aria-hidden>{p.emoji}</span>
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Unscheduled warnings */}
      {plan.unscheduled.length > 0 && (
        <div
          className="mt-4 flex items-start gap-2 rounded-xl px-3.5 py-3"
          style={{ background: "rgba(198,69,69,0.08)", border: "1px solid rgba(198,69,69,0.2)" }}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--color-radar-red)" }} />
          <div className="text-[13px] text-body">
            <span className="font-medium text-ink">Won&apos;t all fit:</span>{" "}
            {plan.unscheduled.map((u) => u.title).join(", ")}. Free up time, drop scope, or start now.
          </div>
        </div>
      )}

      {/* Days */}
      <div className="mt-5 flex flex-col gap-6">
        {plan.days.map((day) => (
          <DayColumn key={day.date} day={day} busy={busy} />
        ))}
      </div>
    </motion.div>
  );
}

type Row =
  | { kind: "block"; start: number; block: ScheduledBlock }
  | { kind: "busy"; start: number; busy: BusyInterval };

function DayColumn({ day, busy }: { day: PlanDay; busy: BusyInterval[] }) {
  const startOfDay = (() => {
    const d = new Date(day.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const endOfDay = startOfDay + 86_400_000;
  const dayBusy = busy.filter((b) => b.start >= startOfDay && b.start < endOfDay);

  const rows: Row[] = [
    ...day.blocks.map((b) => ({ kind: "block" as const, start: b.start, block: b })),
    ...dayBusy.map((b) => ({ kind: "busy" as const, start: b.start, busy: b })),
  ].sort((a, b) => a.start - b.start);

  return (
    <section>
      <h3 className="mb-2.5 px-1 text-[12px] font-medium uppercase tracking-[0.14em] text-muted-soft">
        {day.label}
      </h3>
      <ul className="flex flex-col gap-2">
        {rows.map((row, i) =>
          row.kind === "busy" ? (
            <li
              key={`b-${i}`}
              className="flex items-center gap-3 rounded-xl border border-dashed border-hairline px-3.5 py-2.5"
            >
              <Clock size={14} className="shrink-0 text-muted-soft" />
              <span className="w-[120px] shrink-0 font-mono text-[12px] tabular-nums text-muted-soft">
                {fmt(row.busy.start)}
              </span>
              <span className="truncate text-[13px] text-muted">{row.busy.label ?? "Busy"}</span>
            </li>
          ) : (
            <BlockRow key={`x-${i}`} block={row.block} />
          ),
        )}
      </ul>
    </section>
  );
}

function BlockRow({ block }: { block: ScheduledBlock }) {
  const Icon = CATEGORY_ICON[block.category];
  return (
    <li
      className="flex items-center gap-3 overflow-hidden rounded-xl border border-hairline bg-surface-card px-3.5 py-3"
      style={{ borderLeft: "3px solid var(--color-action)" }}
    >
      <span className="w-[120px] shrink-0 font-mono text-[12.5px] tabular-nums text-ink">
        {fmt(block.start)}
      </span>
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "rgba(204,120,92,0.12)", color: "var(--color-action)" }}
      >
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-ink">{block.title}</span>
      <span className="shrink-0 text-[11.5px] text-muted-soft">
        {block.parts > 1 ? `part ${block.part}/${block.parts}` : `${Math.round((block.end - block.start) / 60000)}m`}
      </span>
    </li>
  );
}
