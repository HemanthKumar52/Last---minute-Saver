"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, ShieldCheck, Sparkles, Pencil } from "lucide-react";
import type { RankedTask, Artifact, ArtifactKind } from "@clutch/core";
import { fetchDraft } from "@/lib/ai/client";

type LoadedArtifact = Artifact & { ai?: boolean };

export interface ConfirmResult {
  kind: ArtifactKind;
  body: string;
  ai: boolean;
}

export function ArtifactPanel({
  task,
  onClose,
  onConfirm,
}: {
  task: RankedTask | null;
  onClose: () => void;
  onConfirm: (task: RankedTask, result: ConfirmResult) => void;
}) {
  return (
    <AnimatePresence>
      {task && <Inner key={task.id} task={task} onClose={onClose} onConfirm={onConfirm} />}
    </AnimatePresence>
  );
}

function Inner({
  task,
  onClose,
  onConfirm,
}: {
  task: RankedTask;
  onClose: () => void;
  onConfirm: (task: RankedTask, result: ConfirmResult) => void;
}) {
  const [art, setArt] = useState<LoadedArtifact | null>(null);
  const [shown, setShown] = useState(0);
  const [edited, setEdited] = useState("");
  const [editing, setEditing] = useState(false);

  // Fetch the deliverable (AI when configured, deterministic template otherwise).
  useEffect(() => {
    let alive = true;
    fetchDraft(task).then((a) => alive && setArt(a));
    return () => {
      alive = false;
    };
  }, [task]);

  // Stream it in ~2s once it arrives.
  useEffect(() => {
    if (!art) return;
    const L = art.body.length;
    const step = Math.max(2, Math.ceil(L / 90));
    const id = setInterval(() => {
      setShown((prev) => {
        const next = Math.min(L, prev + step);
        if (next >= L) clearInterval(id);
        return next;
      });
    }, 22);
    return () => clearInterval(id);
  }, [art]);

  const len = art?.body.length ?? 0;
  const done = !!art && shown >= len;

  useEffect(() => {
    if (done && art) setEdited((e) => e || art.body);
  }, [done, art]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const monospaced = art?.kind === "billSummary" || art?.kind === "outline";
  const visibleBody = art ? (done ? edited || art.body : art.body.slice(0, shown)) : "";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(20,20,19,0.45)", backdropFilter: "blur(2px)" }}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: 60, opacity: 0, scale: 0.99 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[22px] sm:max-w-[560px] sm:rounded-[22px]"
        style={{ background: "var(--color-surface-dark)", color: "var(--color-on-dark)" }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "rgba(204,120,92,0.18)", color: "var(--color-action)" }}
            >
              <Sparkles size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: "var(--color-on-dark)" }}>
                {done ? "Draft ready — your call" : "Clutch is drafting this for you…"}
                {done && art?.ai && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: "rgba(204,120,92,0.22)", color: "var(--color-action)" }}
                  >
                    AI-written
                  </span>
                )}
              </div>
              <div className="text-[12px]" style={{ color: "var(--color-on-dark-soft)" }}>
                {art?.heading ?? task.title}
              </div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5" style={{ color: "var(--color-on-dark-soft)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!art ? (
            <ShimmerLines />
          ) : editing && done ? (
            <textarea
              value={edited}
              onChange={(e) => setEdited(e.target.value)}
              autoFocus
              className="h-[44vh] w-full resize-none rounded-xl p-3 text-[13.5px] leading-relaxed outline-none"
              style={{
                background: "var(--color-surface-dark-soft)",
                color: "var(--color-on-dark)",
                fontFamily: monospaced ? "var(--font-mono)" : "var(--font-body)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
          ) : (
            <pre
              onClick={() => !done && setShown(len)}
              className="m-0 whitespace-pre-wrap break-words text-[13.5px] leading-relaxed"
              style={{
                fontFamily: monospaced ? "var(--font-mono)" : "var(--font-body)",
                color: "var(--color-on-dark)",
                cursor: done ? "default" : "pointer",
              }}
            >
              {visibleBody}
              {!done && <span className="animate-pulse" style={{ color: "var(--color-action)" }}>▍</span>}
            </pre>
          )}
        </div>

        {/* Grounding */}
        <AnimatePresence>
          {done && art && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-1.5 px-5 pb-3"
            >
              <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--color-on-dark-soft)" }}>
                <ShieldCheck size={13} /> grounded in
              </span>
              {art.grounding.map((g) => (
                <span
                  key={g}
                  className="rounded-md px-2 py-0.5 text-[11px]"
                  style={{ background: "rgba(250,249,245,0.10)", color: "var(--color-on-dark)" }}
                >
                  {g}
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span className="text-[11.5px]" style={{ color: "var(--color-on-dark-soft)" }}>
            You review before anything is sent. Nothing happens automatically.
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setEditing((v) => !v)}
              disabled={!done}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-opacity disabled:opacity-30"
              style={{ background: "var(--color-surface-dark-elevated)", color: "var(--color-on-dark)" }}
            >
              <Pencil size={14} />
              {editing ? "Preview" : "Edit"}
            </button>
            <button
              onClick={() =>
                art && onConfirm(task, { kind: art.kind, body: edited || art.body, ai: !!art.ai })
              }
              disabled={!done}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-40"
              style={{ background: "var(--color-action)" }}
            >
              <Check size={15} />
              {art?.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ShimmerLines() {
  const widths = ["92%", "78%", "85%", "60%", "70%", "45%"];
  return (
    <div className="flex flex-col gap-2.5 py-1">
      {widths.map((w, i) => (
        <div
          key={i}
          className="h-3.5 animate-pulse rounded"
          style={{ width: w, background: "rgba(250,249,245,0.10)", animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}
