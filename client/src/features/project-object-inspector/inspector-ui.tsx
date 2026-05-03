import type { ChangeEvent, FocusEvent, KeyboardEvent, ReactNode } from "react";
import { useId } from "react";
import { Bold, Italic, type LucideIcon } from "lucide-react";
import { InfoTip } from "../../components/InfoTip";
import { cx } from "./class-names";
import {
  rectTransformFieldSettings,
  type RectTransformDraft,
  type RectTransformFieldKey
} from "./project-object-inspector-state";

export type InspectorFieldDefinition<TFieldKey extends string> = {
  key: TFieldKey;
  label: string;
};

export type RectTransformFieldDefinition = InspectorFieldDefinition<RectTransformFieldKey>;

type InspectorSectionProps = {
  children: ReactNode;
  icon?: ReactNode;
  title: string;
};

export function InspectorSection({ children, icon, title }: InspectorSectionProps) {
  return (
    <section className="mt-4 border-t border-slate-200 pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

type InspectorTextFieldProps = {
  label: string;
  value: string;
  onBlur: (value: string) => void;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export function InspectorTextField({
  label,
  value,
  onBlur,
  onChange,
  onKeyDown
}: InspectorTextFieldProps) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      <span>{label}</span>
      <input
        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onBlur={(event) => onBlur(event.currentTarget.value)}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

type InspectorInlineTextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function InspectorInlineTextField({
  label,
  value,
  onChange
}: InspectorInlineTextFieldProps) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      <span>{label}</span>
      <input
        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

type InspectorSwitchFieldProps = {
  checked: boolean;
  icon?: ReactNode;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function InspectorSwitchField({
  checked,
  icon,
  label,
  onChange
}: InspectorSwitchFieldProps) {
  return (
    <label className="flex min-h-8 cursor-pointer items-center justify-between gap-3 py-1 text-sm font-medium text-slate-700">
      <span className="flex min-w-0 items-center gap-2">
        {icon ? (
          <span
            className={
              checked
                ? "flex h-6 w-6 shrink-0 items-center justify-center rounded text-sky-700"
                : "flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400"
            }
          >
            {icon}
          </span>
        ) : null}
        <span className="truncate">{label}</span>
      </span>
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          checked={checked}
          className="peer sr-only"
          role="switch"
          type="checkbox"
          onChange={onChange}
        />
        <span className="absolute inset-0 rounded-full border border-slate-300 bg-slate-200 transition-colors peer-checked:border-sky-500 peer-checked:bg-sky-500 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-100" />
        <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

type InspectorDoubleSidedControlsProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
};

export function InspectorDoubleSidedControls({
  enabled,
  onEnabledChange
}: InspectorDoubleSidedControlsProps) {
  return (
    <InspectorSwitchField
      checked={enabled}
      label="Enabled"
      onChange={(event) => onEnabledChange(event.currentTarget.checked)}
    />
  );
}

type InspectorTextareaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function InspectorTextareaField({
  label,
  value,
  onChange
}: InspectorTextareaFieldProps) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      <span>{label}</span>
      <textarea
        className="mt-1 min-h-20 w-full resize-y rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

type InspectorColorGridProps<TField extends string> = {
  fields: readonly InspectorFieldDefinition<TField>[];
  value: Record<TField, string>;
  onChange: (fieldKey: TField, value: string) => void;
};

export function InspectorColorGrid<TField extends string>({
  fields,
  value,
  onChange
}: InspectorColorGridProps<TField>) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorColorField
          key={field.key}
          field={field}
          value={value[field.key]}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

type InspectorColorFieldProps<TField extends string> = {
  field: InspectorFieldDefinition<TField>;
  value: string;
  onChange: (fieldKey: TField, value: string) => void;
};

export function InspectorColorField<TField extends string>({
  field,
  value,
  onChange
}: InspectorColorFieldProps<TField>) {
  return (
    <label className="block min-w-0 text-xs font-medium text-slate-500">
      <span>{field.label}</span>
      <span className="mt-1 flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2">
        <input
          className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
          type="color"
          value={value}
          onChange={(event) => onChange(field.key, event.currentTarget.value)}
        />
        <span className="truncate text-xs tabular-nums text-slate-600">{value}</span>
      </span>
    </label>
  );
}

type InspectorIconOption<TValue extends string> = {
  icon: LucideIcon;
  label: string;
  value: TValue;
};

type InspectorIconSegmentedFieldProps<TValue extends string> = {
  label: string;
  options: readonly InspectorIconOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
};

export function InspectorIconSegmentedField<TValue extends string>({
  label,
  options,
  value,
  onChange
}: InspectorIconSegmentedFieldProps<TValue>) {
  return (
    <div className="block min-w-0 text-xs font-medium text-slate-500">
      <span>{label}</span>
      <div className="mt-1 flex h-8 overflow-hidden rounded-md border border-slate-200 bg-white">
        {options.map((option, index) => {
          const Icon = option.icon;
          const active = value === option.value;

          return (
            <button
              key={option.value}
              aria-label={option.label}
              className={cx(
                "flex h-full min-w-0 flex-1 items-center justify-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-100",
                index > 0 && "border-l border-slate-200",
                active
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
              title={option.label}
              type="button"
              onClick={() => onChange(option.value)}
            >
              <Icon size={16} strokeWidth={2.2} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

type TextStyleToggleFieldProps = {
  isBold: boolean;
  isItalic: boolean;
  onBoldChange: (isBold: boolean) => void;
  onItalicChange: (isItalic: boolean) => void;
};

export function TextStyleToggleField({
  isBold,
  isItalic,
  onBoldChange,
  onItalicChange
}: TextStyleToggleFieldProps) {
  return (
    <div className="block min-w-0 text-xs font-medium text-slate-500">
      <span>Style</span>
      <div className="mt-1 flex h-8 overflow-hidden rounded-md border border-slate-200 bg-white">
        <InspectorIconToggleButton
          active={isBold}
          icon={Bold}
          label="Bold"
          onClick={() => onBoldChange(!isBold)}
        />
        <InspectorIconToggleButton
          active={isItalic}
          className="border-l border-slate-200"
          icon={Italic}
          label="Italic"
          onClick={() => onItalicChange(!isItalic)}
        />
      </div>
    </div>
  );
}

type InspectorIconToggleButtonProps = {
  active: boolean;
  className?: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

function InspectorIconToggleButton({
  active,
  className,
  icon: Icon,
  label,
  onClick
}: InspectorIconToggleButtonProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cx(
        "flex h-full min-w-0 flex-1 items-center justify-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-100",
        active ? "bg-sky-50 text-sky-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
        className
      )}
      title={label}
      type="button"
      onClick={onClick}
    >
      <Icon size={16} strokeWidth={2.2} />
    </button>
  );
}

type InspectorModeInfoProps = {
  items: readonly {
    description: string;
    label: string;
  }[];
};

export function InspectorModeInfo({ items }: InspectorModeInfoProps) {
  return (
    <dl className="space-y-1.5">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="font-semibold text-white">{item.label}</dt>
          <dd className="mt-0.5 text-slate-200">{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}

type InspectorSelectFieldProps<TValue extends string> = {
  info?: ReactNode;
  infoAlign?: "center" | "end" | "start";
  label: string;
  options: readonly { label: string; value: TValue }[];
  value: TValue;
  onChange: (value: TValue) => void;
};

export function InspectorSelectField<TValue extends string>({
  info,
  infoAlign,
  label,
  options,
  value,
  onChange
}: InspectorSelectFieldProps<TValue>) {
  const selectId = useId();

  return (
    <div className="block min-w-0 text-xs font-medium text-slate-500">
      <span className="flex min-w-0 items-center gap-1.5">
        <label className="truncate" htmlFor={selectId}>
          {label}
        </label>
        {info ? <InfoTip align={infoAlign}>{info}</InfoTip> : null}
      </span>
      <select
        id={selectId}
        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as TValue)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type InspectorBehaviorNumberFieldProps<TFieldKey extends string> = {
  field: InspectorFieldDefinition<TFieldKey>;
  settings: { max: number; min: number; step: number };
  value: string;
  onCommit: (fieldKey: TFieldKey, value: string) => void;
  onDraftChange: (fieldKey: TFieldKey, value: string) => void;
  onReset: (fieldKey: TFieldKey) => void;
};

export function InspectorBehaviorNumberField<TFieldKey extends string>({
  field,
  settings,
  value,
  onCommit,
  onDraftChange,
  onReset
}: InspectorBehaviorNumberFieldProps<TFieldKey>) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onReset(field.key);
    }
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    onCommit(field.key, event.currentTarget.value);
  }

  return (
    <label className="block min-w-0 text-xs font-medium text-slate-500">
      <span>{field.label}</span>
      <input
        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm tabular-nums text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        inputMode="decimal"
        max={settings.max}
        min={settings.min}
        step={settings.step}
        type="number"
        value={value}
        onBlur={handleBlur}
        onChange={(event) => onDraftChange(field.key, event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />
    </label>
  );
}

type InspectorNumberGridProps = {
  disabledFields?: ReadonlySet<RectTransformFieldKey>;
  disabledTitle?: string;
  fields: readonly RectTransformFieldDefinition[];
  rectTransformDraft: RectTransformDraft;
  onCommit: (fieldKey: RectTransformFieldKey, value: string) => void;
  onDraftChange: (fieldKey: RectTransformFieldKey, value: string) => void;
  onReset: (fieldKey: RectTransformFieldKey) => void;
};

export function InspectorNumberGrid({
  disabledFields,
  disabledTitle,
  fields,
  rectTransformDraft,
  onCommit,
  onDraftChange,
  onReset
}: InspectorNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorNumberField
          key={field.key}
          disabled={disabledFields?.has(field.key) ?? false}
          disabledTitle={disabledTitle}
          field={field}
          value={rectTransformDraft[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

type InspectorNumberFieldProps = {
  disabled?: boolean;
  disabledTitle?: string;
  field: RectTransformFieldDefinition;
  value: string;
  onCommit: (fieldKey: RectTransformFieldKey, value: string) => void;
  onDraftChange: (fieldKey: RectTransformFieldKey, value: string) => void;
  onReset: (fieldKey: RectTransformFieldKey) => void;
};

function InspectorNumberField({
  disabled = false,
  disabledTitle,
  field,
  value,
  onCommit,
  onDraftChange,
  onReset
}: InspectorNumberFieldProps) {
  const settings = rectTransformFieldSettings[field.key];

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onReset(field.key);
    }
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    onCommit(field.key, event.currentTarget.value);
  }

  return (
    <label
      className="block min-w-0 text-xs font-medium text-slate-500"
      title={disabled ? disabledTitle : undefined}
    >
      <span>{field.label}</span>
      <input
        className={cx(
          "mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm tabular-nums text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100",
          disabled && "cursor-not-allowed bg-slate-100 text-slate-400"
        )}
        disabled={disabled}
        inputMode="decimal"
        max={settings.max}
        min={settings.min}
        step={settings.step}
        type="number"
        value={value}
        onBlur={handleBlur}
        onChange={(event) => onDraftChange(field.key, event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />
    </label>
  );
}
