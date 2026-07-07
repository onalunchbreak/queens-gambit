"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Brain,
  Sparkles,
  RotateCcw,
  Play,
  Pause,
} from "lucide-react";
import { ChessBoard } from "./ChessBoard";
import { GameReview } from "./GameReview";
import { START_FEN } from "./useChessGame";
import { reviewPosition } from "./review-util";
import { cn } from "@/lib/utils";
import { AnnotationKind, ReviewResult } from "@/lib/chess/types";

interface AnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: ReviewResult | null;
  reviewLoading: boolean;
  analysis: string;
  analysisLoading: boolean;
  reviewIndex: number;
  history: string[];
  playerColor: "w" | "b";
  onChangeIndex: (i: number) => void;
  onRerunAnalysis: () => void;
}

export function AnalysisModal({
  open,
  onOpenChange,
  review,
  reviewLoading,
  analysis,
  analysisLoading,
  reviewIndex,
  history,
  playerColor,
  onChangeIndex,
  onRerunAnalysis,
}: AnalysisModalProps) {
  const [autoPlay, setAutoPlay] = useState(false);

  const sans = useMemo(
    () => (review ? review.annotations.map((a) => a.san) : history),
    [review, history],
  );

  const total = review?.annotations.length ?? sans.length;
  const idx = Math.max(0, Math.min(reviewIndex, total));

  const reviewPos = useMemo(() => {
    if (!review) return null;
    return reviewPosition(START_FEN, sans, review.annotations, idx);
  }, [review, sans, idx]);

  // Auto-play through moves.
  useEffect(() => {
    if (!open || !autoPlay) return;
    if (idx >= total) {
      const raf = requestAnimationFrame(() => setAutoPlay(false));
      return () => cancelAnimationFrame(raf);
    }
    const t = setTimeout(() => {
      onChangeIndex(Math.min(total, idx + 1));
    }, 1100);
    return () => clearTimeout(t);
  }, [open, autoPlay, idx, total, onChangeIndex]);

  // Stop auto-play when modal closes (async to satisfy lint rule).
  useEffect(() => {
    if (open) return;
    const raf = requestAnimationFrame(() => setAutoPlay(false));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const annotation = idx >= 1 && review ? review.annotations[idx - 1] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[97vw] sm:max-w-[min(97vw,1280px)] max-h-[94vh] gap-0 overflow-hidden p-0 sm:rounded-2xl">
        {/* Header */}
        <DialogHeader className="border-b border-border bg-gradient-to-r from-card to-muted/50 px-4 py-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2 min-w-0">
              <Brain className="h-5 w-5 text-primary shrink-0" />
              <DialogTitle className="font-serif text-base sm:text-lg font-semibold text-foreground truncate">
                Game Analysis
              </DialogTitle>
              {review && (
                <span className="hidden sm:inline rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shrink-0">
                  {total} moves
                </span>
              )}
            </div>
            {(reviewLoading || analysisLoading) && (
              <span className="text-xs text-muted-foreground italic shrink-0">
                {analysisLoading ? "Harmon is reviewing…" : "Computing review…"}
              </span>
            )}
          </div>
          <DialogDescription className="sr-only">
            Move-by-move replay with annotated markers and a coach&apos;s analysis of your game.
          </DialogDescription>
        </DialogHeader>

        {/* Body: scrolls on mobile, dual-pane on desktop */}
        <div className="flex max-h-[calc(94vh-52px)] flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          {/* ───── Left: replay board + controls ───── */}
          <div className="flex flex-col gap-2 p-3 md:w-[56%] md:shrink-0 md:overflow-y-auto md:border-r md:border-border">
            {/* Constrain the board so the controls below stay in view without scrolling. */}
            <div className="relative mx-auto w-full max-w-[380px]">
              {reviewPos ? (
                <ChessBoard
                  pieces={reviewPos.pieces}
                  lastMove={reviewPos.lastMove}
                  selected={null}
                  legalTargets={[]}
                  heatmap={[]}
                  showHeatmap={false}
                  turn="w"
                  inCheck={false}
                  checkSquare={null}
                  onSquareClick={() => {}}
                  moveNonce={idx}
                  reviewActive
                  reviewMarker={reviewPos.marker}
                  reviewArrow={reviewPos.arrow}
                  interactive={false}
                  animateMoves={false}
                  orientation={playerColor}
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
                  {reviewLoading ? "Building replay…" : "No review yet."}
                </div>
              )}
            </div>

            {/* Replay controls */}
            {review && (
              <div className="space-y-2 rounded-lg border border-border bg-card/60 p-2.5">
                {/* Button row — wraps on narrow screens */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setAutoPlay(false);
                      onChangeIndex(0);
                    }}
                    disabled={idx === 0}
                    title="Reset to start"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3"
                    onClick={() => {
                      setAutoPlay(false);
                      onChangeIndex(Math.max(0, idx - 1));
                    }}
                    disabled={idx === 0}
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => setAutoPlay((p) => !p)}
                    disabled={idx >= total}
                  >
                    {autoPlay ? (
                      <>
                        <Pause className="h-3.5 w-3.5" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" /> Play
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3"
                    onClick={() => {
                      setAutoPlay(false);
                      onChangeIndex(Math.min(total, idx + 1));
                    }}
                    disabled={idx >= total}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground px-1">
                    {idx} / {total}
                  </span>
                </div>
                <Slider
                  value={[idx]}
                  min={0}
                  max={total}
                  step={1}
                  onValueChange={(v) => {
                    setAutoPlay(false);
                    onChangeIndex(v[0]);
                  }}
                  className="mt-1"
                />
                {/* Current move annotation chip */}
                {annotation && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5">
                    <span
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-xs font-bold shrink-0",
                        KIND_BADGE[annotation.kind],
                      )}
                    >
                      {KIND_LABEL[annotation.kind]}
                    </span>
                    <span className="font-mono text-sm font-semibold text-foreground shrink-0">
                      {annotation.san}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {annotation.byColor === "w" ? "White" : "Black"}
                      {annotation.bestMoveSan && annotation.bestMoveSan !== annotation.san && (
                        <span className="ml-2 text-muted-foreground/70">
                          engine: <span className="font-mono font-medium">{annotation.bestMoveSan}</span>
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ───── Right: coach's analysis + move list ───── */}
          <div className="flex flex-col gap-3 p-3 md:w-[44%] md:min-h-0 md:overflow-y-auto">
            {/* Coach's analysis (LLM) — fills available space */}
            <div className="flex flex-col rounded-xl border border-primary/30 bg-gradient-to-br from-card to-muted/40 p-3 shadow-sm min-h-0">
              <div className="mb-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Coach&apos;s Analysis
                  </span>
                </div>
              </div>
              {analysisLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-3 animate-pulse rounded bg-muted"
                      style={{ width: `${92 - i * 7}%` }}
                    />
                  ))}
                </div>
              ) : analysis ? (
                <ScrollArea className="flex-1 min-h-0 max-h-[calc(94vh-280px)]">
                  <div className="space-y-2 pr-2">
                    {analysis.split(/\n\n+/).filter(Boolean).map((para, i) => (
                      <p key={i} className="text-[13px] leading-relaxed text-foreground/85">
                        {para}
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  Analysis will appear here automatically.
                </p>
              )}
              {analysis && !analysisLoading && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 px-2 text-xs shrink-0 self-start"
                  onClick={onRerunAnalysis}
                  disabled={analysisLoading || reviewLoading}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Re-run analysis
                </Button>
              )}
            </div>

            {/* Compact move list / review detail */}
            {review && (
              <GameReview
                review={review}
                reviewIndex={reviewIndex}
                onChangeIndex={(i) => {
                  setAutoPlay(false);
                  onChangeIndex(i);
                }}
                onClose={() => onOpenChange(false)}
                onReplay={() => onChangeIndex(0)}
                compact
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const KIND_LABEL: Record<AnnotationKind, string> = {
  brilliant: "Brilliant",
  best: "Best",
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
  book: "Book",
};

const KIND_BADGE: Record<AnnotationKind, string> = {
  brilliant: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  best: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  good: "bg-muted text-muted-foreground border-border",
  inaccuracy: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  mistake: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  blunder: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  book: "bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30",
};
