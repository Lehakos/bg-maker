import { describe, expect, it } from "vitest";
import { getProjectFileTreeSelectionAfterClick } from "./project-file-tree-selection";

const visibleNodeIds = ["a", "b", "c", "d", "e"];

describe("project file tree selection", () => {
  it("selects a single clicked node without modifiers", () => {
    expect(
      getProjectFileTreeSelectionAfterClick({
        additive: false,
        clickedNodeId: "c",
        range: false,
        selectedNodeId: "a",
        selectedNodeIds: ["a", "b"],
        selectionAnchorNodeId: "a",
        visibleNodeIds
      })
    ).toEqual({
      selectedNodeId: "c",
      selectedNodeIds: ["c"],
      selectionAnchorNodeId: "c"
    });
  });

  it("toggles a node with ctrl or command selection", () => {
    expect(
      getProjectFileTreeSelectionAfterClick({
        additive: true,
        clickedNodeId: "c",
        range: false,
        selectedNodeId: "a",
        selectedNodeIds: ["a"],
        selectionAnchorNodeId: "a",
        visibleNodeIds
      })
    ).toMatchObject({
      selectedNodeId: "c",
      selectedNodeIds: ["a", "c"],
      selectionAnchorNodeId: "c"
    });

    expect(
      getProjectFileTreeSelectionAfterClick({
        additive: true,
        clickedNodeId: "c",
        range: false,
        selectedNodeId: "c",
        selectedNodeIds: ["a", "c"],
        selectionAnchorNodeId: "c",
        visibleNodeIds
      })
    ).toMatchObject({
      selectedNodeId: "a",
      selectedNodeIds: ["a"],
      selectionAnchorNodeId: "c"
    });
  });

  it("selects a visible range with shift", () => {
    expect(
      getProjectFileTreeSelectionAfterClick({
        additive: false,
        clickedNodeId: "d",
        range: true,
        selectedNodeId: "b",
        selectedNodeIds: ["b"],
        selectionAnchorNodeId: "b",
        visibleNodeIds
      })
    ).toEqual({
      selectedNodeId: "d",
      selectedNodeIds: ["b", "c", "d"],
      selectionAnchorNodeId: "b"
    });
  });

  it("adds a visible range with ctrl plus shift", () => {
    expect(
      getProjectFileTreeSelectionAfterClick({
        additive: true,
        clickedNodeId: "e",
        range: true,
        selectedNodeId: "b",
        selectedNodeIds: ["a", "b"],
        selectionAnchorNodeId: "c",
        visibleNodeIds
      })
    ).toEqual({
      selectedNodeId: "e",
      selectedNodeIds: ["a", "b", "c", "d", "e"],
      selectionAnchorNodeId: "c"
    });
  });
});
