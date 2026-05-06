import type {
  ProjectObjectAppearance,
  ProjectObjectBag,
  ProjectObjectBagAppearanceVariant,
  ProjectObjectBorderStyle,
  ProjectObjectCard,
  ProjectObjectCardSizePresetValue,
  ProjectObjectComponents,
  ProjectObjectContainer,
  ProjectObjectContainerEntry,
  ProjectObjectCounter,
  ProjectObjectCounterBoundsMode,
  ProjectObjectCounterDisplayMode,
  ProjectObjectDie,
  ProjectObjectDieFace,
  ProjectObjectDieFaceMode,
  ProjectObjectDoubleSide,
  ProjectObjectIcon,
  ProjectObjectIconStyle,
  ProjectObjectIconSymbol,
  ProjectObjectImage,
  ProjectObjectImageFit,
  ProjectObjectKind,
  ProjectObjectLayout,
  ProjectObjectLayoutAlignment,
  ProjectObjectLayoutJustification,
  ProjectObjectLayoutMode,
  ProjectObjectMeeple,
  ProjectObjectMeepleVisualVariant,
  ProjectObjectRectTransform,
  ProjectObjectScoreTrack,
  ProjectObjectScoreTrackMarker,
  ProjectObjectScoreTrackOrientation,
  ProjectObjectShape,
  ProjectObjectShapePoint,
  ProjectObjectShapeVariant,
  ProjectObjectSide,
  ProjectObjectSideComponents,
  ProjectObjectStackDisplay,
  ProjectObjectText,
  ProjectObjectTextAlign,
  ProjectObjectTextEffectMode,
  ProjectObjectTextFontFamily,
  ProjectObjectTextFontStyle,
  ProjectObjectTextVerticalAlign,
  ProjectObjectZone,
  ProjectObjectZoneMode
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectAppearance,
  getDefaultProjectObjectBag,
  getDefaultProjectObjectCard,
  getDefaultProjectObjectCounter,
  getDefaultProjectObjectDie,
  getDefaultProjectObjectDieFace,
  getDefaultProjectObjectDoubleSide,
  getDefaultProjectObjectIcon,
  getDefaultProjectObjectImage,
  getDefaultProjectObjectLayout,
  getDefaultProjectObjectMeeple,
  getDefaultProjectObjectRectTransform,
  getDefaultProjectObjectScoreTrack,
  getDefaultProjectObjectShape,
  getDefaultProjectObjectShapePolygonPoints,
  getDefaultProjectObjectStackDisplay,
  getDefaultProjectObjectText,
  getDefaultProjectObjectZone,
  getProjectObjectCardSizePreset,
  getProjectObjectRectTransformWithCardSizePreset,
  normalizeProjectObjectZoneSlots,
  projectObjectBagAppearanceVariants,
  projectObjectCardCustomSizePresetId,
  projectObjectContainerEntryQuantityLimits,
  projectObjectCounterAffixMaxLength,
  projectObjectCounterBoundsModes,
  projectObjectCounterDisplayModes,
  projectObjectCounterStepLimits,
  projectObjectCounterValueLimits,
  projectObjectDieFaceCountLimits,
  projectObjectDieFaceLabelMaxLength,
  projectObjectDieFaceModes,
  projectObjectIconStyles,
  projectObjectIconSymbols,
  projectObjectMeepleVisualVariants,
  projectObjectScoreTrackMarkerCountLimits,
  projectObjectScoreTrackMarkerLabelMaxLength,
  projectObjectScoreTrackOrientations,
  projectObjectScoreTrackStepLimits,
  projectObjectScoreTrackValueLimits,
  projectObjectShapePolygonCoordinateLimits,
  projectObjectShapePolygonPointCountLimits,
  projectObjectSides,
  projectObjectStackDisplayOffsetLimits,
  projectObjectStackDisplayVisibleItemCountLimits,
  projectObjectTextEffectModes,
  projectObjectTextFontFamilies,
  projectObjectZoneModes
} from "@bg-maker/shared";
import { isSafeProjectImageAssetId } from "./project-image-assets.js";
import { normalizeProjectCompositionSettings } from "./project-composition-normalizer.js";
import {
  hasOwnRecordKey,
  normalizeFiniteNumber,
  normalizeHexColor,
  normalizeIntegerNumber
} from "./project-normalization-utils.js";

const maxProjectObjectAppearanceSize = 1000;
const maxProjectObjectCoordinate = 10000;
const maxProjectObjectDimension = 10000;
const maxProjectObjectLayoutColumns = 24;
const maxProjectObjectLayoutGap = 10000;
const maxProjectObjectOpacity = 1;
const maxProjectObjectRotation = 3600;
const maxProjectObjectScale = 8;
const maxProjectTextContentLength = 2000;
const maxProjectTextFontSize = 512;
const maxProjectTextFontWeight = 900;
const maxProjectTextLineHeight = 4;
const maxProjectTextEffectStrength = 12;
const minProjectTextFontSize = 1;
const minProjectTextFontWeight = 100;
const minProjectTextLineHeight = 0.5;
const minProjectObjectDimension = 1;
const minProjectObjectOpacity = 0;
const minProjectObjectScale = 0.1;

const projectObjectBorderStyles = new Set<ProjectObjectBorderStyle>([
  "none",
  "solid",
  "dashed",
  "dotted"
]);
const projectObjectBagAppearanceVariantSet = new Set<ProjectObjectBagAppearanceVariant>(
  projectObjectBagAppearanceVariants
);
const projectObjectMeepleVisualVariantSet = new Set<ProjectObjectMeepleVisualVariant>(
  projectObjectMeepleVisualVariants
);
const projectObjectScoreTrackOrientationSet = new Set<ProjectObjectScoreTrackOrientation>(
  projectObjectScoreTrackOrientations
);
const projectObjectImageFits = new Set<ProjectObjectImageFit>([
  "contain",
  "cover",
  "fill",
  "scaleDown"
]);
const projectObjectDieFaceModeSet = new Set<ProjectObjectDieFaceMode>(projectObjectDieFaceModes);
const projectObjectIconSymbolSet = new Set<ProjectObjectIconSymbol>(projectObjectIconSymbols);
const projectObjectIconStyleSet = new Set<ProjectObjectIconStyle>(projectObjectIconStyles);
const projectObjectCounterBoundsModeSet = new Set<ProjectObjectCounterBoundsMode>(
  projectObjectCounterBoundsModes
);
const projectObjectCounterDisplayModeSet = new Set<ProjectObjectCounterDisplayMode>(
  projectObjectCounterDisplayModes
);
const projectObjectLayoutAlignments = new Set<ProjectObjectLayoutAlignment>([
  "center",
  "end",
  "start"
]);
const projectObjectLayoutJustifications = new Set<ProjectObjectLayoutJustification>([
  "center",
  "end",
  "spaceBetween",
  "start"
]);
const projectObjectLayoutModes = new Set<ProjectObjectLayoutMode>([
  "free",
  "grid",
  "horizontal",
  "vertical"
]);
const projectObjectShapeVariants = new Set<ProjectObjectShapeVariant>([
  "diamond",
  "ellipse",
  "hexagon",
  "polygon",
  "rectangle",
  "triangle"
]);
const projectObjectTextAligns = new Set<ProjectObjectTextAlign>(["center", "left", "right"]);
const projectObjectTextEffectModeSet = new Set<ProjectObjectTextEffectMode>(
  projectObjectTextEffectModes
);
const projectObjectTextFontFamilySet = new Set<ProjectObjectTextFontFamily>(
  projectObjectTextFontFamilies
);
const projectObjectZoneModeSet = new Set<ProjectObjectZoneMode>(projectObjectZoneModes);
const projectObjectTextFontStyles = new Set<ProjectObjectTextFontStyle>(["italic", "normal"]);
const projectObjectTextVerticalAligns = new Set<ProjectObjectTextVerticalAlign>([
  "bottom",
  "middle",
  "top"
]);

export function normalizeProjectObjectComponents(
  value: unknown,
  kind: ProjectObjectKind,
  name: string
) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rectTransform = normalizeProjectObjectRectTransform(record.rectTransform, kind);
  const components: ProjectObjectComponents = {
    appearance: normalizeProjectObjectAppearance(record.appearance, kind),
    composition: normalizeProjectCompositionSettings(record.composition),
    rectTransform
  };

  if (
    kind === "card" ||
    kind === "token" ||
    kind === "tile" ||
    hasOwnRecordKey(record, "doubleSide")
  ) {
    components.doubleSide = normalizeProjectObjectDoubleSide(record.doubleSide, kind, name);
  }

  if (kind === "group") {
    return {
      ...components,
      layout: normalizeProjectObjectLayout(record.layout)
    };
  }

  if (kind === "card") {
    const card = normalizeProjectObjectCard(record.card);

    return {
      ...components,
      card,
      layout: normalizeProjectObjectLayout(record.layout),
      rectTransform: getProjectObjectRectTransformWithCardSizePreset(rectTransform, card)
    };
  }

  if (kind === "deck") {
    return {
      ...components,
      container: normalizeProjectObjectContainer(record.container, kind),
      stackDisplay: normalizeProjectObjectStackDisplay(record.stackDisplay)
    };
  }

  if (kind === "stack") {
    return {
      ...components,
      container: normalizeProjectObjectContainer(record.container, kind),
      stackDisplay: normalizeProjectObjectStackDisplay(record.stackDisplay)
    };
  }

  if (kind === "bag") {
    return {
      ...components,
      bag: normalizeProjectObjectBag(record.bag),
      container: normalizeProjectObjectContainer(record.container, kind)
    };
  }

  if (kind === "counter") {
    return {
      ...components,
      counter: normalizeProjectObjectCounter(record.counter)
    };
  }

  if (kind === "scoreTrack") {
    return {
      ...components,
      scoreTrack: normalizeProjectObjectScoreTrack(record.scoreTrack)
    };
  }

  if (kind === "die") {
    return {
      ...components,
      die: normalizeProjectObjectDie(record.die)
    };
  }

  if (kind === "meeple") {
    return {
      ...components,
      meeple: normalizeProjectObjectMeeple(record.meeple)
    };
  }

  if (kind === "zone") {
    return {
      ...components,
      layout: normalizeProjectObjectLayout(record.layout, kind),
      zone: normalizeProjectObjectZone(record.zone)
    };
  }

  if (kind === "token" || kind === "tile") {
    return {
      ...components,
      shape: normalizeProjectObjectShape(record.shape, kind)
    };
  }

  if (kind === "label") {
    return {
      ...components,
      text: normalizeProjectObjectText(record.text, kind, name)
    };
  }

  if (kind === "image") {
    return {
      ...components,
      image: normalizeProjectObjectImage(record.image)
    };
  }

  if (kind === "icon") {
    return {
      ...components,
      icon: normalizeProjectObjectIcon(record.icon)
    };
  }

  if (kind === "shape") {
    return {
      ...components,
      shape: normalizeProjectObjectShape(record.shape)
    };
  }

  return components;
}

function normalizeProjectObjectRectTransform(
  value: unknown,
  kind: ProjectObjectKind
): ProjectObjectRectTransform {
  const defaultRectTransform = getDefaultProjectObjectRectTransform(kind);
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    height: normalizeFiniteNumber(record.height, defaultRectTransform.height, {
      max: maxProjectObjectDimension,
      min: minProjectObjectDimension
    }),
    pivotX: normalizeFiniteNumber(record.pivotX, defaultRectTransform.pivotX, {
      max: 1,
      min: 0
    }),
    pivotY: normalizeFiniteNumber(record.pivotY, defaultRectTransform.pivotY, {
      max: 1,
      min: 0
    }),
    rotation: normalizeFiniteNumber(record.rotation, defaultRectTransform.rotation, {
      max: maxProjectObjectRotation,
      min: -maxProjectObjectRotation
    }),
    scaleX: normalizeFiniteNumber(record.scaleX, defaultRectTransform.scaleX, {
      max: maxProjectObjectScale,
      min: minProjectObjectScale
    }),
    scaleY: normalizeFiniteNumber(record.scaleY, defaultRectTransform.scaleY, {
      max: maxProjectObjectScale,
      min: minProjectObjectScale
    }),
    width: normalizeFiniteNumber(record.width, defaultRectTransform.width, {
      max: maxProjectObjectDimension,
      min: minProjectObjectDimension
    }),
    x: normalizeFiniteNumber(record.x, defaultRectTransform.x, {
      max: maxProjectObjectCoordinate,
      min: -maxProjectObjectCoordinate
    }),
    y: normalizeFiniteNumber(record.y, defaultRectTransform.y, {
      max: maxProjectObjectCoordinate,
      min: -maxProjectObjectCoordinate
    })
  };
}

export function normalizeProjectObjectAppearance(
  value: unknown,
  kind: ProjectObjectKind
): ProjectObjectAppearance {
  const defaultAppearance = getDefaultProjectObjectAppearance(kind);
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    backgroundColor: normalizeHexColor(record.backgroundColor, defaultAppearance.backgroundColor),
    backgroundOpacity: normalizeFiniteNumber(
      record.backgroundOpacity,
      typeof record.backgroundVisible === "boolean"
        ? Number(record.backgroundVisible)
        : defaultAppearance.backgroundOpacity,
      {
        max: maxProjectObjectOpacity,
        min: minProjectObjectOpacity
      }
    ),
    borderColor: normalizeHexColor(record.borderColor, defaultAppearance.borderColor),
    borderRadius: normalizeFiniteNumber(record.borderRadius, defaultAppearance.borderRadius, {
      max: maxProjectObjectAppearanceSize,
      min: 0
    }),
    borderStyle: projectObjectBorderStyles.has(record.borderStyle as ProjectObjectBorderStyle)
      ? (record.borderStyle as ProjectObjectBorderStyle)
      : defaultAppearance.borderStyle,
    borderWidth: normalizeFiniteNumber(record.borderWidth, defaultAppearance.borderWidth, {
      max: maxProjectObjectAppearanceSize,
      min: 0
    }),
    opacity: normalizeFiniteNumber(record.opacity, defaultAppearance.opacity, {
      max: maxProjectObjectOpacity,
      min: minProjectObjectOpacity
    }),
    padding: normalizeFiniteNumber(record.padding, defaultAppearance.padding, {
      max: maxProjectObjectAppearanceSize,
      min: 0
    })
  };
}

function normalizeProjectObjectLayout(
  value: unknown,
  kind: ProjectObjectKind = "group"
): ProjectObjectLayout {
  const defaultLayout = getDefaultProjectObjectLayout(kind);
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    alignItems: projectObjectLayoutAlignments.has(record.alignItems as ProjectObjectLayoutAlignment)
      ? (record.alignItems as ProjectObjectLayoutAlignment)
      : defaultLayout.alignItems,
    columns: normalizeFiniteNumber(record.columns, defaultLayout.columns, {
      max: maxProjectObjectLayoutColumns,
      min: 1
    }),
    gap: normalizeFiniteNumber(record.gap, defaultLayout.gap, {
      max: maxProjectObjectLayoutGap,
      min: 0
    }),
    justifyContent: projectObjectLayoutJustifications.has(
      record.justifyContent as ProjectObjectLayoutJustification
    )
      ? (record.justifyContent as ProjectObjectLayoutJustification)
      : defaultLayout.justifyContent,
    mode: projectObjectLayoutModes.has(record.mode as ProjectObjectLayoutMode)
      ? (record.mode as ProjectObjectLayoutMode)
      : defaultLayout.mode
  };
}

function normalizeProjectObjectZone(value: unknown): ProjectObjectZone {
  const defaultZone = getDefaultProjectObjectZone();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    mode: projectObjectZoneModeSet.has(record.mode as ProjectObjectZoneMode)
      ? (record.mode as ProjectObjectZoneMode)
      : defaultZone.mode,
    sizeReferenceObjectFileId:
      typeof record.sizeReferenceObjectFileId === "string"
        ? record.sizeReferenceObjectFileId.trim()
        : defaultZone.sizeReferenceObjectFileId,
    slots: normalizeProjectObjectZoneSlots(record.slots as number, defaultZone.slots)
  };
}

function normalizeProjectObjectCard(value: unknown): ProjectObjectCard {
  const defaultCard = getDefaultProjectObjectCard();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sizePreset =
    typeof record.sizePreset === "string" &&
    (record.sizePreset === projectObjectCardCustomSizePresetId ||
      getProjectObjectCardSizePreset(record.sizePreset))
      ? (record.sizePreset as ProjectObjectCardSizePresetValue)
      : defaultCard.sizePreset;

  return {
    sizePreset
  };
}

function normalizeProjectObjectContainer(
  value: unknown,
  kind: ProjectObjectKind
): ProjectObjectContainer {
  void kind;

  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    entries: normalizeProjectObjectContainerEntries(record.entries)
  };
}

function normalizeProjectObjectContainerEntries(value: unknown): ProjectObjectContainerEntry[] {
  const entries = Array.isArray(value) ? value : [];
  const quantityByObjectFileNodeId = new Map<string, number>();

  for (const entry of entries) {
    const record = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const objectFileNodeId =
      typeof record.objectFileNodeId === "string" ? record.objectFileNodeId.trim() : "";

    if (!objectFileNodeId) {
      continue;
    }

    const quantity = normalizeIntegerNumber(
      record.quantity,
      1,
      projectObjectContainerEntryQuantityLimits
    );
    quantityByObjectFileNodeId.set(
      objectFileNodeId,
      normalizeIntegerNumber(
        (quantityByObjectFileNodeId.get(objectFileNodeId) ?? 0) + quantity,
        1,
        projectObjectContainerEntryQuantityLimits
      )
    );
  }

  return Array.from(quantityByObjectFileNodeId, ([objectFileNodeId, quantity]) => ({
    objectFileNodeId,
    quantity
  }));
}

function normalizeProjectObjectStackDisplay(value: unknown): ProjectObjectStackDisplay {
  const defaultStackDisplay = getDefaultProjectObjectStackDisplay();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    showCount:
      typeof record.showCount === "boolean" ? record.showCount : defaultStackDisplay.showCount,
    stackOffsetX: normalizeIntegerNumber(
      record.stackOffsetX,
      defaultStackDisplay.stackOffsetX,
      projectObjectStackDisplayOffsetLimits
    ),
    stackOffsetY: normalizeIntegerNumber(
      record.stackOffsetY,
      defaultStackDisplay.stackOffsetY,
      projectObjectStackDisplayOffsetLimits
    ),
    visibleItemCount: normalizeIntegerNumber(
      record.visibleItemCount,
      defaultStackDisplay.visibleItemCount,
      projectObjectStackDisplayVisibleItemCountLimits
    )
  };
}

function normalizeProjectObjectBag(value: unknown): ProjectObjectBag {
  const defaultBag = getDefaultProjectObjectBag();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const appearanceVariant = projectObjectBagAppearanceVariantSet.has(
    record.appearanceVariant as ProjectObjectBagAppearanceVariant
  )
    ? (record.appearanceVariant as ProjectObjectBagAppearanceVariant)
    : defaultBag.appearanceVariant;

  return {
    appearanceVariant
  };
}

function normalizeProjectObjectMeeple(value: unknown): ProjectObjectMeeple {
  const defaultMeeple = getDefaultProjectObjectMeeple();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const visualVariant = projectObjectMeepleVisualVariantSet.has(
    record.visualVariant as ProjectObjectMeepleVisualVariant
  )
    ? (record.visualVariant as ProjectObjectMeepleVisualVariant)
    : defaultMeeple.visualVariant;

  return {
    visualVariant
  };
}

function normalizeProjectObjectCounter(value: unknown): ProjectObjectCounter {
  const defaultCounter = getDefaultProjectObjectCounter();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const minValue = normalizeIntegerNumber(record.minValue, defaultCounter.minValue, {
    max: projectObjectCounterValueLimits.max,
    min: projectObjectCounterValueLimits.min
  });
  const maxValue = Math.max(
    minValue,
    normalizeIntegerNumber(record.maxValue, defaultCounter.maxValue, {
      max: projectObjectCounterValueLimits.max,
      min: projectObjectCounterValueLimits.min
    })
  );
  const boundsMode = projectObjectCounterBoundsModeSet.has(
    record.boundsMode as ProjectObjectCounterBoundsMode
  )
    ? (record.boundsMode as ProjectObjectCounterBoundsMode)
    : defaultCounter.boundsMode;

  return {
    boundsMode,
    defaultValue: normalizeIntegerNumber(
      record.defaultValue,
      defaultCounter.defaultValue,
      boundsMode === "none"
        ? {
            max: projectObjectCounterValueLimits.max,
            min: projectObjectCounterValueLimits.min
          }
        : { max: maxValue, min: minValue }
    ),
    displayMode: projectObjectCounterDisplayModeSet.has(
      record.displayMode as ProjectObjectCounterDisplayMode
    )
      ? (record.displayMode as ProjectObjectCounterDisplayMode)
      : defaultCounter.displayMode,
    maxValue,
    minValue,
    prefix: normalizeProjectObjectCounterAffix(record.prefix),
    step: normalizeIntegerNumber(record.step, defaultCounter.step, {
      max: projectObjectCounterStepLimits.max,
      min: projectObjectCounterStepLimits.min
    }),
    suffix: normalizeProjectObjectCounterAffix(record.suffix)
  };
}

function normalizeProjectObjectCounterAffix(value: unknown) {
  return typeof value === "string" ? value.slice(0, projectObjectCounterAffixMaxLength) : "";
}

function normalizeProjectObjectScoreTrack(value: unknown): ProjectObjectScoreTrack {
  const defaultScoreTrack = getDefaultProjectObjectScoreTrack();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const minValue = normalizeIntegerNumber(
    record.minValue,
    defaultScoreTrack.minValue,
    projectObjectScoreTrackValueLimits
  );
  const step = normalizeIntegerNumber(
    record.step,
    defaultScoreTrack.step,
    projectObjectScoreTrackStepLimits
  );
  const maxValue = Math.max(
    minValue + step,
    normalizeIntegerNumber(
      record.maxValue,
      defaultScoreTrack.maxValue,
      projectObjectScoreTrackValueLimits
    )
  );

  return {
    markers: normalizeProjectObjectScoreTrackMarkers(
      record.markers,
      defaultScoreTrack.markers,
      minValue,
      maxValue
    ),
    maxValue,
    minValue,
    orientation: projectObjectScoreTrackOrientationSet.has(
      record.orientation as ProjectObjectScoreTrackOrientation
    )
      ? (record.orientation as ProjectObjectScoreTrackOrientation)
      : defaultScoreTrack.orientation,
    showLabels:
      typeof record.showLabels === "boolean" ? record.showLabels : defaultScoreTrack.showLabels,
    step
  };
}

function normalizeProjectObjectScoreTrackMarkers(
  value: unknown,
  fallbackMarkers: ProjectObjectScoreTrackMarker[],
  minValue: number,
  maxValue: number
): ProjectObjectScoreTrackMarker[] {
  const markers = Array.isArray(value) ? value : fallbackMarkers;

  return markers
    .slice(0, projectObjectScoreTrackMarkerCountLimits.max)
    .map((marker, index) =>
      normalizeProjectObjectScoreTrackMarker(
        marker,
        fallbackMarkers[index] ?? fallbackMarkers[0]!,
        minValue,
        maxValue
      )
    )
    .filter((marker): marker is ProjectObjectScoreTrackMarker => Boolean(marker.id));
}

function normalizeProjectObjectScoreTrackMarker(
  value: unknown,
  fallback: ProjectObjectScoreTrackMarker,
  minValue: number,
  maxValue: number
): ProjectObjectScoreTrackMarker {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const id = typeof record.id === "string" ? record.id.trim() : fallback.id;
  const label = typeof record.label === "string" ? record.label : fallback.label;
  const valueNumber = normalizeIntegerNumber(
    record.value,
    fallback.value,
    projectObjectScoreTrackValueLimits
  );

  return {
    color: normalizeHexColor(record.color, fallback.color),
    id,
    label: label.slice(0, projectObjectScoreTrackMarkerLabelMaxLength),
    value: Math.min(maxValue, Math.max(minValue, valueNumber))
  };
}

function normalizeProjectObjectDoubleSide(
  value: unknown,
  kind: ProjectObjectKind,
  name: string
): ProjectObjectDoubleSide {
  const defaultDoubleSide = getDefaultProjectObjectDoubleSide(kind);
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sideComponents = normalizeProjectObjectSideComponentOverrides(
    record.sideComponents,
    kind,
    name
  );
  const doubleSide: ProjectObjectDoubleSide = {
    enabled: typeof record.enabled === "boolean" ? record.enabled : defaultDoubleSide.enabled
  };

  if (sideComponents) {
    doubleSide.sideComponents = sideComponents;
  }

  return doubleSide;
}

function normalizeProjectObjectSideComponentOverrides(
  value: unknown,
  kind: ProjectObjectKind,
  name: string
): ProjectObjectDoubleSide["sideComponents"] {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sideComponents: Partial<Record<ProjectObjectSide, ProjectObjectSideComponents>> = {};

  for (const side of projectObjectSides) {
    const sideRecord = record[side];

    if (!sideRecord || typeof sideRecord !== "object") {
      continue;
    }

    const normalizedSideComponents = normalizeProjectObjectSideComponents(
      sideRecord as Record<string, unknown>,
      kind,
      name
    );

    if (Object.keys(normalizedSideComponents).length) {
      sideComponents[side] = normalizedSideComponents;
    }
  }

  return Object.keys(sideComponents).length ? sideComponents : undefined;
}

function normalizeProjectObjectSideComponents(
  record: Record<string, unknown>,
  kind: ProjectObjectKind,
  name: string
): ProjectObjectSideComponents {
  const components: ProjectObjectSideComponents = {};

  if (hasOwnRecordKey(record, "appearance")) {
    components.appearance = normalizeProjectObjectAppearance(record.appearance, kind);
  }

  if ((kind === "group" || kind === "card") && hasOwnRecordKey(record, "layout")) {
    components.layout = normalizeProjectObjectLayout(record.layout);
  }

  if (kind === "label" && hasOwnRecordKey(record, "text")) {
    components.text = normalizeProjectObjectText(record.text, kind, name);
  }

  if (kind === "image" && hasOwnRecordKey(record, "image")) {
    components.image = normalizeProjectObjectImage(record.image);
  }

  return components;
}

function normalizeProjectObjectDie(value: unknown): ProjectObjectDie {
  const defaultDie = getDefaultProjectObjectDie();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const faceCount = normalizeIntegerNumber(record.faceCount, defaultDie.faceCount, {
    max: projectObjectDieFaceCountLimits.max,
    min: projectObjectDieFaceCountLimits.min
  });
  const activeFace = normalizeIntegerNumber(record.activeFace, defaultDie.activeFace, {
    max: faceCount,
    min: 1
  });

  return {
    activeFace,
    faceCount,
    faces: normalizeProjectObjectDieFaces(record.faces, faceCount)
  };
}

function normalizeProjectObjectDieFaces(value: unknown, faceCount: number): ProjectObjectDieFace[] {
  const faces = Array.isArray(value) ? value : [];

  return Array.from({ length: faceCount }, (_, index) =>
    normalizeProjectObjectDieFace(faces[index], index + 1)
  );
}

function normalizeProjectObjectDieFace(value: unknown, faceNumber: number): ProjectObjectDieFace {
  const defaultFace = getDefaultProjectObjectDieFace(faceNumber);
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const imageAssetId = typeof record.imageAssetId === "string" ? record.imageAssetId.trim() : "";
  const label = typeof record.label === "string" ? record.label : defaultFace.label;

  return {
    imageAssetId: isSafeProjectImageAssetId(imageAssetId) ? imageAssetId : "",
    label: label.slice(0, projectObjectDieFaceLabelMaxLength),
    mode: projectObjectDieFaceModeSet.has(record.mode as ProjectObjectDieFaceMode)
      ? (record.mode as ProjectObjectDieFaceMode)
      : defaultFace.mode
  };
}

export function normalizeProjectObjectText(
  value: unknown,
  kind: ProjectObjectKind,
  name: string
): ProjectObjectText {
  const defaultText = getDefaultProjectObjectText(kind, name);
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const content = typeof record.content === "string" ? record.content : defaultText.content;

  return {
    autoFit: typeof record.autoFit === "boolean" ? record.autoFit : defaultText.autoFit,
    color: normalizeHexColor(record.color, defaultText.color),
    content: content.slice(0, maxProjectTextContentLength),
    effect: normalizeProjectObjectTextEffect(record.effect, defaultText.effect),
    fontFamily: projectObjectTextFontFamilySet.has(record.fontFamily as ProjectObjectTextFontFamily)
      ? (record.fontFamily as ProjectObjectTextFontFamily)
      : defaultText.fontFamily,
    fontSize: normalizeFiniteNumber(record.fontSize, defaultText.fontSize, {
      max: maxProjectTextFontSize,
      min: minProjectTextFontSize
    }),
    fontStyle: projectObjectTextFontStyles.has(record.fontStyle as ProjectObjectTextFontStyle)
      ? (record.fontStyle as ProjectObjectTextFontStyle)
      : defaultText.fontStyle,
    fontWeight: normalizeFiniteNumber(record.fontWeight, defaultText.fontWeight, {
      max: maxProjectTextFontWeight,
      min: minProjectTextFontWeight
    }),
    lineHeight: normalizeFiniteNumber(record.lineHeight, defaultText.lineHeight, {
      max: maxProjectTextLineHeight,
      min: minProjectTextLineHeight
    }),
    minFontSize: normalizeFiniteNumber(record.minFontSize, defaultText.minFontSize, {
      max: normalizeFiniteNumber(record.fontSize, defaultText.fontSize, {
        max: maxProjectTextFontSize,
        min: minProjectTextFontSize
      }),
      min: minProjectTextFontSize
    }),
    textAlign: projectObjectTextAligns.has(record.textAlign as ProjectObjectTextAlign)
      ? (record.textAlign as ProjectObjectTextAlign)
      : defaultText.textAlign,
    verticalAlign: projectObjectTextVerticalAligns.has(
      record.verticalAlign as ProjectObjectTextVerticalAlign
    )
      ? (record.verticalAlign as ProjectObjectTextVerticalAlign)
      : defaultText.verticalAlign
  };
}

function normalizeProjectObjectTextEffect(
  value: unknown,
  fallback: ProjectObjectText["effect"]
): ProjectObjectText["effect"] {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    color: normalizeHexColor(record.color, fallback.color),
    mode: projectObjectTextEffectModeSet.has(record.mode as ProjectObjectTextEffectMode)
      ? (record.mode as ProjectObjectTextEffectMode)
      : fallback.mode,
    strength: normalizeFiniteNumber(record.strength, fallback.strength, {
      max: maxProjectTextEffectStrength,
      min: 0
    })
  };
}

function normalizeProjectObjectImage(value: unknown): ProjectObjectImage {
  const defaultImage = getDefaultProjectObjectImage();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const assetId = typeof record.assetId === "string" ? record.assetId.trim() : "";

  return {
    assetId: isSafeProjectImageAssetId(assetId) ? assetId : defaultImage.assetId,
    fit: projectObjectImageFits.has(record.fit as ProjectObjectImageFit)
      ? (record.fit as ProjectObjectImageFit)
      : defaultImage.fit,
    positionX: normalizeFiniteNumber(record.positionX, defaultImage.positionX, {
      max: 100,
      min: 0
    }),
    positionY: normalizeFiniteNumber(record.positionY, defaultImage.positionY, {
      max: 100,
      min: 0
    })
  };
}

function normalizeProjectObjectIcon(value: unknown): ProjectObjectIcon {
  const defaultIcon = getDefaultProjectObjectIcon();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    color: normalizeHexColor(record.color, defaultIcon.color),
    style: projectObjectIconStyleSet.has(record.style as ProjectObjectIconStyle)
      ? (record.style as ProjectObjectIconStyle)
      : defaultIcon.style,
    symbol: projectObjectIconSymbolSet.has(record.symbol as ProjectObjectIconSymbol)
      ? (record.symbol as ProjectObjectIconSymbol)
      : defaultIcon.symbol
  };
}

function normalizeProjectObjectShape(
  value: unknown,
  kind: ProjectObjectKind = "shape"
): ProjectObjectShape {
  const defaultShape = getDefaultProjectObjectShape(kind);
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    polygonPoints: normalizeProjectObjectShapePolygonPoints(
      record.polygonPoints,
      defaultShape.polygonPoints ?? getDefaultProjectObjectShapePolygonPoints()
    ),
    variant: projectObjectShapeVariants.has(record.variant as ProjectObjectShapeVariant)
      ? (record.variant as ProjectObjectShapeVariant)
      : defaultShape.variant
  };
}

function normalizeProjectObjectShapePolygonPoints(
  value: unknown,
  fallback: readonly ProjectObjectShapePoint[]
): ProjectObjectShapePoint[] {
  if (!Array.isArray(value)) {
    return cloneProjectObjectShapePolygonPoints(fallback);
  }

  const points = value
    .slice(0, projectObjectShapePolygonPointCountLimits.max)
    .map(normalizeProjectObjectShapePolygonPoint)
    .filter((point): point is ProjectObjectShapePoint => Boolean(point));

  return points.length >= projectObjectShapePolygonPointCountLimits.min
    ? points
    : cloneProjectObjectShapePolygonPoints(fallback);
}

function normalizeProjectObjectShapePolygonPoint(
  value: unknown
): ProjectObjectShapePoint | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.x !== "number" ||
    !Number.isFinite(record.x) ||
    typeof record.y !== "number" ||
    !Number.isFinite(record.y)
  ) {
    return undefined;
  }

  return {
    x: normalizeFiniteNumber(record.x, 0, projectObjectShapePolygonCoordinateLimits),
    y: normalizeFiniteNumber(record.y, 0, projectObjectShapePolygonCoordinateLimits)
  };
}

function cloneProjectObjectShapePolygonPoints(
  points: readonly ProjectObjectShapePoint[]
): ProjectObjectShapePoint[] {
  return points.map((point) => ({ ...point }));
}
