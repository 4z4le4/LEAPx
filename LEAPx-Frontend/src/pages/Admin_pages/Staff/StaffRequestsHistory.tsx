// src/pages/Admin_pages/StaffManagement/StaffRequestsHistory.tsx
import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import useSWR from "swr";
import type { ReactNode } from "react";

/* ===================== types ===================== */

// ---- สมัครสตาฟ (History) ----
type JoinHistoryStatus = "APPROVED" | "REJECTED";

type ApiJoinHistoryRow = {
  id: number;
  studentId: string;
  fullName: string;
  event: {
    id: number;
    title: string;
    dateRangeText?: string;
  };
  actionStatus: JoinHistoryStatus;
  actionByName: string;
  actionAt: string; // ISO
};

// ---- ยกเลิกสตาฟ (History) ----
type CancelHistoryStatus = "CANCELLED" | "REJECTED";

type ApiCancelHistoryRow = {
  id: number;
  studentId: string;
  fullName: string;
  event: {
    id: number;
    title: string;
    dateRangeText?: string;
  };
  actionStatus: CancelHistoryStatus;
  actionByName: string;
  actionAt: string; // ISO
};

// ---- API response (แยก endpoint) ----
type JoinHistoryResponse = {
  success: boolean;
  data: ApiJoinHistoryRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type CancelHistoryResponse = {
  success: boolean;
  data: ApiCancelHistoryRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to fetch");
  }
  return (await res.json()) as T;
};

/* ===================== helpers ===================== */

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  try {
    return String(err);
  } catch {
    return "Unknown error";
  }
}

function formatDateTimeTH(iso: string) {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${date} ${time} น.`;
  } catch {
    return "-";
  }
}

// ---- badges: join ----
function joinBadgeStyle(s: JoinHistoryStatus) {
  if (s === "APPROVED")
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}
function joinBadgeText(s: JoinHistoryStatus) {
  if (s === "APPROVED") return "อนุมัติเป็นสตาฟแล้ว";
  return "ไม่อนุมัติคำขอเป็นสตาฟ";
}

// ---- badges: cancel ----
function cancelBadgeStyle(s: CancelHistoryStatus) {
  if (s === "CANCELLED")
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}
function cancelBadgeText(s: CancelHistoryStatus) {
  if (s === "CANCELLED") return "สิ้นสุดการเป็นสตาฟแล้ว";
  return "ไม่อนุมัติคำขอยกเลิก";
}

const JOIN_TABS: Array<{ key: "ALL" | JoinHistoryStatus; label: string }> = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "APPROVED", label: "อนุมัติเป็นสตาฟแล้ว" },
  { key: "REJECTED", label: "ไม่อนุมัติคำขอเป็นสตาฟ" },
];

const CANCEL_TABS: Array<{ key: "ALL" | CancelHistoryStatus; label: string }> =
  [
    { key: "ALL", label: "ทั้งหมด" },
    { key: "CANCELLED", label: "สิ้นสุดการเป็นสตาฟแล้ว" },
    { key: "REJECTED", label: "ไม่อนุมัติคำขอยกเลิก" },
  ];

function TabsRow<T extends string>(props: {
  label: string;
  tabs: Array<{ key: "ALL" | T; label: string }>;
  value: "ALL" | T;
  onChange: (v: "ALL" | T) => void;
}) {
  const { label, tabs, value, onChange } = props;
  return (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      <span className="text-sm text-slate-500 flex-none">{label}</span>

      {/* ✅ เลื่อนได้ (กันแท็บล้นตอน iPad / sidebar กินพื้นที่) */}
      <div
        className={[
          "flex items-center gap-2",
          "overflow-x-auto whitespace-nowrap min-w-0",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        ].join(" ")}
      >
        {tabs.map((t) => {
          const active = value === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={[
                "flex-none h-9 rounded-full px-4 text-sm shadow-sm transition",
                active
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== component ===================== */

export default function StaffRequestsHistory() {
  // ✅ ปรับเป็น false เมื่อมี API จริง
  const USE_MOCK = true;

  const limit = 10;

  // ====== JOIN filters ======
  const [joinSearch, setJoinSearch] = useState("");
  const [joinEventFilterId, setJoinEventFilterId] = useState<number | null>(
    null
  );
  const [joinTab, setJoinTab] = useState<"ALL" | JoinHistoryStatus>("ALL");
  const [joinPage, setJoinPage] = useState(1);

  // ====== CANCEL filters ======
  const [cancelSearch, setCancelSearch] = useState("");
  const [cancelEventFilterId, setCancelEventFilterId] = useState<number | null>(
    null
  );
  const [cancelTab, setCancelTab] = useState<"ALL" | CancelHistoryStatus>(
    "ALL"
  );
  const [cancelPage, setCancelPage] = useState(1);

  // ====== mock data ======
  const [joinRows, setJoinRows] = useState<ApiJoinHistoryRow[]>(() => {
    const base = {
      studentId: "650612086",
      fullName: "นายพนพล นันเปียง",
      event: {
        id: 101,
        title: "กิจกรรมรับน้อง",
        dateRangeText: "14 ก.ค. - 17 ก.ค., 08:30 - 18:00",
      },
      actionByName: "นายพนพล นันเปียง",
      actionAt: "2025-07-18T00:30:00+07:00",
    };
    return Array.from({ length: 12 }).map((_, i) => ({
      id: 3000 + i,
      ...base,
      actionStatus: i < 7 ? "APPROVED" : "REJECTED",
    }));
  });

  const [cancelRows, setCancelRows] = useState<ApiCancelHistoryRow[]>(() => {
    const base = {
      studentId: "650612086",
      fullName: "นายพนพล นันเปียง",
      event: {
        id: 101,
        title: "กิจกรรมรับน้อง",
        dateRangeText: "14 ก.ค. - 17 ก.ค., 08:30 - 18:00",
      },
      actionByName: "นายพนพล นันเปียง",
      actionAt: "2025-07-18T00:30:00+07:00",
    };
    return Array.from({ length: 10 }).map((_, i) => ({
      id: 4000 + i,
      ...base,
      actionStatus: i < 5 ? "CANCELLED" : "REJECTED",
    }));
  });

  // ---- API (optional) ----
  const joinKey = USE_MOCK
    ? null
    : `/api/staff/history/join?page=${joinPage}&limit=${limit}&status=${
        joinTab === "ALL" ? "" : joinTab
      }&eventId=${joinEventFilterId ?? ""}&q=${encodeURIComponent(joinSearch)}`;

  const cancelKey = USE_MOCK
    ? null
    : `/api/staff/history/cancel?page=${cancelPage}&limit=${limit}&status=${
        cancelTab === "ALL" ? "" : cancelTab
      }&eventId=${cancelEventFilterId ?? ""}&q=${encodeURIComponent(
        cancelSearch
      )}`;

  const {
    data: joinApi,
    error: joinErr,
    isLoading: joinLoading,
  } = useSWR<JoinHistoryResponse>(joinKey, (url: string) =>
    fetcher<JoinHistoryResponse>(url)
  );

  const {
    data: cancelApi,
    error: cancelErr,
    isLoading: cancelLoading,
  } = useSWR<CancelHistoryResponse>(cancelKey, (url: string) =>
    fetcher<CancelHistoryResponse>(url)
  );

  useEffect(() => {
    if (USE_MOCK) return;
    if (joinApi?.data) setJoinRows(joinApi.data);
  }, [USE_MOCK, joinApi]);

  useEffect(() => {
    if (USE_MOCK) return;
    if (cancelApi?.data) setCancelRows(cancelApi.data);
  }, [USE_MOCK, cancelApi]);

  // ====== dropdown options (แยกตาม section) ======
  const joinEvents = useMemo(() => {
    const m = new Map<number, { id: number; title: string }>();
    for (const r of joinRows)
      m.set(r.event.id, { id: r.event.id, title: r.event.title });
    return Array.from(m.values());
  }, [joinRows]);

  const cancelEvents = useMemo(() => {
    const m = new Map<number, { id: number; title: string }>();
    for (const r of cancelRows)
      m.set(r.event.id, { id: r.event.id, title: r.event.title });
    return Array.from(m.values());
  }, [cancelRows]);

  // ====== filtering (เฉพาะ USE_MOCK) ======
  const derivedJoin = useMemo(() => {
    // ✅ โหมด API: backend จัดการ filter/pagination แล้ว
    if (!USE_MOCK) return joinRows;

    const q = joinSearch.trim().toLowerCase();
    return joinRows.filter((r) => {
      const matchStatus = joinTab === "ALL" ? true : r.actionStatus === joinTab;
      const matchEvent =
        joinEventFilterId == null ? true : r.event.id === joinEventFilterId;
      const hay =
        `${r.studentId} ${r.fullName} ${r.event.title} ${r.actionByName}`.toLowerCase();
      const matchSearch = !q || hay.includes(q);
      return matchStatus && matchEvent && matchSearch;
    });
  }, [USE_MOCK, joinRows, joinSearch, joinTab, joinEventFilterId]);

  const derivedCancel = useMemo(() => {
    // ✅ โหมด API: backend จัดการ filter/pagination แล้ว
    if (!USE_MOCK) return cancelRows;

    const q = cancelSearch.trim().toLowerCase();
    return cancelRows.filter((r) => {
      const matchStatus =
        cancelTab === "ALL" ? true : r.actionStatus === cancelTab;
      const matchEvent =
        cancelEventFilterId == null ? true : r.event.id === cancelEventFilterId;
      const hay =
        `${r.studentId} ${r.fullName} ${r.event.title} ${r.actionByName}`.toLowerCase();
      const matchSearch = !q || hay.includes(q);
      return matchStatus && matchEvent && matchSearch;
    });
  }, [USE_MOCK, cancelRows, cancelSearch, cancelTab, cancelEventFilterId]);

  // ====== pagination ======
  const joinTotalPages = USE_MOCK
    ? Math.max(1, Math.ceil(derivedJoin.length / limit))
    : joinApi?.pagination?.totalPages || 1;

  const cancelTotalPages = USE_MOCK
    ? Math.max(1, Math.ceil(derivedCancel.length / limit))
    : cancelApi?.pagination?.totalPages || 1;

  const joinSafePage = Math.min(Math.max(1, joinPage), joinTotalPages);
  const cancelSafePage = Math.min(Math.max(1, cancelPage), cancelTotalPages);

  // ✅ กัน “หน้า 3 / 1” ตอน filter แล้วจำนวนหน้าเหลือน้อยลง
  useEffect(() => {
    if (joinPage !== joinSafePage) setJoinPage(joinSafePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinSafePage]);

  useEffect(() => {
    if (cancelPage !== cancelSafePage) setCancelPage(cancelSafePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelSafePage]);

  const joinPageRows = USE_MOCK
    ? derivedJoin.slice((joinSafePage - 1) * limit, joinSafePage * limit)
    : joinRows;

  const cancelPageRows = USE_MOCK
    ? derivedCancel.slice((cancelSafePage - 1) * limit, cancelSafePage * limit)
    : cancelRows;

  // ✅ card renderer (รองรับทุกขนาด: <xl เป็น card list)
  function HistoryCards<
    T extends {
      id: number;
      studentId: string;
      fullName: string;
      event: { title: string; dateRangeText?: string };
      actionByName: string;
      actionAt: string;
    }
  >(rows: T[], renderStatusBadge: (row: T) => ReactNode) {
    return (
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
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

              <div className="flex-none">{renderStatusBadge(r)}</div>
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

              <div className="mt-2 text-xs text-slate-500">
                ดำเนินการโดย:{" "}
                <span className="font-medium text-slate-800">
                  {r.actionByName}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                วันที่ดำเนินการ:{" "}
                <span className="font-medium text-slate-800">
                  {formatDateTimeTH(r.actionAt)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-500">
            ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* breadcrumb */}
        <div className="text-xs text-slate-500 mb-1">
          จัดการสตาฟ &gt;{" "}
          <span className="text-teal-700 font-medium">
            ประวัติคำขอสมัคร/ยกเลิก
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-slate-800 mb-6">
          ประวัติคำขอสมัคร/ยกเลิก
        </h1>

        {/* ===================== JOIN HISTORY ===================== */}
        <div className="mb-10">
          {/* title + dropdown (เหมือน Accept) */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
            <h2 className="text-lg font-semibold text-slate-800">
              ประวัติคำขอสมัคร
            </h2>

            <div className="w-full lg:w-[320px]">
              <div className="relative h-10">
                <select
                  value={joinEventFilterId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    setJoinEventFilterId(v);
                    setJoinPage(1);
                  }}
                  className="h-10 w-full appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-800 outline-none transition hover:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                >
                  <option value="">กิจกรรม: ทั้งหมด</option>
                  {joinEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      กิจกรรม: {ev.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          </div>

          {/* search + tabs */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center mb-6">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาจาก ชื่อ,รหัสนักศึกษา"
                className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                value={joinSearch}
                onChange={(e) => {
                  setJoinSearch(e.target.value);
                  setJoinPage(1);
                }}
              />
            </div>

            <div className="min-w-0">
              <TabsRow
                label="สถานะ:"
                tabs={JOIN_TABS}
                value={joinTab}
                onChange={(v) => {
                  setJoinTab(v);
                  setJoinPage(1);
                }}
              />
            </div>
          </div>

          {!USE_MOCK && joinLoading && (
            <div className="py-4 text-center text-sm text-slate-500">
              กำลังโหลดประวัติคำขอสมัคร...
            </div>
          )}
          {!USE_MOCK && joinErr && !joinLoading && (
            <div className="py-4 text-center text-sm text-red-500">
              โหลดข้อมูลไม่สำเร็จ: {getErrorMessage(joinErr)}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* ✅ <xl ใช้ card list (รองรับทุกขนาด + iPad) */}
            <div className="xl:hidden">
              {HistoryCards(joinPageRows, (r) => (
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                    joinBadgeStyle((r as ApiJoinHistoryRow).actionStatus),
                  ].join(" ")}
                >
                  {joinBadgeText((r as ApiJoinHistoryRow).actionStatus)}
                </span>
              ))}
            </div>

            {/* ✅ xl+ ใช้ table */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="min-w-[980px] w-full table-fixed text-sm border-collapse">
                <colgroup>
                  <col className="w-[140px]" />
                  <col className="w-[220px]" />
                  <col className="w-[320px]" />
                  <col className="w-[210px]" />
                  <col className="w-[170px]" />
                  <col className="w-[190px]" />
                </colgroup>

                <thead className="bg-slate-100">
                  <tr className="text-xs text-slate-600 border-b border-slate-200">
                    <th className="text-left font-medium py-3 px-4">
                      รหัสนักศึกษา
                    </th>
                    <th className="text-left font-medium py-3 px-4">
                      ชื่อ - นามสกุล
                    </th>
                    <th className="text-left font-medium py-3 px-4">กิจกรรม</th>
                    <th className="text-left font-medium py-3 px-3">
                      สถานะการดำเนินการ
                    </th>
                    <th className="text-left font-medium py-3 px-3">
                      ดำเนินการโดย
                    </th>
                    <th className="text-left font-medium py-3 px-4">
                      วันที่ดำเนินการ
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {joinPageRows.map((r) => (
                    <tr key={r.id} className="bg-white">
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
                      <td className="py-4 px-3 align-top whitespace-nowrap">
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                            joinBadgeStyle(r.actionStatus),
                          ].join(" ")}
                        >
                          {joinBadgeText(r.actionStatus)}
                        </span>
                      </td>
                      <td className="py-4 px-3 align-top whitespace-nowrap">
                        <div className="text-sm text-slate-800">
                          {r.actionByName}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        {formatDateTimeTH(r.actionAt)}
                      </td>
                    </tr>
                  ))}

                  {joinPageRows.length === 0 && (
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

            {/* pagination */}
            <div className="border-t border-slate-200 px-4 py-3">
              <div className="flex items-center justify-end gap-3 text-sm">
                <button
                  type="button"
                  className="px-3 py-1 rounded-full border border-slate-200 bg-white disabled:opacity-40"
                  disabled={joinSafePage <= 1}
                  onClick={() => setJoinPage((p) => Math.max(1, p - 1))}
                >
                  ก่อนหน้า
                </button>

                <span className="text-slate-600">
                  หน้า {joinSafePage} / {joinTotalPages}
                </span>

                <button
                  type="button"
                  className="px-3 py-1 rounded-full border border-slate-200 bg-white disabled:opacity-40"
                  disabled={joinSafePage >= joinTotalPages}
                  onClick={() =>
                    setJoinPage((p) => Math.min(joinTotalPages, p + 1))
                  }
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== CANCEL HISTORY ===================== */}
        <div>
          {/* title + dropdown (เหมือน Accept) */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
            <h2 className="text-lg font-semibold text-slate-800">
              ประวัติคำขอยกเลิก
            </h2>

            <div className="w-full lg:w-[320px]">
              <div className="relative h-10">
                <select
                  value={cancelEventFilterId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    setCancelEventFilterId(v);
                    setCancelPage(1);
                  }}
                  className="h-10 w-full appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-800 outline-none transition hover:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                >
                  <option value="">กิจกรรม: ทั้งหมด</option>
                  {cancelEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      กิจกรรม: {ev.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          </div>

          {/* search + tabs */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center mb-6">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาจาก ชื่อ,รหัสนักศึกษา"
                className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                value={cancelSearch}
                onChange={(e) => {
                  setCancelSearch(e.target.value);
                  setCancelPage(1);
                }}
              />
            </div>

            <div className="min-w-0">
              <TabsRow
                label="สถานะ:"
                tabs={CANCEL_TABS}
                value={cancelTab}
                onChange={(v) => {
                  setCancelTab(v);
                  setCancelPage(1);
                }}
              />
            </div>
          </div>

          {!USE_MOCK && cancelLoading && (
            <div className="py-4 text-center text-sm text-slate-500">
              กำลังโหลดประวัติคำขอยกเลิก...
            </div>
          )}
          {!USE_MOCK && cancelErr && !cancelLoading && (
            <div className="py-4 text-center text-sm text-red-500">
              โหลดข้อมูลไม่สำเร็จ: {getErrorMessage(cancelErr)}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* ✅ <xl ใช้ card list */}
            <div className="xl:hidden">
              {HistoryCards(cancelPageRows, (r) => (
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                    cancelBadgeStyle((r as ApiCancelHistoryRow).actionStatus),
                  ].join(" ")}
                >
                  {cancelBadgeText((r as ApiCancelHistoryRow).actionStatus)}
                </span>
              ))}
            </div>

            {/* ✅ xl+ ใช้ table */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="min-w-[980px] w-full table-fixed text-sm border-collapse">
                <colgroup>
                  <col className="w-[140px]" />
                  <col className="w-[220px]" />
                  <col className="w-[320px]" />
                  <col className="w-[210px]" />
                  <col className="w-[170px]" />
                  <col className="w-[190px]" />
                </colgroup>

                <thead className="bg-slate-100">
                  <tr className="text-xs text-slate-600 border-b border-slate-200">
                    <th className="text-left font-medium py-3 px-4">
                      รหัสนักศึกษา
                    </th>
                    <th className="text-left font-medium py-3 px-4">
                      ชื่อ - นามสกุล
                    </th>
                    <th className="text-left font-medium py-3 px-4">กิจกรรม</th>
                    <th className="text-left font-medium py-3 px-3">
                      สถานะการดำเนินการ
                    </th>
                    <th className="text-left font-medium py-3 px-3">
                      ดำเนินการโดย
                    </th>
                    <th className="text-left font-medium py-3 px-4">
                      วันที่ดำเนินการ
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {cancelPageRows.map((r) => (
                    <tr key={r.id} className="bg-white">
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
                      <td className="py-4 px-3 align-top whitespace-nowrap">
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                            cancelBadgeStyle(r.actionStatus),
                          ].join(" ")}
                        >
                          {cancelBadgeText(r.actionStatus)}
                        </span>
                      </td>
                      <td className="py-4 px-3 align-top whitespace-nowrap">
                        <div className="text-sm text-slate-800">
                          {r.actionByName}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        {formatDateTimeTH(r.actionAt)}
                      </td>
                    </tr>
                  ))}

                  {cancelPageRows.length === 0 && (
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

            {/* pagination */}
            <div className="border-t border-slate-200 px-4 py-3">
              <div className="flex items-center justify-end gap-3 text-sm">
                <button
                  type="button"
                  className="px-3 py-1 rounded-full border border-slate-200 bg-white disabled:opacity-40"
                  disabled={cancelSafePage <= 1}
                  onClick={() => setCancelPage((p) => Math.max(1, p - 1))}
                >
                  ก่อนหน้า
                </button>

                <span className="text-slate-600">
                  หน้า {cancelSafePage} / {cancelTotalPages}
                </span>

                <button
                  type="button"
                  className="px-3 py-1 rounded-full border border-slate-200 bg-white disabled:opacity-40"
                  disabled={cancelSafePage >= cancelTotalPages}
                  onClick={() =>
                    setCancelPage((p) => Math.min(cancelTotalPages, p + 1))
                  }
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* end sections */}
      </div>
    </div>
  );
}
