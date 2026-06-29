"use client";

import { useState } from "react";
import { Plus, Sparkles, Mic, Loader2 } from "lucide-react";
import { extractTasks } from "@/lib/ai/client";
import { useDictation, useSpeechSupported } from "@/lib/voice";
import { useTaskStore } from "@/lib/data/store";
import { cn } from "@/lib/cn";

export function CaptureBar({ onAdded }: { onAdded?: (count: number, ai: boolean) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const addTasks = useTaskStore((s) => s.addTasks);
  const speechOk = useSpeechSupported();
  const { listening, start, stop } = useDictation((t) => setValue((v) => (v ? `${v} ${t}` : t)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const { tasks, ai } = await extractTasks(text);
      if (tasks.length) {
        addTasks(tasks);
        onAdded?.(tasks.length, ai);
      }
      setValue("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-2xl border border-hairline bg-canvas px-3 py-2 transition-colors focus-within:border-action"
      style={{ boxShadow: "0 1px 2px rgba(20,20,19,0.03)" }}
    >
      {busy ? (
        <Loader2 size={16} className="shrink-0 animate-spin text-action" />
      ) : (
        <Sparkles size={16} className="shrink-0 text-action" />
      )}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={busy}
        placeholder="Add anything — “Pay rent tomorrow 5pm”, “Email prof tonight”…"
        aria-label="Add a task"
        className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] text-ink outline-none placeholder:text-muted-soft disabled:opacity-60"
      />
      {speechOk && (
        <button
          type="button"
          onClick={listening ? stop : start}
          aria-label={listening ? "Stop dictation" : "Dictate a task"}
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            listening ? "text-white" : "text-muted hover:bg-surface-soft",
          )}
          style={listening ? { background: "var(--color-radar-red)" } : undefined}
        >
          <Mic size={16} className={listening ? "animate-pulse" : undefined} />
        </button>
      )}
      <button
        type="submit"
        disabled={!value.trim() || busy}
        className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-30"
      >
        {busy ? "Adding…" : <><Plus size={15} />Add</>}
      </button>
    </form>
  );
}
