import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  ColorInput,
  FileInput,
  Group,
  Menu,
  NumberInput,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
  UnstyledButton
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BoxSelect,
  ChevronDown,
  Circle,
  Dice5,
  GripVertical,
  Layers,
  Maximize2,
  Package,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Square,
  Trash2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from "react";
import {
  componentTypes,
  tablePlacementFaces,
  zoneBackgroundImageFits,
  zoneChildTypes,
  zoneLayouts,
  zoneOverflowModes,
  zoneSizeModes,
  zoneSourceFaces,
  zoneVisibilityModes,
  type ComponentCollection,
  type ComponentType,
  type GameComponent,
  type ProjectParameter,
  type TablePlacement,
  type TablePlacementFace,
  type TableSetup,
  type TableSource,
  type TableZone,
  type ZoneBackground,
  type ZoneBackgroundImageFit,
  type ZoneChildType,
  type ZoneLayout,
  type ZoneOverflowMode,
  type ZoneSizeMode,
  type ZoneSource,
  type ZoneSourceFace,
  type ZoneVisibility
} from "@bg-maker/shared";
import { getApiErrorMessage, getTableSetup, updateTableSetup } from "../api/client";
import { collectionTypeLabels, componentTypeLabels } from "./component-labels";
import { CardPreview } from "./card-layout-editor";
import { PiecePreview } from "./piece-preview";
import { TilePreview } from "./tile-preview";
import "./table-setup-editor.css";

type TableSetupEditorProps = {
  collections: ComponentCollection[];
  components: GameComponent[];
  projectId: string;
  projectParameters: ProjectParameter[];
};

type Selection =
  | {
      id: string;
      type: "placement";
    }
  | {
      id: string;
      type: "zone";
    }
  | null;

type DragMode = "move" | "resize";

type TablePoint = {
  x: number;
  y: number;
};

type TableSize = {
  height: number;
  width: number;
};

type RenderedZone = {
  absoluteX: number;
  absoluteY: number;
  depth: number;
  localX: number;
  localY: number;
  parentLayout: ZoneLayout;
  parentHeight: number;
  parentWidth: number;
  zone: TableZone;
};

type ZoneDrafts = Record<string, Partial<Record<ZoneChildType, TableZone>>>;

const allLibraryFilters = ["all", ...componentTypes, "deck", "bag", "custom"] as const;

type LibraryFilter = (typeof allLibraryFilters)[number];

const libraryDragType = "application/x-bg-maker-table-source";
const noSourceOption = "__none__";
const tableBackgroundImageMaxBytes = 5 * 1024 * 1024;
const minTableZoom = 0.5;
const maxTableZoom = 2.5;
const tableZoomStep = 0.1;
const minSurfaceWidthPx = 640;
const minZoneSizeMm = 20;
const defaultZoneBackgroundColor = "#e0f2fe";

const zoneTypeOptions = zoneChildTypes.map((type) => ({
  label: type === "zone" ? "Container" : componentTypeLabels[type],
  value: type
}));

const zoneLayoutOptions = zoneLayouts.map((layout) => ({
  label: titleCase(layout),
  value: layout
}));

const zoneSizeOptions = zoneSizeModes.map((size) => ({
  label: titleCase(size),
  value: size
}));

const zoneOverflowOptions = zoneOverflowModes.map((overflow) => ({
  label: titleCase(overflow),
  value: overflow
}));

const zoneVisibilityOptions = zoneVisibilityModes.map((visibility) => ({
  label: titleCase(visibility),
  value: visibility
}));

const zoneSourceFaceOptions = zoneSourceFaces.map((face) => ({
  label: face === "up" ? "Face up" : "Face down",
  value: face
}));

const placementFaceOptions = tablePlacementFaces.map((face) => ({
  label: titleCase(face),
  value: face
}));

const backgroundTypeOptions = [
  { label: "None", value: "none" },
  { label: "Color", value: "color" },
  { label: "Image", value: "image" }
];

const imageFitOptions = zoneBackgroundImageFits.map((fit) => ({
  label: titleCase(fit),
  value: fit
}));

const libraryFilterOptions = allLibraryFilters.map((filter) => ({
  label:
    filter === "all"
      ? "All"
      : filter in componentTypeLabels
        ? componentTypeLabels[filter as ComponentType]
        : collectionTypeLabels[filter as ComponentCollection["type"]],
  value: filter
}));

export function TableSetupEditor({
  collections,
  components,
  projectId,
  projectParameters
}: TableSetupEditorProps) {
  const queryClient = useQueryClient();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<TableSetup | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [tableZoom, setTableZoom] = useState(1);
  const [activeDragSource, setActiveDragSource] = useState<TableSource | null>(null);
  const [activePlacementDrag, setActivePlacementDrag] = useState<{
    source: TableSource;
  } | null>(null);
  const [dragHoverZoneId, setDragHoverZoneId] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [zoneDrafts, setZoneDrafts] = useState<ZoneDrafts>({});

  const setupQuery = useQuery({
    queryKey: ["table-setup", projectId],
    queryFn: () => getTableSetup(projectId),
    enabled: projectId.length > 0,
    retry: false
  });

  const saveMutation = useMutation({
    mutationFn: (setup: TableSetup) =>
      updateTableSetup(projectId, {
        height: setup.height,
        placements: setup.placements,
        width: setup.width,
        zones: setup.zones
      }),
    onSuccess: async (setup) => {
      setDraft(cloneSetup(setup));
      await queryClient.invalidateQueries({ queryKey: ["table-setup", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  });

  useEffect(() => {
    if (setupQuery.data) {
      const setup = setupQuery.data;

      queueMicrotask(() => {
        setDraft((current) => {
          if (
            current &&
            current.projectId === setup.projectId &&
            getSetupSignature(current) !== getSetupSignature(setup)
          ) {
            return current;
          }

          return cloneSetup(setup);
        });
      });
    }
  }, [setupQuery.data]);

  const componentsById = useMemo(
    () => new Map(components.map((component) => [component.id, component])),
    [components]
  );
  const collectionsById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection])),
    [collections]
  );
  const renderedZones = useMemo(
    () => (draft ? flattenRenderedZones(draft.zones, 0, 0, draft.width, draft.height, 0) : []),
    [draft]
  );
  const savedSignature = setupQuery.data ? getSetupSignature(setupQuery.data) : "";
  const draftSignature = draft ? getSetupSignature(draft) : "";
  const hasChanges = draft !== null && draftSignature !== savedSignature;
  const selectedPlacement =
    selection?.type === "placement"
      ? draft?.placements.find((placement) => placement.id === selection.id)
      : undefined;
  const selectedRenderedZone =
    selection?.type === "zone"
      ? renderedZones.find((entry) => entry.zone.id === selection.id)
      : undefined;
  const activeDropSource = activeDragSource ?? activePlacementDrag?.source ?? null;

  function updateDraft(updater: (setup: TableSetup) => TableSetup) {
    setEditorError(null);
    setDraft((current) => (current ? updater(current) : current));
  }

  function updateTableZoom(delta: number) {
    setTableZoom((current) => clampZoom(current + delta));
  }

  function resetTableZoom() {
    setTableZoom(1);
  }

  function fitTableToViewport() {
    const viewport = viewportRef.current;

    if (!viewport || !draft) {
      return;
    }

    const style = window.getComputedStyle(viewport);
    const paddingX = readCssPixels(style.paddingLeft) + readCssPixels(style.paddingRight);
    const paddingY = readCssPixels(style.paddingTop) + readCssPixels(style.paddingBottom);
    const availableWidth = Math.max(1, viewport.clientWidth - paddingX);
    const maxContentHeight = readCssPixels(style.maxHeight);
    const availableHeight =
      maxContentHeight > 0
        ? maxContentHeight
        : Math.max(1, viewport.clientHeight - paddingY);
    const naturalWidth = Math.max(availableWidth, minSurfaceWidthPx);
    const naturalHeight = naturalWidth * (draft.height / draft.width);
    const zoom = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight);

    setTableZoom(clampZoom(zoom));
    window.requestAnimationFrame(() => {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });
  }

  function addPlacementFromSource(source: TableSource, point?: TablePoint) {
    const placementId = createClientId("placement");

    updateDraft((setup) => ({
      ...setup,
      placements: [
        ...setup.placements,
        {
          id: placementId,
          source,
          x: Math.round(point?.x ?? clamp(80 + setup.placements.length * 28, 0, setup.width)),
          y: Math.round(point?.y ?? clamp(80 + setup.placements.length * 28, 0, setup.height)),
          rotationDeg: 0,
          face: "front"
        }
      ]
    }));
    setSelection({ id: placementId, type: "placement" });
  }

  function addRootZone(childrenType: ZoneChildType) {
    const zoneId = createClientId("zone");

    updateDraft((setup) => {
      const zone = createDefaultTableZone({
        childrenType,
        existingZones: setup.zones,
        height: Math.min(220, setup.height - 120),
        id: zoneId,
        name: childrenType === "zone" ? `Zone ${countZones(setup.zones) + 1}` : `${titleCase(childrenType)} zone`,
        width: Math.min(360, setup.width - 120),
        x: 80,
        y: 80
      });

      const zones = [...setup.zones, zone];

      return {
        ...setup,
        zones: clampZonesToBounds(zones, setup.width, setup.height, componentsById, collectionsById)
      };
    });
    setSelection({ id: zoneId, type: "zone" });
  }

  function addChildZone(parentId: string, childrenType: ZoneChildType) {
    const zoneId = createClientId("zone");

    updateDraft((setup) => {
      const zones = updateZoneInTree(setup.zones, parentId, (zone) => {
        if (zone.childrenType !== "zone") {
          return zone;
        }

        const child = createDefaultTableZone({
          childrenType,
          existingZones: setup.zones,
          height: Math.max(minZoneSizeMm, Math.min(140, zone.height - 24)),
          id: zoneId,
          name:
            childrenType === "zone"
              ? `Zone ${countZones(setup.zones) + 1}`
              : `${titleCase(childrenType)} zone ${countZones(setup.zones) + 1}`,
          width: Math.max(minZoneSizeMm, Math.min(220, zone.width - 24)),
          x: 12,
          y: 12
        });

        return { ...zone, children: [...zone.children, child] };
      });

      return {
        ...setup,
        zones: clampZonesToBounds(zones, setup.width, setup.height, componentsById, collectionsById)
      };
    });
    setSelection({ id: zoneId, type: "zone" });
  }

  function updatePlacement(id: string, patch: Partial<TablePlacement>) {
    updateDraft((setup) => ({
      ...setup,
      placements: setup.placements.map((placement) =>
        placement.id === id ? { ...placement, ...patch } : placement
      )
    }));
  }

  function updateZone(id: string, patch: Partial<TableZone>) {
    updateDraft((setup) => {
      const zones = updateZoneInTree(setup.zones, id, (zone) => ({ ...zone, ...patch }) as TableZone);

      return {
        ...setup,
        zones: clampZonesToBounds(zones, setup.width, setup.height, componentsById, collectionsById)
      };
    });
  }

  function changeZoneType(zone: TableZone, childrenType: ZoneChildType) {
    const existingDraft = zoneDrafts[zone.id]?.[childrenType];
    const nextZone = existingDraft ?? createZoneForType(childrenType, getZoneBase(zone));

    setZoneDrafts((current) => ({
      ...current,
      [zone.id]: {
        ...current[zone.id],
        [zone.childrenType]: zone
      }
    }));

    updateDraft((setup) => {
      const zones = updateZoneInTree(setup.zones, zone.id, () => nextZone);

      return {
        ...setup,
        zones: clampZonesToBounds(zones, setup.width, setup.height, componentsById, collectionsById)
      };
    });
  }

  function updateZoneSource(zone: ZoneSource, source: TableSource | undefined) {
    updateZone(zone.id, source ? ({ source } as Partial<TableZone>) : ({ source: undefined } as Partial<TableZone>));
  }

  function canDropSourceOnZone(source: TableSource, zone: TableZone) {
    return (
      zone.childrenType !== "zone" &&
      sourceMatchesType(source, zone.childrenType, componentsById, collectionsById)
    );
  }

  function getDropZoneAtPoint(point: TablePoint, source: TableSource) {
    return [...renderedZones]
      .reverse()
      .find((renderedZone) => {
        const zone = renderedZone.zone;

        return (
          canDropSourceOnZone(source, zone) &&
          point.x >= renderedZone.absoluteX &&
          point.x <= renderedZone.absoluteX + zone.width &&
          point.y >= renderedZone.absoluteY &&
          point.y <= renderedZone.absoluteY + zone.height
        );
      });
  }

  function movePlacementIntoZone(placement: TablePlacement, renderedZone: RenderedZone) {
    const zone = renderedZone.zone;

    if (zone.childrenType === "zone") {
      return;
    }

    if (zone.source && !sourcesAreEqual(zone.source, placement.source)) {
      const replace = window.confirm(`Replace source for "${zone.name}"?`);

      if (!replace) {
        return;
      }
    }

    updateDraft((setup) => {
      const zones = updateZoneInTree(setup.zones, zone.id, (currentZone) => {
        if (currentZone.childrenType === "zone") {
          return currentZone;
        }

        return { ...currentZone, source: { ...placement.source } } as TableZone;
      });

      return {
        ...setup,
        placements: setup.placements.filter((item) => item.id !== placement.id),
        zones: clampZonesToBounds(zones, setup.width, setup.height, componentsById, collectionsById)
      };
    });
    setSelection({ id: zone.id, type: "zone" });
  }

  function updateZoneBackgroundImage(zone: TableZone, file: File | null) {
    if (!file) {
      updateZone(zone.id, { background: { type: "none" } } as Partial<TableZone>);
      return;
    }

    setEditorError(null);
    void readImageBackground(
      file,
      zone.background.type === "image" ? zone.background.fit : "cover"
    )
      .then((background) => {
        updateZone(zone.id, { background } as Partial<TableZone>);
      })
      .catch((error: unknown) => {
        setEditorError(error instanceof Error ? error.message : "Could not read image file");
      });
  }

  function saveLayout() {
    if (!draft) {
      return;
    }

    const validationError = getSetupSaveValidationError(draft);

    if (validationError) {
      setEditorError(validationError);
      return;
    }

    setEditorError(null);
    saveMutation.mutate(draft);
  }

  function removePlacement(id: string) {
    updateDraft((setup) => ({
      ...setup,
      placements: setup.placements.filter((placement) => placement.id !== id)
    }));
    setSelection((current) =>
      current?.type === "placement" && current.id === id ? null : current
    );
  }

  function removeZone(id: string) {
    updateDraft((setup) => {
      const zones = removeZoneFromTree(setup.zones, id);

      return {
        ...setup,
        zones: clampZonesToBounds(zones, setup.width, setup.height, componentsById, collectionsById)
      };
    });
    setSelection((current) => (current?.type === "zone" && current.id === id ? null : current));
  }

  function updateTableSize(patch: Partial<Pick<TableSetup, "height" | "width">>) {
    updateDraft((setup) => {
      const width = patch.width ?? setup.width;
      const height = patch.height ?? setup.height;
      const zones = clampZonesToBounds(setup.zones, width, height, componentsById, collectionsById);
      const placements = setup.placements.map((placement) => ({
        ...placement,
        x: clamp(placement.x, 0, width),
        y: clamp(placement.y, 0, height)
      }));

      return {
        ...setup,
        ...patch,
        placements,
        zones
      };
    });
  }

  function getTablePoint(event: Pick<PointerEvent | ReactPointerEvent | DragEvent, "clientX" | "clientY">) {
    const rect = surfaceRef.current?.getBoundingClientRect();

    if (!rect || !draft || rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      x: ((event.clientX - rect.left) / rect.width) * draft.width,
      y: ((event.clientY - rect.top) / rect.height) * draft.height
    };
  }

  function startPlacementDrag(event: ReactPointerEvent<HTMLElement>, placement: TablePlacement) {
    if (!draft) {
      return;
    }

    const startPoint = getTablePoint(event);

    if (!startPoint) {
      return;
    }

    const pointerId = event.pointerId;
    const target = event.currentTarget;
    const startPosition = { x: placement.x, y: placement.y };
    const pointerStartX = startPoint.x;
    const pointerStartY = startPoint.y;
    let didDrag = false;
    let currentDropZone: RenderedZone | undefined;

    event.preventDefault();
    event.stopPropagation();
    target.setPointerCapture(pointerId);
    setSelection({ id: placement.id, type: "placement" });

    function handlePointerMove(pointerEvent: PointerEvent) {
      const point = getTablePoint(pointerEvent);

      if (!point || !draft) {
        return;
      }

      const deltaX = point.x - pointerStartX;
      const deltaY = point.y - pointerStartY;

      if (!didDrag && Math.hypot(deltaX, deltaY) > 4) {
        didDrag = true;
        setActivePlacementDrag({ source: placement.source });
      }

      updatePlacement(placement.id, {
        x: Math.round(clamp(startPosition.x + deltaX, 0, draft.width)),
        y: Math.round(clamp(startPosition.y + deltaY, 0, draft.height))
      });
      currentDropZone = didDrag ? getDropZoneAtPoint(point, placement.source) : undefined;
      setDragHoverZoneId(currentDropZone?.zone.id ?? null);
    }

    function handlePointerEnd(pointerEvent: PointerEvent) {
      const point = getTablePoint(pointerEvent);
      const dropZone =
        didDrag && pointerEvent.type === "pointerup" && point
          ? getDropZoneAtPoint(point, placement.source)
          : currentDropZone;

      if (target.hasPointerCapture(pointerEvent.pointerId)) {
        target.releasePointerCapture(pointerEvent.pointerId);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      setActivePlacementDrag(null);
      setDragHoverZoneId(null);

      if (didDrag && pointerEvent.type === "pointerup" && dropZone) {
        movePlacementIntoZone(placement, dropZone);
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
  }

  function startZoneDrag(
    event: ReactPointerEvent<HTMLElement>,
    renderedZone: RenderedZone,
    mode: DragMode
  ) {
    if (!draft) {
      return;
    }

    const startPoint = getTablePoint(event);

    if (!startPoint) {
      return;
    }

    const zone = renderedZone.zone;
    const pointerId = event.pointerId;
    const target = event.currentTarget;
    const startZone = { ...zone };
    const pointerStartX = startPoint.x;
    const pointerStartY = startPoint.y;

    event.preventDefault();
    event.stopPropagation();
    setSelection({ id: zone.id, type: "zone" });

    if (mode === "move" && renderedZone.parentLayout !== "free") {
      return;
    }

    target.setPointerCapture(pointerId);

    function handlePointerMove(pointerEvent: PointerEvent) {
      const point = getTablePoint(pointerEvent);

      if (!point) {
        return;
      }

      const deltaX = point.x - pointerStartX;
      const deltaY = point.y - pointerStartY;

      if (mode === "resize") {
        updateZone(zone.id, {
          width: Math.round(
            clamp(
              startZone.width + deltaX,
              minZoneSizeMm,
              renderedZone.parentWidth - renderedZone.localX
            )
          ),
          height: Math.round(
            clamp(
              startZone.height + deltaY,
              minZoneSizeMm,
              renderedZone.parentHeight - renderedZone.localY
            )
          )
        } as Partial<TableZone>);
        return;
      }

      updateZone(zone.id, {
        x: Math.round(clamp(startZone.x + deltaX, 0, renderedZone.parentWidth - startZone.width)),
        y: Math.round(clamp(startZone.y + deltaY, 0, renderedZone.parentHeight - startZone.height))
      } as Partial<TableZone>);
    }

    function handlePointerEnd(pointerEvent: PointerEvent) {
      if (target.hasPointerCapture(pointerEvent.pointerId)) {
        target.releasePointerCapture(pointerEvent.pointerId);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
  }

  function handleSurfaceDrop(event: DragEvent<HTMLElement>) {
    if (!draft) {
      return;
    }

    const source = readDragSource(event) ?? activeDragSource;
    const point = getTablePoint(event);

    if (!source || !point) {
      return;
    }

    event.preventDefault();
    setActiveDragSource(null);
    setDragHoverZoneId(null);
    addPlacementFromSource(source, {
      x: Math.round(clamp(point.x, 0, draft.width)),
      y: Math.round(clamp(point.y, 0, draft.height))
    });
  }

  function handleZoneDrop(event: DragEvent<HTMLElement>, zone: TableZone) {
    const source = readDragSource(event) ?? activeDragSource;

    if (zone.childrenType === "zone" || (!source && !hasDragSource(event))) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setActiveDragSource(null);
    setDragHoverZoneId(null);

    if (!source || !sourceMatchesType(source, zone.childrenType, componentsById, collectionsById)) {
      return;
    }

    if (zone.source && !sourcesAreEqual(zone.source, source)) {
      const replace = window.confirm(`Replace source for "${zone.name}"?`);

      if (!replace) {
        return;
      }
    }

    updateZoneSource(zone, source);
  }

  function handleZoneDragOver(event: DragEvent<HTMLElement>, zone: TableZone) {
    const source = activeDragSource ?? readDragSource(event);

    if (zone.childrenType === "zone" || (!source && !hasDragSource(event))) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!source || sourceMatchesType(source, zone.childrenType, componentsById, collectionsById)) {
      setDragHoverZoneId(zone.id);
      return;
    }

    setDragHoverZoneId(null);
  }

  if (setupQuery.isLoading) {
    return (
      <Box className="table-setup-loading">
        <Text c="dimmed" ta="center">
          Loading table layout
        </Text>
      </Box>
    );
  }

  if (setupQuery.isError) {
    return (
      <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
        {getApiErrorMessage(setupQuery.error)}
      </Alert>
    );
  }

  if (!draft) {
    return (
      <Box className="table-setup-loading">
        <Text c="dimmed" ta="center">
          Loading table layout
        </Text>
      </Box>
    );
  }

  return (
    <Stack className="table-setup-root" gap="md">
      {editorError ? (
        <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
          {editorError}
        </Alert>
      ) : null}
      {!editorError && saveMutation.isError ? (
        <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
          {getApiErrorMessage(saveMutation.error)}
        </Alert>
      ) : null}

      <Box className="table-setup-workspace">
        <Box className="table-setup-column-header table-setup-summary-header">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon color="teal" radius={8} variant="light">
              <BoxSelect size={18} />
            </ThemeIcon>
            <Box>
              <Title order={2} size="h3">
                Table layout
              </Title>
              <Text c="dimmed" size="sm">
                {draft.placements.length} placements, {countZones(draft.zones)} zones
              </Text>
            </Box>
            {hasChanges ? (
              <Badge color="yellow" radius={8} variant="light">
                Unsaved
              </Badge>
            ) : null}
          </Group>
        </Box>

        <Box className="table-setup-column-header table-setup-controls-header">
          <Group className="table-setup-size-controls" gap="sm">
            <Group className="table-setup-zoom-controls" gap={4}>
              <Tooltip label="Zoom out" withArrow>
                <ActionIcon
                  aria-label="Zoom out table"
                  disabled={tableZoom <= minTableZoom}
                  radius={8}
                  size="lg"
                  variant="light"
                  onClick={() => updateTableZoom(-tableZoomStep)}
                >
                  <ZoomOut size={18} />
                </ActionIcon>
              </Tooltip>
              <Text
                aria-label="Table zoom"
                className="table-setup-zoom-value"
                fw={700}
                size="sm"
              >
                {formatZoom(tableZoom)}
              </Text>
              <Tooltip label="Zoom in" withArrow>
                <ActionIcon
                  aria-label="Zoom in table"
                  disabled={tableZoom >= maxTableZoom}
                  radius={8}
                  size="lg"
                  variant="light"
                  onClick={() => updateTableZoom(tableZoomStep)}
                >
                  <ZoomIn size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Fit to view" withArrow>
                <ActionIcon
                  aria-label="Fit table to view"
                  radius={8}
                  size="lg"
                  variant="light"
                  onClick={fitTableToViewport}
                >
                  <Maximize2 size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Reset zoom" withArrow>
                <ActionIcon
                  aria-label="Reset table zoom"
                  disabled={tableZoom === 1}
                  radius={8}
                  size="lg"
                  variant="light"
                  onClick={resetTableZoom}
                >
                  <RotateCcw size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <NumberInput
              allowDecimal={false}
              aria-label="Table width"
              label="Width (mm)"
              max={6000}
              min={300}
              size="xs"
              value={draft.width}
              w={120}
              onChange={(value) =>
                updateTableSize({ width: toNumberInputValue(value, draft.width) })
              }
            />
            <NumberInput
              allowDecimal={false}
              aria-label="Table height"
              label="Height (mm)"
              max={6000}
              min={300}
              size="xs"
              value={draft.height}
              w={120}
              onChange={(value) =>
                updateTableSize({ height: toNumberInputValue(value, draft.height) })
              }
            />
          </Group>
        </Box>

        <Box className="table-setup-column-header table-setup-actions-header">
          <Group align="flex-end" gap="sm" justify="flex-end" wrap="nowrap">
            <Menu position="bottom-end" shadow="md" width={190}>
              <Menu.Target>
                <Button
                  leftSection={<Plus size={16} />}
                  rightSection={<ChevronDown size={14} />}
                  radius={8}
                  variant="light"
                >
                  Add zone
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {zoneTypeOptions.map((option) => (
                  <Menu.Item key={option.value} onClick={() => addRootZone(option.value)}>
                    {option.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
            <Button
              disabled={!hasChanges}
              leftSection={<Save size={16} />}
              loading={saveMutation.isPending}
              radius={8}
              onClick={saveLayout}
            >
              Save layout
            </Button>
          </Group>
        </Box>

        <Box className="table-setup-library">
          <TableSetupLibrary
            collections={collections}
            components={components}
            componentsById={componentsById}
            onAddSource={addPlacementFromSource}
            onSourceDragEnd={() => {
              setActiveDragSource(null);
              setDragHoverZoneId(null);
            }}
            onSourceDragStart={setActiveDragSource}
          />
        </Box>

        <Box className="table-setup-stage">
          <Box
            ref={viewportRef}
            aria-label="Table setup viewport"
            className="table-setup-surface-shell"
          >
            <Box
              ref={surfaceRef}
              aria-label="Table setup surface"
              className="table-setup-surface"
              style={{
                aspectRatio: `${draft.width} / ${draft.height}`,
                minWidth: `${Math.round(minSurfaceWidthPx * tableZoom)}px`,
                width: `${tableZoom * 100}%`
              }}
              onDragOver={(event) => {
                if (activeDragSource || hasDragSource(event)) {
                  event.preventDefault();
                }
              }}
              onDrop={handleSurfaceDrop}
            >
              {renderedZones.map((renderedZone) => (
                <TableZoneView
                  key={renderedZone.zone.id}
                  collectionsById={collectionsById}
                  componentsById={componentsById}
                  dropEligible={
                    activeDropSource
                      ? canDropSourceOnZone(activeDropSource, renderedZone.zone)
                      : false
                  }
                  dropTarget={dragHoverZoneId === renderedZone.zone.id}
                  projectParameters={projectParameters}
                  renderedZone={renderedZone}
                  selected={selection?.type === "zone" && selection.id === renderedZone.zone.id}
                  setup={draft}
                  onDragLeave={() => setDragHoverZoneId(null)}
                  onDragOver={(event) => handleZoneDragOver(event, renderedZone.zone)}
                  onDrop={(event) => handleZoneDrop(event, renderedZone.zone)}
                  onPointerDown={(event, mode) => startZoneDrag(event, renderedZone, mode)}
                  onRemove={() => removeZone(renderedZone.zone.id)}
                  onSelect={() => setSelection({ id: renderedZone.zone.id, type: "zone" })}
                />
              ))}

              {draft.placements.map((placement) => (
                <TablePlacementView
                  key={placement.id}
                  collectionsById={collectionsById}
                  componentsById={componentsById}
                  placement={placement}
                  projectParameters={projectParameters}
                  selected={selection?.type === "placement" && selection.id === placement.id}
                  setup={draft}
                  onPointerDown={(event) => startPlacementDrag(event, placement)}
                  onRemove={() => removePlacement(placement.id)}
                  onRotate={(delta) =>
                    updatePlacement(placement.id, {
                      rotationDeg: normalizeDegrees(placement.rotationDeg + delta)
                    })
                  }
                  onSelect={() => setSelection({ id: placement.id, type: "placement" })}
                />
              ))}
            </Box>
          </Box>
        </Box>

        <Box className="table-setup-inspector">
          <TableSetupInspector
            collections={collections}
            collectionsById={collectionsById}
            components={components}
            componentsById={componentsById}
            placement={selectedPlacement}
            setup={draft}
            zone={selectedRenderedZone}
            onAddChildZone={addChildZone}
            onChangeZoneType={changeZoneType}
            onRemovePlacement={removePlacement}
            onRemoveZone={removeZone}
            onUpdatePlacement={updatePlacement}
            onUpdateZone={updateZone}
            onUpdateZoneBackgroundImage={updateZoneBackgroundImage}
            onUpdateZoneSource={updateZoneSource}
          />
        </Box>
      </Box>
    </Stack>
  );
}

function TableSetupLibrary({
  collections,
  components,
  componentsById,
  onAddSource,
  onSourceDragEnd,
  onSourceDragStart
}: {
  collections: ComponentCollection[];
  components: GameComponent[];
  componentsById: Map<string, GameComponent>;
  onAddSource: (source: TableSource) => void;
  onSourceDragEnd: () => void;
  onSourceDragStart: (source: TableSource) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredComponents = components.filter(
    (component) =>
      (filter === "all" || filter === component.type) &&
      itemMatchesQuery(component.name, component.tags, normalizedQuery)
  );
  const filteredCollections = collections.filter(
    (collection) =>
      (filter === "all" || filter === collection.type) &&
      itemMatchesQuery(collection.name, collection.tags, normalizedQuery)
  );

  return (
    <Stack className="table-setup-panel-content" gap="sm">
      <Group gap="sm">
        <ThemeIcon color="blue" radius={8} variant="light">
          <Layers size={18} />
        </ThemeIcon>
        <Box>
          <Title order={3} size="h4">
            Library
          </Title>
          <Text c="dimmed" size="sm">
            Components and collections
          </Text>
        </Box>
      </Group>

      <TextInput
        leftSection={<Search size={15} />}
        placeholder="Search"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      <Select
        allowDeselect={false}
        data={libraryFilterOptions}
        label="Filter"
        value={filter}
        onChange={(value) => setFilter((value ?? "all") as LibraryFilter)}
      />

      <ScrollArea className="table-setup-panel-scroll" type="auto">
        <Stack gap="md" pr="xs">
          <Stack gap="xs">
            <Text c="dimmed" fw={700} size="xs" tt="uppercase">
              Components
            </Text>
            {filteredComponents.map((component) => (
              <LibraryItemButton
                key={component.id}
                detail={componentTypeLabels[component.type]}
                preview={
                  <SourceVisual
                    compact
                    componentsById={componentsById}
                    source={{ kind: "component", componentId: component.id }}
                  />
                }
                source={{ kind: "component", componentId: component.id }}
                title={component.name}
                onAdd={() => onAddSource({ kind: "component", componentId: component.id })}
                onDragEnd={onSourceDragEnd}
                onDragStart={onSourceDragStart}
              />
            ))}
            {filteredComponents.length === 0 ? (
              <Text c="dimmed" size="sm">
                No matching components
              </Text>
            ) : null}
          </Stack>

          <Stack gap="xs">
            <Text c="dimmed" fw={700} size="xs" tt="uppercase">
              Collections
            </Text>
            {filteredCollections.map((collection) => (
              <LibraryItemButton
                key={collection.id}
                detail={`${collectionTypeLabels[collection.type]} - ${getCollectionQuantity(collection)} item${
                  getCollectionQuantity(collection) === 1 ? "" : "s"
                }`}
                preview={
                  <SourceVisual
                    compact
                    collectionsById={new Map(collections.map((item) => [item.id, item]))}
                    componentsById={componentsById}
                    source={{ kind: "collection", collectionId: collection.id }}
                  />
                }
                source={{ kind: "collection", collectionId: collection.id }}
                title={collection.name}
                onAdd={() => onAddSource({ kind: "collection", collectionId: collection.id })}
                onDragEnd={onSourceDragEnd}
                onDragStart={onSourceDragStart}
              />
            ))}
            {filteredCollections.length === 0 ? (
              <Text c="dimmed" size="sm">
                No matching collections
              </Text>
            ) : null}
          </Stack>
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

function LibraryItemButton({
  detail,
  onAdd,
  onDragEnd,
  onDragStart,
  preview,
  source,
  title
}: {
  detail: string;
  onAdd: () => void;
  onDragEnd: () => void;
  onDragStart: (source: TableSource) => void;
  preview: ReactNode;
  source: TableSource;
  title: string;
}) {
  return (
    <UnstyledButton
      aria-label={`Library item ${title}`}
      className="table-setup-library-item"
      draggable
      type="button"
      onClick={onAdd}
      onDragStart={(event) => {
        onDragStart(source);
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(libraryDragType, JSON.stringify(source));
        event.dataTransfer.setData("text/plain", JSON.stringify(source));
      }}
      onDragEnd={onDragEnd}
    >
      <Box className="table-setup-library-preview">{preview}</Box>
      <Box className="table-setup-library-item-text">
        <Text fw={600} size="sm">
          {title}
        </Text>
        <Text c="dimmed" size="xs">
          {detail}
        </Text>
      </Box>
      <Plus aria-hidden size={16} />
    </UnstyledButton>
  );
}

function TableZoneView({
  collectionsById,
  componentsById,
  dropEligible,
  dropTarget,
  onDragLeave,
  onDragOver,
  onDrop,
  onPointerDown,
  onRemove,
  onSelect,
  projectParameters,
  renderedZone,
  selected,
  setup
}: {
  collectionsById: Map<string, ComponentCollection>;
  componentsById: Map<string, GameComponent>;
  dropEligible: boolean;
  dropTarget: boolean;
  onDragLeave: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>, mode: DragMode) => void;
  onRemove: () => void;
  onSelect: () => void;
  projectParameters: ProjectParameter[];
  renderedZone: RenderedZone;
  selected: boolean;
  setup: TableSetup;
}) {
  const zone = renderedZone.zone;
  const zoneItems =
    zone.childrenType === "zone"
      ? []
      : materializeZoneItems(zone, componentsById, collectionsById).map((component, index) => ({
          component,
          point: getZoneItemPoint(zone, component, index)
        }));

  return (
    <Box
      aria-label={`Table zone ${zone.name}`}
      className="table-setup-zone"
      data-depth={renderedZone.depth}
      data-drop-eligible={dropEligible ? "true" : undefined}
      data-drop-target={dropTarget ? "true" : undefined}
      data-position-managed={renderedZone.parentLayout !== "free" ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      data-zone-type={zone.childrenType}
      style={{
        ...getZoneBackgroundStyle(zone.background),
        borderColor: zone.border.color,
        borderStyle: zone.border.width === 0 ? "none" : zone.childrenType === "zone" ? "dashed" : "solid",
        borderWidth: zone.border.width,
        height: `${(zone.height / setup.height) * 100}%`,
        left: `${(renderedZone.absoluteX / setup.width) * 100}%`,
        overflow: zone.overflow,
        top: `${(renderedZone.absoluteY / setup.height) * 100}%`,
        width: `${(zone.width / setup.width) * 100}%`
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onPointerDown={(event) => onPointerDown(event, "move")}
    >
      <Group className="table-setup-zone-label" gap={6}>
        <GripVertical size={14} />
        <Text fw={700} size="xs">
          {zone.name}
        </Text>
        <Badge color={zone.childrenType === "zone" ? "gray" : "teal"} radius={6} size="xs" variant="light">
          {zone.childrenType === "zone" ? zone.layout : zone.childrenType}
        </Badge>
      </Group>
      <Tooltip label="Delete zone" withArrow>
        <ActionIcon
          aria-label={`Delete zone ${zone.name}`}
          className="table-setup-zone-delete"
          color="red"
          radius={8}
          size="sm"
          variant="subtle"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Trash2 size={14} />
        </ActionIcon>
      </Tooltip>

      {zone.childrenType !== "zone" ? (
        <Box className="table-setup-zone-source-content">
          {zoneItems.length > 0 ? (
            zoneItems.map(({ component, point }, index) => (
              <Box
                key={`${component.id}-${index}`}
                className="table-setup-zone-item"
                style={{
                  left: `${(point.x / zone.width) * 100}%`,
                  top: `${(point.y / zone.height) * 100}%`
                }}
              >
                <ComponentVisual
                  component={component}
                  face={zone.face === "up" ? "front" : "back"}
                  projectParameters={projectParameters}
                />
              </Box>
            ))
          ) : (
            <Text className="table-setup-zone-empty-source" c="dimmed" size="xs">
              {zone.source ? "Autofill off" : "Drop source"}
            </Text>
          )}
        </Box>
      ) : null}

      {zone.size === "fixed" ? (
        <Box
          aria-label={`Resize zone ${zone.name}`}
          className="table-setup-zone-resize"
          onPointerDown={(event) => {
            event.stopPropagation();
            onPointerDown(event, "resize");
          }}
        />
      ) : null}
    </Box>
  );
}

function TablePlacementView({
  collectionsById,
  componentsById,
  onPointerDown,
  onRemove,
  onRotate,
  onSelect,
  placement,
  projectParameters,
  selected,
  setup
}: {
  collectionsById: Map<string, ComponentCollection>;
  componentsById: Map<string, GameComponent>;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onRemove: () => void;
  onRotate: (delta: number) => void;
  onSelect: () => void;
  placement: TablePlacement;
  projectParameters: ProjectParameter[];
  selected: boolean;
  setup: TableSetup;
}) {
  const label = getSourceName(placement.source, componentsById, collectionsById);

  return (
    <Box
      aria-label={`Placement ${label}`}
      className="table-setup-placement"
      data-selected={selected ? "true" : undefined}
      style={{
        left: `${(placement.x / setup.width) * 100}%`,
        top: `${(placement.y / setup.height) * 100}%`
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerDown={onPointerDown}
    >
      <Box className="table-setup-placement-content">
        <Box
          className="table-setup-placement-body"
          style={{
            transform: `rotate(${placement.rotationDeg}deg)`
          }}
        >
          <SourceVisual
            collectionsById={collectionsById}
            componentsById={componentsById}
            face={placement.face}
            projectParameters={projectParameters}
            source={placement.source}
          />
        </Box>
        <Text className="table-setup-placement-label" size="xs">
          {label}
        </Text>
      </Box>
      <Group className="table-setup-placement-actions" gap={4}>
        <Tooltip label="Rotate" withArrow>
          <ActionIcon
            aria-label={`Rotate ${label}`}
            radius={8}
            size="sm"
            variant="filled"
            onClick={(event) => {
              event.stopPropagation();
              onRotate(15);
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <RotateCw size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete placement" withArrow>
          <ActionIcon
            aria-label={`Delete placement ${label}`}
            color="red"
            radius={8}
            size="sm"
            variant="filled"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Trash2 size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
}

function TableSetupInspector({
  collections,
  collectionsById,
  components,
  componentsById,
  onAddChildZone,
  onChangeZoneType,
  onRemovePlacement,
  onRemoveZone,
  onUpdatePlacement,
  onUpdateZone,
  onUpdateZoneBackgroundImage,
  onUpdateZoneSource,
  placement,
  setup,
  zone
}: {
  collections: ComponentCollection[];
  collectionsById: Map<string, ComponentCollection>;
  components: GameComponent[];
  componentsById: Map<string, GameComponent>;
  onAddChildZone: (parentId: string, childrenType: ZoneChildType) => void;
  onChangeZoneType: (zone: TableZone, childrenType: ZoneChildType) => void;
  onRemovePlacement: (id: string) => void;
  onRemoveZone: (id: string) => void;
  onUpdatePlacement: (id: string, patch: Partial<TablePlacement>) => void;
  onUpdateZone: (id: string, patch: Partial<TableZone>) => void;
  onUpdateZoneBackgroundImage: (zone: TableZone, file: File | null) => void;
  onUpdateZoneSource: (zone: ZoneSource, source: TableSource | undefined) => void;
  placement?: TablePlacement;
  setup: TableSetup;
  zone?: RenderedZone;
}) {
  if (placement) {
    const label = getSourceName(placement.source, componentsById, collectionsById);

    return (
      <Stack gap="md">
        <Box>
          <Title order={3} size="h4">
            Placement
          </Title>
          <Text c="dimmed" size="sm">
            {label}
          </Text>
        </Box>
        <Box>
          <Text fw={600} mb={6} size="sm">
            Face
          </Text>
          <SegmentedControl
            data={placementFaceOptions}
            fullWidth
            value={placement.face}
            onChange={(value) =>
              onUpdatePlacement(placement.id, { face: value as TablePlacementFace })
            }
          />
        </Box>
        <SimpleGrid cols={2}>
          <NumberInput
            aria-label="X"
            allowDecimal={false}
            label="X (mm)"
            min={0}
            value={placement.x}
            onChange={(value) =>
              onUpdatePlacement(placement.id, {
                x: clamp(toNumberInputValue(value, placement.x), 0, setup.width)
              })
            }
          />
          <NumberInput
            aria-label="Y"
            allowDecimal={false}
            label="Y (mm)"
            min={0}
            value={placement.y}
            onChange={(value) =>
              onUpdatePlacement(placement.id, {
                y: clamp(toNumberInputValue(value, placement.y), 0, setup.height)
              })
            }
          />
        </SimpleGrid>
        <NumberInput
          allowDecimal={false}
          label="Rotation"
          value={placement.rotationDeg}
          onChange={(value) =>
            onUpdatePlacement(placement.id, {
              rotationDeg: normalizeDegrees(toNumberInputValue(value, placement.rotationDeg))
            })
          }
        />
        <Group gap="xs">
          <Button
            leftSection={<RotateCcw size={14} />}
            radius={8}
            variant="light"
            onClick={() =>
              onUpdatePlacement(placement.id, {
                rotationDeg: normalizeDegrees(placement.rotationDeg - 15)
              })
            }
          >
            -15
          </Button>
          <Button
            leftSection={<RotateCw size={14} />}
            radius={8}
            variant="light"
            onClick={() =>
              onUpdatePlacement(placement.id, {
                rotationDeg: normalizeDegrees(placement.rotationDeg + 15)
              })
            }
          >
            +15
          </Button>
        </Group>
        <Button
          color="red"
          leftSection={<Trash2 size={16} />}
          radius={8}
          variant="light"
          onClick={() => onRemovePlacement(placement.id)}
        >
          Delete placement
        </Button>
      </Stack>
    );
  }

  if (zone) {
    const item = zone.zone;
    const sourceZone = item.childrenType === "zone" ? null : item;
    const sourceOptions = sourceZone
      ? [
          { label: "No source", value: noSourceOption },
          ...components
            .filter((component) => component.type === sourceZone.childrenType)
            .map((component) => ({
              label: `${component.name} (${componentTypeLabels[component.type]})`,
              value: sourceToSelectValue({ kind: "component", componentId: component.id })
            })),
          ...collections
            .filter((collection) =>
              collectionMatchesZone(collection, sourceZone.childrenType, componentsById)
            )
            .map((collection) => ({
              label: `${collection.name} (${collectionTypeLabels[collection.type]})`,
              value: sourceToSelectValue({ kind: "collection", collectionId: collection.id })
            }))
        ]
      : [];
    const backgroundType = item.background.type;
    const showPositionFields = zone.parentLayout === "free";
    const showSizeFields = item.size === "fixed";
    const showCapacityFields = sourceZone !== null;

    return (
      <Stack gap="md">
        <Box>
          <Title order={3} size="h4">
            Zone
          </Title>
          <Text c="dimmed" size="sm">
            {item.childrenType === "zone" ? "Container" : `${componentTypeLabels[item.childrenType]} source`}
          </Text>
        </Box>
        <Select
          allowDeselect={false}
          data={zoneTypeOptions}
          label="Zone type"
          value={item.childrenType}
          onChange={(value) => onChangeZoneType(item, (value ?? "zone") as ZoneChildType)}
        />
        <TextInput
          label="Zone name"
          value={item.name}
          onChange={(event) => onUpdateZone(item.id, { name: event.currentTarget.value } as Partial<TableZone>)}
        />
        <Textarea
          label="Description"
          minRows={2}
          value={item.description}
          onChange={(event) =>
            onUpdateZone(item.id, { description: event.currentTarget.value } as Partial<TableZone>)
          }
        />
        {showPositionFields || showSizeFields ? (
          <SimpleGrid cols={2}>
            {showPositionFields ? (
              <>
                <NumberInput
                  aria-label="Zone X"
                  allowDecimal={false}
                  label="Zone X (mm)"
                  min={0}
                  value={item.x}
                  onChange={(value) =>
                    onUpdateZone(item.id, {
                      x: clamp(toNumberInputValue(value, item.x), 0, zone.parentWidth - item.width)
                    } as Partial<TableZone>)
                  }
                />
                <NumberInput
                  aria-label="Zone Y"
                  allowDecimal={false}
                  label="Zone Y (mm)"
                  min={0}
                  value={item.y}
                  onChange={(value) =>
                    onUpdateZone(item.id, {
                      y: clamp(toNumberInputValue(value, item.y), 0, zone.parentHeight - item.height)
                    } as Partial<TableZone>)
                  }
                />
              </>
            ) : null}
            {showSizeFields ? (
              <>
                <NumberInput
                  aria-label="Zone width"
                  allowDecimal={false}
                  label="Zone width (mm)"
                  min={20}
                  value={item.width}
                  onChange={(value) =>
                    onUpdateZone(item.id, {
                      width: clamp(
                        toNumberInputValue(value, item.width),
                        20,
                        zone.parentWidth - zone.localX
                      )
                    } as Partial<TableZone>)
                  }
                />
                <NumberInput
                  aria-label="Zone height"
                  allowDecimal={false}
                  label="Zone height (mm)"
                  min={20}
                  value={item.height}
                  onChange={(value) =>
                    onUpdateZone(item.id, {
                      height: clamp(
                        toNumberInputValue(value, item.height),
                        20,
                        zone.parentHeight - zone.localY
                      )
                    } as Partial<TableZone>)
                  }
                />
              </>
            ) : null}
          </SimpleGrid>
        ) : null}
        <Select
          allowDeselect={false}
          data={zoneLayoutOptions}
          label="Layout"
          value={item.layout}
          onChange={(value) =>
            onUpdateZone(item.id, getZoneLayoutPatch(item, (value ?? "free") as ZoneLayout))
          }
        />
        <SimpleGrid cols={2}>
          <NumberInput
            allowDecimal={false}
            label="Padding (mm)"
            min={0}
            value={item.padding}
            onChange={(value) =>
              onUpdateZone(item.id, {
                padding: Math.max(0, toNumberInputValue(value, item.padding))
              } as Partial<TableZone>)
            }
          />
          {item.layout === "row" || item.layout === "grid" ? (
            <NumberInput
              allowDecimal={false}
              label="Gap (mm)"
              min={0}
              value={item.gap ?? 0}
              onChange={(value) =>
                onUpdateZone(item.id, {
                  gap: Math.max(0, toNumberInputValue(value, item.gap ?? 0))
                } as Partial<TableZone>)
              }
            />
          ) : null}
          {item.layout === "grid" ? (
            <NumberInput
              allowDecimal={false}
              label="Columns"
              min={1}
              value={item.columns ?? 1}
              onChange={(value) =>
                onUpdateZone(item.id, {
                  columns: Math.max(1, toNumberInputValue(value, item.columns ?? 1))
                } as Partial<TableZone>)
              }
            />
          ) : null}
          {showCapacityFields && item.capacity !== null ? (
            <NumberInput
              allowDecimal={false}
              label="Capacity"
              max={25}
              min={1}
              value={item.capacity}
              onChange={(value) =>
                onUpdateZone(item.id, {
                  capacity: Math.max(1, toNumberInputValue(value, item.capacity ?? 1))
                } as Partial<TableZone>)
              }
            />
          ) : null}
        </SimpleGrid>
        {showCapacityFields ? (
          <Checkbox
            checked={item.capacity !== null}
            label="Limit capacity"
            onChange={(event) =>
              onUpdateZone(item.id, {
                capacity: event.currentTarget.checked ? 1 : null
              } as Partial<TableZone>)
            }
          />
        ) : null}
        <Box>
          <Text fw={600} mb={6} size="sm">
            Size
          </Text>
          <SegmentedControl
            data={zoneSizeOptions}
            fullWidth
            value={item.size}
            onChange={(value) =>
              onUpdateZone(item.id, {
                size: value as ZoneSizeMode,
                overflow: value === "auto" ? "visible" : item.overflow
              } as Partial<TableZone>)
            }
          />
        </Box>
        {item.size === "fixed" ? (
          <Box>
            <Text fw={600} mb={6} size="sm">
              Overflow
            </Text>
            <SegmentedControl
              data={zoneOverflowOptions}
              fullWidth
              value={item.overflow}
              onChange={(value) =>
                onUpdateZone(item.id, { overflow: value as ZoneOverflowMode } as Partial<TableZone>)
              }
            />
          </Box>
        ) : null}
        <Select
          allowDeselect={false}
          data={zoneVisibilityOptions}
          label="Visibility"
          value={item.visibility}
          onChange={(value) =>
            onUpdateZone(item.id, {
              visibility: (value ?? "all") as ZoneVisibility
            } as Partial<TableZone>)
          }
        />

        {sourceZone ? (
          <>
            <Select
              allowDeselect={false}
              data={sourceOptions}
              label="Source"
              value={sourceZone.source ? sourceToSelectValue(sourceZone.source) : noSourceOption}
              onChange={(value) =>
                onUpdateZoneSource(
                  sourceZone,
                  value && value !== noSourceOption ? selectValueToSource(value) : undefined
                )
              }
            />
            <Box>
              <Text fw={600} mb={6} size="sm">
                Face
              </Text>
              <SegmentedControl
                data={zoneSourceFaceOptions}
                fullWidth
                value={sourceZone.face}
                onChange={(value) =>
                  onUpdateZone(item.id, { face: value as ZoneSourceFace } as Partial<TableZone>)
                }
              />
            </Box>
            <Checkbox
              checked={sourceZone.autofill}
              label="Autofill from source"
              onChange={(event) =>
                onUpdateZone(item.id, {
                  autofill: event.currentTarget.checked
                } as Partial<TableZone>)
              }
            />
          </>
        ) : (
          <Menu position="bottom-start" shadow="md" width={190}>
            <Menu.Target>
              <Button
                leftSection={<Plus size={16} />}
                rightSection={<ChevronDown size={14} />}
                radius={8}
                variant="light"
              >
                Add child zone
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {zoneTypeOptions.map((option) => (
                <Menu.Item
                  key={option.value}
                  onClick={() => onAddChildZone(item.id, option.value)}
                >
                  {option.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        )}

        <SimpleGrid cols={2}>
          <NumberInput
            allowDecimal={false}
            label="Border width"
            min={0}
            value={item.border.width}
            onChange={(value) =>
              onUpdateZone(item.id, {
                border: { ...item.border, width: Math.max(0, toNumberInputValue(value, item.border.width)) }
              } as Partial<TableZone>)
            }
          />
          <ColorInput
            format="hex"
            label="Border color"
            value={item.border.color}
            onChange={(value) =>
              onUpdateZone(item.id, {
                border: { ...item.border, color: value || item.border.color }
              } as Partial<TableZone>)
            }
          />
        </SimpleGrid>
        <Select
          allowDeselect={false}
          data={backgroundTypeOptions}
          label="Background"
          value={backgroundType}
          onChange={(value) =>
            onUpdateZone(item.id, {
              background: createBackgroundForType((value ?? "none") as ZoneBackground["type"], item.background)
            } as Partial<TableZone>)
          }
        />
        {item.background.type === "color" ? (
          <ColorInput
            format="hex"
            label="Background color"
            placeholder={defaultZoneBackgroundColor}
            value={item.background.color}
            onChange={(value) =>
              onUpdateZone(item.id, {
                background: { type: "color", color: value || defaultZoneBackgroundColor }
              } as Partial<TableZone>)
            }
          />
        ) : null}
        {item.background.type === "image" ? (
          <>
            <FileInput
              accept="image/*"
              clearable
              description={item.background.fileName || undefined}
              label="Background image"
              placeholder={item.background.fileName || "Choose image"}
              value={null}
              onChange={(file) => onUpdateZoneBackgroundImage(item, file)}
            />
            <Select
              allowDeselect={false}
              data={imageFitOptions}
              label="Image fit"
              value={item.background.fit}
              onChange={(value) =>
                onUpdateZone(item.id, {
                  background: {
                    ...item.background,
                    fit: (value ?? "cover") as ZoneBackgroundImageFit
                  }
                } as Partial<TableZone>)
              }
            />
          </>
        ) : null}

        <Button
          color="red"
          leftSection={<Trash2 size={16} />}
          radius={8}
          variant="light"
          onClick={() => onRemoveZone(item.id)}
        >
          Delete zone
        </Button>
      </Stack>
    );
  }

  return (
    <Box className="table-setup-empty">
      <Text c="dimmed" size="sm" ta="center">
        Select a placement or zone
      </Text>
    </Box>
  );
}

function SourceVisual({
  collectionsById,
  compact = false,
  componentsById,
  face = "front",
  projectParameters = [],
  source
}: {
  collectionsById?: Map<string, ComponentCollection>;
  compact?: boolean;
  componentsById: Map<string, GameComponent>;
  face?: TablePlacementFace;
  projectParameters?: ProjectParameter[];
  source: TableSource;
}) {
  if (source.kind === "component") {
    const component = componentsById.get(source.componentId);

    return component ? (
      <ComponentVisual
        compact={compact}
        component={component}
        face={face}
        projectParameters={projectParameters}
      />
    ) : (
      <MissingVisual />
    );
  }

  const collection = collectionsById?.get(source.collectionId);

  if (!collection) {
    return <MissingVisual />;
  }

  if (collection.type === "deck") {
    const card = getLargestCollectionComponent(collection, componentsById, "card");

    return card ? (
      <ComponentVisual
        compact={compact}
        component={card}
        face={face}
        projectParameters={projectParameters}
      />
    ) : (
      <CollectionMarker collection={collection} />
    );
  }

  if (collection.type === "bag") {
    const hasTile = collection.items.some(
      (item) => componentsById.get(item.componentId)?.type === "tile"
    );

    return <BagMarker collection={collection} shape={hasTile ? "square" : "circle"} />;
  }

  return <CollectionMarker collection={collection} />;
}

function ComponentVisual({
  compact = true,
  component,
  face,
  projectParameters
}: {
  compact?: boolean;
  component: GameComponent;
  face: TablePlacementFace;
  projectParameters: ProjectParameter[];
}) {
  if (component.type === "card") {
    return (
      <CardPreview
        compact={compact}
        fieldValues={component.fieldValues}
        layout={component.layout}
        projectParameters={projectParameters}
        showHeader={false}
        side={face}
      />
    );
  }

  if (component.type === "tile") {
    return (
      <TilePreview
        compact={compact}
        fieldValues={component.fieldValues}
        layout={component.layout}
        projectParameters={projectParameters}
        selectedSideId={face}
        showHeader={false}
        showSideTabs={false}
      />
    );
  }

  if (component.type === "piece") {
    const faceId =
      face === "back"
        ? (component.layout.faces[1]?.id ?? component.layout.faces[0]?.id)
        : component.layout.faces[0]?.id;

    return (
      <PiecePreview
        compact={compact}
        fieldValues={component.fieldValues}
        layout={component.layout}
        projectParameters={projectParameters}
        selectedFaceId={faceId}
        showFaceTabs={false}
        showHeader={false}
      />
    );
  }

  return (
    <Box className="table-setup-die-visual">
      <Dice5 size={28} />
      <Text fw={800}>{component.sides}</Text>
    </Box>
  );
}

function BagMarker({
  collection,
  shape
}: {
  collection: ComponentCollection;
  shape: "circle" | "square";
}) {
  return (
    <Box className="table-setup-bag-visual" data-shape={shape}>
      {shape === "square" ? <Square size={28} /> : <Circle size={28} />}
      <Text fw={800} size="xs">
        {getCollectionQuantity(collection)}
      </Text>
    </Box>
  );
}

function CollectionMarker({ collection }: { collection: ComponentCollection }) {
  return (
    <Box className="table-setup-collection-visual">
      <Package size={28} />
      <Text fw={800} size="xs">
        {getCollectionQuantity(collection)}
      </Text>
    </Box>
  );
}

function MissingVisual() {
  return (
    <Box className="table-setup-missing-visual">
      <AlertTriangle size={24} />
    </Box>
  );
}

function createDefaultTableZone({
  childrenType,
  existingZones,
  height,
  id,
  name,
  width,
  x,
  y
}: {
  childrenType: ZoneChildType;
  existingZones: TableZone[];
  height: number;
  id: string;
  name: string;
  width: number;
  x: number;
  y: number;
}): TableZone {
  const uniqueName = getUniqueZoneName(name, existingZones);
  const base = {
    id,
    name: uniqueName,
    description: "",
    x,
    y,
    width,
    height,
    padding: 8,
    size: "fixed" as ZoneSizeMode,
    overflow: "hidden" as ZoneOverflowMode,
    capacity: null,
    layout: "free" as ZoneLayout,
    visibility: "all" as ZoneVisibility,
    background: { type: "color", color: defaultZoneBackgroundColor } as ZoneBackground,
    border: { width: 1, color: "#0e7490" }
  };

  return createZoneForType(childrenType, base);
}

function createZoneForType(
  childrenType: ZoneChildType,
  base: Omit<TableZone, "autofill" | "children" | "childrenType" | "face" | "source">
): TableZone {
  if (childrenType === "zone") {
    return {
      ...base,
      childrenType: "zone",
      children: []
    };
  }

  return {
    ...base,
    autofill: true,
    childrenType,
    face: "up"
  };
}

function getZoneBase(
  zone: TableZone
): Omit<TableZone, "autofill" | "children" | "childrenType" | "face" | "source"> {
  return {
    id: zone.id,
    name: zone.name,
    description: zone.description,
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
    padding: zone.padding,
    size: zone.size,
    overflow: zone.overflow,
    capacity: zone.capacity,
    layout: zone.layout,
    ...(zone.gap !== undefined ? { gap: zone.gap } : {}),
    ...(zone.columns !== undefined ? { columns: zone.columns } : {}),
    visibility: zone.visibility,
    background: { ...zone.background },
    border: { ...zone.border }
  };
}

function updateZoneInTree(
  zones: TableZone[],
  zoneId: string,
  updater: (zone: TableZone) => TableZone
): TableZone[] {
  return zones.map((zone) => {
    if (zone.id === zoneId) {
      return updater(zone);
    }

    if (zone.childrenType === "zone") {
      return {
        ...zone,
        children: updateZoneInTree(zone.children, zoneId, updater)
      };
    }

    return zone;
  });
}

function removeZoneFromTree(zones: TableZone[], zoneId: string): TableZone[] {
  return zones
    .filter((zone) => zone.id !== zoneId)
    .map((zone) =>
      zone.childrenType === "zone"
        ? { ...zone, children: removeZoneFromTree(zone.children, zoneId) }
        : zone
    );
}

function clampZonesToBounds(
  zones: TableZone[],
  parentWidth: number,
  parentHeight: number,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
): TableZone[] {
  return zones.map((zone) => {
    const width = Math.min(Math.max(minZoneSizeMm, zone.width), parentWidth);
    const height = Math.min(Math.max(minZoneSizeMm, zone.height), parentHeight);
    const x = clamp(zone.x, 0, Math.max(0, parentWidth - width));
    const y = clamp(zone.y, 0, Math.max(0, parentHeight - height));
    let bounded = { ...zone, height, width, x, y } as TableZone;

    if (bounded.childrenType === "zone") {
      const childParentWidth =
        bounded.size === "auto" ? Math.max(minZoneSizeMm, parentWidth - bounded.x) : bounded.width;
      const childParentHeight =
        bounded.size === "auto" ? Math.max(minZoneSizeMm, parentHeight - bounded.y) : bounded.height;

      bounded = {
        ...bounded,
        children: clampZonesToBounds(
          bounded.children,
          childParentWidth,
          childParentHeight,
          componentsById,
          collectionsById
        )
      };
    }

    const resized = applyAutoZoneSize(bounded, componentsById, collectionsById);
    const finalZone = {
      ...resized,
      width: Math.min(resized.width, Math.max(minZoneSizeMm, parentWidth - resized.x)),
      height: Math.min(resized.height, Math.max(minZoneSizeMm, parentHeight - resized.y))
    };

    return finalZone.childrenType === "zone"
      ? {
          ...finalZone,
          children: clampZonesToBounds(
            finalZone.children,
            finalZone.width,
            finalZone.height,
            componentsById,
            collectionsById
          )
        }
      : finalZone;
  });
}

function applyAutoZoneSize(
  zone: TableZone,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
): TableZone {
  if (zone.size !== "auto") {
    return zone;
  }

  const size = getAutoZoneSize(zone, componentsById, collectionsById);

  if (!size) {
    return zone;
  }

  return {
    ...zone,
    width: Math.round(Math.max(minZoneSizeMm, size.width)),
    height: Math.round(Math.max(minZoneSizeMm, size.height)),
    overflow: "visible"
  };
}

function getAutoZoneSize(
  zone: TableZone,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
): TableSize | null {
  if (zone.childrenType === "zone") {
    return getAutoContainerZoneSize(zone);
  }

  return getAutoSourceZoneSize(zone, componentsById, collectionsById);
}

function getAutoContainerZoneSize(
  zone: Extract<TableZone, { childrenType: "zone" }>
): TableSize {
  const padding = zone.padding;
  const gap = zone.gap ?? 0;

  if (zone.children.length === 0) {
    return {
      height: padding * 2,
      width: padding * 2
    };
  }

  if (zone.layout === "free") {
    return {
      height: Math.max(...zone.children.map((child) => child.y + child.height)) + padding,
      width: Math.max(...zone.children.map((child) => child.x + child.width)) + padding
    };
  }

  if (zone.layout === "row") {
    return {
      height: Math.max(...zone.children.map((child) => child.height)) + padding * 2,
      width:
        zone.children.reduce((sum, child) => sum + child.width, 0) +
        gap * Math.max(0, zone.children.length - 1) +
        padding * 2
    };
  }

  if (zone.layout === "grid") {
    const columns = Math.max(1, zone.columns ?? zone.children.length);
    const rows = Math.max(1, Math.ceil(zone.children.length / columns));
    const cellSize = getContainerGridCellSize(zone.children);

    return {
      height: cellSize.height * rows + gap * (rows - 1) + padding * 2,
      width: cellSize.width * columns + gap * (columns - 1) + padding * 2
    };
  }

  return {
    height:
      Math.max(...zone.children.map((child, index) => child.height + index * 2)) + padding * 2,
    width: Math.max(...zone.children.map((child, index) => child.width + index * 2)) + padding * 2
  };
}

function getAutoSourceZoneSize(
  zone: ZoneSource,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
): TableSize | null {
  const sourceSize = getZoneSourceItemSize(zone, componentsById, collectionsById);

  if (!sourceSize) {
    return null;
  }

  const quantity = getAutoZoneSlotCount(zone, componentsById, collectionsById);
  const gap = zone.gap ?? 0;
  const padding = zone.padding;

  if (zone.layout === "row") {
    return {
      height: sourceSize.height + padding * 2,
      width: sourceSize.width * quantity + gap * (quantity - 1) + padding * 2
    };
  }

  if (zone.layout === "grid") {
    const columns = Math.max(1, zone.columns ?? quantity);
    const rows = Math.max(1, Math.ceil(quantity / columns));

    return {
      height: sourceSize.height * rows + gap * (rows - 1) + padding * 2,
      width: sourceSize.width * columns + gap * (columns - 1) + padding * 2
    };
  }

  return {
    height: sourceSize.height + padding * 2,
    width: sourceSize.width + padding * 2
  };
}

function getZoneSourceItemSize(
  zone: ZoneSource,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
): TableSize | null {
  const component =
    zone.source?.kind === "component" ? componentsById.get(zone.source.componentId) : undefined;

  if (component) {
    return getComponentTableSize(component);
  }

  const collection =
    zone.source?.kind === "collection" ? collectionsById.get(zone.source.collectionId) : undefined;

  if (!collection) {
    return null;
  }

  return getCollectionTableSize(collection, componentsById);
}

function getAutoZoneSlotCount(
  zone: ZoneSource,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
) {
  if (zone.capacity !== null) {
    return zone.capacity;
  }

  return Math.max(1, getZoneRenderQuantity(zone, componentsById, collectionsById));
}

function materializeZoneItems(
  zone: ZoneSource,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
) {
  if (!zone.autofill || !zone.source) {
    return [];
  }

  const components: GameComponent[] = [];

  if (zone.source.kind === "component") {
    const component = componentsById.get(zone.source.componentId);
    if (component && component.type === zone.childrenType) {
      components.push(component);
    }
  } else {
    const collection = collectionsById.get(zone.source.collectionId);

    for (const item of collection?.items ?? []) {
      const component = componentsById.get(item.componentId);

      if (!component || component.type !== zone.childrenType) {
        continue;
      }

      for (let index = 0; index < item.quantity; index += 1) {
        components.push(component);
      }
    }
  }

  return components.slice(0, zone.capacity ?? components.length);
}

function getZoneRenderQuantity(
  zone: ZoneSource,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
) {
  return materializeZoneItems(zone, componentsById, collectionsById).length;
}

function getZoneItemPoint(zone: ZoneSource, component: GameComponent, index: number): TablePoint {
  const itemSize = getComponentTableSize(component);
  const padding = zone.padding;
  const gap = zone.gap ?? 0;

  if (zone.layout === "row") {
    return {
      x: Math.round(clamp(padding + index * (itemSize.width + gap), 0, zone.width)),
      y: Math.round(clamp(padding, 0, zone.height))
    };
  }

  if (zone.layout === "grid") {
    const columns = Math.max(1, zone.columns ?? zone.capacity ?? 1);
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      x: Math.round(clamp(padding + column * (itemSize.width + gap), 0, zone.width)),
      y: Math.round(clamp(padding + row * (itemSize.height + gap), 0, zone.height))
    };
  }

  return {
    x: Math.round(clamp(padding + index * 2, 0, zone.width)),
    y: Math.round(clamp(padding + index * 2, 0, zone.height))
  };
}

function getContainerChildPoint(
  container: Extract<TableZone, { childrenType: "zone" }>,
  child: TableZone,
  index: number
): TablePoint {
  const padding = container.padding;
  const gap = container.gap ?? 0;
  const maxX = Math.max(0, container.width - child.width);
  const maxY = Math.max(0, container.height - child.height);

  if (container.layout === "free") {
    return {
      x: Math.round(clamp(child.x, 0, maxX)),
      y: Math.round(clamp(child.y, 0, maxY))
    };
  }

  if (container.layout === "row") {
    const x = container.children
      .slice(0, index)
      .reduce((sum, previousChild) => sum + previousChild.width + gap, padding);

    return {
      x: Math.round(clamp(x, 0, maxX)),
      y: Math.round(clamp(padding, 0, maxY))
    };
  }

  if (container.layout === "grid") {
    const columns = Math.max(1, container.columns ?? container.children.length);
    const cellSize = getContainerGridCellSize(container.children);
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      x: Math.round(clamp(padding + column * (cellSize.width + gap), 0, maxX)),
      y: Math.round(clamp(padding + row * (cellSize.height + gap), 0, maxY))
    };
  }

  return {
    x: Math.round(clamp(padding + index * 2, 0, maxX)),
    y: Math.round(clamp(padding + index * 2, 0, maxY))
  };
}

function getContainerGridCellSize(children: TableZone[]): TableSize {
  return children.reduce(
    (size, child) => ({
      height: Math.max(size.height, child.height),
      width: Math.max(size.width, child.width)
    }),
    { height: minZoneSizeMm, width: minZoneSizeMm }
  );
}

function flattenRenderedZones(
  zones: TableZone[],
  parentAbsoluteX: number,
  parentAbsoluteY: number,
  parentWidth: number,
  parentHeight: number,
  depth: number,
  parentContainer?: Extract<TableZone, { childrenType: "zone" }>
): RenderedZone[] {
  return zones.flatMap((zone, index) => {
    const point = parentContainer
      ? getContainerChildPoint(parentContainer, zone, index)
      : { x: zone.x, y: zone.y };
    const parentLayout = parentContainer?.layout ?? "free";
    const rendered = {
      absoluteX: parentAbsoluteX + point.x,
      absoluteY: parentAbsoluteY + point.y,
      depth,
      localX: point.x,
      localY: point.y,
      parentLayout,
      parentHeight,
      parentWidth,
      zone
    };

    if (zone.childrenType !== "zone") {
      return [rendered];
    }

    return [
      rendered,
      ...flattenRenderedZones(
        zone.children,
        rendered.absoluteX,
        rendered.absoluteY,
        zone.width,
        zone.height,
        depth + 1,
        zone
      )
    ];
  });
}

function getZoneLayoutPatch(zone: TableZone, layout: ZoneLayout): Partial<TableZone> {
  if (layout === "free" || layout === "stack") {
    return { layout, gap: undefined, columns: undefined } as Partial<TableZone>;
  }

  if (layout === "row") {
    return { layout, gap: zone.gap ?? 8, columns: undefined } as Partial<TableZone>;
  }

  return { layout, gap: zone.gap ?? 8, columns: zone.columns ?? 3 } as Partial<TableZone>;
}

function getSetupSaveValidationError(setup: TableSetup) {
  const invalidImageZone = findInvalidBackgroundImageZone(setup.zones);

  if (invalidImageZone) {
    return `Choose a background image for "${invalidImageZone.name}" before saving`;
  }

  return null;
}

function findInvalidBackgroundImageZone(zones: TableZone[]): TableZone | null {
  for (const zone of zones) {
    if (zone.background.type === "image" && !zone.background.dataUrl) {
      return zone;
    }

    if (zone.childrenType === "zone") {
      const invalidChild = findInvalidBackgroundImageZone(zone.children);

      if (invalidChild) {
        return invalidChild;
      }
    }
  }

  return null;
}

function getComponentTableSize(component: GameComponent): TableSize {
  if (component.type === "card") {
    return {
      height: component.layout.size.heightMm,
      width: component.layout.size.widthMm
    };
  }

  if (component.type === "tile") {
    return {
      height: component.layout.sizeMm.heightMm,
      width: component.layout.sizeMm.widthMm
    };
  }

  if (component.type === "piece") {
    return {
      height: component.layout.sizeMm.heightMm,
      width: component.layout.sizeMm.widthMm
    };
  }

  return {
    height: 20,
    width: 20
  };
}

function getCollectionTableSize(
  collection: ComponentCollection,
  componentsById: Map<string, GameComponent>
): TableSize | null {
  const itemSizes = collection.items
    .map((item) => {
      const component = componentsById.get(item.componentId);
      return component ? getComponentTableSize(component) : null;
    })
    .filter((size): size is TableSize => size !== null);

  if (itemSizes.length === 0) {
    return null;
  }

  return {
    height: Math.max(...itemSizes.map((size) => size.height)),
    width: Math.max(...itemSizes.map((size) => size.width))
  };
}

function getLargestCollectionComponent(
  collection: ComponentCollection,
  componentsById: Map<string, GameComponent>,
  componentType: ComponentType
) {
  return collection.items
    .map((item) => componentsById.get(item.componentId))
    .filter((component): component is GameComponent => component?.type === componentType)
    .sort((left, right) => areaOfComponent(right) - areaOfComponent(left))[0];
}

function areaOfComponent(component: GameComponent) {
  const size = getComponentTableSize(component);
  return size.width * size.height;
}

function collectionMatchesZone(
  collection: ComponentCollection,
  childrenType: Exclude<ZoneChildType, "zone">,
  componentsById: Map<string, GameComponent>
) {
  return collection.items.every((item) => componentsById.get(item.componentId)?.type === childrenType);
}

function sourceMatchesType(
  source: TableSource,
  childrenType: Exclude<ZoneChildType, "zone">,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
) {
  if (source.kind === "component") {
    return componentsById.get(source.componentId)?.type === childrenType;
  }

  const collection = collectionsById.get(source.collectionId);
  return collection ? collectionMatchesZone(collection, childrenType, componentsById) : false;
}

function readDragSource(event: DragEvent<HTMLElement>): TableSource | null {
  const raw = event.dataTransfer.getData(libraryDragType) || event.dataTransfer.getData("text/plain");

  if (!raw) {
    return null;
  }

  try {
    const source = JSON.parse(raw) as TableSource;

    if (source.kind === "component" || source.kind === "collection") {
      return source;
    }
  } catch {
    return null;
  }

  return null;
}

function hasDragSource(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes(libraryDragType);
}

function sourceToSelectValue(source: TableSource) {
  return source.kind === "component" ? `component:${source.componentId}` : `collection:${source.collectionId}`;
}

function selectValueToSource(value: string): TableSource | undefined {
  const [kind, id] = value.split(":");

  if (!id) {
    return undefined;
  }

  if (kind === "component") {
    return { kind, componentId: id };
  }

  if (kind === "collection") {
    return { kind, collectionId: id };
  }

  return undefined;
}

function getSourceName(
  source: TableSource,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
) {
  return source.kind === "component"
    ? (componentsById.get(source.componentId)?.name ?? "Missing component")
    : (collectionsById.get(source.collectionId)?.name ?? "Missing collection");
}

function sourcesAreEqual(left: TableSource, right: TableSource) {
  return sourceToSelectValue(left) === sourceToSelectValue(right);
}

function getCollectionQuantity(collection: ComponentCollection) {
  return collection.items.reduce((total, item) => total + item.quantity, 0);
}

function itemMatchesQuery(name: string, tags: string[], normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  return (
    name.toLocaleLowerCase().includes(normalizedQuery) ||
    tags.some((tag) => tag.toLocaleLowerCase().includes(normalizedQuery))
  );
}

function createBackgroundForType(
  type: ZoneBackground["type"],
  current: ZoneBackground
): ZoneBackground {
  if (type === current.type) {
    return current;
  }

  if (type === "color") {
    return { type, color: defaultZoneBackgroundColor };
  }

  if (type === "image") {
    return { type, dataUrl: "", fileName: "", fit: "cover" };
  }

  return { type: "none" };
}

function readImageBackground(
  file: File,
  fit: ZoneBackgroundImageFit = "cover"
): Promise<ZoneBackground> {
  return new Promise((resolve, reject) => {
    const mimeType = getImageMimeType(file);

    if (!mimeType) {
      reject(new Error("Choose a PNG, JPG, GIF, WebP, or SVG image"));
      return;
    }

    if (file.size > tableBackgroundImageMaxBytes) {
      reject(new Error("Background image must be 5 MB or smaller"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read image file"));
        return;
      }

      const dataUrl = reader.result.replace(/^data:[^;]*;base64,/, `data:${mimeType};base64,`);

      resolve({
        type: "image",
        dataUrl,
        fileName: file.name,
        fit
      });
    };
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function getImageMimeType(file: File) {
  if (file.type.startsWith("image/")) {
    return file.type;
  }

  const extension = file.name.toLowerCase().split(".").pop();

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "gif") {
    return "image/gif";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "svg") {
    return "image/svg+xml";
  }

  return null;
}

function getZoneBackgroundStyle(background: ZoneBackground) {
  if (background.type === "color") {
    return {
      backgroundColor: background.color,
      backgroundImage: "none"
    };
  }

  if (background.type === "image" && background.dataUrl) {
    return {
      backgroundColor: "transparent",
      backgroundImage: `url("${background.dataUrl}")`,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize:
        background.fit === "stretch" ? "100% 100%" : background.fit === "contain" ? "contain" : "cover"
    };
  }

  return {
    backgroundColor: "transparent",
    backgroundImage: "none"
  };
}

function cloneSetup(setup: TableSetup): TableSetup {
  return {
    ...setup,
    placements: setup.placements.map((placement) => ({ ...placement, source: { ...placement.source } })),
    zones: cloneZones(setup.zones)
  };
}

function cloneZones(zones: TableZone[]): TableZone[] {
  return zones.map((zone) =>
    zone.childrenType === "zone"
      ? {
          ...zone,
          background: { ...zone.background },
          border: { ...zone.border },
          children: cloneZones(zone.children)
        }
      : {
          ...zone,
          background: { ...zone.background },
          border: { ...zone.border },
          source: zone.source ? { ...zone.source } : undefined
        }
  );
}

function getSetupSignature(setup: TableSetup) {
  return JSON.stringify({
    height: setup.height,
    placements: setup.placements,
    width: setup.width,
    zones: setup.zones
  });
}

function countZones(zones: TableZone[]): number {
  return zones.reduce(
    (total, zone) => total + 1 + (zone.childrenType === "zone" ? countZones(zone.children) : 0),
    0
  );
}

function getUniqueZoneName(name: string, zones: TableZone[]) {
  const names = new Set(flattenZones(zones).map((zone) => zone.name.toLocaleLowerCase()));
  let candidate = name;
  let suffix = 2;

  while (names.has(candidate.toLocaleLowerCase())) {
    candidate = `${name} ${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function flattenZones(zones: TableZone[]): TableZone[] {
  return zones.flatMap((zone): TableZone[] =>
    zone.childrenType === "zone" ? [zone, ...flattenZones(zone.children)] : [zone]
  );
}

function createClientId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function toNumberInputValue(value: number | string, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function clampZoom(value: number) {
  return Math.round(clamp(value, minTableZoom, maxTableZoom) * 100) / 100;
}

function formatZoom(value: number) {
  return `${Math.round(value * 100)}%`;
}

function readCssPixels(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
