import type {
  ProjectObjectIconStyle,
  ProjectObjectImageFit,
  ProjectObjectShape,
  ProjectObjectShapePoint,
  ProjectObjectTextAlign,
  ProjectObjectTextEffectMode,
  ProjectObjectTextFontFamily,
  ProjectObjectTextVerticalAlign
} from "@bg-maker/shared";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  createLucideIcon,
  ImagePlus,
  Shapes,
  Star,
  Type,
  type LucideIcon
} from "lucide-react";
import type { ChangeEvent, DragEvent } from "react";
import { cx } from "./class-names";
import {
  InspectorBehaviorNumberField,
  InspectorColorField,
  type InspectorFieldDefinition,
  InspectorIconSegmentedField,
  InspectorSection,
  InspectorSelectField,
  InspectorSwitchField,
  InspectorTextareaField,
  TextStyleToggleField
} from "./inspector-ui";
import {
  ProjectObjectVariableBindingField,
  type VariableBindingFieldState
} from "./ProjectObjectVariableBindingField";
import {
  imageNumberFieldSettings,
  type IconDraft,
  type IconFieldKey,
  textNumberFieldSettings,
  type ImageDraft,
  type ImageFieldKey,
  type ShapePolygonPointFieldKey,
  type TextDraft,
  type TextFieldKey
} from "./project-object-inspector-state";
import { ProjectObjectShapePolygonEditor } from "./ProjectObjectShapePolygonEditor";
import { projectObjectIconRegistry } from "../project-objects/project-object-icon-registry";
import {
  getProjectImageAssetDragPayload,
  hasProjectImageAssetDragData
} from "../project-library/project-drag-payloads";

type TextNumberFieldDefinition = InspectorFieldDefinition<keyof typeof textNumberFieldSettings>;

type ImageNumberFieldDefinition = InspectorFieldDefinition<keyof typeof imageNumberFieldSettings>;

const textNumberFields: readonly TextNumberFieldDefinition[] = [
  { key: "fontSize", label: "Size" },
  { key: "minFontSize", label: "Min size" },
  { key: "lineHeight", label: "Line" }
];

const textEffectStrengthField = {
  key: "effectStrength",
  label: "Strength"
} as const satisfies TextNumberFieldDefinition;

const imageNumberFields: readonly ImageNumberFieldDefinition[] = [
  { key: "positionX", label: "Pos X" },
  { key: "positionY", label: "Pos Y" }
];

const textColorFields = [{ key: "color", label: "Color" }] as const satisfies readonly {
  key: Extract<TextFieldKey, "color">;
  label: string;
}[];

const textEffectColorField = { key: "effectColor", label: "Color" } as const satisfies {
  key: Extract<TextFieldKey, "effectColor">;
  label: string;
};

const iconColorFields = [{ key: "color", label: "Color" }] as const satisfies readonly {
  key: Extract<IconFieldKey, "color">;
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

const TextVerticalAlignTopIcon = createLucideIcon("text-vertical-align-top", [
  ["path", { d: "M21 3H3", key: "line-1" }],
  ["path", { d: "M17 7H7", key: "line-2" }],
  ["path", { d: "M19 11H5", key: "line-3" }]
]);

const TextVerticalAlignMiddleIcon = createLucideIcon("text-vertical-align-middle", [
  ["path", { d: "M21 7H3", key: "line-1" }],
  ["path", { d: "M17 12H7", key: "line-2" }],
  ["path", { d: "M19 17H5", key: "line-3" }]
]);

const TextVerticalAlignBottomIcon = createLucideIcon("text-vertical-align-bottom", [
  ["path", { d: "M21 13H3", key: "line-1" }],
  ["path", { d: "M17 17H7", key: "line-2" }],
  ["path", { d: "M19 21H5", key: "line-3" }]
]);

const textVerticalAlignOptions = [
  { icon: TextVerticalAlignTopIcon, label: "Align top", value: "top" },
  { icon: TextVerticalAlignMiddleIcon, label: "Align middle", value: "middle" },
  { icon: TextVerticalAlignBottomIcon, label: "Align bottom", value: "bottom" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectTextVerticalAlign;
}[];

const textFontFamilyOptions = [
  { label: "System", value: "system" },
  { label: "Serif", value: "serif" },
  { label: "Mono", value: "mono" },
  { label: "Rounded", value: "rounded" },
  { label: "Condensed", value: "condensed" }
] as const satisfies readonly {
  label: string;
  value: ProjectObjectTextFontFamily;
}[];

const textEffectModeOptions = [
  { label: "None", value: "none" },
  { label: "Shadow", value: "shadow" },
  { label: "Outline", value: "outline" }
] as const satisfies readonly {
  label: string;
  value: ProjectObjectTextEffectMode;
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

const iconStyleOptions = [
  { label: "Outline", value: "outline" },
  { label: "Filled", value: "filled" }
] as const satisfies readonly {
  label: string;
  value: ProjectObjectIconStyle;
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
  onDraftChange: (fieldKey: TextFieldKey, value: string | boolean) => void;
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
        <InspectorSelectField
          label="Font"
          value={draft.fontFamily}
          options={textFontFamilyOptions}
          onChange={(value) => onDraftChange("fontFamily", value)}
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
          iconSize={18}
          label="Align"
          value={draft.textAlign}
          options={textAlignOptions}
          onChange={(value) => onDraftChange("textAlign", value)}
        />
      </div>
      <InspectorIconSegmentedField
        iconSize={18}
        label="Vertical"
        value={draft.verticalAlign}
        options={textVerticalAlignOptions}
        onChange={(value) => onDraftChange("verticalAlign", value)}
      />
      <InspectorSwitchField
        checked={draft.autoFit}
        label="Auto-fit"
        onChange={(event) => onDraftChange("autoFit", event.currentTarget.checked)}
      />
      <TextNumberGrid
        fields={textNumberFields}
        value={draft}
        onCommit={onCommitNumberField}
        onDraftChange={onDraftChange}
        onReset={onReset}
      />
      <div className="grid grid-cols-2 gap-2">
        <InspectorSelectField
          label="Effect"
          value={draft.effectMode}
          options={textEffectModeOptions}
          onChange={(value) => onDraftChange("effectMode", value)}
        />
        <InspectorColorField
          disabled={draft.effectMode === "none"}
          field={textEffectColorField}
          value={draft.effectColor}
          onChange={onDraftChange}
        />
      </div>
      {draft.effectMode !== "none" ? (
        <InspectorBehaviorNumberField
          field={textEffectStrengthField}
          settings={textNumberFieldSettings.effectStrength}
          value={draft.effectStrength}
          onCommit={onCommitNumberField}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ) : null}
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

  function handleImageAssetDragOver(event: DragEvent<HTMLDivElement>) {
    if (assetBound || !hasProjectImageAssetDragData(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleImageAssetDrop(event: DragEvent<HTMLDivElement>) {
    if (assetBound) {
      return;
    }

    const payload = getProjectImageAssetDragPayload(event.dataTransfer);

    if (!payload) {
      return;
    }

    event.preventDefault();
    onDraftChange("assetId", payload.assetId);
  }

  return (
    <InspectorSection icon={<ImagePlus size={15} />} title="Image">
      <div onDragOver={handleImageAssetDragOver} onDrop={handleImageAssetDrop}>
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
      </div>
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

type ProjectObjectIconSectionProps = {
  colorBinding?: VariableBindingFieldState;
  draft: IconDraft;
  symbolBinding?: VariableBindingFieldState;
  onDraftChange: (fieldKey: IconFieldKey, value: string) => void;
};

export function ProjectObjectIconSection({
  colorBinding,
  draft,
  symbolBinding,
  onDraftChange
}: ProjectObjectIconSectionProps) {
  const colorBound = Boolean(colorBinding?.value);
  const symbolBound = Boolean(symbolBinding?.value);

  return (
    <InspectorSection icon={<Star size={15} />} title="Icon">
      <div className="block min-w-0 text-xs font-medium text-slate-500">
        <span className="flex min-h-5 min-w-0 items-center gap-1.5">
          <span className="truncate">Symbol</span>
          <ProjectObjectVariableBindingField binding={symbolBinding} />
        </span>
        <div className="mt-1 grid grid-cols-5 gap-1">
          {projectObjectIconRegistry.map((entry) => {
            const Icon = entry.icon;
            const active = draft.symbol === entry.symbol;

            return (
              <button
                key={entry.symbol}
                aria-label={entry.label}
                aria-pressed={active}
                className={cx(
                  "flex h-8 min-w-0 items-center justify-center rounded-md border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-100",
                  active
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
                  symbolBound && "cursor-not-allowed opacity-60"
                )}
                disabled={symbolBound}
                title={entry.label}
                type="button"
                onClick={() => onDraftChange("symbol", entry.symbol)}
              >
                <Icon
                  size={16}
                  fill={active && draft.style === "filled" ? "currentColor" : "none"}
                  strokeWidth={2.1}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InspectorColorField
          disabled={colorBound}
          field={iconColorFields[0]}
          labelAction={<ProjectObjectVariableBindingField binding={colorBinding} />}
          value={draft.color}
          onChange={onDraftChange}
        />
        <IconStyleSegmentedField
          value={draft.style}
          onChange={(value) => onDraftChange("style", value)}
        />
      </div>
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

type IconStyleSegmentedFieldProps = {
  value: ProjectObjectIconStyle;
  onChange: (value: ProjectObjectIconStyle) => void;
};

function IconStyleSegmentedField({ value, onChange }: IconStyleSegmentedFieldProps) {
  return (
    <div className="block min-w-0 text-xs font-medium text-slate-500">
      <span className="flex min-h-5 items-center">Style</span>
      <div className="mt-1 flex h-8 overflow-hidden rounded-md border border-slate-200 bg-white">
        {iconStyleOptions.map((option, index) => {
          const active = value === option.value;
          const filled = option.value === "filled";

          return (
            <button
              key={option.value}
              aria-label={option.label}
              aria-pressed={active}
              className={cx(
                "flex h-full min-w-0 flex-1 items-center justify-center gap-1.5 px-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-100",
                index > 0 && "border-l border-slate-200",
                active
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
              title={option.label}
              type="button"
              onClick={() => onChange(option.value)}
            >
              <Star size={14} fill={filled ? "currentColor" : "none"} strokeWidth={2.1} />
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
