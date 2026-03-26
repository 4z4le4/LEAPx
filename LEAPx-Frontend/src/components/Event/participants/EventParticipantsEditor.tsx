//TODO: รอเชื่อม backend ยังใช้ MOCK Participants อยู่
import React from "react";
import {
  Download,
  Upload,
  Plus,
  Trash2,
  X,
  ChevronDown,
  Search,
} from "lucide-react";
import type { Participant } from "../../../../types/api/event";
import ParticipantPickerModal from "./ParticipantPickerModal";

type Props = {
  participants: Participant[];
  onChange: (rows: Participant[]) => void;
  pool?: Participant[];
};

const MOCK_POOL: Participant[] = Array.from({ length: 10 }).map((_, i) => ({
  studentId: `6506120${80 + i}`,
  fullName: `นายบบพพล นันเปิยง`,
  email: `noppol1234@cmu.ac.th`,
  faculty: "วิศวกรรมคอมพิวเตอร์",
}));

export default function EventParticipantsEditor({
  participants,
  onChange,
  pool = MOCK_POOL,
}: Props) {
  const [expanded, setExpanded] = React.useState(true);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // ✅ state ค้นหา
  const [query, setQuery] = React.useState("");

  // ===== helper =====
  const addRows = (rows: Participant[]) => {
    const have = new Set(participants.map((p) => p.studentId));
    const merged = [...participants];
    for (const r of rows) if (!have.has(r.studentId)) merged.push(r);
    onChange(merged);
  };
  const removeAt = (idx: number) =>
    onChange(participants.filter((_, i) => i !== idx));
  const clearAll = () => onChange([]);

  // ✅ กรองรายการตาม query (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((p) =>
      [p.studentId, p.fullName, p.email, p.faculty]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q)),
    );
  }, [participants, query]);

  // CSV
  const downloadTemplate = () => {
    const header = "studentId,fullName,email,faculty\n";
    const sample =
      "650612086,นายสมชาย ใจดี,somchai@cmu.ac.th,วิศวกรรมคอมพิวเตอร์\n";
    const blob = new Blob([header + sample], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "participants_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const fileRef = React.useRef<HTMLInputElement>(null);
  const handleCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      const rows = lines
        .slice(1)
        .map((line) => line.split(","))
        .filter((c) => c.length >= 4)
        .map((c) => ({
          studentId: c[0]?.trim() ?? "",
          fullName: c[1]?.trim() ?? "",
          email: c[2]?.trim() ?? "",
          faculty: c[3]?.trim() ?? "",
        })) as Participant[];
      if (rows.length) addRows(rows);
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div
        className={
          `flex items-start justify-between gap-3 px-4 py-3 ` +
          (expanded ? "border-b border-slate-200" : "")
        }
      >
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-slate-800 hover:bg-slate-50"
            aria-expanded={expanded}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                expanded ? "rotate-0" : "-rotate-90"
              }`}
            />
            <span className="font-medium">รายชื่อผู้เข้าร่วมทั้งหมด</span>
          </button>
          <div className="text-xs text-slate-400">
            เพิ่มจากฐานข้อมูลหรืออัปโหลดไฟล์ .csv
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> ดาวน์โหลดเทมเพลต
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCSV(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" /> อัปโหลด CSV
          </button>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-3 py-1.5 text-sm text-white hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4" /> เพิ่มรายชื่อ
          </button>
        </div>
      </div>

      {/* Collapsible content */}
      {expanded && (
        <>
          {/* ✅ แถวสรุป + ค้นหา */}
          <div className="flex flex-col gap-2 px-4 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              เลือกแล้วทั้งหมด{" "}
              <span className="font-medium text-slate-900">
                {participants.length}
              </span>{" "}
              คน
              {query && (
                <span className="ml-2 text-xs text-slate-500">
                  (แสดง {filtered.length})
                </span>
              )}
            </div>

            {/* กล่องค้นหา */}
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหา: ชื่อ / รหัสนักศึกษา / อีเมล / คณะ"
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="ล้างคำค้น"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">รหัสนักศึกษา</th>
                    <th className="px-3 py-2">ชื่อ - นามสกุล</th>
                    <th className="px-3 py-2">อีเมล</th>
                    <th className="px-3 py-2">คณะ/สาขา</th>
                    <th className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={clearAll}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> ล้างทั้งหมด
                      </button>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p, i) => (
                    <tr key={(p.studentId || "") + i} className="align-top">
                      <td className="px-1">
                        <span className="block px-2 py-1 text-slate-800">
                          {p.studentId || "-"}
                        </span>
                      </td>
                      <td className="px-1">
                        <span className="block px-2 py-1 text-slate-800">
                          {p.fullName || "-"}
                        </span>
                      </td>
                      <td className="px-1">
                        <span className="block px-2 py-1 text-slate-800">
                          {p.email || "-"}
                        </span>
                      </td>
                      <td className="px-1">
                        <span className="block px-2 py-1 text-slate-800">
                          {p.faculty || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeAt(i)}
                          className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
                          aria-label="ลบแถว"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-slate-400"
                      >
                        ยังไม่มีรายชื่อ — กด “เพิ่มรายชื่อ” หรืออัปโหลด CSV
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      <ParticipantPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        pool={pool}
        existingIds={participants.map((p) => p.studentId)}
        onConfirm={(rows) => {
          addRows(rows);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
