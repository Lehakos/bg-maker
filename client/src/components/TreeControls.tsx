import { clsx as cx } from "clsx";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode
} from "react";

type TreeDisclosureButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  expanded: boolean;
  label: string;
};

export function TreeDisclosureButton({
  className,
  expanded,
  label,
  type = "button",
  ...buttonProps
}: TreeDisclosureButtonProps) {
  return (
    <button
      aria-label={label}
      className={cx(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 outline-none transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-100",
        className
      )}
      type={type}
      {...buttonProps}
    >
      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
    </button>
  );
}

type TreeIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: "md" | "sm" | "xs";
  variant?: "danger" | "neutral";
};

export function TreeIconButton({
  children,
  className,
  size = "sm",
  type = "button",
  variant = "neutral",
  ...buttonProps
}: TreeIconButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded text-slate-400 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-35",
        {
          "h-5 w-5": size === "xs",
          "h-6 w-6": size === "sm",
          "h-7 w-7": size === "md"
        },
        variant === "danger"
          ? "hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-100"
          : "hover:bg-slate-200 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-100",
        className
      )}
      type={type}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

type TreeRenameInputProps = InputHTMLAttributes<HTMLInputElement>;

export const TreeRenameInput = forwardRef<HTMLInputElement, TreeRenameInputProps>(
  function TreeRenameInput({ className, ...inputProps }, ref) {
    return (
      <input
        ref={ref}
        className={cx(
          "h-5 min-w-32 flex-1 rounded border border-sky-500 bg-white px-1 text-[13px] text-slate-950 outline-none",
          className
        )}
        {...inputProps}
      />
    );
  }
);
