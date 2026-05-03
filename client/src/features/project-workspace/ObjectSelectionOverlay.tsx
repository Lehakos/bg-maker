import { Maximize2, Move, RotateCw } from "lucide-react";
import type { WorkspaceTool } from "./project-workspace-view-state";

type ObjectSelectionOverlayProps = {
  activeTool: WorkspaceTool;
  canvasScale: number;
  topControlsOffset: number;
};

export function ObjectSelectionOverlay({
  activeTool,
  canvasScale,
  topControlsOffset
}: ObjectSelectionOverlayProps) {
  return (
    <>
      <span className="pointer-events-none absolute inset-0 z-40 rounded-lg ring-2 ring-sky-500 ring-offset-2 ring-offset-[#e7ece6]" />
      <div className="pointer-events-none absolute inset-0 z-50">
        <WorkspaceToolHandles
          activeTool={activeTool}
          canvasScale={canvasScale}
          topControlsOffset={topControlsOffset}
        />
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
      <span
        className="pointer-events-auto absolute flex h-8 w-8 items-center justify-center rounded-full border border-sky-500 bg-white text-sky-700 shadow-sm"
        style={{
          bottom: `${-16 / canvasScale}px`,
          right: `${-16 / canvasScale}px`,
          transform: `scale(${inverseCanvasScale})`,
          transformOrigin: "center"
        }}
      >
        <Maximize2 size={15} />
      </span>
    );
  }

  return null;
}
