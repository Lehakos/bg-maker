import type {
  ProjectObjectTemplate,
  ProjectObjectVariableDefinition,
  ProjectObjectVariableType,
  ProjectObjectVariableValue
} from "@bg-maker/shared";
import { projectObjectVariableTypes } from "@bg-maker/shared";
import { ExternalLink, Link2, Plus, Trash2, Variable } from "lucide-react";
import type { ChangeEvent, DragEvent } from "react";
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
  InspectorColorField,
  type InspectorFieldDefinition,
  InspectorSection,
  InspectorSelectField,
  InspectorUploadField
} from "./inspector-ui";
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
        <PanelActionButton iconOnly size="field" title="Add property" onClick={onAddVariable}>
          <Plus size={15} />
        </PanelActionButton>
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
        <PanelEmptyState>No properties defined.</PanelEmptyState>
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
  onOpenSource?: () => void;
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
  onOpenSource,
  onValueChange
}: ProjectObjectLinkedObjectSectionProps) {
  return (
    <InspectorSection icon={<Link2 size={15} />} title="Based on">
      <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
        <p className="min-w-0 truncate font-semibold text-slate-800">{sourceName}</p>
        {onOpenSource ? (
          <IconButton
            icon={<ExternalLink size={13} />}
            label="Open template"
            size="sm"
            variant="neutral"
            onClick={onOpenSource}
          />
        ) : null}
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
        <PanelEmptyState>Source object has no properties.</PanelEmptyState>
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
    <PanelCard className="bg-white p-1.5">
      <div className="flex items-center gap-1.5">
        <FormInput
          className="flex-1"
          value={variable.name}
          onChange={(event) => onNameChange(variable.id, event.currentTarget.value)}
        />
        <FormSelect
          className="w-24 shrink-0 text-xs font-medium text-slate-700"
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
        </FormSelect>
        <IconButton
          icon={<Trash2 size={14} />}
          label="Remove property"
          variant="danger"
          onClick={() => onRemove(variable.id)}
        />
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
    </PanelCard>
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
          <InspectorUploadField
            accept="image/jpeg,image/png,image/webp"
            className="h-8 text-xs"
            disabled={uploading}
            label={uploading ? "Uploading..." : "Upload image"}
            onChange={handleImageUpload}
          />
        ) : null}
        {uploadError ? (
          <PanelNotice className="mt-0" variant="danger">
            {uploadError}
          </PanelNotice>
        ) : null}
      </div>
    );
  }

  if (variable.type === "color") {
    return (
      <InspectorColorField
        field={{ key: "value", label: fieldLabel } satisfies InspectorFieldDefinition<"value">}
        value={value}
        onChange={(_, nextValue) => onChange(nextValue)}
      />
    );
  }

  return (
    <label className="block text-xs font-medium text-slate-500">
      <span>{fieldLabel}</span>
      <FormInput
        className="mt-1 w-full"
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
