import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GameEngine } from "../core/engine.js";
import { RngService } from "../core/rng.js";
import type { QueueActionsFile, RngConfigFile, ScenesFile } from "../core/types.js";

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "content");

const scenes = JSON.parse(
  readFileSync(join(contentDir, "scenes.json"), "utf-8"),
) as ScenesFile;
const rngConfigs = JSON.parse(
  readFileSync(join(contentDir, "rng.json"), "utf-8"),
) as RngConfigFile;
const queueActions = JSON.parse(
  readFileSync(join(contentDir, "queue-actions.json"), "utf-8"),
) as QueueActionsFile;

function seqRandom(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1];
    index += 1;
    return value;
  };
}

// Game starts directly in the level 1 grocery queue with stats seeded
let game = new GameEngine(scenes, rngConfigs, queueActions);
assert.equal(game.getState().title, "The Queue");
assert.equal(game.getState().level, 1);
assert.equal(game.getState().gold, 4);
assert.equal(game.getState().money, 20);
assert.ok(game.getState().sceneText.includes("GROCERY STORE"));

// Queue scenes expose all 10 standard actions immediately
const queueChoices = game.getChoices();
assert.equal(queueChoices.length, 10);
assert.equal(queueChoices[1].label, "Wait patiently");

// Line advance succeeds with high roll; NPCs also act
const random = seqRandom([0.9, 0.1, 0.1]);
game = new GameEngine(scenes, rngConfigs, queueActions, new RngService(rngConfigs, random), random);
game.selectChoice(2); // Wait patiently - success
assert.equal(game.getState().gold, 3);
assert.ok(game.getState().anger >= 0);

// Reach front of line using money bribes (deterministic advance)
game = new GameEngine(scenes, rngConfigs, queueActions);
for (let i = 0; i < 4; i++) {
  game.selectChoice(4); // Bribe people with money
}
assert.equal(game.getState().gold, 0);
const finishChoices = game.getChoices();
assert.ok(finishChoices.some((choice) => choice.label.includes("Check out")));
game.selectChoice(finishChoices.find((c) => c.label.includes("Check out"))!.index);
assert.ok(game.getState().sceneText.includes("survived the first queue"));

// Anger weights are 1-10 per action id
assert.equal(queueActions.actions[0].angerWeight, 1);
assert.equal(queueActions.actions[9].angerWeight, 10);

// Invalid choice rejected
game = new GameEngine(scenes, rngConfigs, queueActions);
const invalid = game.selectChoice(99);
assert.equal(invalid.ok, false);

console.log("All smoke tests passed.");
