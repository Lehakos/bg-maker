import type { Project, ProjectFileNode, ProjectTableSetup } from "@bg-maker/shared";
import { resolveProjectObjectFileObjectTree } from "@bg-maker/shared";
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { getProjectImageAssetOptions } from "../project-assets/project-image-assets";
import { WorkspaceViewport } from "../project-workspace/ProjectWorkspaceViewport";
import type { CompositionSurfaceTarget } from "../project-workspace/CompositionRulerOverlay";
import type { ProjectEditorCommand } from "../project-workspace/project-editor-commands";
import { isSpacePanShortcutTargetBlocked } from "../project-workspace/workspace-keyboard-shortcuts";
import { ProjectPlaytestPanel } from "./ProjectPlaytestPanel";
import {
  getPlaytestSelectedItem,
  type PlaytestAction,
  type PlaytestSession
} from "./project-playtest";

type ProjectPlaytestWorkspaceProps = {
  canRedo: boolean;
  canUndo: boolean;
  contentFileNode: ProjectFileNode;
  fileTree: ProjectFileNode[];
  project: Project;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  session: PlaytestSession;
  tableSetup: ProjectTableSetup;
  onExecutePlaytestAction: (action: PlaytestAction) => void;
  onRedo: () => void;
  onSelectObject: (objectId: string | null) => void;
  onSelectObjects: (objectIds: string[], primaryObjectId?: string | null) => void;
  onStop: () => void;
  onUndo: () => void;
};

export function ProjectPlaytestWorkspace({
  canRedo,
  canUndo,
  contentFileNode,
  fileTree,
  project,
  selectedObjectId,
  selectedObjectIds,
  session,
  tableSetup,
  onExecutePlaytestAction,
  onRedo,
  onSelectObject,
  onSelectObjects,
  onStop,
  onUndo
}: ProjectPlaytestWorkspaceProps) {
  const workspaceRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const spacePanPressedRef = useRef(false);
  const [panState, setPanState] = useState<{
    clientX: number;
    clientY: number;
    pointerId: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const [spacePanPressed, setSpacePanPressed] = useState(false);
  const [actionToolbarPosition, setActionToolbarPosition] = useState<{
    left: number;
    placement: "bottom" | "top";
    top: number;
  } | null>(null);
  const imageAssets = useMemo(
    () => getProjectImageAssetOptions(project.id, fileTree),
    [fileTree, project.id]
  );
  const objectTree = useMemo(
    () => resolveProjectObjectFileObjectTree(fileTree, contentFileNode),
    [contentFileNode, fileTree]
  );
  const selectedItem =
    session.selectedItemIds.length === 1 ? getPlaytestSelectedItem(session) : null;
  const panInteractionActive = spacePanPressed || Boolean(panState);
  const noopExecuteCommand = useCallback((command: ProjectEditorCommand) => {
    void command;
    // Playtest runtime actions are client-local and never write editor commands.
  }, []);
  const handleCompositionSurfaceChange = useCallback((surface: CompositionSurfaceTarget | null) => {
    void surface;
    // The playtest workspace deliberately omits editor composition controls.
  }, []);
  const updateActionToolbarPosition = useCallback(() => {
    if (!selectedItem || !workspaceRef.current || !scrollContainerRef.current) {
      setActionToolbarPosition(null);
      return;
    }

    const selectedElement = [
      ...scrollContainerRef.current.querySelectorAll<HTMLElement>("[data-playtest-item-id]")
    ].find((element) => element.dataset.playtestItemId === selectedItem.id);

    if (!selectedElement) {
      setActionToolbarPosition(null);
      return;
    }

    const workspaceRect = workspaceRef.current.getBoundingClientRect();
    const selectedRect = selectedElement.getBoundingClientRect();
    const selectedCenterX = selectedRect.left + selectedRect.width / 2 - workspaceRect.left;
    const horizontalInset = Math.min(172, workspaceRect.width / 2);
    const clampedLeft = Math.min(
      Math.max(selectedCenterX, horizontalInset),
      Math.max(horizontalInset, workspaceRect.width - horizontalInset)
    );
    const topCandidate = selectedRect.top - workspaceRect.top - 12;
    const placement = topCandidate > 96 ? "top" : "bottom";
    const nextPosition = {
      left: clampedLeft,
      placement,
      top: placement === "top" ? topCandidate : selectedRect.bottom - workspaceRect.top + 12
    } satisfies { left: number; placement: "bottom" | "top"; top: number };

    setActionToolbarPosition((currentPosition) =>
      currentPosition?.left === nextPosition.left &&
      currentPosition.top === nextPosition.top &&
      currentPosition.placement === nextPosition.placement
        ? currentPosition
        : nextPosition
    );
  }, [selectedItem]);

  useLayoutEffect(() => {
    const animationFrame = window.requestAnimationFrame(updateActionToolbarPosition);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [session, selectedItem, updateActionToolbarPosition]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    scrollContainer.addEventListener("scroll", updateActionToolbarPosition, { passive: true });
    window.addEventListener("resize", updateActionToolbarPosition);

    return () => {
      scrollContainer.removeEventListener("scroll", updateActionToolbarPosition);
      window.removeEventListener("resize", updateActionToolbarPosition);
    };
  }, [updateActionToolbarPosition]);

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

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!spacePanPressedRef.current) {
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
    if (panState?.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setPanState(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <main
      ref={workspaceRef}
      className="relative h-[calc(100vh-72px)] min-h-0 w-full overflow-hidden bg-[#152019] text-slate-800"
    >
      <div
        ref={scrollContainerRef}
        aria-label="Playtest canvas"
        className={
          panInteractionActive
            ? "h-full min-h-0 cursor-grab select-none overflow-auto"
            : "h-full min-h-0 select-none overflow-auto"
        }
        role="region"
        style={{
          backgroundColor: "#18241d",
          backgroundImage:
            "linear-gradient(rgba(226, 232, 240, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(226, 232, 240, 0.08) 1px, transparent 1px)",
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
          directObjectMove
          fileTree={fileTree}
          highlightedGuideId={null}
          imageAssets={imageAssets}
          objectTree={objectTree}
          playtestSession={session}
          readOnly={false}
          selectedObjectId={selectedObjectId}
          selectedObjectIds={selectedObjectIds}
          showEditorOverlays={false}
          showInlineObjectControls={false}
          tableSetup={tableSetup}
          onCompositionSurfaceChange={handleCompositionSurfaceChange}
          onExecuteCommand={noopExecuteCommand}
          onExecutePlaytestAction={onExecutePlaytestAction}
          onSelectObject={onSelectObject}
          onSelectObjects={onSelectObjects}
        />
      </div>
      <ProjectPlaytestPanel
        actionToolbarPosition={actionToolbarPosition}
        canRedo={canRedo}
        canUndo={canUndo}
        selectedItem={selectedItem}
        session={session}
        onAction={onExecutePlaytestAction}
        onRedo={onRedo}
        onStop={onStop}
        onUndo={onUndo}
      />
    </main>
  );
}
