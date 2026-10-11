export type GameOutcome = "win" | "lose" | null;

export interface Term {
  finnish: string;
  explanation: string;
}

export interface StatChanges {
  position?: number;
  sisu?: number;
  discomfort?: number;
  minutes?: number;
  euros?: number;
}

export interface QueueEvent extends StatChanges {
  message: string;
  weight: number;
  falseEnding?: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  location: string;
  intro: string;
  terms?: Term[];
  peopleAhead: number;
  minutes: number;
  advanceRoll: string;
  completion: string;
  transition: string;
  events: QueueEvent[];
}

export interface ActionRequirement {
  minEuros?: number;
  maxDiscomfort?: number;
}

export interface QueueAction extends StatChanges {
  id: string;
  label: string;
  feedback: string;
  advance?: boolean;
  requires?: ActionRequirement;
}

export type AchievementTrigger =
  | "firstQueue"
  | "lowSisu"
  | "lowDiscomfort"
  | "threeBribes"
  | "allQueues";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  trigger: AchievementTrigger;
  threshold?: number;
}

export interface GameContent {
  title: string;
  initialState: {
    sisu: number;
    discomfort: number;
    euros: number;
  };
  tuning: {
    maxSisu: number;
    maxDiscomfort: number;
    bribeCost: number;
    eventChance: number;
    betweenQueueSisu: number;
    betweenQueueDiscomfort: number;
  };
  actions: QueueAction[];
  achievements: Achievement[];
  scenarios: Scenario[];
}

export interface GameState {
  scenarioIndex: number;
  position: number;
  sisu: number;
  discomfort: number;
  minutes: number;
  euros: number;
  bribes: number;
  completedQueues: number;
  falseEndings: number;
  seenFalseEndings: string[];
  achievements: string[];
  lastMessage: string;
  lastEvent: string;
  pendingAdvance: boolean;
  outcome: GameOutcome;
}

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
  scenarioTitle: string;
  location: string;
  sceneText: string;
  terms: Term[];
  position: number;
  sisu: number;
  maxSisu: number;
  discomfort: number;
  maxDiscomfort: number;
  minutes: number;
  euros: number;
  lastMessage: string;
  lastEvent: string;
  outcome: GameOutcome;
  level: number;
  totalLevels: number;
  achievements: Achievement[];
  pendingAdvance: boolean;
}
