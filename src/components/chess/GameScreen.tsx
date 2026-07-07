"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { CapturedTray, CaptureFlyOff } from "./CapturedTray";
import { GameNavbar } from "./GameNavbar";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { GameDialogs } from "./GameDialogs";
import { Confetti } from "./Confetti";
import { Leaderboard } from "./Leaderboard";
import { AnalysisModal } from "./AnalysisModal";
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

/**
 * Top-level game screen. Orchestrates the game-state hook, derives the
 * board/check info, and composes the navbar, 3-column main layout, dialogs,
 * confetti, leaderboard, and analysis modal.
 *
 * Sub-sections are extracted into focused components:
 *  - GameNavbar   (sticky header with difficulty pills, influence toggle, actions)
 *  - LeftPanel    (Harmon's last move, move history, controls, game-over banner)
 *  - RightPanel   (eval bar, turn indicator, mobile difficulty)
 *  - GameDialogs  (promotion picker, resign confirmation)
 *  - AnalysisModal (collapsible replay + coaching)
 */
export function GameScreen({ playerName, initialDifficulty, initialColor, onExit }: GameScreenProps) {
  const game = useChessGame();
  const { state } = game;
  const [soundOn, setSoundOn] = useState(true);
  const [confirmResign, setConfirmResign] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const boardWrapRef = useRef<HTMLDivElement | null>(null);
  const [boardRect, setBoardRect] = useState<{ width: number; height: number } | null>(null);

  // ── Init: difficulty + color + AI opens if player is Black ──────────────
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    game.setDifficulty(initialDifficulty);
    game.setPlayerColor(initialColor);
    if (initialColor === "b") {
      game.newGame({ playerColor: "b" });
    }
  }, []);

  // ── Player name sync ────────────────────────────────────────────────────
  useEffect(() => {
    game.setPlayerName(playerName);
  }, [playerName, game]);

  // ── Board size tracking for the capture fly-off overlay ─────────────────
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

  // ── Sound toggle sync ───────────────────────────────────────────────────
  useEffect(() => {
    soundManager.setEnabled(soundOn);
  }, [soundOn]);
  const resumeAudio = () => soundManager.resume();

  // ── Auto-generate LLM analysis on game end (ref-guarded to avoid loops) ─
  const requestAnalysisRef = useRef(game.requestAnalysis);
  const autoAnalysisRanRef = useRef(false);
  useEffect(() => {
    requestAnalysisRef.current = game.requestAnalysis;
  }, [game.requestAnalysis]);
  useEffect(() => {
    if (!state.gameOver) {
      autoAnalysisRanRef.current = false;
      return;
    }
    if (autoAnalysisRanRef.current) return;
    if (state.analysis || state.analysisLoading) return;
    if (state.history.length === 0) return;
    autoAnalysisRanRef.current = true;
    const t = setTimeout(() => {
      void requestAnalysisRef.current();
    }, 800);
    return () => clearTimeout(t);
  }, [state.gameOver, state.analysis, state.analysisLoading, state.history.length]);

  // ── Derived: check info from current FEN ────────────────────────────────
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

  // ── Derived: review position (when modal is open) ───────────────────────
  const reviewActive = !!state.review;
  const reviewPos = useMemo(() => {
    if (!state.review) return null;
    const sans = state.review.annotations.map((a) => a.san);
    return reviewPosition(START_FEN, sans, state.review.annotations, state.reviewIndex);
  }, [state.review, state.reviewIndex]);

  const boardPieces = reviewActive && reviewPos ? reviewPos.pieces : state.pieces;
  const boardLastMove = reviewActive && reviewPos ? reviewPos.lastMove : state.lastMove;
  const boardInteractive = !reviewActive && !state.gameOver && !state.isAiThinking;

  // ── Handlers ────────────────────────────────────────────────────────────
  const openAnalysis = () => {
    setAnalysisOpen(true);
    if (!state.analysis && !state.analysisLoading) {
      void game.requestAnalysis();
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col" onClick={resumeAudio}>
      <GameNavbar
        playerName={playerName}
        difficulty={state.difficulty}
        showHeatmap={state.showHeatmap}
        soundOn={soundOn}
        onToggleHeatmap={game.setShowHeatmap}
        onChangeDifficulty={game.setDifficulty}
        onToggleSound={() => setSoundOn((s) => !s)}
        onExit={onExit}
      />

      {/* ── Main: 3-column layout (left info | board | right eval) ────────── */}
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-3 px-4 py-4 xl:flex-row xl:items-start xl:justify-center xl:gap-6">
        <LeftPanel
          state={state}
          reviewActive={reviewActive}
          onNewGame={() => game.newGame({ playerColor: state.playerColor })}
          onUndo={game.undo}
          onAnalyse={openAnalysis}
          onResign={() => setConfirmResign(true)}
          onJump={game.setReviewIndex}
          onViewAnalysis={openAnalysis}
        />

        {/* CENTER: board + captured trays */}
        <div className="order-1 flex flex-col items-center gap-2 xl:order-2 xl:flex-1 xl:justify-start">
          <div className="w-full max-w-[600px]">
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

        <RightPanel state={state} />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-card/70">
        <div className="mx-auto w-full max-w-7xl px-4 py-2 text-center text-[11px] text-muted-foreground">
          Harmon&apos;s Gambit &mdash; AlphaZero meets the World Chess Championship.
        </div>
      </footer>

      <GameDialogs
        pendingPromotion={state.pendingPromotion}
        confirmResign={confirmResign}
        onChoosePromotion={game.choosePromotion}
        onConfirmResign={() => {
          setConfirmResign(false);
          game.resign();
        }}
        onCancelResign={() => setConfirmResign(false)}
      />

      <Confetti trigger={state.confetti} winner={state.winner} resultLabel={state.gameResult} />
      <Leaderboard refreshKey={state.saved ? state.moveCount : 0} />

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
