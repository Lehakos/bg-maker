import type { ProjectObjectRectTransform } from "@bg-maker/shared";
import type { WorkspaceTool } from "./project-workspace-view-state";
import type {
  CompositionPositionMode,
  CompositionSnapIndicator,
  CompositionSnapTarget
} from "./composition-guides";
import { getCompositionBounds } from "./composition-guides";

export type ResizeHandle = "e" | "n" | "ne" | "nw" | "s" | "se" | "sw" | "w";

export type TransformSnapOptions = {
  targets: CompositionSnapTarget[];
  threshold: number;
};

export type TransformDragState = {
  before: ProjectObjectRectTransform;
  current: ProjectObjectRectTransform;
  pointerId: number;
  rotateOffset?: number;
  rotatePivotClientX?: number;
  rotatePivotClientY?: number;
  rotatePointerAngle?: number;
  resizeHandle?: ResizeHandle;
  snapIndicators?: CompositionSnapIndicator[];
  startClientX: number;
  startClientY: number;
};

export type TransformDragOptions = {
  positionMode?: CompositionPositionMode;
  preserveAspectRatio?: boolean;
  resizeHandle?: ResizeHandle;
  resizeMode?: "scale" | "size";
  snap?: TransformSnapOptions;
  snapSize?: number | null;
};

export function getRotateDragState(element: HTMLElement, clientX: number, clientY: number) {
  const pivot = getElementCenterClientPoint(element);
  const pointerAngle = getPointerAngleDegrees(clientX, clientY, pivot.x, pivot.y);

  return {
    rotateOffset: 0,
    rotatePivotClientX: pivot.x,
    rotatePivotClientY: pivot.y,
    rotatePointerAngle: pointerAngle
  };
}

export function getNextTransformDragState(
  currentState: TransformDragState,
  activeTool: WorkspaceTool,
  canvasScale: number,
  clientX: number,
  clientY: number,
  options: TransformDragOptions = {}
): TransformDragState {
  const deltaX = (clientX - currentState.startClientX) / canvasScale;
  const deltaY = (clientY - currentState.startClientY) / canvasScale;
  const rotateDragUpdate = getRotateDragUpdate(currentState, activeTool, clientX, clientY);

  const dragResult = getDraggedProjectObjectRectTransformWithSnap(
    activeTool,
    currentState.before,
    deltaX,
    deltaY,
    rotateDragUpdate.rotateOffset ?? currentState.rotateOffset ?? 0,
    {
      ...options,
      resizeHandle: currentState.resizeHandle ?? options.resizeHandle
    }
  );

  return {
    ...currentState,
    ...rotateDragUpdate,
    current: roundProjectObjectRectTransform(dragResult.rectTransform),
    snapIndicators: dragResult.snapIndicators
  };
}

export function areProjectObjectRectTransformsEqual(
  left: ProjectObjectRectTransform,
  right: ProjectObjectRectTransform
) {
  return (
    left.height === right.height &&
    left.pivotX === right.pivotX &&
    left.pivotY === right.pivotY &&
    left.rotation === right.rotation &&
    left.scaleX === right.scaleX &&
    left.scaleY === right.scaleY &&
    left.width === right.width &&
    left.x === right.x &&
    left.y === right.y
  );
}

export function getRectTransformCommandLabel(activeTool: WorkspaceTool) {
  if (activeTool === "move") {
    return "Move object";
  }

  if (activeTool === "rotate") {
    return "Rotate object";
  }

  if (activeTool === "resize") {
    return "Resize object";
  }

  return "Update object frame";
}

export function getDraggedProjectObjectRectTransform(
  activeTool: WorkspaceTool,
  before: ProjectObjectRectTransform,
  deltaX: number,
  deltaY: number,
  rotateOffset = 0,
  options: TransformDragOptions = {}
): ProjectObjectRectTransform {
  return getDraggedProjectObjectRectTransformWithSnap(
    activeTool,
    before,
    deltaX,
    deltaY,
    rotateOffset,
    options
  ).rectTransform;
}

export function getDraggedProjectObjectRectTransformWithSnap(
  activeTool: WorkspaceTool,
  before: ProjectObjectRectTransform,
  deltaX: number,
  deltaY: number,
  rotateOffset = 0,
  options: TransformDragOptions = {}
): {
  rectTransform: ProjectObjectRectTransform;
  snapIndicators: CompositionSnapIndicator[];
} {
  if (activeTool === "move") {
    const moved = {
      ...before,
      x: snapValue(before.x + deltaX, options.snapSize),
      y: snapValue(before.y + deltaY, options.snapSize)
    };

    return snapMovedRectTransform(moved, options);
  }

  if (activeTool === "rotate") {
    return {
      rectTransform: {
        ...before,
        rotation: before.rotation + rotateOffset
      },
      snapIndicators: []
    };
  }

  if (activeTool === "resize") {
    return getResizedProjectObjectRectTransform(before, deltaX, deltaY, options);
  }

  return {
    rectTransform: before,
    snapIndicators: []
  };
}

export function roundProjectObjectRectTransform(
  rectTransform: ProjectObjectRectTransform
): ProjectObjectRectTransform {
  return {
    height: Math.round(rectTransform.height),
    pivotX: roundTo(rectTransform.pivotX, 3),
    pivotY: roundTo(rectTransform.pivotY, 3),
    rotation: Math.round(rectTransform.rotation),
    scaleX: roundTo(rectTransform.scaleX, 3),
    scaleY: roundTo(rectTransform.scaleY, 3),
    width: Math.round(rectTransform.width),
    x: Math.round(rectTransform.x),
    y: Math.round(rectTransform.y)
  };
}

function getResizedProjectObjectRectTransform(
  before: ProjectObjectRectTransform,
  deltaX: number,
  deltaY: number,
  options: TransformDragOptions
): {
  rectTransform: ProjectObjectRectTransform;
  snapIndicators: CompositionSnapIndicator[];
} {
  const resizeHandle = options.resizeHandle ?? "se";
  const positionMode = options.positionMode ?? "center";
  const beforeBounds = getCompositionBounds(before, positionMode);
  let nextBounds = getBoundsWithResizeDelta(beforeBounds, resizeHandle, deltaX, deltaY);

  nextBounds = normalizeResizeBounds(nextBounds, resizeHandle, {
    maxHeight: options.resizeMode === "scale" ? before.height * 100 : 2000,
    maxWidth: options.resizeMode === "scale" ? before.width * 100 : 2000,
    minHeight: options.resizeMode === "scale" ? before.height * 0.01 : 1,
    minWidth: options.resizeMode === "scale" ? before.width * 0.01 : 1
  });

  if (options.preserveAspectRatio) {
    nextBounds = getAspectLockedResizeBounds(beforeBounds, nextBounds, resizeHandle);
    nextBounds = normalizeResizeBounds(nextBounds, resizeHandle, {
      maxHeight: options.resizeMode === "scale" ? before.height * 100 : 2000,
      maxWidth: options.resizeMode === "scale" ? before.width * 100 : 2000,
      minHeight: options.resizeMode === "scale" ? before.height * 0.01 : 1,
      minWidth: options.resizeMode === "scale" ? before.width * 0.01 : 1
    });
  }

  const snapped = snapResizedBounds(nextBounds, resizeHandle, options);
  const rectTransform = getRectTransformFromBounds(
    before,
    snapped.bounds,
    positionMode,
    options.resizeMode ?? "size"
  );

  return {
    rectTransform,
    snapIndicators: snapped.snapIndicators
  };
}

function getBoundsWithResizeDelta(
  bounds: ReturnType<typeof getCompositionBounds>,
  resizeHandle: ResizeHandle,
  deltaX: number,
  deltaY: number
) {
  return {
    ...bounds,
    bottom: resizeHandle.includes("s") ? bounds.bottom + deltaY : bounds.bottom,
    left: resizeHandle.includes("w") ? bounds.left + deltaX : bounds.left,
    right: resizeHandle.includes("e") ? bounds.right + deltaX : bounds.right,
    top: resizeHandle.includes("n") ? bounds.top + deltaY : bounds.top
  };
}

function normalizeResizeBounds(
  bounds: ReturnType<typeof getCompositionBounds>,
  resizeHandle: ResizeHandle,
  limits: { maxHeight: number; maxWidth: number; minHeight: number; minWidth: number }
) {
  let { bottom, left, right, top } = bounds;
  const width = clamp(right - left, limits.minWidth, limits.maxWidth);
  const height = clamp(bottom - top, limits.minHeight, limits.maxHeight);

  if (resizeHandle.includes("w")) {
    left = right - width;
  } else {
    right = left + width;
  }

  if (resizeHandle.includes("n")) {
    top = bottom - height;
  } else {
    bottom = top + height;
  }

  return getBoundsFromEdges(left, top, right, bottom);
}

function getAspectLockedResizeBounds(
  beforeBounds: ReturnType<typeof getCompositionBounds>,
  nextBounds: ReturnType<typeof getCompositionBounds>,
  resizeHandle: ResizeHandle
) {
  const beforeWidth = beforeBounds.right - beforeBounds.left;
  const beforeHeight = beforeBounds.bottom - beforeBounds.top;
  const ratio = beforeWidth / Math.max(1, beforeHeight);
  let width = nextBounds.right - nextBounds.left;
  let height = nextBounds.bottom - nextBounds.top;
  const widthChange = Math.abs(width - beforeWidth);
  const heightChange = Math.abs(height - beforeHeight);

  if (resizeHandle === "e" || resizeHandle === "w") {
    height = width / ratio;
  } else if (resizeHandle === "n" || resizeHandle === "s") {
    width = height * ratio;
  } else if (widthChange >= heightChange) {
    height = width / ratio;
  } else {
    width = height * ratio;
  }

  return getBoundsWithAnchoredSize(beforeBounds, resizeHandle, width, height);
}

function getBoundsWithAnchoredSize(
  beforeBounds: ReturnType<typeof getCompositionBounds>,
  resizeHandle: ResizeHandle,
  width: number,
  height: number
) {
  let left = beforeBounds.left;
  let right = beforeBounds.right;
  let top = beforeBounds.top;
  let bottom = beforeBounds.bottom;
  const centerX = (beforeBounds.left + beforeBounds.right) / 2;
  const centerY = (beforeBounds.top + beforeBounds.bottom) / 2;

  if (resizeHandle.includes("w")) {
    left = right - width;
  } else if (resizeHandle.includes("e")) {
    right = left + width;
  } else {
    left = centerX - width / 2;
    right = centerX + width / 2;
  }

  if (resizeHandle.includes("n")) {
    top = bottom - height;
  } else if (resizeHandle.includes("s")) {
    bottom = top + height;
  } else {
    top = centerY - height / 2;
    bottom = centerY + height / 2;
  }

  return getBoundsFromEdges(left, top, right, bottom);
}

function snapMovedRectTransform(
  rectTransform: ProjectObjectRectTransform,
  options: TransformDragOptions
) {
  const positionMode = options.positionMode ?? "center";
  const bounds = getCompositionBounds(rectTransform, positionMode);
  const snappedX = getSnapOffset(
    [{ position: bounds.left }, { position: bounds.centerX }, { position: bounds.right }],
    "x",
    options.snap
  );
  const snappedY = getSnapOffset(
    [{ position: bounds.top }, { position: bounds.centerY }, { position: bounds.bottom }],
    "y",
    options.snap
  );
  const snapIndicators: CompositionSnapIndicator[] = [];

  if (snappedX) {
    snapIndicators.push({ axis: "x", position: snappedX.targetPosition });
  }

  if (snappedY) {
    snapIndicators.push({ axis: "y", position: snappedY.targetPosition });
  }

  return {
    rectTransform: {
      ...rectTransform,
      x: rectTransform.x + (snappedX?.offset ?? 0),
      y: rectTransform.y + (snappedY?.offset ?? 0)
    },
    snapIndicators
  };
}

function snapResizedBounds(
  bounds: ReturnType<typeof getCompositionBounds>,
  resizeHandle: ResizeHandle,
  options: TransformDragOptions
) {
  let nextBounds = bounds;
  const snapIndicators: CompositionSnapIndicator[] = [];

  if (resizeHandle.includes("e") || resizeHandle.includes("w")) {
    const edge = resizeHandle.includes("w") ? bounds.left : bounds.right;
    const snapped = getSnapOffset([{ position: edge }], "x", options.snap);

    if (snapped) {
      nextBounds = resizeHandle.includes("w")
        ? getBoundsFromEdges(bounds.left + snapped.offset, bounds.top, bounds.right, bounds.bottom)
        : getBoundsFromEdges(bounds.left, bounds.top, bounds.right + snapped.offset, bounds.bottom);
      snapIndicators.push({ axis: "x", position: snapped.targetPosition });
    }
  }

  if (resizeHandle.includes("n") || resizeHandle.includes("s")) {
    const edge = resizeHandle.includes("n") ? nextBounds.top : nextBounds.bottom;
    const snapped = getSnapOffset([{ position: edge }], "y", options.snap);

    if (snapped) {
      nextBounds = resizeHandle.includes("n")
        ? getBoundsFromEdges(
            nextBounds.left,
            nextBounds.top + snapped.offset,
            nextBounds.right,
            nextBounds.bottom
          )
        : getBoundsFromEdges(
            nextBounds.left,
            nextBounds.top,
            nextBounds.right,
            nextBounds.bottom + snapped.offset
          );
      snapIndicators.push({ axis: "y", position: snapped.targetPosition });
    }
  }

  return { bounds: nextBounds, snapIndicators };
}

function getSnapOffset(
  values: readonly { position: number }[],
  axis: "x" | "y",
  snap: TransformSnapOptions | undefined
) {
  if (!snap || !snap.targets.length || snap.threshold <= 0) {
    return null;
  }

  let bestSnap: { distance: number; offset: number; targetPosition: number } | null = null;

  for (const value of values) {
    for (const target of snap.targets) {
      if (target.axis !== axis) {
        continue;
      }

      const offset = target.position - value.position;
      const distance = Math.abs(offset);

      if (distance > snap.threshold || (bestSnap && distance >= bestSnap.distance)) {
        continue;
      }

      bestSnap = {
        distance,
        offset,
        targetPosition: target.position
      };
    }
  }

  return bestSnap;
}

function getRectTransformFromBounds(
  before: ProjectObjectRectTransform,
  bounds: ReturnType<typeof getCompositionBounds>,
  positionMode: CompositionPositionMode,
  resizeMode: "scale" | "size"
): ProjectObjectRectTransform {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const position =
    positionMode === "center"
      ? {
          x: bounds.left + width / 2,
          y: bounds.top + height / 2
        }
      : {
          x: bounds.left,
          y: bounds.top
        };

  if (resizeMode === "scale") {
    return {
      ...before,
      ...position,
      scaleX: clamp(width / Math.max(1, before.width), 0.01, 100),
      scaleY: clamp(height / Math.max(1, before.height), 0.01, 100)
    };
  }

  return {
    ...before,
    ...position,
    height: clamp(height, 1, 2000),
    width: clamp(width, 1, 2000)
  };
}

function getBoundsFromEdges(left: number, top: number, right: number, bottom: number) {
  return {
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    left,
    right,
    top
  };
}

function getRotateDragUpdate(
  currentState: TransformDragState,
  activeTool: WorkspaceTool,
  clientX: number,
  clientY: number
): Pick<TransformDragState, "rotateOffset" | "rotatePointerAngle"> {
  if (
    activeTool !== "rotate" ||
    currentState.rotatePivotClientX === undefined ||
    currentState.rotatePivotClientY === undefined ||
    currentState.rotatePointerAngle === undefined
  ) {
    return {};
  }

  const pointerAngle = getPointerAngleDegrees(
    clientX,
    clientY,
    currentState.rotatePivotClientX,
    currentState.rotatePivotClientY
  );
  const angleDelta = getShortestAngleDelta(pointerAngle, currentState.rotatePointerAngle);

  return {
    rotateOffset: (currentState.rotateOffset ?? 0) + angleDelta,
    rotatePointerAngle: pointerAngle
  };
}

function getElementCenterClientPoint(element: HTMLElement) {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function getPointerAngleDegrees(
  clientX: number,
  clientY: number,
  pivotClientX: number,
  pivotClientY: number
) {
  return (Math.atan2(clientY - pivotClientY, clientX - pivotClientX) * 180) / Math.PI;
}

function getShortestAngleDelta(currentAngle: number, previousAngle: number) {
  let delta = currentAngle - previousAngle;

  while (delta > 180) {
    delta -= 360;
  }

  while (delta < -180) {
    delta += 360;
  }

  return delta;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snapValue(value: number, snapSize: number | null | undefined) {
  if (!snapSize || snapSize <= 0) {
    return value;
  }

  return Math.round(value / snapSize) * snapSize;
}

function roundTo(value: number, decimals: number) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}
