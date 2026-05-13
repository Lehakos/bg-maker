export type ProjectGameCounterScope = "player" | "shared";

export type ProjectGamePlayer = {
  color: string;
  id: string;
  name: string;
};

export type ProjectGameCounter = {
  defaultValue: number;
  id: string;
  label: string;
  maxValue: number;
  minValue: number;
  scope: ProjectGameCounterScope;
  step: number;
};

export type ProjectGameConfig = {
  counters: ProjectGameCounter[];
  players: ProjectGamePlayer[];
};

export const projectGamePlayerNameMaxLength = 48;

export const projectGameCounterLabelMaxLength = 64;

export const projectGameCounterValueLimits = {
  max: 999999,
  min: -999999
} as const;

export const projectGameCounterStepLimits = {
  max: 999999,
  min: 1
} as const;

export function getDefaultProjectGameConfig(): ProjectGameConfig {
  return {
    counters: [],
    players: [
      {
        color: "#dc2626",
        id: "player-red",
        name: "Red player"
      },
      {
        color: "#2563eb",
        id: "player-blue",
        name: "Blue player"
      }
    ]
  };
}
