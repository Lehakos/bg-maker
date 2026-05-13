import { clsx as cx } from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

type PanelToolbarProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  dense?: boolean;
};

export function PanelToolbar({
  children,
  className,
  dense = false,
  ...toolbarProps
}: PanelToolbarProps) {
  return (
    <div
      className={cx(
        "shrink-0 border-b border-slate-200 bg-slate-50",
        dense ? "p-1.5" : "space-y-2 p-2",
        className
      )}
      {...toolbarProps}
    >
      {children}
    </div>
  );
}
