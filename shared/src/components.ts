export const componentTypes = ["card", "deck", "die", "coin", "marker", "token"] as const;

export type ComponentType = (typeof componentTypes)[number];

export const componentVisibilities = ["visible", "hidden"] as const;

export type ComponentVisibility = (typeof componentVisibilities)[number];

export type DeckCardEntry = {
  cardId: string;
  quantity: number;
};

export type GameComponentBase = {
  id: string;
  projectId: string;
  type: ComponentType;
  name: string;
  quantity: number;
  description: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CardComponent = GameComponentBase & {
  type: "card";
  frontText: string;
  backText: string;
  defaultVisibility: ComponentVisibility;
};

export type DeckComponent = GameComponentBase & {
  type: "deck";
  cards: DeckCardEntry[];
  shuffleOnSetup: boolean;
  defaultVisibility: ComponentVisibility;
};

export type DieComponent = GameComponentBase & {
  type: "die";
  sides: number;
  faceLabels: string[];
};

export type CoinComponent = GameComponentBase & {
  type: "coin";
  headsLabel: string;
  tailsLabel: string;
};

export type MarkerComponent = GameComponentBase & {
  type: "marker";
  usage: string;
};

export type TokenComponent = GameComponentBase & {
  type: "token";
  stackable: boolean;
  valueLabel: string;
};

export type GameComponent =
  | CardComponent
  | DeckComponent
  | DieComponent
  | CoinComponent
  | MarkerComponent
  | TokenComponent;

export type CreateGameComponentInput = {
  type: ComponentType;
  name: string;
  quantity?: number;
  description?: string;
  tags?: string[];
  notes?: string;
  frontText?: string;
  backText?: string;
  defaultVisibility?: ComponentVisibility;
  cards?: DeckCardEntry[];
  shuffleOnSetup?: boolean;
  sides?: number;
  faceLabels?: string[];
  headsLabel?: string;
  tailsLabel?: string;
  usage?: string;
  stackable?: boolean;
  valueLabel?: string;
};

export type UpdateGameComponentInput = Partial<Omit<CreateGameComponentInput, "type">>;
