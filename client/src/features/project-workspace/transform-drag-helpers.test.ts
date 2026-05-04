import { describe, expect, it } from "vitest";
import { getDraggedProjectObjectRectTransform } from "./transform-drag-helpers";

const baseRectTransform = {
  height: 50,
  pivotX: 0.5,
  pivotY: 0.5,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  width: 100,
  x: 0,
  y: 0
};

describe("transform drag helpers", () => {
  it("preserves width and height proportions while resizing with the aspect lock", () => {
    const transform = getDraggedProjectObjectRectTransform("resize", baseRectTransform, 50, 5, 0, {
      preserveAspectRatio: true,
      resizeMode: "size"
    });

    expect(transform).toMatchObject({ height: 75, width: 150 });
  });

  it("preserves linked object scale proportions while resizing with the aspect lock", () => {
    const transform = getDraggedProjectObjectRectTransform(
      "resize",
      {
        ...baseRectTransform,
        scaleX: 2,
        scaleY: 1
      },
      40,
      5,
      0,
      { preserveAspectRatio: true, resizeMode: "scale" }
    );

    expect(transform).toMatchObject({ scaleX: 2.4, scaleY: 1.2 });
  });
});
