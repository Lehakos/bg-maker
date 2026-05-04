import type {
  Project,
  ProjectFileNode,
  ProjectObjectNode,
  ProjectObjectKind,
  ProjectTableSetupItem,
  ProjectTableSetup
} from "@bg-maker/shared";
import { getProjectTableSetupItemId, resolveProjectObjectFileObjectTree } from "@bg-maker/shared";
import { Alert, Button, Center, Loader } from "@mantine/core";
import { useNavigate, useParams } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef } from "react";
import { useAppHeaderContent } from "../../app/app-header-context";
import { PanelResizeHandle } from "./PanelResizeHandle";
import { ProjectWorkspaceLeftPanel } from "../project-library/ProjectWorkspaceLeftPanel";
import { ProjectObjectInspectorPanel } from "../project-object-inspector/ProjectObjectInspectorPanel";
import { ProjectObjectTreePanel } from "../project-objects/ProjectObjectTreePanel";
import { ProjectWorkspaceArea } from "./ProjectWorkspaceArea";
import { ProjectWorkspaceProvider } from "./ProjectWorkspaceProvider";
import {
  useProjectWorkspaceSelection,
  useProjectWorkspaceStore
} from "./use-project-workspace-store";
import {
  createReplaceProjectFileTreeCommand,
  createUpdateProjectObjectRectTransformCommand,
  createUpdateProjectObjectTreeCommand,
  createUpdateProjectTableSetupCommand
} from "./project-editor-commands";
import { useProject, useUpdateProjectFileTree } from "./project-hooks";
import { findProjectFileNode } from "../project-files/project-file-tree";
import { formatProjectDate } from "../project-catalog/project-format";
import {
  appendProjectObjectNode,
  clearProjectObjectTreeActiveSides,
  cloneProjectObjectNode,
  findProjectObjectNode,
  findProjectObjectNodeLocation,
  getProjectObjectNodeRectTransform,
  insertProjectObjectNodeAfter,
  isProjectObjectTreeFileNode
} from "../project-objects/project-object-tree";
import { getProjectWorkspaceContentObjectTree } from "./project-workspace-store";
import {
  normalizeResizablePanelSize,
  useElementSize,
  useResizablePanelSize
} from "./resizable-panel-state";
import {
  getProjectFileNodeTableSetup,
  getProjectTableSetupWithDuplicatedItems,
  getProjectTableSetupWithInsertedItems,
  getProjectTableSetupWithLocalObjectTree
} from "../project-table-setup/project-table-setup";
import {
  getProjectTableSetupWithAlignedItems,
  getProjectTableSetupWithDistributedItems,
  getProjectTableSetupWithNudgedItems,
  type TableSetupAlignment,
  type TableSetupDistribution
} from "../project-table-setup/project-table-setup-geometry";
import { domToPng } from "modern-screenshot";

const sidePanelMinWidth = 260;
const sidePanelDefaultWidth = 320;
const workspaceContentMinWidth = 240;
const rightInspectorPanelMinHeight = 180;
const rightInspectorPanelDefaultHeight = 360;
const rightObjectTreePanelMinHeight = 180;
const unconstrainedPanelMaxSize = Number.MAX_SAFE_INTEGER;
const leftPanelWidthStorageKey = "bg-maker:workspace:left-panel-width";
const rightPanelWidthStorageKey = "bg-maker:workspace:right-panel-width";
const rightInspectorHeightStorageKey = "bg-maker:workspace:right-inspector-height";
const projectFileTreeSaveDebounceMs = 350;

type WorkspaceStyle = CSSProperties & {
  "--workspace-left-panel-width": string;
  "--workspace-right-inspector-panel-height": string;
  "--workspace-right-panel-width": string;
};

export function ProjectWorkspacePage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const navigate = useNavigate();
  const project = useProject(projectId);
  const updateFileTree = useUpdateProjectFileTree(projectId);

  const goToProjects = useCallback(() => {
    void navigate({ to: "/" });
  }, [navigate]);

  if (project.isLoading) {
    return (
      <Center className="min-h-[calc(100vh-72px)]" aria-label="Loading project">
        <Loader color="teal" />
      </Center>
    );
  }

  if (project.isError) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] w-full flex-col gap-4 p-6">
        <Button
          className="w-fit"
          variant="subtle"
          color="gray"
          leftSection={<ArrowLeft size={16} />}
          onClick={goToProjects}
        >
          Back to projects
        </Button>
        <Alert color="red" icon={<AlertCircle size={16} />} radius="sm">
          {project.error.message}
        </Alert>
      </div>
    );
  }

  if (!project.data) {
    return null;
  }

  return (
    <LoadedProjectWorkspace
      project={project.data}
      saveError={updateFileTree.error}
      saving={updateFileTree.isPending}
      onBack={goToProjects}
      onSaveFileTree={(nextFileTree) => updateFileTree.mutate(nextFileTree)}
    />
  );
}

type LoadedProjectWorkspaceProps = {
  project: Project;
  saving: boolean;
  saveError?: Error | null;
  onBack: () => void;
  onSaveFileTree: (fileTree: ProjectFileNode[]) => void;
};

function LoadedProjectWorkspace({
  project,
  saving,
  saveError,
  onBack,
  onSaveFileTree
}: LoadedProjectWorkspaceProps) {
  const saveFileTree = useDebouncedProjectFileTreeSave(onSaveFileTree);

  return (
    <ProjectWorkspaceProvider
      key={project.id}
      initialFileTree={project.fileTree}
      projectId={project.id}
      saveFileTree={saveFileTree}
    >
      <ProjectWorkspaceContent
        project={project}
        saveError={saveError}
        saving={saving}
        onBack={onBack}
      />
    </ProjectWorkspaceProvider>
  );
}

type ProjectWorkspaceContentProps = Omit<LoadedProjectWorkspaceProps, "onSaveFileTree">;

function ProjectWorkspaceContent({
  project,
  saving,
  saveError,
  onBack
}: ProjectWorkspaceContentProps) {
  const headerContent = useMemo(
    () => <ProjectWorkspaceHeader project={project} onBack={onBack} />,
    [onBack, project]
  );
  const fileTree = useProjectWorkspaceStore((state) => state.fileTree);
  const canRedo = useProjectWorkspaceStore((state) => state.canRedo);
  const canUndo = useProjectWorkspaceStore((state) => state.canUndo);
  const executeEditorCommand = useProjectWorkspaceStore((state) => state.executeCommand);
  const redo = useProjectWorkspaceStore((state) => state.redo);
  const selectObject = useProjectWorkspaceStore((state) => state.selectObject);
  const selectObjects = useProjectWorkspaceStore((state) => state.selectObjects);
  const clipboard = useProjectWorkspaceStore((state) => state.clipboard);
  const setClipboard = useProjectWorkspaceStore((state) => state.setClipboard);
  const setSelectedNodeId = useProjectWorkspaceStore((state) => state.setSelectedNodeId);
  const undo = useProjectWorkspaceStore((state) => state.undo);
  const objectSideSelections = useProjectWorkspaceStore((state) => state.objectSideSelections);
  const {
    effectiveSelectedNodeId,
    selectedContentFileNode,
    selectedFileNode,
    selectedObjectId,
    selectedObjectIds,
    selectedProjectObject,
    selectedTableSetupItem
  } = useProjectWorkspaceSelection();
  const selectedTableSetup = useMemo(
    () => getProjectFileNodeTableSetup(selectedContentFileNode),
    [selectedContentFileNode]
  );
  const selectedContentObjectTree = useMemo(() => {
    if (selectedTableSetupItem?.type === "localObject") {
      return [selectedTableSetupItem.object];
    }

    return getProjectWorkspaceContentObjectTree(
      fileTree,
      selectedContentFileNode,
      objectSideSelections
    );
  }, [fileTree, objectSideSelections, selectedContentFileNode, selectedTableSetupItem]);
  useAppHeaderContent(headerContent);
  const [workspaceElementRef, workspaceSize] = useElementSize<HTMLElement>();
  const [rightPanelElementRef, rightPanelSize] = useElementSize<HTMLDivElement>();
  const [leftPanelWidth, setLeftPanelWidth] = useResizablePanelSize({
    defaultSize: sidePanelDefaultWidth,
    maxSize: unconstrainedPanelMaxSize,
    minSize: sidePanelMinWidth,
    storageKey: leftPanelWidthStorageKey
  });
  const [rightPanelWidth, setRightPanelWidth] = useResizablePanelSize({
    defaultSize: sidePanelDefaultWidth,
    maxSize: unconstrainedPanelMaxSize,
    minSize: sidePanelMinWidth,
    storageKey: rightPanelWidthStorageKey
  });
  const rightPanelWidthForLeftConstraint = normalizeResizablePanelSize(rightPanelWidth, {
    maxSize: unconstrainedPanelMaxSize,
    minSize: sidePanelMinWidth
  });
  const effectiveLeftPanelMaxWidth = getSidePanelMaxWidth(
    workspaceSize.width,
    rightPanelWidthForLeftConstraint
  );
  const effectiveLeftPanelWidth = normalizeResizablePanelSize(leftPanelWidth, {
    maxSize: effectiveLeftPanelMaxWidth,
    minSize: sidePanelMinWidth
  });
  const effectiveRightPanelMaxWidth = getSidePanelMaxWidth(
    workspaceSize.width,
    effectiveLeftPanelWidth
  );
  const effectiveRightPanelWidth = normalizeResizablePanelSize(rightPanelWidth, {
    maxSize: effectiveRightPanelMaxWidth,
    minSize: sidePanelMinWidth
  });
  const effectiveRightInspectorPanelMaxHeight = getNestedPanelMaxSize(
    rightPanelSize.height,
    rightObjectTreePanelMinHeight
  );
  const [rightInspectorPanelHeight, setRightInspectorPanelHeight] = useResizablePanelSize({
    defaultSize: rightInspectorPanelDefaultHeight,
    maxSize: effectiveRightInspectorPanelMaxHeight,
    minSize: rightInspectorPanelMinHeight,
    storageKey: rightInspectorHeightStorageKey
  });
  const effectiveRightInspectorPanelHeight = normalizeResizablePanelSize(
    rightInspectorPanelHeight,
    {
      maxSize: effectiveRightInspectorPanelMaxHeight,
      minSize: rightInspectorPanelMinHeight
    }
  );
  const workspaceStyle: WorkspaceStyle = {
    "--workspace-left-panel-width": `${Math.round(effectiveLeftPanelWidth)}px`,
    "--workspace-right-inspector-panel-height": `${Math.round(effectiveRightInspectorPanelHeight)}px`,
    "--workspace-right-panel-width": `${Math.round(effectiveRightPanelWidth)}px`
  };

  const persistTableSetup = useCallback(
    (fileNodeId: string, tableSetup: ProjectTableSetup, label = "Update table setup") => {
      const fileNode = findProjectFileNode(fileTree, fileNodeId);
      const before = getProjectFileNodeTableSetup(fileNode);

      if (!before || before === tableSetup) {
        return;
      }

      executeEditorCommand(
        createUpdateProjectTableSetupCommand({
          after: tableSetup,
          before,
          fileNodeId,
          label
        })
      );
    },
    [executeEditorCommand, fileTree]
  );

  const handleWorkspaceCopy = useCallback(() => {
    if (!selectedContentFileNode) {
      return false;
    }

    if (selectedContentFileNode.kind === "tableSetup" && selectedTableSetup) {
      const copiedItems = getTableSetupItemsByIds(selectedTableSetup, selectedObjectIds);

      if (!copiedItems.length) {
        return false;
      }

      setClipboard({
        items: copiedItems,
        type: "tableSetupItems"
      });
      return true;
    }

    if (
      selectedContentFileNode.kind !== "object" ||
      !selectedObjectId ||
      !selectedProjectObject
    ) {
      return false;
    }

    const object = clearProjectObjectTreeActiveSides([selectedProjectObject])[0];

    if (!object) {
      return false;
    }

    setClipboard({
      objects: [object],
      type: "objectNodes"
    });
    return true;
  }, [
    selectedContentFileNode,
    selectedObjectId,
    selectedObjectIds,
    selectedProjectObject,
    selectedTableSetup,
    setClipboard
  ]);

  const handleWorkspaceDuplicate = useCallback(() => {
    if (!selectedContentFileNode) {
      return false;
    }

    if (selectedContentFileNode.kind === "tableSetup" && selectedTableSetup) {
      const result = getProjectTableSetupWithDuplicatedItems(
        selectedTableSetup,
        selectedObjectIds
      );

      if (result.tableSetup === selectedTableSetup) {
        return false;
      }

      persistTableSetup(selectedContentFileNode.id, result.tableSetup, "Duplicate table item");
      selectObjects(result.itemIds, result.itemIds.at(-1) ?? null);
      return true;
    }

    if (
      selectedContentFileNode.kind !== "object" ||
      selectedContentFileNode.sourceRef ||
      !selectedObjectId
    ) {
      return false;
    }

    const objectTree = selectedContentFileNode.objectTree ?? [];
    const selectedLocation = findProjectObjectNodeLocation(objectTree, selectedObjectId);
    const selectedObject = selectedLocation?.node;

    if (!selectedObject || isSingleObjectFileRoot(objectTree, selectedObject.id)) {
      return false;
    }

    const duplicate = cloneProjectObjectNode(selectedObject, { offset: 24 });
    const nextObjectTree = insertProjectObjectNodeAfter(objectTree, selectedObject.id, duplicate);

    if (nextObjectTree === objectTree) {
      return false;
    }

    executeEditorCommand(
      createUpdateProjectObjectTreeCommand({
        after: nextObjectTree,
        before: objectTree,
        fileNodeId: selectedContentFileNode.id,
        label: "Duplicate object"
      })
    );
    selectObject(duplicate.id);
    return true;
  }, [
    executeEditorCommand,
    persistTableSetup,
    selectObject,
    selectObjects,
    selectedContentFileNode,
    selectedObjectId,
    selectedObjectIds,
    selectedTableSetup
  ]);

  const handleWorkspacePaste = useCallback(() => {
    if (!selectedContentFileNode || !clipboard) {
      return false;
    }

    if (
      selectedContentFileNode.kind === "tableSetup" &&
      selectedTableSetup &&
      clipboard.type === "tableSetupItems"
    ) {
      const result = getProjectTableSetupWithInsertedItems(
        selectedTableSetup,
        selectedObjectIds,
        clipboard.items
      );

      if (result.tableSetup === selectedTableSetup) {
        return false;
      }

      persistTableSetup(selectedContentFileNode.id, result.tableSetup, "Paste table item");
      selectObjects(result.itemIds, result.itemIds.at(-1) ?? null);
      return true;
    }

    if (
      selectedContentFileNode.kind !== "object" ||
      selectedContentFileNode.sourceRef ||
      clipboard.type !== "objectNodes"
    ) {
      return false;
    }

    const objectTree = selectedContentFileNode.objectTree ?? [];
    const parentId =
      selectedObjectId && findProjectObjectNode(objectTree, selectedObjectId)
        ? selectedObjectId
        : null;

    if (parentId === null && objectTree.length > 0) {
      return false;
    }

    let nextObjectTree = objectTree;
    const pastedIds: string[] = [];

    for (const object of clipboard.objects) {
      const pastedObject = cloneProjectObjectNode(object, { offset: 24 });
      nextObjectTree = appendProjectObjectNode(nextObjectTree, parentId, pastedObject);
      pastedIds.push(pastedObject.id);
    }

    if (nextObjectTree === objectTree || !pastedIds.length) {
      return false;
    }

    executeEditorCommand(
      createUpdateProjectObjectTreeCommand({
        after: nextObjectTree,
        before: objectTree,
        fileNodeId: selectedContentFileNode.id,
        label: "Paste object"
      })
    );
    selectObject(pastedIds.at(-1) ?? null);
    return true;
  }, [
    clipboard,
    executeEditorCommand,
    persistTableSetup,
    selectObject,
    selectObjects,
    selectedContentFileNode,
    selectedObjectId,
    selectedObjectIds,
    selectedTableSetup
  ]);

  useEffect(() => {
    function handleWorkspaceNudgeKey(event: KeyboardEvent) {
      const delta = getKeyboardNudgeDelta(event, selectedTableSetup?.grid.size);

      if (!delta) {
        return false;
      }

      if (!selectedContentFileNode || !selectedObjectId) {
        return false;
      }

      if (selectedContentFileNode.kind === "tableSetup" && selectedTableSetup) {
        const nextTableSetup = getProjectTableSetupWithNudgedItems({
          fileTree,
          itemIds: selectedObjectIds,
          tableSetup: selectedTableSetup,
          x: delta.x,
          y: delta.y
        });

        if (nextTableSetup === selectedTableSetup) {
          return false;
        }

        event.preventDefault();
        persistTableSetup(selectedContentFileNode.id, nextTableSetup, "Nudge table item");
        return true;
      }

      if (
        selectedContentFileNode.kind === "object" &&
        selectedProjectObject &&
        selectedProjectObject.locked !== true
      ) {
        const before = getProjectObjectNodeRectTransform(selectedProjectObject);
        const after = {
          ...before,
          x: before.x + delta.x,
          y: before.y + delta.y
        };

        event.preventDefault();
        executeEditorCommand(
          createUpdateProjectObjectRectTransformCommand({
            after,
            before,
            fileNodeId: selectedContentFileNode.id,
            label: "Nudge object",
            objectId: selectedObjectId
          })
        );
        return true;
      }

      return false;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const key = getKeyboardShortcutKey(event);
      const commandModifierPressed = event.metaKey || event.ctrlKey;

      if (!commandModifierPressed || isEditableKeyboardTarget(event.target)) {
        if (!commandModifierPressed) {
          const nudged = handleWorkspaceNudgeKey(event);

          if (nudged) {
            return;
          }

          if (event.key === "Escape" && selectedContentFileNode?.kind === "tableSetup") {
            event.preventDefault();
            selectObject(null);
          }
        }

        return;
      }

      if (key === "c") {
        const copied = handleWorkspaceCopy();

        if (copied) {
          event.preventDefault();
        }

        return;
      }

      if (key === "v") {
        const pasted = handleWorkspacePaste();

        if (pasted) {
          event.preventDefault();
        }

        return;
      }

      if (key === "d") {
        const duplicated = handleWorkspaceDuplicate();

        if (duplicated) {
          event.preventDefault();
        }

        return;
      }

      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }

      if (key === "z") {
        event.preventDefault();
        undo();
        return;
      }

      if (key === "y") {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    fileTree,
    executeEditorCommand,
    handleWorkspaceCopy,
    handleWorkspaceDuplicate,
    handleWorkspacePaste,
    persistTableSetup,
    redo,
    selectObject,
    selectedContentFileNode,
    selectedObjectId,
    selectedObjectIds,
    selectedProjectObject,
    selectedTableSetup,
    undo
  ]);

  function persistFileTree(nextFileTree: ProjectFileNode[]) {
    executeEditorCommand(
      createReplaceProjectFileTreeCommand({
        after: nextFileTree,
        before: fileTree,
        label: "Update file tree"
      })
    );
  }

  function persistObjectTree(fileNodeId: string, objectTree: ProjectObjectNode[]) {
    const fileNode = findProjectFileNode(fileTree, fileNodeId);

    if (fileNode?.kind === "tableSetup") {
      const tableSetup = getProjectFileNodeTableSetup(fileNode);

      if (!tableSetup || !selectedObjectId) {
        return;
      }

      const nextTableSetup = getProjectTableSetupWithLocalObjectTree(
        tableSetup,
        selectedObjectId,
        clearProjectObjectTreeActiveSides(objectTree)
      );

      persistTableSetup(fileNode.id, nextTableSetup, "Update table item");
      return;
    }

    if (!isProjectObjectTreeFileNode(fileNode) || fileNode.sourceRef) {
      return;
    }

    const nextObjectTree = clearProjectObjectTreeActiveSides(objectTree);

    executeEditorCommand(
      createUpdateProjectObjectTreeCommand({
        after: nextObjectTree,
        before: fileNode.objectTree ?? [],
        fileNodeId,
        label: "Update object tree"
      })
    );
  }

  function handleAlignTableItems(alignment: TableSetupAlignment) {
    if (!selectedContentFileNode || !selectedTableSetup) {
      return;
    }

    const nextTableSetup = getProjectTableSetupWithAlignedItems({
      alignment,
      fileTree,
      itemIds: selectedObjectIds,
      tableSetup: selectedTableSetup
    });

    persistTableSetup(selectedContentFileNode.id, nextTableSetup, "Align table items");
  }

  function handleDistributeTableItems(direction: TableSetupDistribution) {
    if (!selectedContentFileNode || !selectedTableSetup) {
      return;
    }

    const nextTableSetup = getProjectTableSetupWithDistributedItems({
      direction,
      fileTree,
      itemIds: selectedObjectIds,
      tableSetup: selectedTableSetup
    });

    persistTableSetup(selectedContentFileNode.id, nextTableSetup, "Distribute table items");
  }

  async function handleExportPng() {
    const exportRoot = document.querySelector<HTMLElement>("[data-workspace-export-root='true']");

    if (!exportRoot) {
      return;
    }

    const dataUrl = await domToPng(exportRoot, {
      backgroundColor: getComputedStyle(exportRoot).backgroundColor,
      filter: (node) =>
        !(node instanceof HTMLElement) || node.closest("[data-export-exclude='true']") === null,
      scale: 2
    });
    const link = document.createElement("a");
    const fileName = `${selectedContentFileNode?.name ?? selectedFileNode?.name ?? "workspace"}.png`;

    link.download = fileName.replace(/[^\w.-]+/g, "-");
    link.href = dataUrl;
    link.click();
  }

  async function handlePrintSheets() {
    const exportRoot = document.querySelector<HTMLElement>("[data-workspace-export-root='true']");

    if (!exportRoot) {
      return;
    }

    const dataUrl = await domToPng(exportRoot, {
      backgroundColor: getComputedStyle(exportRoot).backgroundColor,
      filter: (node) =>
        !(node instanceof HTMLElement) || node.closest("[data-export-exclude='true']") === null,
      scale: 2
    });
    const printFrame = document.createElement("iframe");
    const title = escapeHtml(selectedFileNode?.name ?? "Print sheets");

    printFrame.setAttribute("aria-hidden", "true");
    printFrame.style.border = "0";
    printFrame.style.height = "1px";
    printFrame.style.left = "-10000px";
    printFrame.style.position = "fixed";
    printFrame.style.top = "0";
    printFrame.style.width = "1px";
    printFrame.srcdoc = `
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: letter; margin: 0.5in; }
            body { margin: 0; background: white; color: #0f172a; font-family: Inter, system-ui, sans-serif; }
            main { align-items: flex-start; display: flex; justify-content: center; min-height: 100vh; }
            img { display: block; max-height: calc(100vh - 1in); max-width: 100%; object-fit: contain; }
          </style>
        </head>
        <body><main><img alt="${title}" src="${dataUrl}" /></main></body>
      </html>
    `;

    printFrame.addEventListener(
      "load",
      () => {
        const printWindow = printFrame.contentWindow;

        if (!printWindow) {
          printFrame.remove();
          return;
        }

        const cleanup = () => {
          window.setTimeout(() => printFrame.remove(), 250);
        };

        printWindow.addEventListener("afterprint", cleanup, { once: true });
        window.setTimeout(cleanup, 15000);
        printWindow.focus();
        printWindow.print();
      },
      { once: true }
    );
    document.body.append(printFrame);
  }

  const canArrangeTableItems =
    selectedContentFileNode?.kind === "tableSetup" && selectedObjectIds.length >= 1;
  const canDistributeTableItems =
    selectedContentFileNode?.kind === "tableSetup" && selectedObjectIds.length >= 2;
  const canExport =
    selectedContentFileNode?.kind === "object" || selectedContentFileNode?.kind === "tableSetup";
  const canPrint = getPrintableObjectFileNodes(fileTree, selectedFileNode).length > 0 || canExport;

  return (
    <section
      ref={workspaceElementRef}
      className="grid h-[calc(100vh-72px)] min-h-0 w-full grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] overflow-hidden bg-[#f6f7f4] text-slate-800 md:grid-cols-[var(--workspace-left-panel-width)_minmax(0,1fr)_var(--workspace-right-panel-width)] md:grid-rows-1"
      style={workspaceStyle}
    >
      <div className="relative min-h-0">
        <ProjectWorkspaceLeftPanel
          className="h-full"
          fileTree={fileTree}
          projectId={project.id}
          saveError={saveError}
          saving={saving}
          selectedNodeId={effectiveSelectedNodeId}
          onFileTreeChange={persistFileTree}
          onSelectNode={setSelectedNodeId}
        />
        <PanelResizeHandle
          axis="horizontal"
          className="hidden md:block"
          edge="right"
          label="Resize file tree panel"
          maxSize={effectiveLeftPanelMaxWidth}
          minSize={sidePanelMinWidth}
          size={effectiveLeftPanelWidth}
          onSizeChange={setLeftPanelWidth}
        />
      </div>
      <ProjectWorkspaceArea
        contentFileNode={selectedContentFileNode}
        fileTree={fileTree}
        project={project}
        selectedNodeId={effectiveSelectedNodeId}
        tableSetup={selectedTableSetup}
        canRedo={canRedo}
        canUndo={canUndo}
        onExecuteCommand={executeEditorCommand}
        onRedo={redo}
        selectedObjectId={selectedObjectId}
        selectedObjectIds={selectedObjectIds}
        canAlign={canArrangeTableItems}
        canDistribute={canDistributeTableItems}
        showArrangeControls={selectedContentFileNode?.kind === "tableSetup"}
        canExport={canExport}
        canPrint={canPrint}
        onAlign={handleAlignTableItems}
        onDistribute={handleDistributeTableItems}
        onExportPng={handleExportPng}
        onPrintSheets={handlePrintSheets}
        onSelectObject={selectObject}
        onSelectObjects={selectObjects}
        onUndo={undo}
      />
      <div
        ref={rightPanelElementRef}
        className="relative flex min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white md:border-l md:border-t-0"
      >
        <PanelResizeHandle
          axis="horizontal"
          className="hidden md:block"
          edge="left"
          label="Resize editor panels"
          maxSize={effectiveRightPanelMaxWidth}
          minSize={sidePanelMinWidth}
          size={effectiveRightPanelWidth}
          onSizeChange={setRightPanelWidth}
        />
        <div className="relative flex min-h-0 flex-1 basis-0 flex-col md:flex-none md:basis-[var(--workspace-right-inspector-panel-height)]">
          <ProjectObjectInspectorPanel
            className="h-full"
            contentFileNode={selectedContentFileNode}
            fileTree={fileTree}
            objectTree={selectedContentObjectTree}
            projectId={project.id}
            selectedObject={selectedProjectObject}
            selectedTableSetupItem={selectedTableSetupItem}
            tableSetup={selectedTableSetup}
            onFileTreeChange={persistFileTree}
            onObjectTreeChange={persistObjectTree}
            onTableSetupChange={(tableSetup, label) =>
              selectedContentFileNode
                ? persistTableSetup(selectedContentFileNode.id, tableSetup, label)
                : undefined
            }
          />
          <PanelResizeHandle
            axis="vertical"
            className="hidden md:block"
            edge="bottom"
            label="Resize inspector panel"
            maxSize={effectiveRightInspectorPanelMaxHeight}
            minSize={rightInspectorPanelMinHeight}
            size={effectiveRightInspectorPanelHeight}
            onSizeChange={setRightInspectorPanelHeight}
          />
        </div>
        <div className="min-h-0 flex flex-1 basis-0 flex-col">
          <ProjectObjectTreePanel
            className="h-full"
            contentFileNode={selectedContentFileNode}
            fileTree={fileTree}
            objectTree={selectedContentObjectTree}
            readOnly={Boolean(selectedContentFileNode?.sourceRef)}
            saving={saving}
            selectedObjectId={selectedObjectId}
            selectedObjectIds={selectedObjectIds}
            tableSetup={selectedTableSetup}
            onObjectTreeChange={persistObjectTree}
            onTableSetupChange={(tableSetup, label) =>
              selectedContentFileNode
                ? persistTableSetup(selectedContentFileNode.id, tableSetup, label)
                : undefined
            }
            onSelectObject={selectObject}
            onSelectObjects={selectObjects}
          />
        </div>
      </div>
    </section>
  );
}

function useDebouncedProjectFileTreeSave(onSaveFileTree: (fileTree: ProjectFileNode[]) => void) {
  const onSaveFileTreeRef = useRef(onSaveFileTree);
  const pendingFileTreeRef = useRef<ProjectFileNode[] | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    onSaveFileTreeRef.current = onSaveFileTree;
  }, [onSaveFileTree]);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      const pendingFileTree = pendingFileTreeRef.current;
      pendingFileTreeRef.current = null;
      saveTimeoutRef.current = null;

      if (pendingFileTree) {
        onSaveFileTreeRef.current(pendingFileTree);
      }
    },
    []
  );

  return useCallback((nextFileTree: ProjectFileNode[]) => {
    pendingFileTreeRef.current = nextFileTree;

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      const pendingFileTree = pendingFileTreeRef.current;
      pendingFileTreeRef.current = null;
      saveTimeoutRef.current = null;

      if (pendingFileTree) {
        onSaveFileTreeRef.current(pendingFileTree);
      }
    }, projectFileTreeSaveDebounceMs);
  }, []);
}

type ProjectWorkspaceHeaderProps = {
  project: Project;
  onBack: () => void;
};

function ProjectWorkspaceHeader({ project, onBack }: ProjectWorkspaceHeaderProps) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <button
          aria-label="Back to projects"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft size={24} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold uppercase leading-tight tracking-[0.12em] text-slate-600">
            File tree
          </h1>
          <p className="truncate text-sm font-medium text-slate-600">{project.name}</p>
        </div>
      </div>
      <p className="hidden shrink-0 text-sm text-slate-500 sm:block">
        Updated {formatProjectDate(project.updatedAt)}
      </p>
    </div>
  );
}

function isEditableKeyboardTarget(target: EventTarget | null) {
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

function getKeyboardShortcutKey(event: KeyboardEvent) {
  if (event.code === "KeyC") {
    return "c";
  }

  if (event.code === "KeyD") {
    return "d";
  }

  if (event.code === "KeyV") {
    return "v";
  }

  if (event.code === "KeyY") {
    return "y";
  }

  if (event.code === "KeyZ") {
    return "z";
  }

  return event.key.toLowerCase();
}

function getKeyboardNudgeDelta(event: KeyboardEvent, gridSize = 10) {
  const step = event.shiftKey ? Math.max(1, gridSize) : 1;

  if (event.key === "ArrowLeft") {
    return { x: -step, y: 0 };
  }

  if (event.key === "ArrowRight") {
    return { x: step, y: 0 };
  }

  if (event.key === "ArrowUp") {
    return { x: 0, y: -step };
  }

  if (event.key === "ArrowDown") {
    return { x: 0, y: step };
  }

  return null;
}

function getTableSetupItemsByIds(
  tableSetup: ProjectTableSetup,
  itemIds: readonly string[]
): ProjectTableSetupItem[] {
  const selectedIds = new Set(itemIds);

  return tableSetup.items.filter((item) => selectedIds.has(getProjectTableSetupItemId(item)));
}

function isSingleObjectFileRoot(objectTree: readonly ProjectObjectNode[], objectId: string) {
  return objectTree.length === 1 && objectTree[0]?.id === objectId;
}

function getPrintableObjectFileNodes(
  fileTree: ProjectFileNode[],
  selectedFileNode: ProjectFileNode | undefined
) {
  if (!selectedFileNode) {
    return [];
  }

  const printableNodes: ProjectFileNode[] = [];
  collectPrintableObjectFileNodes(fileTree, selectedFileNode, printableNodes);
  return printableNodes;
}

function collectPrintableObjectFileNodes(
  fileTree: ProjectFileNode[],
  node: ProjectFileNode,
  printableNodes: ProjectFileNode[]
) {
  if (node.type === "folder") {
    for (const child of node.children ?? []) {
      collectPrintableObjectFileNodes(fileTree, child, printableNodes);
    }

    return;
  }

  if (node.kind !== "object") {
    return;
  }

  const rootKind = resolveProjectObjectFileObjectTree(fileTree, node)[0]?.kind;

  if (rootKind && isPrintableObjectKind(rootKind)) {
    printableNodes.push(node);
  }
}

function isPrintableObjectKind(kind: ProjectObjectKind) {
  return kind === "card" || kind === "shape" || kind === "token";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getSidePanelMaxWidth(workspaceWidth: number, oppositePanelWidth: number) {
  if (workspaceWidth <= 0) {
    return unconstrainedPanelMaxSize;
  }

  return Math.max(
    sidePanelMinWidth,
    workspaceWidth - oppositePanelWidth - workspaceContentMinWidth
  );
}

function getNestedPanelMaxSize(containerSize: number, oppositePanelMinSize: number) {
  if (containerSize <= 0) {
    return unconstrainedPanelMaxSize;
  }

  return Math.max(rightInspectorPanelMinHeight, containerSize - oppositePanelMinSize);
}
