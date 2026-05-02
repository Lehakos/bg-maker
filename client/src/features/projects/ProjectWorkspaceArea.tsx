import type {
  Project,
  ProjectFileNode,
  ProjectObjectCard,
  ProjectObjectCardSide,
  ProjectObjectDie,
  ProjectObjectNode,
  ProjectObjectRectTransform
} from "@bg-maker/shared";
import {
  doesProjectObjectClipChildren,
  hasProjectObjectLayout,
  isProjectObjectCardSizePresetLocked,
  normalizeProjectObjectDieActiveFace
} from "@bg-maker/shared";
import {
  Maximize2,
  MousePointer2,
  Move,
  Redo2,
  RotateCw,
  Rows3,
  Scan,
  Undo2,
  ZoomIn,
  ZoomOut,
  type LucideIcon
} from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useMemo,
  useState
} from "react";
import {
  createUpdateProjectObjectTreeCommand,
  createUpdateProjectObjectRectTransformCommand,
  type ProjectEditorCommand
} from "./project-editor-commands";
import { findProjectFileNode, findProjectFileNodeLocation } from "./project-file-tree";
import { getProjectFileNodeTypeLabel } from "./project-file-tree-labels";
import { ProjectFileNodeIcon } from "./project-file-tree-ui";
import {
  getProjectImageAssetOptionById,
  getProjectImageAssetOptions,
  type ProjectImageAssetOption
} from "./project-image-assets";
import {
  getProjectObjectNodeAppearance,
  getProjectObjectNodeCard,
  getProjectObjectNodeDie,
  getProjectObjectNodeDoubleSide,
  getProjectObjectNodeVisibleChildren,
  getProjectObjectNodeLayout,
  getProjectObjectNodeRectTransform,
  setProjectObjectNodeCard,
  setProjectObjectNodeDie
} from "./project-object-tree";
import { getProjectObjectLayoutRectTransformOverrides } from "./project-object-layout";
import { ProjectObjectSurface } from "./ProjectObjectSurface";

const workspaceTools = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "move", label: "Move", icon: Move },
  { id: "rotate", label: "Rotate", icon: RotateCw },
  { id: "resize", label: "Resize", icon: Maximize2 }
] as const satisfies readonly WorkspaceToolDefinition[];

type WorkspaceTool = "select" | "move" | "rotate" | "resize";

type WorkspaceToolDefinition = {
  icon: LucideIcon;
  id: WorkspaceTool;
  label: string;
};

const minCanvasScale = 0.5;
const maxCanvasScale = 6;
const defaultCanvasScale = 2;
const canvasScaleStep = 0.25;

type ProjectWorkspaceAreaProps = {
  canRedo: boolean;
  canUndo: boolean;
  contentFileNode: ProjectFileNode | null;
  fileTree: ProjectFileNode[];
  project: Project;
  selectedNodeId: string | null;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onRedo: () => void;
  selectedObjectId: string | null;
  onSelectObject: (objectId: string | null) => void;
  onUndo: () => void;
};

export function ProjectWorkspaceArea({
  canRedo,
  canUndo,
  contentFileNode,
  fileTree,
  project,
  selectedNodeId,
  onExecuteCommand,
  onRedo,
  selectedObjectId,
  onSelectObject,
  onUndo
}: ProjectWorkspaceAreaProps) {
  const [activeTool, setActiveTool] = useState<WorkspaceTool>("select");
  const [canvasScale, setCanvasScale] = useState(defaultCanvasScale);
  const selectedNode = useMemo(
    () => (selectedNodeId ? findProjectFileNode(fileTree, selectedNodeId) : undefined),
    [fileTree, selectedNodeId]
  );
  const selectedNodeLocation = useMemo(
    () => (selectedNodeId ? findProjectFileNodeLocation(fileTree, selectedNodeId) : undefined),
    [fileTree, selectedNodeId]
  );
  const parentFolder = selectedNodeLocation?.parentId
    ? findProjectFileNode(fileTree, selectedNodeLocation.parentId)
    : undefined;
  const objectTree = useMemo(
    () => contentFileNode?.objectTree ?? [],
    [contentFileNode?.objectTree]
  );
  const imageAssets = useMemo(
    () => getProjectImageAssetOptions(project.id, fileTree),
    [fileTree, project.id]
  );

  return (
    <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#eef1ed]">
      <WorkspaceToolbar
        activeTool={activeTool}
        canvasScale={canvasScale}
        canRedo={canRedo}
        canUndo={canUndo}
        onCanvasScaleChange={setCanvasScale}
        onRedo={onRedo}
        onToolChange={setActiveTool}
        onUndo={onUndo}
      />

      <div
        className="min-h-0 flex-1 overflow-auto"
        style={{
          backgroundColor: "#e7ece6",
          backgroundImage:
            "linear-gradient(rgba(71, 85, 105, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(71, 85, 105, 0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }}
      >
        <WorkspaceViewport
          activeTool={activeTool}
          canvasScale={canvasScale}
          contentFileNode={contentFileNode}
          imageAssets={imageAssets}
          objectTree={objectTree}
          parentFolderName={parentFolder?.name}
          selectedNode={selectedNode}
          selectedObjectId={selectedObjectId}
          onExecuteCommand={onExecuteCommand}
          onSelectObject={onSelectObject}
        />
      </div>
    </main>
  );
}

type WorkspaceToolbarProps = {
  activeTool: WorkspaceTool;
  canvasScale: number;
  canRedo: boolean;
  canUndo: boolean;
  onCanvasScaleChange: (scale: number) => void;
  onRedo: () => void;
  onToolChange: (tool: WorkspaceTool) => void;
  onUndo: () => void;
};

function WorkspaceToolbar({
  activeTool,
  canvasScale,
  canRedo,
  canUndo,
  onCanvasScaleChange,
  onRedo,
  onToolChange,
  onUndo
}: WorkspaceToolbarProps) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3">
      <div className="flex items-center gap-1" aria-label="Command history">
        <ToolbarIconButton disabled={!canUndo} icon={Undo2} label="Undo" onClick={onUndo} />
        <ToolbarIconButton disabled={!canRedo} icon={Redo2} label="Redo" onClick={onRedo} />
      </div>
      <span className="h-6 w-px bg-slate-200" aria-hidden />
      <nav className="flex items-center gap-1" aria-label="Workspace tools">
        {workspaceTools.map((tool) => {
          const Icon = tool.icon;
          const selected = activeTool === tool.id;

          return (
            <ToolbarIconButton
              key={tool.id}
              active={selected}
              icon={Icon}
              label={tool.label}
              onClick={() => onToolChange(tool.id)}
            />
          );
        })}
      </nav>
      <span className="h-6 w-px bg-slate-200" aria-hidden />
      <div className="flex items-center gap-1" aria-label="Canvas zoom">
        <ToolbarIconButton
          disabled={canvasScale <= minCanvasScale}
          icon={ZoomOut}
          label="Zoom out"
          onClick={() => onCanvasScaleChange(normalizeCanvasScale(canvasScale - canvasScaleStep))}
        />
        <button
          className="h-8 min-w-14 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold tabular-nums text-slate-700 hover:border-slate-300 hover:text-slate-950"
          title="Reset zoom"
          type="button"
          onClick={() => onCanvasScaleChange(defaultCanvasScale)}
        >
          {Math.round(canvasScale * 100)}%
        </button>
        <ToolbarIconButton
          disabled={canvasScale >= maxCanvasScale}
          icon={ZoomIn}
          label="Zoom in"
          onClick={() => onCanvasScaleChange(normalizeCanvasScale(canvasScale + canvasScaleStep))}
        />
        <ToolbarIconButton icon={Scan} label="Actual size" onClick={() => onCanvasScaleChange(1)} />
      </div>
    </div>
  );
}

type ToolbarIconButtonProps = {
  active?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

function ToolbarIconButton({
  active = false,
  disabled = false,
  icon: Icon,
  label,
  onClick
}: ToolbarIconButtonProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={active || undefined}
      className={cx(
        "flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 transition-colors",
        active
          ? "border-sky-500 bg-sky-100 text-sky-800 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.18)]"
          : "border-transparent hover:border-slate-200 hover:bg-white hover:text-slate-950",
        disabled && "cursor-not-allowed opacity-40 hover:border-transparent hover:bg-transparent"
      )}
      disabled={disabled}
      title={label}
      type="button"
      onClick={onClick}
    >
      <Icon size={17} />
    </button>
  );
}

type WorkspaceViewportProps = {
  activeTool: WorkspaceTool;
  canvasScale: number;
  contentFileNode: ProjectFileNode | null;
  imageAssets: ProjectImageAssetOption[];
  objectTree: ProjectObjectNode[];
  parentFolderName?: string;
  selectedNode?: ProjectFileNode;
  selectedObjectId: string | null;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

function WorkspaceViewport({
  activeTool,
  canvasScale,
  contentFileNode,
  imageAssets,
  objectTree,
  parentFolderName,
  selectedNode,
  selectedObjectId,
  onExecuteCommand,
  onSelectObject
}: WorkspaceViewportProps) {
  if (contentFileNode?.kind === "tableSetup") {
    return (
      <TableLayoutWorkspace
        activeTool={activeTool}
        canvasScale={canvasScale}
        fileNode={contentFileNode}
        imageAssets={imageAssets}
        objectTree={objectTree}
        selectedObjectId={selectedObjectId}
        onExecuteCommand={onExecuteCommand}
        onSelectObject={onSelectObject}
      />
    );
  }

  if (contentFileNode?.kind === "object") {
    return (
      <ObjectFileWorkspace
        activeTool={activeTool}
        canvasScale={canvasScale}
        fileNode={contentFileNode}
        imageAssets={imageAssets}
        objectTree={objectTree}
        selectedObjectId={selectedObjectId}
        onExecuteCommand={onExecuteCommand}
        onSelectObject={onSelectObject}
      />
    );
  }

  if (selectedNode) {
    return (
      <SelectedFileWorkspace
        imageAssets={imageAssets}
        node={selectedNode}
        parentFolderName={parentFolderName}
      />
    );
  }

  return <ProjectWorkspacePlaceholder />;
}

type TableLayoutWorkspaceProps = {
  activeTool: WorkspaceTool;
  canvasScale: number;
  fileNode: ProjectFileNode;
  imageAssets: ProjectImageAssetOption[];
  objectTree: ProjectObjectNode[];
  selectedObjectId: string | null;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

function TableLayoutWorkspace({
  activeTool,
  canvasScale,
  fileNode,
  imageAssets,
  objectTree,
  selectedObjectId,
  onExecuteCommand,
  onSelectObject
}: TableLayoutWorkspaceProps) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center p-6">
      <section
        aria-label={fileNode.name}
        className="relative h-[min(66vh,620px)] min-h-[320px] w-[min(92%,980px)] overflow-hidden rounded-lg border border-emerald-950/20 bg-[#6f8b70] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_24px_60px_rgba(15,23,42,0.18)]"
      >
        <div className="absolute left-4 top-4 z-10 flex min-w-0 max-w-[calc(100%-2rem)] items-center gap-2 rounded-md border border-white/30 bg-white/20 px-3 py-2 text-white shadow-sm backdrop-blur-sm">
          <Rows3 size={17} />
          <span className="truncate text-sm font-semibold">{fileNode.name}</span>
        </div>

        {objectTree.length > 0 ? (
          <ObjectScene
            activeTool={activeTool}
            canvasScale={canvasScale}
            fileNodeId={fileNode.id}
            imageAssets={imageAssets}
            objectTree={objectTree}
            selectedObjectId={selectedObjectId}
            size="small"
            onExecuteCommand={onExecuteCommand}
            onSelectObject={onSelectObject}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="flex h-28 w-52 items-center justify-center rounded-md border border-white/30 bg-white/10 text-center text-sm font-medium text-white/85">
              Empty table layout
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

type ObjectFileWorkspaceProps = {
  activeTool: WorkspaceTool;
  canvasScale: number;
  fileNode: ProjectFileNode;
  imageAssets: ProjectImageAssetOption[];
  objectTree: ProjectObjectNode[];
  selectedObjectId: string | null;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

function ObjectFileWorkspace({
  activeTool,
  canvasScale,
  fileNode,
  imageAssets,
  objectTree,
  selectedObjectId,
  onExecuteCommand,
  onSelectObject
}: ObjectFileWorkspaceProps) {
  if (objectTree.length > 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-8">
        <ObjectScene
          activeTool={activeTool}
          canvasScale={canvasScale}
          fileNodeId={fileNode.id}
          imageAssets={imageAssets}
          objectTree={objectTree}
          selectedObjectId={selectedObjectId}
          size="large"
          onExecuteCommand={onExecuteCommand}
          onSelectObject={onSelectObject}
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

type ObjectSceneProps = {
  activeTool: WorkspaceTool;
  canvasScale: number;
  fileNodeId: string;
  imageAssets: ProjectImageAssetOption[];
  objectTree: ProjectObjectNode[];
  selectedObjectId: string | null;
  size: "large" | "medium" | "small";
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

function ObjectScene({
  activeTool,
  canvasScale,
  fileNodeId,
  imageAssets,
  objectTree,
  selectedObjectId,
  size,
  onExecuteCommand,
  onSelectObject
}: ObjectSceneProps) {
  const imageAssetById = useMemo(
    () => new Map(imageAssets.map((imageAsset) => [imageAsset.asset.id, imageAsset])),
    [imageAssets]
  );

  function handleCardSideChange(
    objectId: string,
    card: ProjectObjectCard,
    activeSide: ProjectObjectCardSide
  ) {
    if (card.activeSide === activeSide) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeCard(objectTree, objectId, {
      ...card,
      activeSide
    });

    if (nextObjectTree === objectTree) {
      return;
    }

    onExecuteCommand(
      createUpdateProjectObjectTreeCommand({
        after: nextObjectTree,
        before: objectTree,
        fileNodeId,
        label: activeSide === "front" ? "Show card front" : "Show card back"
      })
    );
  }

  function handleDieFaceChange(objectId: string, die: ProjectObjectDie, activeFace: number) {
    const nextActiveFace = normalizeProjectObjectDieActiveFace(activeFace, die.faceCount);

    if (die.activeFace === nextActiveFace) {
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

  return (
    <div
      className={cx(
        "relative overflow-visible",
        size === "small" ? "h-full w-full" : "h-[min(70vh,760px)] min-h-[420px] w-[min(92%,960px)]"
      )}
      style={{
        transform: `scale(${canvasScale})`,
        transformOrigin: "center"
      }}
    >
      <WorkspaceAxes />
      {objectTree.map((object, index) => (
        <SceneObjectFrame
          key={object.id}
          activeTool={activeTool}
          canvasScale={canvasScale}
          fileNodeId={fileNodeId}
          imageAssetById={imageAssetById}
          object={object}
          root
          selectedObjectId={selectedObjectId}
          siblingIndex={index}
          size={size}
          onCardSideChange={handleCardSideChange}
          onDieFaceChange={handleDieFaceChange}
          onExecuteCommand={onExecuteCommand}
          onSelectObject={onSelectObject}
        />
      ))}
    </div>
  );
}

function WorkspaceAxes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-visible">
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

type SelectedFileWorkspaceProps = {
  imageAssets: ProjectImageAssetOption[];
  node: ProjectFileNode;
  parentFolderName?: string;
};

function SelectedFileWorkspace({
  imageAssets,
  node,
  parentFolderName
}: SelectedFileWorkspaceProps) {
  const childCount = node.type === "folder" ? (node.children ?? []).length : 0;
  const selectedImageAsset = node.imageAsset
    ? getProjectImageAssetOptionById(imageAssets, node.imageAsset.id)
    : undefined;

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 overflow-auto p-5">
      <div className="flex items-start gap-4 border-b border-slate-200 pb-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white text-teal-800 ring-1 ring-slate-200">
          <ProjectFileNodeIcon node={node} size={26} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{getProjectFileNodeTypeLabel(node)}</p>
          <h2 className="break-words text-3xl font-semibold leading-tight text-slate-950">
            {node.name}
          </h2>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <WorkspaceStat label="Type" value={getProjectFileNodeTypeLabel(node)} />
        {node.type === "folder" ? <WorkspaceStat label="Items" value={String(childCount)} /> : null}
        {parentFolderName ? <WorkspaceStat label="Folder" value={parentFolderName} /> : null}
      </div>

      {selectedImageAsset ? (
        <section
          aria-label={`${node.name} preview`}
          className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-4"
        >
          <img
            alt={node.name}
            className="max-h-full max-w-full rounded-md object-contain shadow-sm"
            src={selectedImageAsset.url}
          />
        </section>
      ) : null}
    </div>
  );
}

function ProjectWorkspacePlaceholder() {
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 overflow-auto p-5">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium text-slate-500">Project</p>
        <h2 className="break-words text-3xl font-semibold leading-tight text-slate-950">
          Workspace
        </h2>
      </div>
    </div>
  );
}

type SceneObjectFrameProps = {
  activeTool: WorkspaceTool;
  canvasScale: number;
  fileNodeId: string;
  imageAssetById: Map<string, ProjectImageAssetOption>;
  object: ProjectObjectNode;
  rectTransformOverride?: ProjectObjectRectTransform;
  root?: boolean;
  selectedObjectId: string | null;
  siblingIndex: number;
  size: "large" | "medium" | "small";
  onCardSideChange: (
    objectId: string,
    card: ProjectObjectCard,
    activeSide: ProjectObjectCardSide
  ) => void;
  onDieFaceChange: (objectId: string, die: ProjectObjectDie, activeFace: number) => void;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

type TransformDragState = {
  current: ProjectObjectRectTransform;
  pointerId: number;
  rotateOffset?: number;
  rotatePivotClientX?: number;
  rotatePivotClientY?: number;
  rotatePointerAngle?: number;
  startClientX: number;
  startClientY: number;
  before: ProjectObjectRectTransform;
};

function SceneObjectFrame({
  activeTool,
  canvasScale,
  fileNodeId,
  imageAssetById,
  object,
  rectTransformOverride,
  root = false,
  selectedObjectId,
  siblingIndex,
  onCardSideChange,
  onDieFaceChange,
  onExecuteCommand,
  onSelectObject,
  size
}: SceneObjectFrameProps) {
  const objectRectTransform = getProjectObjectNodeRectTransform(object);
  const baseVisibleRectTransform = rectTransformOverride ?? objectRectTransform;
  const [dragState, setDragState] = useState<TransformDragState | null>(null);
  const visibleRectTransform = dragState?.current ?? baseVisibleRectTransform;
  const selected = selectedObjectId === object.id;
  const layoutManaged = Boolean(rectTransformOverride);
  const appearance = getProjectObjectNodeAppearance(object);
  const card = object.kind === "card" ? getProjectObjectNodeCard(object) : null;
  const die = object.kind === "die" ? getProjectObjectNodeDie(object) : null;
  const doubleSide = object.kind === "card" ? getProjectObjectNodeDoubleSide(object) : null;
  const hasTopObjectControls = Boolean((card && doubleSide?.enabled) || die);
  const clipsChildren = doesProjectObjectClipChildren(object.kind);
  const sizePresetLocked = card ? isProjectObjectCardSizePresetLocked(card) : false;
  const resizeLocked = activeTool === "resize" && sizePresetLocked;
  const interactive =
    selected && activeTool !== "select" && Boolean(fileNodeId) && !layoutManaged && !resizeLocked;
  const children = getProjectObjectNodeVisibleChildren(object);
  const childRectTransformOverrides = hasProjectObjectLayout(object.kind)
    ? getProjectObjectLayoutRectTransformOverrides(
        visibleRectTransform,
        children,
        getProjectObjectNodeLayout(object),
        appearance.padding
      )
    : new Map<string, ProjectObjectRectTransform>();

  if (!object.visible) {
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
    onSelectObject(object.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectObject(object.id);
  }

  function releasePointerCapture(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      aria-label={object.name}
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
      <ProjectObjectSurface imageAssetById={imageAssetById} object={object} />
      <div
        className={cx("absolute inset-0", clipsChildren ? "overflow-hidden" : "overflow-visible")}
        style={{ borderRadius: `${appearance.borderRadius}px` }}
      >
        {children.map((child, index) => (
          <SceneObjectFrame
            key={child.id}
            activeTool={activeTool}
            canvasScale={canvasScale}
            fileNodeId={fileNodeId}
            imageAssetById={imageAssetById}
            object={child}
            rectTransformOverride={childRectTransformOverrides.get(child.id)}
            selectedObjectId={selectedObjectId}
            siblingIndex={index}
            size={size}
            onCardSideChange={onCardSideChange}
            onDieFaceChange={onDieFaceChange}
            onExecuteCommand={onExecuteCommand}
            onSelectObject={onSelectObject}
          />
        ))}
      </div>
      {selected && card && doubleSide?.enabled ? (
        <CardSideSwitcher
          activeSide={card.activeSide}
          canvasScale={canvasScale}
          onSideChange={(activeSide) => onCardSideChange(object.id, card, activeSide)}
        />
      ) : null}
      {selected && die ? (
        <DieFaceSwitcher
          activeFace={die.activeFace}
          canvasScale={canvasScale}
          die={die}
          onFaceChange={(activeFace) => onDieFaceChange(object.id, die, activeFace)}
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

type CardSideSwitcherProps = {
  activeSide: ProjectObjectCardSide;
  canvasScale: number;
  onSideChange: (side: ProjectObjectCardSide) => void;
};

function CardSideSwitcher({ activeSide, canvasScale, onSideChange }: CardSideSwitcherProps) {
  return (
    <div
      aria-label="Card side"
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

type ObjectSelectionOverlayProps = {
  activeTool: WorkspaceTool;
  canvasScale: number;
  topControlsOffset: number;
};

function ObjectSelectionOverlay({
  activeTool,
  canvasScale,
  topControlsOffset
}: ObjectSelectionOverlayProps) {
  return (
    <>
      <span className="pointer-events-none absolute inset-0 z-40 rounded-lg ring-2 ring-sky-500 ring-offset-2 ring-offset-[#e7ece6]" />
      <div className="pointer-events-none absolute inset-0 z-50">
        <WorkspaceToolHandles
          activeTool={activeTool}
          canvasScale={canvasScale}
          topControlsOffset={topControlsOffset}
        />
      </div>
    </>
  );
}

type WorkspaceToolHandlesProps = {
  activeTool: WorkspaceTool;
  canvasScale: number;
  topControlsOffset: number;
};

function WorkspaceToolHandles({
  activeTool,
  canvasScale,
  topControlsOffset
}: WorkspaceToolHandlesProps) {
  const inverseCanvasScale = 1 / canvasScale;

  if (activeTool === "rotate") {
    const handleTop = -62 - topControlsOffset;
    const lineTop = -46 - topControlsOffset;
    const lineHeight = 40 + topControlsOffset;

    return (
      <>
        <span
          className="absolute left-1/2 bg-sky-500"
          style={{
            height: `${lineHeight / canvasScale}px`,
            top: `${lineTop / canvasScale}px`,
            transform: "translateX(-50%)",
            width: `${1 / canvasScale}px`
          }}
        />
        <span
          className="pointer-events-auto absolute left-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-sky-500 bg-white text-sky-700 shadow-sm"
          style={{
            top: `${handleTop / canvasScale}px`,
            transform: `translateX(-50%) scale(${inverseCanvasScale})`,
            transformOrigin: "center"
          }}
        >
          <RotateCw size={16} />
        </span>
      </>
    );
  }

  if (activeTool === "move") {
    return (
      <span
        className="pointer-events-auto absolute left-1/2 top-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-sky-500 bg-white/95 text-sky-700 shadow-sm"
        style={{
          transform: `translate(-50%, -50%) scale(${inverseCanvasScale})`,
          transformOrigin: "center"
        }}
      >
        <Move size={18} />
      </span>
    );
  }

  if (activeTool === "resize") {
    return (
      <span
        className="pointer-events-auto absolute flex h-8 w-8 items-center justify-center rounded-full border border-sky-500 bg-white text-sky-700 shadow-sm"
        style={{
          bottom: `${-16 / canvasScale}px`,
          right: `${-16 / canvasScale}px`,
          transform: `scale(${inverseCanvasScale})`,
          transformOrigin: "center"
        }}
      >
        <Maximize2 size={15} />
      </span>
    );
  }

  return null;
}

type WorkspaceStatProps = {
  label: string;
  value: string;
};

function WorkspaceStat({ label, value }: WorkspaceStatProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-2xl font-semibold text-slate-950">{value}</p>
    </div>
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

function getRotateDragState(element: HTMLElement, clientX: number, clientY: number) {
  const pivot = getElementCenterClientPoint(element);
  const pointerAngle = getPointerAngleDegrees(clientX, clientY, pivot.x, pivot.y);

  return {
    rotateOffset: 0,
    rotatePivotClientX: pivot.x,
    rotatePivotClientY: pivot.y,
    rotatePointerAngle: pointerAngle
  };
}

function getNextTransformDragState(
  currentState: TransformDragState,
  activeTool: WorkspaceTool,
  canvasScale: number,
  clientX: number,
  clientY: number
): TransformDragState {
  const deltaX = (clientX - currentState.startClientX) / canvasScale;
  const deltaY = (clientY - currentState.startClientY) / canvasScale;
  const rotateDragUpdate = getRotateDragUpdate(currentState, activeTool, clientX, clientY);

  return {
    ...currentState,
    ...rotateDragUpdate,
    current: roundProjectObjectRectTransform(
      getDraggedProjectObjectRectTransform(
        activeTool,
        currentState.before,
        deltaX,
        deltaY,
        rotateDragUpdate.rotateOffset ?? currentState.rotateOffset ?? 0
      )
    )
  };
}

function getRotateDragUpdate(
  currentState: TransformDragState,
  activeTool: WorkspaceTool,
  clientX: number,
  clientY: number
): Pick<TransformDragState, "rotateOffset" | "rotatePointerAngle"> {
  if (
    activeTool !== "rotate" ||
    currentState.rotatePivotClientX === undefined ||
    currentState.rotatePivotClientY === undefined ||
    currentState.rotatePointerAngle === undefined
  ) {
    return {};
  }

  const pointerAngle = getPointerAngleDegrees(
    clientX,
    clientY,
    currentState.rotatePivotClientX,
    currentState.rotatePivotClientY
  );
  const angleDelta = getShortestAngleDelta(pointerAngle, currentState.rotatePointerAngle);

  return {
    rotateOffset: (currentState.rotateOffset ?? 0) + angleDelta,
    rotatePointerAngle: pointerAngle
  };
}

function getElementCenterClientPoint(element: HTMLElement) {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function getPointerAngleDegrees(
  clientX: number,
  clientY: number,
  pivotClientX: number,
  pivotClientY: number
) {
  return (Math.atan2(clientY - pivotClientY, clientX - pivotClientX) * 180) / Math.PI;
}

function getShortestAngleDelta(currentAngle: number, previousAngle: number) {
  let delta = currentAngle - previousAngle;

  while (delta > 180) {
    delta -= 360;
  }

  while (delta < -180) {
    delta += 360;
  }

  return delta;
}

function getDraggedProjectObjectRectTransform(
  activeTool: WorkspaceTool,
  before: ProjectObjectRectTransform,
  deltaX: number,
  deltaY: number,
  rotateOffset = 0
): ProjectObjectRectTransform {
  if (activeTool === "move") {
    return {
      ...before,
      x: before.x + deltaX,
      y: before.y + deltaY
    };
  }

  if (activeTool === "rotate") {
    return {
      ...before,
      rotation: before.rotation + rotateOffset
    };
  }

  if (activeTool === "resize") {
    return {
      ...before,
      height: clamp(before.height + deltaY, 1, 2000),
      width: clamp(before.width + deltaX, 1, 2000)
    };
  }

  return before;
}

function roundProjectObjectRectTransform(
  rectTransform: ProjectObjectRectTransform
): ProjectObjectRectTransform {
  return {
    height: Math.round(rectTransform.height),
    pivotX: roundTo(rectTransform.pivotX, 3),
    pivotY: roundTo(rectTransform.pivotY, 3),
    rotation: Math.round(rectTransform.rotation),
    scaleX: roundTo(rectTransform.scaleX, 3),
    scaleY: roundTo(rectTransform.scaleY, 3),
    width: Math.round(rectTransform.width),
    x: Math.round(rectTransform.x),
    y: Math.round(rectTransform.y)
  };
}

function areProjectObjectRectTransformsEqual(
  left: ProjectObjectRectTransform,
  right: ProjectObjectRectTransform
) {
  return (
    left.height === right.height &&
    left.pivotX === right.pivotX &&
    left.pivotY === right.pivotY &&
    left.rotation === right.rotation &&
    left.scaleX === right.scaleX &&
    left.scaleY === right.scaleY &&
    left.width === right.width &&
    left.x === right.x &&
    left.y === right.y
  );
}

function getRectTransformCommandLabel(activeTool: WorkspaceTool) {
  if (activeTool === "move") {
    return "Move object";
  }

  if (activeTool === "rotate") {
    return "Rotate object";
  }

  if (activeTool === "resize") {
    return "Resize object";
  }

  return "Update object frame";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCanvasScale(value: number) {
  return clamp(
    Math.round(value / canvasScaleStep) * canvasScaleStep,
    minCanvasScale,
    maxCanvasScale
  );
}

function roundTo(value: number, decimals: number) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
