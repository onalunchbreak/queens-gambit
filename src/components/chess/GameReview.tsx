"use client";

import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Sparkles, AlertTriangle } from "lucide-react";
import { AnnotationKind, ReviewResult } from "@/lib/chess/types";
import { cn } from "@/lib/utils";

const KIND_META: Record<AnnotationKind, { label: string; color: string; bg: string }> = {
  brilliant: { label: "Brilliant", color: "#1caa6b", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  best: { label: "Best move", color: "#2a8fd4", bg: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30" },
  good: { label: "Good", color: "#7d8a99", bg: "bg-muted text-muted-foreground border-border" },
  inaccuracy: { label: "Inaccuracy", color: "#e0b13a", bg: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  mistake: { label: "Mistake", color: "#e8833a", bg: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30" },
  blunder: { label: "Blunder", color: "#d23b3b", bg: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30" },
  book: { label: "Book", color: "#8a6d3b", bg: "bg-muted text-muted-foreground border-border" },
};

interface GameReviewProps {
  review: ReviewResult;
  reviewIndex: number;
  onChangeIndex: (i: number) => void;
  onClose: () => void;
  onReplay: () => void;
}

export function GameReview({ review, reviewIndex, onChangeIndex, onClose, onReplay }: GameReviewProps) {
  const total = review.annotations.length;
  const idx = Math.max(0, Math.min(reviewIndex, total));
  const annotation = idx >= 1 && idx <= total ? review.annotations[idx - 1] : null;

  const evalBefore = annotation ? annotation.evalBefore : 0;
  const evalAfter = annotation ? annotation.evalAfter : review.finalEval;
  const delta = annotation ? (annotation.evalAfter - annotation.evalBefore) * (annotation.byColor === "w" ? 1 : -1) : 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/90 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Post-Game Review</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onReplay} className="h-7 text-xs">
            Replay
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* summary */}
      <p className="text-xs text-muted-foreground leading-relaxed">{review.summary}</p>

      {/* slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Move {idx === 0 ? "—" : `${annotation?.san ?? ""}`}</span>
          <span className="tabular-nums">{idx} / {total}</span>
        </div>
        <Slider
          value={[idx]}
          min={0}
          max={total}
          step={1}
          onValueChange={(v) => onChangeIndex(v[0])}
        />
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            onClick={() => onChangeIndex(Math.max(0, idx - 1))}
            disabled={idx === 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            onClick={() => onChangeIndex(Math.min(total, idx + 1))}
            disabled={idx === total}
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* current annotation detail */}
      {annotation ? (
        <div className="rounded-lg border border-border bg-muted/70 p-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn("rounded-md border px-2 py-0.5 text-xs font-bold", KIND_META[annotation.kind].bg)}
              >
                {annotation.kind === "blunder" || annotation.kind === "mistake" ? (
                  <AlertTriangle className="inline h-3 w-3 mr-1 -mt-0.5" />
                ) : null}
                {KIND_META[annotation.kind].label}
              </span>
              <span className="font-mono font-semibold text-foreground">{annotation.san}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {annotation.byColor === "w" ? "White" : "Black"}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
            <span>Before: {fmtCp(evalBefore)}</span>
            <span>After: {fmtCp(evalAfter)}</span>
            <span className={delta < -50 ? "text-rose-600 font-medium" : delta > 50 ? "text-emerald-600 font-medium" : ""}>
              ({delta >= 0 ? "+" : ""}{(delta / 100).toFixed(1)})
            </span>
          </div>
          {annotation.bestMoveSan && annotation.bestMoveSan !== annotation.san && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Engine suggests <span className="font-mono font-semibold text-foreground">{annotation.bestMoveSan}</span> instead.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 p-2.5 text-xs text-muted-foreground">
          {idx === 0 ? "Starting position. Drag the slider to walk through the game." : "Final position."}
        </div>
      )}

      {/* legend */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {(["brilliant", "best", "good", "inaccuracy", "mistake", "blunder"] as AnnotationKind[]).map((k) => (
          <span key={k} className={cn("rounded border px-1.5 py-0.5", KIND_META[k].bg)}>
            {KIND_META[k].label}
          </span>
        ))}
      </div>
    </div>
  );
}

function fmtCp(cp: number): string {
  if (Math.abs(cp) >= 99000) {
    return `M${Math.max(1, Math.round((100000 - Math.abs(cp)) / 100))}`;
  }
  return `${cp >= 0 ? "+" : ""}${(cp / 100).toFixed(1)}`;
}
