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

export const projectObjectZoneModes = ["free", "slots"] as const;

export type ProjectObjectZoneMode = (typeof projectObjectZoneModes)[number];

export const projectObjectZoneSlotLimits = {
  max: 999,
  min: 1
} as const;

export type ProjectObjectZone = {
  mode: ProjectObjectZoneMode;
  sizeReferenceObjectFileId: string;
  slots: number;
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

export type ProjectObjectRuleConditionConnector = "and" | "or";

export type ProjectObjectRulePlayerTarget = "activePlayer" | "shared";

export type ProjectObjectRuleCounterOperator = "atLeast" | "atMost" | "equals";

export type ProjectObjectRuleConditionBase = {
  connector?: ProjectObjectRuleConditionConnector;
  id: string;
};

export type ProjectObjectRuleCounterCondition = ProjectObjectRuleConditionBase & {
  counterId: string;
  operator: ProjectObjectRuleCounterOperator;
  target: ProjectObjectRulePlayerTarget;
  type: "counter";
  value: number;
};

export type ProjectObjectRuleCardInZoneRoleCondition = ProjectObjectRuleConditionBase & {
  owner: ProjectObjectRulePlayerTarget;
  role: string;
  type: "cardInZoneRole";
};

export type ProjectObjectRuleCondition =
  | ProjectObjectRuleCardInZoneRoleCondition
  | ProjectObjectRuleCounterCondition;

export type ProjectObjectRuleModifyCounterEffect = {
  amount: number;
  counterId: string;
  id: string;
  target: ProjectObjectRulePlayerTarget;
  type: "modifyCounter";
};

export type ProjectObjectRuleMoveThisCardToZoneRoleEffect = {
  id: string;
  owner: ProjectObjectRulePlayerTarget;
  role: string;
  side: ProjectObjectSide;
  type: "moveThisCardToZoneRole";
};

export type ProjectObjectRuleDrawCardsEffect = {
  count: number;
  id: string;
  owner: ProjectObjectRulePlayerTarget;
  sourceRole: string;
  targetRole: string;
  type: "drawCards";
};

export type ProjectObjectRuleEffect =
  | ProjectObjectRuleDrawCardsEffect
  | ProjectObjectRuleModifyCounterEffect
  | ProjectObjectRuleMoveThisCardToZoneRoleEffect;

export type ProjectObjectPlayCardRule = {
  conditions: ProjectObjectRuleCondition[];
  effects: ProjectObjectRuleEffect[];
  id: string;
  label: string;
};

export type ProjectObjectRules = {
  playCards: ProjectObjectPlayCardRule[];
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

export const projectObjectRuleLabelMaxLength = 80;

export const projectObjectRuleRoleMaxLength = 64;

export const projectObjectRuleAtomCountLimits = {
  max: 50,
  min: 0
} as const;

export const projectObjectRuleDrawCountLimits = projectObjectContainerEntryQuantityLimits;
