"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiProps {
  /** Increments to (re)trigger a burst. */
  trigger: number;
  /** Who won — drives the color palette. */
  winner: "player" | "ai" | "draw" | null;
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
  shape: "rect" | "circle";
}

const PLAYER_COLORS = ["#1caa6b", "#2a8fd4", "#e0b13a", "#f7efd9", "#b07d4e"];
const AI_COLORS = ["#d23b3b", "#7d2b1f", "#3a2a18", "#94633a", "#e0b13a"];

function buildParticles(winner: "player" | "ai" | "draw"): Particle[] {
  const palette = winner === "ai" ? AI_COLORS : PLAYER_COLORS;
  const count = winner === "ai" ? 90 : 120;
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 1.8 + Math.random() * 1.6,
      drift: (Math.random() - 0.5) * 30,
      rotate: Math.random() * 720 - 360,
      size: 6 + Math.random() * 8,
      color: palette[i % palette.length],
      shape: Math.random() > 0.5 ? "rect" : "circle",
    });
  }
  return arr;
}

export function Confetti({ trigger, winner }: ConfettiProps) {
  // Track the active trigger and when its burst should end. Using state set
  // via event-style transitions (not inside an effect body) keeps this rule-clean.
  const [activeTrigger, setActiveTrigger] = useState<{ trigger: number; until: number } | null>(null);

  useEffect(() => {
    if (trigger === 0) return;
    if (winner !== "player" && winner !== "ai") return;
    if (activeTrigger && activeTrigger.trigger === trigger) return;
    // Schedule activation on next tick (avoids synchronous setState in effect).
    const until = Date.now() + 4200;
    const raf = requestAnimationFrame(() => setActiveTrigger({ trigger, until }));
    const cleanup = setTimeout(() => setActiveTrigger(null), 4200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(cleanup);
    };
  }, [trigger, winner, activeTrigger]);

  const active = !!activeTrigger && Date.now() < activeTrigger.until;

  const particles = useMemo(() => {
    if (!active) return [];
    return buildParticles(winner ?? "player");
  }, [active, winner]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          aria-hidden
        >
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute"
              style={{
                left: `${p.x}%`,
                top: -20,
                width: p.size,
                height: p.shape === "rect" ? p.size * 0.5 : p.size,
                background: p.color,
                borderRadius: p.shape === "circle" ? "50%" : "1px",
              }}
              initial={{ y: 0, opacity: 1, rotate: 0 }}
              animate={{
                y: ["0vh", "110vh"],
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
