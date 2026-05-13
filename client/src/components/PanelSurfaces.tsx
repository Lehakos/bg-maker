import { clsx as cx } from "clsx";
import type { ReactNode } from "react";
import { InfoTip } from "./InfoTip";

type PanelCardProps = {
  children: ReactNode;
  className?: string;
};

export function PanelCard({ children, className }: PanelCardProps) {
  return (
    <div className={cx("rounded-md border border-slate-200 bg-slate-50 p-2", className)}>
      {children}
    </div>
  );
}

type PanelEmptyStateProps = {
  action?: ReactNode;
  center?: boolean;
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
  spacious?: boolean;
};

export function PanelEmptyState({
  action,
  center = false,
  children,
  className,
  fullHeight = false,
  spacious = false
}: PanelEmptyStateProps) {
  return (
    <div
      className={cx(
        "rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-500",
        {
          "flex items-center justify-between gap-2": Boolean(action),
          "flex h-full min-h-32 items-center justify-center p-4 text-center font-medium":
            fullHeight,
          "px-3 py-4 text-center font-medium": spacious,
          "text-center font-medium": center
        },
        className
      )}
    >
      {action ? <span>{children}</span> : children}
      {action}
    </div>
  );
}

type PanelNoticeProps = {
  children: ReactNode;
  className?: string;
  variant?: "danger" | "info" | "warning";
};

export function PanelNotice({ children, className, variant = "warning" }: PanelNoticeProps) {
  return (
    <p
      className={cx(
        "mt-2 rounded-md border px-2 py-1.5 text-xs font-medium",
        {
          "border-amber-200 bg-amber-50 text-amber-800": variant === "warning",
          "border-red-100 bg-red-50 text-red-700": variant === "danger",
          "border-sky-100 bg-sky-50 text-sky-800": variant === "info"
        },
        className
      )}
    >
      {children}
    </p>
  );
}

type PanelSubsectionLabelProps = {
  children: string;
  info?: ReactNode;
};

export function PanelSubsectionLabel({ children, info }: PanelSubsectionLabelProps) {
  return (
    <span className="inline-flex h-5 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
      {info ? <InfoTip align="start">{info}</InfoTip> : null}
    </span>
  );
}
