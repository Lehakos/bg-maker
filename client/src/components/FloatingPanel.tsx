import { clsx as cx } from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

type FloatingPanelPadding = "md" | "none" | "sm";
type FloatingPanelVariant = "overlay" | "popover";

type FloatingPanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: FloatingPanelPadding;
  variant?: FloatingPanelVariant;
};

export function FloatingPanel({
  children,
  className,
  padding = "sm",
  variant = "overlay",
  ...panelProps
}: FloatingPanelProps) {
  return (
    <div
      className={cx(
        "rounded-md border shadow-xl outline-none",
        {
          "border-slate-900/15 bg-white/95 shadow-slate-900/15 backdrop-blur":
            variant === "overlay",
          "border-slate-200 bg-white shadow-slate-900/15": variant === "popover",
          "p-2": padding === "sm",
          "p-3": padding === "md"
        },
        className
      )}
      {...panelProps}
    >
      {children}
    </div>
  );
}
