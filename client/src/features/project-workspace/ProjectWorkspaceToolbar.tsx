import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole
} from "@floating-ui/react";
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
import { type ReactNode, useState } from "react";
import type { TableSetupPositionPreset } from "../project-table-setup/project-table-setup-geometry";
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
  shortcut: string;
};

type ProjectWorkspaceToolbarProps = {
  activePositionPreset: TableSetupPositionPreset | null;
  activeTool: WorkspaceTool;
  canvasScale: number;
  canAlign: boolean;
  showArrangeControls: boolean;
  canRedo: boolean;
  canUndo: boolean;
  canExport: boolean;
  canPrint: boolean;
  onCanvasScaleChange: (scale: number) => void;
  onExportPng: () => void;
  onPosition: (position: TableSetupPositionPreset) => void;
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
  title?: string;
};

const workspaceTools = [
  { id: "select", label: "Select", shortcut: "V / 1", icon: MousePointer2 },
  { id: "pan", label: "Pan", shortcut: "H / 2", icon: Hand },
  { id: "move", label: "Move", shortcut: "M / 3", icon: Move },
  { id: "rotate", label: "Rotate", shortcut: "R / 4", icon: RotateCw },
  { id: "resize", label: "Resize", shortcut: "S / 5", icon: Maximize2 }
] as const satisfies readonly WorkspaceToolDefinition[];

const positionPresetOptions = [
  { label: "Top left", value: "top-left" },
  { label: "Top center", value: "top-center" },
  { label: "Top right", value: "top-right" },
  { label: "Middle left", value: "middle-left" },
  { label: "Middle center", value: "middle-center" },
  { label: "Middle right", value: "middle-right" },
  { label: "Bottom left", value: "bottom-left" },
  { label: "Bottom center", value: "bottom-center" },
  { label: "Bottom right", value: "bottom-right" }
] as const satisfies readonly {
  label: string;
  value: TableSetupPositionPreset;
}[];

export function ProjectWorkspaceToolbar({
  activePositionPreset,
  activeTool,
  canvasScale,
  canAlign,
  showArrangeControls,
  canRedo,
  canUndo,
  canExport,
  canPrint,
  onCanvasScaleChange,
  onExportPng,
  onPosition,
  onPrintSheets,
  onRedo,
  onToolChange,
  onUndo,
  onZoomToFit
}: ProjectWorkspaceToolbarProps) {
  const [positionMenuOpen, setPositionMenuOpen] = useState(false);
  const effectivePositionMenuOpen = positionMenuOpen && canAlign;
  const positionButtonLabel = activePositionPreset
    ? `Position: ${getPositionPresetLabel(activePositionPreset)}`
    : "Place selected on table";
  const positionButtonActive = effectivePositionMenuOpen || Boolean(activePositionPreset);
  const {
    context: positionMenuContext,
    floatingStyles: positionMenuFloatingStyles,
    refs: { setFloating: setPositionMenuFloating, setReference: setPositionMenuReference }
  } = useFloating({
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    onOpenChange: setPositionMenuOpen,
    open: effectivePositionMenuOpen,
    placement: "bottom-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate
  });
  const positionMenuClick = useClick(positionMenuContext, { enabled: canAlign });
  const positionMenuDismiss = useDismiss(positionMenuContext);
  const positionMenuRole = useRole(positionMenuContext, { role: "menu" });
  const { getFloatingProps: getPositionMenuFloatingProps, getReferenceProps } = useInteractions([
    positionMenuClick,
    positionMenuDismiss,
    positionMenuRole
  ]);

  function selectPosition(position: TableSetupPositionPreset) {
    onPosition(position);
    setPositionMenuOpen(false);
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3">
      <div className="flex items-center gap-1" aria-label="Command history">
        <ToolbarIconButton
          disabled={!canUndo}
          icon={<Undo2 size={17} />}
          label="Undo"
          onClick={onUndo}
        />
        <ToolbarIconButton
          disabled={!canRedo}
          icon={<Redo2 size={17} />}
          label="Redo"
          onClick={onRedo}
        />
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
              title={`${tool.label} (${tool.shortcut})`}
              onClick={() => onToolChange(tool.id)}
            />
          );
        })}
      </nav>
      {showArrangeControls ? (
        <>
          <span className="h-6 w-px bg-slate-200" aria-hidden />
          <div className="flex items-center gap-1" aria-label="Arrange selected items">
            <button
              ref={setPositionMenuReference}
              {...getReferenceProps({
                "aria-expanded": effectivePositionMenuOpen,
                "aria-haspopup": "menu",
                "aria-label": positionButtonLabel,
                className: cx(
                  "flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-100",
                  positionButtonActive
                    ? "border-sky-500 bg-sky-100 text-sky-800 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.18)]"
                    : "border-transparent hover:border-slate-200 hover:bg-white hover:text-slate-950",
                  !canAlign &&
                    "cursor-not-allowed opacity-40 hover:border-transparent hover:bg-transparent"
                ),
                disabled: !canAlign,
                title: positionButtonLabel,
                type: "button"
              })}
            >
              <TablePositionPresetIcon position={activePositionPreset ?? "middle-center"} />
            </button>
            {effectivePositionMenuOpen ? (
              <FloatingPortal>
                <FloatingFocusManager context={positionMenuContext} initialFocus={-1} modal={false}>
                  <div
                    ref={setPositionMenuFloating}
                    style={positionMenuFloatingStyles}
                    {...getPositionMenuFloatingProps({
                      "aria-label": "Position selected item",
                      className:
                        "z-50 rounded-md border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/15 outline-none"
                    })}
                  >
                    <div className="grid grid-cols-3 gap-1">
                      {positionPresetOptions.map((option) => {
                        const active = activePositionPreset === option.value;

                        return (
                          <button
                            key={option.value}
                            aria-checked={active}
                            aria-label={`Place selected at ${option.label.toLowerCase()}`}
                            className={cx(
                              "flex h-8 w-8 items-center justify-center rounded-md border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-100",
                              active
                                ? "border-sky-500 bg-sky-100 text-sky-800"
                                : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                            )}
                            role="menuitemradio"
                            title={`Place selected at ${option.label.toLowerCase()}`}
                            type="button"
                            onClick={() => selectPosition(option.value)}
                          >
                            <TablePositionPresetIcon position={option.value} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </FloatingFocusManager>
              </FloatingPortal>
            ) : null}
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
  onClick,
  title = label
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
      title={title}
      type="button"
      onClick={onClick}
    >
      {Icon}
    </button>
  );
}

function TablePositionPresetIcon({ position }: { position: TableSetupPositionPreset }) {
  const [vertical, horizontal] = position.split("-") as [
    "bottom" | "middle" | "top",
    "center" | "left" | "right"
  ];
  const x = horizontal === "left" ? 5 : horizontal === "center" ? 7.5 : 10;
  const y = vertical === "top" ? 5 : vertical === "middle" ? 7.5 : 10;

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
      <rect fill="currentColor" height="3" rx="0.8" width="3" x={x} y={y} />
    </svg>
  );
}

function getPositionPresetLabel(position: TableSetupPositionPreset) {
  return position
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
