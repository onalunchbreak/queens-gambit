"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiProps {
  /** Increments to (re)trigger a burst. */
  trigger: number;
  /** Who won — drives the color palette + message. */
  winner: "player" | "ai" | "draw" | null;
  /** Optional result label (e.g. "White wins by checkmate", "Draw — Stalemate"). */
  resultLabel?: string | null;
}

interface Particle {
  id: number;
  x: number; // % start horizontal
  delay: number;
  duration: number;
  drift: number; // horizontal drift in vw
  rotate: number;
  size: number;
  color: string;
  shape: "rect" | "circle" | "streamer";
}

// Palettes per outcome.
const PLAYER_COLORS = ["#1caa6b", "#2a8fd4", "#e0b13a", "#f7efd9", "#b07d4e", "#7be0a3"];
const AI_COLORS = ["#d23b3b", "#7d2b1f", "#3a2a18", "#94633a", "#e0b13a", "#f08080"];
const DRAW_COLORS = ["#e0b13a", "#c4a574", "#f7efd9", "#94633a", "#2a8fd4", "#1caa6b", "#d23b3b"];

function buildParticles(winner: "player" | "ai" | "draw"): Particle[] {
  const palette = winner === "ai" ? AI_COLORS : winner === "draw" ? DRAW_COLORS : PLAYER_COLORS;
  // Draws and player wins get a bigger celebration; AI wins slightly more subdued.
  const count = winner === "ai" ? 90 : winner === "draw" ? 130 : 140;
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const shapeRoll = Math.random();
    const shape: Particle["shape"] =
      shapeRoll < 0.45 ? "rect" : shapeRoll < 0.8 ? "circle" : "streamer";
    arr.push({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.8 + Math.random() * 2.0,
      drift: (Math.random() - 0.5) * 36,
      rotate: Math.random() * 900 - 450,
      size: shape === "streamer" ? 4 + Math.random() * 3 : 6 + Math.random() * 8,
      color: palette[i % palette.length],
      shape,
    });
  }
  return arr;
}

// The headline + subtext shown in the celebratory banner.
function bannerContent(winner: "player" | "ai" | "draw" | null, resultLabel?: string | null) {
  if (winner === "player") {
    return {
      headline: "Victory!",
      sub: resultLabel ?? "You defeated Harmon.",
      accent: "#1caa6b",
    };
  }
  if (winner === "ai") {
    return {
      headline: "Harmon Wins",
      sub: resultLabel ?? "A hard-fought game.",
      accent: "#d23b3b",
    };
  }
  if (winner === "draw") {
    return {
      headline: "Draw",
      sub: resultLabel ?? "A balanced struggle.",
      accent: "#e0b13a",
    };
  }
  return null;
}

export function Confetti({ trigger, winner, resultLabel }: ConfettiProps) {
  const [activeTrigger, setActiveTrigger] = useState<{ trigger: number; until: number; winner: string } | null>(null);

  useEffect(() => {
    if (trigger === 0) return;
    if (!winner) return; // no outcome yet
    if (activeTrigger && activeTrigger.trigger === trigger) return;
    // Schedule activation on next tick (avoids synchronous setState in effect).
    const until = Date.now() + 4800;
    const w = winner;
    const raf = requestAnimationFrame(() => setActiveTrigger({ trigger, until, winner: w }));
    const cleanup = setTimeout(() => setActiveTrigger(null), 4800);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(cleanup);
    };
  }, [trigger, winner, activeTrigger]);

  const active = !!activeTrigger && Date.now() < activeTrigger.until;
  const activeWinner = activeTrigger?.winner as "player" | "ai" | "draw" | null;

  const particles = useMemo(() => {
    if (!active) return [];
    return buildParticles((activeWinner ?? "player") as "player" | "ai" | "draw");
  }, [active, activeWinner]);

  const banner = active ? bannerContent(activeWinner, resultLabel) : null;

  return (
    <AnimatePresence>
      {active && banner && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          aria-hidden
        >
          {/* Confetti particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute"
              style={{
                left: `${p.x}%`,
                top: -20,
                width: p.shape === "streamer" ? p.size * 4 : p.size,
                height: p.shape === "rect" ? p.size * 0.5 : p.shape === "streamer" ? p.size : p.size,
                background: p.color,
                borderRadius: p.shape === "circle" ? "50%" : p.shape === "streamer" ? "2px" : "1px",
              }}
              initial={{ y: 0, opacity: 1, rotate: 0 }}
              animate={{
                y: ["0vh", "115vh"],
                x: [`0vw`, `${p.drift}vw`],
                rotate: p.rotate,
                opacity: [1, 1, 0.9, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeIn",
                times: [0, 0.7, 0.9, 1],
              }}
            />
          ))}

          {/* Celebratory banner overlay */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3.2, times: [0, 0.12, 0.8, 1], ease: "easeInOut" }}
          >
            <motion.div
              initial={{ scale: 0.5, y: 40, rotateZ: -3 }}
              animate={{ scale: 1, y: 0, rotateZ: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
              className="pointer-events-none rounded-3xl border-2 px-10 py-6 text-center shadow-2xl backdrop-blur-md"
              style={{
                borderColor: `${banner.accent}66`,
                background: "rgba(20, 14, 8, 0.78)",
                boxShadow: `0 0 60px ${banner.accent}55, 0 20px 50px rgba(0,0,0,0.5)`,
              }}
            >
              <motion.h2
                className="font-serif text-5xl sm:text-6xl font-bold tracking-tight"
                style={{
                  color: banner.accent,
                  textShadow: `0 0 24px ${banner.accent}aa, 0 2px 4px rgba(0,0,0,0.6)`,
                }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                {banner.headline}
              </motion.h2>
              <motion.p
                className="mt-2 text-sm sm:text-base text-amber-50/90 font-medium"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
              >
                {banner.sub}
              </motion.p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
