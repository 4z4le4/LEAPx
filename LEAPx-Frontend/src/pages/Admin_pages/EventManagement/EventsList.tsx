import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  Plus,
  Users,
  Pencil,
  Trash2,
  IdCard,
  Footprints,
} from "lucide-react";
import useSWR from "swr";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { backend_url } from "../../../../utils/constants";
import CompactPagination from "../../../components/Pagination/CompactPagination";

/* ========= types จาก API ========= */

type EventStatus = "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";

type ApiPhoto = {
  id: number;
  isMain: boolean;
  sortOrder: number;
  cloudinaryImage: { url: string };
};

type ApiMajorCategory = {
  id: number;
  code: string;
  name_TH: string;
  name_EN: string;
  faculty_TH: string;
  faculty_EN: string;
  icon?: string | null;
};

type ApiEvent = {
  id: number;
  slug: string;
  title_TH: string;
  title_EN: string;
  majorCategory_id: number | null;
  majorCategory?: ApiMajorCategory | null;

  maxParticipants: number;
  currentParticipants: number;

  maxStaffCount: number;
  currentStaffCount: number;
  walkinCapacity: number;
  currentWalkins: number;

  registrationStart: string;
  registrationEnd: string;
  activityStart: string;
  activityEnd: string;
  status: EventStatus;
  photos: ApiPhoto[];
};

type EventsListApiResponse = {
  success: boolean;
  data: ApiEvent[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  userPermissions: {
    isSupreme: boolean;
    adminMajorIds: number[];
  };
};

/* ========= Major filter types ========= */

type MajorItem = {
  id: number;
  name_TH?: string;
  name_EN?: string;
  isActive?: boolean;
};

type MajorCheckRow = {
  id: number;
  role: "ADMIN" | "OWNER" | string;
  assignedAt?: string;
  majorCategory?: {
    id: number;
    code?: string;
    name_TH?: string;
    name_EN?: string;
    faculty_TH?: string;
    faculty_EN?: string;
    icon?: string;
  } | null;
};

type MajorCheckResponse = {
  success: boolean;
  userId: number;
  adminCount: number;
  data: MajorCheckRow[];
};

/* ========= type สำหรับใช้ในตาราง ========= */

type EventRow = {
  id: number;
  slug: string;
  title_TH: string;
  title_EN?: string | null;
  majorLabel?: string | null;
  majorCategory_id: number | null;

  maxParticipants: number;
  currentParticipants: number;

  maxStaffCount: number;
  currentStaffCount: number;
  walkinCapacity: number;
  currentWalkins: number;

  registrationStart: string;
  registrationEnd: string;
  activityStart: string;
  activityEnd: string;
  status: EventStatus;
  coverUrl?: string | null;
};

const fetcher = async (url: string): Promise<EventsListApiResponse> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to fetch events");
  }
  return res.json() as Promise<EventsListApiResponse>;
};

/* ========= helpers ========= */

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

const BKK_TZ = "Asia/Bangkok";

function toBangkokISO(isoLike: string) {
  const raw = String(isoLike ?? "").trim();
  if (!raw) return "";

  // เอา timezone ออก (Z หรือ +HH:MM / -HH:MM ท้ายสตริง)
  const withoutTz = raw.replace(/([Zz]|[+-]\d{2}:\d{2})$/, "");

  // ถ้ามีช่องว่างให้แทนเป็น T
  const normalized = withoutTz.includes("T")
    ? withoutTz
    : withoutTz.replace(" ", "T");

  // ถ้าเป็นแค่วันที่ (YYYY-MM-DD) เติมเวลา 00:00:00
  const hasTime = normalized.includes("T");
  const base = hasTime ? normalized : `${normalized}T00:00:00`;

  // บังคับให้เป็นเวลาไทย (+07:00)
  return `${base}+07:00`;
}

function parseBangkokWallTime(isoLike: string) {
  const bkkIso = toBangkokISO(isoLike);
  if (!bkkIso) return null;
  const d = new Date(bkkIso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateTH(dateStr: string) {
  try {
    const d = parseBangkokWallTime(dateStr);
    if (!d) return "-";
    return d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: BKK_TZ,
    });
  } catch {
    return "-";
  }
}

function formatCapacity(current: number, max: number) {
  if (max >= 1_000_000) return `${current.toLocaleString()}/ไม่จำกัด`;
  return `${current.toLocaleString()}/${max.toLocaleString()}`;
}

function thaiDateKeyFromISO(iso: string) {
  // คืนค่า "YYYY-MM-DD" ตามเวลาไทย (ไม่โดน shift ซ้ำ)
  const d = parseBangkokWallTime(iso);
  if (!d) return "";
  return d.toLocaleDateString("en-CA", { timeZone: BKK_TZ });
}

function inThaiDateRange(dateKey: string, startISO: string, endISO: string) {
  // เปลี่ยน "YYYY-MM-DD" ให้เป็นเวลาไทยเที่ยงคืน
  const target = new Date(`${dateKey}T00:00:00+07:00`).getTime();

  const startKey = thaiDateKeyFromISO(startISO);
  const endKey = thaiDateKeyFromISO(endISO);

  if (!startKey || !endKey) return false;

  const start = new Date(`${startKey}T00:00:00+07:00`).getTime();
  const end = new Date(`${endKey}T00:00:00+07:00`).getTime();
  return target >= start && target <= end;
}

function mapApiEvent(ev: ApiEvent): EventRow {
  const mainPhoto =
    ev.photos?.find((p) => p.isMain) ||
    ev.photos?.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0];

  const majorLabel = ev.majorCategory
    ? `${ev.majorCategory.name_TH || ev.majorCategory.name_EN} (${
        ev.majorCategory.code
      })`
    : ev.majorCategory_id
      ? `หมวดหมู่ #${ev.majorCategory_id}`
      : null;

  return {
    id: ev.id,
    slug: ev.slug,
    title_TH: ev.title_TH,
    title_EN: ev.title_EN,
    majorLabel,
    majorCategory_id: ev.majorCategory_id,

    maxParticipants: ev.maxParticipants,
    currentParticipants: ev.currentParticipants,

    maxStaffCount: ev.maxStaffCount,
    currentStaffCount: ev.currentStaffCount,
    walkinCapacity: ev.walkinCapacity,
    currentWalkins: ev.currentWalkins,

    registrationStart: ev.registrationStart,
    registrationEnd: ev.registrationEnd,
    activityStart: ev.activityStart,
    activityEnd: ev.activityEnd,
    status: ev.status,
    coverUrl: mainPhoto?.cloudinaryImage?.url ?? null,
  };
}

/* ========= component ========= */

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => {
          if (disabled) return;
          onChange(!checked);
        }}
        disabled={disabled}
        className={[
          "h-6 w-11 rounded-full p-0.5 transition",
          checked ? "bg-teal-500" : "bg-slate-300",
          disabled ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
      >
        <span
          className={[
            "block h-5 w-5 rounded-full bg-white shadow transition",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>

      <span
        className={[
          "mt-1 min-h-[16px] text-[11px] leading-4",
          label ? "text-slate-500" : "text-slate-500 opacity-0",
        ].join(" ")}
      >
        {label ?? "placeholder"}
      </span>
    </div>
  );
}

// --- helper: build querystring แบบปลอดภัย ---
function buildQuery(
  params: Record<string, string | number | null | undefined>,
) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    const s = String(v).trim();
    if (!s) return;
    sp.set(k, s);
  });
  return sp.toString();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function EventsList() {
  const navigate = useNavigate();

  const { user, loading: authLoading } = useAuth() as {
    user?: { role?: { name?: string } | string };
    loading?: boolean;
  };

  const roleName = useMemo(() => {
    const r = user?.role;
    if (!r) return "";
    if (typeof r === "string") return r.trim().toUpperCase();
    const obj = r as { name?: string };
    return (obj.name ?? "").trim().toUpperCase();
  }, [user]);

  const isSupreme = roleName === "SUPREME";
  const isActivityAdmin = /ACTIVITY[_\-\s]?ADMIN/.test(roleName);

  // ===== Major filter state =====
  const [majorFilter, setMajorFilter] = useState<string>("");
  const [majors, setMajors] = useState<MajorItem[]>([]);
  const [majorsLoading, setMajorsLoading] = useState(false);

  const [allowedMajorIds, setAllowedMajorIds] = useState<Set<number> | null>(
    null,
  );
  const [allowedLoading, setAllowedLoading] = useState(false);

  const showMajorSkeleton =
    authLoading ||
    (isActivityAdmin && (allowedMajorIds === null || allowedLoading)) ||
    majorsLoading;

  const [skeletonGone, setSkeletonGone] = useState(false);
  useEffect(() => {
    if (!showMajorSkeleton) {
      const t = setTimeout(() => setSkeletonGone(true), 220);
      return () => clearTimeout(t);
    }
  }, [showMajorSkeleton]);

  const majorsReady =
    roleName !== "" &&
    (!isActivityAdmin || allowedMajorIds !== null) &&
    !authLoading;

  useEffect(() => {
    if (authLoading) return;

    if (!isActivityAdmin) {
      setAllowedMajorIds(new Set());
      setAllowedLoading(false);
      return;
    }

    const ac = new AbortController();
    (async () => {
      try {
        setAllowedLoading(true);

        const res = await fetch(`${backend_url}/api/major/check`, {
          credentials: "include",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json: MajorCheckResponse =
          (await res.json()) as MajorCheckResponse;
        const ids = new Set<number>(
          (json?.data ?? [])
            .map((row) => row?.majorCategory?.id)
            .filter(
              (n): n is number => typeof n === "number" && Number.isFinite(n),
            ),
        );
        setAllowedMajorIds(ids);
      } catch (e) {
        if ((e as DOMException).name !== "AbortError") {
          console.error(`fetch ${backend_url}/api/major/check failed`, e);
          setAllowedMajorIds(new Set());
        }
      } finally {
        setAllowedLoading(false);
      }
    })();

    return () => ac.abort();
  }, [isActivityAdmin, authLoading]);

  useEffect(() => {
    if (!majorsReady) return;

    const ac = new AbortController();
    (async () => {
      try {
        setMajorsLoading(true);

        const url = isActivityAdmin
          ? `${backend_url}/api/major/category?scope=my`
          : `${backend_url}/api/major/category`;

        const res = await fetch(url, {
          credentials: "include",
          signal: ac.signal,
        });

        const json = (await res.json().catch(() => ({}))) as unknown;
        let rows: MajorItem[] =
          (((json as { data?: unknown })?.data ??
            (json as unknown)) as MajorItem[]) ?? [];

        rows = rows.filter((r) => r.isActive !== false);

        if (isSupreme) {
          // all
        } else if (isActivityAdmin) {
          rows = rows.filter((r) => allowedMajorIds?.has(r.id));
        } else {
          rows = [];
        }

        setMajors(rows);
      } catch (e) {
        if ((e as DOMException).name !== "AbortError") {
          console.error(`fetch ${backend_url}/api/major/category failed`, e);
          setMajors([]);
        }
      } finally {
        setMajorsLoading(false);
      }
    })();

    return () => ac.abort();
  }, [majorsReady, isSupreme, isActivityAdmin, allowedMajorIds]);

  // ===== paging & filters =====
  const [page, setPage] = useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);

  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    setPage(1);
  }, [majorFilter, search, dateFilter]);

  const majorId = majorFilter ? Number(majorFilter) : null;
  const safeMajorId = Number.isFinite(majorId) ? majorId : null;

  const hasSearch = search.trim().length > 0;
  const hasDate = Boolean(dateFilter);

  const useClientFilter = !hasSearch && (safeMajorId != null || hasDate);

  const listUrl = useMemo(() => {
    const effectivePage = useClientFilter ? 1 : page;
    const effectiveLimit = useClientFilter ? 1000 : limit;

    const qs = buildQuery({
      page: effectivePage,
      limit: effectiveLimit,
      search: search.trim() ? search.trim() : null,

      date: useClientFilter ? null : dateFilter || null,
    });

    return `${backend_url}/api/events?${qs}`;
  }, [page, limit, search, dateFilter, useClientFilter]);

  const {
    data: apiData,
    error,
    isValidating,
    mutate,
  } = useSWR<EventsListApiResponse>(listUrl, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30_000,
  });

  const isLoading = !apiData && isValidating;

  const allEventsFromApi: EventRow[] = useMemo(() => {
    return (apiData?.data ?? []).map(mapApiEvent);
  }, [apiData]);

  const filteredEvents: EventRow[] = useMemo(() => {
    if (!useClientFilter) return allEventsFromApi;

    return allEventsFromApi.filter((ev) => {
      const okMajor =
        safeMajorId == null ? true : ev.majorCategory_id === safeMajorId;

      const okDate = !hasDate
        ? true
        : inThaiDateRange(dateFilter, ev.activityStart, ev.activityEnd);

      return okMajor && okDate;
    });
  }, [allEventsFromApi, useClientFilter, safeMajorId, hasDate, dateFilter]);

  const totalPagesClient = useMemo(() => {
    if (!useClientFilter) return apiData?.pagination?.totalPages || 1;
    return Math.max(1, Math.ceil(filteredEvents.length / limit));
  }, [useClientFilter, apiData, filteredEvents.length, limit]);

  const currentPage = useMemo(() => {
    if (!useClientFilter) return apiData?.pagination?.page ?? page;
    return clamp(page, 1, totalPagesClient);
  }, [useClientFilter, apiData, page, totalPagesClient]);

  const events: EventRow[] = useMemo(() => {
    if (!useClientFilter) return filteredEvents;

    const start = (currentPage - 1) * limit;
    return filteredEvents.slice(start, start + limit);
  }, [useClientFilter, filteredEvents, currentPage, limit]);

  /* ===== actions ===== */

  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  async function patchEventStatus(eventId: number, visible: boolean) {
    const fd = new FormData();
    fd.append("event_id", String(eventId));
    fd.append("status", visible ? "PUBLISHED" : "DRAFT");

    const res = await fetch(`${backend_url}/api/events?id=${eventId}`, {
      method: "PUT",
      credentials: "include",
      body: fd,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Update status failed (${res.status})`);
    }
  }

  const toggleVisible = (id: number, nextVisible: boolean) => {
    if (statusUpdatingId !== null) return;

    void (async () => {
      setStatusUpdatingId(id);

      if (!apiData) {
        try {
          await patchEventStatus(id, nextVisible);
          await mutate();
        } catch (e) {
          console.error(e);
          alert("อัปเดตสถานะไม่สำเร็จ ลองใหม่อีกครั้ง");
        } finally {
          setStatusUpdatingId(null);
        }
        return;
      }

      const optimistic: EventsListApiResponse = {
        ...apiData,
        data: apiData.data.map((ev) =>
          ev.id === id
            ? { ...ev, status: nextVisible ? "PUBLISHED" : "DRAFT" }
            : ev,
        ),
      };

      try {
        await mutate(
          async (currentData) => {
            const base = currentData ?? apiData;

            await patchEventStatus(id, nextVisible);

            const updated: EventsListApiResponse = {
              ...base,
              data: base.data.map((ev) =>
                ev.id === id
                  ? { ...ev, status: nextVisible ? "PUBLISHED" : "DRAFT" }
                  : ev,
              ),
            };

            return updated;
          },
          {
            optimisticData: optimistic,
            rollbackOnError: true,
            revalidate: false,
            populateCache: true,
          },
        );
      } catch (e) {
        console.error(e);
        alert("อัปเดตสถานะไม่สำเร็จ ลองใหม่อีกครั้ง");
      } finally {
        setStatusUpdatingId(null);
      }
    })();
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingDeleteTitle, setPendingDeleteTitle] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  const deleteEvent = async (id: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`${backend_url}/api/events?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `DELETE failed with ${res.status}`);
      }

      await mutate();
    } catch (err) {
      console.error(err);
      alert("ลบกิจกรรมไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
      setPendingDeleteTitle("");
    }
  };

  return (
    <div className="w-full px-8 py-6">
      <div className="text-xs text-slate-500 mb-1">
        จัดการอีเว้นท์ &gt;{" "}
        <span className="text-teal-700 font-medium">กิจกรรมทั้งหมด</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          กิจกรรมทั้งหมด
        </h1>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          onClick={() => navigate("/admin/events/create")}
        >
          <Plus className="w-4 h-4" />
          สร้างกิจกรรม
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหารายชื่อกิจกรรม..."
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Major filter */}
        <div className="w-full lg:w-[260px]">
          <div className="relative h-10">
            <div
              aria-hidden={showMajorSkeleton ? true : undefined}
              className={[
                "absolute inset-0",
                showMajorSkeleton
                  ? "opacity-0 pointer-events-none"
                  : "opacity-100",
                "motion-reduce:transition-none motion-reduce:duration-0",
              ].join(" ")}
            >
              {isSupreme ? (
                <div className="relative h-10">
                  <select
                    value={majorFilter}
                    onChange={(e) => setMajorFilter(e.target.value)}
                    disabled={majorsLoading}
                    className="h-10 w-full appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-800 outline-none transition hover:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                  >
                    <option value="">หมวดหมู่สาขา: ทั้งหมด</option>
                    {majors.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        หมวดหมู่สาขา: {m.name_TH || m.name_EN || `#${m.id}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              ) : isActivityAdmin ? (
                majors.length <= 1 ? (
                  <div className="flex h-10 items-center rounded-full border bg-white border-slate-200 px-3 text-sm text-slate-700">
                    หมวดหมู่สาขา:{" "}
                    {majors[0]
                      ? majors[0].name_TH ||
                        majors[0].name_EN ||
                        `#${majors[0].id}`
                      : "สาขาที่คุณมีสิทธิ์"}
                  </div>
                ) : (
                  <div className="relative h-10">
                    <select
                      value={majorFilter}
                      onChange={(e) => setMajorFilter(e.target.value)}
                      disabled={majorsLoading}
                      className="h-10 w-full appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-800 outline-none transition hover:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
                    >
                      <option value="">
                        หมวดหมู่สาขา: ทุกสาขา (สิทธิ์ของคุณ)
                      </option>
                      {majors.map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          หมวดหมู่สาขา: {m.name_TH || m.name_EN || `#${m.id}`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                )
              ) : (
                <div className="flex h-10 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs text-slate-500">
                  ไม่สามารถค้นหาตามสาขาได้
                </div>
              )}
            </div>

            {!skeletonGone && (
              <div
                className={[
                  "absolute inset-0 rounded-full bg-slate-100 animate-pulse",
                  "transition-opacity duration-200",
                  showMajorSkeleton
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none",
                  "motion-reduce:transition-none motion-reduce:duration-0",
                ].join(" ")}
                aria-hidden
              />
            )}
          </div>
        </div>

        {/* Date filter */}
        <div className="w-full lg:w-[190px]">
          <div className="relative h-10">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 w-full rounded-full border border-slate-200 bg-white pl-4 pr-3 text-xs lg:text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
            />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="py-8 text-center text-sm text-slate-500">
          กำลังโหลดข้อมูลกิจกรรม...
        </div>
      )}
      {error && !isLoading && (
        <div className="py-8 text-center text-sm text-red-500">
          โหลดข้อมูลกิจกรรมไม่สำเร็จ:{" "}
          {String((error as Error).message || error)}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-200">
                  <th className="text-left font-medium py-3 pr-4">
                    รูปกิจกรรม
                  </th>
                  <th className="text-left font-medium py-3 pr-4">
                    ชื่อกิจกรรม
                  </th>
                  <th className="text-left font-medium py-3 pr-4">หมวดหมู่</th>
                  <th className="text-left font-medium py-3 pr-4">
                    วันเปิดลงทะเบียน
                  </th>
                  <th className="text-left font-medium py-3 pr-4">
                    วันจัดกิจกรรม
                  </th>
                  <th className="text-left font-medium py-3 pr-4">
                    จำนวนคนลงทะเบียน
                  </th>
                  <th className="text-center font-medium py-3 pr-4 w-[110px]">
                    แสดงผล
                  </th>
                  <th className="text-center font-medium py-3 pr-2">
                    การจัดการ
                  </th>
                </tr>
              </thead>

              <tbody>
                {events.map((ev) => {
                  const regStart = formatDateTH(ev.registrationStart);
                  const regEnd = formatDateTH(ev.registrationEnd);
                  const actStart = formatDateTH(ev.activityStart);
                  const actEnd = formatDateTH(ev.activityEnd);
                  const isVisible = ev.status === "PUBLISHED";
                  const isUpdating = statusUpdatingId === ev.id;

                  return (
                    <tr
                      key={ev.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="py-4 pr-4 align-top">
                        <div className="h-[80px] w-[80px] overflow-hidden rounded-md bg-slate-200">
                          {ev.coverUrl ? (
                            <img
                              src={ev.coverUrl}
                              alt={ev.title_TH}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-500">
                              ไม่มีรูปภาพ
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 pr-4 align-top">
                        <div className="text-sm font-medium text-slate-800">
                          {ev.title_TH}
                        </div>
                        {ev.title_EN && (
                          <div className="text-xs text-slate-500">
                            {ev.title_EN}
                          </div>
                        )}
                      </td>

                      <td className="py-4 pr-4 align-top">
                        <div className="text-sm text-slate-800">
                          {ev.majorLabel || "-"}
                        </div>
                      </td>

                      <td className="py-4 pr-4 align-top">
                        <div className="text-xs text-slate-500">เริ่ม :</div>
                        <div className="text-sm text-slate-800">{regStart}</div>
                        <div className="mt-1 text-xs text-slate-500">จบ :</div>
                        <div className="text-sm text-slate-800">{regEnd}</div>
                      </td>

                      <td className="py-4 pr-4 align-top">
                        <div className="text-xs text-slate-500">เริ่ม :</div>
                        <div className="text-sm text-slate-800">{actStart}</div>
                        <div className="mt-1 text-xs text-slate-500">จบ :</div>
                        <div className="text-sm text-slate-800">{actEnd}</div>
                      </td>

                      <td className="py-4 pr-4 align-top">
                        <div className="space-y-2 text-sm text-slate-800">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-slate-500" />
                            {formatCapacity(
                              ev.currentParticipants,
                              ev.maxParticipants,
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <IdCard className="w-4 h-4 text-slate-500" />
                            {formatCapacity(
                              ev.currentStaffCount,
                              ev.maxStaffCount,
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Footprints className="w-4 h-4 text-slate-500" />
                            {formatCapacity(
                              ev.currentWalkins,
                              ev.walkinCapacity,
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 pr-4 align-top text-center w-[110px]">
                        <div className="flex justify-center">
                          <Toggle
                            checked={isVisible}
                            onChange={(v) => toggleVisible(ev.id, v)}
                            disabled={isUpdating}
                            label={isUpdating ? "กำลังอัปเดต..." : undefined}
                          />
                        </div>
                      </td>

                      <td className="py-4 pr-2 align-top">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            className="p-1.5 rounded-full hover:bg-slate-100"
                            onClick={() =>
                              navigate(`/admin/events/edit/${ev.slug}`)
                            }
                          >
                            <Pencil className="w-4 h-4 text-slate-500" />
                          </button>

                          <button
                            type="button"
                            className="p-1.5 rounded-full hover:bg-slate-100"
                            onClick={() => {
                              setPendingDeleteId(ev.id);
                              setPendingDeleteTitle(
                                ev.title_TH || ev.title_EN || `#${ev.id}`,
                              );
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {events.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-sm text-slate-500"
                    >
                      ไม่พบกิจกรรมที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center justify-end">
            <CompactPagination
              currentPage={currentPage}
              totalPages={totalPagesClient}
              onChange={(p) => setPage(p)}
              siblingCount={2}
              boundaryCount={1}
            />
          </div>

          {pendingDeleteId !== null && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
              <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
                <h2 className="mb-2 text-lg font-semibold text-slate-900 text-center">
                  ยืนยันการลบกิจกรรม
                </h2>
                <p className="text-sm text-slate-600">
                  ต้องการลบกิจกรรม{" "}
                  <span className="font-medium text-slate-900">
                    {pendingDeleteTitle}
                  </span>{" "}
                  ใช่ไหม? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                </p>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    disabled={deleting}
                    onClick={() => {
                      if (deleting) return;
                      setPendingDeleteId(null);
                      setPendingDeleteTitle("");
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60"
                    disabled={deleting}
                    onClick={() => {
                      if (pendingDeleteId != null) {
                        void deleteEvent(pendingDeleteId);
                      }
                    }}
                  >
                    {deleting ? "กำลังลบ..." : "ลบกิจกรรม"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
