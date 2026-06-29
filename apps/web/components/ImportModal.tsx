"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Upload, Sparkles, CalendarDays, FileText, Loader2, Mail } from "lucide-react";
import type { TaskInput, BusyInterval } from "@clutch/core";
import { extractTasks } from "@/lib/ai/client";
import { importIcs, importNotion, scanImapMailbox } from "@/lib/integrations/client";
import { fileToText } from "@/lib/files";
import { cn } from "@/lib/cn";

type Tab = "paste" | "calendar" | "notion" | "imap";

export function ImportModal({
  open,
  onClose,
  onImported,
  initialTab = "paste",
}: {
  open: boolean;
  onClose: () => void;
  onImported: (tasks: TaskInput[], busy: BusyInterval[], message: string) => void;
  initialTab?: Tab;
}) {
  return (
    <AnimatePresence>
      {open && <Inner onClose={onClose} onImported={onImported} initialTab={initialTab} />}
    </AnimatePresence>
  );
}

function Inner({
  onClose,
  onImported,
  initialTab,
}: {
  onClose: () => void;
  onImported: (tasks: TaskInput[], busy: BusyInterval[], message: string) => void;
  initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [db, setDb] = useState("");
  const [imap, setImap] = useState({ host: "", port: "", user: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const t = await fileToText(file);
      setText((prev) => (prev ? `${prev}\n${t}` : t));
    } catch {
      setError("Couldn't read that file — paste the text instead.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const doPaste = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    const { tasks, ai } = await extractTasks(text.trim());
    setBusy(false);
    if (!tasks.length) {
      setError("Couldn't find any tasks in that.");
      return;
    }
    onImported(tasks, [], `Imported ${tasks.length} task${tasks.length > 1 ? "s" : ""}${ai ? " ✨" : ""}`);
  };

  const doIcs = async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await importIcs(url.trim());
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onImported(res.tasks, res.busy, `Imported ${res.count} calendar event${res.count === 1 ? "" : "s"}`);
  };

  const doNotion = async () => {
    if (!token.trim() || !db.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await importNotion(token.trim(), db.trim());
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onImported(res.tasks, [], `Imported ${res.count} task${res.count === 1 ? "" : "s"} from Notion`);
  };

  const doImap = async () => {
    if (!imap.host.trim() || !imap.user.trim() || !imap.password || busy) return;
    setBusy(true);
    setError(null);
    const res = await scanImapMailbox({
      host: imap.host.trim(),
      port: imap.port.trim() ? Number(imap.port.trim()) : undefined,
      user: imap.user.trim(),
      password: imap.password,
    });
    if (res.error && !res.emails.length) {
      setBusy(false);
      setError(res.error);
      return;
    }
    if (!res.emails.length) {
      setBusy(false);
      setError("No recent messages found in that mailbox.");
      return;
    }
    const { tasks, ai } = await extractTasks(res.emails.join("\n"));
    setBusy(false);
    if (!tasks.length) {
      setError("Scanned your mail but found no deadlines to act on.");
      return;
    }
    onImported(tasks, [], `Found ${tasks.length} task${tasks.length > 1 ? "s" : ""} in your inbox${ai ? " ✨" : ""}`);
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "paste", label: "Paste / Upload", icon: <FileText size={14} /> },
    { key: "calendar", label: "Calendar (.ics)", icon: <CalendarDays size={14} /> },
    { key: "notion", label: "Notion", icon: <Sparkles size={14} /> },
    { key: "imap", label: "Email (IMAP)", icon: <Mail size={14} /> },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" style={{ background: "rgba(20,20,19,0.4)" }} />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: 40, opacity: 0, scale: 0.99 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="relative flex w-full flex-col rounded-t-[22px] border border-hairline bg-canvas sm:max-w-[520px] sm:rounded-[22px]"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-[20px] text-ink">Import tasks</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-surface-soft">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setError(null);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                tab === t.key ? "bg-surface-card text-ink" : "text-muted hover:bg-surface-soft",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4">
          {tab === "paste" && (
            <div className="flex flex-col gap-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste an email, your notes, a bill, or a syllabus… Clutch's agents will pull out the tasks and deadlines."
                className="h-40 w-full resize-none rounded-xl border border-hairline bg-canvas p-3 text-[14px] text-ink outline-none placeholder:text-muted-soft focus:border-action"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-hairline px-3 py-2 text-[13px] font-medium text-muted hover:bg-surface-soft"
                >
                  <Upload size={14} />
                  Upload file
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.md,.csv,.json,.ics,.pdf"
                  onChange={onFile}
                  className="hidden"
                />
                <button
                  onClick={doPaste}
                  disabled={!text.trim() || busy}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  style={{ background: "var(--color-action)" }}
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  Extract tasks
                </button>
              </div>
            </div>
          )}

          {tab === "calendar" && (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-muted">
                Paste a secret <span className="font-medium text-ink">.ics</span> URL from Outlook,
                Apple, Notion, or your LMS. Deadlines become tasks; meetings become busy time the
                planner avoids.
              </p>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…/basic.ics"
                className="w-full rounded-xl border border-hairline bg-canvas p-3 text-[14px] text-ink outline-none placeholder:text-muted-soft focus:border-action"
              />
              <button
                onClick={doIcs}
                disabled={!url.trim() || busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                style={{ background: "var(--color-action)" }}
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <CalendarDays size={15} />}
                Import feed
              </button>
            </div>
          )}

          {tab === "notion" && (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-muted">
                Connect a Notion database (with a title + a date property). Create an integration token
                at notion.so/my-integrations and share the database with it.
              </p>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Notion integration token (secret_…)"
                className="w-full rounded-xl border border-hairline bg-canvas p-3 text-[14px] text-ink outline-none placeholder:text-muted-soft focus:border-action"
              />
              <input
                value={db}
                onChange={(e) => setDb(e.target.value)}
                placeholder="Database ID"
                className="w-full rounded-xl border border-hairline bg-canvas p-3 text-[14px] text-ink outline-none placeholder:text-muted-soft focus:border-action"
              />
              <button
                onClick={doNotion}
                disabled={!token.trim() || !db.trim() || busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                style={{ background: "var(--color-action)" }}
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                Import from Notion
              </button>
            </div>
          )}

          {tab === "imap" && (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-muted">
                Scan any inbox over IMAP — Gmail, iCloud, Fastmail, Outlook, or your work server.
                Use an <span className="font-medium text-ink">app password</span>, not your login.
                Credentials are used for this one scan and never stored.
              </p>
              <input
                value={imap.host}
                onChange={(e) => setImap((s) => ({ ...s, host: e.target.value }))}
                placeholder="IMAP host (e.g. imap.gmail.com)"
                className="w-full rounded-xl border border-hairline bg-canvas p-3 text-[14px] text-ink outline-none placeholder:text-muted-soft focus:border-action"
              />
              <div className="flex gap-2">
                <input
                  value={imap.user}
                  onChange={(e) => setImap((s) => ({ ...s, user: e.target.value }))}
                  placeholder="Email address"
                  className="min-w-0 flex-1 rounded-xl border border-hairline bg-canvas p-3 text-[14px] text-ink outline-none placeholder:text-muted-soft focus:border-action"
                />
                <input
                  value={imap.port}
                  onChange={(e) => setImap((s) => ({ ...s, port: e.target.value }))}
                  inputMode="numeric"
                  placeholder="993"
                  className="w-20 rounded-xl border border-hairline bg-canvas p-3 text-[14px] text-ink outline-none placeholder:text-muted-soft focus:border-action"
                />
              </div>
              <input
                value={imap.password}
                onChange={(e) => setImap((s) => ({ ...s, password: e.target.value }))}
                type="password"
                placeholder="App password"
                className="w-full rounded-xl border border-hairline bg-canvas p-3 text-[14px] text-ink outline-none placeholder:text-muted-soft focus:border-action"
              />
              <button
                onClick={doImap}
                disabled={!imap.host.trim() || !imap.user.trim() || !imap.password || busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                style={{ background: "var(--color-action)" }}
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                Scan inbox
              </button>
            </div>
          )}

          {error && <p className="mt-3 text-[13px]" style={{ color: "var(--color-radar-red)" }}>{error}</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}
