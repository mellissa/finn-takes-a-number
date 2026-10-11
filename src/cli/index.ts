import { createInterface, type Interface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";

import { createGame } from "../content/load.js";

type Game = ReturnType<typeof createGame>;

type PlayerInput =
  | { type: "choice"; value: number }
  | { type: "exit" }
  | { type: "restart" };

function ask(rl: Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => resolve(answer));
  });
}

const WELCOME = `
=== The Queue ===

You are one person trying to get through ten lines in a single day —
grocery store, bus stop, train station, airport, and finally Penn Station.

Every line is the same problem: people ahead of you, time slipping away,
and everyone around you making it worse.

HOW TO PLAY
  • Get to the front of the line (People ahead → 0) to finish each level.
  • Pick an action by typing its number and pressing Enter.
  • Patience drains while you wait. Anger rises when others act up.
  • If patience or anger maxes out, you lose.
  • Type "exit" to quit or "restart" to start over at any time.

YOUR STATS
  Patience — how much waiting you can take
  Anger    — how close you are to snapping (max 100)
  People ahead — how many spots until the front
  Money    — for bribes ($3 per attempt)
  Candy    — another way to bribe your way forward

Each turn, other people in line will also do things. That raises your anger.

Survive all ten queues to win.
`.trim();

async function showWelcome(rl: Interface): Promise<void> {
  console.clear();
  console.log(WELCOME);
  await ask(rl, "\n[Press Enter to start]");
}

function printStatus(game: Game): void {
  const state = game.getState();
  console.log(`=== ${state.title} ===`);
  console.log(`Level: ${state.level} | Patience: ${state.health} | People ahead: ${state.gold}`);
  console.log(`Anger: ${state.anger}/100 | Money: $${state.money}`);
  console.log();
}

function hasFeedback(game: Game): boolean {
  const state = game.getState();
  return Boolean(state.lastMessage || state.lastNpcMessage);
}

function renderResult(game: Game): void {
  const state = game.getState();
  console.clear();
  printStatus(game);

  if (state.lastMessage) {
    console.log(state.lastMessage);
    console.log();
  }

  if (state.lastNpcMessage) {
    console.log(state.lastNpcMessage);
    console.log();
  }
}

function renderSituation(game: Game): void {
  const state = game.getState();
  console.clear();
  printStatus(game);

  console.log(state.sceneText);
  console.log();

  if (state.isQueue) {
    console.log("Alright, you're here and you're waiting.");
    console.log("You need to get to the front of the line. What do you do?");
    console.log();
  }

  const choices = game.getChoices();
  for (const choice of choices) {
    console.log(`${choice.index}. ${choice.label}`);
  }
  console.log();
  console.log('(Type "exit" to quit or "restart" to start over)');
}

function renderGameOver(game: Game): void {
  const state = game.getState();
  console.clear();
  printStatus(game);

  if (state.lastMessage) {
    console.log(state.lastMessage);
    console.log();
  }

  if (state.lastNpcMessage) {
    console.log(state.lastNpcMessage);
    console.log();
  }

  console.log(state.sceneText);
  console.log();

  if (state.outcome === "win") {
    console.log("*** You survived every queue! ***");
  } else {
    console.log("*** Out of patience or composure — game over ***");
  }

  console.log();
  console.log('Type "restart" to play again or "exit" to quit.');
}

function parseInput(answer: string, max: number): PlayerInput | null {
  const normalized = answer.trim().toLowerCase();

  if (normalized === "exit" || normalized === "quit") {
    return { type: "exit" };
  }

  if (normalized === "restart" || normalized === "reset") {
    return { type: "restart" };
  }

  const value = Number(answer);
  if (Number.isInteger(value) && value >= 1 && value <= max) {
    return { type: "choice", value };
  }

  return null;
}

async function promptInput(rl: Interface, max: number): Promise<PlayerInput> {
  while (true) {
    const answer = await ask(rl, "\n> ");
    const parsed = parseInput(answer, max);
    if (parsed) {
      return parsed;
    }
    console.log(`Enter a number between 1 and ${max}, or type "exit" / "restart".`);
  }
}

async function promptAfterGameOver(rl: Interface): Promise<"restart" | "exit"> {
  while (true) {
    const answer = (await ask(rl, "\n> ")).trim().toLowerCase();
    if (answer === "restart" || answer === "reset") {
      return "restart";
    }
    if (answer === "exit" || answer === "quit") {
      return "exit";
    }
    console.log('Type "restart" to play again or "exit" to quit.');
  }
}

async function runGame(rl: Interface): Promise<"restart" | "exit"> {
  const game = createGame();
  await showWelcome(rl);

  while (true) {
    if (game.isGameOver()) {
      renderGameOver(game);
      return promptAfterGameOver(rl);
    }

    renderSituation(game);

    const choices = game.getChoices();
    const inputResult = await promptInput(rl, choices.length);

    if (inputResult.type === "exit") {
      return "exit";
    }

    if (inputResult.type === "restart") {
      return "restart";
    }

    const result = game.selectChoice(inputResult.value);
    if (!result.ok) {
      console.log(result.error);
      await ask(rl, "\n[Press Enter to continue]");
      continue;
    }

    if (!game.isGameOver() && hasFeedback(game)) {
      renderResult(game);
      await ask(rl, "[Press Enter to continue]");
    }
  }
}

async function main(): Promise<void> {
  const rl = createInterface({ input, output });

  try {
    while (true) {
      const result = await runGame(rl);
      if (result === "exit") {
        console.log("\nThanks for waiting. Goodbye.");
        break;
      }
    }
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
