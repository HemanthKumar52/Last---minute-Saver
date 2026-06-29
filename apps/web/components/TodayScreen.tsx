"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RotateCcw, Sparkles, CheckCircle2, PartyPopper, Download } from "lucide-react";
import { rankTasks, type RankedTask } from "@clutch/core";
import { useTaskStore } from "@/lib/data/store";
import { useMounted, useNow } from "@/lib/hooks";
import { useNotifications, useRedAlert } from "@/lib/proactive";
import { addFocusBlock, saveGmailDraft } from "@/lib/google/client";
import { DoThisNextCard } from "./DoThisNextCard";
import { TaskRow } from "./TaskRow";
import { CaptureBar } from "./CaptureBar";
import { ArtifactPanel, type ConfirmResult } from "./ArtifactPanel";
import { HabitsStrip } from "./HabitsStrip";
import { ConnectionsBar } from "./ConnectionsBar";
import { PlanView } from "./PlanView";
import { AgentsView } from "./AgentsView";
import { ImportModal } from "./ImportModal";
import { cn } from "@/lib/cn";

export function TodayScreen() {
  const mounted = useMounted();
  const now = useNow(15_000);

  const tasks = useTaskStore((s) => s.tasks);
  const addTasks = useTaskStore((s) => s.addTasks);
  const addBusy = useTaskStore((s) => s.addBusy);
  const completeTask = useTaskStore((s) => s.completeTask);
  const snoozeTask = useTaskStore((s) => s.snoozeTask);
  const startTask = useTaskStore((s) => s.startTask);
  const setProgress = useTaskStore((s) => s.setProgress);
  const resetDemo = useTaskStore((s) => s.resetDemo);

  const ranked = useMemo(() => rankTasks(tasks, now), [tasks, now]);
  const doneCount = tasks.filter((t) => t.status === "done").length;

  const [saveTask, setSaveTask] = useState<RankedTask | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<"today" | "plan" | "agents">("today");
  const [autoAgents, setAutoAgents] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importTab, setImportTab] = useState<"paste" | "calendar" | "notion" | "imap">("paste");

  const { perm } = useNotifications();
  const top = ranked[0];
  const rest = ranked.slice(1);
  useRedAlert(top ?? null, perm === "granted");

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout((showToast as unknown as { _t?: number })._t);
    (showToast as unknown as { _t?: number })._t = window.setTimeout(() => setToast(null), 2800);
  };

  // OAuth round-trip feedback (?google=connected|error|notconfigured) + demo deep-link cleanup.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const g = p.get("google");
    if (g === "connected") showToast("✓ Google connected — Calendar & Gmail are live");
    else if (g === "notconfigured") showToast("Add Google keys to .env.local to connect");
    else if (g === "error") showToast("Google connection failed — try again");
    const m = p.get("ms");
    if (m === "connected") showToast("✓ Microsoft connected — Outlook calendar & mail are live");
    else if (m === "notconfigured") showToast("Add Microsoft keys to .env.local to connect");
    else if (m === "error") showToast("Microsoft connection failed — try again");
    if (p.get("agents")) {
      setView("agents");
      setAutoAgents(true);
    }
    const imp = p.get("import");
    if (imp) {
      setImportOpen(true);
      if (imp === "calendar" || imp === "notion" || imp === "imap") setImportTab(imp);
    }
    if (g || m || p.get("agents") || imp) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep-link: ?save=1 auto-opens the Save Me panel for the #1 task.
  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (autoOpened || typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("save") && ranked.length) {
      setSaveTask(ranked[0]);
      setAutoOpened(true);
    }
  }, [ranked, autoOpened]);

  const onConfirm = async (task: RankedTask, result: ConfirmResult) => {
    startTask(task.id);
    setProgress(task.id, Math.max(task.progress, 0.6));
    setSaveTask(null);
    if (result.kind === "email") {
      const res = await saveGmailDraft(`Re: ${task.title}`, result.body);
      showToast(
        res.simulated
          ? "✓ Draft ready — connect Gmail to save it for real"
          : "✓ Saved to your Gmail drafts",
      );
    } else {
      const res = await addFocusBlock(task);
      showToast(
        res.simulated
          ? "✓ Queued — connect Google Calendar to book it for real"
          : "✓ Focus block added to your Google Calendar",
      );
    }
  };

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 pb-28 pt-6 sm:pt-10 xl:max-w-[1180px] xl:px-8 2xl:max-w-[1280px]">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "rgba(204,120,92,0.14)", color: "var(--color-action)" }}
          >
            <Sparkles size={16} fill="currentColor" />
          </span>
          <span className="font-display text-[20px] text-ink">Clutch</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[13px] text-muted sm:inline-flex">
            <CheckCircle2 size={15} className="text-radar-green" />
            {doneCount} done
          </span>
          <button
            onClick={() => setImportOpen(true)}
            aria-label="Import tasks"
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] text-muted transition-colors hover:bg-surface-soft"
          >
            <Download size={13} />
            Import
          </button>
          <button
            onClick={() => {
              resetDemo();
              showToast("Demo reset");
            }}
            aria-label="Reset demo data"
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] text-muted transition-colors hover:bg-surface-soft"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      </header>

      {mounted && (
        <div className="mt-6 inline-flex rounded-xl border border-hairline bg-surface-soft p-1">
          {(["today", "plan", "agents"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-[13px] font-medium capitalize transition-colors",
                view === v ? "bg-canvas text-ink shadow-sm" : "text-muted",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {mounted && view === "plan" ? (
        <div className="mt-6 xl:mx-auto xl:max-w-[860px]">
          <PlanView now={now} onToast={showToast} />
        </div>
      ) : mounted && view === "agents" ? (
        <div className="mt-6 xl:mx-auto xl:max-w-[860px]">
          <AgentsView now={now} onToast={showToast} />
        </div>
      ) : (
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start xl:gap-10">
          {/* Primary focus column */}
          <div className="xl:min-w-0">
            <div className="mt-7 sm:mt-9">
              {mounted ? <Greeting ranked={ranked} now={now} /> : <GreetingSkeleton />}
            </div>

            <div className="mt-5">
              {!mounted ? (
                <HeroSkeleton />
              ) : top ? (
                <AnimatePresence mode="popLayout">
                  <DoThisNextCard
                    key={top.id}
                    task={top}
                    now={now}
                    onSaveMe={() => setSaveTask(top)}
                    onDone={() => {
                      completeTask(top.id);
                      showToast("Nice — one less thing on your plate.");
                    }}
                    onSnooze={() => {
                      snoozeTask(top.id, 30);
                      showToast("Snoozed 30 min — I'll bring it back.");
                    }}
                  />
                </AnimatePresence>
              ) : (
                <AllClear />
              )}
            </div>

            <div className="mt-5">
              <CaptureBar
                onAdded={(count, ai) =>
                  showToast(
                    `${count === 1 ? "Added" : `Added ${count} tasks`}${ai ? " ✨ with AI" : ""}`,
                  )
                }
              />
            </div>

            {mounted && rest.length > 0 && (
              <section className="mt-8">
                <h3 className="mb-3 px-1 text-[12px] font-medium uppercase tracking-[0.14em] text-muted-soft">
                  Up next · {rest.length}
                </h3>
                <ul className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {rest.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        now={now}
                        onComplete={() => {
                          completeTask(task.id);
                          showToast("Done. The list just got lighter.");
                        }}
                        onSaveMe={() => setSaveTask(task)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            )}

            {/* Habits inline on phones/tablets */}
            {mounted && (
              <div className="xl:hidden">
                <HabitsStrip now={now} />
              </div>
            )}
          </div>

          {/* Right rail on large screens: habits live beside the list */}
          {mounted && (
            <aside className="mt-8 hidden xl:sticky xl:top-8 xl:mt-9 xl:block">
              <HabitsStrip now={now} variant="rail" />
            </aside>
          )}
        </div>
      )}

      {mounted && <ConnectionsBar onToast={showToast} />}

      <ArtifactPanel task={saveTask} onClose={() => setSaveTask(null)} onConfirm={onConfirm} />
      <ImportModal
        open={importOpen}
        initialTab={importTab}
        onClose={() => setImportOpen(false)}
        onImported={(t, b, msg) => {
          if (t.length) addTasks(t);
          if (b.length) addBusy(b);
          setImportOpen(false);
          showToast(msg);
        }}
      />
      <Toast message={toast} />
    </main>
  );
}

function Greeting({ ranked, now }: { ranked: RankedTask[]; now: number }) {
  const hour = new Date(now).getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const reds = ranked.filter((t) => t.radar === "red").length;
  const ambers = ranked.filter((t) => t.radar === "amber").length;

  let status = "You're in good shape — nothing's on fire.";
  if (reds > 0) status = `${reds} thing${reds > 1 ? "s" : ""} need${reds > 1 ? "" : "s"} you right now.`;
  else if (ambers > 0) status = `${ambers} ${ambers > 1 ? "are" : "is"} getting tight.`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <h1 className="text-[30px] leading-tight text-ink sm:text-[36px]">{part}, Arwin.</h1>
      <p className="mt-1 text-[16px] text-muted">{status}</p>
    </motion.div>
  );
}

function GreetingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-64 rounded-lg bg-surface-card" />
      <div className="mt-2 h-5 w-44 rounded-lg bg-surface-card" />
    </div>
  );
}

function HeroSkeleton() {
  return <div className="h-[280px] w-full animate-pulse rounded-[22px] border border-hairline bg-surface-card" />;
}

function AllClear() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-[22px] border border-hairline bg-canvas px-6 py-12 text-center"
    >
      <span
        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: "rgba(93,184,114,0.14)", color: "var(--color-radar-green)" }}
      >
        <PartyPopper size={22} />
      </span>
      <h2 className="text-[24px] text-ink">You're all clear.</h2>
      <p className="max-w-sm text-[15px] text-muted">
        Nothing's at risk right now. Add something below and Clutch will tell you exactly what to do
        first.
      </p>
    </motion.section>
  );
}

function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          className="fixed inset-x-0 bottom-6 z-40 mx-auto w-fit max-w-[90vw] rounded-full px-4 py-2.5 text-center text-[13.5px] font-medium text-white shadow-lg"
          style={{ background: "var(--color-surface-dark)" }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
