import type {
  ProjectObjectBagAppearanceVariant,
  ProjectObjectCardSizePresetValue,
  ProjectObjectContainer,
  ProjectObjectKind,
  ProjectObjectMeepleVisualVariant,
  ProjectObjectZoneMode
} from "@bg-maker/shared";
import { ArrowDown, ArrowUp, Boxes, Plus, Rows3, Scan, Trash2 } from "lucide-react";
import type { KeyboardEvent } from "react";
import {
  FormInput,
  FormSelect,
  IconButton,
  PanelActionButton,
  PanelCard,
  PanelEmptyState,
  PanelNotice
} from "../../components";
import {
  BagIcon,
  BoxIcon,
  CardIcon,
  ConePieceIcon,
  CubePieceIcon,
  CylinderPieceIcon,
  MeepleIcon,
  PawnIcon,
  StandeeIcon
} from "../project-objects/project-object-icons";
import { cx } from "./class-names";
import {
  InspectorBehaviorNumberGrid,
  InspectorBehaviorNumberField,
  type InspectorFieldDefinition,
  InspectorIconSegmentedField,
  InspectorSection,
  InspectorSelectField,
  InspectorSwitchField
} from "./inspector-ui";
import {
  formatContainerEntryQuantityValue,
  getContainerEntryReferenceValue,
  stackDisplayNumberFieldSettings,
  zoneNumberFieldSettings,
  type BagDraft,
  type CardDraft,
  type MeepleDraft,
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

type StackDisplayNumberFieldDefinition = InspectorFieldDefinition<StackDisplayNumberFieldKey>;

const stackDisplayLayerField = {
  key: "visibleItemCount",
  label: "Visible"
} as const satisfies StackDisplayNumberFieldDefinition;

const stackDisplayOffsetFields: readonly StackDisplayNumberFieldDefinition[] = [
  { key: "stackOffsetX", label: "Offset X" },
  { key: "stackOffsetY", label: "Offset Y" }
];

const zoneSlotsField = {
  key: "slots",
  label: "Slots"
} as const satisfies InspectorFieldDefinition<ZoneNumberFieldKey>;

const zoneModeOptions = [
  { label: "Free", value: "free" },
  { label: "Slots", value: "slots" }
] as const satisfies readonly { label: string; value: ProjectObjectZoneMode }[];

const bagAppearanceVariantOptions = [
  { icon: BagIcon, label: "Bag", value: "bag" },
  { icon: BoxIcon, label: "Box", value: "box" }
] as const;

const meepleVisualVariantOptions = [
  { icon: MeepleIcon, label: "Meeple", value: "meeple" },
  { icon: PawnIcon, label: "Pawn", value: "pawn" },
  { icon: CubePieceIcon, label: "Cube", value: "cube" },
  { icon: CylinderPieceIcon, label: "Cylinder", value: "cylinder" },
  { icon: ConePieceIcon, label: "Cone", value: "cone" },
  { icon: StandeeIcon, label: "Standee", value: "standee" }
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

type ProjectObjectMeepleSectionProps = {
  draft: MeepleDraft;
  onVisualVariantChange: (value: ProjectObjectMeepleVisualVariant) => void;
};

export function ProjectObjectMeepleSection({
  draft,
  onVisualVariantChange
}: ProjectObjectMeepleSectionProps) {
  return (
    <InspectorSection icon={<MeepleIcon size={15} />} title="Meeple">
      <InspectorIconSegmentedField
        label="Visual"
        value={draft.visualVariant}
        options={meepleVisualVariantOptions}
        onChange={onVisualVariantChange}
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
  usedObjectReferenceValues: ReadonlySet<string>;
  onAddEntry: () => void;
  onCommitDraftEntry: (rowId: number, referenceValue: string) => void;
  onCommitQuantity: (entryIndex: number, value: string) => void;
  onMoveEntry: (entryIndex: number, direction: -1 | 1) => void;
  onObjectFileChange: (entryIndex: number, referenceValue: string) => void;
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
  usedObjectReferenceValues,
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
        <PanelActionButton
          iconOnly
          size="field"
          disabled={!canAddDraftRow}
          title="Add object"
          onClick={onAddEntry}
        >
          <Plus size={15} />
        </PanelActionButton>
      </div>
      {container.entries.length || draftRowIds.length ? (
        <div className="space-y-1.5">
          {container.entries.map((entry, index) => (
            <ContainerEntryRow
              key={`${getContainerEntryReferenceValue(entry)}:${index}`}
              canMoveDown={index < container.entries.length - 1}
              canMoveUp={index > 0}
              index={index}
              entry={entry}
              objectFileOptions={getContainerEntryObjectFileOptions(
                objectFileOptions,
                usedObjectReferenceValues,
                getContainerEntryReferenceValue(entry)
              )}
              quantityDraft={
                quantityDrafts[index] ?? formatContainerEntryQuantityValue(entry.quantity)
              }
              valid={objectFileOptionById.has(getContainerEntryReferenceValue(entry))}
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
              onObjectFileChange={(referenceValue) => onCommitDraftEntry(rowId, referenceValue)}
              onRemove={() => onRemoveDraftEntry(rowId)}
            />
          ))}
        </div>
      ) : (
        <PanelEmptyState>No objects assigned.</PanelEmptyState>
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
  sizeReferenceObjectFileId: string;
  onCommitSlots: (fieldKey: ZoneNumberFieldKey, value: string) => void;
  onDraftChange: (fieldKey: ZoneFieldKey, value: string) => void;
  onReset: (fieldKey: ZoneFieldKey) => void;
};

export function ProjectObjectZoneSection({
  draft,
  referenceMissing,
  referenceOptions,
  sizeReferenceObjectFileId,
  onCommitSlots,
  onDraftChange,
  onReset
}: ProjectObjectZoneSectionProps) {
  return (
    <InspectorSection icon={<Scan size={15} />} title="Zone">
      <InspectorSelectField
        label="Mode"
        value={draft.mode}
        options={zoneModeOptions}
        onChange={(value) => onDraftChange("mode", value)}
      />
      {draft.mode === "slots" ? (
        <>
          <InspectorSelectField
            label="Size reference"
            value={draft.sizeReferenceObjectFileId}
            options={referenceOptions}
            onChange={(value) => onDraftChange("sizeReferenceObjectFileId", value)}
          />
          {sizeReferenceObjectFileId && referenceMissing ? (
            <PanelNotice className="mt-0">
              Selected object file is missing or uses an unsupported zone root.
            </PanelNotice>
          ) : null}
          <InspectorBehaviorNumberField
            field={zoneSlotsField}
            settings={zoneNumberFieldSettings.slots}
            value={draft.slots}
            onCommit={onCommitSlots}
            onDraftChange={onDraftChange}
            onReset={onReset}
          />
        </>
      ) : null}
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
  onObjectFileChange: (entryIndex: number, referenceValue: string) => void;
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
  const referenceValue = getContainerEntryReferenceValue(entry);
  const options = valid
    ? objectFileOptions
    : [
        {
          label: `${referenceValue} (missing)`,
          value: referenceValue
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
    <PanelCard className="bg-white p-1.5">
      <div className="flex items-center gap-1.5">
        <FormSelect
          aria-label="Object"
          className={cx("flex-1", valid ? "border-slate-200" : "border-amber-300 text-amber-900")}
          title="Object"
          value={referenceValue}
          onChange={(event) => onObjectFileChange(index, event.currentTarget.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FormSelect>
        <FormInput
          className="w-14 shrink-0 tabular-nums"
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
        <IconButton
          disabled={!canMoveUp}
          icon={<ArrowUp size={14} />}
          label="Move up"
          variant="neutral"
          onClick={() => onMove(index, -1)}
        />
        <IconButton
          disabled={!canMoveDown}
          icon={<ArrowDown size={14} />}
          label="Move down"
          variant="neutral"
          onClick={() => onMove(index, 1)}
        />
        <IconButton
          icon={<Trash2 size={14} />}
          label="Remove"
          variant="danger"
          onClick={() => onRemove(index)}
        />
      </div>
      {!valid ? (
        <p className="mt-1 truncate px-1 text-xs text-amber-700">
          Missing or unsupported object file.
        </p>
      ) : null}
    </PanelCard>
  );
}

type ContainerDraftEntryRowProps = {
  objectFileOptions: readonly SelectOption[];
  onObjectFileChange: (referenceValue: string) => void;
  onRemove: () => void;
};

function ContainerDraftEntryRow({
  objectFileOptions,
  onObjectFileChange,
  onRemove
}: ContainerDraftEntryRowProps) {
  return (
    <PanelEmptyState className="p-1.5">
      <div className="flex items-center gap-1.5">
        <FormSelect
          aria-label="Object"
          className="flex-1 text-slate-500"
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
        </FormSelect>
        <FormInput
          className="w-14 shrink-0 tabular-nums text-slate-400"
          disabled
          inputMode="numeric"
          title="Quantity"
          type="number"
          value="1"
          readOnly
        />
        <IconButton
          icon={<Trash2 size={14} />}
          label="Remove"
          variant="danger"
          onClick={onRemove}
        />
      </div>
    </PanelEmptyState>
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
    <InspectorBehaviorNumberGrid
      fields={fields}
      settingsByField={stackDisplayNumberFieldSettings}
      value={value}
      onCommit={onCommit}
      onDraftChange={onDraftChange}
      onReset={onReset}
    />
  );
}

function getContainerEntryObjectFileOptions(
  objectFileOptions: readonly SelectOption[],
  usedObjectReferenceValues: ReadonlySet<string>,
  currentReferenceValue: string
) {
  return objectFileOptions.filter(
    (option) =>
      option.value === currentReferenceValue || !usedObjectReferenceValues.has(option.value)
  );
}
