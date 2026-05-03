import type { ProjectObjectRectTransform } from "@bg-maker/shared";
import type { WorkspaceTool } from "./project-workspace-view-state";

export type TransformDragState = {
  before: ProjectObjectRectTransform;
  current: ProjectObjectRectTransform;
  pointerId: number;
  rotateOffset?: number;
  rotatePivotClientX?: number;
  rotatePivotClientY?: number;
  rotatePointerAngle?: number;
  startClientX: number;
  startClientY: number;
};

export type TransformDragOptions = {
  resizeMode?: "scale" | "size";
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

  return {
    ...currentState,
    ...rotateDragUpdate,
    current: roundProjectObjectRectTransform(
      getDraggedProjectObjectRectTransform(
        activeTool,
        currentState.before,
        deltaX,
        deltaY,
        rotateDragUpdate.rotateOffset ?? currentState.rotateOffset ?? 0,
        options
      )
    )
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
  if (activeTool === "move") {
    return {
      ...before,
      x: snapValue(before.x + deltaX, options.snapSize),
      y: snapValue(before.y + deltaY, options.snapSize)
    };
  }

  if (activeTool === "rotate") {
    return {
      ...before,
      rotation: before.rotation + rotateOffset
    };
  }

  if (activeTool === "resize") {
    if (options.resizeMode === "scale") {
      return {
        ...before,
        scaleX: clamp(before.scaleX + deltaX / Math.max(1, before.width), 0.01, 100),
        scaleY: clamp(before.scaleY + deltaY / Math.max(1, before.height), 0.01, 100)
      };
    }

    return {
      ...before,
      height: clamp(before.height + deltaY, 1, 2000),
      width: clamp(before.width + deltaX, 1, 2000)
    };
  }

  return before;
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
