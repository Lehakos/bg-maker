import {
  ActionIcon,
  Box,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Tooltip,
  UnstyledButton
} from "@mantine/core";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from "react";
import {
  defaultPieceCustomShape,
  pieceShapes,
  resolvePieceLayout,
  type LayoutZone,
  type PieceCustomShape,
  type PieceLayout,
  type PieceShape,
  type PieceShapePoint,
  type TemplateFieldValues
} from "@bg-maker/shared";
import { LayoutZoneContentPreview } from "./card-layout-editor";

type PiecePreviewProps = {
  compact?: boolean;
  fieldValues?: TemplateFieldValues;
  interactive?: boolean;
  layout: PieceLayout;
  selectedFaceId?: string;
  selectedZoneId?: string | null;
  footerExtra?: ReactNode;
  showFaceTabs?: boolean;
  title?: string;
  onSelectedFaceIdChange?: (faceId: string) => void;
  onSelectZone?: (zoneId: string) => void;
  onUpdateZone?: (zoneId: string, patch: Partial<LayoutZone>) => void;
};

const zoneResizeHandleHitSize = 34;

type PieceShapeIconProps = {
  customShape?: PieceCustomShape;
  fillColor?: string;
  shape: PieceShape;
  size?: number;
  strokeColor?: string;
};

export function PiecePreview({
  compact = false,
  fieldValues = {},
  interactive = false,
  layout,
  selectedFaceId,
  selectedZoneId = null,
  footerExtra,
  showFaceTabs = true,
  title = "Final preview",
  onSelectedFaceIdChange,
  onSelectZone,
  onUpdateZone
}: PiecePreviewProps) {
  const generatedId = useId().replace(/:/g, "");
  const [internalFaceId, setInternalFaceId] = useState(layout.faces[0]?.id ?? "front");
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const previewLayout = resolvePieceLayout(layout, fieldValues);
  const selectedId =
    selectedFaceId && previewLayout.faces.some((face) => face.id === selectedFaceId)
      ? selectedFaceId
      : previewLayout.faces.some((face) => face.id === internalFaceId)
        ? internalFaceId
        : (previewLayout.faces[0]?.id ?? "front");
  const selectedFace = previewLayout.faces.find((face) => face.id === selectedId) ?? previewLayout.faces[0];
  const clipId = `piece-preview-clip-${generatedId}`;

  function updateSelectedFace(faceId: string) {
    setInternalFaceId(faceId);
    onSelectedFaceIdChange?.(faceId);
  }

  function getPointerPercent(event: Pick<PointerEvent | ReactPointerEvent, "clientX" | "clientY">) {
    const rect = overlayRef.current?.getBoundingClientRect();

    if (!rect || rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    };
  }

  function pointIsInsideZone(point: { x: number; y: number }, zone: LayoutZone) {
    return (
      point.x >= zone.x &&
      point.x <= zone.x + zone.width &&
      point.y >= zone.y &&
      point.y <= zone.y + zone.height
    );
  }

  function pointIsInResizeCorner(point: { x: number; y: number }, zone: LayoutZone) {
    const rect = overlayRef.current?.getBoundingClientRect();

    if (!rect || rect.width === 0 || rect.height === 0) {
      return false;
    }

    const thresholdX = (zoneResizeHandleHitSize / rect.width) * 100;
    const thresholdY = (zoneResizeHandleHitSize / rect.height) * 100;

    return (
      point.x >= zone.x + zone.width - thresholdX && point.y >= zone.y + zone.height - thresholdY
    );
  }

  function getInteractionZoneAtPoint(point: { x: number; y: number }) {
    if (!selectedFace) {
      return undefined;
    }

    const selectedZone = selectedZoneId
      ? selectedFace.zones.find((zone) => zone.id === selectedZoneId)
      : null;

    if (selectedZone && pointIsInsideZone(point, selectedZone)) {
      return selectedZone;
    }

    return selectedFace.zones
      .slice()
      .reverse()
      .find((zone) => pointIsInsideZone(point, zone));
  }

  function startZoneInteraction(
    event: ReactPointerEvent<HTMLElement>,
    zone: LayoutZone,
    mode: "move" | "resize"
  ) {
    if (!interactive || !onUpdateZone) {
      return;
    }

    const startPoint = getPointerPercent(event);

    if (!startPoint) {
      return;
    }

    const interactionTarget = event.currentTarget;
    const pointerId = event.pointerId;
    const startX = startPoint.x;
    const startY = startPoint.y;

    event.preventDefault();
    event.stopPropagation();
    interactionTarget.setPointerCapture(pointerId);
    onSelectZone?.(zone.id);

    function handlePointerMove(pointerEvent: PointerEvent) {
      const currentPoint = getPointerPercent(pointerEvent);

      if (!currentPoint) {
        return;
      }

      const deltaX = currentPoint.x - startX;
      const deltaY = currentPoint.y - startY;

      if (mode === "move") {
        onUpdateZone?.(zone.id, {
          x: roundPercent(clamp(zone.x + deltaX, 0, 100 - zone.width)),
          y: roundPercent(clamp(zone.y + deltaY, 0, 100 - zone.height))
        });
        return;
      }

      onUpdateZone?.(zone.id, {
        width: roundPercent(clamp(zone.width + deltaX, 1, 100 - zone.x)),
        height: roundPercent(clamp(zone.height + deltaY, 1, 100 - zone.y))
      });
    }

    function handlePointerEnd(pointerEvent: PointerEvent) {
      if (interactionTarget.hasPointerCapture(pointerEvent.pointerId)) {
        interactionTarget.releasePointerCapture(pointerEvent.pointerId);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
  }

  return (
    <Stack gap="sm">
      {showFaceTabs && previewLayout.faces.length > 1 ? (
        <Tabs
          radius={8}
          value={selectedId}
          onChange={(value) => updateSelectedFace(value ?? previewLayout.faces[0]?.id ?? "front")}
        >
          <Tabs.List grow>
            {previewLayout.faces.map((face) => (
              <Tabs.Tab key={face.id} value={face.id}>
                {face.name}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      ) : null}

      <Group justify="space-between" align="center">
        <Text fw={600}>{title}</Text>
        <Text c="dimmed" size="sm">
          {layout.sizeMm.widthMm} x {layout.sizeMm.heightMm} mm
        </Text>
      </Group>

      <Box className={`piece-preview-shell${compact ? " piece-preview-shell--compact" : ""}`}>
        <Box
          className="piece-preview"
          style={{ aspectRatio: `${layout.sizeMm.widthMm} / ${layout.sizeMm.heightMm}` }}
        >
          <svg aria-label="Piece preview" className="piece-preview-svg" viewBox="0 0 100 100">
            <defs>
              <clipPath id={clipId}>
                <PieceShapeSvgElement
                  customShape={layout.customShape}
                  fillColor="#fff"
                  shape={layout.shape}
                  strokeColor="#000"
                />
              </clipPath>
            </defs>
            <PieceShapeSvgElement
              customShape={layout.customShape}
              fillColor={layout.appearance.fillColor}
              shape={layout.shape}
              strokeColor={layout.appearance.strokeColor}
            />
            <foreignObject clipPath={`url(#${clipId})`} height="100" width="100" x="0" y="0">
              <div className="piece-preview-face">
                {selectedFace?.zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="layout-preview-zone"
                    style={{
                      left: `${zone.x}%`,
                      top: `${zone.y}%`,
                      width: `${zone.width}%`,
                      height: `${zone.height}%`
                    }}
                  >
                    <div className="card-preview-content card-final-preview-content piece-preview-content">
                      <LayoutZoneContentPreview content={zone.content} />
                    </div>
                  </div>
                ))}
              </div>
            </foreignObject>
          </svg>

          {interactive ? (
            <div
              ref={overlayRef}
              className="piece-preview-zone-overlay"
              onPointerDown={(event) => {
                const point = getPointerPercent(event);

                if (!point) {
                  return;
                }

                const zone = getInteractionZoneAtPoint(point);

                if (!zone) {
                  return;
                }

                startZoneInteraction(
                  event,
                  zone,
                  pointIsInResizeCorner(point, zone) ? "resize" : "move"
                );
              }}
            >
              {selectedFace?.zones.map((zone) => (
                <div
                  key={zone.id}
                  aria-label={`Piece zone ${zone.name}`}
                  className="card-preview-zone"
                  data-selected={zone.id === selectedZoneId ? "true" : undefined}
                  data-zone-name={zone.name}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectZone?.(zone.id);
                  }}
                >
                  <span className="card-preview-zone-label">{zone.name}</span>
                  <span aria-hidden className="card-preview-zone-resize-handle" />
                </div>
              ))}
            </div>
          ) : null}
        </Box>
      </Box>

      {footerExtra ?? null}
    </Stack>
  );
}

export function PieceShapePicker({
  disabled = false,
  fillColor,
  onChange,
  strokeColor,
  value
}: {
  disabled?: boolean;
  fillColor: string;
  onChange: (shape: PieceShape) => void;
  strokeColor: string;
  value: PieceShape;
}) {
  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        Shape
      </Text>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
        {pieceShapes.map((shape) => (
          <UnstyledButton
            key={shape}
            aria-label={`Select ${titleCase(shape)} shape`}
            className="piece-shape-option"
            data-selected={shape === value ? "true" : undefined}
            disabled={disabled}
            type="button"
            onClick={() => onChange(shape)}
          >
            <PieceShapeIcon fillColor={fillColor} shape={shape} strokeColor={strokeColor} />
            <Text size="xs" fw={600}>
              {titleCase(shape)}
            </Text>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

export function PieceShapeIcon({
  customShape,
  fillColor = "#f8fafc",
  shape,
  size = 46,
  strokeColor = "#0f766e"
}: PieceShapeIconProps) {
  return (
    <svg
      aria-hidden
      className="piece-shape-icon"
      height={size}
      viewBox="0 0 100 100"
      width={size}
    >
      <PieceShapeSvgElement
        customShape={customShape}
        fillColor={fillColor}
        shape={shape}
        strokeColor={strokeColor}
      />
    </svg>
  );
}

export function CustomPieceShapeEditor({
  customShape,
  disabled = false,
  onChange
}: {
  customShape: PieceCustomShape;
  disabled?: boolean;
  onChange: (customShape: PieceCustomShape) => void;
}) {
  const [selectedPointIndex, setSelectedPointIndex] = useState(0);
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);

  function updatePoint(index: number, point: PieceShapePoint) {
    onChange({
      points: customShape.points.map((currentPoint, pointIndex) =>
        pointIndex === index ? point : currentPoint
      )
    });
  }

  function getPointerPoint(event: ReactPointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      x: roundPercent(clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100)),
      y: roundPercent(clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100))
    };
  }

  function addPoint() {
    const nextIndex = Math.min(selectedPointIndex + 1, customShape.points.length);
    const nextPoints = [...customShape.points];
    nextPoints.splice(nextIndex, 0, { x: 50, y: 50 });
    onChange({ points: nextPoints });
    setSelectedPointIndex(nextIndex);
  }

  function deletePoint() {
    if (customShape.points.length <= 3) {
      return;
    }

    const nextPoints = customShape.points.filter((_point, index) => index !== selectedPointIndex);
    onChange({ points: nextPoints });
    setSelectedPointIndex(Math.max(0, selectedPointIndex - 1));
  }

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <Text size="sm" fw={500}>
          Custom shape
        </Text>
        <Group gap={4}>
          <Tooltip label="Add point" withArrow>
            <ActionIcon
              aria-label="Add custom shape point"
              disabled={disabled}
              radius={8}
              variant="light"
              onClick={addPoint}
            >
              <Plus size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete point" withArrow>
            <ActionIcon
              aria-label="Delete custom shape point"
              color="red"
              disabled={disabled || customShape.points.length <= 3}
              radius={8}
              variant="subtle"
              onClick={deletePoint}
            >
              <Trash2 size={16} />
            </ActionIcon>
          </Tooltip>
          <Button
            disabled={disabled}
            leftSection={<RotateCcw size={14} />}
            radius={8}
            size="xs"
            type="button"
            variant="subtle"
            onClick={() => {
              onChange(defaultPieceCustomShape);
              setSelectedPointIndex(0);
            }}
          >
            Reset
          </Button>
        </Group>
      </Group>

      <svg
        aria-label="Custom shape editor"
        className="custom-piece-shape-editor"
        viewBox="0 0 100 100"
        onPointerMove={(event) => {
          if (disabled || draggingPointIndex === null) {
            return;
          }

          const point = getPointerPoint(event);

          if (!point) {
            return;
          }

          updatePoint(draggingPointIndex, point);
        }}
        onPointerUp={() => setDraggingPointIndex(null)}
        onPointerCancel={() => setDraggingPointIndex(null)}
      >
        <polygon className="custom-piece-shape-polygon" points={toPolygonPoints(customShape.points)} />
        {customShape.points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            className="custom-piece-shape-point"
            cx={point.x}
            cy={point.y}
            data-selected={selectedPointIndex === index ? "true" : undefined}
            r={4}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onPointerDown={(event) => {
              if (disabled) {
                return;
              }

              event.currentTarget.setPointerCapture(event.pointerId);
              setSelectedPointIndex(index);
              setDraggingPointIndex(index);
            }}
          />
        ))}
      </svg>
    </Stack>
  );
}

function PieceShapeSvgElement({
  customShape,
  fillColor,
  shape,
  strokeColor
}: {
  customShape?: PieceCustomShape;
  fillColor: string;
  shape: PieceShape;
  strokeColor: string;
}) {
  const commonProps = {
    fill: fillColor,
    stroke: strokeColor,
    strokeLinejoin: "round" as const,
    strokeWidth: 4,
    vectorEffect: "non-scaling-stroke" as const
  };

  switch (shape) {
    case "circle":
      return <circle cx="50" cy="50" r="43" {...commonProps} />;

    case "square":
      return <rect height="84" rx="5" width="84" x="8" y="8" {...commonProps} />;

    case "rectangle":
      return <rect height="62" rx="5" width="84" x="8" y="19" {...commonProps} />;

    case "hex":
      return <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" {...commonProps} />;

    case "meeple":
      return (
        <path
          d="M50 7c-10 0-18 8-18 18 0 6 3 11 8 14H28c-8 0-14 6-14 14v13h15l-6 27h18l9-24 9 24h18l-6-27h15V53c0-8-6-14-14-14H60c5-3 8-8 8-14 0-10-8-18-18-18Z"
          {...commonProps}
        />
      );

    case "pawn":
      return (
        <path
          d="M50 9c-11 0-20 9-20 20 0 8 5 15 12 18L35 58l-5 23-11 7v6h62v-6l-11-7-5-23-7-11c7-3 12-10 12-18 0-11-9-20-20-20Z"
          {...commonProps}
        />
      );

    case "custom":
      return (
        <polygon
          points={toPolygonPoints(customShape?.points ?? defaultPieceCustomShape.points)}
          {...commonProps}
        />
      );
  }
}

function toPolygonPoints(points: PieceShapePoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
