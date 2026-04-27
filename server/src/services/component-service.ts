import { randomUUID } from "node:crypto";
import {
  componentTypes,
  componentVisibilities,
  type CreateGameComponentInput,
  type DeckCardEntry,
  type GameComponent,
  type UpdateGameComponentInput
} from "@bg-maker/shared";
import { getProjectComponents, projects, setProjectComponents } from "./in-memory-store.js";
import { touchProject } from "./project-service.js";
import { fail, ok, type ServiceResult } from "./service-result.js";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

type CommonComponentInput = {
  name: string;
  quantity: number;
  description: string;
  tags: string[];
  notes: string;
};

type CommonComponentFields = Partial<CommonComponentInput>;

type CardFields = {
  frontText: string;
  backText: string;
  defaultVisibility: NonNullable<CreateGameComponentInput["defaultVisibility"]>;
};

type DeckFields = {
  cards: DeckCardEntry[];
  shuffleOnSetup: boolean;
  defaultVisibility: NonNullable<CreateGameComponentInput["defaultVisibility"]>;
};

type DieFields = {
  sides: number;
  faceLabels: string[];
};

type CoinFields = {
  headsLabel: string;
  tailsLabel: string;
};

type MarkerFields = {
  usage: string;
};

type TokenFields = {
  stackable: boolean;
  valueLabel: string;
};

export function listComponents(projectId: string): ServiceResult<GameComponent[]> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  return ok(getProjectComponents(projectId));
}

export function createComponent(projectId: string, value: unknown): ServiceResult<GameComponent> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const input = parseCreateComponentInput(value, projectId);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const timestamp = new Date().toISOString();
  const component: GameComponent = {
    id: randomUUID(),
    projectId,
    ...input.value,
    createdAt: timestamp,
    updatedAt: timestamp
  } as GameComponent;

  setProjectComponents(projectId, [...getProjectComponents(projectId), component]);
  touchProject(projectId);

  return ok(component);
}

export function updateComponent(
  projectId: string,
  componentId: string,
  value: unknown
): ServiceResult<GameComponent> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const components = getProjectComponents(projectId);
  const currentComponent = components.find((component) => component.id === componentId);

  if (!currentComponent) {
    return fail(404, "Component not found");
  }

  const input = parseUpdateComponentInput(value, currentComponent, projectId);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const updatedComponent: GameComponent = {
    ...currentComponent,
    ...input.value,
    updatedAt: new Date().toISOString()
  } as GameComponent;

  setProjectComponents(
    projectId,
    components.map((component) =>
      component.id === updatedComponent.id ? updatedComponent : component
    )
  );
  touchProject(projectId);

  return ok(updatedComponent);
}

export function deleteComponent(projectId: string, componentId: string): ServiceResult<undefined> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const components = getProjectComponents(projectId);
  const component = components.find((item) => item.id === componentId);

  if (!component) {
    return fail(404, "Component not found");
  }

  if (
    component.type === "card" &&
    components.some(
      (item) => item.type === "deck" && item.cards.some((entry) => entry.cardId === component.id)
    )
  ) {
    return fail(400, "Card is used by a deck");
  }

  setProjectComponents(
    projectId,
    components.filter((item) => item.id !== component.id)
  );
  touchProject(projectId);

  return ok(undefined);
}

function parseCreateComponentInput(
  value: unknown,
  projectId: string
): ParseResult<CreateGameComponentInput & CommonComponentInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  if (!isComponentType(value.type)) {
    return { ok: false, error: "Component type is invalid" };
  }

  const common = parseCommonComponentFields(value);

  if (!common.ok) {
    return common;
  }

  if (!common.value.name) {
    return { ok: false, error: "Component name must not be empty" };
  }

  const base: CommonComponentInput = {
    name: common.value.name,
    quantity: common.value.quantity ?? 1,
    description: common.value.description ?? "",
    tags: common.value.tags ?? [],
    notes: common.value.notes ?? ""
  };

  switch (value.type) {
    case "card": {
      const card = parseCardFields(value);
      return card.ok ? { ok: true, value: { ...base, type: "card", ...card.value } } : card;
    }

    case "deck": {
      const deck = parseDeckFields(value, projectId);
      return deck.ok ? { ok: true, value: { ...base, type: "deck", ...deck.value } } : deck;
    }

    case "die": {
      const die = parseDieFields(value);
      return die.ok ? { ok: true, value: { ...base, type: "die", ...die.value } } : die;
    }

    case "coin": {
      const coin = parseCoinFields(value);
      return coin.ok ? { ok: true, value: { ...base, type: "coin", ...coin.value } } : coin;
    }

    case "marker": {
      const marker = parseMarkerFields(value);
      return marker.ok ? { ok: true, value: { ...base, type: "marker", ...marker.value } } : marker;
    }

    case "token": {
      const token = parseTokenFields(value);
      return token.ok ? { ok: true, value: { ...base, type: "token", ...token.value } } : token;
    }
  }
}

function parseUpdateComponentInput(
  value: unknown,
  currentComponent: GameComponent,
  projectId: string
): ParseResult<UpdateGameComponentInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  if (value.type !== undefined) {
    return { ok: false, error: "Component type cannot be changed" };
  }

  const common = parseCommonComponentFields(value);

  if (!common.ok) {
    return common;
  }

  const input: UpdateGameComponentInput = {};

  if (common.value.name !== undefined) {
    input.name = common.value.name;
  }

  if (common.value.quantity !== undefined) {
    input.quantity = common.value.quantity;
  }

  if (common.value.description !== undefined) {
    input.description = common.value.description;
  }

  if (common.value.tags !== undefined) {
    input.tags = common.value.tags;
  }

  if (common.value.notes !== undefined) {
    input.notes = common.value.notes;
  }

  switch (currentComponent.type) {
    case "card": {
      const card = parseCardFields(value, currentComponent);
      return card.ok ? { ok: true, value: { ...input, ...card.value } } : card;
    }

    case "deck": {
      const deck = parseDeckFields(value, projectId, currentComponent);
      return deck.ok ? { ok: true, value: { ...input, ...deck.value } } : deck;
    }

    case "die": {
      const die = parseDieFields(value, currentComponent);
      return die.ok ? { ok: true, value: { ...input, ...die.value } } : die;
    }

    case "coin": {
      const coin = parseCoinFields(value, currentComponent);
      return coin.ok ? { ok: true, value: { ...input, ...coin.value } } : coin;
    }

    case "marker": {
      const marker = parseMarkerFields(value, currentComponent);
      return marker.ok ? { ok: true, value: { ...input, ...marker.value } } : marker;
    }

    case "token": {
      const token = parseTokenFields(value, currentComponent);
      return token.ok ? { ok: true, value: { ...input, ...token.value } } : token;
    }
  }
}

function parseCommonComponentFields(
  value: Record<string, unknown>
): ParseResult<CommonComponentFields> {
  const name = readOptionalString(value.name);
  const description = readOptionalString(value.description);
  const notes = readOptionalString(value.notes);
  const quantity = readOptionalInteger(value.quantity, "Component quantity", { min: 1 });
  const tags = readOptionalStringArray(value.tags, "Component tags");

  if (value.name !== undefined && !name) {
    return { ok: false, error: "Component name must not be empty" };
  }

  if (!quantity.ok) {
    return quantity;
  }

  if (!tags.ok) {
    return tags;
  }

  return {
    ok: true,
    value: {
      name,
      description,
      notes,
      quantity: quantity.value,
      tags: tags.value
    }
  };
}

function parseCardFields(
  value: Record<string, unknown>,
  currentComponent?: Extract<GameComponent, { type: "card" }>
): ParseResult<CardFields> {
  const frontText = readOptionalString(value.frontText);
  const backText = readOptionalString(value.backText);
  const defaultVisibility = readOptionalVisibility(value.defaultVisibility);

  if (!defaultVisibility.ok) {
    return defaultVisibility;
  }

  return {
    ok: true,
    value: {
      frontText:
        value.frontText === undefined ? (currentComponent?.frontText ?? "") : (frontText ?? ""),
      backText:
        value.backText === undefined ? (currentComponent?.backText ?? "") : (backText ?? ""),
      defaultVisibility: defaultVisibility.value ?? currentComponent?.defaultVisibility ?? "visible"
    }
  };
}

function parseDeckFields(
  value: Record<string, unknown>,
  projectId: string,
  currentComponent?: Extract<GameComponent, { type: "deck" }>
): ParseResult<DeckFields> {
  const cards = readOptionalDeckCards(value.cards, projectId);
  const shuffleOnSetup = readOptionalBoolean(value.shuffleOnSetup, "Shuffle on setup");
  const defaultVisibility = readOptionalVisibility(value.defaultVisibility);

  if (!cards.ok) {
    return cards;
  }

  if (!shuffleOnSetup.ok) {
    return shuffleOnSetup;
  }

  if (!defaultVisibility.ok) {
    return defaultVisibility;
  }

  return {
    ok: true,
    value: {
      cards: cards.value ?? currentComponent?.cards ?? [],
      shuffleOnSetup: shuffleOnSetup.value ?? currentComponent?.shuffleOnSetup ?? true,
      defaultVisibility: defaultVisibility.value ?? currentComponent?.defaultVisibility ?? "hidden"
    }
  };
}

function parseDieFields(
  value: Record<string, unknown>,
  currentComponent?: Extract<GameComponent, { type: "die" }>
): ParseResult<DieFields> {
  const sides = readOptionalInteger(value.sides, "Die sides", { min: 2, max: 100 });

  if (!sides.ok) {
    return sides;
  }

  const resolvedSides = sides.value ?? currentComponent?.sides ?? 6;
  const faceLabels = readOptionalStringArray(value.faceLabels, "Die face labels");

  if (!faceLabels.ok) {
    return faceLabels;
  }

  if (faceLabels.value !== undefined && faceLabels.value.length !== resolvedSides) {
    return { ok: false, error: "Die face labels must match side count" };
  }

  return {
    ok: true,
    value: {
      sides: resolvedSides,
      faceLabels:
        faceLabels.value ??
        (currentComponent?.sides === resolvedSides
          ? currentComponent.faceLabels
          : buildDefaultFaceLabels(resolvedSides))
    }
  };
}

function parseCoinFields(
  value: Record<string, unknown>,
  currentComponent?: Extract<GameComponent, { type: "coin" }>
): ParseResult<CoinFields> {
  const headsLabel = readOptionalString(value.headsLabel);
  const tailsLabel = readOptionalString(value.tailsLabel);

  return {
    ok: true,
    value: {
      headsLabel:
        value.headsLabel === undefined
          ? (currentComponent?.headsLabel ?? "Heads")
          : (headsLabel ?? ""),
      tailsLabel:
        value.tailsLabel === undefined
          ? (currentComponent?.tailsLabel ?? "Tails")
          : (tailsLabel ?? "")
    }
  };
}

function parseMarkerFields(
  value: Record<string, unknown>,
  currentComponent?: Extract<GameComponent, { type: "marker" }>
): ParseResult<MarkerFields> {
  const usage = readOptionalString(value.usage);

  return {
    ok: true,
    value: {
      usage: value.usage === undefined ? (currentComponent?.usage ?? "") : (usage ?? "")
    }
  };
}

function parseTokenFields(
  value: Record<string, unknown>,
  currentComponent?: Extract<GameComponent, { type: "token" }>
): ParseResult<TokenFields> {
  const stackable = readOptionalBoolean(value.stackable, "Token stackable");
  const valueLabel = readOptionalString(value.valueLabel);

  if (!stackable.ok) {
    return stackable;
  }

  return {
    ok: true,
    value: {
      stackable: stackable.value ?? currentComponent?.stackable ?? true,
      valueLabel:
        value.valueLabel === undefined ? (currentComponent?.valueLabel ?? "") : (valueLabel ?? "")
    }
  };
}

function readOptionalDeckCards(
  value: unknown,
  projectId: string
): ParseResult<DeckCardEntry[] | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "Deck cards must be an array" };
  }

  const entries: DeckCardEntry[] = [];
  const seenCardIds = new Set<string>();

  for (const item of value) {
    if (!isRecord(item)) {
      return { ok: false, error: "Deck card entries must be objects" };
    }

    const cardId = readOptionalString(item.cardId);

    if (!cardId) {
      return { ok: false, error: "Deck card id must not be empty" };
    }

    if (seenCardIds.has(cardId)) {
      return { ok: false, error: "Deck cannot include the same card twice" };
    }

    const quantity = readOptionalInteger(item.quantity, "Deck card quantity", { min: 1 });

    if (!quantity.ok) {
      return quantity;
    }

    const card = getProjectComponents(projectId).find((component) => component.id === cardId);

    if (!card || card.type !== "card") {
      return { ok: false, error: "Deck cards must reference cards in the same project" };
    }

    seenCardIds.add(cardId);
    entries.push({ cardId, quantity: quantity.value ?? 1 });
  }

  return { ok: true, value: entries };
}

function readOptionalStringArray(value: unknown, label: string): ParseResult<string[] | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: `${label} must be an array` };
  }

  const strings: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      return { ok: false, error: `${label} must only contain strings` };
    }

    const trimmed = item.trim();

    if (trimmed.length > 0 && !strings.includes(trimmed)) {
      strings.push(trimmed);
    }
  }

  return { ok: true, value: strings };
}

function readOptionalInteger(
  value: unknown,
  label: string,
  range: { min?: number; max?: number } = {}
): ParseResult<number | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { ok: false, error: `${label} must be an integer` };
  }

  if (range.min !== undefined && value < range.min) {
    return { ok: false, error: `${label} must be at least ${range.min}` };
  }

  if (range.max !== undefined && value > range.max) {
    return { ok: false, error: `${label} must be at most ${range.max}` };
  }

  return { ok: true, value };
}

function readOptionalBoolean(value: unknown, label: string): ParseResult<boolean | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (typeof value !== "boolean") {
    return { ok: false, error: `${label} must be a boolean` };
  }

  return { ok: true, value };
}

function readOptionalVisibility(
  value: unknown
): ParseResult<CreateGameComponentInput["defaultVisibility"]> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!isComponentVisibility(value)) {
    return { ok: false, error: "Component visibility is invalid" };
  }

  return { ok: true, value };
}

function buildDefaultFaceLabels(sides: number) {
  return Array.from({ length: sides }, (_item, index) => String(index + 1));
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isComponentType(value: unknown): value is CreateGameComponentInput["type"] {
  return componentTypes.includes(value as CreateGameComponentInput["type"]);
}

function isComponentVisibility(
  value: unknown
): value is NonNullable<CreateGameComponentInput["defaultVisibility"]> {
  return componentVisibilities.includes(
    value as NonNullable<CreateGameComponentInput["defaultVisibility"]>
  );
}
