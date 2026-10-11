A Finnish adventure awaits! Queue to receive unrewarding benefits in a cold and difficult environment.

# Finn Takes a Number

Finn Takes a Number is an English-language terminal adventure about getting through eight very Finnish queues. Take a *vuoronumero* (queue number), protect your *sisu* (quiet determination), and attempt to finish ordinary errands without creating a social incident.

The tone is affectionate and deadpan. Finnish places, names, and words appear naturally, with a short explanation when a term first enters play.

## The player experience

Every queue begins with people ahead of you and a closing time. On each turn, choose how Finn responds: wait quietly, study the number display, ask a stranger for help, drink emergency coffee, use a forceful “no niin,” or offer a discreet queue arrangement. A bribe always costs €3.

Your decisions affect five connected pressures:

- **Queue position** — reach zero people ahead to finish the errand.
- **Sisu** — the determination left for continuing.
- **Social discomfort** — reach 100 and Finn must leave before anyone notices.
- **Time** — if the office closes, the queue wins.
- **Euros** — a limited resource for the least dignified shortcut.

Queue events can help, delay, or briefly suggest that the ordeal is over. Choices, random surprises, false endings, and unlockable achievements make repeated runs different while keeping each situation recognisably Finnish.

Across eight queues, you will experience uniquely Finnish challenges without knowing what quiet complication is waiting next.

## Install and play

You need a current Node.js LTS release.

```bash
git clone https://github.com/mellissa/finn-takes-a-number.git
cd finn-takes-a-number
npm install
npm run finn-takes-a-number
```

`npm start` and `npm run play` launch the same game. On Windows, `play.bat` is also available.

Enter the number beside a choice and press Enter. Type `restart` at any time for a new run, or `exit` to leave the queue.

## Development

The TypeScript engine is independent from the terminal interface. Scenarios, actions, achievements, event weights, costs, deadlines, and other tunable values live in JSON rather than being embedded in the CLI.

```text
src/
  cli/       Terminal interface
  core/      Reusable game and random-number systems
  content/   Data-driven scenarios, actions, tuning, and roll definitions
  test/      Engine and content tests
```

```bash
npm test
npm run typecheck
```

The game collects no personal data and makes no network requests during play.
