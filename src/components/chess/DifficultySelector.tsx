"use client";

import { cn } from "@/lib/utils";
import { DIFFICULTIES, Difficulty } from "@/lib/chess/types";
import { motion } from "framer-motion";

interface DifficultySelectorProps {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
  disabled?: boolean;
}

// Each level is distinguished by the number of filled rank pips (chevrons)
// rather than garish colors. A single accent ring marks the active card.
const PIP_COUNT: Record<Difficulty, number> = {
  novice: 1,
  club: 2,
  master: 3,
};

export function DifficultySelector({ value, onChange, disabled }: DifficultySelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {DIFFICULTIES.map((d) => {
        const active = value === d.id;
        const pips = PIP_COUNT[d.id];
        return (
          <motion.button
            key={d.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(d.id)}
            whileHover={disabled ? undefined : { y: -2 }}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            className={cn(
              "relative flex flex-col items-center gap-1.5 rounded-lg border bg-card/80 px-2 py-2.5 text-center transition-all",
              active
                ? "border-primary shadow-sm ring-1 ring-primary/40"
                : "border-border opacity-65 hover:opacity-100 hover:border-muted-foreground/40",
              disabled && "cursor-not-allowed opacity-50",
            )}
            aria-pressed={active}
          >
            {/* Rank pips — small chevrons stacked, filled count = level */}
            <div className="flex items-end gap-0.5 h-4" aria-hidden>
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-1 rounded-sm transition-colors",
                    i < pips ? "bg-primary" : "bg-muted-foreground/25",
                  )}
                  style={{ height: `${6 + i * 3}px` }}
                />
              ))}
            </div>
            <span className="text-[12.5px] font-semibold leading-tight text-card-foreground">
              {d.label}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">{d.elo}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

// Compact inline variant for the navbar — small pill buttons with pips.
export function DifficultySelectorCompact({
  value,
  onChange,
  disabled,
}: DifficultySelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {DIFFICULTIES.map((d) => {
        const active = value === d.id;
        const pips = PIP_COUNT[d.id];
        return (
          <button
            key={d.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(d.id)}
            aria-pressed={active}
            title={`${d.label} (${d.elo})`}
            className={cn(
              "flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span className="flex items-end gap-[1px] h-2.5" aria-hidden>
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-[2px] rounded-sm",
                    i < pips ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                  style={{ height: `${4 + i * 2}px` }}
                />
              ))}
            </span>
            <span className="hidden sm:inline">{d.label}</span>
          </button>
        );
      })}
    </div>
  );
}
