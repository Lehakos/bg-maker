import type {
  ProjectFileNode,
  ProjectObjectKind,
  ProjectObjectZoneMode,
  ProjectObjectSide,
  ProjectTableSetupItemBehavior,
  ProjectTableSetupItemCommand,
  ProjectTableSetupItemCommandTableOffset,
  ProjectTableSetupItemCommandType,
  ProjectTableSetupItemContainerBehavior,
  ProjectTableSetupItemContainerDrawOrder,
  ProjectTableSetupItemZoneSideOnEnter,
  ProjectTableSetupItemZoneSlotOccupancy
} from "@bg-maker/shared";
import { projectObjectKinds, resolveProjectObjectFileObjectTree } from "@bg-maker/shared";
import {
  Boxes,
  Check,
  ChevronDown,
  EyeOff,
  Hand,
  MousePointerClick,
  Move,
  Plus,
  RotateCw,
  Search,
  Shuffle,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getProjectObjectKindIconClassName,
  getProjectObjectKindLabel
} from "../project-objects/project-object-tree-labels";
import { ProjectObjectKindIcon } from "../project-objects/project-object-tree-ui";
import {
  InspectorBehaviorNumberField,
  InspectorInlineTextField,
  InspectorSection,
  InspectorSelectField,
  InspectorSwitchField,
  type InspectorFieldDefinition
} from "./inspector-ui";
import { cx } from "./class-names";
import {
  createProjectTableSetupItemCommand,
  getDefaultProjectTableSetupItemCommandLabel,
  normalizeProjectTableSetupItemCommandCount,
  normalizeProjectTableSetupItemCommandOffsetValue,
  normalizeProjectTableSetupItemRotationStep,
  projectTableSetupItemCommandCountLimits,
  projectTableSetupItemCommandOffsetLimits,
  projectTableSetupItemRotationStepLimits
} from "../project-table-setup/project-table-setup-behavior";

export type ProjectTableSetupCommandTargetOption = {
  label: string;
  value: string;
};

type ProjectTableSetupBehaviorSectionProps = {
  behavior: ProjectTableSetupItemBehavior;
  commandTargetOptions: readonly ProjectTableSetupCommandTargetOption[];
  fileTree: readonly ProjectFileNode[];
  zoneMode?: ProjectObjectZoneMode;
  zoneSlots?: number;
  onCommandsChange: (commands: ProjectTableSetupItemCommand[]) => void;
  onContainerDrawOrderChange: (value: ProjectTableSetupItemContainerDrawOrder) => void;
  onContainerDrawnItemSideChange: (value: ProjectObjectSide) => void;
  onContainerShuffleOnStartChange: (value: boolean) => void;
  onInitialHiddenChange: (value: boolean) => void;
  onInitialSideChange: (value: ProjectObjectSide) => void;
  onInteractableChange: (value: boolean) => void;
  onMovableChange: (value: boolean) => void;
  onRotatableChange: (value: boolean) => void;
  onRotationStepChange: (value: number) => void;
  onZoneAcceptedObjectsChange: (value: {
    acceptedKinds: ProjectObjectKind[];
    acceptedObjectFileNodeIds: string[];
  }) => void;
  onZoneAllowRemoveChange: (value: boolean) => void;
  onZoneSideOnEnterChange: (value: ProjectTableSetupItemZoneSideOnEnter) => void;
  onZoneSlotOccupancyChange: (value: ProjectTableSetupItemZoneSlotOccupancy) => void;
};

const sideOptions = [
  { label: "Front", value: "front" },
  { label: "Back", value: "back" }
] as const satisfies readonly { label: string; value: ProjectObjectSide }[];

const drawOrderOptions = [
  { label: "Top", value: "top" },
  { label: "Random", value: "random" }
] as const satisfies readonly {
  label: string;
  value: ProjectTableSetupItemContainerDrawOrder;
}[];

const zoneSideOnEnterOptions = [
  { label: "Preserve", value: "preserve" },
  { label: "Front", value: "front" },
  { label: "Back", value: "back" }
] as const satisfies readonly {
  label: string;
  value: ProjectTableSetupItemZoneSideOnEnter;
}[];

const zoneSlotOccupancyOptions = [
  { label: "Single", value: "single" },
  { label: "Stack", value: "stack" }
] as const satisfies readonly {
  label: string;
  value: ProjectTableSetupItemZoneSlotOccupancy;
}[];

const commandTypeOptions = [
  { label: "Shuffle container", value: "shuffleContainer" },
  { label: "Draw to table", value: "drawFromContainerToTableOffset" },
  { label: "Draw to zone", value: "drawFromContainerToTargetZone" },
  { label: "Refill zone", value: "refillTargetZoneFromContainer" }
] as const satisfies readonly { label: string; value: ProjectTableSetupItemCommandType }[];

const commandRefillModeOptions = [
  { label: "Empty slots", value: "emptySlots" }
] as const satisfies readonly { label: string; value: "emptySlots" }[];

type RotationBehaviorNumberFieldKey = "rotationStep";

const rotationStepField = {
  key: "rotationStep",
  label: "Rotation step"
} as const satisfies InspectorFieldDefinition<RotationBehaviorNumberFieldKey>;

const rotationStepFieldSettings = {
  max: projectTableSetupItemRotationStepLimits.max,
  min: projectTableSetupItemRotationStepLimits.min,
  step: 1
} as const;

const acceptedObjectKindOptions = projectObjectKinds
  .filter((kind) => kind !== "zone")
  .map((kind) => ({ kind, label: getProjectObjectKindLabel(kind), value: kind }));

type AcceptedObjectsMode = "all" | "custom" | "kinds" | "objects";

const acceptedObjectsModeOptions = [
  { label: "All objects", value: "all" },
  { label: "Object types", value: "kinds" },
  { label: "Project objects", value: "objects" },
  { label: "Types and objects", value: "custom" }
] as const satisfies readonly { label: string; value: AcceptedObjectsMode }[];

export function ProjectTableSetupBehaviorSection({
  behavior,
  commandTargetOptions,
  fileTree,
  zoneMode,
  zoneSlots,
  onCommandsChange,
  onContainerDrawOrderChange,
  onContainerDrawnItemSideChange,
  onContainerShuffleOnStartChange,
  onInitialHiddenChange,
  onInitialSideChange,
  onInteractableChange,
  onMovableChange,
  onRotatableChange,
  onRotationStepChange,
  onZoneAcceptedObjectsChange,
  onZoneAllowRemoveChange,
  onZoneSideOnEnterChange,
  onZoneSlotOccupancyChange
}: ProjectTableSetupBehaviorSectionProps) {
  const hasBehavior = Boolean(
    behavior.movement ||
    behavior.rotation ||
    behavior.interaction ||
    behavior.visibility ||
    behavior.side ||
    behavior.container ||
    behavior.commands?.length ||
    behavior.zone
  );

  if (!hasBehavior) {
    return null;
  }

  return (
    <InspectorSection icon={<Hand size={15} />} title="Playtest behavior">
      {behavior.movement ? (
        <InspectorSwitchField
          checked={behavior.movement.movableInPlaytest}
          icon={<Move size={15} />}
          label="Movable in playtest"
          onChange={(event) => onMovableChange(event.currentTarget.checked)}
        />
      ) : null}
      {behavior.rotation ? (
        <>
          <InspectorSwitchField
            checked={behavior.rotation.rotatableInPlaytest}
            icon={<RotateCw size={15} />}
            label="Rotatable in playtest"
            onChange={(event) => onRotatableChange(event.currentTarget.checked)}
          />
          <RotationStepField
            value={behavior.rotation.rotationStep}
            onChange={onRotationStepChange}
          />
        </>
      ) : null}
      {behavior.interaction ? (
        <InspectorSwitchField
          checked={behavior.interaction.interactableInPlaytest}
          icon={<MousePointerClick size={15} />}
          label="Interactable in playtest"
          onChange={(event) => onInteractableChange(event.currentTarget.checked)}
        />
      ) : null}
      {behavior.visibility ? (
        <InspectorSwitchField
          checked={behavior.visibility.initialHidden}
          icon={<EyeOff size={15} />}
          label="Initially hidden"
          onChange={(event) => onInitialHiddenChange(event.currentTarget.checked)}
        />
      ) : null}
      {behavior.side ? (
        <InspectorSelectField
          label="Initial side"
          value={behavior.side.initialSide}
          options={sideOptions}
          onChange={onInitialSideChange}
        />
      ) : null}
      {behavior.container ? (
        <>
          <InspectorSwitchField
            checked={behavior.container.shuffleOnStart}
            icon={<Shuffle size={15} />}
            label="Shuffle on start"
            onChange={(event) => onContainerShuffleOnStartChange(event.currentTarget.checked)}
          />
          <div className="grid grid-cols-2 gap-2">
            <InspectorSelectField
              label="Draw order"
              value={behavior.container.drawOrder}
              options={drawOrderOptions}
              onChange={onContainerDrawOrderChange}
            />
            <InspectorSelectField
              label="Drawn side"
              value={behavior.container.drawnItemSide}
              options={sideOptions}
              onChange={onContainerDrawnItemSideChange}
            />
          </div>
          <CommandListField
            commands={behavior.commands ?? []}
            container={behavior.container}
            targetOptions={commandTargetOptions}
            onChange={onCommandsChange}
          />
        </>
      ) : null}
      {behavior.zone ? (
        <>
          <ZonePlacementSummary
            slotOccupancy={behavior.zone.slotOccupancy}
            zoneMode={zoneMode}
            zoneSlots={zoneSlots}
          />
          <AcceptedObjectsField
            acceptedObjectFileNodeIds={behavior.zone.acceptedObjectFileNodeIds ?? []}
            acceptedKinds={behavior.zone.acceptedKinds}
            fileTree={fileTree}
            onChange={onZoneAcceptedObjectsChange}
          />
          <InspectorSwitchField
            checked={behavior.zone.allowRemove}
            icon={<Boxes size={15} />}
            label="Allow remove"
            onChange={(event) => onZoneAllowRemoveChange(event.currentTarget.checked)}
          />
          <div className="grid grid-cols-2 gap-2">
            <InspectorSelectField
              label="Side on enter"
              value={behavior.zone.sideOnEnter}
              options={zoneSideOnEnterOptions}
              onChange={onZoneSideOnEnterChange}
            />
            {zoneMode === "slots" ? (
              <InspectorSelectField
                label="Slot occupancy"
                value={behavior.zone.slotOccupancy}
                options={zoneSlotOccupancyOptions}
                onChange={onZoneSlotOccupancyChange}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </InspectorSection>
  );
}

function ZonePlacementSummary({
  slotOccupancy,
  zoneMode,
  zoneSlots
}: {
  slotOccupancy: ProjectTableSetupItemZoneSlotOccupancy;
  zoneMode?: ProjectObjectZoneMode;
  zoneSlots?: number;
}) {
  const capacityLabel = zoneMode === "slots" ? `${zoneSlots ?? 0} slots` : "Free placement";
  const occupancyLabel = slotOccupancy === "stack" ? "Stacked" : "Single per slot";

  return (
    <div
      className={`grid gap-2 rounded-md border border-cyan-100 bg-cyan-50/60 p-2 ${
        zoneMode === "slots" ? "grid-cols-2" : "grid-cols-1"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-normal text-cyan-700">Capacity</p>
        <p className="truncate text-xs font-semibold text-slate-800">{capacityLabel}</p>
      </div>
      {zoneMode === "slots" ? (
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-normal text-cyan-700">
            Occupancy
          </p>
          <p className="truncate text-xs font-semibold text-slate-800">{occupancyLabel}</p>
        </div>
      ) : null}
    </div>
  );
}

type RotationStepFieldProps = {
  value: number;
  onChange: (value: number) => void;
};

function RotationStepField({ value, onChange }: RotationStepFieldProps) {
  const formattedValue = formatRotationStepValue(value);
  const [draft, setDraft] = useState(formattedValue);

  useEffect(() => {
    setDraft(formattedValue);
  }, [formattedValue]);

  function commitRotationStep(_fieldKey: RotationBehaviorNumberFieldKey, draftValue: string) {
    const normalizedValue = parseRotationStepDraftValue(draftValue);

    if (normalizedValue === null) {
      setDraft(formattedValue);
      return;
    }

    setDraft(formatRotationStepValue(normalizedValue));
    onChange(normalizedValue);
  }

  return (
    <InspectorBehaviorNumberField
      field={rotationStepField}
      settings={rotationStepFieldSettings}
      value={draft}
      onCommit={commitRotationStep}
      onDraftChange={(_fieldKey, draftValue) => setDraft(draftValue)}
      onReset={() => setDraft(formattedValue)}
    />
  );
}

function parseRotationStepDraftValue(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? normalizeProjectTableSetupItemRotationStep(parsedValue)
    : null;
}

function formatRotationStepValue(value: number): string {
  return String(normalizeProjectTableSetupItemRotationStep(value));
}

type CommandListFieldProps = {
  commands: readonly ProjectTableSetupItemCommand[];
  container: ProjectTableSetupItemContainerBehavior;
  targetOptions: readonly ProjectTableSetupCommandTargetOption[];
  onChange: (commands: ProjectTableSetupItemCommand[]) => void;
};

type CommandDraftCache = Record<
  string,
  Partial<Record<ProjectTableSetupItemCommandType, ProjectTableSetupItemCommand>>
>;

function CommandListField({ commands, container, targetOptions, onChange }: CommandListFieldProps) {
  const [draftCache, setDraftCache] = useState<CommandDraftCache>({});
  const availableTypeOptions = useMemo(
    () =>
      targetOptions.length
        ? commandTypeOptions
        : commandTypeOptions.filter(
            (option) =>
              option.value === "drawFromContainerToTableOffset" ||
              option.value === "shuffleContainer"
          ),
    [targetOptions.length]
  );

  useEffect(() => {
    const commandIds = new Set(commands.map((command) => command.id));

    setDraftCache((currentCache) => {
      const nextCache = Object.fromEntries(
        Object.entries(currentCache).filter(([commandId]) => commandIds.has(commandId))
      );

      return Object.keys(nextCache).length === Object.keys(currentCache).length
        ? currentCache
        : nextCache;
    });
  }, [commands]);

  function addCommand() {
    onChange([
      ...commands,
      createProjectTableSetupItemCommand({
        container,
        targetItemId: targetOptions[0]?.value,
        type: "drawFromContainerToTableOffset"
      })
    ]);
  }

  function removeCommand(commandId: string) {
    onChange(commands.filter((command) => command.id !== commandId));
  }

  function updateCommand(nextCommand: ProjectTableSetupItemCommand) {
    rememberCommandDraft(nextCommand);
    onChange(commands.map((command) => (command.id === nextCommand.id ? nextCommand : command)));
  }

  function changeCommandType(
    command: ProjectTableSetupItemCommand,
    type: ProjectTableSetupItemCommandType
  ) {
    rememberCommandDraft(command);
    updateCommand(getCommandForType(command, type));
  }

  function rememberCommandDraft(command: ProjectTableSetupItemCommand) {
    setDraftCache((currentCache) => ({
      ...currentCache,
      [command.id]: {
        ...currentCache[command.id],
        [command.type]: command
      }
    }));
  }

  function getCommandForType(
    command: ProjectTableSetupItemCommand,
    type: ProjectTableSetupItemCommandType
  ): ProjectTableSetupItemCommand {
    const cachedCommand = draftCache[command.id]?.[type];
    const nextCommand =
      cachedCommand ??
      createProjectTableSetupItemCommand({
        container,
        targetItemId: targetOptions[0]?.value,
        type
      });
    const currentLabel = command.label.trim();
    const currentDefaultLabel = getDefaultProjectTableSetupItemCommandLabel(command.type);
    const nextDefaultLabel = getDefaultProjectTableSetupItemCommandLabel(type);
    const label =
      !currentLabel || currentLabel === currentDefaultLabel ? nextDefaultLabel : command.label;

    return normalizeCommandTargetForOptions({
      ...nextCommand,
      id: command.id,
      label,
      type
    } as ProjectTableSetupItemCommand);
  }

  function normalizeCommandTargetForOptions(
    command: ProjectTableSetupItemCommand
  ): ProjectTableSetupItemCommand {
    if (!("targetItemId" in command)) {
      return command;
    }

    if (targetOptions.some((option) => option.value === command.targetItemId)) {
      return command;
    }

    return {
      ...command,
      targetItemId: targetOptions[0]?.value ?? ""
    };
  }

  function updateCommandLabel(command: ProjectTableSetupItemCommand, label: string) {
    updateCommand({ ...command, label });
  }

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">Commands</span>
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
          title="Add command"
          type="button"
          onClick={addCommand}
        >
          <Plus size={15} />
        </button>
      </div>
      {commands.length ? (
        <div className="space-y-2">
          {commands.map((command) => (
            <div
              key={command.id}
              className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2"
            >
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <InspectorSelectField
                    label="Type"
                    value={command.type}
                    options={availableTypeOptions}
                    onChange={(type) => changeCommandType(command, type)}
                  />
                </div>
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-red-600"
                  title="Remove command"
                  type="button"
                  onClick={() => removeCommand(command.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <InspectorInlineTextField
                label="Label"
                value={command.label}
                onChange={(label) => updateCommandLabel(command, label)}
              />
              <CommandSettings
                command={command}
                targetOptions={targetOptions}
                onChange={updateCommand}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-500">
          No commands assigned.
        </p>
      )}
    </div>
  );
}

type CommandSettingsProps = {
  command: ProjectTableSetupItemCommand;
  targetOptions: readonly ProjectTableSetupCommandTargetOption[];
  onChange: (command: ProjectTableSetupItemCommand) => void;
};

function CommandSettings({ command, targetOptions, onChange }: CommandSettingsProps) {
  if (command.type === "shuffleContainer") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-500">
        <Shuffle size={14} />
        <span>Shuffle</span>
      </div>
    );
  }

  const targetSelectOptions = targetOptions.length
    ? targetOptions
    : [{ label: "No zones", value: "" }];

  return (
    <div className="space-y-2">
      {"count" in command ? (
        <CommandNumberField
          label="Draw count"
          max={projectTableSetupItemCommandCountLimits.max}
          min={projectTableSetupItemCommandCountLimits.min}
          step={1}
          value={command.count}
          onChange={(count) =>
            onChange({
              ...command,
              count: normalizeProjectTableSetupItemCommandCount(count)
            })
          }
        />
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <InspectorSelectField
          label="Draw order"
          value={command.drawOrder}
          options={drawOrderOptions}
          onChange={(drawOrder) => onChange({ ...command, drawOrder })}
        />
        <InspectorSelectField
          label="Drawn side"
          value={command.drawnItemSide}
          options={sideOptions}
          onChange={(drawnItemSide) => onChange({ ...command, drawnItemSide })}
        />
      </div>
      {command.type === "drawFromContainerToTableOffset" ? (
        <DrawToTableOffsetSettings command={command} onChange={onChange} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <InspectorSelectField
            disabled={!targetOptions.length}
            label="Target zone"
            value={command.targetItemId}
            options={targetSelectOptions}
            onChange={(targetItemId) => onChange({ ...command, targetItemId })}
          />
          {command.type === "refillTargetZoneFromContainer" ? (
            <InspectorSelectField
              disabled
              label="Refill mode"
              value={command.refillMode}
              options={commandRefillModeOptions}
              onChange={(refillMode) => onChange({ ...command, refillMode })}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

type DrawToTableOffsetSettingsProps = {
  command: Extract<ProjectTableSetupItemCommand, { type: "drawFromContainerToTableOffset" }>;
  onChange: (command: ProjectTableSetupItemCommand) => void;
};

function DrawToTableOffsetSettings({ command, onChange }: DrawToTableOffsetSettingsProps) {
  const [previewOffset, setPreviewOffset] = useState(command.offset);

  useEffect(() => {
    setPreviewOffset(command.offset);
  }, [command.offset]);

  function updateOffset(axis: "x" | "y", value: number) {
    const offset = {
      ...command.offset,
      [axis]: normalizeProjectTableSetupItemCommandOffsetValue(value)
    };

    setPreviewOffset(offset);
    onChange({
      ...command,
      offset
    });
  }

  function updatePreviewOffset(axis: "x" | "y", draft: string) {
    const parsedValue = Number(draft);

    if (!Number.isFinite(parsedValue)) {
      return;
    }

    setPreviewOffset({
      ...previewOffset,
      [axis]: normalizeProjectTableSetupItemCommandOffsetValue(parsedValue)
    });
  }

  return (
    <>
      <CommandOffsetPreview offset={previewOffset} />
      <div className="grid grid-cols-2 gap-2">
        <CommandNumberField
          label="Horizontal"
          max={projectTableSetupItemCommandOffsetLimits.max}
          min={projectTableSetupItemCommandOffsetLimits.min}
          step={1}
          value={command.offset.x}
          onChange={(value) => updateOffset("x", value)}
          onDraftChange={(draft) => updatePreviewOffset("x", draft)}
        />
        <CommandNumberField
          label="Vertical"
          max={projectTableSetupItemCommandOffsetLimits.max}
          min={projectTableSetupItemCommandOffsetLimits.min}
          step={1}
          value={command.offset.y}
          onChange={(value) => updateOffset("y", value)}
          onDraftChange={(draft) => updatePreviewOffset("y", draft)}
        />
      </div>
    </>
  );
}

function CommandOffsetPreview({ offset }: { offset: ProjectTableSetupItemCommandTableOffset }) {
  const sourceX = 36;
  const sourceY = 48;
  const drawnX = clampPreviewPosition(sourceX + offset.x * 0.18);
  const drawnY = clampPreviewPosition(sourceY + offset.y * 0.18);
  const itemPreviewClassName =
    "absolute h-14 w-10 -translate-x-1/2 -translate-y-1/2 rounded border shadow-sm";

  return (
    <div
      aria-label="Draw placement preview"
      className="relative h-24 overflow-hidden rounded-md border border-slate-200 bg-white"
      role="img"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:16px_16px]" />
      <div
        className={`${itemPreviewClassName} border-slate-300 bg-slate-100`}
        style={{ left: `${sourceX}%`, top: `${sourceY}%` }}
      />
      <div
        className={`${itemPreviewClassName} border-emerald-500 bg-emerald-100 shadow-emerald-950/10`}
        style={{ left: `${drawnX}%`, top: `${drawnY}%` }}
      />
      <div
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-400"
        style={{ left: `${sourceX}%`, top: `${sourceY}%` }}
      />
      <div
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600"
        style={{ left: `${drawnX}%`, top: `${drawnY}%` }}
      />
    </div>
  );
}

type CommandNumberFieldProps = {
  label: string;
  max: number;
  min: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  onDraftChange?: (value: string) => void;
};

function CommandNumberField({
  label,
  max,
  min,
  step,
  value,
  onChange,
  onDraftChange
}: CommandNumberFieldProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commitDraft() {
    const parsedValue = Number(draft);

    if (!Number.isFinite(parsedValue)) {
      setDraft(String(value));
      return;
    }

    const normalizedValue = Math.min(max, Math.max(min, Math.round(parsedValue)));
    setDraft(String(normalizedValue));
    onChange(normalizedValue);
  }

  return (
    <label className="block min-w-0 text-xs font-medium text-slate-500">
      <span className="flex min-h-5 items-center">{label}</span>
      <input
        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm tabular-nums text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        inputMode="decimal"
        max={max}
        min={min}
        step={step}
        type="number"
        value={draft}
        onBlur={commitDraft}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
          onDraftChange?.(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }

          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(String(value));
          }
        }}
      />
    </label>
  );
}

function clampPreviewPosition(value: number) {
  return Math.min(88, Math.max(12, value));
}

type AcceptedObjectsFieldProps = {
  acceptedObjectFileNodeIds: readonly string[];
  acceptedKinds: readonly ProjectObjectKind[];
  fileTree: readonly ProjectFileNode[];
  onChange: (value: {
    acceptedKinds: ProjectObjectKind[];
    acceptedObjectFileNodeIds: string[];
  }) => void;
};

function AcceptedObjectsField({
  acceptedObjectFileNodeIds,
  acceptedKinds,
  fileTree,
  onChange
}: AcceptedObjectsFieldProps) {
  const acceptedKindsKey = acceptedKinds.join("\0");
  const acceptedObjectFileNodeIdsKey = acceptedObjectFileNodeIds.join("\0");
  const objectFileOptions = useMemo(() => getAcceptedObjectFileOptions(fileTree), [fileTree]);
  const [mode, setMode] = useState<AcceptedObjectsMode>(() =>
    getAcceptedObjectsMode(acceptedKinds, acceptedObjectFileNodeIds)
  );
  const [drafts, setDrafts] = useState<AcceptedObjectsDrafts>(() =>
    createAcceptedObjectsDrafts(acceptedKinds, acceptedObjectFileNodeIds, objectFileOptions)
  );
  const [selectOpen, setSelectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const nextMode = getAcceptedObjectsMode(acceptedKinds, acceptedObjectFileNodeIds);

    setMode((currentMode) =>
      nextMode === "all" && currentMode !== "all" ? currentMode : nextMode
    );
    setDrafts((currentDrafts) =>
      getDraftsWithExternalSelection(
        currentDrafts,
        nextMode,
        {
          acceptedKinds,
          acceptedObjectFileNodeIds
        },
        objectFileOptions
      )
    );
  }, [
    acceptedKinds,
    acceptedKindsKey,
    acceptedObjectFileNodeIds,
    acceptedObjectFileNodeIdsKey,
    objectFileOptions
  ]);

  const activeSelection = getAcceptedObjectsSelectionForMode(mode, drafts);
  const selectOptions = useMemo(
    () => getAcceptedObjectsSelectOptions(mode, objectFileOptions),
    [mode, objectFileOptions]
  );
  const selectedOptions = selectOptions.filter((option) =>
    isAcceptedObjectOptionSelected(option, activeSelection)
  );
  const visibleSelectOptions = filterAcceptedObjectsSelectOptions(
    selectOptions,
    activeSelection,
    searchQuery
  );
  function handleModeChange(nextMode: AcceptedObjectsMode) {
    const nextSelection = getAcceptedObjectsSelectionForMode(nextMode, drafts);

    setMode(nextMode);
    setSearchQuery("");
    setSelectOpen(nextMode !== "all");
    emitAcceptedObjectsChange(nextMode, nextSelection);
  }

  function toggleSelectOption(option: AcceptedObjectsSelectOption) {
    const nextSelection = getAcceptedObjectsSelectionWithToggledOption(
      mode,
      activeSelection,
      option,
      objectFileOptions
    );

    setDrafts((currentDrafts) => getDraftsWithSelection(currentDrafts, mode, nextSelection));
    emitAcceptedObjectsChange(mode, nextSelection);
  }

  function emitAcceptedObjectsChange(
    nextMode: AcceptedObjectsMode,
    selection: AcceptedObjectsSelection
  ) {
    onChange(normalizeAcceptedObjectsSelectionForMode(nextMode, selection, objectFileOptions));
  }

  return (
    <div className="space-y-2">
      <InspectorSelectField
        label="Accepted objects mode"
        value={mode}
        options={acceptedObjectsModeOptions}
        onChange={handleModeChange}
      />
      {mode === "all" ? null : (
        <AcceptedObjectsSearchSelect
          mode={mode}
          searchQuery={searchQuery}
          selectedOptions={selectedOptions}
          selectOpen={selectOpen}
          visibleOptions={visibleSelectOptions}
          onOpenChange={setSelectOpen}
          onSearchQueryChange={setSearchQuery}
          onToggleOption={toggleSelectOption}
        />
      )}
    </div>
  );
}

type AcceptedObjectsSearchSelectProps = {
  mode: AcceptedObjectsMode;
  searchQuery: string;
  selectedOptions: readonly AcceptedObjectsSelectOption[];
  selectOpen: boolean;
  visibleOptions: readonly AcceptedObjectsSelectOption[];
  onOpenChange: (open: boolean) => void;
  onSearchQueryChange: (value: string) => void;
  onToggleOption: (option: AcceptedObjectsSelectOption) => void;
};

function AcceptedObjectsSearchSelect({
  mode,
  searchQuery,
  selectedOptions,
  selectOpen,
  visibleOptions,
  onOpenChange,
  onSearchQueryChange,
  onToggleOption
}: AcceptedObjectsSearchSelectProps) {
  const placeholder = getAcceptedObjectsSelectPlaceholder(mode);

  return (
    <div className="block min-w-0 text-xs font-medium text-slate-500">
      <span className="flex min-h-5 items-center">{getAcceptedObjectsSelectLabel(mode)}</span>
      <button
        aria-expanded={selectOpen}
        className="mt-1 flex min-h-8 w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 text-left text-sm font-medium text-slate-700 outline-none transition-colors hover:border-sky-200 hover:bg-sky-50 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        type="button"
        onClick={() => onOpenChange(!selectOpen)}
      >
        <span className="min-w-0 truncate">
          {selectedOptions.length ? `${selectedOptions.length} selected` : placeholder}
        </span>
        <ChevronDown
          className={cx("shrink-0 text-slate-400 transition-transform", selectOpen && "rotate-180")}
          size={15}
        />
      </button>
      {selectedOptions.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selectedOptions.map((option) => (
            <AcceptedObjectSelectionPill
              key={option.value}
              option={option}
              onRemove={() => onToggleOption(option)}
            />
          ))}
        </div>
      ) : null}
      {selectOpen ? (
        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
          <label className="relative block">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
            <input
              aria-label="Search accepted objects"
              className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-2 text-sm text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  onOpenChange(false);
                }
              }}
            />
          </label>
          <div className="mt-2 max-h-52 overflow-auto rounded-md border border-slate-200 bg-white">
            {visibleOptions.length ? (
              visibleOptions.map((option) => (
                <AcceptedObjectOptionButton
                  key={option.value}
                  option={option}
                  selected={option.selected}
                  onClick={() => onToggleOption(option)}
                />
              ))
            ) : (
              <div className="flex h-20 items-center justify-center px-3 text-center text-xs font-medium text-slate-400">
                No matches
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AcceptedObjectSelectionPill({
  option,
  onRemove
}: {
  option: AcceptedObjectsSelectOption;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-7 max-w-full items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-1.5 text-xs font-semibold text-sky-800">
      <AcceptedObjectOptionIcon kind={option.kind} size={13} />
      <span className="truncate">{option.label}</span>
      <button
        aria-label={`Remove ${option.label}`}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-sky-700 transition-colors hover:bg-sky-100"
        type="button"
        onClick={onRemove}
      >
        <X size={12} />
      </button>
    </span>
  );
}

function AcceptedObjectOptionButton({
  option,
  selected,
  onClick
}: {
  option: AcceptedObjectsSelectOption;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={selected}
      className={cx(
        "flex min-h-10 w-full items-center gap-2 border-b border-slate-100 px-2 py-1.5 text-left transition-colors last:border-b-0",
        selected ? "bg-sky-50 text-sky-900" : "text-slate-700 hover:bg-slate-50"
      )}
      type="button"
      onClick={onClick}
    >
      <AcceptedObjectOptionIcon kind={option.kind} size={15} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{option.label}</span>
        <span className="block truncate text-[11px] font-medium text-slate-400">
          {option.subtitle}
        </span>
      </span>
      {selected ? <Check className="shrink-0 text-sky-700" size={14} /> : null}
    </button>
  );
}

function AcceptedObjectOptionIcon({ kind, size }: { kind: ProjectObjectKind; size: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white">
      <ProjectObjectKindIcon
        className={getProjectObjectKindIconClassName(kind)}
        kind={kind}
        size={size}
      />
    </span>
  );
}

type AcceptedObjectFileOption = {
  kind: ProjectObjectKind;
  kindLabel: string;
  label: string;
  parentPath: string;
  value: string;
};

function getAcceptedObjectFileOptions(
  fileTree: readonly ProjectFileNode[]
): AcceptedObjectFileOption[] {
  const options: AcceptedObjectFileOption[] = [];

  collectAcceptedObjectFileOptions(fileTree, fileTree, options);

  return options;
}

function collectAcceptedObjectFileOptions(
  fileTree: readonly ProjectFileNode[],
  rootFileTree: readonly ProjectFileNode[],
  options: AcceptedObjectFileOption[],
  parentPath: readonly string[] = []
) {
  for (const node of fileTree) {
    if (node.type === "folder") {
      collectAcceptedObjectFileOptions(node.children ?? [], rootFileTree, options, [
        ...parentPath,
        node.name
      ]);
      continue;
    }

    if (node.kind !== "object") {
      continue;
    }

    const object = resolveProjectObjectFileObjectTree(rootFileTree, node)[0];

    if (!object || object.kind === "zone") {
      continue;
    }

    options.push({
      kind: object.kind,
      kindLabel: getProjectObjectKindLabel(object.kind),
      label: node.name,
      parentPath: parentPath.join(" / "),
      value: node.id
    });
  }
}

type AcceptedObjectsSelection = {
  acceptedKinds: ProjectObjectKind[];
  acceptedObjectFileNodeIds: string[];
};

type AcceptedObjectsDrafts = {
  custom: AcceptedObjectsSelection;
  kinds: ProjectObjectKind[];
  objects: string[];
};

type AcceptedObjectsSelectOption = {
  kind: ProjectObjectKind;
  label: string;
  searchText: string;
  selected: boolean;
  subtitle: string;
  type: "kind" | "object";
  value: string;
};

function getAcceptedObjectsMode(
  acceptedKinds: readonly ProjectObjectKind[],
  acceptedObjectFileNodeIds: readonly string[]
): AcceptedObjectsMode {
  if (acceptedKinds.length && acceptedObjectFileNodeIds.length) {
    return "custom";
  }

  if (acceptedKinds.length) {
    return "kinds";
  }

  if (acceptedObjectFileNodeIds.length) {
    return "objects";
  }

  return "all";
}

function createAcceptedObjectsDrafts(
  acceptedKinds: readonly ProjectObjectKind[],
  acceptedObjectFileNodeIds: readonly string[],
  objectFileOptions: readonly AcceptedObjectFileOption[]
): AcceptedObjectsDrafts {
  return {
    custom: {
      acceptedKinds: orderAcceptedKinds(acceptedKinds),
      acceptedObjectFileNodeIds: orderAcceptedObjectFileNodeIds(
        acceptedObjectFileNodeIds,
        objectFileOptions
      )
    },
    kinds: orderAcceptedKinds(acceptedKinds),
    objects: orderAcceptedObjectFileNodeIds(acceptedObjectFileNodeIds, objectFileOptions)
  };
}

function getDraftsWithExternalSelection(
  drafts: AcceptedObjectsDrafts,
  mode: AcceptedObjectsMode,
  selection: {
    acceptedKinds: readonly ProjectObjectKind[];
    acceptedObjectFileNodeIds: readonly string[];
  },
  objectFileOptions: readonly AcceptedObjectFileOption[]
): AcceptedObjectsDrafts {
  const nextSelection = {
    acceptedKinds: orderAcceptedKinds(selection.acceptedKinds),
    acceptedObjectFileNodeIds: orderAcceptedObjectFileNodeIds(
      selection.acceptedObjectFileNodeIds,
      objectFileOptions
    )
  };

  if (mode === "kinds") {
    return { ...drafts, kinds: nextSelection.acceptedKinds };
  }

  if (mode === "objects") {
    return { ...drafts, objects: nextSelection.acceptedObjectFileNodeIds };
  }

  if (mode === "custom") {
    return { ...drafts, custom: nextSelection };
  }

  return drafts;
}

function getAcceptedObjectsSelectionForMode(
  mode: AcceptedObjectsMode,
  drafts: AcceptedObjectsDrafts
): AcceptedObjectsSelection {
  if (mode === "kinds") {
    return {
      acceptedKinds: drafts.kinds,
      acceptedObjectFileNodeIds: []
    };
  }

  if (mode === "objects") {
    return {
      acceptedKinds: [],
      acceptedObjectFileNodeIds: drafts.objects
    };
  }

  if (mode === "custom") {
    return drafts.custom;
  }

  return {
    acceptedKinds: [],
    acceptedObjectFileNodeIds: []
  };
}

function getDraftsWithSelection(
  drafts: AcceptedObjectsDrafts,
  mode: AcceptedObjectsMode,
  selection: AcceptedObjectsSelection
): AcceptedObjectsDrafts {
  if (mode === "kinds") {
    return { ...drafts, kinds: selection.acceptedKinds };
  }

  if (mode === "objects") {
    return { ...drafts, objects: selection.acceptedObjectFileNodeIds };
  }

  if (mode === "custom") {
    return { ...drafts, custom: selection };
  }

  return drafts;
}

function getAcceptedObjectsSelectOptions(
  mode: AcceptedObjectsMode,
  objectFileOptions: readonly AcceptedObjectFileOption[]
): AcceptedObjectsSelectOption[] {
  const includeKinds = mode === "custom" || mode === "kinds";
  const includeObjects = mode === "custom" || mode === "objects";
  const options: AcceptedObjectsSelectOption[] = [];

  if (includeKinds) {
    options.push(
      ...acceptedObjectKindOptions.map((option) => ({
        kind: option.kind,
        label: option.label,
        searchText: normalizeAcceptedObjectsSearchText([option.label, "type"].join(" ")),
        selected: false,
        subtitle: "Object type",
        type: "kind" as const,
        value: `kind:${option.value}`
      }))
    );
  }

  if (includeObjects) {
    options.push(
      ...objectFileOptions.map((option) => ({
        kind: option.kind,
        label: option.label,
        searchText: normalizeAcceptedObjectsSearchText(
          [option.label, option.kindLabel, option.parentPath].join(" ")
        ),
        selected: false,
        subtitle: option.parentPath
          ? `${option.kindLabel} - ${option.parentPath}`
          : option.kindLabel,
        type: "object" as const,
        value: `object:${option.value}`
      }))
    );
  }

  return options;
}

function filterAcceptedObjectsSelectOptions(
  options: readonly AcceptedObjectsSelectOption[],
  selection: AcceptedObjectsSelection,
  searchQuery: string
): AcceptedObjectsSelectOption[] {
  const searchTokens = getAcceptedObjectsSearchTokens(searchQuery);

  return options
    .filter((option) =>
      searchTokens.length ? searchTokens.every((token) => option.searchText.includes(token)) : true
    )
    .map((option) => ({ ...option, selected: isAcceptedObjectOptionSelected(option, selection) }));
}

function isAcceptedObjectOptionSelected(
  option: AcceptedObjectsSelectOption,
  selection: AcceptedObjectsSelection
) {
  if (option.type === "kind") {
    return selection.acceptedKinds.includes(option.kind);
  }

  return selection.acceptedObjectFileNodeIds.includes(
    getAcceptedObjectFileNodeIdFromOption(option)
  );
}

function getAcceptedObjectsSelectionWithToggledOption(
  mode: AcceptedObjectsMode,
  selection: AcceptedObjectsSelection,
  option: AcceptedObjectsSelectOption,
  objectFileOptions: readonly AcceptedObjectFileOption[]
): AcceptedObjectsSelection {
  if (mode === "all") {
    return selection;
  }

  if (option.type === "kind") {
    const selectedKindSet = new Set(selection.acceptedKinds);

    if (selectedKindSet.has(option.kind)) {
      selectedKindSet.delete(option.kind);
    } else {
      selectedKindSet.add(option.kind);
    }

    return normalizeAcceptedObjectsSelectionForMode(
      mode,
      {
        acceptedKinds: [...selectedKindSet],
        acceptedObjectFileNodeIds: selection.acceptedObjectFileNodeIds
      },
      objectFileOptions
    );
  }

  const fileNodeId = getAcceptedObjectFileNodeIdFromOption(option);
  const selectedObjectFileNodeIdSet = new Set(selection.acceptedObjectFileNodeIds);

  if (selectedObjectFileNodeIdSet.has(fileNodeId)) {
    selectedObjectFileNodeIdSet.delete(fileNodeId);
  } else {
    selectedObjectFileNodeIdSet.add(fileNodeId);
  }

  return normalizeAcceptedObjectsSelectionForMode(
    mode,
    {
      acceptedKinds: selection.acceptedKinds,
      acceptedObjectFileNodeIds: [...selectedObjectFileNodeIdSet]
    },
    objectFileOptions
  );
}

function normalizeAcceptedObjectsSelectionForMode(
  mode: AcceptedObjectsMode,
  selection: AcceptedObjectsSelection,
  objectFileOptions: readonly AcceptedObjectFileOption[]
): AcceptedObjectsSelection {
  if (mode === "all") {
    return {
      acceptedKinds: [],
      acceptedObjectFileNodeIds: []
    };
  }

  if (mode === "kinds") {
    return {
      acceptedKinds: orderAcceptedKinds(selection.acceptedKinds),
      acceptedObjectFileNodeIds: []
    };
  }

  if (mode === "objects") {
    return {
      acceptedKinds: [],
      acceptedObjectFileNodeIds: orderAcceptedObjectFileNodeIds(
        selection.acceptedObjectFileNodeIds,
        objectFileOptions
      )
    };
  }

  return {
    acceptedKinds: orderAcceptedKinds(selection.acceptedKinds),
    acceptedObjectFileNodeIds: orderAcceptedObjectFileNodeIds(
      selection.acceptedObjectFileNodeIds,
      objectFileOptions
    )
  };
}

function orderAcceptedKinds(kinds: readonly ProjectObjectKind[]): ProjectObjectKind[] {
  const kindSet = new Set(kinds);

  return acceptedObjectKindOptions
    .map((option) => option.value)
    .filter((kind) => kindSet.has(kind));
}

function orderAcceptedObjectFileNodeIds(
  fileNodeIds: readonly string[],
  objectFileOptions: readonly AcceptedObjectFileOption[]
): string[] {
  const fileNodeIdSet = new Set(fileNodeIds);

  return objectFileOptions
    .map((option) => option.value)
    .filter((fileNodeId) => fileNodeIdSet.has(fileNodeId));
}

function getAcceptedObjectFileNodeIdFromOption(option: AcceptedObjectsSelectOption) {
  return option.value.replace(/^object:/, "");
}

function getAcceptedObjectsSelectPlaceholder(mode: AcceptedObjectsMode) {
  if (mode === "kinds") {
    return "Select object types";
  }

  if (mode === "objects") {
    return "Select project objects";
  }

  return "Select types or objects";
}

function getAcceptedObjectsSelectLabel(mode: AcceptedObjectsMode) {
  if (mode === "kinds") {
    return "Accepted object types";
  }

  if (mode === "objects") {
    return "Accepted project objects";
  }

  return "Accepted types and objects";
}

function normalizeAcceptedObjectsSearchText(value: string) {
  return value.trim().toLowerCase();
}

function getAcceptedObjectsSearchTokens(value: string) {
  return normalizeAcceptedObjectsSearchText(value).split(/\s+/).filter(Boolean);
}
