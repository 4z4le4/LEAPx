import React from "react";

/** ---------- Base Modal Shell ---------- */
export function ModalShell({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[1000] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={[
          "relative z-[1001] w-full max-w-md rounded-2xl bg-white p-6 shadow-xl",
          className ?? "",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

/** ---------- Loading (กำลังประมวลผล) ---------- */
export function LoadingDialog({
  open,
  title = "กำลังดำเนินการ",
  desc = "โปรดรอสักครู่...",
  onCancel, // optional
}: {
  open: boolean;
  title?: string;
  desc?: string;
  onCancel?: () => void;
}) {
  return (
    <ModalShell open={open} onClose={onCancel}>
      <div className="flex flex-col items-center text-center">
        {/* Spinner ใหญ่ ตรงกลาง */}
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-transparent" />
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{desc}</p>
        {onCancel && (
          <div className="mt-5">
            <button
              onClick={onCancel}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

/** ---------- Result (สำเร็จ/ล้มเหลว) ---------- */
export function ResultDialog({
  open,
  state, // "success" | "error"
  title,
  desc,
  hideDesc = false, // << เพิ่มตัวเลือกซ่อน desc
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
}: {
  open: boolean;
  state: "success" | "error";
  title: string;
  desc?: string;
  hideDesc?: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose?: () => void;
}) {
  const isSuccess = state === "success";

  const Icon = isSuccess ? (
    // วงกลม + เช็ค ตรงกลางใหญ่ๆ
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8 text-emerald-600"
        fill="currentColor"
      >
        <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
    </div>
  ) : (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8 text-rose-600"
        fill="currentColor"
      >
        <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" />
      </svg>
    </div>
  );

  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        {Icon}
        <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>

        {!hideDesc && desc && (
          <p className="mt-1 text-sm text-slate-600">{desc}</p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            onClick={onPrimary}
            className={[
              "rounded-lg px-3 py-1.5 text-sm text-white shadow",
              isSuccess
                ? "bg-cyan-600 hover:bg-cyan-700"
                : "bg-rose-600 hover:bg-rose-700",
            ].join(" ")}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
