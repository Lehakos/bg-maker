import type {
  ProjectGameConfig,
  ProjectGameCounter,
  ProjectGameCounterScope,
  ProjectGamePlayer
} from "@bg-maker/shared";
import {
  getDefaultProjectGameConfig,
  projectGameCounterLabelMaxLength,
  projectGameCounterStepLimits,
  projectGameCounterValueLimits,
  projectGamePlayerNameMaxLength
} from "@bg-maker/shared";

const playerColors = ["#dc2626", "#2563eb", "#16a34a", "#ca8a04", "#9333ea", "#0891b2"];

export function createProjectGamePlayer(
  createId: () => string = () => crypto.randomUUID()
): ProjectGamePlayer {
  return {
    color: playerColors[Math.floor(Math.random() * playerColors.length)] ?? "#64748b",
    id: createId(),
    name: "Player"
  };
}

export function createProjectGameCounter(
  createId: () => string = () => crypto.randomUUID()
): ProjectGameCounter {
  return {
    defaultValue: 0,
    id: createId(),
    label: "Counter",
    maxValue: 999,
    minValue: 0,
    scope: "player",
    step: 1
  };
}

export function getProjectGameConfigWithAddedPlayer(
  gameConfig: ProjectGameConfig,
  createId?: () => string
): ProjectGameConfig {
  return {
    ...gameConfig,
    players: [...gameConfig.players, createProjectGamePlayer(createId)]
  };
}

export function getProjectGameConfigWithUpdatedPlayer(
  gameConfig: ProjectGameConfig,
  playerId: string,
  updatePlayer: (player: ProjectGamePlayer) => ProjectGamePlayer
): ProjectGameConfig {
  return {
    ...gameConfig,
    players: gameConfig.players.map((player) =>
      player.id === playerId ? normalizeProjectGamePlayer(updatePlayer(player)) : player
    )
  };
}

export function getProjectGameConfigWithRemovedPlayer(
  gameConfig: ProjectGameConfig,
  playerId: string
): ProjectGameConfig {
  const fallback = getDefaultProjectGameConfig();
  const players = gameConfig.players.filter((player) => player.id !== playerId);

  return {
    ...gameConfig,
    players: players.length ? players : fallback.players
  };
}

export function getProjectGameConfigWithAddedCounter(
  gameConfig: ProjectGameConfig,
  createId?: () => string
): ProjectGameConfig {
  return {
    ...gameConfig,
    counters: [...gameConfig.counters, createProjectGameCounter(createId)]
  };
}

export function getProjectGameConfigWithUpdatedCounter(
  gameConfig: ProjectGameConfig,
  counterId: string,
  updateCounter: (counter: ProjectGameCounter) => ProjectGameCounter
): ProjectGameConfig {
  return {
    ...gameConfig,
    counters: gameConfig.counters.map((counter) =>
      counter.id === counterId ? normalizeProjectGameCounter(updateCounter(counter)) : counter
    )
  };
}

export function getProjectGameConfigWithRemovedCounter(
  gameConfig: ProjectGameConfig,
  counterId: string
): ProjectGameConfig {
  return {
    ...gameConfig,
    counters: gameConfig.counters.filter((counter) => counter.id !== counterId)
  };
}

export function normalizeProjectGameCounterNumberField(
  field: "defaultValue" | "maxValue" | "minValue" | "step",
  value: number
) {
  if (field === "step") {
    return clampFiniteNumber(
      value,
      projectGameCounterStepLimits.min,
      projectGameCounterStepLimits.max
    );
  }

  return clampFiniteNumber(
    value,
    projectGameCounterValueLimits.min,
    projectGameCounterValueLimits.max
  );
}

export function normalizeProjectGameCounterScope(value: string): ProjectGameCounterScope {
  return value === "shared" ? "shared" : "player";
}

function normalizeProjectGamePlayer(player: ProjectGamePlayer): ProjectGamePlayer {
  return {
    ...player,
    color: /^#[0-9a-fA-F]{6}$/.test(player.color) ? player.color.toLowerCase() : "#64748b",
    name: player.name.trim().slice(0, projectGamePlayerNameMaxLength) || "Player"
  };
}

function normalizeProjectGameCounter(counter: ProjectGameCounter): ProjectGameCounter {
  const minValue = normalizeProjectGameCounterNumberField("minValue", counter.minValue);
  const maxValue = Math.max(
    minValue,
    normalizeProjectGameCounterNumberField("maxValue", counter.maxValue)
  );

  return {
    ...counter,
    defaultValue: clampFiniteNumber(counter.defaultValue, minValue, maxValue),
    label: counter.label.trim().slice(0, projectGameCounterLabelMaxLength) || "Counter",
    maxValue,
    minValue,
    scope: normalizeProjectGameCounterScope(counter.scope),
    step: normalizeProjectGameCounterNumberField("step", counter.step)
  };
}

function clampFiniteNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
