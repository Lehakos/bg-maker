import { clsx as cx } from "clsx";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "./IconButton";

type ModalShellProps = {
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  icon?: ReactNode;
  subtitle?: ReactNode;
  testId?: string;
  title: ReactNode;
  onClose: () => void;
};

export function ModalShell({
  bodyClassName,
  children,
  className,
  footer,
  icon,
  subtitle,
  testId = "modal-shell",
  title,
  onClose
}: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/40 p-4">
      <section
        className={cx(
          "flex max-h-[min(760px,calc(100vh-32px))] w-[min(720px,calc(100vw-32px))] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xl shadow-slate-950/25",
          className
        )}
        data-testid={testId}
      >
        <header
          className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"
          data-testid={`${testId}-header`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {icon ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-950">{title}</h2>
              {subtitle ? (
                <p className="truncate text-xs font-medium text-slate-500">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <IconButton
            data-testid={`${testId}-close`}
            icon={<X size={16} />}
            label="Close"
            variant="neutral"
            onClick={onClose}
          />
        </header>
        <div
          className={cx("min-h-0 flex-1 overflow-auto p-4", bodyClassName)}
          data-testid={`${testId}-body`}
        >
          {children}
        </div>
        {footer}
      </section>
    </div>
  );
}
