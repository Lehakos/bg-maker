import { describe, expect, it } from "vitest";
import {
  getDraggedProjectObjectRectTransform,
  getDraggedProjectObjectRectTransformWithSnap,
  type ResizeHandle
} from "./transform-drag-helpers";

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
  it.each([
    ["e", 20, 0, { height: 50, width: 120, x: 0, y: 0 }],
    ["w", 20, 0, { height: 50, width: 80, x: 20, y: 0 }],
    ["s", 0, 20, { height: 70, width: 100, x: 0, y: 0 }],
    ["n", 0, 20, { height: 30, width: 100, x: 0, y: 20 }],
    ["se", 20, 20, { height: 70, width: 120, x: 0, y: 0 }],
    ["nw", 20, 20, { height: 30, width: 80, x: 20, y: 20 }]
  ] satisfies [ResizeHandle, number, number, Partial<typeof baseRectTransform>][])(
    "resizes from the %s handle with the opposite edge anchored",
    (resizeHandle, deltaX, deltaY, expected) => {
      const transform = getDraggedProjectObjectRectTransform(
        "resize",
        baseRectTransform,
        deltaX,
        deltaY,
        0,
        {
          positionMode: "topLeft",
          resizeHandle,
          resizeMode: "size"
        }
      );

      expect(transform).toMatchObject(expected);
    }
  );

  it("uses top-left positioning for roots and center positioning for child objects", () => {
    expect(
      getDraggedProjectObjectRectTransform("resize", baseRectTransform, 20, 0, 0, {
        positionMode: "topLeft",
        resizeHandle: "e",
        resizeMode: "size"
      })
    ).toMatchObject({ width: 120, x: 0 });
    expect(
      getDraggedProjectObjectRectTransform("resize", baseRectTransform, 20, 0, 0, {
        positionMode: "center",
        resizeHandle: "e",
        resizeMode: "size"
      })
    ).toMatchObject({ width: 120, x: 10 });
  });

  it("preserves width and height proportions while resizing with the aspect lock", () => {
    const transform = getDraggedProjectObjectRectTransform("resize", baseRectTransform, 50, 5, 0, {
      preserveAspectRatio: true,
      resizeHandle: "se",
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
      { preserveAspectRatio: true, resizeHandle: "se", resizeMode: "scale" }
    );

    expect(transform).toMatchObject({ scaleX: 2.4, scaleY: 1.2 });
  });

  it("snaps moved bounds to the closest target inside the threshold", () => {
    const result = getDraggedProjectObjectRectTransformWithSnap(
      "move",
      baseRectTransform,
      43,
      24,
      0,
      {
        positionMode: "topLeft",
        snap: {
          targets: [
            { axis: "x", position: 140, source: "object" },
            { axis: "y", position: 72, source: "guide" }
          ],
          threshold: 6
        }
      }
    );

    expect(result.rectTransform).toMatchObject({ x: 40, y: 22 });
    expect(result.snapIndicators).toEqual([
      { axis: "x", position: 140 },
      { axis: "y", position: 72 }
    ]);
  });
});
