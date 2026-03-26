import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
    CalendarClock,
    MapPin,
    ScanFace,
    ChevronLeft,
    ChevronRight,
    Shield,
    ShieldCheck,
    Search,
    Filter,
    X,
} from "lucide-react";

import Navbar from "../../components/Navbar/Navbar";
import PrimaryFooter from "../../components/Footer/PrimaryFooter";
import { useAuth } from "../../context/AuthContext";

const API_BASE = import.meta.env.VITE_LEAP_BACKEND_URL || "";
const PAGE_SIZE = 10;

type StaffStatus = "PENDING" | "REGISTERED" | "CANCELLED" | "COMPLETED" | string;

type ApiStaffEvent = {
    id: number;
    status: StaffStatus;
    StaffRole_id?: number | null;

    responsibilities_TH?: string | null;
    responsibilities_EN?: string | null;

    event: {
        id: number;
        slug?: string | null;
        title_EN: string;
        title_TH: string;
        status: string;
        activityStart: string;
        activityEnd: string;
        location_TH?: string | null;
        location_EN?: string | null;
    };

    role?: {
        id: number;
        name?: string | null;
        canScanQR?: boolean;
    };
};

type ApiResponse = {
    success: boolean;
    data: ApiStaffEvent[];
    pagination?: {
        currentPage?: number;
        totalPages?: number;
        totalCount?: number;
        limit?: number;
        hasNextPage?: boolean;
        hasPreviousPage?: boolean;
    };
};

type EventFilter = "all" | "upcoming" | "ongoing" | "completed" | "pending";
type SortOption = "activityStart_desc" | "activityStart_asc" | "createdAt_desc" | "createdAt_asc";

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch staff events");
        return res.json() as Promise<ApiResponse>;
    });

function formatDate(iso?: string, locale: string = "th-TH") {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(+d)) return "-";
    return d.toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatTime(iso?: string, locale: string = "th-TH") {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(+d)) return "-";
    return d.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
    });
}

const REGISTRATION_ROLE_ID = 2;

function pickResponsibilities(staff: ApiStaffEvent, isEN: boolean) {
    const th = staff.responsibilities_TH?.trim() || "";
    const en = staff.responsibilities_EN?.trim() || "";
    return isEN ? en || th || "" : th || en || "";
}

function canAccessScanner(staff: ApiStaffEvent) {
    if (staff.role?.canScanQR === true) return true;
    
    if (staff.status !== "REGISTERED") return false;

    if (staff.StaffRole_id === REGISTRATION_ROLE_ID) return true;

    const roleName = staff.role?.name?.toUpperCase() ?? "";
    const respTH = staff.responsibilities_TH?.toUpperCase() ?? "";
    const respEN = staff.responsibilities_EN?.toUpperCase() ?? "";

    return (
        roleName.includes("REGISTRATION") ||
        respTH.includes("REGISTRATION") ||
        respEN.includes("REGISTRATION")
    );
}

function buildPageItems(current: number, total: number): Array<number | "..."> {
    if (total <= 1) return [1];
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

    if (current <= 3) return [1, 2, 3, 4, "...", total];
    if (current >= total - 2)
        return [1, "...", total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
}

function getEventFilterStatus(staff: ApiStaffEvent): EventFilter {
    const now = new Date();
    const startTime = new Date(staff.event.activityStart);
    const endTime = new Date(staff.event.activityEnd);

    if (staff.status === "PENDING") return "pending";
    if (now < startTime) return "upcoming";
    if (now >= startTime && now <= endTime) return "ongoing";
    if (now > endTime) return "completed";
    return "all";
}

const MyStaffEvents: React.FC = () => {
    const { t, i18n } = useTranslation("myStaffEvents");
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const isEN = i18n.language?.startsWith("en");
    const locale = isEN ? "en-US" : "th-TH";

    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFilter, setSelectedFilter] = useState<EventFilter>("all");
    const [selectedSort, setSelectedSort] = useState<SortOption>("activityStart_desc");
    const [showFilters, setShowFilters] = useState(false);

    const url = useMemo(() => {
        if (!isAuthenticated || !API_BASE) return null;
        const qs = new URLSearchParams({
            page: String(page),
            limit: String(PAGE_SIZE),
            sort: selectedSort,
        });
        
        if (searchQuery.trim()) {
            qs.append("search", searchQuery.trim());
        }
        
        if (selectedFilter !== "all") {
            qs.append("filter", selectedFilter);
        }
        
        return `${API_BASE}/api/events/register/staff?${qs.toString()}`;
    }, [isAuthenticated, page, searchQuery, selectedFilter, selectedSort]);

    const { data, error, isLoading } = useSWR<ApiResponse>(url, fetcher, {
        revalidateOnFocus: false,
    });

    const rows = data?.data ?? [];

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setPage(1);
    };

    const handleFilterChange = (filter: EventFilter) => {
        setSelectedFilter(filter);
        setPage(1);
        setShowFilters(false);
    };

    const currentPage = data?.pagination?.currentPage ?? page;
    const totalPages = data?.pagination?.totalPages ?? 1;
    const hasNext = data?.pagination?.hasNextPage ?? currentPage < totalPages;
    const hasPrev = data?.pagination?.hasPreviousPage ?? currentPage > 1;

    const pageItems = useMemo(
        () => buildPageItems(currentPage, totalPages),
        [currentPage, totalPages]
    );

    const shouldShowPagination = rows.length > 0 && totalPages > 1;

    const filterOptions: { value: EventFilter; labelKey: string; color: string }[] = [
        { value: "all", labelKey: "filters.all", color: "slate" },
        { value: "upcoming", labelKey: "filters.upcoming", color: "blue" },
        { value: "ongoing", labelKey: "filters.ongoing", color: "green" },
        { value: "completed", labelKey: "filters.completed", color: "gray" },
        { value: "pending", labelKey: "filters.pending", color: "yellow" },
    ];

    const getFilterColor = (filter: EventFilter) => {
        const option = filterOptions.find((opt) => opt.value === filter);
        return option?.color || "slate";
    };

    return (
        <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
            <Navbar />

            <main className="flex-1 w-full">
                <div className="max-w-6xl mx-auto px-4 py-10">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
                        {t("title")}
                    </h1>

                    {/* Search and Filter Bar */}
                    <div className="mb-6 space-y-3">
                        {/* Search Bar and Sort */}
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={t("searchPlaceholder") || "ค้นหากิจกรรม..."}
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => handleSearchChange("")}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                            
                            {/* Sort Dropdown */}
                            <select
                                value={selectedSort}
                                onChange={(e) => setSelectedSort(e.target.value as SortOption)}
                                className="px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-slate-700 min-w-[200px]"
                            >
                                <option value="activityStart_desc">{t("sort.newest") || "ล่าสุด → เก่าสุด"}</option>
                                <option value="activityStart_asc">{t("sort.oldest") || "เก่าสุด → ล่าสุด"}</option>
                                <option value="createdAt_desc">{t("sort.registeredNewest") || "ลงทะเบียนล่าสุด"}</option>
                                <option value="createdAt_asc">{t("sort.registeredOldest") || "ลงทะเบียนเก่าสุด"}</option>
                            </select>
                        </div>

                        {/* Filter Toggle Button (Mobile) */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="md:hidden w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                        >
                            <div className="flex items-center gap-2">
                                <Filter className="w-5 h-5 text-slate-600" />
                                <span className="text-sm font-medium text-slate-700">
                                    {t(`filters.${selectedFilter}`)}
                                </span>
                            </div>
                            <ChevronRight
                                className={`w-5 h-5 text-slate-400 transition-transform ${
                                    showFilters ? "rotate-90" : ""
                                }`}
                            />
                        </button>

                        {/* Filter Buttons */}
                        <div
                            className={`flex flex-wrap gap-2 ${
                                showFilters ? "block" : "hidden md:flex"
                            }`}
                        >
                            {filterOptions.map((option) => {
                                const isActive = selectedFilter === option.value;
                                const color = getFilterColor(option.value);

                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleFilterChange(option.value)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                            isActive
                                                ? color === "blue"
                                                    ? "bg-blue-500 text-white"
                                                    : color === "green"
                                                    ? "bg-green-500 text-white"
                                                    : color === "yellow"
                                                    ? "bg-yellow-500 text-white"
                                                    : color === "gray"
                                                    ? "bg-gray-500 text-white"
                                                    : "bg-slate-900 text-white"
                                                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                                        }`}
                                    >
                                        {t(option.labelKey)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1.2fr] bg-slate-100 text-sm font-semibold text-slate-700">
                            <div className="px-4 py-3 border-b border-slate-200">
                                {t("table.event")}
                            </div>
                            <div className="px-4 py-3 border-b border-slate-200">
                                {t("table.timeLocation")}
                            </div>
                            <div className="px-4 py-3 border-b border-slate-200">
                                {t("table.role")}
                            </div>
                            <div className="px-4 py-3 border-b border-slate-200 text-center">
                                {t("table.scan")}
                            </div>
                        </div>

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
                                {searchQuery || selectedFilter !== "all"
                                    ? t("noResults")
                                    : t("empty")}
                            </div>
                        )}

                        <div className="divide-y divide-slate-100">
                            {rows.map((staff) => {
                                const event = staff.event;

                                const eventTitle = isEN ? event.title_EN : event.title_TH;
                                const location = isEN
                                    ? event.location_EN || event.location_TH
                                    : event.location_TH || event.location_EN;

                                const dateRange =
                                    event.activityStart && event.activityEnd
                                        ? `${formatDate(event.activityStart, locale)} - ${formatDate(
                                            event.activityEnd,
                                            locale
                                        )}`
                                        : formatDate(event.activityStart || event.activityEnd, locale);

                                const timeRange =
                                    event.activityStart && event.activityEnd
                                        ? `${formatTime(event.activityStart, locale)} - ${formatTime(
                                            event.activityEnd,
                                            locale
                                        )}`
                                        : "-";

                                const responsibilitiesLabel = pickResponsibilities(staff, isEN);

                                const roleLabel =
                                    staff.status === "PENDING"
                                        ? t("role.pending")
                                        : staff.role?.name?.trim() ||
                                        responsibilitiesLabel ||
                                        t("role.fallback");

                                const canScan = canAccessScanner(staff);
                                
                                const isAdminRole = staff.role?.canScanQR === true;

                                const filterStatus = getEventFilterStatus(staff);
                                const statusColor =
                                    filterStatus === "upcoming"
                                        ? "text-blue-600"
                                        : filterStatus === "ongoing"
                                        ? "text-green-600"
                                        : filterStatus === "completed"
                                        ? "text-gray-600"
                                        : filterStatus === "pending"
                                        ? "text-yellow-600"
                                        : "text-slate-600";

                                return (
                                    <div
                                        key={`${event.id}-${staff.id}`}
                                        className="grid md:grid-cols-[2fr_2fr_1.5fr_1.2fr] text-sm"
                                    >
                                        <div className="px-4 py-3 flex flex-col gap-1">
                                            <span className="font-medium text-slate-900">
                                                {eventTitle}
                                            </span>
                                            <span className={`text-xs ${statusColor} font-medium`}>
                                                {t(`filters.${filterStatus}`)}
                                            </span>
                                        </div>

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

                                        <div className="px-4 py-3 flex items-center gap-2">
                                            {isAdminRole && (
                                                roleLabel.includes("Supreme") || roleLabel.includes("สูงสุด") ? (
                                                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                                                ) : (
                                                    <Shield className="w-4 h-4 text-blue-600" />
                                                )
                                            )}
                                            <span
                                                className={`text-sm ${
                                                    staff.status === "PENDING"
                                                        ? "text-slate-500 italic"
                                                        : isAdminRole
                                                        ? roleLabel.includes("Supreme") || roleLabel.includes("สูงสุด")
                                                            ? "text-purple-700 font-medium"
                                                            : "text-blue-700 font-medium"
                                                        : "text-slate-800"
                                                }`}
                                            >
                                                {roleLabel}
                                            </span>
                                        </div>

                                        <div className="px-4 py-3 flex items-center justify-center">
                                            <button
                                                type="button"
                                                disabled={!canScan}
                                                onClick={() => {
                                                    if (!canScan) return;
                                                    navigate(`/staff/events/${event.id}/registration`, {
                                                        state: { eventTitle },
                                                    });
                                                }}
                                                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs md:text-sm border transition ${
                                                    canScan
                                                        ? "bg-teal-500 text-white border-teal-500 hover:bg-teal-600"
                                                        : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                                }`}
                                            >
                                                <ScanFace className="w-4 h-4" />
                                                <span>{t("scanButton")}</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {shouldShowPagination && (
                        <div className="mt-6 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                aria-label={t("pagination.prev")}
                                disabled={!hasPrev}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border transition ${
                                    hasPrev
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
                                            className={`h-9 min-w-9 px-2 rounded-lg border text-sm transition ${
                                                active
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
                                className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border transition ${
                                    hasNext
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
};

export default MyStaffEvents;