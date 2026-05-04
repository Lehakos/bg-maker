import {
  Download,
  Hand,
  Maximize2,
  MousePointer2,
  Move,
  Printer,
  Redo2,
  RotateCw,
  Scan,
  Undo2,
  ZoomIn,
  ZoomOut,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  TableSetupAlignment,
  TableSetupDistribution
} from "../project-table-setup/project-table-setup-geometry";
import { cx } from "./project-workspace-css";
import {
  canvasScaleStep,
  defaultCanvasScale,
  maxCanvasScale,
  minCanvasScale,
  normalizeCanvasScale,
  type WorkspaceTool
} from "./project-workspace-view-state";

type WorkspaceToolDefinition = {
  icon: LucideIcon;
  id: WorkspaceTool;
  label: string;
};

type ProjectWorkspaceToolbarProps = {
  activeTool: WorkspaceTool;
  canvasScale: number;
  canAlign: boolean;
  canDistribute: boolean;
  showArrangeControls: boolean;
  canRedo: boolean;
  canUndo: boolean;
  canExport: boolean;
  canPrint: boolean;
  onAlign: (alignment: TableSetupAlignment) => void;
  onCanvasScaleChange: (scale: number) => void;
  onDistribute: (direction: TableSetupDistribution) => void;
  onExportPng: () => void;
  onPrintSheets: () => void;
  onRedo: () => void;
  onToolChange: (tool: WorkspaceTool) => void;
  onUndo: () => void;
  onZoomToFit: () => void;
};

type ToolbarIconButtonProps = {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

const workspaceTools = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "pan", label: "Pan", icon: Hand },
  { id: "move", label: "Move", icon: Move },
  { id: "rotate", label: "Rotate", icon: RotateCw },
  { id: "resize", label: "Resize", icon: Maximize2 }
] as const satisfies readonly WorkspaceToolDefinition[];

export function ProjectWorkspaceToolbar({
  activeTool,
  canvasScale,
  canAlign,
  canDistribute,
  showArrangeControls,
  canRedo,
  canUndo,
  canExport,
  canPrint,
  onAlign,
  onCanvasScaleChange,
  onDistribute,
  onExportPng,
  onPrintSheets,
  onRedo,
  onToolChange,
  onUndo,
  onZoomToFit
}: ProjectWorkspaceToolbarProps) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3">
      <div className="flex items-center gap-1" aria-label="Command history">
        <ToolbarIconButton disabled={!canUndo} icon={<Undo2 size={17} />} label="Undo" onClick={onUndo} />
        <ToolbarIconButton disabled={!canRedo} icon={<Redo2 size={17} />} label="Redo" onClick={onRedo} />
      </div>
      <span className="h-6 w-px bg-slate-200" aria-hidden />
      <nav className="flex items-center gap-1" aria-label="Workspace tools">
        {workspaceTools.map((tool) => {
          const Icon = tool.icon;
          const selected = activeTool === tool.id;

          return (
            <ToolbarIconButton
              key={tool.id}
              active={selected}
              icon={<Icon size={17} />}
              label={tool.label}
              onClick={() => onToolChange(tool.id)}
            />
          );
        })}
      </nav>
      {showArrangeControls ? (
        <>
          <span className="h-6 w-px bg-slate-200" aria-hidden />
          <div className="flex items-center gap-1" aria-label="Arrange selected items">
            <ToolbarIconButton
              disabled={!canAlign}
              icon={<TableArrangeIcon kind="align-left" />}
              label="Align selected to table left"
              onClick={() => onAlign("left")}
            />
            <ToolbarIconButton
              disabled={!canAlign}
              icon={<TableArrangeIcon kind="align-center" />}
              label="Align selected to table center"
              onClick={() => onAlign("center")}
            />
            <ToolbarIconButton
              disabled={!canAlign}
              icon={<TableArrangeIcon kind="align-right" />}
              label="Align selected to table right"
              onClick={() => onAlign("right")}
            />
            <ToolbarIconButton
              disabled={!canAlign}
              icon={<TableArrangeIcon kind="align-top" />}
              label="Align selected to table top"
              onClick={() => onAlign("top")}
            />
            <ToolbarIconButton
              disabled={!canAlign}
              icon={<TableArrangeIcon kind="align-middle" />}
              label="Align selected to table middle"
              onClick={() => onAlign("middle")}
            />
            <ToolbarIconButton
              disabled={!canAlign}
              icon={<TableArrangeIcon kind="align-bottom" />}
              label="Align selected to table bottom"
              onClick={() => onAlign("bottom")}
            />
            <ToolbarIconButton
              disabled={!canDistribute}
              icon={<TableArrangeIcon kind="distribute-horizontal" />}
              label="Distribute horizontally"
              onClick={() => onDistribute("horizontal")}
            />
            <ToolbarIconButton
              disabled={!canDistribute}
              icon={<TableArrangeIcon kind="distribute-vertical" />}
              label="Distribute vertically"
              onClick={() => onDistribute("vertical")}
            />
          </div>
        </>
      ) : null}
      <span className="h-6 w-px bg-slate-200" aria-hidden />
      <div className="flex items-center gap-1" aria-label="Canvas zoom">
        <ToolbarIconButton
          disabled={canvasScale <= minCanvasScale}
          icon={<ZoomOut size={17} />}
          label="Zoom out"
          onClick={() => onCanvasScaleChange(normalizeCanvasScale(canvasScale - canvasScaleStep))}
        />
        <button
          className="h-8 min-w-14 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold tabular-nums text-slate-700 hover:border-slate-300 hover:text-slate-950"
          title="Reset zoom"
          type="button"
          onClick={() => onCanvasScaleChange(defaultCanvasScale)}
        >
          {Math.round(canvasScale * 100)}%
        </button>
        <ToolbarIconButton
          disabled={canvasScale >= maxCanvasScale}
          icon={<ZoomIn size={17} />}
          label="Zoom in"
          onClick={() => onCanvasScaleChange(normalizeCanvasScale(canvasScale + canvasScaleStep))}
        />
        <ToolbarIconButton icon={<Scan size={17} />} label="Zoom to fit" onClick={onZoomToFit} />
      </div>
      <span className="h-6 w-px bg-slate-200" aria-hidden />
      <div className="flex items-center gap-1" aria-label="Export">
        <ToolbarIconButton
          disabled={!canExport}
          icon={<Download size={17} />}
          label="Export PNG"
          onClick={onExportPng}
        />
        <ToolbarIconButton
          disabled={!canPrint}
          icon={<Printer size={17} />}
          label="Print sheets"
          onClick={onPrintSheets}
        />
      </div>
    </div>
  );
}

function ToolbarIconButton({
  active = false,
  disabled = false,
  icon: Icon,
  label,
  onClick
}: ToolbarIconButtonProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={active || undefined}
      className={cx(
        "flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 transition-colors",
        active
          ? "border-sky-500 bg-sky-100 text-sky-800 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.18)]"
          : "border-transparent hover:border-slate-200 hover:bg-white hover:text-slate-950",
        disabled && "cursor-not-allowed opacity-40 hover:border-transparent hover:bg-transparent"
      )}
      disabled={disabled}
      title={label}
      type="button"
      onClick={onClick}
    >
      {Icon}
    </button>
  );
}

type TableArrangeIconKind =
  | "align-bottom"
  | "align-center"
  | "align-left"
  | "align-middle"
  | "align-right"
  | "align-top"
  | "distribute-horizontal"
  | "distribute-vertical";

function TableArrangeIcon({ kind }: { kind: TableArrangeIconKind }) {
  return (
    <svg
      aria-hidden
      className="h-[18px] w-[18px]"
      fill="none"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="12"
        rx="1.5"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1.6"
        width="12"
        x="3"
        y="3"
      />
      {getTableArrangeIconMarks(kind)}
    </svg>
  );
}

function getTableArrangeIconMarks(kind: TableArrangeIconKind) {
  if (kind === "align-left") {
    return <rect fill="currentColor" height="7" rx="0.8" width="3" x="5" y="5.5" />;
  }

  if (kind === "align-center") {
    return <rect fill="currentColor" height="7" rx="0.8" width="3" x="7.5" y="5.5" />;
  }

  if (kind === "align-right") {
    return <rect fill="currentColor" height="7" rx="0.8" width="3" x="10" y="5.5" />;
  }

  if (kind === "align-top") {
    return <rect fill="currentColor" height="3" rx="0.8" width="7" x="5.5" y="5" />;
  }

  if (kind === "align-middle") {
    return <rect fill="currentColor" height="3" rx="0.8" width="7" x="5.5" y="7.5" />;
  }

  if (kind === "align-bottom") {
    return <rect fill="currentColor" height="3" rx="0.8" width="7" x="5.5" y="10" />;
  }

  if (kind === "distribute-horizontal") {
    return (
      <>
        <rect fill="currentColor" height="7" rx="0.8" width="2.4" x="5" y="5.5" />
        <rect fill="currentColor" height="7" rx="0.8" width="2.4" x="10.6" y="5.5" />
      </>
    );
  }

  return (
    <>
      <rect fill="currentColor" height="2.4" rx="0.8" width="7" x="5.5" y="5" />
      <rect fill="currentColor" height="2.4" rx="0.8" width="7" x="5.5" y="10.6" />
    </>
  );
}
