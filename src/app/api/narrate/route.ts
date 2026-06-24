// POST /api/narrate
// Body: { fenBefore, move: {from,to,promotion,san}, difficulty, playerName, mover: 'w'|'b' }
// Returns a short, in-character LLM narration of the AI's move intent.
// Falls back gracefully if the LLM is unavailable.

import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NarrateBody {
  fenBefore?: string;
  san?: string;
  from?: string;
  to?: string;
  mover?: "w" | "b";
  difficulty?: string;
  heuristicShort?: string;
  heuristicDetail?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as NarrateBody;
    const san = body.san ?? "the move";
    const heuristic = body.heuristicShort ?? "improving the position";
    const detail = body.heuristicDetail ?? "";
    const mover = body.mover === "w" ? "White (Harmon's Gambit AI)" : "Black (Harmon's Gambit AI)";

    const zai = await ZAI.create();

    const system =
      "You are the inner monologue of a chess engine named Harmon, " +
      "inspired by Beth Harmon from The Queen's Gambit. You narrate the AI's " +
      "own moves in one elegant sentence (max 28 words), in a calm, " +
      "calculating, slightly literary voice. Never use bullet points or headings. " +
      "Output only the single sentence.";

    const user =
      `The engine played ${san} (${mover}). Heuristic intent: ${heuristic}. ${detail} ` +
      `Write one graceful sentence describing the strategic intent of this move, ` +
      `as if Beth were thinking it at the board.`;

    let narration = "";
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: system },
          { role: "user", content: user },
        ],
        thinking: { type: "disabled" },
      });
      narration = (completion.choices[0]?.message?.content ?? "").trim();
    } catch (e) {
      // fallback
      narration = "";
    }

    if (!narration) {
      narration = `${heuristic}. ${detail}`.trim();
    }

    // Hard cap length as a safety net.
    if (narration.length > 220) {
      narration = narration.slice(0, 217).replace(/\s+\S*$/, "") + "…";
    }

    return NextResponse.json({ narration });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ narration: "", error: message }, { status: 200 });
  }
}
