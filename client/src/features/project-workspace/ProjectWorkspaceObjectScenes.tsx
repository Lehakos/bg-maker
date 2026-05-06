import {
  getDefaultProjectTableSetup,
  getProjectTableSetupItemId,
  hasProjectObjectSides,
  normalizeProjectObjectDieActiveFace,
  type ProjectCompositionSettings,
  type ProjectFileNode,
  type ProjectObjectDie,
  type ProjectObjectNode,
  type ProjectObjectRectTransform,
  type ProjectObjectSide,
  type ProjectTableSetup
} from "@bg-maker/shared";
import {
  getPlaytestRenderedObject,
  type PlaytestAction,
  type PlaytestSession
} from "../project-playtest/project-playtest";
import {
  type CSSProperties,
  type DragEvent,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { ProjectImageAssetOption } from "../project-assets/project-image-assets";
import {
  findProjectObjectNode,
  getProjectObjectNodeImage,
  getProjectObjectNodeComposition,
  getProjectObjectNodeRectTransform,
  getProjectObjectTreeWithActiveSides,
  setProjectObjectNodeDie,
  setProjectObjectNodeImage,
  setProjectObjectNodeComposition
} from "../project-objects/project-object-tree";
import {
  createSetProjectObjectSideSelectionCommand,
  createUpdateProjectObjectTreeCommand,
  createUpdateProjectTableSetupCommand,
  type ProjectEditorCommand
} from "./project-editor-commands";
import { cx } from "./project-workspace-css";
import { getProjectObjectSideSelection } from "./project-object-side-selection";
import { SceneObjectFrame } from "./SceneObjectFrame";
import { useProjectWorkspaceStore } from "./use-project-workspace-store";
import {
  createProjectTableSetupLinkedObjectItemAtPoint,
  getProjectFileNodeTableSetup,
  getProjectTableSetupResolvedItemObject,
  getProjectTableSetupWithAddedItem,
  getProjectTableSetupWithLocalObjectTree,
  getProjectTableSetupWithItemTransform
} from "../project-table-setup/project-table-setup";
import {
  getTableSetupItemFrames,
  getProjectTableSetupWithTransformedGroupItems
} from "../project-table-setup/project-table-setup-geometry";
import {
  parseProjectObjectFileDragPayload,
  projectObjectFileDragMimeType
} from "../project-library/project-drag-payloads";
import { CompositionGuideLayer } from "./CompositionGuideLayer";
import type { CompositionSurfaceTarget } from "./CompositionRulerOverlay";
import {
  getGuideSnapTargets,
  getObjectSnapTargets,
  getProjectCompositionSettings,
  type CompositionSnapIndicator,
  type CompositionSnapTarget
} from "./composition-guides";

type ProjectWorkspaceSceneProps = {
  directObjectMove?: boolean;
  fileTree: ProjectFileNode[];
  fileNode: ProjectFileNode;
  highlightedGuideId?: string | null;
  imageAssets: ProjectImageAssetOption[];
  objectTree: ProjectObjectNode[];
  playtestSession?: PlaytestSession | null;
  readOnly?: boolean;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  showEditorOverlays?: boolean;
  showInlineObjectControls?: boolean;
  tableSetup?: ProjectTableSetup | null;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onExecutePlaytestAction?: (action: PlaytestAction) => void;
  onCompositionSurfaceChange: (surface: CompositionSurfaceTarget | null) => void;
  onObjectContextMenu?: (objectId: string, clientX: number, clientY: number) => void;
  onSelectObject: (objectId: string | null) => void;
  onSelectObjects: (objectIds: string[], primaryObjectId?: string | null) => void;
};

type ObjectSceneSize = "large" | "small";

export function TableLayoutWorkspace({
  directObjectMove = false,
  fileTree,
  fileNode,
  highlightedGuideId = null,
  imageAssets,
  playtestSession = null,
  readOnly = false,
  selectedObjectId,
  selectedObjectIds,
  showEditorOverlays = true,
  showInlineObjectControls = true,
  tableSetup: resolvedTableSetup,
  onExecuteCommand,
  onExecutePlaytestAction,
  onCompositionSurfaceChange,
  onObjectContextMenu,
  onSelectObject,
  onSelectObjects
}: ProjectWorkspaceSceneProps) {
  const tableSetup =
    resolvedTableSetup ?? getProjectFileNodeTableSetup(fileNode) ?? getDefaultProjectTableSetup();
  const canvasScale = useProjectWorkspaceStore((state) => state.canvasScale);
  const activeTool = useProjectWorkspaceStore((state) => state.activeTool);
  const composition = getProjectCompositionSettings(tableSetup.composition);
  const playtestActive = Boolean(playtestSession);
  const suppressNextClickRef = useRef(false);
  const tableSurfaceRef = useRef<HTMLElement | null>(null);
  const [previewRectTransforms, setPreviewRectTransforms] = useState<
    Map<string, ProjectObjectRectTransform>
  >(() => new Map());
  const [snapIndicators, setSnapIndicators] = useState<CompositionSnapIndicator[]>([]);
  const [marqueeState, setMarqueeState] = useState<{
    additive: boolean;
    currentX: number;
    currentY: number;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    if (!tableSurfaceRef.current) {
      onCompositionSurfaceChange(null);
      return;
    }

    onCompositionSurfaceChange({
      element: tableSurfaceRef.current,
      height: tableSetup.height,
      width: tableSetup.width
    });

    return () => onCompositionSurfaceChange(null);
  }, [onCompositionSurfaceChange, tableSetup.height, tableSetup.width]);

  function updateTableSetup(nextTableSetup: ProjectTableSetup, label: string) {
    if (nextTableSetup === tableSetup) {
      return;
    }

    onExecuteCommand(
      createUpdateProjectTableSetupCommand({
        after: nextTableSetup,
        before: tableSetup,
        fileNodeId: fileNode.id,
        label
      })
    );
  }

  function handleTableItemRectTransformChange(
    objectId: string,
    before: ProjectObjectRectTransform,
    after: ProjectObjectRectTransform,
    label: string
  ) {
    const nextTableSetup =
      selectedObjectIds.includes(objectId) && selectedObjectIds.length > 1
        ? getProjectTableSetupWithTransformedGroupItems({
            after,
            before,
            fileTree,
            itemIds: selectedObjectIds,
            sourceItemId: objectId,
            tableSetup
          })
        : getProjectTableSetupWithItemTransform(tableSetup, objectId, after);

    updateTableSetup(nextTableSetup, label);
  }

  function handleTableItemRectTransformPreviewChange(
    objectId: string,
    before: ProjectObjectRectTransform,
    after: ProjectObjectRectTransform
  ) {
    if (!selectedObjectIds.includes(objectId) || selectedObjectIds.length < 2) {
      return;
    }

    const previewTableSetup = getProjectTableSetupWithTransformedGroupItems({
      after,
      before,
      fileTree,
      itemIds: selectedObjectIds,
      sourceItemId: objectId,
      tableSetup
    });
    const previewFrames = getTableSetupItemFrames(fileTree, previewTableSetup, selectedObjectIds);

    setPreviewRectTransforms(
      new Map(previewFrames.map((frame) => [frame.id, frame.rectTransform]))
    );
  }

  function handleTableItemRectTransformPreviewEnd() {
    setPreviewRectTransforms((currentPreviewRectTransforms) =>
      currentPreviewRectTransforms.size > 0 ? new Map() : currentPreviewRectTransforms
    );
    setSnapIndicators([]);
  }

  function handleTableCompositionChange(
    nextComposition: ProjectCompositionSettings,
    label: string
  ) {
    updateTableSetup(
      {
        ...tableSetup,
        composition: nextComposition
      },
      label
    );
  }

  function handleTablePointerDown(event: PointerEvent<HTMLElement>) {
    if ((readOnly && !playtestActive) || activeTool !== "select" || event.button !== 0) {
      return;
    }

    const point = getTablePoint(event, tableSetup);

    if (!point) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setMarqueeState({
      additive: event.metaKey || event.ctrlKey || event.shiftKey,
      currentX: point.x,
      currentY: point.y,
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y
    });
  }

  function handleTablePointerMove(event: PointerEvent<HTMLElement>) {
    if (!marqueeState || marqueeState.pointerId !== event.pointerId) {
      return;
    }

    const point = getTablePoint(event, tableSetup);

    if (!point) {
      return;
    }

    event.preventDefault();
    setMarqueeState((currentState) =>
      currentState
        ? {
            ...currentState,
            currentX: point.x,
            currentY: point.y
          }
        : currentState
    );
  }

  function handleTablePointerUp(event: PointerEvent<HTMLElement>) {
    if (!marqueeState || marqueeState.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    const marqueeBounds = getMarqueeBounds(marqueeState);
    const moved =
      Math.abs(marqueeState.currentX - marqueeState.startX) > 3 ||
      Math.abs(marqueeState.currentY - marqueeState.startY) > 3;

    setMarqueeState(null);

    if (!moved) {
      return;
    }

    suppressNextClickRef.current = true;
    const selectedIds = getTableSetupItemFrames(
      fileTree,
      tableSetup,
      tableSetup.items.map(getProjectTableSetupItemId)
    )
      .filter((frame) => doBoundsIntersect(frame.bounds, marqueeBounds))
      .map((frame) => frame.id);
    const nextIds = marqueeState.additive
      ? [...new Set([...selectedObjectIds, ...selectedIds])]
      : selectedIds;

    onSelectObjects(nextIds, nextIds.at(-1) ?? null);
  }

  function handleTableDragOver(event: DragEvent<HTMLElement>) {
    if (readOnly || playtestActive || !event.dataTransfer.types.includes(projectObjectFileDragMimeType)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleTableDrop(event: DragEvent<HTMLElement>) {
    if (readOnly || playtestActive) {
      return;
    }

    const payload = parseProjectObjectFileDragPayload(
      event.dataTransfer.getData(projectObjectFileDragMimeType)
    );

    if (!payload) {
      return;
    }

    const point = getTablePointFromClient(
      event.currentTarget,
      tableSetup,
      event.clientX,
      event.clientY
    );

    if (!point) {
      return;
    }

    const item = createProjectTableSetupLinkedObjectItemAtPoint(
      fileTree,
      payload.fileNodeId,
      tableSetup,
      point
    );

    if (!item) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    updateTableSetup(getProjectTableSetupWithAddedItem(tableSetup, item), "Add table object");
    onSelectObject(item.id);
  }

  return (
    <div className="h-full min-h-full min-w-full select-none overflow-visible">
      <div
        className="box-border flex items-center justify-center p-6"
        style={{
          minHeight: `max(100%, ${tableSetup.height * canvasScale + 48}px)`,
          minWidth: `max(100%, ${tableSetup.width * canvasScale + 48}px)`
        }}
      >
        <div
          className="relative shrink-0"
          style={{
            height: tableSetup.height * canvasScale,
            width: tableSetup.width * canvasScale
          }}
        >
          <section
            ref={tableSurfaceRef}
            aria-label={fileNode.name}
            className="relative shrink-0 select-none overflow-hidden rounded-lg border border-emerald-950/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_24px_60px_rgba(15,23,42,0.18)]"
            data-workspace-export-root="true"
            style={{
              backgroundColor: tableSetup.backgroundColor,
              height: tableSetup.height,
              transform: `scale(${canvasScale})`,
              transformOrigin: "top left",
              width: tableSetup.width
            }}
            onClick={() => {
              if (suppressNextClickRef.current) {
                suppressNextClickRef.current = false;
                return;
              }

              onSelectObject(null);
            }}
            onDragOver={handleTableDragOver}
            onDrop={handleTableDrop}
            onPointerCancel={() => setMarqueeState(null)}
            onPointerDown={handleTablePointerDown}
            onPointerMove={handleTablePointerMove}
            onPointerUp={handleTablePointerUp}
          >
            {tableSetup.grid.visible ? (
              <>
                <TableSetupGridOverlay tableSetup={tableSetup} />
                {showEditorOverlays ? <TableSetupGridSizeGuide tableSetup={tableSetup} /> : null}
              </>
            ) : null}
            {(playtestActive ? playtestSession?.tableItemIds.length : tableSetup.items.length) ? (
              <TableSetupScene
                fileTree={fileTree}
                fileNodeId={fileNode.id}
                imageAssets={imageAssets}
                readOnly={readOnly && !playtestActive}
                selectedObjectId={selectedObjectId}
                selectedObjectIds={selectedObjectIds}
                previewRectTransforms={previewRectTransforms}
                composition={composition}
                directObjectMove={directObjectMove}
                playtestSession={playtestSession}
                tableSetup={tableSetup}
                onExecuteCommand={onExecuteCommand}
                onExecutePlaytestAction={onExecutePlaytestAction}
                onObjectContextMenu={onObjectContextMenu}
                onRectTransformPreviewChange={handleTableItemRectTransformPreviewChange}
                onRectTransformPreviewEnd={handleTableItemRectTransformPreviewEnd}
                onSnapIndicatorsChange={setSnapIndicators}
                onRectTransformChange={handleTableItemRectTransformChange}
                onSelectObject={onSelectObject}
                onSelectObjects={onSelectObjects}
                showEditorOverlays={showEditorOverlays}
                showInlineObjectControls={showInlineObjectControls}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="flex h-28 w-52 items-center justify-center rounded-md border border-white/30 bg-white/10 text-center text-sm font-medium text-white/85">
                  Empty table layout
                </div>
              </div>
            )}
            {marqueeState ? (
              <div
                className="pointer-events-none absolute z-[80] border border-sky-500 bg-sky-400/15"
                data-export-exclude="true"
                style={getMarqueeStyle(marqueeState, tableSetup)}
              />
            ) : null}
          </section>
          {showEditorOverlays ? (
            <div
              className="pointer-events-none absolute left-0 top-0 z-20"
              style={{
                height: tableSetup.height,
                transform: `scale(${canvasScale})`,
                transformOrigin: "top left",
                width: tableSetup.width
              }}
            >
              <CompositionGuideLayer
                canvasScale={canvasScale}
                composition={composition}
                height={tableSetup.height}
                highlightedGuideId={highlightedGuideId}
                snapIndicators={snapIndicators}
                width={tableSetup.width}
                onCompositionChange={handleTableCompositionChange}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ObjectFileWorkspace({
  fileTree,
  fileNode,
  highlightedGuideId = null,
  imageAssets,
  objectTree,
  readOnly = false,
  selectedObjectId,
  selectedObjectIds,
  onExecuteCommand,
  onCompositionSurfaceChange,
  onObjectContextMenu,
  onSelectObject,
  onSelectObjects
}: ProjectWorkspaceSceneProps) {
  if (objectTree.length > 0) {
    return (
      <div className="flex h-full min-h-0 select-none items-center justify-center p-8">
        <ObjectScene
          key={fileNode.id}
          fileTree={fileTree}
          fileNodeId={fileNode.id}
          imageAssets={imageAssets}
          highlightedGuideId={highlightedGuideId}
          objectTree={objectTree}
          readOnly={readOnly}
          selectedObjectId={selectedObjectId}
          selectedObjectIds={selectedObjectIds}
          size="large"
          onExecuteCommand={onExecuteCommand}
          onCompositionSurfaceChange={onCompositionSurfaceChange}
          onObjectContextMenu={onObjectContextMenu}
          onSelectObject={onSelectObject}
          onSelectObjects={onSelectObjects}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center p-8 text-sm font-medium text-slate-500">
      No object preview
    </div>
  );
}

type MarqueeState = {
  currentX: number;
  currentY: number;
  startX: number;
  startY: number;
};

type Bounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

function getTablePoint(event: PointerEvent<HTMLElement>, tableSetup: ProjectTableSetup) {
  return getTablePointFromClient(event.currentTarget, tableSetup, event.clientX, event.clientY);
}

function getTablePointFromClient(
  element: HTMLElement,
  tableSetup: ProjectTableSetup,
  clientX: number,
  clientY: number
) {
  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const scaleX = tableSetup.width / rect.width;
  const scaleY = tableSetup.height / rect.height;

  return {
    x: (clientX - rect.left) * scaleX - tableSetup.width / 2,
    y: (clientY - rect.top) * scaleY - tableSetup.height / 2
  };
}

function getMarqueeBounds(state: MarqueeState): Bounds {
  return {
    bottom: Math.max(state.startY, state.currentY),
    left: Math.min(state.startX, state.currentX),
    right: Math.max(state.startX, state.currentX),
    top: Math.min(state.startY, state.currentY)
  };
}

function getMarqueeStyle(state: MarqueeState, tableSetup: ProjectTableSetup): CSSProperties {
  const bounds = getMarqueeBounds(state);

  return {
    height: bounds.bottom - bounds.top,
    left: bounds.left + tableSetup.width / 2,
    top: bounds.top + tableSetup.height / 2,
    width: bounds.right - bounds.left
  };
}

function doBoundsIntersect(left: Bounds, right: Bounds) {
  return (
    left.left <= right.right &&
    left.right >= right.left &&
    left.top <= right.bottom &&
    left.bottom >= right.top
  );
}

type TableSetupGridOverlayProps = {
  tableSetup: ProjectTableSetup;
};

function TableSetupGridOverlay({ tableSetup }: TableSetupGridOverlayProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
        backgroundPosition: "center center",
        backgroundSize: `${tableSetup.grid.size}px ${tableSetup.grid.size}px`
      }}
    />
  );
}

function TableSetupGridSizeGuide({ tableSetup }: TableSetupGridOverlayProps) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-col gap-1 text-white drop-shadow-sm">
      <span className="w-fit rounded border border-white/25 bg-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums backdrop-blur-sm">
        grid {formatTableGuideNumber(tableSetup.grid.size)}
      </span>
      <span
        aria-hidden
        className="relative block h-2 border-b border-l border-r border-white/85 bg-white/10 shadow-[0_0_0_1px_rgba(15,23,42,0.14)]"
        style={{ width: tableSetup.grid.size }}
      />
    </div>
  );
}

function formatTableGuideNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

type TableSetupSceneProps = {
  directObjectMove: boolean;
  fileTree: ProjectFileNode[];
  fileNodeId: string;
  imageAssets: ProjectImageAssetOption[];
  readOnly: boolean;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  previewRectTransforms: ReadonlyMap<string, ProjectObjectRectTransform>;
  composition: ProjectCompositionSettings;
  playtestSession: PlaytestSession | null;
  showEditorOverlays: boolean;
  showInlineObjectControls: boolean;
  tableSetup: ProjectTableSetup;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onExecutePlaytestAction?: (action: PlaytestAction) => void;
  onRectTransformPreviewChange: (
    objectId: string,
    before: ProjectObjectRectTransform,
    after: ProjectObjectRectTransform
  ) => void;
  onRectTransformPreviewEnd: () => void;
  onSnapIndicatorsChange: (indicators: CompositionSnapIndicator[]) => void;
  onRectTransformChange: (
    objectId: string,
    before: ProjectObjectRectTransform,
    after: ProjectObjectRectTransform,
    label: string
  ) => void;
  onObjectContextMenu?: (objectId: string, clientX: number, clientY: number) => void;
  onSelectObject: (objectId: string | null) => void;
  onSelectObjects: (objectIds: string[], primaryObjectId?: string | null) => void;
};

function TableSetupScene({
  directObjectMove,
  fileTree,
  fileNodeId,
  imageAssets,
  readOnly,
  selectedObjectId,
  selectedObjectIds,
  previewRectTransforms,
  composition,
  playtestSession,
  showEditorOverlays,
  showInlineObjectControls,
  tableSetup,
  onExecuteCommand,
  onExecutePlaytestAction,
  onRectTransformPreviewChange,
  onRectTransformPreviewEnd,
  onSnapIndicatorsChange,
  onRectTransformChange,
  onObjectContextMenu,
  onSelectObject,
  onSelectObjects
}: TableSetupSceneProps) {
  const imageAssetById = useMemo(
    () => new Map(imageAssets.map((imageAsset) => [imageAsset.asset.id, imageAsset])),
    [imageAssets]
  );
  const objectSideSelections = useProjectWorkspaceStore((state) => state.objectSideSelections);
  const playtestActive = Boolean(playtestSession);
  const snapSize = tableSetup.grid.snap ? tableSetup.grid.size : null;
  const snapTargets = useMemo(
    () =>
      showEditorOverlays
        ? getTableSetupSnapTargets(fileTree, tableSetup, selectedObjectIds, composition)
        : [],
    [composition, fileTree, selectedObjectIds, showEditorOverlays, tableSetup]
  );
  const sceneItems = useMemo(
    () =>
      playtestSession
        ? playtestSession.tableItemIds.flatMap((itemId) => {
            const item = playtestSession.itemsById[itemId];

            return item
              ? [
                  {
                    concealed: item.hidden && !item.revealed && !hasProjectObjectSides(item.baseObject.kind),
                    id: item.id,
                    object: getPlaytestRenderedObject(item, playtestSession.itemsById),
                    resizeMode: "size" as const
                  }
                ]
              : [];
          })
        : tableSetup.items.flatMap((item) => {
            const itemId = getProjectTableSetupItemId(item);
            const itemObject = getProjectTableSetupResolvedItemObject(fileTree, item);
            const object = itemObject
              ? getProjectObjectTreeWithActiveSides([itemObject], (objectNode) =>
                  getProjectObjectSideSelection(objectSideSelections, fileNodeId, objectNode.id)
                )[0]
              : null;

            return object
              ? [
                  {
                    concealed: false,
                    id: itemId,
                    object,
                    resizeMode: item.type === "linkedObject" ? ("scale" as const) : ("size" as const)
                  }
                ]
              : [];
          }),
    [fileNodeId, fileTree, objectSideSelections, playtestSession, tableSetup.items]
  );

  function handleDieFaceChange() {
    // Playtest dice are controlled through the action panel; linked table items follow their source object.
  }

  function handleObjectSideChange(objectId: string, activeSide: ProjectObjectSide) {
    if (playtestActive) {
      const item = playtestSession?.itemsById[objectId];

      if (item && item.activeSide !== activeSide) {
        onExecutePlaytestAction?.({ itemId: objectId, type: "flipItem" });
      }

      return;
    }

    const currentSide = getProjectObjectSideSelection(objectSideSelections, fileNodeId, objectId);

    if (currentSide === activeSide) {
      return;
    }

    onExecuteCommand(
      createSetProjectObjectSideSelectionCommand({
        after: activeSide,
        before: currentSide,
        fileNodeId,
        objectId
      })
    );
  }

  function handleLocalImageAssetDrop(objectId: string, assetId: string) {
    if (readOnly) {
      return;
    }

    const item = tableSetup.items.find(
      (candidate) => getProjectTableSetupItemId(candidate) === objectId
    );

    if (!item || item.type !== "localObject" || item.object.kind !== "image") {
      return;
    }

    const image = getProjectObjectNodeImage(item.object);
    const nextObjectTree = setProjectObjectNodeImage([item.object], item.object.id, {
      ...image,
      assetId
    });
    const nextTableSetup = getProjectTableSetupWithLocalObjectTree(
      tableSetup,
      objectId,
      nextObjectTree
    );

    if (nextTableSetup === tableSetup) {
      return;
    }

    onExecuteCommand(
      createUpdateProjectTableSetupCommand({
        after: nextTableSetup,
        before: tableSetup,
        fileNodeId,
        label: "Set image asset"
      })
    );
    onSelectObject(objectId);
  }

  return (
    <div className="absolute inset-0 z-0 overflow-visible">
      {showEditorOverlays ? <WorkspaceAxes /> : null}
      {sceneItems.map((item, index) => {
        return (
          <SceneObjectFrame
            key={item.id}
            concealed={item.concealed}
            directMoveEnabled={directObjectMove}
            fileTree={fileTree}
            fileNodeId={fileNodeId}
            imageAssetById={imageAssetById}
            multiSelectEnabled
            object={item.object}
            previewRectTransform={previewRectTransforms.get(item.id)}
            readOnly={readOnly && !playtestActive}
            resizeMode={item.resizeMode}
            root
            selectionObjectId={item.id}
            selectedObjectId={selectedObjectId}
            selectedObjectIds={selectedObjectIds}
            showInlineControls={showInlineObjectControls}
            siblingIndex={index}
            snapSize={snapSize}
            snapTargets={snapTargets}
            stackRootOffset={false}
            onDieFaceChange={handleDieFaceChange}
            onExecuteCommand={onExecuteCommand}
            onImageAssetDrop={playtestActive ? undefined : handleLocalImageAssetDrop}
            onObjectContextMenu={onObjectContextMenu}
            onObjectSideChange={handleObjectSideChange}
            onRectTransformPreviewChange={playtestActive ? undefined : onRectTransformPreviewChange}
            onRectTransformPreviewEnd={playtestActive ? undefined : onRectTransformPreviewEnd}
            onSnapIndicatorsChange={onSnapIndicatorsChange}
            onRectTransformChange={(objectId, before, after, label) => {
              if (playtestActive) {
                onExecutePlaytestAction?.({
                  itemTransforms: { [objectId]: after },
                  label,
                  type: "moveItems"
                });
                return;
              }

              onRectTransformChange(objectId, before, after, label);
            }}
            onSelectObject={onSelectObject}
            onSelectObjects={onSelectObjects}
          />
        );
      })}
    </div>
  );
}

function getTableSetupSnapTargets(
  fileTree: readonly ProjectFileNode[],
  tableSetup: ProjectTableSetup,
  selectedObjectIds: readonly string[],
  composition: ProjectCompositionSettings
): CompositionSnapTarget[] {
  const guideTargets = getGuideSnapTargets(composition);
  const objectTargets = composition.snapToObjects
    ? getObjectSnapTargets(
        tableSetup.items.flatMap((item) => {
          const id = getProjectTableSetupItemId(item);
          const object = getProjectTableSetupResolvedItemObject(fileTree, item);

          return object
            ? [
                {
                  id,
                  positionMode: "center" as const,
                  rectTransform: getProjectObjectNodeRectTransform(object)
                }
              ]
            : [];
        }),
        new Set(selectedObjectIds)
      )
    : [];

  return [...guideTargets, ...objectTargets];
}

type ObjectSceneProps = {
  fileTree: ProjectFileNode[];
  fileNodeId: string;
  highlightedGuideId?: string | null;
  imageAssets: ProjectImageAssetOption[];
  objectTree: ProjectObjectNode[];
  readOnly: boolean;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  size: ObjectSceneSize;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onCompositionSurfaceChange: (surface: CompositionSurfaceTarget | null) => void;
  onObjectContextMenu?: (objectId: string, clientX: number, clientY: number) => void;
  onSelectObject: (objectId: string | null) => void;
  onSelectObjects: (objectIds: string[], primaryObjectId?: string | null) => void;
};

function ObjectScene({
  fileTree,
  fileNodeId,
  highlightedGuideId = null,
  imageAssets,
  objectTree,
  readOnly,
  selectedObjectId,
  selectedObjectIds,
  size,
  onExecuteCommand,
  onCompositionSurfaceChange,
  onObjectContextMenu,
  onSelectObject,
  onSelectObjects
}: ObjectSceneProps) {
  const canvasScale = useProjectWorkspaceStore((state) => state.canvasScale);
  const sceneSurfaceRef = useRef<HTMLDivElement | null>(null);
  const [snapIndicators, setSnapIndicators] = useState<CompositionSnapIndicator[]>([]);
  const imageAssetById = useMemo(
    () => new Map(imageAssets.map((imageAsset) => [imageAsset.asset.id, imageAsset])),
    [imageAssets]
  );
  const objectSideSelections = useProjectWorkspaceStore((state) => state.objectSideSelections);
  const viewObjectTree = useMemo(
    () =>
      getProjectObjectTreeWithActiveSides(objectTree, (object) =>
        getProjectObjectSideSelection(objectSideSelections, fileNodeId, object.id)
      ),
    [fileNodeId, objectSideSelections, objectTree]
  );
  const rootObject = objectTree[0] ?? null;
  const composition = getProjectCompositionSettings(
    rootObject ? getProjectObjectNodeComposition(rootObject) : undefined
  );
  const snapTargets = useMemo(
    () => getObjectSceneSnapTargets(viewObjectTree, selectedObjectIds, composition),
    [composition, selectedObjectIds, viewObjectTree]
  );
  const sceneSize = getObjectSceneSize(size);

  useEffect(() => {
    if (!sceneSurfaceRef.current) {
      onCompositionSurfaceChange(null);
      return;
    }

    onCompositionSurfaceChange({
      element: sceneSurfaceRef.current,
      height: sceneSize.height,
      width: sceneSize.width
    });

    return () => onCompositionSurfaceChange(null);
  }, [onCompositionSurfaceChange, sceneSize.height, sceneSize.width]);

  function handleObjectCompositionChange(
    nextComposition: ProjectCompositionSettings,
    label: string
  ) {
    if (!rootObject || readOnly) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeComposition(
      objectTree,
      rootObject.id,
      nextComposition
    );

    if (nextObjectTree === objectTree) {
      return;
    }

    onExecuteCommand(
      createUpdateProjectObjectTreeCommand({
        after: nextObjectTree,
        before: objectTree,
        fileNodeId,
        label
      })
    );
  }

  function handleObjectSideChange(objectId: string, activeSide: ProjectObjectSide) {
    const currentSide = getProjectObjectSideSelection(objectSideSelections, fileNodeId, objectId);

    if (currentSide === activeSide) {
      return;
    }

    onExecuteCommand(
      createSetProjectObjectSideSelectionCommand({
        after: activeSide,
        before: currentSide,
        fileNodeId,
        objectId
      })
    );
  }

  function handleDieFaceChange(objectId: string, die: ProjectObjectDie, activeFace: number) {
    const nextActiveFace = normalizeProjectObjectDieActiveFace(activeFace, die.faceCount);

    if (die.activeFace === nextActiveFace) {
      return;
    }

    if (readOnly) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeDie(objectTree, objectId, {
      ...die,
      activeFace: nextActiveFace
    });

    if (nextObjectTree === objectTree) {
      return;
    }

    onExecuteCommand(
      createUpdateProjectObjectTreeCommand({
        after: nextObjectTree,
        before: objectTree,
        fileNodeId,
        label: `Show die face ${nextActiveFace}`
      })
    );
  }

  function handleImageAssetDrop(objectId: string, assetId: string) {
    if (readOnly) {
      return;
    }

    const object = findProjectObjectNode(objectTree, objectId);

    if (!object || object.kind !== "image") {
      return;
    }

    const image = getProjectObjectNodeImage(object);
    const nextObjectTree = setProjectObjectNodeImage(objectTree, objectId, {
      ...image,
      assetId
    });

    if (nextObjectTree === objectTree) {
      return;
    }

    onExecuteCommand(
      createUpdateProjectObjectTreeCommand({
        after: nextObjectTree,
        before: objectTree,
        fileNodeId,
        label: "Set image asset"
      })
    );
    onSelectObject(objectId);
  }

  return (
    <div
      ref={sceneSurfaceRef}
      className={cx(
        "relative select-none overflow-visible",
        size === "small" ? "h-full w-full" : "min-h-[420px]"
      )}
      style={{
        height: sceneSize.height,
        transform: `scale(${canvasScale})`,
        transformOrigin: "center",
        width: sceneSize.width
      }}
      data-workspace-export-root="true"
    >
      <WorkspaceAxes />
      <CompositionGuideLayer
        canvasScale={canvasScale}
        composition={composition}
        height={sceneSize.height}
        highlightedGuideId={highlightedGuideId}
        snapIndicators={snapIndicators}
        width={sceneSize.width}
        onCompositionChange={handleObjectCompositionChange}
      />
      {viewObjectTree.map((object, index) => (
        <SceneObjectFrame
          key={object.id}
          fileTree={fileTree}
          fileNodeId={fileNodeId}
          imageAssetById={imageAssetById}
          object={object}
          readOnly={readOnly}
          root
          selectedObjectId={selectedObjectId}
          selectedObjectIds={selectedObjectIds}
          siblingIndex={index}
          snapTargets={snapTargets}
          onDieFaceChange={handleDieFaceChange}
          onExecuteCommand={onExecuteCommand}
          onImageAssetDrop={handleImageAssetDrop}
          onObjectContextMenu={onObjectContextMenu}
          onObjectSideChange={handleObjectSideChange}
          onRectTransformPreviewEnd={() => setSnapIndicators([])}
          onSnapIndicatorsChange={setSnapIndicators}
          onSelectObject={onSelectObject}
          onSelectObjects={onSelectObjects}
        />
      ))}
    </div>
  );
}

function getObjectSceneSize(size: ObjectSceneSize) {
  if (size === "small") {
    return { height: 360, width: 480 };
  }

  return { height: 760, width: 960 };
}

function getObjectSceneSnapTargets(
  objectTree: readonly ProjectObjectNode[],
  selectedObjectIds: readonly string[],
  composition: ProjectCompositionSettings
): CompositionSnapTarget[] {
  const guideTargets = getGuideSnapTargets(composition);
  const objectTargets = composition.snapToObjects
    ? getObjectSnapTargets(
        objectTree.map((object) => ({
          id: object.id,
          positionMode: "center" as const,
          rectTransform: getProjectObjectNodeRectTransform(object)
        })),
        new Set(selectedObjectIds)
      )
    : [];

  return [...guideTargets, ...objectTargets];
}

function WorkspaceAxes() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-visible"
      data-export-exclude="true"
    >
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-sky-600/45 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]" />
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-rose-600/45 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]" />
      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-500/40 bg-white/90 shadow-sm" />
      <span className="absolute left-[calc(50%+8px)] top-[calc(50%+8px)] rounded border border-slate-300 bg-white/85 px-1 py-0.5 text-[10px] font-semibold leading-none tabular-nums text-slate-600 shadow-sm">
        0,0
      </span>
      <span className="absolute right-2 top-[calc(50%+6px)] rounded border border-sky-200 bg-white/85 px-1 py-0.5 text-[10px] font-semibold leading-none text-sky-700 shadow-sm">
        X
      </span>
      <span className="absolute left-[calc(50%+6px)] top-2 rounded border border-rose-200 bg-white/85 px-1 py-0.5 text-[10px] font-semibold leading-none text-rose-700 shadow-sm">
        Y
      </span>
    </div>
  );
}
