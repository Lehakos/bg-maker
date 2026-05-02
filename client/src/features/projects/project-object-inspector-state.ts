import type {
  ProjectObjectAppearance,
  ProjectObjectBorderStyle,
  ProjectObjectCard,
  ProjectObjectCardSizePresetValue,
  ProjectObjectContainer,
  ProjectObjectCounter,
  ProjectObjectCounterBoundsMode,
  ProjectObjectCounterDisplayMode,
  ProjectObjectDeck,
  ProjectObjectDie,
  ProjectObjectDieFace,
  ProjectObjectDieFaceMode,
  ProjectObjectImage,
  ProjectObjectImageFit,
  ProjectObjectLayout,
  ProjectObjectLayoutAlignment,
  ProjectObjectLayoutJustification,
  ProjectObjectLayoutMode,
  ProjectObjectRectTransform,
  ProjectObjectShape,
  ProjectObjectShapePoint,
  ProjectObjectShapeVariant,
  ProjectObjectStackDisplay,
  ProjectObjectText,
  ProjectObjectTextAlign,
  ProjectObjectTextFontStyle,
  ProjectObjectTextVerticalAlign,
  ProjectObjectZone
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectShapePolygonPoints,
  getDefaultProjectObjectDieFace,
  getDefaultProjectObjectStackDisplay,
  getDefaultProjectObjectZone,
  normalizeProjectObjectDieActiveFace,
  normalizeProjectObjectDieFaceCount,
  normalizeProjectObjectZoneCapacity,
  projectObjectCardCustomSizePresetId,
  projectObjectCardSizePresets,
  projectObjectCounterAffixMaxLength,
  projectObjectCounterBoundsModes,
  projectObjectCounterDisplayModes,
  projectObjectCounterStepLimits,
  projectObjectCounterValueLimits,
  projectObjectContainerEntryQuantityLimits,
  projectObjectDieFaceCountLimits,
  projectObjectDieFaceLabelMaxLength,
  projectObjectDieFaceModes,
  projectObjectShapePolygonCoordinateLimits,
  projectObjectShapePolygonPointCountLimits,
  projectObjectStackDisplayOffsetLimits,
  projectObjectStackDisplayVisibleItemCountLimits,
  projectObjectZoneCapacityLimits
} from "@bg-maker/shared";

export type RectTransformFieldKey = keyof ProjectObjectRectTransform;

export type RectTransformDraft = Record<RectTransformFieldKey, string>;

export type AppearanceFieldKey = keyof ProjectObjectAppearance;
export type AppearanceDraft = {
  backgroundColor: string;
  backgroundOpacity: string;
  borderColor: string;
  borderRadius: string;
  borderStyle: ProjectObjectBorderStyle;
  borderWidth: string;
  opacity: string;
  padding: string;
};

export type CardFieldKey = keyof ProjectObjectCard;
export type CardDraft = {
  sizePreset: ProjectObjectCardSizePresetValue;
};

export type CounterFieldKey = keyof ProjectObjectCounter;
export type CounterNumberFieldKey = Extract<
  CounterFieldKey,
  "defaultValue" | "maxValue" | "minValue" | "step"
>;
export type CounterDraft = {
  boundsMode: ProjectObjectCounterBoundsMode;
  defaultValue: string;
  displayMode: ProjectObjectCounterDisplayMode;
  maxValue: string;
  minValue: string;
  prefix: string;
  step: string;
  suffix: string;
};

export type DeckFieldKey = keyof ProjectObjectDeck;
export type DeckDraft = {
  sizePreset: ProjectObjectCardSizePresetValue;
};

export type ZoneFieldKey = keyof ProjectObjectZone;
export type ZoneNumberFieldKey = Extract<ZoneFieldKey, "capacity">;
export type ZoneDraft = {
  capacity: string;
  referenceObjectFileId: string;
};

export type StackDisplayFieldKey = keyof ProjectObjectStackDisplay;
export type StackDisplayNumberFieldKey = Extract<
  StackDisplayFieldKey,
  "stackOffsetX" | "stackOffsetY" | "visibleItemCount"
>;
export type StackDisplayDraft = {
  showCount: boolean;
  stackOffsetX: string;
  stackOffsetY: string;
  visibleItemCount: string;
};

export type DieFieldKey = "activeFace" | "faceCount";
export type DieFaceFieldKey = keyof ProjectObjectDieFace;
export type DieDraft = {
  activeFace: string;
  faceCount: string;
};

export type TextFieldKey = keyof ProjectObjectText;
export type TextDraft = {
  color: string;
  content: string;
  fontSize: string;
  fontStyle: ProjectObjectTextFontStyle;
  fontWeight: string;
  lineHeight: string;
  textAlign: ProjectObjectTextAlign;
  verticalAlign: ProjectObjectTextVerticalAlign;
};

export type ImageFieldKey = keyof ProjectObjectImage;
export type ImageDraft = {
  assetId: string;
  fit: ProjectObjectImageFit;
  positionX: string;
  positionY: string;
};

export type ShapePolygonPointFieldKey = keyof ProjectObjectShapePoint;
export type ShapePolygonPointDraft = Record<ShapePolygonPointFieldKey, string>;

export type LayoutFieldKey = keyof ProjectObjectLayout;
export type LayoutDraft = {
  alignItems: ProjectObjectLayoutAlignment;
  columns: string;
  gap: string;
  justifyContent: ProjectObjectLayoutJustification;
  mode: ProjectObjectLayoutMode;
};

export const rectTransformFieldSettings: Record<
  RectTransformFieldKey,
  { decimals: number; max: number; min: number; step: number }
> = {
  height: { decimals: 0, max: 10000, min: 1, step: 1 },
  pivotX: { decimals: 3, max: 1, min: 0, step: 0.05 },
  pivotY: { decimals: 3, max: 1, min: 0, step: 0.05 },
  rotation: { decimals: 0, max: 3600, min: -3600, step: 1 },
  scaleX: { decimals: 3, max: 8, min: 0.1, step: 0.1 },
  scaleY: { decimals: 3, max: 8, min: 0.1, step: 0.1 },
  width: { decimals: 0, max: 10000, min: 1, step: 1 },
  x: { decimals: 0, max: 10000, min: -10000, step: 1 },
  y: { decimals: 0, max: 10000, min: -10000, step: 1 }
};

export const appearanceNumberFieldSettings = {
  backgroundOpacity: { decimals: 2, max: 1, min: 0, step: 0.05 },
  borderRadius: { decimals: 0, max: 1000, min: 0, step: 1 },
  borderWidth: { decimals: 0, max: 1000, min: 0, step: 1 },
  opacity: { decimals: 2, max: 1, min: 0, step: 0.05 },
  padding: { decimals: 0, max: 1000, min: 0, step: 1 }
} as const satisfies Record<
  Extract<
    AppearanceFieldKey,
    "backgroundOpacity" | "borderRadius" | "borderWidth" | "opacity" | "padding"
  >,
  { decimals: number; max: number; min: number; step: number }
>;

export const textNumberFieldSettings = {
  fontSize: { decimals: 0, max: 512, min: 1, step: 1 },
  fontWeight: { decimals: 0, max: 900, min: 100, step: 100 },
  lineHeight: { decimals: 2, max: 4, min: 0.5, step: 0.05 }
} as const satisfies Record<
  Extract<TextFieldKey, "fontSize" | "fontWeight" | "lineHeight">,
  { decimals: number; max: number; min: number; step: number }
>;

export const counterNumberFieldSettings = {
  defaultValue: {
    decimals: 0,
    max: projectObjectCounterValueLimits.max,
    min: projectObjectCounterValueLimits.min,
    step: 1
  },
  maxValue: {
    decimals: 0,
    max: projectObjectCounterValueLimits.max,
    min: projectObjectCounterValueLimits.min,
    step: 1
  },
  minValue: {
    decimals: 0,
    max: projectObjectCounterValueLimits.max,
    min: projectObjectCounterValueLimits.min,
    step: 1
  },
  step: {
    decimals: 0,
    max: projectObjectCounterStepLimits.max,
    min: projectObjectCounterStepLimits.min,
    step: 1
  }
} as const satisfies Record<
  CounterNumberFieldKey,
  { decimals: number; max: number; min: number; step: number }
>;

export const stackDisplayNumberFieldSettings = {
  stackOffsetX: {
    decimals: 0,
    max: projectObjectStackDisplayOffsetLimits.max,
    min: projectObjectStackDisplayOffsetLimits.min,
    step: 1
  },
  stackOffsetY: {
    decimals: 0,
    max: projectObjectStackDisplayOffsetLimits.max,
    min: projectObjectStackDisplayOffsetLimits.min,
    step: 1
  },
  visibleItemCount: {
    decimals: 0,
    max: projectObjectStackDisplayVisibleItemCountLimits.max,
    min: projectObjectStackDisplayVisibleItemCountLimits.min,
    step: 1
  }
} as const satisfies Record<
  StackDisplayNumberFieldKey,
  { decimals: number; max: number; min: number; step: number }
>;

export const zoneNumberFieldSettings = {
  capacity: {
    decimals: 0,
    max: projectObjectZoneCapacityLimits.max,
    min: projectObjectZoneCapacityLimits.min,
    step: 1
  }
} as const satisfies Record<
  ZoneNumberFieldKey,
  { decimals: number; max: number; min: number; step: number }
>;

export const dieNumberFieldSettings = {
  faceCount: {
    decimals: 0,
    max: projectObjectDieFaceCountLimits.max,
    min: projectObjectDieFaceCountLimits.min,
    step: 1
  }
} as const satisfies Record<
  Extract<DieFieldKey, "faceCount">,
  { decimals: number; max: number; min: number; step: number }
>;

export const imageNumberFieldSettings = {
  positionX: { decimals: 0, max: 100, min: 0, step: 1 },
  positionY: { decimals: 0, max: 100, min: 0, step: 1 }
} as const satisfies Record<
  Extract<ImageFieldKey, "positionX" | "positionY">,
  { decimals: number; max: number; min: number; step: number }
>;

export const layoutNumberFieldSettings = {
  columns: { decimals: 0, max: 24, min: 1, step: 1 },
  gap: { decimals: 0, max: 10000, min: 0, step: 1 }
} as const satisfies Record<
  Extract<LayoutFieldKey, "columns" | "gap">,
  { decimals: number; max: number; min: number; step: number }
>;

export const shapePolygonPointFieldSettings = {
  x: {
    decimals: 1,
    max: projectObjectShapePolygonCoordinateLimits.max,
    min: projectObjectShapePolygonCoordinateLimits.min,
    step: 1
  },
  y: {
    decimals: 1,
    max: projectObjectShapePolygonCoordinateLimits.max,
    min: projectObjectShapePolygonCoordinateLimits.min,
    step: 1
  }
} as const satisfies Record<
  ShapePolygonPointFieldKey,
  { decimals: number; max: number; min: number; step: number }
>;

const borderStyles = new Set<ProjectObjectBorderStyle>(["none", "solid", "dashed", "dotted"]);
const imageFits = new Set<ProjectObjectImageFit>(["contain", "cover", "fill", "scaleDown"]);
const cardSizePresetValues = new Set<ProjectObjectCardSizePresetValue>([
  projectObjectCardCustomSizePresetId,
  ...projectObjectCardSizePresets.map((preset) => preset.id)
]);
const counterBoundsModes = new Set<ProjectObjectCounterBoundsMode>(projectObjectCounterBoundsModes);
const counterDisplayModes = new Set<ProjectObjectCounterDisplayMode>(
  projectObjectCounterDisplayModes
);
const dieFaceModes = new Set<ProjectObjectDieFaceMode>(projectObjectDieFaceModes);
const layoutAlignments = new Set<ProjectObjectLayoutAlignment>(["center", "end", "start"]);
const layoutJustifications = new Set<ProjectObjectLayoutJustification>([
  "center",
  "end",
  "spaceBetween",
  "start"
]);
const layoutModes = new Set<ProjectObjectLayoutMode>(["free", "grid", "horizontal", "vertical"]);
const shapeVariants = new Set<ProjectObjectShapeVariant>([
  "diamond",
  "ellipse",
  "hexagon",
  "polygon",
  "rectangle",
  "triangle"
]);
const textAligns = new Set<ProjectObjectTextAlign>(["center", "left", "right"]);
const textFontStyles = new Set<ProjectObjectTextFontStyle>(["italic", "normal"]);
const textVerticalAligns = new Set<ProjectObjectTextVerticalAlign>(["bottom", "middle", "top"]);
const boldTextFontWeight = 700;
const normalTextFontWeight = 400;
const boldTextFontWeightThreshold = 600;

export function createRectTransformDraft(
  rectTransform: ProjectObjectRectTransform | null
): RectTransformDraft {
  const activeRectTransform = rectTransform ?? {
    height: 0,
    pivotX: 0,
    pivotY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    width: 0,
    x: 0,
    y: 0
  };

  return {
    height: formatRectTransformValue(activeRectTransform.height, "height"),
    pivotX: formatRectTransformValue(activeRectTransform.pivotX, "pivotX"),
    pivotY: formatRectTransformValue(activeRectTransform.pivotY, "pivotY"),
    rotation: formatRectTransformValue(activeRectTransform.rotation, "rotation"),
    scaleX: formatRectTransformValue(activeRectTransform.scaleX, "scaleX"),
    scaleY: formatRectTransformValue(activeRectTransform.scaleY, "scaleY"),
    width: formatRectTransformValue(activeRectTransform.width, "width"),
    x: formatRectTransformValue(activeRectTransform.x, "x"),
    y: formatRectTransformValue(activeRectTransform.y, "y")
  };
}

export function formatRectTransformValue(value: number, fieldKey: RectTransformFieldKey) {
  const { decimals } = rectTransformFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function parseRectTransformDraftValue(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function normalizeRectTransformValue(fieldKey: RectTransformFieldKey, value: number) {
  const { decimals, max, min } = rectTransformFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function getRectTransformWithDraftField(
  rectTransform: ProjectObjectRectTransform,
  fieldKey: RectTransformFieldKey,
  value: string
) {
  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  const nextRectTransform = {
    ...rectTransform,
    [fieldKey]: normalizeRectTransformValue(fieldKey, parsedValue)
  };

  return areRectTransformsEqual(rectTransform, nextRectTransform) ? null : nextRectTransform;
}

export function areRectTransformsEqual(
  left: ProjectObjectRectTransform,
  right: ProjectObjectRectTransform
) {
  return (
    left.height === right.height &&
    left.pivotX === right.pivotX &&
    left.pivotY === right.pivotY &&
    left.rotation === right.rotation &&
    left.scaleX === right.scaleX &&
    left.scaleY === right.scaleY &&
    left.width === right.width &&
    left.x === right.x &&
    left.y === right.y
  );
}

export function createAppearanceDraft(appearance: ProjectObjectAppearance): AppearanceDraft {
  return {
    backgroundColor: appearance.backgroundColor,
    backgroundOpacity: formatAppearanceNumberValue(
      appearance.backgroundOpacity,
      "backgroundOpacity"
    ),
    borderColor: appearance.borderColor,
    borderRadius: formatAppearanceNumberValue(appearance.borderRadius, "borderRadius"),
    borderStyle: appearance.borderStyle,
    borderWidth: formatAppearanceNumberValue(appearance.borderWidth, "borderWidth"),
    opacity: formatAppearanceNumberValue(appearance.opacity, "opacity"),
    padding: formatAppearanceNumberValue(appearance.padding, "padding")
  };
}

export function createCardDraft(card: ProjectObjectCard): CardDraft {
  return {
    sizePreset: card.sizePreset
  };
}

export function createCounterDraft(counter: ProjectObjectCounter): CounterDraft {
  return {
    boundsMode: counter.boundsMode,
    defaultValue: formatCounterNumberValue(counter.defaultValue, "defaultValue"),
    displayMode: counter.displayMode,
    maxValue: formatCounterNumberValue(counter.maxValue, "maxValue"),
    minValue: formatCounterNumberValue(counter.minValue, "minValue"),
    prefix: counter.prefix,
    step: formatCounterNumberValue(counter.step, "step"),
    suffix: counter.suffix
  };
}

export function createDeckDraft(deck: ProjectObjectDeck): DeckDraft {
  return {
    sizePreset: deck.sizePreset
  };
}

export function createZoneDraft(zone: ProjectObjectZone): ZoneDraft {
  return {
    capacity: formatZoneNumberValue(zone.capacity, "capacity"),
    referenceObjectFileId: zone.referenceObjectFileId
  };
}

export function createStackDisplayDraft(
  stackDisplay: ProjectObjectStackDisplay
): StackDisplayDraft {
  return {
    showCount: stackDisplay.showCount,
    stackOffsetX: formatStackDisplayNumberValue(stackDisplay.stackOffsetX, "stackOffsetX"),
    stackOffsetY: formatStackDisplayNumberValue(stackDisplay.stackOffsetY, "stackOffsetY"),
    visibleItemCount: formatStackDisplayNumberValue(
      stackDisplay.visibleItemCount,
      "visibleItemCount"
    )
  };
}

export function createDieDraft(die: ProjectObjectDie): DieDraft {
  return {
    activeFace: String(normalizeProjectObjectDieActiveFace(die.activeFace, die.faceCount)),
    faceCount: formatDieNumberValue(die.faceCount, "faceCount")
  };
}

export function createTextDraft(text: ProjectObjectText): TextDraft {
  return {
    color: text.color,
    content: text.content,
    fontSize: formatTextNumberValue(text.fontSize, "fontSize"),
    fontStyle: text.fontStyle,
    fontWeight: formatTextNumberValue(text.fontWeight, "fontWeight"),
    lineHeight: formatTextNumberValue(text.lineHeight, "lineHeight"),
    textAlign: text.textAlign,
    verticalAlign: text.verticalAlign
  };
}

export function createImageDraft(image: ProjectObjectImage): ImageDraft {
  return {
    assetId: image.assetId,
    fit: image.fit,
    positionX: formatImageNumberValue(image.positionX, "positionX"),
    positionY: formatImageNumberValue(image.positionY, "positionY")
  };
}

export function createLayoutDraft(layout: ProjectObjectLayout): LayoutDraft {
  return {
    alignItems: layout.alignItems,
    columns: formatLayoutNumberValue(layout.columns, "columns"),
    gap: formatLayoutNumberValue(layout.gap, "gap"),
    justifyContent: layout.justifyContent,
    mode: layout.mode
  };
}

export function getAppearanceWithDraftField(
  appearance: ProjectObjectAppearance,
  fieldKey: AppearanceFieldKey,
  value: string
) {
  const nextAppearance = createNextAppearance(appearance, fieldKey, value);

  if (!nextAppearance) {
    return null;
  }

  return areAppearancesEqual(appearance, nextAppearance) ? null : nextAppearance;
}

export function getCardWithDraftField(
  card: ProjectObjectCard,
  fieldKey: CardFieldKey,
  value: string
) {
  const nextCard = createNextCard(card, fieldKey, value);

  if (!nextCard) {
    return null;
  }

  return areCardsEqual(card, nextCard) ? null : nextCard;
}

export function getCounterWithDraftField(
  counter: ProjectObjectCounter,
  fieldKey: CounterFieldKey,
  value: string
) {
  const nextCounter = createNextCounter(counter, fieldKey, value);

  if (!nextCounter) {
    return null;
  }

  return areCountersEqual(counter, nextCounter) ? null : nextCounter;
}

export function getDeckWithDraftField(
  deck: ProjectObjectDeck,
  fieldKey: DeckFieldKey,
  value: string | boolean
) {
  const nextDeck = createNextDeck(deck, fieldKey, value);

  if (!nextDeck) {
    return null;
  }

  return areDecksEqual(deck, nextDeck) ? null : nextDeck;
}

export function getZoneWithDraftField(
  zone: ProjectObjectZone,
  fieldKey: ZoneFieldKey,
  value: string
) {
  const nextZone = createNextZone(zone, fieldKey, value);

  if (!nextZone) {
    return null;
  }

  return areZonesEqual(zone, nextZone) ? null : nextZone;
}

export function getStackDisplayWithDraftField(
  stackDisplay: ProjectObjectStackDisplay,
  fieldKey: StackDisplayFieldKey,
  value: string | boolean
) {
  const nextStackDisplay = createNextStackDisplay(stackDisplay, fieldKey, value);

  if (!nextStackDisplay) {
    return null;
  }

  return areStackDisplaysEqual(stackDisplay, nextStackDisplay) ? null : nextStackDisplay;
}

export function getContainerWithAddedEntry(
  container: ProjectObjectContainer,
  objectFileNodeId: string
) {
  const normalizedObjectFileNodeId = objectFileNodeId.trim();

  if (!normalizedObjectFileNodeId) {
    return null;
  }

  const currentEntryIndex = container.entries.findIndex(
    (entry) => entry.objectFileNodeId === normalizedObjectFileNodeId
  );
  const entries =
    currentEntryIndex === -1
      ? [...container.entries, { objectFileNodeId: normalizedObjectFileNodeId, quantity: 1 }]
      : container.entries.map((entry, index) =>
          index === currentEntryIndex
            ? {
                ...entry,
                quantity: normalizeContainerEntryQuantityValue(entry.quantity + 1)
              }
            : entry
        );
  const nextContainer = normalizeContainer({
    ...container,
    entries
  });

  return areContainersEqual(container, nextContainer) ? null : nextContainer;
}

export function getContainerWithRemovedEntry(
  container: ProjectObjectContainer,
  entryIndex: number
) {
  if (entryIndex < 0 || entryIndex >= container.entries.length) {
    return null;
  }

  const nextContainer = normalizeContainer({
    ...container,
    entries: container.entries.filter((_, index) => index !== entryIndex)
  });

  return areContainersEqual(container, nextContainer) ? null : nextContainer;
}

export function getContainerWithMovedEntry(
  container: ProjectObjectContainer,
  entryIndex: number,
  direction: -1 | 1
) {
  const targetIndex = entryIndex + direction;

  if (
    entryIndex < 0 ||
    entryIndex >= container.entries.length ||
    targetIndex < 0 ||
    targetIndex >= container.entries.length
  ) {
    return null;
  }

  const entries = [...container.entries];
  const [entry] = entries.splice(entryIndex, 1);

  if (!entry) {
    return null;
  }

  entries.splice(targetIndex, 0, entry);

  return normalizeContainer({
    ...container,
    entries
  });
}

export function getContainerWithEntryObjectFileNodeId(
  container: ProjectObjectContainer,
  entryIndex: number,
  objectFileNodeId: string
) {
  const normalizedObjectFileNodeId = objectFileNodeId.trim();

  if (
    !normalizedObjectFileNodeId ||
    entryIndex < 0 ||
    entryIndex >= container.entries.length
  ) {
    return null;
  }

  const nextContainer = normalizeContainer({
    ...container,
    entries: container.entries.map((entry, index) =>
      index === entryIndex
        ? {
            ...entry,
            objectFileNodeId: normalizedObjectFileNodeId
          }
        : entry
    )
  });

  return areContainersEqual(container, nextContainer) ? null : nextContainer;
}

export function getContainerWithEntryQuantityDraftField(
  container: ProjectObjectContainer,
  entryIndex: number,
  value: string
) {
  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null || entryIndex < 0 || entryIndex >= container.entries.length) {
    return null;
  }

  const nextContainer = normalizeContainer({
    ...container,
    entries: container.entries.map((entry, index) =>
      index === entryIndex
        ? {
            ...entry,
            quantity: normalizeContainerEntryQuantityValue(parsedValue)
          }
        : entry
    )
  });

  return areContainersEqual(container, nextContainer) ? null : nextContainer;
}

export function getDieWithDraftField(die: ProjectObjectDie, fieldKey: DieFieldKey, value: string) {
  const nextDie = createNextDie(die, fieldKey, value);

  if (!nextDie) {
    return null;
  }

  return areDiesEqual(die, nextDie) ? null : nextDie;
}

export function getDieFaces(die: ProjectObjectDie): ProjectObjectDieFace[] {
  const faceCount = normalizeProjectObjectDieFaceCount(die.faceCount);

  return Array.from({ length: faceCount }, (_, index) =>
    normalizeDieFace(die.faces[index], index + 1)
  );
}

export function getDieFace(die: ProjectObjectDie, faceNumber: number) {
  const faces = getDieFaces(die);
  const normalizedFaceNumber = normalizeProjectObjectDieActiveFace(faceNumber, faces.length);

  return faces[normalizedFaceNumber - 1] ?? getDefaultProjectObjectDieFace(normalizedFaceNumber);
}

export function getDieWithFaceField(
  die: ProjectObjectDie,
  faceNumber: number,
  fieldKey: DieFaceFieldKey,
  value: string
) {
  const normalizedDie = normalizeDie(die);
  const normalizedFaceNumber = normalizeProjectObjectDieActiveFace(
    faceNumber,
    normalizedDie.faceCount
  );
  const faceIndex = normalizedFaceNumber - 1;
  const currentFace = normalizedDie.faces[faceIndex] ?? getDefaultProjectObjectDieFace(faceNumber);
  const nextFace = createNextDieFace(currentFace, fieldKey, value);

  if (!nextFace) {
    return null;
  }

  const nextDie = {
    ...normalizedDie,
    activeFace: normalizedFaceNumber,
    faces: normalizedDie.faces.map((face, index) => (index === faceIndex ? nextFace : face))
  };

  return areDiesEqual(normalizedDie, nextDie) ? null : nextDie;
}

export function getTextWithDraftField(
  text: ProjectObjectText,
  fieldKey: TextFieldKey,
  value: string
) {
  const nextText = createNextText(text, fieldKey, value);

  if (!nextText) {
    return null;
  }

  return areTextsEqual(text, nextText) ? null : nextText;
}

export function getImageWithDraftField(
  image: ProjectObjectImage,
  fieldKey: ImageFieldKey,
  value: string
) {
  const nextImage = createNextImage(image, fieldKey, value);

  if (!nextImage) {
    return null;
  }

  return areImagesEqual(image, nextImage) ? null : nextImage;
}

export function getLayoutWithDraftField(
  layout: ProjectObjectLayout,
  fieldKey: LayoutFieldKey,
  value: string
) {
  const nextLayout = createNextLayout(layout, fieldKey, value);

  if (!nextLayout) {
    return null;
  }

  return areLayoutsEqual(layout, nextLayout) ? null : nextLayout;
}

export function getShapeWithVariant(shape: ProjectObjectShape, variant: string) {
  if (!shapeVariants.has(variant as ProjectObjectShapeVariant)) {
    return null;
  }

  const nextShape = {
    ...shape,
    variant: variant as ProjectObjectShapeVariant
  };

  return shape.variant === nextShape.variant ? null : nextShape;
}

export function getShapePolygonPoints(shape: ProjectObjectShape): ProjectObjectShapePoint[] {
  const points = shape.polygonPoints ?? getDefaultProjectObjectShapePolygonPoints();
  const normalizedPoints = points
    .slice(0, projectObjectShapePolygonPointCountLimits.max)
    .map((point) => ({
      x: normalizeShapePolygonPointValue("x", point.x),
      y: normalizeShapePolygonPointValue("y", point.y)
    }));

  return normalizedPoints.length >= projectObjectShapePolygonPointCountLimits.min
    ? normalizedPoints
    : getDefaultProjectObjectShapePolygonPoints();
}

export function createShapePolygonPointDrafts(shape: ProjectObjectShape): ShapePolygonPointDraft[] {
  return getShapePolygonPoints(shape).map((point) => ({
    x: formatShapePolygonPointValue(point.x, "x"),
    y: formatShapePolygonPointValue(point.y, "y")
  }));
}

export function getShapeWithPolygonPointDraftField(
  shape: ProjectObjectShape,
  pointIndex: number,
  fieldKey: ShapePolygonPointFieldKey,
  value: string
) {
  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  const points = getShapePolygonPoints(shape);
  const point = points[pointIndex];

  if (!point) {
    return null;
  }

  return getShapeWithPolygonPoint(shape, pointIndex, {
    ...point,
    [fieldKey]: normalizeShapePolygonPointValue(fieldKey, parsedValue)
  });
}

export function getShapeWithPolygonPoint(
  shape: ProjectObjectShape,
  pointIndex: number,
  point: ProjectObjectShapePoint
) {
  const points = getShapePolygonPoints(shape);

  if (!points[pointIndex]) {
    return null;
  }

  const nextPoints = points.map((currentPoint, index) =>
    index === pointIndex
      ? {
          x: normalizeShapePolygonPointValue("x", point.x),
          y: normalizeShapePolygonPointValue("y", point.y)
        }
      : currentPoint
  );

  return getShapeWithPolygonPoints(shape, nextPoints);
}

export function getShapeWithAddedPolygonPoint(shape: ProjectObjectShape) {
  const points = getShapePolygonPoints(shape);

  if (points.length >= projectObjectShapePolygonPointCountLimits.max) {
    return null;
  }

  const firstPoint = points[0] ?? { x: 50, y: 50 };
  const lastPoint = points[points.length - 1] ?? firstPoint;
  const nextPoint = {
    x: normalizeShapePolygonPointValue("x", (firstPoint.x + lastPoint.x) / 2),
    y: normalizeShapePolygonPointValue("y", (firstPoint.y + lastPoint.y) / 2)
  };

  return getShapeWithPolygonPoints(shape, [...points, nextPoint]);
}

export function getShapeWithRemovedPolygonPoint(shape: ProjectObjectShape, pointIndex: number) {
  const points = getShapePolygonPoints(shape);

  if (
    points.length <= projectObjectShapePolygonPointCountLimits.min ||
    pointIndex < 0 ||
    pointIndex >= points.length
  ) {
    return null;
  }

  return getShapeWithPolygonPoints(
    shape,
    points.filter((_, index) => index !== pointIndex)
  );
}

export function getShapeWithDefaultPolygonPoints(shape: ProjectObjectShape) {
  return getShapeWithPolygonPoints(shape, getDefaultProjectObjectShapePolygonPoints());
}

export function normalizeShapePolygonPointValue(
  fieldKey: ShapePolygonPointFieldKey,
  value: number
) {
  const { decimals, max, min } = shapePolygonPointFieldSettings[fieldKey];
  const numericValue = Number.isFinite(value) ? value : min;

  return roundTo(clamp(numericValue, min, max), decimals);
}

export function formatShapePolygonPointValue(value: number, fieldKey: ShapePolygonPointFieldKey) {
  const { decimals } = shapePolygonPointFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function normalizeAppearanceNumberValue(
  fieldKey: keyof typeof appearanceNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = appearanceNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function normalizeTextNumberValue(
  fieldKey: keyof typeof textNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = textNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function normalizeCounterNumberValue(
  fieldKey: keyof typeof counterNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = counterNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function normalizeStackDisplayNumberValue(
  fieldKey: keyof typeof stackDisplayNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = stackDisplayNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function normalizeContainerEntryQuantityValue(value: number) {
  return roundTo(
    clamp(
      value,
      projectObjectContainerEntryQuantityLimits.min,
      projectObjectContainerEntryQuantityLimits.max
    ),
    0
  );
}

export function normalizeZoneNumberValue(
  fieldKey: keyof typeof zoneNumberFieldSettings,
  value: number
) {
  if (fieldKey === "capacity") {
    return normalizeProjectObjectZoneCapacity(value);
  }

  return value;
}

export function normalizeDieNumberValue(
  fieldKey: keyof typeof dieNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = dieNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function normalizeImageNumberValue(
  fieldKey: keyof typeof imageNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = imageNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function normalizeLayoutNumberValue(
  fieldKey: keyof typeof layoutNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = layoutNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function formatAppearanceNumberValue(
  value: number,
  fieldKey: keyof typeof appearanceNumberFieldSettings
) {
  const { decimals } = appearanceNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function formatTextNumberValue(
  value: number,
  fieldKey: keyof typeof textNumberFieldSettings
) {
  const { decimals } = textNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function formatCounterNumberValue(
  value: number,
  fieldKey: keyof typeof counterNumberFieldSettings
) {
  const { decimals } = counterNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function formatStackDisplayNumberValue(
  value: number,
  fieldKey: keyof typeof stackDisplayNumberFieldSettings
) {
  const { decimals } = stackDisplayNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function formatContainerEntryQuantityValue(value: number) {
  return String(normalizeContainerEntryQuantityValue(value));
}

export function formatZoneNumberValue(
  value: number,
  fieldKey: keyof typeof zoneNumberFieldSettings
) {
  const { decimals } = zoneNumberFieldSettings[fieldKey];

  return String(roundTo(normalizeZoneNumberValue(fieldKey, value), decimals));
}

export function formatDieNumberValue(value: number, fieldKey: keyof typeof dieNumberFieldSettings) {
  const { decimals } = dieNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function getTextFontWeightForBold(isBold: boolean) {
  return isBold ? boldTextFontWeight : normalTextFontWeight;
}

export function getTextFontStyleForItalic(isItalic: boolean): ProjectObjectTextFontStyle {
  return isItalic ? "italic" : "normal";
}

export function isTextFontWeightBold(value: number | string) {
  const parsedValue = typeof value === "number" ? value : parseRectTransformDraftValue(value);

  return parsedValue !== null && parsedValue >= boldTextFontWeightThreshold;
}

export function formatImageNumberValue(
  value: number,
  fieldKey: keyof typeof imageNumberFieldSettings
) {
  const { decimals } = imageNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function formatLayoutNumberValue(
  value: number,
  fieldKey: keyof typeof layoutNumberFieldSettings
) {
  const { decimals } = layoutNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

function createNextAppearance(
  appearance: ProjectObjectAppearance,
  fieldKey: AppearanceFieldKey,
  value: string
): ProjectObjectAppearance | null {
  if (fieldKey === "backgroundColor" || fieldKey === "borderColor") {
    return isHexColor(value) ? { ...appearance, [fieldKey]: value.toLowerCase() } : null;
  }

  if (fieldKey === "borderStyle") {
    return borderStyles.has(value as ProjectObjectBorderStyle)
      ? { ...appearance, borderStyle: value as ProjectObjectBorderStyle }
      : null;
  }

  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  return {
    ...appearance,
    [fieldKey]: normalizeAppearanceNumberValue(fieldKey, parsedValue)
  };
}

function createNextCard(
  card: ProjectObjectCard,
  fieldKey: CardFieldKey,
  value: string
): ProjectObjectCard | null {
  if (fieldKey === "sizePreset") {
    return cardSizePresetValues.has(value as ProjectObjectCardSizePresetValue)
      ? { ...card, sizePreset: value as ProjectObjectCardSizePresetValue }
      : null;
  }

  return null;
}

function createNextCounter(
  counter: ProjectObjectCounter,
  fieldKey: CounterFieldKey,
  value: string
): ProjectObjectCounter | null {
  if (fieldKey === "boundsMode") {
    return counterBoundsModes.has(value as ProjectObjectCounterBoundsMode)
      ? normalizeCounter({ ...counter, boundsMode: value as ProjectObjectCounterBoundsMode })
      : null;
  }

  if (fieldKey === "displayMode") {
    return counterDisplayModes.has(value as ProjectObjectCounterDisplayMode)
      ? { ...counter, displayMode: value as ProjectObjectCounterDisplayMode }
      : null;
  }

  if (fieldKey === "prefix" || fieldKey === "suffix") {
    return {
      ...counter,
      [fieldKey]: value.slice(0, projectObjectCounterAffixMaxLength)
    };
  }

  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  return normalizeCounter({
    ...counter,
    [fieldKey]: normalizeCounterNumberValue(fieldKey, parsedValue)
  });
}

function createNextDeck(
  deck: ProjectObjectDeck,
  fieldKey: DeckFieldKey,
  value: string | boolean
): ProjectObjectDeck | null {
  if (fieldKey === "sizePreset") {
    return typeof value === "string" &&
      cardSizePresetValues.has(value as ProjectObjectCardSizePresetValue)
      ? { ...deck, sizePreset: value as ProjectObjectCardSizePresetValue }
      : null;
  }

  return null;
}

function createNextZone(
  zone: ProjectObjectZone,
  fieldKey: ZoneFieldKey,
  value: string
): ProjectObjectZone | null {
  if (fieldKey === "referenceObjectFileId") {
    return {
      ...zone,
      referenceObjectFileId: value.trim()
    };
  }

  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  return normalizeZone({
    ...zone,
    [fieldKey]: normalizeZoneNumberValue(fieldKey, parsedValue)
  });
}

function createNextStackDisplay(
  stackDisplay: ProjectObjectStackDisplay,
  fieldKey: StackDisplayFieldKey,
  value: string | boolean
): ProjectObjectStackDisplay | null {
  if (fieldKey === "showCount") {
    return typeof value === "boolean" ? { ...stackDisplay, showCount: value } : null;
  }

  const parsedValue = typeof value === "string" ? parseRectTransformDraftValue(value) : null;

  if (parsedValue === null) {
    return null;
  }

  return normalizeStackDisplay({
    ...stackDisplay,
    [fieldKey]: normalizeStackDisplayNumberValue(fieldKey, parsedValue)
  });
}

function createNextDie(
  die: ProjectObjectDie,
  fieldKey: DieFieldKey,
  value: string
): ProjectObjectDie | null {
  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  if (fieldKey === "faceCount") {
    const faceCount = normalizeProjectObjectDieFaceCount(parsedValue);
    const faces = resizeDieFaces(die, faceCount);

    return {
      ...die,
      activeFace: normalizeProjectObjectDieActiveFace(die.activeFace, faceCount),
      faceCount,
      faces
    };
  }

  if (fieldKey === "activeFace") {
    return {
      ...die,
      activeFace: normalizeProjectObjectDieActiveFace(parsedValue, die.faceCount)
    };
  }

  return null;
}

function createNextDieFace(
  face: ProjectObjectDieFace,
  fieldKey: DieFaceFieldKey,
  value: string
): ProjectObjectDieFace | null {
  if (fieldKey === "mode") {
    return dieFaceModes.has(value as ProjectObjectDieFaceMode)
      ? { ...face, mode: value as ProjectObjectDieFaceMode }
      : null;
  }

  if (fieldKey === "label") {
    return {
      ...face,
      label: value.slice(0, projectObjectDieFaceLabelMaxLength)
    };
  }

  if (fieldKey === "imageAssetId") {
    return {
      ...face,
      imageAssetId: value
    };
  }

  return null;
}

function createNextText(
  text: ProjectObjectText,
  fieldKey: TextFieldKey,
  value: string
): ProjectObjectText | null {
  if (fieldKey === "content") {
    return {
      ...text,
      content: value
    };
  }

  if (fieldKey === "color") {
    return isHexColor(value) ? { ...text, color: value.toLowerCase() } : null;
  }

  if (fieldKey === "textAlign") {
    return textAligns.has(value as ProjectObjectTextAlign)
      ? { ...text, textAlign: value as ProjectObjectTextAlign }
      : null;
  }

  if (fieldKey === "fontStyle") {
    return textFontStyles.has(value as ProjectObjectTextFontStyle)
      ? { ...text, fontStyle: value as ProjectObjectTextFontStyle }
      : null;
  }

  if (fieldKey === "verticalAlign") {
    return textVerticalAligns.has(value as ProjectObjectTextVerticalAlign)
      ? { ...text, verticalAlign: value as ProjectObjectTextVerticalAlign }
      : null;
  }

  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  return {
    ...text,
    [fieldKey]: normalizeTextNumberValue(fieldKey, parsedValue)
  };
}

function createNextImage(
  image: ProjectObjectImage,
  fieldKey: ImageFieldKey,
  value: string
): ProjectObjectImage | null {
  if (fieldKey === "assetId") {
    return {
      ...image,
      assetId: value
    };
  }

  if (fieldKey === "fit") {
    return imageFits.has(value as ProjectObjectImageFit)
      ? { ...image, fit: value as ProjectObjectImageFit }
      : null;
  }

  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  return {
    ...image,
    [fieldKey]: normalizeImageNumberValue(fieldKey, parsedValue)
  };
}

function createNextLayout(
  layout: ProjectObjectLayout,
  fieldKey: LayoutFieldKey,
  value: string
): ProjectObjectLayout | null {
  if (fieldKey === "alignItems") {
    return layoutAlignments.has(value as ProjectObjectLayoutAlignment)
      ? { ...layout, alignItems: value as ProjectObjectLayoutAlignment }
      : null;
  }

  if (fieldKey === "justifyContent") {
    return layoutJustifications.has(value as ProjectObjectLayoutJustification)
      ? { ...layout, justifyContent: value as ProjectObjectLayoutJustification }
      : null;
  }

  if (fieldKey === "mode") {
    return layoutModes.has(value as ProjectObjectLayoutMode)
      ? { ...layout, mode: value as ProjectObjectLayoutMode }
      : null;
  }

  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  return {
    ...layout,
    [fieldKey]: normalizeLayoutNumberValue(fieldKey, parsedValue)
  };
}

function areAppearancesEqual(left: ProjectObjectAppearance, right: ProjectObjectAppearance) {
  return (
    left.backgroundColor === right.backgroundColor &&
    left.backgroundOpacity === right.backgroundOpacity &&
    left.borderColor === right.borderColor &&
    left.borderRadius === right.borderRadius &&
    left.borderStyle === right.borderStyle &&
    left.borderWidth === right.borderWidth &&
    left.opacity === right.opacity &&
    left.padding === right.padding
  );
}

function areCardsEqual(left: ProjectObjectCard, right: ProjectObjectCard) {
  return left.sizePreset === right.sizePreset;
}

function areCountersEqual(left: ProjectObjectCounter, right: ProjectObjectCounter) {
  return (
    left.boundsMode === right.boundsMode &&
    left.defaultValue === right.defaultValue &&
    left.displayMode === right.displayMode &&
    left.maxValue === right.maxValue &&
    left.minValue === right.minValue &&
    left.prefix === right.prefix &&
    left.step === right.step &&
    left.suffix === right.suffix
  );
}

function areDecksEqual(left: ProjectObjectDeck, right: ProjectObjectDeck) {
  return left.sizePreset === right.sizePreset;
}

function areZonesEqual(left: ProjectObjectZone, right: ProjectObjectZone) {
  return (
    left.capacity === right.capacity &&
    left.referenceObjectFileId === right.referenceObjectFileId
  );
}

function areStackDisplaysEqual(
  left: ProjectObjectStackDisplay,
  right: ProjectObjectStackDisplay
) {
  return (
    left.showCount === right.showCount &&
    left.stackOffsetX === right.stackOffsetX &&
    left.stackOffsetY === right.stackOffsetY &&
    left.visibleItemCount === right.visibleItemCount
  );
}

function areContainersEqual(left: ProjectObjectContainer, right: ProjectObjectContainer) {
  return areContainerEntriesEqual(left.entries, right.entries);
}

function areContainerEntriesEqual(
  left: readonly ProjectObjectContainer["entries"][number][],
  right: readonly ProjectObjectContainer["entries"][number][]
) {
  return (
    left.length === right.length &&
    left.every((leftEntry, index) => {
      const rightEntry = right[index];

      return (
        Boolean(rightEntry) &&
        leftEntry.objectFileNodeId === rightEntry.objectFileNodeId &&
        leftEntry.quantity === rightEntry.quantity
      );
    })
  );
}

function areDiesEqual(left: ProjectObjectDie, right: ProjectObjectDie) {
  return (
    left.activeFace === right.activeFace &&
    left.faceCount === right.faceCount &&
    areDieFacesEqual(getDieFaces(left), getDieFaces(right))
  );
}

function areDieFacesEqual(
  left: readonly ProjectObjectDieFace[],
  right: readonly ProjectObjectDieFace[]
) {
  return (
    left.length === right.length &&
    left.every((leftFace, index) => {
      const rightFace = right[index];

      return (
        Boolean(rightFace) &&
        leftFace.imageAssetId === rightFace.imageAssetId &&
        leftFace.label === rightFace.label &&
        leftFace.mode === rightFace.mode
      );
    })
  );
}

function areTextsEqual(left: ProjectObjectText, right: ProjectObjectText) {
  return (
    left.color === right.color &&
    left.content === right.content &&
    left.fontSize === right.fontSize &&
    left.fontStyle === right.fontStyle &&
    left.fontWeight === right.fontWeight &&
    left.lineHeight === right.lineHeight &&
    left.textAlign === right.textAlign &&
    left.verticalAlign === right.verticalAlign
  );
}

function areImagesEqual(left: ProjectObjectImage, right: ProjectObjectImage) {
  return (
    left.assetId === right.assetId &&
    left.fit === right.fit &&
    left.positionX === right.positionX &&
    left.positionY === right.positionY
  );
}

function areLayoutsEqual(left: ProjectObjectLayout, right: ProjectObjectLayout) {
  return (
    left.alignItems === right.alignItems &&
    left.columns === right.columns &&
    left.gap === right.gap &&
    left.justifyContent === right.justifyContent &&
    left.mode === right.mode
  );
}

function getShapeWithPolygonPoints(
  shape: ProjectObjectShape,
  polygonPoints: readonly ProjectObjectShapePoint[]
): ProjectObjectShape | null {
  const nextPolygonPoints = normalizeShapePolygonPoints(polygonPoints);

  return areShapePolygonPointsEqual(getShapePolygonPoints(shape), nextPolygonPoints)
    ? null
    : {
        ...shape,
        polygonPoints: nextPolygonPoints
      };
}

function normalizeDie(die: ProjectObjectDie): ProjectObjectDie {
  const faceCount = normalizeProjectObjectDieFaceCount(die.faceCount);

  return {
    activeFace: normalizeProjectObjectDieActiveFace(die.activeFace, faceCount),
    faceCount,
    faces: getDieFaces({ ...die, faceCount })
  };
}

function normalizeCounter(counter: ProjectObjectCounter): ProjectObjectCounter {
  const minValue = normalizeCounterNumberValue("minValue", counter.minValue);
  const maxValue = Math.max(minValue, normalizeCounterNumberValue("maxValue", counter.maxValue));
  const defaultValue = normalizeCounterNumberValue(
    "defaultValue",
    counter.boundsMode === "none"
      ? counter.defaultValue
      : clamp(counter.defaultValue, minValue, maxValue)
  );

  return {
    ...counter,
    defaultValue,
    maxValue,
    minValue,
    prefix: counter.prefix.slice(0, projectObjectCounterAffixMaxLength),
    step: normalizeCounterNumberValue("step", counter.step),
    suffix: counter.suffix.slice(0, projectObjectCounterAffixMaxLength)
  };
}

function normalizeStackDisplay(
  stackDisplay: ProjectObjectStackDisplay
): ProjectObjectStackDisplay {
  const defaultStackDisplay = getDefaultProjectObjectStackDisplay();

  return {
    ...stackDisplay,
    showCount:
      typeof stackDisplay.showCount === "boolean"
        ? stackDisplay.showCount
        : defaultStackDisplay.showCount,
    stackOffsetX: normalizeStackDisplayNumberValue("stackOffsetX", stackDisplay.stackOffsetX),
    stackOffsetY: normalizeStackDisplayNumberValue("stackOffsetY", stackDisplay.stackOffsetY),
    visibleItemCount: normalizeStackDisplayNumberValue(
      "visibleItemCount",
      stackDisplay.visibleItemCount
    )
  };
}

function normalizeZone(zone: ProjectObjectZone): ProjectObjectZone {
  const defaultZone = getDefaultProjectObjectZone();

  return {
    ...zone,
    capacity: normalizeProjectObjectZoneCapacity(zone.capacity),
    referenceObjectFileId:
      typeof zone.referenceObjectFileId === "string"
        ? zone.referenceObjectFileId.trim()
        : defaultZone.referenceObjectFileId
  };
}

function normalizeContainer(container: ProjectObjectContainer): ProjectObjectContainer {
  return {
    ...container,
    entries: normalizeContainerEntries(container.entries)
  };
}

function normalizeContainerEntries(entries: ProjectObjectContainer["entries"]) {
  const quantityByObjectFileNodeId = new Map<string, number>();

  for (const entry of entries) {
    const objectFileNodeId = entry.objectFileNodeId.trim();

    if (!objectFileNodeId) {
      continue;
    }

    quantityByObjectFileNodeId.set(
      objectFileNodeId,
      normalizeContainerEntryQuantityValue(
        (quantityByObjectFileNodeId.get(objectFileNodeId) ?? 0) + entry.quantity
      )
    );
  }

  return Array.from(quantityByObjectFileNodeId, ([objectFileNodeId, quantity]) => ({
    objectFileNodeId,
    quantity
  }));
}

function resizeDieFaces(die: ProjectObjectDie, faceCount: number) {
  const currentFaces = getDieFaces(die);

  return Array.from({ length: faceCount }, (_, index) =>
    normalizeDieFace(currentFaces[index], index + 1)
  );
}

function normalizeDieFace(
  face: ProjectObjectDieFace | undefined,
  faceNumber: number
): ProjectObjectDieFace {
  const defaultFace = getDefaultProjectObjectDieFace(faceNumber);
  const mode = dieFaceModes.has(face?.mode as ProjectObjectDieFaceMode)
    ? (face?.mode as ProjectObjectDieFaceMode)
    : defaultFace.mode;

  return {
    imageAssetId: typeof face?.imageAssetId === "string" ? face.imageAssetId : "",
    label:
      typeof face?.label === "string"
        ? face.label.slice(0, projectObjectDieFaceLabelMaxLength)
        : defaultFace.label,
    mode
  };
}

function normalizeShapePolygonPoints(
  polygonPoints: readonly ProjectObjectShapePoint[]
): ProjectObjectShapePoint[] {
  const points = polygonPoints
    .slice(0, projectObjectShapePolygonPointCountLimits.max)
    .map((point) => ({
      x: normalizeShapePolygonPointValue("x", point.x),
      y: normalizeShapePolygonPointValue("y", point.y)
    }));

  return points.length >= projectObjectShapePolygonPointCountLimits.min
    ? points
    : getDefaultProjectObjectShapePolygonPoints();
}

function areShapePolygonPointsEqual(
  left: readonly ProjectObjectShapePoint[],
  right: readonly ProjectObjectShapePoint[]
) {
  return (
    left.length === right.length &&
    left.every((leftPoint, index) => {
      const rightPoint = right[index];

      return Boolean(rightPoint) && leftPoint.x === rightPoint.x && leftPoint.y === rightPoint.y;
    })
  );
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals: number) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}
