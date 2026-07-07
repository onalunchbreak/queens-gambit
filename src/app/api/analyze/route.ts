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
    const inaccuracies = annotations.filter((a) => a.kind === "inaccuracy");
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
    // Retry up to 3 times on rate-limit (429) or transient errors.
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const completion = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: system },
            { role: "user", content: user },
          ],
          thinking: { type: "disabled" },
        });
        analysis = (completion.choices[0]?.message?.content ?? "").trim();
        if (analysis) break;
      } catch (e) {
        // Wait before retry (exponential backoff): 1s, 2s, 4s.
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    // If the LLM failed after retries, build a richer heuristic fallback that
    // still references the player's specific mistakes and the game result.
    if (!analysis) {
      const playerSide = playerColor;
      const parts: string[] = [];
      parts.push(
        `${playerName}, your game as ${playerSide} ended with: ${result}.`,
      );
      if (brilliants.length > 0) {
        parts.push(
          `You played ${brilliants.length} brilliant move${brilliants.length > 1 ? "s" : ""} — these are marked in emerald on the replay board and represent your strongest moments.`,
        );
      }
      if (playerErrors.length > 0) {
        const worst = playerErrors
          .slice()
          .sort((a, b) => {
            const da = (a.evalAfter - a.evalBefore) * (a.byColor === "w" ? 1 : -1);
            const db = (b.evalAfter - b.evalBefore) * (b.byColor === "w" ? 1 : -1);
            return da - db;
          })[0];
        parts.push(
          `Your most costly moment was move ${worst.ply} (${worst.san}), marked as a ${worst.label.toLowerCase()}. The engine preferred ${worst.bestMoveSan ?? "a different move"} there.`,
        );
      }
      if (mistakes.length === 0 && blunders.length === 0 && inaccuracies.length === 0) {
        parts.push("You played a clean game with no significant errors — a disciplined performance.");
      }
      parts.push(
        `Step through the replay with the Prev/Next buttons to review each move, and focus on the positions where the evaluation bar shifted most.`,
      );
      analysis = parts.join(" ");
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
