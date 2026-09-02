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
