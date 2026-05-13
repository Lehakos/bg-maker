import { clsx as cx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type PanelActionButtonVariant = "danger" | "primary" | "secondary";

type PanelActionButtonSize = "compact" | "default" | "field";

type PanelActionButtonTone = "emerald" | "sky";

type PanelActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  iconOnly?: boolean;
  size?: PanelActionButtonSize;
  tone?: PanelActionButtonTone;
  variant?: PanelActionButtonVariant;
};

export function PanelActionButton({
  active = false,
  children,
  className,
  iconOnly = false,
  size = "default",
  tone = "sky",
  type = "button",
  variant = "secondary",
  ...buttonProps
}: PanelActionButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex shrink-0 items-center justify-center border bg-white outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        getPanelActionButtonSizeClassName(size, iconOnly),
        getPanelActionButtonVariantClassName(variant, tone, active),
        className
      )}
      type={type}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

function getPanelActionButtonSizeClassName(size: PanelActionButtonSize, iconOnly: boolean) {
  if (size === "compact") {
    return iconOnly
      ? "h-6 w-6 rounded"
      : "h-6 gap-1 rounded px-1.5 text-[11px] font-medium leading-none";
  }

  if (size === "field") {
    return iconOnly ? "h-8 w-8 rounded-md" : "h-8 gap-1.5 rounded-md px-2 text-xs font-semibold";
  }

  return iconOnly
    ? "h-7 w-7 rounded-md"
    : "h-7 gap-1 rounded-md px-2 text-[11px] font-medium leading-none";
}

function getPanelActionButtonVariantClassName(
  variant: PanelActionButtonVariant,
  tone: PanelActionButtonTone,
  active: boolean
) {
  if (variant === "danger") {
    return "border-red-100 text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-100";
  }

  if (active) {
    return tone === "emerald"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)] hover:border-emerald-300 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-100"
      : "border-sky-500 bg-sky-50 text-sky-800 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.18)] hover:border-sky-500 hover:bg-sky-100 focus-visible:ring-2 focus-visible:ring-sky-100";
  }

  if (variant === "primary") {
    return tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-100"
      : "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800 focus-visible:ring-2 focus-visible:ring-sky-100";
  }

  return tone === "emerald"
    ? "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-100"
    : "border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 focus-visible:ring-2 focus-visible:ring-sky-100";
}
