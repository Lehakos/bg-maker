import type {
  ProjectObjectCounterBoundsMode,
  ProjectObjectCounterDisplayMode,
  ProjectObjectDieFace,
  ProjectObjectDieFaceMode
} from "@bg-maker/shared";
import { Copy, Dices, Hash } from "lucide-react";
import type { ChangeEvent, DragEvent } from "react";
import {
  InspectorBehaviorNumberField,
  InspectorDoubleSidedControls,
  type InspectorFieldDefinition,
  InspectorInlineTextField,
  InspectorModeInfo,
  InspectorSection,
  InspectorSelectField
} from "./inspector-ui";
import {
  counterNumberFieldSettings,
  dieNumberFieldSettings,
  type CounterDraft,
  type CounterFieldKey,
  type CounterNumberFieldKey,
  type DieDraft,
  type DieFaceFieldKey,
  type DieFieldKey
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
