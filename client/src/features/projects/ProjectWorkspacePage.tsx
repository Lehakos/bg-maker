import type { Project, ProjectFileNode, ProjectObjectNode } from "@bg-maker/shared";
import { Alert, Button, Center, Loader } from "@mantine/core";
import { useNavigate, useParams } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { ProjectFileTreePanel } from "./ProjectFileTreePanel";
import { ProjectObjectTreePanel } from "./ProjectObjectTreePanel";
import { ProjectPreviewArea } from "./ProjectPreviewArea";
import { useProject, useUpdateProjectFileTree } from "./project-hooks";
import { findProjectFileNode, sortProjectFileTree } from "./project-file-tree";
import {
  findProjectObjectNode,
  isProjectObjectTreeFileNode,
  updateProjectFileNodeObjectTree
} from "./project-object-tree";

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
  const [fileTree, setFileTree] = useState<ProjectFileNode[]>(() => initialFileTree);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    () => initialFileTree[0]?.id ?? null
  );
  const [selectedObject, setSelectedObject] = useState<{
    fileNodeId: string;
    objectId: string | null;
  } | null>(null);
  const selectedFileNode = useMemo(
    () => (selectedNodeId ? findProjectFileNode(fileTree, selectedNodeId) : undefined),
    [fileTree, selectedNodeId]
  );
  const selectedContentFileNode = isProjectObjectTreeFileNode(selectedFileNode)
    ? selectedFileNode
    : null;
  const selectedObjectId = useMemo(() => {
    if (!selectedContentFileNode || selectedObject?.fileNodeId !== selectedContentFileNode.id) {
      return null;
    }

    if (!selectedObject.objectId) {
      return null;
    }

    return findProjectObjectNode(selectedContentFileNode.objectTree ?? [], selectedObject.objectId)
      ? selectedObject.objectId
      : null;
  }, [selectedContentFileNode, selectedObject]);

  function persistFileTree(nextFileTree: ProjectFileNode[]) {
    setFileTree(nextFileTree);
    onSaveFileTree(nextFileTree);
  }

  function persistObjectTree(fileNodeId: string, objectTree: ProjectObjectNode[]) {
    const nextFileTree = updateProjectFileNodeObjectTree(fileTree, fileNodeId, objectTree);

    if (nextFileTree !== fileTree) {
      persistFileTree(nextFileTree);
    }
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
        selectedNodeId={selectedNodeId}
        onBack={onBack}
        onFileTreeChange={persistFileTree}
        onSelectNode={setSelectedNodeId}
      />
      <ProjectPreviewArea fileTree={fileTree} project={project} selectedNodeId={selectedNodeId} />
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
