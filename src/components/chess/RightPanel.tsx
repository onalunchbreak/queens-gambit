"use client";

import { EvalBar } from "./EvalBar";
import { DifficultySelector } from "./DifficultySelector";
import { GameState } from "./useChessGame";

interface RightPanelProps {
  state: GameState;
}

/**
 * Right side panel: evaluation bar + turn indicator / quick stats.
 * The difficulty selector is shown here only on mobile (<sm) since the
 * compact pills live in the navbar on larger screens.
 */
export function RightPanel({ state }: RightPanelProps) {
  const isAiTurn = state.isAiThinking || state.turn === state.aiColor;

  return (
    <aside className="order-3 flex flex-col gap-3 xl:w-[260px] shrink-0">
      {/* Evaluation bar */}
      <div className="rounded-xl border border-border bg-card/80 p-3 shadow-sm">
        <EvalBar
          prob={state.evalProb}
          evalCp={state.evaluation}
          label={state.evalLabel}
          gameOver={state.gameOver}
          playerColor={state.playerColor}
        />
      </div>

      {/* Difficulty (mobile only; compact pills are in the navbar on sm+) */}
      <div className="rounded-xl border border-border bg-card/80 p-3 shadow-sm sm:hidden">
        <div className="mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Opponent level
          </span>
        </div>
        <DifficultySelector value={state.difficulty} onChange={() => {}} disabled={false} />
      </div>

      {/* Turn indicator / quick stats */}
      <div className="rounded-xl border border-border bg-card/80 p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Turn
          </span>
          <span
            className={
              "rounded-full px-2 py-0.5 text-xs font-semibold " +
              (isAiTurn
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400")
            }
          >
            {isAiTurn ? "Harmon thinking" : "Your move"}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Move <span className="font-semibold text-foreground tabular-nums">{Math.floor(state.history.length / 2) + 1}</span></span>
          <span><span className="font-semibold text-foreground tabular-nums">{state.history.length}</span> ply</span>
        </div>
      </div>
    </aside>
  );
}
