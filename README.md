# Driftline

A top-down space sim in the browser: trade, mine, hunt bounties, run faction quests, fly with a fleet, and build your own stations.

## Play
Open `index.html` in a browser, or play the GitHub Pages build of this repo.

## Project layout
- `src/` – the game source, split by system (data, engine, render loop, captains, depth systems, audio, console, traders, port, holdings, holdings UI, dock UI).
- `index.html` – the built, playable game (generated; don't edit by hand).
- `build.ps1` / `build.sh` – rebuild `index.html` from `src/`.

## Editing workflow
1. Edit files in `src/`.
2. Run `.\build.ps1` in the VS Code terminal (Windows) or `sh build.sh`.
3. Refresh `index.html` in your browser (or use the Live Server extension).
4. Commit and push from VS Code's Source Control panel.

Saves live in your browser's localStorage, so they stay put between builds.

## First-time setup (Windows)
Double-click `setup-github.cmd`. It installs Git, VS Code and the GitHub CLI, signs you in to GitHub, pushes this folder to a new `Driftline` repo, turns on GitHub Pages, and opens the project in VS Code.
