// POST /api/analyze
// Generates a personalized textual analysis of a finished chess game using the LLM.
// Body: { sans: string[], annotations: MoveAnnotation[], playerName: string,
//         playerColor: 'w'|'b', result: string }
// Returns: { analysis: string } — a multi-paragraph coaching analysis with
// specific, move-referenced suggestions for both the player and the AI.

import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { MoveAnnotation } from "@/lib/chess/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AnalyzeBody {
  sans?: string[];
  annotations?: MoveAnnotation[];
  playerName?: string;
  playerColor?: string;
  result?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeBody;
    const sans = Array.isArray(body.sans) ? body.sans : [];
    const annotations = Array.isArray(body.annotations) ? body.annotations : [];
    const playerName = (body.playerName || "the player").slice(0, 40);
    const playerColor = body.playerColor === "b" ? "Black" : "White";
    const aiColor = body.playerColor === "b" ? "White" : "Black";
    const result = (body.result || "Game finished").slice(0, 120);

    if (sans.length === 0) {
      return NextResponse.json({ analysis: "No moves to analyze." });
    }

    // Build a compact move list with annotations for the LLM.
    const annotated = annotations
      .map((a) => {
        const side = a.byColor === "w" ? "White" : "Black";
        const who = a.byColor === (body.playerColor || "w") ? playerName : "Harmon AI";
        const extra = a.bestMoveSan && a.bestMoveSan !== a.san ? ` (engine preferred ${a.bestMoveSan})` : "";
        return `${a.ply}. ${side} (${who}): ${a.san} [${a.label}, eval ${(a.evalAfter / 100).toFixed(1)}cp${extra}]`;
      })
      .join("\n");

    const moveList = sans
      .map((s, i) => `${i + 1}. ${s}`)
      .join("  ");

    // Highlight the most significant errors/brilliancies for the LLM to focus on.
    const blunders = annotations.filter((a) => a.kind === "blunder");
    const mistakes = annotations.filter((a) => a.kind === "mistake");
    const brilliants = annotations.filter((a) => a.kind === "brilliant");
    const playerErrors = annotations.filter(
      (a) => a.byColor === (body.playerColor || "w") && (a.kind === "blunder" || a.kind === "mistake" || a.kind === "inaccuracy"),
    );
    const aiErrors = annotations.filter(
      (a) => a.byColor !== (body.playerColor || "w") && (a.kind === "blunder" || a.kind === "mistake" || a.kind === "inaccuracy"),
    );

    const zai = await ZAI.create();

    const system =
      "You are a thoughtful, encouraging chess coach in the spirit of Beth Harmon. " +
      "You analyze finished games and give specific, move-referenced feedback: what was played well, " +
      "what could have been better, missed tactical opportunities, positional improvements, and " +
      "whether the win could have come faster or the loss been avoided. " +
      "Write in clear paragraphs (max 4 paragraphs, ~220 words total). " +
      "Reference specific move numbers. Be warm but precise. Never use markdown headers or bullet points — just flowing prose. " +
      "Address the player by name.";

    const user =
      `Game result: ${result}\n` +
      `${playerName} played ${playerColor}. Harmon AI played ${aiColor}.\n\n` +
      `Move list:\n${moveList}\n\n` +
      `Annotated moves:\n${annotated}\n\n` +
      `Summary: ${brilliants.length} brilliant, ${mistakes.length} mistakes, ${blunders.length} blunders. ` +
      `${playerName} made ${playerErrors.length} significant errors; Harmon AI made ${aiErrors.length}.\n\n` +
      `Write a personalized coaching analysis for ${playerName}. Cover: (1) the opening phase and whether ` +
      `principles were followed, (2) the key moments / turning points referencing specific move numbers, ` +
      `(3) what ${playerName} could have done better or earlier to win faster / avoid the result, ` +
      `(4) a brief encouraging closing note. If the player won, mention whether the win could have come sooner. ` +
      `If the player lost or drew, mention the critical missed chance.`;

    let analysis = "";
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: system },
          { role: "user", content: user },
        ],
        thinking: { type: "disabled" },
      });
      analysis = (completion.choices[0]?.message?.content ?? "").trim();
    } catch (e) {
      analysis = "";
    }

    if (!analysis) {
      analysis =
        `${playerName}, this game featured ${brilliants.length} brilliant move(s), ${mistakes.length} mistake(s), and ${blunders.length} blunder(s). ` +
        `The key moments are marked on the board — review the highlighted squares to see where the evaluation shifted most. ` +
        `Focus on the positions where the engine's suggested move differs from what was played.`;
    }

    // Hard safety cap.
    if (analysis.length > 1600) {
      analysis = analysis.slice(0, 1597).replace(/\s+\S*$/, "") + "…";
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ analysis: "", error: message }, { status: 200 });
  }
}
