import React, { useState } from "react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "../../../components/ui/tabs";
import { Card, CardContent } from "../../../components/ui/card";
import { User, BarChart3, History } from "lucide-react";
import { SkillRadarChart } from "../components/SkillRadarChart";
import { SkillDetailView } from "../components/SkillDetailView";
import { EventHistoryView } from "../components/EventHistoryView";
import {
    useSkillSummary,
    useSkillDetail,
    useAllEventHistory,
    useAllStaffHistory,
} from "../hooks/useProfileData";
import Navbar from "../../../components/Navbar/Navbar";
import PrimaryFooter from "../../../components/Footer/PrimaryFooter";
import Loader from "../../../components/Loader/Loader";
import { useTranslation } from "react-i18next";

export const ProfilePage: React.FC = () => {
    const { t } = useTranslation("profilePage");
    const [activeTab, setActiveTab] = useState("overview");

    const {
        data: summaryData,
        loading: summaryLoading,
        error: summaryError,
    } = useSkillSummary();
    const {
        data: detailData,
        loading: detailLoading,
        error: detailError,
    } = useSkillDetail();

    const {
        data: allEventHistory,
        loading: eventLoading,
        error: eventError,
    } = useAllEventHistory();
    const {
        data: allStaffHistory,
        loading: staffLoading,
        error: staffError,
    } = useAllStaffHistory();

    if (summaryLoading || detailLoading || eventLoading || staffLoading) {
        return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader />
        </div>
        );
    }

    if (summaryError || detailError || eventError || staffError) {
        return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="max-w-md">
            <CardContent className="p-6 text-center">
                <div className="text-red-600 mb-4">
                <svg
                    className="w-12 h-12 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">{t("error.title")}</h3>
                <p className="text-gray-600">
                {summaryError || detailError || eventError || staffError}
                </p>
            </CardContent>
            </Card>
        </div>
        );
    }

    // No data state
    if (!summaryData || !detailData) {
        return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="max-w-md">
            <CardContent className="p-6 text-center">
                <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
                <p className="text-gray-600">{t("empty.description")}</p>
            </CardContent>
            </Card>
        </div>
        );
    }

    return (
        <>
        <Navbar />
        <div className="container mx-auto mt-4">
            {/* เตือนว่าระบบอยู่ในช่วงพัฒนา ข้อมูลอาจจะไม่สมบูรณ์ */}
            <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
            <p className="text-sm">
                ระบบอยู่ในช่วงพัฒนาเด้อ ข้อมูลอาจจะไม่สมบูรณ์ โปรดใช้วิจารณญาณในการรับชม กำลังพัฒนาอย่างต่อเนื่องเพื่อประสบการณ์ที่ดียิ่งขึ้น
            </p>
            </div>
            {/* Tabs */}
            <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
            >
            <TabsList className="flex w-full grid-cols-3 justify-center items-center">
                <TabsTrigger
                value="overview"
                className={`flex items-center gap-2 ${
                    activeTab === "overview"
                    ? "bg-emerald-100 rounded-xl text-emerald-700"
                    : ""
                }`}
                >
                <BarChart3 className="w-5 h-5" />
                <span className="hidden sm:inline">{t("tabs.overview")}</span>
                </TabsTrigger>
                <TabsTrigger
                value="skills"
                className={`flex items-center gap-2 ${
                    activeTab === "skills"
                    ? "bg-red-100 rounded-xl text-red-700"
                    : ""
                }`}
                >
                <User className="w-5 h-5" />
                <span className="hidden sm:inline">{t("tabs.skills")}</span>
                </TabsTrigger>
                <TabsTrigger
                value="history"
                className={`flex items-center gap-2 ${
                    activeTab === "history"
                    ? "bg-blue-100 rounded-xl text-blue-700"
                    : ""
                }`}
                >
                <History className="w-5 h-5" />
                <span className="hidden sm:inline">{t("tabs.history")}</span>
                </TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview - Radar Chart */}
            <TabsContent value="overview" className="space-y-6">
                <SkillRadarChart
                radarData={summaryData.radarData}
                overallStats={summaryData.overall}
                mainSkills={detailData.mainSkills}
                />
            </TabsContent>

            {/* Tab 2: Skills Detail */}
            <TabsContent value="skills" className="space-y-6">
                <SkillDetailView mainSkills={detailData.mainSkills} />
            </TabsContent>

            {/* Tab 3: Event History */}
            <TabsContent value="history" className="space-y-6">
                <EventHistoryView
                allEventHistory={allEventHistory}
                allStaffHistory={allStaffHistory}
                />
            </TabsContent>
            </Tabs>
        </div>
        <div className="mt-12">
            <PrimaryFooter />
        </div>
        </>
    );
};
