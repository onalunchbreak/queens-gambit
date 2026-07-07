# ♞ Queen's Gambit (Harmon's Gambit)

> *A chess platform where classical tournament aesthetics meet modern AI — inspired by Beth Harmon's brilliant, calculating playstyle from The Queen's Gambit.*

Live Deployed Site: [https://ai-queens-gambit.space-z.ai](https://ai-queens-gambit.space-z.ai)

---

**Queen's Gambit** (originally developed as *Harmon's Gambit*) is a full-featured chess application that lets you play against an AI engine with three difficulty levels, get real-time position evaluation, receive personalized coaching analysis after each game, and track your progress on a persistent leaderboard. The entire experience is wrapped in a warm, tournament-hall aesthetic with polished walnut-and-maple boards, Staunton pieces, and a subtle parchment texture — AlphaZero meets the World Chess Championship.

---

## ✨ What Makes This Special

| Feature | What it means for you |
|---|---|
| **Three AI personalities** | Play a beatable Novice, a tactical Club Player, or a ruthless Grandmaster — each with a distinct playing style |
| **Color choice** | Play White, Black, or let the coin decide. The board flips automatically when you play Black |
| **Live evaluation** | A real-time eval bar + influence heatmap show exactly who's winning and which squares each side controls |
| **Move narration** | Every AI move comes with a heuristic explanation AND a literary, Beth-Harmon-voice sentence from an LLM |
| **Captured pieces with 3D fly-off** | When a piece is captured, it spins off the board in 3D into a side tray with material-balance tracking |
| **Post-game coaching** | An LLM analyzes your entire game and writes personalized, move-referenced feedback — what you did well, what to improve, missed wins |
| **Move-by-move replay** | Scrub through every move with Prev/Play/Next, see Brilliant/Blunder markers and engine-suggestion arrows |
| **Confetti celebrations** | Every game end — win, lose, or draw — triggers a themed confetti burst with a result banner |
| **Persistent leaderboard** | Every game is saved to a database; a floating leaderboard tracks wins, fastest victories, and recent games |
| **Light & dark mode** | A warm parchment theme by day, a moody charcoal-brown study by night — both with full contrast |
| **Fully responsive** | Desktop three-column layout, mobile-friendly stacked layout, no unnecessary scrolling |

---

## 🎮 How to Play (for non-tech folks)

1. **Enter your name** on the welcome screen
2. **Pick your color** — White (move first), Black (respond), or Random (toss the coin)
3. **Choose your opponent** — Novice (~800 Elo), Club Player (~1500 Elo), or Grandmaster (~2200 Elo)
4. **Click "Begin the Match"**
5. **Make moves** by clicking a piece, then clicking its destination square. Legal moves show as green dots; captures show as green rings
6. **Watch the AI think** — a spinner of orbiting chess pieces appears while Harmon calculates
7. **Read the AI's intent** — after each AI move, the left panel explains what the move was aiming for
8. **End the game** — by checkmate, stalemate, draw, or resignation (the Resign button)
9. **Review your game** — click "Analyse" to open a modal with a full replay board, move markers, and a written coaching analysis
10. **Check the leaderboard** — the floating trophy button (bottom-right) shows your stats and recent games

---

## 🛠️ For Developers

### Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York style) + Lucide icons
- **Chess logic**: chess.js
- **Animations**: Framer Motion
- **AI narration & coaching**: z-ai-web-dev-sdk (LLM, backend-only)
- **Database**: Prisma ORM + SQLite (self-contained, no external DB)
- **Theming**: next-themes (class-based, system-aware)

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai-move/        # Computes the AI's move (minimax + alpha-beta)
│   │   ├── analyze/        # LLM coaching analysis (retry + heuristic fallback)
│   │   ├── leaderboard/    # Aggregated player stats + recent games
│   │   ├── narrate/        # LLM Beth-Harmon-voice move narration
│   │   ├── review/         # Per-move annotations (Brilliant/Blunder/etc.)
│   │   └── save-game/      # Persists a finished game to SQLite
│   ├── globals.css         # Theme tokens (light + dark) + parchment texture
│   ├── layout.tsx          # ThemeProvider + no-flash dark mode script
│   └── page.tsx            # Entry screen → Game screen orchestrator
├── components/
│   ├── chess/
│   │   ├── AnalysisModal.tsx       # Collapsible dual-layout replay + coaching
│   │   ├── CapturedTray.tsx        # Captured pieces trays + 3D fly-off
│   │   ├── ChessBoard.tsx          # Walnut/maple board + highlights + heatmap
│   │   ├── ChessPiece.tsx          # Staunton glyphs with gloss + lift animation
│   │   ├── Confetti.tsx            # Themed confetti + result banner
│   │   ├── DifficultySelector.tsx  # Rank-pip pills (navbar + full variants)
│   │   ├── EntryScreen.tsx         # Name + color + difficulty picker + themed logos
│   │   ├── EvalBar.tsx             # Real-time evaluation bar
│   │   ├── GameDialogs.tsx         # Promotion picker + resign confirmation
│   │   ├── GameNavbar.tsx          # Compact sticky navbar (brand, pills, toggle)
│   │   ├── GameReview.tsx          # Move-by-move annotation panel
│   │   ├── GameScreen.tsx          # Orchestrator: composes navbar + panels + board
│   │   ├── Leaderboard.tsx         # Floating animated leaderboard
│   │   ├── LeftPanel.tsx           # Harmon's last move + history + controls + banner
│   │   ├── MoveHistory.tsx         # Scrollable SAN move list
│   │   ├── RightPanel.tsx          # Eval bar + turn indicator + mobile difficulty
│   │   ├── ThinkingIndicator.tsx   # Orbiting-pieces spinner
│   │   ├── review-util.ts          # Replay position reconstruction
│   │   ├── sounds.ts               # Web Audio synthesized move/thunk sounds
│   │   └── useChessGame.ts         # Central game-state hook (all logic)
│   ├── theme-provider.tsx          # next-themes wrapper
│   └── theme-toggle.tsx            # Animated sun/moon toggle
├── lib/
│   └── chess/
│       ├── engine.ts       # Negamax + alpha-beta + quiescence (3 difficulties)
│       ├── evaluation.ts   # PSTs + material + influence heatmap
│       ├── explain.ts      # Heuristic move-intent explanations
│       ├── review.ts       # Eval-swing annotation classification
│       └── types.ts        # Shared TypeScript types
└── lib/
    └── db.ts                # Prisma client singleton
```

**Architecture notes:** The `GameScreen` is intentionally lean — it delegates rendering to focused single-responsibility components (`GameNavbar`, `LeftPanel`, `RightPanel`, `GameDialogs`) and only handles state orchestration, derived values (check detection, review positions), and the auto-analysis effect. The `useChessGame` hook owns all game logic and state, keeping the UI components presentational.

### Getting Started

```bash
# Install dependencies
bun install

# Push the database schema to SQLite
bun run db:push

# Start the dev server (runs on port 3000)
bun run dev

# Lint
bun run lint
```

### How the AI Engine Works

The engine uses **negamax with alpha-beta pruning** and **MVV-LVA move ordering** (Most Valuable Victim - Least Valuable Attacker), plus **quiescence search** (extends search through captures to avoid the horizon effect).

| Level | Search Depth | Style |
|---|---|---|
| Novice | 1 ply + randomness | Opportunistic, occasional blunders, genuinely beatable |
| Club Player | 2 ply | Solid tactical play, light randomness among equal moves |
| Grandmaster | 3→4 ply (iterative deepening) | Deep search, ruthless precision |

Evaluation = material values + piece-square tables + bishop pair bonus + pawn structure (doubled/isolated) + mobility.

### How the LLM Coaching Works

When a game ends (or you click "Analyse"), the app:
1. Replays every move and classifies each as Brilliant / Best / Good / Inaccuracy / Mistake / Blunder (based on eval swing)
2. Sends the annotated move list + result to the LLM with a Beth-Harman-coach system prompt
3. The LLM returns ~220 words of flowing prose referencing specific move numbers — what you did well, the turning points, what you could have done better or earlier, and an encouraging closing

The analysis **auto-generates** when the game ends, so it's ready by the time you open the modal.

---

## 📦 Version History

To view the full product version log and feature release history, please see:
👉 [Product Feature & Version History](./product_feature_history.md)

---

## 🎨 Design Philosophy

The app follows a **classical tournament aesthetic**:
- **Rich mahogany and light maple** board squares with wood-grain texture
- **Black and ivory Staunton pieces** with glossy highlights and cast shadows
- **Subtle parchment texture** background with warm radial gradients
- **No indigo or blue** — the palette is warm amber, bronze, and umber
- **Dark mode** is a moody charcoal-brown study, not a cold black

Every animation is **subtle and purposeful**: pieces lift before gliding, the last move pulses gently, the AI thinking spinner orbits chess pieces, confetti uses themed palettes per outcome.

---

## 🧪 Testing

The app has been through multiple rounds of **PM-style UAT (User Acceptance Testing)** covering:
- Entry screen flow (name, color, difficulty)
- Game play (moves, captures, promotion, castling, en passant)
- AI response (thinking animation, narration, eval updates)
- All three difficulty levels
- Both colors (White and Black, including board flip)
- Resignation + confetti + leaderboard recording
- Analysis modal (desktop dual-layout + mobile stacked)
- Dark and light mode contrast on all surfaces
- Responsive layout (desktop, tablet, mobile)

---

## 📄 License

This project is built as a demonstration of full-stack AI-powered web application development.

---

*"The only thing anyone ever gets good at is the thing they love." — Beth Harmon*
