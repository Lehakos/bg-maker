import type {
  ProjectObjectCounterBoundsMode,
  ProjectObjectCounterDisplayMode,
  ProjectObjectDieFace,
  ProjectObjectDieFaceMode,
  ProjectObjectScoreTrackOrientation
} from "@bg-maker/shared";
import { Copy, Dices, Hash, Plus, Trash2 } from "lucide-react";
import type { ChangeEvent, DragEvent } from "react";
import {
  InspectorBehaviorNumberField,
  InspectorColorField,
  InspectorDoubleSidedControls,
  type InspectorFieldDefinition,
  InspectorInlineTextField,
  InspectorModeInfo,
  InspectorSection,
  InspectorSelectField,
  InspectorSwitchField
} from "./inspector-ui";
import {
  counterNumberFieldSettings,
  dieNumberFieldSettings,
  type CounterDraft,
  type CounterFieldKey,
  type CounterNumberFieldKey,
  type DieDraft,
  type DieFaceFieldKey,
  type DieFieldKey,
  scoreTrackMarkerValueFieldSettings,
  scoreTrackNumberFieldSettings,
  type ScoreTrackDraft,
  type ScoreTrackFieldKey,
  type ScoreTrackMarkerFieldKey,
  type ScoreTrackNumberFieldKey
} from "./project-object-inspector-state";
import {
  getProjectImageAssetDragPayload,
  hasProjectImageAssetDragData
} from "../project-library/project-drag-payloads";

type CounterNumberFieldDefinition = InspectorFieldDefinition<CounterNumberFieldKey>;

const counterValueFields: readonly CounterNumberFieldDefinition[] = [
  { key: "defaultValue", label: "Default" },
  { key: "step", label: "Step" }
];

const counterBoundsFields: readonly CounterNumberFieldDefinition[] = [
  { key: "minValue", label: "Min" },
  { key: "maxValue", label: "Max" }
];

const dieFaceCountField = {
  key: "faceCount",
  label: "Faces"
} as const satisfies InspectorFieldDefinition<keyof typeof dieNumberFieldSettings>;

const dieFaceModeOptions = [
  { label: "Text", value: "text" },
  { label: "Image", value: "image" }
] as const satisfies readonly {
  label: string;
  value: ProjectObjectDieFaceMode;
}[];

const scoreTrackNumberFields = [
  { key: "minValue", label: "Min" },
  { key: "maxValue", label: "Max" },
  { key: "step", label: "Step" }
] as const satisfies readonly InspectorFieldDefinition<ScoreTrackNumberFieldKey>[];

const scoreTrackMarkerValueField = {
  key: "value",
  label: "Value"
} as const satisfies InspectorFieldDefinition<Extract<ScoreTrackMarkerFieldKey, "value">>;

const scoreTrackMarkerColorField = {
  key: "color",
  label: "Color"
} as const satisfies InspectorFieldDefinition<Extract<ScoreTrackMarkerFieldKey, "color">>;

const scoreTrackOrientationOptions = [
  { label: "Horizontal", value: "horizontal" },
  { label: "Vertical", value: "vertical" }
] as const satisfies readonly {
  label: string;
  value: ProjectObjectScoreTrackOrientation;
}[];

const counterBoundsModeOptions = [
  { label: "Clamp", value: "clamp" },
  { label: "No bounds", value: "none" },
  { label: "Wrap", value: "wrap" }
] as const satisfies readonly {
  label: string;
  value: ProjectObjectCounterBoundsMode;
}[];

const counterDisplayModeOptions = [
  { label: "Value", value: "value" },
  { label: "Value / max", value: "valueAndMax" }
] as const satisfies readonly {
  label: string;
  value: ProjectObjectCounterDisplayMode;
}[];

const counterBoundsModeInfoItems = [
  { description: "Keeps future values between Min and Max.", label: "Clamp" },
  { description: "Cycles past Max back to Min, and past Min back to Max.", label: "Wrap" },
  { description: "Ignores Min and Max while changing the counter.", label: "No bounds" }
] as const;

const counterDisplayModeInfoItems = [
  { description: "Shows only the default value.", label: "Value" },
  { description: "Shows the default value together with Max.", label: "Value / max" }
] as const;

type ProjectObjectDoubleSidedSectionProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
};

export function ProjectObjectDoubleSidedSection({
  enabled,
  onEnabledChange
}: ProjectObjectDoubleSidedSectionProps) {
  return (
    <InspectorSection icon={<Copy size={15} />} title="Double-sided">
      <InspectorDoubleSidedControls enabled={enabled} onEnabledChange={onEnabledChange} />
    </InspectorSection>
  );
}

type ProjectObjectCounterSectionProps = {
  draft: CounterDraft;
  onCommitNumberField: (fieldKey: CounterNumberFieldKey, value: string) => void;
  onDraftChange: (fieldKey: CounterFieldKey, value: string) => void;
  onReset: (fieldKey: CounterFieldKey) => void;
};

export function ProjectObjectCounterSection({
  draft,
  onCommitNumberField,
  onDraftChange,
  onReset
}: ProjectObjectCounterSectionProps) {
  return (
    <InspectorSection icon={<Hash size={15} />} title="Counter">
      <CounterNumberGrid
        fields={counterValueFields}
        value={draft}
        onCommit={onCommitNumberField}
        onDraftChange={onDraftChange}
        onReset={onReset}
      />
      <CounterNumberGrid
        fields={counterBoundsFields}
        value={draft}
        onCommit={onCommitNumberField}
        onDraftChange={onDraftChange}
        onReset={onReset}
      />
      <div className="grid grid-cols-2 gap-2">
        <InspectorSelectField
          label="Bounds"
          info={<InspectorModeInfo items={counterBoundsModeInfoItems} />}
          infoAlign="start"
          value={draft.boundsMode}
          options={counterBoundsModeOptions}
          onChange={(value) => onDraftChange("boundsMode", value)}
        />
        <InspectorSelectField
          label="Display"
          info={<InspectorModeInfo items={counterDisplayModeInfoItems} />}
          infoAlign="end"
          value={draft.displayMode}
          options={counterDisplayModeOptions}
          onChange={(value) => onDraftChange("displayMode", value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InspectorInlineTextField
          label="Prefix"
          value={draft.prefix}
          onChange={(value) => onDraftChange("prefix", value)}
        />
        <InspectorInlineTextField
          label="Suffix"
          value={draft.suffix}
          onChange={(value) => onDraftChange("suffix", value)}
        />
      </div>
    </InspectorSection>
  );
}

type ProjectObjectScoreTrackSectionProps = {
  draft: ScoreTrackDraft;
  canAddMarker: boolean;
  onAddMarker: () => void;
  onCommitMarkerValue: (markerId: string, value: string) => void;
  onCommitNumberField: (fieldKey: ScoreTrackNumberFieldKey, value: string) => void;
  onDraftChange: (fieldKey: ScoreTrackFieldKey, value: string | boolean) => void;
  onMarkerFieldChange: (
    markerId: string,
    fieldKey: ScoreTrackMarkerFieldKey,
    value: string
  ) => void;
  onRemoveMarker: (markerId: string) => void;
  onReset: (fieldKey: ScoreTrackFieldKey) => void;
  onResetMarkerValue: (markerId: string) => void;
};

export function ProjectObjectScoreTrackSection({
  draft,
  canAddMarker,
  onAddMarker,
  onCommitMarkerValue,
  onCommitNumberField,
  onDraftChange,
  onMarkerFieldChange,
  onRemoveMarker,
  onReset,
  onResetMarkerValue
}: ProjectObjectScoreTrackSectionProps) {
  return (
    <InspectorSection icon={<Hash size={15} />} title="Score track">
      <div className="grid grid-cols-3 gap-2">
        {scoreTrackNumberFields.map((field) => (
          <InspectorBehaviorNumberField
            key={field.key}
            field={field}
            settings={scoreTrackNumberFieldSettings[field.key]}
            value={draft[field.key]}
            onCommit={onCommitNumberField}
            onDraftChange={onDraftChange}
            onReset={onReset}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InspectorSelectField
          label="Orientation"
          value={draft.orientation}
          options={scoreTrackOrientationOptions}
          onChange={(value) => onDraftChange("orientation", value)}
        />
        <div className="flex items-end pb-0.5">
          <InspectorSwitchField
            checked={draft.showLabels}
            label="Show labels"
            onChange={(event) => onDraftChange("showLabels", event.currentTarget.checked)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">Markers</span>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canAddMarker}
            title="Add marker"
            type="button"
            onClick={onAddMarker}
          >
            <Plus size={15} />
          </button>
        </div>
        {draft.markers.length ? (
          <div className="space-y-2">
            {draft.markers.map((marker) => (
              <div
                key={marker.id}
                className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2"
              >
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <InspectorInlineTextField
                      label="Label"
                      value={marker.label}
                      onChange={(value) => onMarkerFieldChange(marker.id, "label", value)}
                    />
                  </div>
                  <button
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-red-600"
                    title="Remove marker"
                    type="button"
                    onClick={() => onRemoveMarker(marker.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InspectorColorField
                    field={scoreTrackMarkerColorField}
                    value={marker.color}
                    onChange={(_, value) => onMarkerFieldChange(marker.id, "color", value)}
                  />
                  <InspectorBehaviorNumberField
                    field={scoreTrackMarkerValueField}
                    settings={scoreTrackMarkerValueFieldSettings}
                    value={marker.value}
                    onCommit={(_, value) => onCommitMarkerValue(marker.id, value)}
                    onDraftChange={(_, value) => onMarkerFieldChange(marker.id, "value", value)}
                    onReset={() => onResetMarkerValue(marker.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-500">
            No markers assigned.
          </p>
        )}
      </div>
    </InspectorSection>
  );
}

type ProjectObjectDieImageAssetOption = {
  asset: {
    id: string;
  };
  name: string;
};

type ProjectObjectDieSectionProps = {
  activeFace: ProjectObjectDieFace | null;
  activeFaceImageMissing: boolean;
  draft: DieDraft;
  imageAssets: readonly ProjectObjectDieImageAssetOption[];
  uploadError: string | null;
  uploadingImage: boolean;
  onCommitNumberField: (fieldKey: keyof typeof dieNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: DieFieldKey, value: string) => void;
  onFaceFieldChange: (fieldKey: DieFaceFieldKey, value: string) => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onReset: (fieldKey: DieFieldKey) => void;
};

export function ProjectObjectDieSection({
  activeFace,
  activeFaceImageMissing,
  draft,
  imageAssets,
  uploadError,
  uploadingImage,
  onCommitNumberField,
  onDraftChange,
  onFaceFieldChange,
  onImageUpload,
  onReset
}: ProjectObjectDieSectionProps) {
  function handleImageAssetDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasProjectImageAssetDragData(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleImageAssetDrop(event: DragEvent<HTMLDivElement>) {
    const payload = getProjectImageAssetDragPayload(event.dataTransfer);

    if (!payload) {
      return;
    }

    event.preventDefault();
    onFaceFieldChange("imageAssetId", payload.assetId);
  }

  return (
    <InspectorSection icon={<Dices size={15} />} title="Die">
      <InspectorBehaviorNumberField
        field={dieFaceCountField}
        settings={dieNumberFieldSettings.faceCount}
        value={draft.faceCount}
        onCommit={onCommitNumberField}
        onDraftChange={onDraftChange}
        onReset={onReset}
      />
      {activeFace ? (
        <>
          <InspectorSelectField
            label="Face content"
            value={activeFace.mode}
            options={dieFaceModeOptions}
            onChange={(value) => onFaceFieldChange("mode", value)}
          />
          {activeFace.mode === "image" ? (
            <div
              className="space-y-2"
              onDragOver={handleImageAssetDragOver}
              onDrop={handleImageAssetDrop}
            >
              <InspectorSelectField
                label="Asset"
                value={activeFace.imageAssetId}
                options={[
                  { label: "No image", value: "" },
                  ...imageAssets.map((imageAsset) => ({
                    label: imageAsset.name,
                    value: imageAsset.asset.id
                  }))
                ]}
                onChange={(value) => onFaceFieldChange("imageAssetId", value)}
              />
              {activeFace.imageAssetId && activeFaceImageMissing ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                  Selected image is no longer in the file tree.
                </p>
              ) : null}
              <label className="flex h-9 cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-2 text-sm font-medium text-slate-700 hover:border-sky-400 hover:bg-sky-50">
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploadingImage}
                  type="file"
                  onChange={onImageUpload}
                />
                {uploadingImage ? "Uploading..." : "Upload image"}
              </label>
              {uploadError ? (
                <p className="rounded-md border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                  {uploadError}
                </p>
              ) : null}
            </div>
          ) : (
            <InspectorInlineTextField
              label="Face text"
              value={activeFace.label}
              onChange={(value) => onFaceFieldChange("label", value)}
            />
          )}
        </>
      ) : null}
    </InspectorSection>
  );
}

type CounterNumberGridProps = {
  fields: readonly CounterNumberFieldDefinition[];
  value: CounterDraft;
  onCommit: (fieldKey: CounterNumberFieldKey, value: string) => void;
  onDraftChange: (fieldKey: CounterFieldKey, value: string) => void;
  onReset: (fieldKey: CounterFieldKey) => void;
};

function CounterNumberGrid({
  fields,
  value,
  onCommit,
  onDraftChange,
  onReset
}: CounterNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={counterNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}
