"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { DifficultySelectorCompact } from "./DifficultySelector";
import { LayoutGrid, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Difficulty } from "@/lib/chess/types";

const FONT_STACK =
  '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "Noto Sans Symbols", "DejaVu Sans", sans-serif';

interface GameNavbarProps {
  playerName: string;
  difficulty: Difficulty;
  showHeatmap: boolean;
  soundOn: boolean;
  onToggleHeatmap: (v: boolean) => void;
  onChangeDifficulty: (d: Difficulty) => void;
  onToggleSound: () => void;
  onExit: () => void;
}

/**
 * Compact sticky navbar holding the brand, influence toggle, difficulty pills,
 * and action buttons (theme, sound, exit).
 */
export function GameNavbar({
  playerName,
  difficulty,
  showHeatmap,
  soundOn,
  onToggleHeatmap,
  onChangeDifficulty,
  onToggleSound,
  onExit,
}: GameNavbarProps) {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2">
        {/* Brand + match */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-gradient-to-br from-card to-muted"
            style={{ fontFamily: FONT_STACK, fontSize: 16, color: "var(--primary)", lineHeight: 1 }}
          >
            {"\u265E"}
          </span>
          <div className="min-w-0 hidden sm:block">
            <h1 className="font-serif text-sm font-semibold leading-tight text-foreground truncate">
              Harmon&apos;s Gambit
            </h1>
            <p className="text-[11px] text-muted-foreground truncate leading-tight">
              <span className="font-medium text-foreground">{playerName}</span>
              <span className="mx-1 text-primary/70">vs.</span>
              <span className="font-medium text-foreground">AI</span>
            </p>
          </div>
        </div>

        {/* Center: difficulty pills + influence toggle */}
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1">
                  <LayoutGrid className="h-3.5 w-3.5 text-primary/70" />
                  <span className="hidden md:inline text-[11px] font-medium text-muted-foreground">Influence</span>
                  <Switch
                    checked={showHeatmap}
                    onCheckedChange={onToggleHeatmap}
                    aria-label="Toggle influence heatmap"
                    className="scale-90"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px] text-xs leading-relaxed">
                <p className="font-semibold mb-1">Influence Heatmap</p>
                <p>Toggles a colour overlay on every square showing which side <em>controls</em> it — based on attacking pieces and their reach.</p>
                <p className="mt-1"><span className="text-amber-700 dark:text-amber-300 font-medium">Warm cream tones</span> = White-controlled. <span className="text-stone-700 dark:text-stone-300 font-medium">Deep umber tones</span> = Black-controlled.</p>
                <p className="mt-1 text-muted-foreground">Spot weak squares, hanging pieces, and centre control at a glance.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Level</span>
            <DifficultySelectorCompact value={difficulty} onChange={onChangeDifficulty} />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onToggleSound}
            aria-label={soundOn ? "Mute" : "Unmute"}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={onExit}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> <span className="hidden sm:inline">Exit</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
