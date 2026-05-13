import { clsx as cx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type InlineEditorRowProps = {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  typeControl: ReactNode;
};

export function InlineEditorRow({
  action,
  children,
  className,
  contentClassName,
  typeControl
}: InlineEditorRowProps) {
  return (
    <div
      className={cx(
        "group flex overflow-hidden rounded-md border border-slate-200 bg-white text-[13px]",
        className
      )}
    >
      <div className="flex w-28 shrink-0 items-center px-2 py-2">{typeControl}</div>
      <div className={cx("min-w-0 flex-1 px-2 py-2", contentClassName)}>{children}</div>
      {action}
    </div>
  );
}

type RowRemoveButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function RowRemoveButton({
  children,
  className,
  type = "button",
  ...buttonProps
}: RowRemoveButtonProps) {
  return (
    <button
      className={cx(
        "flex w-8 shrink-0 items-center justify-center border-l border-slate-100 text-slate-400 outline-none transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-100",
        className
      )}
      type={type}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
