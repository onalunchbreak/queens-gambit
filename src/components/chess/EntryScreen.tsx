"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DifficultySelector } from "./DifficultySelector";
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
      {/* ambient board motif */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #2c1810 25%, transparent 25%, transparent 75%, #2c1810 75%), linear-gradient(45deg, #2c1810 25%, transparent 25%, transparent 75%, #2c1810 75%)",
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
            className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-700/40 bg-gradient-to-br from-[#fbf6e9] to-[#e8d9b8] shadow-lg"
          >
            <span
              style={{
                fontFamily: FONT_STACK,
                fontSize: 44,
                color: "#3a2a18",
                WebkitTextStroke: "1px #2c1810",
                lineHeight: 1,
              }}
            >
              {"\u265E"}
            </span>
          </motion.div>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-stone-800">
            Harmon&apos;s Gambit
          </h1>
          <p className="mt-1.5 text-sm text-stone-500 italic">
            &ldquo;The only thing anyone ever gets good at is the thing they love.&rdquo;
          </p>
        </div>

        <div className="rounded-2xl border border-amber-900/15 bg-[#fbf6e9]/95 p-6 shadow-xl backdrop-blur">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">
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
            className="h-11 border-amber-900/20 bg-white/80 text-base"
            maxLength={24}
          />

          <div className="mt-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">
              Choose your opponent
            </label>
            <DifficultySelector value={difficulty} onChange={setDifficulty} />
          </div>

          <Button
            onClick={submit}
            className="mt-6 h-11 w-full bg-gradient-to-b from-stone-800 to-stone-900 text-base font-medium text-amber-50 hover:from-stone-700 hover:to-stone-800"
          >
            Begin the Match
          </Button>
        </div>

        <p className="mt-4 text-center text-[11px] text-stone-400">
          You play White against the Harmon engine.
        </p>
      </motion.div>

      <footer className="mt-auto py-3 text-center text-[11px] text-stone-500">
        Harmon&apos;s Gambit &mdash; AlphaZero meets the World Chess Championship.
      </footer>
    </div>
  );
}
