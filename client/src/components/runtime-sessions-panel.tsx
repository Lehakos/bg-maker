import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type ClientRect,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier
} from "@dnd-kit/core";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  History,
  Maximize2,
  Minimize2,
  Play,
  RefreshCw,
  RotateCw,
  Shuffle,
  SquareStack,
  Trash2
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  clampRuntimeFreeZonePoint,
  componentTypeMatchesZoneChildType,
  runtimeFreeZoneSnap,
  snapRuntimeFreeZonePoint,
  type ComponentCollection,
  type GameComponent,
  type ProjectParameter,
  type RuntimeFreeZoneSnapRect,
  type RuntimeActionInput,
  type RuntimeInstance,
  type RuntimeLocation,
  type RuntimeSession,
  type RuntimeSessionSummary,
  type TablePlacement,
  type TableSource,
  type ZoneItemContainer,
  zoneSupportsSource
} from "@bg-maker/shared";
import {
  applyRuntimeAction,
  createRuntimeSession,
  deleteRuntimeSession,
  getApiErrorMessage,
  getRuntimeSession,
  getRuntimeSessions
} from "../api/client";
import { componentTypeLabels, zoneChildTypeLabels } from "./component-labels";
import { ComponentVisual } from "./table-setup-editor";
import {
  flattenRenderedZones,
  getComponentTableSize,
  getSourceName,
  getZoneBackgroundStyle,
  getZoneItemPoint,
  type RenderedZone
} from "./table-setup-utils";
import "./runtime-sessions-panel.css";

type RuntimeSessionsPanelProps = {
  collections: ComponentCollection[];
  components: GameComponent[];
  projectId: string;
  projectParameters: ProjectParameter[];
};

type RuntimeFreeDropPreview = {
  instanceId: string;
  point: {
    x: number;
    y: number;
  };
  zoneId: string;
};

type RuntimeSurfaceSize = {
  height: number;
  width: number;
};

const runtimeZoneDropPrefix = "runtime-zone:";

export function RuntimeSessionsPanel({
  collections,
  components,
  projectId,
  projectParameters
}: RuntimeSessionsPanelProps) {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [activeDragInstanceId, setActiveDragInstanceId] = useState<string | null>(null);
  const [hoverZoneId, setHoverZoneId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ["runtime-sessions", projectId],
    queryFn: () => getRuntimeSessions(projectId),
    enabled: projectId.length > 0,
    retry: false
  });
  const sessions = sessionsQuery.data ?? [];
  const activeSessionId = selectedSessionId ?? sessions[0]?.id ?? null;

  const sessionQuery = useQuery({
    queryKey: ["runtime-session", projectId, activeSessionId],
    queryFn: () => getRuntimeSession(projectId, activeSessionId ?? ""),
    enabled: projectId.length > 0 && activeSessionId !== null,
    retry: false
  });

  const createMutation = useMutation({
    mutationFn: () => createRuntimeSession(projectId),
    onSuccess: async (session) => {
      setSelectedSessionId(session.id);
      setSelectedInstanceId(null);
      queryClient.setQueryData(["runtime-session", projectId, session.id], session);
      await queryClient.invalidateQueries({ queryKey: ["runtime-sessions", projectId] });
    },
    onError: (error) => setRuntimeError(getApiErrorMessage(error))
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, sessionId }: { action: RuntimeActionInput; sessionId: string }) =>
      applyRuntimeAction(projectId, sessionId, action),
    onMutate: ({ action, sessionId }) => {
      const queryKey = ["runtime-session", projectId, sessionId] as const;
      void queryClient.cancelQueries({ queryKey });
      const previousSession = queryClient.getQueryData<RuntimeSession>(queryKey);
      const optimisticSession = previousSession
        ? optimisticallyApplyRuntimeAction(previousSession, action)
        : null;

      if (optimisticSession) {
        queryClient.setQueryData(queryKey, optimisticSession);
      }

      return { previousSession, queryKey };
    },
    onSuccess: async (session) => {
      setRuntimeError(null);
      queryClient.setQueryData(["runtime-session", projectId, session.id], session);
      await queryClient.invalidateQueries({ queryKey: ["runtime-sessions", projectId] });
    },
    onError: (error, _variables, context) => {
      if (context?.previousSession) {
        queryClient.setQueryData(context.queryKey, context.previousSession);
      }

      setRuntimeError(getApiErrorMessage(error));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deleteRuntimeSession(projectId, sessionId),
    onSuccess: async (_, sessionId) => {
      setSelectedSessionId((current) => (current === sessionId ? null : current));
      setSelectedInstanceId(null);
      queryClient.removeQueries({ queryKey: ["runtime-session", projectId, sessionId] });
      await queryClient.invalidateQueries({ queryKey: ["runtime-sessions", projectId] });
    },
    onError: (error) => setRuntimeError(getApiErrorMessage(error))
  });

  const session = sessionQuery.data ?? null;
  const componentsById = useMemo(
    () => new Map(components.map((component) => [component.id, component])),
    [components]
  );
  const collectionsById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection])),
    [collections]
  );

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === rootRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function createSession() {
    enterFullscreen();
    createMutation.mutate();
  }

  function enterFullscreen() {
    if (document.fullscreenElement || !rootRef.current?.requestFullscreen) {
      return;
    }

    void rootRef.current.requestFullscreen().catch(() => undefined);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement === rootRef.current) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }

    enterFullscreen();
  }

  const applyAction = (action: RuntimeActionInput) => {
    if (!activeSessionId) {
      return;
    }

    setRuntimeError(null);
    actionMutation.mutate({ action, sessionId: activeSessionId });
  };

  const selectedInstance = selectedInstanceId
    ? session?.instances.find((instance) => instance.id === selectedInstanceId)
    : undefined;
  const visibleSelectedInstanceId = selectedInstance?.id ?? null;

  return (
    <Stack
      ref={rootRef}
      className="runtime-root"
      data-fullscreen={isFullscreen ? "true" : undefined}
      gap="md"
    >
      {runtimeError || sessionsQuery.isError || sessionQuery.isError ? (
        <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
          {runtimeError ??
            (sessionsQuery.error
              ? getApiErrorMessage(sessionsQuery.error)
              : sessionQuery.error
                ? getApiErrorMessage(sessionQuery.error)
                : "Runtime error")}
        </Alert>
      ) : null}

      <Box className="runtime-workspace">
        <Box className="runtime-session-list">
          <RuntimeSessionList
            loading={sessionsQuery.isLoading}
            selectedSessionId={activeSessionId}
            sessions={sessions}
            onCreate={createSession}
            onDelete={(sessionId) => deleteMutation.mutate(sessionId)}
            onSelect={(sessionId) => {
              setSelectedSessionId(sessionId);
              setSelectedInstanceId(null);
            }}
            onToggleFullscreen={toggleFullscreen}
            fullscreen={isFullscreen}
          />
        </Box>

        <Box className="runtime-stage">
          {sessionQuery.isLoading ? (
            <Box className="runtime-empty">
              <Text c="dimmed" size="sm">
                Loading session
              </Text>
            </Box>
          ) : session ? (
            <RuntimeTable
              activeDragInstanceId={activeDragInstanceId}
              collectionsById={collectionsById}
              componentsById={componentsById}
              fullscreen={isFullscreen}
              hoverZoneId={hoverZoneId}
              projectParameters={projectParameters}
              selectedInstanceId={visibleSelectedInstanceId}
              session={session}
              onAction={applyAction}
              onDragEnd={() => {
                setActiveDragInstanceId(null);
                setHoverZoneId(null);
              }}
              onDragStart={setActiveDragInstanceId}
              onHoverZone={setHoverZoneId}
              onSelectInstance={setSelectedInstanceId}
              onToggleFullscreen={toggleFullscreen}
            />
          ) : (
            <Box className="runtime-empty">
              <ThemeIcon color="teal" radius={8} variant="light">
                <Play size={18} />
              </ThemeIcon>
              <Text c="dimmed" size="sm" ta="center">
                Create a session from the current table layout
              </Text>
              <Button
                leftSection={<Play size={16} />}
                loading={createMutation.isPending}
                radius={8}
                onClick={createSession}
              >
                New session
              </Button>
            </Box>
          )}
        </Box>

        <Box className="runtime-inspector">
          <RuntimeInspector
            actionPending={actionMutation.isPending}
            collectionsById={collectionsById}
            componentsById={componentsById}
            instance={selectedInstance}
            session={session}
            onAction={applyAction}
          />
        </Box>
      </Box>
    </Stack>
  );
}

function RuntimeSessionList({
  fullscreen,
  loading,
  onCreate,
  onDelete,
  onSelect,
  onToggleFullscreen,
  selectedSessionId,
  sessions
}: {
  fullscreen: boolean;
  loading: boolean;
  onCreate: () => void;
  onDelete: (sessionId: string) => void;
  onSelect: (sessionId: string) => void;
  onToggleFullscreen: () => void;
  selectedSessionId: string | null;
  sessions: RuntimeSessionSummary[];
}) {
  return (
    <Stack className="runtime-panel-content" gap="md">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon color="teal" radius={8} variant="light">
            <Play size={18} />
          </ThemeIcon>
          <Box>
            <Title order={2} size="h3">
              Sessions
            </Title>
            <Text c="dimmed" size="sm">
              Manual playtests
            </Text>
          </Box>
        </Group>
        <Tooltip label={fullscreen ? "Exit fullscreen" : "Fullscreen"} withArrow>
          <ActionIcon
            aria-label={fullscreen ? "Exit runtime fullscreen" : "Open runtime fullscreen"}
            radius={8}
            size="lg"
            variant="light"
            onClick={onToggleFullscreen}
          >
            {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </ActionIcon>
        </Tooltip>
      </Group>
      <Button leftSection={<Play size={16} />} radius={8} onClick={onCreate}>
        New session
      </Button>
      <ScrollArea className="runtime-panel-scroll" type="auto">
        <Stack gap="xs" pr="xs">
          {loading ? (
            <Text c="dimmed" size="sm">
              Loading sessions
            </Text>
          ) : null}
          {sessions.map((session) => (
            <Box
              key={session.id}
              className="runtime-session-button"
              data-active={session.id === selectedSessionId ? "true" : undefined}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(session.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(session.id);
                }
              }}
            >
              <Box className="runtime-session-button-text">
                <Text fw={700} size="sm">
                  {session.name}
                </Text>
                <Text c="dimmed" size="xs">
                  {session.instanceCount} items, {session.actionCount} actions
                </Text>
              </Box>
              <Tooltip label="Delete session" withArrow>
                <ActionIcon
                  aria-label={`Delete session ${session.name}`}
                  color="red"
                  radius={8}
                  size="sm"
                  variant="subtle"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(session.id);
                  }}
                >
                  <Trash2 size={14} />
                </ActionIcon>
              </Tooltip>
            </Box>
          ))}
          {!loading && sessions.length === 0 ? (
            <Text c="dimmed" size="sm">
              No sessions yet
            </Text>
          ) : null}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

function RuntimeTable({
  activeDragInstanceId,
  collectionsById,
  componentsById,
  fullscreen,
  hoverZoneId,
  onAction,
  onDragEnd,
  onDragStart,
  onHoverZone,
  onSelectInstance,
  onToggleFullscreen,
  projectParameters,
  selectedInstanceId,
  session
}: {
  activeDragInstanceId: string | null;
  collectionsById: Map<string, ComponentCollection>;
  componentsById: Map<string, GameComponent>;
  fullscreen: boolean;
  hoverZoneId: string | null;
  onAction: (action: RuntimeActionInput) => void;
  onDragEnd: () => void;
  onDragStart: (instanceId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
  onSelectInstance: (instanceId: string | null) => void;
  onToggleFullscreen: () => void;
  projectParameters: ProjectParameter[];
  selectedInstanceId: string | null;
  session: RuntimeSession;
}) {
  const renderedZones = useMemo(
    () =>
      flattenRenderedZones(
        session.setupSnapshot.zones,
        0,
        0,
        session.setupSnapshot.width,
        session.setupSnapshot.height,
        0
      ),
    [session.setupSnapshot]
  );
  const activeDragInstance = activeDragInstanceId
    ? (session.instances.find((instance) => instance.id === activeDragInstanceId) ?? null)
    : null;
  const placementStacks = getPlacementStacks(session);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const zonesById = useMemo(
    () => new Map(renderedZones.map((renderedZone) => [renderedZone.zone.id, renderedZone.zone])),
    [renderedZones]
  );
  const activeDragComponent = activeDragInstance
    ? componentsById.get(activeDragInstance.componentId)
    : undefined;
  const [freeDropPreview, setFreeDropPreview] = useState<RuntimeFreeDropPreview | null>(null);
  const [surfaceSize, setSurfaceSize] = useState<RuntimeSurfaceSize>({ height: 0, width: 0 });
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const surface = surfaceRef.current;

    if (!surface) {
      return;
    }

    const updateSurfaceSize = () => {
      const rect = surface.getBoundingClientRect();

      setSurfaceSize((current) => {
        if (current.width === rect.width && current.height === rect.height) {
          return current;
        }

        return { height: rect.height, width: rect.width };
      });
    };

    updateSurfaceSize();

    const observer = new ResizeObserver(updateSurfaceSize);
    observer.observe(surface);

    return () => observer.disconnect();
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setFreeDropPreview(null);
    onHoverZone(null);
    onDragStart(String(event.active.id));
  }

  function handleDragMove(event: DragMoveEvent) {
    updateFreeDropPreview(event);
  }

  function handleDragOver(event: DragOverEvent) {
    onHoverZone(getRuntimeZoneIdFromDropId(event.over?.id));
    updateFreeDropPreview(event);
  }

  function updateFreeDropPreview(event: DragMoveEvent | DragOverEvent) {
    const instance = session.instances.find((item) => item.id === String(event.active.id));
    const zoneId = getRuntimeZoneIdFromDropId(event.over?.id);
    const zone = zoneId ? zonesById.get(zoneId) : undefined;
    const component = instance ? componentsById.get(instance.componentId) : undefined;

    if (
      !instance ||
      !component ||
      !zone ||
      zone.childrenType === "zone" ||
      zone.layout !== "free" ||
      !zoneAcceptsInstance(session, zone, instance, collectionsById)
    ) {
      setFreeDropPreview(null);
      return;
    }

    const point = getRuntimeFreeZoneDropPoint(
      event,
      session,
      zone,
      instance,
      component,
      componentsById
    );

    setFreeDropPreview(point ? { instanceId: instance.id, point, zoneId: zone.id } : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const instance = session.instances.find((item) => item.id === String(event.active.id));
    const zoneId = getRuntimeZoneIdFromDropId(event.over?.id);
    const zone = zoneId ? zonesById.get(zoneId) : undefined;
    const component = instance ? componentsById.get(instance.componentId) : undefined;

    if (!instance || !component || !zone || zone.childrenType === "zone") {
      onHoverZone(null);
      onDragEnd();
      return;
    }

    if (!zoneAcceptsInstance(session, zone, instance, collectionsById)) {
      onHoverZone(null);
      onDragEnd();
      return;
    }

    const action: RuntimeActionInput = {
      type: "MOVE_INSTANCE",
      instanceId: instance.id,
      target: getRuntimeMoveTarget(event, session, zone, instance, component, componentsById)
    };

    onHoverZone(null);
    setFreeDropPreview(null);
    onDragEnd();
    onAction(action);
  }

  function handleDragCancel() {
    onHoverZone(null);
    setFreeDropPreview(null);
    onDragEnd();
  }

  return (
    <DndContext
      collisionDetection={pointerWithin}
      sensors={sensors}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
    >
      <Box
        aria-label="Runtime table viewport"
        className="runtime-table-shell"
        onClick={() => onSelectInstance(null)}
      >
        <Tooltip label={fullscreen ? "Exit fullscreen" : "Fullscreen"} withArrow>
          <ActionIcon
            aria-label={fullscreen ? "Exit session fullscreen" : "Open session fullscreen"}
            className="runtime-table-fullscreen"
            radius={8}
            size="lg"
            variant="filled"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFullscreen();
            }}
          >
            {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </ActionIcon>
        </Tooltip>
        <Box
          ref={surfaceRef}
          aria-label="Runtime table surface"
          className="runtime-table-surface"
          style={{
            aspectRatio: `${session.setupSnapshot.width} / ${session.setupSnapshot.height}`
          }}
        >
          {renderedZones.map((renderedZone) => (
            <RuntimeZoneView
              key={renderedZone.zone.id}
              activeDragInstance={activeDragInstance}
              collectionsById={collectionsById}
              componentsById={componentsById}
              dropTarget={hoverZoneId === renderedZone.zone.id}
              freeDropPreview={freeDropPreview}
              projectParameters={projectParameters}
              renderedZone={renderedZone}
              selectedInstanceId={selectedInstanceId}
              session={session}
              surfaceSize={surfaceSize}
              onAction={onAction}
              onSelectInstance={onSelectInstance}
            />
          ))}

          {placementStacks.map(({ instances, placement }) => (
            <RuntimePlacementStack
              key={placement.id}
              activeDragInstanceId={activeDragInstanceId}
              collectionsById={collectionsById}
              componentsById={componentsById}
              instances={instances}
              placement={placement}
              projectParameters={projectParameters}
              selectedInstanceId={selectedInstanceId}
              session={session}
              surfaceSize={surfaceSize}
              onAction={onAction}
              onSelectInstance={onSelectInstance}
            />
          ))}
        </Box>
      </Box>
      <DragOverlay dropAnimation={null}>
        {activeDragInstance && activeDragComponent ? (
          <Box className="runtime-drag-overlay">
            <RuntimeInstanceOverlay
              component={activeDragComponent}
              instance={activeDragInstance}
              projectParameters={projectParameters}
              style={getRuntimeTableInstanceSizeStyle(session, surfaceSize, activeDragComponent)}
              tableSized
            />
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function RuntimeZoneView({
  activeDragInstance,
  collectionsById,
  componentsById,
  dropTarget,
  freeDropPreview,
  onAction,
  onSelectInstance,
  projectParameters,
  renderedZone,
  selectedInstanceId,
  session,
  surfaceSize
}: {
  activeDragInstance: RuntimeInstance | null;
  collectionsById: Map<string, ComponentCollection>;
  componentsById: Map<string, GameComponent>;
  dropTarget: boolean;
  freeDropPreview: RuntimeFreeDropPreview | null;
  onAction: (action: RuntimeActionInput) => void;
  onSelectInstance: (instanceId: string) => void;
  projectParameters: ProjectParameter[];
  renderedZone: RenderedZone;
  selectedInstanceId: string | null;
  session: RuntimeSession;
  surfaceSize: RuntimeSurfaceSize;
}) {
  const zone = renderedZone.zone;
  const isContainerZone = zone.childrenType === "zone";
  const instances = isContainerZone ? [] : getZoneInstances(session, zone.id);
  const freePreviewInstance =
    freeDropPreview?.zoneId === zone.id &&
    activeDragInstance?.id === freeDropPreview.instanceId &&
    !isContainerZone
      ? activeDragInstance
      : null;
  const freePreviewComponent = freePreviewInstance
    ? componentsById.get(freePreviewInstance.componentId)
    : undefined;
  const dropEligible =
    activeDragInstance && !isContainerZone
      ? zoneAcceptsInstance(session, zone, activeDragInstance, collectionsById)
      : false;
  const isDeck = zoneSupportsSource(zone) && sourceIsDeck(zone.source, collectionsById);
  const collectionCount = zoneSupportsSource(zone)
    ? getRuntimeCollectionCount(zone.source, instances, collectionsById)
    : null;
  const usesFreeSnap = !isContainerZone && zone.layout === "free";
  const freeGridStyle = usesFreeSnap
    ? {
        "--runtime-free-grid-x": `${(runtimeFreeZoneSnap / zone.width) * 100}%`,
        "--runtime-free-grid-y": `${(runtimeFreeZoneSnap / zone.height) * 100}%`
      }
    : {};
  const { isOver, setNodeRef } = useDroppable({
    id: getRuntimeZoneDropId(zone.id),
    data: { zoneId: zone.id },
    disabled: !dropEligible
  });

  return (
    <Box
      ref={setNodeRef}
      aria-label={`Runtime zone ${zone.name}`}
      className="runtime-zone"
      data-drop-eligible={dropEligible ? "true" : undefined}
      data-drop-target={dropTarget || isOver ? "true" : undefined}
      data-free-snap={usesFreeSnap ? "true" : undefined}
      data-layout={zone.layout}
      data-visual-hidden={isContainerZone ? "true" : undefined}
      data-zone-type={zone.childrenType}
      style={
        {
          ...(isContainerZone ? {} : getZoneBackgroundStyle(zone.background)),
          ...freeGridStyle,
          borderColor: zone.border.color,
          borderStyle: isContainerZone || zone.border.width === 0 ? "none" : "solid",
          borderWidth: isContainerZone ? 0 : zone.border.width,
          height: `${(zone.height / session.setupSnapshot.height) * 100}%`,
          left: `${(renderedZone.absoluteX / session.setupSnapshot.width) * 100}%`,
          overflow: "visible",
          top: `${(renderedZone.absoluteY / session.setupSnapshot.height) * 100}%`,
          width: `${(zone.width / session.setupSnapshot.width) * 100}%`
        } as CSSProperties
      }
      onClick={(event) => event.stopPropagation()}
    >
      {!isContainerZone ? (
        <Group className="runtime-zone-label" gap={6}>
          <Text fw={700} size="xs">
            {zone.name}
          </Text>
          <Badge color="teal" radius={6} size="xs">
            {zoneChildTypeLabels[zone.childrenType]}
          </Badge>
          {collectionCount !== null ? (
            <RuntimeCollectionCountBadge count={collectionCount} />
          ) : null}
          {isDeck && instances.length > 1 ? (
            <Tooltip label="Shuffle" withArrow>
              <ActionIcon
                aria-label={`Shuffle ${zone.name}`}
                radius={8}
                size="sm"
                variant="filled"
                onClick={(event) => {
                  event.stopPropagation();
                  onAction({
                    type: "SHUFFLE_STACK",
                    location: { kind: "zone", zoneId: zone.id, index: 0 }
                  });
                }}
              >
                <Shuffle size={14} />
              </ActionIcon>
            </Tooltip>
          ) : null}
        </Group>
      ) : null}

      {!isContainerZone ? (
        <Box className="runtime-zone-content" style={{ overflow: zone.overflow }}>
          {instances.map((instance, index) => {
            const component = componentsById.get(instance.componentId);

            if (!component) {
              return null;
            }

            const renderIndex = isDeck ? Math.max(0, instances.length - index - 1) : index;
            const point = getRuntimeZoneItemPoint(zone, component, instance, renderIndex);
            const draggable = !isDeck || instance.location.index === 0;

            return (
              <RuntimeInstanceView
                key={instance.id}
                component={component}
                draggable={draggable}
                instance={instance}
                projectParameters={projectParameters}
                selected={selectedInstanceId === instance.id}
                style={{
                  ...getRuntimeTableInstanceSizeStyle(session, surfaceSize, component),
                  left: `${(point.x / zone.width) * 100}%`,
                  top: `${(point.y / zone.height) * 100}%`,
                  zIndex: isDeck ? instances.length - index : index + 1
                }}
                tableSized
                onSelect={onSelectInstance}
              />
            );
          })}
          {freePreviewInstance && freePreviewComponent && freeDropPreview ? (
            <Box
              className="runtime-free-snap-preview"
              style={{
                ...getRuntimeTableInstanceSizeStyle(session, surfaceSize, freePreviewComponent),
                left: `${(freeDropPreview.point.x / zone.width) * 100}%`,
                top: `${(freeDropPreview.point.y / zone.height) * 100}%`
              }}
            >
              <RuntimeInstanceOverlay
                component={freePreviewComponent}
                instance={freePreviewInstance}
                projectParameters={projectParameters}
                style={{ height: "100%", width: "100%" }}
                tableSized
              />
            </Box>
          ) : null}
          {instances.length === 0 ? (
            <Text className="runtime-zone-empty" c="dimmed" size="xs">
              Empty
            </Text>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

function RuntimeCollectionCountBadge({ count }: { count: number }) {
  return (
    <Box className="runtime-collection-count" component="span" aria-label={`${count} items`}>
      <SquareStack aria-hidden="true" size={11} />
      <span>{count}</span>
    </Box>
  );
}

function RuntimePlacementStack({
  activeDragInstanceId,
  collectionsById,
  componentsById,
  instances,
  onAction,
  onSelectInstance,
  placement,
  projectParameters,
  selectedInstanceId,
  session,
  surfaceSize
}: {
  activeDragInstanceId: string | null;
  collectionsById: Map<string, ComponentCollection>;
  componentsById: Map<string, GameComponent>;
  instances: RuntimeInstance[];
  onAction: (action: RuntimeActionInput) => void;
  onSelectInstance: (instanceId: string) => void;
  placement: TablePlacement;
  projectParameters: ProjectParameter[];
  selectedInstanceId: string | null;
  session: RuntimeSession;
  surfaceSize: RuntimeSurfaceSize;
}) {
  const sourceInstance = instances[0];
  const sourceComponent = sourceInstance
    ? componentsById.get(sourceInstance.componentId)
    : undefined;

  if (!sourceInstance || !sourceComponent) {
    return null;
  }

  const isDeck = sourceIsDeck(placement.source, collectionsById);
  const label = getSourceName(placement.source, componentsById, collectionsById);
  const activeDragFromStack = instances.some((instance) => instance.id === activeDragInstanceId);
  const visibleInstances = activeDragFromStack
    ? instances.filter((instance) => instance.id !== activeDragInstanceId)
    : instances;
  const visibleStackCount = visibleInstances.length;
  const visibleTopInstance = visibleInstances[0];
  const visibleTopComponent = visibleTopInstance
    ? componentsById.get(visibleTopInstance.componentId)
    : undefined;
  const selectedVisibleInstance = visibleTopInstance ?? sourceInstance;
  const collectionCount = getRuntimeCollectionCount(
    placement.source,
    visibleInstances,
    collectionsById
  );
  const stackCount = collectionCount ?? (visibleStackCount > 1 ? visibleStackCount : null);

  return (
    <Box
      aria-label={`Runtime loose stack ${label}`}
      className="runtime-placement-stack"
      data-drag-source={activeDragFromStack ? "true" : undefined}
      style={{
        ...getRuntimeTableInstanceSizeStyle(session, surfaceSize, sourceComponent),
        left: `${(placement.x / session.setupSnapshot.width) * 100}%`,
        top: `${(placement.y / session.setupSnapshot.height) * 100}%`
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelectInstance(selectedVisibleInstance.id);
      }}
    >
      <Box className={activeDragFromStack ? "runtime-placement-hidden-source" : undefined}>
        <RuntimeInstanceView
          component={sourceComponent}
          draggable={sourceComponent.type !== "die"}
          instance={sourceInstance}
          projectParameters={projectParameters}
          selected={!activeDragFromStack && selectedInstanceId === sourceInstance.id}
          style={getRuntimeTableInstanceSizeStyle(session, surfaceSize, sourceComponent)}
          tableSized
          onSelect={onSelectInstance}
        />
      </Box>
      {activeDragFromStack && visibleTopInstance && visibleTopComponent ? (
        <Box className="runtime-placement-remainder">
          <RuntimeInstanceView
            component={visibleTopComponent}
            draggable={false}
            instance={visibleTopInstance}
            projectParameters={projectParameters}
            selected={selectedInstanceId === visibleTopInstance.id}
            style={getRuntimeTableInstanceSizeStyle(session, surfaceSize, visibleTopComponent)}
            tableSized
            onSelect={onSelectInstance}
          />
        </Box>
      ) : null}
      <Group className="runtime-placement-badges" gap={4}>
        {stackCount !== null ? <RuntimeCollectionCountBadge count={stackCount} /> : null}
        {!activeDragFromStack && isDeck && visibleStackCount > 1 ? (
          <Tooltip label="Shuffle" withArrow>
            <ActionIcon
              aria-label={`Shuffle ${label}`}
              radius={8}
              size="sm"
              variant="filled"
              onClick={(event) => {
                event.stopPropagation();
                onAction({
                  type: "SHUFFLE_STACK",
                  location: { kind: "placement", placementId: placement.id, index: 0 }
                });
              }}
            >
              <Shuffle size={14} />
            </ActionIcon>
          </Tooltip>
        ) : null}
        {!activeDragFromStack && sourceComponent.type === "die" ? (
          <Tooltip label="Roll" withArrow>
            <ActionIcon
              aria-label={`Roll ${sourceComponent.name}`}
              radius={8}
              size="sm"
              variant="filled"
              onClick={(event) => {
                event.stopPropagation();
                onAction({ type: "ROLL_DIE", instanceId: sourceInstance.id });
              }}
            >
              <RefreshCw size={14} />
            </ActionIcon>
          </Tooltip>
        ) : null}
      </Group>
    </Box>
  );
}

function RuntimeInstanceView({
  component,
  draggable,
  instance,
  onSelect,
  projectParameters,
  selected,
  style,
  tableSized = false
}: {
  component: GameComponent;
  draggable: boolean;
  instance: RuntimeInstance;
  onSelect: (instanceId: string) => void;
  projectParameters: ProjectParameter[];
  selected: boolean;
  style?: CSSProperties;
  tableSized?: boolean;
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: instance.id,
    data: { instanceId: instance.id },
    disabled: !draggable
  });

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Runtime item ${component.name}`}
      className="runtime-instance"
      data-draggable={draggable ? "true" : undefined}
      data-dragging={isDragging ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      data-table-sized={tableSized ? "true" : undefined}
      data-tapped={instance.tapped ? "true" : undefined}
      style={style}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(instance.id);
      }}
    >
      <RuntimeInstanceVisual
        component={component}
        instance={instance}
        projectParameters={projectParameters}
      />
    </Box>
  );
}

function RuntimeInstanceOverlay({
  component,
  instance,
  projectParameters,
  style,
  tableSized = false
}: {
  component: GameComponent;
  instance: RuntimeInstance;
  projectParameters: ProjectParameter[];
  style?: CSSProperties;
  tableSized?: boolean;
}) {
  return (
    <Box
      aria-label={`Dragging ${component.name}`}
      className="runtime-instance"
      data-table-sized={tableSized ? "true" : undefined}
      data-tapped={instance.tapped ? "true" : undefined}
      style={style}
    >
      <RuntimeInstanceVisual
        component={component}
        instance={instance}
        projectParameters={projectParameters}
      />
    </Box>
  );
}

function RuntimeInstanceVisual({
  component,
  instance,
  projectParameters
}: {
  component: GameComponent;
  instance: RuntimeInstance;
  projectParameters: ProjectParameter[];
}) {
  return (
    <>
      <Box
        className="runtime-instance-body"
        style={{
          transform: `rotate(${instance.rotationDeg}deg)`
        }}
      >
        <ComponentVisual
          component={component}
          face={instance.faceUp ? "front" : "back"}
          projectParameters={projectParameters}
        />
      </Box>
    </>
  );
}

function RuntimeInspector({
  actionPending,
  componentsById,
  instance,
  onAction,
  session
}: {
  actionPending: boolean;
  collectionsById: Map<string, ComponentCollection>;
  componentsById: Map<string, GameComponent>;
  instance?: RuntimeInstance;
  onAction: (action: RuntimeActionInput) => void;
  session: RuntimeSession | null;
}) {
  const component = instance ? componentsById.get(instance.componentId) : undefined;
  const rollDisplay =
    component?.type === "die" && instance?.lastRoll
      ? getRuntimeRollDisplay(instance.lastRoll, component)
      : null;

  return (
    <Stack className="runtime-panel-content" gap="md">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon color="blue" radius={8} variant="light">
          <History size={18} />
        </ThemeIcon>
        <Box>
          <Title order={3} size="h4">
            Runtime
          </Title>
          <Text c="dimmed" size="sm">
            Inspector and log
          </Text>
        </Box>
      </Group>

      {session ? (
        <Button
          leftSection={<RefreshCw size={16} />}
          loading={actionPending}
          radius={8}
          variant="light"
          onClick={() => onAction({ type: "RESET_SESSION" })}
        >
          Reset session
        </Button>
      ) : null}

      {component && instance ? (
        <Stack gap="sm">
          <Box>
            <Text fw={700} size="sm">
              {component.name}
            </Text>
            <Text c="dimmed" size="xs">
              {componentTypeLabels[component.type]}
            </Text>
          </Box>
          <Group gap="xs">
            <Button
              leftSection={instance.faceUp ? <EyeOff size={14} /> : <Eye size={14} />}
              radius={8}
              size="xs"
              variant="light"
              onClick={() => onAction({ type: "FLIP_INSTANCE", instanceId: instance.id })}
            >
              {instance.faceUp ? "Hide" : "Reveal"}
            </Button>
            <Button
              leftSection={<RotateCw size={14} />}
              radius={8}
              size="xs"
              variant="light"
              onClick={() =>
                onAction({ type: "ROTATE_INSTANCE", instanceId: instance.id, deltaDeg: 90 })
              }
            >
              Rotate
            </Button>
            <Button
              radius={8}
              size="xs"
              variant="light"
              onClick={() =>
                onAction({
                  type: "ROTATE_INSTANCE",
                  instanceId: instance.id,
                  tapped: !instance.tapped
                })
              }
            >
              {instance.tapped ? "Untap" : "Tap"}
            </Button>
            {component.type === "die" ? (
              <Button
                leftSection={<RefreshCw size={14} />}
                radius={8}
                size="xs"
                variant="light"
                onClick={() => onAction({ type: "ROLL_DIE", instanceId: instance.id })}
              >
                Roll die
              </Button>
            ) : null}
          </Group>
          {rollDisplay ? (
            <Box className="runtime-roll-details">
              <Text c="dimmed" size="xs">
                Last roll
              </Text>
              <Text fw={800} size="lg">
                Result: {rollDisplay.resultText}
              </Text>
              <Text c="dimmed" size="sm">
                {rollDisplay.fullFaceText}
              </Text>
            </Box>
          ) : null}
        </Stack>
      ) : (
        <Box className="runtime-empty-compact">
          <Text c="dimmed" size="sm" ta="center">
            Select a runtime item
          </Text>
        </Box>
      )}

      <Box className="runtime-log-section">
        <Text fw={700} mb="xs" size="sm">
          Action log
        </Text>
        <ScrollArea className="runtime-log-scroll" type="auto">
          <Stack gap="xs" pr="xs">
            {[...(session?.actionLog ?? [])].reverse().map((entry) => (
              <RuntimeLogEntry key={entry.id} entry={entry} />
            ))}
            {session && session.actionLog.length === 0 ? (
              <Text c="dimmed" size="sm">
                No actions yet
              </Text>
            ) : null}
          </Stack>
        </ScrollArea>
      </Box>
    </Stack>
  );
}

function RuntimeLogEntry({ entry }: { entry: RuntimeSession["actionLog"][number] }) {
  const rollDisplay = parseRuntimeRollLogMessage(entry.message);

  return (
    <Box className="runtime-log-entry">
      {rollDisplay ? (
        <>
          <Text fw={600} size="sm">
            Rolled {rollDisplay.dieName}
          </Text>
          <Group className="runtime-log-roll-values" gap={6} wrap="wrap">
            <Text className="runtime-log-roll-value" size="xs">
              <Text span fw={700} inherit>
                Result:
              </Text>{" "}
              {rollDisplay.resultText}
            </Text>
            {rollDisplay.faceText ? (
              <Text className="runtime-log-roll-value" size="xs">
                {rollDisplay.faceText}
              </Text>
            ) : null}
          </Group>
        </>
      ) : (
        <Text fw={600} size="sm">
          {entry.message}
        </Text>
      )}
      <Text c="dimmed" size="xs">
        {new Date(entry.createdAt).toLocaleTimeString()}
      </Text>
    </Box>
  );
}

function getRuntimeRollDisplay(
  roll: NonNullable<RuntimeInstance["lastRoll"]>,
  component: Extract<GameComponent, { type: "die" }>
) {
  const resultText = roll.label?.trim() || String(roll.value);
  const fullFaceText = `Face ${roll.value} of ${component.sides}`;

  return {
    compactFaceText: `Face ${roll.value}/${component.sides}`,
    detailText: `Result ${resultText}, ${fullFaceText.toLowerCase()}`,
    fullFaceText,
    resultText
  };
}

function parseRuntimeRollLogMessage(message: string) {
  const detailedMatch = /^Rolled (.+): result (.+), face (\d+(?: of \d+)?)$/.exec(message);

  if (detailedMatch) {
    return {
      dieName: detailedMatch[1],
      faceText: `Face ${detailedMatch[3]}`,
      resultText: detailedMatch[2]
    };
  }

  const labeledLegacyMatch = /^Rolled (.+): (.+) \((\d+)\)$/.exec(message);

  if (labeledLegacyMatch) {
    return {
      dieName: labeledLegacyMatch[1],
      faceText: `Face ${labeledLegacyMatch[3]}`,
      resultText: labeledLegacyMatch[2]
    };
  }

  const plainLegacyMatch = /^Rolled (.+): (.+)$/.exec(message);

  if (plainLegacyMatch) {
    return {
      dieName: plainLegacyMatch[1],
      faceText: null,
      resultText: plainLegacyMatch[2]
    };
  }

  return null;
}

function getZoneInstances(session: RuntimeSession, zoneId: string) {
  return session.instances
    .filter((instance) => instance.location.kind === "zone" && instance.location.zoneId === zoneId)
    .sort((left, right) => left.location.index - right.location.index);
}

function optimisticallyApplyRuntimeAction(session: RuntimeSession, action: RuntimeActionInput) {
  if (action.type !== "MOVE_INSTANCE" || action.target.kind !== "zone") {
    return null;
  }

  const instance = session.instances.find((item) => item.id === action.instanceId);

  if (!instance) {
    return null;
  }

  return {
    ...session,
    instances: optimisticallyMoveInstance(session.instances, instance, action.target)
  };
}

function optimisticallyMoveInstance(
  instances: RuntimeInstance[],
  instance: RuntimeInstance,
  target: RuntimeLocation
) {
  const withoutInstance = instances.filter((item) => item.id !== instance.id);
  const targetStack = withoutInstance
    .filter((item) => runtimeLocationsMatch(item.location, target))
    .sort((left, right) => left.location.index - right.location.index);
  const targetStackIds = new Set(targetStack.map((item) => item.id));
  const clampedIndex = Math.min(Math.max(0, target.index), targetStack.length);
  const nextTargetStack = [...targetStack];

  nextTargetStack.splice(clampedIndex, 0, {
    ...instance,
    location: withRuntimeLocationIndex(target, clampedIndex)
  });

  return normalizeRuntimeLocationIndexes([
    ...withoutInstance.filter((item) => !targetStackIds.has(item.id)),
    ...nextTargetStack
  ]);
}

function normalizeRuntimeLocationIndexes(instances: RuntimeInstance[]) {
  const grouped = new Map<string, { instance: RuntimeInstance; order: number }[]>();

  instances.forEach((instance, order) => {
    const key = getRuntimeLocationKey(instance.location);
    grouped.set(key, [...(grouped.get(key) ?? []), { instance, order }]);
  });

  return Array.from(grouped.values()).flatMap((entries) =>
    entries
      .sort(
        (left, right) =>
          left.instance.location.index - right.instance.location.index || left.order - right.order
      )
      .map(({ instance }, index) => ({
        ...instance,
        location: { ...instance.location, index }
      }))
  );
}

function withRuntimeLocationIndex(location: RuntimeLocation, index: number): RuntimeLocation {
  if (location.kind === "placement") {
    return { kind: "placement", placementId: location.placementId, index };
  }

  return {
    kind: "zone",
    zoneId: location.zoneId,
    index,
    ...(typeof location.x === "number" ? { x: location.x } : {}),
    ...(typeof location.y === "number" ? { y: location.y } : {})
  };
}

function runtimeLocationsMatch(left: RuntimeLocation, right: RuntimeLocation) {
  return getRuntimeLocationKey(left) === getRuntimeLocationKey(right);
}

function getRuntimeLocationKey(location: RuntimeLocation) {
  return location.kind === "zone" ? `zone:${location.zoneId}` : `placement:${location.placementId}`;
}

function getRuntimeMoveTarget(
  event: DragEndEvent,
  session: RuntimeSession,
  zone: ZoneItemContainer,
  instance: RuntimeInstance,
  component: GameComponent,
  componentsById: Map<string, GameComponent>
): RuntimeLocation {
  const target: RuntimeLocation = {
    kind: "zone",
    zoneId: zone.id,
    index: getZoneInstances(session, zone.id).filter((item) => item.id !== instance.id).length
  };

  if (zone.layout !== "free") {
    return target;
  }

  const point = getRuntimeFreeZoneDropPoint(
    event,
    session,
    zone,
    instance,
    component,
    componentsById
  );

  return point ? { ...target, ...point } : target;
}

function getRuntimeFreeZoneDropPoint(
  event: DragEndEvent | DragMoveEvent | DragOverEvent,
  session: RuntimeSession,
  zone: ZoneItemContainer,
  instance: RuntimeInstance,
  component: GameComponent,
  componentsById: Map<string, GameComponent>
) {
  const activeRect = getActiveDropRect(event);
  const overRect = event.over?.rect;

  if (!activeRect || !overRect || overRect.width <= 0 || overRect.height <= 0) {
    return null;
  }

  const itemSize = getComponentTableSize(component);

  return snapRuntimeFreeZonePoint({
    itemHeight: itemSize.height,
    itemWidth: itemSize.width,
    snapRects: getRuntimeFreeZoneSnapRects(session, zone, instance.id, componentsById),
    x: ((activeRect.left - overRect.left) / overRect.width) * zone.width,
    y: ((activeRect.top - overRect.top) / overRect.height) * zone.height,
    zoneHeight: zone.height,
    zoneWidth: zone.width
  });
}

function getActiveDropRect(event: DragEndEvent | DragMoveEvent | DragOverEvent): ClientRect | null {
  const translated = event.active.rect.current.translated;

  if (translated) {
    return translated;
  }

  const initial = event.active.rect.current.initial;

  return initial ? translateClientRect(initial, event.delta.x, event.delta.y) : null;
}

function translateClientRect(rect: ClientRect, deltaX: number, deltaY: number): ClientRect {
  return {
    bottom: rect.bottom + deltaY,
    height: rect.height,
    left: rect.left + deltaX,
    right: rect.right + deltaX,
    top: rect.top + deltaY,
    width: rect.width
  };
}

function getRuntimeZoneItemPoint(
  zone: ZoneItemContainer,
  component: GameComponent,
  instance: RuntimeInstance,
  index: number
) {
  if (
    zone.layout === "free" &&
    instance.location.kind === "zone" &&
    instance.location.zoneId === zone.id &&
    typeof instance.location.x === "number" &&
    typeof instance.location.y === "number"
  ) {
    const itemSize = getComponentTableSize(component);

    return clampRuntimeFreeZonePoint({
      itemHeight: itemSize.height,
      itemWidth: itemSize.width,
      x: instance.location.x,
      y: instance.location.y,
      zoneHeight: zone.height,
      zoneWidth: zone.width
    });
  }

  return getZoneItemPoint(zone, component, index);
}

function getRuntimeTableInstanceSizeStyle(
  session: RuntimeSession,
  surfaceSize: RuntimeSurfaceSize,
  component: GameComponent
): CSSProperties {
  const size = getComponentTableSize(component);
  const tableWidth = Math.max(1, session.setupSnapshot.width);
  const tableHeight = Math.max(1, session.setupSnapshot.height);

  if (surfaceSize.width <= 0 || surfaceSize.height <= 0) {
    return {};
  }

  const heightPx = Math.max(1, (size.height / tableHeight) * surfaceSize.height);
  const widthPx = Math.max(1, (size.width / tableWidth) * surfaceSize.width);
  const textScale = Math.min(1, Math.max(0.45, widthPx / 58));

  return {
    "--runtime-component-text-scale": textScale,
    height: `${heightPx}px`,
    width: `${widthPx}px`
  } as CSSProperties;
}

function getRuntimeFreeZoneSnapRects(
  session: RuntimeSession,
  zone: ZoneItemContainer,
  activeInstanceId: string,
  componentsById: Map<string, GameComponent>
): RuntimeFreeZoneSnapRect[] {
  return getZoneInstances(session, zone.id)
    .filter((instance) => instance.id !== activeInstanceId)
    .map((instance, index) => {
      const component = componentsById.get(instance.componentId);

      if (!component) {
        return null;
      }

      const size = getComponentTableSize(component);
      const point = getRuntimeZoneItemPoint(zone, component, instance, index);

      return {
        height: size.height,
        width: size.width,
        x: point.x,
        y: point.y
      };
    })
    .filter((rect): rect is RuntimeFreeZoneSnapRect => rect !== null);
}

function getRuntimeZoneDropId(zoneId: string) {
  return `${runtimeZoneDropPrefix}${zoneId}`;
}

function getRuntimeZoneIdFromDropId(id: UniqueIdentifier | null | undefined) {
  const value = typeof id === "string" ? id : id === undefined || id === null ? "" : String(id);

  return value.startsWith(runtimeZoneDropPrefix) ? value.slice(runtimeZoneDropPrefix.length) : null;
}

function getPlacementStacks(session: RuntimeSession) {
  return session.setupSnapshot.placements
    .map((placement) => ({
      placement,
      instances: session.instances
        .filter(
          (instance) =>
            instance.location.kind === "placement" && instance.location.placementId === placement.id
        )
        .sort((left, right) => left.location.index - right.location.index)
    }))
    .filter((item) => item.instances.length > 0);
}

function zoneAcceptsInstance(
  session: RuntimeSession,
  zone: ZoneItemContainer,
  instance: RuntimeInstance,
  collectionsById: Map<string, ComponentCollection>
) {
  if (!componentTypeMatchesZoneChildType(instance.componentType, zone.childrenType)) {
    return false;
  }

  const zoneInstances = getZoneInstances(session, zone.id).filter(
    (item) => item.id !== instance.id
  );

  if (zone.capacity !== null && zoneInstances.length >= zone.capacity) {
    return false;
  }

  if (!zoneSupportsSource(zone) || !zone.source) {
    return true;
  }

  return sourceIncludesComponent(zone.source, instance.componentId, collectionsById);
}

function sourceIncludesComponent(
  source: TableSource,
  componentId: string,
  collectionsById: Map<string, ComponentCollection>
) {
  if (source.kind === "component") {
    return source.componentId === componentId;
  }

  const collection = collectionsById.get(source.collectionId);
  return collection?.items.some((item) => item.componentId === componentId) ?? false;
}

function getRuntimeCollectionCount(
  source: TableSource | undefined,
  instances: RuntimeInstance[],
  collectionsById: Map<string, ComponentCollection>
) {
  if (source?.kind !== "collection" || !collectionsById.has(source.collectionId)) {
    return null;
  }

  return instances.length;
}

function sourceIsDeck(
  source: TableSource | undefined,
  collectionsById: Map<string, ComponentCollection>
) {
  return source?.kind === "collection" && collectionsById.get(source.collectionId)?.type === "deck";
}
