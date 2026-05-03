import type {
  ProjectFileNode,
  ProjectObjectAppearance,
  ProjectObjectLayout,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectObjectZone
} from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  getEffectiveProjectObjectRectTransform,
  getProjectObjectZoneSize,
  getProjectObjectZoneSlotRectsForSize,
  resolveProjectObjectZoneReference
} from "./project-object-zone";

const baseRectTransform: ProjectObjectRectTransform = {
  height: 120,
  pivotX: 0.5,
  pivotY: 0.5,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  width: 180,
  x: 0,
  y: 0
};

const baseLayout: ProjectObjectLayout = {
  alignItems: "start",
  columns: 3,
  gap: 8,
  justifyContent: "start",
  mode: "grid"
};

const baseAppearance: ProjectObjectAppearance = {
  backgroundColor: "#ecfeff",
  backgroundOpacity: 0.45,
  borderColor: "#0891b2",
  borderRadius: 6,
  borderStyle: "dashed",
  borderWidth: 2,
  opacity: 1,
  padding: 8
};

const baseZone: ProjectObjectZone = {
  capacity: 4,
  referenceObjectFileId: "reference-card"
};

function objectNode(
  id: string,
  kind: ProjectObjectNode["kind"],
  rectTransform: Partial<ProjectObjectRectTransform> = {},
  components: ProjectObjectNode["components"] = {}
): ProjectObjectNode {
  return {
    children: [],
    components: {
      rectTransform: {
        ...baseRectTransform,
        ...rectTransform
      },
      ...components
    },
    id,
    kind,
    name: id,
    visible: true
  };
}

function objectFile(id: string, rootObject: ProjectObjectNode): ProjectFileNode {
  return {
    id,
    kind: "object",
    name: id,
    objectTree: [rootObject],
    type: "file"
  };
}

function zoneObject(zone: ProjectObjectZone, rectTransform = baseRectTransform): ProjectObjectNode {
  return objectNode("zone-1", "zone", rectTransform, {
    appearance: baseAppearance,
    layout: baseLayout,
    zone
  });
}

describe("project object zone sizing", () => {
  it("computes horizontal, vertical, and grid zone sizes from slot size", () => {
    expect(
      getProjectObjectZoneSize(
        { height: 88, width: 63 },
        baseZone,
        { ...baseLayout, gap: 8, mode: "horizontal" },
        10
      )
    ).toEqual({ height: 108, width: 296 });
    expect(
      getProjectObjectZoneSize(
        { height: 88, width: 63 },
        baseZone,
        { ...baseLayout, gap: 8, mode: "vertical" },
        10
      )
    ).toEqual({ height: 396, width: 83 });
    expect(
      getProjectObjectZoneSize(
        { height: 20, width: 10 },
        { ...baseZone, capacity: 5 },
        { ...baseLayout, columns: 3, gap: 4, mode: "grid" },
        2
      )
    ).toEqual({ height: 48, width: 42 });
  });

  it("uses the referenced object file root size live for effective zone size", () => {
    const referenceObject = objectNode("shape-root", "shape", { height: 60, width: 40 });
    const largerReferenceObject = objectNode("shape-root", "shape", { height: 70, width: 50 });
    const zone = zoneObject({
      capacity: 3,
      referenceObjectFileId: "reference-card"
    });
    const fileTree = [objectFile("reference-card", referenceObject)];
    const largerFileTree = [objectFile("reference-card", largerReferenceObject)];

    expect(resolveProjectObjectZoneReference(fileTree, baseZone)?.object.id).toBe("shape-root");
    expect(getEffectiveProjectObjectRectTransform(zone, fileTree)).toMatchObject({
      height: 76,
      width: 152
    });
    expect(getEffectiveProjectObjectRectTransform(zone, largerFileTree)).toMatchObject({
      height: 86,
      width: 182
    });
  });

  it("falls back to stored rect when the reference is missing or a zone root", () => {
    const fallbackRectTransform = { ...baseRectTransform, height: 42, width: 99 };
    const zone = zoneObject(
      {
        capacity: 3,
        referenceObjectFileId: "missing-reference"
      },
      fallbackRectTransform
    );
    const zoneReferenceRoot = objectFile("missing-reference", zoneObject(baseZone));

    expect(getEffectiveProjectObjectRectTransform(zone, [])).toMatchObject({
      height: 42,
      width: 99
    });
    expect(getEffectiveProjectObjectRectTransform(zone, [zoneReferenceRoot])).toMatchObject({
      height: 42,
      width: 99
    });
    expect(
      resolveProjectObjectZoneReference([zoneReferenceRoot], {
        capacity: 1,
        referenceObjectFileId: "missing-reference"
      })
    ).toBeNull();
  });

  it("computes slot preview rectangles with the same layout math", () => {
    expect(
      getProjectObjectZoneSlotRectsForSize(
        { height: 20, width: 10 },
        { ...baseZone, capacity: 5 },
        { ...baseLayout, columns: 3, gap: 4 },
        2
      )
    ).toEqual([
      { height: 20, width: 10, x: 2, y: 2 },
      { height: 20, width: 10, x: 16, y: 2 },
      { height: 20, width: 10, x: 30, y: 2 },
      { height: 20, width: 10, x: 2, y: 26 },
      { height: 20, width: 10, x: 16, y: 26 }
    ]);
  });
});
