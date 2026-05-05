export type ProjectFileTreeSelectionState = {
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectionAnchorNodeId: string | null;
};

export function getProjectFileTreeSelectionAfterClick({
  additive,
  clickedNodeId,
  range,
  selectedNodeId,
  selectedNodeIds,
  selectionAnchorNodeId,
  visibleNodeIds
}: {
  additive: boolean;
  clickedNodeId: string;
  range: boolean;
  selectedNodeId: string | null;
  selectedNodeIds: readonly string[];
  selectionAnchorNodeId: string | null;
  visibleNodeIds: readonly string[];
}): ProjectFileTreeSelectionState {
  if (range) {
    const anchorNodeId = getRangeAnchorNodeId({
      clickedNodeId,
      selectedNodeId,
      selectionAnchorNodeId,
      visibleNodeIds
    });
    const rangeNodeIds = getVisibleNodeIdRange(visibleNodeIds, anchorNodeId, clickedNodeId);
    const nextSelectedNodeIds = additive
      ? getOrderedSelectedNodeIds(visibleNodeIds, [...selectedNodeIds, ...rangeNodeIds])
      : rangeNodeIds;

    return {
      selectedNodeId: clickedNodeId,
      selectedNodeIds: nextSelectedNodeIds,
      selectionAnchorNodeId: anchorNodeId
    };
  }

  if (additive) {
    const selectedNodeIdSet = new Set(selectedNodeIds);
    const clickedWasSelected = selectedNodeIdSet.has(clickedNodeId);

    if (clickedWasSelected) {
      selectedNodeIdSet.delete(clickedNodeId);
    } else {
      selectedNodeIdSet.add(clickedNodeId);
    }

    const nextSelectedNodeIds = getOrderedSelectedNodeIds(visibleNodeIds, [
      ...selectedNodeIdSet
    ]);
    const nextSelectedNodeId = clickedWasSelected
      ? selectedNodeId === clickedNodeId
        ? (nextSelectedNodeIds.at(-1) ?? null)
        : selectedNodeId
      : clickedNodeId;

    return {
      selectedNodeId:
        nextSelectedNodeId && nextSelectedNodeIds.includes(nextSelectedNodeId)
          ? nextSelectedNodeId
          : (nextSelectedNodeIds.at(-1) ?? null),
      selectedNodeIds: nextSelectedNodeIds,
      selectionAnchorNodeId: clickedNodeId
    };
  }

  return {
    selectedNodeId: clickedNodeId,
    selectedNodeIds: [clickedNodeId],
    selectionAnchorNodeId: clickedNodeId
  };
}

function getRangeAnchorNodeId({
  clickedNodeId,
  selectedNodeId,
  selectionAnchorNodeId,
  visibleNodeIds
}: {
  clickedNodeId: string;
  selectedNodeId: string | null;
  selectionAnchorNodeId: string | null;
  visibleNodeIds: readonly string[];
}) {
  if (selectionAnchorNodeId && visibleNodeIds.includes(selectionAnchorNodeId)) {
    return selectionAnchorNodeId;
  }

  if (selectedNodeId && visibleNodeIds.includes(selectedNodeId)) {
    return selectedNodeId;
  }

  return clickedNodeId;
}

function getVisibleNodeIdRange(
  visibleNodeIds: readonly string[],
  anchorNodeId: string,
  clickedNodeId: string
) {
  const anchorIndex = visibleNodeIds.indexOf(anchorNodeId);
  const clickedIndex = visibleNodeIds.indexOf(clickedNodeId);

  if (anchorIndex < 0 || clickedIndex < 0) {
    return [clickedNodeId];
  }

  const startIndex = Math.min(anchorIndex, clickedIndex);
  const endIndex = Math.max(anchorIndex, clickedIndex);

  return visibleNodeIds.slice(startIndex, endIndex + 1);
}

function getOrderedSelectedNodeIds(
  visibleNodeIds: readonly string[],
  selectedNodeIds: readonly string[]
) {
  const selectedNodeIdSet = new Set(selectedNodeIds);
  const orderedVisibleNodeIds = visibleNodeIds.filter((nodeId) => selectedNodeIdSet.has(nodeId));
  const hiddenSelectedNodeIds = selectedNodeIds.filter((nodeId) => !visibleNodeIds.includes(nodeId));

  return [...orderedVisibleNodeIds, ...hiddenSelectedNodeIds];
}
