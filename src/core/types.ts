export type GameOutcome = "win" | "lose" | null;

export interface GameState {
  currentSceneId: string;
  health: number;
  gold: number;
  inventory: string[];
  flags: Record<string, string | number | boolean>;
  lastMessage: string;
  outcome: GameOutcome;
}

export interface ChoiceRequires {
  item?: string;
  flag?: string;
  flagEquals?: string | number | boolean;
  minGold?: number;
  maxGold?: number;
  minHealth?: number;
  minMoney?: number;
}

export interface QueueSceneConfig {
  advanceRoll: string;
  completeScene: string;
  finishLabel: string;
}

export interface QueueAction {
  id: number;
  label: string;
  angerWeight: number;
  npcMessage: string;
  selfAnger?: number;
  requires?: ChoiceRequires;
  effects: Effect[];
}

export interface QueueActionsFile {
  maxAnger: number;
  actions: QueueAction[];
}

export interface ChoiceOption {
  id: string;
  label: string;
  requires?: ChoiceRequires;
  effects: Effect[];
}

export interface Scene {
  id: string;
  text: string;
  choices: Omit<ChoiceOption, "id">[];
  queue?: QueueSceneConfig;
  ending?: "win" | "lose";
}

export interface ScenesFile {
  title: string;
  startScene: string;
  initialState: {
    health: number;
    gold: number;
    inventory: string[];
    flags?: Record<string, string | number | boolean>;
  };
  scenes: Scene[];
}

export type Effect =
  | { type: "goto"; scene: string }
  | { type: "set"; key: string; value: string | number | boolean }
  | { type: "addItem"; item: string }
  | { type: "removeItem"; item: string }
  | { type: "addGold"; amount: number }
  | { type: "setGold"; amount: number }
  | { type: "addHealth"; amount: number }
  | { type: "addAnger"; amount: number }
  | { type: "addMoney"; amount: number }
  | { type: "queueAdvance" }
  | { type: "message"; text: string }
  | {
      type: "rng";
      roll: string;
      onSuccess?: string;
      onFail?: string;
      onResult?: Record<string, string>;
    }
  | { type: "end"; outcome: "win" | "lose" };

export interface RangeRngConfig {
  type: "range";
  min: number;
  max: number;
  successAtOrAbove: number;
  successMessage?: string;
  failMessage?: string;
}

export interface WeightedRngOption {
  value: string;
  weight: number;
}

export interface WeightedRngConfig {
  type: "weighted";
  options: WeightedRngOption[];
}

export interface DiceRngConfig {
  type: "dice";
  count: number;
  sides: number;
  modifier?: number;
  successAtOrAbove?: number;
  successMessage?: string;
  failMessage?: string;
}

export type RngConfig = RangeRngConfig | WeightedRngConfig | DiceRngConfig;

export type RngConfigFile = Record<string, RngConfig>;

export interface RangeRollResult {
  kind: "range";
  roll: number;
  success: boolean;
  message?: string;
}

export interface WeightedRollResult {
  kind: "weighted";
  value: string;
}

export interface DiceRollResult {
  kind: "dice";
  rolls: number[];
  total: number;
  success?: boolean;
  message?: string;
}

export type RollResult = RangeRollResult | WeightedRollResult | DiceRollResult;

export interface DisplayChoice {
  id: string;
  label: string;
  index: number;
}

export interface DisplayState {
  title: string;
  sceneText: string;
  health: number;
  gold: number;
  inventory: string[];
  lastMessage: string;
  lastNpcMessage: string;
  outcome: GameOutcome;
  level: number;
  anger: number;
  money: number;
  isQueue: boolean;
}
