import type {
  Project,
  ProjectCompositionSettings,
  ProjectFileNode,
  ProjectTableSetup
} from "@bg-maker/shared";
import { resolveProjectObjectFileObjectTree } from "@bg-maker/shared";
import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProjectImageAssetOptions } from "../project-assets/project-image-assets";
import {
  findProjectFileNode,
  findProjectFileNodeLocation
} from "../project-files/project-file-tree";
import {
  createUpdateProjectObjectTreeCommand,
  createUpdateProjectTableSetupCommand,
  type ProjectEditorCommand
} from "./project-editor-commands";
import { ProjectWorkspaceOpenTabs } from "./ProjectWorkspaceOpenTabs";
import { ProjectWorkspaceToolbar } from "./ProjectWorkspaceToolbar";
import { WorkspaceViewport } from "./ProjectWorkspaceViewport";
import { CompositionRulerOverlay, type CompositionSurfaceTarget } from "./CompositionRulerOverlay";
import { useProjectWorkspaceStore } from "./use-project-workspace-store";
import {
  getTableSetupPositionPreset,
  type TableSetupPositionPreset
} from "../project-table-setup/project-table-setup-geometry";
import {
  getProjectObjectNodeComposition,
  setProjectObjectNodeComposition
} from "../project-objects/project-object-tree";
import { getProjectCompositionSettings } from "./composition-guides";
import { isSpacePanShortcutTargetBlocked } from "./workspace-keyboard-shortcuts";

type ProjectWorkspaceAreaProps = {
  canRedo: boolean;
  canUndo: boolean;
  contentFileNode: ProjectFileNode | null;
  fileTree: ProjectFileNode[];
  openTabIds: string[];
  project: Project;
  selectedNodeId: string | null;
  tableSetup: ProjectTableSetup | null;
  onExecuteCommand: (command: ProjectEditorCommand) => void;
  onCloseAllTabs: () => void;
  onCloseOtherTabs: (nodeId: string) => void;
  onCloseTab: (nodeId: string) => void;
  onCloseTabsToRight: (nodeId: string) => void;
  onOpenTab: (nodeId: string) => void;
  onRedo: () => void;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  canAlign: boolean;
  showArrangeControls: boolean;
  canExport: boolean;
  canPrint: boolean;
  canStartPlaytest: boolean;
  onPosition: (position: TableSetupPositionPreset) => void;
  onExportPng: () => void;
  onObjectContextMenu?: (objectId: string, clientX: number, clientY: number) => void;
  onPrintSheets: () => void;
  onSelectObject: (objectId: string | null) => void;
  onSelectObjects: (objectIds: string[], primaryObjectId?: string | null) => void;
  onStartPlaytest: () => void;
  onUndo: () => void;
};

export function ProjectWorkspaceArea({
  canRedo,
  canUndo,
  contentFileNode,
  fileTree,
  openTabIds,
  project,
  selectedNodeId,
  tableSetup,
  onExecuteCommand,
  onCloseAllTabs,
  onCloseOtherTabs,
  onCloseTab,
  onCloseTabsToRight,
  onOpenTab,
  onRedo,
  selectedObjectId,
  selectedObjectIds,
  canAlign,
  showArrangeControls,
  canExport,
  canPrint,
  canStartPlaytest,
  onPosition,
  onExportPng,
  onObjectContextMenu,
  onPrintSheets,
  onSelectObject,
  onSelectObjects,
  onStartPlaytest,
  onUndo
}: ProjectWorkspaceAreaProps) {
  const activeTool = useProjectWorkspaceStore((state) => state.activeTool);
  const canvasScale = useProjectWorkspaceStore((state) => state.canvasScale);
  const resizeAspectLocked = useProjectWorkspaceStore((state) => state.resizeAspectLocked);
  const setActiveTool = useProjectWorkspaceStore((state) => state.setActiveTool);
  const setCanvasScale = useProjectWorkspaceStore((state) => state.setCanvasScale);
  const setResizeAspectLocked = useProjectWorkspaceStore((state) => state.setResizeAspectLocked);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const spacePanPressedRef = useRef(false);
  const [compositionSurface, setCompositionSurface] = useState<CompositionSurfaceTarget | null>(
    null
  );
  const [highlightedGuideId, setHighlightedGuideId] = useState<string | null>(null);
  const [panState, setPanState] = useState<{
    clientX: number;
    clientY: number;
    pointerId: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const [spacePanPressed, setSpacePanPressed] = useState(false);
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
  const activePositionPreset = useMemo(
    () =>
      tableSetup
        ? getTableSetupPositionPreset({
            fileTree,
            itemIds: selectedObjectIds,
            tableSetup
          })
        : null,
    [fileTree, selectedObjectIds, tableSetup]
  );
  const guideComposition = useMemo(() => {
    if (contentFileNode?.kind === "tableSetup" && tableSetup) {
      return getProjectCompositionSettings(tableSetup.composition);
    }

    if (contentFileNode?.kind === "object" && objectTree[0]) {
      return getProjectCompositionSettings(getProjectObjectNodeComposition(objectTree[0]));
    }

    return null;
  }, [contentFileNode, objectTree, tableSetup]);
  const effectiveHighlightedGuideId =
    highlightedGuideId && guideComposition?.guides.some((guide) => guide.id === highlightedGuideId)
      ? highlightedGuideId
      : null;
  const panInteractionActive = activeTool === "pan" || spacePanPressed || Boolean(panState);
  const readOnly = Boolean(contentFileNode?.sourceRef);
  const handleCompositionSurfaceChange = useCallback((surface: CompositionSurfaceTarget | null) => {
    setCompositionSurface((currentSurface) =>
      currentSurface?.element === surface?.element &&
      currentSurface?.height === surface?.height &&
      currentSurface?.width === surface?.width
        ? currentSurface
        : surface
    );
  }, []);

  useEffect(() => {
    function setSpacePanPressedState(pressed: boolean) {
      spacePanPressedRef.current = pressed;
      setSpacePanPressed(pressed);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.code !== "Space" ||
        isSpacePanShortcutTargetBlocked(event.target, scrollContainerRef.current)
      ) {
        return;
      }

      event.preventDefault();

      if (!event.repeat) {
        setSpacePanPressedState(true);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        setSpacePanPressedState(false);
      }
    }

    function handleBlur() {
      setSpacePanPressedState(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  function handleZoomToFit() {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const contentSize =
      contentFileNode?.kind === "tableSetup" && tableSetup
        ? { height: tableSetup.height, width: tableSetup.width }
        : getObjectTreeApproximateSize(objectTree);

    if (!contentSize) {
      return;
    }

    const padding = 96;
    const scale = Math.min(
      6,
      Math.max(
        0.5,
        Math.min(
          (scrollContainer.clientWidth - padding) / contentSize.width,
          (scrollContainer.clientHeight - padding) / contentSize.height
        )
      )
    );

    setCanvasScale(scale);
    window.setTimeout(() => {
      scrollContainer.scrollTo({
        left: Math.max(0, (contentSize.width * scale - scrollContainer.clientWidth) / 2),
        top: Math.max(0, (contentSize.height * scale - scrollContainer.clientHeight) / 2)
      });
    }, 0);
  }

  function handleCompositionChange(nextComposition: ProjectCompositionSettings, label: string) {
    if (contentFileNode?.kind === "tableSetup" && tableSetup) {
      const nextTableSetup = {
        ...tableSetup,
        composition: nextComposition
      };

      if (nextTableSetup === tableSetup) {
        return;
      }

      onExecuteCommand(
        createUpdateProjectTableSetupCommand({
          after: nextTableSetup,
          before: tableSetup,
          fileNodeId: contentFileNode.id,
          label
        })
      );
      return;
    }

    if (contentFileNode?.kind === "object" && objectTree[0]) {
      const nextObjectTree = setProjectObjectNodeComposition(
        objectTree,
        objectTree[0].id,
        nextComposition
      );

      if (nextObjectTree === objectTree) {
        return;
      }

      onExecuteCommand(
        createUpdateProjectObjectTreeCommand({
          after: nextObjectTree,
          before: objectTree,
          fileNodeId: contentFileNode.id,
          label
        })
      );
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (activeTool !== "pan" && !spacePanPressedRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanState({
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!panState || panState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.scrollLeft = panState.scrollLeft - (event.clientX - panState.clientX);
    event.currentTarget.scrollTop = panState.scrollTop - (event.clientY - panState.clientY);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (panState?.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      setPanState(null);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#eef1ed]">
      <ProjectWorkspaceOpenTabs
        activeNodeId={selectedNodeId}
        fileTree={fileTree}
        openTabIds={openTabIds}
        onCloseAllTabs={onCloseAllTabs}
        onCloseOtherTabs={onCloseOtherTabs}
        onCloseTab={onCloseTab}
        onCloseTabsToRight={onCloseTabsToRight}
        onOpenTab={onOpenTab}
      />
      <ProjectWorkspaceToolbar
        activeTool={activeTool}
        canvasScale={canvasScale}
        canAlign={canAlign}
        showArrangeControls={showArrangeControls}
        canRedo={canRedo}
        canUndo={canUndo}
        canExport={canExport}
        canPrint={canPrint}
        canStartPlaytest={canStartPlaytest}
        guideControls={
          guideComposition
            ? {
                composition: guideComposition,
                disabled: readOnly,
                onCompositionChange: handleCompositionChange,
                onGuideHover: setHighlightedGuideId
              }
            : null
        }
        resizeAspectLocked={resizeAspectLocked}
        activePositionPreset={activePositionPreset}
        onCanvasScaleChange={setCanvasScale}
        onExportPng={onExportPng}
        onPosition={onPosition}
        onPrintSheets={onPrintSheets}
        onRedo={onRedo}
        onResizeAspectLockedChange={setResizeAspectLocked}
        onStartPlaytest={onStartPlaytest}
        onToolChange={setActiveTool}
        onUndo={onUndo}
        onZoomToFit={handleZoomToFit}
      />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={scrollContainerRef}
          aria-label="Workspace canvas"
          className={
            panInteractionActive
              ? "h-full min-h-0 cursor-grab select-none overflow-auto"
              : "h-full min-h-0 select-none overflow-auto"
          }
          role="region"
          style={{
            backgroundColor: "#e7ece6",
            backgroundImage:
              "linear-gradient(rgba(71, 85, 105, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(71, 85, 105, 0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px"
          }}
          onPointerCancelCapture={() => setPanState(null)}
          onPointerDownCapture={handlePointerDown}
          onPointerMoveCapture={handlePointerMove}
          onPointerUpCapture={handlePointerUp}
          tabIndex={-1}
        >
          <WorkspaceViewport
            contentFileNode={contentFileNode}
            fileTree={fileTree}
            highlightedGuideId={effectiveHighlightedGuideId}
            imageAssets={imageAssets}
            objectTree={objectTree}
            readOnly={readOnly}
            parentFolderName={parentFolder?.name}
            selectedNode={selectedNode}
            selectedObjectId={selectedObjectId}
            selectedObjectIds={selectedObjectIds}
            tableSetup={tableSetup}
            onExecuteCommand={onExecuteCommand}
            onCompositionSurfaceChange={handleCompositionSurfaceChange}
            onObjectContextMenu={onObjectContextMenu}
            onSelectObject={onSelectObject}
            onSelectObjects={onSelectObjects}
          />
        </div>
        {guideComposition ? (
          <CompositionRulerOverlay
            canvasScale={canvasScale}
            composition={guideComposition}
            disabled={readOnly}
            scrollContainerRef={scrollContainerRef}
            surface={compositionSurface}
            onCompositionChange={handleCompositionChange}
          />
        ) : null}
      </div>
    </main>
  );
}


function getObjectTreeApproximateSize(
  objectTree: ReturnType<typeof resolveProjectObjectFileObjectTree>
) {
  if (!objectTree.length) {
    return null;
  }

  return {
    height: 760,
    width: 960
  };
}
