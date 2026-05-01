import type { Project, ProjectFileNode, ProjectObjectNode } from "@bg-maker/shared";
import { Alert, Button, Center, Loader } from "@mantine/core";
import { useNavigate, useParams } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProjectFileTreePanel } from "./ProjectFileTreePanel";
import { ProjectObjectTreePanel } from "./ProjectObjectTreePanel";
import { ProjectWorkspaceArea } from "./ProjectWorkspaceArea";
import { useEditorCommandHistory } from "./editor-command-history";
import {
  createReplaceProjectFileTreeCommand,
  createUpdateProjectObjectTreeCommand
} from "./project-editor-commands";
import { useProject, useUpdateProjectFileTree } from "./project-hooks";
import { findProjectFileNode, sortProjectFileTree } from "./project-file-tree";
import { findProjectObjectNode, isProjectObjectTreeFileNode } from "./project-object-tree";

export function ProjectWorkspacePage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const navigate = useNavigate();
  const project = useProject(projectId);
  const updateFileTree = useUpdateProjectFileTree(projectId);

  function goToProjects() {
    void navigate({ to: "/" });
  }

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
  const initialFileTree = useMemo(() => sortProjectFileTree(project.fileTree), [project.fileTree]);
  const {
    canRedo,
    canUndo,
    executeCommand: executeEditorCommand,
    redo,
    state: fileTree,
    undo
  } = useEditorCommandHistory<ProjectFileNode[]>({
    initialState: initialFileTree,
    onStateChange: onSaveFileTree
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    () => initialFileTree[0]?.id ?? null
  );
  const [selectedObject, setSelectedObject] = useState<{
    fileNodeId: string;
    objectId: string | null;
  } | null>(null);
  const effectiveSelectedNodeId = useMemo(() => {
    if (selectedNodeId && findProjectFileNode(fileTree, selectedNodeId)) {
      return selectedNodeId;
    }

    return fileTree[0]?.id ?? null;
  }, [fileTree, selectedNodeId]);
  const selectedFileNode = useMemo(
    () =>
      effectiveSelectedNodeId ? findProjectFileNode(fileTree, effectiveSelectedNodeId) : undefined,
    [effectiveSelectedNodeId, fileTree]
  );
  const selectedContentFileNode = isProjectObjectTreeFileNode(selectedFileNode)
    ? selectedFileNode
    : null;
  const defaultSelectedObjectId =
    selectedContentFileNode?.kind === "object"
      ? (selectedContentFileNode.objectTree?.[0]?.id ?? null)
      : null;
  const selectedObjectId = useMemo(() => {
    if (!selectedContentFileNode || selectedObject?.fileNodeId !== selectedContentFileNode.id) {
      return defaultSelectedObjectId;
    }

    if (!selectedObject.objectId) {
      return defaultSelectedObjectId;
    }

    return findProjectObjectNode(selectedContentFileNode.objectTree ?? [], selectedObject.objectId)
      ? selectedObject.objectId
      : defaultSelectedObjectId;
  }, [defaultSelectedObjectId, selectedContentFileNode, selectedObject]);

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

    if (!isProjectObjectTreeFileNode(fileNode)) {
      return;
    }

    executeEditorCommand(
      createUpdateProjectObjectTreeCommand({
        after: objectTree,
        before: fileNode.objectTree ?? [],
        fileNodeId,
        label: "Update object tree"
      })
    );
  }

  function selectObject(objectId: string | null) {
    if (!selectedContentFileNode) {
      setSelectedObject(null);
      return;
    }

    setSelectedObject({
      fileNodeId: selectedContentFileNode.id,
      objectId
    });
  }

  return (
    <section className="grid h-[calc(100vh-72px)] w-full grid-cols-1 overflow-hidden bg-[#f6f7f4] text-slate-800 md:grid-cols-[minmax(260px,340px)_minmax(0,1fr)_minmax(260px,320px)]">
      <ProjectFileTreePanel
        fileTree={fileTree}
        projectName={project.name}
        saveError={saveError}
        saving={saving}
        selectedNodeId={effectiveSelectedNodeId}
        onBack={onBack}
        onFileTreeChange={persistFileTree}
        onSelectNode={setSelectedNodeId}
      />
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
      <ProjectObjectTreePanel
        contentFileNode={selectedContentFileNode}
        saving={saving}
        selectedObjectId={selectedObjectId}
        onObjectTreeChange={persistObjectTree}
        onSelectObject={selectObject}
      />
    </section>
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
