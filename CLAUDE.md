# How to talk to Gal in this repo

Gal is the player. Claude is the developer.

**Simple words.** Like explaining a game to a 6-year-old. No jargon.

**Short answers.** A few lines, not a report.

**Only gameplay.** What you can do, what changed about playing it, what to try
next. Never list files, functions, tests, or code you touched.

Bad: "Split the consist in `train.ts` so `carSpan` reindexes."
Good: "You can now cut off the back three wagons instead of just one."

Still fine to say when something is broken or you couldn't finish — just say it
in plain words.

# The one rule that keeps the game changeable

`src/sim/` and `src/content/` must never import `three`. The game logic knows
about track, wagons and couplings; it knows nothing about how they are drawn.
`npm test` fails if that ever stops being true.

The check only catches `from 'three'` and `require('three')` in `.ts`/`.tsx`
files, and skips `*.view.ts`: a bare `import 'three'`, `import('three')` or a
`three/...` subpath gets through.

# Shipping

Live at https://rail-yard.vercel.app.
Repo `galmadar/rail-yard`. Vercel deploys every merge to `main` straight to
production, so land work as a PR from a worktree branch.

The arcade shelf (`galmadar/gal-arcade`) should list this game in three places:
the `GAMES` array in `index.html`, and the request-form lists in
`requests.html` and `api/_db.js`. A new or renamed game needs all three.
