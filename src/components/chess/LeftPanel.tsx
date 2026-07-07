"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoveHistory } from "./MoveHistory";
import { ThinkingIndicator } from "./ThinkingIndicator";
import {
  RotateCcw,
  Flame,
  Crown,
  Brain,
  MessageSquareQuote,
  Flag,
} from "lucide-react";
import { GameState } from "./useChessGame";

interface LeftPanelProps {
  state: GameState;
  reviewActive: boolean;
  onNewGame: () => void;
  onUndo: () => void;
  onAnalyse: () => void;
  onResign: () => void;
  onJump: (ply: number) => void;
  onViewAnalysis: () => void;
}

/**
 * Left side panel: Harmon's last move / thinking indicator, move history,
 * game controls (New/Undo/Analyse/Resign), and the game-over banner.
 */
export function LeftPanel({
  state,
  reviewActive,
  onNewGame,
  onUndo,
  onAnalyse,
  onResign,
  onJump,
  onViewAnalysis,
}: LeftPanelProps) {
  return (
    <aside className="order-2 flex flex-col gap-3 xl:order-1 xl:w-[280px] shrink-0">
      {/* Harmon's last move / thinking */}
      <div className="rounded-xl border border-border bg-card/80 p-3 shadow-sm">
        <AnimatePresence mode="wait">
          {state.isAiThinking ? (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ThinkingIndicator difficulty={state.difficulty} />
            </motion.div>
          ) : state.explanation ? (
            <motion.div
              key="explanation"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-1.5"
            >
              <div className="flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Harmon&apos;s last move
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground font-mono">
                  {state.history.length > 0 ? state.history[state.history.length - 1] : ""}
                </Badge>
                <span className="text-sm font-semibold text-foreground">
                  {state.explanation.short}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {state.narrationLoading
                  ? state.explanation.detail
                  : state.narration || state.explanation.detail}
              </p>
              {state.narration && !state.narrationLoading && (
                <p className="flex items-start gap-1 text-xs italic text-muted-foreground/70">
                  <MessageSquareQuote className="h-3 w-3 mt-0.5 shrink-0" />
                  {state.narration}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-3 text-center text-xs text-muted-foreground"
            >
              <Crown className="mx-auto mb-1 h-4 w-4 text-primary/60" />
              {state.playerColor === "w"
                ? "White to move. Make your opening."
                : "Harmon opens with White. Prepare your defense."}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Move history */}
      <div className="rounded-xl border border-border bg-card/80 p-3 shadow-sm flex-1 min-h-0">
        <MoveHistory
          sans={state.history}
          reviewActive={reviewActive}
          reviewIndex={state.reviewIndex}
          onJump={onJump}
        />
      </div>

      {/* Game controls */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-8" onClick={onNewGame} disabled={state.isAiThinking}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> New
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={onUndo} disabled={state.isAiThinking || state.history.length < 2}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Undo
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={onAnalyse} disabled={state.isAiThinking || state.history.length === 0}>
          <Flame className="h-3.5 w-3.5 mr-1" />
          {state.analysisLoading || state.reviewLoading ? "Analyzing…" : "Analyse"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-rose-400/60 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          onClick={onResign}
          disabled={state.isAiThinking || state.gameOver}
        >
          <Flag className="h-3.5 w-3.5 mr-1" /> Resign
        </Button>
      </div>

      {/* Game over banner */}
      <AnimatePresence>
        {state.gameOver && !state.review && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={
              state.winner === "player"
                ? "rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-card p-3 text-center shadow-md"
                : state.winner === "ai"
                  ? "rounded-xl border border-rose-400/40 bg-gradient-to-br from-rose-500/10 to-card p-3 text-center shadow-md"
                  : "rounded-xl border border-primary/30 bg-gradient-to-br from-card to-muted p-3 text-center shadow-md"
            }
          >
            <Crown
              className={
                "mx-auto mb-1 h-5 w-5 " +
                (state.winner === "player"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : state.winner === "ai"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-primary")
              }
            />
            <p className="text-sm font-semibold text-foreground">{state.gameResult}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {state.saved ? "Saved to the leaderboard." : "Game recorded."}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-8"
              onClick={onViewAnalysis}
              disabled={state.reviewLoading || state.analysisLoading}
            >
              <Flame className="h-3.5 w-3.5 mr-1" />
              {state.analysisLoading || state.reviewLoading ? "Analyzing…" : "View Analysis"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
