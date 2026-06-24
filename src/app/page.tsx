"use client";

import { useState } from "react";
import { EntryScreen } from "@/components/chess/EntryScreen";
import { GameScreen } from "@/components/chess/GameScreen";
import { Difficulty } from "@/lib/chess/types";

export default function Page() {
  const [session, setSession] = useState<{ name: string; difficulty: Difficulty } | null>(null);

  if (!session) {
    return (
      <EntryScreen
        onStart={(name, difficulty) => setSession({ name, difficulty })}
      />
    );
  }

  return (
    <GameScreen
      playerName={session.name}
      initialDifficulty={session.difficulty}
      onExit={() => setSession(null)}
    />
  );
}
