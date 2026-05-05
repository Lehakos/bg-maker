import type {
  ProjectObjectAppearance,
  ProjectObjectBag,
  ProjectObjectCard,
  ProjectObjectContainer,
  ProjectObjectCounter,
  ProjectObjectDeck,
  ProjectObjectDie,
  ProjectObjectIcon,
  ProjectObjectImage,
  ProjectObjectLayout,
  ProjectObjectMeeple,
  ProjectObjectRectTransform,
  ProjectObjectShape,
  ProjectObjectStackDisplay,
  ProjectObjectText,
  ProjectObjectZone
} from "@bg-maker/shared";
import { getDefaultProjectObjectText } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  createAppearanceDraft,
  getAppearanceWithDraftField,
  normalizeAppearanceNumberValue
} from "./project-object-inspector-state/appearance-state";
import {
  createBagDraft,
  createCardDraft,
  createDeckDraft,
  createMeepleDraft,
  createStackDisplayDraft,
  getCardWithDraftField,
  getContainerWithAddedEntry,
  getContainerWithEntryObjectFileNodeId,
  getContainerWithEntryQuantityDraftField,
  getContainerWithMovedEntry,
  getContainerWithRemovedEntry,
  getContainerEntryReferenceValue,
  getBagWithDraftField,
  getDeckWithDraftField,
  getMeepleWithDraftField,
  getStackDisplayWithDraftField,
  normalizeContainerEntryQuantityValue,
  normalizeStackDisplayNumberValue
} from "./project-object-inspector-state/card-deck-container-stack-state";
import {
  createCounterDraft,
  getCounterWithDraftField,
  normalizeCounterNumberValue
} from "./project-object-inspector-state/counter-state";
import {
  createDieDraft,
  getDieFace,
  getDieFaces,
  getDieWithDraftField,
  getDieWithFaceField,
  normalizeDieNumberValue
} from "./project-object-inspector-state/die-state";
import {
  createIconDraft,
  getIconWithDraftField
} from "./project-object-inspector-state/icon-state";
import { parseRectTransformDraftValue } from "./project-object-inspector-state/inspector-state-utils";
import {
  createLayoutDraft,
  getLayoutWithDraftField,
  normalizeLayoutNumberValue
} from "./project-object-inspector-state/layout-state";
import {
  createRectTransformDraft,
  getRectTransformWithDraftField,
  normalizeRectTransformValue
} from "./project-object-inspector-state/rect-transform-state";
import {
  createImageDraft,
  createShapePolygonPointDrafts,
  createTextDraft,
  getImageWithDraftField,
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
  isTextFontWeightBold,
  normalizeImageNumberValue,
  normalizeShapePolygonPointValue,
  normalizeTextNumberValue
} from "./project-object-inspector-state/text-image-shape-state";
import {
  createZoneDraft,
  getZoneWithDraftField,
  normalizeZoneNumberValue
} from "./project-object-inspector-state/zone-state";

const rectTransform: ProjectObjectRectTransform = {
  height: 44.6,
  pivotX: 0.3336,
  pivotY: 0.6664,
  rotation: 12.4,
  scaleX: 1.2346,
  scaleY: 0.9874,
  width: 88.3,
  x: -10.7,
  y: 20.2
};

const appearance: ProjectObjectAppearance = {
  backgroundColor: "#ffffff",
  backgroundOpacity: 0.876,
  borderColor: "#cbd5e1",
  borderRadius: 3.6,
  borderStyle: "solid",
  borderWidth: 2.4,
  opacity: 0.876,
  padding: 4.2
};

const card: ProjectObjectCard = {
  sizePreset: "poker"
};

const counter: ProjectObjectCounter = {
  boundsMode: "clamp",
  defaultValue: 5,
  displayMode: "value",
  maxValue: 10,
  minValue: 0,
  prefix: "",
  step: 1,
  suffix: " HP"
};

const deck: ProjectObjectDeck = {
  sizePreset: "poker"
};

const bag: ProjectObjectBag = {
  appearanceVariant: "bag"
};

const meeple: ProjectObjectMeeple = {
  visualVariant: "meeple"
};

const container: ProjectObjectContainer = {
  entries: [
    { objectFileNodeId: "card-file-1", quantity: 2 },
    { objectFileNodeId: "card-file-2", quantity: 3 }
  ]
};

const stackDisplay: ProjectObjectStackDisplay = {
  showCount: true,
  stackOffsetX: 2,
  stackOffsetY: -2,
  visibleItemCount: 4
};

const zone: ProjectObjectZone = {
  capacity: 4,
  referenceObjectFileId: "card-file-1"
};

const die: ProjectObjectDie = {
  activeFace: 3,
  faceCount: 4,
  faces: [
    { imageAssetId: "", label: "1", mode: "text" },
    { imageAssetId: "", label: "2", mode: "text" },
    { imageAssetId: "asset-1", label: "Skull", mode: "image" },
    { imageAssetId: "", label: "4", mode: "text" }
  ]
};

const text: ProjectObjectText = {
  ...getDefaultProjectObjectText("label"),
  color: "#0f172a",
  content: "Label",
  fontSize: 16.4,
  fontStyle: "italic",
  fontWeight: 612,
  lineHeight: 1.236,
  textAlign: "center",
  verticalAlign: "middle"
};

const image: ProjectObjectImage = {
  assetId: "asset-1",
  fit: "contain",
  positionX: 49.6,
  positionY: 20.2
};

const icon: ProjectObjectIcon = {
  color: "#0f172a",
  style: "outline",
  symbol: "star"
};

const layout: ProjectObjectLayout = {
  alignItems: "center",
  columns: 3,
  gap: 12.4,
  justifyContent: "spaceBetween",
  mode: "horizontal"
};

const shape: ProjectObjectShape = {
  variant: "rectangle"
};

describe("project object inspector state", () => {
  it("creates display drafts using field-specific precision", () => {
    expect(createRectTransformDraft(rectTransform)).toEqual({
      height: "45",
      pivotX: "0.334",
      pivotY: "0.666",
      rotation: "12",
      scaleX: "1.235",
      scaleY: "0.987",
      width: "88",
      x: "-11",
      y: "20"
    });
  });

  it("parses draft numbers and rejects empty or invalid values", () => {
    expect(parseRectTransformDraftValue(" 12.5 ")).toBe(12.5);
    expect(parseRectTransformDraftValue("")).toBeNull();
    expect(parseRectTransformDraftValue("nope")).toBeNull();
    expect(parseRectTransformDraftValue("Infinity")).toBeNull();
  });

  it("normalizes rect transform values to inspector bounds", () => {
    expect(normalizeRectTransformValue("width", 0)).toBe(1);
    expect(normalizeRectTransformValue("x", -12000)).toBe(-10000);
    expect(normalizeRectTransformValue("rotation", 5000)).toBe(3600);
    expect(normalizeRectTransformValue("scaleX", 1.2346)).toBe(1.235);
    expect(normalizeRectTransformValue("pivotY", 2)).toBe(1);
  });

  it("builds an immediate rect transform update from a draft field value", () => {
    expect(getRectTransformWithDraftField(rectTransform, "width", "180")).toMatchObject({
      height: rectTransform.height,
      width: 180
    });
    expect(getRectTransformWithDraftField(rectTransform, "scaleX", "2.3456")).toMatchObject({
      scaleX: 2.346
    });
    expect(
      getRectTransformWithDraftField({ ...rectTransform, width: 88 }, "width", "88")
    ).toBeNull();
    expect(getRectTransformWithDraftField(rectTransform, "x", "not a number")).toBeNull();
  });

  it("creates and normalizes appearance drafts", () => {
    expect(createAppearanceDraft(appearance)).toEqual({
      backgroundColor: "#ffffff",
      backgroundOpacity: "0.88",
      borderColor: "#cbd5e1",
      borderRadius: "4",
      borderStyle: "solid",
      borderWidth: "2",
      opacity: "0.88",
      padding: "4"
    });
    expect(normalizeAppearanceNumberValue("opacity", 2)).toBe(1);
    expect(normalizeAppearanceNumberValue("padding", -10)).toBe(0);
    expect(getAppearanceWithDraftField(appearance, "backgroundColor", "#ABCDEF")).toMatchObject({
      backgroundColor: "#abcdef"
    });
    expect(getAppearanceWithDraftField(appearance, "backgroundOpacity", "0")).toMatchObject({
      backgroundOpacity: 0
    });
    expect(getAppearanceWithDraftField(appearance, "borderStyle", "dashed")).toMatchObject({
      borderStyle: "dashed"
    });
    expect(getAppearanceWithDraftField(appearance, "borderColor", "red")).toBeNull();
  });

  it("creates and updates card drafts", () => {
    expect(createCardDraft(card)).toEqual({
      sizePreset: "poker"
    });
    expect(getCardWithDraftField(card, "sizePreset", "bridge")).toEqual({
      sizePreset: "bridge"
    });
    expect(getCardWithDraftField(card, "sizePreset", "custom")).toEqual({
      sizePreset: "custom"
    });
    expect(getCardWithDraftField(card, "sizePreset", "unknown-size")).toBeNull();
    expect(getCardWithDraftField(card, "sizePreset", "poker")).toBeNull();
  });

  it("creates and updates counter drafts", () => {
    expect(createCounterDraft(counter)).toEqual({
      boundsMode: "clamp",
      defaultValue: "5",
      displayMode: "value",
      maxValue: "10",
      minValue: "0",
      prefix: "",
      step: "1",
      suffix: " HP"
    });
    expect(normalizeCounterNumberValue("defaultValue", 1000000)).toBe(999999);
    expect(normalizeCounterNumberValue("step", 0)).toBe(1);
    expect(getCounterWithDraftField(counter, "defaultValue", "7")).toMatchObject({
      defaultValue: 7
    });
    expect(getCounterWithDraftField(counter, "defaultValue", "12")).toMatchObject({
      defaultValue: 10
    });
    expect(getCounterWithDraftField(counter, "boundsMode", "none")).toMatchObject({
      boundsMode: "none"
    });
    expect(getCounterWithDraftField(counter, "displayMode", "valueAndMax")).toMatchObject({
      displayMode: "valueAndMax"
    });
    expect(getCounterWithDraftField(counter, "suffix", " VP")).toMatchObject({
      suffix: " VP"
    });
    expect(getCounterWithDraftField(counter, "boundsMode", "bounce")).toBeNull();
    expect(getCounterWithDraftField(counter, "step", "nope")).toBeNull();
  });

  it("creates and updates deck container and stack display drafts", () => {
    expect(createDeckDraft(deck)).toEqual({
      sizePreset: "poker"
    });
    expect(getDeckWithDraftField(deck, "sizePreset", "bridge")).toMatchObject({
      sizePreset: "bridge"
    });
    expect(createStackDisplayDraft(stackDisplay)).toEqual({
      showCount: true,
      stackOffsetX: "2",
      stackOffsetY: "-2",
      visibleItemCount: "4"
    });
    expect(normalizeStackDisplayNumberValue("visibleItemCount", 20)).toBe(12);
    expect(getStackDisplayWithDraftField(stackDisplay, "showCount", false)).toMatchObject({
      showCount: false
    });
    expect(getStackDisplayWithDraftField(stackDisplay, "stackOffsetX", "24")).toMatchObject({
      stackOffsetX: 24
    });
    expect(getStackDisplayWithDraftField(stackDisplay, "visibleItemCount", "0")).toMatchObject({
      visibleItemCount: 1
    });
  });

  it("creates and updates bag drafts", () => {
    expect(createBagDraft(bag)).toEqual({
      appearanceVariant: "bag"
    });
    expect(getBagWithDraftField(bag, "appearanceVariant", "box")).toMatchObject({
      appearanceVariant: "box"
    });
    expect(getBagWithDraftField(bag, "appearanceVariant", "crate")).toBeNull();
  });

  it("creates and updates meeple drafts", () => {
    expect(createMeepleDraft(meeple)).toEqual({
      visualVariant: "meeple"
    });
    expect(getMeepleWithDraftField(meeple, "visualVariant", "pawn")).toMatchObject({
      visualVariant: "pawn"
    });
    expect(getMeepleWithDraftField(meeple, "visualVariant", "standee")).toMatchObject({
      visualVariant: "standee"
    });
    expect(getMeepleWithDraftField(meeple, "visualVariant", "paw")).toBeNull();
    expect(getMeepleWithDraftField(meeple, "visualVariant", "meeple")).toBeNull();
  });

  it("creates and updates zone drafts", () => {
    expect(createZoneDraft(zone)).toEqual({
      capacity: "4",
      referenceObjectFileId: "card-file-1"
    });
    expect(normalizeZoneNumberValue("capacity", 0)).toBe(1);
    expect(normalizeZoneNumberValue("capacity", 1200)).toBe(999);
    expect(getZoneWithDraftField(zone, "capacity", "8")).toMatchObject({
      capacity: 8
    });
    expect(getZoneWithDraftField(zone, "capacity", "0")).toMatchObject({
      capacity: 1
    });
    expect(getZoneWithDraftField(zone, "referenceObjectFileId", " object-file-2 ")).toEqual({
      capacity: 4,
      referenceObjectFileId: "object-file-2"
    });
    expect(getZoneWithDraftField(zone, "capacity", "nope")).toBeNull();
    expect(getZoneWithDraftField(zone, "referenceObjectFileId", "card-file-1")).toBeNull();
  });

  it("updates generic container entries", () => {
    expect(normalizeContainerEntryQuantityValue(1200)).toBe(999);
    expect(getContainerWithAddedEntry(container, "card-file-3")).toMatchObject({
      entries: [
        { objectFileNodeId: "card-file-1", quantity: 2 },
        { objectFileNodeId: "card-file-2", quantity: 3 },
        { objectFileNodeId: "card-file-3", quantity: 1 }
      ]
    });
    expect(getContainerWithAddedEntry(container, "card-file-1")).toMatchObject({
      entries: [
        { objectFileNodeId: "card-file-1", quantity: 3 },
        { objectFileNodeId: "card-file-2", quantity: 3 }
      ]
    });
    expect(getContainerWithEntryQuantityDraftField(container, 1, "8")).toMatchObject({
      entries: [
        { objectFileNodeId: "card-file-1", quantity: 2 },
        { objectFileNodeId: "card-file-2", quantity: 8 }
      ]
    });
    expect(getContainerWithEntryObjectFileNodeId(container, 1, " card-file-3 ")).toMatchObject({
      entries: [
        { objectFileNodeId: "card-file-1", quantity: 2 },
        { objectFileNodeId: "card-file-3", quantity: 3 }
      ]
    });
    expect(getContainerWithEntryObjectFileNodeId(container, 1, "card-file-1")).toMatchObject({
      entries: [{ objectFileNodeId: "card-file-1", quantity: 5 }]
    });
    expect(getContainerWithMovedEntry(container, 1, -1)).toMatchObject({
      entries: [
        { objectFileNodeId: "card-file-2", quantity: 3 },
        { objectFileNodeId: "card-file-1", quantity: 2 }
      ]
    });
    expect(getContainerWithRemovedEntry(container, 0)).toMatchObject({
      entries: [{ objectFileNodeId: "card-file-2", quantity: 3 }]
    });
    expect(getContainerWithAddedEntry(container, " ")).toBeNull();
    expect(getContainerWithEntryObjectFileNodeId(container, 0, " ")).toBeNull();
    expect(getContainerWithEntryQuantityDraftField(container, 0, "nope")).toBeNull();
  });

  it("uses object file ids as container entry references", () => {
    const container: ProjectObjectContainer = {
      entries: [
        { objectFileNodeId: "card-file-1", quantity: 2 },
        { objectFileNodeId: "card-file-2", quantity: 3 }
      ]
    };

    expect(getContainerWithAddedEntry(container, "card-file-2")).toMatchObject({
      entries: [
        { objectFileNodeId: "card-file-1", quantity: 2 },
        { objectFileNodeId: "card-file-2", quantity: 4 }
      ]
    });
    expect(getContainerWithEntryObjectFileNodeId(container, 1, "card-file-3")).toMatchObject({
      entries: [
        { objectFileNodeId: "card-file-1", quantity: 2 },
        { objectFileNodeId: "card-file-3", quantity: 3 }
      ]
    });
    expect(getContainerEntryReferenceValue(container.entries[1]!)).toBe("card-file-2");
  });

  it("creates and updates die drafts and faces", () => {
    expect(createDieDraft(die)).toEqual({
      activeFace: "3",
      faceCount: "4"
    });
    expect(normalizeDieNumberValue("faceCount", 120)).toBe(100);
    expect(getDieFaces({ ...die, faceCount: 2 })).toHaveLength(2);
    expect(getDieFace(die, 3)).toEqual({
      imageAssetId: "asset-1",
      label: "Skull",
      mode: "image"
    });
    expect(getDieWithDraftField(die, "activeFace", "2")).toMatchObject({
      activeFace: 2
    });
    expect(getDieWithDraftField(die, "faceCount", "2")).toMatchObject({
      activeFace: 2,
      faceCount: 2,
      faces: [
        { imageAssetId: "", label: "1", mode: "text" },
        { imageAssetId: "", label: "2", mode: "text" }
      ]
    });
    expect(getDieWithDraftField(die, "faceCount", "nope")).toBeNull();
    expect(getDieWithFaceField(die, 2, "mode", "image")).toMatchObject({
      activeFace: 2,
      faces: [
        { imageAssetId: "", label: "1", mode: "text" },
        { imageAssetId: "", label: "2", mode: "image" },
        { imageAssetId: "asset-1", label: "Skull", mode: "image" },
        { imageAssetId: "", label: "4", mode: "text" }
      ]
    });
    expect(getDieWithFaceField(die, 3, "imageAssetId", "asset-2")).toMatchObject({
      faces: [
        { imageAssetId: "", label: "1", mode: "text" },
        { imageAssetId: "", label: "2", mode: "text" },
        { imageAssetId: "asset-2", label: "Skull", mode: "image" },
        { imageAssetId: "", label: "4", mode: "text" }
      ]
    });
    expect(getDieWithFaceField(die, 3, "mode", "symbol")).toBeNull();
  });

  it("creates and normalizes text drafts", () => {
    expect(createTextDraft(text)).toEqual({
      autoFit: false,
      color: "#0f172a",
      content: "Label",
      effectColor: "#ffffff",
      effectMode: "none",
      effectStrength: "2",
      fontFamily: "system",
      fontSize: "16",
      fontStyle: "italic",
      fontWeight: "612",
      lineHeight: "1.24",
      minFontSize: "8",
      textAlign: "center",
      verticalAlign: "middle"
    });
    expect(normalizeTextNumberValue("effectStrength", 99)).toBe(12);
    expect(normalizeTextNumberValue("fontSize", 0)).toBe(1);
    expect(normalizeTextNumberValue("lineHeight", 10)).toBe(4);
    expect(getTextFontWeightForBold(true)).toBe(700);
    expect(getTextFontWeightForBold(false)).toBe(400);
    expect(isTextFontWeightBold("612")).toBe(true);
    expect(isTextFontWeightBold(500)).toBe(false);
    expect(getTextFontStyleForItalic(true)).toBe("italic");
    expect(getTextFontStyleForItalic(false)).toBe("normal");
    expect(getTextWithDraftField(text, "autoFit", true)).toMatchObject({ autoFit: true });
    expect(getTextWithDraftField(text, "content", "Next")).toMatchObject({ content: "Next" });
    expect(getTextWithDraftField(text, "effectColor", "#ABCDEF")).toMatchObject({
      effect: { color: "#abcdef" }
    });
    expect(getTextWithDraftField(text, "effectMode", "shadow")).toMatchObject({
      effect: { mode: "shadow" }
    });
    expect(getTextWithDraftField(text, "effectStrength", "99")).toMatchObject({
      effect: { strength: 12 }
    });
    expect(getTextWithDraftField(text, "fontFamily", "serif")).toMatchObject({
      fontFamily: "serif"
    });
    expect(getTextWithDraftField(text, "minFontSize", "40")).toMatchObject({
      minFontSize: 16.4
    });
    expect(getTextWithDraftField(text, "textAlign", "left")).toMatchObject({ textAlign: "left" });
    expect(getTextWithDraftField(text, "fontStyle", "normal")).toMatchObject({
      fontStyle: "normal"
    });
    expect(getTextWithDraftField(text, "fontStyle", "oblique")).toBeNull();
    expect(getTextWithDraftField(text, "verticalAlign", "nope")).toBeNull();
  });

  it("creates and normalizes image and shape drafts", () => {
    expect(createImageDraft(image)).toEqual({
      assetId: "asset-1",
      fit: "contain",
      positionX: "50",
      positionY: "20"
    });
    expect(normalizeImageNumberValue("positionX", 120)).toBe(100);
    expect(getImageWithDraftField(image, "assetId", "asset-2")).toMatchObject({
      assetId: "asset-2"
    });
    expect(getImageWithDraftField(image, "fit", "cover")).toMatchObject({ fit: "cover" });
    expect(getImageWithDraftField(image, "fit", "stretch")).toBeNull();
    expect(getShapeWithVariant(shape, "triangle")).toEqual({ variant: "triangle" });
    expect(getShapeWithVariant(shape, "hexagon")).toEqual({ variant: "hexagon" });
    expect(getShapeWithVariant(shape, "polygon")).toEqual({ variant: "polygon" });
    expect(getShapeWithVariant(shape, "trapezoid")).toBeNull();
  });

  it("creates and normalizes icon drafts", () => {
    expect(createIconDraft(icon)).toEqual({
      color: "#0f172a",
      style: "outline",
      symbol: "star"
    });
    expect(getIconWithDraftField(icon, "symbol", "shield")).toMatchObject({
      symbol: "shield"
    });
    expect(getIconWithDraftField(icon, "color", "#ABCDEF")).toMatchObject({
      color: "#abcdef"
    });
    expect(getIconWithDraftField(icon, "style", "filled")).toMatchObject({
      style: "filled"
    });
    expect(getIconWithDraftField(icon, "symbol", "unknown")).toBeNull();
    expect(getIconWithDraftField(icon, "color", "red")).toBeNull();
  });

  it("creates and updates custom shape polygon points", () => {
    const polygonShape: ProjectObjectShape = {
      polygonPoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ],
      variant: "polygon"
    };

    expect(createShapePolygonPointDrafts(polygonShape)).toEqual([
      { x: "0", y: "0" },
      { x: "100", y: "0" },
      { x: "100", y: "100" },
      { x: "0", y: "100" }
    ]);
    expect(normalizeShapePolygonPointValue("x", 120)).toBe(100);
    expect(normalizeShapePolygonPointValue("y", 12.34)).toBe(12.3);
    expect(
      getShapePolygonPoints({ polygonPoints: [{ x: -1, y: 12.34 }], variant: "polygon" })
    ).toHaveLength(4);
    expect(getShapeWithPolygonPointDraftField(polygonShape, 1, "x", "24.56")).toMatchObject({
      polygonPoints: [
        { x: 0, y: 0 },
        { x: 24.6, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ]
    });
    expect(getShapeWithPolygonPointDraftField(polygonShape, 1, "x", "nope")).toBeNull();
    expect(getShapeWithPolygonPoint(polygonShape, 2, { x: 120, y: -10 })).toMatchObject({
      polygonPoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 0 },
        { x: 0, y: 100 }
      ]
    });
    expect(getShapeWithAddedPolygonPoint(polygonShape)).toMatchObject({
      polygonPoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        { x: 0, y: 50 }
      ]
    });
    expect(getShapeWithRemovedPolygonPoint(polygonShape, 3)).toMatchObject({
      polygonPoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 }
      ]
    });
    expect(
      getShapeWithRemovedPolygonPoint(
        {
          polygonPoints: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 }
          ],
          variant: "polygon"
        },
        1
      )
    ).toBeNull();
    expect(getShapeWithDefaultPolygonPoints(polygonShape)).toMatchObject({
      polygonPoints: [
        { x: 50, y: 4 },
        { x: 96, y: 50 },
        { x: 50, y: 96 },
        { x: 4, y: 50 }
      ]
    });
  });

  it("creates and normalizes layout drafts", () => {
    expect(createLayoutDraft(layout)).toEqual({
      alignItems: "center",
      columns: "3",
      gap: "12",
      justifyContent: "spaceBetween",
      mode: "horizontal"
    });
    expect(normalizeLayoutNumberValue("gap", -1)).toBe(0);
    expect(normalizeLayoutNumberValue("columns", 0)).toBe(1);
    expect(getLayoutWithDraftField(layout, "mode", "vertical")).toMatchObject({
      mode: "vertical"
    });
    expect(getLayoutWithDraftField(layout, "mode", "grid")).toMatchObject({ mode: "grid" });
    expect(getLayoutWithDraftField(layout, "alignItems", "end")).toMatchObject({
      alignItems: "end"
    });
    expect(getLayoutWithDraftField(layout, "justifyContent", "center")).toMatchObject({
      justifyContent: "center"
    });
    expect(getLayoutWithDraftField(layout, "gap", "24")).toMatchObject({ gap: 24 });
    expect(getLayoutWithDraftField(layout, "columns", "4")).toMatchObject({ columns: 4 });
    expect(getLayoutWithDraftField(layout, "mode", "masonry")).toBeNull();
    expect(getLayoutWithDraftField(layout, "gap", "nope")).toBeNull();
  });
});
