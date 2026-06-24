// POST /api/save-game
// Records a finished Harmon's Gambit game session to the database.
// Body:
//   playerName, playerColor ('w'|'b'), difficulty,
//   result ('player_win'|'ai_win'|'draw'), winner ('player'|'ai'|'draw'),
//   resultLabel, moveCount, durationSec, moves (space-joined SAN), finalFen, startedAt (ms)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SaveGameBody {
  playerName?: string;
  playerColor?: string;
  difficulty?: string;
  result?: string;
  winner?: string;
  resultLabel?: string;
  moveCount?: number;
  durationSec?: number;
  moves?: string;
  finalFen?: string;
  startedAt?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SaveGameBody;

    const playerName = (body.playerName ?? "Player").toString().slice(0, 60);
    const playerColor = body.playerColor === "b" ? "b" : "w";
    const difficulty = ["novice", "club", "master"].includes(body.difficulty ?? "")
      ? (body.difficulty as string)
      : "club";
    const result = ["player_win", "ai_win", "draw"].includes(body.result ?? "")
      ? (body.result as string)
      : "draw";
    const winner = ["player", "ai", "draw"].includes(body.winner ?? "")
      ? (body.winner as string)
      : "draw";
    const resultLabel = (body.resultLabel ?? "").toString().slice(0, 120);
    const moveCount = Math.max(0, Math.min(500, Math.floor(Number(body.moveCount) || 0)));
    const durationSec = Math.max(0, Math.min(86400, Math.floor(Number(body.durationSec) || 0)));
    const moves = (body.moves ?? "").toString().slice(0, 4000);
    const finalFen = (body.finalFen ?? "").toString().slice(0, 120);
    const startedAt = body.startedAt && Number.isFinite(body.startedAt)
      ? new Date(body.startedAt)
      : new Date();

    const session = await db.gameSession.create({
      data: {
        playerName,
        playerColor,
        difficulty,
        result,
        winner,
        resultLabel,
        moveCount,
        durationSec,
        moves,
        finalFen,
        startedAt,
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, id: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
