"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Clock, Swords, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DIFFICULTIES } from "@/lib/chess/types";

interface LeaderboardPlayer {
  playerName: string;
  wins: number;
  losses: number;
  draws: number;
  games: number;
  avgWinSec: number;
  avgWinMoves: number;
  fastestWinSec: number;
  topDifficulty: string;
}

interface RecentGame {
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

interface LeaderboardData {
  topPlayers: LeaderboardPlayer[];
  recentGames: RecentGame[];
  totalGames: number;
}

const DIFF_LABEL: Record<string, string> = {
  novice: "Novice",
  club: "Club",
  master: "Master",
};

function fmtTime(sec: number): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function Leaderboard({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"players" | "recent">("players");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      const d: LeaderboardData = await res.json();
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const totalGames = data?.totalGames ?? 0;

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden">
      {/* Floating toggle button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={() => {
              setOpen(true);
              void load();
            }}
            className="flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-br from-card to-muted px-4 py-2.5 shadow-lg hover:shadow-xl"
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            aria-label="Open leaderboard"
          >
            <motion.span
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex"
            >
              <Trophy className="h-4 w-4 text-primary" />
            </motion.span>
            <span className="text-xs font-semibold text-foreground">Leaderboard</span>
            {totalGames > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                {totalGames}
              </span>
            )}
            <motion.span
              className="h-2 w-2 rounded-full bg-emerald-500"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-0 right-0 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-border bg-card/97 shadow-2xl backdrop-blur"
            initial={{ scale: 0.9, opacity: 0, y: 20, transformOrigin: "bottom right" }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-card to-muted px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Leaderboard</span>
                <span className="text-xs text-muted-foreground">
                  {totalGames} game{totalGames === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setLoading(true);
                    void load();
                  }}
                >
                  Refresh
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setOpen(false)}
                  aria-label="Close leaderboard"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {(["players", "recent"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                    tab === t
                      ? "border-b-2 border-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "players" ? "Top Players" : "Recent Games"}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="max-h-[50vh] overflow-hidden">
              <ScrollArea className="h-full max-h-[50vh]">
                {loading ? (
                  <div className="space-y-2 p-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-md bg-primary/5" />
                    ))}
                  </div>
                ) : tab === "players" ? (
                  <PlayersList data={data} />
                ) : (
                  <RecentList data={data} />
                )}
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayersList({ data }: { data: LeaderboardData | null }) {
  const players = data?.topPlayers ?? [];
  if (players.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        No games recorded yet. Finish a match to claim your spot!
      </div>
    );
  }
  return (
    <div className="p-2 space-y-1.5">
      {players.map((p, i) => {
        const rank = i + 1;
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
        return (
          <motion.div
            key={p.playerName}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-2.5 py-2",
              rank <= 3
                ? "border-primary/30 bg-gradient-to-r from-primary/10 to-transparent"
                : "border-border bg-muted/50",
            )}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {medal ?? rank}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-foreground">{p.playerName}</span>
                <span className="shrink-0 text-xs font-medium text-emerald-700">
                  {p.wins}W
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-0.5">
                  <Swords className="h-3 w-3" /> {p.games}
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="h-3 w-3" /> {fmtTime(p.fastestWinSec)}
                </span>
                <span className="text-muted-foreground/60">{p.avgWinMoves} moves/win</span>
                <span className="ml-auto rounded bg-primary/15 px-1 text-[9px] font-semibold text-primary">
                  {DIFF_LABEL[p.topDifficulty] ?? p.topDifficulty}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function RecentList({ data }: { data: LeaderboardData | null }) {
  const games = data?.recentGames ?? [];
  if (games.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        No recent games. Play one!
      </div>
    );
  }
  return (
    <div className="p-2 space-y-1.5">
      {games.map((g, i) => {
        const won = g.winner === "player";
        const drew = g.winner === "draw";
        const diff = (DIFFICULTIES.find((d) => d.id === g.difficulty) as { label?: string } | undefined)?.label ?? g.difficulty;
        return (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-lg border border-border bg-muted/50 px-2.5 py-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    won ? "bg-emerald-500" : drew ? "bg-stone-400" : "bg-rose-500",
                  )}
                />
                <span className="truncate text-xs font-semibold text-foreground">{g.playerName}</span>
                <span className="text-[9px] text-muted-foreground/60">vs {diff}</span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground/60">{timeAgo(g.finishedAt)}</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{g.resultLabel}</span>
              <span className="shrink-0 inline-flex items-center gap-1">
                <Swords className="h-2.5 w-2.5" /> {g.moveCount}
                <Clock className="ml-1 h-2.5 w-2.5" /> {fmtTime(g.durationSec)}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
