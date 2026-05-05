import type { ProjectCompositionGuideAxis, ProjectCompositionSettings } from "@bg-maker/shared";
import type { PointerEvent, RefObject } from "react";
import { useLayoutEffect, useMemo, useState } from "react";
import {
  getGuidePositionFromClientPoint,
  getProjectCompositionSettingsWithGuideAdded
} from "./composition-guides";
import { cx } from "./project-workspace-css";

export type CompositionSurfaceTarget = {
  element: HTMLElement;
  height: number;
  width: number;
};

type CompositionRulerOverlayProps = {
  canvasScale: number;
  composition: ProjectCompositionSettings;
  disabled?: boolean;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  surface: CompositionSurfaceTarget | null;
  onCompositionChange: (composition: ProjectCompositionSettings, label: string) => void;
};

type RulerLayout = {
  height: number;
  scaleX: number;
  scaleY: number;
  surfaceHeight: number;
  surfaceLeft: number;
  surfaceTop: number;
  surfaceWidth: number;
  viewportHeight: number;
  viewportLeft: number;
  viewportTop: number;
  viewportWidth: number;
  width: number;
};

type RulerDragState = {
  axis: ProjectCompositionGuideAxis;
  pointerId: number;
  position: number;
};

const rulerSize = 20;
const rulerStep = 50;

export function CompositionRulerOverlay({
  canvasScale,
  composition,
  disabled = false,
  scrollContainerRef,
  surface,
  onCompositionChange
}: CompositionRulerOverlayProps) {
  const [layout, setLayout] = useState<RulerLayout | null>(null);
  const [dragState, setDragState] = useState<RulerDragState | null>(null);
  const horizontalTicks = useMemo(
    () => (layout ? getRulerTicks(layout, "horizontal") : []),
    [layout]
  );
  const verticalTicks = useMemo(() => (layout ? getRulerTicks(layout, "vertical") : []), [layout]);

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer || !surface) {
      setLayout(null);
      return;
    }

    const activeScrollContainer = scrollContainer;
    const activeSurface = surface;
    let animationFrame = 0;

    function updateLayout() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        setLayout(getRulerLayout(activeScrollContainer, activeSurface));
      });
    }

    updateLayout();

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(activeScrollContainer);
    resizeObserver.observe(activeSurface.element);
    activeScrollContainer.addEventListener("scroll", updateLayout, { passive: true });
    window.addEventListener("resize", updateLayout);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      activeScrollContainer.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
    };
  }, [canvasScale, scrollContainerRef, surface]);

  function handleRulerPointerDown(
    event: PointerEvent<HTMLDivElement>,
    axis: ProjectCompositionGuideAxis
  ) {
    if (disabled || !layout) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      axis,
      pointerId: event.pointerId,
      position: getGuidePositionFromLayout(layout, axis, event.clientX, event.clientY)
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!layout || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setDragState({
      ...dragState,
      position: getGuidePositionFromLayout(layout, dragState.axis, event.clientX, event.clientY)
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setDragState(null);
    onCompositionChange(
      getProjectCompositionSettingsWithGuideAdded(composition, dragState.axis, dragState.position),
      "Add guide"
    );
  }

  if (!layout) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[90] overflow-hidden"
      data-export-exclude="true"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDragState(null)}
    >
      <div
        aria-label="Horizontal ruler"
        className={cx(
          "pointer-events-auto absolute inset-x-0 top-0 h-5 cursor-crosshair border-b border-slate-500/25 bg-white/90 shadow-sm backdrop-blur-sm",
          disabled && "cursor-default"
        )}
        onPointerDown={(event) => handleRulerPointerDown(event, "vertical")}
      >
        <RulerTicks axis="horizontal" ticks={horizontalTicks} />
      </div>
      <div
        aria-label="Vertical ruler"
        className={cx(
          "pointer-events-auto absolute bottom-0 left-0 top-0 w-5 cursor-crosshair border-r border-slate-500/25 bg-white/90 shadow-sm backdrop-blur-sm",
          disabled && "cursor-default"
        )}
        onPointerDown={(event) => handleRulerPointerDown(event, "horizontal")}
      >
        <RulerTicks axis="vertical" ticks={verticalTicks} />
      </div>
      <div className="pointer-events-none absolute left-0 top-0 h-5 w-5 border-b border-r border-slate-500/25 bg-white/95 shadow-sm" />
      {dragState ? <DraftGuideLine dragState={dragState} layout={layout} /> : null}
    </div>
  );
}

function RulerTicks({ axis, ticks }: { axis: "horizontal" | "vertical"; ticks: RulerTick[] }) {
  return (
    <>
      {ticks.map((tick) => (
        <span
          key={`${tick.coordinate}:${tick.position}`}
          aria-hidden
          className="absolute bg-slate-500/50"
          style={
            axis === "horizontal"
              ? {
                  height: tick.major ? 8 : 5,
                  left: tick.position,
                  top: 0,
                  width: 1
                }
              : {
                  height: 1,
                  left: 0,
                  top: tick.position,
                  width: tick.major ? 8 : 5
                }
          }
          title={String(tick.coordinate)}
        />
      ))}
    </>
  );
}

function DraftGuideLine({ dragState, layout }: { dragState: RulerDragState; layout: RulerLayout }) {
  const vertical = dragState.axis === "vertical";
  const position = getGuideScreenPosition(layout, dragState.axis, dragState.position);

  return (
    <span
      className={cx(
        "pointer-events-none absolute bg-cyan-400/80 shadow-[0_0_0_1px_rgba(15,23,42,0.18)]",
        vertical ? "top-0 h-full w-px" : "left-0 h-px w-full"
      )}
      style={vertical ? { left: position } : { top: position }}
    />
  );
}

type RulerTick = {
  coordinate: number;
  major: boolean;
  position: number;
};

function getRulerLayout(
  scrollContainer: HTMLDivElement,
  surface: CompositionSurfaceTarget
): RulerLayout {
  const viewportRect = scrollContainer.getBoundingClientRect();
  const surfaceRect = surface.element.getBoundingClientRect();
  const scaleX = Math.max(0.001, surfaceRect.width / Math.max(1, surface.width));
  const scaleY = Math.max(0.001, surfaceRect.height / Math.max(1, surface.height));

  return {
    height: surface.height,
    scaleX,
    scaleY,
    surfaceHeight: surfaceRect.height,
    surfaceLeft: surfaceRect.left - viewportRect.left,
    surfaceTop: surfaceRect.top - viewportRect.top,
    surfaceWidth: surfaceRect.width,
    viewportHeight: scrollContainer.clientHeight,
    viewportLeft: viewportRect.left,
    viewportTop: viewportRect.top,
    viewportWidth: scrollContainer.clientWidth,
    width: surface.width
  };
}

function getRulerTicks(layout: RulerLayout, axis: "horizontal" | "vertical"): RulerTick[] {
  const surfaceStart = axis === "horizontal" ? layout.surfaceLeft : layout.surfaceTop;
  const scale = axis === "horizontal" ? layout.scaleX : layout.scaleY;
  const length = axis === "horizontal" ? layout.width : layout.height;
  const viewportLength = axis === "horizontal" ? layout.viewportWidth : layout.viewportHeight;
  const firstOffset = Math.floor((0 - surfaceStart) / scale / rulerStep) * rulerStep;
  const lastOffset = Math.ceil((viewportLength - surfaceStart) / scale / rulerStep) * rulerStep;
  const ticks: RulerTick[] = [];

  for (let offset = firstOffset; offset <= lastOffset; offset += rulerStep) {
    const position = surfaceStart + offset * scale;

    if (position < -rulerSize || position > viewportLength + rulerSize) {
      continue;
    }

    ticks.push({
      coordinate: Math.round(offset - length / 2),
      major: Math.abs(Math.round(offset / rulerStep)) % 2 === 0,
      position
    });
  }

  return ticks;
}

function getGuidePositionFromLayout(
  layout: RulerLayout,
  axis: ProjectCompositionGuideAxis,
  clientX: number,
  clientY: number
) {
  return getGuidePositionFromClientPoint(
    {
      height: layout.surfaceHeight,
      left: layout.viewportLeft + layout.surfaceLeft,
      top: layout.viewportTop + layout.surfaceTop,
      width: layout.surfaceWidth
    },
    axis,
    clientX,
    clientY,
    layout.width,
    layout.height
  );
}

function getGuideScreenPosition(
  layout: RulerLayout,
  axis: ProjectCompositionGuideAxis,
  position: number
) {
  return axis === "vertical"
    ? layout.surfaceLeft + (layout.width / 2 + position) * layout.scaleX
    : layout.surfaceTop + (layout.height / 2 + position) * layout.scaleY;
}
