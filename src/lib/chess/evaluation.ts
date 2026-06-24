// Position evaluation + influence heatmap for Harmon's Gambit
// Indexing convention: index 0 = a8 (top-left), 63 = h1 (bottom-right).
// This matches chess.js `board()` row order (rank 8 first) and our UI grid.

import { Chess } from "chess.js";
import type { Square } from "chess.js";

export const FILES = "abcdefgh";

export function squareToIndex(sq: string): number {
  const file = sq.charCodeAt(0) - 97; // a=0
  const rank = parseInt(sq[1], 10); // 1..8
  return (8 - rank) * 8 + file;
}

export function indexToSquare(i: number): string {
  const file = i % 8;
  const rank = 8 - Math.floor(i / 8);
  return FILES[file] + rank;
}

export const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Influence weight per piece type (for heatmap "who controls this square")
const INFLUENCE_WEIGHT: Record<string, number> = {
  p: 1,
  n: 1.2,
  b: 1.2,
  r: 1.8,
  q: 2.5,
  k: 0.9,
};

// Piece-square tables, white perspective, index 0 = a8 ... 63 = h1.
// Values are in centipawns. Standard simplified tables.
const PST_PAWN = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const PST_KNIGHT = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const PST_BISHOP = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];

const PST_ROOK = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];

const PST_QUEEN = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];

// King midgame table (encourage castling / safety)
const PST_KING = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];

const PST: Record<string, number[]> = {
  p: PST_PAWN,
  n: PST_KNIGHT,
  b: PST_BISHOP,
  r: PST_ROOK,
  q: PST_QUEEN,
  k: PST_KING,
};

// Mirror an index vertically (for black pieces): flip rank.
function mirror(i: number): number {
  const rank = Math.floor(i / 8);
  const file = i % 8;
  return (7 - rank) * 8 + file;
}

const MATE_SCORE = 100000;

// Knight offsets
const KNIGHT_DELTAS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_DELTAS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1],
  [0, 1], [1, -1], [1, 0], [1, 1],
];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS];

interface BoardCell {
  type: string; // 'p','n','b','r','q','k'
  color: "w" | "b";
  square: Square;
}

// Build an 8x8 grid (rank 8 first) of cells | null for fast indexing.
function buildGrid(game: Chess): (BoardCell | null)[][] {
  const b = game.board();
  return b.map((row) =>
    row.map((cell) =>
      cell ? { type: cell.type, color: cell.color, square: cell.square as Square } : null,
    ),
  );
}

// Compute influence heatmap: for each square, sum of (white attackers - black attackers)
// weighted by piece influence. Returns 64-length array normalized to roughly [-1, 1].
export function computeHeatmap(game: Chess): number[] {
  const grid = buildGrid(game);
  const influence = new Array(64).fill(0);

  const add = (r: number, c: number, color: "w" | "b", weight: number) => {
    if (r < 0 || r > 7 || c < 0 || c > 7) return;
    const idx = r * 8 + c;
    influence[idx] += color === "w" ? weight : -weight;
  };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = grid[r][c];
      if (!cell) continue;
      const w = INFLUENCE_WEIGHT[cell.type] ?? 1;
      const color = cell.color;

      switch (cell.type) {
        case "p": {
          // pawns capture diagonally forward
          const dir = color === "w" ? -1 : 1; // white moves up (toward rank 8 => r decreases)
          add(r + dir, c - 1, color, w);
          add(r + dir, c + 1, color, w);
          break;
        }
        case "n": {
          for (const [dr, dc] of KNIGHT_DELTAS) add(r + dr, c + dc, color, w);
          break;
        }
        case "k": {
          for (const [dr, dc] of KING_DELTAS) add(r + dr, c + dc, color, w);
          break;
        }
        case "b":
        case "r":
        case "q": {
          const dirs =
            cell.type === "b" ? BISHOP_DIRS : cell.type === "r" ? ROOK_DIRS : QUEEN_DIRS;
          for (const [dr, dc] of dirs) {
            let nr = r + dr;
            let nc = c + dc;
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
              add(nr, nc, color, w);
              const blocker = grid[nr][nc];
              if (blocker) break; // sliding stops; still counts the square itself
              nr += dr;
              nc += dc;
            }
          }
          break;
        }
      }
    }
  }

  // Normalize with a soft cap so the heatmap renders nicely.
  const cap = 8;
  return influence.map((v) => {
    const clamped = Math.max(-cap, Math.min(cap, v));
    return clamped / cap;
  });
}

// Static evaluation from White's perspective in centipawns.
// Positive = good for White. Handles mate via game state.
export function evaluate(game: Chess): number {
  if (game.isCheckmate()) {
    // side to move is checkmated => bad for side to move
    return game.turn() === "w" ? -MATE_SCORE : MATE_SCORE;
  }
  if (game.isDraw() || game.isStalemate() || game.isInsufficientMaterial() || game.isThreefoldRepetition()) {
    return 0;
  }

  const grid = buildGrid(game);
  let score = 0;
  let bishopCount = { w: 0, b: 0 };

  // pawn files for doubled/isolated detection
  const pawnFiles = { w: new Array(8).fill(0), b: new Array(8).fill(0) };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = grid[r][c];
      if (!cell) continue;
      const idx = r * 8 + c;
      const base = PIECE_VALUES[cell.type];
      const pst = PST[cell.type];
      // For black pieces, use mirrored PST index.
      const pstIdx = cell.color === "w" ? idx : mirror(idx);
      const positional = pst[pstIdx];
      const sign = cell.color === "w" ? 1 : -1;
      score += sign * (base + positional);

      if (cell.type === "b") bishopCount[cell.color]++;
      if (cell.type === "p") pawnFiles[cell.color][c]++;
    }
  }

  // Bishop pair
  if (bishopCount.w >= 2) score += 30;
  if (bishopCount.b >= 2) score -= 30;

  // Doubled / isolated pawns
  for (let f = 0; f < 8; f++) {
    if (pawnFiles.w[f] > 1) score -= 12 * (pawnFiles.w[f] - 1);
    if (pawnFiles.b[f] > 1) score += 12 * (pawnFiles.b[f] - 1);
    const wIso = pawnFiles.w[f] > 0 && (f === 0 || pawnFiles.w[f - 1] === 0) && (f === 7 || pawnFiles.w[f + 1] === 0);
    const bIso = pawnFiles.b[f] > 0 && (f === 0 || pawnFiles.b[f - 1] === 0) && (f === 7 || pawnFiles.b[f + 1] === 0);
    if (wIso) score -= 15;
    if (bIso) score += 15;
  }

  // Tiny mobility nudge using legal move count for side to move.
  // (cheap-ish; only one generation.)
  const mobility = game.moves().length;
  score += game.turn() === "w" ? mobility * 2 : -mobility * 2;

  return score;
}

// Convert a centipawn eval (white POV) to a 0..1 probability for the eval bar.
export function evalToProbability(cp: number): number {
  if (cp >= MATE_SCORE - 1000) return 0.995;
  if (cp <= -(MATE_SCORE - 1000)) return 0.005;
  // sigmoid centered at 0, scaled
  const k = 1 / 250;
  return 1 / (1 + Math.exp(-cp * k));
}

export function evalLabel(cp: number, turn: "w" | "b"): string {
  if (cp >= MATE_SCORE - 1000) return "Checkmate imminent for White";
  if (cp <= -(MATE_SCORE - 1000)) return "Checkmate imminent for Black";
  const abs = Math.abs(cp);
  const side = cp > 0 ? "White" : cp < 0 ? "Black" : "";
  const who = (s: string) => s;
  if (abs < 30) return "Position is roughly equal";
  if (abs < 80) return `${who(side)} is slightly better`;
  if (abs < 200) return `${who(side)} is better`;
  if (abs < 500) return `${who(side)} is clearly better`;
  return `${who(side)} is winning`;
  // (turn reserved for future phrasing)
  void turn;
}

export { MATE_SCORE };
