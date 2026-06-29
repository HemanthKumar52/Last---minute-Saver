"use client";

import { useEffect, useState } from "react";
import { Sparkles, Calendar, BellRing, Check, RefreshCw, Inbox, Mail } from "lucide-react";
import type { BusyInterval } from "@clutch/core";
import { fetchAiStatus, extractTasks, type AiStatus } from "@/lib/ai/client";
import {
  googleStatus,
  connectGoogle,
  syncCalendar,
  scanInbox,
  type GoogleStatus,
} from "@/lib/google/client";
import {
  microsoftStatus,
  connectMicrosoft,
  syncMicrosoftCalendar,
  scanMicrosoftInbox,
  type MicrosoftStatus,
} from "@/lib/microsoft/client";
import { useNotifications } from "@/lib/proactive";
import { useTaskStore } from "@/lib/data/store";

type Work = "g-sync" | "g-scan" | "ms-sync" | "ms-scan" | null;

export function ConnectionsBar({ onToast }: { onToast: (m: string) => void }) {
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [g, setG] = useState<GoogleStatus | null>(null);
  const [ms, setMs] = useState<MicrosoftStatus | null>(null);
  const [working, setWorking] = useState<Work>(null);
  const { perm, request } = useNotifications();
  const addBusy = useTaskStore((s) => s.addBusy);
  const addTasks = useTaskStore((s) => s.addTasks);

  useEffect(() => {
    fetchAiStatus().then(setAi);
    googleStatus().then(setG);
    microsoftStatus().then(setMs);
  }, []);

  const runSync = async (
    key: "g-sync" | "ms-sync",
    fn: () => Promise<{ busy: BusyInterval[]; simulated: boolean }>,
    who: string,
  ) => {
    setWorking(key);
    const { busy, simulated } = await fn();
    if (busy.length) addBusy(busy);
    setWorking(null);
    onToast(
      simulated
        ? `Connect ${who} to sync real free/busy`
        : `✓ Synced ${busy.length} busy block${busy.length === 1 ? "" : "s"} from ${who}`,
    );
  };

  const runScan = async (
    key: "g-scan" | "ms-scan",
    fn: () => Promise<{ emails: string[]; simulated: boolean }>,
    who: string,
  ) => {
    setWorking(key);
    const { emails, simulated } = await fn();
    if (emails.length) {
      const { tasks } = await extractTasks(emails.join("\n"));
      if (tasks.length) addTasks(tasks);
      setWorking(null);
      onToast(`✓ Found ${tasks.length} task${tasks.length === 1 ? "" : "s"} in your ${who} inbox`);
      return;
    }
    setWorking(null);
    onToast(simulated ? `Connect ${who} to scan your inbox` : "No new deadlines found in recent mail");
  };

  return (
    <section className="mt-8 flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-soft px-3 py-2.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-soft">Connections</span>

      <Chip icon={<Sparkles size={13} />} on={!!ai?.configured} label={ai?.configured ? `AI · ${ai.model}` : "AI · built-in engine"} />

      {/* Google */}
      {g?.connected ? (
        <>
          <Chip icon={<Check size={13} />} on label="Google · connected" />
          <ActionChip icon={<RefreshCw size={13} />} label="Sync calendar" loading={working === "g-sync"} onClick={() => runSync("g-sync", () => syncCalendar(5), "Google")} />
          <ActionChip icon={<Inbox size={13} />} label="Scan inbox" loading={working === "g-scan"} onClick={() => runScan("g-scan", scanInbox, "Google")} />
        </>
      ) : g?.configured ? (
        <ConnectButton icon={<Calendar size={13} />} label="Connect Google" onClick={connectGoogle} />
      ) : (
        <Chip icon={<Calendar size={13} />} on={false} label="Google · demo mode" />
      )}

      {/* Microsoft 365 */}
      {ms?.connected ? (
        <>
          <Chip icon={<Check size={13} />} on label="Microsoft · connected" />
          <ActionChip icon={<RefreshCw size={13} />} label="Sync calendar" loading={working === "ms-sync"} onClick={() => runSync("ms-sync", () => syncMicrosoftCalendar(5), "Microsoft")} />
          <ActionChip icon={<Inbox size={13} />} label="Scan inbox" loading={working === "ms-scan"} onClick={() => runScan("ms-scan", scanMicrosoftInbox, "Microsoft")} />
        </>
      ) : ms?.configured ? (
        <ConnectButton icon={<Mail size={13} />} label="Connect Microsoft" onClick={connectMicrosoft} />
      ) : (
        <Chip icon={<Mail size={13} />} on={false} label="Microsoft · demo mode" />
      )}

      {perm === "granted" ? (
        <Chip icon={<BellRing size={13} />} on label="Reminders · on" />
      ) : perm === "unsupported" ? null : (
        <button
          type="button"
          onClick={request}
          className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-canvas"
        >
          <BellRing size={13} />
          Enable reminders
        </button>
      )}
    </section>
  );
}

function Chip({ icon, label, on }: { icon: React.ReactNode; label: string; on: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium"
      style={on ? { background: "rgba(93,184,114,0.14)", color: "#3f8a52" } : { background: "rgba(20,20,19,0.04)", color: "var(--color-muted)" }}
    >
      {icon}
      {label}
    </span>
  );
}

function ConnectButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-action px-2.5 py-1 text-[12px] font-medium text-action transition-colors hover:bg-canvas"
    >
      {icon}
      {label}
    </button>
  );
}

function ActionChip({
  icon,
  label,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-canvas disabled:opacity-50"
    >
      <span className={loading ? "animate-spin" : undefined}>{icon}</span>
      {label}
    </button>
  );
}
