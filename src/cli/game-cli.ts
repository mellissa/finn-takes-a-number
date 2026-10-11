import { createInterface, type Interface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";

import { createGame } from "../content/load.js";

type Game = ReturnType<typeof createGame>;
type PlayerInput = { type: "choice"; value: number } | { type: "exit" } | { type: "restart" };

function ask(rl: Interface, query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

const WELCOME = `
=== Finn Takes a Number ===

Eight ordinary Finnish queues stand between you and a modest administrative result.

For newcomers: Finnish errands often begin with a numbered ticket, while silence and
personal space are treated with care. Sisu means calm determination when circumstances
are cold, slow, or both. This game is an affectionate exaggeration of those experiences.

Protect your Sisu (quiet determination), keep social discomfort below 100, and reach
the front before time runs out. Choose an action by entering its number. Some choices
move you faster; some merely provide an experience. A discreet bribe always costs €3.

Type "exit" to quit or "restart" to begin again.
`.trim();

function printStatus(game: Game): void {
  const state = game.getState();
  console.log(`=== Queue ${state.level}/${state.totalLevels}: ${state.scenarioTitle} ===`);
  console.log(state.location);
  console.log(
    `Position: ${state.position} ahead | Sisu: ${state.sisu}/${state.maxSisu} | ` +
      `Discomfort: ${state.discomfort}/${state.maxDiscomfort}`,
  );
  console.log(`Time: ${state.minutes} min | Money: €${state.euros}`);
  if (state.achievements.length > 0) {
    console.log(`Achievements: ${state.achievements.map((item) => item.name).join(", ")}`);
  }
  console.log();
}

function render(game: Game): void {
  const state = game.getState();
  console.clear();
  printStatus(game);

  if (state.lastMessage) console.log(`${state.lastMessage}\n`);
  if (state.lastEvent) console.log(`Meanwhile: ${state.lastEvent}\n`);

  if (!state.lastMessage && !state.lastEvent) {
    console.log(state.sceneText);
    if (state.terms.length > 0) {
      console.log();
      for (const term of state.terms) {
        console.log(`  ${term.finnish} — ${term.explanation}`);
      }
    }
    console.log();
  }

  for (const choice of game.getChoices()) {
    console.log(`${choice.index}. ${choice.label}`);
  }
  console.log('\n(Type "exit" to quit or "restart" to start over)');
}

function renderGameOver(game: Game): void {
  const state = game.getState();
  console.clear();
  printStatus(game);
  if (state.lastMessage) console.log(`${state.lastMessage}\n`);
  if (state.lastEvent) console.log(`${state.lastEvent}\n`);

  if (state.outcome === "win") {
    console.log("You survived eight queues. Finland acknowledges this by issuing a receipt.");
  } else {
    console.log("The queue continues without you. It bears no grudge.");
  }
  console.log('\nType "restart" to play again or "exit" to quit.');
}

function parseInput(answer: string, max: number): PlayerInput | null {
  const normalized = answer.trim().toLowerCase();
  if (normalized === "exit" || normalized === "quit") return { type: "exit" };
  if (normalized === "restart" || normalized === "reset") return { type: "restart" };
  const value = Number(answer);
  return Number.isInteger(value) && value >= 1 && value <= max
    ? { type: "choice", value }
    : null;
}

async function promptInput(rl: Interface, max: number): Promise<PlayerInput> {
  while (true) {
    const parsed = parseInput(await ask(rl, "\n> "), max);
    if (parsed) return parsed;
    console.log(`Enter 1–${max}, or type "exit" / "restart".`);
  }
}

async function runGame(rl: Interface): Promise<"restart" | "exit"> {
  const game = createGame();
  console.clear();
  console.log(WELCOME);
  await ask(rl, "\n[Press Enter to take a number]");

  while (!game.isGameOver()) {
    render(game);
    const command = await promptInput(rl, game.getChoices().length);
    if (command.type !== "choice") return command.type;
    game.selectChoice(command.value);
    if (!game.isGameOver()) await ask(rl, "\n[Press Enter to continue]");
  }

  renderGameOver(game);
  while (true) {
    const command = parseInput(await ask(rl, "\n> "), 0);
    if (command?.type === "restart" || command?.type === "exit") return command.type;
    console.log('Type "restart" or "exit".');
  }
}

async function main(): Promise<void> {
  const rl = createInterface({ input, output });
  try {
    while ((await runGame(rl)) === "restart") {
      // A fresh engine is created for the next run.
    }
    console.log("\nKiitos (thank you) for waiting.");
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
