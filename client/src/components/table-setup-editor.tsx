import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type Modifier,
  type UniqueIdentifier
} from "@dnd-kit/core";
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
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Square,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SyntheticEvent
} from "react";
import {
  componentMatchesZoneChildType,
  componentTypes,
  collectionMatchesZoneChildType,
  normalizeDegrees,
  tablePlacementFaces,
  tableSourceMatchesZoneChildType,
  titleCase,
  zoneBackgroundImageFits,
  zoneChildTypes,
  zoneLayouts,
  zoneOverflowModes,
  zoneSizeModes,
  zoneSourceFaces,
  zoneVisibilityModes,
  zoneSupportsSource,
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
  type ZoneMixedChild,
  type ZoneOverflowMode,
  type ZoneSizeMode,
  type ZoneSource,
  type ZoneSourceFace,
  type ZoneVisibility
} from "@bg-maker/shared";
import { getApiErrorMessage, getTableSetup, updateTableSetup } from "../api/client";
import { collectionTypeLabels, componentTypeLabels, zoneChildTypeLabels } from "./component-labels";
import { CardPreview } from "./card-layout-editor";
import { PiecePreview } from "./piece-preview";
import { TilePreview } from "./tile-preview";
import {
  clamp,
  clampZoom,
  clampZonesToBounds,
  countZones,
  createBackgroundForType,
  createClientId,
  createDefaultTableZone,
  createZoneForType,
  defaultZoneBackgroundColor,
  flattenRenderedZones,
  formatZoom,
  getCollectionQuantity,
  getLargestCollectionComponent,
  getSetupSaveValidationError,
  getSetupSignature,
  getSourceName,
  getSourceTableSize,
  getZoneBackgroundStyle,
  getZoneBase,
  getZoneLayoutPatch,
  itemMatchesQuery,
  materializeMixedZoneChildren,
  materializeZoneItems,
  maxTableZoom,
  minZoneSizeMm,
  minTableZoom,
  readCssPixels,
  readImageBackground,
  removeZoneFromTree,
  selectValueToSource,
  sourcesAreEqual,
  sourceToSelectValue,
  toNumberInputValue,
  updateZoneInTree,
  type RenderedZone,
  type TablePoint
} from "./table-setup-utils";
import { useTableSetupHistory, type TableSetupCommand } from "./use-table-setup-history";
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
  | {
      id: string;
      type: "mixed-child";
      zoneId: string;
    }
  | null;

type SelectedMixedChild = {
  child: ZoneMixedChild;
  itemSize: { height: number; width: number };
  label: string;
  renderedZone: RenderedZone;
};

type DragMode = "move" | "resize";

type ZoneDrafts = Record<string, Partial<Record<ZoneChildType, TableZone>>>;

type DraftCommandOptions = {
  label?: string;
  mergeKey?: string;
};

type TableDragData =
  | {
      kind: "library-source";
      source: TableSource;
    }
  | {
      childId: string;
      kind: "mixed-child";
      source: TableSource;
      zoneId: string;
    }
  | {
      kind: "placement";
      placementId: string;
      source: TableSource;
    };

const allLibraryFilters = ["all", ...componentTypes, "deck", "bag", "custom"] as const;

type LibraryFilter = (typeof allLibraryFilters)[number];

const noSourceOption = "__none__";
const tablePlacementDragIdPrefix = "table-placement:";
const tableLibraryDragIdPrefix = "table-library:";
const tableMixedChildDragIdPrefix = "table-mixed-child:";
const tableZoneDropIdPrefix = "table-zone:";
const tableZoomStep = 0.1;
const minSurfaceWidthPx = 640;

const zoneTypeOptions = zoneChildTypes.map((type) => ({
  label: zoneChildTypeLabels[type],
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

function getTableSourceDragKey(source: TableSource) {
  return sourceToSelectValue(source);
}

function getTableLibraryDragId(source: TableSource) {
  return `${tableLibraryDragIdPrefix}${getTableSourceDragKey(source)}`;
}

function getTablePlacementDragId(placementId: string) {
  return `${tablePlacementDragIdPrefix}${placementId}`;
}

function getTableMixedChildDragId(zoneId: string, childId: string) {
  return `${tableMixedChildDragIdPrefix}${zoneId}:${childId}`;
}

function getTableZoneDropId(zoneId: string) {
  return `${tableZoneDropIdPrefix}${zoneId}`;
}

function getTableZoneIdFromDropId(id: UniqueIdentifier | null | undefined) {
  const value = id?.toString();

  return value?.startsWith(tableZoneDropIdPrefix)
    ? value.slice(tableZoneDropIdPrefix.length)
    : null;
}

function isTableSource(value: unknown): value is TableSource {
  if (!value || typeof value !== "object") {
    return false;
  }

  const source = value as Record<string, unknown>;

  if (source.kind === "component") {
    return typeof source.componentId === "string";
  }

  if (source.kind === "collection") {
    return typeof source.collectionId === "string";
  }

  return false;
}

function readTableDragData(value: unknown): TableDragData | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Record<string, unknown>;

  if (data.kind === "library-source" && isTableSource(data.source)) {
    return { kind: "library-source", source: data.source };
  }

  if (
    data.kind === "mixed-child" &&
    typeof data.childId === "string" &&
    typeof data.zoneId === "string" &&
    isTableSource(data.source)
  ) {
    return {
      childId: data.childId,
      kind: "mixed-child",
      source: data.source,
      zoneId: data.zoneId
    };
  }

  if (
    data.kind === "placement" &&
    typeof data.placementId === "string" &&
    isTableSource(data.source)
  ) {
    return {
      kind: "placement",
      placementId: data.placementId,
      source: data.source
    };
  }

  return null;
}

function getClientPoint(event: Event) {
  if ("clientX" in event && "clientY" in event) {
    const clientX = event.clientX;
    const clientY = event.clientY;

    if (typeof clientX === "number" && typeof clientY === "number") {
      return { clientX, clientY };
    }
  }

  return null;
}

const centerLibraryDragOverlay: Modifier = ({
  active,
  activeNodeRect,
  activatorEvent,
  overlayNodeRect,
  transform
}) => {
  const data = readTableDragData(active?.data.current);
  const activatorPoint = activatorEvent ? getClientPoint(activatorEvent) : null;

  if (data?.kind !== "library-source" || !activeNodeRect || !overlayNodeRect || !activatorPoint) {
    return transform;
  }

  return {
    ...transform,
    x: transform.x + activatorPoint.clientX - activeNodeRect.left - overlayNodeRect.width / 2,
    y: transform.y + activatorPoint.clientY - activeNodeRect.top - overlayNodeRect.height / 2
  };
};

const libraryFilterOptions = allLibraryFilters.map((filter) => ({
  label:
    filter === "all"
      ? "All"
      : filter in componentTypeLabels
        ? componentTypeLabels[filter as ComponentType]
        : collectionTypeLabels[filter as ComponentCollection["type"]],
  value: filter
}));

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}

function targetBlocksZoneDrag(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest("[data-zone-drag-block='true']");
}

export function TableSetupEditor({
  collections,
  components,
  projectId,
  projectParameters
}: TableSetupEditorProps) {
  const queryClient = useQueryClient();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const dragOverlayRef = useRef<HTMLDivElement | null>(null);
  // dnd-kit drag deltas can diverge from the real pointer in Playwright and scrolled layouts.
  const lastPointerClientPointRef = useRef<{ clientX: number; clientY: number } | null>(null);
  // dnd-kit intentionally suppresses the click after a drag; reopen the zone menu for fast follow-up clicks.
  const tableDragClickSuppressedRef = useRef(false);
  const tableDragClickSuppressionTimerRef = useRef<number | null>(null);
  const {
    canRedo,
    canUndo,
    commitSetup,
    draft,
    executeCommand,
    loadSetup,
    redo,
    redoLabel,
    undo,
    undoLabel
  } = useTableSetupHistory();
  const [selection, setSelection] = useState<Selection>(null);
  const [zoneMenuOpened, setZoneMenuOpened] = useState(false);
  const [tableZoom, setTableZoom] = useState(1);
  const [activeDragSource, setActiveDragSource] = useState<TableSource | null>(null);
  const [activePlacementDrag, setActivePlacementDrag] = useState<{
    source: TableSource;
  } | null>(null);
  const [activeMixedChildDrag, setActiveMixedChildDrag] = useState<{
    source: TableSource;
  } | null>(null);
  const [isTableDragClickSuppressed, setIsTableDragClickSuppressed] = useState(false);
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
      queryClient.setQueryData(["table-setup", projectId], setup);
      commitSetup(setup);
      await queryClient.invalidateQueries({ queryKey: ["table-setup", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  });

  useEffect(() => {
    if (setupQuery.data) {
      loadSetup(setupQuery.data);
    }
  }, [loadSetup, setupQuery.data]);

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
  const savedSignature = useMemo(
    () => (setupQuery.data ? getSetupSignature(setupQuery.data) : ""),
    [setupQuery.data]
  );
  const draftSignature = useMemo(() => (draft ? getSetupSignature(draft) : ""), [draft]);
  const hasChanges = draft !== null && draftSignature !== savedSignature;
  const selectedPlacement =
    selection?.type === "placement"
      ? draft?.placements.find((placement) => placement.id === selection.id)
      : undefined;
  const selectedRenderedZone =
    selection?.type === "zone"
      ? renderedZones.find((entry) => entry.zone.id === selection.id)
      : undefined;
  const selectedMixedChild = useMemo<SelectedMixedChild | undefined>(() => {
    if (selection?.type !== "mixed-child") {
      return undefined;
    }

    const renderedZone = renderedZones.find((entry) => entry.zone.id === selection.zoneId);

    if (!renderedZone || renderedZone.zone.childrenType !== "mixed") {
      return undefined;
    }

    const child = renderedZone.zone.children.find((item) => item.id === selection.id);
    const itemSize = child
      ? getSourceTableSize(child.source, componentsById, collectionsById)
      : null;

    return child && itemSize
      ? {
          child,
          itemSize,
          label: getSourceName(child.source, componentsById, collectionsById),
          renderedZone
        }
      : undefined;
  }, [collectionsById, componentsById, renderedZones, selection]);
  const activeDropSource =
    activeDragSource ?? activePlacementDrag?.source ?? activeMixedChildDrag?.source ?? null;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    function rememberPointerPoint(event: PointerEvent) {
      lastPointerClientPointRef.current = {
        clientX: event.clientX,
        clientY: event.clientY
      };
    }

    window.addEventListener("pointermove", rememberPointerPoint, { capture: true });
    window.addEventListener("pointerup", rememberPointerPoint, { capture: true });

    return () => {
      window.removeEventListener("pointermove", rememberPointerPoint, { capture: true });
      window.removeEventListener("pointerup", rememberPointerPoint, { capture: true });
    };
  }, []);

  useEffect(
    () => () => {
      if (tableDragClickSuppressionTimerRef.current !== null) {
        window.clearTimeout(tableDragClickSuppressionTimerRef.current);
      }
      tableDragClickSuppressedRef.current = false;
    },
    []
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!draft || !surfaceRef.current || surfaceRef.current.offsetParent === null) {
        return;
      }

      if (isEditableKeyboardTarget(event.target) || event.altKey) {
        return;
      }

      const usesHistoryModifier = event.metaKey || event.ctrlKey;

      if (!usesHistoryModifier) {
        return;
      }

      const key = event.key.toLocaleLowerCase();

      if (key === "z") {
        event.preventDefault();

        if (event.shiftKey) {
          redo();
          return;
        }

        undo();
        return;
      }

      if (key === "y" && !event.shiftKey) {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [draft, redo, undo]);

  function updateDraft(command: TableSetupCommand) {
    setEditorError(null);
    executeCommand(command);
  }

  function updateTableZoom(delta: number) {
    setTableZoom((current) => clampZoom(current + delta));
  }

  function resetTableZoom() {
    setTableZoom(1);
  }

  function markTableDragClickSuppressionWindow() {
    tableDragClickSuppressedRef.current = true;
    setIsTableDragClickSuppressed(true);

    if (tableDragClickSuppressionTimerRef.current !== null) {
      window.clearTimeout(tableDragClickSuppressionTimerRef.current);
    }

    tableDragClickSuppressionTimerRef.current = window.setTimeout(() => {
      tableDragClickSuppressedRef.current = false;
      setIsTableDragClickSuppressed(false);
      tableDragClickSuppressionTimerRef.current = null;
    }, 150);
  }

  function openZoneMenuDuringSuppressedClick(event: SyntheticEvent) {
    if (!tableDragClickSuppressedRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setZoneMenuOpened(true);
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
      maxContentHeight > 0 ? maxContentHeight : Math.max(1, viewport.clientHeight - paddingY);
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

    updateDraft({
      execute: (setup) => ({
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
      }),
      label: "Add placement"
    });
    setSelection({ id: placementId, type: "placement" });
  }

  function addRootZone(childrenType: ZoneChildType) {
    const zoneId = createClientId("zone");

    updateDraft({
      execute: (setup) => {
        const zone = createDefaultTableZone({
          childrenType,
          existingZones: setup.zones,
          height: Math.min(220, setup.height - 120),
          id: zoneId,
          name:
            childrenType === "zone"
              ? `Zone ${countZones(setup.zones) + 1}`
              : `${titleCase(childrenType)} zone`,
          width: Math.min(360, setup.width - 120),
          x: 80,
          y: 80
        });

        const zones = [...setup.zones, zone];

        return {
          ...setup,
          zones: clampZonesToBounds(
            zones,
            setup.width,
            setup.height,
            componentsById,
            collectionsById
          )
        };
      },
      label: "Add zone"
    });
    setSelection({ id: zoneId, type: "zone" });
  }

  function addChildZone(parentId: string, childrenType: ZoneChildType) {
    const zoneId = createClientId("zone");

    updateDraft({
      execute: (setup) => {
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
          zones: clampZonesToBounds(
            zones,
            setup.width,
            setup.height,
            componentsById,
            collectionsById
          )
        };
      },
      label: "Add child zone"
    });
    setSelection({ id: zoneId, type: "zone" });
  }

  function updatePlacement(
    id: string,
    patch: Partial<TablePlacement>,
    options: DraftCommandOptions = {}
  ) {
    updateDraft({
      execute: (setup) => ({
        ...setup,
        placements: setup.placements.map((placement) =>
          placement.id === id ? { ...placement, ...patch } : placement
        )
      }),
      label: options.label ?? "Update placement",
      mergeKey: options.mergeKey
    });
  }

  function updateZone(id: string, patch: Partial<TableZone>, options: DraftCommandOptions = {}) {
    updateDraft({
      execute: (setup) => {
        const zones = updateZoneInTree(
          setup.zones,
          id,
          (zone) => ({ ...zone, ...patch }) as TableZone
        );

        return {
          ...setup,
          zones: clampZonesToBounds(
            zones,
            setup.width,
            setup.height,
            componentsById,
            collectionsById
          )
        };
      },
      label: options.label ?? "Update zone",
      mergeKey: options.mergeKey
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

    updateDraft({
      execute: (setup) => {
        const zones = updateZoneInTree(setup.zones, zone.id, () => nextZone);

        return {
          ...setup,
          zones: clampZonesToBounds(
            zones,
            setup.width,
            setup.height,
            componentsById,
            collectionsById
          )
        };
      },
      label: "Change zone type"
    });
  }

  function updateZoneSource(
    zone: ZoneSource,
    source: TableSource | undefined,
    options: DraftCommandOptions = {}
  ) {
    updateZone(
      zone.id,
      source ? ({ source } as Partial<TableZone>) : ({ source: undefined } as Partial<TableZone>),
      { label: options.label ?? "Update zone source", mergeKey: options.mergeKey }
    );
  }

  function getMixedZoneAvailableSlots(zone: TableZone) {
    if (zone.childrenType !== "mixed") {
      return 0;
    }

    return zone.capacity === null
      ? Number.POSITIVE_INFINITY
      : Math.max(0, zone.capacity - zone.children.length);
  }

  function getMixedZoneSources(source: TableSource, zone: TableZone) {
    const availableSlots = getMixedZoneAvailableSlots(zone);

    if (availableSlots <= 0) {
      return [];
    }

    const itemSize = getSourceTableSize(source, componentsById, collectionsById);

    if (!itemSize) {
      return [];
    }

    return [{ ...source }];
  }

  function canDropSourceOnZone(
    source: TableSource,
    zone: TableZone,
    options: { movingMixedChildFromZoneId?: string } = {}
  ) {
    if (zone.childrenType === "mixed") {
      if (options.movingMixedChildFromZoneId === zone.id) {
        return true;
      }

      return getMixedZoneSources(source, zone).length > 0;
    }

    return (
      zoneSupportsSource(zone) &&
      tableSourceMatchesZoneChildType(source, zone.childrenType, componentsById, collectionsById)
    );
  }

  function getDropZoneAtPoint(
    point: TablePoint,
    source: TableSource,
    options: { movingMixedChildFromZoneId?: string } = {}
  ) {
    return [...renderedZones].reverse().find((renderedZone) => {
      const zone = renderedZone.zone;

      return (
        canDropSourceOnZone(source, zone, options) &&
        point.x >= renderedZone.absoluteX &&
        point.x <= renderedZone.absoluteX + zone.width &&
        point.y >= renderedZone.absoluteY &&
        point.y <= renderedZone.absoluteY + zone.height
      );
    });
  }

  function getRenderedZoneAtPoint(point: TablePoint) {
    return [...renderedZones].reverse().find((renderedZone) => {
      const zone = renderedZone.zone;

      return (
        point.x >= renderedZone.absoluteX &&
        point.x <= renderedZone.absoluteX + zone.width &&
        point.y >= renderedZone.absoluteY &&
        point.y <= renderedZone.absoluteY + zone.height
      );
    });
  }

  function createMixedZoneChild(
    source: TableSource,
    renderedZone: RenderedZone,
    point: TablePoint
  ) {
    return {
      id: createClientId("mixed-child"),
      source: { ...source },
      x: Math.round(clamp(point.x - renderedZone.absoluteX, 0, renderedZone.zone.width)),
      y: Math.round(clamp(point.y - renderedZone.absoluteY, 0, renderedZone.zone.height)),
      rotationDeg: 0,
      face: "front" as TablePlacementFace
    };
  }

  function createMixedZoneChildren(
    renderedZone: RenderedZone,
    source: TableSource,
    point: TablePoint
  ) {
    return getMixedZoneSources(source, renderedZone.zone).map((childSource) =>
      createMixedZoneChild(childSource, renderedZone, point)
    );
  }

  function addMixedChildrenFromSource(
    renderedZone: RenderedZone,
    source: TableSource,
    point: TablePoint
  ) {
    const children = createMixedZoneChildren(renderedZone, source, point);

    if (children.length === 0) {
      return;
    }

    updateDraft({
      execute: (setup) => {
        const zones = updateZoneInTree(setup.zones, renderedZone.zone.id, (zone) => {
          if (zone.childrenType !== "mixed") {
            return zone;
          }

          return { ...zone, children: [...zone.children, ...children] };
        });

        return {
          ...setup,
          zones: clampZonesToBounds(
            zones,
            setup.width,
            setup.height,
            componentsById,
            collectionsById
          )
        };
      },
      label: children.length === 1 ? "Add mixed zone child" : "Add mixed zone children"
    });
    setSelection({
      id: children[children.length - 1].id,
      type: "mixed-child",
      zoneId: renderedZone.zone.id
    });
  }

  function dropSourceIntoZone(renderedZone: RenderedZone, source: TableSource, point: TablePoint) {
    const zone = renderedZone.zone;

    if (!canDropSourceOnZone(source, zone)) {
      return;
    }

    if (zone.childrenType === "mixed") {
      addMixedChildrenFromSource(renderedZone, source, point);
      return;
    }

    if (!zoneSupportsSource(zone)) {
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

  function movePlacementIntoZone(
    placement: TablePlacement,
    renderedZone: RenderedZone,
    point: TablePoint,
    options: DraftCommandOptions = {}
  ) {
    const zone = renderedZone.zone;

    if (zone.childrenType === "mixed") {
      const children = createMixedZoneChildren(renderedZone, placement.source, point);

      if (children.length === 0) {
        return;
      }

      updateDraft({
        execute: (setup) => {
          const zones = updateZoneInTree(setup.zones, zone.id, (currentZone) => {
            if (currentZone.childrenType !== "mixed") {
              return currentZone;
            }

            return { ...currentZone, children: [...currentZone.children, ...children] };
          });

          return {
            ...setup,
            placements: setup.placements.filter((item) => item.id !== placement.id),
            zones: clampZonesToBounds(
              zones,
              setup.width,
              setup.height,
              componentsById,
              collectionsById
            )
          };
        },
        label:
          options.label ??
          (children.length === 1
            ? "Move placement into mixed zone"
            : "Move placement collection into mixed zone"),
        mergeKey: options.mergeKey
      });
      setSelection({ id: children[children.length - 1].id, type: "mixed-child", zoneId: zone.id });
      return;
    }

    if (!zoneSupportsSource(zone)) {
      return;
    }

    if (zone.source && !sourcesAreEqual(zone.source, placement.source)) {
      const replace = window.confirm(`Replace source for "${zone.name}"?`);

      if (!replace) {
        return;
      }
    }

    updateDraft({
      execute: (setup) => {
        const zones = updateZoneInTree(setup.zones, zone.id, (currentZone) => {
          if (!zoneSupportsSource(currentZone)) {
            return currentZone;
          }

          return { ...currentZone, source: { ...placement.source } } as TableZone;
        });

        return {
          ...setup,
          placements: setup.placements.filter((item) => item.id !== placement.id),
          zones: clampZonesToBounds(
            zones,
            setup.width,
            setup.height,
            componentsById,
            collectionsById
          )
        };
      },
      label: options.label ?? "Move placement into zone",
      mergeKey: options.mergeKey
    });
    setSelection({ id: zone.id, type: "zone" });
  }

  function getRenderedMixedChild(zoneId: string, childId: string) {
    const renderedZone = renderedZones.find((entry) => entry.zone.id === zoneId);

    if (!renderedZone || renderedZone.zone.childrenType !== "mixed") {
      return null;
    }

    const child = renderedZone.zone.children.find((item) => item.id === childId);

    return child ? { child, renderedZone } : null;
  }

  function moveMixedChildWithinZone(zoneId: string, child: ZoneMixedChild, event: DragEndEvent) {
    const delta = getTableDeltaFromDragEvent(event);

    if (!delta) {
      return;
    }

    updateMixedChild(
      zoneId,
      child.id,
      {
        x: Math.round(child.x + delta.x),
        y: Math.round(child.y + delta.y)
      },
      { label: "Move mixed zone child" }
    );
    setSelection({ id: child.id, type: "mixed-child", zoneId });
  }

  function moveMixedChildToMixedZone(
    sourceZoneId: string,
    child: ZoneMixedChild,
    targetRenderedZone: RenderedZone,
    point: TablePoint
  ) {
    const targetZone = targetRenderedZone.zone;

    if (targetZone.childrenType !== "mixed") {
      return;
    }

    const movedChild: ZoneMixedChild = {
      ...child,
      x: Math.round(clamp(point.x - targetRenderedZone.absoluteX, 0, targetZone.width)),
      y: Math.round(clamp(point.y - targetRenderedZone.absoluteY, 0, targetZone.height))
    };

    updateDraft({
      execute: (setup) => {
        const zonesWithoutChild = updateZoneInTree(setup.zones, sourceZoneId, (zone) => {
          if (zone.childrenType !== "mixed") {
            return zone;
          }

          return {
            ...zone,
            children: zone.children.filter((item) => item.id !== child.id)
          };
        });
        const zonesWithChild = updateZoneInTree(zonesWithoutChild, targetZone.id, (zone) => {
          if (zone.childrenType !== "mixed") {
            return zone;
          }

          return {
            ...zone,
            children: [...zone.children, movedChild]
          };
        });

        return {
          ...setup,
          zones: clampZonesToBounds(
            zonesWithChild,
            setup.width,
            setup.height,
            componentsById,
            collectionsById
          )
        };
      },
      label: "Move mixed zone child"
    });
    setSelection({ id: child.id, type: "mixed-child", zoneId: targetZone.id });
  }

  function moveMixedChildToSourceZone(
    sourceZoneId: string,
    child: ZoneMixedChild,
    targetZone: ZoneSource
  ) {
    if (targetZone.source && !sourcesAreEqual(targetZone.source, child.source)) {
      const replace = window.confirm(`Replace source for "${targetZone.name}"?`);

      if (!replace) {
        return;
      }
    }

    updateDraft({
      execute: (setup) => {
        const zonesWithoutChild = updateZoneInTree(setup.zones, sourceZoneId, (zone) => {
          if (zone.childrenType !== "mixed") {
            return zone;
          }

          return {
            ...zone,
            children: zone.children.filter((item) => item.id !== child.id)
          };
        });
        const zonesWithSource = updateZoneInTree(zonesWithoutChild, targetZone.id, (zone) => {
          if (!zoneSupportsSource(zone)) {
            return zone;
          }

          return { ...zone, source: { ...child.source } } as TableZone;
        });

        return {
          ...setup,
          zones: clampZonesToBounds(
            zonesWithSource,
            setup.width,
            setup.height,
            componentsById,
            collectionsById
          )
        };
      },
      label: "Move mixed zone child into zone"
    });
    setSelection({ id: targetZone.id, type: "zone" });
  }

  function moveMixedChildToPlacement(
    sourceZoneId: string,
    child: ZoneMixedChild,
    point: TablePoint
  ) {
    if (!draft) {
      return;
    }

    const placementId = createClientId("placement");

    updateDraft({
      execute: (setup) => {
        const zones = updateZoneInTree(setup.zones, sourceZoneId, (zone) => {
          if (zone.childrenType !== "mixed") {
            return zone;
          }

          return {
            ...zone,
            children: zone.children.filter((item) => item.id !== child.id)
          };
        });

        return {
          ...setup,
          placements: [
            ...setup.placements,
            {
              face: child.face,
              id: placementId,
              rotationDeg: child.rotationDeg,
              source: { ...child.source },
              x: Math.round(clamp(point.x, 0, setup.width)),
              y: Math.round(clamp(point.y, 0, setup.height))
            }
          ],
          zones: clampZonesToBounds(
            zones,
            setup.width,
            setup.height,
            componentsById,
            collectionsById
          )
        };
      },
      label: "Move mixed zone child to table"
    });
    setSelection({ id: placementId, type: "placement" });
  }

  function updateZoneBackgroundImage(zone: TableZone, file: File | null) {
    if (!file) {
      updateZone(zone.id, { background: { type: "none" } } as Partial<TableZone>);
      return;
    }

    setEditorError(null);
    void readImageBackground(file, zone.background.type === "image" ? zone.background.fit : "cover")
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
    updateDraft({
      execute: (setup) => ({
        ...setup,
        placements: setup.placements.filter((placement) => placement.id !== id)
      }),
      label: "Delete placement"
    });
    setSelection((current) =>
      current?.type === "placement" && current.id === id ? null : current
    );
  }

  function updateMixedChild(
    zoneId: string,
    childId: string,
    patch: Partial<ZoneMixedChild>,
    options: DraftCommandOptions = {}
  ) {
    updateDraft({
      execute: (setup) => {
        const zones = updateZoneInTree(setup.zones, zoneId, (zone) => {
          if (zone.childrenType !== "mixed") {
            return zone;
          }

          return {
            ...zone,
            children: zone.children.map((child) =>
              child.id === childId ? { ...child, ...patch } : child
            )
          };
        });

        return {
          ...setup,
          zones: clampZonesToBounds(
            zones,
            setup.width,
            setup.height,
            componentsById,
            collectionsById
          )
        };
      },
      label: options.label ?? "Update mixed zone child",
      mergeKey: options.mergeKey
    });
  }

  function removeMixedChild(zoneId: string, childId: string) {
    updateDraft({
      execute: (setup) => {
        const zones = updateZoneInTree(setup.zones, zoneId, (zone) => {
          if (zone.childrenType !== "mixed") {
            return zone;
          }

          return {
            ...zone,
            children: zone.children.filter((child) => child.id !== childId)
          };
        });

        return {
          ...setup,
          zones: clampZonesToBounds(
            zones,
            setup.width,
            setup.height,
            componentsById,
            collectionsById
          )
        };
      },
      label: "Delete mixed zone child"
    });
    setSelection((current) =>
      current?.type === "mixed-child" && current.id === childId && current.zoneId === zoneId
        ? null
        : current
    );
  }

  function removeZone(id: string) {
    updateDraft({
      execute: (setup) => {
        const zones = removeZoneFromTree(setup.zones, id);

        return {
          ...setup,
          zones: clampZonesToBounds(
            zones,
            setup.width,
            setup.height,
            componentsById,
            collectionsById
          )
        };
      },
      label: "Delete zone"
    });
    setSelection((current) =>
      (current?.type === "zone" && current.id === id) ||
      (current?.type === "mixed-child" && current.zoneId === id)
        ? null
        : current
    );
  }

  function updateTableSize(patch: Partial<Pick<TableSetup, "height" | "width">>) {
    updateDraft({
      execute: (setup) => {
        const width = patch.width ?? setup.width;
        const height = patch.height ?? setup.height;
        const zones = clampZonesToBounds(
          setup.zones,
          width,
          height,
          componentsById,
          collectionsById
        );
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
      },
      label: "Resize table"
    });
  }

  function getTablePointFromClient(clientX: number, clientY: number) {
    const rect = surfaceRef.current?.getBoundingClientRect();

    if (!rect || !draft || rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      x: ((clientX - rect.left) / rect.width) * draft.width,
      y: ((clientY - rect.top) / rect.height) * draft.height
    };
  }

  function getTablePoint(event: Pick<PointerEvent | ReactPointerEvent, "clientX" | "clientY">) {
    return getTablePointFromClient(event.clientX, event.clientY);
  }

  function getClientPointFromTrackedPointer() {
    return lastPointerClientPointRef.current;
  }

  function getClientPointFromDragEvent(event: DragMoveEvent | DragEndEvent) {
    const trackedPoint = getClientPointFromTrackedPointer();

    if (trackedPoint) {
      return trackedPoint;
    }

    const initialPoint = getClientPoint(event.activatorEvent);

    if (initialPoint) {
      return {
        clientX: initialPoint.clientX + event.delta.x,
        clientY: initialPoint.clientY + event.delta.y
      };
    }

    const initialRect = event.active.rect.current.initial;

    if (!initialRect) {
      return null;
    }

    return {
      clientX: initialRect.left + initialRect.width / 2 + event.delta.x,
      clientY: initialRect.top + initialRect.height / 2 + event.delta.y
    };
  }

  function getTablePointFromDragEvent(event: DragMoveEvent | DragEndEvent) {
    const point = getClientPointFromDragEvent(event);

    return point ? getTablePointFromClient(point.clientX, point.clientY) : null;
  }

  function getTablePointFromDragRect(
    event: DragMoveEvent | DragEndEvent,
    anchor: "center" | "top-left" = "center"
  ) {
    const translatedRect = event.active.rect.current.translated;
    const initialRect = event.active.rect.current.initial;
    const rect = translatedRect
      ? translatedRect
      : initialRect
        ? {
            ...initialRect,
            left: initialRect.left + event.delta.x,
            top: initialRect.top + event.delta.y
          }
        : null;

    if (!rect) {
      return null;
    }

    return anchor === "top-left"
      ? getTablePointFromClient(rect.left, rect.top)
      : getTablePointFromClient(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function getTableDeltaFromDragEvent(event: DragEndEvent) {
    const rect = surfaceRef.current?.getBoundingClientRect();

    if (!rect || !draft || rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      x: (event.delta.x / rect.width) * draft.width,
      y: (event.delta.y / rect.height) * draft.height
    };
  }

  function tablePointIsInsideSurface(point: TablePoint) {
    return (
      draft !== null &&
      point.x >= 0 &&
      point.x <= draft.width &&
      point.y >= 0 &&
      point.y <= draft.height
    );
  }

  function getLibraryDropPoint(event: DragMoveEvent | DragEndEvent) {
    const pointerPoint = getTablePointFromDragEvent(event);

    if (pointerPoint && tablePointIsInsideSurface(pointerPoint)) {
      return pointerPoint;
    }

    return getTablePointFromDragRect(event);
  }

  function getLibraryPreviewDropPoint(event: DragMoveEvent | DragEndEvent) {
    const overlayRect = dragOverlayRef.current?.getBoundingClientRect();

    if (overlayRect && overlayRect.width > 0 && overlayRect.height > 0) {
      const overlayPoint = getTablePointFromClient(overlayRect.left, overlayRect.top);

      if (overlayPoint) {
        return overlayPoint;
      }
    }

    return getLibraryDropPoint(event);
  }

  function getDraggedItemDropPoint(event: DragMoveEvent | DragEndEvent) {
    return getTablePointFromDragRect(event, "top-left") ?? getTablePointFromDragEvent(event);
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
    const dragHistoryKey = createClientId(mode === "resize" ? "zone-resize" : "zone-move");

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
        updateZone(
          zone.id,
          {
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
          } as Partial<TableZone>,
          {
            label: "Resize zone",
            mergeKey: dragHistoryKey
          }
        );
        return;
      }

      updateZone(
        zone.id,
        {
          x: Math.round(clamp(startZone.x + deltaX, 0, renderedZone.parentWidth - startZone.width)),
          y: Math.round(
            clamp(startZone.y + deltaY, 0, renderedZone.parentHeight - startZone.height)
          )
        } as Partial<TableZone>,
        {
          label: "Move zone",
          mergeKey: dragHistoryKey
        }
      );
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

  function handleTableDragStart(event: DragStartEvent) {
    const data = readTableDragData(event.active.data.current);

    setDragHoverZoneId(null);

    if (!data) {
      return;
    }

    if (data.kind === "library-source") {
      setActiveDragSource(data.source);
      return;
    }

    if (data.kind === "mixed-child") {
      setSelection({ id: data.childId, type: "mixed-child", zoneId: data.zoneId });
      setActiveMixedChildDrag({ source: data.source });
      return;
    }

    setSelection({ id: data.placementId, type: "placement" });
    setActivePlacementDrag({ source: data.source });
  }

  function handleTableDragMove(event: DragMoveEvent) {
    const data = readTableDragData(event.active.data.current);
    const point = data
      ? data.kind === "library-source"
        ? getLibraryDropPoint(event)
        : getTablePointFromDragEvent(event)
      : null;
    const dropZone =
      data && point
        ? getDropZoneAtPoint(point, data.source, {
            movingMixedChildFromZoneId: data.kind === "mixed-child" ? data.zoneId : undefined
          })
        : undefined;
    const overZoneId = getTableZoneIdFromDropId(event.over?.id);

    setDragHoverZoneId(dropZone?.zone.id ?? overZoneId);
  }

  function handleTableDragEnd(event: DragEndEvent) {
    const data = readTableDragData(event.active.data.current);
    const point = data
      ? data.kind === "library-source"
        ? getLibraryDropPoint(event)
        : getTablePointFromDragEvent(event)
      : null;

    markTableDragClickSuppressionWindow();
    setActiveDragSource(null);
    setActivePlacementDrag(null);
    setActiveMixedChildDrag(null);
    setDragHoverZoneId(null);

    if (!data || !draft) {
      return;
    }

    if (data.kind === "library-source") {
      if (!point || !tablePointIsInsideSurface(point)) {
        return;
      }

      const previewPoint = getLibraryPreviewDropPoint(event) ?? point;
      const renderedZone = getRenderedZoneAtPoint(point);

      if (renderedZone && canDropSourceOnZone(data.source, renderedZone.zone)) {
        dropSourceIntoZone(renderedZone, data.source, previewPoint);
        return;
      }

      addPlacementFromSource(data.source, {
        x: Math.round(clamp(previewPoint.x, 0, draft.width)),
        y: Math.round(clamp(previewPoint.y, 0, draft.height))
      });
      return;
    }

    if (data.kind === "mixed-child") {
      if (!point || !tablePointIsInsideSurface(point)) {
        return;
      }

      const current = getRenderedMixedChild(data.zoneId, data.childId);

      if (!current) {
        return;
      }

      const dropZone = getDropZoneAtPoint(point, data.source, {
        movingMixedChildFromZoneId: data.zoneId
      });
      const draggedItemPoint = getDraggedItemDropPoint(event) ?? point;

      if (dropZone?.zone.childrenType === "mixed") {
        if (dropZone.zone.id === data.zoneId) {
          moveMixedChildWithinZone(data.zoneId, current.child, event);
          return;
        }

        moveMixedChildToMixedZone(data.zoneId, current.child, dropZone, draggedItemPoint);
        return;
      }

      if (dropZone && zoneSupportsSource(dropZone.zone)) {
        moveMixedChildToSourceZone(data.zoneId, current.child, dropZone.zone);
        return;
      }

      moveMixedChildToPlacement(data.zoneId, current.child, draggedItemPoint);
      return;
    }

    const placement = draft.placements.find((item) => item.id === data.placementId);

    if (!placement) {
      return;
    }

    const dropZone = point ? getDropZoneAtPoint(point, data.source) : undefined;

    if (dropZone && point) {
      const draggedItemPoint = getDraggedItemDropPoint(event) ?? point;
      movePlacementIntoZone(placement, dropZone, draggedItemPoint);
      return;
    }

    const delta = getTableDeltaFromDragEvent(event);

    if (!delta) {
      return;
    }

    updatePlacement(
      placement.id,
      {
        x: Math.round(clamp(placement.x + delta.x, 0, draft.width)),
        y: Math.round(clamp(placement.y + delta.y, 0, draft.height))
      },
      { label: "Move placement" }
    );
  }

  function handleTableDragCancel() {
    markTableDragClickSuppressionWindow();
    setActiveDragSource(null);
    setActivePlacementDrag(null);
    setActiveMixedChildDrag(null);
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

      <DndContext
        collisionDetection={pointerWithin}
        sensors={sensors}
        onDragCancel={handleTableDragCancel}
        onDragEnd={handleTableDragEnd}
        onDragMove={handleTableDragMove}
        onDragStart={handleTableDragStart}
      >
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
                <Text aria-label="Table zoom" className="table-setup-zoom-value" fw={700} size="sm">
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
              <Group className="table-setup-history-controls" gap={4} wrap="nowrap">
                <Tooltip
                  label={undoLabel ? `Undo ${undoLabel.toLocaleLowerCase()}` : "Undo"}
                  withArrow
                >
                  <ActionIcon
                    aria-label="Undo table layout change"
                    disabled={!canUndo}
                    radius={8}
                    size="lg"
                    variant="light"
                    onClick={undo}
                  >
                    <Undo2 size={18} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip
                  label={redoLabel ? `Redo ${redoLabel.toLocaleLowerCase()}` : "Redo"}
                  withArrow
                >
                  <ActionIcon
                    aria-label="Redo table layout change"
                    disabled={!canRedo}
                    radius={8}
                    size="lg"
                    variant="light"
                    onClick={redo}
                  >
                    <Redo2 size={18} />
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
              <Menu
                opened={zoneMenuOpened}
                position="bottom-end"
                shadow="md"
                width={190}
                onChange={setZoneMenuOpened}
              >
                <Menu.Target>
                  <Button
                    leftSection={<Plus size={16} />}
                    rightSection={<ChevronDown size={14} />}
                    radius={8}
                    variant="light"
                    onClickCapture={openZoneMenuDuringSuppressedClick}
                    onPointerUpCapture={openZoneMenuDuringSuppressedClick}
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
                disabled={!hasChanges || isTableDragClickSuppressed}
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
                    selectedMixedChildId={
                      selection?.type === "mixed-child" && selection.zoneId === renderedZone.zone.id
                        ? selection.id
                        : null
                    }
                    setup={draft}
                    onPointerDown={(event, mode) => startZoneDrag(event, renderedZone, mode)}
                    onRemove={() => removeZone(renderedZone.zone.id)}
                    onSelect={() => setSelection({ id: renderedZone.zone.id, type: "zone" })}
                    onSelectMixedChild={(childId) =>
                      setSelection({
                        id: childId,
                        type: "mixed-child",
                        zoneId: renderedZone.zone.id
                      })
                    }
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
              mixedChildSelection={selectedMixedChild}
              placement={selectedPlacement}
              setup={draft}
              zone={selectedRenderedZone}
              onAddChildZone={addChildZone}
              onChangeZoneType={changeZoneType}
              onRemoveMixedChild={removeMixedChild}
              onRemovePlacement={removePlacement}
              onRemoveZone={removeZone}
              onUpdateMixedChild={updateMixedChild}
              onUpdatePlacement={updatePlacement}
              onUpdateZone={updateZone}
              onUpdateZoneBackgroundImage={updateZoneBackgroundImage}
              onUpdateZoneSource={updateZoneSource}
            />
          </Box>
        </Box>
        <DragOverlay dropAnimation={null} modifiers={[centerLibraryDragOverlay]}>
          {activeDragSource || activeMixedChildDrag ? (
            <Box ref={dragOverlayRef} className="table-setup-drag-overlay">
              <SourceVisual
                collectionsById={collectionsById}
                componentsById={componentsById}
                projectParameters={projectParameters}
                source={activeDragSource ?? activeMixedChildDrag!.source}
              />
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>
    </Stack>
  );
}

function TableSetupLibrary({
  collections,
  components,
  componentsById,
  onAddSource
}: {
  collections: ComponentCollection[];
  components: GameComponent[];
  componentsById: Map<string, GameComponent>;
  onAddSource: (source: TableSource) => void;
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
  preview,
  source,
  title
}: {
  detail: string;
  onAdd: () => void;
  preview: ReactNode;
  source: TableSource;
  title: string;
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: getTableLibraryDragId(source),
    data: { kind: "library-source", source } satisfies TableDragData
  });

  return (
    <UnstyledButton
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Library item ${title}`}
      className="table-setup-library-item"
      data-dragging={isDragging ? "true" : undefined}
      type="button"
      onClick={onAdd}
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
  onPointerDown,
  onRemove,
  onSelect,
  onSelectMixedChild,
  projectParameters,
  renderedZone,
  selected,
  selectedMixedChildId,
  setup
}: {
  collectionsById: Map<string, ComponentCollection>;
  componentsById: Map<string, GameComponent>;
  dropEligible: boolean;
  dropTarget: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>, mode: DragMode) => void;
  onRemove: () => void;
  onSelect: () => void;
  onSelectMixedChild: (childId: string) => void;
  projectParameters: ProjectParameter[];
  renderedZone: RenderedZone;
  selected: boolean;
  selectedMixedChildId: string | null;
  setup: TableSetup;
}) {
  const zone = renderedZone.zone;
  const sourceZone = zoneSupportsSource(zone) ? zone : null;
  const mixedZone = zone.childrenType === "mixed" ? zone : null;
  const { isOver, setNodeRef } = useDroppable({
    id: getTableZoneDropId(zone.id),
    data: { kind: "zone", zoneId: zone.id },
    disabled: !dropEligible
  });
  const zoneItems =
    sourceZone === null ? [] : materializeZoneItems(sourceZone, componentsById, collectionsById);
  const mixedChildren = mixedZone
    ? materializeMixedZoneChildren(mixedZone, componentsById, collectionsById)
    : [];

  return (
    <Box
      ref={setNodeRef}
      aria-label={`Table zone ${zone.name}`}
      className="table-setup-zone"
      data-depth={renderedZone.depth}
      data-drop-eligible={dropEligible ? "true" : undefined}
      data-drop-target={dropTarget || isOver ? "true" : undefined}
      data-position-managed={renderedZone.parentLayout !== "free" ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      data-zone-type={zone.childrenType}
      style={{
        ...getZoneBackgroundStyle(zone.background),
        borderColor: zone.border.color,
        borderStyle:
          zone.border.width === 0 ? "none" : zone.childrenType === "zone" ? "dashed" : "solid",
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
      onPointerDown={(event) => {
        if (targetBlocksZoneDrag(event.target)) {
          return;
        }

        onPointerDown(event, "move");
      }}
    >
      <Group className="table-setup-zone-label" gap={6}>
        <GripVertical size={14} />
        <Text fw={700} size="xs">
          {zone.name}
        </Text>
        <Badge
          color={zone.childrenType === "zone" ? "gray" : "teal"}
          radius={6}
          size="xs"
          variant="light"
        >
          {zoneChildTypeLabels[zone.childrenType]}
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

      {sourceZone || mixedZone ? (
        <Box className="table-setup-zone-source-content">
          {sourceZone && zoneItems.length > 0 ? (
            zoneItems.map(({ point, source }, index) => {
              const label = getSourceName(source, componentsById, collectionsById);

              return (
                <Box
                  key={`${source.kind === "component" ? source.componentId : source.collectionId}-${index}`}
                  className="table-setup-zone-item"
                  style={{
                    left: `${(point.x / zone.width) * 100}%`,
                    top: `${(point.y / zone.height) * 100}%`
                  }}
                >
                  <TableSurfaceItemContent label={label}>
                    <SourceVisual
                      collectionsById={collectionsById}
                      componentsById={componentsById}
                      face={sourceZone.face === "up" ? "front" : "back"}
                      projectParameters={projectParameters}
                      source={source}
                    />
                  </TableSurfaceItemContent>
                </Box>
              );
            })
          ) : mixedZone && mixedChildren.length > 0 ? (
            mixedChildren.map(({ child, point, source }) => (
              <MixedZoneItem
                key={child.id}
                child={child}
                collectionsById={collectionsById}
                componentsById={componentsById}
                point={point}
                projectParameters={projectParameters}
                selected={child.id === selectedMixedChildId}
                source={source}
                zone={mixedZone}
                onSelect={() => onSelectMixedChild(child.id)}
              />
            ))
          ) : (
            <Text className="table-setup-zone-empty-source" c="dimmed" size="xs">
              {sourceZone ? (sourceZone.source ? "Autofill off" : "Drop source") : "Drop source"}
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

function MixedZoneItem({
  child,
  collectionsById,
  componentsById,
  onSelect,
  point,
  projectParameters,
  selected,
  source,
  zone
}: {
  child: ZoneMixedChild;
  collectionsById: Map<string, ComponentCollection>;
  componentsById: Map<string, GameComponent>;
  onSelect: () => void;
  point: TablePoint;
  projectParameters: ProjectParameter[];
  selected: boolean;
  source: TableSource;
  zone: Extract<TableZone, { childrenType: "mixed" }>;
}) {
  const label = getSourceName(source, componentsById, collectionsById);
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    id: getTableMixedChildDragId(zone.id, child.id),
    data: {
      childId: child.id,
      kind: "mixed-child",
      source: child.source,
      zoneId: zone.id
    } satisfies TableDragData
  });
  const dragTransform = transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0) `
    : "";

  return (
    <UnstyledButton
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Mixed zone item ${label}`}
      className="table-setup-zone-item"
      data-dragging={isDragging ? "true" : undefined}
      data-selectable="true"
      data-selected={selected ? "true" : undefined}
      data-zone-drag-block="true"
      style={{
        left: `${(point.x / zone.width) * 100}%`,
        top: `${(point.y / zone.height) * 100}%`,
        transform: dragTransform || undefined,
        zIndex: isDragging ? 4 : undefined
      }}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <TableSurfaceItemContent label={label} rotationDeg={child.rotationDeg}>
        <SourceVisual
          collectionsById={collectionsById}
          componentsById={componentsById}
          face={child.face}
          projectParameters={projectParameters}
          source={source}
        />
      </TableSurfaceItemContent>
    </UnstyledButton>
  );
}

function TableSurfaceItemContent({
  children,
  label,
  rotationDeg = 0
}: {
  children: ReactNode;
  label: string;
  rotationDeg?: number;
}) {
  return (
    <Box className="table-setup-surface-item-content">
      <Box
        className="table-setup-surface-item-body"
        style={{
          transform: rotationDeg === 0 ? undefined : `rotate(${rotationDeg}deg)`
        }}
      >
        {children}
      </Box>
      <Text className="table-setup-surface-item-label" size="xs">
        {label}
      </Text>
    </Box>
  );
}

function TablePlacementView({
  collectionsById,
  componentsById,
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
  onRemove: () => void;
  onRotate: (delta: number) => void;
  onSelect: () => void;
  placement: TablePlacement;
  projectParameters: ProjectParameter[];
  selected: boolean;
  setup: TableSetup;
}) {
  const label = getSourceName(placement.source, componentsById, collectionsById);
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    id: getTablePlacementDragId(placement.id),
    data: {
      kind: "placement",
      placementId: placement.id,
      source: placement.source
    } satisfies TableDragData
  });
  const dragTransform = transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined;

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Placement ${label}`}
      className="table-setup-placement"
      data-dragging={isDragging ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      style={{
        left: `${(placement.x / setup.width) * 100}%`,
        top: `${(placement.y / setup.height) * 100}%`,
        transform: dragTransform,
        zIndex: isDragging ? 5 : undefined
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <TableSurfaceItemContent label={label} rotationDeg={placement.rotationDeg}>
        <SourceVisual
          collectionsById={collectionsById}
          componentsById={componentsById}
          face={placement.face}
          projectParameters={projectParameters}
          source={placement.source}
        />
      </TableSurfaceItemContent>
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
  mixedChildSelection,
  onAddChildZone,
  onChangeZoneType,
  onRemoveMixedChild,
  onRemovePlacement,
  onRemoveZone,
  onUpdateMixedChild,
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
  mixedChildSelection?: SelectedMixedChild;
  onAddChildZone: (parentId: string, childrenType: ZoneChildType) => void;
  onChangeZoneType: (zone: TableZone, childrenType: ZoneChildType) => void;
  onRemoveMixedChild: (zoneId: string, childId: string) => void;
  onRemovePlacement: (id: string) => void;
  onRemoveZone: (id: string) => void;
  onUpdateMixedChild: (zoneId: string, childId: string, patch: Partial<ZoneMixedChild>) => void;
  onUpdatePlacement: (id: string, patch: Partial<TablePlacement>) => void;
  onUpdateZone: (id: string, patch: Partial<TableZone>) => void;
  onUpdateZoneBackgroundImage: (zone: TableZone, file: File | null) => void;
  onUpdateZoneSource: (zone: ZoneSource, source: TableSource | undefined) => void;
  placement?: TablePlacement;
  setup: TableSetup;
  zone?: RenderedZone;
}) {
  if (mixedChildSelection) {
    const { child, itemSize, label, renderedZone } = mixedChildSelection;
    const mixedZone = renderedZone.zone;
    const maxX = Math.max(0, mixedZone.width - itemSize.width);
    const maxY = Math.max(0, mixedZone.height - itemSize.height);
    const showPositionFields = mixedZone.layout === "free";

    return (
      <Stack gap="md">
        <Box>
          <Title order={3} size="h4">
            Mixed item
          </Title>
          <Text c="dimmed" size="sm">
            {label} in {mixedZone.name}
          </Text>
        </Box>
        <Box>
          <Text fw={600} mb={6} size="sm">
            Face
          </Text>
          <SegmentedControl
            data={placementFaceOptions}
            fullWidth
            value={child.face}
            onChange={(value) =>
              onUpdateMixedChild(mixedZone.id, child.id, { face: value as TablePlacementFace })
            }
          />
        </Box>
        {showPositionFields ? (
          <SimpleGrid cols={2}>
            <NumberInput
              aria-label="Mixed item X"
              allowDecimal={false}
              label="X (mm)"
              min={0}
              value={child.x}
              onChange={(value) =>
                onUpdateMixedChild(mixedZone.id, child.id, {
                  x: clamp(toNumberInputValue(value, child.x), 0, maxX)
                })
              }
            />
            <NumberInput
              aria-label="Mixed item Y"
              allowDecimal={false}
              label="Y (mm)"
              min={0}
              value={child.y}
              onChange={(value) =>
                onUpdateMixedChild(mixedZone.id, child.id, {
                  y: clamp(toNumberInputValue(value, child.y), 0, maxY)
                })
              }
            />
          </SimpleGrid>
        ) : null}
        <NumberInput
          allowDecimal={false}
          label="Rotation"
          value={child.rotationDeg}
          onChange={(value) =>
            onUpdateMixedChild(mixedZone.id, child.id, {
              rotationDeg: normalizeDegrees(toNumberInputValue(value, child.rotationDeg))
            })
          }
        />
        <Group gap="xs">
          <Button
            leftSection={<RotateCcw size={14} />}
            radius={8}
            variant="light"
            onClick={() =>
              onUpdateMixedChild(mixedZone.id, child.id, {
                rotationDeg: normalizeDegrees(child.rotationDeg - 15)
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
              onUpdateMixedChild(mixedZone.id, child.id, {
                rotationDeg: normalizeDegrees(child.rotationDeg + 15)
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
          onClick={() => onRemoveMixedChild(mixedZone.id, child.id)}
        >
          Delete mixed item
        </Button>
      </Stack>
    );
  }

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
    const sourceZone = zoneSupportsSource(item) ? item : null;
    const sourceOptions = sourceZone
      ? [
          { label: "No source", value: noSourceOption },
          ...components
            .filter((component) =>
              componentMatchesZoneChildType(component, sourceZone.childrenType)
            )
            .map((component) => ({
              label: `${component.name} (${componentTypeLabels[component.type]})`,
              value: sourceToSelectValue({ kind: "component", componentId: component.id })
            })),
          ...collections
            .filter((collection) =>
              collectionMatchesZoneChildType(collection, sourceZone.childrenType, componentsById)
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
    const showCapacityFields = item.childrenType !== "zone";

    return (
      <Stack gap="md">
        <Box>
          <Title order={3} size="h4">
            Zone
          </Title>
          <Text c="dimmed" size="sm">
            {item.childrenType === "zone"
              ? "Container"
              : item.childrenType === "mixed"
                ? "Mixed zone"
                : `${zoneChildTypeLabels[item.childrenType]} source`}
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
          onChange={(event) =>
            onUpdateZone(item.id, { name: event.currentTarget.value } as Partial<TableZone>)
          }
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
                      y: clamp(
                        toNumberInputValue(value, item.y),
                        0,
                        zone.parentHeight - item.height
                      )
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
        ) : item.childrenType === "zone" ? (
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
                <Menu.Item key={option.value} onClick={() => onAddChildZone(item.id, option.value)}>
                  {option.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        ) : null}

        <SimpleGrid cols={2}>
          <NumberInput
            allowDecimal={false}
            label="Border width"
            min={0}
            value={item.border.width}
            onChange={(value) =>
              onUpdateZone(item.id, {
                border: {
                  ...item.border,
                  width: Math.max(0, toNumberInputValue(value, item.border.width))
                }
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
              background: createBackgroundForType(
                (value ?? "none") as ZoneBackground["type"],
                item.background
              )
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
      <DeckMarker card={card} compact={compact} face={face} projectParameters={projectParameters} />
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

function DeckMarker({
  card,
  compact,
  face,
  projectParameters
}: {
  card: GameComponent;
  compact: boolean;
  face: TablePlacementFace;
  projectParameters: ProjectParameter[];
}) {
  return (
    <Box className="table-setup-deck-visual">
      <ComponentVisual
        compact={compact}
        component={card}
        face={face}
        projectParameters={projectParameters}
      />
    </Box>
  );
}

export function ComponentVisual({
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
