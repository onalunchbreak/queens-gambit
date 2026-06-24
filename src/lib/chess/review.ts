// Post-game review: replay all moves, evaluate before/after each,
// classify each move (Brilliant / Best / Good / Inaccuracy / Mistake / Blunder),
// and suggest the engine's preferred move where the played move was a real error.

import { Chess, Move } from "chess.js";
import { AnnotationKind, MoveAnnotation, ReviewResult } from "./types";
import { evaluate } from "./evaluation";
import { chooseMove } from "./engine";

// Classify based on the eval swing from the mover's perspective (centipawns).
// deltaMover < 0 means the mover's position worsened.
function classifyBySwing(deltaMover: number, playedWasBest: boolean): { kind: AnnotationKind; label: string } {
  if (playedWasBest) return { kind: "best", label: "Best move" };
  if (deltaMover <= -300) return { kind: "blunder", label: "Blunder" };
  if (deltaMover <= -150) return { kind: "mistake", label: "Mistake" };
  if (deltaMover <= -70) return { kind: "inaccuracy", label: "Inaccuracy" };
  if (deltaMover >= 60) return { kind: "good", label: "Good move" };
  return { kind: "good", label: "Good move" };
}

// Quick material count difference (white - black) from a position.
function materialBalance(game: Chess): number {
  const vals: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  let bal = 0;
  const board = game.board();
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const v = vals[cell.type] ?? 0;
      bal += cell.color === "w" ? v : -v;
    }
  }
  return bal;
}

export function reviewGame(initialFen: string, sans: string[]): ReviewResult {
  const game = new Chess(initialFen);
  const annotations: MoveAnnotation[] = [];

  for (let i = 0; i < sans.length; i++) {
    const san = sans[i];
    const byColor = game.turn();
    const evalBefore = evaluate(game);
    const matBefore = materialBalance(game);

    // Engine's preferred move (depth 2 — fast enough to run per ply).
    let engineBest: Move | undefined;
    let playedWasBest = false;
    try {
      const result = chooseMove(game, "club");
      engineBest = result.move;
    } catch {
      engineBest = undefined;
    }

    let played: Move;
    try {
      played = game.move(san) as Move;
    } catch {
      break;
    }
    const evalAfter = evaluate(game);
    const matAfter = materialBalance(game);

    const moverSign = byColor === "w" ? 1 : -1;
    const deltaMover = (evalAfter - evalBefore) * moverSign;

    if (engineBest && engineBest.san === san) playedWasBest = true;

    // Did the mover give up material (a sacrifice)?
    const matDelta = (matAfter - matBefore) * moverSign; // negative => mover lost material
    const gaveMaterial = matDelta <= -200;

    let { kind, label } = classifyBySwing(deltaMover, playedWasBest);

    // Brilliant: a material sacrifice that the position评估 confirms is sound
    // (mover didn't actually lose ground despite giving material).
    if (gaveMaterial && deltaMover >= -30 && kind !== "blunder" && kind !== "mistake") {
      kind = "brilliant";
      label = "Brilliant";
    }

    // Only attach a best-move suggestion when the played move was a real error.
    const suggestBest =
      engineBest &&
      engineBest.san !== san &&
      (kind === "blunder" || kind === "mistake" || kind === "inaccuracy");

    annotations.push({
      ply: i + 1,
      san,
      byColor,
      kind,
      label,
      evalBefore,
      evalAfter,
      bestMoveSan: suggestBest ? engineBest!.san : undefined,
      from: (played as Move).from,
      to: (played as Move).to,
    });
  }

  // Final result string
  let result = "Game unfinished";
  const finalGame = new Chess(initialFen);
  for (const s of sans) {
    try {
      finalGame.move(s);
    } catch {
      break;
    }
  }
  if (finalGame.isCheckmate()) {
    result = finalGame.turn() === "w" ? "0–1 — Black wins by checkmate" : "1–0 — White wins by checkmate";
  } else if (finalGame.isStalemate()) {
    result = "½–½ — Stalemate";
  } else if (finalGame.isInsufficientMaterial()) {
    result = "½–½ — Insufficient material";
  } else if (finalGame.isThreefoldRepetition()) {
    result = "½–½ — Threefold repetition";
  } else if (finalGame.isDraw()) {
    result = "½–½ — Draw";
  }

  const finalEval = evaluate(finalGame);

  const whiteBlunders = annotations.filter((a) => a.byColor === "w" && a.kind === "blunder").length;
  const blackBlunders = annotations.filter((a) => a.byColor === "b" && a.kind === "blunder").length;
  const brilliant = annotations.filter((a) => a.kind === "brilliant").length;
  const inaccuracies = annotations.filter((a) => a.kind === "inaccuracy" || a.kind === "mistake").length;
  const summaryParts: string[] = [];
  if (brilliant > 0) summaryParts.push(`${brilliant} brilliant move${brilliant > 1 ? "s" : ""}`);
  if (inaccuracies > 0) summaryParts.push(`${inaccuracies} inaccurac${inaccuracies > 1 ? "ies" : "y"}`);
  if (whiteBlunders || blackBlunders) {
    summaryParts.push(`${whiteBlunders + blackBlunders} blunder${whiteBlunders + blackBlunders > 1 ? "s" : ""}`);
  }
  const summary = summaryParts.length
    ? `A fighting game — ${summaryParts.join(", ")}. ${result}.`
    : `A clean, hard-fought game. ${result}.`;

  return { annotations, summary, finalEval, result };
}
