import { describe, expect, it } from "vitest";
import {
  getResizablePanelSizeFromPointerDelta,
  normalizeResizablePanelSize
} from "./resizable-panel-state";

describe("resizable panel helpers", () => {
  it("clamps panel sizes to normalized bounds", () => {
    expect(normalizeResizablePanelSize(120, { minSize: 180, maxSize: 420 })).toBe(180);
    expect(normalizeResizablePanelSize(320, { minSize: 180, maxSize: 420 })).toBe(320);
    expect(normalizeResizablePanelSize(560, { minSize: 180, maxSize: 420 })).toBe(420);
  });

  it("treats impossible max bounds as the minimum size", () => {
    expect(normalizeResizablePanelSize(320, { minSize: 260, maxSize: 120 })).toBe(260);
  });

  it("resizes from horizontal panel edges using pointer direction", () => {
    expect(
      getResizablePanelSizeFromPointerDelta({
        edge: "right",
        minSize: 180,
        maxSize: 420,
        pointerDelta: 40,
        startSize: 300
      })
    ).toBe(340);

    expect(
      getResizablePanelSizeFromPointerDelta({
        edge: "left",
        minSize: 180,
        maxSize: 420,
        pointerDelta: 40,
        startSize: 300
      })
    ).toBe(260);
  });

  it("resizes from vertical panel edges using pointer direction", () => {
    expect(
      getResizablePanelSizeFromPointerDelta({
        edge: "bottom",
        minSize: 180,
        maxSize: 420,
        pointerDelta: 40,
        startSize: 300
      })
    ).toBe(340);

    expect(
      getResizablePanelSizeFromPointerDelta({
        edge: "top",
        minSize: 180,
        maxSize: 420,
        pointerDelta: 40,
        startSize: 300
      })
    ).toBe(260);
  });
});
