import { Chess } from "chess.js";
import { PieceInstance } from "./useChessGame";
import { AnnotationKind, MoveAnnotation } from "@/lib/chess/types";

let ID = 1;
export function piecesFromFen(fen: string): PieceInstance[] {
  const game = new Chess(fen);
  const board = game.board();
  const out: PieceInstance[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      out.push({
        id: `rv${ID++}`,
        type: cell.type as PieceInstance["type"],
        color: cell.color as "w" | "b",
        square: `${"abcdefgh"[c]}${8 - r}`,
      });
    }
  }
  return out;
}

export interface ReviewPosition {
  fen: string;
  pieces: PieceInstance[];
  lastMove: { from: string; to: string } | null;
  marker: { square: string; kind: AnnotationKind } | null;
  arrow: { from: string; to: string; kind: AnnotationKind } | null;
  annotation: MoveAnnotation | null;
}

// Replay sans up to `ply` moves and return the review position info.
// ply = 0 => initial position. ply = N => position after the Nth move.
export function reviewPosition(
  startFen: string,
  sans: string[],
  annotations: MoveAnnotation[],
  ply: number,
): ReviewPosition {
  const game = new Chess(startFen);
  const total = sans.length;
  const steps = Math.max(0, Math.min(ply, total));
  let lastMove: { from: string; to: string } | null = null;

  for (let i = 0; i < steps; i++) {
    let mv;
    try {
      mv = game.move(sans[i]);
    } catch {
      break;
    }
    if (!mv) break;
    lastMove = { from: mv.from, to: mv.to };
  }

  const fen = game.fen();
  const pieces = piecesFromFen(fen);

  let marker: ReviewPosition["marker"] = null;
  let arrow: ReviewPosition["arrow"] = null;
  let annotation: MoveAnnotation | null = null;

  if (steps >= 1 && steps <= annotations.length) {
    annotation = annotations[steps - 1];
    if (annotation) {
      // Marker on the played move's destination.
      if (
        annotation.kind === "brilliant" ||
        annotation.kind === "blunder" ||
        annotation.kind === "mistake" ||
        annotation.kind === "best"
      ) {
        marker = { square: annotation.to ?? "", kind: annotation.kind };
      }
      // Suggested best-move arrow when the played move was suboptimal.
      if (
        annotation.bestMoveSan &&
        (annotation.kind === "blunder" ||
          annotation.kind === "mistake" ||
          annotation.kind === "inaccuracy")
      ) {
        // Find the from/to of the suggested best move at the position BEFORE this ply.
        const before = new Chess(startFen);
        for (let i = 0; i < steps - 1; i++) {
          try {
            before.move(sans[i]);
          } catch {
            break;
          }
        }
        const candidate = before
          .moves({ verbose: true }) as { san: string; from: string; to: string }[];
        const best = candidate.find((m) => m.san === annotation.bestMoveSan);
        if (best) {
          arrow = { from: best.from, to: best.to, kind: annotation.kind };
        }
      }
    }
  }

  return { fen, pieces, lastMove, marker, arrow, annotation };
}
