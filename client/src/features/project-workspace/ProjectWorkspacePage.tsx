import type { Project, ProjectFileNode, ProjectObjectNode } from "@bg-maker/shared";
import { Alert, Button, Center, Loader } from "@mantine/core";
import { useNavigate, useParams } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef } from "react";
import { useAppHeaderContent } from "../../app/app-header-context";
import { PanelResizeHandle } from "./PanelResizeHandle";
import { ProjectFileTreePanel } from "../project-files/ProjectFileTreePanel";
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
  createUpdateProjectObjectTreeCommand
} from "./project-editor-commands";
import { useProject, useUpdateProjectFileTree } from "./project-hooks";
import { findProjectFileNode } from "../project-files/project-file-tree";
import { formatProjectDate } from "../project-catalog/project-format";
import {
  clearProjectObjectTreeActiveSides,
  isProjectObjectTreeFileNode
} from "../project-objects/project-object-tree";
import { getProjectWorkspaceContentObjectTree } from "./project-workspace-store";
import {
  normalizeResizablePanelSize,
  useElementSize,
  useResizablePanelSize
} from "./resizable-panel-state";

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
  const setSelectedNodeId = useProjectWorkspaceStore((state) => state.setSelectedNodeId);
  const undo = useProjectWorkspaceStore((state) => state.undo);
  const objectSideSelections = useProjectWorkspaceStore((state) => state.objectSideSelections);
  const {
    effectiveSelectedNodeId,
    selectedContentFileNode,
    selectedObjectId,
    selectedProjectObject
  } = useProjectWorkspaceSelection();
  const selectedContentObjectTree = useMemo(
    () =>
      getProjectWorkspaceContentObjectTree(
        fileTree,
        selectedContentFileNode,
        objectSideSelections
      ),
    [fileTree, objectSideSelections, selectedContentFileNode]
  );
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const commandModifierPressed = event.metaKey || event.ctrlKey;

      if (!commandModifierPressed || isEditableKeyboardTarget(event.target)) {
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
  }, [redo, undo]);

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

  return (
    <section
      ref={workspaceElementRef}
      className="grid h-[calc(100vh-72px)] min-h-0 w-full grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] overflow-hidden bg-[#f6f7f4] text-slate-800 md:grid-cols-[var(--workspace-left-panel-width)_minmax(0,1fr)_var(--workspace-right-panel-width)] md:grid-rows-1"
      style={workspaceStyle}
    >
      <div className="relative min-h-0">
        <ProjectFileTreePanel
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
        canRedo={canRedo}
        canUndo={canUndo}
        onExecuteCommand={executeEditorCommand}
        onRedo={redo}
        selectedObjectId={selectedObjectId}
        onSelectObject={selectObject}
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
            onFileTreeChange={persistFileTree}
            onObjectTreeChange={persistObjectTree}
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
            objectTree={selectedContentObjectTree}
            readOnly={Boolean(selectedContentFileNode?.sourceRef)}
            saving={saving}
            selectedObjectId={selectedObjectId}
            onObjectTreeChange={persistObjectTree}
            onSelectObject={selectObject}
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
