import { clsx as cx } from "clsx";
import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

type ControlTone = "emerald" | "sky";

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  tone?: ControlTone;
};

export function FormInput({ className, tone = "sky", ...inputProps }: FormInputProps) {
  return (
    <input
      className={cx(
        "h-8 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-950 outline-none transition-colors disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
        getControlFocusClassName(tone),
        className
      )}
      {...inputProps}
    />
  );
}

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  tone?: ControlTone;
};

export function FormSelect({ children, className, tone = "sky", ...selectProps }: FormSelectProps) {
  return (
    <select
      className={cx(
        "h-8 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-950 outline-none transition-colors disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
        getControlFocusClassName(tone),
        className
      )}
      {...selectProps}
    >
      {children}
    </select>
  );
}

type InlineInputProps = InputHTMLAttributes<HTMLInputElement> & {
  tone?: ControlTone;
};

export function InlineInput({ className, tone = "sky", ...inputProps }: InlineInputProps) {
  return (
    <input
      className={cx(
        "h-7 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-[12px] font-medium tabular-nums text-slate-900 outline-none transition-colors disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
        tone === "emerald"
          ? "focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          : "focus:border-sky-400 focus:ring-2 focus:ring-sky-100",
        className
      )}
      {...inputProps}
    />
  );
}

type InlineSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  tone?: ControlTone;
};

export function InlineSelect({
  children,
  className,
  tone = "sky",
  ...selectProps
}: InlineSelectProps) {
  return (
    <select
      className={cx(
        "h-7 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-[12px] font-medium text-slate-800 outline-none transition-colors disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
        tone === "emerald"
          ? "focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          : "focus:border-sky-400 focus:ring-2 focus:ring-sky-100",
        className
      )}
      {...selectProps}
    >
      {children}
    </select>
  );
}

type TypeSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function TypeSelect({ children, className, ...selectProps }: TypeSelectProps) {
  return (
    <select
      className={cx(
        "h-7 w-full rounded-md border border-transparent bg-transparent px-1 text-[12px] font-semibold text-slate-600 outline-none transition-colors hover:bg-slate-50 hover:text-sky-700 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100",
        className
      )}
      {...selectProps}
    >
      {children}
    </select>
  );
}

function getControlFocusClassName(tone: ControlTone) {
  return tone === "emerald"
    ? "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
    : "focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
}
