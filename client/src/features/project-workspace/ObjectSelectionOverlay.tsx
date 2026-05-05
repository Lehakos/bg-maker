import { Move, RotateCw } from "lucide-react";
import type { WorkspaceTool } from "./project-workspace-view-state";
import type { ResizeHandle } from "./transform-drag-helpers";

type ObjectSelectionOverlayProps = {
  activeTool: WorkspaceTool;
  canvasScale: number;
  muted?: boolean;
  topControlsOffset: number;
};

export function ObjectSelectionOverlay({
  activeTool,
  canvasScale,
  muted = false,
  topControlsOffset
}: ObjectSelectionOverlayProps) {
  return (
    <>
      <span
        data-export-exclude="true"
        className={
          muted
            ? "pointer-events-none absolute inset-0 z-40 rounded-lg ring-2 ring-sky-400/70 ring-offset-2 ring-offset-[#e7ece6]"
            : "pointer-events-none absolute inset-0 z-40 rounded-lg ring-2 ring-sky-500 ring-offset-2 ring-offset-[#e7ece6]"
        }
      />
      <div className="pointer-events-none absolute inset-0 z-50" data-export-exclude="true">
        {muted ? null : (
          <WorkspaceToolHandles
            activeTool={activeTool}
            canvasScale={canvasScale}
            topControlsOffset={topControlsOffset}
          />
        )}
      </div>
    </>
  );
}

type WorkspaceToolHandlesProps = {
  activeTool: WorkspaceTool;
  canvasScale: number;
  topControlsOffset: number;
};

function WorkspaceToolHandles({
  activeTool,
  canvasScale,
  topControlsOffset
}: WorkspaceToolHandlesProps) {
  const inverseCanvasScale = 1 / canvasScale;

  if (activeTool === "rotate") {
    const handleTop = -62 - topControlsOffset;
    const lineTop = -46 - topControlsOffset;
    const lineHeight = 40 + topControlsOffset;

    return (
      <>
        <span
          className="absolute left-1/2 bg-sky-500"
          style={{
            height: `${lineHeight / canvasScale}px`,
            top: `${lineTop / canvasScale}px`,
            transform: "translateX(-50%)",
            width: `${1 / canvasScale}px`
          }}
        />
        <span
          className="pointer-events-auto absolute left-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-sky-500 bg-white text-sky-700 shadow-sm"
          data-transform-handle="rotate"
          style={{
            top: `${handleTop / canvasScale}px`,
            transform: `translateX(-50%) scale(${inverseCanvasScale})`,
            transformOrigin: "center"
          }}
        >
          <RotateCw size={16} />
        </span>
      </>
    );
  }

  if (activeTool === "move") {
    return (
      <span
        className="pointer-events-auto absolute left-1/2 top-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-sky-500 bg-white/95 text-sky-700 shadow-sm"
        style={{
          transform: `translate(-50%, -50%) scale(${inverseCanvasScale})`,
          transformOrigin: "center"
        }}
      >
        <Move size={18} />
      </span>
    );
  }

  if (activeTool === "resize") {
    return (
      <>
        {resizeHandles.map((handle) => (
          <ResizeHandleControl
            key={handle}
            canvasScale={canvasScale}
            handle={handle}
            inverseCanvasScale={inverseCanvasScale}
          />
        ))}
      </>
    );
  }

  return null;
}

const resizeHandles = [
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
  "nw"
] as const satisfies readonly ResizeHandle[];

type ResizeHandleControlProps = {
  canvasScale: number;
  handle: ResizeHandle;
  inverseCanvasScale: number;
};

function ResizeHandleControl({
  canvasScale,
  handle,
  inverseCanvasScale
}: ResizeHandleControlProps) {
  const position = getResizeHandlePosition(handle, canvasScale);

  return (
    <span
      aria-label={`Resize ${handle}`}
      className="pointer-events-auto absolute block h-3.5 w-3.5 rounded-[3px] border border-sky-500 bg-white shadow-sm"
      data-transform-handle={handle}
      role="button"
      style={{
        ...position,
        cursor: getResizeHandleCursor(handle),
        transform: `${position.transform ?? ""} scale(${inverseCanvasScale})`,
        transformOrigin: "center"
      }}
      title={`Resize ${handle}`}
    />
  );
}

function getResizeHandlePosition(handle: ResizeHandle, canvasScale: number) {
  const offset = -7 / canvasScale;

  if (handle === "n") {
    return { left: "50%", top: `${offset}px`, transform: "translateX(-50%)" };
  }

  if (handle === "s") {
    return { bottom: `${offset}px`, left: "50%", transform: "translateX(-50%)" };
  }

  if (handle === "e") {
    return { right: `${offset}px`, top: "50%", transform: "translateY(-50%)" };
  }

  if (handle === "w") {
    return { left: `${offset}px`, top: "50%", transform: "translateY(-50%)" };
  }

  return {
    bottom: handle.includes("s") ? `${offset}px` : undefined,
    left: handle.includes("w") ? `${offset}px` : undefined,
    right: handle.includes("e") ? `${offset}px` : undefined,
    top: handle.includes("n") ? `${offset}px` : undefined
  };
}

function getResizeHandleCursor(handle: ResizeHandle) {
  if (handle === "n" || handle === "s") {
    return "ns-resize";
  }

  if (handle === "e" || handle === "w") {
    return "ew-resize";
  }

  if (handle === "ne" || handle === "sw") {
    return "nesw-resize";
  }

  return "nwse-resize";
}
