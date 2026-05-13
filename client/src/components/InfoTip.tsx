import { clsx as cx } from "clsx";
import { CircleHelp } from "lucide-react";
import { type ReactNode, useId } from "react";

type InfoTipProps = {
  align?: "center" | "end" | "start";
  children: ReactNode;
  className?: string;
  label?: string;
};

export function InfoTip({
  align = "center",
  children,
  className,
  label = "More information"
}: InfoTipProps) {
  const tooltipId = useId();

  return (
    <span className={cx("group/infotip relative inline-flex shrink-0", className)}>
      <button
        aria-describedby={tooltipId}
        aria-label={label}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 outline-none transition-colors hover:text-slate-700 focus-visible:text-sky-700 focus-visible:ring-2 focus-visible:ring-sky-100"
        type="button"
      >
        <CircleHelp size={14} strokeWidth={2.15} />
      </button>
      <span
        className={cx(
          "pointer-events-none absolute top-full z-[90] mt-1.5 w-60 rounded-md border border-slate-200 bg-slate-950 px-2.5 py-2 text-left text-xs font-medium leading-snug text-white opacity-0 shadow-lg shadow-slate-900/15 transition-opacity group-focus-within/infotip:opacity-100 group-hover/infotip:opacity-100",
          "normal-case tracking-normal",
          {
            "left-0": align === "start",
            "left-1/2 -translate-x-1/2": align === "center",
            "right-0": align === "end"
          }
        )}
        id={tooltipId}
        role="tooltip"
      >
        {children}
      </span>
    </span>
  );
}
