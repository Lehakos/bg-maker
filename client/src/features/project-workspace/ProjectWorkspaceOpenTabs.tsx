import type { ProjectFileNode } from "@bg-maker/shared";
import { X } from "lucide-react";
import { findProjectFileNode } from "../project-files/project-file-tree";
import { ProjectFileNodeIcon } from "../project-files/project-file-tree-ui";
import { cx } from "./project-workspace-css";

type ProjectWorkspaceOpenTabsProps = {
  activeNodeId: string | null;
  fileTree: ProjectFileNode[];
  openTabIds: string[];
  onCloseTab: (nodeId: string) => void;
  onOpenTab: (nodeId: string) => void;
};

export function ProjectWorkspaceOpenTabs({
  activeNodeId,
  fileTree,
  openTabIds,
  onCloseTab,
  onOpenTab
}: ProjectWorkspaceOpenTabsProps) {
  const tabs = openTabIds
    .map((nodeId) => findProjectFileNode(fileTree, nodeId))
    .filter(isProjectWorkspaceTabNode);

  if (!tabs.length) {
    return null;
  }

  return (
    <div className="flex h-9 shrink-0 items-end overflow-x-auto bg-slate-100 px-2 pt-1">
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
            <button
              aria-label={`Close ${tab.name}`}
              className="mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-900"
              type="button"
              title="Close tab"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onCloseTab(tab.id);
              }}
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function isProjectWorkspaceTabNode(
  node: ProjectFileNode | undefined
): node is ProjectFileNode & { kind: "object" | "tableSetup"; type: "file" } {
  return node?.type === "file" && (node.kind === "object" || node.kind === "tableSetup");
}
