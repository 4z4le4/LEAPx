import { useMemo, useState } from "react";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
    CalendarClock,
    MapPin,
    ScanHeart,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import Navbar from "../../components/Navbar/Navbar";
import PrimaryFooter from "../../components/Footer/PrimaryFooter";
import { useAuth } from "../../context/AuthContext";
import { backend_url } from "../../../utils/constants";

const PAGE_SIZE = 10;

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
    slug?: string | null;
    title_TH: string;
    title_EN: string;

    status?: string | null;

    activityStart?: string | null;
    activityEnd?: string | null;

    location_TH?: string | null;
    location_EN?: string | null;

    majorCategory?: ApiMajorCategory | null;
    majorCategory_id?: number | null;
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
};

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch events");
        return res.json() as Promise<ApiEventsResponse>;
    });

function formatDate(iso?: string | null, locale: string = "th-TH") {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(+d)) return "-";
    return d.toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatTime(iso?: string | null, locale: string = "th-TH") {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(+d)) return "-";
    return d.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
    });
}

// pagination: ไม่เกิน 5 เลข + มี ... เมื่อเกิน 5 หน้า
function buildPageItems(current: number, total: number): Array<number | "..."> {
    if (total <= 1) return [1];
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

    if (current <= 3) return [1, 2, 3, 4, "...", total];
    if (current >= total - 2)
        return [1, "...", total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function OrganizerEvents() {
    const { t, i18n } = useTranslation("organizerEvents");
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const isEN = i18n.language?.startsWith("en");
    const locale = isEN ? "en-US" : "th-TH";

    const [page, setPage] = useState(1);

    const url = useMemo(() => {
        if (!isAuthenticated) return null;

        const qs = new URLSearchParams({
            page: String(page),
            limit: String(PAGE_SIZE),
            // ถ้าต้องการ sort เพิ่มทีหลังค่อยใส่ sortBy/sortOrder ได้
            // sortBy: "activityStart",
            // sortOrder: "asc",
        });

        //  ใช้ backend_url 
        return `${backend_url}/api/events?${qs.toString()}`;
    }, [isAuthenticated, page]);

    const { data, error, isLoading } = useSWR<ApiEventsResponse>(url, fetcher, {
        revalidateOnFocus: false,
    });

    const rows = data?.data ?? [];

    const currentPage = data?.pagination?.page ?? page;
    const totalPages = data?.pagination?.totalPages ?? 1;

    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    const pageItems = useMemo(
        () => buildPageItems(currentPage, totalPages),
        [currentPage, totalPages]
    );

    //ถ้ามีหน้าเดียวไม่ต้องโชว์ pagination
    const shouldShowPagination = rows.length > 0 && totalPages > 1;

    return (
        <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
            <Navbar />

            <main className="flex-1 w-full">
                <div className="max-w-6xl mx-auto px-4 py-10">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
                        {t("title")}
                    </h1>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1.2fr] bg-slate-100 text-sm font-semibold text-slate-700">
                            <div className="px-4 py-3 border-b border-slate-200">
                                {t("table.event")}
                            </div>
                            <div className="px-4 py-3 border-b border-slate-200">
                                {t("table.timeLocation")}
                            </div>
                            <div className="px-4 py-3 border-b border-slate-200">
                                {t("table.major")}
                            </div>
                            <div className="px-4 py-3 border-b border-slate-200 text-center">
                                {t("table.scan")}
                            </div>
                        </div>

                        {/* Loading / Error / Empty */}
                        {isLoading && (
                            <div className="p-6 text-center text-slate-500 text-sm">
                                {t("loading")}
                            </div>
                        )}

                        {error && !isLoading && (
                            <div className="p-6 text-center text-rose-600 text-sm">
                                {t("loadFailed")}
                            </div>
                        )}

                        {!isLoading && !error && rows.length === 0 && (
                            <div className="p-6 text-center text-slate-500 text-sm">
                                {t("empty")}
                            </div>
                        )}

                        {/* Rows */}
                        <div className="divide-y divide-slate-100">
                            {rows.map((ev) => {
                                const eventTitle = isEN ? ev.title_EN : ev.title_TH;

                                const location = isEN
                                    ? ev.location_EN || ev.location_TH
                                    : ev.location_TH || ev.location_EN;

                                const dateRange =
                                    ev.activityStart && ev.activityEnd
                                        ? `${formatDate(ev.activityStart, locale)} - ${formatDate(
                                            ev.activityEnd,
                                            locale
                                        )}`
                                        : formatDate(ev.activityStart || ev.activityEnd, locale);

                                const timeRange =
                                    ev.activityStart && ev.activityEnd
                                        ? `${formatTime(ev.activityStart, locale)} - ${formatTime(
                                            ev.activityEnd,
                                            locale
                                        )}`
                                        : "-";

                                const majorLabel = (() => {
                                    const m = ev.majorCategory;
                                    if (!m) return t("majorFallback");
                                    const name = isEN ? m.name_EN || m.name_TH : m.name_TH || m.name_EN;
                                    const code = m.code ? ` (${m.code})` : "";
                                    return `${name || t("majorFallback")}${code}`;
                                })();

                                return (
                                    <div
                                        key={ev.id}
                                        className="grid md:grid-cols-[2fr_2fr_1.5fr_1.2fr] text-sm"
                                    >
                                        {/* Event */}
                                        <div className="px-4 py-3 flex flex-col gap-1">
                                            <span className="font-medium text-slate-900">
                                                {eventTitle}
                                            </span>
                                        </div>

                                        {/* Time + Location */}
                                        <div className="px-4 py-3 flex flex-col gap-1 text-slate-700">
                                            <div className="flex items-center gap-2">
                                                <CalendarClock className="w-4 h-4 text-slate-500" />
                                                <span className="text-xs md:text-sm">
                                                    {dateRange} • {timeRange}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-slate-500" />
                                                <span className="text-xs md:text-sm">
                                                    {location || t("locationFallback")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Major */}
                                        <div className="px-4 py-3 flex items-center">
                                            <span className="text-sm text-slate-800">{majorLabel}</span>
                                        </div>

                                        {/* Scan staff button */}
                                        <div className="px-4 py-3 flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigate(`/organizer/events/${ev.id}/staff-checkin`, {
                                                        state: { eventTitle },
                                                    });
                                                }}
                                                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs md:text-sm border transition bg-teal-500 text-white border-teal-500 hover:bg-teal-600"
                                            >
                                                <ScanHeart className="w-4 h-4" />
                                                <span>{t("scanButton")}</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pagination มีมากกว่า 1 หน้า */}
                    {shouldShowPagination && (
                        <div className="mt-6 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                aria-label={t("pagination.prev")}
                                disabled={!hasPrev}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border transition ${hasPrev
                                    ? "bg-white hover:bg-slate-50"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    }`}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-1">
                                {pageItems.map((it, idx) => {
                                    if (it === "...") {
                                        return (
                                            <span
                                                key={`dots-${idx}`}
                                                className="px-2 text-slate-400 select-none"
                                            >
                                                ...
                                            </span>
                                        );
                                    }

                                    const p = it;
                                    const active = p === currentPage;

                                    return (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPage(p)}
                                            className={`h-9 min-w-9 px-2 rounded-lg border text-sm transition ${active
                                                ? "bg-slate-900 text-white border-slate-900"
                                                : "bg-white hover:bg-slate-50"
                                                }`}
                                            aria-current={active ? "page" : undefined}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                aria-label={t("pagination.next")}
                                disabled={!hasNext}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border transition ${hasNext
                                    ? "bg-white hover:bg-slate-50"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    }`}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <PrimaryFooter />
        </div>
    );
}
