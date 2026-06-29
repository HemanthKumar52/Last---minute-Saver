"use client";

import { useEffect, useState } from "react";

/** True after first client mount — used to gate time-dependent UI and avoid hydration mismatch. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * Current epoch ms, refreshed on an interval. Use a coarse interval (e.g. 15s) for
 * ranking stability and a fine one (1s) only inside ticking countdowns.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
