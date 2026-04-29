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
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  defaultTileCustomShape,
  resolveTileLayout,
  tileShapes,
  type CardLayoutPadding,
  type LayoutZone,
  type ProjectParameter,
  type TemplateFieldValues,
  type TileCustomShape,
  type TileLayout,
  type TileLayoutSide,
  type TileShape,
  type TileShapePoint
} from "@bg-maker/shared";
import { LayoutZoneContentPreview } from "./card-layout-editor";
import "./card-layout-editor.css";
import "./tile-preview.css";

type TilePreviewProps = {
  compact?: boolean;
  fieldValues?: TemplateFieldValues;
  footerExtra?: ReactNode;
  interactive?: boolean;
  layout: TileLayout;
  projectParameters?: ProjectParameter[];
  rotationDeg?: number;
  selectedSideId?: TileLayoutSide;
  selectedZoneId?: string | null;
  showHeader?: boolean;
  showSideTabs?: boolean;
  title?: string;
  onSelectZone?: (zoneId: string) => void;
  onSelectedSideIdChange?: (sideId: TileLayoutSide) => void;
  onUpdateZone?: (zoneId: string, patch: Partial<LayoutZone>) => void;
};

type TileShapeIconProps = {
  customShape?: TileCustomShape;
  fillColor?: string;
  shape: TileShape;
  size?: number;
  strokeColor?: string;
};

const zoneResizeHandleHitSize = 34;

export function TilePreview({
  compact = false,
  fieldValues = {},
  footerExtra,
  interactive = false,
  layout,
  projectParameters = [],
  rotationDeg,
  selectedSideId,
  selectedZoneId = null,
  showHeader = true,
  showSideTabs = true,
  title = "Final preview",
  onSelectZone,
  onSelectedSideIdChange,
  onUpdateZone
}: TilePreviewProps) {
  const [internalSideId, setInternalSideId] = useState<TileLayoutSide>("front");
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const previewLayout = resolveTileLayout(layout, fieldValues, projectParameters);
  const selectedId = selectedSideId ?? internalSideId;
  const selectedSide = previewLayout.sides[selectedId] ?? previewLayout.sides.front;
  const previewRotationDeg = rotationDeg ?? previewLayout.rotationDeg ?? 0;

  function updateSelectedSide(sideId: TileLayoutSide) {
    setInternalSideId(sideId);
    onSelectedSideIdChange?.(sideId);
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
    const selectedZone = selectedZoneId
      ? selectedSide.zones.find((zone) => zone.id === selectedZoneId)
      : null;

    if (selectedZone && pointIsInsideZone(point, selectedZone)) {
      return selectedZone;
    }

    return selectedSide.zones
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
      {showSideTabs ? (
        <Tabs
          radius={8}
          value={selectedId}
          onChange={(value) => updateSelectedSide((value ?? "front") as TileLayoutSide)}
        >
          <Tabs.List grow>
            <Tabs.Tab value="front">Front</Tabs.Tab>
            <Tabs.Tab value="back">Back</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      ) : null}

      {showHeader ? (
        <Group justify="space-between" align="center">
          <Text fw={600}>{title}</Text>
          <Text c="dimmed" size="sm">
            {layout.sizeMm.widthMm} x {layout.sizeMm.heightMm} mm
          </Text>
        </Group>
      ) : null}

      <Box className={`tile-preview-shell${compact ? " tile-preview-shell--compact" : ""}`}>
        <Box
          className="tile-preview"
          style={{
            aspectRatio: `${layout.sizeMm.widthMm} / ${layout.sizeMm.heightMm}`
          }}
        >
          <svg
            aria-label="Tile preview"
            className="tile-preview-svg"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <TileShapeSvgElement
              customShape={previewLayout.customShape}
              fillColor={String(previewLayout.appearance.fillColor)}
              rotationDeg={previewRotationDeg}
              shape={previewLayout.shape}
              strokeColor="transparent"
            />
          </svg>

          <div
            className="tile-preview-zone-content-layer"
            style={{
              clipPath: getTileShapeClipPath(
                previewLayout.shape,
                previewLayout.customShape,
                previewRotationDeg
              )
            }}
          >
            <div
              className="tile-preview-zone-safe-area"
              style={getPaddingAreaStyle(previewLayout.sizeMm, selectedSide.paddingMm)}
            >
              {selectedSide.zones.map((zone) => (
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
                  <div className="card-preview-content card-final-preview-content tile-preview-content">
                    <LayoutZoneContentPreview content={zone.content} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <svg
            aria-hidden
            className="tile-preview-outline-svg"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <TileShapeSvgElement
              customShape={previewLayout.customShape}
              fillColor="none"
              rotationDeg={previewRotationDeg}
              shape={previewLayout.shape}
              strokeColor={String(previewLayout.appearance.strokeColor)}
            />
          </svg>

          {interactive ? (
            <div
              ref={overlayRef}
              className="tile-preview-zone-overlay"
              style={getPaddingAreaStyle(previewLayout.sizeMm, selectedSide.paddingMm)}
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
              {selectedSide.zones.map((zone) => (
                <div
                  key={zone.id}
                  aria-label={`Tile zone ${zone.name}`}
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

export function TileShapePicker({
  disabled = false,
  fillColor,
  onChange,
  strokeColor,
  value
}: {
  disabled?: boolean;
  fillColor: string;
  onChange: (shape: TileShape) => void;
  strokeColor: string;
  value: TileShape;
}) {
  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        Shape
      </Text>
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
        {tileShapes.map((shape) => (
          <UnstyledButton
            key={shape}
            aria-label={`Select ${titleCase(shape)} shape`}
            className="tile-shape-option"
            data-selected={shape === value ? "true" : undefined}
            disabled={disabled}
            type="button"
            onClick={() => onChange(shape)}
          >
            <TileShapeIcon fillColor={fillColor} shape={shape} strokeColor={strokeColor} />
            <Text size="xs" fw={600}>
              {titleCase(shape)}
            </Text>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

export function TileShapeIcon({
  customShape,
  fillColor = "#f8fafc",
  shape,
  size = 46,
  strokeColor = "#0f766e"
}: TileShapeIconProps) {
  return (
    <svg aria-hidden className="tile-shape-icon" height={size} viewBox="0 0 100 100" width={size}>
      <TileShapeSvgElement
        customShape={customShape}
        fillColor={fillColor}
        shape={shape}
        strokeColor={strokeColor}
      />
    </svg>
  );
}

export function CustomTileShapeEditor({
  customShape,
  disabled = false,
  onChange
}: {
  customShape: TileCustomShape;
  disabled?: boolean;
  onChange: (customShape: TileCustomShape) => void;
}) {
  const [selectedPointIndex, setSelectedPointIndex] = useState(0);
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);

  function updatePoint(index: number, point: TileShapePoint) {
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
              onChange(defaultTileCustomShape);
              setSelectedPointIndex(0);
            }}
          >
            Reset
          </Button>
        </Group>
      </Group>

      <svg
        aria-label="Custom shape editor"
        className="custom-tile-shape-editor"
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
        <polygon
          className="custom-tile-shape-polygon"
          points={toPolygonPoints(customShape.points)}
        />
        {customShape.points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            className="custom-tile-shape-point"
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

function TileShapeSvgElement({
  customShape,
  fillColor,
  rotationDeg = 0,
  shape,
  strokeColor
}: {
  customShape?: TileCustomShape;
  fillColor: string;
  rotationDeg?: number;
  shape: TileShape;
  strokeColor: string;
}) {
  const commonProps = {
    fill: fillColor,
    stroke: strokeColor,
    strokeLinejoin: "round" as const,
    strokeWidth: 4,
    transform: `rotate(${rotationDeg} 50 50)`,
    vectorEffect: "non-scaling-stroke" as const
  };

  switch (shape) {
    case "box":
      return <rect height="84" rx="4" width="84" x="8" y="8" {...commonProps} />;

    case "triangle":
      return <polygon points="50,8 91,88 9,88" {...commonProps} />;

    case "hex":
      return <polygon points="50,5 88,27 88,73 50,95 12,73 12,27" {...commonProps} />;

    case "custom":
      return (
        <polygon
          points={toPolygonPoints(customShape?.points ?? defaultTileCustomShape.points)}
          {...commonProps}
        />
      );
  }
}

function toPolygonPoints(points: TileShapePoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function getTileShapeClipPath(
  shape: TileShape,
  customShape: TileCustomShape | undefined,
  rotationDeg: number
) {
  switch (shape) {
    case "box":
      return toCssPolygon(
        rotateClipPoints(
          [
            { x: 8, y: 8 },
            { x: 92, y: 8 },
            { x: 92, y: 92 },
            { x: 8, y: 92 }
          ],
          rotationDeg
        )
      );

    case "triangle":
      return toCssPolygon(
        rotateClipPoints(
          [
            { x: 50, y: 8 },
            { x: 91, y: 88 },
            { x: 9, y: 88 }
          ],
          rotationDeg
        )
      );

    case "hex":
      return toCssPolygon(
        rotateClipPoints(
          [
            { x: 50, y: 5 },
            { x: 88, y: 27 },
            { x: 88, y: 73 },
            { x: 50, y: 95 },
            { x: 12, y: 73 },
            { x: 12, y: 27 }
          ],
          rotationDeg
        )
      );

    case "custom":
      return toCssPolygon(
        rotateClipPoints(customShape?.points ?? defaultTileCustomShape.points, rotationDeg)
      );
  }
}

function rotateClipPoints(points: TileShapePoint[], rotationDeg: number) {
  if (rotationDeg === 0) {
    return points;
  }

  const radians = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return points.map((point) => {
    const dx = point.x - 50;
    const dy = point.y - 50;

    return {
      x: 50 + dx * cos - dy * sin,
      y: 50 + dx * sin + dy * cos
    };
  });
}

function toCssPolygon(points: TileShapePoint[]) {
  return `polygon(${points
    .map((point) => `${roundClipValue(point.x)}% ${roundClipValue(point.y)}%`)
    .join(", ")})`;
}

function roundClipValue(value: number) {
  return Math.round(value * 1000) / 1000;
}

function getPaddingAreaStyle(
  size: Pick<TileLayout["sizeMm"], "heightMm" | "widthMm">,
  padding: CardLayoutPadding
) {
  return {
    top: `${(padding.topMm / size.heightMm) * 100}%`,
    right: `${(padding.rightMm / size.widthMm) * 100}%`,
    bottom: `${(padding.bottomMm / size.heightMm) * 100}%`,
    left: `${(padding.leftMm / size.widthMm) * 100}%`
  };
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
