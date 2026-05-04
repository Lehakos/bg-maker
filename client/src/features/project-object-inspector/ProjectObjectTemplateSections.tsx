import type {
  ProjectObjectTemplate,
  ProjectObjectVariableDefinition,
  ProjectObjectVariableType,
  ProjectObjectVariableValue
} from "@bg-maker/shared";
import { projectObjectVariableTypes } from "@bg-maker/shared";
import { Link2, Plus, Trash2, Variable } from "lucide-react";
import type { ChangeEvent, DragEvent } from "react";
import { cx } from "./class-names";
import { InspectorSection, InspectorSelectField } from "./inspector-ui";
import {
  getProjectImageAssetDragPayload,
  hasProjectImageAssetDragData
} from "../project-library/project-drag-payloads";

type ImageAssetOption = {
  asset: {
    id: string;
  };
  name: string;
};

type ProjectObjectTemplateSectionProps = {
  imageAssets: readonly ImageAssetOption[];
  template: ProjectObjectTemplate;
  onAddVariable: () => void;
  onRemoveVariable: (variableId: string) => void;
  onVariableDefaultValueChange: (variable: ProjectObjectVariableDefinition, value: string) => void;
  onVariableImageUpload: (variable: ProjectObjectVariableDefinition, file: File) => void;
  onVariableNameChange: (variableId: string, name: string) => void;
  onVariableTypeChange: (variableId: string, type: ProjectObjectVariableType) => void;
  uploadErrors: Readonly<Record<string, string>>;
  uploadingVariableId: string | null;
};

export function ProjectObjectTemplateSection({
  imageAssets,
  template,
  onAddVariable,
  onRemoveVariable,
  onVariableDefaultValueChange,
  onVariableImageUpload,
  onVariableNameChange,
  onVariableTypeChange,
  uploadErrors,
  uploadingVariableId
}: ProjectObjectTemplateSectionProps) {
  return (
    <InspectorSection
      icon={<Variable size={15} />}
      info="Define reusable properties here, then bind them to object fields with the chain icon next to supported properties. Create objects based on this template from File tree > Create > Object, under Custom objects."
      infoAlign="start"
      title="Template"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">
          {template.variables.length} propert{template.variables.length === 1 ? "y" : "ies"}
        </span>
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
          title="Add property"
          type="button"
          onClick={onAddVariable}
        >
          <Plus size={15} />
        </button>
      </div>

      {template.variables.length ? (
        <div className="space-y-1.5">
          {template.variables.map((variable) => (
            <VariableRow
              key={variable.id}
              imageAssets={imageAssets}
              variable={variable}
              onDefaultValueChange={onVariableDefaultValueChange}
              onImageUpload={onVariableImageUpload}
              onNameChange={onVariableNameChange}
              onRemove={onRemoveVariable}
              onTypeChange={onVariableTypeChange}
              uploadError={uploadErrors[variable.id] ?? null}
              uploading={uploadingVariableId === variable.id}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-500">
          No properties defined.
        </p>
      )}
    </InspectorSection>
  );
}

type ProjectObjectLinkedObjectSectionProps = {
  imageAssets: readonly ImageAssetOption[];
  sourceName: string;
  template: ProjectObjectTemplate;
  values: Record<string, ProjectObjectVariableValue>;
  uploadErrors: Readonly<Record<string, string>>;
  uploadingVariableId: string | null;
  onImageUpload: (variable: ProjectObjectVariableDefinition, file: File) => void;
  onValueChange: (variable: ProjectObjectVariableDefinition, value: string) => void;
};

export function ProjectObjectLinkedObjectSection({
  imageAssets,
  sourceName,
  template,
  values,
  uploadErrors,
  uploadingVariableId,
  onImageUpload,
  onValueChange
}: ProjectObjectLinkedObjectSectionProps) {
  return (
    <InspectorSection icon={<Link2 size={15} />} title="Based on">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">{sourceName}</p>
      </div>
      {template.variables.length ? (
        <div className="space-y-1.5">
          {template.variables.map((variable) => (
            <VariableValueField
              key={variable.id}
              imageAssets={imageAssets}
              uploadError={uploadErrors[variable.id] ?? null}
              uploading={uploadingVariableId === variable.id}
              value={String(values[variable.id] ?? variable.defaultValue)}
              variable={variable}
              onChange={(value) => onValueChange(variable, value)}
              onImageUpload={onImageUpload}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-500">
          Source object has no properties.
        </p>
      )}
    </InspectorSection>
  );
}

type VariableRowProps = {
  imageAssets: readonly ImageAssetOption[];
  variable: ProjectObjectVariableDefinition;
  onDefaultValueChange: (variable: ProjectObjectVariableDefinition, value: string) => void;
  onImageUpload: (variable: ProjectObjectVariableDefinition, file: File) => void;
  onNameChange: (variableId: string, name: string) => void;
  onRemove: (variableId: string) => void;
  onTypeChange: (variableId: string, type: ProjectObjectVariableType) => void;
  uploadError: string | null;
  uploading: boolean;
};

function VariableRow({
  imageAssets,
  variable,
  onDefaultValueChange,
  onImageUpload,
  onNameChange,
  onRemove,
  onTypeChange,
  uploadError,
  uploading
}: VariableRowProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-1.5">
      <div className="flex items-center gap-1.5">
        <input
          className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 px-2 text-sm text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          value={variable.name}
          onChange={(event) => onNameChange(variable.id, event.currentTarget.value)}
        />
        <select
          className="h-8 w-24 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          value={variable.type}
          onChange={(event) =>
            onTypeChange(variable.id, event.currentTarget.value as ProjectObjectVariableType)
          }
        >
          {projectObjectVariableTypes.map((type) => (
            <option key={type} value={type}>
              {getVariableTypeLabel(type)}
            </option>
          ))}
        </select>
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-100 text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          title="Remove property"
          type="button"
          onClick={() => onRemove(variable.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="mt-1.5">
        <VariableValueField
          imageAssets={imageAssets}
          label="Default"
          uploadError={uploadError}
          uploading={uploading}
          value={String(variable.defaultValue)}
          variable={variable}
          onChange={(value) => onDefaultValueChange(variable, value)}
          onImageUpload={onImageUpload}
        />
      </div>
    </div>
  );
}

type VariableValueFieldProps = {
  imageAssets: readonly ImageAssetOption[];
  label?: string;
  uploadError?: string | null;
  uploading?: boolean;
  value: string;
  variable: ProjectObjectVariableDefinition;
  onChange: (value: string) => void;
  onImageUpload?: (variable: ProjectObjectVariableDefinition, file: File) => void;
};

function VariableValueField({
  imageAssets,
  label,
  uploadError,
  uploading = false,
  value,
  variable,
  onChange,
  onImageUpload
}: VariableValueFieldProps) {
  const fieldLabel = label ?? variable.name;

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (file) {
      onImageUpload?.(variable, file);
    }
  }

  function handleImageAssetDragOver(event: DragEvent<HTMLDivElement>) {
    if (variable.type !== "image" || !hasProjectImageAssetDragData(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleImageAssetDrop(event: DragEvent<HTMLDivElement>) {
    if (variable.type !== "image") {
      return;
    }

    const payload = getProjectImageAssetDragPayload(event.dataTransfer);

    if (!payload) {
      return;
    }

    event.preventDefault();
    onChange(payload.assetId);
  }

  if (variable.type === "image") {
    return (
      <div
        className="space-y-1.5"
        onDragOver={handleImageAssetDragOver}
        onDrop={handleImageAssetDrop}
      >
        <InspectorSelectField
          label={fieldLabel}
          value={value}
          options={[
            { label: "No image", value: "" },
            ...imageAssets.map((imageAsset) => ({
              label: imageAsset.name,
              value: imageAsset.asset.id
            }))
          ]}
          onChange={onChange}
        />
        {onImageUpload ? (
          <label
            className={cx(
              "flex h-8 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-2 text-xs font-medium text-slate-700",
              uploading
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:border-sky-400 hover:bg-sky-50"
            )}
          >
            <input
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              type="file"
              onChange={handleImageUpload}
            />
            {uploading ? "Uploading..." : "Upload image"}
          </label>
        ) : null}
        {uploadError ? (
          <p className="rounded-md border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-700">
            {uploadError}
          </p>
        ) : null}
      </div>
    );
  }

  if (variable.type === "color") {
    return (
      <label className="block text-xs font-medium text-slate-500">
        <span>{fieldLabel}</span>
        <span className="mt-1 flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2">
          <input
            className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
            type="color"
            value={value}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
          <span className="truncate text-xs tabular-nums text-slate-600">{value}</span>
        </span>
      </label>
    );
  }

  return (
    <label className="block text-xs font-medium text-slate-500">
      <span>{fieldLabel}</span>
      <input
        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        inputMode={variable.type === "number" ? "decimal" : undefined}
        type={variable.type === "number" ? "number" : "text"}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function getVariableTypeLabel(type: ProjectObjectVariableType) {
  if (type === "image") {
    return "Image";
  }

  if (type === "number") {
    return "Number";
  }

  if (type === "color") {
    return "Color";
  }

  return "Text";
}
