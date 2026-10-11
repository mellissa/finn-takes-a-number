import type { QueueAction } from "./types.js";

export interface NpcTurnResult {
  angerGained: number;
  messages: string[];
}

export function runNpcTurn(
  peopleAhead: number,
  actions: QueueAction[],
  random: () => number,
): NpcTurnResult {
  if (peopleAhead <= 0 || actions.length === 0) {
    return { angerGained: 0, messages: [] };
  }

  const npcCount = Math.min(peopleAhead, 1 + Math.floor(random() * 3));
  const messages: string[] = [];
  let angerGained = 0;

  for (let i = 0; i < npcCount; i++) {
    const action = actions[Math.floor(random() * actions.length)];
    angerGained += action.angerWeight;
    messages.push(action.npcMessage);
  }

  return { angerGained, messages };
}
