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
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
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
  areProjectObjectRectTransformsEqual,
  getNextTransformDragState,
  getRectTransformCommandLabel,
  getRotateDragState,
  type TransformDragState
} from "./transform-drag-helpers";
import { useProjectWorkspaceStore } from "./use-project-workspace-store";

type SceneObjectFrameProps = {
  fileTree: ProjectFileNode[];
  fileNodeId: string;
  imageAssetById: Map<string, ProjectImageAssetOption>;
  object: ProjectObjectNode;
  readOnly?: boolean;
  rectTransformOverride?: ProjectObjectRectTransform;
  root?: boolean;
  selectedObjectId: string | null;
  siblingIndex: number;
  onDieFaceChange: (objectId: string, die: ProjectObjectDie, activeFace: number) => void;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onObjectSideChange: (
    objectId: string,
    activeSide: ProjectObjectSide
  ) => void;
  onSelectObject: (objectId: string | null) => void;
};

export function SceneObjectFrame({
  fileTree,
  fileNodeId,
  imageAssetById,
  object,
  readOnly = false,
  rectTransformOverride,
  root = false,
  selectedObjectId,
  siblingIndex,
  onDieFaceChange,
  onExecuteCommand,
  onObjectSideChange,
  onSelectObject
}: SceneObjectFrameProps) {
  const activeTool = useProjectWorkspaceStore((state) => state.activeTool);
  const canvasScale = useProjectWorkspaceStore((state) => state.canvasScale);
  const viewObject = object;
  const objectRectTransform = getProjectObjectNodeRectTransform(viewObject);
  const effectiveObjectRectTransform = getEffectiveProjectObjectRectTransform(viewObject, fileTree);
  const baseVisibleRectTransform = rectTransformOverride ?? effectiveObjectRectTransform;
  const [dragState, setDragState] = useState<TransformDragState | null>(null);
  const visibleRectTransform = dragState?.current ?? baseVisibleRectTransform;
  const selected = selectedObjectId === viewObject.id;
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
  const interactive =
    !readOnly &&
    selected &&
    activeTool !== "select" &&
    Boolean(fileNodeId) &&
    !layoutManaged &&
    !resizeLocked;
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
    event.stopPropagation();

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

    setDragState({
      before: objectRectTransform,
      current: objectRectTransform,
      pointerId: event.pointerId,
      ...rotateDragState,
      startClientX: event.clientX,
      startClientY: event.clientY
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    setDragState((currentState) =>
      currentState
        ? getNextTransformDragState(
            currentState,
            activeTool,
            canvasScale,
            event.clientX,
            event.clientY
          )
        : currentState
    );
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    commitDrag(event);
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    releasePointerCapture(event);
    setDragState(null);
  }

  function commitDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    releasePointerCapture(event);

    if (fileNodeId && !areProjectObjectRectTransformsEqual(dragState.before, dragState.current)) {
      onExecuteCommand(
        createUpdateProjectObjectRectTransformCommand({
          after: dragState.current,
          before: dragState.before,
          fileNodeId,
          label: getRectTransformCommandLabel(activeTool),
          objectId: object.id
        })
      );
    }

    setDragState(null);
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    onSelectObject(viewObject.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectObject(viewObject.id);
  }

  function releasePointerCapture(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      aria-label={viewObject.name}
      className={cx(
        "absolute overflow-visible touch-none",
        activeTool === "move" && interactive && "cursor-move",
        activeTool === "rotate" && interactive && "cursor-grab",
        activeTool === "resize" && interactive && "cursor-nwse-resize"
      )}
      role="button"
      style={getSceneObjectFrameStyle(visibleRectTransform, root, siblingIndex)}
      tabIndex={0}
      onClick={handleClick}
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
            object={child}
            readOnly={readOnly}
            rectTransformOverride={childRectTransformOverrides.get(child.id)}
            selectedObjectId={selectedObjectId}
            siblingIndex={index}
            onDieFaceChange={onDieFaceChange}
            onExecuteCommand={onExecuteCommand}
            onObjectSideChange={onObjectSideChange}
            onSelectObject={onSelectObject}
          />
        ))}
      </div>
      {selected && card && doubleSide?.enabled ? (
        <ObjectSideSwitcher
          activeSide={getProjectObjectNodeActiveSide(viewObject)}
          canvasScale={canvasScale}
          label="Card side"
          onSideChange={(activeSide) =>
            onObjectSideChange(viewObject.id, activeSide)
          }
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
          onSideChange={(activeSide) =>
            onObjectSideChange(viewObject.id, activeSide)
          }
        />
      ) : null}
      {selected ? (
        <ObjectSelectionOverlay
          activeTool={layoutManaged || resizeLocked ? "select" : activeTool}
          canvasScale={canvasScale}
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
  siblingIndex: number
): CSSProperties {
  const rootOffset = siblingIndex * 28;
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
