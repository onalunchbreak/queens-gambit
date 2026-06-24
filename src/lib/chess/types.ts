// Shared types for Harmon's Gambit chess engine & UI

export type Difficulty = "novice" | "club" | "master";

export interface DifficultyMeta {
  id: Difficulty;
  label: string;
  rank: string;
  description: string;
  elo: string;
}

export const DIFFICULTIES: DifficultyMeta[] = [
  {
    id: "novice",
    label: "Novice",
    rank: "I",
    description: "Learning the ropes — opportunistic and beatable.",
    elo: "~800",
  },
  {
    id: "club",
    label: "Club Player",
    rank: "II",
    description: "Solid tactical play with a 2-ply lookahead.",
    elo: "~1500",
  },
  {
    id: "master",
    label: "Grandmaster",
    rank: "III",
    description: "Deep search with quiescence — ruthless precision.",
    elo: "~2200",
  },
];

export interface HeatmapData {
  // 64 values, index 0 = a8 (top-left) ... 63 = h1 (bottom-right)
  // positive => white influence, negative => black influence
  squares: number[];
}

export interface MoveExplanation {
  short: string;
  detail: string;
}

export interface AiMoveResult {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  fenAfter: string;
  isCapture: boolean;
  isCheck: boolean;
  isCastle: boolean;
  isPromotion: boolean;
  // centipawns from white's perspective (large magnitude => mate)
  evaluation: number;
  evaluationLabel: string;
  heatmap: number[];
  explanation: MoveExplanation;
  gameOver: boolean;
  gameResult?: string;
  // side to move after this move ('w' | 'b' | null when game over)
  turn: "w" | "b" | null;
}

export type AnnotationKind =
  | "brilliant"
  | "blunder"
  | "mistake"
  | "inaccuracy"
  | "good"
  | "best"
  | "book";

export interface MoveAnnotation {
  ply: number; // 1-based ply number in the game
  san: string;
  byColor: "w" | "b";
  kind: AnnotationKind;
  label: string;
  evalBefore: number; // centipawns (white POV) before the move
  evalAfter: number; // centipawns (white POV) after the move
  bestMoveSan?: string; // the engine's preferred move (if different)
  from?: string;
  to?: string;
}

export interface ReviewResult {
  annotations: MoveAnnotation[];
  summary: string;
  finalEval: number;
  result: string;
}
