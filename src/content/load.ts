import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GameEngine } from "../core/engine.js";
import type { QueueActionsFile, RngConfigFile, ScenesFile } from "../core/types.js";

const contentDir = join(dirname(fileURLToPath(import.meta.url)));

export function createGame(): GameEngine {
  const scenes = JSON.parse(
    readFileSync(join(contentDir, "scenes.json"), "utf-8"),
  ) as ScenesFile;
  const rng = JSON.parse(
    readFileSync(join(contentDir, "rng.json"), "utf-8"),
  ) as RngConfigFile;
  const queueActions = JSON.parse(
    readFileSync(join(contentDir, "queue-actions.json"), "utf-8"),
  ) as QueueActionsFile;

  return new GameEngine(scenes, rng, queueActions);
}
