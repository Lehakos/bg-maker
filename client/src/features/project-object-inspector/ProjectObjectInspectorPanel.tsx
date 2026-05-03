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
  ProjectObjectStackDisplay,
  ProjectObjectText,
  ProjectObjectZone
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectCounter,
  getDefaultProjectObjectBag,
  getDefaultProjectObjectDeck,
  getDefaultProjectObjectDie,
  getDefaultProjectObjectMeeple,
  getDefaultProjectObjectStackDisplay,
  getDefaultProjectObjectZone,
  getProjectObjectContainerAcceptedObjectKinds,
  getProjectObjectContainerTotalCount,
  hasProjectObjectLayout,
  isProjectObjectCardSizePresetLocked,
  projectObjectCardCustomSizePresetId,
  projectObjectCardSizePresets
} from "@bg-maker/shared";
import { SlidersHorizontal } from "lucide-react";
import { type ChangeEvent, type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { uploadProjectImageAsset } from "../project-workspace/project-api";
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
  ProjectObjectAppearanceSection,
  ProjectObjectLayoutSection,
  ProjectObjectTransformSections
} from "./ProjectObjectStyleSections";

type ProjectObjectInspectorPanelProps = {
  className?: string;
  contentFileNode: ProjectFileNode | null;
  fileTree: ProjectFileNode[];
  projectId: string;
  selectedObject: ProjectObjectNode | null;
  onFileTreeChange: (fileTree: ProjectFileNode[]) => void;
  onObjectTreeChange: (fileNodeId: string, objectTree: ProjectObjectNode[]) => void;
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
  const deck = useMemo(
    () => (selectedObject?.kind === "deck" ? getProjectObjectNodeDeck(selectedObject) : null),
    [selectedObject]
  );
  const bag = useMemo(
    () => (selectedObject?.kind === "bag" ? getProjectObjectNodeBag(selectedObject) : null),
    [selectedObject]
  );
  const meeple = useMemo(
    () =>
      selectedObject?.kind === "meeple" ? getProjectObjectNodeMeeple(selectedObject) : null,
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
      selectedObject?.kind === "deck"
        ? getProjectObjectNodeStackDisplay(selectedObject)
        : null,
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
  const usedContainerObjectFileIds = new Set(
    container?.entries.map((entry) => entry.objectFileNodeId) ?? []
  );
  const unusedContainerObjectFileOptions = containerObjectFileOptions.filter(
    (option) => !usedContainerObjectFileIds.has(option.value)
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
          <ProjectObjectHeaderSection
            nameDraft={nameDraft}
            selectedObject={selectedObject}
            onNameBlur={commitName}
            onNameChange={setNameDraft}
            onNameKeyDown={handleNameKeyDown}
            onVisibilityChange={handleVisibilityChange}
          />

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
              usedObjectFileNodeIds={usedContainerObjectFileIds}
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
              referenceMissing={!zoneReferenceObjectFileOptionById.has(zone.referenceObjectFileId)}
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
            scaleDisabledFields={sizePresetLocked ? cardPresetLockedRectTransformFields : undefined}
            scaleDisabledTitle="Scale is controlled by the selected card preset"
            sizeDisabledFields={sizeLockedRectTransformFields}
            sizeDisabledTitle={sizeLockedTitle}
            onCommit={commitRectTransformField}
            onDraftChange={updateRectTransformDraft}
            onReset={resetRectTransformDraft}
          />

          {text ? (
            <ProjectObjectTextSection
              draft={textDraft}
              isBold={textDraftBold}
              isItalic={textDraftItalic}
              onBoldChange={updateTextBold}
              onCommitNumberField={commitTextNumberField}
              onDraftChange={updateTextDraft}
              onItalicChange={updateTextItalic}
              onReset={resetTextDraft}
            />
          ) : null}

          {image ? (
            <ProjectObjectImageSection
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

  collectContainerObjectFileOptions(fileTree, acceptedKindSet, options);

  return options;
}

function getZoneReferenceObjectFileOptions(fileTree: readonly ProjectFileNode[]) {
  const options: { label: string; value: string }[] = [];

  collectZoneReferenceObjectFileOptions(fileTree, options);

  return options;
}

function collectZoneReferenceObjectFileOptions(
  fileTree: readonly ProjectFileNode[],
  options: { label: string; value: string }[]
) {
  for (const node of fileTree) {
    if (node.type === "folder") {
      collectZoneReferenceObjectFileOptions(node.children ?? [], options);
      continue;
    }

    if (node.kind !== "object") {
      continue;
    }

    const rootObject = node.objectTree?.[0];

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
  acceptedObjectKinds: ReadonlySet<ProjectObjectKind>,
  options: { label: string; value: string }[]
) {
  for (const node of fileTree) {
    if (node.type === "folder") {
      collectContainerObjectFileOptions(node.children ?? [], acceptedObjectKinds, options);
      continue;
    }

    if (node.kind !== "object") {
      continue;
    }

    const rootObject = node.objectTree?.[0];

    if (!rootObject || !acceptedObjectKinds.has(rootObject.kind)) {
      continue;
    }

    options.push({
      label: node.name,
      value: node.id
    });
  }
}
