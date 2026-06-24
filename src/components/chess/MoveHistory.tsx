"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MoveHistoryProps {
  sans: string[];
  reviewActive: boolean;
  reviewIndex: number;
  onJump?: (ply: number) => void;
}

export function MoveHistory({ sans, reviewActive, reviewIndex, onJump }: MoveHistoryProps) {
  // Pair moves: white ply i (1-based), black ply i+1
  const rows: { num: number; white?: string; whitePly?: number; black?: string; blackPly?: number }[] = [];
  for (let i = 0; i < sans.length; i += 2) {
    rows.push({
      num: i / 2 + 1,
      white: sans[i],
      whitePly: i + 1,
      black: sans[i + 1],
      blackPly: i + 2,
    });
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-1 pb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Moves
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">{sans.length} ply</span>
      </div>
      {/* Fixed-height scroll container so long games never overflow the card. */}
      <ScrollArea className="h-40 max-h-40 w-full rounded-md border border-border bg-card/60">
        <div className="p-1">
          {rows.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground italic">
              The board is set. White to play.
            </div>
          ) : (
            <div className="space-y-0.5">
              {rows.map((row) => (
                <div
                  key={row.num}
                  className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)] items-center text-sm rounded-sm"
                >
                  <span className="text-[11px] text-muted-foreground tabular-nums px-1">
                    {row.num}.
                  </span>
                  {row.white ? (
                    <button
                      type="button"
                      disabled={!reviewActive}
                      onClick={() => row.whitePly && onJump?.(row.whitePly!)}
                      className={cn(
                        "text-left px-1.5 py-0.5 rounded font-mono text-[12px] tabular-nums truncate",
                        reviewActive && "hover:bg-accent cursor-pointer",
                        reviewActive && reviewIndex === row.whitePly && "bg-primary/20 font-semibold",
                      )}
                      title={row.white}
                    >
                      {row.white}
                    </button>
                  ) : (
                    <span />
                  )}
                  {row.black ? (
                    <button
                      type="button"
                      disabled={!reviewActive}
                      onClick={() => row.blackPly && onJump?.(row.blackPly!)}
                      className={cn(
                        "text-left px-1.5 py-0.5 rounded font-mono text-[12px] tabular-nums truncate",
                        reviewActive && "hover:bg-accent cursor-pointer",
                        reviewActive && reviewIndex === row.blackPly && "bg-primary/20 font-semibold",
                      )}
                      title={row.black}
                    >
                      {row.black}
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
