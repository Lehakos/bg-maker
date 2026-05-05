import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole
} from "@floating-ui/react";
import { ChevronRight } from "lucide-react";
import { type ReactNode, useEffect, useMemo } from "react";

const contextMenuZIndex = 1000;

export type ContextMenuAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  children?: ContextMenuAction[];
  onSelect?: () => void;
  separatorBefore?: boolean;
};

type ContextMenuProps = {
  actions: ContextMenuAction[];
  ariaLabel?: string;
  open: boolean;
  x: number;
  y: number;
  onOpenChange: (open: boolean) => void;
};

export function ContextMenu({
  actions,
  ariaLabel = "Context menu",
  open,
  x,
  y,
  onOpenChange
}: ContextMenuProps) {
  const virtualReference = useMemo(
    () => ({
      getBoundingClientRect: () => ({
        x,
        y,
        top: y,
        left: x,
        right: x,
        bottom: y,
        width: 0,
        height: 0
      })
    }),
    [x, y]
  );
  const {
    context,
    floatingStyles,
    refs: { setFloating, setPositionReference }
  } = useFloating({
    open,
    onOpenChange,
    placement: "right-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [offset(2), flip(), shift({ padding: 8 })]
  });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  useEffect(() => {
    if (open) {
      setPositionReference(virtualReference);
    }
  }, [open, setPositionReference, virtualReference]);

  if (!open) {
    return null;
  }

  return (
    <FloatingPortal>
      <FloatingFocusManager context={context} initialFocus={-1} modal={false}>
        <div
          ref={setFloating}
          style={{ ...floatingStyles, zIndex: contextMenuZIndex }}
          {...getFloatingProps({
            "aria-label": ariaLabel,
            className:
              "w-max min-w-52 max-w-[calc(100vw-1rem)] rounded-md border border-slate-200 bg-white py-1 text-sm text-slate-700 shadow-xl shadow-slate-900/15 outline-none"
          })}
        >
          <ContextMenuActionList actions={actions} onOpenChange={onOpenChange} />
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}

type ContextMenuActionListProps = {
  actions: ContextMenuAction[];
  onOpenChange: (open: boolean) => void;
};

function ContextMenuActionList({ actions, onOpenChange }: ContextMenuActionListProps) {
  return (
    <div className="py-1">
      {actions.map((action) => (
        <div key={action.id}>
          {action.separatorBefore ? <div className="my-1 border-t border-slate-200" /> : null}
          <ContextMenuActionButton action={action} onOpenChange={onOpenChange} />
        </div>
      ))}
    </div>
  );
}

type ContextMenuActionButtonProps = {
  action: ContextMenuAction;
  onOpenChange: (open: boolean) => void;
};

function ContextMenuActionButton({ action, onOpenChange }: ContextMenuActionButtonProps) {
  const hasChildren = Boolean(action.children?.length);

  function handleSelect() {
    if (action.disabled || hasChildren) {
      return;
    }

    action.onSelect?.();
    onOpenChange(false);
  }

  return (
    <div className="group/menu-item relative px-1">
      <button
        className={cx(
          "flex min-h-8 w-full items-center gap-2 rounded px-2 py-1.5 text-left outline-none",
          action.destructive ? "text-red-600" : "text-slate-700",
          action.disabled
            ? "cursor-not-allowed opacity-45"
            : action.destructive
              ? "hover:bg-red-50 focus:bg-red-50"
              : "hover:bg-slate-100 focus:bg-slate-100"
        )}
        disabled={action.disabled}
        role="menuitem"
        type="button"
        onClick={handleSelect}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-current">
          {action.icon}
        </span>
        <span className="min-w-0 flex-1 whitespace-nowrap">{action.label}</span>
        {hasChildren ? <ChevronRight className="shrink-0 text-slate-400" size={14} /> : null}
      </button>

      {hasChildren ? (
        <div className="invisible absolute left-full top-0 z-10 w-max min-w-48 max-w-[calc(100vw-1rem)] rounded-md border border-slate-200 bg-white py-1 opacity-0 shadow-xl shadow-slate-900/15 group-hover/menu-item:visible group-hover/menu-item:opacity-100 group-focus-within/menu-item:visible group-focus-within/menu-item:opacity-100">
          <ContextMenuActionList actions={action.children ?? []} onOpenChange={onOpenChange} />
        </div>
      ) : null}
    </div>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
