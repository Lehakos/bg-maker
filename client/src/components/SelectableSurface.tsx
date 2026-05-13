import { clsx as cx } from "clsx";
import type { DragEventHandler, ElementType, HTMLAttributes, ReactNode } from "react";

type SelectableSurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: "button" | "div" | "label";
  children: ReactNode;
  disabled?: boolean;
  draggable?: boolean;
  onDragStart?: DragEventHandler<HTMLElement>;
  selected?: boolean;
  type?: "button" | "reset" | "submit";
};

export function SelectableSurface({
  as = "button",
  children,
  className,
  disabled,
  selected = false,
  type = "button",
  ...surfaceProps
}: SelectableSurfaceProps) {
  const Component = as as ElementType;

  return (
    <Component
      className={cx(
        "rounded-md border bg-white transition-colors",
        selected
          ? "border-sky-500 bg-sky-50 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.18)]"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        { "cursor-not-allowed opacity-60": disabled },
        className
      )}
      disabled={as === "button" ? disabled : undefined}
      type={as === "button" ? type : undefined}
      {...surfaceProps}
    >
      {children}
    </Component>
  );
}
