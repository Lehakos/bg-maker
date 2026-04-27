import { randomUUID } from "node:crypto";
import {
  cardIconIds,
  cardImageFits,
  cardLayoutSides,
  cardSizePresetDimensions,
  cardSizePresets,
  cardTextAlignments,
  cardVisualHorizontalAlignments,
  cardVisualVerticalAlignments,
  componentTypes,
  componentVisibilities,
  createDefaultCardLayout,
  getCardTemplateFields,
  getFirstCardSideText,
  getDefaultCardFieldValues,
  resolveCardLayout,
  type CardContentSource,
  type CardFieldValue,
  type CardFieldValues,
  type CardImageFieldValue,
  type CardImageFit,
  type CardLayout,
  type CardLayoutSide,
  type CardLayoutSize,
  type CardLayoutZone,
  type CardSideLayout,
  type CardTemplate,
  type CardTemplateFieldType,
  type CardTextAlignment,
  type CardIconId,
  type CardVisualHorizontalAlignment,
  type CardVisualVerticalAlignment,
  type CardZoneContent,
  type CreateGameComponentInput,
  type DeckCardEntry,
  type GameComponent,
  type UpdateGameComponentInput
} from "@bg-maker/shared";
import {
  getProjectCardTemplates,
  getProjectComponents,
  projects,
  setProjectCardTemplates,
  setProjectComponents
} from "./in-memory-store.js";
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
  templateId: string;
  fieldValues: CardFieldValues;
  layout: CardLayout;
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

  return ok(getProjectComponents(projectId).map((component) => resolveComponentForRead(component)));
}

export function createComponent(projectId: string, value: unknown): ServiceResult<GameComponent> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const input = parseCreateComponentInput(value, projectId);

  if (!input.ok) {
    return fail(400, input.error);
  }

  let componentInput = input.value;

  if (componentInput.type === "card") {
    const cardInput = componentInput as typeof componentInput & {
      layout: CardLayout;
      type: "card";
    };

    if (!cardInput.templateId) {
      const template = createFallbackCardTemplate(projectId, cardInput.name, cardInput.layout);
      cardInput.templateId = template.id;
    }

    componentInput = resolveCardInput(cardInput);
  }

  const timestamp = new Date().toISOString();
  const component: GameComponent = {
    id: randomUUID(),
    projectId,
    ...componentInput,
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

  const resolvedInput =
    currentComponent.type === "card" ? resolveCardUpdateInput(currentComponent, input.value) : input.value;

  const updatedComponent: GameComponent = {
    ...currentComponent,
    ...resolvedInput,
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

export function resolveComponentForRead(component: GameComponent): GameComponent {
  if (component.type !== "card") {
    return component;
  }

  return resolveStoredCard(component);
}

export function resolveStoredCard(
  component: Extract<GameComponent, { type: "card" }>
): Extract<GameComponent, { type: "card" }> {
  const template = getProjectCardTemplates(component.projectId).find(
    (item) => item.id === component.templateId
  );
  const layout = resolveCardLayout(template?.layout ?? component.layout, component.fieldValues);

  return {
    ...component,
    layout,
    frontText: getFirstCardSideText(layout.sides.front),
    backText: getFirstCardSideText(layout.sides.back)
  };
}

function createFallbackCardTemplate(projectId: string, cardName: string, layout: CardLayout) {
  const timestamp = new Date().toISOString();
  const template: CardTemplate = {
    id: randomUUID(),
    projectId,
    name: `${cardName} template`,
    layout,
    fields: getCardTemplateFields(layout),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  setProjectCardTemplates(projectId, [...getProjectCardTemplates(projectId), template]);

  return template;
}

function resolveCardInput<
  T extends CreateGameComponentInput & CommonComponentInput & { layout: CardLayout; type: "card" }
>(input: T): T {
  const layout = resolveCardLayout(input.layout ?? createDefaultCardLayout(), input.fieldValues);

  return {
    ...input,
    fieldValues: input.fieldValues ?? {},
    layout,
    frontText: getFirstCardSideText(layout.sides.front),
    backText: getFirstCardSideText(layout.sides.back)
  };
}

function resolveCardUpdateInput(
  currentComponent: Extract<GameComponent, { type: "card" }>,
  input: UpdateGameComponentInput
): UpdateGameComponentInput {
  const template = getProjectCardTemplates(currentComponent.projectId).find(
    (item) => item.id === (input.templateId ?? currentComponent.templateId)
  );
  const fieldValues = input.fieldValues ?? currentComponent.fieldValues;
  const layout = resolveCardLayout(input.layout ?? template?.layout ?? currentComponent.layout, fieldValues);

  return {
    ...input,
    fieldValues,
    layout,
    frontText: getFirstCardSideText(layout.sides.front),
    backText: getFirstCardSideText(layout.sides.back)
  };
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
      const card = parseCardFields(value, projectId);
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
      const card = parseCardFields(value, projectId, currentComponent);
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
  projectId: string,
  currentComponent?: Extract<GameComponent, { type: "card" }>
): ParseResult<CardFields> {
  const frontText = readOptionalString(value.frontText);
  const backText = readOptionalString(value.backText);
  const defaultVisibility = readOptionalVisibility(value.defaultVisibility);
  const layout = parseOptionalCardLayout(value.layout);
  const templateId = readOptionalString(value.templateId);

  if (!defaultVisibility.ok) {
    return defaultVisibility;
  }

  if (!layout.ok) {
    return layout;
  }

  const selectedTemplateId = templateId ?? currentComponent?.templateId;
  const template = selectedTemplateId
    ? getProjectCardTemplates(projectId).find((item) => item.id === selectedTemplateId)
    : undefined;

  if (selectedTemplateId && !template && value.layout === undefined) {
    return { ok: false, error: "Card template not found" };
  }

  const templateLayout =
    layout.value ??
    template?.layout ??
    (currentComponent?.templateId
      ? getProjectCardTemplates(projectId).find((item) => item.id === currentComponent.templateId)
          ?.layout
      : undefined) ??
    currentComponent?.layout ??
    createDefaultCardLayout({
      frontText: value.frontText === undefined ? currentComponent?.frontText : frontText,
      backText: value.backText === undefined ? currentComponent?.backText : backText
    });
  const fieldValues = parseOptionalCardFieldValues(value.fieldValues, templateLayout);

  if (!fieldValues.ok) {
    return fieldValues;
  }

  const resolvedFieldValues =
    fieldValues.value ?? currentComponent?.fieldValues ?? getDefaultCardFieldValues(templateLayout);
  const resolvedLayout = resolveCardLayout(templateLayout, resolvedFieldValues);

  return {
    ok: true,
    value: {
      frontText:
        layout.value !== undefined || fieldValues.value !== undefined || template !== undefined
          ? getFirstCardSideText(resolvedLayout.sides.front)
          : value.frontText === undefined
            ? (currentComponent?.frontText ?? "")
            : (frontText ?? ""),
      backText:
        layout.value !== undefined || fieldValues.value !== undefined || template !== undefined
          ? getFirstCardSideText(resolvedLayout.sides.back)
          : value.backText === undefined
            ? (currentComponent?.backText ?? "")
            : (backText ?? ""),
      defaultVisibility: defaultVisibility.value ?? currentComponent?.defaultVisibility ?? "visible",
      templateId: selectedTemplateId ?? currentComponent?.templateId ?? "",
      fieldValues: resolvedFieldValues,
      layout: resolvedLayout
    }
  };
}

const cardImageDataUrlMaxBytes = 1024 * 1024;
const maxCardLayoutZones = 16;
const cardSizeRange = { min: 20, max: 300 };

function parseOptionalCardFieldValues(
  value: unknown,
  layout: CardLayout
): ParseResult<CardFieldValues | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!isRecord(value)) {
    return { ok: false, error: "Card field values must be an object" };
  }

  const fields = getCardTemplateFields(layout);
  const values: CardFieldValues = {};

  for (const field of fields) {
    const fieldValue = value[field.key];

    if (fieldValue === undefined) {
      continue;
    }

    const parsedValue = parseCardFieldValue(field.type, fieldValue, field.label);

    if (!parsedValue.ok) {
      return parsedValue;
    }

    values[field.key] = parsedValue.value;
  }

  return { ok: true, value: { ...getDefaultCardFieldValues(layout), ...values } };
}

function parseCardFieldValue(
  type: CardTemplateFieldType,
  value: unknown,
  label: string
): ParseResult<CardFieldValue> {
  switch (type) {
    case "text": {
      const text = readRequiredString(value, `Card field ${label}`, {
        allowEmpty: true,
        trim: false
      });
      return text.ok ? { ok: true, value: text.value } : text;
    }

    case "number": {
      const number = readRequiredNumber(value, `Card field ${label}`);
      return number.ok ? { ok: true, value: number.value } : number;
    }

    case "icon": {
      const icon = readRequiredIconId(value);
      return icon.ok ? { ok: true, value: icon.value } : icon;
    }

    case "image":
      return parseCardImageFieldValue(value);
  }
}

function parseCardImageFieldValue(value: unknown): ParseResult<CardImageFieldValue> {
  if (!isRecord(value)) {
    return { ok: false, error: "Card image field value must be an object" };
  }

  const dataUrl = readOptionalImageDataUrl(value.dataUrl);
  const fileName = readRequiredString(value.fileName, "Card image field file name", {
    allowEmpty: true
  });
  const fit =
    value.fit === undefined
      ? ({ ok: true, value: undefined } as ParseResult<CardImageFit | undefined>)
      : readRequiredImageFit(value.fit);

  if (!dataUrl.ok) {
    return dataUrl;
  }

  if (!fileName.ok) {
    return fileName;
  }

  if (!fit.ok) {
    return fit;
  }

  return {
    ok: true,
    value: {
      dataUrl: dataUrl.value,
      fileName: fileName.value,
      fit: fit.value
    }
  };
}

export function parseOptionalCardLayout(value: unknown): ParseResult<CardLayout | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  return parseCardLayout(value);
}

export function parseCardLayout(value: unknown): ParseResult<CardLayout> {
  if (!isRecord(value)) {
    return { ok: false, error: "Card layout must be an object" };
  }

  if (value.version !== 1) {
    return { ok: false, error: "Card layout version is invalid" };
  }

  const size = parseCardLayoutSize(value.size);

  if (!size.ok) {
    return size;
  }

  if (!isRecord(value.sides)) {
    return { ok: false, error: "Card layout sides must be an object" };
  }

  const sides = {} as Record<CardLayoutSide, CardSideLayout>;

  for (const side of cardLayoutSides) {
    const parsedSide = parseCardSideLayout(value.sides[side]);

    if (!parsedSide.ok) {
      return parsedSide;
    }

    sides[side] = parsedSide.value;
  }

  return {
    ok: true,
    value: {
      version: 1,
      size: size.value,
      sides
    }
  };
}

function parseCardLayoutSize(value: unknown): ParseResult<CardLayoutSize> {
  if (!isRecord(value)) {
    return { ok: false, error: "Card size must be an object" };
  }

  if (!isCardSizePreset(value.preset)) {
    return { ok: false, error: "Card size preset is invalid" };
  }

  if (value.preset !== "custom") {
    return {
      ok: true,
      value: {
        preset: value.preset,
        ...cardSizePresetDimensions[value.preset]
      }
    };
  }

  const width = readRequiredNumber(value.widthMm, "Card width", cardSizeRange);
  const height = readRequiredNumber(value.heightMm, "Card height", cardSizeRange);

  if (!width.ok) {
    return width;
  }

  if (!height.ok) {
    return height;
  }

  return {
    ok: true,
    value: {
      preset: "custom",
      widthMm: width.value,
      heightMm: height.value
    }
  };
}

function parseCardSideLayout(value: unknown): ParseResult<CardSideLayout> {
  if (!isRecord(value)) {
    return { ok: false, error: "Card side layout must be an object" };
  }

  const zones = parseCardZones(value.zones);

  if (!zones.ok) {
    return zones;
  }

  return {
    ok: true,
    value: {
      zones: zones.value
    }
  };
}

function parseCardZones(value: unknown): ParseResult<CardLayoutZone[]> {
  if (!Array.isArray(value)) {
    return { ok: false, error: "Card layout zones must be an array" };
  }

  if (value.length === 0) {
    return { ok: false, error: "Card layout must include at least one zone per side" };
  }

  if (value.length > maxCardLayoutZones) {
    return { ok: false, error: `Card layout can include at most ${maxCardLayoutZones} zones` };
  }

  const zones: CardLayoutZone[] = [];
  const zoneIds = new Set<string>();

  for (const item of value) {
    if (!isRecord(item)) {
      return { ok: false, error: "Card layout zones must be objects" };
    }

    const id = readRequiredString(item.id, "Card zone id");
    const name = readRequiredString(item.name, "Card zone name");
    const x = readRequiredNumber(item.x, "Card zone x", { min: 0, max: 100 });
    const y = readRequiredNumber(item.y, "Card zone y", { min: 0, max: 100 });
    const width = readRequiredNumber(item.width, "Card zone width", { min: 1, max: 100 });
    const height = readRequiredNumber(item.height, "Card zone height", { min: 1, max: 100 });
    const content = parseCardZoneContent(item.content);

    if (!id.ok) {
      return id;
    }

    if (!name.ok) {
      return name;
    }

    if (!x.ok) {
      return x;
    }

    if (!y.ok) {
      return y;
    }

    if (!width.ok) {
      return width;
    }

    if (!height.ok) {
      return height;
    }

    if (!content.ok) {
      return content;
    }

    if (zoneIds.has(id.value)) {
      return { ok: false, error: "Card layout zone ids must be unique" };
    }

    if (x.value + width.value > 100 || y.value + height.value > 100) {
      return { ok: false, error: "Card zone must stay within card bounds" };
    }

    zoneIds.add(id.value);
    zones.push({
      id: id.value,
      name: name.value,
      x: x.value,
      y: y.value,
      width: width.value,
      height: height.value,
      content: content.value
    });
  }

  return { ok: true, value: zones };
}

function parseCardZoneContent(value: unknown): ParseResult<CardZoneContent> {
  if (!isRecord(value)) {
    return { ok: false, error: "Card zone content must be an object" };
  }

  const source = parseOptionalCardContentSource(value.source);

  if (!source.ok) {
    return source;
  }

  switch (value.type) {
    case "text": {
      const text = readRequiredString(value.text, "Card text", { allowEmpty: true, trim: false });
      const fontSize = readRequiredInteger(value.fontSize, "Card text font size", {
        min: 8,
        max: 72
      });
      const bold = readRequiredBoolean(value.bold, "Card text bold");
      const align = readRequiredTextAlignment(value.align);
      const color = readRequiredHexColor(value.color, "Card text color");

      if (!text.ok) {
        return text;
      }

      if (!fontSize.ok) {
        return fontSize;
      }

      if (!bold.ok) {
        return bold;
      }

      if (!align.ok) {
        return align;
      }

      if (!color.ok) {
        return color;
      }

      return {
        ok: true,
        value: {
          type: "text",
          source: source.value ?? { mode: "static" },
          text: text.value,
          fontSize: fontSize.value,
          bold: bold.value,
          align: align.value,
          color: color.value
        }
      };
    }

    case "visual": {
      if (value.visualType !== "image" && value.visualType !== "icon") {
        return { ok: false, error: "Card visual type is invalid" };
      }

      const dataUrl = readOptionalImageDataUrl(value.dataUrl);
      const fileName = readRequiredString(value.fileName, "Card image file name", {
        allowEmpty: true
      });
      const fit = readRequiredImageFit(value.fit);
      const iconId = readRequiredIconId(value.iconId);
      const size = readRequiredInteger(value.size, "Card icon size", { min: 8, max: 96 });
      const color = readRequiredHexColor(value.color, "Card icon color");
      const horizontalAlign = readRequiredVisualHorizontalAlignment(value.horizontalAlign);
      const verticalAlign = readRequiredVisualVerticalAlignment(value.verticalAlign);

      if (!dataUrl.ok) {
        return dataUrl;
      }

      if (!fileName.ok) {
        return fileName;
      }

      if (!fit.ok) {
        return fit;
      }

      if (!iconId.ok) {
        return iconId;
      }

      if (!size.ok) {
        return size;
      }

      if (!color.ok) {
        return color;
      }

      if (!horizontalAlign.ok) {
        return horizontalAlign;
      }

      if (!verticalAlign.ok) {
        return verticalAlign;
      }

      return {
        ok: true,
        value: {
          type: "visual",
          source: source.value ?? { mode: "static" },
          visualType: value.visualType,
          dataUrl: dataUrl.value,
          fileName: fileName.value,
          fit: fit.value,
          iconId: iconId.value,
          size: size.value,
          color: color.value,
          horizontalAlign: horizontalAlign.value,
          verticalAlign: verticalAlign.value
        }
      };
    }

    default:
      return { ok: false, error: "Card zone content type is invalid" };
  }
}

function parseOptionalCardContentSource(value: unknown): ParseResult<CardContentSource | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!isRecord(value)) {
    return { ok: false, error: "Card content source must be an object" };
  }

  if (value.mode === "static") {
    return { ok: true, value: { mode: "static" } };
  }

  if (value.mode !== "field") {
    return { ok: false, error: "Card content source mode is invalid" };
  }

  const fieldKey = readRequiredString(value.fieldKey, "Card content field key");

  if (!fieldKey.ok) {
    return fieldKey;
  }

  if (!/^[a-z][a-z0-9_]*$/i.test(fieldKey.value)) {
    return {
      ok: false,
      error: "Card content field key must contain only letters, numbers, and underscores"
    };
  }

  return { ok: true, value: { mode: "field", fieldKey: fieldKey.value } };
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

function readRequiredString(
  value: unknown,
  label: string,
  options: { allowEmpty?: boolean; trim?: boolean } = {}
): ParseResult<string> {
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be a string` };
  }

  const resolvedValue = options.trim === false ? value : value.trim();

  if (!options.allowEmpty && resolvedValue.length === 0) {
    return { ok: false, error: `${label} must not be empty` };
  }

  return { ok: true, value: resolvedValue };
}

function readRequiredNumber(
  value: unknown,
  label: string,
  range: { min?: number; max?: number } = {}
): ParseResult<number> {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, error: `${label} must be a number` };
  }

  if (range.min !== undefined && value < range.min) {
    return { ok: false, error: `${label} must be at least ${range.min}` };
  }

  if (range.max !== undefined && value > range.max) {
    return { ok: false, error: `${label} must be at most ${range.max}` };
  }

  return { ok: true, value };
}

function readRequiredInteger(
  value: unknown,
  label: string,
  range: { min?: number; max?: number } = {}
): ParseResult<number> {
  const number = readRequiredNumber(value, label, range);

  if (!number.ok) {
    return number;
  }

  if (!Number.isInteger(number.value)) {
    return { ok: false, error: `${label} must be an integer` };
  }

  return number;
}

function readRequiredBoolean(value: unknown, label: string): ParseResult<boolean> {
  if (typeof value !== "boolean") {
    return { ok: false, error: `${label} must be a boolean` };
  }

  return { ok: true, value };
}

function readRequiredTextAlignment(value: unknown): ParseResult<CardTextAlignment> {
  if (!cardTextAlignments.includes(value as CardTextAlignment)) {
    return { ok: false, error: "Card text alignment is invalid" };
  }

  return { ok: true, value: value as CardTextAlignment };
}

function readRequiredImageFit(value: unknown): ParseResult<CardImageFit> {
  if (!cardImageFits.includes(value as CardImageFit)) {
    return { ok: false, error: "Card image fit is invalid" };
  }

  return { ok: true, value: value as CardImageFit };
}

function readRequiredVisualHorizontalAlignment(
  value: unknown
): ParseResult<CardVisualHorizontalAlignment> {
  if (!cardVisualHorizontalAlignments.includes(value as CardVisualHorizontalAlignment)) {
    return { ok: false, error: "Card visual horizontal position is invalid" };
  }

  return { ok: true, value: value as CardVisualHorizontalAlignment };
}

function readRequiredVisualVerticalAlignment(
  value: unknown
): ParseResult<CardVisualVerticalAlignment> {
  if (!cardVisualVerticalAlignments.includes(value as CardVisualVerticalAlignment)) {
    return { ok: false, error: "Card visual vertical position is invalid" };
  }

  return { ok: true, value: value as CardVisualVerticalAlignment };
}

function readRequiredIconId(value: unknown): ParseResult<CardIconId> {
  if (!cardIconIds.includes(value as CardIconId)) {
    return { ok: false, error: "Card icon id is invalid" };
  }

  return { ok: true, value: value as CardIconId };
}

function readRequiredHexColor(value: unknown, label: string): ParseResult<string> {
  const color = readRequiredString(value, label);

  if (!color.ok) {
    return color;
  }

  if (!/^#[\da-f]{3}([\da-f]{3})?$/i.test(color.value)) {
    return { ok: false, error: `${label} must be a hex color` };
  }

  return color;
}

function readOptionalImageDataUrl(value: unknown): ParseResult<string> {
  const dataUrl = readRequiredString(value, "Card image data URL", { allowEmpty: true });

  if (!dataUrl.ok) {
    return dataUrl;
  }

  if (dataUrl.value.length === 0) {
    return { ok: true, value: "" };
  }

  const match = /^data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);base64,([a-z\d+/=]+)$/i.exec(
    dataUrl.value
  );

  if (!match) {
    return { ok: false, error: "Card image data URL must be a base64 image data URL" };
  }

  if (Buffer.byteLength(match[1], "base64") > cardImageDataUrlMaxBytes) {
    return { ok: false, error: "Card image data URL must be 1 MB or smaller" };
  }

  return dataUrl;
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

function isCardSizePreset(value: unknown): value is CardLayoutSize["preset"] {
  return cardSizePresets.includes(value as CardLayoutSize["preset"]);
}
