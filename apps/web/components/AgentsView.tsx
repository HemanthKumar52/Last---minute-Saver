"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GitBranch,
  Layers,
  ListOrdered,
  Tag,
  Route,
  Gauge,
  Bell,
  Wand2,
  Monitor,
  Play,
  Check,
  Loader2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { rankTasks, type Task } from "@clutch/core";
import { useTaskStore } from "@/lib/data/store";
import { runAgentsRemote } from "@/lib/agents/client";
import type { AgentId, AgentRunResult } from "@/lib/agents/types";

const AGENT_ICON: Record<AgentId, LucideIcon> = {
  coordinator: GitBranch,
  context: Layers,
  prioritizer: ListOrdered,
  classifier: Tag,
  methodology: Route,
  sla: Gauge,
  notification: Bell,
  executor: Wand2,
  presenter: Monitor,
};

export function AgentsView({
  now,
  onToast,
  autoRun = false,
}: {
  now: number;
  onToast: (m: string) => void;
  autoRun?: boolean;
}) {
  const tasks = useTaskStore((s) => s.tasks);
  const ranked = useMemo(() => rankTasks(tasks, now), [tasks, now]);

  const [selId, setSelId] = useState<string | null>(null);
  const sel = ranked.find((t) => t.id === selId) ?? ranked[0];

  const [result, setResult] = useState<AgentRunResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!sel || running) return;
    setRunning(true);
    setResult(null);
    setRevealed(0);
    const r = await runAgentsRemote(sel as Task, tasks, now);
    if (!r) {
      setRunning(false);
      onToast("Agents unavailable — try again");
      return;
    }
    setResult(r);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= r.steps.length) {
        clearInterval(id);
        setRunning(false);
        onToast(r.aiUsed ? "✓ Agents finished — powered by OmniRoute" : "✓ Agents finished (deterministic)");
      }
    }, 650);
  };

  const startedRef = useRef(false);
  useEffect(() => {
    if (autoRun && !startedRef.current && ranked.length) {
      startedRef.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, ranked.length]);

  const steps = result?.steps ?? [];
  const shown = steps.slice(0, revealed);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight text-ink sm:text-[32px]">Agent pipeline</h1>
          <p className="mt-1 text-[15px] text-muted">
            A coordinator assigns context, runs specialist agents, then clears it for the next task.
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={run}
          disabled={!sel || running}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-action)" }}
        >
          {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} fill="currentColor" />}
          Run agents
        </motion.button>
      </div>

      {/* Task picker */}
      <div className="mt-4">
        <div className="mb-1.5 px-0.5 text-[12px] text-muted">Run the pipeline on:</div>
        <div className="flex flex-wrap gap-1.5">
          {ranked.slice(0, 6).map((t) => {
            const active = (sel?.id ?? "") === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelId(t.id);
                  setResult(null);
                  setRevealed(0);
                }}
                className="max-w-[200px] truncate rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors"
                style={
                  active
                    ? { borderColor: "var(--color-action)", background: "rgba(204,120,92,0.10)", color: "var(--color-ink)" }
                    : { borderColor: "var(--color-hairline)", color: "var(--color-muted)" }
                }
              >
                {t.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pipeline */}
      <div className="mt-5">
        {!result && !running && (
          <div className="rounded-xl border border-dashed border-hairline px-4 py-10 text-center text-[14px] text-muted">
            Pick a task and hit <span className="font-medium text-ink">Run agents</span> to watch the
            pipeline.
          </div>
        )}

        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {shown.map((step, i) => {
              const Icon = AGENT_ICON[step.agent];
              const active = running && i === revealed - 1;
              return (
                <motion.li
                  key={`${step.agent}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-start gap-3 rounded-xl border border-hairline bg-surface-card px-3.5 py-3"
                >
                  <span
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "rgba(204,120,92,0.12)", color: "var(--color-action)" }}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-ink">{step.title}</span>
                      <SourceBadge source={step.source} />
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-body">{step.summary}</p>
                  </div>
                  <span className="mt-1 shrink-0">
                    {active ? (
                      <Loader2 size={15} className="animate-spin text-muted-soft" />
                    ) : (
                      <Check size={15} style={{ color: "var(--color-radar-green)" }} />
                    )}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {/* Result */}
        {result && revealed >= steps.length && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 overflow-hidden rounded-xl"
            style={{ background: "var(--color-surface-dark)", color: "var(--color-on-dark)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium">
                <Sparkles size={14} style={{ color: "var(--color-action)" }} />
                Deliverable ready · {result.artifact.kind}
              </span>
              <span className="text-[11px]" style={{ color: "var(--color-on-dark-soft)" }}>
                {result.aiUsed ? "powered by OmniRoute" : "deterministic guardrail"}
              </span>
            </div>
            <pre
              className="m-0 max-h-48 overflow-y-auto whitespace-pre-wrap break-words px-4 py-3 text-[12.5px] leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {result.artifact.body}
            </pre>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function SourceBadge({ source }: { source: "ai" | "rule" }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={
        source === "ai"
          ? { background: "rgba(204,120,92,0.16)", color: "var(--color-action)" }
          : { background: "rgba(20,20,19,0.05)", color: "var(--color-muted)" }
      }
    >
      {source === "ai" ? "OmniRoute" : "rule"}
    </span>
  );
}
