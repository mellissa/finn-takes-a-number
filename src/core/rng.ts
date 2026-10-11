import type {
  DiceRngConfig,
  RangeRngConfig,
  RngConfig,
  RngConfigFile,
  RollResult,
  WeightedRngConfig,
} from "./types.js";

export type RandomFn = () => number;

export class RngService {
  private readonly configs: RngConfigFile;
  private readonly random: RandomFn;

  constructor(configs: RngConfigFile, random: RandomFn = Math.random) {
    this.configs = configs;
    this.random = random;
  }

  roll(name: string): RollResult {
    const config = this.configs[name];
    if (!config) {
      throw new Error(`Unknown RNG roll: ${name}`);
    }

    switch (config.type) {
      case "range":
        return this.rollRange(config);
      case "weighted":
        return this.rollWeighted(config);
      case "dice":
        return this.rollDice(config);
      default: {
        const _exhaustive: never = config;
        throw new Error(`Unsupported RNG type: ${(_exhaustive as RngConfig).type}`);
      }
    }
  }

  private rollInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  private rollRange(config: RangeRngConfig): RollResult {
    const roll = this.rollInt(config.min, config.max);
    const success = roll >= config.successAtOrAbove;
    return {
      kind: "range",
      roll,
      success,
      message: success ? config.successMessage : config.failMessage,
    };
  }

  private rollWeighted(config: WeightedRngConfig): RollResult {
    const totalWeight = config.options.reduce((sum, option) => sum + option.weight, 0);
    let threshold = this.random() * totalWeight;

    for (const option of config.options) {
      threshold -= option.weight;
      if (threshold <= 0) {
        return { kind: "weighted", value: option.value };
      }
    }

    const last = config.options[config.options.length - 1];
    return { kind: "weighted", value: last.value };
  }

  private rollDice(config: DiceRngConfig): RollResult {
    const rolls: number[] = [];
    for (let i = 0; i < config.count; i++) {
      rolls.push(this.rollInt(1, config.sides));
    }

    const modifier = config.modifier ?? 0;
    const total = rolls.reduce((sum, value) => sum + value, 0) + modifier;
    const success =
      config.successAtOrAbove !== undefined ? total >= config.successAtOrAbove : undefined;

    let message: string | undefined;
    if (success === true) {
      message = config.successMessage;
    } else if (success === false) {
      message = config.failMessage;
    }

    return { kind: "dice", rolls, total, success, message };
  }
}
