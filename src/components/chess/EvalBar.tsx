"use client";

import { motion } from "framer-motion";

interface EvalBarProps {
  /** 0..1 probability that white is winning */
  prob: number;
  evalCp: number;
  label: string;
  gameOver: boolean;
}

export function EvalBar({ prob, evalCp, label, gameOver }: EvalBarProps) {
  const whitePct = Math.max(0.02, Math.min(0.98, prob)) * 100;

  // Format the eval number for display.
  const mateThreshold = 99000;
  const isMate = Math.abs(evalCp) >= mateThreshold;
  const evalText = isMate
    ? `M${Math.max(1, Math.round((100000 - Math.abs(evalCp)) / 100))}`
    : `${evalCp >= 0 ? "+" : ""}${(evalCp / 100).toFixed(1)}`;

  return (
    <div className="flex items-stretch gap-2">
      <div
        className="relative w-5 sm:w-6 rounded-md overflow-hidden border border-black/30 shadow-inner"
        style={{ height: 220, background: "#1b140d" }}
        aria-label="Evaluation bar"
      >
        <motion.div
          className="absolute left-0 right-0 bottom-0"
          style={{
            background: "linear-gradient(180deg, #fbf3df 0%, #efe2c2 100%)",
          }}
          initial={false}
          animate={{ height: `${whitePct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        {/* center line */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-black/40" />
        {/* eval text */}
        <div
          className="absolute left-0 right-0 text-center text-[10px] font-bold tracking-tight"
          style={{
            top: whitePct > 50 ? "6px" : "auto",
            bottom: whitePct > 50 ? "auto" : "6px",
            color: whitePct > 50 ? "#3a2a18" : "#f3ead4",
          }}
        >
          {evalText}
        </div>
      </div>
      <div className="flex flex-col justify-between py-1 text-xs">
        <div>
          <div className="font-semibold text-[11px] uppercase tracking-wider text-amber-800/80">
            Black
          </div>
          <div className="text-[11px] text-muted-foreground">Harmon AI</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-[11px] leading-tight">{label}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-[11px] uppercase tracking-wider text-emerald-700/80">
            White
          </div>
          <div className="text-[11px] text-muted-foreground">
            {gameOver ? "Done" : "You"}
          </div>
        </div>
      </div>
    </div>
  );
}
