//TODO: รอเชื่อม backend ยังใช้ MOCK Participants จาก EventParticipantsEditor อยู่
import React from "react";
import { X } from "lucide-react";
import type { Participant } from "../../../../types/api/event";
import { Search } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  pool: Participant[];
  /** กันเลือกซ้ำ: ส่ง id ที่มีอยู่แล้วในตารางมา (optional) */
  existingIds?: string[];
  onConfirm: (rows: Participant[]) => void;
};

export default function ParticipantPickerModal({
  open,
  onClose,
  pool,
  existingIds = [],
  onConfirm,
}: Props) {
  const [query, setQuery] = React.useState("");
  const [picked, setPicked] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setPicked(new Set());
    }
  }, [open]);

  const filteredPool = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (p) =>
        p.studentId.toLowerCase().includes(q) ||
        p.fullName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.faculty ?? "").toLowerCase().includes(q)
    );
  }, [pool, query]);

  const togglePick = (sid: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) {
        next.delete(sid);
      } else {
        next.add(sid);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const rows = pool.filter((p) => picked.has(p.studentId));
    onConfirm(rows);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="text-lg font-semibold text-slate-900">
            เลือกผู้เข้าร่วมกิจกรรมจากรายชื่อ
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="ปิด"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-4">
          <div
            className="
      relative flex w-full items-center
      rounded-xl overflow-hidden
      ring-1 ring-slate-200 bg-white
      px-3 py-2
      focus-within:ring-2 focus-within:ring-slate-300
    "
          >
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา: ชื่อ / รหัสนักศึกษา / อีเมล / คณะ"
              className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="ล้างคำค้น"
                className="ml-2 rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[50vh] overflow-auto px-5 pb-2">
          <ul className="space-y-2">
            {filteredPool.map((p) => {
              const disabled = existingIds.includes(p.studentId);
              const checked = picked.has(p.studentId) || disabled;
              return (
                <li
                  key={p.studentId}
                  className={`flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 ${disabled ? "opacity-50" : ""
                    }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {p.fullName} ( {p.studentId} )
                    </div>
                    <div className="truncate text-sm text-slate-600">
                      {p.email} - {p.faculty}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={checked}
                    onChange={() => togglePick(p.studentId)}
                    className="h-5 w-5 accent-cyan-600"
                    aria-label={`เลือก ${p.fullName}`}
                  />
                </li>
              );
            })}
            {filteredPool.length === 0 && (
              <li className="py-10 text-center text-sm text-slate-400">
                ไม่พบผลลัพธ์ที่ตรงกับ “{query}”
              </li>
            )}
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={picked.size === 0}
            className="rounded-xl bg-cyan-500 hover:bg-cyan-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            ยืนยันการเลือก ({picked.size})
          </button>
        </div>
      </div>
    </div>
  );
}