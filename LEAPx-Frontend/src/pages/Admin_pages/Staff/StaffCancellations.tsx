// src/pages/Admin_pages/StaffManagement/StaffCancellations.tsx
import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, Check, X, RotateCcw } from "lucide-react";
import useSWR from "swr";

/* ===================== types ===================== */

type CancellationStatus = "PENDING" | "CANCELLED" | "REJECTED";

type ApiStaffCancellation = {
  id: number;
  studentId: string;
  fullName: string;
  event: {
    id: number;
    title: string;
    dateRangeText?: string; // "14 ก.ค. - 17 ก.ค., 08:30 - 18:00"
  };
  requestedAt: string; // ISO
  status: CancellationStatus;
};

type StaffCancellationsResponse = {
  success: boolean;
  data: ApiStaffCancellation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const fetcher = async (url: string): Promise<StaffCancellationsResponse> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to fetch staff cancellations");
  }
  return (await res.json()) as StaffCancellationsResponse;
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

function badgeStyle(status: CancellationStatus) {
  if (status === "PENDING")
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "CANCELLED")
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

function badgeText(status: CancellationStatus) {
  if (status === "PENDING") return "รอการอนุมัติ";
  if (status === "CANCELLED") return "สิ้นสุดการเป็นสตาฟแล้ว";
  return "ไม่อนุมัติคำขอยกเลิก";
}

const STATUS_TABS: Array<{ key: "ALL" | CancellationStatus; label: string }> = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "PENDING", label: "รอการอนุมัติ" },
  { key: "CANCELLED", label: "สิ้นสุดการเป็นสตาฟแล้ว" },
  { key: "REJECTED", label: "ไม่อนุมัติคำขอยกเลิก" },
];

/* ===================== component ===================== */

type PendingAction =
  | { kind: "APPROVE_CANCEL"; id: number; title: string }
  | { kind: "REJECT_CANCEL"; id: number; title: string }
  | { kind: "UNDO_CANCEL"; id: number; title: string }
  | { kind: "CONVERT_TO_APPROVE"; id: number; title: string }
  | null;

export default function StaffCancellations() {
  // ✅ ปรับเป็น false เมื่อมี API จริง
  const USE_MOCK = true;

  const [page, setPage] = useState(1);
  const limit = 10;

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<"ALL" | CancellationStatus>("ALL");
  const [eventFilterId, setEventFilterId] = useState<number | null>(null);

  const [rows, setRows] = useState<ApiStaffCancellation[]>(() => {
    const base = {
      studentId: "650612086",
      fullName: "นายพนพล นันเปียง",
      event: {
        id: 101,
        title: "กิจกรรมรับน้อง",
        dateRangeText: "14 ก.ค. - 17 ก.ค., 08:30 - 18:00",
      },
      requestedAt: "2025-07-18T00:30:00+07:00",
    };

    // ให้ pattern ใกล้ภาพ: PENDING หลายแถว, CANCELLED บางแถว, REJECTED บางแถว
    return Array.from({ length: 10 }).map((_, i) => ({
      id: 2000 + i,
      ...base,
      status: i < 5 ? "PENDING" : i < 8 ? "CANCELLED" : "REJECTED",
    }));
  });

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [acting, setActing] = useState(false);

  // ---- API (ปิดไว้ด้วย USE_MOCK) ----
  const apiKey = USE_MOCK
    ? null
    : `/api/staff/cancellations?page=${page}&limit=${limit}&status=${
        statusTab === "ALL" ? "" : statusTab
      }&eventId=${eventFilterId ?? ""}&q=${encodeURIComponent(search)}`;

  const { data, error, isLoading } = useSWR<StaffCancellationsResponse>(
    apiKey,
    fetcher,
    {
      // ✅ ให้ SWR cache + ลดการกระพริบตอนเปลี่ยนตัวกรอง/หน้า
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    if (USE_MOCK) return;
    if (data?.data) setRows(data.data);
  }, [USE_MOCK, data]);

  const events = useMemo(() => {
    const m = new Map<number, { id: number; title: string }>();
    for (const r of rows)
      m.set(r.event.id, { id: r.event.id, title: r.event.title });
    return Array.from(m.values());
  }, [rows]);

  const derivedRows = useMemo(() => {
    // ✅ โหมด API: ให้ backend จัดการกรอง/ค้นหา/แบ่งหน้า (หน้าเว็บใช้ผลลัพธ์ตรงๆ)
    if (!USE_MOCK) return rows;

    // ✅ โหมด mock: กรองในฝั่งหน้าเว็บเพื่อจำลองการทำงาน
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchStatus = statusTab === "ALL" ? true : r.status === statusTab;
      const matchEvent =
        eventFilterId == null ? true : r.event.id === eventFilterId;

      const hay = `${r.studentId} ${r.fullName} ${r.event.title}`.toLowerCase();
      const matchSearch = !q || hay.includes(q);

      return matchStatus && matchEvent && matchSearch;
    });
  }, [USE_MOCK, rows, search, statusTab, eventFilterId]);

  const totalPages = USE_MOCK
    ? Math.max(1, Math.ceil(derivedRows.length / limit))
    : data?.pagination?.totalPages || 1;

  const safePage = Math.min(Math.max(1, page), totalPages);

  // ✅ กัน “หน้า 3 / 1” ตอน filter แล้วจำนวนหน้าเหลือน้อยลง
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const pageRows = USE_MOCK
    ? derivedRows.slice((safePage - 1) * limit, safePage * limit)
    : rows;

  function setStatus(id: number, next: CancellationStatus) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: next } : r))
    );
  }

  async function runAction(a: PendingAction) {
    if (!a) return;
    setActing(true);
    try {
      // ✅ TODO: ยิง API จริง
      if (a.kind === "APPROVE_CANCEL") setStatus(a.id, "CANCELLED");
      if (a.kind === "REJECT_CANCEL") setStatus(a.id, "REJECTED");
      if (a.kind === "UNDO_CANCEL") setStatus(a.id, "PENDING");
      if (a.kind === "CONVERT_TO_APPROVE") setStatus(a.id, "CANCELLED");
    } finally {
      setActing(false);
      setPendingAction(null);
    }
  }

  // ✅ แท็บสถานะให้ “เลื่อนได้” บนอุปกรณ์อย่าง iPad (กันชน/บีบ)
  const StatusTabs = (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      <span className="text-sm text-slate-500 flex-none">สถานะ:</span>
      <div
        className={[
          "flex items-center gap-2",
          "overflow-x-auto whitespace-nowrap min-w-0",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        ].join(" ")}
      >
        {STATUS_TABS.map((t) => {
          const active = statusTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setStatusTab(t.key);
                setPage(1);
              }}
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

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* breadcrumb */}
        <div className="text-xs text-slate-500 mb-1">
          จัดการสตาฟ &gt;{" "}
          <span className="text-teal-700 font-medium">
            ตรวจสอบคำขอยกเลิกสตาฟ
          </span>
        </div>

        {/* title + event dropdown
            ✅ ใช้ lg เพื่อให้ iPad แนวนอนค่อยวางแถวเดียวกัน (กันแน่นตอนพื้นที่ content ถูก sidebar กิน) */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">
            ตรวจสอบคำขอยกเลิกสตาฟ
          </h1>

          <div className="w-full lg:w-[320px]">
            <div className="relative h-10">
              <select
                value={eventFilterId ?? ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setEventFilterId(v);
                  setPage(1);
                }}
                className="h-10 w-full appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-800 outline-none transition hover:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
              >
                <option value="">กิจกรรม: ทั้งหมด</option>
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

        {/* search + status row
            ✅ iPad แนวนอนให้จัดเป็นแถวเดียว (lg) แต่ยังเลื่อนได้ */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center mb-6">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาจาก ชื่อ,รหัสนักศึกษา"
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="min-w-0">{StatusTabs}</div>
        </div>

        {/* loading / error */}
        {!USE_MOCK && isLoading && (
          <div className="py-8 text-center text-sm text-slate-500">
            กำลังโหลดคำขอยกเลิกสตาฟ...
          </div>
        )}
        {!USE_MOCK && error && !isLoading && (
          <div className="py-8 text-center text-sm text-red-500">
            โหลดข้อมูลไม่สำเร็จ: {getErrorMessage(error)}
          </div>
        )}

        {/* ===== responsive list/table card ===== */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* ✅ iPad (รวมแนวนอน) ใช้ Card list: แสดงถึง <xl */}
          <div className="xl:hidden">
            <div className="divide-y divide-slate-100">
              {pageRows.map((r) => (
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

                    <span
                      className={[
                        "inline-flex flex-none items-center rounded-full border px-3 py-1 text-xs font-medium",
                        badgeStyle(r.status),
                      ].join(" ")}
                    >
                      {badgeText(r.status)}
                    </span>
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
                    <div className="text-xs text-slate-500 mt-2">
                      วันที่ยื่นคำขอ: {formatDateTimeTH(r.requestedAt)}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status === "PENDING" && (
                      <>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                          onClick={() =>
                            setPendingAction({
                              kind: "APPROVE_CANCEL",
                              id: r.id,
                              title: r.fullName,
                            })
                          }
                        >
                          <Check className="h-4 w-4" />
                          อนุมัติ
                        </button>

                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          onClick={() =>
                            setPendingAction({
                              kind: "REJECT_CANCEL",
                              id: r.id,
                              title: r.fullName,
                            })
                          }
                        >
                          <X className="h-4 w-4" />
                          ไม่อนุมัติ
                        </button>
                      </>
                    )}

                    {r.status === "CANCELLED" && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() =>
                          setPendingAction({
                            kind: "UNDO_CANCEL",
                            id: r.id,
                            title: r.fullName,
                          })
                        }
                      >
                        <RotateCcw className="h-4 w-4" />
                        ยกเลิกการสิ้นสุด
                      </button>
                    )}

                    {r.status === "REJECTED" && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                        onClick={() =>
                          setPendingAction({
                            kind: "CONVERT_TO_APPROVE",
                            id: r.id,
                            title: r.fullName,
                          })
                        }
                      >
                        <Check className="h-4 w-4" />
                        เปลี่ยนเป็นอนุมัติ
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {pageRows.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-500">
                  ไม่พบคำขอที่ตรงกับเงื่อนไขการค้นหา
                </div>
              )}
            </div>
          </div>

          {/* ✅ ตารางโชว์เฉพาะ xl+ (เดสก์ท็อป) */}
          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[980px]">
              <thead className="bg-slate-100">
                <tr className="text-xs text-slate-600 border-b border-slate-200">
                  <th className="text-left font-medium py-3 pr-4 pl-4">
                    รหัสนักศึกษา
                  </th>
                  <th className="text-left font-medium py-3 pr-4">
                    ชื่อ - นามสกุล
                  </th>
                  <th className="text-left font-medium py-3 pr-4">กิจกรรม</th>
                  <th className="text-left font-medium py-3 pr-4">
                    วันที่ยื่นคำขอ
                  </th>
                  <th className="text-left font-medium py-3 pr-4">สถานะ</th>
                  <th className="text-center font-medium py-3 pr-4">
                    การจัดการ
                  </th>
                </tr>
              </thead>

              <tbody>
                {pageRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="py-4 pr-4 pl-4 align-top whitespace-nowrap">
                      {r.studentId}
                    </td>

                    <td className="py-4 pr-4 align-top whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-800">
                        {r.fullName}
                      </div>
                    </td>

                    <td className="py-4 pr-4 align-top">
                      <div className="text-sm font-medium text-slate-800">
                        {r.event.title}
                      </div>
                      {r.event.dateRangeText && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {r.event.dateRangeText}
                        </div>
                      )}
                    </td>

                    <td className="py-4 pr-4 align-top whitespace-nowrap">
                      {formatDateTimeTH(r.requestedAt)}
                    </td>

                    <td className="py-4 pr-4 align-top whitespace-nowrap">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                          badgeStyle(r.status),
                        ].join(" ")}
                      >
                        {badgeText(r.status)}
                      </span>
                    </td>

                    <td className="py-4 pr-4 align-top">
                      <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                        {r.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                              onClick={() =>
                                setPendingAction({
                                  kind: "APPROVE_CANCEL",
                                  id: r.id,
                                  title: r.fullName,
                                })
                              }
                            >
                              <Check className="h-4 w-4" />
                              อนุมัติ
                            </button>

                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                              onClick={() =>
                                setPendingAction({
                                  kind: "REJECT_CANCEL",
                                  id: r.id,
                                  title: r.fullName,
                                })
                              }
                            >
                              <X className="h-4 w-4" />
                              ไม่อนุมัติ
                            </button>
                          </>
                        )}

                        {r.status === "CANCELLED" && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            onClick={() =>
                              setPendingAction({
                                kind: "UNDO_CANCEL",
                                id: r.id,
                                title: r.fullName,
                              })
                            }
                          >
                            <RotateCcw className="h-4 w-4" />
                            ยกเลิกการสิ้นสุด
                          </button>
                        )}

                        {r.status === "REJECTED" && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                            onClick={() =>
                              setPendingAction({
                                kind: "CONVERT_TO_APPROVE",
                                id: r.id,
                                title: r.fullName,
                              })
                            }
                          >
                            <Check className="h-4 w-4" />
                            เปลี่ยนเป็นอนุมัติ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {pageRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-sm text-slate-500"
                    >
                      ไม่พบคำขอที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* footer / pagination */}
          <div className="border-t border-slate-200 px-4 py-3">
            <div className="flex items-center justify-end gap-3 text-sm">
              <button
                type="button"
                className="px-3 py-1 rounded-full border border-slate-200 bg-white disabled:opacity-40"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ก่อนหน้า
              </button>

              <span className="text-slate-600">
                หน้า {safePage} / {totalPages}
              </span>

              <button
                type="button"
                className="px-3 py-1 rounded-full border border-slate-200 bg-white disabled:opacity-40"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>

        {/* confirm modal */}
        {pendingAction && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg max-h-[90vh] overflow-auto">
              <h2 className="mb-2 text-lg font-semibold text-slate-900 text-center">
                ยืนยันการดำเนินการ
              </h2>

              <p className="text-sm text-slate-600">
                {pendingAction.kind === "APPROVE_CANCEL" && (
                  <>
                    ต้องการ{" "}
                    <span className="font-medium text-slate-900">
                      อนุมัติการยกเลิกสตาฟ
                    </span>{" "}
                    ของ{" "}
                    <span className="font-medium text-slate-900">
                      {pendingAction.title}
                    </span>{" "}
                    ใช่ไหม?
                  </>
                )}
                {pendingAction.kind === "REJECT_CANCEL" && (
                  <>
                    ต้องการ{" "}
                    <span className="font-medium text-slate-900">
                      ไม่อนุมัติคำขอยกเลิก
                    </span>{" "}
                    ของ{" "}
                    <span className="font-medium text-slate-900">
                      {pendingAction.title}
                    </span>{" "}
                    ใช่ไหม?
                  </>
                )}
                {pendingAction.kind === "UNDO_CANCEL" && (
                  <>
                    ต้องการ{" "}
                    <span className="font-medium text-slate-900">
                      ยกเลิกการสิ้นสุด
                    </span>{" "}
                    สำหรับ{" "}
                    <span className="font-medium text-slate-900">
                      {pendingAction.title}
                    </span>{" "}
                    ใช่ไหม?
                  </>
                )}
                {pendingAction.kind === "CONVERT_TO_APPROVE" && (
                  <>
                    ต้องการ{" "}
                    <span className="font-medium text-slate-900">
                      เปลี่ยนเป็นอนุมัติ
                    </span>{" "}
                    สำหรับ{" "}
                    <span className="font-medium text-slate-900">
                      {pendingAction.title}
                    </span>{" "}
                    ใช่ไหม?
                  </>
                )}
              </p>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  disabled={acting}
                  onClick={() => setPendingAction(null)}
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  className={[
                    "rounded-xl px-3 py-1.5 text-sm text-white disabled:opacity-60",
                    pendingAction.kind === "REJECT_CANCEL"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-emerald-600 hover:bg-emerald-700",
                  ].join(" ")}
                  disabled={acting}
                  onClick={() => void runAction(pendingAction)}
                >
                  {acting ? "กำลังทำรายการ..." : "ยืนยัน"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
