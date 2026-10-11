import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GameEngine } from "../core/game.js";
import type { GameContent, RngConfigFile } from "../core/types.js";

const contentDir = join(dirname(fileURLToPath(import.meta.url)));

export function createGame(): GameEngine {
  const content = JSON.parse(
    readFileSync(join(contentDir, "game.json"), "utf-8"),
  ) as GameContent;
  const rng = JSON.parse(
    readFileSync(join(contentDir, "finnish-rng.json"), "utf-8"),
  ) as RngConfigFile;

  return new GameEngine(content, rng);
}
