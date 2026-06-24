// POST /api/ai-move
// Body: { fen: string, difficulty: 'novice' | 'club' | 'master' }
// Returns the AI's chosen move + evaluation + heatmap + heuristic explanation.

import { NextRequest, NextResponse } from "next/server";
import { Chess, Move } from "chess.js";
import { chooseMove } from "@/lib/chess/engine";
import { computeHeatmap, evaluate, evalLabel } from "@/lib/chess/evaluation";
import { explainMove } from "@/lib/chess/explain";
import { Difficulty } from "@/lib/chess/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function gameResultString(game: Chess): string | undefined {
  if (game.isCheckmate()) {
    return game.turn() === "w" ? "Black wins by checkmate" : "White wins by checkmate";
  }
  if (game.isStalemate()) return "Draw — Stalemate";
  if (game.isInsufficientMaterial()) return "Draw — Insufficient material";
  if (game.isThreefoldRepetition()) return "Draw — Threefold repetition";
  if (game.isDraw()) return "Draw";
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fen: string | undefined = body?.fen;
    const difficulty: Difficulty = (body?.difficulty as Difficulty) ?? "club";

    if (!fen || typeof fen !== "string") {
      return NextResponse.json({ error: "Missing 'fen' field" }, { status: 400 });
    }

    const game = new Chess(fen);
    if (game.isGameOver()) {
      return NextResponse.json({
        gameOver: true,
        gameResult: gameResultString(game),
        fenAfter: fen,
        evaluation: evaluate(game),
        evaluationLabel: evalLabel(evaluate(game), game.turn()),
        heatmap: computeHeatmap(game),
        explanation: { short: "Game over", detail: gameResultString(game) ?? "" },
      });
    }

    const evalBefore = evaluate(game);
    const { move } = chooseMove(game, difficulty);
    const moveObj = move as Move;

    // Apply the move on a clone to compute the resulting state.
    const after = new Chess(fen);
    after.move({ from: moveObj.from, to: moveObj.to, promotion: moveObj.promotion });

    const evalAfter = evaluate(after);
    const heatmap = computeHeatmap(after);
    const explanation = explainMove(game, moveObj, evalBefore, evalAfter);

    const isCheck = after.inCheck() && !after.isCheckmate();
    const gameOver = after.isGameOver();

    return NextResponse.json({
      from: moveObj.from,
      to: moveObj.to,
      promotion: moveObj.promotion,
      san: moveObj.san,
      fenAfter: after.fen(),
      isCapture: !!moveObj.captured,
      isCheck,
      isCastle: moveObj.flags.includes("k") || moveObj.flags.includes("q"),
      isPromotion: !!moveObj.promotion,
      evaluation: evalAfter,
      evaluationLabel: evalLabel(evalAfter, after.turn()),
      heatmap,
      explanation,
      gameOver,
      gameResult: gameOver ? gameResultString(after) : undefined,
      turn: gameOver ? null : after.turn(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
