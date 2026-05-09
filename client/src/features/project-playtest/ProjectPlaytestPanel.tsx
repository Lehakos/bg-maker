import { hasProjectObjectSides } from "@bg-maker/shared";
import {
  Dices,
  Eye,
  EyeOff,
  History,
  Minus,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Shuffle,
  Square,
  Undo2
} from "lucide-react";
import { type PointerEvent, type ReactNode, useRef, useState } from "react";
import {
  getProjectObjectNodeCounter,
  getProjectObjectNodeDie,
  getProjectObjectNodeScoreTrack
} from "../project-objects/project-object-tree";
import {
  getPlaytestCommandTargetName,
  type PlaytestAction,
  type PlaytestCommandPreviewRequest,
  type PlaytestItem,
  type PlaytestSession
} from "./project-playtest";

type ProjectPlaytestPanelProps = {
  actionToolbarPosition: {
    left: number;
    placement: "bottom" | "top";
    top: number;
  } | null;
  className?: string;
  canRedo: boolean;
  canUndo: boolean;
  session: PlaytestSession | null;
  selectedItem: PlaytestItem | null;
  onAction: (action: PlaytestAction) => void;
  onCommandPreviewChange?: (preview: PlaytestCommandPreviewRequest | null) => void;
  onRedo: () => void;
  onStop: () => void;
  onUndo: () => void;
};

export function ProjectPlaytestPanel({
  actionToolbarPosition,
  className = "",
  canRedo,
  canUndo,
  session,
  selectedItem,
  onAction,
  onCommandPreviewChange,
  onRedo,
  onStop,
  onUndo
}: ProjectPlaytestPanelProps) {
  const selectedObject = selectedItem?.baseObject ?? null;
  const selectedIsContainer = Boolean(selectedObject?.components?.container);
  const selectedIsCounter = selectedObject?.kind === "counter";
  const selectedIsDie = selectedObject?.kind === "die";
  const selectedIsScoreTrack = selectedObject?.kind === "scoreTrack";
  const selectedCanFlip = selectedObject ? hasProjectObjectSides(selectedObject.kind) : false;
  const selectedCounter =
    selectedIsCounter && selectedObject ? getProjectObjectNodeCounter(selectedObject) : null;
  const selectedDie =
    selectedIsDie && selectedObject ? getProjectObjectNodeDie(selectedObject) : null;
  const selectedScoreTrack =
    selectedIsScoreTrack && selectedObject ? getProjectObjectNodeScoreTrack(selectedObject) : null;
  const selectedScoreTrackMarkers =
    selectedItem?.scoreTrackMarkers ?? selectedScoreTrack?.markers ?? [];
  const selectedInteractable = selectedItem?.behavior.interaction?.interactableInPlaytest !== false;
  const selectedRotatable = selectedItem?.behavior.rotation?.rotatableInPlaytest !== false;
  const selectedRotationStep = selectedItem?.behavior.rotation?.rotationStep ?? 90;
  const selectedCount = selectedItem?.contents.length ?? 0;
  const [historyPosition, setHistoryPosition] = useState({ x: 12, y: 84 });
  const historyDragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const actionButtons =
    selectedItem && selectedObject && session
      ? getAvailablePlaytestActions({
          onAction,
          selectedCanFlip,
          selectedCount,
          selectedCommands: selectedItem.behavior.commands ?? [],
          selectedIsContainer,
          selectedIsCounter,
          selectedIsDie,
          selectedRotatable,
          selectedRotationStep,
          selectedInteractable,
          selectedItem,
          selectedObjectKind: selectedObject.kind,
          session
        })
      : [];

  function handleHistoryPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    historyDragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: historyPosition.x,
      startY: historyPosition.y
    };
  }

  function handleHistoryPointerMove(event: PointerEvent<HTMLElement>) {
    const dragState = historyDragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const overlay = event.currentTarget.closest<HTMLElement>("[data-playtest-overlay-root='true']");
    const overlayWidth = overlay?.clientWidth ?? window.innerWidth;
    const overlayHeight = overlay?.clientHeight ?? window.innerHeight;
    const nextX = dragState.startX + event.clientX - dragState.startClientX;
    const nextY = dragState.startY + event.clientY - dragState.startClientY;

    setHistoryPosition({
      x: clamp(nextX, 8, Math.max(8, overlayWidth - 280)),
      y: clamp(nextY, 8, Math.max(8, overlayHeight - 96))
    });
  }

  function handleHistoryPointerEnd(event: PointerEvent<HTMLElement>) {
    const dragState = historyDragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    historyDragRef.current = null;
  }

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[110] ${className}`}
      data-export-exclude="true"
      data-playtest-overlay-root="true"
    >
      <div className="pointer-events-auto absolute right-3 top-3 flex max-w-[calc(100%-24px)] items-center gap-2 rounded-md border border-slate-900/15 bg-white/95 px-2 py-2 shadow-xl shadow-slate-900/15 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
            <Play size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-normal text-emerald-700">
              Playtest mode
            </p>
            <h2 className="truncate text-sm font-semibold text-slate-950">
              {session?.tableSetupName ?? "No session"}
            </h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <PlaytestIconButton
            disabled={!canUndo}
            icon={<Undo2 size={15} />}
            label="Undo"
            onClick={onUndo}
          />
          <PlaytestIconButton
            disabled={!canRedo}
            icon={<Redo2 size={15} />}
            label="Redo"
            onClick={onRedo}
          />
          <PlaytestIconButton
            destructive
            icon={<Square size={15} />}
            label="Stop playtest"
            onClick={onStop}
          />
        </div>
      </div>

      {selectedItem && actionToolbarPosition ? (
        <section
          className="pointer-events-auto absolute flex max-w-[calc(100%-24px)] flex-wrap items-center gap-3 rounded-md border border-slate-900/15 bg-white/95 p-2 shadow-xl shadow-slate-900/20 backdrop-blur"
          style={{
            left: actionToolbarPosition.left,
            top: actionToolbarPosition.top,
            transform:
              actionToolbarPosition.placement === "top"
                ? "translate(-50%, -100%)"
                : "translate(-50%, 0)"
          }}
        >
          <div className="min-w-40 max-w-60 px-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-slate-950">{selectedItem.name}</p>
              <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-normal text-slate-500">
                {selectedItem.baseObject.kind}
              </span>
            </div>
            {selectedIsContainer ? (
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {selectedCount} item{selectedCount === 1 ? "" : "s"} inside
              </p>
            ) : selectedCounter ? (
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Value {selectedItem.counterValue ?? selectedCounter.defaultValue}
              </p>
            ) : selectedDie ? (
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Face {selectedItem.dieFace ?? selectedDie.activeFace} / {selectedDie.faceCount}
              </p>
            ) : selectedScoreTrack ? (
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {selectedScoreTrackMarkers.length} marker
                {selectedScoreTrackMarkers.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actionButtons.map((action, index) => (
              <PlaytestActionButton
                key={`${action.title}:${index}`}
                compact={action.compact}
                displayLabel={action.displayLabel}
                icon={action.icon}
                label={action.label}
                subtitle={action.subtitle}
                title={action.title}
                onPreviewEnd={
                  action.preview ? () => onCommandPreviewChange?.(null) : undefined
                }
                onPreviewStart={
                  action.preview
                    ? () => onCommandPreviewChange?.(action.preview ?? null)
                    : undefined
                }
                onClick={action.onClick}
              />
            ))}
            {selectedItem && selectedScoreTrack && selectedInteractable ? (
              <ScoreTrackMarkerControls
                itemId={selectedItem.id}
                markers={selectedScoreTrackMarkers}
                onAction={onAction}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      <section
        aria-label="Playtest action history"
        className="pointer-events-auto absolute w-[min(360px,calc(100%-24px))] rounded-md border border-slate-900/15 bg-white/95 p-3 shadow-xl shadow-slate-900/15 backdrop-blur"
        role="region"
        style={{ left: historyPosition.x, top: historyPosition.y }}
      >
        <div
          className="mb-3 flex cursor-grab items-center gap-2 text-xs font-bold uppercase tracking-normal text-slate-500 active:cursor-grabbing"
          onPointerCancel={handleHistoryPointerEnd}
          onPointerDown={handleHistoryPointerDown}
          onPointerMove={handleHistoryPointerMove}
          onPointerUp={handleHistoryPointerEnd}
        >
          <History size={16} />
          Action history
        </div>
        {session?.actionLog.length ? (
          <ol className="max-h-96 space-y-2 overflow-auto pr-1">
            {session.actionLog
              .slice()
              .reverse()
              .slice(0, 8)
              .map((entry) => (
                <li
                  key={entry.id}
                  className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                >
                  <span className="block truncate font-semibold text-slate-800">{entry.label}</span>
                  <time className="mt-1 block text-xs font-medium text-slate-400">
                    {formatPlaytestActionTime(entry.createdAt)}
                  </time>
                </li>
              ))}
          </ol>
        ) : (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs font-medium text-slate-500">
            No actions yet
          </div>
        )}
      </section>
    </div>
  );
}

function PlaytestActionButton({
  compact = false,
  displayLabel,
  icon,
  label,
  subtitle,
  title = label,
  onPreviewEnd,
  onPreviewStart,
  onClick
}: {
  compact?: boolean;
  displayLabel?: string;
  icon: ReactNode;
  label: string;
  subtitle?: string;
  title?: string;
  onPreviewEnd?: () => void;
  onPreviewStart?: () => void;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={title}
      className={`flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 ${subtitle && !compact ? "h-12" : "h-10"} ${compact ? "w-11 min-w-0 px-0 text-base" : "min-w-20"}`}
      title={title}
      type="button"
      onBlur={onPreviewEnd}
      onClick={() => {
        onPreviewEnd?.();
        onClick();
      }}
      onFocus={onPreviewStart}
      onPointerCancel={onPreviewEnd}
      onPointerEnter={onPreviewStart}
      onPointerLeave={onPreviewEnd}
    >
      {icon}
      <span className={compact ? "sr-only" : "flex min-w-0 flex-col text-left leading-tight"}>
        <span className="truncate">{displayLabel ?? label}</span>
        {subtitle && !compact ? (
          <span className="truncate text-[10px] font-bold uppercase tracking-normal text-slate-400">
            {subtitle}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function ScoreTrackMarkerControls({
  itemId,
  markers,
  onAction
}: {
  itemId: string;
  markers: NonNullable<PlaytestItem["scoreTrackMarkers"]>;
  onAction: (action: PlaytestAction) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {markers.map((marker) => (
        <div
          key={marker.id}
          className="flex h-10 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 shadow-sm"
        >
          <span className="min-w-12 max-w-24 truncate px-1 text-xs font-semibold text-slate-700">
            {marker.label || marker.id}
          </span>
          <span className="w-9 rounded border border-slate-100 bg-slate-50 px-1 py-0.5 text-center text-xs font-bold tabular-nums text-slate-700">
            {marker.value}
          </span>
          <button
            aria-label={`Decrease ${marker.label || marker.id}`}
            className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            title={`Decrease ${marker.label || marker.id}`}
            type="button"
            onClick={() =>
              onAction({
                itemId,
                markerId: marker.id,
                type: "decrementScoreTrackMarker"
              })
            }
          >
            <Minus size={15} />
          </button>
          <button
            aria-label={`Increase ${marker.label || marker.id}`}
            className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            title={`Increase ${marker.label || marker.id}`}
            type="button"
            onClick={() =>
              onAction({
                itemId,
                markerId: marker.id,
                type: "incrementScoreTrackMarker"
              })
            }
          >
            <Plus size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

function PlaytestIconButton({
  destructive = false,
  disabled = false,
  icon,
  label,
  onClick
}: {
  destructive?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        destructive
          ? "border-red-100 bg-red-50 text-red-700 hover:border-red-200 hover:bg-red-100"
          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
      }`}
      disabled={disabled}
      title={label}
      type="button"
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

function formatPlaytestActionTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

type PlaytestToolbarAction = {
  compact?: boolean;
  displayLabel?: string;
  icon: ReactNode;
  label: string;
  preview?: PlaytestCommandPreviewRequest;
  subtitle?: string;
  title: string;
  onClick: () => void;
};

function getCommandPreviewRequest(
  itemId: string,
  command: NonNullable<PlaytestItem["behavior"]["commands"]>[number]
): PlaytestCommandPreviewRequest | undefined {
  return command.type === "shuffleContainer"
    ? undefined
    : {
        commandId: command.id,
        itemId
      };
}

function getAvailablePlaytestActions({
  onAction,
  selectedCanFlip,
  selectedCommands,
  selectedCount,
  selectedIsContainer,
  selectedIsCounter,
  selectedIsDie,
  selectedRotatable,
  selectedRotationStep,
  selectedInteractable,
  selectedItem,
  selectedObjectKind,
  session
}: {
  onAction: (action: PlaytestAction) => void;
  selectedCanFlip: boolean;
  selectedCommands: NonNullable<PlaytestItem["behavior"]["commands"]>;
  selectedCount: number;
  selectedIsContainer: boolean;
  selectedIsCounter: boolean;
  selectedIsDie: boolean;
  selectedRotatable: boolean;
  selectedRotationStep: number;
  selectedInteractable: boolean;
  selectedItem: PlaytestItem;
  selectedObjectKind: PlaytestItem["baseObject"]["kind"];
  session: PlaytestSession;
}): PlaytestToolbarAction[] {
  const actions: PlaytestToolbarAction[] = [];

  if (!selectedInteractable) {
    return actions;
  }

  for (const command of selectedCommands) {
    if (command.type === "shuffleContainer" && selectedCount < 2) {
      continue;
    }

    if (command.type !== "shuffleContainer" && selectedCount < 1) {
      continue;
    }

    const targetName = getPlaytestCommandTargetName(command, session.itemsById);
    const subtitle = targetName ? `-> ${targetName}` : undefined;

    actions.push({
      icon:
        command.type === "shuffleContainer" ? (
          <Shuffle size={17} />
        ) : command.type === "refillTargetZoneFromContainer" ? (
          <RefreshCw size={17} />
        ) : (
          <Play size={17} />
      ),
      label: command.label,
      preview: getCommandPreviewRequest(selectedItem.id, command),
      subtitle,
      title: subtitle ? `${command.label} ${subtitle}` : command.label,
      onClick: () =>
        onAction({
          commandId: command.id,
          itemId: selectedItem.id,
          type: "executeCommand"
        })
    });
  }

  if (selectedRotatable) {
    actions.push(
      {
        compact: true,
        icon: <RotateCcw size={17} />,
        label: "Rotate left",
        title: `Rotate left ${selectedRotationStep} deg`,
        onClick: () => onAction({ direction: -1, itemId: selectedItem.id, type: "rotateItem" })
      },
      {
        compact: true,
        icon: <RotateCw size={17} />,
        label: "Rotate right",
        title: `Rotate right ${selectedRotationStep} deg`,
        onClick: () => onAction({ direction: 1, itemId: selectedItem.id, type: "rotateItem" })
      }
    );
  }

  if (selectedCanFlip) {
    actions.push({
      icon: <Undo2 size={17} />,
      label: "Flip",
      title: "Flip",
      onClick: () => onAction({ itemId: selectedItem.id, type: "flipItem" })
    });
  }

  actions.push({
    icon: selectedItem.hidden ? <Eye size={17} /> : <EyeOff size={17} />,
    label: selectedItem.hidden ? "Reveal" : "Hide",
    title: selectedItem.hidden ? "Reveal" : "Hide",
    onClick: () =>
      onAction({
        itemId: selectedItem.id,
        type: selectedItem.hidden ? "revealItem" : "hideItem"
      })
  });

  if (!selectedCommands.length && selectedIsContainer && selectedCount >= 2) {
    actions.push({
      icon: <Shuffle size={17} />,
      label: "Shuffle",
      title: "Shuffle",
      onClick: () => onAction({ itemId: selectedItem.id, type: "shuffleContainer" })
    });
  }

  if (!selectedCommands.length && selectedIsContainer && selectedCount >= 1) {
    const label =
      selectedObjectKind === "stack"
        ? "Take top"
        : selectedObjectKind === "bag"
          ? "Take random"
          : "Draw";

    actions.push({
      icon: <Play size={17} />,
      label,
      title: label,
      onClick: () => onAction({ itemId: selectedItem.id, type: "drawFromContainer" })
    });
  }

  if (selectedIsDie) {
    actions.push({
      icon: <Dices size={17} />,
      label: "Roll",
      title: "Roll",
      onClick: () => onAction({ itemId: selectedItem.id, type: "rollDie" })
    });
  }

  if (selectedIsCounter) {
    actions.push(
      {
        compact: true,
        displayLabel: "-",
        icon: <Minus size={17} />,
        label: "Decrease",
        title: "Decrease",
        onClick: () => onAction({ itemId: selectedItem.id, type: "decrementCounter" })
      },
      {
        compact: true,
        displayLabel: "+",
        icon: <Plus size={17} />,
        label: "Increase",
        title: "Increase",
        onClick: () => onAction({ itemId: selectedItem.id, type: "incrementCounter" })
      }
    );
  }

  return actions;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
