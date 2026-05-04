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
  getProjectTableSetupItemId,
  getProjectTableSetupItemLocked,
  getProjectTableSetupItemName,
  getProjectTableSetupItemVisible,
  projectObjectKinds,
  type ProjectFileNode,
  type ProjectObjectKind,
  type ProjectObjectNode,
  type ProjectTableSetup,
  type ProjectTableSetupItem
} from "@bg-maker/shared";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  LockOpen,
  Link2,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";
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
  cloneProjectObjectNode,
  createProjectObjectNode,
  deleteProjectObjectNode,
  findProjectObjectNode,
  findProjectObjectNodeLocation,
  getExpandableProjectObjectNodeIds,
  getProjectObjectNodeVisibleChildren,
  insertProjectObjectNodeAfter,
  moveProjectObjectNode,
  renameProjectObjectNode,
  setProjectObjectNodeLocked,
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
import {
  createProjectTableSetupLinkedObjectItem,
  createProjectTableSetupLocalObjectItem,
  getProjectFileNodeTableSetup,
  getProjectTableSetupObjectFileOptions,
  getProjectTableSetupResolvedItemObject,
  getProjectTableSetupWithAddedItem,
  getProjectTableSetupWithDuplicatedItems,
  getProjectTableSetupWithItemName,
  getProjectTableSetupWithInsertedItems,
  getProjectTableSetupWithItemLocked,
  getProjectTableSetupWithItemVisibility,
  getProjectTableSetupWithMovedItem,
  getProjectTableSetupWithRemovedItem,
  type ProjectTableSetupObjectFileOption
} from "../project-table-setup/project-table-setup";
import { useProjectWorkspaceStore } from "../project-workspace/use-project-workspace-store";

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

type TableSetupTreeContextMenuState = {
  itemId: string | null;
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
  fileTree: ProjectFileNode[];
  objectTree?: ProjectObjectNode[];
  readOnly?: boolean;
  saving: boolean;
  selectedObjectId: string | null;
  selectedObjectIds?: string[];
  tableSetupLocalItem?: Extract<ProjectTableSetupItem, { type: "localObject" }> | null;
  tableSetup?: ProjectTableSetup | null;
  onExitTableSetupLocalObject?: () => void;
  onObjectTreeChange: (fileNodeId: string, objectTree: ProjectObjectNode[]) => void;
  onOpenTableSetupItemObject?: (itemId: string) => void;
  onTableSetupChange?: (tableSetup: ProjectTableSetup, label?: string) => void;
  onSelectObject: (objectId: string | null) => void;
  onSelectObjects?: (objectIds: string[], primaryObjectId?: string | null) => void;
};

export function ProjectObjectTreePanel({
  className,
  contentFileNode,
  fileTree,
  objectTree: resolvedObjectTree,
  readOnly = false,
  saving,
  selectedObjectId,
  selectedObjectIds = selectedObjectId ? [selectedObjectId] : [],
  tableSetupLocalItem = null,
  tableSetup: resolvedTableSetup,
  onExitTableSetupLocalObject,
  onObjectTreeChange,
  onOpenTableSetupItemObject,
  onTableSetupChange,
  onSelectObject,
  onSelectObjects
}: ProjectObjectTreePanelProps) {
  if (contentFileNode?.kind === "tableSetup" && tableSetupLocalItem) {
    return (
      <ProjectObjectNodeTreePanel
        className={className}
        contentFileNode={contentFileNode}
        objectTree={[tableSetupLocalItem.object]}
        protectedRootObjectId={tableSetupLocalItem.object.id}
        readOnly={readOnly}
        saving={saving}
        selectedObjectId={selectedObjectId}
        subtitle={`${contentFileNode.name} / ${getProjectTableSetupItemName(tableSetupLocalItem)}`}
        title="Local object tree"
        onBack={onExitTableSetupLocalObject}
        onObjectTreeChange={onObjectTreeChange}
        onSelectObject={onSelectObject}
      />
    );
  }

  if (contentFileNode?.kind === "tableSetup") {
    return (
      <ProjectTableSetupTreePanel
        className={className}
        contentFileNode={contentFileNode}
        fileTree={fileTree}
        readOnly={readOnly}
        saving={saving}
        selectedObjectId={selectedObjectId}
        selectedObjectIds={selectedObjectIds}
        tableSetup={resolvedTableSetup ?? getProjectFileNodeTableSetup(contentFileNode)}
        onSelectObject={onSelectObject}
        onSelectObjects={onSelectObjects}
        onOpenTableSetupItemObject={onOpenTableSetupItemObject}
        onTableSetupChange={onTableSetupChange}
      />
    );
  }

  return (
    <ProjectObjectNodeTreePanel
      className={className}
      contentFileNode={contentFileNode}
      objectTree={resolvedObjectTree}
      readOnly={readOnly}
      saving={saving}
      selectedObjectId={selectedObjectId}
      onObjectTreeChange={onObjectTreeChange}
      onSelectObject={onSelectObject}
    />
  );
}

type ProjectObjectNodeTreePanelProps = {
  className?: string;
  contentFileNode: ProjectFileNode | null;
  objectTree?: ProjectObjectNode[];
  protectedRootObjectId?: string | null;
  readOnly?: boolean;
  saving: boolean;
  selectedObjectId: string | null;
  subtitle?: string;
  title?: string;
  onBack?: () => void;
  onObjectTreeChange: (fileNodeId: string, objectTree: ProjectObjectNode[]) => void;
  onSelectObject: (objectId: string | null) => void;
};

function ProjectObjectNodeTreePanel({
  className,
  contentFileNode,
  objectTree: resolvedObjectTree,
  protectedRootObjectId = null,
  readOnly = false,
  saving,
  selectedObjectId,
  subtitle,
  title = "Object tree",
  onBack,
  onObjectTreeChange,
  onSelectObject
}: ProjectObjectNodeTreePanelProps) {
  const objectTree = useMemo(
    () => resolvedObjectTree ?? contentFileNode?.objectTree ?? [],
    [contentFileNode?.objectTree, resolvedObjectTree]
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
  const clipboard = useProjectWorkspaceStore((state) => state.clipboard);
  const setClipboard = useProjectWorkspaceStore((state) => state.setClipboard);
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
  const singleRootTree = isObjectFile || Boolean(protectedRootObjectId);
  const rootObjectId = objectTree[0]?.id ?? null;
  const objectFileRootId = isObjectFile ? rootObjectId : null;
  const lockedRootObjectId =
    protectedRootObjectId ?? (isObjectFile && objectTree.length === 1 ? objectFileRootId : null);
  const contextMenuParentId = contextMenu?.parentId ?? null;
  const canCreateObject = Boolean(
    contentFileNode && (!singleRootTree || contextMenuParentId !== null || objectTree.length === 0)
  );
  const contextMenuObjectLocked = contextMenuObject?.locked === true;
  const handleRequestRenameObject = useCallback(
    (nodeId: string | null) => {
      if (!nodeId || readOnly) {
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
    },
    [objectTree, onSelectObject, readOnly]
  );
  const contextMenuActions = createObjectTreeContextMenuActions({
    disabled: saving || !contentFileNode || readOnly,
    canCreate: canCreateObject && !readOnly,
    canDelete:
      !readOnly && Boolean(contextMenuObject && contextMenuObject.id !== lockedRootObjectId),
    canDuplicate:
      !readOnly && Boolean(contextMenuObject && contextMenuObject.id !== lockedRootObjectId),
    canPaste:
      !readOnly &&
      clipboard?.type === "objectNodes" &&
      Boolean(
        contentFileNode &&
        (!singleRootTree || contextMenuParentId !== null || objectTree.length === 0)
      ),
    canRename: !readOnly && Boolean(contextMenuObject),
    canToggleLock: !readOnly && Boolean(contextMenuObject),
    locked: contextMenuObjectLocked,
    nodeId: contextMenu?.nodeId ?? null,
    parentId: contextMenuParentId,
    onCopy: handleCopyObject,
    onCreate: handleCreateObject,
    onDelete: handleDeleteContextObject,
    onDuplicate: handleDuplicateObject,
    onPaste: handlePasteObject,
    onRename: handleRequestRenameObject,
    onToggleLock: handleToggleObjectLocked
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

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (
        event.key !== "F2" ||
        readOnly ||
        !selectedObjectId ||
        isEditableObjectTreeKeyboardTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      handleRequestRenameObject(selectedObjectId);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRequestRenameObject, readOnly, selectedObjectId]);

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
    if (!contentFileNode || readOnly) {
      return;
    }

    if (singleRootTree && parentId === null && objectTree.length > 0) {
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

  function handleDuplicateObject(nodeId: string | null) {
    if (!contentFileNode || !nodeId || readOnly || nodeId === lockedRootObjectId) {
      return;
    }

    const object = findProjectObjectNode(objectTree, nodeId);

    if (!object) {
      return;
    }

    const duplicate = cloneProjectObjectNode(object, { offset: 24 });
    const nextObjectTree = insertProjectObjectNodeAfter(objectTree, nodeId, duplicate);

    if (nextObjectTree === objectTree) {
      return;
    }

    setContextMenu(null);
    handleCancelRenameObject();
    onSelectObject(duplicate.id);
    onObjectTreeChange(contentFileNode.id, nextObjectTree);
  }

  function handleCopyObject(nodeId: string | null) {
    if (!nodeId) {
      return;
    }

    const object = findProjectObjectNode(objectTree, nodeId);

    if (!object) {
      return;
    }

    setClipboard({
      objects: [object],
      type: "objectNodes"
    });
  }

  function handlePasteObject(parentId: ProjectObjectTreeParentId) {
    if (!contentFileNode || readOnly || clipboard?.type !== "objectNodes") {
      return;
    }

    if (singleRootTree && parentId === null && objectTree.length > 0) {
      return;
    }

    let nextObjectTree = objectTree;
    const pastedIds: string[] = [];

    for (const object of clipboard.objects) {
      const pastedObject = cloneProjectObjectNode(object, { offset: 24 });
      nextObjectTree = appendProjectObjectNode(nextObjectTree, parentId, pastedObject);
      pastedIds.push(pastedObject.id);
    }

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
    onSelectObject(pastedIds.at(-1) ?? null);
    onObjectTreeChange(contentFileNode.id, nextObjectTree);
  }

  function handleToggleObjectLocked(nodeId: string | null, locked: boolean) {
    if (!contentFileNode || !nodeId || readOnly) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeLocked(objectTree, nodeId, locked);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function handleCommitRenameObject(objectId: string) {
    if (!contentFileNode || readOnly) {
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
    if (!contentFileNode || !nodeId || readOnly) {
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
    const activeObject = findProjectObjectNode(objectTree, activeId);

    if (readOnly || !activeObject || activeObject.locked) {
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

    if (!contentFileNode || !dropTargetId || readOnly) {
      return;
    }

    if (dropTargetId === rootDropTargetId) {
      if (singleRootTree) {
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
      singleRootTree &&
      ((activeId === rootObjectId && targetParentId !== null) ||
        (activeId !== rootObjectId && targetParentId === null))
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
        {onBack ? (
          <button
            aria-label="Back to table setup"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900"
            title="Back to table setup"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft size={15} />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-slate-600">
            {title}
          </h2>
          <p className="truncate text-[11px] leading-none text-slate-500">
            {subtitle ?? contentFileNode?.name ?? "No table layout selected"}
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
            showVirtualRoot={false}
            onCancelRename={handleCancelRenameObject}
            onCommitRename={handleCommitRenameObject}
            onContextMenu={handleContextMenu}
            onRenameDraftChange={setRenameDraft}
            onRootExpandedChange={handleRootExpandedChange}
            onSelectObject={onSelectObject}
            onToggleObjectExpanded={handleToggleObjectExpanded}
            onToggleObjectLocked={handleToggleObjectLocked}
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

type ProjectTableSetupTreePanelProps = {
  className?: string;
  contentFileNode: ProjectFileNode;
  fileTree: ProjectFileNode[];
  readOnly: boolean;
  saving: boolean;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  tableSetup: ProjectTableSetup | null;
  onSelectObject: (objectId: string | null) => void;
  onSelectObjects?: (objectIds: string[], primaryObjectId?: string | null) => void;
  onOpenTableSetupItemObject?: (itemId: string) => void;
  onTableSetupChange?: (tableSetup: ProjectTableSetup, label?: string) => void;
};

function ProjectTableSetupTreePanel({
  className,
  contentFileNode,
  fileTree,
  readOnly,
  saving,
  selectedObjectId,
  selectedObjectIds,
  tableSetup,
  onSelectObject,
  onSelectObjects,
  onOpenTableSetupItemObject,
  onTableSetupChange
}: ProjectTableSetupTreePanelProps) {
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [contextMenu, setContextMenu] = useState<TableSetupTreeContextMenuState | null>(null);
  const clipboard = useProjectWorkspaceStore((state) => state.clipboard);
  const setClipboard = useProjectWorkspaceStore((state) => state.setClipboard);
  const items = useMemo(() => tableSetup?.items ?? [], [tableSetup?.items]);
  const selectedItemIds = useMemo(() => new Set(selectedObjectIds), [selectedObjectIds]);
  const objectFileOptions = useMemo(
    () => getProjectTableSetupObjectFileOptions(fileTree),
    [fileTree]
  );
  const contextMenuItem = contextMenu?.itemId
    ? items.find((item) => getProjectTableSetupItemId(item) === contextMenu.itemId)
    : null;
  const contextMenuItemLocked = contextMenuItem
    ? getProjectTableSetupItemLocked(contextMenuItem)
    : false;
  const handleRequestRename = useCallback(
    (itemId: string | null) => {
      if (!itemId || readOnly) {
        return;
      }

      const item = items.find((candidate) => getProjectTableSetupItemId(candidate) === itemId);

      if (!item) {
        return;
      }

      window.setTimeout(() => {
        setRenamingItemId(itemId);
        setRenameDraft(getProjectTableSetupItemName(item));
        onSelectObject(itemId);
      }, 0);
    },
    [items, onSelectObject, readOnly]
  );
  const contextMenuActions = createTableSetupTreeContextMenuActions({
    disabled: saving || readOnly || !tableSetup,
    itemId: contextMenu?.itemId ?? null,
    canOpen: Boolean(contextMenuItem),
    canPaste: clipboard?.type === "tableSetupItems",
    locked: contextMenuItemLocked,
    objectFileOptions,
    openLabel: contextMenuItem?.type === "linkedObject" ? "Open source" : "Edit object",
    onAddLinkedObject: handleAddLinkedObject,
    onCopy: handleCopyItem,
    onCreatePrimitive: handleCreatePrimitive,
    onDelete: handleDeleteItem,
    onDuplicate: handleDuplicateItem,
    onOpen: handleOpenItemObject,
    onPaste: handlePasteItems,
    onRename: handleRequestRename,
    onToggleLock: handleToggleItemLocked
  });

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (
        event.key !== "F2" ||
        readOnly ||
        !selectedObjectId ||
        isEditableObjectTreeKeyboardTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      handleRequestRename(selectedObjectId);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRequestRename, readOnly, selectedObjectId]);

  function updateTableSetup(nextTableSetup: ProjectTableSetup, label: string) {
    if (!tableSetup || nextTableSetup === tableSetup) {
      return;
    }

    onTableSetupChange?.(nextTableSetup, label);
  }

  function handleContextMenu(event: MouseEvent, itemId: string | null = null) {
    if (!tableSetup) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!itemId || !selectedItemIds.has(itemId)) {
      onSelectObject(itemId);
    }
    setContextMenu({
      itemId,
      x: getObjectTreeContextMenuX(event.clientX),
      y: event.clientY
    });
  }

  function handleAddLinkedObject(sourceObjectFileNodeId: string) {
    if (!tableSetup || readOnly) {
      return;
    }

    const item = createProjectTableSetupLinkedObjectItem(fileTree, sourceObjectFileNodeId);

    if (!item) {
      return;
    }

    setContextMenu(null);
    cancelRename();
    updateTableSetup(getProjectTableSetupWithAddedItem(tableSetup, item), "Add table object");
    onSelectObject(item.id);
  }

  function handleCreatePrimitive(kind: ProjectObjectKind) {
    if (!tableSetup || readOnly) {
      return;
    }

    const item = createProjectTableSetupLocalObjectItem(kind);
    const itemId = getProjectTableSetupItemId(item);

    setContextMenu(null);
    cancelRename();
    updateTableSetup(getProjectTableSetupWithAddedItem(tableSetup, item), "Create table primitive");
    onSelectObject(itemId);
  }

  function getActiveTableItemIds(itemId: string | null) {
    if (!itemId) {
      return [];
    }

    return selectedItemIds.has(itemId) && selectedObjectIds.length > 1
      ? selectedObjectIds
      : [itemId];
  }

  function selectTableItems(
    itemIds: string[],
    primaryItemId: string | null = itemIds.at(-1) ?? null
  ) {
    if (onSelectObjects) {
      onSelectObjects(itemIds, primaryItemId);
    } else {
      onSelectObject(primaryItemId);
    }
  }

  function handleDuplicateItem(itemId: string | null) {
    if (!tableSetup || !itemId || readOnly) {
      return;
    }

    const result = getProjectTableSetupWithDuplicatedItems(
      tableSetup,
      getActiveTableItemIds(itemId)
    );

    if (result.tableSetup === tableSetup) {
      return;
    }

    setContextMenu(null);
    cancelRename();
    updateTableSetup(result.tableSetup, "Duplicate table item");
    selectTableItems(result.itemIds);
  }

  function handleCopyItem(itemId: string | null) {
    if (!tableSetup || !itemId) {
      return;
    }

    const activeItemIds = new Set(getActiveTableItemIds(itemId));
    const copiedItems = tableSetup.items.filter((item) =>
      activeItemIds.has(getProjectTableSetupItemId(item))
    );

    if (!copiedItems.length) {
      return;
    }

    setClipboard({
      items: copiedItems,
      type: "tableSetupItems"
    });
  }

  function handlePasteItems(itemId: string | null) {
    if (!tableSetup || readOnly || clipboard?.type !== "tableSetupItems") {
      return;
    }

    const result = getProjectTableSetupWithInsertedItems(
      tableSetup,
      itemId ? getActiveTableItemIds(itemId) : [],
      clipboard.items
    );

    if (result.tableSetup === tableSetup) {
      return;
    }

    setContextMenu(null);
    cancelRename();
    updateTableSetup(result.tableSetup, "Paste table item");
    selectTableItems(result.itemIds);
  }

  function handleToggleItemLocked(itemId: string | null, locked: boolean) {
    if (!tableSetup || !itemId || readOnly) {
      return;
    }

    updateTableSetup(
      getProjectTableSetupWithItemLocked(tableSetup, itemId, locked),
      locked ? "Lock table item" : "Unlock table item"
    );
  }

  function handleOpenItemObject(itemId: string | null) {
    if (!itemId) {
      return;
    }

    setContextMenu(null);
    cancelRename();
    onOpenTableSetupItemObject?.(itemId);
  }

  function commitRename(itemId: string) {
    if (!tableSetup || readOnly) {
      return;
    }

    const nextTableSetup = getProjectTableSetupWithItemName(tableSetup, itemId, renameDraft);

    setRenamingItemId(null);
    setRenameDraft("");
    updateTableSetup(nextTableSetup, "Rename table item");
  }

  function cancelRename() {
    setRenamingItemId(null);
    setRenameDraft("");
  }

  function handleDeleteItem(itemId: string | null) {
    if (!tableSetup || !itemId || readOnly) {
      return;
    }

    const nextTableSetup = getProjectTableSetupWithRemovedItem(tableSetup, itemId);

    if (nextTableSetup === tableSetup) {
      return;
    }

    setContextMenu(null);
    cancelRename();
    updateTableSetup(nextTableSetup, "Delete table item");
    onSelectObject(null);
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
            Table setup
          </h2>
          <p className="truncate text-[11px] leading-none text-slate-500">{contentFileNode.name}</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto py-2">
        <div className="min-w-max">
          <ProjectObjectTreeRootRow
            contentFileNode={contentFileNode}
            expanded
            hasChildren={items.length > 0}
            selected={selectedObjectId === null}
            onContextMenu={handleContextMenu}
            onExpandedChange={() => undefined}
            onSelect={() => onSelectObject(null)}
          />
          {items.map((item, index) => {
            const itemId = getProjectTableSetupItemId(item);
            const itemName = getProjectTableSetupItemName(item);
            const itemVisible = getProjectTableSetupItemVisible(item);
            const itemLocked = getProjectTableSetupItemLocked(item);
            const resolvedObject = getProjectTableSetupResolvedItemObject(fileTree, item);
            const itemKind = item.type === "localObject" ? item.object.kind : resolvedObject?.kind;
            const iconClassName = itemKind
              ? getProjectObjectKindIconClassName(itemKind)
              : "text-slate-400";
            const selected = selectedItemIds.has(itemId);
            const renaming = renamingItemId === itemId;

            return (
              <div
                key={itemId}
                className={cx(
                  "group flex h-7 min-w-max items-center pr-1 text-[13px] leading-none transition-colors",
                  selected
                    ? "bg-sky-100 text-slate-950 outline outline-1 -outline-offset-1 outline-sky-500"
                    : "text-slate-700 hover:bg-slate-100",
                  !itemVisible && "text-slate-400"
                )}
                style={{ paddingLeft: 26 }}
                onClick={(event) => {
                  if (!renaming) {
                    if (event.metaKey || event.ctrlKey || event.shiftKey) {
                      const nextIds = new Set(selectedObjectIds);

                      if ((event.metaKey || event.ctrlKey) && nextIds.has(itemId)) {
                        nextIds.delete(itemId);
                      } else {
                        nextIds.add(itemId);
                      }

                      selectTableItems([...nextIds], itemId);
                    } else {
                      onSelectObject(itemId);
                    }
                  }
                }}
                onContextMenu={(event) => handleContextMenu(event, itemId)}
                onDoubleClick={() => {
                  handleOpenItemObject(itemId);
                }}
              >
                <span className="h-5 w-5 shrink-0" />
                {item.type === "linkedObject" ? (
                  <Link2 className="shrink-0 text-sky-700" size={15} />
                ) : itemKind ? (
                  <ProjectObjectKindIcon
                    className={cx("shrink-0", iconClassName)}
                    kind={itemKind}
                    size={15}
                  />
                ) : (
                  <ProjectObjectKindIcon
                    className="shrink-0 text-slate-400"
                    kind="group"
                    size={15}
                  />
                )}
                {renaming ? (
                  <input
                    autoFocus
                    className="ml-2 h-5 min-w-32 flex-1 rounded border border-sky-500 bg-white px-1 text-[13px] text-slate-950 outline-none"
                    value={renameDraft}
                    onBlur={() => commitRename(itemId)}
                    onChange={(event) => setRenameDraft(event.currentTarget.value)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }

                      if (event.key === "Escape") {
                        cancelRename();
                      }
                    }}
                  />
                ) : (
                  <span className="ml-2 min-w-32 flex-1 truncate">{itemName}</span>
                )}
                <button
                  aria-label={`Move ${itemName} up`}
                  className="ml-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={readOnly || saving || itemLocked || index === 0}
                  title="Move up"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (tableSetup) {
                      updateTableSetup(
                        getProjectTableSetupWithMovedItem(tableSetup, itemId, -1),
                        "Reorder table item"
                      );
                    }
                  }}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  aria-label={`Move ${itemName} down`}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={readOnly || saving || itemLocked || index === items.length - 1}
                  title="Move down"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (tableSetup) {
                      updateTableSetup(
                        getProjectTableSetupWithMovedItem(tableSetup, itemId, 1),
                        "Reorder table item"
                      );
                    }
                  }}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  aria-label={itemLocked ? `Unlock ${itemName}` : `Lock ${itemName}`}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-900"
                  title={itemLocked ? "Unlock item" : "Lock item"}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (tableSetup) {
                      updateTableSetup(
                        getProjectTableSetupWithItemLocked(tableSetup, itemId, !itemLocked),
                        itemLocked ? "Unlock table item" : "Lock table item"
                      );
                    }
                  }}
                >
                  {itemLocked ? <Lock size={15} /> : <LockOpen size={15} />}
                </button>
                <button
                  aria-label={itemVisible ? `Hide ${itemName}` : `Show ${itemName}`}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-900"
                  title={itemVisible ? "Hide item" : "Show item"}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (tableSetup) {
                      updateTableSetup(
                        getProjectTableSetupWithItemVisibility(tableSetup, itemId, !itemVisible),
                        itemVisible ? "Hide table item" : "Show table item"
                      );
                    }
                  }}
                >
                  {itemVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  aria-label={`Delete ${itemName}`}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={readOnly || saving}
                  title="Delete item"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteItem(itemId);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <ContextMenu
        actions={contextMenuActions}
        ariaLabel="Table layout tree context menu"
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
  onToggleObjectLocked: (objectId: string | null, locked: boolean) => void;
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
  onToggleObjectLocked,
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
            onToggleObjectLocked={onToggleObjectLocked}
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
  onToggleObjectLocked: (objectId: string | null, locked: boolean) => void;
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
  onToggleObjectLocked,
  onToggleObjectVisibility
}: ProjectObjectTreeNodeProps) {
  const { node } = item;
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef: setDraggableNodeRef,
    transform
  } = useDraggable({
    id: item.id,
    disabled: renaming || node.locked
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
          !node.visible && "text-slate-400",
          node.locked && "text-slate-500"
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
          onSelectObject(node.id);
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
          aria-label={node.locked ? `Unlock ${node.name}` : `Lock ${node.name}`}
          className="ml-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-900"
          title={node.locked ? "Unlock object" : "Lock object"}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleObjectLocked(node.id, node.locked !== true);
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {node.locked ? <Lock size={15} /> : <LockOpen size={15} />}
        </button>
        <button
          aria-label={node.visible ? `Hide ${node.name}` : `Show ${node.name}`}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-900"
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
  canDuplicate,
  canPaste,
  canRename,
  canToggleLock,
  locked,
  nodeId,
  parentId,
  onCopy,
  onCreate,
  onDelete,
  onDuplicate,
  onPaste,
  onRename,
  onToggleLock
}: {
  disabled: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  canPaste: boolean;
  canRename: boolean;
  canToggleLock: boolean;
  locked: boolean;
  nodeId: string | null;
  parentId: ProjectObjectTreeParentId;
  onCopy: (nodeId: string | null) => void;
  onCreate: (kind: ProjectObjectKind, parentId: ProjectObjectTreeParentId) => void;
  onDelete: (nodeId: string | null) => void;
  onDuplicate: (nodeId: string | null) => void;
  onPaste: (parentId: ProjectObjectTreeParentId) => void;
  onRename: (nodeId: string | null) => void;
  onToggleLock: (nodeId: string | null, locked: boolean) => void;
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
      id: "duplicate",
      label: "Duplicate",
      icon: <Copy size={14} />,
      disabled: disabled || !canDuplicate,
      separatorBefore: true,
      onSelect: () => onDuplicate(nodeId)
    },
    {
      id: "copy",
      label: "Copy",
      icon: <Copy size={14} />,
      disabled: disabled || !nodeId,
      onSelect: () => onCopy(nodeId)
    },
    {
      id: "paste",
      label: "Paste",
      icon: <Clipboard size={14} />,
      disabled: disabled || !canPaste,
      onSelect: () => onPaste(parentId)
    },
    {
      id: "lock",
      label: locked ? "Unlock" : "Lock",
      icon: locked ? <LockOpen size={14} /> : <Lock size={14} />,
      disabled: disabled || !canToggleLock,
      separatorBefore: true,
      onSelect: () => onToggleLock(nodeId, !locked)
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

function createTableSetupTreeContextMenuActions({
  disabled,
  itemId,
  canOpen,
  canPaste,
  locked,
  objectFileOptions,
  openLabel,
  onAddLinkedObject,
  onCopy,
  onCreatePrimitive,
  onDelete,
  onDuplicate,
  onOpen,
  onPaste,
  onRename,
  onToggleLock
}: {
  disabled: boolean;
  itemId: string | null;
  canOpen: boolean;
  canPaste: boolean;
  locked: boolean;
  objectFileOptions: readonly ProjectTableSetupObjectFileOption[];
  openLabel: string;
  onAddLinkedObject: (sourceObjectFileNodeId: string) => void;
  onCopy: (itemId: string | null) => void;
  onCreatePrimitive: (kind: ProjectObjectKind) => void;
  onDelete: (itemId: string | null) => void;
  onDuplicate: (itemId: string | null) => void;
  onOpen: (itemId: string | null) => void;
  onPaste: (itemId: string | null) => void;
  onRename: (itemId: string | null) => void;
  onToggleLock: (itemId: string | null, locked: boolean) => void;
}): ContextMenuAction[] {
  const hasSelectedItem = Boolean(itemId);

  return [
    {
      id: "add-linked-object",
      label: "Add existing object",
      icon: <Link2 size={14} />,
      disabled: disabled || objectFileOptions.length === 0,
      children: objectFileOptions.map((option) => ({
        id: `add-linked-object-${option.id}`,
        label: option.label,
        icon: option.rootKind ? (
          <ProjectObjectKindIcon
            className={getProjectObjectKindIconClassName(option.rootKind)}
            kind={option.rootKind}
            size={14}
          />
        ) : (
          <Link2 size={14} />
        ),
        disabled,
        onSelect: () => onAddLinkedObject(option.id)
      }))
    },
    {
      id: "create-primitive",
      label: "Create new object",
      icon: <Plus size={14} />,
      disabled,
      children: projectObjectCreateKinds.map((kind) => ({
        id: `create-primitive-${kind}`,
        label: getProjectObjectKindLabel(kind),
        icon: (
          <ProjectObjectKindIcon
            className={getProjectObjectKindIconClassName(kind)}
            kind={kind}
            size={14}
          />
        ),
        disabled,
        onSelect: () => onCreatePrimitive(kind)
      }))
    },
    {
      id: "open-object",
      label: openLabel,
      icon: <ExternalLink size={14} />,
      disabled: disabled || !canOpen,
      separatorBefore: true,
      onSelect: () => onOpen(itemId)
    },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: <Copy size={14} />,
      disabled: disabled || !hasSelectedItem,
      onSelect: () => onDuplicate(itemId)
    },
    {
      id: "copy",
      label: "Copy",
      icon: <Copy size={14} />,
      disabled: disabled || !hasSelectedItem,
      onSelect: () => onCopy(itemId)
    },
    {
      id: "paste",
      label: "Paste",
      icon: <Clipboard size={14} />,
      disabled: disabled || !canPaste,
      onSelect: () => onPaste(itemId)
    },
    {
      id: "lock",
      label: locked ? "Unlock" : "Lock",
      icon: locked ? <LockOpen size={14} /> : <Lock size={14} />,
      disabled: disabled || !hasSelectedItem,
      separatorBefore: true,
      onSelect: () => onToggleLock(itemId, !locked)
    },
    {
      id: "rename",
      label: "Rename",
      icon: <Pencil size={14} />,
      disabled: disabled || !hasSelectedItem,
      separatorBefore: true,
      onSelect: () => onRename(itemId)
    },
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 size={14} />,
      destructive: true,
      disabled: disabled || !hasSelectedItem,
      onSelect: () => onDelete(itemId)
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

function isEditableObjectTreeKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
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
