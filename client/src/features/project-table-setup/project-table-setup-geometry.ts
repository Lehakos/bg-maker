import type {
  ProjectFileNode,
  ProjectObjectRectTransform,
  ProjectTableSetup
} from "@bg-maker/shared";
import { getProjectTableSetupItemId, getProjectTableSetupItemLocked } from "@bg-maker/shared";
import { getProjectObjectNodeRectTransform } from "../project-objects/project-object-tree";
import {
  getProjectTableSetupResolvedItemObject,
  getProjectTableSetupWithItemTransforms
} from "./project-table-setup";

export type TableSetupAlignment =
  | "bottom"
  | "center"
  | "left"
  | "middle"
  | "right"
  | "top";

export type TableSetupDistribution = "horizontal" | "vertical";

export type TableSetupItemFrame = {
  bounds: TableSetupItemBounds;
  id: string;
  locked: boolean;
  rectTransform: ProjectObjectRectTransform;
};

type TableSetupItemBounds = {
  bottom: number;
  centerX: number;
  centerY: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

export function getTableSetupItemFrames(
  fileTree: readonly ProjectFileNode[],
  tableSetup: ProjectTableSetup,
  itemIds: readonly string[]
): TableSetupItemFrame[] {
  const selectedIds = new Set(itemIds);

  return tableSetup.items.flatMap((item) => {
    const id = getProjectTableSetupItemId(item);

    if (!selectedIds.has(id)) {
      return [];
    }

    const object = getProjectTableSetupResolvedItemObject(fileTree, item);

    if (!object) {
      return [];
    }

    const rectTransform = getProjectObjectNodeRectTransform(object);

    return [
      {
        bounds: getTableSetupItemBounds(rectTransform),
        id,
        locked: getProjectTableSetupItemLocked(item),
        rectTransform
      }
    ];
  });
}

export function getProjectTableSetupWithNudgedItems({
  fileTree,
  itemIds,
  tableSetup,
  x,
  y
}: {
  fileTree: readonly ProjectFileNode[];
  itemIds: readonly string[];
  tableSetup: ProjectTableSetup;
  x: number;
  y: number;
}): ProjectTableSetup {
  const transforms = new Map<string, ProjectObjectRectTransform>();

  for (const frame of getTableSetupItemFrames(fileTree, tableSetup, itemIds)) {
    if (frame.locked) {
      continue;
    }

    transforms.set(frame.id, {
      ...frame.rectTransform,
      x: frame.rectTransform.x + x,
      y: frame.rectTransform.y + y
    });
  }

  return getProjectTableSetupWithItemTransforms(tableSetup, transforms);
}

export function getProjectTableSetupWithTransformedGroupItems({
  after,
  before,
  fileTree,
  itemIds,
  sourceItemId,
  tableSetup
}: {
  after: ProjectObjectRectTransform;
  before: ProjectObjectRectTransform;
  fileTree: readonly ProjectFileNode[];
  itemIds: readonly string[];
  sourceItemId: string;
  tableSetup: ProjectTableSetup;
}): ProjectTableSetup {
  const selectedIds = new Set(itemIds);

  if (!selectedIds.has(sourceItemId)) {
    return tableSetup;
  }

  const frames = getUnlockedFrames(fileTree, tableSetup, itemIds);
  const sourceFrame = frames.find((frame) => frame.id === sourceItemId);

  if (!sourceFrame) {
    return tableSetup;
  }

  const deltaX = after.x - before.x;
  const deltaY = after.y - before.y;
  const deltaRotation = after.rotation - before.rotation;
  const deltaWidth = after.width - before.width;
  const deltaHeight = after.height - before.height;
  const scaleXRatio = getSafeRatio(after.scaleX, before.scaleX);
  const scaleYRatio = getSafeRatio(after.scaleY, before.scaleY);
  const effectiveWidthRatio = getSafeRatio(after.width, before.width);
  const effectiveHeightRatio = getSafeRatio(after.height, before.height);
  const itemById = new Map(tableSetup.items.map((item) => [getProjectTableSetupItemId(item), item]));
  const transforms = new Map<string, ProjectObjectRectTransform>();

  for (const frame of frames) {
    const item = itemById.get(frame.id);
    let nextTransform: ProjectObjectRectTransform = {
      ...frame.rectTransform,
      rotation: frame.rectTransform.rotation + deltaRotation,
      x: frame.rectTransform.x + deltaX,
      y: frame.rectTransform.y + deltaY
    };

    if (deltaWidth !== 0) {
      nextTransform =
        item?.type === "linkedObject"
          ? {
              ...nextTransform,
              scaleX: clampTransformScale(frame.rectTransform.scaleX * effectiveWidthRatio)
            }
          : {
              ...nextTransform,
              width: clampTransformSize(frame.rectTransform.width + deltaWidth)
            };
    }

    if (deltaHeight !== 0) {
      nextTransform =
        item?.type === "linkedObject"
          ? {
              ...nextTransform,
              scaleY: clampTransformScale(frame.rectTransform.scaleY * effectiveHeightRatio)
            }
          : {
              ...nextTransform,
              height: clampTransformSize(frame.rectTransform.height + deltaHeight)
            };
    }

    if (scaleXRatio !== 1) {
      nextTransform = {
        ...nextTransform,
        scaleX: clampTransformScale(frame.rectTransform.scaleX * scaleXRatio)
      };
    }

    if (scaleYRatio !== 1) {
      nextTransform = {
        ...nextTransform,
        scaleY: clampTransformScale(frame.rectTransform.scaleY * scaleYRatio)
      };
    }

    transforms.set(frame.id, nextTransform);
  }

  return getProjectTableSetupWithItemTransforms(tableSetup, transforms);
}

export function getProjectTableSetupWithAlignedItems({
  alignment,
  fileTree,
  itemIds,
  tableSetup
}: {
  alignment: TableSetupAlignment;
  fileTree: readonly ProjectFileNode[];
  itemIds: readonly string[];
  tableSetup: ProjectTableSetup;
}): ProjectTableSetup {
  const frames = getUnlockedFrames(fileTree, tableSetup, itemIds);

  if (frames.length < 1) {
    return tableSetup;
  }

  const alignmentBounds = getTableSetupBounds(tableSetup);
  const transforms = new Map<string, ProjectObjectRectTransform>();

  for (const frame of frames) {
    let x = frame.rectTransform.x;
    let y = frame.rectTransform.y;

    if (alignment === "left") {
      x = alignmentBounds.left + frame.bounds.width / 2;
    } else if (alignment === "center") {
      x = alignmentBounds.centerX;
    } else if (alignment === "right") {
      x = alignmentBounds.right - frame.bounds.width / 2;
    } else if (alignment === "top") {
      y = alignmentBounds.top + frame.bounds.height / 2;
    } else if (alignment === "middle") {
      y = alignmentBounds.centerY;
    } else if (alignment === "bottom") {
      y = alignmentBounds.bottom - frame.bounds.height / 2;
    }

    transforms.set(frame.id, { ...frame.rectTransform, x, y });
  }

  return getProjectTableSetupWithItemTransforms(tableSetup, transforms);
}

export function getProjectTableSetupWithDistributedItems({
  direction,
  fileTree,
  itemIds,
  tableSetup
}: {
  direction: TableSetupDistribution;
  fileTree: readonly ProjectFileNode[];
  itemIds: readonly string[];
  tableSetup: ProjectTableSetup;
}): ProjectTableSetup {
  const frames = getUnlockedFrames(fileTree, tableSetup, itemIds);

  if (frames.length < 2) {
    return tableSetup;
  }

  const transforms = new Map<string, ProjectObjectRectTransform>();

  if (direction === "horizontal") {
    const sortedFrames = [...frames].sort((left, right) => left.bounds.left - right.bounds.left);
    const tableBounds = getTableSetupBounds(tableSetup);
    const firstLeft = tableBounds.left;
    const lastRight = tableBounds.right;
    const totalWidth = sortedFrames.reduce((total, frame) => total + frame.bounds.width, 0);
    const gap = (lastRight - firstLeft - totalWidth) / (sortedFrames.length - 1);
    let nextLeft = firstLeft;

    for (const frame of sortedFrames) {
      transforms.set(frame.id, {
        ...frame.rectTransform,
        x: nextLeft + frame.bounds.width / 2
      });
      nextLeft += frame.bounds.width + gap;
    }
  } else {
    const sortedFrames = [...frames].sort((top, bottom) => top.bounds.top - bottom.bounds.top);
    const tableBounds = getTableSetupBounds(tableSetup);
    const firstTop = tableBounds.top;
    const lastBottom = tableBounds.bottom;
    const totalHeight = sortedFrames.reduce((total, frame) => total + frame.bounds.height, 0);
    const gap = (lastBottom - firstTop - totalHeight) / (sortedFrames.length - 1);
    let nextTop = firstTop;

    for (const frame of sortedFrames) {
      transforms.set(frame.id, {
        ...frame.rectTransform,
        y: nextTop + frame.bounds.height / 2
      });
      nextTop += frame.bounds.height + gap;
    }
  }

  return getProjectTableSetupWithItemTransforms(tableSetup, transforms);
}

function getUnlockedFrames(
  fileTree: readonly ProjectFileNode[],
  tableSetup: ProjectTableSetup,
  itemIds: readonly string[]
) {
  return getTableSetupItemFrames(fileTree, tableSetup, itemIds).filter((frame) => !frame.locked);
}

function getTableSetupItemBounds(rectTransform: ProjectObjectRectTransform): TableSetupItemBounds {
  const width = rectTransform.width * Math.abs(rectTransform.scaleX);
  const height = rectTransform.height * Math.abs(rectTransform.scaleY);
  const left = rectTransform.x - width / 2;
  const top = rectTransform.y - height / 2;
  const right = rectTransform.x + width / 2;
  const bottom = rectTransform.y + height / 2;

  return {
    bottom,
    centerX: rectTransform.x,
    centerY: rectTransform.y,
    height,
    left,
    right,
    top,
    width
  };
}

function getTableSetupBounds(tableSetup: ProjectTableSetup): TableSetupItemBounds {
  const left = -tableSetup.width / 2;
  const right = tableSetup.width / 2;
  const top = -tableSetup.height / 2;
  const bottom = tableSetup.height / 2;

  return {
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    height: bottom - top,
    left,
    right,
    top,
    width: right - left
  };
}

function getSafeRatio(after: number, before: number) {
  if (!Number.isFinite(after) || !Number.isFinite(before) || before === 0) {
    return 1;
  }

  return after / before;
}

function clampTransformSize(value: number) {
  return Math.min(2000, Math.max(1, Math.round(value)));
}

function clampTransformScale(value: number) {
  return Math.min(100, Math.max(0.01, Number(value.toFixed(3))));
}
