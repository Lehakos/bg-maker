import type {
  ProjectObjectLayoutAlignment,
  ProjectObjectLayoutJustification,
  ProjectObjectLayoutMode
} from "@bg-maker/shared";
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceBetween,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceBetween,
  Box,
  Columns3,
  Grid3x3,
  LayoutPanelTop,
  Move,
  Palette,
  Rows3,
  type LucideIcon
} from "lucide-react";
import {
  InspectorBehaviorNumberField,
  InspectorColorField,
  type InspectorFieldDefinition,
  InspectorIconSegmentedField,
  InspectorNumberGrid,
  InspectorSection,
  InspectorSelectField,
  type RectTransformFieldDefinition
} from "./inspector-ui";
import {
  ProjectObjectVariableBindingField,
  type VariableBindingFieldState
} from "./ProjectObjectVariableBindingField";
import {
  appearanceNumberFieldSettings,
  layoutNumberFieldSettings,
  type AppearanceDraft,
  type AppearanceFieldKey,
  type LayoutDraft,
  type LayoutFieldKey,
  type RectTransformDraft,
  type RectTransformFieldKey
} from "./project-object-inspector-state";

type AppearanceNumberFieldDefinition = InspectorFieldDefinition<
  keyof typeof appearanceNumberFieldSettings
>;

type LayoutNumberFieldDefinition = InspectorFieldDefinition<keyof typeof layoutNumberFieldSettings>;

const positionFields: readonly RectTransformFieldDefinition[] = [
  { key: "x", label: "X" },
  { key: "y", label: "Y" }
];

const sizeFields: readonly RectTransformFieldDefinition[] = [
  { key: "width", label: "Width" },
  { key: "height", label: "Height" }
];

const rotationFields: readonly RectTransformFieldDefinition[] = [
  { key: "rotation", label: "Rotation" }
];

const scaleFields: readonly RectTransformFieldDefinition[] = [
  { key: "scaleX", label: "Scale X" },
  { key: "scaleY", label: "Scale Y" }
];

const pivotFields: readonly RectTransformFieldDefinition[] = [
  { key: "pivotX", label: "Pivot X" },
  { key: "pivotY", label: "Pivot Y" }
];

const appearanceNumberFields: readonly AppearanceNumberFieldDefinition[] = [
  { key: "borderRadius", label: "Radius" },
  { key: "padding", label: "Padding" },
  { key: "opacity", label: "Opacity" }
];

const appearanceFillOpacityField = {
  key: "backgroundOpacity",
  label: "Fill opacity"
} as const satisfies AppearanceNumberFieldDefinition;

const appearanceBorderWidthField = {
  key: "borderWidth",
  label: "Border width"
} as const satisfies AppearanceNumberFieldDefinition;

const appearanceFillColorField = {
  key: "backgroundColor",
  label: "Fill"
} as const satisfies {
  key: Extract<AppearanceFieldKey, "backgroundColor">;
  label: string;
};

const appearanceBorderColorField = {
  key: "borderColor",
  label: "Border"
} as const satisfies {
  key: Extract<AppearanceFieldKey, "borderColor">;
  label: string;
};

const borderStyleOptions = [
  { label: "None", value: "none" },
  { label: "Solid", value: "solid" },
  { label: "Dashed", value: "dashed" },
  { label: "Dotted", value: "dotted" }
] as const;

const layoutModeOptions = [
  { icon: Move, label: "Manual layout", value: "free" },
  { icon: Columns3, label: "Horizontal layout", value: "horizontal" },
  { icon: Rows3, label: "Vertical layout", value: "vertical" },
  { icon: Grid3x3, label: "Grid layout", value: "grid" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectLayoutMode;
}[];

const zoneLayoutModeOptions = layoutModeOptions.filter(
  (option) => option.value !== "free"
) as readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectLayoutMode;
}[];

const horizontalLayoutAlignOptions = [
  { icon: AlignHorizontalJustifyStart, label: "Left", value: "start" },
  { icon: AlignHorizontalJustifyCenter, label: "Center", value: "center" },
  { icon: AlignHorizontalJustifyEnd, label: "Right", value: "end" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectLayoutAlignment;
}[];

const verticalLayoutAlignOptions = [
  { icon: AlignVerticalJustifyStart, label: "Top", value: "start" },
  { icon: AlignVerticalJustifyCenter, label: "Middle", value: "center" },
  { icon: AlignVerticalJustifyEnd, label: "Bottom", value: "end" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectLayoutAlignment;
}[];

const horizontalLayoutJustifyOptions = [
  { icon: AlignHorizontalJustifyStart, label: "Left", value: "start" },
  { icon: AlignHorizontalJustifyCenter, label: "Center", value: "center" },
  { icon: AlignHorizontalJustifyEnd, label: "Right", value: "end" },
  { icon: AlignHorizontalSpaceBetween, label: "Space between", value: "spaceBetween" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectLayoutJustification;
}[];

const verticalLayoutJustifyOptions = [
  { icon: AlignVerticalJustifyStart, label: "Top", value: "start" },
  { icon: AlignVerticalJustifyCenter, label: "Middle", value: "center" },
  { icon: AlignVerticalJustifyEnd, label: "Bottom", value: "end" },
  { icon: AlignVerticalSpaceBetween, label: "Space between", value: "spaceBetween" }
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  value: ProjectObjectLayoutJustification;
}[];

const layoutColumnsField = {
  key: "columns",
  label: "Columns"
} as const satisfies LayoutNumberFieldDefinition;

const layoutGapField = {
  key: "gap",
  label: "Gap"
} as const satisfies LayoutNumberFieldDefinition;

type ProjectObjectAppearanceSectionProps = {
  backgroundColorBinding?: VariableBindingFieldState;
  borderColorBinding?: VariableBindingFieldState;
  draft: AppearanceDraft;
  onCommitNumberField: (
    fieldKey: keyof typeof appearanceNumberFieldSettings,
    value: string
  ) => void;
  onDraftChange: (fieldKey: AppearanceFieldKey, value: string) => void;
  onReset: (fieldKey: AppearanceFieldKey) => void;
};

export function ProjectObjectAppearanceSection({
  backgroundColorBinding,
  borderColorBinding,
  draft,
  onCommitNumberField,
  onDraftChange,
  onReset
}: ProjectObjectAppearanceSectionProps) {
  const backgroundColorBound = Boolean(backgroundColorBinding?.value);
  const borderColorBound = Boolean(borderColorBinding?.value);

  return (
    <InspectorSection icon={<Palette size={15} />} title="Appearance">
      <div className="grid grid-cols-2 gap-2">
        <InspectorColorField
          disabled={backgroundColorBound}
          field={appearanceFillColorField}
          labelAction={<ProjectObjectVariableBindingField binding={backgroundColorBinding} />}
          value={draft.backgroundColor}
          onChange={onDraftChange}
        />
        <InspectorBehaviorNumberField
          field={appearanceFillOpacityField}
          settings={appearanceNumberFieldSettings.backgroundOpacity}
          value={draft.backgroundOpacity}
          onCommit={onCommitNumberField}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InspectorColorField
          disabled={borderColorBound}
          field={appearanceBorderColorField}
          labelAction={<ProjectObjectVariableBindingField binding={borderColorBinding} />}
          value={draft.borderColor}
          onChange={onDraftChange}
        />
        <InspectorBehaviorNumberField
          field={appearanceBorderWidthField}
          settings={appearanceNumberFieldSettings.borderWidth}
          value={draft.borderWidth}
          onCommit={onCommitNumberField}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      </div>
      <InspectorSelectField
        label="Border style"
        value={draft.borderStyle}
        options={borderStyleOptions}
        onChange={(value) => onDraftChange("borderStyle", value)}
      />
      <AppearanceNumberGrid
        fields={appearanceNumberFields}
        value={draft}
        onCommit={onCommitNumberField}
        onDraftChange={onDraftChange}
        onReset={onReset}
      />
    </InspectorSection>
  );
}

type ProjectObjectLayoutSectionProps = {
  draft: LayoutDraft;
  isZoneLayout: boolean;
  onCommitNumberField: (fieldKey: keyof typeof layoutNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: LayoutFieldKey, value: string) => void;
  onReset: (fieldKey: LayoutFieldKey) => void;
};

export function ProjectObjectLayoutSection({
  draft,
  isZoneLayout,
  onCommitNumberField,
  onDraftChange,
  onReset
}: ProjectObjectLayoutSectionProps) {
  const layoutAuto = draft.mode !== "free";
  const layoutMainAxisLabel = getLayoutMainAxisLabel(draft.mode);
  const layoutCrossAxisLabel = getLayoutCrossAxisLabel(draft.mode);
  const layoutJustifyOptions = getLayoutJustifyOptions(draft.mode);
  const layoutAlignOptions = getLayoutAlignOptions(draft.mode);
  const layoutNumberFields = getLayoutNumberFields(draft, isZoneLayout);
  const activeLayoutModeOptions = isZoneLayout ? zoneLayoutModeOptions : layoutModeOptions;
  const showLayoutAlignmentControls = layoutAuto && !isZoneLayout;

  return (
    <InspectorSection icon={<LayoutPanelTop size={15} />} title="Layout">
      <InspectorIconSegmentedField
        label="Mode"
        value={draft.mode}
        options={activeLayoutModeOptions}
        onChange={(value) => onDraftChange("mode", value)}
      />
      {layoutAuto ? (
        <>
          {showLayoutAlignmentControls ? (
            <div className="grid grid-cols-2 gap-2">
              <InspectorIconSegmentedField
                label={layoutMainAxisLabel}
                value={draft.justifyContent}
                options={layoutJustifyOptions}
                onChange={(value) => onDraftChange("justifyContent", value)}
              />
              <InspectorIconSegmentedField
                label={layoutCrossAxisLabel}
                value={draft.alignItems}
                options={layoutAlignOptions}
                onChange={(value) => onDraftChange("alignItems", value)}
              />
            </div>
          ) : null}
          {layoutNumberFields.length ? (
            <LayoutNumberGrid
              fields={layoutNumberFields}
              value={draft}
              onCommit={onCommitNumberField}
              onDraftChange={onDraftChange}
              onReset={onReset}
            />
          ) : null}
        </>
      ) : null}
    </InspectorSection>
  );
}

type ProjectObjectTransformSectionsProps = {
  rectTransformDraft: RectTransformDraft;
  scaleDisabledFields?: ReadonlySet<RectTransformFieldKey>;
  scaleDisabledTitle?: string;
  sizeDisabledFields?: ReadonlySet<RectTransformFieldKey>;
  sizeDisabledTitle?: string;
  onCommit: (fieldKey: RectTransformFieldKey, value: string) => void;
  onDraftChange: (fieldKey: RectTransformFieldKey, value: string) => void;
  onReset: (fieldKey: RectTransformFieldKey) => void;
};

export function ProjectObjectTransformSections({
  rectTransformDraft,
  scaleDisabledFields,
  scaleDisabledTitle,
  sizeDisabledFields,
  sizeDisabledTitle,
  onCommit,
  onDraftChange,
  onReset
}: ProjectObjectTransformSectionsProps) {
  return (
    <>
      <InspectorSection icon={<Box size={15} />} title="Frame">
        <InspectorNumberGrid
          fields={positionFields}
          rectTransformDraft={rectTransformDraft}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
        <InspectorNumberGrid
          fields={sizeFields}
          rectTransformDraft={rectTransformDraft}
          disabledFields={sizeDisabledFields}
          disabledTitle={sizeDisabledTitle}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      </InspectorSection>

      <InspectorSection title="Transform">
        <InspectorNumberGrid
          fields={rotationFields}
          rectTransformDraft={rectTransformDraft}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
        <InspectorNumberGrid
          fields={scaleFields}
          rectTransformDraft={rectTransformDraft}
          disabledFields={scaleDisabledFields}
          disabledTitle={scaleDisabledTitle}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      </InspectorSection>

      <InspectorSection title="Pivot">
        <InspectorNumberGrid
          fields={pivotFields}
          rectTransformDraft={rectTransformDraft}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      </InspectorSection>
    </>
  );
}

type AppearanceNumberGridProps = {
  fields: readonly AppearanceNumberFieldDefinition[];
  value: AppearanceDraft;
  onCommit: (fieldKey: keyof typeof appearanceNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: AppearanceFieldKey, value: string) => void;
  onReset: (fieldKey: AppearanceFieldKey) => void;
};

function AppearanceNumberGrid({
  fields,
  value,
  onCommit,
  onDraftChange,
  onReset
}: AppearanceNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={appearanceNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

type LayoutNumberGridProps = {
  fields: readonly LayoutNumberFieldDefinition[];
  value: LayoutDraft;
  onCommit: (fieldKey: keyof typeof layoutNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: LayoutFieldKey, value: string) => void;
  onReset: (fieldKey: LayoutFieldKey) => void;
};

function LayoutNumberGrid({
  fields,
  value,
  onCommit,
  onDraftChange,
  onReset
}: LayoutNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={layoutNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

function getLayoutNumberFields(
  layoutDraft: LayoutDraft,
  forceGapField = false
): readonly LayoutNumberFieldDefinition[] {
  if (layoutDraft.mode === "free") {
    return [];
  }

  if (layoutDraft.mode === "grid") {
    return [layoutColumnsField, layoutGapField];
  }

  if (!forceGapField && layoutDraft.justifyContent === "spaceBetween") {
    return [];
  }

  return [layoutGapField];
}

function getLayoutJustifyOptions(mode: ProjectObjectLayoutMode) {
  return mode === "vertical" ? verticalLayoutJustifyOptions : horizontalLayoutJustifyOptions;
}

function getLayoutAlignOptions(mode: ProjectObjectLayoutMode) {
  return mode === "vertical" ? horizontalLayoutAlignOptions : verticalLayoutAlignOptions;
}

function getLayoutMainAxisLabel(mode: ProjectObjectLayoutMode) {
  return mode === "vertical" ? "Vertical" : "Horizontal";
}

function getLayoutCrossAxisLabel(mode: ProjectObjectLayoutMode) {
  return mode === "vertical" ? "Horizontal" : "Vertical";
}
