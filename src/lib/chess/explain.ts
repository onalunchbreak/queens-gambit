// Heuristic natural-language explanation of an AI move's intent.
// Produces a short tag + a one-sentence detail.

import { Chess, Move } from "chess.js";
import { MoveExplanation } from "./types";
import { PIECE_VALUES, squareToIndex, FILES } from "./evaluation";

const PIECE_NAMES: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const CENTER_SQUARES = new Set(["d4", "d5", "e4", "e5"]);
const EXTENDED_CENTER = new Set(["c3", "c4", "c5", "c6", "d3", "d4", "d5", "d6", "e3", "e4", "e5", "e6", "f3", "f4", "f5", "f6"]);

function kingZoneSquares(color: "w" | "b"): Set<string> {
  // squares around the enemy king's typical castled home
  // For simplicity, return kingside/queenside zones.
  const zone = color === "w"
    ? ["f7", "g7", "h7", "f8", "g8", "h8", "g5", "h5", "f6", "g6", "h6"]
    : ["f2", "g2", "h2", "f1", "g1", "h1", "g4", "h4", "f3", "g3", "h3"];
  return new Set(zone);
}

export function explainMove(gameBefore: Chess, move: Move, evalBefore: number, evalAfter: number): MoveExplanation {
  const mover = move.color; // 'w' | 'b'
  const enemy = mover === "w" ? "b" : "w";
  const piece = PIECE_NAMES[move.piece] ?? "piece";
  const capturedPiece = move.captured ? PIECE_NAMES[move.captured] : null;

  // Determine move number from history (ply count)
  const historyLen = gameBefore.history().length;

  // 1. Checkmate / check
  if (move.san.includes("#")) {
    return { short: "Checkmate", detail: `Delivering mate — the king has no escape.` };
  }
  if (move.san.includes("+")) {
    return { short: "Delivering a check", detail: `The ${piece} checks the enemy king, forcing a response.` };
  }

  // 2. Castling
  if (move.flags.includes("k")) {
    return { short: "Castling to safety", detail: `Tucking the king into the corner and activating the rook.` };
  }
  if (move.flags.includes("q")) {
    return { short: "Queenside castling", detail: `Securing the king and bringing the rook toward the center.` };
  }

  // 3. Winning material (capturing higher-value piece without obvious recapture)
  if (capturedPiece) {
    const victimVal = PIECE_VALUES[move.captured] ?? 0;
    const attackerVal = PIECE_VALUES[move.piece] ?? 0;
    // Check recapture: simulate the move and see if enemy can recapture on `to`.
    const clone = new Chess(gameBefore.fen());
    clone.move({ from: move.from, to: move.to, promotion: move.promotion });
    const enemyMoves = clone.moves({ verbose: true }) as Move[];
    const recapture = enemyMoves.find((m) => m.to === move.to && m.captured);
    if (victimVal > attackerVal + 20 && !recapture) {
      return { short: "Winning material", detail: `Snatching the ${capturedPiece} for free — a clean material gain.` };
    }
    if (victimVal > attackerVal + 20 && recapture) {
      return { short: "Winning material", detail: `Grabbing the ${capturedPiece}; even after a recapture, the exchange favors the mover.` };
    }
    if (victimVal === attackerVal) {
      return { short: "Initiating a trade", detail: `Exchanging the ${piece} for the ${capturedPiece} to simplify.` };
    }
    return { short: "Capturing", detail: `Taking the ${capturedPiece} with the ${piece}.` };
  }

  // 4. Promotion
  if (move.promotion) {
    return { short: "Promoting", detail: `Advancing the pawn to promote into a ${PIECE_NAMES[move.promotion] ?? "piece"}.` };
  }

  // 5. Eval swing — seizing initiative / salvaging
  const moverSign = mover === "w" ? 1 : -1;
  const delta = (evalAfter - evalBefore) * moverSign;
  if (delta >= 120) {
    return { short: "Seizing the initiative", detail: `This move sharply improves the position — the pressure is mounting.` };
  }

  // 6. Center control
  if (CENTER_SQUARES.has(move.to) || EXTENDED_CENTER.has(move.to)) {
    if (historyLen < 20 && (move.piece === "n" || move.piece === "b" || move.piece === "p")) {
      if (move.piece === "n" && historyLen < 14) {
        return { short: "Developing the knight", detail: `Bringing the knight into the game while eyeing the center.` };
      }
      if (move.piece === "b" && historyLen < 14) {
        return { short: "Developing the bishop", detail: `Unpinning the bishop onto an active diagonal.` };
      }
      if (move.piece === "p") {
        return { short: "Controlling the center", detail: `Advancing a pawn to stake out central territory.` };
      }
    }
    return { short: "Controlling the center", detail: `Planting the ${piece} on a key central square.` };
  }

  // 7. Attack toward enemy king zone
  const enemyZone = kingZoneSquares(enemy);
  if (enemyZone.has(move.to) && (move.piece === "q" || move.piece === "r" || move.piece === "b" || move.piece === "n")) {
    const side = move.to[0] < "e" ? "queenside" : "kingside";
    return { short: `Preparing a ${side} attack`, detail: `Swinging the ${piece} toward the enemy king's shelter.` };
  }

  // 8. Defending — does this move defend a hanging friendly piece?
  const clone2 = new Chess(gameBefore.fen());
  clone2.move({ from: move.from, to: move.to, promotion: move.promotion });
  // a "defensive" move: the destination now guards a friendly piece that was attacked
  // detect if eval improved modestly without central/attack pattern
  if (delta >= 20 && delta < 120 && historyLen >= 14) {
    return { short: "Reinforcing the position", detail: `Shoring up the structure and improving piece coordination.` };
  }

  // 9. Salvaging weak pawns
  if (move.piece === "p" && move.to.endsWith("3")) {
    return { short: "Salvaging the pawn structure", detail: `Providing support for neighboring pawns and solidifying the chain.` };
  }

  // 10. King safety (moving king or shielding)
  if (move.piece === "k" && historyLen >= 14) {
    return { short: "Improving king safety", detail: `Repositioning the monarch to a more secure square.` };
  }

  // Fallback
  return { short: "Improving piece placement", detail: `Re-routing the ${piece} to a more active, harmonious square.` };
}

// Helper to read file letter (unused export kept for parity)
export function fileLetter(i: number): string {
  return FILES[i % 8] ?? "?";
}

void squareToIndex;
