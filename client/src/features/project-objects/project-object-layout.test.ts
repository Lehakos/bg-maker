import type {
  ProjectObjectLayout,
  ProjectObjectNode,
  ProjectObjectRectTransform
} from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import { getProjectObjectLayoutRectTransformOverrides } from "./project-object-layout";

const parentRectTransform: ProjectObjectRectTransform = {
  height: 120,
  pivotX: 0.5,
  pivotY: 0.5,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  width: 300,
  x: 0,
  y: 0
};

const baseLayout: ProjectObjectLayout = {
  alignItems: "start",
  columns: 3,
  gap: 10,
  justifyContent: "start",
  mode: "horizontal"
};

const layoutPadding = 20;

function objectNode(
  id: string,
  rectTransform: Partial<ProjectObjectRectTransform>,
  visible = true
): ProjectObjectNode {
  return {
    components: {
      rectTransform: {
        height: 30,
        pivotX: 0.5,
        pivotY: 0.5,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        width: 40,
        x: 999,
        y: 999,
        ...rectTransform
      }
    },
    id,
    kind: "shape",
    name: id,
    visible
  };
}

describe("project object layout", () => {
  it("returns no overrides for free layout", () => {
    const overrides = getProjectObjectLayoutRectTransformOverrides(
      parentRectTransform,
      [objectNode("child-1", {})],
      { ...baseLayout, mode: "free" },
      layoutPadding
    );

    expect(overrides.size).toBe(0);
  });

  it("lays out visible children horizontally with gap and cross-axis alignment", () => {
    const overrides = getProjectObjectLayoutRectTransformOverrides(
      parentRectTransform,
      [
        objectNode("child-1", { height: 30, width: 40 }),
        objectNode("hidden-child", { height: 30, width: 40 }, false),
        objectNode("child-2", { height: 50, width: 60 })
      ],
      { ...baseLayout, alignItems: "center" },
      layoutPadding
    );

    expect(overrides.get("child-1")).toMatchObject({ x: 20, y: 45 });
    expect(overrides.get("child-2")).toMatchObject({ x: 70, y: 35 });
    expect(overrides.has("hidden-child")).toBe(false);
  });

  it("lays out children vertically with end justification", () => {
    const overrides = getProjectObjectLayoutRectTransformOverrides(
      { ...parentRectTransform, height: 200 },
      [objectNode("child-1", { height: 30, width: 40 }), objectNode("child-2", { height: 50 })],
      {
        ...baseLayout,
        alignItems: "end",
        justifyContent: "end",
        mode: "vertical"
      },
      layoutPadding
    );

    expect(overrides.get("child-1")).toMatchObject({ x: 240, y: 90 });
    expect(overrides.get("child-2")).toMatchObject({ x: 240, y: 130 });
  });

  it("distributes remaining main-axis space between children", () => {
    const overrides = getProjectObjectLayoutRectTransformOverrides(
      parentRectTransform,
      [objectNode("child-1", { width: 40 }), objectNode("child-2", { width: 60 })],
      { ...baseLayout, justifyContent: "spaceBetween" },
      layoutPadding
    );

    expect(overrides.get("child-1")).toMatchObject({ x: 20 });
    expect(overrides.get("child-2")).toMatchObject({ x: 220 });
  });

  it("lays out children in a grid by columns", () => {
    const overrides = getProjectObjectLayoutRectTransformOverrides(
      { ...parentRectTransform, height: 180 },
      [
        objectNode("child-1", { height: 30, width: 40 }),
        objectNode("child-2", { height: 50, width: 60 }),
        objectNode("child-3", { height: 20, width: 30 })
      ],
      {
        ...baseLayout,
        alignItems: "center",
        columns: 2,
        justifyContent: "center",
        mode: "grid"
      },
      layoutPadding
    );

    expect(overrides.get("child-1")).toMatchObject({ x: 85, y: 35 });
    expect(overrides.get("child-2")).toMatchObject({ x: 155, y: 35 });
    expect(overrides.get("child-3")).toMatchObject({ x: 85, y: 95 });
  });
});
