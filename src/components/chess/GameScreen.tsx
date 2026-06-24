"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Chess } from "chess.js";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw,
  Flame,
  LayoutGrid,
  Volume2,
  VolumeX,
  Crown,
  Brain,
  MessageSquareQuote,
  Flag,
} from "lucide-react";
import { ChessBoard } from "./ChessBoard";
import { EvalBar } from "./EvalBar";
import { MoveHistory } from "./MoveHistory";
import { DifficultySelector } from "./DifficultySelector";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { GameReview } from "./GameReview";
import { Confetti } from "./Confetti";
import { Leaderboard } from "./Leaderboard";
import { ThemeToggle } from "@/components/theme-toggle";
import { useChessGame, START_FEN } from "./useChessGame";
import { reviewPosition } from "./review-util";
import { soundManager } from "./sounds";
import { Difficulty } from "@/lib/chess/types";

interface GameScreenProps {
  playerName: string;
  initialDifficulty: Difficulty;
  onExit: () => void;
}

const FONT_STACK =
  '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "Noto Sans Symbols", "DejaVu Sans", sans-serif';

const PROMO_PIECES: { kind: "q" | "r" | "b" | "n"; glyph: string }[] = [
  { kind: "q", glyph: "\u265B" },
  { kind: "r", glyph: "\u265C" },
  { kind: "b", glyph: "\u265D" },
  { kind: "n", glyph: "\u265E" },
];

export function GameScreen({ playerName, initialDifficulty, onExit }: GameScreenProps) {
  const game = useChessGame();
  const { state } = game;
  const [soundOn, setSoundOn] = useState(true);
  const [confirmResign, setConfirmResign] = useState(false);

  // Initialize difficulty from entry screen (once).
  useEffect(() => {
    game.setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  // Keep the player name in the hook's ref (for DB persistence on game end).
  useEffect(() => {
    game.setPlayerName(playerName);
  }, [playerName, game]);

  // Sync sound manager with toggle.
  useEffect(() => {
    soundManager.setEnabled(soundOn);
  }, [soundOn]);
  // resume audio on first interaction
  const resumeAudio = () => soundManager.resume();

  // Compute check info from current fen (live mode).
  const liveCheck = useMemo(() => {
    try {
      const g = new Chess(state.fen);
      const inCheck = g.inCheck() && !g.isCheckmate();
      let checkSquare: string | null = null;
      if (inCheck) {
        const turn = g.turn();
        const board = g.board();
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const cell = board[r][c];
            if (cell && cell.type === "k" && cell.color === turn) {
              checkSquare = `${"abcdefgh"[c]}${8 - r}`;
            }
          }
        }
      }
      return { inCheck, checkSquare };
    } catch {
      return { inCheck: false, checkSquare: null };
    }
  }, [state.fen]);

  // Review position (when review active).
  const reviewPos = useMemo(() => {
    if (!state.review) return null;
    const sans = Array.from({ length: state.review.annotations.length }, (_, i) =>
      state.review!.annotations[i].san,
    );
    return reviewPosition(START_FEN, sans, state.review.annotations, state.reviewIndex);
  }, [state.review, state.reviewIndex]);

  const reviewActive = !!state.review;
  const boardPieces = reviewActive && reviewPos ? reviewPos.pieces : state.pieces;
  const boardLastMove = reviewActive && reviewPos ? reviewPos.lastMove : state.lastMove;
  const boardInteractive = !reviewActive && !state.gameOver && !state.isAiThinking;

  return (
    <div
      className="relative min-h-screen flex flex-col"
      onClick={resumeAudio}
    >
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-gradient-to-br from-card to-muted"
              style={{ fontFamily: FONT_STACK, fontSize: 20, color: "var(--piece-ivory-stroke)", lineHeight: 1 }}
            >
              {"\u265E"}
            </span>
            <div className="min-w-0">
              <h1 className="font-serif text-lg sm:text-xl font-semibold text-foreground truncate">
                Harmon&apos;s Gambit
              </h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                <span className="font-medium text-foreground">{playerName}</span>
                <span className="mx-1.5 text-primary/70">vs.</span>
                <span className="font-medium text-foreground">Harmon AI</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setSoundOn((s) => !s)}
              aria-label={soundOn ? "Mute" : "Unmute"}
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={onExit}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Exit
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-5 lg:flex-row lg:items-start">
        {/* Board column */}
        <div className="flex flex-col items-center gap-3 lg:flex-1">
          <div className="w-full max-w-[560px]">
            <ChessBoard
              pieces={boardPieces}
              lastMove={boardLastMove}
              selected={state.selected}
              legalTargets={state.legalTargets}
              heatmap={state.heatmap}
              showHeatmap={state.showHeatmap}
              turn={state.turn}
              inCheck={reviewActive ? false : liveCheck.inCheck}
              checkSquare={reviewActive ? null : liveCheck.checkSquare}
              onSquareClick={game.selectSquare}
              moveNonce={state.moveCount}
              reviewActive={reviewActive}
              reviewMarker={reviewActive && reviewPos?.marker ? reviewPos.marker : null}
              reviewArrow={reviewActive && reviewPos?.arrow ? reviewPos.arrow : null}
              interactive={boardInteractive}
              animateMoves={!reviewActive}
            />
          </div>

          {/* below-board controls (mobile shows these too) */}
          <div className="flex w-full max-w-[560px] flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => game.newGame()}
              disabled={state.isAiThinking}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> New Game
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={game.undo}
              disabled={state.isAiThinking || state.history.length < 2}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={game.requestReview}
              disabled={state.isAiThinking || state.reviewLoading || state.history.length === 0}
            >
              <Flame className="h-3.5 w-3.5 mr-1" />
              {state.reviewLoading ? "Analyzing…" : "Review Game"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-rose-400/60 text-rose-700 hover:bg-rose-50"
              onClick={() => setConfirmResign(true)}
              disabled={state.isAiThinking || state.gameOver}
            >
              <Flag className="h-3.5 w-3.5 mr-1" /> Resign
            </Button>
          </div>
        </div>

        {/* Side panel */}
        <aside className="w-full lg:w-[340px] shrink-0 space-y-3">
          {/* Eval + heatmap row */}
          <div className="rounded-xl border border-border bg-card/80 p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <EvalBar
                prob={state.evalProb}
                evalCp={state.evaluation}
                label={state.evalLabel}
                gameOver={state.gameOver}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Influence
                  </span>
                  <div className="flex items-center gap-1.5">
                    <LayoutGrid className="h-3.5 w-3.5 text-primary/70" />
                    <Switch
                      checked={state.showHeatmap}
                      onCheckedChange={game.setShowHeatmap}
                      aria-label="Toggle influence heatmap"
                    />
                  </div>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {state.showHeatmap
                    ? "Warm tones = White control, umber tones = Black control."
                    : "Toggle to see which side controls each square."}
                </p>
              </div>
            </div>
          </div>

          {/* Thinking or explanation */}
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
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                    <p className="flex items-start gap-1 text-[11px] italic text-muted-foreground/70">
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
                  White to move. Make your opening.
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Move history */}
          <div className="rounded-xl border border-border bg-card/80 p-3 shadow-sm">
            <MoveHistory
              sans={state.history}
              reviewActive={reviewActive}
              reviewIndex={state.reviewIndex}
              onJump={game.setReviewIndex}
            />
          </div>

          {/* Difficulty */}
          <div className="rounded-xl border border-border bg-card/80 p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Opponent level
              </span>
              {state.isAiThinking && (
                <span className="text-[10px] text-muted-foreground">applies next move</span>
              )}
            </div>
            <DifficultySelector
              value={state.difficulty}
              onChange={game.setDifficulty}
              disabled={false}
            />
          </div>

          {/* Review panel */}
          <AnimatePresence>
            {state.review && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <GameReview
                  review={state.review}
                  reviewIndex={state.reviewIndex}
                  onChangeIndex={game.setReviewIndex}
                  onClose={game.closeReview}
                  onReplay={() => {
                    game.closeReview();
                    game.newGame();
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game over banner */}
          <AnimatePresence>
            {state.gameOver && !state.review && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={
                  state.winner === "player"
                    ? "rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-card p-4 text-center shadow-md"
                    : state.winner === "ai"
                      ? "rounded-xl border border-rose-400/40 bg-gradient-to-br from-rose-500/10 to-card p-4 text-center shadow-md"
                      : "rounded-xl border border-primary/30 bg-gradient-to-br from-card to-muted p-4 text-center shadow-md"
                }
              >
                <Crown
                  className={
                    "mx-auto mb-1 h-5 w-5 " +
                    (state.winner === "player"
                      ? "text-emerald-600"
                      : state.winner === "ai"
                        ? "text-rose-600"
                        : "text-primary")
                  }
                />
                <p className="text-sm font-semibold text-foreground">{state.gameResult}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {state.saved
                    ? "Saved to the leaderboard. Press Review Game for analysis."
                    : "Press Review Game for a full analysis."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-card/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-3 text-center text-[11px] text-muted-foreground">
          Harmon&apos;s Gambit &mdash; a study in calculation. AlphaZero meets the World Chess Championship.
        </div>
      </footer>

      {/* Promotion dialog */}
      <AnimatePresence>
        {state.pendingPromotion && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-2xl"
            >
              <p className="mb-3 text-center text-sm font-semibold text-foreground">
                Promote pawn to:
              </p>
              <div className="flex gap-2">
                {PROMO_PIECES.map((p) => (
                  <button
                    key={p.kind}
                    type="button"
                    onClick={() => game.choosePromotion(p.kind)}
                    className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-primary/30 bg-background/70 transition hover:border-primary hover:bg-accent"
                    style={{ fontFamily: FONT_STACK, fontSize: 34, color: "var(--piece-ebony)", lineHeight: 1 }}
                  >
                    {p.glyph}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resign confirmation dialog */}
      <AnimatePresence>
        {confirmResign && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmResign(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[min(90vw,360px)] rounded-2xl border border-rose-400/40 bg-card p-5 shadow-2xl"
            >
              <div className="mb-2 flex items-center gap-2">
                <Flag className="h-5 w-5 text-rose-600" />
                <span className="text-base font-semibold text-foreground">Resign the game?</span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                You will concede the match to Harmon AI. The result will be recorded on the leaderboard.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmResign(false)}>
                  Keep playing
                </Button>
                <Button
                  size="sm"
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={() => {
                    setConfirmResign(false);
                    game.resign();
                  }}
                >
                  <Flag className="h-3.5 w-3.5 mr-1" /> Resign
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confetti burst on any decisive result */}
      <Confetti trigger={state.confetti} winner={state.winner} />

      {/* Floating animated leaderboard */}
      <Leaderboard refreshKey={state.saved ? state.moveCount : 0} />
    </div>
  );
}
