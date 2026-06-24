"use client";

import { cn } from "@/lib/utils";
import { DIFFICULTIES, Difficulty } from "@/lib/chess/types";
import { motion } from "framer-motion";

interface DifficultySelectorProps {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
  disabled?: boolean;
}

const RANK_STYLES: Record<Difficulty, { ring: string; badge: string; active: string }> = {
  novice: {
    ring: "border-emerald-300",
    badge: "bg-emerald-600 text-white",
    active: "ring-2 ring-emerald-500 bg-emerald-50",
  },
  club: {
    ring: "border-amber-300",
    badge: "bg-amber-600 text-white",
    active: "ring-2 ring-amber-500 bg-amber-50",
  },
  master: {
    ring: "border-rose-400",
    badge: "bg-gradient-to-br from-rose-700 to-rose-900 text-amber-100",
    active: "ring-2 ring-rose-500 bg-rose-50",
  },
};

export function DifficultySelector({ value, onChange, disabled }: DifficultySelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {DIFFICULTIES.map((d) => {
        const active = value === d.id;
        const s = RANK_STYLES[d.id];
        return (
          <motion.button
            key={d.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(d.id)}
            whileHover={disabled ? undefined : { y: -2 }}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-lg border-2 bg-white/80 px-2 py-2 text-center transition-colors",
              s.ring,
              active ? s.active : "opacity-70 hover:opacity-100",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {/* rank badge */}
            <span
              className={cn(
                "absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold shadow-md",
                s.badge,
              )}
            >
              {d.rank}
            </span>
            <span className="text-[13px] font-semibold text-stone-800">{d.label}</span>
            <span className="text-[10px] text-muted-foreground">{d.elo}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
