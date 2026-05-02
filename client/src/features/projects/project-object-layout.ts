import type {
  ProjectObjectLayout,
  ProjectObjectNode,
  ProjectObjectRectTransform
} from "@bg-maker/shared";
import { getProjectObjectNodeRectTransform } from "./project-object-tree";

export function getProjectObjectLayoutRectTransformOverrides(
  parentRectTransform: ProjectObjectRectTransform,
  children: readonly ProjectObjectNode[],
  layout: ProjectObjectLayout,
  layoutPadding: number
) {
  const overrides = new Map<string, ProjectObjectRectTransform>();

  if (layout.mode === "free") {
    return overrides;
  }

  const visibleChildren = children.filter((child) => child.visible);

  if (!visibleChildren.length) {
    return overrides;
  }

  const childRectTransforms = visibleChildren.map((child) => ({
    child,
    rectTransform: getProjectObjectNodeRectTransform(child)
  }));

  if (layout.mode === "grid") {
    return getGridLayoutRectTransformOverrides(
      parentRectTransform,
      childRectTransforms,
      layout,
      layoutPadding
    );
  }

  const horizontal = layout.mode === "horizontal";
  const contentMainSize = Math.max(
    0,
    (horizontal ? parentRectTransform.width : parentRectTransform.height) - layoutPadding * 2
  );
  const contentCrossSize = Math.max(
    0,
    (horizontal ? parentRectTransform.height : parentRectTransform.width) - layoutPadding * 2
  );
  const fixedMainSize = childRectTransforms.reduce(
    (sum, { rectTransform }) => sum + getMainSize(rectTransform, horizontal),
    0
  );
  const baseGapSize =
    layout.justifyContent === "spaceBetween"
      ? 0
      : layout.gap * Math.max(0, childRectTransforms.length - 1);
  const freeMainSpace = Math.max(0, contentMainSize - fixedMainSize - baseGapSize);
  const gapSize =
    layout.justifyContent === "spaceBetween" && childRectTransforms.length > 1
      ? freeMainSpace / (childRectTransforms.length - 1)
      : layout.gap;
  let mainCursor = layoutPadding + getJustifyOffset(layout.justifyContent, freeMainSpace);

  for (const { child, rectTransform } of childRectTransforms) {
    const crossOffset =
      layoutPadding +
      getAlignmentOffset(
        layout.alignItems,
        contentCrossSize,
        getCrossSize(rectTransform, horizontal)
      );
    const nextRectTransform = horizontal
      ? { ...rectTransform, x: mainCursor, y: crossOffset }
      : { ...rectTransform, x: crossOffset, y: mainCursor };

    overrides.set(child.id, nextRectTransform);
    mainCursor += getMainSize(rectTransform, horizontal) + gapSize;
  }

  return overrides;
}

type ChildRectTransform = {
  child: ProjectObjectNode;
  rectTransform: ProjectObjectRectTransform;
};

function getGridLayoutRectTransformOverrides(
  parentRectTransform: ProjectObjectRectTransform,
  childRectTransforms: readonly ChildRectTransform[],
  layout: ProjectObjectLayout,
  layoutPadding: number
) {
  const overrides = new Map<string, ProjectObjectRectTransform>();
  const columns = Math.max(1, Math.round(layout.columns));
  const cellWidth = Math.max(
    0,
    ...childRectTransforms.map(({ rectTransform }) => rectTransform.width)
  );
  const cellHeight = Math.max(
    0,
    ...childRectTransforms.map(({ rectTransform }) => rectTransform.height)
  );
  const rows = Math.ceil(childRectTransforms.length / columns);
  const contentWidth = Math.max(0, parentRectTransform.width - layoutPadding * 2);
  const contentHeight = Math.max(0, parentRectTransform.height - layoutPadding * 2);
  const gridWidth = cellWidth * columns + layout.gap * Math.max(0, columns - 1);
  const gridHeight = cellHeight * rows + layout.gap * Math.max(0, rows - 1);
  const offsetX =
    layoutPadding + getJustifyOffset(layout.justifyContent, contentWidth - gridWidth);
  const offsetY = layoutPadding + getAlignmentOffset(layout.alignItems, contentHeight, gridHeight);

  for (const [index, { child, rectTransform }] of childRectTransforms.entries()) {
    const columnIndex = index % columns;
    const rowIndex = Math.floor(index / columns);

    overrides.set(child.id, {
      ...rectTransform,
      x: offsetX + columnIndex * (cellWidth + layout.gap),
      y: offsetY + rowIndex * (cellHeight + layout.gap)
    });
  }

  return overrides;
}

function getMainSize(rectTransform: ProjectObjectRectTransform, horizontal: boolean) {
  return horizontal ? rectTransform.width : rectTransform.height;
}

function getCrossSize(rectTransform: ProjectObjectRectTransform, horizontal: boolean) {
  return horizontal ? rectTransform.height : rectTransform.width;
}

function getAlignmentOffset(
  alignItems: ProjectObjectLayout["alignItems"],
  contentCrossSize: number,
  childCrossSize: number
) {
  const freeCrossSpace = Math.max(0, contentCrossSize - childCrossSize);

  if (alignItems === "center") {
    return freeCrossSpace / 2;
  }

  if (alignItems === "end") {
    return freeCrossSpace;
  }

  return 0;
}

function getJustifyOffset(
  justifyContent: ProjectObjectLayout["justifyContent"],
  freeMainSpace: number
) {
  const availableMainSpace = Math.max(0, freeMainSpace);

  if (justifyContent === "center") {
    return availableMainSpace / 2;
  }

  if (justifyContent === "end") {
    return availableMainSpace;
  }

  return 0;
}
