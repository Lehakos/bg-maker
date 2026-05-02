import type {
  ProjectFileNode,
  ProjectObjectAppearance,
  ProjectObjectCard,
  ProjectObjectCardSizePresetValue,
  ProjectObjectCounter,
  ProjectObjectCounterBoundsMode,
  ProjectObjectCounterDisplayMode,
  ProjectObjectDie,
  ProjectObjectDieFaceMode,
  ProjectObjectImage,
  ProjectObjectLayout,
  ProjectObjectLayoutAlignment,
  ProjectObjectLayoutJustification,
  ProjectObjectLayoutMode,
  ProjectObjectNode,
  ProjectObjectShape,
  ProjectObjectShapePoint,
  ProjectObjectText,
  ProjectObjectTextAlign,
  ProjectObjectTextVerticalAlign
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectCounter,
  getDefaultProjectObjectDie,
  hasProjectObjectLayout,
  isProjectObjectCardSizePresetLocked,
  projectObjectCardCustomSizePresetId,
  projectObjectCardSizePresets
} from "@bg-maker/shared";
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceBetween,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceBetween,
  Box,
  Bold,
  Columns3,
  Copy,
  Dices,
  Eye,
  EyeOff,
  Grid3x3,
  Hash,
  ImagePlus,
  Italic,
  LayoutPanelTop,
  MirrorRectangular,
  Move,
  Palette,
  Rows3,
  Shapes,
  SlidersHorizontal,
  Type,
  type LucideIcon
} from "lucide-react";
import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useState
} from "react";
import { InfoTip } from "../../components/InfoTip";
import { uploadProjectImageAsset } from "./project-api";
import {
  appendProjectImageAssetFileNode,
  getProjectImageAssetOptionById,
  getProjectImageAssetOptions,
  rememberTemporaryProjectImageAssetUrl
} from "./project-image-assets";
import {
  getProjectObjectNodeAppearance,
  getProjectObjectNodeCard,
  getProjectObjectNodeCounter,
  getProjectObjectNodeDie,
  getProjectObjectNodeDoubleSide,
  getProjectObjectNodeImage,
  getProjectObjectNodeLayout,
  getProjectObjectNodeRectTransform,
  getProjectObjectNodeShape,
  getProjectObjectNodeText,
  renameProjectObjectNode,
  setProjectObjectNodeAppearance,
  setProjectObjectNodeCard,
  setProjectObjectNodeCounter,
  setProjectObjectNodeDie,
  setProjectObjectNodeDoubleSide,
  setProjectObjectNodeImage,
  setProjectObjectNodeLayout,
  setProjectObjectNodeRectTransform,
  setProjectObjectNodeShape,
  setProjectObjectNodeText,
  setProjectObjectNodeVisibility,
  updateProjectFileNodeObjectTree
} from "./project-object-tree";
import { ProjectObjectKindIcon } from "./project-object-tree-ui";
import {
  getProjectObjectKindIconClassName,
  getProjectObjectKindLabel
} from "./project-object-tree-labels";
import {
  createRectTransformDraft,
  createAppearanceDraft,
  createCardDraft,
  createCounterDraft,
  createDieDraft,
  createImageDraft,
  createLayoutDraft,
  createTextDraft,
  formatAppearanceNumberValue,
  formatCounterNumberValue,
  formatDieNumberValue,
  formatImageNumberValue,
  formatLayoutNumberValue,
  formatRectTransformValue,
  formatTextNumberValue,
  getAppearanceWithDraftField,
  getCardWithDraftField,
  getCounterWithDraftField,
  getDieFace,
  getDieWithDraftField,
  getDieWithFaceField,
  getImageWithDraftField,
  getLayoutWithDraftField,
  getRectTransformWithDraftField,
  getShapePolygonPoints,
  getShapeWithAddedPolygonPoint,
  getShapeWithDefaultPolygonPoints,
  getShapeWithPolygonPoint,
  getShapeWithPolygonPointDraftField,
  getShapeWithRemovedPolygonPoint,
  getShapeWithVariant,
  getTextFontStyleForItalic,
  getTextFontWeightForBold,
  getTextWithDraftField,
  imageNumberFieldSettings,
  isTextFontWeightBold,
  normalizeRectTransformValue,
  normalizeAppearanceNumberValue,
  normalizeCounterNumberValue,
  normalizeDieNumberValue,
  normalizeImageNumberValue,
  normalizeLayoutNumberValue,
  normalizeTextNumberValue,
  parseRectTransformDraftValue,
  appearanceNumberFieldSettings,
  counterNumberFieldSettings,
  dieNumberFieldSettings,
  layoutNumberFieldSettings,
  rectTransformFieldSettings,
  textNumberFieldSettings,
  type AppearanceDraft,
  type AppearanceFieldKey,
  type CardDraft,
  type CardFieldKey,
  type CounterDraft,
  type CounterFieldKey,
  type CounterNumberFieldKey,
  type DieDraft,
  type DieFaceFieldKey,
  type DieFieldKey,
  type ImageDraft,
  type ImageFieldKey,
  type LayoutDraft,
  type LayoutFieldKey,
  type RectTransformDraft,
  type RectTransformFieldKey,
  type ShapePolygonPointFieldKey,
  type TextDraft,
  type TextFieldKey
} from "./project-object-inspector-state";
import { ProjectObjectShapePolygonEditor } from "./ProjectObjectShapePolygonEditor";

type ProjectObjectInspectorPanelProps = {
  className?: string;
  contentFileNode: ProjectFileNode | null;
  fileTree: ProjectFileNode[];
  projectId: string;
  selectedObject: ProjectObjectNode | null;
  onFileTreeChange: (fileTree: ProjectFileNode[]) => void;
  onObjectTreeChange: (fileNodeId: string, objectTree: ProjectObjectNode[]) => void;
};

type RectTransformFieldDefinition = {
  key: RectTransformFieldKey;
  label: string;
};

const positionFields: readonly RectTransformFieldDefinition[] = [
  { key: "x", label: "X" },
  { key: "y", label: "Y" }
];

const sizeFields: readonly RectTransformFieldDefinition[] = [
  { key: "width", label: "Width" },
  { key: "height", label: "Height" }
];

const cardPresetLockedRectTransformFields = new Set<RectTransformFieldKey>([
  "height",
  "scaleX",
  "scaleY",
  "width"
]);

const rotationFields: readonly RectTransformFieldDefinition[] = [
  { key: "rotation", label: "Rotation" }
];

const scaleFields: readonly RectTransformFieldDefinition[] = [
  { key: "scaleX", label: "Scale X" },
  { key: "scaleY", label: "Scale Y" }
];

const pivotFields: readonly RectTransformFieldDefinition[] = [
  { key: "pivotX", label: "Pivot X" },
  { key: "pivotY", label: "Pivot Y" }
];

type AppearanceNumberFieldDefinition = {
  key: keyof typeof appearanceNumberFieldSettings;
  label: string;
};

type TextNumberFieldDefinition = {
  key: keyof typeof textNumberFieldSettings;
  label: string;
};

type CounterNumberFieldDefinition = {
  key: keyof typeof counterNumberFieldSettings;
  label: string;
};

type ImageNumberFieldDefinition = {
  key: keyof typeof imageNumberFieldSettings;
  label: string;
};

type DieNumberFieldDefinition = {
  key: keyof typeof dieNumberFieldSettings;
  label: string;
};

type LayoutNumberFieldDefinition = {
  key: keyof typeof layoutNumberFieldSettings;
  label: string;
};

const appearanceNumberFields: readonly AppearanceNumberFieldDefinition[] = [
  { key: "borderRadius", label: "Radius" },
  { key: "padding", label: "Padding" },
  { key: "opacity", label: "Opacity" }
];

const appearanceFillOpacityField = {
  key: "backgroundOpacity",
  label: "Fill opacity"
} as const satisfies AppearanceNumberFieldDefinition;

const appearanceBorderWidthField = {
  key: "borderWidth",
  label: "Border width"
} as const satisfies AppearanceNumberFieldDefinition;

const textNumberFields: readonly TextNumberFieldDefinition[] = [
  { key: "fontSize", label: "Size" },
  { key: "lineHeight", label: "Line" }
];

const counterValueFields: readonly CounterNumberFieldDefinition[] = [
  { key: "defaultValue", label: "Default" },
  { key: "step", label: "Step" }
];

const counterBoundsFields: readonly CounterNumberFieldDefinition[] = [
  { key: "minValue", label: "Min" },
  { key: "maxValue", label: "Max" }
];

const imageNumberFields: readonly ImageNumberFieldDefinition[] = [
  { key: "positionX", label: "Pos X" },
  { key: "positionY", label: "Pos Y" }
];

const dieFaceCountField = {
  key: "faceCount",
  label: "Faces"
} as const satisfies DieNumberFieldDefinition;

const cardSizePresetOptions: readonly {
  label: string;
  value: ProjectObjectCardSizePresetValue;
}[] = [
  { label: "Custom", value: projectObjectCardCustomSizePresetId },
  ...projectObjectCardSizePresets.map((preset) => ({
    label: `${preset.label} (${preset.width} x ${preset.height})`,
    value: preset.id
  }))
];

const layoutColumnsField = {
  key: "columns",
  label: "Columns"
} as const satisfies LayoutNumberFieldDefinition;

const layoutGapField = {
  key: "gap",
  label: "Gap"
} as const satisfies LayoutNumberFieldDefinition;

const appearanceFillColorField = {
  key: "backgroundColor",
  label: "Fill"
} as const satisfies {
  key: Extract<AppearanceFieldKey, "backgroundColor">;
  label: string;
};

const appearanceBorderColorField = {
  key: "borderColor",
  label: "Border"
} as const satisfies {
  key: Extract<AppearanceFieldKey, "borderColor">;
  label: string;
};

const textColorFields = [{ key: "color", label: "Color" }] as const satisfies readonly {
  key: Extract<TextFieldKey, "color">;
  label: string;
}[];

const borderStyleOptions = [
  { label: "None", value: "none" },
  { label: "Solid", value: "solid" },
  { label: "Dashed", value: "dashed" },
  { label: "Dotted", value: "dotted" }
] as const;

const textAlignOptions = [
  { icon: AlignLeft, label: "Align left", value: "left" },
  { icon: AlignCenter, label: "Align center", value: "center" },
  { icon: AlignRight, label: "Align right", value: "right" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectTextAlign;
}[];

const textVerticalAlignOptions = [
  { icon: AlignVerticalJustifyStart, label: "Align top", value: "top" },
  { icon: AlignVerticalJustifyCenter, label: "Align middle", value: "middle" },
  { icon: AlignVerticalJustifyEnd, label: "Align bottom", value: "bottom" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectTextVerticalAlign;
}[];

const layoutModeOptions = [
  { icon: Move, label: "Manual layout", value: "free" },
  { icon: Columns3, label: "Horizontal layout", value: "horizontal" },
  { icon: Rows3, label: "Vertical layout", value: "vertical" },
  { icon: Grid3x3, label: "Grid layout", value: "grid" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectLayoutMode;
}[];

const horizontalLayoutAlignOptions = [
  { icon: AlignHorizontalJustifyStart, label: "Left", value: "start" },
  { icon: AlignHorizontalJustifyCenter, label: "Center", value: "center" },
  { icon: AlignHorizontalJustifyEnd, label: "Right", value: "end" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectLayoutAlignment;
}[];

const verticalLayoutAlignOptions = [
  { icon: AlignVerticalJustifyStart, label: "Top", value: "start" },
  { icon: AlignVerticalJustifyCenter, label: "Middle", value: "center" },
  { icon: AlignVerticalJustifyEnd, label: "Bottom", value: "end" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectLayoutAlignment;
}[];

const horizontalLayoutJustifyOptions = [
  { icon: AlignHorizontalJustifyStart, label: "Left", value: "start" },
  { icon: AlignHorizontalJustifyCenter, label: "Center", value: "center" },
  { icon: AlignHorizontalJustifyEnd, label: "Right", value: "end" },
  { icon: AlignHorizontalSpaceBetween, label: "Space between", value: "spaceBetween" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectLayoutJustification;
}[];

const verticalLayoutJustifyOptions = [
  { icon: AlignVerticalJustifyStart, label: "Top", value: "start" },
  { icon: AlignVerticalJustifyCenter, label: "Middle", value: "center" },
  { icon: AlignVerticalJustifyEnd, label: "Bottom", value: "end" },
  { icon: AlignVerticalSpaceBetween, label: "Space between", value: "spaceBetween" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectLayoutJustification;
}[];

const imageFitOptions = [
  { label: "Contain", value: "contain" },
  { label: "Cover", value: "cover" },
  { label: "Fill", value: "fill" },
  { label: "Scale down", value: "scaleDown" }
] as const;

const dieFaceModeOptions = [
  { label: "Text", value: "text" },
  { label: "Image", value: "image" }
] as const satisfies readonly {
  label: string;
  value: ProjectObjectDieFaceMode;
}[];

const counterBoundsModeOptions = [
  { label: "Clamp", value: "clamp" },
  { label: "No bounds", value: "none" },
  { label: "Wrap", value: "wrap" }
] as const satisfies readonly {
  label: string;
  value: ProjectObjectCounterBoundsMode;
}[];

const counterDisplayModeOptions = [
  { label: "Value", value: "value" },
  { label: "Value / max", value: "valueAndMax" }
] as const satisfies readonly {
  label: string;
  value: ProjectObjectCounterDisplayMode;
}[];

const counterBoundsModeInfoItems = [
  { description: "Keeps future values between Min and Max.", label: "Clamp" },
  { description: "Cycles past Max back to Min, and past Min back to Max.", label: "Wrap" },
  { description: "Ignores Min and Max while changing the counter.", label: "No bounds" }
] as const;

const counterDisplayModeInfoItems = [
  { description: "Shows only the default value.", label: "Value" },
  { description: "Shows the default value together with Max.", label: "Value / max" }
] as const;

const shapeVariantOptions = [
  { label: "Rectangle", value: "rectangle" },
  { label: "Ellipse", value: "ellipse" },
  { label: "Diamond", value: "diamond" },
  { label: "Hexagon", value: "hexagon" },
  { label: "Triangle", value: "triangle" },
  { label: "Custom", value: "polygon" }
] as const;

export function ProjectObjectInspectorPanel({
  className,
  contentFileNode,
  fileTree,
  projectId,
  selectedObject,
  onFileTreeChange,
  onObjectTreeChange
}: ProjectObjectInspectorPanelProps) {
  const objectTree = useMemo(
    () => contentFileNode?.objectTree ?? [],
    [contentFileNode?.objectTree]
  );
  const imageAssets = useMemo(
    () => getProjectImageAssetOptions(projectId, fileTree),
    [fileTree, projectId]
  );
  const rectTransform = useMemo(
    () => (selectedObject ? getProjectObjectNodeRectTransform(selectedObject) : null),
    [selectedObject]
  );
  const appearance = useMemo(
    () => (selectedObject ? getProjectObjectNodeAppearance(selectedObject) : null),
    [selectedObject]
  );
  const card = useMemo(
    () => (selectedObject?.kind === "card" ? getProjectObjectNodeCard(selectedObject) : null),
    [selectedObject]
  );
  const counter = useMemo(
    () =>
      selectedObject?.kind === "counter" ? getProjectObjectNodeCounter(selectedObject) : null,
    [selectedObject]
  );
  const die = useMemo(
    () => (selectedObject?.kind === "die" ? getProjectObjectNodeDie(selectedObject) : null),
    [selectedObject]
  );
  const doubleSide = useMemo(
    () =>
      selectedObject?.kind === "card" || selectedObject?.kind === "token"
        ? getProjectObjectNodeDoubleSide(selectedObject)
        : null,
    [selectedObject]
  );
  const layout = useMemo(
    () =>
      selectedObject && hasProjectObjectLayout(selectedObject.kind)
        ? getProjectObjectNodeLayout(selectedObject)
        : null,
    [selectedObject]
  );
  const text = useMemo(
    () => (selectedObject?.kind === "label" ? getProjectObjectNodeText(selectedObject) : null),
    [selectedObject]
  );
  const image = useMemo(
    () => (selectedObject?.kind === "image" ? getProjectObjectNodeImage(selectedObject) : null),
    [selectedObject]
  );
  const shape = useMemo(
    () =>
      selectedObject?.kind === "shape" || selectedObject?.kind === "token"
        ? getProjectObjectNodeShape(selectedObject)
        : null,
    [selectedObject]
  );
  const shapePolygonPoints = useMemo(() => (shape ? getShapePolygonPoints(shape) : []), [shape]);
  const [nameDraft, setNameDraft] = useState("");
  const [rectTransformDraft, setRectTransformDraft] = useState<RectTransformDraft>(() =>
    createRectTransformDraft(rectTransform)
  );
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceDraft>(() =>
    appearance
      ? createAppearanceDraft(appearance)
      : createAppearanceDraft(getFallbackAppearanceDraftValue())
  );
  const [cardDraft, setCardDraft] = useState<CardDraft>(() =>
    card ? createCardDraft(card) : createCardDraft(getFallbackCardDraftValue())
  );
  const [counterDraft, setCounterDraft] = useState<CounterDraft>(() =>
    counter ? createCounterDraft(counter) : createCounterDraft(getFallbackCounterDraftValue())
  );
  const [dieDraft, setDieDraft] = useState<DieDraft>(() =>
    die ? createDieDraft(die) : createDieDraft(getFallbackDieDraftValue())
  );
  const [textDraft, setTextDraft] = useState<TextDraft>(() =>
    text ? createTextDraft(text) : createTextDraft(getFallbackTextDraftValue())
  );
  const [imageDraft, setImageDraft] = useState<ImageDraft>(() =>
    image ? createImageDraft(image) : createImageDraft(getFallbackImageDraftValue())
  );
  const [layoutDraft, setLayoutDraft] = useState<LayoutDraft>(() =>
    layout ? createLayoutDraft(layout) : createLayoutDraft(getFallbackLayoutDraftValue())
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [uploadingDieFaceImage, setUploadingDieFaceImage] = useState(false);
  const [dieFaceImageUploadError, setDieFaceImageUploadError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- Draft fields must reset when the selected object changes. */
  useEffect(() => {
    setNameDraft(selectedObject?.name ?? "");
  }, [selectedObject?.id, selectedObject?.name]);

  useEffect(() => {
    setRectTransformDraft(createRectTransformDraft(rectTransform));
  }, [rectTransform, selectedObject?.id]);

  useEffect(() => {
    if (appearance) {
      setAppearanceDraft(createAppearanceDraft(appearance));
    }
  }, [appearance, selectedObject?.id]);

  useEffect(() => {
    if (card) {
      setCardDraft(createCardDraft(card));
    }
  }, [card, selectedObject?.id]);

  useEffect(() => {
    if (counter) {
      setCounterDraft(createCounterDraft(counter));
    }
  }, [counter, selectedObject?.id]);

  useEffect(() => {
    if (die) {
      setDieDraft(createDieDraft(die));
      setDieFaceImageUploadError(null);
    }
  }, [die, selectedObject?.id]);

  useEffect(() => {
    if (text) {
      setTextDraft(createTextDraft(text));
    }
  }, [selectedObject?.id, text]);

  useEffect(() => {
    if (image) {
      setImageDraft(createImageDraft(image));
      setImageUploadError(null);
    }
  }, [image, selectedObject?.id]);

  useEffect(() => {
    if (layout) {
      setLayoutDraft(createLayoutDraft(layout));
    }
  }, [layout, selectedObject?.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function commitName(value = nameDraft) {
    if (!contentFileNode || !selectedObject) {
      return;
    }

    const nextName = value.trim();

    if (!nextName) {
      setNameDraft(selectedObject.name);
      return;
    }

    if (nextName === selectedObject.name) {
      return;
    }

    const nextObjectTree = renameProjectObjectNode(objectTree, selectedObject.id, nextName);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function resetNameDraft() {
    setNameDraft(selectedObject?.name ?? "");
  }

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      resetNameDraft();
    }
  }

  function handleVisibilityChange(event: ChangeEvent<HTMLInputElement>) {
    if (!contentFileNode || !selectedObject) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeVisibility(
      objectTree,
      selectedObject.id,
      event.currentTarget.checked
    );

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function isRectTransformFieldPresetLocked(fieldKey: RectTransformFieldKey) {
    return Boolean(
      card &&
      isProjectObjectCardSizePresetLocked(card) &&
      cardPresetLockedRectTransformFields.has(fieldKey)
    );
  }

  function updateRectTransformDraft(fieldKey: RectTransformFieldKey, value: string) {
    if (isRectTransformFieldPresetLocked(fieldKey)) {
      return;
    }

    setRectTransformDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeRectTransformField(fieldKey, value);
  }

  function resetRectTransformDraft(fieldKey: RectTransformFieldKey) {
    if (!rectTransform) {
      return;
    }

    setRectTransformDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatRectTransformValue(rectTransform[fieldKey], fieldKey)
    }));
  }

  function updateObjectTreeRectTransformField(fieldKey: RectTransformFieldKey, value: string) {
    if (
      !contentFileNode ||
      !selectedObject ||
      !rectTransform ||
      isRectTransformFieldPresetLocked(fieldKey)
    ) {
      return;
    }

    const nextRectTransform = getRectTransformWithDraftField(rectTransform, fieldKey, value);

    if (!nextRectTransform) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeRectTransform(
      objectTree,
      selectedObject.id,
      nextRectTransform
    );

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function commitRectTransformField(
    fieldKey: RectTransformFieldKey,
    value = rectTransformDraft[fieldKey]
  ) {
    if (
      !contentFileNode ||
      !selectedObject ||
      !rectTransform ||
      isRectTransformFieldPresetLocked(fieldKey)
    ) {
      return;
    }

    if (parseRectTransformDraftValue(value) === null) {
      resetRectTransformDraft(fieldKey);
      return;
    }

    updateObjectTreeRectTransformField(fieldKey, value);
    setRectTransformDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatRectTransformValue(
        normalizeRectTransformValue(fieldKey, Number(value)),
        fieldKey
      )
    }));
  }

  function updateAppearanceDraft(fieldKey: AppearanceFieldKey, value: string) {
    setAppearanceDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeAppearanceField(fieldKey, value);
  }

  function resetAppearanceDraft(fieldKey: AppearanceFieldKey) {
    if (!appearance) {
      return;
    }

    const nextDraft = createAppearanceDraft(appearance);

    setAppearanceDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: nextDraft[fieldKey]
    }));
  }

  function updateObjectTreeAppearanceField(fieldKey: AppearanceFieldKey, value: string) {
    if (!contentFileNode || !selectedObject || !appearance) {
      return;
    }

    const nextAppearance = getAppearanceWithDraftField(appearance, fieldKey, value);

    if (!nextAppearance) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeAppearance(
      objectTree,
      selectedObject.id,
      nextAppearance
    );

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function commitAppearanceNumberField(
    fieldKey: keyof typeof appearanceNumberFieldSettings,
    value = appearanceDraft[fieldKey]
  ) {
    if (!appearance) {
      return;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      resetAppearanceDraft(fieldKey);
      return;
    }

    updateObjectTreeAppearanceField(fieldKey, value);
    setAppearanceDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatAppearanceNumberValue(
        normalizeAppearanceNumberValue(fieldKey, parsedValue),
        fieldKey
      )
    }));
  }

  function updateCardDraft<TFieldKey extends CardFieldKey>(
    fieldKey: TFieldKey,
    value: ProjectObjectCard[TFieldKey]
  ) {
    setCardDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeCardField(fieldKey, value);
  }

  function updateObjectTreeCardField<TFieldKey extends CardFieldKey>(
    fieldKey: TFieldKey,
    value: ProjectObjectCard[TFieldKey]
  ) {
    if (!contentFileNode || !selectedObject || !card) {
      return;
    }

    const nextCard = getCardWithDraftField(card, fieldKey, value);

    if (!nextCard) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeCard(objectTree, selectedObject.id, nextCard);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function updateCounterDraft(fieldKey: CounterFieldKey, value: string) {
    setCounterDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeCounterField(fieldKey, value);
  }

  function resetCounterDraft(fieldKey: CounterFieldKey) {
    if (!counter) {
      return;
    }

    const nextDraft = createCounterDraft(counter);

    setCounterDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: nextDraft[fieldKey]
    }));
  }

  function updateObjectTreeCounterField(fieldKey: CounterFieldKey, value: string) {
    if (!contentFileNode || !selectedObject || !counter) {
      return;
    }

    const nextCounter = getCounterWithDraftField(counter, fieldKey, value);

    if (!nextCounter) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeCounter(
      objectTree,
      selectedObject.id,
      nextCounter
    );

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function commitCounterNumberField(
    fieldKey: CounterNumberFieldKey,
    value = counterDraft[fieldKey]
  ) {
    if (!counter) {
      return;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      resetCounterDraft(fieldKey);
      return;
    }

    updateObjectTreeCounterField(fieldKey, value);
    setCounterDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatCounterNumberValue(
        normalizeCounterNumberValue(fieldKey, parsedValue),
        fieldKey
      )
    }));
  }

  function updateDieDraft(fieldKey: DieFieldKey, value: string) {
    setDieDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeDieField(fieldKey, value);
  }

  function resetDieDraft(fieldKey: DieFieldKey) {
    if (!die) {
      return;
    }

    const nextDraft = createDieDraft(die);

    setDieDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: nextDraft[fieldKey]
    }));
  }

  function updateObjectTreeDieField(fieldKey: DieFieldKey, value: string) {
    if (!contentFileNode || !selectedObject || !die) {
      return;
    }

    const nextDie = getDieWithDraftField(die, fieldKey, value);

    updateDie(nextDie);
  }

  function commitDieNumberField(
    fieldKey: keyof typeof dieNumberFieldSettings,
    value = dieDraft[fieldKey]
  ) {
    if (!die) {
      return;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      resetDieDraft(fieldKey);
      return;
    }

    updateObjectTreeDieField(fieldKey, value);
    setDieDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatDieNumberValue(normalizeDieNumberValue(fieldKey, parsedValue), fieldKey)
    }));
  }

  function updateDieFaceField(fieldKey: DieFaceFieldKey, value: string) {
    if (!die) {
      return;
    }

    updateDie(getDieWithFaceField(die, die.activeFace, fieldKey, value));
  }

  function updateDie(nextDie: ProjectObjectDie | null) {
    if (!nextDie || !contentFileNode || !selectedObject) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeDie(objectTree, selectedObject.id, nextDie);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function updateDoubleSideEnabled(enabled: boolean) {
    if (!contentFileNode || !selectedObject || !doubleSide) {
      return;
    }

    if (doubleSide.enabled === enabled) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeDoubleSide(objectTree, selectedObject.id, {
      ...doubleSide,
      enabled
    });

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function updateTextDraft(fieldKey: TextFieldKey, value: string) {
    setTextDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeTextField(fieldKey, value);
  }

  function updateTextBold(isBold: boolean) {
    updateTextDraft("fontWeight", String(getTextFontWeightForBold(isBold)));
  }

  function updateTextItalic(isItalic: boolean) {
    updateTextDraft("fontStyle", getTextFontStyleForItalic(isItalic));
  }

  function resetTextDraft(fieldKey: TextFieldKey) {
    if (!text) {
      return;
    }

    setTextDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: String(text[fieldKey])
    }));
  }

  function updateObjectTreeTextField(fieldKey: TextFieldKey, value: string) {
    if (!contentFileNode || !selectedObject || !text) {
      return;
    }

    const nextText = getTextWithDraftField(text, fieldKey, value);

    if (!nextText) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeText(objectTree, selectedObject.id, nextText);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function commitTextNumberField(
    fieldKey: keyof typeof textNumberFieldSettings,
    value = textDraft[fieldKey]
  ) {
    if (!text) {
      return;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      resetTextDraft(fieldKey);
      return;
    }

    updateObjectTreeTextField(fieldKey, value);
    setTextDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatTextNumberValue(normalizeTextNumberValue(fieldKey, parsedValue), fieldKey)
    }));
  }

  function updateImageDraft(fieldKey: ImageFieldKey, value: string) {
    setImageDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeImageField(fieldKey, value);
  }

  function resetImageDraft(fieldKey: ImageFieldKey) {
    if (!image) {
      return;
    }

    setImageDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: String(image[fieldKey])
    }));
  }

  function updateObjectTreeImageField(fieldKey: ImageFieldKey, value: string) {
    if (!contentFileNode || !selectedObject || !image) {
      return;
    }

    const nextImage = getImageWithDraftField(image, fieldKey, value);

    if (!nextImage) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeImage(objectTree, selectedObject.id, nextImage);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function commitImageNumberField(
    fieldKey: keyof typeof imageNumberFieldSettings,
    value = imageDraft[fieldKey]
  ) {
    if (!image) {
      return;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      resetImageDraft(fieldKey);
      return;
    }

    updateObjectTreeImageField(fieldKey, value);
    setImageDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatImageNumberValue(normalizeImageNumberValue(fieldKey, parsedValue), fieldKey)
    }));
  }

  function updateLayoutDraft(fieldKey: LayoutFieldKey, value: string) {
    setLayoutDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeLayoutField(fieldKey, value);
  }

  function resetLayoutDraft(fieldKey: LayoutFieldKey) {
    if (!layout) {
      return;
    }

    const nextDraft = createLayoutDraft(layout);

    setLayoutDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: nextDraft[fieldKey]
    }));
  }

  function updateObjectTreeLayoutField(fieldKey: LayoutFieldKey, value: string) {
    if (!contentFileNode || !selectedObject || !layout) {
      return;
    }

    const nextLayout = getLayoutWithDraftField(layout, fieldKey, value);

    if (!nextLayout) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeLayout(objectTree, selectedObject.id, nextLayout);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function commitLayoutNumberField(
    fieldKey: keyof typeof layoutNumberFieldSettings,
    value = layoutDraft[fieldKey]
  ) {
    if (!layout) {
      return;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      resetLayoutDraft(fieldKey);
      return;
    }

    updateObjectTreeLayoutField(fieldKey, value);
    setLayoutDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatLayoutNumberValue(
        normalizeLayoutNumberValue(fieldKey, parsedValue),
        fieldKey
      )
    }));
  }

  function updateShapeVariant(value: string) {
    if (!shape) {
      return;
    }

    updateShape(getShapeWithVariant(shape, value));
  }

  function updateShape(nextShape: ProjectObjectShape | null) {
    if (!nextShape) {
      return;
    }

    if (!contentFileNode || !selectedObject) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeShape(objectTree, selectedObject.id, nextShape);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function updateShapePolygonPointDraftField(
    pointIndex: number,
    fieldKey: ShapePolygonPointFieldKey,
    value: string
  ) {
    if (!shape) {
      return;
    }

    updateShape(getShapeWithPolygonPointDraftField(shape, pointIndex, fieldKey, value));
  }

  function updateShapePolygonPoint(pointIndex: number, point: ProjectObjectShapePoint) {
    if (!shape) {
      return;
    }

    updateShape(getShapeWithPolygonPoint(shape, pointIndex, point));
  }

  function addShapePolygonPoint() {
    if (!shape) {
      return;
    }

    updateShape(getShapeWithAddedPolygonPoint(shape));
  }

  function removeShapePolygonPoint(pointIndex: number) {
    if (!shape) {
      return;
    }

    updateShape(getShapeWithRemovedPolygonPoint(shape, pointIndex));
  }

  function resetShapePolygonPoints() {
    if (!shape) {
      return;
    }

    updateShape(getShapeWithDefaultPolygonPoints(shape));
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!file || !contentFileNode || !selectedObject || !image) {
      return;
    }

    setUploadingImage(true);
    setImageUploadError(null);

    try {
      const imageAsset = await uploadProjectImageAsset(projectId, file);
      rememberTemporaryProjectImageAssetUrl(imageAsset.id, file);
      const nextImage: ProjectObjectImage = {
        ...image,
        assetId: imageAsset.id
      };
      const nextObjectTree = setProjectObjectNodeImage(objectTree, selectedObject.id, nextImage);
      const fileTreeWithObject = updateProjectFileNodeObjectTree(
        fileTree,
        contentFileNode.id,
        nextObjectTree
      );
      const { fileTree: fileTreeWithImageAsset } = appendProjectImageAssetFileNode(
        fileTreeWithObject,
        imageAsset
      );

      onFileTreeChange(fileTreeWithImageAsset);
    } catch (error) {
      setImageUploadError(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleDieFaceImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!file || !contentFileNode || !selectedObject || !die) {
      return;
    }

    setUploadingDieFaceImage(true);
    setDieFaceImageUploadError(null);

    try {
      const imageAsset = await uploadProjectImageAsset(projectId, file);
      rememberTemporaryProjectImageAssetUrl(imageAsset.id, file);
      const nextDie = getDieWithFaceField(die, die.activeFace, "imageAssetId", imageAsset.id);

      if (!nextDie) {
        return;
      }

      const nextObjectTree = setProjectObjectNodeDie(objectTree, selectedObject.id, nextDie);
      const fileTreeWithObject = updateProjectFileNodeObjectTree(
        fileTree,
        contentFileNode.id,
        nextObjectTree
      );
      const { fileTree: fileTreeWithImageAsset } = appendProjectImageAssetFileNode(
        fileTreeWithObject,
        imageAsset
      );

      onFileTreeChange(fileTreeWithImageAsset);
    } catch (error) {
      setDieFaceImageUploadError(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploadingDieFaceImage(false);
    }
  }

  const selectedImageAsset = image?.assetId
    ? getProjectImageAssetOptionById(imageAssets, image.assetId)
    : undefined;
  const activeDieFace = die ? getDieFace(die, die.activeFace) : null;
  const activeDieFaceImageAsset =
    activeDieFace?.imageAssetId && activeDieFace.mode === "image"
      ? getProjectImageAssetOptionById(imageAssets, activeDieFace.imageAssetId)
      : undefined;
  const cardSizePresetLocked = card ? isProjectObjectCardSizePresetLocked(card) : false;
  const textDraftBold = isTextFontWeightBold(textDraft.fontWeight);
  const textDraftItalic = textDraft.fontStyle === "italic";
  const layoutAuto = layoutDraft.mode !== "free";
  const layoutMainAxisLabel = getLayoutMainAxisLabel(layoutDraft.mode);
  const layoutCrossAxisLabel = getLayoutCrossAxisLabel(layoutDraft.mode);
  const layoutJustifyOptions = getLayoutJustifyOptions(layoutDraft.mode);
  const layoutAlignOptions = getLayoutAlignOptions(layoutDraft.mode);
  const layoutNumberFields = getLayoutNumberFields(layoutDraft);

  return (
    <aside
      className={cx(
        "flex min-h-0 flex-1 basis-0 flex-col overflow-hidden border-b border-slate-200 bg-white text-slate-700",
        className
      )}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-2">
        <SlidersHorizontal className="shrink-0 text-teal-700" size={15} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-slate-600">
            Inspector
          </h2>
          <p className="truncate text-[11px] leading-none text-slate-500">
            {selectedObject?.name ?? contentFileNode?.name ?? "No object selected"}
          </p>
        </div>
      </div>

      {contentFileNode && selectedObject && rectTransform ? (
        <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ProjectObjectKindIcon
                className={getProjectObjectKindIconClassName(selectedObject.kind)}
                kind={selectedObject.kind}
                size={18}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {getProjectObjectKindLabel(selectedObject.kind)}
                </p>
                <p className="truncate text-[11px] text-slate-500">{selectedObject.id}</p>
              </div>
            </div>

            <InspectorTextField
              label="Name"
              value={nameDraft}
              onBlur={commitName}
              onChange={setNameDraft}
              onKeyDown={handleNameKeyDown}
            />

            <InspectorSwitchField
              checked={selectedObject.visible}
              icon={
                selectedObject.visible ? (
                  <Eye className="shrink-0" size={15} />
                ) : (
                  <EyeOff className="shrink-0" size={15} />
                )
              }
              label="Visible"
              onChange={handleVisibilityChange}
            />
          </section>

          {card ? (
            <InspectorSection icon={<MirrorRectangular size={15} />} title="Card">
              <InspectorSelectField
                label="Size preset"
                value={cardDraft.sizePreset}
                options={cardSizePresetOptions}
                onChange={(value) => updateCardDraft("sizePreset", value)}
              />
            </InspectorSection>
          ) : null}

          {doubleSide ? (
            <InspectorSection icon={<Copy size={15} />} title="Double-sided">
              <InspectorDoubleSidedControls
                enabled={doubleSide.enabled}
                onEnabledChange={updateDoubleSideEnabled}
              />
            </InspectorSection>
          ) : null}

          {counter ? (
            <InspectorSection icon={<Hash size={15} />} title="Counter">
              <CounterNumberGrid
                fields={counterValueFields}
                value={counterDraft}
                onCommit={commitCounterNumberField}
                onDraftChange={updateCounterDraft}
                onReset={resetCounterDraft}
              />
              <CounterNumberGrid
                fields={counterBoundsFields}
                value={counterDraft}
                onCommit={commitCounterNumberField}
                onDraftChange={updateCounterDraft}
                onReset={resetCounterDraft}
              />
              <div className="grid grid-cols-2 gap-2">
                <InspectorSelectField
                  label="Bounds"
                  info={<InspectorModeInfo items={counterBoundsModeInfoItems} />}
                  infoAlign="start"
                  value={counterDraft.boundsMode}
                  options={counterBoundsModeOptions}
                  onChange={(value) => updateCounterDraft("boundsMode", value)}
                />
                <InspectorSelectField
                  label="Display"
                  info={<InspectorModeInfo items={counterDisplayModeInfoItems} />}
                  infoAlign="end"
                  value={counterDraft.displayMode}
                  options={counterDisplayModeOptions}
                  onChange={(value) => updateCounterDraft("displayMode", value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <InspectorInlineTextField
                  label="Prefix"
                  value={counterDraft.prefix}
                  onChange={(value) => updateCounterDraft("prefix", value)}
                />
                <InspectorInlineTextField
                  label="Suffix"
                  value={counterDraft.suffix}
                  onChange={(value) => updateCounterDraft("suffix", value)}
                />
              </div>
            </InspectorSection>
          ) : null}

          {die ? (
            <InspectorSection icon={<Dices size={15} />} title="Die">
              <InspectorBehaviorNumberField
                field={dieFaceCountField}
                settings={dieNumberFieldSettings.faceCount}
                value={dieDraft.faceCount}
                onCommit={commitDieNumberField}
                onDraftChange={updateDieDraft}
                onReset={resetDieDraft}
              />
              {activeDieFace ? (
                <>
                  <InspectorSelectField
                    label="Face content"
                    value={activeDieFace.mode}
                    options={dieFaceModeOptions}
                    onChange={(value) => updateDieFaceField("mode", value)}
                  />
                  {activeDieFace.mode === "image" ? (
                    <>
                      <InspectorSelectField
                        label="Asset"
                        value={activeDieFace.imageAssetId}
                        options={[
                          { label: "No image", value: "" },
                          ...imageAssets.map((imageAsset) => ({
                            label: imageAsset.name,
                            value: imageAsset.asset.id
                          }))
                        ]}
                        onChange={(value) => updateDieFaceField("imageAssetId", value)}
                      />
                      {activeDieFace.imageAssetId && !activeDieFaceImageAsset ? (
                        <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                          Selected image is no longer in the file tree.
                        </p>
                      ) : null}
                      <label className="flex h-9 cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-2 text-sm font-medium text-slate-700 hover:border-sky-400 hover:bg-sky-50">
                        <input
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          disabled={uploadingDieFaceImage}
                          type="file"
                          onChange={handleDieFaceImageUpload}
                        />
                        {uploadingDieFaceImage ? "Uploading..." : "Upload image"}
                      </label>
                      {dieFaceImageUploadError ? (
                        <p className="rounded-md border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                          {dieFaceImageUploadError}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <InspectorInlineTextField
                      label="Face text"
                      value={activeDieFace.label}
                      onChange={(value) => updateDieFaceField("label", value)}
                    />
                  )}
                </>
              ) : null}
            </InspectorSection>
          ) : null}

          {appearance ? (
            <InspectorSection icon={<Palette size={15} />} title="Appearance">
              <div className="grid grid-cols-2 gap-2">
                <InspectorColorField
                  field={appearanceFillColorField}
                  value={appearanceDraft.backgroundColor}
                  onChange={updateAppearanceDraft}
                />
                <InspectorBehaviorNumberField
                  field={appearanceFillOpacityField}
                  settings={appearanceNumberFieldSettings.backgroundOpacity}
                  value={appearanceDraft.backgroundOpacity}
                  onCommit={commitAppearanceNumberField}
                  onDraftChange={updateAppearanceDraft}
                  onReset={resetAppearanceDraft}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <InspectorColorField
                  field={appearanceBorderColorField}
                  value={appearanceDraft.borderColor}
                  onChange={updateAppearanceDraft}
                />
                <InspectorBehaviorNumberField
                  field={appearanceBorderWidthField}
                  settings={appearanceNumberFieldSettings.borderWidth}
                  value={appearanceDraft.borderWidth}
                  onCommit={commitAppearanceNumberField}
                  onDraftChange={updateAppearanceDraft}
                  onReset={resetAppearanceDraft}
                />
              </div>
              <InspectorSelectField
                label="Border style"
                value={appearanceDraft.borderStyle}
                options={borderStyleOptions}
                onChange={(value) => updateAppearanceDraft("borderStyle", value)}
              />
              <AppearanceNumberGrid
                fields={appearanceNumberFields}
                value={appearanceDraft}
                onCommit={commitAppearanceNumberField}
                onDraftChange={updateAppearanceDraft}
                onReset={resetAppearanceDraft}
              />
            </InspectorSection>
          ) : null}

          {layout ? (
            <InspectorSection icon={<LayoutPanelTop size={15} />} title="Layout">
              <InspectorIconSegmentedField
                label="Mode"
                value={layoutDraft.mode}
                options={layoutModeOptions}
                onChange={(value) => updateLayoutDraft("mode", value)}
              />
              {layoutAuto ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <InspectorIconSegmentedField
                      label={layoutMainAxisLabel}
                      value={layoutDraft.justifyContent}
                      options={layoutJustifyOptions}
                      onChange={(value) => updateLayoutDraft("justifyContent", value)}
                    />
                    <InspectorIconSegmentedField
                      label={layoutCrossAxisLabel}
                      value={layoutDraft.alignItems}
                      options={layoutAlignOptions}
                      onChange={(value) => updateLayoutDraft("alignItems", value)}
                    />
                  </div>
                  {layoutNumberFields.length ? (
                    <LayoutNumberGrid
                      fields={layoutNumberFields}
                      value={layoutDraft}
                      onCommit={commitLayoutNumberField}
                      onDraftChange={updateLayoutDraft}
                      onReset={resetLayoutDraft}
                    />
                  ) : null}
                </>
              ) : null}
            </InspectorSection>
          ) : null}

          <InspectorSection icon={<Box size={15} />} title="Frame">
            <InspectorNumberGrid
              fields={positionFields}
              rectTransformDraft={rectTransformDraft}
              onCommit={commitRectTransformField}
              onDraftChange={updateRectTransformDraft}
              onReset={resetRectTransformDraft}
            />
            <InspectorNumberGrid
              fields={sizeFields}
              rectTransformDraft={rectTransformDraft}
              disabledFields={
                cardSizePresetLocked ? cardPresetLockedRectTransformFields : undefined
              }
              disabledTitle="Size is controlled by the selected card preset"
              onCommit={commitRectTransformField}
              onDraftChange={updateRectTransformDraft}
              onReset={resetRectTransformDraft}
            />
          </InspectorSection>

          <InspectorSection title="Transform">
            <InspectorNumberGrid
              fields={rotationFields}
              rectTransformDraft={rectTransformDraft}
              onCommit={commitRectTransformField}
              onDraftChange={updateRectTransformDraft}
              onReset={resetRectTransformDraft}
            />
            <InspectorNumberGrid
              fields={scaleFields}
              rectTransformDraft={rectTransformDraft}
              disabledFields={
                cardSizePresetLocked ? cardPresetLockedRectTransformFields : undefined
              }
              disabledTitle="Scale is controlled by the selected card preset"
              onCommit={commitRectTransformField}
              onDraftChange={updateRectTransformDraft}
              onReset={resetRectTransformDraft}
            />
          </InspectorSection>

          <InspectorSection title="Pivot">
            <InspectorNumberGrid
              fields={pivotFields}
              rectTransformDraft={rectTransformDraft}
              onCommit={commitRectTransformField}
              onDraftChange={updateRectTransformDraft}
              onReset={resetRectTransformDraft}
            />
          </InspectorSection>

          {text ? (
            <InspectorSection icon={<Type size={15} />} title="Text">
              <InspectorTextareaField
                label="Content"
                value={textDraft.content}
                onChange={(value) => updateTextDraft("content", value)}
              />
              <InspectorColorGrid
                fields={textColorFields}
                value={textDraft}
                onChange={updateTextDraft}
              />
              <div className="grid grid-cols-2 gap-2">
                <TextStyleToggleField
                  isBold={textDraftBold}
                  isItalic={textDraftItalic}
                  onBoldChange={updateTextBold}
                  onItalicChange={updateTextItalic}
                />
                <InspectorIconSegmentedField
                  label="Align"
                  value={textDraft.textAlign}
                  options={textAlignOptions}
                  onChange={(value) => updateTextDraft("textAlign", value)}
                />
              </div>
              <InspectorIconSegmentedField
                label="Vertical"
                value={textDraft.verticalAlign}
                options={textVerticalAlignOptions}
                onChange={(value) => updateTextDraft("verticalAlign", value)}
              />
              <TextNumberGrid
                fields={textNumberFields}
                value={textDraft}
                onCommit={commitTextNumberField}
                onDraftChange={updateTextDraft}
                onReset={resetTextDraft}
              />
            </InspectorSection>
          ) : null}

          {image ? (
            <InspectorSection icon={<ImagePlus size={15} />} title="Image">
              <InspectorSelectField
                label="Asset"
                value={imageDraft.assetId}
                options={[
                  { label: "No image", value: "" },
                  ...imageAssets.map((imageAsset) => ({
                    label: imageAsset.name,
                    value: imageAsset.asset.id
                  }))
                ]}
                onChange={(value) => updateImageDraft("assetId", value)}
              />
              {image.assetId && !selectedImageAsset ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                  Selected image is no longer in the file tree.
                </p>
              ) : null}
              <label className="flex h-9 cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-2 text-sm font-medium text-slate-700 hover:border-sky-400 hover:bg-sky-50">
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploadingImage}
                  type="file"
                  onChange={handleImageUpload}
                />
                {uploadingImage ? "Uploading..." : "Upload image"}
              </label>
              {imageUploadError ? (
                <p className="rounded-md border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                  {imageUploadError}
                </p>
              ) : null}
              <InspectorSelectField
                label="Fit"
                value={imageDraft.fit}
                options={imageFitOptions}
                onChange={(value) => updateImageDraft("fit", value)}
              />
              <ImageNumberGrid
                fields={imageNumberFields}
                value={imageDraft}
                onCommit={commitImageNumberField}
                onDraftChange={updateImageDraft}
                onReset={resetImageDraft}
              />
            </InspectorSection>
          ) : null}

          {shape ? (
            <InspectorSection icon={<Shapes size={15} />} title="Shape">
              <InspectorSelectField
                label="Variant"
                value={shape.variant}
                options={shapeVariantOptions}
                onChange={updateShapeVariant}
              />
              {shape.variant === "polygon" ? (
                <ProjectObjectShapePolygonEditor
                  points={shapePolygonPoints}
                  onAddPoint={addShapePolygonPoint}
                  onPointChange={updateShapePolygonPoint}
                  onPointDraftFieldChange={updateShapePolygonPointDraftField}
                  onRemovePoint={removeShapePolygonPoint}
                  onReset={resetShapePolygonPoints}
                />
              ) : null}
            </InspectorSection>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-center text-xs text-slate-500">
          {contentFileNode
            ? "Select an object to inspect its properties"
            : "Select a table layout or object file"}
        </div>
      )}
    </aside>
  );
}

type InspectorSectionProps = {
  children: ReactNode;
  icon?: ReactNode;
  title: string;
};

function InspectorSection({ children, icon, title }: InspectorSectionProps) {
  return (
    <section className="mt-4 border-t border-slate-200 pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

type InspectorTextFieldProps = {
  label: string;
  value: string;
  onBlur: (value: string) => void;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

function InspectorTextField({
  label,
  value,
  onBlur,
  onChange,
  onKeyDown
}: InspectorTextFieldProps) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      <span>{label}</span>
      <input
        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onBlur={(event) => onBlur(event.currentTarget.value)}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

type InspectorInlineTextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function InspectorInlineTextField({ label, value, onChange }: InspectorInlineTextFieldProps) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      <span>{label}</span>
      <input
        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

type InspectorSwitchFieldProps = {
  checked: boolean;
  icon?: ReactNode;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function InspectorSwitchField({ checked, icon, label, onChange }: InspectorSwitchFieldProps) {
  return (
    <label className="flex min-h-8 cursor-pointer items-center justify-between gap-3 py-1 text-sm font-medium text-slate-700">
      <span className="flex min-w-0 items-center gap-2">
        {icon ? (
          <span
            className={
              checked
                ? "flex h-6 w-6 shrink-0 items-center justify-center rounded text-sky-700"
                : "flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400"
            }
          >
            {icon}
          </span>
        ) : null}
        <span className="truncate">{label}</span>
      </span>
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          checked={checked}
          className="peer sr-only"
          role="switch"
          type="checkbox"
          onChange={onChange}
        />
        <span className="absolute inset-0 rounded-full border border-slate-300 bg-slate-200 transition-colors peer-checked:border-sky-500 peer-checked:bg-sky-500 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-100" />
        <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

type InspectorDoubleSidedControlsProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
};

function InspectorDoubleSidedControls({
  enabled,
  onEnabledChange
}: InspectorDoubleSidedControlsProps) {
  return (
    <InspectorSwitchField
      checked={enabled}
      label="Enabled"
      onChange={(event) => onEnabledChange(event.currentTarget.checked)}
    />
  );
}

type InspectorTextareaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function InspectorTextareaField({ label, value, onChange }: InspectorTextareaFieldProps) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      <span>{label}</span>
      <textarea
        className="mt-1 min-h-20 w-full resize-y rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

type InspectorColorGridProps<TField extends string> = {
  fields: readonly { key: TField; label: string }[];
  value: Record<TField, string>;
  onChange: (fieldKey: TField, value: string) => void;
};

function InspectorColorGrid<TField extends string>({
  fields,
  value,
  onChange
}: InspectorColorGridProps<TField>) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorColorField
          key={field.key}
          field={field}
          value={value[field.key]}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

type InspectorColorFieldProps<TField extends string> = {
  field: { key: TField; label: string };
  value: string;
  onChange: (fieldKey: TField, value: string) => void;
};

function InspectorColorField<TField extends string>({
  field,
  value,
  onChange
}: InspectorColorFieldProps<TField>) {
  return (
    <label className="block min-w-0 text-xs font-medium text-slate-500">
      <span>{field.label}</span>
      <span className="mt-1 flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2">
        <input
          className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
          type="color"
          value={value}
          onChange={(event) => onChange(field.key, event.currentTarget.value)}
        />
        <span className="truncate text-xs tabular-nums text-slate-600">{value}</span>
      </span>
    </label>
  );
}

type InspectorIconOption<TValue extends string> = {
  icon: LucideIcon;
  label: string;
  value: TValue;
};

type InspectorIconSegmentedFieldProps<TValue extends string> = {
  label: string;
  options: readonly InspectorIconOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
};

function InspectorIconSegmentedField<TValue extends string>({
  label,
  options,
  value,
  onChange
}: InspectorIconSegmentedFieldProps<TValue>) {
  return (
    <div className="block min-w-0 text-xs font-medium text-slate-500">
      <span>{label}</span>
      <div className="mt-1 flex h-8 overflow-hidden rounded-md border border-slate-200 bg-white">
        {options.map((option, index) => {
          const Icon = option.icon;
          const active = value === option.value;

          return (
            <button
              key={option.value}
              aria-label={option.label}
              className={cx(
                "flex h-full min-w-0 flex-1 items-center justify-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-100",
                index > 0 && "border-l border-slate-200",
                active
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
              title={option.label}
              type="button"
              onClick={() => onChange(option.value)}
            >
              <Icon size={16} strokeWidth={2.2} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

type TextStyleToggleFieldProps = {
  isBold: boolean;
  isItalic: boolean;
  onBoldChange: (isBold: boolean) => void;
  onItalicChange: (isItalic: boolean) => void;
};

function TextStyleToggleField({
  isBold,
  isItalic,
  onBoldChange,
  onItalicChange
}: TextStyleToggleFieldProps) {
  return (
    <div className="block min-w-0 text-xs font-medium text-slate-500">
      <span>Style</span>
      <div className="mt-1 flex h-8 overflow-hidden rounded-md border border-slate-200 bg-white">
        <InspectorIconToggleButton
          active={isBold}
          icon={Bold}
          label="Bold"
          onClick={() => onBoldChange(!isBold)}
        />
        <InspectorIconToggleButton
          active={isItalic}
          className="border-l border-slate-200"
          icon={Italic}
          label="Italic"
          onClick={() => onItalicChange(!isItalic)}
        />
      </div>
    </div>
  );
}

type InspectorIconToggleButtonProps = {
  active: boolean;
  className?: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

function InspectorIconToggleButton({
  active,
  className,
  icon: Icon,
  label,
  onClick
}: InspectorIconToggleButtonProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cx(
        "flex h-full min-w-0 flex-1 items-center justify-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-100",
        active ? "bg-sky-50 text-sky-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
        className
      )}
      title={label}
      type="button"
      onClick={onClick}
    >
      <Icon size={16} strokeWidth={2.2} />
    </button>
  );
}

type InspectorModeInfoProps = {
  items: readonly {
    description: string;
    label: string;
  }[];
};

function InspectorModeInfo({ items }: InspectorModeInfoProps) {
  return (
    <dl className="space-y-1.5">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="font-semibold text-white">{item.label}</dt>
          <dd className="mt-0.5 text-slate-200">{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}

type InspectorSelectFieldProps<TValue extends string> = {
  info?: ReactNode;
  infoAlign?: "center" | "end" | "start";
  label: string;
  options: readonly { label: string; value: TValue }[];
  value: TValue;
  onChange: (value: TValue) => void;
};

function InspectorSelectField<TValue extends string>({
  info,
  infoAlign,
  label,
  options,
  value,
  onChange
}: InspectorSelectFieldProps<TValue>) {
  const selectId = useId();

  return (
    <div className="block min-w-0 text-xs font-medium text-slate-500">
      <span className="flex min-w-0 items-center gap-1.5">
        <label className="truncate" htmlFor={selectId}>
          {label}
        </label>
        {info ? <InfoTip align={infoAlign}>{info}</InfoTip> : null}
      </span>
      <select
        id={selectId}
        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as TValue)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type AppearanceNumberGridProps = {
  fields: readonly AppearanceNumberFieldDefinition[];
  value: AppearanceDraft;
  onCommit: (fieldKey: keyof typeof appearanceNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: AppearanceFieldKey, value: string) => void;
  onReset: (fieldKey: AppearanceFieldKey) => void;
};

function AppearanceNumberGrid({
  fields,
  value,
  onCommit,
  onDraftChange,
  onReset
}: AppearanceNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={appearanceNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

type TextNumberGridProps = {
  fields: readonly TextNumberFieldDefinition[];
  value: TextDraft;
  onCommit: (fieldKey: keyof typeof textNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: TextFieldKey, value: string) => void;
  onReset: (fieldKey: TextFieldKey) => void;
};

function TextNumberGrid({ fields, value, onCommit, onDraftChange, onReset }: TextNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={textNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

type CounterNumberGridProps = {
  fields: readonly CounterNumberFieldDefinition[];
  value: CounterDraft;
  onCommit: (fieldKey: CounterNumberFieldKey, value: string) => void;
  onDraftChange: (fieldKey: CounterFieldKey, value: string) => void;
  onReset: (fieldKey: CounterFieldKey) => void;
};

function CounterNumberGrid({
  fields,
  value,
  onCommit,
  onDraftChange,
  onReset
}: CounterNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={counterNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

type ImageNumberGridProps = {
  fields: readonly ImageNumberFieldDefinition[];
  value: ImageDraft;
  onCommit: (fieldKey: keyof typeof imageNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: ImageFieldKey, value: string) => void;
  onReset: (fieldKey: ImageFieldKey) => void;
};

function ImageNumberGrid({
  fields,
  value,
  onCommit,
  onDraftChange,
  onReset
}: ImageNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={imageNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

type LayoutNumberGridProps = {
  fields: readonly LayoutNumberFieldDefinition[];
  value: LayoutDraft;
  onCommit: (fieldKey: keyof typeof layoutNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: LayoutFieldKey, value: string) => void;
  onReset: (fieldKey: LayoutFieldKey) => void;
};

function LayoutNumberGrid({
  fields,
  value,
  onCommit,
  onDraftChange,
  onReset
}: LayoutNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={layoutNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

type BehaviorNumberFieldDefinition<TFieldKey extends string> = {
  key: TFieldKey;
  label: string;
};

type InspectorBehaviorNumberFieldProps<TFieldKey extends string> = {
  field: BehaviorNumberFieldDefinition<TFieldKey>;
  settings: { max: number; min: number; step: number };
  value: string;
  onCommit: (fieldKey: TFieldKey, value: string) => void;
  onDraftChange: (fieldKey: TFieldKey, value: string) => void;
  onReset: (fieldKey: TFieldKey) => void;
};

function InspectorBehaviorNumberField<TFieldKey extends string>({
  field,
  settings,
  value,
  onCommit,
  onDraftChange,
  onReset
}: InspectorBehaviorNumberFieldProps<TFieldKey>) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onReset(field.key);
    }
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    onCommit(field.key, event.currentTarget.value);
  }

  return (
    <label className="block min-w-0 text-xs font-medium text-slate-500">
      <span>{field.label}</span>
      <input
        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm tabular-nums text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        inputMode="decimal"
        max={settings.max}
        min={settings.min}
        step={settings.step}
        type="number"
        value={value}
        onBlur={handleBlur}
        onChange={(event) => onDraftChange(field.key, event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />
    </label>
  );
}

type InspectorNumberGridProps = {
  disabledFields?: ReadonlySet<RectTransformFieldKey>;
  disabledTitle?: string;
  fields: readonly RectTransformFieldDefinition[];
  rectTransformDraft: RectTransformDraft;
  onCommit: (fieldKey: RectTransformFieldKey, value: string) => void;
  onDraftChange: (fieldKey: RectTransformFieldKey, value: string) => void;
  onReset: (fieldKey: RectTransformFieldKey) => void;
};

function InspectorNumberGrid({
  disabledFields,
  disabledTitle,
  fields,
  rectTransformDraft,
  onCommit,
  onDraftChange,
  onReset
}: InspectorNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorNumberField
          key={field.key}
          disabled={disabledFields?.has(field.key) ?? false}
          disabledTitle={disabledTitle}
          field={field}
          value={rectTransformDraft[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

type InspectorNumberFieldProps = {
  disabled?: boolean;
  disabledTitle?: string;
  field: RectTransformFieldDefinition;
  value: string;
  onCommit: (fieldKey: RectTransformFieldKey, value: string) => void;
  onDraftChange: (fieldKey: RectTransformFieldKey, value: string) => void;
  onReset: (fieldKey: RectTransformFieldKey) => void;
};

function InspectorNumberField({
  disabled = false,
  disabledTitle,
  field,
  value,
  onCommit,
  onDraftChange,
  onReset
}: InspectorNumberFieldProps) {
  const settings = rectTransformFieldSettings[field.key];

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onReset(field.key);
    }
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    onCommit(field.key, event.currentTarget.value);
  }

  return (
    <label
      className="block min-w-0 text-xs font-medium text-slate-500"
      title={disabled ? disabledTitle : undefined}
    >
      <span>{field.label}</span>
      <input
        className={cx(
          "mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm tabular-nums text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100",
          disabled && "cursor-not-allowed bg-slate-100 text-slate-400"
        )}
        disabled={disabled}
        inputMode="decimal"
        max={settings.max}
        min={settings.min}
        step={settings.step}
        type="number"
        value={value}
        onBlur={handleBlur}
        onChange={(event) => onDraftChange(field.key, event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />
    </label>
  );
}

function getFallbackAppearanceDraftValue(): ProjectObjectAppearance {
  return {
    backgroundColor: "#ffffff",
    backgroundOpacity: 1,
    borderColor: "#cbd5e1",
    borderRadius: 0,
    borderStyle: "none",
    borderWidth: 0,
    opacity: 1,
    padding: 0
  };
}

function getFallbackCardDraftValue(): ProjectObjectCard {
  return {
    sizePreset: "poker"
  };
}

function getFallbackCounterDraftValue(): ProjectObjectCounter {
  return getDefaultProjectObjectCounter();
}

function getFallbackDieDraftValue(): ProjectObjectDie {
  return getDefaultProjectObjectDie();
}

function getFallbackTextDraftValue(): ProjectObjectText {
  return {
    color: "#0f172a",
    content: "",
    fontSize: 16,
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: 1.2,
    textAlign: "center",
    verticalAlign: "middle"
  };
}

function getFallbackImageDraftValue(): ProjectObjectImage {
  return {
    assetId: "",
    fit: "contain",
    positionX: 50,
    positionY: 50
  };
}

function getFallbackLayoutDraftValue(): ProjectObjectLayout {
  return {
    alignItems: "start",
    columns: 3,
    gap: 8,
    justifyContent: "start",
    mode: "free"
  };
}

function getLayoutNumberFields(layoutDraft: LayoutDraft): readonly LayoutNumberFieldDefinition[] {
  if (layoutDraft.mode === "free") {
    return [];
  }

  if (layoutDraft.mode === "grid") {
    return [layoutColumnsField, layoutGapField];
  }

  if (layoutDraft.justifyContent === "spaceBetween") {
    return [];
  }

  return [layoutGapField];
}

function getLayoutJustifyOptions(mode: ProjectObjectLayoutMode) {
  return mode === "vertical" ? verticalLayoutJustifyOptions : horizontalLayoutJustifyOptions;
}

function getLayoutAlignOptions(mode: ProjectObjectLayoutMode) {
  return mode === "vertical" ? horizontalLayoutAlignOptions : verticalLayoutAlignOptions;
}

function getLayoutMainAxisLabel(mode: ProjectObjectLayoutMode) {
  return mode === "vertical" ? "Vertical" : "Horizontal";
}

function getLayoutCrossAxisLabel(mode: ProjectObjectLayoutMode) {
  return mode === "vertical" ? "Horizontal" : "Vertical";
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
