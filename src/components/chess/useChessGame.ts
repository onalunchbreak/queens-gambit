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

export type PlayColor = "w" | "b";

export interface PieceInstance {
  id: string;
  type: "p" | "n" | "b" | "r" | "q" | "k";
  color: "w" | "b";
  square: string; // e.g. "e4"
}

export interface CapturedPiece {
  id: string; // unique per capture event
  type: "p" | "n" | "b" | "r" | "q" | "k";
  color: "w" | "b"; // the color of the piece that was captured
  capturedBy: "w" | "b"; // the color that captured it
  // origin square where the piece sat before being captured (for fly-off animation)
  fromSquare: string;
  nonce: number; // increments to retrigger animation
}

export interface LastMove {
  from: string;
  to: string;
}

let PIECE_ID_COUNTER = 1;
let CAPTURE_ID_COUNTER = 1;

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
  // LLM-powered textual coaching analysis (requested separately from the review markers).
  analysis: string;
  analysisLoading: boolean;
  moveCount: number;
  playerColor: PlayColor;
  aiColor: PlayColor;
  winner: "player" | "ai" | "draw" | null;
  resigned: boolean;
  saved: boolean;
  confetti: number;
  // Captured pieces (cumulative this game) — used by the side trays.
  captured: CapturedPiece[];
  // Most recent capture (for triggering fly-off animation) — nonce-based.
  lastCapture: CapturedPiece | null;
  captureNonce: number;
  // Pending stalemate warning: when the player's chosen move would cause a
  // stalemate (draw), we show a confirmation dialog before applying it.
  pendingStalemateWarning: { from: string; to: string; promotion?: string } | null;
}

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function useChessGame() {
  const gameRef = useRef<Chess>(new Chess(START_FEN));
  const difficultyRef = useRef<Difficulty>("club");
  const playerColorRef = useRef<PlayColor>("w");
  const startedAtRef = useRef<number>(Date.now());
  const playerNameRef = useRef<string>("Player");
  const savedRef = useRef<boolean>(false); // guards against double-saves
  const [state, setState] = useState<GameState>(() => {
    const g = gameRef.current;
    const evalCp = evaluate(g);
    startedAtRef.current = Date.now();
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
      analysis: "",
      analysisLoading: false,
      moveCount: 0,
      playerColor: "w",
      aiColor: "b",
      winner: null,
      resigned: false,
      saved: false,
      confetti: 0,
      captured: [],
      lastCapture: null,
      captureNonce: 0,
      pendingStalemateWarning: null,
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

        // The moving piece's color is moveResult.color.
        const moverColor = moveResult.color;

        // Track the captured piece for the fly-off animation BEFORE removing it.
        let capturedPiece: CapturedPiece | null = null;
        if (isCapture) {
          let capSquare = to;
          if (moveResult.flags.includes("e")) {
            // en passant — captured pawn sits behind `to`
            capSquare = `${to[0]}${moverColor === "w" ? "5" : "4"}`;
          }
          const victim = pieces.find((p) => p.square === capSquare && p.color !== moverColor);
          if (victim) {
            capturedPiece = {
              id: `c${CAPTURE_ID_COUNTER++}`,
              type: victim.type,
              color: victim.color,
              capturedBy: moverColor,
              fromSquare: capSquare,
              nonce: prev.captureNonce + 1,
            };
          }
        }

        // Move the primary piece.
        pieces = pieces.map((p) => (p.square === from ? { ...p, square: to } : p));

        // Remove captured piece.
        if (isCapture) {
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
          const rank = moverColor === "w" ? "1" : "8";
          if (moveResult.flags.includes("k")) {
            pieces = pieces.map((p) =>
              p.square === `h${rank}` ? { ...p, square: `f${rank}` } : p,
            );
          } else {
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
        let winner: "player" | "ai" | "draw" | null = null;
        if (gameOver) {
          if (game.isCheckmate()) {
            const losingSide = game.turn();
            const winningSide = losingSide === "w" ? "b" : "w";
            gameResult = winningSide === "w" ? "White wins by checkmate" : "Black wins by checkmate";
            winner = winningSide === prev.playerColor ? "player" : "ai";
          } else if (game.isStalemate()) {
            gameResult = "Draw — Stalemate";
            winner = "draw";
          } else if (game.isInsufficientMaterial()) {
            gameResult = "Draw — Insufficient material";
            winner = "draw";
          } else if (game.isThreefoldRepetition()) {
            gameResult = "Draw — Threefold repetition";
            winner = "draw";
          } else {
            gameResult = "Draw";
            winner = "draw";
          }
        }

        if (!opts?.silent) {
          soundManager.move(isCapture);
          if (gameOver) setTimeout(() => soundManager.gameEnd(), 220);
        }

        // Fire confetti on EVERY game end — win, loss, or draw.
        const confettiBump = gameOver ? prev.confetti + 1 : prev.confetti;

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
          winner,
          moveCount: prev.moveCount + 1,
          pendingPromotion: null,
          confetti: confettiBump,
          captured: capturedPiece ? [...prev.captured, capturedPiece] : prev.captured,
          lastCapture: capturedPiece,
          captureNonce: capturedPiece ? prev.captureNonce + 1 : prev.captureNonce,
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
      // Only allow selecting the player's own pieces on the player's turn.
      if (game.turn() !== prev.playerColor) return prev;

      const piece = game.get(sq as Square);
      // If clicking a legal target of the currently selected piece -> move.
      if (prev.selected && prev.legalTargets.some((t) => t.square === sq)) {
        const from = prev.selected;
        // promotion check: pawn reaching the last rank of the mover's direction
        const mover = game.get(from as Square);
        const lastRank = prev.playerColor === "w" ? "8" : "1";
        if (mover && mover.type === "p" && sq[1] === lastRank) {
          return { ...prev, pendingPromotion: { from, to: sq }, selected: null, legalTargets: [] };
        }
        // ── Stalemate check: simulate the move and see if it would result in
        // a draw by stalemate. If so, warn the player before applying it. ──
        const sim = new Chess(game.fen());
        try {
          sim.move({ from: from as Square, to: sq as Square });
          if (sim.isStalemate() && !sim.isCheckmate()) {
            return {
              ...prev,
              pendingStalemateWarning: { from, to: sq },
              selected: null,
              legalTargets: [],
            };
          }
        } catch {
          // ignore simulation errors
        }
        queueMicrotask(() => applyMove(from, sq));
        return { ...prev, selected: null, legalTargets: [] };
      }

      // Selecting the player's own piece.
      if (piece && piece.color === prev.playerColor) {
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

  // Confirm a move that would cause a stalemate (the player chose to proceed).
  const confirmStalemateMove = useCallback(() => {
    setState((prev) => {
      if (!prev.pendingStalemateWarning) return prev;
      const { from, to, promotion } = prev.pendingStalemateWarning;
      queueMicrotask(() => applyMove(from, to, promotion));
      return { ...prev, pendingStalemateWarning: null };
    });
  }, [applyMove]);

  // Cancel the stalemate warning (the player chose a different move).
  const cancelStalemateMove = useCallback(() => {
    setState((prev) => ({ ...prev, pendingStalemateWarning: null }));
  }, []);

  const choosePromotion = useCallback((piece: "q" | "r" | "b" | "n") => {
    setState((prev) => {
      if (!prev.pendingPromotion) return prev;
      const { from, to } = prev.pendingPromotion;
      // Stalemate check for promotion moves too.
      const game = gameRef.current;
      const sim = new Chess(game.fen());
      try {
        sim.move({ from: from as Square, to: to as Square, promotion: piece });
        if (sim.isStalemate() && !sim.isCheckmate()) {
          return {
            ...prev,
            pendingPromotion: null,
            pendingStalemateWarning: { from, to, promotion: piece },
            selected: null,
            legalTargets: [],
          };
        }
      } catch {
        // ignore
      }
      queueMicrotask(() => applyMove(from, to, piece));
      return { ...prev, pendingPromotion: null, selected: null, legalTargets: [] };
    });
  }, [applyMove]);

  const setDifficulty = useCallback((d: Difficulty) => {
    difficultyRef.current = d;
    setState((prev) => ({ ...prev, difficulty: d }));
  }, []);

  const setPlayerColor = useCallback((c: PlayColor) => {
    playerColorRef.current = c;
    setState((prev) => ({ ...prev, playerColor: c, aiColor: c === "w" ? "b" : "w" }));
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
    const aiColor: PlayColor = playerColorRef.current === "w" ? "b" : "w";

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

      const elapsed = Date.now() - thinkStart;
      if (elapsed < minThinkMs) {
        await new Promise((r) => setTimeout(r, minThinkMs - elapsed));
      }

      applyMove(data.from, data.to, data.promotion);

      // Derive winner from the server's gameResult (color-agnostic).
      let winner: "player" | "ai" | "draw" | null = null;
      if (data.gameOver) {
        const r = data.gameResult ?? "";
        if (r.includes("White wins")) winner = aiColor === "w" ? "ai" : "player";
        else if (r.includes("Black wins")) winner = aiColor === "b" ? "ai" : "player";
        else winner = "draw";
      }

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
        winner: winner ?? prev.winner,
        confetti:
          data.gameOver ? prev.confetti + 1 : prev.confetti,
      }));

      // LLM narration.
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
            mover: aiColor,
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

  // Trigger AI move whenever it becomes the AI's turn and game not over.
  useEffect(() => {
    if (state.gameOver) return;
    if (state.isAiThinking) return;
    if (state.turn === state.aiColor && !state.pendingPromotion) {
      const t = setTimeout(() => {
        void requestAiMove();
      }, 350);
      return () => clearTimeout(t);
    }
  }, [state.turn, state.aiColor, state.gameOver, state.isAiThinking, state.pendingPromotion, requestAiMove]);

  const newGame = useCallback((opts?: { difficulty?: Difficulty; playerColor?: PlayColor }) => {
    const g = new Chess(START_FEN);
    gameRef.current = g;
    const evalCp = evaluate(g);
    if (opts?.difficulty) difficultyRef.current = opts.difficulty;
    const color: PlayColor = opts?.playerColor ?? playerColorRef.current;
    playerColorRef.current = color;
    startedAtRef.current = Date.now();
    savedRef.current = false;
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
      difficulty: opts?.difficulty ?? prev.difficulty,
      pendingPromotion: null,
      review: null,
      reviewLoading: false,
      reviewIndex: -1,
      analysis: "",
      analysisLoading: false,
      moveCount: 0,
      playerColor: color,
      aiColor: color === "w" ? "b" : "w",
      winner: null,
      resigned: false,
      saved: false,
      confetti: prev.confetti,
      captured: [],
      lastCapture: null,
      captureNonce: 0,
      pendingStalemateWarning: null,
    }));
  }, []);

  const setPlayerName = useCallback((name: string) => {
    playerNameRef.current = name;
  }, []);

  // Persist a finished game to the database (idempotent via savedRef).
  const saveGame = useCallback(async (override?: { winner?: "player" | "ai" | "draw"; resultLabel?: string; resigned?: boolean }) => {
    if (savedRef.current) return;
    const g = gameRef.current;
    const history = g.history();
    if (history.length === 0 && !override?.resigned) return;
    savedRef.current = true;

    const winner = override?.winner ?? null;
    const resultLabel = override?.resultLabel ?? "Game ended";
    const resigned = override?.resigned ?? false;

    let result: "player_win" | "ai_win" | "draw";
    if (winner === "player") result = "player_win";
    else if (winner === "ai") result = "ai_win";
    else result = "draw";

    const difficulty = difficultyRef.current;
    const playerName = playerNameRef.current || "Player";
    const playerColor = playerColorRef.current;
    const durationSec = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000));

    try {
      await fetch("/api/save-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName,
          playerColor,
          difficulty,
          result,
          winner: winner ?? "draw",
          resultLabel,
          moveCount: history.length,
          durationSec,
          moves: history.join(" "),
          finalFen: g.fen(),
          startedAt: startedAtRef.current,
        }),
      });
      setState((prev) => ({ ...prev, saved: true }));
    } catch (err) {
      console.error("save-game failed", err);
      savedRef.current = false;
    }
  }, []);

  // Resign: the player concedes, AI wins.
  const resign = useCallback(() => {
    if (state.gameOver || state.isAiThinking) return;
    const aiColorLabel = state.aiColor === "w" ? "White" : "Black";
    const resultLabel = `${aiColorLabel} wins by resignation`;
    setState((prev) => ({
      ...prev,
      gameOver: true,
      resigned: true,
      winner: "ai",
      gameResult: resultLabel,
      confetti: prev.confetti + 1,
      isAiThinking: false,
      selected: null,
      legalTargets: [],
    }));
    soundManager.gameEnd();
    void saveGame({ winner: "ai", resultLabel, resigned: true });
  }, [state.gameOver, state.isAiThinking, state.aiColor, saveGame]);

  // Auto-save whenever a game ends by natural causes (checkmate/draw), once.
  useEffect(() => {
    if (!state.gameOver) return;
    if (state.saved) return;
    if (state.resigned) return;
    void saveGame({
      winner: state.winner ?? "draw",
      resultLabel: state.gameResult ?? "Game ended",
      resigned: false,
    });
  }, [state.gameOver, state.saved, state.resigned, state.winner, state.gameResult, saveGame]);

  const undo = useCallback(() => {
    const game = gameRef.current;
    if (state.isAiThinking) return;
    if (game.history().length === 0) return;
    // Undo back to the player's turn: undo AI move + player move if applicable.
    game.undo();
    if (game.history().length > 0 && game.turn() !== state.playerColor) {
      game.undo();
    }
    const evalCp = evaluate(game);
    // Rebuild captured list from history (re-simulate).
    const replay = new Chess(START_FEN);
    const recaptured: CapturedPiece[] = [];
    for (const san of game.history()) {
      const before = replay.fen();
      const mv = replay.move(san);
      if (!mv) break;
      if (mv.captured) {
        // find origin square of captured piece (from the `before` position)
        const beforeGame = new Chess(before);
        const board = beforeGame.board();
        // captured piece was on mv.to (or en-passant square)
        let capSquare: string = mv.to;
        if (mv.flags.includes("e")) {
          capSquare = `${mv.to[0]}${mv.color === "w" ? "5" : "4"}`;
        }
        recaptured.push({
          id: `c${CAPTURE_ID_COUNTER++}`,
          type: mv.captured as CapturedPiece["type"],
          color: mv.color === "w" ? "b" : "w",
          capturedBy: mv.color as "w" | "b",
          fromSquare: capSquare,
          nonce: recaptured.length + 1,
        });
      }
    }
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
      analysis: "",
      analysisLoading: false,
      moveCount: game.history().length,
      winner: null,
      resigned: false,
      saved: false,
      captured: recaptured,
      lastCapture: null,
      captureNonce: recaptured.length,
    }));
    savedRef.current = false;
  }, [state.isAiThinking, state.playerColor]);

  const requestReview = useCallback(async () => {
    const sans = gameRef.current.history();
    if (sans.length === 0) return;
    setState((prev) => ({
      ...prev,
      reviewLoading: true,
      review: null,
      reviewIndex: 0,
      analysis: "",
    }));
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
        reviewIndex: 0,
      }));
    } catch (err) {
      console.error("review failed", err);
      setState((prev) => ({ ...prev, reviewLoading: false }));
    }
  }, []);

  // Request an LLM-powered textual coaching analysis (used by the "Analyse Game"
  // button). Requires the review annotations to already be loaded so it can
  // reference specific moves.
  const requestAnalysis = useCallback(async () => {
    const sans = gameRef.current.history();
    if (sans.length === 0) return;
    // If the review markers haven't been computed yet, fetch them first so the
    // analysis can reference per-move annotations.
    let annotations = state.review?.annotations ?? [];
    if (annotations.length === 0) {
      setState((prev) => ({ ...prev, reviewLoading: true, reviewIndex: 0 }));
      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fen: START_FEN, sans }),
        });
        const data: ReviewResult = await res.json();
        annotations = data.annotations;
        setState((prev) => ({
          ...prev,
          review: data,
          reviewLoading: false,
          reviewIndex: 0,
        }));
      } catch {
        setState((prev) => ({ ...prev, reviewLoading: false }));
      }
    }

    setState((prev) => ({ ...prev, analysisLoading: true, analysis: "" }));
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sans,
          annotations,
          playerName: playerNameRef.current || "Player",
          playerColor: playerColorRef.current,
          result: gameRef.current.isGameOver()
            ? (state.gameResult ?? "Game finished")
            : "Game in progress (partial analysis)",
        }),
      });
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        analysis: (data.analysis as string) || "",
        analysisLoading: false,
      }));
    } catch (err) {
      console.error("analysis failed", err);
      setState((prev) => ({ ...prev, analysisLoading: false }));
    }
  }, [state.review, state.gameResult]);

  const setReviewIndex = useCallback((i: number) => {
    setState((prev) => ({ ...prev, reviewIndex: i }));
  }, []);

  const closeReview = useCallback(() => {
    setState((prev) => ({ ...prev, review: null, reviewIndex: -1, analysis: "" }));
  }, []);

  return {
    state,
    selectSquare,
    choosePromotion,
    confirmStalemateMove,
    cancelStalemateMove,
    setDifficulty,
    setPlayerColor,
    toggleHeatmap,
    setShowHeatmap,
    newGame,
    undo,
    resign,
    setPlayerName,
    requestReview,
    requestAnalysis,
    setReviewIndex,
    closeReview,
  };
}

export type UseChessGame = ReturnType<typeof useChessGame>;

export { START_FEN };
export type { MoveAnnotation };
