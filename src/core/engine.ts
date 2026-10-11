import { runNpcTurn } from "./npc.js";
import type { RandomFn } from "./rng.js";
import { RngService } from "./rng.js";
import type {
  ChoiceOption,
  ChoiceRequires,
  DisplayChoice,
  DisplayState,
  Effect,
  GameState,
  QueueAction,
  QueueActionsFile,
  RollResult,
  ScenesFile,
} from "./types.js";
import type { RngConfigFile } from "./types.js";

export class GameEngine {
  private readonly scenesFile: ScenesFile;
  private readonly sceneMap: Map<string, ScenesFile["scenes"][number]>;
  private readonly rng: RngService;
  private readonly random: RandomFn;
  private readonly queueActions: QueueAction[];
  private readonly maxAnger: number;
  private state: GameState;
  private lastNpcMessage = "";

  constructor(
    scenesFile: ScenesFile,
    rngConfigs: RngConfigFile,
    queueActionsFile: QueueActionsFile,
    rng?: RngService,
    random: RandomFn = Math.random,
  ) {
    this.scenesFile = scenesFile;
    this.sceneMap = new Map(scenesFile.scenes.map((scene) => [scene.id, scene]));
    this.random = random;
    this.rng = rng ?? new RngService(rngConfigs, random);
    this.queueActions = queueActionsFile.actions;
    this.maxAnger = queueActionsFile.maxAnger;
    this.state = {
      currentSceneId: scenesFile.startScene,
      health: scenesFile.initialState.health,
      gold: scenesFile.initialState.gold,
      inventory: [...scenesFile.initialState.inventory],
      flags: { ...(scenesFile.initialState.flags ?? {}) },
      lastMessage: "",
      outcome: null,
    };
  }

  getState(): DisplayState {
    const scene = this.getCurrentScene();
    return {
      title: this.scenesFile.title,
      sceneText: scene.text,
      health: this.state.health,
      gold: this.state.gold,
      inventory: [...this.state.inventory],
      lastMessage: this.state.lastMessage,
      lastNpcMessage: this.lastNpcMessage,
      outcome: this.state.outcome,
      level: Number(this.state.flags.level ?? 1),
      anger: Number(this.state.flags.anger ?? 0),
      money: Number(this.state.flags.money ?? 0),
      isQueue: Boolean(scene.queue),
    };
  }

  getChoices(): DisplayChoice[] {
    if (this.isGameOver()) {
      return [];
    }

    return this.getAvailableChoices().map(({ id, label, index }) => ({
      id,
      label,
      index,
    }));
  }

  selectChoice(index: number): { ok: true } | { ok: false; error: string } {
    if (this.isGameOver()) {
      return { ok: false, error: "The game is over." };
    }

    const available = this.getAvailableChoices();
    const choice = available.find((item) => item.index === index);
    if (!choice) {
      return { ok: false, error: `Invalid choice: ${index}` };
    }

    this.state.lastMessage = "";
    this.lastNpcMessage = "";

    if (choice.queueActionId !== undefined) {
      this.applyQueueAction(choice.queueActionId);
      if (!this.isGameOver() && this.getCurrentScene().queue) {
        this.runNpcTurnForCurrentScene();
      }
    } else {
      this.applyEffects(choice.effects);
    }

    this.applySceneEnding();
    return { ok: true };
  }

  isGameOver(): boolean {
    return (
      this.state.outcome !== null ||
      this.state.health <= 0 ||
      Number(this.state.flags.anger ?? 0) >= this.maxAnger
    );
  }

  private getAvailableChoices(): Array<
    ChoiceOption & { index: number; queueActionId?: number }
  > {
    const scene = this.getCurrentScene();

    if (scene.queue) {
      let displayIndex = 0;
      const choices: Array<ChoiceOption & { index: number; queueActionId?: number }> = [];

      for (const action of this.queueActions) {
        if (!this.meetsRequirements(action.requires)) {
          continue;
        }
        displayIndex += 1;
        choices.push({
          id: `${scene.id}_action_${action.id}`,
          label: action.label,
          requires: action.requires,
          effects: [],
          index: displayIndex,
          queueActionId: action.id,
        });
      }

      if (this.state.gold <= 0) {
        displayIndex += 1;
        choices.push({
          id: `${scene.id}_finish`,
          label: scene.queue.finishLabel,
          effects: [{ type: "goto", scene: scene.queue.completeScene }],
          index: displayIndex,
        });
      }

      return choices;
    }

    let displayIndex = 0;
    return scene.choices
      .filter((choice) => this.meetsRequirements(choice.requires))
      .map((choice) => {
        displayIndex += 1;
        return {
          id: `${scene.id}_${displayIndex}`,
          label: choice.label,
          requires: choice.requires,
          effects: choice.effects,
          index: displayIndex,
        };
      });
  }

  private applyQueueAction(actionId: number): void {
    const action = this.queueActions.find((item) => item.id === actionId);
    if (!action) {
      throw new Error(`Unknown queue action: ${actionId}`);
    }

    this.applyEffects(action.effects);
  }

  private runNpcTurnForCurrentScene(): void {
    const result = runNpcTurn(this.state.gold, this.queueActions, this.random);
    if (result.angerGained > 0) {
      this.addAnger(result.angerGained);
      this.lastNpcMessage = [
        "Around you in line:",
        ...result.messages.map((message) => `• ${message}`),
        `(Anger +${result.angerGained})`,
      ].join("\n");
    }
  }

  private getCurrentScene() {
    const scene = this.sceneMap.get(this.state.currentSceneId);
    if (!scene) {
      throw new Error(`Unknown scene: ${this.state.currentSceneId}`);
    }
    return scene;
  }

  private meetsRequirements(requires?: ChoiceRequires): boolean {
    if (!requires) {
      return true;
    }

    if (requires.item && !this.state.inventory.includes(requires.item)) {
      return false;
    }

    if (requires.flag !== undefined) {
      const value = this.state.flags[requires.flag];
      if (requires.flagEquals !== undefined && value !== requires.flagEquals) {
        return false;
      }
      if (requires.flagEquals === undefined && value === undefined) {
        return false;
      }
    }

    if (requires.minGold !== undefined && this.state.gold < requires.minGold) {
      return false;
    }

    if (requires.maxGold !== undefined && this.state.gold > requires.maxGold) {
      return false;
    }

    if (requires.minHealth !== undefined && this.state.health < requires.minHealth) {
      return false;
    }

    if (requires.minMoney !== undefined && Number(this.state.flags.money ?? 0) < requires.minMoney) {
      return false;
    }

    return true;
  }

  private applyEffects(effects: Effect[]): void {
    for (const effect of effects) {
      this.applyEffect(effect);
    }
  }

  private applyEffect(effect: Effect): void {
    switch (effect.type) {
      case "goto":
        this.state.currentSceneId = effect.scene;
        break;
      case "set":
        this.state.flags[effect.key] = effect.value;
        break;
      case "addItem":
        if (!this.state.inventory.includes(effect.item)) {
          this.state.inventory.push(effect.item);
        }
        break;
      case "removeItem":
        this.state.inventory = this.state.inventory.filter((item) => item !== effect.item);
        break;
      case "addGold":
        this.state.gold += effect.amount;
        break;
      case "setGold":
        this.state.gold = effect.amount;
        break;
      case "addHealth":
        this.state.health += effect.amount;
        if (this.state.health <= 0) {
          this.state.outcome = "lose";
          this.state.lastMessage = "Your patience has run out.";
        }
        break;
      case "addAnger":
        this.addAnger(effect.amount);
        break;
      case "addMoney":
        this.state.flags.money = Number(this.state.flags.money ?? 0) + effect.amount;
        break;
      case "queueAdvance": {
        const scene = this.getCurrentScene();
        if (!scene.queue) {
          throw new Error("queueAdvance used outside a queue scene");
        }
        this.applyEffect({
          type: "rng",
          roll: scene.queue.advanceRoll,
          onSuccess: "addGold:-1",
          onFail: "addHealth:-4",
        });
        break;
      }
      case "message":
        this.state.lastMessage = effect.text;
        break;
      case "rng":
        this.applyRngEffect(effect);
        break;
      case "end":
        this.state.outcome = effect.outcome;
        break;
      default: {
        const _exhaustive: never = effect;
        throw new Error(`Unsupported effect: ${(_exhaustive as Effect).type}`);
      }
    }
  }

  private addAnger(amount: number): void {
    const current = Number(this.state.flags.anger ?? 0);
    this.state.flags.anger = current + amount;
    if (Number(this.state.flags.anger) >= this.maxAnger) {
      this.state.outcome = "lose";
      this.state.lastMessage = "You snap. The queue was too much.";
    }
  }

  private applyRngEffect(effect: Extract<Effect, { type: "rng" }>): void {
    const result = this.rng.roll(effect.roll);

    if ("message" in result && result.message) {
      this.state.lastMessage = result.message;
    }

    if (result.kind === "weighted" && effect.onResult) {
      const directive = effect.onResult[result.value];
      if (directive) {
        this.applyDirective(directive);
      }
      this.state.flags[`rng_${effect.roll}`] = result.value;
      return;
    }

    if (result.kind === "range" || (result.kind === "dice" && result.success !== undefined)) {
      const success = result.kind === "range" ? result.success : result.success === true;
      const directive = success ? effect.onSuccess : effect.onFail;
      if (directive) {
        this.applyDirective(directive);
      }
      return;
    }

    if (result.kind === "dice") {
      this.state.flags[`rng_${effect.roll}`] = result.total;
    }
  }

  private applyDirective(directive: string): void {
    if (directive.includes(",")) {
      for (const part of directive.split(",")) {
        this.applyDirective(part.trim());
      }
      return;
    }

    if (directive.startsWith("goto:")) {
      this.state.currentSceneId = directive.slice("goto:".length);
      return;
    }

    if (directive.startsWith("message:")) {
      this.state.lastMessage = directive.slice("message:".length);
      return;
    }

    if (directive.startsWith("setGold:")) {
      this.state.gold = Number(directive.slice("setGold:".length));
      return;
    }

    if (directive.startsWith("addGold:")) {
      this.state.gold += Number(directive.slice("addGold:".length));
      return;
    }

    if (directive.startsWith("addAnger:")) {
      this.addAnger(Number(directive.slice("addAnger:".length)));
      return;
    }

    if (directive.startsWith("addHealth:")) {
      this.applyEffect({ type: "addHealth", amount: Number(directive.slice("addHealth:".length)) });
      return;
    }

    if (directive.startsWith("addMoney:")) {
      this.state.flags.money = Number(this.state.flags.money ?? 0) + Number(directive.slice("addMoney:".length));
      return;
    }

    if (directive.startsWith("addItem:")) {
      const item = directive.slice("addItem:".length);
      if (!this.state.inventory.includes(item)) {
        this.state.inventory.push(item);
      }
      return;
    }

    if (directive.startsWith("set:")) {
      const payload = directive.slice("set:".length);
      const [key, rawValue] = payload.split("=");
      if (!key || rawValue === undefined) {
        throw new Error(`Invalid set directive: ${directive}`);
      }
      this.state.flags[key] = this.parseDirectiveValue(rawValue);
      return;
    }

    throw new Error(`Unknown directive: ${directive}`);
  }

  private parseDirectiveValue(rawValue: string): string | number | boolean {
    if (rawValue === "true") return true;
    if (rawValue === "false") return false;
    const asNumber = Number(rawValue);
    if (!Number.isNaN(asNumber) && rawValue.trim() !== "") {
      return asNumber;
    }
    return rawValue;
  }

  private applySceneEnding(): void {
    if (this.state.health <= 0) {
      this.state.outcome = "lose";
      return;
    }

    if (Number(this.state.flags.anger ?? 0) >= this.maxAnger) {
      this.state.outcome = "lose";
      return;
    }

    const scene = this.getCurrentScene();
    if (scene.ending) {
      this.state.outcome = scene.ending;
    }
  }
}

export type { RollResult };
