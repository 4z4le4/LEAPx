// src/pages/Admin_pages/StaffManagement/StaffAccept.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  Check,
  X,
  Users,
  AlertTriangle,
  Info,
} from "lucide-react";
import useSWR from "swr";
import { backend_url } from "../../../../utils/constants";

/* ===================== types ===================== */

type StaffRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
type StatusTabKey = "ALL" | StaffRequestStatus;

type ApiEventMajorCategory = {
  id: number;
  code: string;
  name_TH: string;
  name_EN: string;
  icon?: string | null;
};

type ApiEventSummaryItem = {
  event_id: number;
  event: {
    id: number;
    slug: string;
    title_EN: string;
    title_TH: string;
    activityStart: string;
    activityEnd: string;
    maxStaffCount: number;
    currentStaffCount: number;
    status: string;
    majorCategory?: ApiEventMajorCategory | null;
  };
  pendingStaffCount: number;
  availableSlots: number;
  isFull: boolean;
};

type ApiPendingStaffItem = {
  staffId: number;
  userId: number;
  userName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;

  eventId: number;
  eventSlug: string;
  eventTitle_TH: string;
  eventTitle_EN: string;
  eventActivityStart: string;
  eventActivityEnd: string;
  eventStatus: string;

  registrationStatus: StaffRequestStatus;
  appliedAt: string;

  canApprove: boolean;
};

type StaffDailyResponse = {
  success: boolean;
  data: {
    eventSummary: ApiEventSummaryItem[];
    pendingStaff: ApiPendingStaffItem[];
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters?: {
    search: string | null;
    sortBy: string;
    sortOrder: "asc" | "desc";
    status: StaffRequestStatus | null;
    eventId: number | null;
  };
  permissions?: {
    isSupreme: boolean;
    adminMajorIds: number[];
  };
};

type UiRow = {
  id: number; // staffId
  studentId: string; // userId -> string
  fullName: string;
  event: {
    id: number;
    title: string;
    dateRangeText?: string;
  };
  registeredAt: string; // appliedAt
  status: StaffRequestStatus; // registrationStatus
  canApprove: boolean;
};

/* ===================== constants ===================== */

const API_BASE = String(backend_url ?? "").replace(/\/$/, "");
const STAFF_PATH = "/api/daily/event/staff"; // ✅ GET/POST ใช้ path เดียวกัน

const STATUS_TABS: Array<{ key: StatusTabKey; label: string }> = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "PENDING", label: "รอการอนุมัติ" },
  { key: "APPROVED", label: "อนุมัติเป็นสตาฟแล้ว" },
  { key: "REJECTED", label: "ไม่อนุมัติคำขอเป็นสตาฟ" },
];

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

function formatEventRangeTH(startIso: string, endIso: string) {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);

    const sDate = s.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const eDate = e.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const sTime = s.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const eTime = e.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (sDate === eDate) return `${sDate}, ${sTime} - ${eTime}`;
    return `${sDate} - ${eDate}, ${sTime} - ${eTime}`;
  } catch {
    return "-";
  }
}

function badgeStyle(status: StaffRequestStatus) {
  if (status === "PENDING")
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "APPROVED")
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

function badgeText(status: StaffRequestStatus) {
  if (status === "PENDING") return "รอการอนุมัติ";
  if (status === "APPROVED") return "อนุมัติเป็นสตาฟแล้ว";
  return "ไม่อนุมัติคำขอเป็นสตาฟ";
}

/* ===================== api ===================== */

async function postStaffAction(body: {
  action: "approve" | "reject" | "approve_all" | "reject_all";
  eventId?: number;
  staffIds?: number[];
  reason: string;
}) {
  const url = `${API_BASE}${STAFF_PATH}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Action failed");
  }

  return res.json().catch(() => ({}));
}

/* ===================== component ===================== */

type PendingAction =
  | { kind: "APPROVE"; staffId: number; title: string; eventId: number }
  | { kind: "REJECT"; staffId: number; title: string; eventId: number }
  | {
      kind: "APPROVE_ALL_EVENT";
      eventId: number;
      eventTitle: string;
      count: number;
    }
  | {
      kind: "REJECT_ALL_EVENT";
      eventId: number;
      eventTitle: string;
      count: number;
    }
  | { kind: "APPROVE_ALL_MY_EVENTS"; count: number }
  | { kind: "REJECT_ALL_MY_EVENTS"; count: number }
  | null;

export default function StaffAccept() {
  const [page, setPage] = useState(1);
  const baseLimit = 12;

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTabKey>("PENDING");
  const [eventFilterId, setEventFilterId] = useState<number | null>(null);

  // ✅ reason สำหรับ action ทั้งหน้า
  const [reason, setReason] = useState("ยืนยันโดยแอดมินกิจกรรม");

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [acting, setActing] = useState(false);

  // ✅ ถ้า backend กรอง eventId แล้ว 500 ให้ fallback ไปกรองใน FE
  const [serverEventFilterBroken, setServerEventFilterBroken] = useState(false);

  // รีเซ็ต fallback เมื่อเปลี่ยนกิจกรรม
  useEffect(() => {
    setServerEventFilterBroken(false);
  }, [eventFilterId]);

  // ถ้า fallback เปิดอยู่ ดึงเยอะ ๆ หน้าเดียวแล้วกรองเอง
  const limit = serverEventFilterBroken ? 200 : baseLimit;

  // เวลา fallback เปิดอยู่ ให้บังคับ page=1
  useEffect(() => {
    if (serverEventFilterBroken && page !== 1) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverEventFilterBroken]);

  const apiKey = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(serverEventFilterBroken ? 1 : page));
    params.set("limit", String(limit));

    const q = search.trim();
    if (q) params.set("search", q);

    if (statusTab !== "ALL") params.set("status", statusTab);

    // ✅ ถ้าไม่ fallback ให้ลองส่งทั้ง eventId และ event_id (กันชื่อ param ไม่ตรง)
    if (!serverEventFilterBroken && eventFilterId != null) {
      params.set("eventId", String(eventFilterId));
      params.set("event_id", String(eventFilterId));
    }

    params.set("sortBy", "createdAt");
    params.set("sortOrder", "desc");

    return `${API_BASE}${STAFF_PATH}?${params.toString()}`;
  }, [page, limit, search, statusTab, eventFilterId, serverEventFilterBroken]);

  const fetcher = async (url: string): Promise<StaffDailyResponse> => {
    const res = await fetch(url, { credentials: "include" });
    if (res.ok) return (await res.json()) as StaffDailyResponse;

    // ===== ถ้า 500 ตอนมี eventId/event_id -> fallback อัตโนมัติ =====
    const status = res.status;
    const text = await res.text().catch(() => "");
    const hasEventParam = url.includes("eventId=") || url.includes("event_id=");

    if (status >= 500 && hasEventParam) {
      setServerEventFilterBroken(true);

      const u = new URL(url);
      u.searchParams.delete("eventId");
      u.searchParams.delete("event_id");
      u.searchParams.set("page", "1");
      u.searchParams.set("limit", "200");

      const res2 = await fetch(u.toString(), { credentials: "include" });
      if (!res2.ok) {
        const t2 = await res2.text().catch(() => "");
        throw new Error(t2 || text || "Failed to fetch (fallback)");
      }
      return (await res2.json()) as StaffDailyResponse;
    }

    throw new Error(text || `Failed to fetch staff requests (${status})`);
  };

  const { data, error, isLoading, mutate } = useSWR<StaffDailyResponse>(
    apiKey,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      shouldRetryOnError: false, // ✅ กันยิงซ้ำรัว ๆ เวลา backend 500
    }
  );

  const events = useMemo(() => {
    const list = data?.data?.eventSummary ?? [];
    return list.map((x) => ({
      id: x.event.id,
      title: x.event.title_TH || x.event.title_EN || "-",
      pendingStaffCount: x.pendingStaffCount ?? 0,
    }));
  }, [data]);

  const rawRows: UiRow[] = useMemo(() => {
    const items = data?.data?.pendingStaff ?? [];
    return items.map((it) => {
      const fullName =
        (it.userName && it.userName.trim()) ||
        `${it.firstName ?? ""} ${it.lastName ?? ""}`.trim() ||
        "-";

      const title = it.eventTitle_TH || it.eventTitle_EN || "-";

      return {
        id: it.staffId,
        studentId: String(it.userId),
        fullName,
        event: {
          id: it.eventId,
          title,
          dateRangeText: formatEventRangeTH(
            it.eventActivityStart,
            it.eventActivityEnd
          ),
        },
        registeredAt: it.appliedAt,
        status: it.registrationStatus,
        canApprove: Boolean(it.canApprove),
      };
    });
  }, [data]);

  // ✅ ถ้า fallback เปิดอยู่ แล้ว user เลือก event -> กรองใน FE
  const rows: UiRow[] = useMemo(() => {
    if (!serverEventFilterBroken) return rawRows;
    if (eventFilterId == null) return rawRows;
    return rawRows.filter((r) => r.event.id === eventFilterId);
  }, [rawRows, eventFilterId, serverEventFilterBroken]);

  const totalPages = serverEventFilterBroken
    ? 1
    : data?.pagination?.totalPages || 1;

  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  // ===== counts สำหรับ bulk =====
  const pendingAll = useMemo(() => {
    // นับจาก summary ของ server จะตรงกว่า rows (เพราะ rows อาจถูกจำกัดด้วย pagination)
    if (statusTab !== "PENDING" && statusTab !== "ALL") return 0;
    return events.reduce((sum, ev) => sum + (ev.pendingStaffCount || 0), 0);
  }, [events, statusTab]);

  const pendingInSelectedEvent = useMemo(() => {
    if (statusTab !== "PENDING" && statusTab !== "ALL") return 0;
    if (eventFilterId == null) return 0;

    // ถ้า fallback เปิดอยู่ ใช้ count จาก rows ที่กรองแล้ว
    if (serverEventFilterBroken) {
      return rows.filter((r) => r.status === "PENDING").length;
    }

    return events.find((e) => e.id === eventFilterId)?.pendingStaffCount ?? 0;
  }, [events, eventFilterId, statusTab, serverEventFilterBroken, rows]);

  async function runApiAction(args: {
    action: "approve" | "reject" | "approve_all" | "reject_all";
    eventId?: number;
    staffIds?: number[];
    reason: string;
  }) {
    await postStaffAction(args);
    await mutate();
  }

  async function runAction(a: PendingAction) {
    if (!a) return;
    setActing(true);
    try {
      if (a.kind === "APPROVE") {
        await runApiAction({
          action: "approve",
          eventId: a.eventId,
          staffIds: [a.staffId],
          reason,
        });
      }

      if (a.kind === "REJECT") {
        await runApiAction({
          action: "reject",
          eventId: a.eventId,
          staffIds: [a.staffId],
          reason,
        });
      }

      // ✅ อนุมัติ/ปฏิเสธ “ทั้งหมดในอีเวนท์นั้น” (ไม่ส่ง staffIds)
      if (a.kind === "APPROVE_ALL_EVENT") {
        await runApiAction({
          action: "approve",
          eventId: a.eventId,
          reason,
        });
      }

      if (a.kind === "REJECT_ALL_EVENT") {
        await runApiAction({
          action: "reject",
          eventId: a.eventId,
          reason,
        });
      }

      // ✅ อนุมัติ/ปฏิเสธ “ทั้งหมดในทุกอีเวนท์ที่ดูแล”
      if (a.kind === "APPROVE_ALL_MY_EVENTS") {
        await runApiAction({
          action: "approve_all",
          reason,
        });
      }

      if (a.kind === "REJECT_ALL_MY_EVENTS") {
        await runApiAction({
          action: "reject_all",
          reason,
        });
      }
    } finally {
      setActing(false);
      setPendingAction(null);
    }
  }

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

  // ✅ ปุ่ม bulk แบบใหม่: ไม่ใช้ rounded-full และจัดเป็น grid แยกแถว
  const BulkActionButtonBase =
    "w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium leading-tight transition disabled:opacity-50";

  const BulkActionsBar = (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 mb-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900">
              ดำเนินการแบบรวดเร็ว
            </div>
            <div className="text-xs text-slate-600 mt-1">
              {eventFilterId != null ? (
                <>
                  อีเวนท์ที่เลือกมีคำขอ{" "}
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {pendingInSelectedEvent}
                  </span>{" "}
                  รายการที่รออนุมัติ
                </>
              ) : (
                <>
                  ทั้งหมดมีคำขอ{" "}
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {pendingAll}
                  </span>{" "}
                  รายการที่รออนุมัติ
                </>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500">
            * แนะนำให้เลือกกิจกรรมก่อน หากต้องการ “อนุมัติทั้งหมดในอีเวนท์นี้”
          </div>
        </div>

        <div className="w-full">
          <label className="text-xs text-slate-500">เหตุผล</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="เช่น ยืนยันโดยแอดมินกิจกรรม"
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
          />
        </div>

        {/* แถวล่าง: ปุ่ม แยกเป็น grid (ไม่อัดกัน) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          <button
            type="button"
            className={[
              BulkActionButtonBase,
              "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700",
            ].join(" ")}
            disabled={
              acting ||
              eventFilterId == null ||
              pendingInSelectedEvent === 0 ||
              !reason.trim()
            }
            onClick={() => {
              if (eventFilterId == null) return;
              const eventTitle =
                events.find((e) => e.id === eventFilterId)?.title || "กิจกรรม";
              setPendingAction({
                kind: "APPROVE_ALL_EVENT",
                eventId: eventFilterId,
                eventTitle,
                count: pendingInSelectedEvent,
              });
            }}
            title={
              eventFilterId == null
                ? "กรุณาเลือกกิจกรรมก่อน"
                : pendingInSelectedEvent === 0
                ? "ไม่มีรายการรออนุมัติในกิจกรรมนี้"
                : !reason.trim()
                ? "กรุณากรอกเหตุผล"
                : "อนุมัติทุกคนในกิจกรรมนี้"
            }
          >
            <Users className="h-4 w-4" />
            อนุมัติทั้งหมด (อีเวนท์นี้)
          </button>

          <button
            type="button"
            className={[
              BulkActionButtonBase,
              "bg-white text-rose-700 border-slate-200 hover:bg-rose-50",
            ].join(" ")}
            disabled={
              acting ||
              eventFilterId == null ||
              pendingInSelectedEvent === 0 ||
              !reason.trim()
            }
            onClick={() => {
              if (eventFilterId == null) return;
              const eventTitle =
                events.find((e) => e.id === eventFilterId)?.title || "กิจกรรม";
              setPendingAction({
                kind: "REJECT_ALL_EVENT",
                eventId: eventFilterId,
                eventTitle,
                count: pendingInSelectedEvent,
              });
            }}
            title={
              eventFilterId == null
                ? "กรุณาเลือกกิจกรรมก่อน"
                : pendingInSelectedEvent === 0
                ? "ไม่มีรายการรออนุมัติในกิจกรรมนี้"
                : !reason.trim()
                ? "กรุณากรอกเหตุผล"
                : "ปฏิเสธทุกคนในกิจกรรมนี้"
            }
          >
            <X className="h-4 w-4" />
            ปฏิเสธทั้งหมด (อีเวนท์นี้)
          </button>

          <button
            type="button"
            className={[
              BulkActionButtonBase,
              "bg-white text-emerald-700 border-slate-200 hover:bg-emerald-50",
            ].join(" ")}
            disabled={acting || pendingAll === 0 || !reason.trim()}
            onClick={() =>
              setPendingAction({
                kind: "APPROVE_ALL_MY_EVENTS",
                count: pendingAll,
              })
            }
            title={
              !reason.trim()
                ? "กรุณากรอกเหตุผล"
                : "อนุมัติทุกคำขอที่รออนุมัติในทุกอีเวนท์ที่คุณดูแล"
            }
          >
            <Check className="h-4 w-4" />
            อนุมัติทั้งหมด (ทุกอีเวนท์ที่ดูแล)
          </button>

          <button
            type="button"
            className={[
              BulkActionButtonBase,
              "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            ].join(" ")}
            disabled={acting || pendingAll === 0 || !reason.trim()}
            onClick={() =>
              setPendingAction({
                kind: "REJECT_ALL_MY_EVENTS",
                count: pendingAll,
              })
            }
            title={
              !reason.trim()
                ? "กรุณากรอกเหตุผล"
                : "ปฏิเสธทุกคำขอที่รออนุมัติในทุกอีเวนท์ที่คุณดูแล"
            }
          >
            <AlertTriangle className="h-4 w-4" />
            ปฏิเสธทั้งหมด (ทุกอีเวนท์ที่ดูแล)
          </button>
        </div>

        {serverEventFilterBroken && eventFilterId != null && (
          <div className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5" />
            <div className="min-w-0">
              ระบบกรองตามกิจกรรมจากฝั่งเซิร์ฟเวอร์มีปัญหา (ตอบ 500) —
              หน้านี้จึงใช้การกรองในฝั่งเว็บชั่วคราวให้ก่อน
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-xs text-slate-500 mb-1">
          จัดการสตาฟ &gt;{" "}
          <span className="text-teal-700 font-medium">
            ตรวจสอบคำขอสมัครสตาฟ
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <h1 className="text-2xl font-semibold text-slate-800">
            ตรวจสอบคำขอสมัครสตาฟ
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

        {BulkActionsBar}

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

        {isLoading && (
          <div className="py-8 text-center text-sm text-slate-500">
            กำลังโหลดคำขอสมัครสตาฟ...
          </div>
        )}
        {error && !isLoading && (
          <div className="py-8 text-center text-sm text-red-500">
            โหลดข้อมูลไม่สำเร็จ: {getErrorMessage(error)}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* iPad / mobile */}
          <div className="xl:hidden">
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
                      วันที่ลงทะเบียน: {formatDateTimeTH(r.registeredAt)}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status === "PENDING" && r.canApprove && (
                      <>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                          disabled={acting || !reason.trim()}
                          onClick={() =>
                            setPendingAction({
                              kind: "APPROVE",
                              staffId: r.id,
                              title: r.fullName,
                              eventId: r.event.id,
                            })
                          }
                        >
                          <Check className="h-4 w-4" />
                          อนุมัติ
                        </button>

                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                          disabled={acting || !reason.trim()}
                          onClick={() =>
                            setPendingAction({
                              kind: "REJECT",
                              staffId: r.id,
                              title: r.fullName,
                              eventId: r.event.id,
                            })
                          }
                        >
                          <X className="h-4 w-4" />
                          ไม่อนุมัติ
                        </button>
                      </>
                    )}

                    {r.status === "REJECTED" && r.canApprove && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                        disabled={acting || !reason.trim()}
                        onClick={() =>
                          setPendingAction({
                            kind: "APPROVE",
                            staffId: r.id,
                            title: r.fullName,
                            eventId: r.event.id,
                          })
                        }
                      >
                        <Check className="h-4 w-4" />
                        เปลี่ยนเป็นอนุมัติ
                      </button>
                    )}

                    {r.status === "APPROVED" && (
                      <div className="text-xs text-slate-500">
                        * อนุมัติแล้ว
                      </div>
                    )}

                    {!r.canApprove && (
                      <div className="text-xs text-slate-500">
                        * ไม่มีสิทธิ์อนุมัติรายการนี้
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {rows.length === 0 && !isLoading && (
                <div className="py-10 text-center text-sm text-slate-500">
                  ไม่พบคำขอที่ตรงกับเงื่อนไขการค้นหา
                </div>
              )}
            </div>
          </div>

          {/* desktop */}
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
                    วันที่ลงทะเบียน
                  </th>
                  <th className="text-left font-medium py-3 pr-4">
                    สถานะลงทะเบียน
                  </th>
                  <th className="text-center font-medium py-3 pr-4">
                    การจัดการ
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
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
                      {formatDateTimeTH(r.registeredAt)}
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
                        {r.status === "PENDING" && r.canApprove && (
                          <>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                              disabled={acting || !reason.trim()}
                              onClick={() =>
                                setPendingAction({
                                  kind: "APPROVE",
                                  staffId: r.id,
                                  title: r.fullName,
                                  eventId: r.event.id,
                                })
                              }
                            >
                              <Check className="h-4 w-4" />
                              อนุมัติ
                            </button>

                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                              disabled={acting || !reason.trim()}
                              onClick={() =>
                                setPendingAction({
                                  kind: "REJECT",
                                  staffId: r.id,
                                  title: r.fullName,
                                  eventId: r.event.id,
                                })
                              }
                            >
                              <X className="h-4 w-4" />
                              ไม่อนุมัติ
                            </button>
                          </>
                        )}

                        {r.status === "REJECTED" && r.canApprove && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                            disabled={acting || !reason.trim()}
                            onClick={() =>
                              setPendingAction({
                                kind: "APPROVE",
                                staffId: r.id,
                                title: r.fullName,
                                eventId: r.event.id,
                              })
                            }
                          >
                            <Check className="h-4 w-4" />
                            เปลี่ยนเป็นอนุมัติ
                          </button>
                        )}

                        {r.status === "APPROVED" && (
                          <div className="text-xs text-slate-500">
                            * อนุมัติแล้ว
                          </div>
                        )}

                        {!r.canApprove && (
                          <div className="text-xs text-slate-500">
                            * ไม่มีสิทธิ์
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && !isLoading && (
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
                disabled={safePage <= 1 || isLoading || serverEventFilterBroken}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title={
                  serverEventFilterBroken
                    ? "โหมด fallback ใช้หน้าเดียว"
                    : undefined
                }
              >
                ก่อนหน้า
              </button>

              <span className="text-slate-600">
                หน้า {safePage} / {totalPages}
              </span>

              <button
                type="button"
                className="px-3 py-1 rounded-full border border-slate-200 bg-white disabled:opacity-40"
                disabled={
                  safePage >= totalPages || isLoading || serverEventFilterBroken
                }
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title={
                  serverEventFilterBroken
                    ? "โหมด fallback ใช้หน้าเดียว"
                    : undefined
                }
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
                {pendingAction.kind === "APPROVE" && (
                  <>
                    ต้องการ{" "}
                    <span className="font-medium text-slate-900">อนุมัติ</span>{" "}
                    คำขอของ{" "}
                    <span className="font-medium text-slate-900">
                      {pendingAction.title}
                    </span>{" "}
                    ใช่ไหม?
                  </>
                )}

                {pendingAction.kind === "REJECT" && (
                  <>
                    ต้องการ{" "}
                    <span className="font-medium text-slate-900">
                      ไม่อนุมัติ
                    </span>{" "}
                    คำขอของ{" "}
                    <span className="font-medium text-slate-900">
                      {pendingAction.title}
                    </span>{" "}
                    ใช่ไหม?
                  </>
                )}

                {pendingAction.kind === "APPROVE_ALL_EVENT" && (
                  <>
                    ต้องการ{" "}
                    <span className="font-medium text-slate-900">
                      อนุมัติทั้งหมด
                    </span>{" "}
                    ในกิจกรรม{" "}
                    <span className="font-medium text-slate-900">
                      {pendingAction.eventTitle}
                    </span>{" "}
                    จำนวน{" "}
                    <span className="font-medium text-slate-900 tabular-nums">
                      {pendingAction.count}
                    </span>{" "}
                    คน ใช่ไหม?
                  </>
                )}

                {pendingAction.kind === "REJECT_ALL_EVENT" && (
                  <>
                    ต้องการ{" "}
                    <span className="font-medium text-slate-900">
                      ปฏิเสธทั้งหมด
                    </span>{" "}
                    ในกิจกรรม{" "}
                    <span className="font-medium text-slate-900">
                      {pendingAction.eventTitle}
                    </span>{" "}
                    จำนวน{" "}
                    <span className="font-medium text-slate-900 tabular-nums">
                      {pendingAction.count}
                    </span>{" "}
                    คน ใช่ไหม?
                  </>
                )}

                {pendingAction.kind === "APPROVE_ALL_MY_EVENTS" && (
                  <>
                    ต้องการ{" "}
                    <span className="font-medium text-slate-900">
                      อนุมัติทั้งหมด
                    </span>{" "}
                    ในทุกอีเวนท์ที่คุณดูแล (รวม{" "}
                    <span className="font-medium text-slate-900 tabular-nums">
                      {pendingAction.count}
                    </span>{" "}
                    คำขอที่รออนุมัติ) ใช่ไหม?
                  </>
                )}

                {pendingAction.kind === "REJECT_ALL_MY_EVENTS" && (
                  <>
                    ต้องการ{" "}
                    <span className="font-medium text-slate-900">
                      ปฏิเสธทั้งหมด
                    </span>{" "}
                    ในทุกอีเวนท์ที่คุณดูแล (รวม{" "}
                    <span className="font-medium text-slate-900 tabular-nums">
                      {pendingAction.count}
                    </span>{" "}
                    คำขอที่รออนุมัติ) ใช่ไหม?
                  </>
                )}
              </p>

              <div className="mt-2 text-xs text-slate-500">
                เหตุผลที่ส่ง:{" "}
                <span className="font-medium text-slate-700">
                  {reason || "-"}
                </span>
              </div>

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
                    pendingAction.kind === "REJECT" ||
                    pendingAction.kind === "REJECT_ALL_EVENT" ||
                    pendingAction.kind === "REJECT_ALL_MY_EVENTS"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-emerald-600 hover:bg-emerald-700",
                  ].join(" ")}
                  disabled={acting || !reason.trim()}
                  onClick={() => void runAction(pendingAction)}
                  title={!reason.trim() ? "กรุณากรอกเหตุผล" : undefined}
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
