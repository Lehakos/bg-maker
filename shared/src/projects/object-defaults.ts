import {
  projectObjectCardSizePresets,
  projectObjectDieDefaultFaceCount,
  projectObjectDieFaceCountLimits,
  projectObjectIconSymbols,
  projectObjectZoneSlotLimits
} from "./objects.js";
import type {
  ProjectCompositionSettings,
  ProjectObjectAppearance,
  ProjectObjectBag,
  ProjectObjectCard,
  ProjectObjectCardSizePreset,
  ProjectObjectCardSizePresetValue,
  ProjectObjectComponents,
  ProjectObjectContainer,
  ProjectObjectCounter,
  ProjectObjectDie,
  ProjectObjectDieFace,
  ProjectObjectDoubleSide,
  ProjectObjectIcon,
  ProjectObjectIconSymbol,
  ProjectObjectImage,
  ProjectObjectKind,
  ProjectObjectLayout,
  ProjectObjectMeeple,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectObjectScoreTrack,
  ProjectObjectShape,
  ProjectObjectShapePoint,
  ProjectObjectSized,
  ProjectObjectStackDisplay,
  ProjectObjectTemplate,
  ProjectObjectText,
  ProjectObjectTextEffect,
  ProjectObjectVariableType,
  ProjectObjectVariableValue,
  ProjectObjectZone
} from "./objects.js";

const projectObjectIconSymbolSet = new Set<ProjectObjectIconSymbol>(projectObjectIconSymbols);

const defaultProjectObjectSizes: Record<ProjectObjectKind, { height: number; width: number }> = {
  bag: { height: 96, width: 96 },
  card: { height: 88, width: 63 },
  counter: { height: 64, width: 112 },
  deck: { height: 88, width: 63 },
  die: { height: 120, width: 120 },
  group: { height: 240, width: 320 },
  icon: { height: 48, width: 48 },
  image: { height: 180, width: 240 },
  label: { height: 32, width: 160 },
  meeple: { height: 80, width: 80 },
  scoreTrack: { height: 96, width: 360 },
  shape: { height: 120, width: 120 },
  stack: { height: 96, width: 96 },
  tile: { height: 80, width: 80 },
  token: { height: 80, width: 80 },
  zone: { height: 120, width: 180 }
};

const defaultProjectObjectNames: Record<ProjectObjectKind, string> = {
  bag: "New bag",
  card: "New card",
  counter: "New counter",
  deck: "New deck",
  die: "New die",
  group: "New group",
  icon: "New icon",
  image: "New image",
  label: "New label",
  meeple: "New meeple",
  scoreTrack: "New score track",
  shape: "New shape",
  stack: "New stack",
  tile: "New tile",
  token: "New token",
  zone: "New zone"
};

const defaultProjectObjectAppearances: Record<ProjectObjectKind, ProjectObjectAppearance> = {
  bag: {
    backgroundColor: "#f5f3ff",
    backgroundOpacity: 1,
    borderColor: "#7c3aed",
    borderRadius: 16,
    borderStyle: "solid",
    borderWidth: 2,
    opacity: 1,
    padding: 8
  },
  card: {
    backgroundColor: "#ffffff",
    backgroundOpacity: 1,
    borderColor: "#94a3b8",
    borderRadius: 5,
    borderStyle: "solid",
    borderWidth: 1,
    opacity: 1,
    padding: 0
  },
  counter: {
    backgroundColor: "#eff6ff",
    backgroundOpacity: 1,
    borderColor: "#2563eb",
    borderRadius: 8,
    borderStyle: "solid",
    borderWidth: 2,
    opacity: 1,
    padding: 8
  },
  scoreTrack: {
    backgroundColor: "#f8fafc",
    backgroundOpacity: 1,
    borderColor: "#64748b",
    borderRadius: 8,
    borderStyle: "solid",
    borderWidth: 1,
    opacity: 1,
    padding: 10
  },
  deck: {
    backgroundColor: "#e0f2fe",
    backgroundOpacity: 1,
    borderColor: "#0284c7",
    borderRadius: 5,
    borderStyle: "solid",
    borderWidth: 2,
    opacity: 1,
    padding: 0
  },
  die: {
    backgroundColor: "#ffffff",
    backgroundOpacity: 1,
    borderColor: "#f59e0b",
    borderRadius: 14,
    borderStyle: "solid",
    borderWidth: 2,
    opacity: 1,
    padding: 8
  },
  group: {
    backgroundColor: "#f0fdfa",
    backgroundOpacity: 1,
    borderColor: "#14b8a6",
    borderRadius: 6,
    borderStyle: "dashed",
    borderWidth: 2,
    opacity: 1,
    padding: 0
  },
  icon: {
    backgroundColor: "#ffffff",
    backgroundOpacity: 0,
    borderColor: "#cbd5e1",
    borderRadius: 0,
    borderStyle: "none",
    borderWidth: 0,
    opacity: 1,
    padding: 0
  },
  image: {
    backgroundColor: "#f8fafc",
    backgroundOpacity: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    borderStyle: "solid",
    borderWidth: 1,
    opacity: 1,
    padding: 0
  },
  label: {
    backgroundColor: "#ffffff",
    backgroundOpacity: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    borderStyle: "none",
    borderWidth: 0,
    opacity: 1,
    padding: 6
  },
  meeple: {
    backgroundColor: "#fee2e2",
    backgroundOpacity: 1,
    borderColor: "#dc2626",
    borderRadius: 8,
    borderStyle: "solid",
    borderWidth: 2,
    opacity: 1,
    padding: 0
  },
  shape: {
    backgroundColor: "#d1fae5",
    backgroundOpacity: 1,
    borderColor: "#10b981",
    borderRadius: 6,
    borderStyle: "solid",
    borderWidth: 1,
    opacity: 1,
    padding: 8
  },
  stack: {
    backgroundColor: "#f1f5f9",
    backgroundOpacity: 1,
    borderColor: "#475569",
    borderRadius: 8,
    borderStyle: "solid",
    borderWidth: 2,
    opacity: 1,
    padding: 8
  },
  token: {
    backgroundColor: "#fef3c7",
    backgroundOpacity: 1,
    borderColor: "#d97706",
    borderRadius: 999,
    borderStyle: "solid",
    borderWidth: 2,
    opacity: 1,
    padding: 6
  },
  tile: {
    backgroundColor: "#fefce8",
    backgroundOpacity: 1,
    borderColor: "#ca8a04",
    borderRadius: 4,
    borderStyle: "solid",
    borderWidth: 2,
    opacity: 1,
    padding: 4
  },
  zone: {
    backgroundColor: "#ecfeff",
    backgroundOpacity: 0.45,
    borderColor: "#0891b2",
    borderRadius: 6,
    borderStyle: "dashed",
    borderWidth: 2,
    opacity: 1,
    padding: 8
  }
};

export function getDefaultProjectObjectName(kind: ProjectObjectKind = "group") {
  return defaultProjectObjectNames[kind];
}

export function getDefaultProjectObjectRectTransform(
  kind: ProjectObjectKind = "group"
): ProjectObjectRectTransform {
  const size = defaultProjectObjectSizes[kind];

  return {
    height: size.height,
    pivotX: 0.5,
    pivotY: 0.5,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    width: size.width,
    x: 0,
    y: 0
  };
}

export function getDefaultProjectObjectAppearance(
  kind: ProjectObjectKind = "group"
): ProjectObjectAppearance {
  return {
    ...defaultProjectObjectAppearances[kind]
  };
}

export function getDefaultProjectCompositionSettings(): ProjectCompositionSettings {
  return {
    guides: [],
    rulersVisible: true,
    snapToGuides: true,
    snapToObjects: true
  };
}

export function getDefaultProjectObjectTextEffect(): ProjectObjectTextEffect {
  return {
    color: "#ffffff",
    mode: "none",
    strength: 2
  };
}

export function getDefaultProjectObjectText(
  kind: ProjectObjectKind = "label",
  content = getDefaultProjectObjectName(kind)
): ProjectObjectText {
  return {
    autoFit: false,
    color: "#0f172a",
    content: kind === "label" ? content : "",
    effect: getDefaultProjectObjectTextEffect(),
    fontFamily: "system",
    fontSize: 16,
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: 1.2,
    minFontSize: 8,
    textAlign: "center",
    verticalAlign: "middle"
  };
}

export function getDefaultProjectObjectImage(): ProjectObjectImage {
  return {
    assetId: "",
    fit: "contain",
    positionX: 50,
    positionY: 50
  };
}

export function getDefaultProjectObjectIcon(): ProjectObjectIcon {
  return {
    color: "#0f172a",
    style: "outline",
    symbol: "star"
  };
}

export function getDefaultProjectObjectCard(): ProjectObjectCard {
  return {
    sizePreset: "poker"
  };
}

export function getProjectObjectContainerAcceptedObjectKinds(
  kind: ProjectObjectKind = "group"
): ProjectObjectKind[] {
  if (kind === "deck") {
    return ["card"];
  }

  if (kind === "bag") {
    return ["token", "tile", "meeple"];
  }

  if (kind === "stack") {
    return ["token", "tile", "meeple"];
  }

  return [];
}

export function getDefaultProjectObjectContainer(
  kind: ProjectObjectKind = "group"
): ProjectObjectContainer {
  void kind;

  return {
    entries: []
  };
}

export function getDefaultProjectObjectTemplate(): ProjectObjectTemplate {
  return {
    variables: []
  };
}

export function getDefaultProjectObjectVariableValue(
  type: ProjectObjectVariableType
): ProjectObjectVariableValue {
  if (type === "number") {
    return 0;
  }

  if (type === "color") {
    return "#000000";
  }

  return "";
}

export function getDefaultProjectObjectStackDisplay(): ProjectObjectStackDisplay {
  return {
    showCount: true,
    stackOffsetX: 2,
    stackOffsetY: -2,
    visibleItemCount: 4
  };
}

export function getDefaultProjectObjectBag(): ProjectObjectBag {
  return {
    appearanceVariant: "bag"
  };
}

export function getDefaultProjectObjectScoreTrack(): ProjectObjectScoreTrack {
  return {
    markers: [
      { color: "#dc2626", id: "player-1", label: "Player 1", value: 0 },
      { color: "#2563eb", id: "player-2", label: "Player 2", value: 0 }
    ],
    maxValue: 10,
    minValue: 0,
    orientation: "horizontal",
    showLabels: true,
    step: 1
  };
}

export function getDefaultProjectObjectMeeple(): ProjectObjectMeeple {
  return {
    visualVariant: "meeple"
  };
}

export function getDefaultProjectObjectZone(): ProjectObjectZone {
  return {
    mode: "free",
    sizeReferenceObjectFileId: "",
    slots: 1
  };
}

export function getDefaultProjectObjectCounter(): ProjectObjectCounter {
  return {
    boundsMode: "clamp",
    defaultValue: 0,
    displayMode: "value",
    maxValue: 10,
    minValue: 0,
    prefix: "",
    step: 1,
    suffix: ""
  };
}

export function getDefaultProjectObjectDieFace(faceNumber: number): ProjectObjectDieFace {
  const normalizedFaceNumber = Math.max(
    1,
    Math.round(Number.isFinite(faceNumber) ? faceNumber : 1)
  );

  return {
    imageAssetId: "",
    label: String(normalizedFaceNumber),
    mode: "text"
  };
}

export function getDefaultProjectObjectDieFaces(
  faceCount = projectObjectDieDefaultFaceCount
): ProjectObjectDieFace[] {
  const normalizedFaceCount = normalizeProjectObjectDieFaceCount(faceCount);

  return Array.from({ length: normalizedFaceCount }, (_, index) =>
    getDefaultProjectObjectDieFace(index + 1)
  );
}

export function getDefaultProjectObjectDie(): ProjectObjectDie {
  return {
    activeFace: 1,
    faceCount: projectObjectDieDefaultFaceCount,
    faces: getDefaultProjectObjectDieFaces(projectObjectDieDefaultFaceCount)
  };
}

export function getDefaultProjectObjectDoubleSide(
  kind: ProjectObjectKind = "card"
): ProjectObjectDoubleSide {
  return {
    enabled: hasProjectObjectSides(kind)
  };
}

export function getDefaultProjectObjectLayout(
  kind: ProjectObjectKind = "group"
): ProjectObjectLayout {
  return {
    alignItems: "start",
    columns: 3,
    gap: 8,
    justifyContent: "start",
    mode: kind === "zone" ? "grid" : "free"
  };
}

export function getProjectObjectCardSizePreset(
  sizePreset: ProjectObjectCardSizePresetValue | string
): ProjectObjectCardSizePreset | undefined {
  return projectObjectCardSizePresets.find((preset) => preset.id === sizePreset);
}

export function isProjectObjectSizePresetLocked(sizedObject: ProjectObjectSized) {
  return Boolean(getProjectObjectCardSizePreset(sizedObject.sizePreset));
}

export function isProjectObjectCardSizePresetLocked(card: ProjectObjectSized) {
  return isProjectObjectSizePresetLocked(card);
}

export function getProjectObjectRectTransformWithSizePreset(
  rectTransform: ProjectObjectRectTransform,
  sizedObject: ProjectObjectSized
): ProjectObjectRectTransform {
  const preset = getProjectObjectCardSizePreset(sizedObject.sizePreset);

  if (!preset) {
    return rectTransform;
  }

  return {
    ...rectTransform,
    height: preset.height,
    scaleX: 1,
    scaleY: 1,
    width: preset.width
  };
}

export function getProjectObjectRectTransformWithCardSizePreset(
  rectTransform: ProjectObjectRectTransform,
  card: ProjectObjectSized
): ProjectObjectRectTransform {
  return getProjectObjectRectTransformWithSizePreset(rectTransform, card);
}

export function getProjectObjectContainerTotalCount(container: ProjectObjectContainer) {
  return container.entries.reduce((total, entry) => total + entry.quantity, 0);
}

export function normalizeProjectObjectDieFaceCount(
  value: number,
  fallback = projectObjectDieDefaultFaceCount
) {
  const faceCount = Number.isFinite(value) ? Math.round(value) : fallback;

  return Math.min(
    projectObjectDieFaceCountLimits.max,
    Math.max(projectObjectDieFaceCountLimits.min, faceCount)
  );
}

export function normalizeProjectObjectDieActiveFace(
  value: number,
  faceCount: number,
  fallback = 1
) {
  const normalizedFaceCount = normalizeProjectObjectDieFaceCount(faceCount);
  const activeFace = Number.isFinite(value) ? Math.round(value) : fallback;

  return Math.min(normalizedFaceCount, Math.max(1, activeFace));
}

export function normalizeProjectObjectZoneSlots(
  value: number,
  fallback = getDefaultProjectObjectZone().slots
) {
  const slots = Number.isFinite(value) ? Math.round(value) : fallback;

  return Math.min(
    projectObjectZoneSlotLimits.max,
    Math.max(projectObjectZoneSlotLimits.min, slots)
  );
}

export function hasProjectObjectLayout(kind: ProjectObjectKind) {
  return kind === "group" || kind === "card" || kind === "zone";
}

export function hasProjectObjectSides(kind: ProjectObjectKind) {
  return kind === "card" || kind === "token" || kind === "tile";
}

export function doesProjectObjectClipChildren(kind: ProjectObjectKind) {
  return (
    kind === "card" ||
    kind === "bag" ||
    kind === "counter" ||
    kind === "deck" ||
    kind === "die" ||
    kind === "meeple" ||
    kind === "scoreTrack" ||
    kind === "shape" ||
    kind === "stack" ||
    kind === "tile" ||
    kind === "token"
  );
}

export function getProjectObjectIconSymbol(value: string): ProjectObjectIconSymbol | null {
  return projectObjectIconSymbolSet.has(value as ProjectObjectIconSymbol)
    ? (value as ProjectObjectIconSymbol)
    : null;
}

const defaultProjectObjectShapePolygonPoints: readonly ProjectObjectShapePoint[] = [
  { x: 50, y: 4 },
  { x: 96, y: 50 },
  { x: 50, y: 96 },
  { x: 4, y: 50 }
];

export function getDefaultProjectObjectShapePolygonPoints(): ProjectObjectShapePoint[] {
  return defaultProjectObjectShapePolygonPoints.map((point) => ({ ...point }));
}

export function getDefaultProjectObjectShape(
  kind: ProjectObjectKind = "shape"
): ProjectObjectShape {
  return {
    polygonPoints: getDefaultProjectObjectShapePolygonPoints(),
    variant: kind === "token" ? "ellipse" : "rectangle"
  };
}

export function createDefaultProjectObjectComponents(
  kind: ProjectObjectKind = "group",
  name = getDefaultProjectObjectName(kind)
): ProjectObjectComponents {
  const components: ProjectObjectComponents = {
    appearance: getDefaultProjectObjectAppearance(kind),
    composition: getDefaultProjectCompositionSettings(),
    rectTransform: getDefaultProjectObjectRectTransform(kind)
  };

  if (kind === "group") {
    components.layout = getDefaultProjectObjectLayout();
  }

  if (kind === "card") {
    components.card = getDefaultProjectObjectCard();
    components.doubleSide = getDefaultProjectObjectDoubleSide(kind);
    components.layout = getDefaultProjectObjectLayout(kind);
  }

  if (kind === "deck") {
    components.container = getDefaultProjectObjectContainer(kind);
    components.stackDisplay = getDefaultProjectObjectStackDisplay();
  }

  if (kind === "stack") {
    components.container = getDefaultProjectObjectContainer(kind);
    components.stackDisplay = getDefaultProjectObjectStackDisplay();
  }

  if (kind === "bag") {
    components.bag = getDefaultProjectObjectBag();
    components.container = getDefaultProjectObjectContainer(kind);
  }

  if (kind === "zone") {
    components.layout = getDefaultProjectObjectLayout(kind);
    components.zone = getDefaultProjectObjectZone();
  }

  if (kind === "counter") {
    components.counter = getDefaultProjectObjectCounter();
  }

  if (kind === "scoreTrack") {
    components.scoreTrack = getDefaultProjectObjectScoreTrack();
  }

  if (kind === "die") {
    components.die = getDefaultProjectObjectDie();
  }

  if (kind === "meeple") {
    components.meeple = getDefaultProjectObjectMeeple();
  }

  if (kind === "token" || kind === "tile") {
    components.doubleSide = getDefaultProjectObjectDoubleSide(kind);
    components.shape = getDefaultProjectObjectShape(kind);
  }

  if (kind === "label") {
    components.text = getDefaultProjectObjectText(kind, name);
  }

  if (kind === "image") {
    components.image = getDefaultProjectObjectImage();
  }

  if (kind === "icon") {
    components.icon = getDefaultProjectObjectIcon();
  }

  if (kind === "shape") {
    components.shape = getDefaultProjectObjectShape();
  }

  return components;
}

export function createDefaultProjectObjectNode(
  id: string,
  kind: ProjectObjectKind = "group",
  name = getDefaultProjectObjectName(kind)
): ProjectObjectNode {
  return {
    id,
    name: name.trim() || getDefaultProjectObjectName(kind),
    kind,
    locked: false,
    visible: true,
    children: [],
    components: createDefaultProjectObjectComponents(kind, name)
  };
}
