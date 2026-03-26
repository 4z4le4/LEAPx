import { ChevronDown } from "lucide-react";
import React from "react";

type SelectProps = {
  value?: string | null;
  onChange: (v: string) => void;
  children: React.ReactNode;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
};

export default function Select({
  value,
  onChange,
  children,
  placeholder,
  className,
  disabled,
  error,
  id,
}: SelectProps) {
  return (
    <div className="w-full">
      <div className="relative">
        <select
          id={id}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
          className={`
    w-full appearance-none rounded-xl border
    px-4 pr-10 py-2.5 text-sm truncate
    focus:ring-2 focus:ring-teal-500 focus:outline-none
    ${error ? "border-rose-500" : "border-slate-200"}
    ${disabled ? "bg-slate-100 cursor-not-allowed" : "bg-white"}
    ${className ?? ""}
  `}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
