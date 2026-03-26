import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ===================== Types ===================== */
export type PageItem = number | "…";

type Props = {
  currentPage: number; // 1-based
  totalPages: number; // >= 1
  onChange: (nextPage: number) => void;

  siblingCount?: number; // default 2
  boundaryCount?: number; // default 1

  className?: string;
  ariaLabel?: string;

  /** ถ้าอยาก disable ทั้งชุด (เช่นกำลังโหลด) */
  disabled?: boolean;
};

/* ===================== Helpers ===================== */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildCompactPages(
  current: number,
  total: number,
  siblingCount = 2,
  boundaryCount = 1
): PageItem[] {
  const safeTotal = Math.max(1, total);
  const safeCurrent = clamp(current, 1, safeTotal);

  const totalShown = boundaryCount * 2 + 1 + siblingCount * 2;
  if (safeTotal <= Math.max(7, totalShown + 2)) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }

  const items: PageItem[] = [];

  const startPages = Array.from({ length: boundaryCount }, (_, i) => i + 1);
  const endPages = Array.from(
    { length: boundaryCount },
    (_, i) => safeTotal - boundaryCount + 1 + i
  );

  const siblingsStart = clamp(
    safeCurrent - siblingCount,
    boundaryCount + 2,
    safeTotal - boundaryCount - siblingCount * 2 - 1
  );

  const siblingsEnd = clamp(
    safeCurrent + siblingCount,
    boundaryCount + siblingCount * 2 + 2,
    safeTotal - boundaryCount - 1
  );

  items.push(...startPages);

  if (siblingsStart > boundaryCount + 2) {
    items.push("…");
  } else {
    for (let p = boundaryCount + 1; p < siblingsStart; p++) items.push(p);
  }

  for (let p = siblingsStart; p <= siblingsEnd; p++) items.push(p);

  if (siblingsEnd < safeTotal - boundaryCount - 1) {
    items.push("…");
  } else {
    for (let p = siblingsEnd + 1; p <= safeTotal - boundaryCount; p++) {
      items.push(p);
    }
  }

  items.push(...endPages);

  return items;
}

/* ===================== Component ===================== */
export default function CompactPagination({
  currentPage,
  totalPages,
  onChange,
  siblingCount = 2,
  boundaryCount = 1,
  className,
  ariaLabel = "Pagination",
  disabled = false,
}: Props) {
  const safeTotal = Math.max(1, totalPages);
  const safeCurrent = clamp(currentPage, 1, safeTotal);

  const canPrev = safeCurrent > 1;
  const canNext = safeCurrent < safeTotal;

  const items = useMemo(
    () =>
      buildCompactPages(safeCurrent, safeTotal, siblingCount, boundaryCount),
    [safeCurrent, safeTotal, siblingCount, boundaryCount]
  );

  return (
    <nav
      className={["flex items-center gap-2", className ?? ""].join(" ")}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className={[
          "h-10 w-10 rounded-full",
          "bg-slate-100 text-slate-700",
          "hover:bg-slate-200",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "transition",
        ].join(" ")}
        disabled={disabled || !canPrev}
        onClick={() => onChange(clamp(safeCurrent - 1, 1, safeTotal))}
        aria-label="ก่อนหน้า"
        title="ก่อนหน้า"
      >
        <ChevronLeft className="mx-auto h-5 w-5" />
      </button>

      <div className="flex items-center gap-1 px-1">
        {items.map((it, idx) => {
          if (it === "…") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 text-slate-400 select-none"
              >
                …
              </span>
            );
          }

          const p = it;
          const active = p === safeCurrent;

          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={active ? "page" : undefined}
              disabled={disabled}
              className={[
                "relative h-10 px-3",
                "text-sm transition",
                disabled ? "opacity-70 cursor-not-allowed" : "",
                active
                  ? "text-teal-700 font-semibold"
                  : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              {p}
              <span
                className={[
                  "pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-2",
                  "h-[2px] w-5 rounded",
                  active ? "bg-teal-600" : "bg-transparent",
                  "transition",
                ].join(" ")}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className={[
          "h-10 w-10 rounded-full",
          "bg-slate-100 text-slate-700",
          "hover:bg-slate-200",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "transition",
        ].join(" ")}
        disabled={disabled || !canNext}
        onClick={() => onChange(clamp(safeCurrent + 1, 1, safeTotal))}
        aria-label="ถัดไป"
        title="ถัดไป"
      >
        <ChevronRight className="mx-auto h-5 w-5" />
      </button>
    </nav>
  );
}
