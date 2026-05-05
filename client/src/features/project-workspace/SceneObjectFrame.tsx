import type {
  ProjectFileNode,
  ProjectObjectDie,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectObjectSide
} from "@bg-maker/shared";
import {
  doesProjectObjectClipChildren,
  hasProjectObjectLayout,
  isProjectObjectCardSizePresetLocked
} from "@bg-maker/shared";
import {
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useRef,
  useState
} from "react";
import { ProjectObjectSurface } from "../project-objects/ProjectObjectSurface";
import { getProjectObjectLayoutRectTransformOverrides } from "../project-objects/project-object-layout";
import {
  getProjectObjectNodeAppearance,
  getProjectObjectNodeCard,
  getProjectObjectNodeDie,
  getProjectObjectNodeDoubleSide,
  getProjectObjectNodeLayout,
  getProjectObjectNodeRectTransform,
  getProjectObjectNodeVisibleChildren,
  getProjectObjectNodeActiveSide
} from "../project-objects/project-object-tree";
import { getEffectiveProjectObjectRectTransform } from "../project-objects/project-object-zone";
import type { ProjectImageAssetOption } from "../project-assets/project-image-assets";
import { ObjectSelectionOverlay } from "./ObjectSelectionOverlay";
import { cx } from "./project-workspace-css";
import type { ProjectEditorCommand } from "./project-editor-commands";
import { createUpdateProjectObjectRectTransformCommand } from "./project-editor-commands";
import {
  parseProjectImageAssetDragPayload,
  projectImageAssetDragMimeType
} from "../project-library/project-drag-payloads";
import {
  areProjectObjectRectTransformsEqual,
  getNextTransformDragState,
  getRectTransformCommandLabel,
  getRotateDragState,
  type ResizeHandle,
  type TransformDragOptions,
  type TransformDragState
} from "./transform-drag-helpers";
import { useProjectWorkspaceStore } from "./use-project-workspace-store";
import type { CompositionSnapIndicator, CompositionSnapTarget } from "./composition-guides";

type SceneObjectFrameProps = {
  fileTree: ProjectFileNode[];
  fileNodeId: string;
  imageAssetById: Map<string, ProjectImageAssetOption>;
  multiSelectEnabled?: boolean;
  object: ProjectObjectNode;
  previewRectTransform?: ProjectObjectRectTransform;
  readOnly?: boolean;
  rectTransformOverride?: ProjectObjectRectTransform;
  resizeMode?: TransformDragOptions["resizeMode"];
  root?: boolean;
  selectionObjectId?: string;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  siblingIndex: number;
  snapSize?: number | null;
  snapTargets?: CompositionSnapTarget[];
  stackRootOffset?: boolean;
  onDieFaceChange: (objectId: string, die: ProjectObjectDie, activeFace: number) => void;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onImageAssetDrop?: (objectId: string, assetId: string) => void;
  onObjectSideChange: (objectId: string, activeSide: ProjectObjectSide) => void;
  onObjectContextMenu?: (objectId: string, clientX: number, clientY: number) => void;
  onRectTransformPreviewChange?: (
    objectId: string,
    before: ProjectObjectRectTransform,
    after: ProjectObjectRectTransform
  ) => void;
  onRectTransformPreviewEnd?: () => void;
  onSnapIndicatorsChange?: (indicators: CompositionSnapIndicator[]) => void;
  onRectTransformChange?: (
    objectId: string,
    before: ProjectObjectRectTransform,
    after: ProjectObjectRectTransform,
    label: string
  ) => void;
  onSelectObject: (objectId: string | null) => void;
  onSelectObjects: (objectIds: string[], primaryObjectId?: string | null) => void;
};

export function SceneObjectFrame({
  fileTree,
  fileNodeId,
  imageAssetById,
  multiSelectEnabled = false,
  object,
  previewRectTransform,
  readOnly = false,
  rectTransformOverride,
  resizeMode = "size",
  root = false,
  selectionObjectId,
  selectedObjectId,
  selectedObjectIds,
  siblingIndex,
  snapSize = null,
  snapTargets = [],
  stackRootOffset = true,
  onDieFaceChange,
  onExecuteCommand,
  onImageAssetDrop,
  onObjectContextMenu,
  onObjectSideChange,
  onRectTransformPreviewChange,
  onRectTransformPreviewEnd,
  onSnapIndicatorsChange,
  onRectTransformChange,
  onSelectObject,
  onSelectObjects
}: SceneObjectFrameProps) {
  const activeTool = useProjectWorkspaceStore((state) => state.activeTool);
  const canvasScale = useProjectWorkspaceStore((state) => state.canvasScale);
  const resizeAspectLocked = useProjectWorkspaceStore((state) => state.resizeAspectLocked);
  const viewObject = object;
  const objectRectTransform = getProjectObjectNodeRectTransform(viewObject);
  const effectiveObjectRectTransform = getEffectiveProjectObjectRectTransform(viewObject, fileTree);
  const baseVisibleRectTransform =
    previewRectTransform ?? rectTransformOverride ?? effectiveObjectRectTransform;
  const [dragState, setDragState] = useState<TransformDragState | null>(null);
  const dragStateRef = useRef<TransformDragState | null>(null);
  const suppressNextClickRef = useRef(false);
  const visibleRectTransform = dragState?.current ?? baseVisibleRectTransform;
  const selectableObjectId = selectionObjectId ?? viewObject.id;
  const handlesOwnInteraction = selectableObjectId === viewObject.id;
  const selected = selectedObjectId === selectableObjectId && handlesOwnInteraction;
  const multiSelected = selectedObjectIds.includes(selectableObjectId) && handlesOwnInteraction;
  const layoutManaged = Boolean(rectTransformOverride);
  const appearance = getProjectObjectNodeAppearance(viewObject);
  const card = viewObject.kind === "card" ? getProjectObjectNodeCard(viewObject) : null;
  const die = viewObject.kind === "die" ? getProjectObjectNodeDie(viewObject) : null;
  const token = viewObject.kind === "token";
  const doubleSide =
    viewObject.kind === "card" || viewObject.kind === "token"
      ? getProjectObjectNodeDoubleSide(viewObject)
      : null;
  const hasTopObjectControls = Boolean(
    (card && doubleSide?.enabled) || die || (token && doubleSide?.enabled)
  );
  const clipsChildren = doesProjectObjectClipChildren(viewObject.kind);
  const sizePresetLocked = card ? isProjectObjectCardSizePresetLocked(card) : false;
  const zoneSizeLocked = viewObject.kind === "zone";
  const resizeLocked = activeTool === "resize" && (sizePresetLocked || zoneSizeLocked);
  const groupMoveInteractive = multiSelectEnabled && multiSelected && activeTool === "move";
  const interactive =
    !readOnly &&
    (selected || groupMoveInteractive) &&
    activeTool !== "select" &&
    activeTool !== "pan" &&
    Boolean(fileNodeId) &&
    !layoutManaged &&
    !resizeLocked &&
    !viewObject.locked;
  const children = getProjectObjectNodeVisibleChildren(viewObject);
  const childRectTransformOverrides = hasProjectObjectLayout(viewObject.kind)
    ? getProjectObjectLayoutRectTransformOverrides(
        visibleRectTransform,
        children,
        getProjectObjectNodeLayout(viewObject),
        appearance.padding,
        (child) => getEffectiveProjectObjectRectTransform(child, fileTree)
      )
    : new Map<string, ProjectObjectRectTransform>();

  if (!viewObject.visible) {
    return null;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!handlesOwnInteraction) {
      return;
    }

    if (activeTool === "pan") {
      return;
    }

    event.stopPropagation();

    const transformHandle = getTransformHandle(event.target);

    if (activeTool === "resize" && !isResizeHandle(transformHandle)) {
      return;
    }

    if (activeTool === "rotate" && transformHandle !== "rotate") {
      return;
    }

    if (!interactive) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rotateDragState =
      activeTool === "rotate"
        ? getRotateDragState(event.currentTarget, event.clientX, event.clientY)
        : {};

    setActiveDragState({
      before: objectRectTransform,
      current: objectRectTransform,
      pointerId: event.pointerId,
      ...rotateDragState,
      resizeHandle: isResizeHandle(transformHandle) ? transformHandle : undefined,
      startClientX: event.clientX,
      startClientY: event.clientY
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const activeDragState = dragStateRef.current;

    if (!activeDragState || activeDragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const nextDragState = getNextTransformDragState(
      activeDragState,
      activeTool,
      canvasScale,
      event.clientX,
      event.clientY,
      {
        preserveAspectRatio:
          activeTool === "resize" && (resizeAspectLocked ? !event.shiftKey : event.shiftKey),
        positionMode: root ? "center" : "topLeft",
        resizeHandle: activeDragState.resizeHandle,
        resizeMode,
        snap: snapTargets.length
          ? {
              targets: snapTargets,
              threshold: 6 / canvasScale
            }
          : undefined,
        snapSize
      }
    );

    setActiveDragState(nextDragState);
    onSnapIndicatorsChange?.(nextDragState.snapIndicators ?? []);
    onRectTransformPreviewChange?.(object.id, nextDragState.before, nextDragState.current);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    commitDrag(event);
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    releasePointerCapture(event);
    setActiveDragState(null);
    onRectTransformPreviewEnd?.();
    onSnapIndicatorsChange?.([]);
  }

  function commitDrag(event: PointerEvent<HTMLDivElement>) {
    const activeDragState = dragStateRef.current;

    if (!activeDragState || activeDragState.pointerId !== event.pointerId) {
      return;
    }

    releasePointerCapture(event);

    if (
      fileNodeId &&
      !areProjectObjectRectTransformsEqual(activeDragState.before, activeDragState.current)
    ) {
      const label = getRectTransformCommandLabel(activeTool);

      suppressNextClickRef.current = true;

      if (onRectTransformChange) {
        onRectTransformChange(object.id, activeDragState.before, activeDragState.current, label);
      } else {
        onExecuteCommand(
          createUpdateProjectObjectRectTransformCommand({
            after: activeDragState.current,
            before: activeDragState.before,
            fileNodeId,
            label,
            objectId: object.id
          })
        );
      }
    }

    setActiveDragState(null);
    onRectTransformPreviewEnd?.();
    onSnapIndicatorsChange?.([]);
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (!handlesOwnInteraction) {
      return;
    }

    event.stopPropagation();
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    if (multiSelectEnabled && (event.metaKey || event.ctrlKey || event.shiftKey)) {
      const nextSelectedObjectIds = new Set(selectedObjectIds);

      if ((event.metaKey || event.ctrlKey) && nextSelectedObjectIds.has(selectableObjectId)) {
        nextSelectedObjectIds.delete(selectableObjectId);
      } else {
        nextSelectedObjectIds.add(selectableObjectId);
      }

      onSelectObjects([...nextSelectedObjectIds], selectableObjectId);
      return;
    }

    onSelectObject(selectableObjectId);
  }

  function handleContextMenu(event: MouseEvent<HTMLDivElement>) {
    if (!handlesOwnInteraction) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!selectedObjectIds.includes(selectableObjectId)) {
      onSelectObject(selectableObjectId);
    }

    onObjectContextMenu?.(selectableObjectId, event.clientX, event.clientY);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!handlesOwnInteraction) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectObject(selectableObjectId);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (
      !handlesOwnInteraction ||
      readOnly ||
      viewObject.kind !== "image" ||
      !onImageAssetDrop ||
      !event.dataTransfer.types.includes(projectImageAssetDragMimeType)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!handlesOwnInteraction || readOnly || viewObject.kind !== "image" || !onImageAssetDrop) {
      return;
    }

    const payload = parseProjectImageAssetDragPayload(
      event.dataTransfer.getData(projectImageAssetDragMimeType)
    );

    if (!payload) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onImageAssetDrop(viewObject.id, payload.assetId);
  }

  function releasePointerCapture(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function setActiveDragState(nextDragState: TransformDragState | null) {
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  }

  return (
    <div
      aria-label={viewObject.name}
      className={cx(
        "absolute select-none overflow-visible touch-none",
        activeTool === "move" && interactive && "cursor-move",
        activeTool === "rotate" && interactive && "cursor-grab",
        activeTool === "resize" && interactive && "cursor-nwse-resize"
      )}
      role={handlesOwnInteraction ? "button" : undefined}
      style={getSceneObjectFrameStyle(visibleRectTransform, root, siblingIndex, stackRootOffset)}
      tabIndex={handlesOwnInteraction ? 0 : undefined}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <ProjectObjectSurface
        fileTree={fileTree}
        imageAssetById={imageAssetById}
        object={viewObject}
      />
      <div
        className={cx("absolute inset-0", clipsChildren ? "overflow-hidden" : "overflow-visible")}
        style={{ borderRadius: `${appearance.borderRadius}px` }}
      >
        {children.map((child, index) => (
          <SceneObjectFrame
            key={child.id}
            fileTree={fileTree}
            fileNodeId={fileNodeId}
            imageAssetById={imageAssetById}
            multiSelectEnabled={multiSelectEnabled}
            object={child}
            readOnly={readOnly}
            rectTransformOverride={childRectTransformOverrides.get(child.id)}
            selectionObjectId={selectionObjectId}
            selectedObjectId={selectedObjectId}
            selectedObjectIds={selectedObjectIds}
            siblingIndex={index}
            onDieFaceChange={onDieFaceChange}
            onExecuteCommand={onExecuteCommand}
            onImageAssetDrop={onImageAssetDrop}
            onObjectContextMenu={onObjectContextMenu}
            onObjectSideChange={onObjectSideChange}
            onRectTransformPreviewChange={onRectTransformPreviewChange}
            onRectTransformPreviewEnd={onRectTransformPreviewEnd}
            onSnapIndicatorsChange={onSnapIndicatorsChange}
            onRectTransformChange={onRectTransformChange}
            onSelectObject={onSelectObject}
            onSelectObjects={onSelectObjects}
          />
        ))}
      </div>
      {selected && card && doubleSide?.enabled ? (
        <ObjectSideSwitcher
          activeSide={getProjectObjectNodeActiveSide(viewObject)}
          canvasScale={canvasScale}
          label="Card side"
          onSideChange={(activeSide) => onObjectSideChange(viewObject.id, activeSide)}
        />
      ) : null}
      {selected && die ? (
        <DieFaceSwitcher
          activeFace={die.activeFace}
          canvasScale={canvasScale}
          die={die}
          onFaceChange={(activeFace) => onDieFaceChange(viewObject.id, die, activeFace)}
        />
      ) : null}
      {selected && token && doubleSide?.enabled ? (
        <ObjectSideSwitcher
          activeSide={getProjectObjectNodeActiveSide(viewObject)}
          canvasScale={canvasScale}
          label="Token side"
          onSideChange={(activeSide) => onObjectSideChange(viewObject.id, activeSide)}
        />
      ) : null}
      {multiSelected ? (
        <ObjectSelectionOverlay
          activeTool={layoutManaged || resizeLocked ? "select" : activeTool}
          canvasScale={canvasScale}
          muted={!selected}
          topControlsOffset={hasTopObjectControls ? 44 : 0}
        />
      ) : null}
    </div>
  );
}

type ObjectSideSwitcherProps = {
  activeSide: ProjectObjectSide;
  canvasScale: number;
  label: string;
  onSideChange: (side: ProjectObjectSide) => void;
};

function ObjectSideSwitcher({
  activeSide,
  canvasScale,
  label,
  onSideChange
}: ObjectSideSwitcherProps) {
  return (
    <div
      aria-label={label}
      className="absolute left-1/2 z-[60] flex h-8 items-center rounded-md border border-sky-200 bg-white p-0.5 shadow-lg shadow-slate-900/10"
      data-export-exclude="true"
      style={{
        bottom: `calc(100% + ${10 / canvasScale}px)`,
        transform: `translateX(-50%) scale(${1 / canvasScale})`,
        transformOrigin: "bottom center"
      }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {(["front", "back"] as const).map((side) => {
        const active = activeSide === side;

        return (
          <button
            key={side}
            aria-pressed={active}
            className={cx(
              "h-7 min-w-14 rounded px-2 text-xs font-semibold transition-colors",
              active
                ? "bg-sky-500 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            )}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSideChange(side);
            }}
          >
            {side === "front" ? "Front" : "Back"}
          </button>
        );
      })}
    </div>
  );
}

type DieFaceSwitcherProps = {
  activeFace: number;
  canvasScale: number;
  die: ProjectObjectDie;
  onFaceChange: (face: number) => void;
};

function DieFaceSwitcher({ activeFace, canvasScale, die, onFaceChange }: DieFaceSwitcherProps) {
  return (
    <label
      aria-label="Die face"
      className="absolute left-1/2 z-[60] flex h-8 items-center gap-1 rounded-md border border-amber-200 bg-white px-1.5 text-xs font-semibold text-slate-600 shadow-lg shadow-slate-900/10"
      data-export-exclude="true"
      style={{
        bottom: `calc(100% + ${10 / canvasScale}px)`,
        transform: `translateX(-50%) scale(${1 / canvasScale})`,
        transformOrigin: "bottom center"
      }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className="shrink-0 text-amber-700">Face</span>
      <select
        className="h-6 min-w-16 rounded border border-transparent bg-amber-50 px-1 text-xs font-bold tabular-nums text-amber-800 outline-none hover:border-amber-200 focus:border-amber-300 focus:bg-white"
        value={String(activeFace)}
        onChange={(event) => onFaceChange(Number(event.currentTarget.value))}
      >
        {Array.from({ length: die.faceCount }, (_, index) => {
          const faceNumber = index + 1;
          const face = die.faces[index];
          const label =
            face?.mode === "image"
              ? `${faceNumber}: Image`
              : `${faceNumber}: ${face?.label || faceNumber}`;

          return (
            <option key={faceNumber} value={faceNumber}>
              {label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function getSceneObjectFrameStyle(
  rectTransform: ProjectObjectRectTransform,
  root: boolean,
  siblingIndex: number,
  stackRootOffset: boolean
): CSSProperties {
  const rootOffset = stackRootOffset ? siblingIndex * 28 : 0;
  const left = root ? `calc(50% + ${rectTransform.x + rootOffset}px)` : `${rectTransform.x}px`;
  const top = root ? `calc(50% + ${rectTransform.y + rootOffset}px)` : `${rectTransform.y}px`;

  return {
    height: `${rectTransform.height}px`,
    left,
    top,
    transform: `${root ? "translate(-50%, -50%) " : ""}rotate(${rectTransform.rotation}deg) scale(${rectTransform.scaleX}, ${rectTransform.scaleY})`,
    transformOrigin: `${rectTransform.pivotX * 100}% ${rectTransform.pivotY * 100}%`,
    width: `${rectTransform.width}px`,
    zIndex: siblingIndex + 1
  };
}

function getTransformHandle(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  return target.closest<HTMLElement>("[data-transform-handle]")?.dataset.transformHandle ?? null;
}

function isResizeHandle(value: string | null): value is ResizeHandle {
  return (
    value === "n" ||
    value === "ne" ||
    value === "e" ||
    value === "se" ||
    value === "s" ||
    value === "sw" ||
    value === "w" ||
    value === "nw"
  );
}
