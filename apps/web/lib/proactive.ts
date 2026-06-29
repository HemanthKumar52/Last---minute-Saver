"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RankedTask } from "@clutch/core";

type Perm = NotificationPermission | "unsupported";

export function useNotifications() {
  const [perm, setPerm] = useState<Perm>("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission);
  }, []);

  const request = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPerm(p);
  }, []);

  return { perm, request };
}

/**
 * Fire a single browser notification when a task crosses into RED — the proactive,
 * context-aware reminder (only the genuinely critical task, never clock-spam).
 */
export function useRedAlert(top: RankedTask | null, enabled: boolean) {
  const lastId = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !top || top.radar !== "red") return;
    if (lastId.current === top.id) return;
    lastId.current = top.id;
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("⚡ Clutch — act now", { body: `${top.title}\n${top.reason}` });
      }
    } catch {
      // ignore
    }
  }, [top, enabled]);
}
