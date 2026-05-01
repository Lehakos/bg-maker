import type { Project, ProjectFileNode } from "@bg-maker/shared";
import { Alert, Button, Center, Loader } from "@mantine/core";
import { useNavigate, useParams } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { ProjectFileTreePanel } from "./ProjectFileTreePanel";
import { ProjectPreviewArea } from "./ProjectPreviewArea";
import { useProject, useUpdateProjectFileTree } from "./project-hooks";
import { sortProjectFileTree } from "./project-file-tree";

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
      <Center className="min-h-[calc(100vh-72px)]" aria-label="Загрузка проекта">
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
          К проектам
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

  function persistFileTree(nextFileTree: ProjectFileNode[]) {
    setFileTree(nextFileTree);
    onSaveFileTree(nextFileTree);
  }

  return (
    <section className="grid h-[calc(100vh-72px)] w-full grid-cols-1 overflow-hidden bg-[#f6f7f4] text-slate-800 md:grid-cols-[minmax(280px,360px)_1fr]">
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
    </section>
  );
}
