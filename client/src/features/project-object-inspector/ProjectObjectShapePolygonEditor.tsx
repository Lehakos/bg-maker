import type { ProjectObjectShapePoint } from "@bg-maker/shared";
import { projectObjectShapePolygonPointCountLimits } from "@bg-maker/shared";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState
} from "react";
import { FormInput, IconButton, PanelActionButton, PanelCard } from "../../components";
import { cx } from "./class-names";
import {
  formatShapePolygonPointValue,
  normalizeShapePolygonPointValue,
  parseRectTransformDraftValue,
  shapePolygonPointFieldSettings,
  type ShapePolygonPointDraft,
  type ShapePolygonPointFieldKey
} from "./project-object-inspector-state";

type ProjectObjectShapePolygonEditorProps = {
  points: readonly ProjectObjectShapePoint[];
  onAddPoint: () => void;
  onPointChange: (pointIndex: number, point: ProjectObjectShapePoint) => void;
  onPointDraftFieldChange: (
    pointIndex: number,
    fieldKey: ShapePolygonPointFieldKey,
    value: string
  ) => void;
  onRemovePoint: (pointIndex: number) => void;
  onReset: () => void;
};

type ActivePointDrag = {
  pointIndex: number;
  pointerId: number;
};

type PendingPointChange = {
  point: ProjectObjectShapePoint;
  pointIndex: number;
};

const polygonPointChangeThrottleMs = 80;

export function ProjectObjectShapePolygonEditor({
  points,
  onAddPoint,
  onPointChange,
  onPointDraftFieldChange,
  onRemovePoint,
  onReset
}: ProjectObjectShapePolygonEditorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const activePointDrag = useRef<ActivePointDrag | null>(null);
  const lastPointChangeCommitAt = useRef(0);
  const onPointChangeRef = useRef(onPointChange);
  const pendingPointChange = useRef<PendingPointChange | null>(null);
  const pointChangeThrottleTimeout = useRef<number | null>(null);
  const [previewPoints, setPreviewPoints] = useState<ProjectObjectShapePoint[]>(() =>
    clonePoints(points)
  );
  const [pointDrafts, setPointDrafts] = useState<ShapePolygonPointDraft[]>(() =>
    createPointDrafts(points)
  );
  const canAddPoint = previewPoints.length < projectObjectShapePolygonPointCountLimits.max;
  const canRemovePoint = previewPoints.length > projectObjectShapePolygonPointCountLimits.min;

  useEffect(() => {
    onPointChangeRef.current = onPointChange;
  }, [onPointChange]);

  useEffect(() => {
    if (activePointDrag.current) {
      return;
    }

    setPreviewPoints(clonePoints(points));
    setPointDrafts(createPointDrafts(points));
  }, [points]);

  useEffect(
    () => () => {
      if (pointChangeThrottleTimeout.current !== null) {
        window.clearTimeout(pointChangeThrottleTimeout.current);
        pointChangeThrottleTimeout.current = null;
      }
    },
    []
  );

  function updatePointDraft(
    pointIndex: number,
    fieldKey: ShapePolygonPointFieldKey,
    value: string
  ) {
    setPointDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) =>
        index === pointIndex
          ? {
              ...draft,
              [fieldKey]: value
            }
          : draft
      )
    );
    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue !== null) {
      setPreviewPoints((currentPoints) =>
        currentPoints.map((currentPoint, index) =>
          index === pointIndex
            ? {
                ...currentPoint,
                [fieldKey]: normalizeShapePolygonPointValue(fieldKey, parsedValue)
              }
            : currentPoint
        )
      );
    }

    onPointDraftFieldChange(pointIndex, fieldKey, value);
  }

  function resetPointDraft(pointIndex: number, fieldKey: ShapePolygonPointFieldKey) {
    const point = points[pointIndex];

    if (!point) {
      return;
    }

    setPointDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) =>
        index === pointIndex
          ? {
              ...draft,
              [fieldKey]: formatShapePolygonPointValue(point[fieldKey], fieldKey)
            }
          : draft
      )
    );
    setPreviewPoints((currentPoints) =>
      currentPoints.map((currentPoint, index) =>
        index === pointIndex
          ? {
              x: normalizeShapePolygonPointValue("x", point.x),
              y: normalizeShapePolygonPointValue("y", point.y)
            }
          : currentPoint
      )
    );
  }

  function commitPointDraft(
    pointIndex: number,
    fieldKey: ShapePolygonPointFieldKey,
    value: string
  ) {
    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      resetPointDraft(pointIndex, fieldKey);
      return;
    }

    updatePointDraft(pointIndex, fieldKey, value);
    setPointDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) =>
        index === pointIndex
          ? {
              ...draft,
              [fieldKey]: formatShapePolygonPointValue(
                normalizeShapePolygonPointValue(fieldKey, parsedValue),
                fieldKey
              )
            }
          : draft
      )
    );
  }

  function updatePointFromPointer(pointIndex: number, clientX: number, clientY: number) {
    const point = getSvgPointFromClientPosition(clientX, clientY);

    if (!point) {
      return;
    }

    setPointDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) =>
        index === pointIndex
          ? {
              x: formatShapePolygonPointValue(point.x, "x"),
              y: formatShapePolygonPointValue(point.y, "y")
            }
          : draft
      )
    );
    setPreviewPoints((currentPoints) =>
      currentPoints.map((currentPoint, index) => (index === pointIndex ? point : currentPoint))
    );
    queuePointChange(pointIndex, point);
  }

  function queuePointChange(pointIndex: number, point: ProjectObjectShapePoint) {
    pendingPointChange.current = {
      point,
      pointIndex
    };

    const elapsedSinceLastCommit = window.performance.now() - lastPointChangeCommitAt.current;

    if (elapsedSinceLastCommit >= polygonPointChangeThrottleMs) {
      flushPendingPointChange();
      return;
    }

    if (pointChangeThrottleTimeout.current !== null) {
      return;
    }

    pointChangeThrottleTimeout.current = window.setTimeout(
      flushPendingPointChange,
      polygonPointChangeThrottleMs - elapsedSinceLastCommit
    );
  }

  function flushPendingPointChange() {
    const nextPointChange = pendingPointChange.current;

    clearPointChangeThrottleTimeout();

    if (!nextPointChange) {
      return;
    }

    pendingPointChange.current = null;
    lastPointChangeCommitAt.current = window.performance.now();
    onPointChangeRef.current(nextPointChange.pointIndex, nextPointChange.point);
  }

  function clearPointChangeThrottleTimeout() {
    if (pointChangeThrottleTimeout.current === null) {
      return;
    }

    window.clearTimeout(pointChangeThrottleTimeout.current);
    pointChangeThrottleTimeout.current = null;
  }

  function getSvgPointFromClientPosition(clientX: number, clientY: number) {
    const svg = svgRef.current;

    if (!svg) {
      return null;
    }

    const screenMatrix = svg.getScreenCTM();

    if (!screenMatrix) {
      return null;
    }

    const pointerPoint = svg.createSVGPoint();
    pointerPoint.x = clientX;
    pointerPoint.y = clientY;
    const svgPoint = pointerPoint.matrixTransform(screenMatrix.inverse());

    return {
      x: normalizeShapePolygonPointValue("x", svgPoint.x),
      y: normalizeShapePolygonPointValue("y", svgPoint.y)
    };
  }

  function handlePointPointerDown(pointIndex: number, event: PointerEvent<SVGCircleElement>) {
    event.preventDefault();
    event.stopPropagation();

    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    svg.setPointerCapture(event.pointerId);
    activePointDrag.current = {
      pointIndex,
      pointerId: event.pointerId
    };
    updatePointFromPointer(pointIndex, event.clientX, event.clientY);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const drag = activePointDrag.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    updatePointFromPointer(drag.pointIndex, event.clientX, event.clientY);
  }

  function endPointDrag(event: PointerEvent<SVGSVGElement>) {
    const drag = activePointDrag.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    flushPendingPointChange();
    activePointDrag.current = null;
  }

  return (
    <div className="space-y-2">
      <PanelCard>
        <svg
          ref={svgRef}
          aria-label="Custom shape points"
          className="h-36 w-full touch-none rounded bg-white shadow-inner"
          role="img"
          viewBox="0 0 100 100"
          onPointerCancel={endPointDrag}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointDrag}
        >
          <path
            d="M25 0V100 M50 0V100 M75 0V100 M0 25H100 M0 50H100 M0 75H100"
            stroke="#e2e8f0"
            strokeWidth="0.6"
          />
          <polygon
            fill="rgba(16, 185, 129, 0.18)"
            points={getPolygonPointsAttribute(previewPoints)}
            stroke="#059669"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          {previewPoints.map((point, index) => (
            <circle
              key={index}
              aria-label={`Point ${index + 1}`}
              className="cursor-grab fill-white stroke-sky-600 outline-none transition-colors hover:fill-sky-50 focus-visible:stroke-sky-800"
              cx={point.x}
              cy={point.y}
              r="3.8"
              onPointerDown={(event) => handlePointPointerDown(index, event)}
            />
          ))}
        </svg>
        <div className="mt-2 flex items-center gap-2">
          <PanelActionButton
            size="field"
            className={cx(
              "min-w-0 flex-1",
              !canAddPoint && "cursor-not-allowed opacity-45 hover:border-slate-200 hover:bg-white"
            )}
            disabled={!canAddPoint}
            title="Add point"
            onClick={onAddPoint}
          >
            <Plus className="shrink-0" size={15} />
            <span className="truncate">Add point</span>
          </PanelActionButton>
          <IconButton
            icon={<RotateCcw size={15} />}
            label="Reset custom shape"
            variant="neutral"
            onClick={onReset}
          />
        </div>
      </PanelCard>

      <div className="space-y-2">
        {pointDrafts.map((draft, index) => (
          <div
            key={index}
            className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2rem] items-end gap-2"
          >
            <span className="mb-2 text-xs font-semibold tabular-nums text-slate-500">
              {index + 1}
            </span>
            <ShapePointNumberField
              fieldKey="x"
              label="X"
              pointIndex={index}
              value={draft.x}
              onCommit={commitPointDraft}
              onDraftChange={updatePointDraft}
              onReset={resetPointDraft}
            />
            <ShapePointNumberField
              fieldKey="y"
              label="Y"
              pointIndex={index}
              value={draft.y}
              onCommit={commitPointDraft}
              onDraftChange={updatePointDraft}
              onReset={resetPointDraft}
            />
            <IconButton
              className={cx(
                "mb-0",
                !canRemovePoint &&
                  "cursor-not-allowed opacity-45 hover:border-slate-200 hover:bg-white hover:text-slate-500"
              )}
              disabled={!canRemovePoint}
              icon={<Trash2 size={15} />}
              label={`Remove point ${index + 1}`}
              variant="danger"
              onClick={() => onRemovePoint(index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

type ShapePointNumberFieldProps = {
  fieldKey: ShapePolygonPointFieldKey;
  label: string;
  pointIndex: number;
  value: string;
  onCommit: (pointIndex: number, fieldKey: ShapePolygonPointFieldKey, value: string) => void;
  onDraftChange: (pointIndex: number, fieldKey: ShapePolygonPointFieldKey, value: string) => void;
  onReset: (pointIndex: number, fieldKey: ShapePolygonPointFieldKey) => void;
};

function ShapePointNumberField({
  fieldKey,
  label,
  pointIndex,
  value,
  onCommit,
  onDraftChange,
  onReset
}: ShapePointNumberFieldProps) {
  const settings = shapePolygonPointFieldSettings[fieldKey];

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onReset(pointIndex, fieldKey);
    }
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    onCommit(pointIndex, fieldKey, event.currentTarget.value);
  }

  return (
    <label className="block min-w-0 text-xs font-medium text-slate-500">
      <span>{label}</span>
      <FormInput
        className="mt-1 w-full tabular-nums"
        inputMode="decimal"
        max={settings.max}
        min={settings.min}
        step={settings.step}
        type="number"
        value={value}
        onBlur={handleBlur}
        onChange={(event) => onDraftChange(pointIndex, fieldKey, event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />
    </label>
  );
}

function createPointDrafts(points: readonly ProjectObjectShapePoint[]): ShapePolygonPointDraft[] {
  return points.map((point) => ({
    x: formatShapePolygonPointValue(point.x, "x"),
    y: formatShapePolygonPointValue(point.y, "y")
  }));
}

function clonePoints(points: readonly ProjectObjectShapePoint[]): ProjectObjectShapePoint[] {
  return points.map((point) => ({ ...point }));
}

function getPolygonPointsAttribute(points: readonly ProjectObjectShapePoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}
