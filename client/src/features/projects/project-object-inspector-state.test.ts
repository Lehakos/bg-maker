import type {
  ProjectObjectAppearance,
  ProjectObjectImage,
  ProjectObjectRectTransform,
  ProjectObjectShape,
  ProjectObjectText
} from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  createAppearanceDraft,
  createImageDraft,
  createRectTransformDraft,
  createTextDraft,
  getAppearanceWithDraftField,
  getImageWithDraftField,
  getRectTransformWithDraftField,
  getShapeWithVariant,
  getTextWithDraftField,
  normalizeAppearanceNumberValue,
  normalizeImageNumberValue,
  normalizeRectTransformValue,
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

const text: ProjectObjectText = {
  color: "#0f172a",
  content: "Label",
  fontSize: 16.4,
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

  it("creates and normalizes text drafts", () => {
    expect(createTextDraft(text)).toEqual({
      color: "#0f172a",
      content: "Label",
      fontSize: "16",
      fontWeight: "612",
      lineHeight: "1.24",
      textAlign: "center",
      verticalAlign: "middle"
    });
    expect(normalizeTextNumberValue("fontSize", 0)).toBe(1);
    expect(normalizeTextNumberValue("lineHeight", 10)).toBe(4);
    expect(getTextWithDraftField(text, "content", "Next")).toMatchObject({ content: "Next" });
    expect(getTextWithDraftField(text, "textAlign", "left")).toMatchObject({ textAlign: "left" });
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
    expect(getShapeWithVariant(shape, "hexagon")).toBeNull();
  });
});
