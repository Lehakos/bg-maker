import type {
  ProjectFileNode,
  ProjectObjectDie,
  ProjectObjectNode,
  ProjectObjectSide
} from "@bg-maker/shared";
import { normalizeProjectObjectDieActiveFace } from "@bg-maker/shared";
import { Rows3 } from "lucide-react";
import { useMemo } from "react";
import type { ProjectImageAssetOption } from "../project-assets/project-image-assets";
import {
  getProjectObjectTreeWithActiveSides,
  setProjectObjectNodeDie
} from "../project-objects/project-object-tree";
import {
  createSetProjectObjectSideSelectionCommand,
  createUpdateProjectObjectTreeCommand,
  type ProjectEditorCommand
} from "./project-editor-commands";
import { cx } from "./project-workspace-css";
import { getProjectObjectSideSelection } from "./project-object-side-selection";
import { SceneObjectFrame } from "./SceneObjectFrame";
import { useProjectWorkspaceStore } from "./use-project-workspace-store";

type ProjectWorkspaceSceneProps = {
  fileTree: ProjectFileNode[];
  fileNode: ProjectFileNode;
  imageAssets: ProjectImageAssetOption[];
  objectTree: ProjectObjectNode[];
  readOnly?: boolean;
  selectedObjectId: string | null;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

type ObjectSceneSize = "large" | "small";

export function TableLayoutWorkspace({
  fileTree,
  fileNode,
  imageAssets,
  objectTree,
  readOnly = false,
  selectedObjectId,
  onExecuteCommand,
  onSelectObject
}: ProjectWorkspaceSceneProps) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center p-6">
      <section
        aria-label={fileNode.name}
        className="relative h-[min(66vh,620px)] min-h-[320px] w-[min(92%,980px)] overflow-hidden rounded-lg border border-emerald-950/20 bg-[#6f8b70] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_24px_60px_rgba(15,23,42,0.18)]"
      >
        <div className="absolute left-4 top-4 z-10 flex min-w-0 max-w-[calc(100%-2rem)] items-center gap-2 rounded-md border border-white/30 bg-white/20 px-3 py-2 text-white shadow-sm backdrop-blur-sm">
          <Rows3 size={17} />
          <span className="truncate text-sm font-semibold">{fileNode.name}</span>
        </div>

        {objectTree.length > 0 ? (
          <ObjectScene
            key={fileNode.id}
            fileTree={fileTree}
            fileNodeId={fileNode.id}
            imageAssets={imageAssets}
            objectTree={objectTree}
            readOnly={readOnly}
            selectedObjectId={selectedObjectId}
            size="small"
            onExecuteCommand={onExecuteCommand}
            onSelectObject={onSelectObject}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="flex h-28 w-52 items-center justify-center rounded-md border border-white/30 bg-white/10 text-center text-sm font-medium text-white/85">
              Empty table layout
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function ObjectFileWorkspace({
  fileTree,
  fileNode,
  imageAssets,
  objectTree,
  readOnly = false,
  selectedObjectId,
  onExecuteCommand,
  onSelectObject
}: ProjectWorkspaceSceneProps) {
  if (objectTree.length > 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-8">
        <ObjectScene
          key={fileNode.id}
          fileTree={fileTree}
          fileNodeId={fileNode.id}
          imageAssets={imageAssets}
          objectTree={objectTree}
          readOnly={readOnly}
          selectedObjectId={selectedObjectId}
          size="large"
          onExecuteCommand={onExecuteCommand}
          onSelectObject={onSelectObject}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center p-8 text-sm font-medium text-slate-500">
      No object preview
    </div>
  );
}

type ObjectSceneProps = {
  fileTree: ProjectFileNode[];
  fileNodeId: string;
  imageAssets: ProjectImageAssetOption[];
  objectTree: ProjectObjectNode[];
  readOnly: boolean;
  selectedObjectId: string | null;
  size: ObjectSceneSize;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

function ObjectScene({
  fileTree,
  fileNodeId,
  imageAssets,
  objectTree,
  readOnly,
  selectedObjectId,
  size,
  onExecuteCommand,
  onSelectObject
}: ObjectSceneProps) {
  const canvasScale = useProjectWorkspaceStore((state) => state.canvasScale);
  const imageAssetById = useMemo(
    () => new Map(imageAssets.map((imageAsset) => [imageAsset.asset.id, imageAsset])),
    [imageAssets]
  );
  const objectSideSelections = useProjectWorkspaceStore((state) => state.objectSideSelections);
  const viewObjectTree = useMemo(
    () =>
      getProjectObjectTreeWithActiveSides(objectTree, (object) =>
        getProjectObjectSideSelection(objectSideSelections, fileNodeId, object.id)
      ),
    [fileNodeId, objectSideSelections, objectTree]
  );

  function handleObjectSideChange(
    objectId: string,
    activeSide: ProjectObjectSide
  ) {
    const currentSide = getProjectObjectSideSelection(objectSideSelections, fileNodeId, objectId);

    if (currentSide === activeSide) {
      return;
    }

    onExecuteCommand(
      createSetProjectObjectSideSelectionCommand({
        after: activeSide,
        before: currentSide,
        fileNodeId,
        objectId
      })
    );
  }

  function handleDieFaceChange(objectId: string, die: ProjectObjectDie, activeFace: number) {
    const nextActiveFace = normalizeProjectObjectDieActiveFace(activeFace, die.faceCount);

    if (die.activeFace === nextActiveFace) {
      return;
    }

    if (readOnly) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeDie(objectTree, objectId, {
      ...die,
      activeFace: nextActiveFace
    });

    if (nextObjectTree === objectTree) {
      return;
    }

    onExecuteCommand(
      createUpdateProjectObjectTreeCommand({
        after: nextObjectTree,
        before: objectTree,
        fileNodeId,
        label: `Show die face ${nextActiveFace}`
      })
    );
  }

  return (
    <div
      className={cx(
        "relative overflow-visible",
        size === "small" ? "h-full w-full" : "h-[min(70vh,760px)] min-h-[420px] w-[min(92%,960px)]"
      )}
      style={{
        transform: `scale(${canvasScale})`,
        transformOrigin: "center"
      }}
    >
      <WorkspaceAxes />
      {viewObjectTree.map((object, index) => (
        <SceneObjectFrame
          key={object.id}
          fileTree={fileTree}
          fileNodeId={fileNodeId}
          imageAssetById={imageAssetById}
          object={object}
          readOnly={readOnly}
          root
          selectedObjectId={selectedObjectId}
          siblingIndex={index}
          onDieFaceChange={handleDieFaceChange}
          onExecuteCommand={onExecuteCommand}
          onObjectSideChange={handleObjectSideChange}
          onSelectObject={onSelectObject}
        />
      ))}
    </div>
  );
}

function WorkspaceAxes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-visible">
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-sky-600/45 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]" />
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-rose-600/45 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]" />
      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-500/40 bg-white/90 shadow-sm" />
      <span className="absolute left-[calc(50%+8px)] top-[calc(50%+8px)] rounded border border-slate-300 bg-white/85 px-1 py-0.5 text-[10px] font-semibold leading-none tabular-nums text-slate-600 shadow-sm">
        0,0
      </span>
      <span className="absolute right-2 top-[calc(50%+6px)] rounded border border-sky-200 bg-white/85 px-1 py-0.5 text-[10px] font-semibold leading-none text-sky-700 shadow-sm">
        X
      </span>
      <span className="absolute left-[calc(50%+6px)] top-2 rounded border border-rose-200 bg-white/85 px-1 py-0.5 text-[10px] font-semibold leading-none text-rose-700 shadow-sm">
        Y
      </span>
    </div>
  );
}
