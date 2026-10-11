import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GameEngine } from "../core/game.js";
import type { GameContent, RngConfigFile } from "../core/types.js";

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "content");
const content = JSON.parse(readFileSync(join(contentDir, "game.json"), "utf-8")) as GameContent;
const rng = JSON.parse(
  readFileSync(join(contentDir, "finnish-rng.json"), "utf-8"),
) as RngConfigFile;
const noEvent = () => 0.99;

assert.equal(content.scenarios.length, 8);
assert.equal(content.scenarios.at(-1)?.id, "amparijono");
assert.equal(content.scenarios.at(-1)?.title, "Ämpärijono: The Final Queue");
assert.equal(content.tuning.bribeCost, 3);
assert.equal(content.actions.find((action) => action.id === "bribe")?.euros, -3);
assert.ok(content.scenarios.every((scenario) => scenario.peopleAhead > 0));
assert.ok(content.scenarios.every((scenario) => scenario.minutes > 0));
assert.ok(content.scenarios.some((scenario) => scenario.events.some((event) => event.falseEnding)));

let game = new GameEngine(content, rng, undefined, noEvent);
assert.equal(game.getState().scenarioTitle, "The Kela Service Centre");
assert.equal(game.getState().position, 6);
assert.equal(game.getState().euros, 18);
assert.ok(game.getState().terms.some((term) => term.finnish === "Kela"));
assert.ok(game.getChoices().some((choice) => choice.label.includes("€3")));

const ask = game.getChoices().find((choice) => choice.id === "ask");
assert.ok(ask);
game.selectChoice(ask.index);
assert.equal(game.getState().position, 5);
assert.equal(game.getState().discomfort, 11);
assert.equal(game.getState().minutes, 55);

game = new GameEngine(content, rng, undefined, noEvent);
const speak = () => game.getChoices().find((choice) => choice.id === "speak")!.index;
game.selectChoice(speak());
game.selectChoice(speak());
game.selectChoice(speak());
assert.equal(game.getState().position, 2, "the first false ending sends the player back");
assert.ok(game.getState().lastEvent.includes("B-143 flashes"));
assert.equal(game.getState().pendingAdvance, false);
game.selectChoice(speak());
assert.equal(game.getState().pendingAdvance, true);
assert.ok(game.getState().achievements.some((achievement) => achievement.id === "number-taken"));

const quickContent = structuredClone(content);
quickContent.initialState.sisu = 100;
quickContent.actions = quickContent.actions.map((action) =>
  action.id === "speak"
    ? { ...action, position: -1, sisu: 0, discomfort: 0, minutes: -1 }
    : action,
);
quickContent.scenarios = quickContent.scenarios.map((scenario) => ({
  ...scenario,
  peopleAhead: 1,
  minutes: 20,
  events: scenario.events.filter((event) => !event.falseEnding),
}));

game = new GameEngine(quickContent, rng, undefined, noEvent);
for (let queue = 0; queue < 8; queue += 1) {
  game.selectChoice(game.getChoices().find((choice) => choice.id === "speak")!.index);
  if (queue < 7) game.selectChoice(1);
}
assert.equal(game.getState().outcome, "win");
assert.ok(
  game.getState().achievements.some((achievement) => achievement.id === "eight-small-victories"),
);

const invalid = new GameEngine(content, rng).selectChoice(99);
assert.equal(invalid.ok, false);

console.log("All Finnish queue game tests passed.");
