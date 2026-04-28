export const componentTypes = ["card", "deck", "die", "coin", "marker", "token"] as const;

export type ComponentType = (typeof componentTypes)[number];

export const componentVisibilities = ["visible", "hidden"] as const;

export type ComponentVisibility = (typeof componentVisibilities)[number];

export const cardSizePresets = ["poker", "mini", "tarot", "square", "custom"] as const;

export type CardSizePreset = (typeof cardSizePresets)[number];

export const cardLayoutSides = ["front", "back"] as const;

export type CardLayoutSide = (typeof cardLayoutSides)[number];

export const cardTextAlignments = ["left", "center", "right"] as const;

export type CardTextAlignment = (typeof cardTextAlignments)[number];

export const cardImageFits = ["contain", "cover"] as const;

export type CardImageFit = (typeof cardImageFits)[number];

export const cardVisualHorizontalAlignments = ["left", "center", "right"] as const;

export type CardVisualHorizontalAlignment = (typeof cardVisualHorizontalAlignments)[number];

export const cardVisualVerticalAlignments = ["top", "center", "bottom"] as const;

export type CardVisualVerticalAlignment = (typeof cardVisualVerticalAlignments)[number];

export const cardIconIds = [
  "sword",
  "shield",
  "heart",
  "star",
  "zap",
  "coins",
  "skull",
  "sparkles"
] as const;

export type CardIconId = (typeof cardIconIds)[number];

export type CardLayoutSize = {
  preset: CardSizePreset;
  widthMm: number;
  heightMm: number;
};

export type CardLayoutPadding = {
  topMm: number;
  rightMm: number;
  bottomMm: number;
  leftMm: number;
};

export type CardContentSource =
  | {
      mode: "static";
    }
  | {
      fieldKey: string;
      mode: "field";
    };

export type CardTextZoneContent = {
  type: "text";
  source?: CardContentSource;
  text: string;
  fontSize: number;
  bold: boolean;
  align: CardTextAlignment;
  color: string;
};

export type CardVisualZoneContent = {
  type: "visual";
  source?: CardContentSource;
  visualType: "image" | "icon";
  dataUrl: string;
  fileName: string;
  fit: CardImageFit;
  iconId: CardIconId;
  size: number;
  color: string;
  horizontalAlign: CardVisualHorizontalAlignment;
  verticalAlign: CardVisualVerticalAlignment;
};

export type CardZoneContent = CardTextZoneContent | CardVisualZoneContent;

export type CardLayoutZone = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: CardZoneContent;
};

export type CardSideLayout = {
  paddingMm: CardLayoutPadding;
  zones: CardLayoutZone[];
};

export type CardLayout = {
  version: 1;
  size: CardLayoutSize;
  sides: Record<CardLayoutSide, CardSideLayout>;
};

export const cardTemplateFieldTypes = ["text", "image", "icon", "number"] as const;

export type CardTemplateFieldType = (typeof cardTemplateFieldTypes)[number];

export type CardImageFieldValue = {
  dataUrl: string;
  fileName: string;
  fit?: CardImageFit;
};

export type CardFieldValue = string | number | CardIconId | CardImageFieldValue;

export type CardFieldValues = Record<string, CardFieldValue>;

export type CardTemplateField = {
  key: string;
  label: string;
  type: CardTemplateFieldType;
};

export type CardTemplate = {
  id: string;
  projectId: string;
  name: string;
  layout: CardLayout;
  fields: CardTemplateField[];
  createdAt: string;
  updatedAt: string;
};

export type CreateCardTemplateInput = {
  name: string;
  layout: CardLayout;
};

export type UpdateCardTemplateInput = Partial<CreateCardTemplateInput>;

export const cardSizePresetDimensions: Record<
  Exclude<CardSizePreset, "custom">,
  { widthMm: number; heightMm: number }
> = {
  poker: { widthMm: 63, heightMm: 88 },
  mini: { widthMm: 44, heightMm: 68 },
  tarot: { widthMm: 70, heightMm: 121 },
  square: { widthMm: 70, heightMm: 70 }
};

export const defaultCardSize: CardLayoutSize = {
  preset: "poker",
  ...cardSizePresetDimensions.poker
};

export const defaultCardPaddingMm: CardLayoutPadding = {
  topMm: 4,
  rightMm: 4,
  bottomMm: 4,
  leftMm: 4
};

export const noCardPaddingMm: CardLayoutPadding = {
  topMm: 0,
  rightMm: 0,
  bottomMm: 0,
  leftMm: 0
};

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
  templateId: string;
  fieldValues: CardFieldValues;
  layout: CardLayout;
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
  templateId?: string;
  fieldValues?: CardFieldValues;
  layout?: CardLayout;
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

export function createDefaultCardLayout(input: {
  backText?: string;
  frontText?: string;
  size?: CardLayoutSize;
} = {}): CardLayout {
  return {
    version: 1,
    size: input.size ?? defaultCardSize,
    sides: {
      front: createDefaultCardSide("front", input.frontText),
      back: createDefaultCardSide("back", input.backText)
    }
  };
}

export function getFirstCardSideText(side: CardSideLayout) {
  const textZone = side.zones.find(
    (zone) => zone.content.type === "text" && zone.content.text.trim().length > 0
  );

  return textZone?.content.type === "text" ? textZone.content.text.trim() : "";
}

function createDefaultCardSide(side: CardLayoutSide, text = ""): CardSideLayout {
  const trimmedText = text.trim();

  if (side === "back" && trimmedText.length === 0) {
    return {
      paddingMm: { ...noCardPaddingMm },
      zones: [
        {
          ...createVisualZone(`${side}-art`, "Art", 0, 0, 100, 100),
          content: createImageContent()
        }
      ]
    };
  }

  return {
    paddingMm: { ...defaultCardPaddingMm },
    zones: [
      { ...createTextZone(`${side}-title`, "Title", 0, 0, 100, 12), content: createTextContent("") },
      {
        ...createVisualZone(`${side}-art`, "Art", 0, 16, 100, 40),
        content: createImageContent()
      },
      {
        ...createTextZone(`${side}-body`, "Body", 0, 60, 100, 30),
        content: createTextContent(trimmedText)
      },
      { ...createTextZone(`${side}-footer`, "Footer", 0, 94, 100, 6), content: createTextContent("") }
    ]
  };
}

export function getCardTemplateFields(layout: CardLayout): CardTemplateField[] {
  const fields = new Map<string, CardTemplateField>();

  for (const side of cardLayoutSides) {
    for (const zone of layout.sides[side].zones) {
      if (zone.content.source?.mode !== "field") {
        continue;
      }

      const key = zone.content.source.fieldKey.trim();

      if (!key || fields.has(key)) {
        continue;
      }

      fields.set(key, {
        key,
        label: titleCase(key),
        type: getFieldTypeForContent(zone.content)
      });
    }
  }

  return Array.from(fields.values());
}

export function getDefaultCardFieldValues(layout: CardLayout): CardFieldValues {
  const values: CardFieldValues = {};

  for (const side of cardLayoutSides) {
    for (const zone of layout.sides[side].zones) {
      if (zone.content.source?.mode !== "field") {
        continue;
      }

      const key = zone.content.source.fieldKey.trim();

      if (!key || values[key] !== undefined) {
        continue;
      }

      switch (zone.content.type) {
        case "text":
          values[key] = zone.content.text;
          break;

        case "visual":
          if (zone.content.visualType === "icon") {
            values[key] = zone.content.iconId;
            break;
          }

          values[key] = {
            dataUrl: zone.content.dataUrl,
            fileName: zone.content.fileName,
            fit: zone.content.fit
          };
          break;
      }
    }
  }

  return values;
}

export function resolveCardLayout(layout: CardLayout, fieldValues: CardFieldValues = {}): CardLayout {
  return {
    ...layout,
    size: { ...layout.size },
    sides: {
      front: resolveCardSideLayout(layout.sides.front, fieldValues),
      back: resolveCardSideLayout(layout.sides.back, fieldValues)
    }
  };
}

function resolveCardSideLayout(side: CardSideLayout, fieldValues: CardFieldValues): CardSideLayout {
  return {
    paddingMm: { ...side.paddingMm },
    zones: side.zones.map((zone) => ({
      ...zone,
      content: resolveCardZoneContent(zone.content, fieldValues)
    }))
  };
}

function resolveCardZoneContent(
  content: CardZoneContent,
  fieldValues: CardFieldValues
): CardZoneContent {
  if (content.source?.mode !== "field") {
    return { ...content, source: content.source ? { ...content.source } : { mode: "static" } };
  }

  const value = fieldValues[content.source.fieldKey];

  if (content.type === "text") {
    return {
      ...content,
      source: { ...content.source },
      text: typeof value === "number" || typeof value === "string" ? String(value) : content.text
    };
  }

  if (content.visualType === "image") {
    return isCardImageFieldValue(value)
      ? {
          ...content,
          source: { ...content.source },
          dataUrl: value.dataUrl,
          fileName: value.fileName,
          fit: value.fit ?? content.fit
        }
      : { ...content, source: { ...content.source } };
  }

  return typeof value === "string" && cardIconIds.includes(value as CardIconId)
    ? { ...content, source: { ...content.source }, iconId: value as CardIconId }
    : { ...content, source: { ...content.source } };
}

function getFieldTypeForContent(content: CardZoneContent): CardTemplateFieldType {
  switch (content.type) {
    case "text":
      return "text";

    case "visual":
      return content.visualType === "icon" ? "icon" : "image";
  }
}

function createTextZone(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number
): Omit<CardLayoutZone, "content"> {
  return { id, name, x, y, width, height };
}

function createVisualZone(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number
): Omit<CardLayoutZone, "content"> {
  return { id, name, x, y, width, height };
}

function createTextContent(text: string): CardTextZoneContent {
  return {
    type: "text",
    source: { mode: "static" },
    text,
    fontSize: 14,
    bold: false,
    align: "center",
    color: "#1f2937"
  };
}

function createImageContent(): CardVisualZoneContent {
  return {
    type: "visual",
    source: { mode: "static" },
    visualType: "image",
    dataUrl: "",
    fileName: "",
    fit: "contain",
    iconId: "sword",
    size: 28,
    color: "#0f766e",
    horizontalAlign: "center",
    verticalAlign: "center"
  };
}

function isCardImageFieldValue(value: unknown): value is CardImageFieldValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "dataUrl" in value &&
    "fileName" in value &&
    typeof (value as CardImageFieldValue).dataUrl === "string" &&
    typeof (value as CardImageFieldValue).fileName === "string"
  );
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
