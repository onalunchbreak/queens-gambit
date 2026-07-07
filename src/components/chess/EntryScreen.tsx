"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DifficultySelector } from "./DifficultySelector";
import { ThemeToggle } from "@/components/theme-toggle";
import { Difficulty } from "@/lib/chess/types";
import { PlayColor } from "./useChessGame";
import { Shuffle } from "lucide-react";

const FONT_STACK =
  '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "Noto Sans Symbols", "DejaVu Sans", sans-serif';

// Theme-aware logo sets. Light-mode logos have warm cream backgrounds with
// dark mahogany pieces; dark-mode logos have deep charcoal-brown backgrounds
// with luminous gold/ivory pieces. Each set has 2 variants; one is picked at
// random on every page load so the landing page rotates but always matches
// the active theme.
const LIGHT_LOGOS = ["/chess-logos/light-1.png", "/chess-logos/light-2.png"];
const DARK_LOGOS = ["/chess-logos/dark-1.png", "/chess-logos/dark-2.png"];

interface EntryScreenProps {
  onStart: (name: string, difficulty: Difficulty, color: PlayColor) => void;
}

type ColorChoice = "w" | "b" | "random";

export function EntryScreen({ onStart }: EntryScreenProps) {
  const { resolvedTheme } = useTheme();
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("club");
  const [colorChoice, setColorChoice] = useState<ColorChoice>("w");
  // Random pick within the set (rotates on every refresh).
  const [variant, setVariant] = useState(0);

  // Re-roll the variant on mount so it changes each refresh.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVariant(Math.floor(Math.random() * 2)));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Choose the logo set based on the resolved theme; default to light during
  // SSR / before mount to avoid hydration mismatch.
  const isDark = resolvedTheme === "dark";
  const logoSrc = (isDark ? DARK_LOGOS : LIGHT_LOGOS)[variant];

  const submit = () => {
    const trimmed = name.trim();
    const finalColor: PlayColor =
      colorChoice === "random" ? (Math.random() < 0.5 ? "w" : "b") : colorChoice;
    onStart(trimmed.length ? trimmed : "Player", difficulty, finalColor);
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
        {/* Themed hero logo — picks a random chess artwork on each load.
            The selection rotates on every page refresh so the landing page
            never feels static. */}
        <div className="mb-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
            className="relative h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-full border-2 border-primary/40 shadow-lg"
          >
            <Image
              src={logoSrc}
              alt="Harmon's Gambit"
              fill
              sizes="128px"
              className="object-cover"
              priority
            />
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
              Choose your color
            </label>
            <ColorSelector value={colorChoice} onChange={setColorChoice} />
          </div>

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

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {colorChoice === "w"
            ? "You play White against the Harmon engine."
            : colorChoice === "b"
              ? "You play Black — Harmon opens the game."
              : "Your color will be drawn at random."}
        </p>
      </motion.div>

      <footer className="mt-auto py-3 text-center text-xs text-muted-foreground">
        Harmon&apos;s Gambit &mdash; AlphaZero meets the World Chess Championship.
      </footer>
    </div>
  );
}

function ColorSelector({
  value,
  onChange,
}: {
  value: ColorChoice;
  onChange: (c: ColorChoice) => void;
}) {
  const options: { id: ColorChoice; label: string; glyph: string; sub: string }[] = [
    { id: "w", label: "White", glyph: "\u265F", sub: "Move first" },
    { id: "b", label: "Black", glyph: "\u265F", sub: "Respond" },
    { id: "random", label: "Random", glyph: "\u265F", sub: "Toss the coin" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => {
        const active = value === o.id;
        const isRandom = o.id === "random";
        // For the glyph, show white piece for White, black piece for Black, dice-ish for random.
        return (
          <motion.button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={
              "relative flex flex-col items-center gap-1 rounded-lg border bg-card/80 px-2 py-2.5 text-center transition-all " +
              (active
                ? "border-primary shadow-sm ring-1 ring-primary/40"
                : "border-border opacity-65 hover:opacity-100 hover:border-muted-foreground/40")
            }
            aria-pressed={active}
          >
            <span
              className="flex h-7 w-7 items-center justify-center"
              style={{ fontFamily: FONT_STACK, fontSize: 22, lineHeight: 1 }}
            >
              {isRandom ? (
                <Shuffle className="h-4 w-4 text-primary" />
              ) : o.id === "w" ? (
                <span style={{ color: "var(--piece-ivory)", WebkitTextStroke: "1px var(--piece-ivory-stroke)" }}>
                  {o.glyph}
                </span>
              ) : (
                <span style={{ color: "var(--piece-ebony)", WebkitTextStroke: "0.5px var(--piece-ebony-stroke)" }}>
                  {o.glyph}
                </span>
              )}
            </span>
            <span className="text-[12.5px] font-semibold leading-tight text-card-foreground">
              {o.label}
            </span>
            <span className="text-xs text-muted-foreground">{o.sub}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
