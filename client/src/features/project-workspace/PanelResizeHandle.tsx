import { clsx as cx } from "clsx";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useState } from "react";
import {
  getNormalizedPanelSizeBounds,
  getResizablePanelSizeFromPointerDelta,
  type ResizablePanelAxis,
  type ResizablePanelEdge,
  type ResizablePanelSizeBounds
} from "./resizable-panel-state";

type PanelDragState = {
  panelSize: number;
  pointerCoordinate: number;
};

type PanelResizeHandleProps = ResizablePanelSizeBounds & {
  axis: ResizablePanelAxis;
  className?: string;
  edge: ResizablePanelEdge;
  label: string;
  size: number;
  onSizeChange: (size: number) => void;
};

const panelResizeKeyboardStep = 16;
const panelResizeLargeKeyboardStep = 64;

export function PanelResizeHandle({
  axis,
  className,
  edge,
  label,
  maxSize,
  minSize,
  size,
  onSizeChange
}: PanelResizeHandleProps) {
  const [dragState, setDragState] = useState<PanelDragState | null>(null);
  const cursor = axis === "horizontal" ? "col-resize" : "row-resize";

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const activeDragState = dragState;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = cursor;
    document.body.style.userSelect = "none";

    function handlePointerMove(event: globalThis.PointerEvent) {
      onSizeChange(
        getResizablePanelSizeFromPointerDelta({
          edge,
          maxSize,
          minSize,
          pointerDelta: getPointerCoordinate(event, axis) - activeDragState.pointerCoordinate,
          startSize: activeDragState.panelSize
        })
      );
    }

    function handlePointerUp() {
      setDragState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [axis, cursor, dragState, edge, maxSize, minSize, onSizeChange]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      panelSize: size,
      pointerCoordinate: getPointerCoordinate(event, axis)
    });
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Home") {
      event.preventDefault();
      onSizeChange(minSize);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      onSizeChange(maxSize);
      return;
    }

    const keyboardPointerDelta = getKeyboardPointerDelta(
      event.key,
      axis,
      event.shiftKey ? panelResizeLargeKeyboardStep : panelResizeKeyboardStep
    );

    if (keyboardPointerDelta === null) {
      return;
    }

    event.preventDefault();
    onSizeChange(
      getResizablePanelSizeFromPointerDelta({
        edge,
        maxSize,
        minSize,
        pointerDelta: keyboardPointerDelta,
        startSize: size
      })
    );
  }

  return (
    <div
      aria-label={label}
      aria-orientation={axis === "horizontal" ? "vertical" : "horizontal"}
      aria-valuemax={Math.round(getNormalizedPanelSizeBounds({ maxSize, minSize }).maxSize)}
      aria-valuemin={Math.round(getNormalizedPanelSizeBounds({ maxSize, minSize }).minSize)}
      aria-valuenow={Math.round(size)}
      aria-valuetext={`${Math.round(size)} px`}
      className={cx(
        "group absolute z-30 touch-none outline-none",
        getResizeHandlePositionClassName(edge),
        className
      )}
      role="separator"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
    >
      <span
        className={cx(
          "absolute rounded-full bg-sky-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
          dragState && "opacity-100",
          axis === "horizontal"
            ? "bottom-2 top-2 left-1/2 w-px -translate-x-1/2"
            : "left-2 right-2 top-1/2 h-px -translate-y-1/2"
        )}
      />
    </div>
  );
}

function getPointerCoordinate(
  event: Pick<PointerEvent, "clientX" | "clientY">,
  axis: ResizablePanelAxis
) {
  return axis === "horizontal" ? event.clientX : event.clientY;
}

function getKeyboardPointerDelta(key: string, axis: ResizablePanelAxis, step: number) {
  if (axis === "horizontal") {
    if (key === "ArrowLeft") {
      return -step;
    }

    if (key === "ArrowRight") {
      return step;
    }

    return null;
  }

  if (key === "ArrowUp") {
    return -step;
  }

  if (key === "ArrowDown") {
    return step;
  }

  return null;
}

function getResizeHandlePositionClassName(edge: ResizablePanelEdge) {
  if (edge === "left") {
    return "left-0 top-0 h-full w-3 -translate-x-1/2 cursor-col-resize";
  }

  if (edge === "right") {
    return "right-0 top-0 h-full w-3 translate-x-1/2 cursor-col-resize";
  }

  if (edge === "top") {
    return "left-0 top-0 h-3 w-full -translate-y-1/2 cursor-row-resize";
  }

  return "bottom-0 left-0 h-3 w-full translate-y-1/2 cursor-row-resize";
}
