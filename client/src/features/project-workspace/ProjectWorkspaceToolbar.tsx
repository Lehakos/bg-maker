import { type ProjectCompositionGuide, type ProjectCompositionSettings } from "@bg-maker/shared";
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
  Eye,
  EyeOff,
  Hand,
  Lock,
  Maximize2,
  MousePointer2,
  Move,
  Plus,
  Printer,
  Redo2,
  RotateCw,
  Ruler,
  Scan,
  Play,
  Trash2,
  Undo2,
  Unlock,
  ZoomIn,
  ZoomOut,
  type LucideIcon
} from "lucide-react";
import {
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  useEffect,
  useState
} from "react";
import {
  FloatingPanel,
  FormInput,
  IconButton,
  PanelActionButton,
  PanelEmptyState
} from "../../components";
import type { TableSetupPositionPreset } from "../project-table-setup/project-table-setup-geometry";
import {
  getProjectCompositionSettingsWithField,
  getProjectCompositionSettingsWithGuideAdded,
  getProjectCompositionSettingsWithGuideRemoved,
  getProjectCompositionSettingsWithGuideUpdated
} from "./composition-guides";
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
  guideControls?: ProjectWorkspaceGuideControls | null;
  showArrangeControls: boolean;
  canRedo: boolean;
  canUndo: boolean;
  canExport: boolean;
  canPrint: boolean;
  canStartPlaytest: boolean;
  resizeAspectLocked: boolean;
  onCanvasScaleChange: (scale: number) => void;
  onExportPng: () => void;
  onPosition: (position: TableSetupPositionPreset) => void;
  onPrintSheets: () => void;
  onRedo: () => void;
  onResizeAspectLockedChange: (locked: boolean) => void;
  onStartPlaytest: () => void;
  onToolChange: (tool: WorkspaceTool) => void;
  onUndo: () => void;
  onZoomToFit: () => void;
};

type ProjectWorkspaceGuideControls = {
  composition: ProjectCompositionSettings;
  disabled?: boolean;
  onCompositionChange: (composition: ProjectCompositionSettings, label: string) => void;
  onGuideHover: (guideId: string | null) => void;
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
  guideControls = null,
  showArrangeControls,
  canRedo,
  canUndo,
  canExport,
  canPrint,
  canStartPlaytest,
  resizeAspectLocked,
  onCanvasScaleChange,
  onExportPng,
  onPosition,
  onPrintSheets,
  onRedo,
  onResizeAspectLockedChange,
  onStartPlaytest,
  onToolChange,
  onUndo,
  onZoomToFit
}: ProjectWorkspaceToolbarProps) {
  const [positionMenuOpen, setPositionMenuOpen] = useState(false);
  const [guideMenuOpen, setGuideMenuOpen] = useState(false);
  const effectivePositionMenuOpen = positionMenuOpen && canAlign;
  const guideMenuEnabled = Boolean(guideControls) && !guideControls?.disabled;
  const effectiveGuideMenuOpen = guideMenuOpen && guideMenuEnabled;
  const guideCount = guideControls?.composition.guides.length ?? 0;
  const guideButtonActive = effectiveGuideMenuOpen;
  const guideButtonLabel = guideCount ? `Guides: ${guideCount}` : "Guides";
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
  const {
    context: guideMenuContext,
    floatingStyles: guideMenuFloatingStyles,
    refs: { setFloating: setGuideMenuFloating, setReference: setGuideMenuReference }
  } = useFloating({
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    onOpenChange: setGuideMenuOpen,
    open: effectiveGuideMenuOpen,
    placement: "bottom-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate
  });
  const guideMenuClick = useClick(guideMenuContext, { enabled: guideMenuEnabled });
  const guideMenuDismiss = useDismiss(guideMenuContext);
  const guideMenuRole = useRole(guideMenuContext, { role: "menu" });
  const { getFloatingProps: getGuideMenuFloatingProps, getReferenceProps: getGuideReferenceProps } =
    useInteractions([guideMenuClick, guideMenuDismiss, guideMenuRole]);

  function selectPosition(position: TableSetupPositionPreset) {
    onPosition(position);
    setPositionMenuOpen(false);
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3">
      <div className="flex items-center gap-1" aria-label="Command history">
        <ToolbarIconButton disabled={!canUndo} icon={Undo2} label="Undo" onClick={onUndo} />
        <ToolbarIconButton disabled={!canRedo} icon={Redo2} label="Redo" onClick={onRedo} />
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
              icon={Icon}
              label={tool.label}
              title={`${tool.label} (${tool.shortcut})`}
              onClick={() => onToolChange(tool.id)}
            />
          );
        })}
      </nav>
      <ToolbarIconButton
        active={resizeAspectLocked}
        icon={resizeAspectLocked ? Lock : Unlock}
        label="Lock resize aspect ratio"
        title="Lock resize aspect ratio"
        onClick={() => onResizeAspectLockedChange(!resizeAspectLocked)}
      />
      <IconButton
        ref={setGuideMenuReference}
        active={guideButtonActive}
        className="relative"
        disabled={!guideMenuEnabled}
        label={guideButtonLabel}
        title={guideButtonLabel}
        {...getGuideReferenceProps({
          "aria-expanded": effectiveGuideMenuOpen,
          "aria-haspopup": "menu",
          type: "button"
        })}
      >
        <Ruler size={17} />
        {guideCount ? (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-sky-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm"
          >
            {guideCount > 9 ? "9+" : guideCount}
          </span>
        ) : null}
      </IconButton>
      {effectiveGuideMenuOpen && guideControls ? (
        <FloatingPortal>
          <FloatingFocusManager context={guideMenuContext} initialFocus={-1} modal={false}>
            <ProjectWorkspaceGuideMenu
              floatingProps={getGuideMenuFloatingProps({
                "aria-label": "Manage guides",
                className: "z-[120] w-80"
              })}
              floatingRef={setGuideMenuFloating}
              floatingStyle={guideMenuFloatingStyles}
              guideControls={guideControls}
            />
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
      {showArrangeControls ? (
        <>
          <span className="h-6 w-px bg-slate-200" aria-hidden />
          <div className="flex items-center gap-1" aria-label="Arrange selected items">
            <IconButton
              ref={setPositionMenuReference}
              active={positionButtonActive}
              disabled={!canAlign}
              label={positionButtonLabel}
              title={positionButtonLabel}
              {...getReferenceProps({
                "aria-expanded": effectivePositionMenuOpen,
                "aria-haspopup": "menu",
                type: "button"
              })}
            >
              <TablePositionPresetIcon position={activePositionPreset ?? "middle-center"} />
            </IconButton>
            {effectivePositionMenuOpen ? (
              <FloatingPortal>
                <FloatingFocusManager context={positionMenuContext} initialFocus={-1} modal={false}>
                  <div
                    ref={setPositionMenuFloating}
                    style={positionMenuFloatingStyles}
                    {...getPositionMenuFloatingProps({
                      "aria-label": "Position selected item",
                      className: "z-[120] outline-none"
                    })}
                  >
                    <FloatingPanel className="p-1" variant="popover">
                      <div className="grid grid-cols-3 gap-1">
                        {positionPresetOptions.map((option) => {
                          const active = activePositionPreset === option.value;

                          return (
                            <IconButton
                              key={option.value}
                              active={active}
                              aria-checked={active}
                              aria-label={`Place selected at ${option.label.toLowerCase()}`}
                              role="menuitemradio"
                              title={`Place selected at ${option.label.toLowerCase()}`}
                              variant="ghost"
                              onClick={() => selectPosition(option.value)}
                            >
                              <TablePositionPresetIcon position={option.value} />
                            </IconButton>
                          );
                        })}
                      </div>
                    </FloatingPanel>
                  </div>
                </FloatingFocusManager>
              </FloatingPortal>
            ) : null}
          </div>
        </>
      ) : null}
      <span className="h-6 w-px bg-slate-200" aria-hidden />
      <div className="flex items-center gap-1" aria-label="Playtest mode">
        <ToolbarIconButton
          disabled={!canStartPlaytest}
          icon={Play}
          label="Start playtest"
          onClick={onStartPlaytest}
        />
      </div>
      <span className="h-6 w-px bg-slate-200" aria-hidden />
      <div className="flex items-center gap-1" aria-label="Canvas zoom">
        <ToolbarIconButton
          disabled={canvasScale <= minCanvasScale}
          icon={ZoomOut}
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
          icon={ZoomIn}
          label="Zoom in"
          onClick={() => onCanvasScaleChange(normalizeCanvasScale(canvasScale + canvasScaleStep))}
        />
        <ToolbarIconButton icon={Scan} label="Zoom to fit" onClick={onZoomToFit} />
      </div>
      <span className="h-6 w-px bg-slate-200" aria-hidden />
      <div className="flex items-center gap-1" aria-label="Export">
        <ToolbarIconButton
          disabled={!canExport}
          icon={Download}
          label="Export PNG"
          onClick={onExportPng}
        />
        <ToolbarIconButton
          disabled={!canPrint}
          icon={Printer}
          label="Print sheets"
          onClick={onPrintSheets}
        />
      </div>
    </div>
  );
}

type ProjectWorkspaceGuideMenuProps = {
  floatingProps: HTMLAttributes<HTMLDivElement>;
  floatingRef: (node: HTMLDivElement | null) => void;
  floatingStyle: CSSProperties;
  guideControls: ProjectWorkspaceGuideControls;
};

function ProjectWorkspaceGuideMenu({
  floatingProps,
  floatingRef,
  floatingStyle,
  guideControls
}: ProjectWorkspaceGuideMenuProps) {
  const { composition, onCompositionChange, onGuideHover } = guideControls;

  useEffect(() => () => onGuideHover(null), [onGuideHover]);

  function updateBooleanField(fieldKey: "snapToGuides" | "snapToObjects", value: boolean) {
    onCompositionChange(
      getProjectCompositionSettingsWithField(composition, fieldKey, value),
      "Update guides"
    );
  }

  function addGuide(axis: ProjectCompositionGuide["axis"]) {
    onCompositionChange(
      getProjectCompositionSettingsWithGuideAdded(composition, axis, 0),
      "Add guide"
    );
  }

  function updateGuide(
    guide: ProjectCompositionGuide,
    update: Partial<Omit<ProjectCompositionGuide, "id">>,
    label = "Update guide"
  ) {
    onCompositionChange(
      getProjectCompositionSettingsWithGuideUpdated(composition, guide.id, update),
      label
    );
  }

  function deleteGuide(guide: ProjectCompositionGuide) {
    onGuideHover(null);
    onCompositionChange(
      getProjectCompositionSettingsWithGuideRemoved(composition, guide.id),
      "Delete guide"
    );
  }

  function handleGuideRowBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    onGuideHover(null);
  }

  return (
    <div ref={floatingRef} style={floatingStyle} {...floatingProps}>
      <FloatingPanel variant="popover">
        <div className="border-b border-slate-100 px-1 pb-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Guides</p>
            <p className="text-[11px] text-slate-400">{composition.guides.length} total</p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Snap to
            </span>
            <GuideMenuTextToggle
              active={composition.snapToGuides}
              label="Guides"
              title="Snap objects to visible guides and axes"
              onClick={() => updateBooleanField("snapToGuides", !composition.snapToGuides)}
            />
            <GuideMenuTextToggle
              active={composition.snapToObjects}
              label="Objects"
              title="Snap objects to other visible objects"
              onClick={() => updateBooleanField("snapToObjects", !composition.snapToObjects)}
            />
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          <PanelActionButton className="flex-1" size="field" onClick={() => addGuide("vertical")}>
            <Plus size={14} />
            Vertical
          </PanelActionButton>
          <PanelActionButton className="flex-1" size="field" onClick={() => addGuide("horizontal")}>
            <Plus size={14} />
            Horizontal
          </PanelActionButton>
        </div>

        {composition.guides.length ? (
          <div className="mt-2 max-h-72 space-y-1.5 overflow-auto pr-0.5">
            {composition.guides.map((guide) => (
              <div
                key={guide.id}
                className="grid grid-cols-[minmax(0,1fr)_72px_auto_auto_auto] items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 transition-colors hover:border-sky-200 hover:bg-sky-50/70 focus-within:border-sky-300 focus-within:bg-sky-50/70"
                onBlur={handleGuideRowBlur}
                onFocus={() => onGuideHover(guide.id)}
                onMouseEnter={() => onGuideHover(guide.id)}
                onMouseLeave={() => onGuideHover(null)}
              >
                <span className="truncate px-1 text-xs font-semibold text-slate-600">
                  {guide.axis === "vertical" ? "Vertical" : "Horizontal"}
                </span>
                <FormInput
                  className="h-7 rounded px-1.5 text-xs tabular-nums"
                  inputMode="decimal"
                  type="number"
                  value={String(guide.position)}
                  onChange={(event) => {
                    const position = Number(event.currentTarget.value);

                    if (Number.isFinite(position)) {
                      updateGuide(guide, { position });
                    }
                  }}
                />
                <GuideMenuIconButton
                  active={guide.visible}
                  icon={guide.visible ? Eye : EyeOff}
                  label={guide.visible ? "Hide guide" : "Show guide"}
                  onClick={() => updateGuide(guide, { visible: !guide.visible })}
                />
                <GuideMenuIconButton
                  active={guide.locked}
                  icon={guide.locked ? Lock : Unlock}
                  label={guide.locked ? "Unlock guide" : "Lock guide"}
                  onClick={() => updateGuide(guide, { locked: !guide.locked })}
                />
                <GuideMenuIconButton
                  destructive
                  icon={Trash2}
                  label="Delete guide"
                  onClick={() => deleteGuide(guide)}
                />
              </div>
            ))}
          </div>
        ) : (
          <PanelEmptyState className="mt-2 text-slate-400" spacious>
            No guides
          </PanelEmptyState>
        )}
      </FloatingPanel>
    </div>
  );
}

type GuideMenuIconButtonProps = {
  active?: boolean;
  destructive?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

function GuideMenuIconButton({
  active = false,
  destructive = false,
  icon,
  label,
  onClick
}: GuideMenuIconButtonProps) {
  const Icon = icon;

  return (
    <IconButton
      active={active}
      icon={<Icon size={14} />}
      label={label}
      size="sm"
      title={label}
      variant={destructive ? "danger" : "ghost"}
      onClick={onClick}
    />
  );
}

function GuideMenuTextToggle({
  active,
  label,
  title,
  onClick
}: {
  active: boolean;
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <PanelActionButton
      aria-pressed={active}
      active={active}
      size="default"
      title={title}
      onClick={onClick}
    >
      {label}
    </PanelActionButton>
  );
}

function ToolbarIconButton({
  active = false,
  disabled = false,
  icon: Icon,
  label,
  onClick,
  title = label
}: {
  active?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <IconButton
      active={active}
      disabled={disabled}
      icon={<Icon size={17} />}
      label={label}
      title={title}
      onClick={onClick}
    />
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
