// GET /api/leaderboard
// Returns aggregated leaderboard data:
//   - topPlayers: ranked by wins, with avg time, fastest win, games played
//   - recentGames: most recent finished games

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface LeaderboardPlayer {
  playerName: string;
  wins: number;
  losses: number;
  draws: number;
  games: number;
  // average seconds taken to win (across the player's wins)
  avgWinSec: number;
  // average number of moves in winning games
  avgWinMoves: number;
  // fastest win in seconds
  fastestWinSec: number;
  // most-played difficulty
  topDifficulty: string;
}

export interface RecentGame {
  id: string;
  playerName: string;
  playerColor: string;
  difficulty: string;
  result: string;
  winner: string;
  resultLabel: string;
  moveCount: number;
  durationSec: number;
  finishedAt: string;
}

export async function GET(_req: NextRequest) {
  try {
    // Fetch all sessions (leaderboard is aggregated in JS — fine for this scale).
    const sessions = await db.gameSession.findMany({
      orderBy: { finishedAt: "desc" },
    });

    // Aggregate per player.
    const map = new Map<string, {
      playerName: string;
      wins: number;
      losses: number;
      draws: number;
      winSecs: number[];
      winMoves: number[];
      diff: Record<string, number>;
    }>();

    for (const s of sessions) {
      const key = s.playerName;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          playerName: s.playerName,
          wins: 0,
          losses: 0,
          draws: 0,
          winSecs: [],
          winMoves: [],
          diff: {},
        };
        map.set(key, entry);
      }
      if (s.winner === "player") {
        entry.wins++;
        entry.winSecs.push(s.durationSec);
        entry.winMoves.push(s.moveCount);
      } else if (s.winner === "ai") {
        entry.losses++;
      } else {
        entry.draws++;
      }
      entry.diff[s.difficulty] = (entry.diff[s.difficulty] ?? 0) + 1;
    }

    const players: LeaderboardPlayer[] = [...map.values()].map((e) => {
      const avgWinSec = e.winSecs.length
        ? Math.round(e.winSecs.reduce((a, b) => a + b, 0) / e.winSecs.length)
        : 0;
      const avgWinMoves = e.winMoves.length
        ? Math.round(e.winMoves.reduce((a, b) => a + b, 0) / e.winMoves.length)
        : 0;
      const fastestWinSec = e.winSecs.length ? Math.min(...e.winSecs) : 0;
      const topDifficulty = Object.entries(e.diff).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "club";
      return {
        playerName: e.playerName,
        wins: e.wins,
        losses: e.losses,
        draws: e.draws,
        games: e.wins + e.losses + e.draws,
        avgWinSec,
        avgWinMoves,
        fastestWinSec,
        topDifficulty,
      };
    });

    // Sort: by wins desc, then by fastest win asc, then by games desc.
    players.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.fastestWinSec !== b.fastestWinSec) {
        if (a.fastestWinSec === 0) return 1;
        if (b.fastestWinSec === 0) return -1;
        return a.fastestWinSec - b.fastestWinSec;
      }
      return b.games - a.games;
    });

    const topPlayers = players.slice(0, 10);

    const recentGames: RecentGame[] = sessions.slice(0, 12).map((s) => ({
      id: s.id,
      playerName: s.playerName,
      playerColor: s.playerColor,
      difficulty: s.difficulty,
      result: s.result,
      winner: s.winner,
      resultLabel: s.resultLabel,
      moveCount: s.moveCount,
      durationSec: s.durationSec,
      finishedAt: s.finishedAt.toISOString(),
    }));

    return NextResponse.json({
      topPlayers,
      recentGames,
      totalGames: sessions.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
