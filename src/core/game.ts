import { RngService, type RandomFn } from "./rng.js";
import type {
  Achievement,
  DisplayChoice,
  DisplayState,
  GameContent,
  GameState,
  QueueAction,
  QueueEvent,
  Scenario,
  StatChanges,
} from "./types.js";
import type { RngConfigFile } from "./types.js";

export class GameEngine {
  private readonly rng: RngService;
  private readonly random: RandomFn;
  private state: GameState;

  constructor(
    private readonly content: GameContent,
    rngConfigs: RngConfigFile,
    rng?: RngService,
    random: RandomFn = Math.random,
  ) {
    if (content.scenarios.length !== 8) {
      throw new Error(`Expected eight queue scenarios, received ${content.scenarios.length}`);
    }
    this.random = random;
    this.rng = rng ?? new RngService(rngConfigs, random);
    const first = content.scenarios[0];
    this.state = {
      scenarioIndex: 0,
      position: first.peopleAhead,
      sisu: content.initialState.sisu,
      discomfort: content.initialState.discomfort,
      minutes: first.minutes,
      euros: content.initialState.euros,
      bribes: 0,
      completedQueues: 0,
      falseEndings: 0,
      seenFalseEndings: [],
      achievements: [],
      lastMessage: "",
      lastEvent: "",
      pendingAdvance: false,
      outcome: null,
    };
  }

  getState(): DisplayState {
    const scenario = this.scenario;
    return {
      title: this.content.title,
      scenarioTitle: scenario.title,
      location: scenario.location,
      sceneText: scenario.intro,
      terms: scenario.terms ?? [],
      position: this.state.position,
      sisu: this.state.sisu,
      maxSisu: this.content.tuning.maxSisu,
      discomfort: this.state.discomfort,
      maxDiscomfort: this.content.tuning.maxDiscomfort,
      minutes: this.state.minutes,
      euros: this.state.euros,
      lastMessage: this.state.lastMessage,
      lastEvent: this.state.lastEvent,
      outcome: this.state.outcome,
      level: this.state.scenarioIndex + 1,
      totalLevels: this.content.scenarios.length,
      achievements: this.content.achievements.filter((achievement) =>
        this.state.achievements.includes(achievement.id),
      ),
      pendingAdvance: this.state.pendingAdvance,
    };
  }

  getChoices(): DisplayChoice[] {
    if (this.isGameOver()) return [];

    if (this.state.pendingAdvance) {
      return [{ id: "continue", label: this.scenario.transition, index: 1 }];
    }

    return this.content.actions
      .filter((action) => this.meetsRequirements(action))
      .map((action, index) => ({ id: action.id, label: action.label, index: index + 1 }));
  }

  selectChoice(index: number): { ok: true } | { ok: false; error: string } {
    if (this.isGameOver()) return { ok: false, error: "The game is over." };
    const choice = this.getChoices().find((candidate) => candidate.index === index);
    if (!choice) return { ok: false, error: `Invalid choice: ${index}` };

    this.state.lastMessage = "";
    this.state.lastEvent = "";

    if (choice.id === "continue") {
      this.startNextScenario();
      return { ok: true };
    }

    const action = this.content.actions.find((candidate) => candidate.id === choice.id);
    if (!action) throw new Error(`Unknown action: ${choice.id}`);
    this.applyAction(action);
    if (!this.isGameOver()) this.resolveTurn();
    return { ok: true };
  }

  isGameOver(): boolean {
    return this.state.outcome !== null;
  }

  private get scenario(): Scenario {
    return this.content.scenarios[this.state.scenarioIndex];
  }

  private meetsRequirements(action: QueueAction): boolean {
    const requirement = action.requires;
    if (!requirement) return true;
    if (requirement.minEuros !== undefined && this.state.euros < requirement.minEuros) {
      return false;
    }
    if (
      requirement.maxDiscomfort !== undefined &&
      this.state.discomfort > requirement.maxDiscomfort
    ) {
      return false;
    }
    return true;
  }

  private applyAction(action: QueueAction): void {
    this.applyChanges(action);
    this.state.lastMessage = action.feedback;

    if (action.id === "bribe") {
      if (action.euros !== -this.content.tuning.bribeCost) {
        throw new Error("The bribe action must use the configured bribe cost");
      }
      this.state.bribes += 1;
    }

    if (action.advance) {
      const result = this.rng.roll(this.scenario.advanceRoll);
      if (result.kind !== "range") {
        throw new Error(`Advance roll ${this.scenario.advanceRoll} must be a range roll`);
      }
      this.state.lastMessage = result.message ?? action.feedback;
      if (result.success) this.state.position -= 1;
    }

    this.clampStats();
  }

  private resolveTurn(): void {
    this.checkLoss();
    if (this.isGameOver()) return;

    if (this.state.position <= 0) {
      const falseEnding = this.scenario.events.find(
        (event) =>
          event.falseEnding && !this.state.seenFalseEndings.includes(this.scenario.id),
      );
      if (falseEnding) {
        this.state.seenFalseEndings.push(this.scenario.id);
        this.state.falseEndings += 1;
        this.applyEvent(falseEnding);
        this.checkLoss();
        return;
      }
      this.completeScenario();
      return;
    }

    if (this.random() < this.content.tuning.eventChance) {
      const events = this.scenario.events.filter((event) => !event.falseEnding);
      if (events.length > 0) this.applyEvent(this.pickWeighted(events));
    }
    this.checkLoss();
  }

  private applyEvent(event: QueueEvent): void {
    this.applyChanges(event);
    this.state.lastEvent = event.message;
    this.clampStats();
  }

  private applyChanges(changes: StatChanges): void {
    this.state.position += changes.position ?? 0;
    this.state.sisu += changes.sisu ?? 0;
    this.state.discomfort += changes.discomfort ?? 0;
    this.state.minutes += changes.minutes ?? 0;
    this.state.euros += changes.euros ?? 0;
  }

  private clampStats(): void {
    this.state.position = Math.max(0, this.state.position);
    this.state.sisu = Math.min(this.content.tuning.maxSisu, this.state.sisu);
    this.state.discomfort = Math.max(0, this.state.discomfort);
    this.state.euros = Math.max(0, this.state.euros);
  }

  private pickWeighted(events: QueueEvent[]): QueueEvent {
    const total = events.reduce((sum, event) => sum + event.weight, 0);
    let cursor = this.random() * total;
    for (const event of events) {
      cursor -= event.weight;
      if (cursor <= 0) return event;
    }
    return events[events.length - 1];
  }

  private completeScenario(): void {
    this.state.completedQueues += 1;
    this.state.pendingAdvance = true;
    this.state.lastMessage = this.scenario.completion;
    this.unlockAchievements();

    if (this.state.completedQueues === this.content.scenarios.length) {
      this.state.pendingAdvance = false;
      this.state.outcome = "win";
      this.unlockAchievements();
    }
  }

  private startNextScenario(): void {
    this.state.scenarioIndex += 1;
    const next = this.scenario;
    this.state.position = next.peopleAhead;
    this.state.minutes = next.minutes;
    this.state.sisu += this.content.tuning.betweenQueueSisu;
    this.state.discomfort += this.content.tuning.betweenQueueDiscomfort;
    this.state.pendingAdvance = false;
    this.state.lastMessage = "";
    this.state.lastEvent = "";
    this.clampStats();
  }

  private checkLoss(): void {
    if (this.state.sisu <= 0) {
      this.state.outcome = "lose";
      this.state.lastMessage = "Your sisu is gone. You go home without the form.";
    } else if (this.state.discomfort >= this.content.tuning.maxDiscomfort) {
      this.state.outcome = "lose";
      this.state.lastMessage =
        "The social discomfort becomes visible. This is unacceptable. You leave.";
    } else if (this.state.minutes <= 0) {
      this.state.outcome = "lose";
      this.state.lastMessage = "The office closes exactly on time. You do not.";
    }
  }

  private unlockAchievements(): void {
    for (const achievement of this.content.achievements) {
      if (
        !this.state.achievements.includes(achievement.id) &&
        this.achievementMet(achievement)
      ) {
        this.state.achievements.push(achievement.id);
      }
    }
  }

  private achievementMet(achievement: Achievement): boolean {
    switch (achievement.trigger) {
      case "firstQueue":
        return this.state.completedQueues >= 1;
      case "lowSisu":
        return this.state.sisu <= (achievement.threshold ?? 20);
      case "lowDiscomfort":
        return this.state.completedQueues >= 1 &&
          this.state.discomfort <= (achievement.threshold ?? 10);
      case "threeBribes":
        return this.state.bribes >= 3;
      case "allQueues":
        return this.state.completedQueues === this.content.scenarios.length;
    }
  }
}
