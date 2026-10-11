# Finn Takes a Number

A TypeScript text adventure about managing patience, anger, and scarce resources across ten everyday queues. Inspired by real-world waiting — from the grocery store to Penn Station.

## Overview

You must complete ten queue levels in a single day. Each level starts with people ahead of you. Choose numbered actions to advance, conserve patience, and keep anger under control. Other people in line act each turn and can raise your anger. Clear a level by reaching the front (`People ahead → 0`). Exhaust patience or max out anger and the run ends.

## Requirements

- [Node.js](https://nodejs.org/) (LTS recommended)

## Getting started

From this project directory (`finn-takes-a-number` / `text-adventure-game`):

```bash
npm install
npm run finn-takes-a-number
```

`npm start` and `npm run play` also launch this game. Prefer `npm run finn-takes-a-number` if you keep several Node games on the same machine, so the command name matches this project.

On Windows, you can also run `play.bat` from this folder.

## How to play

1. Read the current scene and available actions.
2. Enter the number of an action and press Enter.
3. Advance until `People ahead` reaches `0` to finish the level.
4. Repeat through all ten queues to win.

Commands available at any time:

- `exit` — quit the game
- `restart` — start a new run

### Player stats

| Stat | Description |
|------|-------------|
| Patience | Remaining capacity to wait |
| Anger | Stress level; the run ends at 100 |
| People ahead | Positions remaining until the front of the line |
| Money | Currency used for bribes ($3 per attempt) |
| Candy | Alternate resource for advancing |

## Project structure

```
src/
  cli/       Terminal interface
  core/      Game engine, RNG, and NPC logic
  content/   Scenes, actions, and RNG configuration
  test/      Smoke tests
```

Game logic lives in `src/core/` and is independent of the CLI, so another UI can reuse the same engine.

### Content files

| File | Purpose |
|------|---------|
| `src/content/scenes.json` | Levels and scene flow |
| `src/content/queue-actions.json` | Player actions in queues |
| `src/content/rng.json` | Roll definitions and success thresholds |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run finn-takes-a-number` | Launch Finn Takes a Number (recommended) |
| `npm start` / `npm run play` | Same launch command (shorter aliases) |
| `npm test` | Run smoke tests |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |

## Repository

https://github.com/mellissa/finn-takes-a-number
