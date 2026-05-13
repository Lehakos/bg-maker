import { clsx as cx } from "clsx";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type IconButtonSize = "lg" | "md" | "sm" | "xs";
type IconButtonTone = "emerald" | "sky";
type IconButtonVariant = "danger" | "ghost" | "neutral" | "primary";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  icon?: ReactNode;
  label?: string;
  size?: IconButtonSize;
  tone?: IconButtonTone;
  variant?: IconButtonVariant;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    active = false,
    children,
    className,
    disabled,
    icon,
    label,
    size = "md",
    title,
    tone = "sky",
    type = "button",
    variant = "ghost",
    ...buttonProps
  },
  ref
) {
  const ariaLabel = buttonProps["aria-label"] ?? label;

  return (
    <button
      ref={ref}
      aria-label={ariaLabel}
      aria-pressed={active || undefined}
      className={cx(
        "inline-flex shrink-0 items-center justify-center border outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        getIconButtonSizeClassName(size),
        getIconButtonVariantClassName(variant, tone, active),
        className
      )}
      disabled={disabled}
      title={title ?? label}
      type={type}
      {...buttonProps}
    >
      {icon ?? children}
    </button>
  );
});

function getIconButtonSizeClassName(size: IconButtonSize) {
  if (size === "xs") {
    return "h-5 w-5 rounded";
  }

  if (size === "sm") {
    return "h-6 w-6 rounded";
  }

  if (size === "lg") {
    return "h-9 w-9 rounded-md";
  }

  return "h-8 w-8 rounded-md";
}

function getIconButtonVariantClassName(
  variant: IconButtonVariant,
  tone: IconButtonTone,
  active: boolean
) {
  if (variant === "danger") {
    return "border-red-100 bg-white text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-100";
  }

  if (variant === "neutral") {
    return "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-100";
  }

  if (active || variant === "primary") {
    return tone === "emerald"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)] hover:border-emerald-300 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-100"
      : "border-sky-500 bg-sky-100 text-sky-800 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.18)] hover:border-sky-500 hover:bg-sky-100 focus-visible:ring-2 focus-visible:ring-sky-100";
  }

  return "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-sky-100 disabled:hover:border-transparent disabled:hover:bg-transparent";
}
