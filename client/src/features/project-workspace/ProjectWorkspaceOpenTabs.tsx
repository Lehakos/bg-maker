import type { ProjectFileNode } from "@bg-maker/shared";
import { CopyX, Ellipsis, PanelRightClose, PanelTopClose, X } from "lucide-react";
import { type MouseEvent, type PointerEvent, useState } from "react";
import { ContextMenu, type ContextMenuAction } from "../../components/ContextMenu";
import { IconButton } from "../../components/IconButton";
import { TreeIconButton } from "../../components/TreeControls";
import { findProjectFileNode } from "../project-files/project-file-tree";
import { ProjectFileNodeIcon } from "../project-files/project-file-tree-ui";
import { cx } from "./project-workspace-css";

const openTabsScrollbarContextFallbackHeight = 12;

type ProjectWorkspaceOpenTabsProps = {
  activeNodeId: string | null;
  fileTree: ProjectFileNode[];
  openTabIds: string[];
  onCloseAllTabs: () => void;
  onCloseOtherTabs: (nodeId: string) => void;
  onCloseTab: (nodeId: string) => void;
  onCloseTabsToRight: (nodeId: string) => void;
  onOpenTab: (nodeId: string) => void;
};

type OpenTabsContextMenuState = {
  nodeId: string | null;
  x: number;
  y: number;
};

export function ProjectWorkspaceOpenTabs({
  activeNodeId,
  fileTree,
  openTabIds,
  onCloseAllTabs,
  onCloseOtherTabs,
  onCloseTab,
  onCloseTabsToRight,
  onOpenTab
}: ProjectWorkspaceOpenTabsProps) {
  const [contextMenu, setContextMenu] = useState<OpenTabsContextMenuState | null>(null);
  const tabs = openTabIds
    .map((nodeId) => findProjectFileNode(fileTree, nodeId))
    .filter(isProjectWorkspaceTabNode);
  const contextMenuTab = contextMenu?.nodeId
    ? (tabs.find((tab) => tab.id === contextMenu.nodeId) ?? null)
    : null;
  const contextMenuTabIndex = contextMenuTab
    ? tabs.findIndex((tab) => tab.id === contextMenuTab.id)
    : -1;
  const activeTab = activeNodeId ? (tabs.find((tab) => tab.id === activeNodeId) ?? null) : null;
  const contextMenuActions = createOpenTabsContextMenuActions({
    canCloseAll: tabs.length > 0,
    canCloseOthers: Boolean(contextMenuTab && tabs.length > 1),
    canCloseTabsToRight: contextMenuTabIndex >= 0 && contextMenuTabIndex < tabs.length - 1,
    targetTabId: contextMenuTab?.id ?? null,
    onCloseAllTabs,
    onCloseOtherTabs,
    onCloseTab,
    onCloseTabsToRight
  });

  function openContextMenu(event: MouseEvent | PointerEvent, nodeId: string | null) {
    event.preventDefault();
    event.stopPropagation();

    setContextMenu({
      nodeId,
      x: event.clientX,
      y: event.clientY
    });
  }

  function handleTabsStripPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 2 || !isScrollbarFallbackPointerEvent(event)) {
      return;
    }

    openContextMenu(event, null);
  }

  if (!tabs.length) {
    return null;
  }

  return (
    <>
      <div className="flex h-9 shrink-0 bg-slate-100">
        <div
          className="flex min-w-0 flex-1 items-end overflow-x-auto px-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onContextMenu={(event) => openContextMenu(event, null)}
          onPointerDownCapture={handleTabsStripPointerDown}
        >
          {tabs.map((tab) => {
            const active = activeNodeId === tab.id;

            return (
              <div
                key={tab.id}
                className={cx(
                  "group flex h-8 max-w-56 shrink-0 items-center rounded-t-md border text-xs font-semibold transition-colors",
                  active
                    ? "relative z-10 -mb-px border-slate-200 border-b-slate-50 bg-slate-50 text-slate-950 shadow-[0_-1px_0_rgba(255,255,255,0.7)]"
                    : "border-slate-300/75 bg-slate-200/70 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800"
                )}
                onContextMenu={(event) => openContextMenu(event, tab.id)}
              >
                <button
                  className="flex h-full min-w-0 flex-1 items-center gap-1.5 px-2 text-left"
                  title={tab.name}
                  type="button"
                  onClick={() => onOpenTab(tab.id)}
                >
                  <ProjectFileNodeIcon
                    className={cx("shrink-0", active ? "text-slate-700" : "text-slate-500")}
                    node={tab}
                    size={14}
                  />
                  <span className="min-w-0 truncate">{tab.name}</span>
                </button>
                <TreeIconButton
                  aria-label={`Close ${tab.name}`}
                  className="mr-1"
                  size="xs"
                  title="Close tab"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                >
                  <X size={13} />
                </TreeIconButton>
              </div>
            );
          })}
        </div>
        <IconButton
          className="mx-1 my-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-200 bg-white/70 text-slate-500 shadow-sm shadow-slate-900/5 hover:bg-white hover:text-slate-900"
          icon={<Ellipsis size={15} />}
          label="Open tab actions"
          title="Tab actions"
          variant="neutral"
          onClick={(event) => openContextMenu(event, activeTab?.id ?? null)}
          onContextMenu={(event) => openContextMenu(event, activeTab?.id ?? null)}
        />
      </div>

      <ContextMenu
        actions={contextMenuActions}
        ariaLabel="Open tabs context menu"
        open={Boolean(contextMenu)}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        onOpenChange={(open) => {
          if (!open) {
            setContextMenu(null);
          }
        }}
      />
    </>
  );
}

function createOpenTabsContextMenuActions({
  canCloseAll,
  canCloseOthers,
  canCloseTabsToRight,
  targetTabId,
  onCloseAllTabs,
  onCloseOtherTabs,
  onCloseTab,
  onCloseTabsToRight
}: {
  canCloseAll: boolean;
  canCloseOthers: boolean;
  canCloseTabsToRight: boolean;
  targetTabId: string | null;
  onCloseAllTabs: () => void;
  onCloseOtherTabs: (nodeId: string) => void;
  onCloseTab: (nodeId: string) => void;
  onCloseTabsToRight: (nodeId: string) => void;
}): ContextMenuAction[] {
  const closeAllTabsAction: ContextMenuAction = {
    id: "close-all-tabs",
    label: "Close all tabs",
    icon: <PanelTopClose size={14} />,
    disabled: !canCloseAll,
    onSelect: onCloseAllTabs
  };

  if (!targetTabId) {
    return [closeAllTabsAction];
  }

  return [
    {
      id: "close-tab",
      label: "Close tab",
      icon: <X size={14} />,
      onSelect: () => onCloseTab(targetTabId)
    },
    {
      id: "close-tabs-to-right",
      label: "Close tabs to the right",
      icon: <PanelRightClose size={14} />,
      disabled: !canCloseTabsToRight,
      onSelect: () => onCloseTabsToRight(targetTabId)
    },
    {
      id: "close-other-tabs",
      label: "Close other tabs",
      icon: <CopyX size={14} />,
      disabled: !canCloseOthers,
      onSelect: () => onCloseOtherTabs(targetTabId)
    },
    { ...closeAllTabsAction, separatorBefore: true }
  ];
}

function isScrollbarFallbackPointerEvent(event: PointerEvent<HTMLDivElement>) {
  if (event.target !== event.currentTarget) {
    return false;
  }

  const bounds = event.currentTarget.getBoundingClientRect();

  return bounds.bottom - event.clientY <= openTabsScrollbarContextFallbackHeight;
}

function isProjectWorkspaceTabNode(
  node: ProjectFileNode | undefined
): node is ProjectFileNode & { kind: "object" | "tableSetup"; type: "file" } {
  return node?.type === "file" && (node.kind === "object" || node.kind === "tableSetup");
}
