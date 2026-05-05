import type {
  CollisionDetection,
  DragEndEvent,
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
import type { ProjectFileNode } from "@bg-maker/shared";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  CopyPlus,
  FileSpreadsheet,
  Folder,
  LockKeyhole,
  Pencil,
  Plus,
  Rows3,
  Trash2,
  Unlink
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
  appendProjectFileNode,
  createFolderNode,
  createProjectFileNode,
  deleteProjectFileNode,
  duplicateProjectFileNode,
  findProjectFileNode,
  findProjectFileNodeLocation,
  isProtectedProjectFileNode,
  moveProjectFileNodeToParent,
  renameProjectFileNode,
  sortProjectFileTree,
  type ProjectFileTreeParentId
} from "./project-file-tree";
import {
  ProjectFileCreateModal,
  type ProjectFileCreateData,
  type ProjectFileCreateObjectSourceOption,
  type ProjectFileCreateType
} from "./ProjectFileCreateModal";
import { ProjectFileNodeIcon } from "./project-file-tree-ui";
import { getProjectFileTreeSelectionAfterClick } from "./project-file-tree-selection";
import { getProjectImageAssetUrl } from "../project-assets/project-image-assets";
import { VariantImportModal } from "../project-variants/VariantImportModal";
import {
  canImportVariantsFromObjectFile,
  createLinkedObjectFilesFromVariantRows,
  detachLinkedObjectFile,
  type ParsedVariantImportRow
} from "../project-variants/project-variants";

const indentationWidth = 18;
const nodeDropActivationPadding = 8;
const folderAutoExpandDelayMs = 650;
const rootDropTargetId = "project-file-tree:root";
const folderDropTargetPrefix = "project-file-tree:folder:";
const itemDropTargetPrefix = "project-file-tree:item:";

type FlattenedProjectFileNode = {
  ancestorIds: string[];
  depth: number;
  id: string;
  node: ProjectFileNode;
  parentId: ProjectFileTreeParentId;
};

type FileTreeContextMenuState = {
  nodeId: string | null;
  x: number;
  y: number;
};

type FileTreeCreateRequest = {
  type: ProjectFileCreateType;
  parentId: ProjectFileTreeParentId;
};

type VariantImportRequest = {
  sourceObjectFileNodeId: string;
};

type NodeDropTargetData = {
  depth: number;
};

type ProjectFileTreePanelProps = {
  className?: string;
  fileTree: ProjectFileNode[];
  projectId: string;
  saving: boolean;
  saveError?: Error | null;
  selectedNodeId: string | null;
  onFileTreeChange: (fileTree: ProjectFileNode[], label?: string) => void;
  onSelectNode: (nodeId: string | null) => void;
};

export function ProjectFileTreePanel({
  className,
  fileTree,
  projectId,
  saving,
  saveError,
  selectedNodeId,
  onFileTreeChange,
  onSelectNode
}: ProjectFileTreePanelProps) {
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    () => new Set(fileTree.filter((node) => node.type === "folder").map((node) => node.id))
  );
  const [contextMenu, setContextMenu] = useState<FileTreeContextMenuState | null>(null);
  const [createRequest, setCreateRequest] = useState<FileTreeCreateRequest | null>(null);
  const [variantImportRequest, setVariantImportRequest] = useState<VariantImportRequest | null>(
    null
  );
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [overDropTargetId, setOverDropTargetId] = useState<string | null>(null);
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(
    () => (selectedNodeId ? [selectedNodeId] : [])
  );
  const [selectionAnchorNodeId, setSelectionAnchorNodeId] = useState<string | null>(
    selectedNodeId
  );
  const sortedFileTree = useMemo(() => sortProjectFileTree(fileTree), [fileTree]);
  const flattenedFileTree = useMemo(
    () => flattenProjectFileTree(sortedFileTree, expandedFolderIds),
    [expandedFolderIds, sortedFileTree]
  );
  const visibleNodeIds = useMemo(
    () => flattenedFileTree.map((item) => item.id),
    [flattenedFileTree]
  );
  const validSelectedNodeIds = useMemo(
    () => selectedNodeIds.filter((nodeId) => Boolean(findProjectFileNode(fileTree, nodeId))),
    [fileTree, selectedNodeIds]
  );
  const effectiveSelectedNodeIds = useMemo(() => {
    if (!selectedNodeId || !findProjectFileNode(fileTree, selectedNodeId)) {
      return [];
    }

    return validSelectedNodeIds.includes(selectedNodeId)
      ? validSelectedNodeIds
      : [selectedNodeId];
  }, [fileTree, selectedNodeId, validSelectedNodeIds]);
  const effectiveSelectionAnchorNodeId =
    selectionAnchorNodeId && findProjectFileNode(fileTree, selectionAnchorNodeId)
      ? selectionAnchorNodeId
      : selectedNodeId;
  const objectSourceOptions = useMemo(
    () => collectObjectSourceOptions(sortedFileTree),
    [sortedFileTree]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    }),
    useSensor(KeyboardSensor)
  );
  const contextMenuNode = contextMenu?.nodeId
    ? findProjectFileNode(fileTree, contextMenu.nodeId)
    : undefined;
  const contextMenuSelectedNodeIds =
    contextMenu?.nodeId && effectiveSelectedNodeIds.includes(contextMenu.nodeId)
      ? effectiveSelectedNodeIds
      : contextMenu?.nodeId
        ? [contextMenu.nodeId]
        : [];
  const contextMenuSelectedNodes = contextMenuSelectedNodeIds
    .map((nodeId) => findProjectFileNode(fileTree, nodeId))
    .filter((node): node is ProjectFileNode => Boolean(node));
  const singleContextMenuNode =
    contextMenuSelectedNodeIds.length === 1 ? contextMenuSelectedNodes[0] : undefined;
  const editableContextMenuSelectedNodes = contextMenuSelectedNodes.filter(
    (node) => !isProtectedProjectFileNode(node)
  );
  const variantImportSourceNode = variantImportRequest
    ? findProjectFileNode(fileTree, variantImportRequest.sourceObjectFileNodeId)
    : undefined;
  const contextMenuActions = createContextMenuActions({
    disabled: saving,
    canDelete: editableContextMenuSelectedNodes.length > 0,
    canDetachLinkedObject: Boolean(
      singleContextMenuNode?.type === "file" &&
        singleContextMenuNode.kind === "object" &&
        singleContextMenuNode.sourceRef
    ),
    canDuplicate: editableContextMenuSelectedNodes.length > 0,
    canImportVariants: canImportVariantsFromObjectFile(fileTree, singleContextMenuNode),
    canRename: Boolean(singleContextMenuNode && !isProtectedProjectFileNode(singleContextMenuNode)),
    onCreate: handleRequestCreateNode,
    onDetachLinkedObject: handleDetachLinkedObject,
    onDuplicate: handleDuplicateNode,
    onImportVariants: handleRequestImportVariants,
    onRename: handleRequestRenameNode,
    onDelete: handleDeleteNode,
    selectedCount: editableContextMenuSelectedNodes.length
  });
  const autoExpandFolderId = getAutoExpandFolderId({
    activeNodeId,
    expandedFolderIds,
    fileTree,
    overDropTargetId
  });

  useEffect(() => {
    if (!autoExpandFolderId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setExpandedFolderIds((currentFolderIds) => {
        if (currentFolderIds.has(autoExpandFolderId)) {
          return currentFolderIds;
        }

        return new Set(currentFolderIds).add(autoExpandFolderId);
      });
    }, folderAutoExpandDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [autoExpandFolderId]);

  function handleContextMenu(event: MouseEvent, nodeId: string | null = null) {
    event.preventDefault();
    event.stopPropagation();

    if (nodeId && !effectiveSelectedNodeIds.includes(nodeId)) {
      setSelectedNodeIds([nodeId]);
      setSelectionAnchorNodeId(nodeId);
      onSelectNode(nodeId);
    }

    setContextMenu({
      nodeId,
      x: event.clientX,
      y: event.clientY
    });
  }

  function handleSelectNode(event: MouseEvent, nodeId: string) {
    const nextSelection = getProjectFileTreeSelectionAfterClick({
      additive: event.metaKey || event.ctrlKey,
      clickedNodeId: nodeId,
      range: event.shiftKey,
      selectedNodeId,
      selectedNodeIds: effectiveSelectedNodeIds,
      selectionAnchorNodeId: effectiveSelectionAnchorNodeId,
      visibleNodeIds
    });

    setSelectedNodeIds(nextSelection.selectedNodeIds);
    setSelectionAnchorNodeId(nextSelection.selectionAnchorNodeId);
    onSelectNode(nextSelection.selectedNodeId);
  }

  function selectFileTreeNodes(primaryNodeId: string | null, nodeIds?: string[]) {
    setSelectedNodeIds(nodeIds ?? (primaryNodeId ? [primaryNodeId] : []));
    setSelectionAnchorNodeId(primaryNodeId);
    onSelectNode(primaryNodeId);
  }

  function handleToggleFolder(folderId: string) {
    setExpandedFolderIds((currentFolderIds) => {
      const nextFolderIds = new Set(currentFolderIds);

      if (nextFolderIds.has(folderId)) {
        nextFolderIds.delete(folderId);
      } else {
        nextFolderIds.add(folderId);
      }

      return nextFolderIds;
    });
  }

  function handleRequestCreateNode(kind: ProjectFileCreateType) {
    const targetParentId = getCreateTargetParentId(fileTree, contextMenu?.nodeId ?? null);

    setCreateRequest({
      type: kind,
      parentId: targetParentId
    });
  }

  function handleCreateNode({
    name,
    objectRootKind,
    sourceObjectFileNodeId
  }: ProjectFileCreateData) {
    if (!createRequest) {
      return;
    }

    const nextNode =
      createRequest.type === "folder"
        ? createFolderNode(name)
        : createRequest.type === "object" && sourceObjectFileNodeId
          ? createProjectFileNode("object", name, {
              sourceRef: {
                sourceObjectFileNodeId,
                values: {}
              }
            })
          : createProjectFileNode(createRequest.type, name, { objectRootKind });
    const nextFileTree = appendProjectFileNode(fileTree, createRequest.parentId, nextNode);

    if (createRequest.parentId) {
      setExpandedFolderIds((currentFolderIds) =>
        new Set(currentFolderIds).add(createRequest.parentId as string)
      );
    }

    setCreateRequest(null);
    selectFileTreeNodes(nextNode.id);
    onFileTreeChange(nextFileTree);
  }

  function handleRequestRenameNode() {
    if (!contextMenuNode) {
      return;
    }

    setRenamingNodeId(contextMenuNode.id);
    setRenameDraft(contextMenuNode.name);
    selectFileTreeNodes(contextMenuNode.id);
  }

  function handleCommitRenameNode(nodeId: string) {
    const node = findProjectFileNode(fileTree, nodeId);
    const nextName = renameDraft.trim();

    setRenamingNodeId(null);
    setRenameDraft("");

    if (!node || !nextName || nextName === node.name) {
      return;
    }

    onFileTreeChange(renameProjectFileNode(fileTree, nodeId, nextName));
  }

  function handleCancelRenameNode() {
    setRenamingNodeId(null);
    setRenameDraft("");
  }

  function handleDeleteNode() {
    const nodeIds = getEditableContextMenuNodeIds({
      fileTree,
      nodeIds: contextMenuSelectedNodeIds
    });

    if (!nodeIds.length) {
      return;
    }

    const nodeLocation = contextMenu?.nodeId
      ? findProjectFileNodeLocation(fileTree, contextMenu.nodeId)
      : undefined;

    const nextFileTree = getProjectFileTreeWithDeletedNodes(fileTree, nodeIds);
    const preferredSelectedNodeId =
      nodeLocation?.parentId && findProjectFileNode(nextFileTree, nodeLocation.parentId)
        ? nodeLocation.parentId
        : null;
    const nextSelectedNodeId = preferredSelectedNodeId ?? nextFileTree[0]?.id ?? null;

    setExpandedFolderIds((currentFolderIds) => {
      const nextFolderIds = new Set(currentFolderIds);
      nodeIds.forEach((nodeId) => nextFolderIds.delete(nodeId));
      return nextFolderIds;
    });
    selectFileTreeNodes(nextSelectedNodeId);
    onFileTreeChange(nextFileTree);
  }

  function handleDuplicateNode() {
    const nodeIds = getTopLevelSelectedFileNodeIds({
      fileTree,
      nodeIds: getEditableContextMenuNodeIds({
        fileTree,
        nodeIds: contextMenuSelectedNodeIds
      })
    });

    if (!nodeIds.length) {
      return;
    }

    let nextFileTree = fileTree;
    const duplicatedNodeIds: string[] = [];

    for (const nodeId of nodeIds) {
      const result = duplicateProjectFileNode(nextFileTree, nodeId);

      if (!result) {
        continue;
      }

      nextFileTree = result.fileTree;
      duplicatedNodeIds.push(result.node.id);

      const duplicatedLocation = findProjectFileNodeLocation(result.fileTree, result.node.id);

      if (duplicatedLocation?.parentId) {
        setExpandedFolderIds((currentFolderIds) =>
          new Set(currentFolderIds).add(duplicatedLocation.parentId as string)
        );
      }
    }

    if (!duplicatedNodeIds.length) {
      return;
    }

    selectFileTreeNodes(duplicatedNodeIds.at(-1) ?? null, duplicatedNodeIds);
    onFileTreeChange(nextFileTree);
  }

  function handleDetachLinkedObject() {
    if (!contextMenu?.nodeId) {
      return;
    }

    const result = detachLinkedObjectFile({
      fileTree,
      objectFileNodeId: contextMenu.nodeId
    });

    if (!result) {
      return;
    }

    selectFileTreeNodes(result.selectedFileNodeId ?? contextMenu.nodeId);
    onFileTreeChange(result.fileTree, "Make independent");
  }

  function handleRequestImportVariants() {
    if (!contextMenu?.nodeId) {
      return;
    }

    setVariantImportRequest({
      sourceObjectFileNodeId: contextMenu.nodeId
    });
  }

  function handleImportVariants(rows: ParsedVariantImportRow[]) {
    if (!variantImportRequest) {
      return;
    }

    const result = createLinkedObjectFilesFromVariantRows({
      fileTree,
      rows,
      sourceObjectFileNodeId: variantImportRequest.sourceObjectFileNodeId
    });

    if (!result) {
      return;
    }

    const createdLocation = result.selectedFileNodeId
      ? findProjectFileNodeLocation(result.fileTree, result.selectedFileNodeId)
      : undefined;

    if (createdLocation?.parentId) {
      setExpandedFolderIds((currentFolderIds) =>
        new Set(currentFolderIds).add(createdLocation.parentId as string)
      );
    }

    setVariantImportRequest(null);
    selectFileTreeNodes(result.selectedFileNodeId ?? variantImportRequest.sourceObjectFileNodeId);
    onFileTreeChange(result.fileTree, "Import variants");
  }

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);

    if (!findProjectFileNode(fileTree, activeId)) {
      return;
    }

    setContextMenu(null);
    handleCancelRenameNode();
    setActiveNodeId(activeId);
    setOverDropTargetId(null);
  }

  function handleDragOver(event: DragOverEvent) {
    const nextDropTargetId = event.over ? String(event.over.id) : null;

    setOverDropTargetId((currentDropTargetId) =>
      currentDropTargetId === nextDropTargetId ? currentDropTargetId : nextDropTargetId
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const targetParentId = getDropTargetParentId(event.over?.id ?? overDropTargetId);

    resetDragState();

    if (targetParentId === undefined) {
      return;
    }

    const nextFileTree = moveProjectFileNodeToParent(fileTree, activeId, targetParentId);

    if (nextFileTree === fileTree) {
      return;
    }

    if (targetParentId) {
      setExpandedFolderIds((currentFolderIds) => new Set(currentFolderIds).add(targetParentId));
    }

    selectFileTreeNodes(activeId);
    onFileTreeChange(nextFileTree);
  }

  function handleDragCancel() {
    resetDragState();
  }

  function resetDragState() {
    setActiveNodeId(null);
    setOverDropTargetId(null);
  }

  return (
    <aside
      aria-label="Project file tree"
      className={cx(
        "flex min-h-0 flex-col overflow-hidden border-b border-slate-200 bg-white text-slate-700 md:border-b-0 md:border-r",
        className
      )}
      onContextMenu={(event) => handleContextMenu(event)}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={fileTreeCollisionDetection}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
      >
        <ProjectFileTreeList
          activeNodeId={activeNodeId}
          expandedFolderIds={expandedFolderIds}
          fileTree={fileTree}
          flattenedFileTree={flattenedFileTree}
          projectId={projectId}
          renameDraft={renameDraft}
          renamingNodeId={renamingNodeId}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={effectiveSelectedNodeIds}
          onCancelRename={handleCancelRenameNode}
          onCommitRename={handleCommitRenameNode}
          onContextMenu={handleContextMenu}
          onRenameDraftChange={setRenameDraft}
          onSelectNode={handleSelectNode}
          onToggleFolder={handleToggleFolder}
        />
      </DndContext>

      {saveError ? (
        <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {saveError.message}
        </div>
      ) : null}

      <ContextMenu
        actions={contextMenuActions}
        ariaLabel="File tree context menu"
        open={Boolean(contextMenu)}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        onOpenChange={(open) => {
          if (!open) {
            setContextMenu(null);
          }
        }}
      />

      {createRequest ? (
        <ProjectFileCreateModal
          objectSourceOptions={createRequest.type === "object" ? objectSourceOptions : []}
          opened
          type={createRequest.type}
          onClose={() => setCreateRequest(null)}
          onCreate={handleCreateNode}
        />
      ) : null}

      {variantImportRequest &&
      variantImportSourceNode?.type === "file" &&
      variantImportSourceNode.kind === "object" &&
      variantImportSourceNode.template ? (
        <VariantImportModal
          fileTree={fileTree}
          opened
          sourceName={variantImportSourceNode.name}
          template={variantImportSourceNode.template}
          onClose={() => setVariantImportRequest(null)}
          onImport={handleImportVariants}
        />
      ) : null}
    </aside>
  );
}

function collectObjectSourceOptions(
  fileTree: readonly ProjectFileNode[]
): ProjectFileCreateObjectSourceOption[] {
  const options: ProjectFileCreateObjectSourceOption[] = [];

  for (const node of fileTree) {
    if (node.type === "folder") {
      options.push(...collectObjectSourceOptions(node.children ?? []));
      continue;
    }

    if (node.kind !== "object" || node.sourceRef) {
      continue;
    }

    options.push({
      id: node.id,
      name: node.name,
      propertyCount: node.template?.variables.length ?? 0,
      rootKind: node.objectTree?.[0]?.kind
    });
  }

  return options;
}

type ProjectFileTreeListProps = {
  activeNodeId: string | null;
  expandedFolderIds: Set<string>;
  fileTree: ProjectFileNode[];
  flattenedFileTree: FlattenedProjectFileNode[];
  projectId: string;
  renameDraft: string;
  renamingNodeId: string | null;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  onCancelRename: () => void;
  onCommitRename: (nodeId: string) => void;
  onContextMenu: (event: MouseEvent, nodeId: string | null) => void;
  onRenameDraftChange: (value: string) => void;
  onSelectNode: (event: MouseEvent, nodeId: string) => void;
  onToggleFolder: (folderId: string) => void;
};

function ProjectFileTreeList({
  activeNodeId,
  expandedFolderIds,
  fileTree,
  flattenedFileTree,
  projectId,
  renameDraft,
  renamingNodeId,
  selectedNodeId,
  selectedNodeIds,
  onCancelRename,
  onCommitRename,
  onContextMenu,
  onRenameDraftChange,
  onSelectNode,
  onToggleFolder
}: ProjectFileTreeListProps) {
  const activeNodeLocation = activeNodeId
    ? findProjectFileNodeLocation(fileTree, activeNodeId)
    : undefined;
  const visibleFileTreeItems = activeNodeId
    ? flattenedFileTree.filter((item) => !item.ancestorIds.includes(activeNodeId))
    : flattenedFileTree;
  const canDropToRoot = Boolean(activeNodeId && activeNodeLocation?.parentId !== null);
  const { isOver, setNodeRef } = useDroppable({
    id: rootDropTargetId
  });

  return (
    <div
      ref={setNodeRef}
      className={cx(
        "min-h-0 flex-1 overflow-auto py-2 transition-colors",
        isOver && canDropToRoot && "bg-emerald-50"
      )}
    >
      <div className="min-w-max">
        {visibleFileTreeItems.map((item) => (
          <ProjectFileTreeNode
            key={item.id}
            activeNodeId={activeNodeId}
            activeParentId={activeNodeLocation?.parentId}
            depth={item.depth}
            expanded={expandedFolderIds.has(item.id)}
            item={item}
            projectId={projectId}
            renameDraft={renameDraft}
            renaming={renamingNodeId === item.id}
            primarySelected={selectedNodeId === item.id}
            selected={selectedNodeIds.includes(item.id)}
            onCancelRename={onCancelRename}
            onCommitRename={onCommitRename}
            onContextMenu={onContextMenu}
            onRenameDraftChange={onRenameDraftChange}
            onSelectNode={onSelectNode}
            onToggleFolder={onToggleFolder}
          />
        ))}
      </div>
    </div>
  );
}

type ProjectFileTreeNodeProps = {
  activeNodeId: string | null;
  activeParentId?: ProjectFileTreeParentId;
  depth: number;
  expanded: boolean;
  item: FlattenedProjectFileNode;
  projectId: string;
  renameDraft: string;
  renaming: boolean;
  primarySelected: boolean;
  selected: boolean;
  onCancelRename: () => void;
  onCommitRename: (nodeId: string) => void;
  onContextMenu: (event: MouseEvent, nodeId: string | null) => void;
  onRenameDraftChange: (value: string) => void;
  onSelectNode: (event: MouseEvent, nodeId: string) => void;
  onToggleFolder: (folderId: string) => void;
};

function ProjectFileTreeNode({
  activeNodeId,
  activeParentId,
  depth,
  expanded,
  item,
  projectId,
  renameDraft,
  renaming,
  primarySelected,
  selected,
  onCancelRename,
  onCommitRename,
  onContextMenu,
  onRenameDraftChange,
  onSelectNode,
  onToggleFolder
}: ProjectFileTreeNodeProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform
  } = useDraggable({
    id: item.id,
    disabled: renaming || isProtectedProjectFileNode(item.node)
  });
  const canHighlightDrop = nodeCanHighlightDrop({
    activeNodeId,
    activeParentId,
    item
  });
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: getNodeDropTargetId(item),
    disabled: activeNodeId === item.id,
    data: {
      depth: item.depth
    } satisfies NodeDropTargetData
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
  const protectedNode = isProtectedProjectFileNode(node);
  const hasChildren = node.type === "folder" && Boolean(node.children?.length);
  const iconClassName = getProjectFileNodeIconClassName(node);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameCanceledRef = useRef(false);

  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renaming]);

  function handleSelect(event: MouseEvent<HTMLButtonElement>) {
    if (renaming) {
      return;
    }

    onSelectNode(event, node.id);
  }

  function handleToggle(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onToggleFolder(node.id);
  }

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
    <div ref={setNodeRef} style={style} className={cx(isDragging && "relative z-10 opacity-70")}>
      <div
        className={cx(
          "group flex h-7 min-w-max items-center pr-2 text-[13px] leading-none transition-colors",
          isOver && canHighlightDrop
            ? "bg-emerald-100 text-slate-950 outline outline-1 -outline-offset-1 outline-emerald-500"
            : primarySelected && protectedNode
              ? "bg-teal-100 text-teal-950 outline outline-1 -outline-offset-1 outline-teal-500"
              : primarySelected
                ? "bg-sky-100 text-slate-950 outline outline-1 -outline-offset-1 outline-sky-500"
                : selected && protectedNode
                  ? "bg-teal-50 text-teal-950 outline outline-1 -outline-offset-1 outline-teal-200"
                  : selected
                    ? "bg-sky-50 text-slate-950 outline outline-1 -outline-offset-1 outline-sky-200"
                : protectedNode
                  ? "bg-teal-50 text-teal-950 hover:bg-teal-100"
                  : "text-slate-700 hover:bg-slate-100"
        )}
        style={{ paddingLeft: `${8 + depth * indentationWidth}px` }}
        onContextMenu={(event) => onContextMenu(event, node.id)}
        onDoubleClick={() => {
          if (hasChildren) {
            onToggleFolder(node.id);
          }
        }}
      >
        {hasChildren ? (
          <button
            aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900"
            type="button"
            onClick={handleToggle}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}

        {renaming ? (
          <div className="flex h-full min-w-0 flex-1 items-center gap-2">
            <ProjectFileNodeVisual
              iconClassName={iconClassName}
              node={node}
              projectId={projectId}
            />
            <input
              ref={renameInputRef}
              className="h-5 min-w-32 flex-1 rounded border border-sky-500 bg-white px-1 text-[13px] text-slate-950 outline-none"
              value={renameDraft}
              onBlur={handleRenameBlur}
              onChange={(event) => onRenameDraftChange(event.currentTarget.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={handleRenameKeyDown}
            />
          </div>
        ) : (
          <button
            className="flex h-full min-w-0 flex-1 items-center gap-2 text-left"
            type="button"
            {...attributes}
            {...listeners}
            onClick={handleSelect}
          >
            <ProjectFileNodeVisual
              iconClassName={iconClassName}
              node={node}
              projectId={projectId}
            />
            <span className="truncate">{node.name}</span>
            {protectedNode ? (
              <span
                aria-label="System folder"
                title="System folder"
                className="inline-flex shrink-0 text-teal-600"
              >
                <LockKeyhole aria-hidden size={12} />
              </span>
            ) : null}
          </button>
        )}
      </div>
    </div>
  );
}

type ProjectFileNodeVisualProps = {
  iconClassName: string;
  node: ProjectFileNode;
  projectId: string;
};

function ProjectFileNodeVisual({ iconClassName, node, projectId }: ProjectFileNodeVisualProps) {
  const imageAssetId = node.kind === "image" ? node.imageAsset?.id : undefined;
  const [failedImageAssetId, setFailedImageAssetId] = useState<string | null>(null);
  const previewFailed = Boolean(imageAssetId && failedImageAssetId === imageAssetId);

  if (imageAssetId && !previewFailed) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white">
        <img
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
          src={getProjectImageAssetUrl(projectId, imageAssetId)}
          onError={() => setFailedImageAssetId(imageAssetId)}
        />
      </span>
    );
  }

  return <ProjectFileNodeIcon className={cx("shrink-0", iconClassName)} node={node} size={17} />;
}

function createContextMenuActions({
  disabled,
  canDelete,
  canDetachLinkedObject,
  canDuplicate,
  canImportVariants,
  canRename,
  onCreate,
  onDetachLinkedObject,
  onDuplicate,
  onImportVariants,
  onRename,
  onDelete,
  selectedCount
}: {
  disabled: boolean;
  canDelete: boolean;
  canDetachLinkedObject: boolean;
  canDuplicate: boolean;
  canImportVariants: boolean;
  canRename: boolean;
  onCreate: (kind: ProjectFileCreateType) => void;
  onDetachLinkedObject: () => void;
  onDuplicate: () => void;
  onImportVariants: () => void;
  onRename: () => void;
  onDelete: () => void;
  selectedCount: number;
}): ContextMenuAction[] {
  return [
    {
      id: "create",
      label: "Create",
      icon: <Plus size={14} />,
      disabled,
      children: [
        {
          id: "create-folder",
          label: "Folder",
          icon: <Folder size={14} />,
          disabled,
          onSelect: () => onCreate("folder")
        },
        {
          id: "create-table-setup",
          label: "Table setup",
          icon: <Rows3 size={14} />,
          disabled,
          onSelect: () => onCreate("tableSetup")
        },
        {
          id: "create-object",
          label: "Object",
          icon: <Boxes size={14} />,
          disabled,
          onSelect: () => onCreate("object")
        }
      ]
    },
    {
      id: "import-variants",
      label: "Import variants from CSV",
      icon: <FileSpreadsheet size={14} />,
      disabled: disabled || !canImportVariants,
      separatorBefore: true,
      onSelect: onImportVariants
    },
    {
      id: "detach-linked-object",
      label: "Make independent",
      icon: <Unlink size={14} />,
      disabled: disabled || !canDetachLinkedObject,
      onSelect: onDetachLinkedObject
    },
    {
      id: "duplicate",
      label: selectedCount > 1 ? `Duplicate ${selectedCount} items` : "Duplicate",
      icon: <CopyPlus size={14} />,
      disabled: disabled || !canDuplicate,
      onSelect: onDuplicate
    },
    {
      id: "rename",
      label: "Rename",
      icon: <Pencil size={14} />,
      disabled: disabled || !canRename,
      onSelect: onRename
    },
    {
      id: "delete",
      label: selectedCount > 1 ? `Delete ${selectedCount} items` : "Delete",
      icon: <Trash2 size={14} />,
      destructive: true,
      disabled: disabled || !canDelete,
      onSelect: onDelete
    }
  ];
}

function getCreateTargetParentId(
  fileTree: ProjectFileNode[],
  targetNodeId: string | null
): ProjectFileTreeParentId {
  if (!targetNodeId) {
    return null;
  }

  const targetNode = findProjectFileNode(fileTree, targetNodeId);

  if (targetNode?.type === "folder") {
    return targetNode.id;
  }

  return findProjectFileNodeLocation(fileTree, targetNodeId)?.parentId ?? null;
}

function getEditableContextMenuNodeIds({
  fileTree,
  nodeIds
}: {
  fileTree: ProjectFileNode[];
  nodeIds: readonly string[];
}) {
  return nodeIds.filter((nodeId) => {
    const node = findProjectFileNode(fileTree, nodeId);

    return Boolean(node && !isProtectedProjectFileNode(node));
  });
}

function getProjectFileTreeWithDeletedNodes(
  fileTree: ProjectFileNode[],
  nodeIds: readonly string[]
) {
  return getTopLevelSelectedFileNodeIds({ fileTree, nodeIds }).reduce(
    (currentFileTree, nodeId) => deleteProjectFileNode(currentFileTree, nodeId),
    fileTree
  );
}

function getTopLevelSelectedFileNodeIds({
  fileTree,
  nodeIds
}: {
  fileTree: ProjectFileNode[];
  nodeIds: readonly string[];
}) {
  const selectedNodeIdSet = new Set(nodeIds);

  return nodeIds.filter((nodeId) => {
    const location = findProjectFileNodeLocation(fileTree, nodeId);

    return Boolean(
      location && !location.ancestors.some((ancestorId) => selectedNodeIdSet.has(ancestorId))
    );
  });
}

function flattenProjectFileTree(
  fileTree: ProjectFileNode[],
  expandedFolderIds: Set<string>,
  parentId: ProjectFileTreeParentId = null,
  depth = 0,
  ancestorIds: string[] = []
): FlattenedProjectFileNode[] {
  return fileTree.flatMap((node) => {
    const item: FlattenedProjectFileNode = {
      ancestorIds,
      depth,
      id: node.id,
      node,
      parentId
    };

    if (node.type !== "folder" || !expandedFolderIds.has(node.id) || !node.children?.length) {
      return [item];
    }

    return [
      item,
      ...flattenProjectFileTree(node.children, expandedFolderIds, node.id, depth + 1, [
        ...ancestorIds,
        node.id
      ])
    ];
  });
}

const fileTreeCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  const nodeCollisions = pointerCollisions.filter(
    ({ id }) =>
      isNodeDropTargetId(id) &&
      getDropTargetNodeId(id) !== String(args.active.id) &&
      pointerIsInsideNodeDropZone(args, id)
  );

  if (nodeCollisions.length > 0) {
    return nodeCollisions;
  }

  const rootCollision = pointerCollisions.find(({ id }) => id === rootDropTargetId);

  if (rootCollision) {
    return [rootCollision];
  }

  const rootDropTargetRect = args.droppableRects.get(rootDropTargetId);

  if (
    args.pointerCoordinates &&
    rootDropTargetRect &&
    args.pointerCoordinates.x < rootDropTargetRect.left
  ) {
    return [{ id: rootDropTargetId }];
  }

  return closestCenter(args);
};

function pointerIsInsideNodeDropZone(
  args: Parameters<CollisionDetection>[0],
  dropTargetId: UniqueIdentifier
) {
  if (!args.pointerCoordinates) {
    return true;
  }

  const dropTargetData = args.droppableContainers.find(({ id }) => id === dropTargetId)?.data
    .current;

  if (!isNodeDropTargetData(dropTargetData)) {
    return true;
  }

  const dropTargetRect = args.droppableRects.get(dropTargetId);

  if (!dropTargetRect) {
    return true;
  }

  const activationLeft =
    dropTargetRect.left + nodeDropActivationPadding + dropTargetData.depth * indentationWidth;

  return args.pointerCoordinates.x >= activationLeft;
}

function isNodeDropTargetData(value: unknown): value is NodeDropTargetData {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as Partial<NodeDropTargetData>).depth === "number"
  );
}

function nodeCanHighlightDrop({
  activeNodeId,
  activeParentId,
  item
}: {
  activeNodeId: string | null;
  activeParentId?: ProjectFileTreeParentId;
  item: FlattenedProjectFileNode;
}) {
  if (!activeNodeId || item.node.type !== "folder") {
    return false;
  }

  if (
    item.id === activeNodeId ||
    item.id === activeParentId ||
    item.ancestorIds.includes(activeNodeId)
  ) {
    return false;
  }

  return true;
}

function getAutoExpandFolderId({
  activeNodeId,
  expandedFolderIds,
  fileTree,
  overDropTargetId
}: {
  activeNodeId: string | null;
  expandedFolderIds: Set<string>;
  fileTree: ProjectFileNode[];
  overDropTargetId: string | null;
}) {
  if (!activeNodeId) {
    return null;
  }

  const folderId = getFolderDropTargetFolderId(overDropTargetId);

  if (!folderId || expandedFolderIds.has(folderId)) {
    return null;
  }

  const folderLocation = findProjectFileNodeLocation(fileTree, folderId);

  if (
    !folderLocation ||
    folderLocation.node.type !== "folder" ||
    !folderLocation.node.children?.length
  ) {
    return null;
  }

  if (folderId === activeNodeId || folderLocation.ancestors.includes(activeNodeId)) {
    return null;
  }

  return folderId;
}

function getDropTargetParentId(
  dropTargetId: UniqueIdentifier | string | null | undefined
): ProjectFileTreeParentId | undefined {
  if (!dropTargetId) {
    return undefined;
  }

  const id = String(dropTargetId);

  if (id === rootDropTargetId) {
    return null;
  }

  return getFolderDropTargetFolderId(id);
}

function getFolderDropTargetFolderId(dropTargetId: UniqueIdentifier | string | null | undefined) {
  if (!dropTargetId) {
    return undefined;
  }

  const id = String(dropTargetId);

  if (!id.startsWith(folderDropTargetPrefix)) {
    return undefined;
  }

  const folderId = id.slice(folderDropTargetPrefix.length);

  return folderId || undefined;
}

function getNodeDropTargetId(item: FlattenedProjectFileNode) {
  if (item.node.type === "folder") {
    return `${folderDropTargetPrefix}${item.id}`;
  }

  return `${itemDropTargetPrefix}${item.id}`;
}

function getDropTargetNodeId(dropTargetId: UniqueIdentifier) {
  const id = String(dropTargetId);

  if (id.startsWith(folderDropTargetPrefix)) {
    return id.slice(folderDropTargetPrefix.length);
  }

  if (id.startsWith(itemDropTargetPrefix)) {
    return id.slice(itemDropTargetPrefix.length);
  }

  return undefined;
}

function isNodeDropTargetId(dropTargetId: UniqueIdentifier) {
  const id = String(dropTargetId);

  return id.startsWith(folderDropTargetPrefix) || id.startsWith(itemDropTargetPrefix);
}

function getDragTransformStyle(transform: { x: number; y: number } | null) {
  if (!transform) {
    return undefined;
  }

  return `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`;
}

function getProjectFileNodeIconClassName(node: ProjectFileNode) {
  if (isProtectedProjectFileNode(node)) {
    return "text-teal-600";
  }

  if (node.type === "folder") {
    return "text-sky-600";
  }

  if (node.kind === "tableSetup") {
    return "text-cyan-600";
  }

  if (node.kind === "object") {
    return "text-emerald-600";
  }

  return "text-slate-500";
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
