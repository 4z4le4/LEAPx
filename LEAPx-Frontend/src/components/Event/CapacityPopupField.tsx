import * as React from "react";
import { X, Pencil } from "lucide-react";
import PillInput from "./PillInput";
import {
  MIN_LIMIT,
  // UNLIMITED_VALUE,
  inferModeFromValue,
  normalizeForBackend,
  formatDisplay,
  type LimitMode,
} from "./capacity-helpers";
import { createPortal } from "react-dom";

export default function CapacityPopupField({
  label,
  value,
  onChange,
  placeholder = "ไม่จำกัด",
  allowClosed = true,
  className,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (backendNumber: number) => void;
  placeholder?: string;
  allowClosed?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const initialMode = inferModeFromValue(value ?? null);
  const [mode, setMode] = React.useState<LimitMode>(initialMode);
  const [qty, setQty] = React.useState<string>(
    initialMode === "LIMITED" && value ? String(value) : ""
  );

  // sync when parent value changes
  React.useEffect(() => {
    const m = inferModeFromValue(value ?? null);
    setMode(m);
    setQty(m === "LIMITED" && value ? String(value) : "");
  }, [value]);

  // lock body scroll while open + close on Esc
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const firstFocus = React.useRef<HTMLButtonElement | null>(null);
  const qtyInputRef = React.useRef<HTMLInputElement | null>(null); // << ใหม่
  const [qtyError, setQtyError] = React.useState<string>(""); // << ใหม่
  React.useEffect(() => {
    if (open) firstFocus.current?.focus();
  }, [open]);

  const displayText = formatDisplay(value, placeholder);

  const segBtn = (active: boolean) =>
    [
      "px-3 py-1.5 rounded-lg text-sm transition",
      "ring-1",
      active
        ? "bg-cyan-50 text-cyan-700 ring-cyan-200"
        : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
    ].join(" ");

  function onQtyChange(s: string) {
    const clean = s.replace(/[^\d]/g, "");
    setQty(clean);
    if (qtyError) setQtyError(""); // << เคลียร์ error เมื่อพิมพ์
  }

  function onSave() {
    // ✅ validate เฉพาะโหมดจำกัดจำนวน
    if (mode === "LIMITED") {
      const num = parseInt(qty || "0", 10);
      if (!qty || !Number.isFinite(num)) {
        setQtyError("โปรดกรอกจำนวน");
        qtyInputRef.current?.focus();
        return;
      }
      if (num < MIN_LIMIT) {
        // (ส่วนใหญ่ MIN_LIMIT = 1) แจ้งว่า "ต้องมากกว่า 0" + บอกค่าขั้นต่ำไว้ด้วย
        setQtyError(
          MIN_LIMIT <= 1
            ? "ห้ามเป็น 0 (ต้องมากกว่า 0)"
            : `ต้องไม่ต่ำกว่า ${MIN_LIMIT.toLocaleString()}`
        );
        qtyInputRef.current?.focus();
        return;
      }
    }

    const num = parseInt(qty || "1", 10);
    const backend = normalizeForBackend(
      mode,
      Number.isFinite(num) && num >= MIN_LIMIT ? num : MIN_LIMIT
    );
    onChange(backend);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <PillInput
        className={className}
        type="text"
        value={displayText}
        placeholder={placeholder}
        rightIcon={<Pencil className="h-4 w-4 text-slate-500" />}
        inputMode="numeric"
        readOnly
        onClick={() => setOpen(true)}
      />

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`ตั้งค่าจำนวน: ${label}`}
          >
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />
            {/* Card */}
            <div
              className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header + เส้นคั่นเต็มกว้าง */}
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-slate-900">
                    ตั้งค่าจำนวน: {label}
                  </div>
                  <button
                    className="p-2 rounded-full hover:bg-slate-100 focus:outline-none "
                    onClick={() => setOpen(false)}
                    aria-label="ปิด"
                    title="ปิด"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
                <div className="-mx-5 mt-3 h-px bg-slate-200" />
              </div>

              <div className="mt-4 inline-flex  space-x-3">
                <button
                  type="button"
                  className={segBtn(mode === "UNLIMITED")}
                  onClick={() => setMode("UNLIMITED")}
                >
                  ไม่จำกัด
                </button>
                <button
                  type="button"
                  className={segBtn(mode === "LIMITED")}
                  onClick={() => setMode("LIMITED")}
                >
                  จำกัดจำนวน
                </button>
                {allowClosed && (
                  <button
                    type="button"
                    className={segBtn(mode === "CLOSED")}
                    onClick={() => setMode("CLOSED")}
                  >
                    ไม่เปิดรับ
                  </button>
                )}
              </div>

              {mode === "LIMITED" && (
                <div className="mt-5">
                  <div className="flex items-center gap-2">
                    <input
                      ref={qtyInputRef}
                      type="number"
                      value={qty}
                      onChange={(e) => onQtyChange(e.target.value)}
                      placeholder="เช่น 50"
                      inputMode="numeric"
                      className="w-[180px] px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      aria-invalid={qtyError ? true : undefined}
                    />
                    <span className="text-sm text-slate-600">คน</span>
                  </div>
                  <div
                    className={`mt-1 text-[11px] ${
                      qtyError ? "text-red-600" : "text-slate-500"
                    }`}
                  >
                    {qtyError ? (
                      qtyError
                    ) : (
                      <>
                        ขั้นต่ำ {MIN_LIMIT.toLocaleString()} คน •
                        ปิดรับอัตโนมัติเมื่อครบจำนวน
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 "
                  onClick={() => setOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="px-3 py-2 text-sm rounded-lg bg-cyan-600 text-white shadow hover:bg-cyan-700 "
                  onClick={onSave}
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
