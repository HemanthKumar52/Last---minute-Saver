"use client";

import { motion } from "motion/react";
import { Zap } from "lucide-react";
import { saveMeColor } from "@clutch/tokens";
import { cn } from "@/lib/cn";

/**
 * The hero action. Background interpolates coral → red with `urgency` (0..1), and
 * a soft halo pulses once urgency is high — the color itself encodes how close the
 * deadline is. Spring press, GPU-only transforms.
 */
export function SaveMeButton({
  urgency,
  onClick,
  label = "Save Me",
  size = "lg",
}: {
  urgency: number;
  onClick: () => void;
  label?: string;
  size?: "md" | "lg";
}) {
  const bg = saveMeColor(urgency);
  const high = urgency > 0.6;
  const dims = size === "lg" ? "px-6 py-3.5 text-[15px]" : "px-4 py-2.5 text-sm";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-xl font-medium text-white outline-none select-none",
        dims,
      )}
      style={{ background: bg, boxShadow: `0 8px 24px -8px ${bg}` }}
    >
      {high && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-2xl"
          style={{ background: bg, filter: "blur(10px)" }}
          animate={{ opacity: [0.45, 0.05, 0.45], scale: [1, 1.06, 1] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <Zap size={size === "lg" ? 18 : 16} fill="currentColor" className="relative" />
      <span className="relative">{label}</span>
    </motion.button>
  );
}
