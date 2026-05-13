import { clsx as cx } from "clsx";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

type PanelShellBorder = "bottomRightResponsive" | "none" | "right";

type PanelShellProps = HTMLAttributes<HTMLElement> & {
  as?: "aside" | "section";
  border?: PanelShellBorder;
  children: ReactNode;
};

export function PanelShell({
  as = "section",
  border = "none",
  children,
  className,
  ...shellProps
}: PanelShellProps) {
  const Component = as as ElementType;

  return (
    <Component
      className={cx(
        "flex min-h-0 flex-col overflow-hidden bg-white text-slate-700",
        {
          "border-b border-slate-200 md:border-b-0 md:border-r": border === "bottomRightResponsive",
          "border-r border-slate-200": border === "right"
        },
        className
      )}
      {...shellProps}
    >
      {children}
    </Component>
  );
}
