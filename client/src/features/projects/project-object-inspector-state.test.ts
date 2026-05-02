import type {
  ProjectObjectAppearance,
  ProjectObjectCard,
  ProjectObjectDie,
  ProjectObjectImage,
  ProjectObjectLayout,
  ProjectObjectRectTransform,
  ProjectObjectShape,
  ProjectObjectText
} from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  createAppearanceDraft,
  createCardDraft,
  createDieDraft,
  createImageDraft,
  createLayoutDraft,
  createRectTransformDraft,
  createShapePolygonPointDrafts,
  createTextDraft,
  getAppearanceWithDraftField,
  getCardWithDraftField,
  getDieFace,
  getDieFaces,
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
  isTextFontWeightBold,
  normalizeAppearanceNumberValue,
  normalizeDieNumberValue,
  normalizeImageNumberValue,
  normalizeLayoutNumberValue,
  normalizeRectTransformValue,
  normalizeShapePolygonPointValue,
  normalizeTextNumberValue,
  parseRectTransformDraftValue
} from "./project-object-inspector-state";

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
  activeSide: "front",
  sizePreset: "poker"
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
      activeSide: "front",
      sizePreset: "poker"
    });
    expect(getCardWithDraftField(card, "activeSide", "back")).toEqual({
      activeSide: "back",
      sizePreset: "poker"
    });
    expect(getCardWithDraftField(card, "sizePreset", "bridge")).toEqual({
      activeSide: "front",
      sizePreset: "bridge"
    });
    expect(getCardWithDraftField(card, "sizePreset", "custom")).toEqual({
      activeSide: "front",
      sizePreset: "custom"
    });
    expect(getCardWithDraftField(card, "activeSide", "middle")).toBeNull();
    expect(getCardWithDraftField(card, "sizePreset", "unknown-size")).toBeNull();
    expect(getCardWithDraftField(card, "sizePreset", "poker")).toBeNull();
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
      color: "#0f172a",
      content: "Label",
      fontSize: "16",
      fontStyle: "italic",
      fontWeight: "612",
      lineHeight: "1.24",
      textAlign: "center",
      verticalAlign: "middle"
    });
    expect(normalizeTextNumberValue("fontSize", 0)).toBe(1);
    expect(normalizeTextNumberValue("lineHeight", 10)).toBe(4);
    expect(getTextFontWeightForBold(true)).toBe(700);
    expect(getTextFontWeightForBold(false)).toBe(400);
    expect(isTextFontWeightBold("612")).toBe(true);
    expect(isTextFontWeightBold(500)).toBe(false);
    expect(getTextFontStyleForItalic(true)).toBe("italic");
    expect(getTextFontStyleForItalic(false)).toBe("normal");
    expect(getTextWithDraftField(text, "content", "Next")).toMatchObject({ content: "Next" });
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
