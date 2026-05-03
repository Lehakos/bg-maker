import type { ProjectFileNode, ProjectObjectNode } from "@bg-maker/shared";
import {
  getProjectImageAssetOptionById,
  type ProjectImageAssetOption
} from "../project-assets/project-image-assets";
import { getProjectFileNodeTypeLabel } from "../project-files/project-file-tree-labels";
import { ProjectFileNodeIcon } from "../project-files/project-file-tree-ui";
import type { ProjectEditorCommand } from "./project-editor-commands";
import { ObjectFileWorkspace, TableLayoutWorkspace } from "./ProjectWorkspaceObjectScenes";

type WorkspaceViewportProps = {
  contentFileNode: ProjectFileNode | null;
  fileTree: ProjectFileNode[];
  imageAssets: ProjectImageAssetOption[];
  objectTree: ProjectObjectNode[];
  parentFolderName?: string;
  readOnly?: boolean;
  selectedNode?: ProjectFileNode;
  selectedObjectId: string | null;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

export function WorkspaceViewport({
  contentFileNode,
  fileTree,
  imageAssets,
  objectTree,
  parentFolderName,
  readOnly = false,
  selectedNode,
  selectedObjectId,
  onExecuteCommand,
  onSelectObject
}: WorkspaceViewportProps) {
  if (contentFileNode?.kind === "tableSetup") {
    return (
      <TableLayoutWorkspace
        fileTree={fileTree}
        fileNode={contentFileNode}
        imageAssets={imageAssets}
        objectTree={objectTree}
        readOnly={readOnly}
        selectedObjectId={selectedObjectId}
        onExecuteCommand={onExecuteCommand}
        onSelectObject={onSelectObject}
      />
    );
  }

  if (contentFileNode?.kind === "object") {
    return (
      <ObjectFileWorkspace
        fileTree={fileTree}
        fileNode={contentFileNode}
        imageAssets={imageAssets}
        objectTree={objectTree}
        readOnly={readOnly}
        selectedObjectId={selectedObjectId}
        onExecuteCommand={onExecuteCommand}
        onSelectObject={onSelectObject}
      />
    );
  }

  if (selectedNode) {
    return (
      <SelectedFileWorkspace
        imageAssets={imageAssets}
        node={selectedNode}
        parentFolderName={parentFolderName}
      />
    );
  }

  return <ProjectWorkspacePlaceholder />;
}

type SelectedFileWorkspaceProps = {
  imageAssets: ProjectImageAssetOption[];
  node: ProjectFileNode;
  parentFolderName?: string;
};

function SelectedFileWorkspace({
  imageAssets,
  node,
  parentFolderName
}: SelectedFileWorkspaceProps) {
  const childCount = node.type === "folder" ? (node.children ?? []).length : 0;
  const selectedImageAsset = node.imageAsset
    ? getProjectImageAssetOptionById(imageAssets, node.imageAsset.id)
    : undefined;

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

      {selectedImageAsset ? (
        <section
          aria-label={`${node.name} preview`}
          className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-4"
        >
          <img
            alt={node.name}
            className="max-h-full max-w-full rounded-md object-contain shadow-sm"
            src={selectedImageAsset.url}
          />
        </section>
      ) : null}
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
