import type {
  Project,
  ProjectFileNode,
  ProjectObjectNode,
  ProjectObjectRectTransform
} from "@bg-maker/shared";
import {
  EyeOff,
  Layers3,
  Maximize2,
  MousePointer2,
  Move,
  RectangleHorizontal,
  Redo2,
  RotateCw,
  Rows3,
  Undo2,
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
  createUpdateProjectObjectRectTransformCommand,
  type ProjectEditorCommand
} from "./project-editor-commands";
import {
  countProjectFileTreeNodes,
  findProjectFileNode,
  findProjectFileNodeLocation
} from "./project-file-tree";
import { getProjectFileNodeTypeLabel } from "./project-file-tree-labels";
import { ProjectFileNodeIcon } from "./project-file-tree-ui";
import { formatProjectDate } from "./project-format";
import { getProjectObjectNodeRectTransform } from "./project-object-tree";
import { ProjectObjectKindIcon } from "./project-object-tree-ui";
import { getProjectObjectKindLabel } from "./project-object-tree-labels";

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
  const totalNodes = countProjectFileTreeNodes(fileTree);
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

  return (
    <main className="flex min-h-0 min-w-0 flex-col bg-[#eef1ed]">
      <div className="flex min-h-[72px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold leading-tight text-slate-950">
            {project.name}
          </h1>
          <p className="truncate text-sm text-slate-500">
            Updated {formatProjectDate(project.updatedAt)}
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 text-sm text-slate-500 sm:flex">
          <Layers3 size={16} />
          {totalNodes}
        </div>
      </div>

      <WorkspaceToolbar
        activeTool={activeTool}
        canRedo={canRedo}
        canUndo={canUndo}
        onRedo={onRedo}
        onToolChange={setActiveTool}
        onUndo={onUndo}
      />

      <div
        className="min-h-0 flex-1 overflow-hidden"
        style={{
          backgroundColor: "#e7ece6",
          backgroundImage:
            "linear-gradient(rgba(71, 85, 105, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(71, 85, 105, 0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }}
      >
        <WorkspaceViewport
          activeTool={activeTool}
          contentFileNode={contentFileNode}
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
  canRedo: boolean;
  canUndo: boolean;
  onRedo: () => void;
  onToolChange: (tool: WorkspaceTool) => void;
  onUndo: () => void;
};

function WorkspaceToolbar({
  activeTool,
  canRedo,
  canUndo,
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
  contentFileNode: ProjectFileNode | null;
  objectTree: ProjectObjectNode[];
  parentFolderName?: string;
  selectedNode?: ProjectFileNode;
  selectedObjectId: string | null;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

function WorkspaceViewport({
  activeTool,
  contentFileNode,
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
        fileNode={contentFileNode}
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
        fileNode={contentFileNode}
        objectTree={objectTree}
        selectedObjectId={selectedObjectId}
        onExecuteCommand={onExecuteCommand}
        onSelectObject={onSelectObject}
      />
    );
  }

  if (selectedNode) {
    return <SelectedFileWorkspace node={selectedNode} parentFolderName={parentFolderName} />;
  }

  return <ProjectWorkspacePlaceholder />;
}

type TableLayoutWorkspaceProps = {
  activeTool: WorkspaceTool;
  fileNode: ProjectFileNode;
  objectTree: ProjectObjectNode[];
  selectedObjectId: string | null;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

function TableLayoutWorkspace({
  activeTool,
  fileNode,
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
            fileNodeId={fileNode.id}
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
  fileNode: ProjectFileNode;
  objectTree: ProjectObjectNode[];
  selectedObjectId: string | null;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

function ObjectFileWorkspace({
  activeTool,
  fileNode,
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
          fileNodeId={fileNode.id}
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
  fileNodeId: string;
  objectTree: ProjectObjectNode[];
  selectedObjectId: string | null;
  size: "large" | "medium" | "small";
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

function ObjectScene({
  activeTool,
  fileNodeId,
  objectTree,
  selectedObjectId,
  size,
  onExecuteCommand,
  onSelectObject
}: ObjectSceneProps) {
  return (
    <div
      className={cx(
        "relative overflow-visible",
        size === "small" ? "h-full w-full" : "h-[min(70vh,760px)] min-h-[420px] w-[min(92%,960px)]"
      )}
    >
      {objectTree.map((object, index) => (
        <SceneObjectFrame
          key={object.id}
          activeTool={activeTool}
          fileNodeId={fileNodeId}
          object={object}
          root
          selectedObjectId={selectedObjectId}
          siblingIndex={index}
          size={size}
          onExecuteCommand={onExecuteCommand}
          onSelectObject={onSelectObject}
        />
      ))}
    </div>
  );
}

type SelectedFileWorkspaceProps = {
  node: ProjectFileNode;
  parentFolderName?: string;
};

function SelectedFileWorkspace({ node, parentFolderName }: SelectedFileWorkspaceProps) {
  const childCount = node.type === "folder" ? (node.children ?? []).length : 0;

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

type CardVisualProps = {
  activeTool: WorkspaceTool;
  object: ProjectObjectNode;
  rectTransform?: ProjectObjectRectTransform;
  selected?: boolean;
  showToolHandles?: boolean;
  size: "large" | "medium" | "small";
};

type SceneObjectFrameProps = {
  activeTool: WorkspaceTool;
  fileNodeId: string;
  object: ProjectObjectNode;
  root?: boolean;
  selectedObjectId: string | null;
  siblingIndex: number;
  size: "large" | "medium" | "small";
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

type TransformDragState = {
  current: ProjectObjectRectTransform;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  before: ProjectObjectRectTransform;
};

function SceneObjectFrame({
  activeTool,
  fileNodeId,
  object,
  root = false,
  selectedObjectId,
  siblingIndex,
  onExecuteCommand,
  onSelectObject,
  size
}: SceneObjectFrameProps) {
  const objectRectTransform = getProjectObjectNodeRectTransform(object);
  const [dragState, setDragState] = useState<TransformDragState | null>(null);
  const visibleRectTransform = dragState?.current ?? objectRectTransform;
  const selected = selectedObjectId === object.id;
  const interactive = selected && activeTool !== "select" && Boolean(fileNodeId);

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
    setDragState({
      before: objectRectTransform,
      current: objectRectTransform,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;

    setDragState((currentState) =>
      currentState
        ? {
            ...currentState,
            current: roundProjectObjectRectTransform(
              getDraggedProjectObjectRectTransform(activeTool, currentState.before, deltaX, deltaY)
            )
          }
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
      <ProjectObjectSurface
        activeTool={activeTool}
        object={object}
        rectTransform={visibleRectTransform}
        size={size}
      />
      {(object.children ?? []).map((child, index) => (
        <SceneObjectFrame
          key={child.id}
          activeTool={activeTool}
          fileNodeId={fileNodeId}
          object={child}
          selectedObjectId={selectedObjectId}
          siblingIndex={index}
          size={size}
          onExecuteCommand={onExecuteCommand}
          onSelectObject={onSelectObject}
        />
      ))}
      {selected ? <ObjectSelectionOverlay activeTool={activeTool} /> : null}
    </div>
  );
}

type ProjectObjectSurfaceProps = {
  activeTool: WorkspaceTool;
  object: ProjectObjectNode;
  rectTransform: ProjectObjectRectTransform;
  size: "large" | "medium" | "small";
};

function ProjectObjectSurface({
  activeTool,
  object,
  rectTransform,
  size
}: ProjectObjectSurfaceProps) {
  if (object.kind === "card") {
    return (
      <CardVisual
        activeTool={activeTool}
        object={object}
        rectTransform={rectTransform}
        size={size}
      />
    );
  }

  if (object.kind === "group") {
    return <GroupVisual object={object} />;
  }

  return <GenericObjectVisual object={object} />;
}

function CardVisual({
  activeTool,
  object,
  rectTransform,
  selected = false,
  showToolHandles = false,
  size
}: CardVisualProps) {
  const hidden = !object.visible;

  return (
    <div
      className={cx(
        "relative flex aspect-[5/7] flex-col overflow-visible rounded-lg border bg-white text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.2)]",
        rectTransform ? "h-full w-full" : getCardSizeClassName(size),
        hidden ? "border-slate-300 opacity-55" : "border-slate-200",
        selected && "ring-2 ring-sky-500 ring-offset-4 ring-offset-[#e7ece6]"
      )}
      style={rectTransform ? getRectTransformSizeStyle(rectTransform) : undefined}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute inset-x-3 top-3 h-10 rounded-md bg-[#f7d8c7]" />
        <div className="absolute bottom-3 left-3 right-3 h-14 rounded-md bg-[#d8eadf]" />
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d3b86b]/50 bg-[#f6ebc9]" />
      </div>

      <div className="relative z-10 flex h-full flex-col p-3">
        <div className="flex min-h-0 items-center gap-2 rounded-md border border-[#e6b29b]/70 bg-white/80 px-2 py-1">
          <RectangleHorizontal
            className="shrink-0 text-rose-600"
            size={size === "small" ? 13 : 16}
          />
          <span
            className={cx(
              "truncate font-semibold leading-tight text-slate-950",
              size === "large" ? "text-sm" : "text-xs"
            )}
          >
            {object.name}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-2 py-4">
          <div
            className={cx(
              "flex items-center justify-center rounded-full border border-[#d3b86b]/70 bg-white/75 text-[#8b6d24]",
              size === "large" ? "h-24 w-24" : size === "medium" ? "h-16 w-16" : "h-10 w-10"
            )}
          >
            {hidden ? (
              <EyeOff size={size === "small" ? 16 : 22} />
            ) : (
              <RectangleHorizontal size={size === "small" ? 16 : 24} />
            )}
          </div>
        </div>

        <div className="min-h-0 rounded-md border border-[#b8d6c3]/80 bg-white/80 px-2 py-1.5">
          <p
            className={cx(
              "truncate font-medium text-slate-700",
              size === "large" ? "text-xs" : "text-[11px]"
            )}
          >
            {getProjectObjectKindLabel(object.kind)}
          </p>
          {size !== "small" ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">
              {object.children?.length ? `${object.children.length} nested items` : "Base card"}
            </p>
          ) : null}
        </div>
      </div>

      {selected && showToolHandles ? <WorkspaceToolHandles activeTool={activeTool} /> : null}
    </div>
  );
}

type GroupVisualProps = {
  object: ProjectObjectNode;
};

function GroupVisual({ object }: GroupVisualProps) {
  return (
    <div className="relative h-full w-full rounded-md border-2 border-dashed border-teal-500/70 bg-teal-50/20 text-teal-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)]">
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-md border border-teal-500/30 bg-white/85 px-2 py-1 text-xs font-semibold shadow-sm">
        <ProjectObjectKindIcon className="shrink-0" kind={object.kind} size={14} />
        <span className="truncate">{object.name}</span>
      </div>
    </div>
  );
}

type GenericObjectVisualProps = {
  object: ProjectObjectNode;
};

function GenericObjectVisual({ object }: GenericObjectVisualProps) {
  return (
    <div className="relative flex h-full w-full items-center justify-center rounded-md border border-slate-300 bg-white/80 p-3 text-center text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
      <div className="min-w-0">
        <ProjectObjectKindIcon className="mx-auto text-teal-700" kind={object.kind} size={24} />
        <p className="mt-2 truncate text-sm font-semibold text-slate-950">{object.name}</p>
        <p className="text-xs text-slate-500">{getProjectObjectKindLabel(object.kind)}</p>
      </div>
    </div>
  );
}

type ObjectSelectionOverlayProps = {
  activeTool: WorkspaceTool;
};

function ObjectSelectionOverlay({ activeTool }: ObjectSelectionOverlayProps) {
  return (
    <>
      <span className="pointer-events-none absolute inset-0 z-40 rounded-lg ring-2 ring-sky-500 ring-offset-2 ring-offset-[#e7ece6]" />
      <div className="pointer-events-none absolute inset-0 z-50">
        <WorkspaceToolHandles activeTool={activeTool} />
      </div>
    </>
  );
}

type WorkspaceToolHandlesProps = {
  activeTool: WorkspaceTool;
};

function WorkspaceToolHandles({ activeTool }: WorkspaceToolHandlesProps) {
  if (activeTool === "rotate") {
    return (
      <>
        <span className="absolute left-1/2 top-[-46px] h-10 w-px -translate-x-1/2 bg-sky-500" />
        <span className="pointer-events-auto absolute left-1/2 top-[-62px] flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-sky-500 bg-white text-sky-700 shadow-sm">
          <RotateCw size={16} />
        </span>
      </>
    );
  }

  if (activeTool === "move") {
    return (
      <span className="pointer-events-auto absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sky-500 bg-white/95 text-sky-700 shadow-sm">
        <Move size={18} />
      </span>
    );
  }

  if (activeTool === "resize") {
    return (
      <span className="pointer-events-auto absolute -bottom-4 -right-4 flex h-8 w-8 items-center justify-center rounded-full border border-sky-500 bg-white text-sky-700 shadow-sm">
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

function getCardSizeClassName(size: "large" | "medium" | "small") {
  if (size === "large") {
    return "h-[min(58vh,420px)]";
  }

  if (size === "medium") {
    return "h-52";
  }

  return "h-32";
}

function getRectTransformSizeStyle(rectTransform: ProjectObjectRectTransform): CSSProperties {
  return {
    height: `${rectTransform.height}px`,
    width: `${rectTransform.width}px`
  };
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

function getDraggedProjectObjectRectTransform(
  activeTool: WorkspaceTool,
  before: ProjectObjectRectTransform,
  deltaX: number,
  deltaY: number
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
      rotation: before.rotation + deltaX * 0.45
    };
  }

  if (activeTool === "resize") {
    return {
      ...before,
      height: clamp(before.height + deltaY, 24, 2000),
      width: clamp(before.width + deltaX, 24, 2000)
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

function roundTo(value: number, decimals: number) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
