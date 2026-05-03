import type {
  ProjectObjectImageFit,
  ProjectObjectShape,
  ProjectObjectShapePoint,
  ProjectObjectTextAlign,
  ProjectObjectTextVerticalAlign
} from "@bg-maker/shared";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ImagePlus,
  Shapes,
  Type,
  type LucideIcon
} from "lucide-react";
import type { ChangeEvent } from "react";
import { cx } from "./class-names";
import {
  InspectorBehaviorNumberField,
  InspectorColorField,
  type InspectorFieldDefinition,
  InspectorIconSegmentedField,
  InspectorSection,
  InspectorSelectField,
  InspectorTextareaField,
  TextStyleToggleField
} from "./inspector-ui";
import {
  ProjectObjectVariableBindingField,
  type VariableBindingFieldState
} from "./ProjectObjectVariableBindingField";
import {
  imageNumberFieldSettings,
  textNumberFieldSettings,
  type ImageDraft,
  type ImageFieldKey,
  type ShapePolygonPointFieldKey,
  type TextDraft,
  type TextFieldKey
} from "./project-object-inspector-state";
import { ProjectObjectShapePolygonEditor } from "./ProjectObjectShapePolygonEditor";

type TextNumberFieldDefinition = InspectorFieldDefinition<keyof typeof textNumberFieldSettings>;

type ImageNumberFieldDefinition = InspectorFieldDefinition<keyof typeof imageNumberFieldSettings>;

const textNumberFields: readonly TextNumberFieldDefinition[] = [
  { key: "fontSize", label: "Size" },
  { key: "lineHeight", label: "Line" }
];

const imageNumberFields: readonly ImageNumberFieldDefinition[] = [
  { key: "positionX", label: "Pos X" },
  { key: "positionY", label: "Pos Y" }
];

const textColorFields = [{ key: "color", label: "Color" }] as const satisfies readonly {
  key: Extract<TextFieldKey, "color">;
  label: string;
}[];

const textAlignOptions = [
  { icon: AlignLeft, label: "Align left", value: "left" },
  { icon: AlignCenter, label: "Align center", value: "center" },
  { icon: AlignRight, label: "Align right", value: "right" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectTextAlign;
}[];

const textVerticalAlignOptions = [
  { icon: AlignVerticalJustifyStart, label: "Align top", value: "top" },
  { icon: AlignVerticalJustifyCenter, label: "Align middle", value: "middle" },
  { icon: AlignVerticalJustifyEnd, label: "Align bottom", value: "bottom" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectTextVerticalAlign;
}[];

const imageFitOptions = [
  { label: "Contain", value: "contain" },
  { label: "Cover", value: "cover" },
  { label: "Fill", value: "fill" },
  { label: "Scale down", value: "scaleDown" }
] as const satisfies readonly {
  label: string;
  value: ProjectObjectImageFit;
}[];

const shapeVariantOptions = [
  { label: "Rectangle", value: "rectangle" },
  { label: "Ellipse", value: "ellipse" },
  { label: "Diamond", value: "diamond" },
  { label: "Hexagon", value: "hexagon" },
  { label: "Triangle", value: "triangle" },
  { label: "Custom", value: "polygon" }
] as const;

type ProjectObjectImageAssetOption = {
  asset: {
    id: string;
  };
  name: string;
};

type ProjectObjectTextSectionProps = {
  contentBinding?: VariableBindingFieldState;
  draft: TextDraft;
  isBold: boolean;
  isItalic: boolean;
  textColorBinding?: VariableBindingFieldState;
  onBoldChange: (isBold: boolean) => void;
  onCommitNumberField: (fieldKey: keyof typeof textNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: TextFieldKey, value: string) => void;
  onItalicChange: (isItalic: boolean) => void;
  onReset: (fieldKey: TextFieldKey) => void;
};

export function ProjectObjectTextSection({
  contentBinding,
  draft,
  isBold,
  isItalic,
  textColorBinding,
  onBoldChange,
  onCommitNumberField,
  onDraftChange,
  onItalicChange,
  onReset
}: ProjectObjectTextSectionProps) {
  const contentBound = Boolean(contentBinding?.value);
  const textColorBound = Boolean(textColorBinding?.value);

  return (
    <InspectorSection icon={<Type size={15} />} title="Text">
      <InspectorTextareaField
        disabled={contentBound}
        labelAction={<ProjectObjectVariableBindingField binding={contentBinding} />}
        label="Content"
        value={draft.content}
        onChange={(value) => onDraftChange("content", value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <InspectorColorField
          disabled={textColorBound}
          field={textColorFields[0]}
          labelAction={<ProjectObjectVariableBindingField binding={textColorBinding} />}
          value={draft.color}
          onChange={onDraftChange}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TextStyleToggleField
          isBold={isBold}
          isItalic={isItalic}
          onBoldChange={onBoldChange}
          onItalicChange={onItalicChange}
        />
        <InspectorIconSegmentedField
          label="Align"
          value={draft.textAlign}
          options={textAlignOptions}
          onChange={(value) => onDraftChange("textAlign", value)}
        />
      </div>
      <InspectorIconSegmentedField
        label="Vertical"
        value={draft.verticalAlign}
        options={textVerticalAlignOptions}
        onChange={(value) => onDraftChange("verticalAlign", value)}
      />
      <TextNumberGrid
        fields={textNumberFields}
        value={draft}
        onCommit={onCommitNumberField}
        onDraftChange={onDraftChange}
        onReset={onReset}
      />
    </InspectorSection>
  );
}

type ProjectObjectImageSectionProps = {
  assetBinding?: VariableBindingFieldState;
  draft: ImageDraft;
  imageAssetId: string;
  imageAssetMissing: boolean;
  imageAssets: readonly ProjectObjectImageAssetOption[];
  uploadError: string | null;
  uploadingImage: boolean;
  onCommitNumberField: (fieldKey: keyof typeof imageNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: ImageFieldKey, value: string) => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onReset: (fieldKey: ImageFieldKey) => void;
};

export function ProjectObjectImageSection({
  assetBinding,
  draft,
  imageAssetId,
  imageAssetMissing,
  imageAssets,
  uploadError,
  uploadingImage,
  onCommitNumberField,
  onDraftChange,
  onImageUpload,
  onReset
}: ProjectObjectImageSectionProps) {
  const assetBound = Boolean(assetBinding?.value);

  return (
    <InspectorSection icon={<ImagePlus size={15} />} title="Image">
      <InspectorSelectField
        disabled={assetBound}
        labelAction={<ProjectObjectVariableBindingField binding={assetBinding} />}
        label="Asset"
        value={draft.assetId}
        options={[
          { label: "No image", value: "" },
          ...imageAssets.map((imageAsset) => ({
            label: imageAsset.name,
            value: imageAsset.asset.id
          }))
        ]}
        onChange={(value) => onDraftChange("assetId", value)}
      />
      {imageAssetId && imageAssetMissing ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
          Selected image is no longer in the file tree.
        </p>
      ) : null}
      <label
        className={cx(
          "flex h-9 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-2 text-sm font-medium text-slate-700",
          assetBound
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-sky-400 hover:bg-sky-50"
        )}
      >
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={uploadingImage || assetBound}
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
      <InspectorSelectField
        label="Fit"
        value={draft.fit}
        options={imageFitOptions}
        onChange={(value) => onDraftChange("fit", value)}
      />
      <ImageNumberGrid
        fields={imageNumberFields}
        value={draft}
        onCommit={onCommitNumberField}
        onDraftChange={onDraftChange}
        onReset={onReset}
      />
    </InspectorSection>
  );
}

type ProjectObjectShapeSectionProps = {
  polygonPoints: readonly ProjectObjectShapePoint[];
  shape: ProjectObjectShape;
  onAddPolygonPoint: () => void;
  onPolygonPointChange: (pointIndex: number, point: ProjectObjectShapePoint) => void;
  onPolygonPointDraftFieldChange: (
    pointIndex: number,
    fieldKey: ShapePolygonPointFieldKey,
    value: string
  ) => void;
  onRemovePolygonPoint: (pointIndex: number) => void;
  onResetPolygonPoints: () => void;
  onVariantChange: (value: string) => void;
};

export function ProjectObjectShapeSection({
  polygonPoints,
  shape,
  onAddPolygonPoint,
  onPolygonPointChange,
  onPolygonPointDraftFieldChange,
  onRemovePolygonPoint,
  onResetPolygonPoints,
  onVariantChange
}: ProjectObjectShapeSectionProps) {
  return (
    <InspectorSection icon={<Shapes size={15} />} title="Shape">
      <InspectorSelectField
        label="Variant"
        value={shape.variant}
        options={shapeVariantOptions}
        onChange={onVariantChange}
      />
      {shape.variant === "polygon" ? (
        <ProjectObjectShapePolygonEditor
          points={polygonPoints}
          onAddPoint={onAddPolygonPoint}
          onPointChange={onPolygonPointChange}
          onPointDraftFieldChange={onPolygonPointDraftFieldChange}
          onRemovePoint={onRemovePolygonPoint}
          onReset={onResetPolygonPoints}
        />
      ) : null}
    </InspectorSection>
  );
}

type TextNumberGridProps = {
  fields: readonly TextNumberFieldDefinition[];
  value: TextDraft;
  onCommit: (fieldKey: keyof typeof textNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: TextFieldKey, value: string) => void;
  onReset: (fieldKey: TextFieldKey) => void;
};

function TextNumberGrid({ fields, value, onCommit, onDraftChange, onReset }: TextNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={textNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

type ImageNumberGridProps = {
  fields: readonly ImageNumberFieldDefinition[];
  value: ImageDraft;
  onCommit: (fieldKey: keyof typeof imageNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: ImageFieldKey, value: string) => void;
  onReset: (fieldKey: ImageFieldKey) => void;
};

function ImageNumberGrid({
  fields,
  value,
  onCommit,
  onDraftChange,
  onReset
}: ImageNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={imageNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}
