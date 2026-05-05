import type { ProjectCompositionSettings } from "@bg-maker/shared";
import { getDefaultProjectCompositionSettings } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  getCompositionBounds,
  getGuidePositionFromClientPoint,
  getGuideSnapTargets,
  getObjectSnapTargets,
  getProjectCompositionSettings,
  getProjectCompositionSettingsWithField,
  getProjectCompositionSettingsWithGuideAdded,
  getProjectCompositionSettingsWithGuideRemoved,
  getProjectCompositionSettingsWithGuideUpdated
} from "./composition-guides";

const rectTransform = {
  height: 40,
  pivotX: 0.5,
  pivotY: 0.5,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  width: 60,
  x: 10,
  y: 20
};

describe("composition guides", () => {
  it("defaults, adds, updates, removes, and toggles guide settings", () => {
    const composition = getProjectCompositionSettings(undefined);
    const withGuide = getProjectCompositionSettingsWithGuideAdded(composition, "vertical", 12.4);
    const guide = withGuide.guides[0]!;
    const updated = getProjectCompositionSettingsWithGuideUpdated(withGuide, guide.id, {
      locked: true,
      position: 18.6,
      visible: false
    });
    const hiddenRulers = getProjectCompositionSettingsWithField(updated, "rulersVisible", false);

    expect(composition).toEqual(getDefaultProjectCompositionSettings());
    expect(guide).toMatchObject({
      axis: "vertical",
      locked: false,
      position: 12,
      visible: true
    });
    expect(updated.guides[0]).toMatchObject({
      locked: true,
      position: 19,
      visible: false
    });
    expect(hiddenRulers.rulersVisible).toBe(false);
    expect(getProjectCompositionSettingsWithGuideRemoved(updated, guide.id).guides).toEqual([]);
  });

  it("resolves visible guide and non-selected object snap targets", () => {
    const composition: ProjectCompositionSettings = {
      guides: [
        { axis: "vertical", id: "guide-1", locked: false, position: 100, visible: true },
        { axis: "horizontal", id: "guide-2", locked: false, position: 200, visible: false }
      ],
      rulersVisible: true,
      snapToGuides: true,
      snapToObjects: true
    };

    expect(getGuideSnapTargets(composition)).toEqual([
      { axis: "x", position: 0, source: "guide" },
      { axis: "y", position: 0, source: "guide" },
      { axis: "x", position: 100, source: "guide" }
    ]);
    expect(getGuideSnapTargets({ ...composition, snapToGuides: false })).toEqual([]);
    expect(
      getObjectSnapTargets(
        [
          { id: "selected", positionMode: "topLeft", rectTransform },
          {
            id: "sibling",
            positionMode: "topLeft",
            rectTransform: { ...rectTransform, height: 50, width: 90, x: 30, y: 40 }
          }
        ],
        new Set(["selected"])
      )
    ).toEqual([
      { axis: "x", position: 30, source: "object" },
      { axis: "x", position: 75, source: "object" },
      { axis: "x", position: 120, source: "object" },
      { axis: "y", position: 40, source: "object" },
      { axis: "y", position: 65, source: "object" },
      { axis: "y", position: 90, source: "object" }
    ]);
  });

  it("computes root and child coordinate bounds", () => {
    expect(getCompositionBounds(rectTransform, "topLeft")).toMatchObject({
      bottom: 60,
      centerX: 40,
      centerY: 40,
      left: 10,
      right: 70,
      top: 20
    });
    expect(getCompositionBounds(rectTransform, "center")).toMatchObject({
      bottom: 40,
      centerX: 10,
      centerY: 20,
      left: -20,
      right: 40,
      top: 0
    });
  });

  it("computes guide positions from a stable layer rect instead of React event state", () => {
    const rect = {
      height: 400,
      left: 100,
      top: 50,
      width: 800
    };

    expect(getGuidePositionFromClientPoint(rect, "vertical", 500, 80, 960, 480)).toBe(0);
    expect(getGuidePositionFromClientPoint(rect, "horizontal", 120, 250, 960, 480)).toBe(0);
    expect(getGuidePositionFromClientPoint(rect, "vertical", 900, 80, 960, 480)).toBe(480);
    expect(getGuidePositionFromClientPoint(rect, "horizontal", 120, 450, 960, 480)).toBe(240);
  });
});
