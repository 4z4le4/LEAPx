// src/components/Event/EventFilterBar.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Check } from "lucide-react";
import type { UiStatus } from "../../../types/ui/events";

/* ===================== types ===================== */
export type MajorCategoryOption = {
  id: number;
  name_TH: string;
  name_EN: string;
};

type Props = {
  q: string;
  status: "all" | UiStatus;
  dateSort: "asc" | "desc";

  majorCategoryId?: string;
  majorCategoryOptions?: MajorCategoryOption[];

  onChange: (next: {
    q?: string;
    status?: "all" | UiStatus;
    dateSort?: "asc" | "desc";
    majorCategoryId?: string;
  }) => void;

  className?: string;
  debounceMs?: number;
};

type DropOption = { value: string; label: string };

function isThaiLang(lang?: string): boolean {
  return Boolean(lang && lang.toLowerCase().startsWith("th"));
}

/* ===== click outside helper (TS-safe) ===== */
function useClickOutside(
  refs: Array<React.RefObject<unknown>>,
  onOutside: () => void
) {
  const onOutsideRef = useRef(onOutside);
  onOutsideRef.current = onOutside;

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;

      const inside = refs.some((r) => {
        const el = r.current;
        return el instanceof Node ? el.contains(target) : false;
      });

      if (!inside) onOutsideRef.current();
    };

    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ===== Dropdown (custom, no aria) ===== */
type DropdownProps = {
  id: string; // kept for future use / debugging
  value: string;
  options: DropOption[];
  placeholder?: string;
  onChange: (v: string) => void;
  minWidthClass?: string;
};

const Dropdown: React.FC<DropdownProps> = ({
  id,
  value,
  options,
  placeholder = "",
  onChange,
  minWidthClass = "min-w-[160px]",
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useClickOutside([wrapRef], () => setOpen(false));

  const selectedLabel = useMemo(() => {
    const found = options.find((o) => o.value === value);
    return found?.label ?? placeholder;
  }, [options, value, placeholder]);

  return (
    <div ref={wrapRef} className={`relative ${minWidthClass}`}>
      <button
        id={id}
        type="button"
        className="h-12 w-full inline-flex items-center justify-between gap-2
                   rounded-full border border-slate-300 bg-white px-4
                   text-slate-700 hover:bg-slate-100 transition
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        onClick={() => setOpen((s) => !s)}
      >
        <span className="truncate text-sm font-medium">
          {selectedLabel || placeholder}
        </span>

        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 mt-2 z-40
                     rounded-lg border border-slate-200 bg-white shadow-lg py-1 overflow-hidden"
        >
          {options.map((o) => {
            const active = o.value === value;
            const key = o.value === "" ? "__empty__" : o.value;

            return (
              <button
                key={key}
                type="button"
                className={`w-full flex items-center justify-between gap-3
                            px-4 py-2 text-left text-sm
                            ${active
                    ? "bg-slate-50 text-slate-900"
                    : "text-slate-700"
                  }
                            hover:bg-gray-50 transition`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <span className="truncate">{o.label}</span>
                {active && <Check size={16} className="text-slate-700" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ===================== Component ===================== */
const EventFilterBar: React.FC<Props> = ({
  q,
  status,
  dateSort,
  majorCategoryId = "",
  majorCategoryOptions = [],
  onChange,
  debounceMs = 300,
  className = "",
}) => {
  const { i18n } = useTranslation();
  const th = isThaiLang(i18n.language);

  // debounce search
  const [localQ, setLocalQ] = useState(q);
  const first = useRef(true);

  useEffect(() => {
    if (q !== localQ) setLocalQ(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.setTimeout(
      () => onChange({ q: localQ }),
      Math.max(0, debounceMs)
    );
    return () => window.clearTimeout(id);
  }, [localQ, debounceMs, onChange]);

  // guard major value
  const majorValue = useMemo(() => {
    if (!majorCategoryId) return "";
    const exist = majorCategoryOptions.some(
      (m) => String(m.id) === String(majorCategoryId)
    );
    return exist ? String(majorCategoryId) : "";
  }, [majorCategoryId, majorCategoryOptions]);

  const statusOptions: DropOption[] = useMemo(
    () => [
      { value: "all", label: th ? "ทั้งหมด" : "All" },
      { value: "SOON", label: th ? "เร็วๆ นี้" : "Soon" },
      { value: "OPEN", label: th ? "เปิดลงทะเบียน" : "Open" },
      { value: "CLOSED", label: th ? "ปิดรับสมัคร" : "Closed" },
    ],
    [th]
  );

  const dateSortOptions: DropOption[] = useMemo(
    () => [
      { value: "asc", label: th ? "ใกล้ก่อน" : "Sooner" },
      { value: "desc", label: th ? "ไกลก่อน" : "Later" },
    ],
    [th]
  );

  const majorOptions: DropOption[] = useMemo(() => {
    if (!majorCategoryOptions.length) return [];
    const base: DropOption[] = [
      { value: "", label: th ? "ทุกสาขา" : "All majors" },
    ];
    const rest = majorCategoryOptions.map((m) => ({
      value: String(m.id),
      label: th ? m.name_TH : m.name_EN,
    }));
    return [...base, ...rest];
  }, [majorCategoryOptions, th]);

  return (
    <div
      className={`flex flex-col gap-3 md:flex-row md:items-center ${className}`}
    >
      {/* Search */}
      <div className="relative w-full md:flex-1">
        <label htmlFor="search" className="sr-only">
          {th ? "ค้นหา" : "Search"}
        </label>

        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            className="text-cyan-500"
          >
            <path
              fill="currentColor"
              d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"
            />
          </svg>
        </span>

        <input
          id="search"
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          placeholder={th ? "ค้นหา…" : "Search…"}
          className="h-12 w-full rounded-full bg-white text-slate-800 placeholder-slate-400
                     border border-slate-300 pl-10 pr-10
                     focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500"
        />

        {localQ ? (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={() => {
              setLocalQ("");
              onChange({ q: "" });
            }}
          >
            ×
          </button>
        ) : null}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 md:gap-3">
        <Dropdown
          id="statusFilter"
          value={status}
          options={statusOptions}
          placeholder={th ? "สถานะ" : "Status"}
          onChange={(v) => onChange({ status: v as "all" | UiStatus })}
          minWidthClass="min-w-[150px]"
        />

        {majorOptions.length > 0 && (
          <Dropdown
            id="majorCategoryFilter"
            value={majorValue}
            options={majorOptions}
            placeholder={th ? "สาขา" : "Major"}
            onChange={(v) => onChange({ majorCategoryId: v })}
            minWidthClass="min-w-[170px]"
          />
        )}

        <Dropdown
          id="dateSort"
          value={dateSort}
          options={dateSortOptions}
          placeholder={th ? "เรียงวันที่" : "Sort"}
          onChange={(v) => onChange({ dateSort: v as "asc" | "desc" })}
          minWidthClass="min-w-[140px]"
        />
      </div>
    </div>
  );
};

export default EventFilterBar;
