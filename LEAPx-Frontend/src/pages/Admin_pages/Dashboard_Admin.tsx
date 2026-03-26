// src/pages/Admin_pages/Dashboard_Admin.tsx
import { useMemo } from "react";
import useSWR from "swr";
import {
  CalendarClock,
  Users,
  IdCard,
  Footprints,
  ChevronRight,
} from "lucide-react";

import { backend_url } from "../../../utils/constants";
import { formatDateTimeRange } from "../../../utils/dateTime";

/* ===================== types ===================== */
type EventStatus = "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED" | string;

type ApiMajorCategory = {
  id: number;
  code?: string | null;
  name_TH?: string | null;
  name_EN?: string | null;
  faculty_TH?: string | null;
  faculty_EN?: string | null;
  icon?: string | null;
};

type ApiEvent = {
  id: number;
  majorCategory_id?: number | null;

  title_TH: string;
  title_EN: string;

  status: EventStatus;

  registrationStart?: string | null;
  registrationEnd?: string | null;
  activityStart?: string | null;
  activityEnd?: string | null;

  maxParticipants?: number | null;
  currentParticipants?: number | null;

  maxStaffCount?: number | null;
  currentStaffCount?: number | null;

  walkinCapacity?: number | null;
  currentWalkins?: number | null;

  majorCategory?: ApiMajorCategory | null;
};

type ApiEventsResponse = {
  success: boolean;
  data: ApiEvent[];
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  userPermissions?: {
    isSupreme?: boolean;
    adminMajorIds?: number[];
  };
  error?: string;
  message?: string;
};

/* ===================== fetcher ===================== */
const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch events");
  return (await res.json()) as ApiEventsResponse;
};

/* ===================== helpers ===================== */

function safeDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(+d) ? null : d;
}

function clampNonNeg(n?: number | null): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.max(0, v);
}

function formatCapacity(current?: number | null, max?: number | null) {
  const c = clampNonNeg(current);
  const m = clampNonNeg(max);

  if (!m || m >= 1000000) {
    return `${c}/ไม่จำกัด`;
  }

  return `${c}/${m}`;
}

function inRange(now: Date, start?: string | null, end?: string | null) {
  const s = safeDate(start);
  const e = safeDate(end);
  if (!s || !e) return false;
  return now >= s && now <= e;
}

function isFuture(now: Date, iso?: string | null) {
  const d = safeDate(iso);
  if (!d) return false;
  return d.getTime() > now.getTime();
}

function sortAsc(a?: string | null, b?: string | null) {
  const da = safeDate(a)?.getTime() ?? Number.POSITIVE_INFINITY;
  const db = safeDate(b)?.getTime() ?? Number.POSITIVE_INFINITY;
  return da - db;
}

function sortDesc(a?: string | null, b?: string | null) {
  const da = safeDate(a)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const db = safeDate(b)?.getTime() ?? Number.NEGATIVE_INFINITY;
  return db - da;
}

function pct(current?: number | null, max?: number | null) {
  const c = clampNonNeg(current);
  const m = clampNonNeg(max);
  if (m <= 0) return 0;
  const v = Math.round((c / m) * 100);
  return Math.max(0, Math.min(100, v));
}

/* ===================== UI Components ===================== */

type StatCardProps = {
  title: string;
  value: number;
};

function StatCell({ title, value }: StatCardProps) {
  return (
    <div className="flex-1 px-8 py-6 text-center">
      <div className="text-[15px] text-sky-700 font-medium">{title}</div>
      <div className="mt-3 text-[34px] leading-none font-semibold text-sky-500 tracking-wide">
        {value.toLocaleString("th-TH")}
      </div>
    </div>
  );
}

function MetricChip({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-400/80 px-3 py-1.5 text-sm text-slate-900">
      <span className="text-slate-700">{icon}</span>
      <span className="font-medium">{text}</span>
    </div>
  );
}

function EventRowCard({
  title,
  subLineLabel,
  rangeText,
  participantsText,
  staffText,
  walkinText,
}: {
  title: string;
  subLineLabel: string;
  rangeText: string;
  participantsText: string;
  staffText: string;
  walkinText: string;
}) {
  return (
    <div className="px-4 py-4">
      <div className="text-[15px] font-semibold text-slate-900">{title}</div>

      <div className="mt-2 text-sm text-slate-700 flex items-center gap-2">
        <span className="text-slate-800 font-medium">{subLineLabel}</span>
        <span className="text-slate-400">•</span>
        <CalendarClock className="h-4 w-4 text-slate-500" />
        <span className="text-slate-700">{rangeText}</span>
      </div>

      <div className="mt-3 flex items-center">
        <div className="flex-1 flex justify-center">
          <MetricChip
            icon={<Users className="h-4 w-4" />}
            text={participantsText}
          />
        </div>

        <div className="h-10 w-px bg-sky-300/70" />

        <div className="flex-1 flex justify-center">
          <MetricChip
            icon={<IdCard className="h-4 w-4" />}
            text={staffText}
          />
        </div>

        <div className="h-10 w-px bg-sky-300/70" />

        <div className="flex-1 flex justify-center">
          <MetricChip
            icon={<Footprints className="h-4 w-4" />}
            text={walkinText}
          />
        </div>
      </div>
    </div>
  );
}

/* ===================== component ===================== */

export default function AdminDashboard() {
  const now = useMemo(() => new Date(), []);

  const url = useMemo(() => {
    const qs = new URLSearchParams({ page: "1", limit: "80" });
    return `${backend_url}/api/events?${qs.toString()}`;
  }, []);

  const { data, error, isLoading } = useSWR<ApiEventsResponse>(url, fetcher, {
    revalidateOnFocus: false,
  });

  const rawEvents = useMemo<ApiEvent[]>(() => data?.data ?? [], [data?.data]);

  const visibleEvents = useMemo(() => {
    const perms = data?.userPermissions;
    const isSupreme = Boolean(perms?.isSupreme);
    const adminMajorIds = Array.isArray(perms?.adminMajorIds)
      ? perms?.adminMajorIds
      : [];

    if (isSupreme) return rawEvents;
    if (adminMajorIds.length === 0) return rawEvents;

    return rawEvents.filter((e) => {
      const mid =
        typeof e.majorCategory_id === "number" ? e.majorCategory_id : null;
      return mid !== null && adminMajorIds.includes(mid);
    });
  }, [data?.userPermissions, rawEvents]);

  const counts = useMemo(() => {
    const published = visibleEvents.filter(
      (e) => e.status === "PUBLISHED"
    ).length;

    const completed = visibleEvents.filter(
      (e) => e.status === "COMPLETED"
    ).length;

    return {
      totalRelevant: published + completed,
      published,
      completed,
    };
  }, [visibleEvents]);

  const latestRegistration = useMemo(() => {
    return visibleEvents
      .filter(
        (e) =>
          e.status === "PUBLISHED" &&
          inRange(now, e.registrationStart, e.registrationEnd)
      )
      .sort((a, b) => sortDesc(a.registrationStart, b.registrationStart))
      .slice(0, 3);
  }, [visibleEvents, now]);

  const upcoming = useMemo(() => {
    return visibleEvents
      .filter((e) => e.status === "PUBLISHED" && isFuture(now, e.activityStart))
      .sort((a, b) => sortAsc(a.activityStart, b.activityStart))
      .slice(0, 3);
  }, [visibleEvents, now]);

  const chartBars = useMemo(() => {
    return visibleEvents
      .filter((e) => e.status === "PUBLISHED" || e.status === "COMPLETED")
      .map((e) => {
        const p = pct(e.currentParticipants, e.maxParticipants);
        const s = pct(e.currentStaffCount, e.maxStaffCount);

        return {
          id: e.id,
          title: e.title_TH || e.title_EN || `#${e.id}`,
          activityStart: e.activityStart ?? null,
          score: Math.max(p, s),
          value: Math.max(p, s),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .sort((a, b) => sortAsc(a.activityStart, b.activityStart));
  }, [visibleEvents]);

  const borderBlue = "border-sky-400/70";
  const headerBlue = "bg-sky-600";
  const dividerBlue = "bg-sky-300/70";

  const renderEmptyBox = (text: string) => (
    <div className="px-4 py-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );

  return (
    <div className="w-full">
      <div className="px-6 py-6 space-y-6">
        <section
          className={[
            "bg-white rounded-2xl border",
            borderBlue,
            "overflow-hidden",
          ].join(" ")}
        >
          <div className="flex items-stretch">
            <StatCell
              title="กิจกรรมที่ลงทะเบียนทั้งหมด"
              value={counts.totalRelevant}
            />

            <div className={["w-px", dividerBlue].join(" ")} />

            <StatCell
              title="กิจกรรมที่กำลังดำเนินกิจกรรมอยู่"
              value={counts.published}
            />

            <div className={["w-px", dividerBlue].join(" ")} />

            <StatCell
              title="กิจกรรมที่จัดงานเสร็จแล้ว"
              value={counts.completed}
            />
          </div>
        </section>

        {isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
            กำลังโหลดข้อมูล...
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-white rounded-2xl border border-rose-200 p-6 text-sm text-rose-600">
            โหลดข้อมูลไม่สำเร็จ
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section
              className={[
                "bg-white rounded-2xl border",
                borderBlue,
                "overflow-hidden",
              ].join(" ")}
            >
              <div className={[headerBlue, "px-4 py-3"].join(" ")}>
                <div className="text-white font-semibold">
                  กิจกรรมที่ลงทะเบียนล่าสุด
                </div>
              </div>

              {latestRegistration.length === 0 ? (
                renderEmptyBox("ยังไม่มีกิจกรรมที่อยู่ในช่วงเปิดรับลงทะเบียน")
              ) : (
                <div className="divide-y divide-sky-200/80">
                  {latestRegistration.map((e) => {
                    const title =
                      e.title_TH || e.title_EN || `#${e.id}`;

                    const range = formatDateTimeRange(
                      e.registrationStart,
                      e.registrationEnd,
                      "th"
                    );

                    return (
                      <EventRowCard
                        key={e.id}
                        title={title}
                        subLineLabel="เปิดลงทะเบียน"
                        rangeText={range}
                        participantsText={formatCapacity(
                          e.currentParticipants,
                          e.maxParticipants
                        )}
                        staffText={formatCapacity(
                          e.currentStaffCount,
                          e.maxStaffCount
                        )}
                        walkinText={formatCapacity(
                          e.currentWalkins,
                          e.walkinCapacity
                        )}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <section
              className={[
                "bg-white rounded-2xl border",
                borderBlue,
                "overflow-hidden",
              ].join(" ")}
            >
              <div className={[headerBlue, "px-4 py-3"].join(" ")}>
                <div className="text-white font-semibold">
                  กิจกรรมที่ใกล้จะมาถึง
                </div>
              </div>

              {upcoming.length === 0 ? (
                renderEmptyBox("ยังไม่มีกิจกรรมที่กำลังจะเริ่มในช่วงถัดไป")
              ) : (
                <div className="divide-y divide-sky-200/80">
                  {upcoming.map((e) => {
                    const title =
                      e.title_TH || e.title_EN || `#${e.id}`;

                    const range = formatDateTimeRange(
                      e.activityStart,
                      e.activityEnd,
                      "th"
                    );

                    return (
                      <EventRowCard
                        key={e.id}
                        title={title}
                        subLineLabel="วันจัดกิจกรรม"
                        rangeText={range}
                        participantsText={formatCapacity(
                          e.currentParticipants,
                          e.maxParticipants
                        )}
                        staffText={formatCapacity(
                          e.currentStaffCount,
                          e.maxStaffCount
                        )}
                        walkinText={formatCapacity(
                          e.currentWalkins,
                          e.walkinCapacity
                        )}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}                
                {!isLoading && !error && (
                    <section className={["bg-white rounded-2xl border", borderBlue, "overflow-hidden"].join(" ")}>
                        <div className={[headerBlue, "px-4 py-3"].join(" ")}>
                            <div className="text-white font-semibold">การเข้าร่วมกิจกรรมทั้งหมด</div>
                        </div>

                        <div className="p-6">
                            <div className="relative h-[280px] border border-sky-200/80 rounded-xl bg-white overflow-hidden">
                                <div className="absolute left-0 right-0 bottom-0 h-px bg-sky-200/80" />

                                <div className="absolute inset-0 flex items-end justify-center gap-14 pb-8">
                                    {chartBars.length === 0 ? (
                                        <div className="text-sm text-slate-500 pb-6">ไม่มีข้อมูลสำหรับแสดงกราฟ</div>
                                    ) : (
                                        chartBars.map((b) => {
                                            const heightPct = Math.max(8, Math.min(100, b.value));
                                            const heightPx = Math.round((heightPct / 100) * 220);

                                            return (
                                                <div key={b.id} className="relative group">
                                                    <div
                                                        className="w-[96px] rounded-t-lg bg-sky-200/70"
                                                        style={{ height: `${heightPx}px` }}
                                                    />

                                                    {/* ✅ โชว์เฉพาะตอน hover เท่านั้น */}
                                                    <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition">
                                                        <div className="flex items-center gap-2 rounded-md border border-sky-400 bg-white px-3 py-1 text-sm text-sky-700 shadow-sm whitespace-nowrap">
                                                            {b.title} {b.value}%
                                                            <ChevronRight className="h-4 w-4 text-sky-500" />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 text-xs text-slate-500">
                                * ความสูงแท่ง = % สูงสุดของ (ผู้เข้าร่วม/สตาฟ) ต่อความจุ ของแต่ละกิจกรรม (Top 3)
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}