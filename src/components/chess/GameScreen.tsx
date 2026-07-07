"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Chess } from "chess.js";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
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
import { DifficultySelector, DifficultySelectorCompact } from "./DifficultySelector";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { GameReview } from "./GameReview";
import { Confetti } from "./Confetti";
import { Leaderboard } from "./Leaderboard";
import { CapturedTray, CaptureFlyOff } from "./CapturedTray";
import { AnalysisModal } from "./AnalysisModal";
import { ThemeToggle } from "@/components/theme-toggle";
import { useChessGame, START_FEN, PlayColor } from "./useChessGame";
import { reviewPosition } from "./review-util";
import { soundManager } from "./sounds";
import { Difficulty } from "@/lib/chess/types";

interface GameScreenProps {
  playerName: string;
  initialDifficulty: Difficulty;
  initialColor: PlayColor;
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

export function GameScreen({ playerName, initialDifficulty, initialColor, onExit }: GameScreenProps) {
  const game = useChessGame();
  const { state } = game;
  const [soundOn, setSoundOn] = useState(true);
  const [confirmResign, setConfirmResign] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const boardWrapRef = useRef<HTMLDivElement | null>(null);
  const [boardRect, setBoardRect] = useState<{ width: number; height: number } | null>(null);

  // Initialize difficulty + color from entry screen (once, on mount).
  // We intentionally run this only once — `game` is a stable hook return but
  // its methods are recreated each render, so we use a mount guard.
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    game.setDifficulty(initialDifficulty);
    game.setPlayerColor(initialColor);
    // If the player is Black, the AI (White) must open the game.
    if (initialColor === "b") {
      game.newGame({ playerColor: "b" });
    }
  }, []);

  // Keep the player name in the hook's ref (for DB persistence on game end).
  useEffect(() => {
    game.setPlayerName(playerName);
  }, [playerName, game]);

  // Track board size for the fly-off overlay positioning.
  useEffect(() => {
    const el = boardWrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setBoardRect({ width: r.width, height: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync sound manager with toggle.
  useEffect(() => {
    soundManager.setEnabled(soundOn);
  }, [soundOn]);
  // resume audio on first interaction
  const resumeAudio = () => soundManager.resume();

  // Auto-generate the LLM analysis when the game ends (so it's ready when the
  // user opens the modal). Only fires once per game via the savedRef guard in
  // the hook — the analysisLoading/analysis checks prevent duplicate calls.
  useEffect(() => {
    if (!state.gameOver) return;
    if (state.analysis || state.analysisLoading) return;
    if (state.history.length === 0) return;
    // Small delay so the confetti/banner render first.
    const t = setTimeout(() => {
      void game.requestAnalysis();
    }, 800);
    return () => clearTimeout(t);
  }, [state.gameOver, state.analysis, state.analysisLoading, state.history.length, game]);

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
      {/* ─────────── Compact Navbar ─────────── */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2">
          {/* Brand + match */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-gradient-to-br from-card to-muted"
              style={{ fontFamily: FONT_STACK, fontSize: 16, color: "var(--primary)", lineHeight: 1 }}
            >
              {"\u265E"}
            </span>
            <div className="min-w-0 hidden sm:block">
              <h1 className="font-serif text-sm font-semibold leading-tight text-foreground truncate">
                Harmon&apos;s Gambit
              </h1>
              <p className="text-[11px] text-muted-foreground truncate leading-tight">
                <span className="font-medium text-foreground">{playerName}</span>
                <span className="mx-1 text-primary/70">vs.</span>
                <span className="font-medium text-foreground">AI</span>
              </p>
            </div>
          </div>

          {/* Center: difficulty pills + influence toggle (utilizes navbar space) */}
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1">
                    <LayoutGrid className="h-3.5 w-3.5 text-primary/70" />
                    <span className="hidden md:inline text-[11px] font-medium text-muted-foreground">Influence</span>
                    <Switch
                      checked={state.showHeatmap}
                      onCheckedChange={game.setShowHeatmap}
                      aria-label="Toggle influence heatmap"
                      className="scale-90"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[240px] text-xs leading-relaxed">
                  <p className="font-semibold mb-1">Influence Heatmap</p>
                  <p>Toggles a colour overlay on every square showing which side <em>controls</em> it — based on attacking pieces and their reach.</p>
                  <p className="mt-1"><span className="text-amber-700 dark:text-amber-300 font-medium">Warm cream tones</span> = White-controlled. <span className="text-stone-700 dark:text-stone-300 font-medium">Deep umber tones</span> = Black-controlled.</p>
                  <p className="mt-1 text-muted-foreground">Spot weak squares, hanging pieces, and centre control at a glance.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Level</span>
              <DifficultySelectorCompact
                value={state.difficulty}
                onChange={game.setDifficulty}
              />
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1">
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
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ─────────── Main: 3-column layout (left info | board | right eval) ─────────── */}
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-3 px-4 py-4 xl:flex-row xl:items-start xl:justify-center xl:gap-6">
        {/* LEFT panel: Harmon's last move + move history (utilizes the empty left space) */}
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
              onJump={game.setReviewIndex}
            />
          </div>

          {/* Game controls (moved here from below the board to save vertical space) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => game.newGame({ playerColor: state.playerColor })}
              disabled={state.isAiThinking}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> New
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
              onClick={() => {
                setAnalysisOpen(true);
                if (!state.analysis && !state.analysisLoading) {
                  void game.requestAnalysis();
                }
              }}
              disabled={state.isAiThinking || state.history.length === 0}
            >
              <Flame className="h-3.5 w-3.5 mr-1" />
              {state.analysisLoading || state.reviewLoading ? "Analyzing…" : "Analyse"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-rose-400/60 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              onClick={() => setConfirmResign(true)}
              disabled={state.isAiThinking || state.gameOver}
            >
              <Flag className="h-3.5 w-3.5 mr-1" /> Resign
            </Button>
          </div>

          {/* Game over banner (in left panel when game ends) */}
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
                  onClick={() => {
                    setAnalysisOpen(true);
                    if (!state.analysis && !state.analysisLoading) {
                      void game.requestAnalysis();
                    }
                  }}
                  disabled={state.reviewLoading || state.analysisLoading}
                >
                  <Flame className="h-3.5 w-3.5 mr-1" />
                  {state.analysisLoading || state.reviewLoading ? "Analyzing…" : "View Analysis"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* CENTER: board + captured trays */}
        <div className="order-1 flex flex-col items-center gap-2 xl:order-2 xl:flex-1 xl:justify-start">
          <div className="w-full max-w-[600px]">
            {/* Captured trays */}
            <div className="mb-2 flex justify-between gap-2">
              <CapturedTray
                capturedBy={state.playerColor}
                captured={state.captured}
                label="You captured"
                align="left"
              />
              <CapturedTray
                capturedBy={state.aiColor}
                captured={state.captured}
                label="AI captured"
                align="right"
              />
            </div>

            {/* Board + fly-off overlay */}
            <div ref={boardWrapRef} className="relative">
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
                orientation={state.playerColor}
              />
              {!reviewActive && (
                <CaptureFlyOff
                  capture={state.lastCapture}
                  boardRect={boardRect}
                  orientation={state.playerColor}
                />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT panel: eval bar + status (utilizes the right space, compact) */}
        <aside className="order-3 flex flex-col gap-3 xl:w-[260px] shrink-0">
          <div className="rounded-xl border border-border bg-card/80 p-3 shadow-sm">
            <EvalBar
              prob={state.evalProb}
              evalCp={state.evaluation}
              label={state.evalLabel}
              gameOver={state.gameOver}
              playerColor={state.playerColor}
            />
          </div>

          {/* Difficulty (full selector, shown here on mobile only; compact is in navbar on sm+) */}
          <div className="rounded-xl border border-border bg-card/80 p-3 shadow-sm sm:hidden">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Opponent level
              </span>
            </div>
            <DifficultySelector
              value={state.difficulty}
              onChange={game.setDifficulty}
              disabled={false}
            />
          </div>

          {/* Turn indicator / quick stats */}
          <div className="rounded-xl border border-border bg-card/80 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Turn
              </span>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-xs font-semibold " +
                  (state.isAiThinking || state.turn === state.aiColor
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400")
                }
              >
                {state.isAiThinking || state.turn === state.aiColor ? "Harmon thinking" : "Your move"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Move <span className="font-semibold text-foreground tabular-nums">{Math.floor(state.history.length / 2) + 1}</span></span>
              <span><span className="font-semibold text-foreground tabular-nums">{state.history.length}</span> ply</span>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-card/70">
        <div className="mx-auto w-full max-w-7xl px-4 py-2 text-center text-[11px] text-muted-foreground">
          Harmon&apos;s Gambit &mdash; AlphaZero meets the World Chess Championship.
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
      <Confetti trigger={state.confetti} winner={state.winner} resultLabel={state.gameResult} />

      {/* Floating animated leaderboard */}
      <Leaderboard refreshKey={state.saved ? state.moveCount : 0} />

      {/* Collapsible Analysis modal */}
      <AnalysisModal
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
        review={state.review}
        reviewLoading={state.reviewLoading}
        analysis={state.analysis}
        analysisLoading={state.analysisLoading}
        reviewIndex={state.reviewIndex}
        history={state.history}
        playerColor={state.playerColor}
        onChangeIndex={game.setReviewIndex}
        onRerunAnalysis={game.requestAnalysis}
      />
    </div>
  );
}
