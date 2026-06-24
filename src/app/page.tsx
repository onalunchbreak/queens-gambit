"use client";

import { useState } from "react";
import { EntryScreen } from "@/components/chess/EntryScreen";
import { GameScreen } from "@/components/chess/GameScreen";
import { Difficulty } from "@/lib/chess/types";
import { PlayColor } from "@/components/chess/useChessGame";

export default function Page() {
  const [session, setSession] = useState<{
    name: string;
    difficulty: Difficulty;
    color: PlayColor;
  } | null>(null);

  if (!session) {
    return (
      <EntryScreen
        onStart={(name, difficulty, color) => setSession({ name, difficulty, color })}
      />
    );
  }

  return (
    <GameScreen
      playerName={session.name}
      initialDifficulty={session.difficulty}
      initialColor={session.color}
      onExit={() => setSession(null)}
    />
  );
}
