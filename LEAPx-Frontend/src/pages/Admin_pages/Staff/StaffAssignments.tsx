// src/pages/Admin_pages/StaffManagement/StaffAssignments.tsx
import { useMemo, useState } from "react";
import { ChevronDown, Download, Upload, Plus, Search } from "lucide-react";

/* ===================== types ===================== */

type StaffRoleKey =
  | "UNASSIGNED"
  | "STAFF_GENERAL"
  | "STAFF_SCAN"
  | "STAFF_TRAFFIC";

type StaffRow = {
  id: number;
  studentId: string;
  fullName: string;
  event: {
    id: number;
    title: string;
    dateRangeText?: string;
  };
  role: StaffRoleKey;
};

/* ===================== constants ===================== */

const ROLE_OPTIONS: Array<{ key: StaffRoleKey; label: string }> = [
  { key: "UNASSIGNED", label: "ยังไม่ได้รับมอบหมาย" },
  { key: "STAFF_GENERAL", label: "สตาฟทั่วไป" },
  { key: "STAFF_SCAN", label: "สตาฟสแกนเช็คชื่อ" },
  { key: "STAFF_TRAFFIC", label: "สตาฟจราจร" },
];

function roleLabel(key: StaffRoleKey) {
  return ROLE_OPTIONS.find((x) => x.key === key)?.label ?? "-";
}

function roleTextClass(key: StaffRoleKey) {
  if (key === "UNASSIGNED") return "text-rose-600";
  return "text-slate-800";
}

/* ===================== component ===================== */

export default function StaffAssignments() {
  // mock event + rows
  const [eventId, setEventId] = useState<number>(101);

  const [rows, setRows] = useState<StaffRow[]>(() => {
    const baseEvent = {
      id: 101,
      title: "กิจกรรมรับน้อง",
      dateRangeText: "14 ก.ค. - 17 ก.ค., 08:30 - 18:00",
    };

    const make = (i: number, role: StaffRoleKey): StaffRow => ({
      id: 9000 + i,
      studentId: "650612086",
      fullName: "นายพนพล นันเปียง",
      event: baseEvent,
      role,
    });

    return [
      make(1, "UNASSIGNED"),
      make(2, "UNASSIGNED"),
      make(3, "UNASSIGNED"),
      make(4, "STAFF_SCAN"),
      make(5, "STAFF_SCAN"),
      make(6, "STAFF_SCAN"),
      make(7, "STAFF_SCAN"),
      make(8, "STAFF_SCAN"),
      make(9, "UNASSIGNED"),
      make(10, "UNASSIGNED"),
      make(11, "UNASSIGNED"),
      make(12, "UNASSIGNED"),
      make(13, "UNASSIGNED"),
      make(14, "UNASSIGNED"),
    ];
  });

  // filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | StaffRoleKey>("ALL");

  // selection + bulk
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkRole, setBulkRole] = useState<StaffRoleKey>("STAFF_GENERAL");

  // event dropdown options (single in mock, still build list)
  const events = useMemo(() => {
    const m = new Map<number, { id: number; title: string }>();
    for (const r of rows)
      m.set(r.event.id, { id: r.event.id, title: r.event.title });
    return Array.from(m.values());
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchEvent = r.event.id === eventId;
      const matchRole = roleFilter === "ALL" ? true : r.role === roleFilter;
      const hay = `${r.studentId} ${r.fullName} ${r.event.title}`.toLowerCase();
      const matchSearch = !q || hay.includes(q);
      return matchEvent && matchRole && matchSearch;
    });
  }, [rows, eventId, roleFilter, search]);

  const stats = useMemo(() => {
    const eventRows = rows.filter((r) => r.event.id === eventId);
    const count = (k: StaffRoleKey) =>
      eventRows.filter((r) => r.role === k).length;
    return {
      unassigned: count("UNASSIGNED"),
      general: count("STAFF_GENERAL"),
      scan: count("STAFF_SCAN"),
      traffic: count("STAFF_TRAFFIC"),
    };
  }, [rows, eventId]);

  function toggleRow(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    const visibleIds = filteredRows.map((r) => r.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function assignRole(id: number, role: StaffRoleKey) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, role } : r)));
  }

  function assignBulk() {
    if (selectedIds.size === 0) return;
    setRows((prev) =>
      prev.map((r) => (selectedIds.has(r.id) ? { ...r, role: bulkRole } : r)),
    );
    setSelectedIds(new Set());
  }

  function cancelBulk() {
    setSelectedIds(new Set());
  }

  const selectedCount = selectedIds.size;

  const allVisibleSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id));

  const someVisibleSelected =
    filteredRows.some((r) => selectedIds.has(r.id)) && !allVisibleSelected;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* breadcrumb */}
        <div className="text-xs text-slate-500 mb-1">
          จัดการสตาฟ &gt;{" "}
          <span className="text-teal-700 font-medium">มอบหมายหน้าที่สตาฟ</span>
        </div>

        {/* title + event dropdown */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <h1 className="text-2xl font-semibold text-slate-800">
            มอบหมายหน้าที่สตาฟ
          </h1>

          <div className="w-full lg:w-[360px]">
            <div className="relative h-10">
              <select
                value={eventId}
                onChange={(e) => {
                  setEventId(Number(e.target.value));
                  setSelectedIds(new Set());
                }}
                className="h-10 w-full appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-800 outline-none transition hover:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    กิจกรรม: {ev.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        {/* summary card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="text-sm font-medium text-slate-800">
              สรุปบทบาทหน้าที่ที่มีอยู่
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => {
                // TODO: open manage roles modal
                console.log("add role");
              }}
            >
              <Plus className="h-4 w-4" />
              เพิ่มบทบาทหน้าที่
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* unassigned */}
            <div className="rounded-xl border border-slate-200 bg-amber-50 px-4 py-3">
              <div className="text-xs text-slate-600">ยังไม่ได้รับมอบหมาย</div>
              <div className="flex items-end justify-between mt-1">
                <div className="text-xs text-slate-500 uppercase">
                  UNASSIGNED
                </div>
                <div className="text-2xl font-semibold text-slate-900 tabular-nums">
                  {String(stats.unassigned).padStart(2, "0")}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs text-slate-600">สตาฟทั่วไป</div>
              <div className="flex items-end justify-between mt-1">
                <div className="text-xs text-slate-500 uppercase">
                  STAFF GENERAL
                </div>
                <div className="text-2xl font-semibold text-slate-900 tabular-nums">
                  {String(stats.general).padStart(2, "0")}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs text-slate-600">สตาฟสแกนเช็คชื่อ</div>
              <div className="flex items-end justify-between mt-1">
                <div className="text-xs text-slate-500 uppercase">
                  STAFF SCAN
                </div>
                <div className="text-2xl font-semibold text-slate-900 tabular-nums">
                  {String(stats.scan).padStart(2, "0")}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs text-slate-600">สตาฟจราจร</div>
              <div className="flex items-end justify-between mt-1">
                <div className="text-xs text-slate-500 uppercase">
                  STAFF TRAFFIC
                </div>
                <div className="text-2xl font-semibold text-slate-900 tabular-nums">
                  {String(stats.traffic).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* controls row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
          <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
            {/* search */}
            <div className="relative w-full lg:w-[340px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาจาก ชื่อ,รหัสนักศึกษา"
                className="w-full h-10 rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* role filter */}
            <div className="w-full lg:w-[260px]">
              <div className="relative h-10">
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as "ALL" | StaffRoleKey);
                  }}
                  className="h-10 w-full appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-800 outline-none transition hover:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                >
                  <option value="ALL">บทบาทหน้าที่: ทั้งหมด</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          </div>

          {/* export buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => console.log("download template")}
            >
              <Download className="h-4 w-4" />
              ดาวน์โหลดแบบฟอร์ม
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => console.log("upload csv")}
            >
              <Upload className="h-4 w-4" />
              อัปโหลด CSV
            </button>
          </div>
        </div>

        {/* ===================== LIST (responsive) ===================== */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* ✅ mobile/tablet: cards */}
          <div className="xl:hidden divide-y divide-slate-100">
            {/* header select-all row */}
            <div className="p-4 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  ref={(el) => {
                    if (!el) return;
                    el.indeterminate = someVisibleSelected;
                  }}
                  className="h-4 w-4 align-middle accent-teal-600"
                  aria-label="เลือกทั้งหมด"
                />
                เลือกทั้งหมดในหน้านี้
              </label>

              <div className="text-xs text-slate-500">
                ทั้งหมด {filteredRows.length} คน
              </div>
            </div>

            {filteredRows.map((r) => {
              const checked = selectedIds.has(r.id);
              return (
                <div key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <label className="inline-flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRow(r.id)}
                        className="mt-1 h-4 w-4 accent-teal-600"
                        aria-label={`เลือก ${r.studentId}`}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {r.fullName}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          รหัสนักศึกษา:{" "}
                          <span className="font-medium text-slate-800">
                            {r.studentId}
                          </span>
                        </div>
                      </div>
                    </label>

                    <div className="flex-none text-right">
                      <div className="text-xs text-slate-500">
                        บทบาทปัจจุบัน
                      </div>
                      <div
                        className={[
                          "text-sm font-medium",
                          roleTextClass(r.role),
                        ].join(" ")}
                      >
                        {roleLabel(r.role)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-medium text-slate-800">
                      {r.event.title}
                    </div>
                    {r.event.dateRangeText && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {r.event.dateRangeText}
                      </div>
                    )}

                    <div className="mt-3">
                      <div className="text-xs text-slate-500 mb-1">
                        จัดการบทบาท
                      </div>
                      <div className="relative">
                        <select
                          value={r.role}
                          onChange={(e) =>
                            assignRole(r.id, e.target.value as StaffRoleKey)
                          }
                          className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-800 outline-none transition hover:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredRows.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-500">
                ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
              </div>
            )}
          </div>

          {/* ✅ desktop: table */}
          <div className="hidden xl:block overflow-x-auto">
            <table className="min-w-[980px] w-full table-fixed text-sm border-collapse">
              <colgroup>
                <col className="w-[44px]" />
                <col className="w-[140px]" />
                <col className="w-[220px]" />
                <col className="w-[320px]" />
                <col className="w-[190px]" />
                <col className="w-[240px]" />
              </colgroup>

              <thead className="bg-slate-100">
                <tr className="text-xs text-slate-600 border-b border-slate-200">
                  <th className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      ref={(el) => {
                        if (!el) return;
                        el.indeterminate = someVisibleSelected;
                      }}
                      className="h-3.5 w-3.5 align-middle accent-teal-600"
                      aria-label="เลือกทั้งหมด"
                    />
                  </th>
                  <th className="text-left font-medium py-3 px-4">
                    รหัสนักศึกษา
                  </th>
                  <th className="text-left font-medium py-3 px-4">
                    ชื่อ - นามสกุล
                  </th>
                  <th className="text-left font-medium py-3 px-4">กิจกรรม</th>
                  <th className="text-left font-medium py-3 px-4">
                    บทบาทหน้าที่ปัจจุบัน
                  </th>
                  <th className="text-left font-medium py-3 px-4">
                    จัดการบทบาท
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((r) => {
                  const checked = selectedIds.has(r.id);
                  return (
                    <tr key={r.id} className="bg-white">
                      <td className="py-4 px-3 text-center align-top">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRow(r.id)}
                          className="h-3.5 w-3.5 align-middle accent-teal-600"
                          aria-label={`เลือก ${r.studentId}`}
                        />
                      </td>

                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        {r.studentId}
                      </td>

                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-800">
                          {r.fullName}
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="text-sm font-medium text-slate-800">
                          {r.event.title}
                        </div>
                        {r.event.dateRangeText && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {r.event.dateRangeText}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <span
                          className={[
                            "text-sm font-medium",
                            roleTextClass(r.role),
                          ].join(" ")}
                        >
                          {roleLabel(r.role)}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="relative">
                          <select
                            value={r.role}
                            onChange={(e) =>
                              assignRole(r.id, e.target.value as StaffRoleKey)
                            }
                            className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-800 outline-none transition hover:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-sm text-slate-500"
                    >
                      ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* bulk action bar */}
        {selectedCount > 0 && (
          <div className="fixed left-1/2 bottom-6 z-40 -translate-x-1/2 w-[min(860px,calc(100vw-24px))]">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-lg px-4 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-slate-700">
                  เลือกแล้ว{" "}
                  <span className="font-semibold text-slate-900">
                    {selectedCount}
                  </span>{" "}
                  คน
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative sm:w-[260px]">
                    <select
                      value={bulkRole}
                      onChange={(e) =>
                        setBulkRole(e.target.value as StaffRoleKey)
                      }
                      className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-800 outline-none transition hover:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>

                  <button
                    type="button"
                    className="h-9 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
                    onClick={assignBulk}
                  >
                    กำหนดบทบาท
                  </button>

                  <button
                    type="button"
                    className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={cancelBulk}
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
