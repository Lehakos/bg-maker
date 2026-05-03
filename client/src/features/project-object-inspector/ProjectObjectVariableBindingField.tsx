import { Check, Link2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx } from "./class-names";

export type VariableBindingSelectOption = {
  label: string;
  value: string;
};

export type VariableBindingFieldState = {
  options: readonly VariableBindingSelectOption[];
  value: string;
  onChange: (variableId: string) => void;
};

type ProjectObjectVariableBindingFieldProps = {
  binding?: VariableBindingFieldState;
};

export function ProjectObjectVariableBindingField({
  binding
}: ProjectObjectVariableBindingFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!binding || !binding.options.length) {
    return null;
  }

  const selectedOption = binding.options.find((option) => option.value === binding.value);
  const controlLabel = selectedOption
    ? `Bound to property: ${selectedOption.label}`
    : "Bind to property";
  const options = [{ label: "No binding", value: "" }, ...binding.options];

  function handleSelect(variableId: string) {
    binding?.onChange(variableId);
    setOpen(false);
  }

  return (
    <span ref={containerRef} className="relative inline-flex shrink-0">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={controlLabel}
        className={cx(
          "inline-flex h-5 w-5 items-center justify-center rounded outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-100",
          selectedOption
            ? "bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        )}
        title={controlLabel}
        type="button"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <Link2 size={14} strokeWidth={2.2} />
      </button>
      {open ? (
        <span
          className="absolute left-0 top-full z-[95] mt-1 w-52 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-sm font-medium text-slate-700 shadow-lg shadow-slate-900/15"
          role="menu"
        >
          {options.map((option) => {
            const active = option.value === binding.value;

            return (
              <button
                key={option.value}
                aria-checked={active}
                className={cx(
                  "flex h-8 w-full min-w-0 items-center justify-between gap-2 px-2.5 text-left outline-none transition-colors focus-visible:bg-sky-50",
                  active ? "bg-sky-50 text-sky-800" : "hover:bg-slate-50"
                )}
                role="menuitemradio"
                type="button"
                onClick={() => handleSelect(option.value)}
              >
                <span className="truncate">{option.label}</span>
                {active ? <Check size={14} strokeWidth={2.2} /> : null}
              </button>
            );
          })}
        </span>
      ) : null}
    </span>
  );
}
