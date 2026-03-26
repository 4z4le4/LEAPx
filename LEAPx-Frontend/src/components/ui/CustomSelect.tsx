import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type OptionType = {
  value: string;
  label: string;
};

type SelectProps = {
  value?: string | null;
  onChange: (v: string) => void;
  options: OptionType[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
};

export default function Select({
  value,
  onChange,
  options,
  placeholder = "เลือก",
  disabled,
  error,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  /* close when clicking outside */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* keyboard navigation */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        setHighlightIndex(0);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev < options.length - 1 ? prev + 1 : prev,
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0));
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[highlightIndex];
      if (opt) {
        onChange(opt.value);
        setOpen(false);
      }
    }

    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${className ?? "w-full"}`} ref={containerRef}>
      {/* Control */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`
        relative w-full rounded-xl border px-3 py-2 pr-10 text-sm text-left
        focus:ring-2 focus:ring-slate-200 focus:outline-none
        transition
        ${error ? "border-rose-500" : "border-slate-200"}
        ${disabled ? "bg-slate-100 cursor-not-allowed" : "bg-white"}
      `}
      >
        <span className="block truncate" title={selected?.label || placeholder}>
          {selected?.label || (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>

        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-60 overflow-auto">
          {options.length === 0 ? (
            <div className="px-4 py-2 text-sm text-slate-400">ไม่พบข้อมูล</div>
          ) : (
            options.map((opt, index) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightIndex(index)}
                className={`
                  w-full text-left px-4 py-2 text-sm truncate whitespace-nowrap
                  ${index === highlightIndex ? "bg-teal-50" : ""}
                  ${
                    opt.value === value
                      ? "bg-teal-100 text-teal-700"
                      : "text-slate-700"
                  }
                `}
                title={opt.label}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}

      {/* Error */}
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
