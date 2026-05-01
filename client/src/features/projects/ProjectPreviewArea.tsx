import type { Project, ProjectFileNode } from "@bg-maker/shared";
import { Layers3 } from "lucide-react";
import { useMemo } from "react";
import {
  countProjectFileTreeNodes,
  findProjectFileNode,
  findProjectFileNodeLocation
} from "./project-file-tree";
import { getProjectFileNodeTypeLabel } from "./project-file-tree-labels";
import { ProjectFileNodeIcon } from "./project-file-tree-ui";
import { formatProjectDate } from "./project-format";

type ProjectPreviewAreaProps = {
  fileTree: ProjectFileNode[];
  project: Project;
  selectedNodeId: string | null;
};

export function ProjectPreviewArea({ fileTree, project, selectedNodeId }: ProjectPreviewAreaProps) {
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

  return (
    <main className="flex min-h-0 min-w-0 flex-col bg-[#f6f7f4]">
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

      <div className="min-h-0 flex-1 overflow-auto p-5">
        {selectedNode ? (
          <SelectedNodePreview node={selectedNode} parentFolderName={parentFolder?.name} />
        ) : (
          <ProjectRootPreview project={project} totalNodes={totalNodes} />
        )}
      </div>
    </main>
  );
}

type SelectedNodePreviewProps = {
  node: ProjectFileNode;
  parentFolderName?: string;
};

function SelectedNodePreview({ node, parentFolderName }: SelectedNodePreviewProps) {
  const childCount = node.type === "folder" ? (node.children ?? []).length : 0;

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-6">
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
        <PreviewStat label="Type" value={getProjectFileNodeTypeLabel(node)} />
        {node.type === "folder" ? <PreviewStat label="Items" value={String(childCount)} /> : null}
        {parentFolderName ? <PreviewStat label="Folder" value={parentFolderName} /> : null}
      </div>
    </div>
  );
}

type ProjectRootPreviewProps = {
  project: Project;
  totalNodes: number;
};

function ProjectRootPreview({ project, totalNodes }: ProjectRootPreviewProps) {
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-6">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium text-slate-500">Project</p>
        <h2 className="break-words text-3xl font-semibold leading-tight text-slate-950">
          {project.name}
        </h2>
        {project.description ? (
          <p className="mt-2 max-w-3xl text-slate-600">{project.description}</p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PreviewStat label="Items" value={String(totalNodes)} />
        <PreviewStat label="Table setups" value={String(project.tableSetupsCount)} />
        <PreviewStat label="Objects" value={String(project.objectsCount)} />
      </div>
    </div>
  );
}

type PreviewStatProps = {
  label: string;
  value: string;
};

function PreviewStat({ label, value }: PreviewStatProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
