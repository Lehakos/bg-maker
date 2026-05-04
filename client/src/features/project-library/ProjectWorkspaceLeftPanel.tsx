import type { ProjectFileNode } from "@bg-maker/shared";
import { Boxes, FolderTree, Images, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { ProjectFileTreePanel } from "../project-files/ProjectFileTreePanel";
import { cx } from "../project-workspace/project-workspace-css";
import { AssetBrowserPanel } from "./AssetBrowserPanel";
import { ObjectLibraryPanel } from "./ObjectLibraryPanel";

type WorkspaceLeftPanelTab = "assets" | "explorer" | "objects";

type ProjectWorkspaceLeftPanelProps = {
  className?: string;
  fileTree: ProjectFileNode[];
  projectId: string;
  saveError?: Error | null;
  saving: boolean;
  selectedNodeId: string | null;
  onFileTreeChange: (fileTree: ProjectFileNode[]) => void;
  onSelectNode: (nodeId: string | null) => void;
};

const tabs = [
  { icon: FolderTree, id: "explorer", label: "Explorer" },
  { icon: Boxes, id: "objects", label: "Objects" },
  { icon: Images, id: "assets", label: "Assets" }
] as const satisfies readonly {
  icon: LucideIcon;
  id: WorkspaceLeftPanelTab;
  label: string;
}[];

export function ProjectWorkspaceLeftPanel({
  className,
  fileTree,
  projectId,
  saveError,
  saving,
  selectedNodeId,
  onFileTreeChange,
  onSelectNode
}: ProjectWorkspaceLeftPanelProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceLeftPanelTab>("explorer");

  return (
    <aside
      className={cx(
        "flex min-h-0 flex-col overflow-hidden border-b border-slate-200 bg-white text-slate-700 md:border-b-0 md:border-r",
        className
      )}
    >
      <div className="grid h-10 shrink-0 grid-cols-3 border-b border-slate-200 bg-slate-50 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              aria-pressed={active}
              className={cx(
                "flex min-w-0 items-center justify-center gap-1.5 rounded px-1 text-xs font-semibold transition-colors",
                active
                  ? "bg-white text-sky-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              )}
              title={tab.label}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "explorer" ? (
          <ProjectFileTreePanel
            className="h-full border-0"
            fileTree={fileTree}
            projectId={projectId}
            saveError={saveError}
            saving={saving}
            selectedNodeId={selectedNodeId}
            onFileTreeChange={onFileTreeChange}
            onSelectNode={onSelectNode}
          />
        ) : null}
        {activeTab === "objects" ? (
          <ObjectLibraryPanel
            className="h-full"
            fileTree={fileTree}
            projectId={projectId}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
          />
        ) : null}
        {activeTab === "assets" ? (
          <AssetBrowserPanel
            className="h-full"
            fileTree={fileTree}
            projectId={projectId}
            saving={saving}
            selectedNodeId={selectedNodeId}
            onFileTreeChange={onFileTreeChange}
            onSelectNode={onSelectNode}
          />
        ) : null}
      </div>
    </aside>
  );
}
