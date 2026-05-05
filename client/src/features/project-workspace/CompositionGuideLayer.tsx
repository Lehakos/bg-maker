import type {
  ProjectCompositionGuide,
  ProjectCompositionGuideAxis,
  ProjectCompositionSettings
} from "@bg-maker/shared";
import type { PointerEvent } from "react";
import { useRef, useState } from "react";
import { cx } from "./project-workspace-css";
import {
  getProjectCompositionSettingsWithGuideUpdated,
  getGuidePositionFromClientPoint,
  type CompositionSnapIndicator
} from "./composition-guides";

type CompositionGuideLayerProps = {
  canvasScale: number;
  composition: ProjectCompositionSettings;
  height: number;
  highlightedGuideId?: string | null;
  snapIndicators?: readonly CompositionSnapIndicator[];
  width: number;
  onCompositionChange: (composition: ProjectCompositionSettings, label: string) => void;
};

type GuideDragState = {
  axis: ProjectCompositionGuideAxis;
  guideId?: string;
  pointerId: number;
  position: number;
};

export function CompositionGuideLayer({
  canvasScale,
  composition,
  height,
  highlightedGuideId = null,
  snapIndicators = [],
  width,
  onCompositionChange
}: CompositionGuideLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [guideDragState, setGuideDragState] = useState<GuideDragState | null>(null);
  const visibleGuides = composition.guides.filter(
    (guide) => guide.visible || guide.id === highlightedGuideId
  );
  const renderedGuides = guideDragState
    ? visibleGuides.map((guide) =>
        guide.id === guideDragState.guideId
          ? { ...guide, position: guideDragState.position }
          : guide
      )
    : visibleGuides;

  function handleGuidePointerDown(
    event: PointerEvent<HTMLSpanElement>,
    guide: ProjectCompositionGuide
  ) {
    if (guide.locked) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setGuideDragState({
      axis: guide.axis,
      guideId: guide.id,
      pointerId: event.pointerId,
      position: guide.position
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!guideDragState || guideDragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const position = getGuidePositionFromLayer(
      layerRef.current,
      guideDragState.axis,
      event.clientX,
      event.clientY,
      width,
      height,
      guideDragState.position
    );

    setGuideDragState({ ...guideDragState, position });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!guideDragState || guideDragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const position = Math.round(guideDragState.position);
    const nextComposition = guideDragState.guideId
      ? getProjectCompositionSettingsWithGuideUpdated(composition, guideDragState.guideId, {
          position
        })
      : composition;

    setGuideDragState(null);
    onCompositionChange(nextComposition, "Move guide");
  }

  return (
    <div
      ref={layerRef}
      className="pointer-events-none absolute inset-0 z-[70] overflow-visible"
      data-export-exclude="true"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setGuideDragState(null)}
    >
      {renderedGuides.map((guide) => (
        <GuideLine
          key={guide.id}
          canvasScale={canvasScale}
          guide={guide}
          height={height}
          highlighted={guide.id === highlightedGuideId}
          width={width}
          onPointerDown={handleGuidePointerDown}
        />
      ))}
      {snapIndicators.map((indicator, index) => (
        <span
          key={`${indicator.axis}:${indicator.position}:${index}`}
          className={cx(
            "pointer-events-none absolute bg-fuchsia-500/80 shadow-[0_0_0_1px_rgba(255,255,255,0.75)]",
            indicator.axis === "x" ? "top-0 h-full w-px" : "left-0 h-px w-full"
          )}
          style={
            indicator.axis === "x"
              ? { left: width / 2 + indicator.position }
              : { top: height / 2 + indicator.position }
          }
        />
      ))}
    </div>
  );
}

type GuideLineProps = {
  canvasScale: number;
  guide: ProjectCompositionGuide;
  height: number;
  highlighted: boolean;
  width: number;
  onPointerDown: (event: PointerEvent<HTMLSpanElement>, guide: ProjectCompositionGuide) => void;
};

function GuideLine({
  canvasScale,
  guide,
  height,
  highlighted,
  width,
  onPointerDown
}: GuideLineProps) {
  const vertical = guide.axis === "vertical";
  const lineSize = (highlighted ? 2 : 1) / canvasScale;

  return (
    <span
      aria-label={`${vertical ? "Vertical" : "Horizontal"} guide ${guide.position}`}
      className={cx(
        "absolute shadow-[0_0_0_1px_rgba(15,23,42,0.18)]",
        guide.visible ? "pointer-events-auto" : "pointer-events-none",
        highlighted ? "bg-rose-500/90" : "bg-cyan-400/80",
        vertical ? "top-0 h-full cursor-ew-resize" : "left-0 w-full cursor-ns-resize",
        !guide.visible && "opacity-75",
        guide.locked && "cursor-not-allowed opacity-60"
      )}
      style={
        vertical
          ? {
              height,
              left: width / 2 + guide.position,
              width: lineSize
            }
          : {
              height: lineSize,
              top: height / 2 + guide.position,
              width
            }
      }
      title={`${vertical ? "Vertical" : "Horizontal"} guide ${guide.position}`}
      onPointerDown={(event) => onPointerDown(event, guide)}
    />
  );
}

function getGuidePositionFromLayer(
  layer: HTMLDivElement | null,
  axis: ProjectCompositionGuideAxis,
  clientX: number,
  clientY: number,
  width: number,
  height: number,
  fallback: number
) {
  return layer
    ? getGuidePositionFromClientPoint(
        layer.getBoundingClientRect(),
        axis,
        clientX,
        clientY,
        width,
        height
      )
    : fallback;
}
