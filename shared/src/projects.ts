export type ProjectSummary = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  tableSetupsCount: number;
  objectsCount: number;
  playtestsCount: number;
};

export type ProjectFileNodeType = "folder" | "file";

export type ProjectFileKind = "tableSetup" | "object" | "image" | "document";

export const projectAssetsFolderId = "assets";
export const projectAssetsFolderName = "Assets";

export const projectObjectKinds = [
  "group",
  "card",
  "deck",
  "stack",
  "bag",
  "zone",
  "meeple",
  "token",
  "tile",
  "counter",
  "scoreTrack",
  "die",
  "label",
  "image",
  "icon",
  "shape"
] as const;

export type ProjectObjectKind = (typeof projectObjectKinds)[number];

export const projectImageAssetContentTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export type ProjectImageAssetContentType = (typeof projectImageAssetContentTypes)[number];

export type ProjectImageAsset = {
  id: string;
  fileName: string;
  contentType: ProjectImageAssetContentType;
  byteSize: number;
  createdAt: string;
};

export type ProjectObjectBorderStyle = "none" | "solid" | "dashed" | "dotted";

export type ProjectCompositionGuideAxis = "horizontal" | "vertical";

export type ProjectCompositionGuide = {
  axis: ProjectCompositionGuideAxis;
  id: string;
  locked: boolean;
  position: number;
  visible: boolean;
};

export type ProjectCompositionSettings = {
  guides: ProjectCompositionGuide[];
  rulersVisible: boolean;
  snapToGuides: boolean;
  snapToObjects: boolean;
};

export type ProjectObjectAppearance = {
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderRadius: number;
  borderStyle: ProjectObjectBorderStyle;
  borderWidth: number;
  opacity: number;
  padding: number;
};

export type ProjectObjectTextAlign = "center" | "left" | "right";

export type ProjectObjectTextFontStyle = "italic" | "normal";

export type ProjectObjectTextVerticalAlign = "bottom" | "middle" | "top";

export const projectObjectTextFontFamilies = [
  "system",
  "serif",
  "mono",
  "rounded",
  "condensed"
] as const;

export type ProjectObjectTextFontFamily = (typeof projectObjectTextFontFamilies)[number];

export const projectObjectTextEffectModes = ["none", "shadow", "outline"] as const;

export type ProjectObjectTextEffectMode = (typeof projectObjectTextEffectModes)[number];

export type ProjectObjectTextEffect = {
  color: string;
  mode: ProjectObjectTextEffectMode;
  strength: number;
};

export type ProjectObjectText = {
  autoFit: boolean;
  color: string;
  content: string;
  effect: ProjectObjectTextEffect;
  fontFamily: ProjectObjectTextFontFamily;
  fontSize: number;
  fontStyle: ProjectObjectTextFontStyle;
  fontWeight: number;
  lineHeight: number;
  minFontSize: number;
  textAlign: ProjectObjectTextAlign;
  verticalAlign: ProjectObjectTextVerticalAlign;
};

export type ProjectObjectImageFit = "contain" | "cover" | "fill" | "scaleDown";

export type ProjectObjectImage = {
  assetId: string;
  fit: ProjectObjectImageFit;
  positionX: number;
  positionY: number;
};

export const projectObjectIconSymbols = [
  "star",
  "heart",
  "shield",
  "swords",
  "skull",
  "flame",
  "droplet",
  "leaf",
  "zap",
  "gem",
  "coins",
  "crown",
  "flag",
  "castle",
  "map",
  "compass",
  "dices",
  "target",
  "clock",
  "hash",
  "plus",
  "minus",
  "circle",
  "square",
  "triangle",
  "diamond",
  "hexagon",
  "user",
  "users"
] as const;

export type ProjectObjectIconSymbol = (typeof projectObjectIconSymbols)[number];

const projectObjectIconSymbolSet = new Set<ProjectObjectIconSymbol>(projectObjectIconSymbols);

export const projectObjectIconStyles = ["outline", "filled"] as const;

export type ProjectObjectIconStyle = (typeof projectObjectIconStyles)[number];

export type ProjectObjectIcon = {
  color: string;
  style: ProjectObjectIconStyle;
  symbol: ProjectObjectIconSymbol;
};

export const projectObjectCardCustomSizePresetId = "custom" as const;

export const projectObjectCardSizePresets = [
  { id: "poker", label: "Poker", width: 63, height: 88 },
  { id: "bridge", label: "Bridge", width: 57, height: 89 },
  { id: "standardAmerican", label: "Standard American", width: 56, height: 87 },
  { id: "standardEuro", label: "Standard Euro", width: 59, height: 92 },
  { id: "miniAmerican", label: "Mini American", width: 41, height: 63 },
  { id: "tarot", label: "Tarot", width: 70, height: 120 },
  { id: "square", label: "Square", width: 70, height: 70 }
] as const;

export type ProjectObjectCardSizePreset = (typeof projectObjectCardSizePresets)[number];

export type ProjectObjectCardSizePresetId = ProjectObjectCardSizePreset["id"];

export type ProjectObjectCardSizePresetValue =
  | ProjectObjectCardSizePresetId
  | typeof projectObjectCardCustomSizePresetId;

export const projectObjectSides = ["front", "back"] as const;

export type ProjectObjectSide = (typeof projectObjectSides)[number];

export type ProjectObjectCard = {
  sizePreset: ProjectObjectCardSizePresetValue;
};

export type ProjectObjectSized = {
  sizePreset: ProjectObjectCardSizePresetValue;
};

export const projectObjectContainerEntryQuantityLimits = {
  max: 999,
  min: 1
} as const;

export type ProjectObjectContainerEntry = {
  objectFileNodeId: string;
  quantity: number;
};

export type ProjectObjectContainer = {
  entries: ProjectObjectContainerEntry[];
};

export const projectObjectStackDisplayVisibleItemCountLimits = {
  max: 12,
  min: 1
} as const;

export const projectObjectStackDisplayOffsetLimits = {
  max: 24,
  min: -24
} as const;

export type ProjectObjectStackDisplay = {
  showCount: boolean;
  stackOffsetX: number;
  stackOffsetY: number;
  visibleItemCount: number;
};

export const projectObjectBagAppearanceVariants = ["bag", "box"] as const;

export type ProjectObjectBagAppearanceVariant = (typeof projectObjectBagAppearanceVariants)[number];

export type ProjectObjectBag = {
  appearanceVariant: ProjectObjectBagAppearanceVariant;
};

export const projectObjectMeepleVisualVariants = [
  "meeple",
  "pawn",
  "cube",
  "cylinder",
  "cone",
  "standee"
] as const;

export type ProjectObjectMeepleVisualVariant = (typeof projectObjectMeepleVisualVariants)[number];

export type ProjectObjectMeeple = {
  visualVariant: ProjectObjectMeepleVisualVariant;
};

export const projectObjectZoneCapacityLimits = {
  max: 999,
  min: 1
} as const;

export type ProjectObjectZone = {
  capacity: number;
  referenceObjectFileId: string;
};

export const projectObjectCounterBoundsModes = ["clamp", "none", "wrap"] as const;

export type ProjectObjectCounterBoundsMode = (typeof projectObjectCounterBoundsModes)[number];

export const projectObjectCounterDisplayModes = ["value", "valueAndMax"] as const;

export type ProjectObjectCounterDisplayMode = (typeof projectObjectCounterDisplayModes)[number];

export const projectObjectCounterValueLimits = {
  max: 999999,
  min: -999999
} as const;

export const projectObjectCounterStepLimits = {
  max: 999999,
  min: 1
} as const;

export const projectObjectCounterAffixMaxLength = 24;

export type ProjectObjectCounter = {
  boundsMode: ProjectObjectCounterBoundsMode;
  defaultValue: number;
  displayMode: ProjectObjectCounterDisplayMode;
  maxValue: number;
  minValue: number;
  prefix: string;
  step: number;
  suffix: string;
};

export const projectObjectScoreTrackOrientations = ["horizontal", "vertical"] as const;

export type ProjectObjectScoreTrackOrientation =
  (typeof projectObjectScoreTrackOrientations)[number];

export const projectObjectScoreTrackValueLimits = {
  max: 999999,
  min: -999999
} as const;

export const projectObjectScoreTrackStepLimits = {
  max: 999999,
  min: 1
} as const;

export const projectObjectScoreTrackMarkerLabelMaxLength = 32;

export const projectObjectScoreTrackMarkerCountLimits = {
  max: 12,
  min: 0
} as const;

export type ProjectObjectScoreTrackMarker = {
  color: string;
  id: string;
  label: string;
  value: number;
};

export type ProjectObjectScoreTrack = {
  markers: ProjectObjectScoreTrackMarker[];
  maxValue: number;
  minValue: number;
  orientation: ProjectObjectScoreTrackOrientation;
  showLabels: boolean;
  step: number;
};

export const projectObjectDieDefaultFaceCount = 6;

export const projectObjectDieFaceCountLimits = {
  max: 100,
  min: 2
} as const;

export const projectObjectDieFaceLabelMaxLength = 120;

export const projectObjectDieFaceModes = ["text", "image"] as const;

export type ProjectObjectDieFaceMode = (typeof projectObjectDieFaceModes)[number];

export type ProjectObjectDieFace = {
  imageAssetId: string;
  label: string;
  mode: ProjectObjectDieFaceMode;
};

export type ProjectObjectDie = {
  activeFace: number;
  faceCount: number;
  faces: ProjectObjectDieFace[];
};

export type ProjectObjectSideComponents = {
  appearance?: ProjectObjectAppearance;
  image?: ProjectObjectImage;
  layout?: ProjectObjectLayout;
  text?: ProjectObjectText;
};

export type ProjectObjectDoubleSide = {
  enabled: boolean;
  sideComponents?: Partial<Record<ProjectObjectSide, ProjectObjectSideComponents>>;
};

export type ProjectObjectLayoutMode = "free" | "grid" | "horizontal" | "vertical";

export type ProjectObjectLayoutAlignment = "center" | "end" | "start";

export type ProjectObjectLayoutJustification = "center" | "end" | "spaceBetween" | "start";

export type ProjectObjectLayout = {
  alignItems: ProjectObjectLayoutAlignment;
  columns: number;
  gap: number;
  justifyContent: ProjectObjectLayoutJustification;
  mode: ProjectObjectLayoutMode;
};

export type ProjectObjectShapeVariant =
  | "diamond"
  | "ellipse"
  | "hexagon"
  | "polygon"
  | "rectangle"
  | "triangle";

export type ProjectObjectShapePoint = {
  x: number;
  y: number;
};

export type ProjectObjectShape = {
  polygonPoints?: ProjectObjectShapePoint[];
  variant: ProjectObjectShapeVariant;
};

export const projectObjectShapePolygonPointCountLimits = {
  max: 32,
  min: 3
} as const;

export const projectObjectShapePolygonCoordinateLimits = {
  max: 100,
  min: 0
} as const;

export type ProjectObjectRectTransform = {
  height: number;
  pivotX: number;
  pivotY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  width: number;
  x: number;
  y: number;
};

export type ProjectObjectComponents = {
  appearance?: ProjectObjectAppearance;
  bag?: ProjectObjectBag;
  card?: ProjectObjectCard;
  composition?: ProjectCompositionSettings;
  container?: ProjectObjectContainer;
  counter?: ProjectObjectCounter;
  die?: ProjectObjectDie;
  doubleSide?: ProjectObjectDoubleSide;
  icon?: ProjectObjectIcon;
  image?: ProjectObjectImage;
  layout?: ProjectObjectLayout;
  meeple?: ProjectObjectMeeple;
  rectTransform?: ProjectObjectRectTransform;
  scoreTrack?: ProjectObjectScoreTrack;
  shape?: ProjectObjectShape;
  stackDisplay?: ProjectObjectStackDisplay;
  text?: ProjectObjectText;
  zone?: ProjectObjectZone;
};

export const projectObjectVariableTypes = ["text", "image", "number", "color"] as const;

export type ProjectObjectVariableType = (typeof projectObjectVariableTypes)[number];

export type ProjectObjectVariableValue = string | number;

export type ProjectObjectVariableDefinition = {
  id: string;
  name: string;
  type: ProjectObjectVariableType;
  defaultValue: ProjectObjectVariableValue;
};

export type ProjectObjectTemplate = {
  variables: ProjectObjectVariableDefinition[];
};

export const projectObjectVariableBindingTargets = [
  "appearance.backgroundColor",
  "appearance.borderColor",
  "icon.color",
  "icon.symbol",
  "image.assetId",
  "text.color",
  "text.content"
] as const;

export type ProjectObjectVariableBindingTarget =
  (typeof projectObjectVariableBindingTargets)[number];

export type ProjectObjectVariableBinding = {
  variableId: string;
  target: ProjectObjectVariableBindingTarget;
};

export type ProjectObjectSourceRef = {
  sourceObjectFileNodeId: string;
  values: Record<string, ProjectObjectVariableValue>;
};

export type ProjectObjectNode = {
  parentSide?: ProjectObjectSide;
  id: string;
  name: string;
  kind: ProjectObjectKind;
  locked?: boolean;
  visible: boolean;
  bindings?: ProjectObjectVariableBinding[];
  components?: ProjectObjectComponents;
  children?: ProjectObjectNode[];
};

export type ProjectTableSetupGrid = {
  size: number;
  snap: boolean;
  visible: boolean;
};

export type ProjectTableSetupItemTransform = {
  rotation: number;
  scaleX: number;
  scaleY: number;
  x: number;
  y: number;
};

export type ProjectTableSetupLinkedObjectItem = {
  id: string;
  name: string;
  sourceObjectFileNodeId: string;
  transform: ProjectTableSetupItemTransform;
  type: "linkedObject";
  values: Record<string, ProjectObjectVariableValue>;
  locked?: boolean;
  visible: boolean;
};

export type ProjectTableSetupLocalObjectItem = {
  object: ProjectObjectNode;
  type: "localObject";
};

export type ProjectTableSetupItem =
  | ProjectTableSetupLinkedObjectItem
  | ProjectTableSetupLocalObjectItem;

export type ProjectTableSetup = {
  backgroundColor: string;
  composition?: ProjectCompositionSettings;
  grid: ProjectTableSetupGrid;
  height: number;
  items: ProjectTableSetupItem[];
  width: number;
};

export type ProjectFileNode = {
  id: string;
  name: string;
  type: ProjectFileNodeType;
  kind?: ProjectFileKind;
  children?: ProjectFileNode[];
  imageAsset?: ProjectImageAsset;
  objectTree?: ProjectObjectNode[];
  sourceRef?: ProjectObjectSourceRef;
  tableSetup?: ProjectTableSetup;
  template?: ProjectObjectTemplate;
};

export type Project = ProjectSummary & {
  notes: string;
  fileTree: ProjectFileNode[];
};

export type ListProjectsResponse = {
  projects: ProjectSummary[];
};

export type GetProjectResponse = {
  project: Project;
};

export type CreateProjectRequest = {
  name: string;
  description?: string;
};

export type CreateProjectResponse = {
  project: Project;
};

export type UpdateProjectFileTreeRequest = {
  fileTree: ProjectFileNode[];
};

export type UpdateProjectFileTreeResponse = {
  project: Project;
};

export type UploadProjectImageAssetResponse = {
  imageAsset: ProjectImageAsset;
};

export type ApiErrorResponse = {
  message: string;
};

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
    capacity: 1,
    referenceObjectFileId: ""
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

export function normalizeProjectObjectZoneCapacity(
  value: number,
  fallback = getDefaultProjectObjectZone().capacity
) {
  const capacity = Number.isFinite(value) ? Math.round(value) : fallback;

  return Math.min(
    projectObjectZoneCapacityLimits.max,
    Math.max(projectObjectZoneCapacityLimits.min, capacity)
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

export const defaultProjectTableSetupBackgroundColor = "#6f8b70";

export const projectTableSetupSizeLimits = {
  max: 5000,
  min: 100
} as const;

export const projectTableSetupGridSizeLimits = {
  max: 500,
  min: 5
} as const;

export function getDefaultProjectTableSetupGrid(): ProjectTableSetupGrid {
  return {
    size: 50,
    snap: false,
    visible: true
  };
}

export function getDefaultProjectTableSetupItemTransform(): ProjectTableSetupItemTransform {
  return {
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    x: 0,
    y: 0
  };
}

export function getDefaultProjectTableSetup(): ProjectTableSetup {
  return {
    backgroundColor: defaultProjectTableSetupBackgroundColor,
    composition: getDefaultProjectCompositionSettings(),
    grid: getDefaultProjectTableSetupGrid(),
    height: 600,
    items: [],
    width: 900
  };
}

export function getProjectObjectVariableDefaultValues(
  template: ProjectObjectTemplate | undefined
): Record<string, ProjectObjectVariableValue> {
  const values: Record<string, ProjectObjectVariableValue> = {};

  for (const variable of template?.variables ?? []) {
    values[variable.id] = variable.defaultValue;
  }

  return values;
}

export function resolveProjectObjectFileObjectTree(
  fileTree: readonly ProjectFileNode[],
  fileNode: ProjectFileNode | null | undefined
): ProjectObjectNode[] {
  if (!fileNode || fileNode.type !== "file") {
    return [];
  }

  if (fileNode.kind === "object") {
    return resolveProjectObjectFileObjectTreeById(fileTree, fileNode.id, undefined, new Set());
  }

  return [];
}

export function resolveProjectObjectFileObjectTreeById(
  fileTree: readonly ProjectFileNode[],
  objectFileNodeId: string,
  overrideValues: Record<string, ProjectObjectVariableValue> = {},
  seenObjectFileNodeIds: Set<string> = new Set()
): ProjectObjectNode[] {
  const fileNode = findProjectFileNodeInTree(fileTree, objectFileNodeId);

  if (!fileNode || fileNode.type !== "file" || fileNode.kind !== "object") {
    return [];
  }

  if (seenObjectFileNodeIds.has(fileNode.id)) {
    return [];
  }

  seenObjectFileNodeIds.add(fileNode.id);

  if (fileNode.sourceRef) {
    return resolveProjectObjectFileObjectTreeById(
      fileTree,
      fileNode.sourceRef.sourceObjectFileNodeId,
      {
        ...fileNode.sourceRef.values,
        ...overrideValues
      },
      seenObjectFileNodeIds
    );
  }

  const template = fileNode.template;
  const values = {
    ...getProjectObjectVariableDefaultValues(template),
    ...overrideValues
  };

  return resolveProjectObjectTreeVariables(fileNode.objectTree ?? [], template, values);
}

export function getProjectTableSetupItemId(item: ProjectTableSetupItem) {
  return item.type === "linkedObject" ? item.id : item.object.id;
}

export function getProjectTableSetupItemName(item: ProjectTableSetupItem) {
  return item.type === "linkedObject" ? item.name : item.object.name;
}

export function getProjectTableSetupItemVisible(item: ProjectTableSetupItem) {
  return item.type === "linkedObject" ? item.visible : item.object.visible;
}

export function getProjectTableSetupItemLocked(item: ProjectTableSetupItem) {
  return item.type === "linkedObject" ? item.locked === true : item.object.locked === true;
}

export function resolveProjectTableSetupItemObject(
  fileTree: readonly ProjectFileNode[],
  item: ProjectTableSetupItem
): ProjectObjectNode | null {
  if (item.type === "localObject") {
    return item.object;
  }

  const sourceRoot = resolveProjectObjectFileObjectTreeById(
    fileTree,
    item.sourceObjectFileNodeId,
    item.values,
    new Set()
  )[0];

  if (!sourceRoot) {
    return null;
  }

  const sourceRectTransform = {
    ...getDefaultProjectObjectRectTransform(sourceRoot.kind),
    ...sourceRoot.components?.rectTransform
  };

  return {
    ...sourceRoot,
    id: item.id,
    locked: item.locked === true,
    name: item.name,
    visible: item.visible,
    components: {
      ...sourceRoot.components,
      rectTransform: {
        ...sourceRectTransform,
        rotation: item.transform.rotation,
        scaleX: item.transform.scaleX,
        scaleY: item.transform.scaleY,
        x: item.transform.x,
        y: item.transform.y
      }
    }
  };
}

export function resolveProjectObjectTreeVariables(
  objectTree: readonly ProjectObjectNode[],
  template: ProjectObjectTemplate | undefined,
  values: Record<string, ProjectObjectVariableValue>
): ProjectObjectNode[] {
  const variableById = new Map(
    (template?.variables ?? []).map((variable) => [variable.id, variable])
  );

  return objectTree.map((object) =>
    resolveProjectObjectNodeVariables(object, variableById, values)
  );
}

export function findProjectFileNodeInTree(
  fileTree: readonly ProjectFileNode[],
  nodeId: string
): ProjectFileNode | undefined {
  for (const node of fileTree) {
    if (node.id === nodeId) {
      return node;
    }

    if (node.type === "folder") {
      const child = findProjectFileNodeInTree(node.children ?? [], nodeId);

      if (child) {
        return child;
      }
    }
  }

  return undefined;
}

function resolveProjectObjectNodeVariables(
  object: ProjectObjectNode,
  variableById: ReadonlyMap<string, ProjectObjectVariableDefinition>,
  values: Record<string, ProjectObjectVariableValue>
): ProjectObjectNode {
  const components = resolveProjectObjectNodeComponentVariables(object, variableById, values);
  const children = object.children?.map((child) =>
    resolveProjectObjectNodeVariables(child, variableById, values)
  );

  return {
    ...object,
    ...(components ? { components } : {}),
    ...(children ? { children } : {})
  };
}

function resolveProjectObjectNodeComponentVariables(
  object: ProjectObjectNode,
  variableById: ReadonlyMap<string, ProjectObjectVariableDefinition>,
  values: Record<string, ProjectObjectVariableValue>
): ProjectObjectComponents | undefined {
  let components = object.components;

  for (const binding of object.bindings ?? []) {
    const variable = variableById.get(binding.variableId);

    if (!variable || !isProjectObjectVariableTargetCompatible(variable.type, binding.target)) {
      continue;
    }

    const value = values[binding.variableId] ?? variable.defaultValue;
    components = getProjectObjectComponentsWithBoundValue(components, binding.target, value);
  }

  return components;
}

function isProjectObjectVariableTargetCompatible(
  type: ProjectObjectVariableType,
  target: ProjectObjectVariableBindingTarget
) {
  if (target === "text.content") {
    return type === "text" || type === "number";
  }

  if (target === "icon.symbol") {
    return type === "text";
  }

  if (
    target === "appearance.backgroundColor" ||
    target === "appearance.borderColor" ||
    target === "icon.color" ||
    target === "text.color"
  ) {
    return type === "color";
  }

  return type === "image";
}

function getProjectObjectComponentsWithBoundValue(
  components: ProjectObjectComponents | undefined,
  target: ProjectObjectVariableBindingTarget,
  value: ProjectObjectVariableValue
): ProjectObjectComponents | undefined {
  if (!components) {
    return components;
  }

  if (target === "appearance.backgroundColor" && components.appearance) {
    return {
      ...components,
      appearance: {
        ...components.appearance,
        backgroundColor: String(value)
      }
    };
  }

  if (target === "appearance.borderColor" && components.appearance) {
    return {
      ...components,
      appearance: {
        ...components.appearance,
        borderColor: String(value)
      }
    };
  }

  if (target === "image.assetId" && components.image) {
    return {
      ...components,
      image: {
        ...components.image,
        assetId: String(value)
      }
    };
  }

  if (target === "icon.color" && components.icon) {
    return {
      ...components,
      icon: {
        ...components.icon,
        color: String(value)
      }
    };
  }

  if (target === "icon.symbol" && components.icon) {
    const symbol = getProjectObjectIconSymbol(String(value));

    if (!symbol) {
      return components;
    }

    return {
      ...components,
      icon: {
        ...components.icon,
        symbol
      }
    };
  }

  if (target === "text.color" && components.text) {
    return {
      ...components,
      text: {
        ...components.text,
        color: String(value)
      }
    };
  }

  if (target === "text.content" && components.text) {
    return {
      ...components,
      text: {
        ...components.text,
        content: String(value)
      }
    };
  }

  return components;
}
