// AI engine for Harmon's Gambit — minimax with alpha-beta pruning,
// quiescence search (captures only), and move ordering (MVV-LVA).
// Three difficulty levels: novice / club / master.

import { Chess, Move } from "chess.js";
import { Difficulty } from "./types";
import { evaluate, PIECE_VALUES, MATE_SCORE } from "./evaluation";

const INF = 1_000_000;

interface ScoredMove {
  move: Move;
  score: number;
}

// MVV-LVA ordering: prefer capturing high-value victims with low-value attackers.
function captureScore(m: Move): number {
  if (!m.captured) return 0;
  const victim = PIECE_VALUES[m.captured] ?? 0;
  const attacker = PIECE_VALUES[m.piece] ?? 0;
  return 10 * victim - attacker;
}

function orderedMoves(game: Chess): Move[] {
  const moves = game.moves({ verbose: true }) as Move[];
  moves.sort((a, b) => {
    const ca = captureScore(a);
    const cb = captureScore(b);
    if (cb !== ca) return cb - ca;
    // promotions next
    const pa = a.promotion ? 5 : 0;
    const pb = b.promotion ? 5 : 0;
    return pb - pa;
  });
  return moves;
}

// Quiescence search: extend search through captures to avoid horizon effect.
function quiescence(game: Chess, alpha: number, beta: number, color: number): number {
  const standPat = color * evaluate(game);
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  const captures = (game.moves({ verbose: true }) as Move[]).filter((m) => m.captured);
  captures.sort((a, b) => captureScore(b) - captureScore(a));

  for (const m of captures) {
    game.move(m);
    const score = -quiescence(game, -beta, -alpha, -color);
    game.undo();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// Negamax with alpha-beta. `color` = +1 if side-to-move is the maximizing (white) side, -1 if black.
function negamax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  color: number,
  deadline: number,
): number {
  if (Date.now() > deadline) {
    return color * evaluate(game);
  }
  if (game.isGameOver()) {
    if (game.isCheckmate()) {
      // side to move is mated => very bad for side to move
      return -MATE_SCORE + (1000 - depth); // prefer faster mates
    }
    return 0; // draw
  }
  if (depth <= 0) {
    return quiescence(game, alpha, beta, color);
  }

  const moves = orderedMoves(game);
  for (const m of moves) {
    game.move(m);
    const score = -negamax(game, depth - 1, -beta, -alpha, -color, deadline);
    game.undo();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// Root search: returns scored moves.
function searchRoot(game: Chess, depth: number, timeBudgetMs: number): ScoredMove[] {
  const color = game.turn() === "w" ? 1 : -1;
  const deadline = Date.now() + timeBudgetMs;
  const moves = orderedMoves(game);
  const scored: ScoredMove[] = [];

  let alpha = -INF;
  const beta = INF;

  for (const m of moves) {
    game.move(m);
    const score = -negamax(game, depth - 1, -beta, -alpha, -color, deadline);
    game.undo();
    scored.push({ move: m, score });
    if (score > alpha) alpha = score;
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// Choose the AI move for the given difficulty.
export function chooseMove(game: Chess, difficulty: Difficulty): { move: Move; scored: ScoredMove[] } {
  const turn = game.turn();
  const color = turn === "w" ? 1 : -1;

  if (difficulty === "novice") {
    // Depth 1, then pick from a wider pool with randomness + occasional blunder.
    const scored = searchRoot(game, 1, 600);
    if (scored.length === 0) {
      const fallback = orderedMoves(game)[0];
      return { move: fallback, scored: [] };
    }
    // 25% chance: pick a random move from the lower-rated half (genuine novice).
    if (Math.random() < 0.25 && scored.length > 1) {
      const lowerHalf = scored.slice(Math.floor(scored.length / 2));
      const pick = lowerHalf[Math.floor(Math.random() * lowerHalf.length)];
      return { move: pick.move, scored };
    }
    // Otherwise pick from top ~5 with weighted randomness toward the best.
    const pool = scored.slice(0, Math.min(5, scored.length));
    // weight = exp(-rank/2)
    const weights = pool.map((_, i) => Math.exp(-i / 2));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let chosen = pool[0];
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        chosen = pool[i];
        break;
      }
    }
    return { move: chosen.move, scored };
  }

  if (difficulty === "club") {
    const scored = searchRoot(game, 2, 1500);
    if (scored.length === 0) {
      const fallback = orderedMoves(game)[0];
      return { move: fallback, scored: [] };
    }
    // Light randomness among near-equal best moves (within 25cp).
    const best = scored[0].score;
    const ties = scored.filter((s) => best - s.score <= 25);
    const pick = ties[Math.floor(Math.random() * ties.length)];
    return { move: pick.move, scored };
  }

  // master: iterative deepening 3 -> 4 with a time budget.
  const scored3 = searchRoot(game, 3, 2000);
  let best = scored3;
  // attempt depth 4 with a tighter budget (skip if board is tactically busy / time short)
  if (Date.now() < Date.now()) {
    // no-op placeholder
  }
  try {
    const scored4 = searchRoot(game, 4, 3500);
    if (scored4.length) best = scored4;
  } catch {
    // ignore and keep depth-3 result
  }
  if (best.length === 0) {
    const fallback = orderedMoves(game)[0];
    return { move: fallback, scored: [] };
  }
  // Among near-equal best (within 12cp) pick the most natural (first = highest).
  const top = best[0].score;
  const ties = best.filter((s) => top - s.score <= 12);
  void color;
  return { move: ties[0].move, scored: best };
}

// Evaluate a specific position (for the eval bar) — exposed wrapper.
export function evaluatePosition(game: Chess): number {
  return evaluate(game);
}

export { orderedMoves, searchRoot };
