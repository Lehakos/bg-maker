import { clsx as cx } from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

type ChipTone = "sky" | "slate";

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: ChipTone;
};

export function Chip({ children, className, tone = "slate", ...chipProps }: ChipProps) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-normal",
        tone === "sky"
          ? "border-sky-200 bg-sky-50 text-sky-800"
          : "border-slate-200 bg-slate-50 text-slate-500",
        className
      )}
      {...chipProps}
    >
      {children}
    </span>
  );
}
