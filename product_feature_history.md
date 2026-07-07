# 📦 Version & Product Feature History

This document tracks the product feature additions, bug fixes, layout refactorings, and release versions of **Queen's Gambit (Harmon's Gambit)**.

---

### v1.6.0 (Current) — Code Refactor, Bug Fixes & Analysis Reliability
- **Fixed React infinite-loop error**: the auto-analysis effect depended on the `game` object (recreated each render), causing a re-render loop and the Next.js error overlay. Now uses a ref-guarded pattern with `autoAnalysisRanRef` to fire exactly once per game.
- **Fixed missing Coach's Analysis**: the `/api/analyze` endpoint now retries up to 3 times on rate-limit (429) errors with exponential backoff, and has a richer heuristic fallback that references the player's specific worst move, brilliant moves, and the game result — so the analysis panel is never empty.
- **Code refactor (professional structure)**: split the 625-line `GameScreen` into focused single-responsibility components:
  - `GameNavbar` — sticky navbar (brand, influence toggle, difficulty pills, actions)
  - `LeftPanel` — Harmon's last move, move history, game controls, game-over banner
  - `RightPanel` — eval bar, turn indicator, mobile difficulty selector
  - `GameDialogs` — promotion picker + resign confirmation
  - `GameScreen` is now a lean orchestrator (~230 lines) that composes these
- **README updated** with the new file structure and architecture notes

### v1.5.0 — Layout Polish & Turn-Indicator Fix
- **Reverted board size** to a larger 620px max-width (was inadvertently shrunk to 580px)
- **Fixed turn indicator bug**: now correctly shows "Harmon thinking" whenever the AI is computing (checks `isAiThinking` in addition to turn color, fixing the race condition where the indicator showed "Your move" during AI computation)
- **Captured trays enlarged**: chips increased to 32px (from 24px), tray height to 48px, glyphs to 20px — pieces are now clearly readable
- **Tighter spacing**: reduced empty space between board and side panels to ~14px (was much wider), page fits with zero overflow
- **Analysis modal**: fixed width (was being capped at 512px by shadcn default — now full 1280px), fixed button overflow with flex-wrap, fixed text overflow with flex ScrollArea
- **Auto-generate analysis**: the LLM coaching analysis now fires automatically when the game ends (800ms delay), no need to click "Generate"
- **Comprehensive README**: added this documentation

### v1.4.0 — Layout Redesign & UAT
- **3-column layout**: moved Harmon's last move to the LEFT of the board (was right), eliminated long vertical scroll
- **Compact navbar**: difficulty pills + influence toggle moved into the navbar to utilize empty space
- **Analysis modal**: dual-layout (replay board + coaching text), responsive stacking on mobile
- **Dark/light contrast audit**: verified all surfaces have strong contrast in both themes
- **Full UAT**: PM-style end-to-end testing of every feature in both themes

### v1.3.0 — Captured Pieces & Color Selection
- **Color selection**: play White, Black, or Random — board flips for Black, AI opens when player is Black
- **Captured pieces system**: 3D animated fly-off on every capture, side trays with material balance
- **Dark mode logo fix**: horse crest now uses `--primary` token so it's visible in both themes

### v1.2.0 — Confetti & Game Persistence
- **Confetti on every game end**: win (green), lose (red), draw (gold) — each with a celebratory result banner
- **Database persistence**: every game saved to SQLite (Prisma) with player, color, difficulty, result, moves, duration
- **Floating leaderboard**: top players + recent games, auto-refreshes

### v1.1.0 — Dark Mode & Polish
- **Robust dark mode**: CSS-variable theming, next-themes provider, no-flash script, animated toggle
- **Moves overflow fix**: scrollable move history
- **Difficulty selector redesign**: elegant rank pips instead of garish colors
- **Influence tooltip**: descriptive explanation of what the heatmap does
- **App-wide font size increase**

### v1.0.0 — Initial Release
- Chess board with walnut/maple aesthetic + Staunton pieces
- Three AI difficulty levels (negamax + alpha-beta)
- Real-time evaluation bar + influence heatmap
- LLM move narration in Beth Harmon's voice
- Web Audio synthesized move sounds
- Post-game review with Brilliant/Blunder markers
- Resign + undo + new game
