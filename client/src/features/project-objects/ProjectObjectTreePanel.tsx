import type {
  CollisionDetection,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
  UniqueIdentifier
} from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  projectObjectKinds,
  type ProjectFileNode,
  type ProjectObjectKind,
  type ProjectObjectNode
} from "@bg-maker/shared";
import { ChevronDown, ChevronRight, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { ContextMenu, type ContextMenuAction } from "../../components/ContextMenu";
import {
  appendProjectObjectNode,
  createProjectObjectNode,
  deleteProjectObjectNode,
  findProjectObjectNode,
  findProjectObjectNodeLocation,
  getExpandableProjectObjectNodeIds,
  getProjectObjectNodeVisibleChildren,
  moveProjectObjectNode,
  renameProjectObjectNode,
  setProjectObjectNodeVisibility,
  type ProjectObjectTreeParentId
} from "./project-object-tree";
import {
  ProjectObjectKindIcon,
  ProjectObjectNodeIcon,
  ProjectObjectTreeRootIcon
} from "./project-object-tree-ui";
import {
  getProjectObjectKindIconClassName,
  getProjectObjectKindLabel
} from "./project-object-tree-labels";

const indentationWidth = 18;
const rootDropTargetId = "project-object-tree:root";
const itemDropTargetPrefix = "project-object-tree:item:";
const reorderDropZoneRatio = 0.3;
const projectObjectCreateKinds: readonly ProjectObjectKind[] = projectObjectKinds;

type FlattenedProjectObjectNode = {
  ancestorIds: string[];
  depth: number;
  id: string;
  node: ProjectObjectNode;
  parentId: ProjectObjectTreeParentId;
};

type ObjectTreeContextMenuState = {
  nodeId: string | null;
  parentId: ProjectObjectTreeParentId;
  x: number;
  y: number;
};

type ObjectTreeExpansionState = {
  expandedObjectIds: Set<string>;
  fileNodeId: string | null;
  rootExpanded: boolean;
};

type ObjectDropIntent = "after" | "before" | "inside";

type ObjectDropIndicator = {
  intent: ObjectDropIntent;
  targetObjectId: string;
};

type ProjectObjectTreePanelProps = {
  className?: string;
  contentFileNode: ProjectFileNode | null;
  saving: boolean;
  selectedObjectId: string | null;
  onObjectTreeChange: (fileNodeId: string, objectTree: ProjectObjectNode[]) => void;
  onSelectObject: (objectId: string | null) => void;
};

export function ProjectObjectTreePanel({
  className,
  contentFileNode,
  saving,
  selectedObjectId,
  onObjectTreeChange,
  onSelectObject
}: ProjectObjectTreePanelProps) {
  const objectTree = useMemo(
    () => contentFileNode?.objectTree ?? [],
    [contentFileNode?.objectTree]
  );
  const fileNodeId = contentFileNode?.id ?? null;
  const defaultExpandedObjectIds = useMemo(
    () => getExpandableProjectObjectNodeIds(objectTree),
    [objectTree]
  );
  const [expansionState, setExpansionState] = useState<ObjectTreeExpansionState>(() => ({
    expandedObjectIds: defaultExpandedObjectIds,
    fileNodeId,
    rootExpanded: true
  }));
  const expandedObjectIds =
    expansionState.fileNodeId === fileNodeId
      ? expansionState.expandedObjectIds
      : defaultExpandedObjectIds;
  const rootExpanded =
    expansionState.fileNodeId === fileNodeId ? expansionState.rootExpanded : true;
  const [activeObjectId, setActiveObjectId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ObjectTreeContextMenuState | null>(null);
  const [dropIndicator, setDropIndicator] = useState<ObjectDropIndicator | null>(null);
  const [renamingObjectId, setRenamingObjectId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const dragStartPointerYRef = useRef<number | null>(null);
  const pointerYRef = useRef<number | null>(null);
  const flattenedObjectTree = useMemo(
    () => flattenProjectObjectTree(objectTree, expandedObjectIds),
    [expandedObjectIds, objectTree]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    }),
    useSensor(KeyboardSensor)
  );
  const contextMenuObject = contextMenu?.nodeId
    ? findProjectObjectNode(objectTree, contextMenu.nodeId)
    : undefined;
  const isObjectFile = contentFileNode?.kind === "object";
  const objectFileRootId = isObjectFile ? (objectTree[0]?.id ?? null) : null;
  const lockedRootObjectId = isObjectFile && objectTree.length === 1 ? objectFileRootId : null;
  const contextMenuParentId = contextMenu?.parentId ?? null;
  const canCreateObject = Boolean(
    contentFileNode && (!isObjectFile || contextMenuParentId !== null || objectTree.length === 0)
  );
  const contextMenuActions = createObjectTreeContextMenuActions({
    disabled: saving || !contentFileNode,
    canCreate: canCreateObject,
    canDelete: Boolean(contextMenuObject && contextMenuObject.id !== lockedRootObjectId),
    canRename: Boolean(contextMenuObject),
    nodeId: contextMenu?.nodeId ?? null,
    parentId: contextMenuParentId,
    onCreate: handleCreateObject,
    onDelete: handleDeleteContextObject,
    onRename: handleRequestRenameObject
  });

  useEffect(() => {
    function handlePointerMove(event: globalThis.MouseEvent | PointerEvent) {
      pointerYRef.current = event.clientY;
    }

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  function handleContextMenu(event: MouseEvent, nodeId: string | null = null) {
    if (!contentFileNode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (nodeId) {
      onSelectObject(nodeId);
    } else {
      onSelectObject(null);
    }

    setContextMenu({
      nodeId,
      parentId: nodeId,
      x: getObjectTreeContextMenuX(event.clientX),
      y: event.clientY
    });
  }

  function handleCreateObject(kind: ProjectObjectKind, parentId: ProjectObjectTreeParentId) {
    if (!contentFileNode) {
      return;
    }

    if (contentFileNode.kind === "object" && parentId === null && objectTree.length > 0) {
      return;
    }

    const nextObject = createProjectObjectNode(kind);
    const nextObjectTree = appendProjectObjectNode(objectTree, parentId, nextObject);

    if (nextObjectTree === objectTree) {
      return;
    }

    if (parentId) {
      updateExpansionState((currentState) => ({
        ...currentState,
        expandedObjectIds: new Set(currentState.expandedObjectIds).add(parentId)
      }));
    }

    setContextMenu(null);
    handleCancelRenameObject();
    onSelectObject(nextObject.id);
    onObjectTreeChange(contentFileNode.id, nextObjectTree);
  }

  function handleRequestRenameObject(nodeId: string | null) {
    if (!nodeId) {
      return;
    }

    const object = findProjectObjectNode(objectTree, nodeId);

    if (!object) {
      return;
    }

    window.setTimeout(() => {
      setRenamingObjectId(object.id);
      setRenameDraft(object.name);
      onSelectObject(object.id);
    }, 0);
  }

  function handleCommitRenameObject(objectId: string) {
    if (!contentFileNode) {
      return;
    }

    const object = findProjectObjectNode(objectTree, objectId);
    const nextName = renameDraft.trim();

    setRenamingObjectId(null);
    setRenameDraft("");

    if (!object || !nextName || nextName === object.name) {
      return;
    }

    const nextObjectTree = renameProjectObjectNode(objectTree, objectId, nextName);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function handleCancelRenameObject() {
    setRenamingObjectId(null);
    setRenameDraft("");
  }

  function handleDeleteContextObject(nodeId: string | null) {
    if (!contentFileNode || !nodeId) {
      return;
    }

    if (nodeId === lockedRootObjectId) {
      return;
    }

    const objectLocation = findProjectObjectNodeLocation(objectTree, nodeId);
    const nextObjectTree = deleteProjectObjectNode(objectTree, nodeId);

    if (nextObjectTree === objectTree) {
      return;
    }

    handleCancelRenameObject();
    onSelectObject(objectLocation?.parentId ?? null);
    onObjectTreeChange(contentFileNode.id, nextObjectTree);
  }

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);

    if (!findProjectObjectNode(objectTree, activeId)) {
      return;
    }

    setContextMenu(null);
    handleCancelRenameObject();
    setActiveObjectId(activeId);
    setDropIndicator(null);
    dragStartPointerYRef.current = getActivatorEventClientY(event.activatorEvent);
  }

  function handleDragOver(event: DragOverEvent) {
    setDropIndicator(getObjectDropIndicator(event));
  }

  function handleDragMove(event: DragMoveEvent) {
    setDropIndicator(getObjectDropIndicator(event));
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const dropTargetId = event.over?.id;

    setActiveObjectId(null);
    setDropIndicator(null);
    dragStartPointerYRef.current = null;

    if (!contentFileNode || !dropTargetId) {
      return;
    }

    if (dropTargetId === rootDropTargetId) {
      if (contentFileNode.kind === "object") {
        return;
      }

      const nextObjectTree = moveProjectObjectNode(objectTree, activeId, null, objectTree.length);

      if (nextObjectTree !== objectTree) {
        onSelectObject(activeId);
        onObjectTreeChange(contentFileNode.id, nextObjectTree);
      }

      return;
    }

    const objectDropIndicator = getObjectDropIndicator(event);

    if (!objectDropIndicator) {
      return;
    }

    const { intent: dropIntent, targetObjectId } = objectDropIndicator;
    const targetLocation = findProjectObjectNodeLocation(objectTree, targetObjectId);

    if (!targetLocation) {
      return;
    }

    const targetParentId = dropIntent === "inside" ? targetObjectId : targetLocation.parentId;
    const targetIndex =
      dropIntent === "inside"
        ? getProjectObjectNodeVisibleChildren(targetLocation.node).length
        : targetLocation.index + (dropIntent === "after" ? 1 : 0);

    if (
      contentFileNode.kind === "object" &&
      ((activeId === objectFileRootId && targetParentId !== null) ||
        (activeId !== objectFileRootId && targetParentId === null))
    ) {
      return;
    }

    const nextObjectTree = moveProjectObjectNode(objectTree, activeId, targetParentId, targetIndex);

    if (nextObjectTree === objectTree) {
      return;
    }

    onSelectObject(activeId);

    if (dropIntent === "inside") {
      updateExpansionState((currentState) => ({
        ...currentState,
        expandedObjectIds: new Set(currentState.expandedObjectIds).add(targetObjectId)
      }));
    }

    onObjectTreeChange(contentFileNode.id, nextObjectTree);
  }

  function handleDragCancel() {
    setActiveObjectId(null);
    setDropIndicator(null);
    dragStartPointerYRef.current = null;
  }

  function handleToggleObjectExpanded(objectId: string) {
    updateExpansionState((currentState) => {
      const nextObjectIds = new Set(currentState.expandedObjectIds);

      if (nextObjectIds.has(objectId)) {
        nextObjectIds.delete(objectId);
      } else {
        nextObjectIds.add(objectId);
      }

      return {
        ...currentState,
        expandedObjectIds: nextObjectIds
      };
    });
  }

  function handleRootExpandedChange(expanded: boolean) {
    updateExpansionState((currentState) => ({
      ...currentState,
      rootExpanded: expanded
    }));
  }

  function handleToggleObjectVisibility(objectId: string, visible: boolean) {
    if (!contentFileNode) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeVisibility(objectTree, objectId, visible);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  return (
    <aside
      className={cx(
        "flex min-h-0 flex-1 basis-0 flex-col overflow-hidden bg-white text-slate-700",
        className
      )}
      onContextMenu={(event) => handleContextMenu(event)}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-slate-600">
            Object tree
          </h2>
          <p className="truncate text-[11px] leading-none text-slate-500">
            {contentFileNode?.name ?? "No table layout selected"}
          </p>
        </div>
      </div>

      {contentFileNode ? (
        <DndContext
          sensors={sensors}
          collisionDetection={objectTreeCollisionDetection}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
        >
          <ProjectObjectTreeList
            activeObjectId={activeObjectId}
            contentFileNode={contentFileNode}
            dropIndicator={dropIndicator}
            expandedObjectIds={expandedObjectIds}
            flattenedObjectTree={flattenedObjectTree}
            objectTree={objectTree}
            renameDraft={renameDraft}
            renamingObjectId={renamingObjectId}
            rootExpanded={rootExpanded}
            selectedObjectId={selectedObjectId}
            showVirtualRoot={contentFileNode.kind === "tableSetup"}
            onCancelRename={handleCancelRenameObject}
            onCommitRename={handleCommitRenameObject}
            onContextMenu={handleContextMenu}
            onRenameDraftChange={setRenameDraft}
            onRootExpandedChange={handleRootExpandedChange}
            onSelectObject={onSelectObject}
            onToggleObjectExpanded={handleToggleObjectExpanded}
            onToggleObjectVisibility={handleToggleObjectVisibility}
          />
        </DndContext>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-center text-xs text-slate-500">
          Select a table layout or object file
        </div>
      )}

      <ContextMenu
        actions={contextMenuActions}
        ariaLabel="Object tree context menu"
        open={Boolean(contextMenu)}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        onOpenChange={(open) => {
          if (!open) {
            setContextMenu(null);
          }
        }}
      />
    </aside>
  );

  function updateExpansionState(
    update: (currentState: ObjectTreeExpansionState) => ObjectTreeExpansionState
  ) {
    setExpansionState((currentState) => {
      const activeState =
        currentState.fileNodeId === fileNodeId
          ? currentState
          : {
              expandedObjectIds: defaultExpandedObjectIds,
              fileNodeId,
              rootExpanded: true
            };

      return update(activeState);
    });
  }

  function getObjectDropIndicator(
    event: DragEndEvent | DragMoveEvent | DragOverEvent
  ): ObjectDropIndicator | null {
    const activeId = String(event.active.id);
    const targetObjectId = getObjectDropTargetObjectId(event.over?.id);

    if (!targetObjectId || targetObjectId === activeId) {
      return null;
    }

    const targetLocation = findProjectObjectNodeLocation(objectTree, targetObjectId);

    if (!targetLocation || targetLocation.ancestors.includes(activeId)) {
      return null;
    }

    return {
      intent: getObjectDropIntent(event, getDragPointerY(event)),
      targetObjectId
    };
  }

  function getDragPointerY(event: DragEndEvent | DragMoveEvent | DragOverEvent) {
    const deltaY = getDragEventDeltaY(event);

    if (dragStartPointerYRef.current !== null && deltaY !== null) {
      return dragStartPointerYRef.current + deltaY;
    }

    return pointerYRef.current;
  }
}

type ProjectObjectTreeListProps = {
  activeObjectId: string | null;
  contentFileNode: ProjectFileNode;
  dropIndicator: ObjectDropIndicator | null;
  expandedObjectIds: Set<string>;
  flattenedObjectTree: FlattenedProjectObjectNode[];
  objectTree: ProjectObjectNode[];
  renameDraft: string;
  renamingObjectId: string | null;
  rootExpanded: boolean;
  selectedObjectId: string | null;
  showVirtualRoot: boolean;
  onCancelRename: () => void;
  onCommitRename: (objectId: string) => void;
  onContextMenu: (event: MouseEvent, nodeId: string | null) => void;
  onRenameDraftChange: (value: string) => void;
  onRootExpandedChange: (expanded: boolean) => void;
  onSelectObject: (objectId: string | null) => void;
  onToggleObjectExpanded: (objectId: string) => void;
  onToggleObjectVisibility: (objectId: string, visible: boolean) => void;
};

function ProjectObjectTreeList({
  activeObjectId,
  contentFileNode,
  dropIndicator,
  expandedObjectIds,
  flattenedObjectTree,
  objectTree,
  renameDraft,
  renamingObjectId,
  rootExpanded,
  selectedObjectId,
  showVirtualRoot,
  onCancelRename,
  onCommitRename,
  onContextMenu,
  onRenameDraftChange,
  onRootExpandedChange,
  onSelectObject,
  onToggleObjectExpanded,
  onToggleObjectVisibility
}: ProjectObjectTreeListProps) {
  const treeExpanded = showVirtualRoot ? rootExpanded : true;
  const visibleObjectTreeItems =
    activeObjectId && treeExpanded
      ? flattenedObjectTree.filter((item) => !item.ancestorIds.includes(activeObjectId))
      : treeExpanded
        ? flattenedObjectTree
        : [];
  const { isOver, setNodeRef } = useDroppable({
    id: rootDropTargetId,
    disabled: !activeObjectId || !showVirtualRoot
  });

  return (
    <div
      ref={setNodeRef}
      className={cx(
        "min-h-0 flex-1 overflow-auto py-2 transition-colors",
        isOver && activeObjectId && "bg-emerald-50"
      )}
    >
      <div className="min-w-max">
        {showVirtualRoot ? (
          <ProjectObjectTreeRootRow
            contentFileNode={contentFileNode}
            expanded={rootExpanded}
            hasChildren={objectTree.length > 0}
            selected={selectedObjectId === null}
            onContextMenu={onContextMenu}
            onExpandedChange={onRootExpandedChange}
            onSelect={() => onSelectObject(null)}
          />
        ) : null}

        {visibleObjectTreeItems.map((item) => (
          <ProjectObjectTreeNode
            key={item.id}
            activeObjectId={activeObjectId}
            depth={showVirtualRoot ? item.depth : item.depth - 1}
            dropIndicatorIntent={
              dropIndicator?.targetObjectId === item.id ? dropIndicator.intent : null
            }
            expanded={expandedObjectIds.has(item.id)}
            item={item}
            renameDraft={renameDraft}
            renaming={renamingObjectId === item.id}
            selected={selectedObjectId === item.id}
            onCancelRename={onCancelRename}
            onCommitRename={onCommitRename}
            onContextMenu={onContextMenu}
            onRenameDraftChange={onRenameDraftChange}
            onSelectObject={onSelectObject}
            onToggleObjectExpanded={onToggleObjectExpanded}
            onToggleObjectVisibility={onToggleObjectVisibility}
          />
        ))}
      </div>
    </div>
  );
}

type ProjectObjectTreeRootRowProps = {
  contentFileNode: ProjectFileNode;
  expanded: boolean;
  hasChildren: boolean;
  selected: boolean;
  onContextMenu: (event: MouseEvent, nodeId: string | null) => void;
  onExpandedChange: (expanded: boolean) => void;
  onSelect: () => void;
};

function ProjectObjectTreeRootRow({
  contentFileNode,
  expanded,
  hasChildren,
  selected,
  onContextMenu,
  onExpandedChange,
  onSelect
}: ProjectObjectTreeRootRowProps) {
  return (
    <div
      className={cx(
        "group flex h-8 min-w-max items-center pr-1 text-[13px] leading-none transition-colors",
        selected
          ? "bg-sky-100 text-slate-950 outline outline-1 -outline-offset-1 outline-sky-500"
          : "text-slate-700 hover:bg-slate-100"
      )}
      style={{ paddingLeft: 8 }}
      onDoubleClick={() => {
        if (hasChildren) {
          onExpandedChange(!expanded);
        }
      }}
      onContextMenu={(event) => onContextMenu(event, null)}
    >
      {hasChildren ? (
        <button
          aria-label={
            expanded ? `Collapse ${contentFileNode.name}` : `Expand ${contentFileNode.name}`
          }
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onExpandedChange(!expanded);
          }}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      ) : (
        <span className="h-5 w-5 shrink-0" />
      )}

      <button
        className="flex h-full min-w-40 flex-1 items-center gap-2 text-left"
        type="button"
        onClick={onSelect}
      >
        <ProjectObjectTreeRootIcon
          className="shrink-0 text-teal-700"
          node={contentFileNode}
          size={17}
        />
        <span className="truncate">{contentFileNode.name}</span>
      </button>
    </div>
  );
}

type ProjectObjectTreeNodeProps = {
  activeObjectId: string | null;
  depth: number;
  dropIndicatorIntent: ObjectDropIntent | null;
  expanded: boolean;
  item: FlattenedProjectObjectNode;
  renameDraft: string;
  renaming: boolean;
  selected: boolean;
  onCancelRename: () => void;
  onCommitRename: (objectId: string) => void;
  onContextMenu: (event: MouseEvent, nodeId: string | null) => void;
  onRenameDraftChange: (value: string) => void;
  onSelectObject: (objectId: string | null) => void;
  onToggleObjectExpanded: (objectId: string) => void;
  onToggleObjectVisibility: (objectId: string, visible: boolean) => void;
};

function ProjectObjectTreeNode({
  activeObjectId,
  depth,
  dropIndicatorIntent,
  expanded,
  item,
  renameDraft,
  renaming,
  selected,
  onCancelRename,
  onCommitRename,
  onContextMenu,
  onRenameDraftChange,
  onSelectObject,
  onToggleObjectExpanded,
  onToggleObjectVisibility
}: ProjectObjectTreeNodeProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef: setDraggableNodeRef,
    transform
  } = useDraggable({
    id: item.id,
    disabled: renaming
  });
  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: getObjectDropTargetId(item),
    disabled: activeObjectId === item.id
  });
  const setNodeRef = useCallback(
    (element: HTMLDivElement | null) => {
      setDraggableNodeRef(element);
      setDroppableNodeRef(element);
    },
    [setDraggableNodeRef, setDroppableNodeRef]
  );
  const style: CSSProperties = {
    transform: getDragTransformStyle(transform)
  };
  const { node } = item;
  const hasChildren = getProjectObjectNodeVisibleChildren(node).length > 0;
  const canHighlightDrop = Boolean(
    activeObjectId && activeObjectId !== node.id && !item.ancestorIds.includes(activeObjectId)
  );
  const insertionLinePosition =
    canHighlightDrop && dropIndicatorIntent !== "inside" ? dropIndicatorIntent : null;
  const highlightInsideDrop = canHighlightDrop && dropIndicatorIntent === "inside";
  const iconClassName = getProjectObjectKindIconClassName(node.kind);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameCanceledRef = useRef(false);

  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renaming]);

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommitRename(node.id);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      renameCanceledRef.current = true;
      onCancelRename();
    }
  }

  function handleRenameBlur() {
    if (renameCanceledRef.current) {
      renameCanceledRef.current = false;
      return;
    }

    onCommitRename(node.id);
  }

  return (
    <div ref={setNodeRef} style={style} className={cx("relative", isDragging && "z-10 opacity-70")}>
      {insertionLinePosition ? (
        <ObjectInsertionLine depth={depth} position={insertionLinePosition} />
      ) : null}
      <div
        ref={setActivatorNodeRef}
        className={cx(
          "group flex h-7 min-w-max items-center pr-1 text-[13px] leading-none transition-colors",
          highlightInsideDrop
            ? "bg-emerald-100 text-slate-950 outline outline-1 -outline-offset-1 outline-emerald-500"
            : selected
              ? "bg-sky-100 text-slate-950 outline outline-1 -outline-offset-1 outline-sky-500"
              : "text-slate-700 hover:bg-slate-100",
          !node.visible && "text-slate-400"
        )}
        style={{ paddingLeft: `${8 + (depth + 1) * indentationWidth}px` }}
        {...(renaming ? {} : attributes)}
        {...(renaming ? {} : listeners)}
        aria-label={node.name}
        onClick={() => {
          if (!renaming) {
            onSelectObject(node.id);
          }
        }}
        onContextMenu={(event) => onContextMenu(event, node.id)}
        onDoubleClick={() => {
          if (hasChildren) {
            onToggleObjectExpanded(node.id);
          }
        }}
      >
        {hasChildren ? (
          <button
            aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleObjectExpanded(node.id);
            }}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}

        {renaming ? (
          <div className="flex h-full min-w-40 flex-1 items-center gap-2">
            <ProjectObjectNodeIcon
              className={cx("shrink-0", node.visible ? iconClassName : "text-slate-400")}
              object={node}
              size={17}
            />
            <input
              ref={renameInputRef}
              className="h-5 min-w-32 flex-1 rounded border border-sky-500 bg-white px-1 text-[13px] text-slate-950 outline-none"
              value={renameDraft}
              onBlur={handleRenameBlur}
              onChange={(event) => onRenameDraftChange(event.currentTarget.value)}
              onClick={(event) => event.stopPropagation()}
              onContextMenu={(event) => event.stopPropagation()}
              onKeyDown={handleRenameKeyDown}
              onPointerDown={(event) => event.stopPropagation()}
            />
          </div>
        ) : (
          <div className="flex h-full min-w-40 flex-1 items-center gap-2 text-left">
            <ProjectObjectNodeIcon
              className={cx("shrink-0", node.visible ? iconClassName : "text-slate-400")}
              object={node}
              size={17}
            />
            <span className="truncate">{node.name}</span>
          </div>
        )}

        <button
          aria-label={node.visible ? `Hide ${node.name}` : `Show ${node.name}`}
          className="ml-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-900"
          title={node.visible ? "Hide object" : "Show object"}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleObjectVisibility(node.id, !node.visible);
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {node.visible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      </div>
    </div>
  );
}

function ObjectInsertionLine({ depth, position }: { depth: number; position: "after" | "before" }) {
  return (
    <span
      data-object-drop-line={position}
      className={cx(
        "pointer-events-none absolute right-2 z-20 h-0.5 rounded-full bg-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]",
        position === "before" ? "top-0" : "bottom-0"
      )}
      style={{ left: `${8 + (depth + 1) * indentationWidth}px` }}
    />
  );
}

function createObjectTreeContextMenuActions({
  disabled,
  canCreate,
  canDelete,
  canRename,
  nodeId,
  parentId,
  onCreate,
  onDelete,
  onRename
}: {
  disabled: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canRename: boolean;
  nodeId: string | null;
  parentId: ProjectObjectTreeParentId;
  onCreate: (kind: ProjectObjectKind, parentId: ProjectObjectTreeParentId) => void;
  onDelete: (nodeId: string | null) => void;
  onRename: (nodeId: string | null) => void;
}): ContextMenuAction[] {
  return [
    {
      id: "create",
      label: "Create",
      icon: <Plus size={14} />,
      disabled: disabled || !canCreate,
      children: projectObjectCreateKinds.map((kind) => ({
        id: `create-${kind}`,
        label: getProjectObjectKindLabel(kind),
        icon: (
          <ProjectObjectKindIcon
            className={getProjectObjectKindIconClassName(kind)}
            kind={kind}
            size={14}
          />
        ),
        disabled: disabled || !canCreate,
        onSelect: () => onCreate(kind, parentId)
      }))
    },
    {
      id: "rename",
      label: "Rename",
      icon: <Pencil size={14} />,
      disabled: disabled || !canRename,
      separatorBefore: true,
      onSelect: () => onRename(nodeId)
    },
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 size={14} />,
      destructive: true,
      disabled: disabled || !canDelete,
      onSelect: () => onDelete(nodeId)
    }
  ];
}

function flattenProjectObjectTree(
  objectTree: ProjectObjectNode[],
  expandedObjectIds: Set<string>,
  parentId: ProjectObjectTreeParentId = null,
  depth = 0,
  ancestorIds: string[] = []
): FlattenedProjectObjectNode[] {
  return objectTree.flatMap((node) => {
    const item: FlattenedProjectObjectNode = {
      ancestorIds,
      depth,
      id: node.id,
      node,
      parentId
    };

    const children = getProjectObjectNodeVisibleChildren(node);

    if (!expandedObjectIds.has(node.id) || !children.length) {
      return [item];
    }

    return [
      item,
      ...flattenProjectObjectTree(children, expandedObjectIds, node.id, depth + 1, [
        ...ancestorIds,
        node.id
      ])
    ];
  });
}

const objectTreeCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  const itemCollisions = pointerCollisions.filter(({ id }) => isObjectItemDropTargetId(id));

  if (itemCollisions.length > 0) {
    return itemCollisions;
  }

  const rootCollision = pointerCollisions.find(({ id }) => id === rootDropTargetId);

  if (rootCollision) {
    return [rootCollision];
  }

  return closestCenter(args);
};

function getObjectDropTargetId(item: FlattenedProjectObjectNode) {
  return `${itemDropTargetPrefix}${item.id}`;
}

function getObjectDropTargetObjectId(dropTargetId: UniqueIdentifier | string | null | undefined) {
  if (!dropTargetId) {
    return undefined;
  }

  const id = String(dropTargetId);

  if (!id.startsWith(itemDropTargetPrefix)) {
    return undefined;
  }

  const objectId = id.slice(itemDropTargetPrefix.length);

  return objectId || undefined;
}

function getDragTransformStyle(transform: { x: number; y: number } | null) {
  if (!transform) {
    return undefined;
  }

  return `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`;
}

function getActivatorEventClientY(event: Event) {
  return "clientY" in event && typeof event.clientY === "number" ? event.clientY : null;
}

function getDragEventDeltaY(event: DragEndEvent | DragMoveEvent | DragOverEvent) {
  const delta = (event as { delta?: { y?: unknown } }).delta;

  return typeof delta?.y === "number" ? delta.y : null;
}

function getObjectTreeContextMenuX(clientX: number) {
  const createSubmenuWidth = 420;

  return Math.max(8, Math.min(clientX, window.innerWidth - createSubmenuWidth));
}

function isObjectItemDropTargetId(dropTargetId: UniqueIdentifier) {
  return String(dropTargetId).startsWith(itemDropTargetPrefix);
}

function getObjectDropIntent(
  event: DragEndEvent | DragMoveEvent | DragOverEvent,
  pointerY: number | null
): ObjectDropIntent {
  const activeRect = event.active.rect.current.translated ?? event.active.rect.current.initial;
  const overRect = event.over?.rect;

  if (!overRect) {
    return "before";
  }

  const dropY = pointerY ?? (activeRect ? activeRect.top + activeRect.height / 2 : overRect.top);
  const beforeThreshold = overRect.top + overRect.height * reorderDropZoneRatio;
  const afterThreshold = overRect.bottom - overRect.height * reorderDropZoneRatio;

  if (dropY < beforeThreshold) {
    return "before";
  }

  if (dropY > afterThreshold) {
    return "after";
  }

  return "inside";
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
