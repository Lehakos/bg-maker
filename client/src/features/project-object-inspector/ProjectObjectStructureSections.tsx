import type {
  ProjectObjectBagAppearanceVariant,
  ProjectObjectCardSizePresetValue,
  ProjectObjectContainer,
  ProjectObjectKind
} from "@bg-maker/shared";
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  Plus,
  Rows3,
  Scan,
  Trash2
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { BagIcon, BoxIcon, CardIcon, DeckIcon } from "../project-objects/project-object-icons";
import { cx } from "./class-names";
import {
  InspectorBehaviorNumberField,
  type InspectorFieldDefinition,
  InspectorIconSegmentedField,
  InspectorSection,
  InspectorSelectField,
  InspectorSwitchField
} from "./inspector-ui";
import {
  formatContainerEntryQuantityValue,
  stackDisplayNumberFieldSettings,
  zoneNumberFieldSettings,
  type BagDraft,
  type CardDraft,
  type DeckDraft,
  type StackDisplayDraft,
  type StackDisplayFieldKey,
  type StackDisplayNumberFieldKey,
  type ZoneDraft,
  type ZoneFieldKey,
  type ZoneNumberFieldKey
} from "./project-object-inspector-state";

type SelectOption<TValue extends string = string> = {
  label: string;
  value: TValue;
};

type SizePresetOption = SelectOption<ProjectObjectCardSizePresetValue>;

type StackDisplayNumberFieldDefinition =
  InspectorFieldDefinition<StackDisplayNumberFieldKey>;

const stackDisplayLayerField = {
  key: "visibleItemCount",
  label: "Visible"
} as const satisfies StackDisplayNumberFieldDefinition;

const stackDisplayOffsetFields: readonly StackDisplayNumberFieldDefinition[] = [
  { key: "stackOffsetX", label: "Offset X" },
  { key: "stackOffsetY", label: "Offset Y" }
];

const zoneCapacityField = {
  key: "capacity",
  label: "Capacity"
} as const satisfies InspectorFieldDefinition<ZoneNumberFieldKey>;

const bagAppearanceVariantOptions = [
  { icon: BagIcon, label: "Bag", value: "bag" },
  { icon: BoxIcon, label: "Box", value: "box" }
] as const;

type ProjectObjectCardSectionProps = {
  draft: CardDraft;
  sizePresetOptions: readonly SizePresetOption[];
  onSizePresetChange: (value: ProjectObjectCardSizePresetValue) => void;
};

export function ProjectObjectCardSection({
  draft,
  sizePresetOptions,
  onSizePresetChange
}: ProjectObjectCardSectionProps) {
  return (
    <InspectorSection icon={<CardIcon size={15} />} title="Card">
      <InspectorSelectField
        label="Size preset"
        value={draft.sizePreset}
        options={sizePresetOptions}
        onChange={onSizePresetChange}
      />
    </InspectorSection>
  );
}

type ProjectObjectDeckSectionProps = {
  draft: DeckDraft;
  sizePresetOptions: readonly SizePresetOption[];
  onSizePresetChange: (value: ProjectObjectCardSizePresetValue) => void;
};

export function ProjectObjectDeckSection({
  draft,
  sizePresetOptions,
  onSizePresetChange
}: ProjectObjectDeckSectionProps) {
  return (
    <InspectorSection icon={<DeckIcon size={15} />} title="Deck">
      <InspectorSelectField
        label="Size preset"
        value={draft.sizePreset}
        options={sizePresetOptions}
        onChange={onSizePresetChange}
      />
    </InspectorSection>
  );
}

type ProjectObjectBagSectionProps = {
  draft: BagDraft;
  onAppearanceVariantChange: (value: ProjectObjectBagAppearanceVariant) => void;
};

export function ProjectObjectBagSection({
  draft,
  onAppearanceVariantChange
}: ProjectObjectBagSectionProps) {
  return (
    <InspectorSection icon={<BagIcon size={15} />} title="Bag">
      <InspectorIconSegmentedField
        label="Appearance"
        value={draft.appearanceVariant}
        options={bagAppearanceVariantOptions}
        onChange={onAppearanceVariantChange}
      />
    </InspectorSection>
  );
}

type ProjectObjectContainerSectionProps = {
  canAddDraftRow: boolean;
  container: ProjectObjectContainer;
  draftRowIds: readonly number[];
  objectFileOptionById: ReadonlyMap<string, SelectOption>;
  objectFileOptions: readonly SelectOption[];
  objectKind: ProjectObjectKind;
  quantityDrafts: readonly string[];
  totalCount: number;
  unusedObjectFileOptions: readonly SelectOption[];
  usedObjectFileNodeIds: ReadonlySet<string>;
  onAddEntry: () => void;
  onCommitDraftEntry: (rowId: number, objectFileNodeId: string) => void;
  onCommitQuantity: (entryIndex: number, value: string) => void;
  onMoveEntry: (entryIndex: number, direction: -1 | 1) => void;
  onObjectFileChange: (entryIndex: number, objectFileNodeId: string) => void;
  onQuantityDraftChange: (entryIndex: number, value: string) => void;
  onRemoveDraftEntry: (rowId: number) => void;
  onRemoveEntry: (entryIndex: number) => void;
  onResetQuantity: (entryIndex: number) => void;
};

export function ProjectObjectContainerSection({
  canAddDraftRow,
  container,
  draftRowIds,
  objectFileOptionById,
  objectFileOptions,
  objectKind,
  quantityDrafts,
  totalCount,
  unusedObjectFileOptions,
  usedObjectFileNodeIds,
  onAddEntry,
  onCommitDraftEntry,
  onCommitQuantity,
  onMoveEntry,
  onObjectFileChange,
  onQuantityDraftChange,
  onRemoveDraftEntry,
  onRemoveEntry,
  onResetQuantity
}: ProjectObjectContainerSectionProps) {
  return (
    <InspectorSection
      icon={objectKind === "bag" ? <BagIcon size={15} /> : <Boxes size={15} />}
      title="Container"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-600">
          {totalCount} item{totalCount === 1 ? "" : "s"}
        </div>
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canAddDraftRow}
          title="Add object"
          type="button"
          onClick={onAddEntry}
        >
          <Plus size={15} />
        </button>
      </div>
      {container.entries.length || draftRowIds.length ? (
        <div className="space-y-1.5">
          {container.entries.map((entry, index) => (
            <ContainerEntryRow
              key={`${entry.objectFileNodeId}:${index}`}
              canMoveDown={index < container.entries.length - 1}
              canMoveUp={index > 0}
              index={index}
              entry={entry}
              objectFileOptions={getContainerEntryObjectFileOptions(
                objectFileOptions,
                usedObjectFileNodeIds,
                entry.objectFileNodeId
              )}
              quantityDraft={
                quantityDrafts[index] ?? formatContainerEntryQuantityValue(entry.quantity)
              }
              valid={objectFileOptionById.has(entry.objectFileNodeId)}
              onCommitQuantity={onCommitQuantity}
              onMove={onMoveEntry}
              onObjectFileChange={onObjectFileChange}
              onQuantityDraftChange={onQuantityDraftChange}
              onRemove={onRemoveEntry}
              onResetQuantity={onResetQuantity}
            />
          ))}
          {draftRowIds.map((rowId) => (
            <ContainerDraftEntryRow
              key={rowId}
              objectFileOptions={unusedObjectFileOptions}
              onObjectFileChange={(objectFileNodeId) =>
                onCommitDraftEntry(rowId, objectFileNodeId)
              }
              onRemove={() => onRemoveDraftEntry(rowId)}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-500">
          No objects assigned.
        </p>
      )}
    </InspectorSection>
  );
}

type ProjectObjectStackSectionProps = {
  draft: StackDisplayDraft;
  onCommitNumberField: (fieldKey: StackDisplayNumberFieldKey, value: string) => void;
  onDraftChange: (fieldKey: StackDisplayFieldKey, value: string | boolean) => void;
  onReset: (fieldKey: StackDisplayFieldKey) => void;
};

export function ProjectObjectStackSection({
  draft,
  onCommitNumberField,
  onDraftChange,
  onReset
}: ProjectObjectStackSectionProps) {
  return (
    <InspectorSection icon={<Rows3 size={15} />} title="Stack">
      <InspectorSwitchField
        checked={draft.showCount}
        label="Show count"
        onChange={(event) => onDraftChange("showCount", event.currentTarget.checked)}
      />
      <InspectorBehaviorNumberField
        field={stackDisplayLayerField}
        settings={stackDisplayNumberFieldSettings.visibleItemCount}
        value={draft.visibleItemCount}
        onCommit={onCommitNumberField}
        onDraftChange={onDraftChange}
        onReset={onReset}
      />
      <StackDisplayNumberGrid
        fields={stackDisplayOffsetFields}
        value={draft}
        onCommit={onCommitNumberField}
        onDraftChange={onDraftChange}
        onReset={onReset}
      />
    </InspectorSection>
  );
}

type ProjectObjectZoneSectionProps = {
  draft: ZoneDraft;
  referenceMissing: boolean;
  referenceOptions: readonly SelectOption[];
  zoneReferenceObjectFileId: string;
  onCommitCapacity: (fieldKey: ZoneNumberFieldKey, value: string) => void;
  onDraftChange: (fieldKey: ZoneFieldKey, value: string) => void;
  onReset: (fieldKey: ZoneFieldKey) => void;
};

export function ProjectObjectZoneSection({
  draft,
  referenceMissing,
  referenceOptions,
  zoneReferenceObjectFileId,
  onCommitCapacity,
  onDraftChange,
  onReset
}: ProjectObjectZoneSectionProps) {
  return (
    <InspectorSection icon={<Scan size={15} />} title="Zone">
      <InspectorSelectField
        label="Reference"
        value={draft.referenceObjectFileId}
        options={referenceOptions}
        onChange={(value) => onDraftChange("referenceObjectFileId", value)}
      />
      {zoneReferenceObjectFileId && referenceMissing ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
          Selected object file is missing or uses an unsupported zone root.
        </p>
      ) : null}
      <InspectorBehaviorNumberField
        field={zoneCapacityField}
        settings={zoneNumberFieldSettings.capacity}
        value={draft.capacity}
        onCommit={onCommitCapacity}
        onDraftChange={onDraftChange}
        onReset={onReset}
      />
    </InspectorSection>
  );
}

type ContainerEntryRowProps = {
  canMoveDown: boolean;
  canMoveUp: boolean;
  entry: ProjectObjectContainer["entries"][number];
  index: number;
  objectFileOptions: readonly SelectOption[];
  quantityDraft: string;
  valid: boolean;
  onCommitQuantity: (entryIndex: number, value: string) => void;
  onMove: (entryIndex: number, direction: -1 | 1) => void;
  onObjectFileChange: (entryIndex: number, objectFileNodeId: string) => void;
  onQuantityDraftChange: (entryIndex: number, value: string) => void;
  onRemove: (entryIndex: number) => void;
  onResetQuantity: (entryIndex: number) => void;
};

function ContainerEntryRow({
  canMoveDown,
  canMoveUp,
  entry,
  index,
  objectFileOptions,
  quantityDraft,
  valid,
  onCommitQuantity,
  onMove,
  onObjectFileChange,
  onQuantityDraftChange,
  onRemove,
  onResetQuantity
}: ContainerEntryRowProps) {
  const options = valid
    ? objectFileOptions
    : [
        {
          label: `${entry.objectFileNodeId} (missing)`,
          value: entry.objectFileNodeId
        },
        ...objectFileOptions
      ];

  function handleQuantityKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onResetQuantity(index);
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-1.5">
      <div className="flex items-center gap-1.5">
        <select
          aria-label="Object"
          className={cx(
            "h-8 min-w-0 flex-1 rounded-md border bg-white px-2 text-sm text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100",
            valid ? "border-slate-200" : "border-amber-300 text-amber-900"
          )}
          title="Object"
          value={entry.objectFileNodeId}
          onChange={(event) => onObjectFileChange(index, event.currentTarget.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          className="h-8 w-14 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm tabular-nums text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          inputMode="numeric"
          max={999}
          min={1}
          step={1}
          title="Quantity"
          type="number"
          value={quantityDraft}
          onBlur={(event) => onCommitQuantity(index, event.currentTarget.value)}
          onChange={(event) => onQuantityDraftChange(index, event.currentTarget.value)}
          onKeyDown={handleQuantityKeyDown}
        />
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canMoveUp}
          title="Move up"
          type="button"
          onClick={() => onMove(index, -1)}
        >
          <ArrowUp size={14} />
        </button>
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canMoveDown}
          title="Move down"
          type="button"
          onClick={() => onMove(index, 1)}
        >
          <ArrowDown size={14} />
        </button>
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-100 text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          title="Remove"
          type="button"
          onClick={() => onRemove(index)}
        >
          <Trash2 size={14} />
        </button>
      </div>
      {!valid ? (
        <p className="mt-1 truncate px-1 text-xs text-amber-700">
          Missing or unsupported object file.
        </p>
      ) : null}
    </div>
  );
}

type ContainerDraftEntryRowProps = {
  objectFileOptions: readonly SelectOption[];
  onObjectFileChange: (objectFileNodeId: string) => void;
  onRemove: () => void;
};

function ContainerDraftEntryRow({
  objectFileOptions,
  onObjectFileChange,
  onRemove
}: ContainerDraftEntryRowProps) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-1.5">
      <div className="flex items-center gap-1.5">
        <select
          aria-label="Object"
          className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-500 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          title="Object"
          value=""
          onChange={(event) => onObjectFileChange(event.currentTarget.value)}
        >
          <option value="">Select object</option>
          {objectFileOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          className="h-8 w-14 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm tabular-nums text-slate-400"
          disabled
          inputMode="numeric"
          title="Quantity"
          type="number"
          value="1"
          readOnly
        />
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-100 bg-white text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          title="Remove"
          type="button"
          onClick={onRemove}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

type StackDisplayNumberGridProps = {
  fields: readonly StackDisplayNumberFieldDefinition[];
  value: StackDisplayDraft;
  onCommit: (fieldKey: StackDisplayNumberFieldKey, value: string) => void;
  onDraftChange: (fieldKey: StackDisplayFieldKey, value: string) => void;
  onReset: (fieldKey: StackDisplayFieldKey) => void;
};

function StackDisplayNumberGrid({
  fields,
  value,
  onCommit,
  onDraftChange,
  onReset
}: StackDisplayNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={stackDisplayNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

function getContainerEntryObjectFileOptions(
  objectFileOptions: readonly SelectOption[],
  usedObjectFileNodeIds: ReadonlySet<string>,
  currentObjectFileNodeId: string
) {
  return objectFileOptions.filter(
    (option) =>
      option.value === currentObjectFileNodeId || !usedObjectFileNodeIds.has(option.value)
  );
}
