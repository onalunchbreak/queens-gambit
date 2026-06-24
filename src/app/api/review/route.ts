// POST /api/review
// Body: { fen: string, sans: string[] }
// Returns a full post-game review with per-move annotations.

import { NextRequest, NextResponse } from "next/server";
import { reviewGame } from "@/lib/chess/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fen: string = body?.fen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const sans: string[] = Array.isArray(body?.sans) ? body.sans : [];

    const review = reviewGame(fen, sans);
    return NextResponse.json(review);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
