import type { Project, ProjectFileNode } from "@bg-maker/shared";
import { resolveProjectObjectFileObjectTree } from "@bg-maker/shared";
import { useMemo } from "react";
import { getProjectImageAssetOptions } from "../project-assets/project-image-assets";
import {
  findProjectFileNode,
  findProjectFileNodeLocation
} from "../project-files/project-file-tree";
import type { ProjectEditorCommand } from "./project-editor-commands";
import { ProjectWorkspaceToolbar } from "./ProjectWorkspaceToolbar";
import { WorkspaceViewport } from "./ProjectWorkspaceViewport";
import { useProjectWorkspaceStore } from "./use-project-workspace-store";

type ProjectWorkspaceAreaProps = {
  canRedo: boolean;
  canUndo: boolean;
  contentFileNode: ProjectFileNode | null;
  fileTree: ProjectFileNode[];
  project: Project;
  selectedNodeId: string | null;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onRedo: () => void;
  selectedObjectId: string | null;
  onSelectObject: (objectId: string | null) => void;
  onUndo: () => void;
};

export function ProjectWorkspaceArea({
  canRedo,
  canUndo,
  contentFileNode,
  fileTree,
  project,
  selectedNodeId,
  onExecuteCommand,
  onRedo,
  selectedObjectId,
  onSelectObject,
  onUndo
}: ProjectWorkspaceAreaProps) {
  const activeTool = useProjectWorkspaceStore((state) => state.activeTool);
  const canvasScale = useProjectWorkspaceStore((state) => state.canvasScale);
  const setActiveTool = useProjectWorkspaceStore((state) => state.setActiveTool);
  const setCanvasScale = useProjectWorkspaceStore((state) => state.setCanvasScale);
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
  const objectTree = useMemo(
    () => resolveProjectObjectFileObjectTree(fileTree, contentFileNode),
    [contentFileNode, fileTree]
  );
  const imageAssets = useMemo(
    () => getProjectImageAssetOptions(project.id, fileTree),
    [fileTree, project.id]
  );

  return (
    <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#eef1ed]">
      <ProjectWorkspaceToolbar
        activeTool={activeTool}
        canvasScale={canvasScale}
        canRedo={canRedo}
        canUndo={canUndo}
        onCanvasScaleChange={setCanvasScale}
        onRedo={onRedo}
        onToolChange={setActiveTool}
        onUndo={onUndo}
      />

      <div
        aria-label="Workspace canvas"
        className="min-h-0 flex-1 overflow-auto"
        role="region"
        style={{
          backgroundColor: "#e7ece6",
          backgroundImage:
            "linear-gradient(rgba(71, 85, 105, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(71, 85, 105, 0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }}
      >
        <WorkspaceViewport
          contentFileNode={contentFileNode}
          fileTree={fileTree}
          imageAssets={imageAssets}
          objectTree={objectTree}
          readOnly={Boolean(contentFileNode?.sourceRef)}
          parentFolderName={parentFolder?.name}
          selectedNode={selectedNode}
          selectedObjectId={selectedObjectId}
          onExecuteCommand={onExecuteCommand}
          onSelectObject={onSelectObject}
        />
      </div>
    </main>
  );
}
