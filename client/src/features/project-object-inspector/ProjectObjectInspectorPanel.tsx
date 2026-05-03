import type {
  ProjectFileNode,
  ProjectObjectAppearance,
  ProjectObjectBag,
  ProjectObjectCard,
  ProjectObjectCardSizePresetValue,
  ProjectObjectContainer,
  ProjectObjectCounter,
  ProjectObjectDeck,
  ProjectObjectDie,
  ProjectObjectImage,
  ProjectObjectKind,
  ProjectObjectLayout,
  ProjectObjectMeeple,
  ProjectObjectNode,
  ProjectObjectShape,
  ProjectObjectShapePoint,
  ProjectObjectTemplate,
  ProjectObjectStackDisplay,
  ProjectObjectText,
  ProjectObjectVariableBindingTarget,
  ProjectObjectVariableDefinition,
  ProjectObjectVariableType,
  ProjectObjectZone,
  ProjectTableSetup,
  ProjectTableSetupItem,
  ProjectTableSetupItemTransform
} from "@bg-maker/shared";
import {
  findProjectFileNodeInTree,
  getDefaultProjectObjectVariableValue,
  getDefaultProjectObjectCounter,
  getDefaultProjectObjectBag,
  getDefaultProjectObjectDeck,
  getDefaultProjectObjectDie,
  getDefaultProjectObjectMeeple,
  getDefaultProjectObjectStackDisplay,
  getDefaultProjectObjectZone,
  getProjectObjectContainerAcceptedObjectKinds,
  getProjectObjectContainerTotalCount,
  getProjectObjectVariableDefaultValues,
  hasProjectObjectLayout,
  isProjectObjectCardSizePresetLocked,
  projectObjectCardCustomSizePresetId,
  projectObjectCardSizePresets,
  projectTableSetupGridSizeLimits,
  projectTableSetupSizeLimits,
  resolveProjectObjectFileObjectTree
} from "@bg-maker/shared";
import { Rows3, SlidersHorizontal } from "lucide-react";
import { type ChangeEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { uploadProjectImageAsset } from "../project-workspace/project-api";
import { updateProjectFileNode } from "../project-files/project-file-tree";
import {
  appendProjectImageAssetFileNode,
  getProjectImageAssetOptionById,
  getProjectImageAssetOptions,
  rememberTemporaryProjectImageAssetUrl
} from "../project-assets/project-image-assets";
import {
  getProjectObjectNodeAppearance,
  getProjectObjectNodeBag,
  getProjectObjectNodeCard,
  getProjectObjectNodeContainer,
  getProjectObjectNodeCounter,
  getProjectObjectNodeDeck,
  getProjectObjectNodeDie,
  getProjectObjectNodeDoubleSide,
  getProjectObjectNodeImage,
  getProjectObjectNodeLayout,
  getProjectObjectNodeMeeple,
  getProjectObjectNodeRectTransform,
  getProjectObjectNodeShape,
  getProjectObjectNodeStackDisplay,
  getProjectObjectNodeText,
  getProjectObjectNodeZone,
  renameProjectObjectNode,
  setProjectObjectNodeAppearance,
  setProjectObjectNodeBag,
  setProjectObjectNodeCard,
  setProjectObjectNodeContainer,
  setProjectObjectNodeCounter,
  setProjectObjectNodeDeck,
  setProjectObjectNodeDie,
  setProjectObjectNodeDoubleSide,
  setProjectObjectNodeImage,
  setProjectObjectNodeLayout,
  setProjectObjectNodeMeeple,
  setProjectObjectNodeRectTransform,
  setProjectObjectNodeShape,
  setProjectObjectNodeStackDisplay,
  setProjectObjectNodeText,
  setProjectObjectNodeVisibility,
  setProjectObjectNodeZone,
  updateProjectFileNodeObjectTree
} from "../project-objects/project-object-tree";
import {
  createRectTransformDraft,
  createAppearanceDraft,
  createBagDraft,
  createCardDraft,
  createCounterDraft,
  createDeckDraft,
  createDieDraft,
  createImageDraft,
  createLayoutDraft,
  createMeepleDraft,
  createStackDisplayDraft,
  createTextDraft,
  createZoneDraft,
  formatAppearanceNumberValue,
  formatContainerEntryQuantityValue,
  getContainerEntryReferenceValue,
  formatCounterNumberValue,
  formatDieNumberValue,
  formatImageNumberValue,
  formatLayoutNumberValue,
  formatRectTransformValue,
  formatStackDisplayNumberValue,
  formatTextNumberValue,
  formatZoneNumberValue,
  getAppearanceWithDraftField,
  getBagWithDraftField,
  getCardWithDraftField,
  getContainerWithAddedEntry,
  getContainerWithEntryObjectFileNodeId,
  getContainerWithEntryQuantityDraftField,
  getContainerWithMovedEntry,
  getContainerWithRemovedEntry,
  getCounterWithDraftField,
  getDeckWithDraftField,
  getDieFace,
  getDieWithDraftField,
  getDieWithFaceField,
  getImageWithDraftField,
  getLayoutWithDraftField,
  getMeepleWithDraftField,
  getRectTransformWithDraftField,
  getShapePolygonPoints,
  getShapeWithAddedPolygonPoint,
  getShapeWithDefaultPolygonPoints,
  getShapeWithPolygonPoint,
  getShapeWithPolygonPointDraftField,
  getShapeWithRemovedPolygonPoint,
  getShapeWithVariant,
  getStackDisplayWithDraftField,
  getTextFontStyleForItalic,
  getTextFontWeightForBold,
  getTextWithDraftField,
  getZoneWithDraftField,
  imageNumberFieldSettings,
  isTextFontWeightBold,
  normalizeRectTransformValue,
  normalizeAppearanceNumberValue,
  normalizeContainerEntryQuantityValue,
  normalizeCounterNumberValue,
  normalizeDieNumberValue,
  normalizeImageNumberValue,
  normalizeLayoutNumberValue,
  normalizeStackDisplayNumberValue,
  normalizeTextNumberValue,
  normalizeZoneNumberValue,
  parseRectTransformDraftValue,
  appearanceNumberFieldSettings,
  dieNumberFieldSettings,
  layoutNumberFieldSettings,
  textNumberFieldSettings,
  type AppearanceDraft,
  type AppearanceFieldKey,
  type BagDraft,
  type BagFieldKey,
  type CardDraft,
  type CardFieldKey,
  type CounterDraft,
  type CounterFieldKey,
  type CounterNumberFieldKey,
  type DeckDraft,
  type DeckFieldKey,
  type DieDraft,
  type DieFaceFieldKey,
  type DieFieldKey,
  type ImageDraft,
  type ImageFieldKey,
  type LayoutDraft,
  type LayoutFieldKey,
  type MeepleDraft,
  type MeepleFieldKey,
  type RectTransformDraft,
  type RectTransformFieldKey,
  type ShapePolygonPointFieldKey,
  type StackDisplayDraft,
  type StackDisplayFieldKey,
  type StackDisplayNumberFieldKey,
  type TextDraft,
  type TextFieldKey,
  type ZoneDraft,
  type ZoneFieldKey,
  type ZoneNumberFieldKey
} from "./project-object-inspector-state";
import {
  ensureProjectObjectTemplate,
  getCompatibleProjectObjectVariables,
  getProjectObjectNodeVariableBinding,
  getProjectObjectSourceRefWithValue,
  getProjectObjectTemplateWithAddedVariable,
  getProjectObjectTemplateWithRemovedVariable,
  getProjectObjectTemplateWithUpdatedVariable,
  setProjectObjectNodeVariableBinding
} from "../project-objects/project-object-template";
import { cx } from "./class-names";
import {
  ProjectObjectImageSection,
  ProjectObjectShapeSection,
  ProjectObjectTextSection
} from "./ProjectObjectContentSections";
import { ProjectObjectHeaderSection } from "./ProjectObjectHeaderSection";
import {
  ProjectObjectCounterSection,
  ProjectObjectDieSection,
  ProjectObjectDoubleSidedSection
} from "./ProjectObjectMechanicsSections";
import {
  ProjectObjectBagSection,
  ProjectObjectCardSection,
  ProjectObjectContainerSection,
  ProjectObjectDeckSection,
  ProjectObjectMeepleSection,
  ProjectObjectStackSection,
  ProjectObjectZoneSection
} from "./ProjectObjectStructureSections";
import {
  ProjectObjectLinkedObjectSection,
  ProjectObjectTemplateSection
} from "./ProjectObjectTemplateSections";
import type { VariableBindingFieldState } from "./ProjectObjectVariableBindingField";
import {
  ProjectObjectAppearanceSection,
  ProjectObjectLayoutSection,
  ProjectObjectTransformSections
} from "./ProjectObjectStyleSections";
import {
  InspectorBehaviorNumberField,
  InspectorColorField,
  InspectorSection,
  InspectorSwitchField
} from "./inspector-ui";
import {
  getProjectTableSetupWithItemTransform,
  getProjectTableSetupWithLinkedItemValues
} from "../project-table-setup/project-table-setup";

type ProjectObjectInspectorPanelProps = {
  className?: string;
  contentFileNode: ProjectFileNode | null;
  fileTree: ProjectFileNode[];
  objectTree?: ProjectObjectNode[];
  projectId: string;
  selectedObject: ProjectObjectNode | null;
  selectedTableSetupItem?: ProjectTableSetupItem | null;
  tableSetup?: ProjectTableSetup | null;
  onFileTreeChange: (fileTree: ProjectFileNode[]) => void;
  onObjectTreeChange: (fileNodeId: string, objectTree: ProjectObjectNode[]) => void;
  onTableSetupChange?: (tableSetup: ProjectTableSetup, label?: string) => void;
};

const cardPresetLockedRectTransformFields = new Set<RectTransformFieldKey>([
  "height",
  "scaleX",
  "scaleY",
  "width"
]);

const zoneLockedRectTransformFields = new Set<RectTransformFieldKey>(["height", "width"]);

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

type TableSetupDraft = {
  backgroundColor: string;
  gridSize: string;
  gridSnap: boolean;
  gridVisible: boolean;
  height: string;
  width: string;
};

type TableSetupNumberFieldKey = "gridSize" | "height" | "width";

type LinkedItemTransformDraft = Record<keyof ProjectTableSetupItemTransform, string>;

const tableSetupNumberFieldSettings = {
  gridSize: {
    max: projectTableSetupGridSizeLimits.max,
    min: projectTableSetupGridSizeLimits.min,
    step: 1
  },
  height: {
    max: projectTableSetupSizeLimits.max,
    min: projectTableSetupSizeLimits.min,
    step: 1
  },
  width: {
    max: projectTableSetupSizeLimits.max,
    min: projectTableSetupSizeLimits.min,
    step: 1
  }
} as const satisfies Record<TableSetupNumberFieldKey, { max: number; min: number; step: number }>;

const tableSetupSizeNumberFields = [
  { key: "width", label: "Width" },
  { key: "height", label: "Height" }
] as const;

const tableSetupGridSizeField = { key: "gridSize", label: "Grid size" } as const;

const tableSetupNumberFields = [...tableSetupSizeNumberFields, tableSetupGridSizeField] as const;

const tableSetupNumberDraftDebounceMs = 250;

const tableSetupColorField = {
  key: "backgroundColor",
  label: "Surface"
} as const;

const linkedItemTransformFields = [
  { key: "x", label: "X" },
  { key: "y", label: "Y" },
  { key: "rotation", label: "Rotation" },
  { key: "scaleX", label: "Scale X" },
  { key: "scaleY", label: "Scale Y" }
] as const;

export function ProjectObjectInspectorPanel({
  className,
  contentFileNode,
  fileTree,
  objectTree: resolvedObjectTree,
  projectId,
  selectedObject,
  selectedTableSetupItem = null,
  tableSetup = null,
  onFileTreeChange,
  onObjectTreeChange,
  onTableSetupChange
}: ProjectObjectInspectorPanelProps) {
  const objectTree = useMemo(
    () => resolvedObjectTree ?? contentFileNode?.objectTree ?? [],
    [contentFileNode?.objectTree, resolvedObjectTree]
  );
  const imageAssets = useMemo(
    () => getProjectImageAssetOptions(projectId, fileTree),
    [fileTree, projectId]
  );
  const objectTemplate = useMemo(
    () =>
      contentFileNode?.kind === "object" && !contentFileNode.sourceRef
        ? ensureProjectObjectTemplate(contentFileNode.template)
        : null,
    [contentFileNode]
  );
  const sourceObjectFileNode = useMemo(
    () =>
      contentFileNode?.sourceRef
        ? findProjectFileNodeInTree(fileTree, contentFileNode.sourceRef.sourceObjectFileNodeId)
        : undefined,
    [contentFileNode?.sourceRef, fileTree]
  );
  const sourceObjectTemplate = useMemo(
    () =>
      sourceObjectFileNode?.kind === "object"
        ? ensureProjectObjectTemplate(sourceObjectFileNode.template)
        : null,
    [sourceObjectFileNode]
  );
  const linkedObjectValues = useMemo(
    () =>
      contentFileNode?.sourceRef && sourceObjectTemplate
        ? {
            ...getProjectObjectVariableDefaultValues(sourceObjectTemplate),
            ...contentFileNode.sourceRef.values
          }
        : {},
    [contentFileNode?.sourceRef, sourceObjectTemplate]
  );
  const selectedLinkedTableSetupItem =
    selectedTableSetupItem?.type === "linkedObject" ? selectedTableSetupItem : null;
  const linkedTableSourceObjectFileNode = useMemo(
    () =>
      selectedLinkedTableSetupItem
        ? findProjectFileNodeInTree(fileTree, selectedLinkedTableSetupItem.sourceObjectFileNodeId)
        : undefined,
    [fileTree, selectedLinkedTableSetupItem]
  );
  const linkedTableSourceTemplate = useMemo(
    () =>
      linkedTableSourceObjectFileNode?.kind === "object"
        ? ensureProjectObjectTemplate(linkedTableSourceObjectFileNode.template)
        : null,
    [linkedTableSourceObjectFileNode]
  );
  const linkedTableObjectValues = useMemo(
    () =>
      selectedLinkedTableSetupItem && linkedTableSourceTemplate
        ? {
            ...getProjectObjectVariableDefaultValues(linkedTableSourceTemplate),
            ...selectedLinkedTableSetupItem.values
          }
        : {},
    [linkedTableSourceTemplate, selectedLinkedTableSetupItem]
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
    () => (selectedObject?.kind === "counter" ? getProjectObjectNodeCounter(selectedObject) : null),
    [selectedObject]
  );
  const deck = useMemo(
    () => (selectedObject?.kind === "deck" ? getProjectObjectNodeDeck(selectedObject) : null),
    [selectedObject]
  );
  const bag = useMemo(
    () => (selectedObject?.kind === "bag" ? getProjectObjectNodeBag(selectedObject) : null),
    [selectedObject]
  );
  const meeple = useMemo(
    () => (selectedObject?.kind === "meeple" ? getProjectObjectNodeMeeple(selectedObject) : null),
    [selectedObject]
  );
  const container = useMemo(
    () =>
      selectedObject?.kind === "deck" || selectedObject?.kind === "bag"
        ? getProjectObjectNodeContainer(selectedObject)
        : null,
    [selectedObject]
  );
  const stackDisplay = useMemo(
    () =>
      selectedObject?.kind === "deck" ? getProjectObjectNodeStackDisplay(selectedObject) : null,
    [selectedObject]
  );
  const zone = useMemo(
    () => (selectedObject?.kind === "zone" ? getProjectObjectNodeZone(selectedObject) : null),
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
  const [deckDraft, setDeckDraft] = useState<DeckDraft>(() =>
    deck ? createDeckDraft(deck) : createDeckDraft(getFallbackDeckDraftValue())
  );
  const [bagDraft, setBagDraft] = useState<BagDraft>(() =>
    bag ? createBagDraft(bag) : createBagDraft(getFallbackBagDraftValue())
  );
  const [meepleDraft, setMeepleDraft] = useState<MeepleDraft>(() =>
    meeple ? createMeepleDraft(meeple) : createMeepleDraft(getFallbackMeepleDraftValue())
  );
  const [stackDisplayDraft, setStackDisplayDraft] = useState<StackDisplayDraft>(() =>
    stackDisplay
      ? createStackDisplayDraft(stackDisplay)
      : createStackDisplayDraft(getFallbackStackDisplayDraftValue())
  );
  const [zoneDraft, setZoneDraft] = useState<ZoneDraft>(() =>
    zone ? createZoneDraft(zone) : createZoneDraft(getFallbackZoneDraftValue())
  );
  const [containerEntryQuantityDrafts, setContainerEntryQuantityDrafts] = useState<string[]>(() =>
    container
      ? container.entries.map((entry) => formatContainerEntryQuantityValue(entry.quantity))
      : []
  );
  const [containerDraftRowIds, setContainerDraftRowIds] = useState<number[]>([]);
  const [nextContainerDraftRowId, setNextContainerDraftRowId] = useState(1);
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
  const [tableSetupDraft, setTableSetupDraft] = useState<TableSetupDraft>(() =>
    createTableSetupDraft(tableSetup)
  );
  const [tableSetupNumberDraftDirty, setTableSetupNumberDraftDirty] = useState(false);
  const [linkedItemTransformDraft, setLinkedItemTransformDraft] =
    useState<LinkedItemTransformDraft>(() =>
      createLinkedItemTransformDraft(selectedLinkedTableSetupItem?.transform)
    );
  const tableSetupNumberDraftTimeoutRef = useRef<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [uploadingDieFaceImage, setUploadingDieFaceImage] = useState(false);
  const [dieFaceImageUploadError, setDieFaceImageUploadError] = useState<string | null>(null);
  const [uploadingPropertyImageVariableId, setUploadingPropertyImageVariableId] = useState<
    string | null
  >(null);
  const [propertyImageUploadErrors, setPropertyImageUploadErrors] = useState<
    Record<string, string>
  >({});

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
    if (deck) {
      setDeckDraft(createDeckDraft(deck));
    }
  }, [deck, selectedObject?.id]);

  useEffect(() => {
    if (bag) {
      setBagDraft(createBagDraft(bag));
    }
  }, [bag, selectedObject?.id]);

  useEffect(() => {
    if (meeple) {
      setMeepleDraft(createMeepleDraft(meeple));
    }
  }, [meeple, selectedObject?.id]);

  useEffect(() => {
    if (stackDisplay) {
      setStackDisplayDraft(createStackDisplayDraft(stackDisplay));
    }
  }, [selectedObject?.id, stackDisplay]);

  useEffect(() => {
    if (zone) {
      setZoneDraft(createZoneDraft(zone));
    }
  }, [selectedObject?.id, zone]);

  useEffect(() => {
    if (container) {
      setContainerEntryQuantityDrafts(
        container.entries.map((entry) => formatContainerEntryQuantityValue(entry.quantity))
      );
    }
  }, [container, selectedObject?.id]);

  useEffect(() => {
    setContainerDraftRowIds([]);
    setNextContainerDraftRowId(1);
  }, [selectedObject?.id]);

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

  useEffect(() => {
    setTableSetupDraft(createTableSetupDraft(tableSetup));
    setTableSetupNumberDraftDirty(false);
  }, [contentFileNode?.id, tableSetup]);

  useEffect(() => {
    if (tableSetupNumberDraftTimeoutRef.current !== null) {
      window.clearTimeout(tableSetupNumberDraftTimeoutRef.current);
      tableSetupNumberDraftTimeoutRef.current = null;
    }

    if (!tableSetup || !onTableSetupChange || !tableSetupNumberDraftDirty) {
      return;
    }

    const nextTableSetup = getTableSetupWithNumberDraft(tableSetup, tableSetupDraft);

    if (nextTableSetup === null) {
      setTableSetupNumberDraftDirty(false);
      return;
    }

    if (!nextTableSetup) {
      return;
    }

    tableSetupNumberDraftTimeoutRef.current = window.setTimeout(() => {
      tableSetupNumberDraftTimeoutRef.current = null;
      setTableSetupNumberDraftDirty(false);
      setTableSetupDraft(createTableSetupDraft(nextTableSetup));
      onTableSetupChange(nextTableSetup, "Update table setup");
    }, tableSetupNumberDraftDebounceMs);

    return () => {
      if (tableSetupNumberDraftTimeoutRef.current !== null) {
        window.clearTimeout(tableSetupNumberDraftTimeoutRef.current);
        tableSetupNumberDraftTimeoutRef.current = null;
      }
    };
  }, [onTableSetupChange, tableSetup, tableSetupDraft, tableSetupNumberDraftDirty]);

  useEffect(() => {
    setLinkedItemTransformDraft(
      createLinkedItemTransformDraft(selectedLinkedTableSetupItem?.transform)
    );
  }, [selectedLinkedTableSetupItem?.id, selectedLinkedTableSetupItem?.transform]);

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

  function updateCurrentObjectFile(updateNode: (node: ProjectFileNode) => ProjectFileNode) {
    if (!contentFileNode) {
      return;
    }

    const nextFileTree = updateProjectFileNode(fileTree, contentFileNode.id, updateNode);

    if (nextFileTree !== fileTree) {
      onFileTreeChange(nextFileTree);
    }
  }

  function updateCurrentObjectTemplate(template: ProjectObjectTemplate) {
    updateCurrentObjectFile((node) => ({
      ...node,
      template
    }));
  }

  function addTemplateVariable() {
    updateCurrentObjectTemplate(
      getProjectObjectTemplateWithAddedVariable(objectTemplate ?? undefined)
    );
  }

  function updateTemplateVariableName(variableId: string, name: string) {
    updateCurrentObjectTemplate(
      getProjectObjectTemplateWithUpdatedVariable(
        objectTemplate ?? undefined,
        variableId,
        (variable) => ({
          ...variable,
          name
        })
      )
    );
  }

  function updateTemplateVariableType(variableId: string, type: ProjectObjectVariableType) {
    updateCurrentObjectTemplate(
      getProjectObjectTemplateWithUpdatedVariable(
        objectTemplate ?? undefined,
        variableId,
        (variable) => ({
          ...variable,
          type,
          defaultValue: getDefaultProjectObjectVariableValue(type)
        })
      )
    );
  }

  function updateTemplateVariableDefaultValue(
    variable: ProjectObjectVariableDefinition,
    value: string
  ) {
    updateCurrentObjectTemplate(
      getProjectObjectTemplateWithUpdatedVariable(
        objectTemplate ?? undefined,
        variable.id,
        (currentVariable) => ({
          ...currentVariable,
          defaultValue: value
        })
      )
    );
  }

  function removeTemplateVariable(variableId: string) {
    updateCurrentObjectTemplate(
      getProjectObjectTemplateWithRemovedVariable(objectTemplate ?? undefined, variableId)
    );
  }

  function updateVariableBinding(target: ProjectObjectVariableBindingTarget, variableId: string) {
    if (!contentFileNode || !selectedObject || contentFileNode.sourceRef) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeVariableBinding(
      objectTree,
      selectedObject.id,
      target,
      variableId
    );

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function getVariableBindingField(
    target: ProjectObjectVariableBindingTarget
  ): VariableBindingFieldState | undefined {
    if (!objectTemplate || !selectedObject || contentFileNode?.sourceRef) {
      return undefined;
    }

    const options = getCompatibleProjectObjectVariables(objectTemplate, target).map((variable) => ({
      label: variable.name,
      value: variable.id
    }));

    if (!options.length) {
      return undefined;
    }

    return {
      options,
      value: getProjectObjectNodeVariableBinding(selectedObject, target),
      onChange: (variableId) => updateVariableBinding(target, variableId)
    };
  }

  function updateLinkedObjectVariableValue(
    variable: ProjectObjectVariableDefinition,
    value: string
  ) {
    const sourceRef = contentFileNode?.sourceRef;

    if (!sourceRef) {
      return;
    }

    updateCurrentObjectFile((node) => ({
      ...node,
      sourceRef: getProjectObjectSourceRefWithValue(sourceRef, variable, value)
    }));
  }

  async function uploadTemplateVariableImageValue(
    variable: ProjectObjectVariableDefinition,
    file: File
  ) {
    await uploadPropertyImageValue(variable, file, (imageAssetId) => {
      if (!contentFileNode || contentFileNode.kind !== "object" || contentFileNode.sourceRef) {
        return fileTree;
      }

      const nextTemplate = getProjectObjectTemplateWithUpdatedVariable(
        objectTemplate ?? undefined,
        variable.id,
        (currentVariable) => ({
          ...currentVariable,
          defaultValue: imageAssetId
        })
      );

      return updateProjectFileNode(fileTree, contentFileNode.id, (node) => ({
        ...node,
        template: nextTemplate
      }));
    });
  }

  async function uploadLinkedObjectVariableImageValue(
    variable: ProjectObjectVariableDefinition,
    file: File
  ) {
    const sourceRef = contentFileNode?.sourceRef;

    if (!sourceRef) {
      return;
    }

    await uploadPropertyImageValue(variable, file, (imageAssetId) =>
      updateProjectFileNode(fileTree, contentFileNode.id, (node) => ({
        ...node,
        sourceRef: getProjectObjectSourceRefWithValue(sourceRef, variable, imageAssetId)
      }))
    );
  }

  function updateTableLinkedObjectVariableValue(
    variable: ProjectObjectVariableDefinition,
    value: string
  ) {
    if (!tableSetup || !selectedLinkedTableSetupItem) {
      return;
    }

    const sourceRef = {
      sourceObjectFileNodeId: selectedLinkedTableSetupItem.sourceObjectFileNodeId,
      values: selectedLinkedTableSetupItem.values
    };
    const nextSourceRef = getProjectObjectSourceRefWithValue(sourceRef, variable, value);
    const nextTableSetup = getProjectTableSetupWithLinkedItemValues(
      tableSetup,
      selectedLinkedTableSetupItem.id,
      nextSourceRef.values
    );

    onTableSetupChange?.(nextTableSetup, "Update table item values");
  }

  async function uploadTableLinkedObjectVariableImageValue(
    variable: ProjectObjectVariableDefinition,
    file: File
  ) {
    if (!tableSetup || !selectedLinkedTableSetupItem) {
      return;
    }

    await uploadPropertyImageValue(variable, file, (imageAssetId) => {
      const sourceRef = {
        sourceObjectFileNodeId: selectedLinkedTableSetupItem.sourceObjectFileNodeId,
        values: selectedLinkedTableSetupItem.values
      };
      const nextSourceRef = getProjectObjectSourceRefWithValue(sourceRef, variable, imageAssetId);
      const nextTableSetup = getProjectTableSetupWithLinkedItemValues(
        tableSetup,
        selectedLinkedTableSetupItem.id,
        nextSourceRef.values
      );

      if (!contentFileNode) {
        return fileTree;
      }

      return updateProjectFileNode(fileTree, contentFileNode.id, (node) =>
        node.kind === "tableSetup" ? { ...node, tableSetup: nextTableSetup } : node
      );
    });
  }

  function updateTableSetupColor(fieldKey: "backgroundColor", value: string) {
    setTableSetupDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));

    if (tableSetup && /^#[0-9a-fA-F]{6}$/.test(value)) {
      onTableSetupChange?.({ ...tableSetup, backgroundColor: value }, "Update table setup");
    }
  }

  function updateTableSetupSwitch(fieldKey: "gridSnap" | "gridVisible", value: boolean) {
    setTableSetupDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));

    if (!tableSetup) {
      return;
    }

    onTableSetupChange?.(
      {
        ...tableSetup,
        grid: {
          ...tableSetup.grid,
          snap: fieldKey === "gridSnap" ? value : tableSetup.grid.snap,
          visible: fieldKey === "gridVisible" ? value : tableSetup.grid.visible
        }
      },
      "Update table setup"
    );
  }

  function updateTableSetupNumberDraft(fieldKey: TableSetupNumberFieldKey, value: string) {
    setTableSetupDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    setTableSetupNumberDraftDirty(true);
  }

  function resetTableSetupDraft() {
    if (tableSetupNumberDraftTimeoutRef.current !== null) {
      window.clearTimeout(tableSetupNumberDraftTimeoutRef.current);
      tableSetupNumberDraftTimeoutRef.current = null;
    }

    setTableSetupNumberDraftDirty(false);
    setTableSetupDraft(createTableSetupDraft(tableSetup));
  }

  function commitTableSetupNumberField(fieldKey: TableSetupNumberFieldKey, value: string) {
    if (!tableSetup) {
      return;
    }

    if (tableSetupNumberDraftTimeoutRef.current !== null) {
      window.clearTimeout(tableSetupNumberDraftTimeoutRef.current);
      tableSetupNumberDraftTimeoutRef.current = null;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      setTableSetupNumberDraftDirty(false);
      setTableSetupDraft(createTableSetupDraft(tableSetup));
      return;
    }

    const normalizedValue = normalizeTableSetupNumberValue(fieldKey, parsedValue);
    const nextTableSetup = getTableSetupWithNumberField(tableSetup, fieldKey, normalizedValue);

    setTableSetupNumberDraftDirty(false);
    setTableSetupDraft(createTableSetupDraft(nextTableSetup));

    if (nextTableSetup !== tableSetup) {
      onTableSetupChange?.(nextTableSetup, "Update table setup");
    }
  }

  function updateLinkedItemTransformDraft(
    fieldKey: keyof ProjectTableSetupItemTransform,
    value: string
  ) {
    setLinkedItemTransformDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
  }

  function commitLinkedItemTransformField(
    fieldKey: keyof ProjectTableSetupItemTransform,
    value: string
  ) {
    if (!tableSetup || !selectedLinkedTableSetupItem) {
      return;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      setLinkedItemTransformDraft(
        createLinkedItemTransformDraft(selectedLinkedTableSetupItem.transform)
      );
      return;
    }

    const nextTransform = {
      ...selectedLinkedTableSetupItem.transform,
      [fieldKey]: normalizeLinkedItemTransformValue(fieldKey, parsedValue)
    };
    const nextTableSetup = getProjectTableSetupWithItemTransform(
      tableSetup,
      selectedLinkedTableSetupItem.id,
      nextTransform
    );

    setLinkedItemTransformDraft(createLinkedItemTransformDraft(nextTransform));
    onTableSetupChange?.(nextTableSetup, "Update table item transform");
  }

  async function uploadPropertyImageValue(
    variable: ProjectObjectVariableDefinition,
    file: File,
    getFileTreeWithValue: (imageAssetId: string) => ProjectFileNode[]
  ) {
    if (variable.type !== "image") {
      return;
    }

    setUploadingPropertyImageVariableId(variable.id);
    setPropertyImageUploadErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[variable.id];
      return nextErrors;
    });

    try {
      const imageAsset = await uploadProjectImageAsset(projectId, file);
      rememberTemporaryProjectImageAssetUrl(imageAsset.id, file);
      const fileTreeWithValue = getFileTreeWithValue(imageAsset.id);
      const { fileTree: fileTreeWithImageAsset } = appendProjectImageAssetFileNode(
        fileTreeWithValue,
        imageAsset
      );

      onFileTreeChange(fileTreeWithImageAsset);
    } catch (error) {
      setPropertyImageUploadErrors((currentErrors) => ({
        ...currentErrors,
        [variable.id]: error instanceof Error ? error.message : "Image upload failed"
      }));
    } finally {
      setUploadingPropertyImageVariableId(null);
    }
  }

  function isRectTransformFieldLocked(fieldKey: RectTransformFieldKey) {
    const sizedObject = card ?? deck;

    const presetLocked = Boolean(
      sizedObject &&
      isProjectObjectCardSizePresetLocked(sizedObject) &&
      cardPresetLockedRectTransformFields.has(fieldKey)
    );

    return presetLocked || Boolean(zone && zoneLockedRectTransformFields.has(fieldKey));
  }

  function updateRectTransformDraft(fieldKey: RectTransformFieldKey, value: string) {
    if (isRectTransformFieldLocked(fieldKey)) {
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
      isRectTransformFieldLocked(fieldKey)
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
      isRectTransformFieldLocked(fieldKey)
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

    const nextObjectTree = setProjectObjectNodeCounter(objectTree, selectedObject.id, nextCounter);

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

  function updateDeckDraft<TFieldKey extends DeckFieldKey>(
    fieldKey: TFieldKey,
    value: ProjectObjectDeck[TFieldKey]
  ) {
    setDeckDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeDeckField(fieldKey, value);
  }

  function updateObjectTreeDeckField<TFieldKey extends DeckFieldKey>(
    fieldKey: TFieldKey,
    value: ProjectObjectDeck[TFieldKey]
  ) {
    if (!contentFileNode || !selectedObject || !deck) {
      return;
    }

    const nextDeck = getDeckWithDraftField(deck, fieldKey, value);

    if (!nextDeck) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeDeck(objectTree, selectedObject.id, nextDeck);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function updateBagDraft<TFieldKey extends BagFieldKey>(
    fieldKey: TFieldKey,
    value: ProjectObjectBag[TFieldKey]
  ) {
    setBagDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeBagField(fieldKey, value);
  }

  function updateObjectTreeBagField<TFieldKey extends BagFieldKey>(
    fieldKey: TFieldKey,
    value: ProjectObjectBag[TFieldKey]
  ) {
    if (!contentFileNode || !selectedObject || !bag) {
      return;
    }

    const nextBag = getBagWithDraftField(bag, fieldKey, value);

    if (!nextBag) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeBag(objectTree, selectedObject.id, nextBag);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function updateMeepleDraft<TFieldKey extends MeepleFieldKey>(
    fieldKey: TFieldKey,
    value: ProjectObjectMeeple[TFieldKey]
  ) {
    setMeepleDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeMeepleField(fieldKey, value);
  }

  function updateObjectTreeMeepleField<TFieldKey extends MeepleFieldKey>(
    fieldKey: TFieldKey,
    value: ProjectObjectMeeple[TFieldKey]
  ) {
    if (!contentFileNode || !selectedObject || !meeple) {
      return;
    }

    const nextMeeple = getMeepleWithDraftField(meeple, fieldKey, value);

    if (!nextMeeple) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeMeeple(objectTree, selectedObject.id, nextMeeple);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function updateStackDisplayDraft(fieldKey: StackDisplayFieldKey, value: string | boolean) {
    setStackDisplayDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeStackDisplayField(fieldKey, value);
  }

  function resetStackDisplayDraft(fieldKey: StackDisplayFieldKey) {
    if (!stackDisplay) {
      return;
    }

    const nextDraft = createStackDisplayDraft(stackDisplay);

    setStackDisplayDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: nextDraft[fieldKey]
    }));
  }

  function updateObjectTreeStackDisplayField(
    fieldKey: StackDisplayFieldKey,
    value: string | boolean
  ) {
    if (!contentFileNode || !selectedObject || !stackDisplay) {
      return;
    }

    const nextStackDisplay = getStackDisplayWithDraftField(stackDisplay, fieldKey, value);

    if (!nextStackDisplay) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeStackDisplay(
      objectTree,
      selectedObject.id,
      nextStackDisplay
    );

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function commitStackDisplayNumberField(
    fieldKey: StackDisplayNumberFieldKey,
    value = stackDisplayDraft[fieldKey]
  ) {
    if (!stackDisplay) {
      return;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      resetStackDisplayDraft(fieldKey);
      return;
    }

    updateObjectTreeStackDisplayField(fieldKey, value);
    setStackDisplayDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatStackDisplayNumberValue(
        normalizeStackDisplayNumberValue(fieldKey, parsedValue),
        fieldKey
      )
    }));
  }

  function updateZoneDraft(fieldKey: ZoneFieldKey, value: string) {
    setZoneDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeZoneField(fieldKey, value);
  }

  function resetZoneDraft(fieldKey: ZoneFieldKey) {
    if (!zone) {
      return;
    }

    const nextDraft = createZoneDraft(zone);

    setZoneDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: nextDraft[fieldKey]
    }));
  }

  function updateObjectTreeZoneField(fieldKey: ZoneFieldKey, value: string) {
    if (!contentFileNode || !selectedObject || !zone) {
      return;
    }

    const nextZone = getZoneWithDraftField(zone, fieldKey, value);

    if (!nextZone) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeZone(objectTree, selectedObject.id, nextZone);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function commitZoneNumberField(fieldKey: ZoneNumberFieldKey, value = zoneDraft[fieldKey]) {
    if (!zone) {
      return;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      resetZoneDraft(fieldKey);
      return;
    }

    updateObjectTreeZoneField(fieldKey, value);
    setZoneDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatZoneNumberValue(normalizeZoneNumberValue(fieldKey, parsedValue), fieldKey)
    }));
  }

  function addContainerEntry() {
    if (!container || !canAddContainerDraftRow) {
      return;
    }

    setContainerDraftRowIds((currentDraftRowIds) => [
      ...currentDraftRowIds,
      nextContainerDraftRowId
    ]);
    setNextContainerDraftRowId((currentId) => currentId + 1);
  }

  function removeContainerDraftEntry(rowId: number) {
    setContainerDraftRowIds((currentDraftRowIds) =>
      currentDraftRowIds.filter((currentRowId) => currentRowId !== rowId)
    );
  }

  function commitContainerDraftEntry(rowId: number, objectFileNodeId: string) {
    if (!container || !objectFileNodeId) {
      return;
    }

    updateContainer(getContainerWithAddedEntry(container, objectFileNodeId));
    removeContainerDraftEntry(rowId);
  }

  function removeContainerEntry(entryIndex: number) {
    if (!container) {
      return;
    }

    updateContainer(getContainerWithRemovedEntry(container, entryIndex));
  }

  function moveContainerEntry(entryIndex: number, direction: -1 | 1) {
    if (!container) {
      return;
    }

    updateContainer(getContainerWithMovedEntry(container, entryIndex, direction));
  }

  function updateContainerEntryObjectFile(entryIndex: number, objectFileNodeId: string) {
    if (!container) {
      return;
    }

    updateContainer(getContainerWithEntryObjectFileNodeId(container, entryIndex, objectFileNodeId));
  }

  function updateContainerEntryQuantityDraft(entryIndex: number, value: string) {
    setContainerEntryQuantityDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) => (index === entryIndex ? value : draft))
    );

    if (!container) {
      return;
    }

    updateContainer(getContainerWithEntryQuantityDraftField(container, entryIndex, value));
  }

  function resetContainerEntryQuantityDraft(entryIndex: number) {
    if (!container) {
      return;
    }

    const entry = container.entries[entryIndex];

    if (!entry) {
      return;
    }

    setContainerEntryQuantityDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) =>
        index === entryIndex ? formatContainerEntryQuantityValue(entry.quantity) : draft
      )
    );
  }

  function commitContainerEntryQuantity(entryIndex: number, value: string) {
    if (!container) {
      return;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      resetContainerEntryQuantityDraft(entryIndex);
      return;
    }

    updateContainer(getContainerWithEntryQuantityDraftField(container, entryIndex, value));
    setContainerEntryQuantityDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) =>
        index === entryIndex
          ? formatContainerEntryQuantityValue(normalizeContainerEntryQuantityValue(parsedValue))
          : draft
      )
    );
  }

  function updateContainer(nextContainer: ProjectObjectContainer | null) {
    if (!nextContainer || !contentFileNode || !selectedObject) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeContainer(
      objectTree,
      selectedObject.id,
      nextContainer
    );

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
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
  const containerObjectFileOptions = container
    ? getContainerObjectFileOptions(
        fileTree,
        getProjectObjectContainerAcceptedObjectKinds(selectedObject?.kind)
      )
    : [];
  const usedContainerObjectReferenceValues = new Set(
    container?.entries.map((entry) => getContainerEntryReferenceValue(entry)) ?? []
  );
  const unusedContainerObjectFileOptions = containerObjectFileOptions.filter(
    (option) => !usedContainerObjectReferenceValues.has(option.value)
  );
  const canAddContainerDraftRow =
    containerDraftRowIds.length < unusedContainerObjectFileOptions.length;
  const containerObjectFileOptionById = new Map(
    containerObjectFileOptions.map((option) => [option.value, option])
  );
  const containerTotalCount = container ? getProjectObjectContainerTotalCount(container) : 0;
  const zoneReferenceObjectFileOptions = zone ? getZoneReferenceObjectFileOptions(fileTree) : [];
  const zoneReferenceObjectFileOptionById = new Map(
    zoneReferenceObjectFileOptions.map((option) => [option.value, option])
  );
  const zoneReferenceObjectFileSelectOptions =
    zone?.referenceObjectFileId &&
    !zoneReferenceObjectFileOptionById.has(zone.referenceObjectFileId)
      ? [
          { label: "No reference", value: "" },
          { label: `${zone.referenceObjectFileId} (missing)`, value: zone.referenceObjectFileId },
          ...zoneReferenceObjectFileOptions
        ]
      : [{ label: "No reference", value: "" }, ...zoneReferenceObjectFileOptions];
  const activeSizePresetObject = card ?? deck;
  const sizePresetLocked = activeSizePresetObject
    ? isProjectObjectCardSizePresetLocked(activeSizePresetObject)
    : false;
  const textDraftBold = isTextFontWeightBold(textDraft.fontWeight);
  const textDraftItalic = textDraft.fontStyle === "italic";
  const sizeLockedRectTransformFields = zone
    ? zoneLockedRectTransformFields
    : sizePresetLocked
      ? cardPresetLockedRectTransformFields
      : undefined;
  const sizeLockedTitle = zone
    ? "Size is controlled by the selected zone reference, capacity, layout, gap, and padding"
    : "Size is controlled by the selected card preset";
  const appearanceBackgroundColorBinding = getVariableBindingField("appearance.backgroundColor");
  const appearanceBorderColorBinding = getVariableBindingField("appearance.borderColor");
  const imageAssetBinding = getVariableBindingField("image.assetId");
  const textColorBinding = getVariableBindingField("text.color");
  const textContentBinding = getVariableBindingField("text.content");

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

      {contentFileNode?.kind === "tableSetup" &&
      tableSetup &&
      (!selectedTableSetupItem || selectedLinkedTableSetupItem) ? (
        <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
          {!selectedLinkedTableSetupItem ? (
            <ProjectTableSetupSection
              draft={tableSetupDraft}
              onColorChange={updateTableSetupColor}
              onCommitNumberField={commitTableSetupNumberField}
              onDraftNumberChange={updateTableSetupNumberDraft}
              onGridSnapChange={(value) => updateTableSetupSwitch("gridSnap", value)}
              onGridVisibleChange={(value) => updateTableSetupSwitch("gridVisible", value)}
              onReset={resetTableSetupDraft}
            />
          ) : (
            <>
              <ProjectTableSetupLinkedItemSection
                item={selectedLinkedTableSetupItem}
                sourceName={
                  linkedTableSourceObjectFileNode?.name ??
                  selectedLinkedTableSetupItem.sourceObjectFileNodeId
                }
                transformDraft={linkedItemTransformDraft}
                onCommitTransformField={commitLinkedItemTransformField}
                onTransformDraftChange={updateLinkedItemTransformDraft}
                onTransformReset={() =>
                  setLinkedItemTransformDraft(
                    createLinkedItemTransformDraft(selectedLinkedTableSetupItem.transform)
                  )
                }
              />
              {linkedTableSourceTemplate ? (
                <ProjectObjectLinkedObjectSection
                  imageAssets={imageAssets}
                  sourceName={
                    linkedTableSourceObjectFileNode?.name ??
                    selectedLinkedTableSetupItem.sourceObjectFileNodeId
                  }
                  template={linkedTableSourceTemplate}
                  uploadErrors={propertyImageUploadErrors}
                  uploadingVariableId={uploadingPropertyImageVariableId}
                  values={linkedTableObjectValues}
                  onImageUpload={uploadTableLinkedObjectVariableImageValue}
                  onValueChange={updateTableLinkedObjectVariableValue}
                />
              ) : null}
            </>
          )}
        </div>
      ) : contentFileNode && selectedObject && rectTransform ? (
        <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
          {contentFileNode.sourceRef && sourceObjectTemplate ? (
            <ProjectObjectLinkedObjectSection
              imageAssets={imageAssets}
              sourceName={
                sourceObjectFileNode?.name ?? contentFileNode.sourceRef.sourceObjectFileNodeId
              }
              template={sourceObjectTemplate}
              uploadErrors={propertyImageUploadErrors}
              uploadingVariableId={uploadingPropertyImageVariableId}
              values={linkedObjectValues}
              onImageUpload={uploadLinkedObjectVariableImageValue}
              onValueChange={updateLinkedObjectVariableValue}
            />
          ) : null}

          {!contentFileNode.sourceRef ? (
            <>
              <ProjectObjectHeaderSection
                nameDraft={nameDraft}
                selectedObject={selectedObject}
                onNameBlur={commitName}
                onNameChange={setNameDraft}
                onNameKeyDown={handleNameKeyDown}
                onVisibilityChange={handleVisibilityChange}
              />

              {objectTemplate ? (
                <ProjectObjectTemplateSection
                  imageAssets={imageAssets}
                  template={objectTemplate}
                  onAddVariable={addTemplateVariable}
                  onRemoveVariable={removeTemplateVariable}
                  onVariableDefaultValueChange={updateTemplateVariableDefaultValue}
                  onVariableImageUpload={uploadTemplateVariableImageValue}
                  onVariableNameChange={updateTemplateVariableName}
                  onVariableTypeChange={updateTemplateVariableType}
                  uploadErrors={propertyImageUploadErrors}
                  uploadingVariableId={uploadingPropertyImageVariableId}
                />
              ) : null}

              {card ? (
                <ProjectObjectCardSection
                  draft={cardDraft}
                  sizePresetOptions={cardSizePresetOptions}
                  onSizePresetChange={(value) => updateCardDraft("sizePreset", value)}
                />
              ) : null}

              {deck ? (
                <ProjectObjectDeckSection
                  draft={deckDraft}
                  sizePresetOptions={cardSizePresetOptions}
                  onSizePresetChange={(value) => updateDeckDraft("sizePreset", value)}
                />
              ) : null}

              {bag ? (
                <ProjectObjectBagSection
                  draft={bagDraft}
                  onAppearanceVariantChange={(value) => updateBagDraft("appearanceVariant", value)}
                />
              ) : null}

              {meeple ? (
                <ProjectObjectMeepleSection
                  draft={meepleDraft}
                  onVisualVariantChange={(value) => updateMeepleDraft("visualVariant", value)}
                />
              ) : null}

              {container ? (
                <ProjectObjectContainerSection
                  canAddDraftRow={canAddContainerDraftRow}
                  container={container}
                  draftRowIds={containerDraftRowIds}
                  objectFileOptionById={containerObjectFileOptionById}
                  objectFileOptions={containerObjectFileOptions}
                  objectKind={selectedObject.kind}
                  quantityDrafts={containerEntryQuantityDrafts}
                  totalCount={containerTotalCount}
                  unusedObjectFileOptions={unusedContainerObjectFileOptions}
                  usedObjectReferenceValues={usedContainerObjectReferenceValues}
                  onAddEntry={addContainerEntry}
                  onCommitDraftEntry={commitContainerDraftEntry}
                  onCommitQuantity={commitContainerEntryQuantity}
                  onMoveEntry={moveContainerEntry}
                  onObjectFileChange={updateContainerEntryObjectFile}
                  onQuantityDraftChange={updateContainerEntryQuantityDraft}
                  onRemoveDraftEntry={removeContainerDraftEntry}
                  onRemoveEntry={removeContainerEntry}
                  onResetQuantity={resetContainerEntryQuantityDraft}
                />
              ) : null}

              {stackDisplay ? (
                <ProjectObjectStackSection
                  draft={stackDisplayDraft}
                  onCommitNumberField={commitStackDisplayNumberField}
                  onDraftChange={updateStackDisplayDraft}
                  onReset={resetStackDisplayDraft}
                />
              ) : null}

              {zone ? (
                <ProjectObjectZoneSection
                  draft={zoneDraft}
                  referenceMissing={
                    !zoneReferenceObjectFileOptionById.has(zone.referenceObjectFileId)
                  }
                  referenceOptions={zoneReferenceObjectFileSelectOptions}
                  zoneReferenceObjectFileId={zone.referenceObjectFileId}
                  onCommitCapacity={commitZoneNumberField}
                  onDraftChange={updateZoneDraft}
                  onReset={resetZoneDraft}
                />
              ) : null}

              {doubleSide ? (
                <ProjectObjectDoubleSidedSection
                  enabled={doubleSide.enabled}
                  onEnabledChange={updateDoubleSideEnabled}
                />
              ) : null}

              {counter ? (
                <ProjectObjectCounterSection
                  draft={counterDraft}
                  onCommitNumberField={commitCounterNumberField}
                  onDraftChange={updateCounterDraft}
                  onReset={resetCounterDraft}
                />
              ) : null}

              {die ? (
                <ProjectObjectDieSection
                  activeFace={activeDieFace}
                  activeFaceImageMissing={!activeDieFaceImageAsset}
                  draft={dieDraft}
                  imageAssets={imageAssets}
                  uploadError={dieFaceImageUploadError}
                  uploadingImage={uploadingDieFaceImage}
                  onCommitNumberField={commitDieNumberField}
                  onDraftChange={updateDieDraft}
                  onFaceFieldChange={updateDieFaceField}
                  onImageUpload={handleDieFaceImageUpload}
                  onReset={resetDieDraft}
                />
              ) : null}

              {appearance ? (
                <ProjectObjectAppearanceSection
                  backgroundColorBinding={appearanceBackgroundColorBinding}
                  borderColorBinding={appearanceBorderColorBinding}
                  draft={appearanceDraft}
                  onCommitNumberField={commitAppearanceNumberField}
                  onDraftChange={updateAppearanceDraft}
                  onReset={resetAppearanceDraft}
                />
              ) : null}

              {layout ? (
                <ProjectObjectLayoutSection
                  draft={layoutDraft}
                  isZoneLayout={Boolean(zone)}
                  onCommitNumberField={commitLayoutNumberField}
                  onDraftChange={updateLayoutDraft}
                  onReset={resetLayoutDraft}
                />
              ) : null}

              <ProjectObjectTransformSections
                rectTransformDraft={rectTransformDraft}
                scaleDisabledFields={
                  sizePresetLocked ? cardPresetLockedRectTransformFields : undefined
                }
                scaleDisabledTitle="Scale is controlled by the selected card preset"
                sizeDisabledFields={sizeLockedRectTransformFields}
                sizeDisabledTitle={sizeLockedTitle}
                onCommit={commitRectTransformField}
                onDraftChange={updateRectTransformDraft}
                onReset={resetRectTransformDraft}
              />

              {text ? (
                <ProjectObjectTextSection
                  contentBinding={textContentBinding}
                  draft={textDraft}
                  isBold={textDraftBold}
                  isItalic={textDraftItalic}
                  textColorBinding={textColorBinding}
                  onBoldChange={updateTextBold}
                  onCommitNumberField={commitTextNumberField}
                  onDraftChange={updateTextDraft}
                  onItalicChange={updateTextItalic}
                  onReset={resetTextDraft}
                />
              ) : null}

              {image ? (
                <ProjectObjectImageSection
                  assetBinding={imageAssetBinding}
                  draft={imageDraft}
                  imageAssetId={image.assetId}
                  imageAssetMissing={!selectedImageAsset}
                  imageAssets={imageAssets}
                  uploadError={imageUploadError}
                  uploadingImage={uploadingImage}
                  onCommitNumberField={commitImageNumberField}
                  onDraftChange={updateImageDraft}
                  onImageUpload={handleImageUpload}
                  onReset={resetImageDraft}
                />
              ) : null}

              {shape ? (
                <ProjectObjectShapeSection
                  polygonPoints={shapePolygonPoints}
                  shape={shape}
                  onAddPolygonPoint={addShapePolygonPoint}
                  onPolygonPointChange={updateShapePolygonPoint}
                  onPolygonPointDraftFieldChange={updateShapePolygonPointDraftField}
                  onRemovePolygonPoint={removeShapePolygonPoint}
                  onResetPolygonPoints={resetShapePolygonPoints}
                  onVariantChange={updateShapeVariant}
                />
              ) : null}
            </>
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

type ProjectTableSetupSectionProps = {
  draft: TableSetupDraft;
  onColorChange: (fieldKey: "backgroundColor", value: string) => void;
  onCommitNumberField: (fieldKey: TableSetupNumberFieldKey, value: string) => void;
  onDraftNumberChange: (fieldKey: TableSetupNumberFieldKey, value: string) => void;
  onGridSnapChange: (value: boolean) => void;
  onGridVisibleChange: (value: boolean) => void;
  onReset: () => void;
};

function ProjectTableSetupSection({
  draft,
  onColorChange,
  onCommitNumberField,
  onDraftNumberChange,
  onGridSnapChange,
  onGridVisibleChange,
  onReset
}: ProjectTableSetupSectionProps) {
  return (
    <>
      <InspectorSection icon={<Rows3 size={15} />} title="Table">
        <InspectorColorField
          field={tableSetupColorField}
          value={draft.backgroundColor}
          onChange={onColorChange}
        />
        <div className="grid grid-cols-2 gap-2">
          {tableSetupSizeNumberFields.map((field) => (
            <InspectorBehaviorNumberField
              key={field.key}
              field={field}
              settings={tableSetupNumberFieldSettings[field.key]}
              value={draft[field.key]}
              onCommit={onCommitNumberField}
              onDraftChange={onDraftNumberChange}
              onReset={() => onReset()}
            />
          ))}
        </div>
      </InspectorSection>
      <InspectorSection title="Grid">
        <InspectorBehaviorNumberField
          field={tableSetupGridSizeField}
          settings={tableSetupNumberFieldSettings[tableSetupGridSizeField.key]}
          value={draft.gridSize}
          onCommit={onCommitNumberField}
          onDraftChange={onDraftNumberChange}
          onReset={() => onReset()}
        />
        <div className="space-y-1">
          <InspectorSwitchField
            checked={draft.gridVisible}
            label="Show grid"
            onChange={(event) => onGridVisibleChange(event.currentTarget.checked)}
          />
          <InspectorSwitchField
            checked={draft.gridSnap}
            label="Snap to grid"
            onChange={(event) => onGridSnapChange(event.currentTarget.checked)}
          />
        </div>
      </InspectorSection>
    </>
  );
}

type ProjectTableSetupLinkedItemSectionProps = {
  item: Extract<ProjectTableSetupItem, { type: "linkedObject" }>;
  sourceName: string;
  transformDraft: LinkedItemTransformDraft;
  onCommitTransformField: (fieldKey: keyof ProjectTableSetupItemTransform, value: string) => void;
  onTransformDraftChange: (fieldKey: keyof ProjectTableSetupItemTransform, value: string) => void;
  onTransformReset: () => void;
};

function ProjectTableSetupLinkedItemSection({
  item,
  sourceName,
  transformDraft,
  onCommitTransformField,
  onTransformDraftChange,
  onTransformReset
}: ProjectTableSetupLinkedItemSectionProps) {
  return (
    <>
      <InspectorSection icon={<Rows3 size={15} />} title="Linked item">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
          <span className="block font-semibold text-slate-800">{item.name}</span>
          <span className="block truncate">{sourceName}</span>
        </div>
      </InspectorSection>
      <InspectorSection title="Placement">
        <div className="grid grid-cols-2 gap-2">
          {linkedItemTransformFields.map((field) => (
            <InspectorBehaviorNumberField
              key={field.key}
              field={field}
              settings={{
                max: 100000,
                min: field.key.startsWith("scale") ? 0.01 : -100000,
                step: 1
              }}
              value={transformDraft[field.key]}
              onCommit={onCommitTransformField}
              onDraftChange={onTransformDraftChange}
              onReset={() => onTransformReset()}
            />
          ))}
        </div>
      </InspectorSection>
    </>
  );
}

function createTableSetupDraft(tableSetup: ProjectTableSetup | null | undefined): TableSetupDraft {
  return {
    backgroundColor: tableSetup?.backgroundColor ?? "#6f8b70",
    gridSize: String(tableSetup?.grid.size ?? 50),
    gridSnap: tableSetup?.grid.snap ?? false,
    gridVisible: tableSetup?.grid.visible ?? true,
    height: String(tableSetup?.height ?? 600),
    width: String(tableSetup?.width ?? 900)
  };
}

function createLinkedItemTransformDraft(
  transform: ProjectTableSetupItemTransform | null | undefined
): LinkedItemTransformDraft {
  return {
    rotation: formatTableNumberValue(transform?.rotation ?? 0),
    scaleX: formatTableNumberValue(transform?.scaleX ?? 1),
    scaleY: formatTableNumberValue(transform?.scaleY ?? 1),
    x: formatTableNumberValue(transform?.x ?? 0),
    y: formatTableNumberValue(transform?.y ?? 0)
  };
}

function normalizeTableSetupNumberValue(fieldKey: TableSetupNumberFieldKey, value: number) {
  const settings = tableSetupNumberFieldSettings[fieldKey];

  return Math.min(settings.max, Math.max(settings.min, Math.round(value)));
}

function getTableSetupWithNumberDraft(
  tableSetup: ProjectTableSetup,
  draft: TableSetupDraft
): ProjectTableSetup | null | undefined {
  let nextTableSetup = tableSetup;

  for (const field of tableSetupNumberFields) {
    const parsedValue = parseRectTransformDraftValue(draft[field.key]);

    if (parsedValue === null) {
      return undefined;
    }

    nextTableSetup = getTableSetupWithNumberField(
      nextTableSetup,
      field.key,
      normalizeTableSetupNumberValue(field.key, parsedValue)
    );
  }

  return nextTableSetup === tableSetup ? null : nextTableSetup;
}

function getTableSetupWithNumberField(
  tableSetup: ProjectTableSetup,
  fieldKey: TableSetupNumberFieldKey,
  value: number
): ProjectTableSetup {
  if (fieldKey === "gridSize") {
    return tableSetup.grid.size === value
      ? tableSetup
      : {
          ...tableSetup,
          grid: {
            ...tableSetup.grid,
            size: value
          }
        };
  }

  return tableSetup[fieldKey] === value
    ? tableSetup
    : {
        ...tableSetup,
        [fieldKey]: value
      };
}

function normalizeLinkedItemTransformValue(
  fieldKey: keyof ProjectTableSetupItemTransform,
  value: number
) {
  if (fieldKey === "scaleX" || fieldKey === "scaleY") {
    return Math.min(100, Math.max(0.01, value));
  }

  return Math.round(value);
}

function formatTableNumberValue(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000);
}

function getFallbackCardDraftValue(): ProjectObjectCard {
  return {
    sizePreset: "poker"
  };
}

function getFallbackCounterDraftValue(): ProjectObjectCounter {
  return getDefaultProjectObjectCounter();
}

function getFallbackDeckDraftValue(): ProjectObjectDeck {
  return getDefaultProjectObjectDeck();
}

function getFallbackBagDraftValue(): ProjectObjectBag {
  return getDefaultProjectObjectBag();
}

function getFallbackMeepleDraftValue(): ProjectObjectMeeple {
  return getDefaultProjectObjectMeeple();
}

function getFallbackStackDisplayDraftValue(): ProjectObjectStackDisplay {
  return getDefaultProjectObjectStackDisplay();
}

function getFallbackZoneDraftValue(): ProjectObjectZone {
  return getDefaultProjectObjectZone();
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

function getContainerObjectFileOptions(
  fileTree: readonly ProjectFileNode[],
  acceptedObjectKinds: readonly ProjectObjectKind[]
) {
  const acceptedKindSet = new Set(acceptedObjectKinds);
  const options: { label: string; value: string }[] = [];

  collectContainerObjectFileOptions(fileTree, fileTree, acceptedKindSet, options);

  return options;
}

function getZoneReferenceObjectFileOptions(fileTree: readonly ProjectFileNode[]) {
  const options: { label: string; value: string }[] = [];

  collectZoneReferenceObjectFileOptions(fileTree, fileTree, options);

  return options;
}

function collectZoneReferenceObjectFileOptions(
  fileTree: readonly ProjectFileNode[],
  rootFileTree: readonly ProjectFileNode[],
  options: { label: string; value: string }[]
) {
  for (const node of fileTree) {
    if (node.type === "folder") {
      collectZoneReferenceObjectFileOptions(node.children ?? [], rootFileTree, options);
      continue;
    }

    if (node.kind !== "object") {
      continue;
    }

    const rootObject = resolveProjectObjectFileObjectTree(rootFileTree, node)[0];

    if (!rootObject || rootObject.kind === "zone") {
      continue;
    }

    options.push({
      label: node.name,
      value: node.id
    });
  }
}

function collectContainerObjectFileOptions(
  fileTree: readonly ProjectFileNode[],
  rootFileTree: readonly ProjectFileNode[],
  acceptedObjectKinds: ReadonlySet<ProjectObjectKind>,
  options: { label: string; value: string }[]
) {
  for (const node of fileTree) {
    if (node.type === "folder") {
      collectContainerObjectFileOptions(
        node.children ?? [],
        rootFileTree,
        acceptedObjectKinds,
        options
      );
      continue;
    }

    if (node.kind !== "object") {
      continue;
    }

    const rootObject = resolveProjectObjectFileObjectTree(rootFileTree, node)[0];

    if (!rootObject || !acceptedObjectKinds.has(rootObject.kind)) {
      continue;
    }

    options.push({
      label: node.name,
      value: node.id
    });
  }
}
