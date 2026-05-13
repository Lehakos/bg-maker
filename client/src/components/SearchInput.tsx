import { clsx as cx } from "clsx";
import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  inputClassName?: string;
};

export function SearchInput({ className, inputClassName, ...inputProps }: SearchInputProps) {
  return (
    <label className={cx("relative block", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
        size={15}
      />
      <input
        className={cx(
          "h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-sm text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100",
          inputClassName
        )}
        type="search"
        {...inputProps}
      />
    </label>
  );
}
