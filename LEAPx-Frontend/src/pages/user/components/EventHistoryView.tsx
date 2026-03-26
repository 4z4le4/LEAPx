import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger, } from "../../../components/ui/tabs.tsx";
import toast, { Toaster } from "react-hot-toast";
import {
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    User,
    Users,
    Award,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ChevronDown,
    ChevronUp,
    X,
} from "lucide-react";

import * as LucideIcons from "lucide-react";
import type {
    EventRegistrationHistory,
    StaffRegistrationHistory,
    MainSkillReward,
} from "../../../../types/user/user.ts";

import { format, subHours } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useEventHistory, useStaffHistory } from "../hooks/useProfileData";
import { useTranslation } from "react-i18next";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_LEAP_BACKEND_URL;
const BACKEND_CODE = import.meta.env.VITE_LEAP_BACKEND_CODE;

const api = axios.create({
    baseURL: BACKEND_URL,
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': BACKEND_CODE,
    },
    withCredentials: true,
});

interface Props {
    allEventHistory: EventRegistrationHistory[];
    allStaffHistory: StaffRegistrationHistory[];
}

export const EventHistoryView: React.FC<Props> = ({
    allEventHistory,
    allStaffHistory,
}) => {
    const { t } = useTranslation("profilePage");

    const [selectedCategory, setSelectedCategory] = useState<
        "all" | "completed" | "pending" | "cancelled"
    >("pending");
    const [viewMode, setViewMode] = useState<"participant" | "staff">(
        "participant"
    );
    const [currentPage, setCurrentPage] = useState(1);
    const [, setRefreshTrigger] = useState(0);
    const itemsPerPage = 10;

    const {
        data: eventData,
        pagination: eventPagination,
        loading: eventLoading,
    } = useEventHistory(currentPage, itemsPerPage);

    const {
        data: staffData,
        pagination: staffPagination,
        loading: staffLoading,
    } = useStaffHistory(currentPage, itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory, viewMode]);

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const currentData = useMemo(() => {
        const data = viewMode === "participant" ? eventData : staffData;

        switch (selectedCategory) {
        case "completed":
            return data.filter((e) => e.status === "COMPLETED");
        case "pending":
            return data.filter(
            (e) =>
                e.status === "PENDING" ||
                e.status === "REGISTERED" ||
                e.status === "ATTENDED" ||
                e.status === "LATE"
            );
        case "cancelled":
            return data.filter((e) => e.status === "CANCELLED");
        default:
            return data;
        }
    }, [eventData, staffData, selectedCategory, viewMode]);

    const pagination =
        viewMode === "participant" ? eventPagination : staffPagination;
    const loading = viewMode === "participant" ? eventLoading : staffLoading;

    const categoryCounts = useMemo(() => {
        const data = viewMode === "participant" ? allEventHistory : allStaffHistory;
        return {
        all: data.length,
        completed: data.filter((e) => e.status === "COMPLETED").length,
        pending: data.filter(
            (e) => e.status === "PENDING" || e.status === "REGISTERED" || e.status === "ATTENDED" || e.status === "LATE"
        ).length,
        cancelled: data.filter((e) => e.status === "CANCELLED").length,
        };
    }, [allEventHistory, allStaffHistory, viewMode]);

    const stats = useMemo(() => {
        const data = viewMode === "participant" ? allEventHistory : allStaffHistory;
        return {
        total: data.length,
        completed: data.filter((e) => e.status === "COMPLETED").length,
        pending: data.filter(
            (e) => e.status === "PENDING" || e.status === "REGISTERED" || e.status === "ATTENDED" || e.status === "LATE"
        ).length,
        };
    }, [allEventHistory, allStaffHistory, viewMode]);

    const handlePageChange = (newPage: number) => {
        if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 px-2 md:px-0">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
            <Card className="w-full">
            <CardContent className="p-2 md:p-4">
                <div className="flex justify-center items-center gap-2 mt-4 md:mt-0">
                <div className="p-2 md:p-2.5 bg-blue-100 rounded-lg">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                </div>
                <div className="text-center">
                    <p className="text-xs md:text-sm text-gray-600 whitespace-nowrap">
                    {t("history.stats.all")}
                    </p>
                    <p className="text-xl md:text-2xl font-bold">{stats.total}</p>
                </div>
                </div>
            </CardContent>
            </Card>

            <Card className="w-full">
            <CardContent className="p-2 md:p-4">
                <div className="flex justify-center items-center gap-2 mt-4 md:mt-0">
                <div className="p-2 md:p-2.5 bg-green-100 rounded-lg">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                </div>
                <div className="text-center">
                    <p className="text-xs md:text-sm text-gray-600 whitespace-nowrap">
                    {t("history.stats.completed")}
                    </p>
                    <p className="text-xl md:text-2xl font-bold">
                    {stats.completed}
                    </p>
                </div>
                </div>
            </CardContent>
            </Card>

            <Card className="w-full md:col-span-1 col-span-2">
            <CardContent className="p-2 md:p-4">
                <div className="flex justify-center items-center gap-2 mt-4 md:mt-0">
                <div className="p-2 md:p-2.5 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                </div>
                <div className="text-center gap-3 items-center">
                    <p className="text-xs md:text-sm text-gray-600 whitespace-nowrap">
                    {t("history.stats.pending")}
                    </p>
                    <p className="text-xl md:text-2xl font-bold">{stats.pending}</p>
                </div>
                </div>
            </CardContent>
            </Card>
        </div>

        {/* Main Content */}
        <Card>
            <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">
                {t("history.title")}
            </CardTitle>
            </CardHeader>

            <CardContent className="p-4 md:p-6">
            {/* View Mode Toggle */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
                <button
                onClick={() => setViewMode("participant")}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-sm md:text-base ${
                    viewMode === "participant"
                    ? "bg-sky-400 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                >
                <User className="w-3 h-3 md:w-4 md:h-4" />
                <span>
                    {t("history.viewMode.participant", {
                    count: allEventHistory.length,
                    })}
                </span>
                </button>

                <button
                onClick={() => setViewMode("staff")}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-sm md:text-base ${
                    viewMode === "staff"
                    ? "bg-emerald-400 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                >
                <Users className="w-3 h-3 md:w-4 md:h-4" />
                <span>
                    {t("history.viewMode.staff", { count: allStaffHistory.length })}
                </span>
                </button>
            </div>

            {/* Category Tabs */}
            <Tabs
                value={selectedCategory}
                onValueChange={(v) =>
                setSelectedCategory(
                    v as "all" | "completed" | "pending" | "cancelled"
                )
                }
            >
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 h-auto bg-transparent p-0">
                <TabsTrigger
                    value="pending"
                    className={`text-sm md:text-base md:px-4 h-auto rounded-xl border-2 transition-all ${
                    selectedCategory === "pending"
                        ? "bg-sky-400 text-white border-sky-500 font-semibold shadow-lg"
                        : "bg-white text-gray-600 border-gray-300 hover:border-sky-300 hover:bg-sky-50"
                    }`}
                >
                    <div className="flex flex-col items-center gap-1 py-2">
                    <span>{t("history.category.pending")}</span>
                    <span className="text-xs font-normal opacity-90">
                        ({categoryCounts.pending})
                    </span>
                    </div>
                </TabsTrigger>

                <TabsTrigger
                    value="completed"
                    className={`text-sm md:text-base md:px-4 h-auto rounded-xl border-2 transition-all ${
                    selectedCategory === "completed"
                        ? "bg-green-400 text-white border-green-400 font-semibold shadow-lg"
                        : "bg-white text-gray-600 border-gray-300 hover:border-green-300 hover:bg-green-50"
                    }`}
                >
                    <div className="flex flex-col items-center gap-1 py-2">
                    <span>{t("history.category.completed")}</span>
                    <span className="text-xs font-normal opacity-90">
                        ({categoryCounts.completed})
                    </span>
                    </div>
                </TabsTrigger>

                <TabsTrigger
                    value="cancelled"
                    className={`text-sm md:text-base md:px-4 h-auto rounded-xl border-2 transition-all ${
                    selectedCategory === "cancelled"
                        ? "bg-red-400 text-white border-red-500 font-semibold shadow-lg"
                        : "bg-white text-gray-600 border-gray-300 hover:border-red-300 hover:bg-red-50"
                    }`}
                >
                    <div className="flex flex-col items-center gap-1 py-2">
                    <span>{t("history.category.cancelled")}</span>
                    <span className="text-xs font-normal opacity-90">
                        ({categoryCounts.cancelled})
                    </span>
                    </div>
                </TabsTrigger>

                <TabsTrigger
                    value="all"
                    className={`text-sm md:text-base md:px-4 h-auto rounded-xl border-2 transition-all ${
                    selectedCategory === "all"
                        ? "bg-blue-400 text-white border-blue-500 font-semibold shadow-lg"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                >
                    <div className="flex flex-col items-center gap-1 py-2">
                    <span>{t("history.category.all")}</span>
                    <span className="text-xs font-normal opacity-90">
                        ({categoryCounts.all})
                    </span>
                    </div>
                </TabsTrigger>
                </TabsList>

                <TabsContent value={selectedCategory} className="mt-4 md:mt-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="space-y-3">
                    {currentData.length === 0 ? (
                        <div className="text-center py-8 md:py-12 text-gray-500">
                        <Calendar className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm md:text-base">
                            {t("history.emptyCategory")}
                        </p>
                        </div>
                    ) : (
                        <>
                        {currentData.map((item) => (
                            <EventCard
                            key={item.id}
                            event={item}
                            viewMode={viewMode}
                            onCancelSuccess={handleRefresh}
                            />
                        ))}

                        {/* Pagination Controls */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex flex-col md:flex-row items-center justify-between mt-6 pt-4 border-t gap-3">
                            <div className="text-xs md:text-sm text-gray-600">
                                {t("history.pagination", {
                                current: pagination.currentPage,
                                totalPages: pagination.totalPages,
                                totalCount: pagination.totalCount,
                                })}
                            </div>

                            <div className="flex gap-2">
                                <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={!pagination.hasPreviousPage}
                                className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                                </button>

                                <div className="hidden md:flex gap-1">
                                {Array.from(
                                    { length: pagination.totalPages },
                                    (_, i) => i + 1
                                ).map((page) => {
                                    if (
                                    page === 1 ||
                                    page === pagination.totalPages ||
                                    (page >= currentPage - 1 &&
                                        page <= currentPage + 1)
                                    ) {
                                    return (
                                        <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`px-3 py-2 rounded-lg border transition-colors ${
                                            currentPage === page
                                            ? "bg-sky-400 text-white border-sky-400"
                                            : "hover:bg-gray-100"
                                        }`}
                                        >
                                        {page}
                                        </button>
                                    );
                                    }

                                    if (
                                    page === currentPage - 2 ||
                                    page === currentPage + 2
                                    ) {
                                    return (
                                        <span key={page} className="px-2 py-2">
                                        ...
                                        </span>
                                    );
                                    }

                                    return null;
                                })}
                                </div>

                                <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={!pagination.hasNextPage}
                                className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                            </div>
                            </div>
                        )}
                        </>
                    )}
                    </div>
                )}
                </TabsContent>
            </Tabs>
            </CardContent>
        </Card>
        </div>
    );
};

interface EventCardProps {
    event: EventRegistrationHistory | StaffRegistrationHistory;
    viewMode: "participant" | "staff";
    onCancelSuccess: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, viewMode, onCancelSuccess }) => {
    const { t, i18n } = useTranslation("profilePage");
    const isTH = i18n.language.toLowerCase().startsWith("th");
    const dateLocale = isTH ? th : enUS;

    const [showSkills, setShowSkills] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const canCancel = event.status === "PENDING" || event.status === "REGISTERED";

    const handleCancelClick = () => {
        setShowCancelConfirm(true);
    };

    const handleCancelConfirm = async () => {
        try {
            setIsCancelling(true);
            const endpoint = viewMode === "participant" 
                ? "/api/events/register/user"
                : "/api/events/register/staff";

            await api.post(endpoint, {
                eventId: event.event.id,
                action: "cancel"
            });

            setShowCancelConfirm(false);
            localStorage.setItem('profileActiveTab', 'history');
            toast.success(t("history.cancelSuccess") || "ยกเลิกการลงทะเบียนสำเร็จ", {
                duration: 3000,
            });
            onCancelSuccess();
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error("Error cancelling registration:", error);
        } finally {
            setIsCancelling(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<
        string,
        {
            label: string;
            variant: "default" | "secondary" | "destructive" | "outline";
            icon: React.ReactNode;
            className: string;
        }
        > = {
        COMPLETED: {
            label: t("history.status.completed"),
            variant: "default",
            icon: <CheckCircle className="w-3 h-3" />,
            className:
            "bg-green-400 text-white border-green-300 hover:bg-green-200",
        },
        REGISTERED: {
            label: t("history.status.registered"),
            variant: "outline",
            icon: <CheckCircle className="w-3 h-3" />,
            className: "bg-sky-400 text-white border-blue-300 hover:bg-blue-200",
        },
        PENDING: {
            label: t("history.status.pending"),
            variant: "secondary",
            icon: <Clock className="w-3 h-3" />,
            className:
            "bg-yellow-400 text-white border-yellow-300 hover:bg-yellow-200",
        },
        CANCELLED: {
            label: t("history.status.cancelled"),
            variant: "destructive",
            icon: <XCircle className="w-3 h-3" />,
            className: "bg-red-400 text-white border-red-300 hover:bg-red-200",
        },
        ATTENDED: {
            label: t("history.status.attended"),
            variant: "default",
            icon: <CheckCircle className="w-3 h-3" />,
            className: "bg-teal-400 text-white border-teal-300 hover:bg-teal-200",
        },
        LATE: {
            label: t("history.status.late"),
            variant: "outline",
            icon: <Clock className="w-3 h-3" />,
            className: "bg-orange-400 text-white border-orange-300 hover:bg-orange-200",    
        }
        };

        const config =
        statusConfig[status] ||
        ({
            label: status,
            variant: "outline",
            icon: null,
            className: "border-gray-300 text-gray-700",
        } as const);

        return (
        <Badge
            variant={config.variant}
            className={`flex items-center gap-1 text-xs ${config.className}`}
        >
            {config.icon}
            {config.label}
        </Badge>
        );
    };

    const isParticipant = "experienceEarned" in event;
    const hasSkills =
        event.event.skillsByMainCategory &&
        event.event.skillsByMainCategory.length > 0;

    return (
        
        <Card className="hover:shadow-md transition-shadow rounded-xl">
        <Toaster position="top-center" />
        <CardContent className="p-3 md:p-4">
            <div className="flex items-start justify-between">
            <div className="flex-1 mt-4 md:mt-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                {getStatusBadge(event.status)}
                {viewMode === "staff" && (
                    <Badge
                    variant="secondary"
                    className="flex items-center gap-1 text-xs"
                    >
                    <Users className="w-3 h-4" />
                    {t("history.staffBadge")}
                    </Badge>
                )}
                </div>

                <h3 className="font-semibold text-base md:text-lg mb-1 line-clamp-2">
                {isTH ? event.event.title_TH : event.event.title_EN}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 mb-3 line-clamp-1">
                {isTH ? event.event.title_EN : event.event.title_TH}
                </p>

                <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-gray-600">
                <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                    <span className="truncate">
                    {format(new Date(event.event.activityStart), "dd MMM yyyy", {
                        locale: dateLocale,
                    })}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                    <span className="truncate">
                    {format(subHours(new Date(event.event.activityStart), 7), "HH:mm")} -{" "}
                    {format(subHours(new Date(event.event.activityEnd), 7), "HH:mm")}
                    </span>
                </div>

                {isParticipant && event.experienceEarned > 0 && (
                    <div className="flex items-center gap-1 text-blue-600 font-semibold">
                    <Award className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                    <span>
                        {t("history.expEarned", { exp: event.experienceEarned })}
                    </span>
                    </div>
                )}
                </div>

                {/* Cancel Button - Only show for PENDING status */}
                {canCancel && (
                <div className="mt-3 pt-3 border-t">
                    {!showCancelConfirm ? (
                    <button
                        onClick={handleCancelClick}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        <X className="w-4 h-4" />
                        <span>{t("history.cancelButton") || "ยกเลิกการลงทะเบียน"}</span>
                    </button>
                    ) : (
                    <div className="flex justify-start items-center gap-2">
                        <p className="text-sm text-gray-600">
                        {t("history.cancelConfirm") || "ยืนยันการยกเลิก?"}
                        </p>
                        <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        disabled={isCancelling}
                        >
                        {t("history.cancelNo") || "ไม่"}
                        </button>
                        <button
                        onClick={handleCancelConfirm}
                        disabled={isCancelling}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                        {isCancelling ? (
                            <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>{t("history.cancelling") || "กำลังยกเลิก..."}</span>
                            </>
                        ) : (
                            <span>{t("history.cancelYes") || "ใช่, ยกเลิก"}</span>
                        )}
                        </button>
                    </div>
                    )}
                </div>
                )}

                {/* Skills Section */}
                {hasSkills && (
                <div className="mt-3 pt-3 border-t">
                    <button
                    onClick={() => setShowSkills(!showSkills)}
                    className="flex items-center gap-2 text-sm font-semibold text-yellow-600 hover:text-yellow-700 transition-colors"
                    >
                    <span>
                        {t("history.skillsReceived", {
                        count: event.event.skillsByMainCategory.length,
                        })}
                    </span>
                    {showSkills ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                    </button>

                    {showSkills && (
                    <div className="mt-3 space-y-3">
                        {event.event.skillsByMainCategory.map((skillCategory) => (
                        <SkillCategoryDisplay
                            key={skillCategory.mainSkill.id}
                            skillCategory={skillCategory}
                        />
                        ))}
                    </div>
                    )}
                </div>
                )}

                {/* Check-in/Check-out Info */}
                {event.checkedIn && (
                <div className="mt-3 pt-3 border-t flex flex-col md:flex-row gap-2 md:gap-4 text-xs text-gray-500">
                    {event.checkInTime && (
                    <div className="flex items-center gap-1">
                        <span className="font-semibold">
                        {t("history.checkin")}:
                        </span>
                        <span>
                        {format(subHours(new Date(event.checkInTime), 7), "HH:mm dd/MM/yyyy", {
                            locale: dateLocale,
                        })}
                        </span>
                    </div>
                    )}
                    {event.checkedOut && event.checkOutTime && (
                    <div className="flex items-center gap-1">
                        <span className="font-semibold">
                        {t("history.checkout")}:
                        </span>
                        <span>
                        {format(
                            subHours(new Date(event.checkOutTime), 7),
                            "HH:mm dd/MM/yyyy",
                            {
                            locale: dateLocale,
                            }
                        )}
                        </span>
                    </div>
                    )}
                </div>
                )}
            </div>
            </div>
        </CardContent>
        </Card>
    );
};

interface SkillCategoryDisplayProps {
    skillCategory: MainSkillReward;
}

const SkillCategoryDisplay: React.FC<SkillCategoryDisplayProps> = ({
    skillCategory,
    }) => {
    const { t, i18n } = useTranslation("profilePage");
    const isTH = i18n.language.toLowerCase().startsWith("th");

    const [expanded, setExpanded] = useState(false);
    const { mainSkill, subSkills } = skillCategory;

    const MainIconComponent = mainSkill.icon
        ? (LucideIcons[
            mainSkill.icon as keyof typeof LucideIcons
        ] as LucideIcons.LucideIcon)
        : null;

    return (
        <div
        className="rounded-lg border-2 overflow-hidden transition-all"
        style={{
            borderColor: mainSkill.color || "#E5E7EB",
            backgroundColor: mainSkill.color ? `${mainSkill.color}08` : "#F9FAFB",
        }}
        >
        {/* Main Skill Header */}
        <button
            onClick={() => setExpanded(!expanded)}
            className="w-full p-3 flex items-center justify-between hover:bg-white/50 transition-colors"
        >
            <div className="flex items-center gap-2 flex-1">
            {MainIconComponent && (
                <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                    backgroundColor: mainSkill.color || "#ffffff",
                    color: "black",
                }}
                >
                <MainIconComponent className="w-5 h-5" />
                </div>
            )}

            <div className="text-left flex-1">
                <p
                className="font-semibold text-sm md:text-base"
                style={{ color: mainSkill.color || "#374151" }}
                >
                {isTH ? mainSkill.name_TH : mainSkill.name_EN}
                </p>
                <p className="text-xs text-gray-500">
                {isTH ? mainSkill.name_EN : mainSkill.name_TH}
                </p>
            </div>
            </div>

            {expanded ? (
            <ChevronUp className="w-4 h-4 ml-2 flex-shrink-0" />
            ) : (
            <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
            )}
        </button>

        {/* Sub Skills */}
        {expanded && (
            <div className="p-3 pt-0 space-y-2">
            <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                <span>{t("history.subSkills", { count: subSkills.length })}</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {subSkills.map((subSkill) => {
                const SubIconComponent = subSkill.icon
                    ? (LucideIcons[
                        subSkill.icon as keyof typeof LucideIcons
                    ] as LucideIcons.LucideIcon)
                    : null;

                return (
                    <div
                    key={subSkill.id}
                    className="bg-white rounded-lg p-2.5 border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                        {SubIconComponent && (
                            <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                                backgroundColor: subSkill.color
                                ? `${subSkill.color}20`
                                : "#ffffff",
                                color: subSkill.color || "#000000",
                            }}
                            >
                            <SubIconComponent className="w-4 h-4" />
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                            {isTH ? subSkill.name_TH : subSkill.name_EN}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                            {isTH ? subSkill.name_EN : subSkill.name_TH}
                            </p>
                        </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge
                            variant="outline"
                            className="text-xs font-semibold"
                            style={{
                            borderColor: subSkill.color || "#ffffff",
                            color: subSkill.color || "#6B7280",
                            }}
                        >
                            {t("history.levelType", { level: subSkill.levelType })}
                        </Badge>

                        <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                            {t("history.received")}{" "}
                            <span>
                            {/* +{subSkill.baseExperience + subSkill.bonusExperience} */}
                            +{subSkill.baseExperience }

                            </span>{" "}
                            {t("history.exp")}
                        </div>
                        </div>
                    </div>

                    {/* {subSkill.bonusExperience > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-600">
                            {t("history.baseBonus", {
                            base: subSkill.baseExperience,
                            bonus: subSkill.bonusExperience,
                            })}
                        </span>
                        </div>
                    )} */}
                    </div>
                );
                })}
            </div>
            </div>
        )}
        </div>
    );
};
