import type { ProjectObjectRectTransform } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  createRectTransformDraft,
  getRectTransformWithDraftField,
  normalizeRectTransformValue,
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
});
