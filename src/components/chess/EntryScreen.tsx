"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DifficultySelector } from "./DifficultySelector";
import { ThemeToggle } from "@/components/theme-toggle";
import { Difficulty } from "@/lib/chess/types";

const FONT_STACK =
  '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "Noto Sans Symbols", "DejaVu Sans", sans-serif';

interface EntryScreenProps {
  onStart: (name: string, difficulty: Difficulty) => void;
}

export function EntryScreen({ onStart }: EntryScreenProps) {
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("club");

  const submit = () => {
    const trimmed = name.trim();
    onStart(trimmed.length ? trimmed : "Player", difficulty);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-10">
      {/* Theme toggle (top-right) */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* ambient board motif */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(45deg, var(--mahogany) 25%, transparent 25%, transparent 75%, var(--mahogany) 75%), linear-gradient(45deg, var(--mahogany) 25%, transparent 25%, transparent 75%, var(--mahogany) 75%)",
          backgroundSize: "48px 48px",
          backgroundPosition: "0 0, 24px 24px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* knight crest */}
        <div className="mb-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
            className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/40 bg-gradient-to-br from-card to-muted shadow-lg"
          >
            <span
              style={{
                fontFamily: FONT_STACK,
                fontSize: 44,
                color: "var(--piece-ivory-stroke)",
                WebkitTextStroke: `1px var(--piece-ebony)`,
                lineHeight: 1,
              }}
            >
              {"\u265E"}
            </span>
          </motion.div>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-foreground">
            Harmon&apos;s Gambit
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground italic">
            &ldquo;The only thing anyone ever gets good at is the thing they love.&rdquo;
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/95 p-6 shadow-xl backdrop-blur">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your name
          </label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="e.g. Beth"
            className="h-11 bg-background/80 text-base"
            maxLength={24}
          />

          <div className="mt-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Choose your opponent
            </label>
            <DifficultySelector value={difficulty} onChange={setDifficulty} />
          </div>

          <Button
            onClick={submit}
            className="mt-6 h-11 w-full bg-gradient-to-b from-primary to-primary text-base font-medium text-primary-foreground hover:opacity-90"
          >
            Begin the Match
          </Button>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          You play White against the Harmon engine.
        </p>
      </motion.div>

      <footer className="mt-auto py-3 text-center text-[11px] text-muted-foreground">
        Harmon&apos;s Gambit &mdash; AlphaZero meets the World Chess Championship.
      </footer>
    </div>
  );
}
