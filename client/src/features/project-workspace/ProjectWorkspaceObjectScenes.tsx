import {
  getDefaultProjectTableSetup,
  getProjectTableSetupItemId,
  normalizeProjectObjectDieActiveFace,
  type ProjectFileNode,
  type ProjectObjectDie,
  type ProjectObjectNode,
  type ProjectObjectRectTransform,
  type ProjectObjectSide,
  type ProjectTableSetup
} from "@bg-maker/shared";
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
  createUpdateProjectTableSetupCommand,
  type ProjectEditorCommand
} from "./project-editor-commands";
import { cx } from "./project-workspace-css";
import { getProjectObjectSideSelection } from "./project-object-side-selection";
import { SceneObjectFrame } from "./SceneObjectFrame";
import { useProjectWorkspaceStore } from "./use-project-workspace-store";
import {
  getProjectFileNodeTableSetup,
  getProjectTableSetupResolvedItemObject,
  getProjectTableSetupWithItemTransform
} from "../project-table-setup/project-table-setup";

type ProjectWorkspaceSceneProps = {
  fileTree: ProjectFileNode[];
  fileNode: ProjectFileNode;
  imageAssets: ProjectImageAssetOption[];
  objectTree: ProjectObjectNode[];
  readOnly?: boolean;
  selectedObjectId: string | null;
  tableSetup?: ProjectTableSetup | null;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onSelectObject: (objectId: string | null) => void;
};

type ObjectSceneSize = "large" | "small";

export function TableLayoutWorkspace({
  fileTree,
  fileNode,
  imageAssets,
  readOnly = false,
  selectedObjectId,
  tableSetup: resolvedTableSetup,
  onExecuteCommand,
  onSelectObject
}: ProjectWorkspaceSceneProps) {
  const tableSetup =
    resolvedTableSetup ?? getProjectFileNodeTableSetup(fileNode) ?? getDefaultProjectTableSetup();
  const canvasScale = useProjectWorkspaceStore((state) => state.canvasScale);

  function updateTableSetup(nextTableSetup: ProjectTableSetup, label: string) {
    if (nextTableSetup === tableSetup) {
      return;
    }

    onExecuteCommand(
      createUpdateProjectTableSetupCommand({
        after: nextTableSetup,
        before: tableSetup,
        fileNodeId: fileNode.id,
        label
      })
    );
  }

  function handleTableItemRectTransformChange(
    objectId: string,
    _before: ProjectObjectRectTransform,
    after: ProjectObjectRectTransform,
    label: string
  ) {
    const nextTableSetup = getProjectTableSetupWithItemTransform(tableSetup, objectId, after);

    updateTableSetup(nextTableSetup, label);
  }

  return (
    <div className="h-full min-h-0 overflow-auto">
      <div
        className="box-border flex items-center justify-center p-6"
        style={{
          minHeight: `max(100%, ${tableSetup.height * canvasScale + 48}px)`,
          minWidth: `max(100%, ${tableSetup.width * canvasScale + 48}px)`
        }}
      >
        <div
          className="relative shrink-0"
          style={{
            height: tableSetup.height * canvasScale,
            width: tableSetup.width * canvasScale
          }}
        >
          <section
            aria-label={fileNode.name}
            className="relative shrink-0 overflow-hidden rounded-lg border border-emerald-950/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_24px_60px_rgba(15,23,42,0.18)]"
            style={{
              backgroundColor: tableSetup.backgroundColor,
              height: tableSetup.height,
              transform: `scale(${canvasScale})`,
              transformOrigin: "top left",
              width: tableSetup.width
            }}
            onClick={() => onSelectObject(null)}
          >
            {tableSetup.grid.visible ? (
              <>
                <TableSetupGridOverlay tableSetup={tableSetup} />
                <TableSetupGridSizeGuide tableSetup={tableSetup} />
              </>
            ) : null}
            <div className="absolute left-4 top-4 z-10 flex min-w-0 max-w-[calc(100%-2rem)] items-center gap-2 rounded-md border border-white/30 bg-white/20 px-3 py-2 text-white shadow-sm backdrop-blur-sm">
              <Rows3 size={17} />
              <span className="truncate text-sm font-semibold">{fileNode.name}</span>
              <span className="rounded border border-white/25 bg-white/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {tableSetup.width} x {tableSetup.height}
              </span>
            </div>

            {tableSetup.items.length > 0 ? (
              <TableSetupScene
                fileTree={fileTree}
                fileNodeId={fileNode.id}
                imageAssets={imageAssets}
                readOnly={readOnly}
                selectedObjectId={selectedObjectId}
                tableSetup={tableSetup}
                onExecuteCommand={onExecuteCommand}
                onRectTransformChange={handleTableItemRectTransformChange}
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
      </div>
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

type TableSetupGridOverlayProps = {
  tableSetup: ProjectTableSetup;
};

function TableSetupGridOverlay({ tableSetup }: TableSetupGridOverlayProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
        backgroundPosition: "center center",
        backgroundSize: `${tableSetup.grid.size}px ${tableSetup.grid.size}px`
      }}
    />
  );
}

function TableSetupGridSizeGuide({ tableSetup }: TableSetupGridOverlayProps) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-col gap-1 text-white drop-shadow-sm">
      <span className="w-fit rounded border border-white/25 bg-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums backdrop-blur-sm">
        grid {formatTableGuideNumber(tableSetup.grid.size)}
      </span>
      <span
        aria-hidden
        className="relative block h-2 border-b border-l border-r border-white/85 bg-white/10 shadow-[0_0_0_1px_rgba(15,23,42,0.14)]"
        style={{ width: tableSetup.grid.size }}
      />
    </div>
  );
}

function formatTableGuideNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

type TableSetupSceneProps = {
  fileTree: ProjectFileNode[];
  fileNodeId: string;
  imageAssets: ProjectImageAssetOption[];
  readOnly: boolean;
  selectedObjectId: string | null;
  tableSetup: ProjectTableSetup;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onRectTransformChange: (
    objectId: string,
    before: ProjectObjectRectTransform,
    after: ProjectObjectRectTransform,
    label: string
  ) => void;
  onSelectObject: (objectId: string | null) => void;
};

function TableSetupScene({
  fileTree,
  fileNodeId,
  imageAssets,
  readOnly,
  selectedObjectId,
  tableSetup,
  onExecuteCommand,
  onRectTransformChange,
  onSelectObject
}: TableSetupSceneProps) {
  const imageAssetById = useMemo(
    () => new Map(imageAssets.map((imageAsset) => [imageAsset.asset.id, imageAsset])),
    [imageAssets]
  );
  const objectSideSelections = useProjectWorkspaceStore((state) => state.objectSideSelections);
  const snapSize = tableSetup.grid.snap ? tableSetup.grid.size : null;

  function handleDieFaceChange() {
    // Linked table items follow their source object, and runtime die state is out of scope for MVP.
  }

  function handleObjectSideChange(objectId: string, activeSide: ProjectObjectSide) {
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

  return (
    <div className="absolute inset-0 z-0 overflow-visible">
      <WorkspaceAxes />
      {tableSetup.items.map((item, index) => {
        const itemId = getProjectTableSetupItemId(item);
        const itemObject = getProjectTableSetupResolvedItemObject(fileTree, item);
        const object = itemObject
          ? getProjectObjectTreeWithActiveSides([itemObject], (objectNode) =>
              getProjectObjectSideSelection(objectSideSelections, fileNodeId, objectNode.id)
            )[0]
          : null;

        if (!object) {
          return null;
        }

        return (
          <SceneObjectFrame
            key={object.id}
            fileTree={fileTree}
            fileNodeId={fileNodeId}
            imageAssetById={imageAssetById}
            object={object}
            readOnly={readOnly}
            resizeMode={item.type === "linkedObject" ? "scale" : "size"}
            root
            selectionObjectId={itemId}
            selectedObjectId={selectedObjectId}
            siblingIndex={index}
            snapSize={snapSize}
            stackRootOffset={false}
            onDieFaceChange={handleDieFaceChange}
            onExecuteCommand={onExecuteCommand}
            onObjectSideChange={handleObjectSideChange}
            onRectTransformChange={onRectTransformChange}
            onSelectObject={onSelectObject}
          />
        );
      })}
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

  function handleObjectSideChange(objectId: string, activeSide: ProjectObjectSide) {
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
