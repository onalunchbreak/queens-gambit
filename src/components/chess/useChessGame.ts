"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import {
  AiMoveResult,
  Difficulty,
  MoveAnnotation,
  MoveExplanation,
  ReviewResult,
} from "@/lib/chess/types";
import { computeHeatmap, evaluate, evalLabel, evalToProbability } from "@/lib/chess/evaluation";
import { soundManager } from "./sounds";

export interface PieceInstance {
  id: string;
  type: "p" | "n" | "b" | "r" | "q" | "k";
  color: "w" | "b";
  square: string; // e.g. "e4"
}

export interface LastMove {
  from: string;
  to: string;
}

let PIECE_ID_COUNTER = 1;

function buildInitialPieces(fen: string): PieceInstance[] {
  const game = new Chess(fen);
  const board = game.board();
  const pieces: PieceInstance[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      const file = "abcdefgh"[c];
      const rank = 8 - r;
      pieces.push({
        id: `p${PIECE_ID_COUNTER++}`,
        type: cell.type as PieceInstance["type"],
        color: cell.color as "w" | "b",
        square: `${file}${rank}`,
      });
    }
  }
  return pieces;
}

export interface GameState {
  pieces: PieceInstance[];
  fen: string;
  turn: "w" | "b";
  history: string[]; // SAN list
  lastMove: LastMove | null;
  selected: string | null;
  legalTargets: { square: string; isCapture: boolean }[];
  isAiThinking: boolean;
  explanation: MoveExplanation | null;
  narration: string;
  narrationLoading: boolean;
  heatmap: number[];
  showHeatmap: boolean;
  evaluation: number; // centipawns white POV
  evalLabel: string;
  evalProb: number; // 0..1 white winning prob
  gameOver: boolean;
  gameResult: string | null;
  difficulty: Difficulty;
  pendingPromotion: { from: string; to: string } | null;
  review: ReviewResult | null;
  reviewLoading: boolean;
  reviewIndex: number; // current ply viewed in review (-1 = live)
  moveCount: number;
  playerColor: "w";
  aiColor: "b";
}

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function useChessGame() {
  const gameRef = useRef<Chess>(new Chess(START_FEN));
  const difficultyRef = useRef<Difficulty>("club");
  const [state, setState] = useState<GameState>(() => {
    const g = gameRef.current;
    const evalCp = evaluate(g);
    return {
      pieces: buildInitialPieces(START_FEN),
      fen: g.fen(),
      turn: "w",
      history: [],
      lastMove: null,
      selected: null,
      legalTargets: [],
      isAiThinking: false,
      explanation: null,
      narration: "",
      narrationLoading: false,
      heatmap: computeHeatmap(g),
      showHeatmap: false,
      evaluation: evalCp,
      evalLabel: evalLabel(evalCp, g.turn()),
      evalProb: evalToProbability(evalCp),
      gameOver: false,
      gameResult: null,
      difficulty: "club",
      pendingPromotion: null,
      review: null,
      reviewLoading: false,
      reviewIndex: -1,
      moveCount: 0,
      playerColor: "w",
      aiColor: "b",
    };
  });

  // Apply a move (player or AI) to the piece list + chess instance.
  const applyMove = useCallback(
    (from: string, to: string, promotion?: string, opts?: { silent?: boolean }): boolean => {
      const game = gameRef.current;
      let moveResult;
      try {
        moveResult = game.move({ from: from as Square, to: to as Square, promotion: promotion ?? "q" });
      } catch {
        return false;
      }
      if (!moveResult) return false;

      setState((prev) => {
        let pieces = prev.pieces.map((p) => ({ ...p }));
        const isCapture = !!moveResult.captured;
        const isCastle = moveResult.flags.includes("k") || moveResult.flags.includes("q");

        // Move the primary piece.
        pieces = pieces.map((p) => (p.square === from ? { ...p, square: to } : p));

        // Remove captured piece. The mover is now on `to`; remove the enemy piece
        // that was there. For en passant the captured pawn sits behind `to`.
        if (isCapture) {
          const moverColor = prev.turn;
          if (moveResult.flags.includes("e")) {
            const capRank = moverColor === "w" ? "5" : "4";
            const capSquare = `${to[0]}${capRank}`;
            pieces = pieces.filter((p) => p.square !== capSquare);
          } else {
            pieces = pieces.filter(
              (p) => !(p.square === to && p.color !== moverColor),
            );
          }
        }

        // Promotion: change pawn type.
        if (moveResult.promotion) {
          pieces = pieces.map((p) =>
            p.square === to ? { ...p, type: moveResult.promotion as PieceInstance["type"] } : p,
          );
        }

        // Castling: move the rook too.
        if (isCastle) {
          const rank = moveResult.color === "w" ? "1" : "8";
          if (moveResult.flags.includes("k")) {
            // kingside: rook h->f
            pieces = pieces.map((p) =>
              p.square === `h${rank}` ? { ...p, square: `f${rank}` } : p,
            );
          } else {
            // queenside: rook a->d
            pieces = pieces.map((p) =>
              p.square === `a${rank}` ? { ...p, square: `d${rank}` } : p,
            );
          }
        }

        const fen = game.fen();
        const evalCp = evaluate(game);
        const history = game.history();
        const lastMove = { from, to };
        const gameOver = game.isGameOver();
        let gameResult: string | null = null;
        if (gameOver) {
          if (game.isCheckmate()) {
            gameResult = game.turn() === "w" ? "Black wins by checkmate" : "White wins by checkmate";
          } else if (game.isStalemate()) gameResult = "Draw — Stalemate";
          else if (game.isInsufficientMaterial()) gameResult = "Draw — Insufficient material";
          else if (game.isThreefoldRepetition()) gameResult = "Draw — Threefold repetition";
          else gameResult = "Draw";
        }

        if (!opts?.silent) {
          soundManager.move(isCapture);
          if (gameOver) setTimeout(() => soundManager.gameEnd(), 220);
        }

        return {
          ...prev,
          pieces,
          fen,
          turn: gameOver ? prev.turn : (game.turn() as "w" | "b"),
          history,
          lastMove,
          selected: null,
          legalTargets: [],
          heatmap: computeHeatmap(game),
          evaluation: evalCp,
          evalLabel: evalLabel(evalCp, game.turn()),
          evalProb: evalToProbability(evalCp),
          gameOver,
          gameResult,
          moveCount: prev.moveCount + 1,
          pendingPromotion: null,
        };
      });

      return true;
    },
    [],
  );

  const selectSquare = useCallback((sq: string) => {
    const game = gameRef.current;
    setState((prev) => {
      if (prev.isAiThinking || prev.gameOver) return prev;
      // Only allow selecting own pieces (white) on player's turn.
      if (game.turn() !== "w") return prev;

      const piece = game.get(sq as Square);
      // If clicking a legal target of the currently selected piece -> move.
      if (prev.selected && prev.legalTargets.some((t) => t.square === sq)) {
        const from = prev.selected;
        // promotion check
        const mover = game.get(from as Square);
        if (mover && mover.type === "p" && (sq[1] === "8" || sq[1] === "1")) {
          return { ...prev, pendingPromotion: { from, to: sq }, selected: null, legalTargets: [] };
        }
        // perform move via external applyMove (can't call inside setState updater reliably)
        queueMicrotask(() => applyMove(from, sq));
        return { ...prev, selected: null, legalTargets: [] };
      }

      // Selecting a white piece.
      if (piece && piece.color === "w") {
        const moves = game.moves({ square: sq as Square, verbose: true }) as {
          to: string;
          captured?: string;
          flags: string;
        }[];
        const targets = moves.map((m) => ({ square: m.to, isCapture: !!m.captured || m.flags.includes("e") }));
        return { ...prev, selected: sq, legalTargets: targets };
      }

      // Clicked elsewhere — clear selection.
      return { ...prev, selected: null, legalTargets: [] };
    });
  }, [applyMove]);

  const choosePromotion = useCallback((piece: "q" | "r" | "b" | "n") => {
    setState((prev) => {
      if (!prev.pendingPromotion) return prev;
      const { from, to } = prev.pendingPromotion;
      queueMicrotask(() => applyMove(from, to, piece));
      return { ...prev, pendingPromotion: null, selected: null, legalTargets: [] };
    });
  }, [applyMove]);

  const setDifficulty = useCallback((d: Difficulty) => {
    difficultyRef.current = d;
    setState((prev) => ({ ...prev, difficulty: d }));
  }, []);

  const toggleHeatmap = useCallback(() => {
    setState((prev) => ({ ...prev, showHeatmap: !prev.showHeatmap }));
  }, []);

  const setShowHeatmap = useCallback((v: boolean) => {
    setState((prev) => ({ ...prev, showHeatmap: v }));
  }, []);

  // Request the AI move from the server.
  const requestAiMove = useCallback(async () => {
    setState((prev) => ({ ...prev, isAiThinking: true, narration: "", narrationLoading: false }));
    const fen = gameRef.current.fen();
    const difficulty: Difficulty = difficultyRef.current;

    // Minimum thinking time so the "Thinking…" animation is always visible.
    const minThinkMs = difficulty === "master" ? 950 : difficulty === "club" ? 650 : 550;
    const thinkStart = Date.now();

    try {
      const res = await fetch("/api/ai-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen, difficulty }),
      });
      const data: AiMoveResult = await res.json();
      if (data.error) throw new Error(data.error);

      // Hold the thinking animation for at least minThinkMs before revealing the move.
      const elapsed = Date.now() - thinkStart;
      if (elapsed < minThinkMs) {
        await new Promise((r) => setTimeout(r, minThinkMs - elapsed));
      }

      // Apply the AI move.
      applyMove(data.from, data.to, data.promotion);

      setState((prev) => ({
        ...prev,
        isAiThinking: false,
        explanation: data.explanation,
        evaluation: data.evaluation,
        evalLabel: data.evaluationLabel,
        evalProb: evalToProbability(data.evaluation),
        heatmap: data.heatmap,
        gameOver: data.gameOver,
        gameResult: data.gameResult ?? prev.gameResult,
      }));

      // In parallel, fetch an LLM narration.
      setState((prev) => ({ ...prev, narrationLoading: true }));
      try {
        const nres = await fetch("/api/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fenBefore: fen,
            san: data.san,
            from: data.from,
            to: data.to,
            mover: "b",
            difficulty,
            heuristicShort: data.explanation.short,
            heuristicDetail: data.explanation.detail,
          }),
        });
        const ndata = await nres.json();
        setState((prev) => ({
          ...prev,
          narration: (ndata.narration as string) || "",
          narrationLoading: false,
        }));
      } catch {
        setState((prev) => ({ ...prev, narration: "", narrationLoading: false }));
      }
    } catch (err) {
      setState((prev) => ({ ...prev, isAiThinking: false }));
      console.error("AI move failed", err);
    }
  }, [applyMove]);

  // Trigger AI move whenever it becomes black's turn and game not over.
  useEffect(() => {
    if (state.gameOver) return;
    if (state.isAiThinking) return;
    if (state.turn === "b" && !state.pendingPromotion) {
      const t = setTimeout(() => {
        void requestAiMove();
      }, 350);
      return () => clearTimeout(t);
    }
  }, [state.turn, state.gameOver, state.isAiThinking, state.pendingPromotion, requestAiMove]);

  const newGame = useCallback((difficulty?: Difficulty) => {
    const g = new Chess(START_FEN);
    gameRef.current = g;
    const evalCp = evaluate(g);
    if (difficulty) difficultyRef.current = difficulty;
    setState((prev) => ({
      pieces: buildInitialPieces(START_FEN),
      fen: g.fen(),
      turn: "w",
      history: [],
      lastMove: null,
      selected: null,
      legalTargets: [],
      isAiThinking: false,
      explanation: null,
      narration: "",
      narrationLoading: false,
      heatmap: computeHeatmap(g),
      showHeatmap: prev.showHeatmap,
      evaluation: evalCp,
      evalLabel: evalLabel(evalCp, g.turn()),
      evalProb: evalToProbability(evalCp),
      gameOver: false,
      gameResult: null,
      difficulty: difficulty ?? prev.difficulty,
      pendingPromotion: null,
      review: null,
      reviewLoading: false,
      reviewIndex: -1,
      moveCount: 0,
      playerColor: "w",
      aiColor: "b",
    }));
  }, []);

  const undo = useCallback(() => {
    const game = gameRef.current;
    // undo AI move + player move (if both exist)
    if (state.isAiThinking) return;
    if (game.history().length === 0) return;
    game.undo();
    if (game.history().length > 0 && game.turn() === "b") {
      // we just undid the player's move; now it's black's turn meaning AI hadn't moved? 
      // Actually after undoing player move, turn becomes 'b' (AI to move) — undo that too if it was AI's.
    }
    if (game.history().length > 0) {
      game.undo();
    }
    // rebuild pieces from FEN (simpler than reverse-applying)
    const evalCp = evaluate(game);
    setState((prev) => ({
      ...prev,
      pieces: buildInitialPieces(game.fen()),
      fen: game.fen(),
      turn: game.turn() as "w" | "b",
      history: game.history(),
      lastMove: null,
      selected: null,
      legalTargets: [],
      explanation: null,
      narration: "",
      heatmap: computeHeatmap(game),
      evaluation: evalCp,
      evalLabel: evalLabel(evalCp, game.turn()),
      evalProb: evalToProbability(evalCp),
      gameOver: game.isGameOver(),
      gameResult: null,
      review: null,
      reviewIndex: -1,
      moveCount: game.history().length,
    }));
  }, [state.isAiThinking]);

  const requestReview = useCallback(async () => {
    const sans = gameRef.current.history();
    if (sans.length === 0) return;
    setState((prev) => ({ ...prev, reviewLoading: true, review: null, reviewIndex: sans.length }));
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: START_FEN, sans }),
      });
      const data: ReviewResult = await res.json();
      setState((prev) => ({
        ...prev,
        review: data,
        reviewLoading: false,
        reviewIndex: data.annotations.length,
      }));
    } catch (err) {
      console.error("review failed", err);
      setState((prev) => ({ ...prev, reviewLoading: false }));
    }
  }, []);

  const setReviewIndex = useCallback((i: number) => {
    setState((prev) => ({ ...prev, reviewIndex: i }));
  }, []);

  const closeReview = useCallback(() => {
    setState((prev) => ({ ...prev, review: null, reviewIndex: -1 }));
  }, []);

  return {
    state,
    selectSquare,
    choosePromotion,
    setDifficulty,
    toggleHeatmap,
    setShowHeatmap,
    newGame,
    undo,
    requestReview,
    setReviewIndex,
    closeReview,
  };
}

export type UseChessGame = ReturnType<typeof useChessGame>;

export { START_FEN };
export type { MoveAnnotation };
