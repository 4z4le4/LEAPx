import React from "react";
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import * as LucideIcons from "lucide-react";
import { useTranslation } from "react-i18next";

interface RadarDataPoint {
    skill: string; // EN
    skill_TH: string; // TH
    value: number;
    maxLevel: number;
    color: string | null;
}

interface OverallStats {
    totalExp: number;
    totalStars: number;
    averageLevel: number;
    maxLevel: number;
}

interface SubSkillDetail {
    id: number;
    name_TH: string;
    name_EN: string;
    slug: string;
    icon: string;
    color: string | null;
    description_TH: string | null;
    description_EN: string | null;
    sortOrder: number;
    currentLevel: number;
    maxLevel: number;
    totalExp: number;
    levels: {
        I: {
        exp: number;
        stars: number;
        isUnlocked: boolean;
        threshold: number;
        progress: number;
        expToNextStar: number;
        };
        II: {
        exp: number;
        stars: number;
        isUnlocked: boolean;
        threshold: number;
        progress: number;
        expToNextStar: number;
        };
        III: {
        exp: number;
        stars: number;
        isUnlocked: boolean;
        threshold: number;
        progress: number;
        expToNextStar: number;
        };
        IV: {
        exp: number;
        stars: number;
        isUnlocked: boolean;
        threshold: number;
        progress: number;
        expToNextStar: number;
        };
    };
    totalStars: number;
}

interface MainSkillDetail {
    id: number;
    name_TH: string;
    name_EN: string;
    slug: string;
    icon: string;
    color: string | null;
    description_TH: string | null;
    description_EN: string | null;
    sortOrder: number;
    statistics: {
        maxLevel: number;
        averageLevel: number;
        totalExp: number;
        totalStars: number;
        totalSubSkills: number;
        completedSubSkills: number;
        completionPercentage: number;
        levelBreakdown: {
        Level_I: number;
        Level_II: number;
        Level_III: number;
        Level_IV: number;
        };
    };
    subSkills: SubSkillDetail[];
}

interface Props {
    radarData: RadarDataPoint[];
    overallStats: OverallStats;
    mainSkills: MainSkillDetail[];
}

export const SkillRadarChart: React.FC<Props> = ({ radarData, mainSkills }) => {
    const { t, i18n } = useTranslation("profilePage");
    const isTH = i18n.language.toLowerCase().startsWith("th");

    const skillColors = [
        "#EF4444",
        "#F59E0B",
        "#10B981",
        "#3B82F6",
        "#8B5CF6",
        "#000000",
        "#14B8A6",
        "#F97316",
    ];

    const chartData = radarData.map((item) => ({
        skill: isTH ? item.skill_TH : item.skill,
        value: item.value,
        fullMark: 4,
    }));

    const chartDataWithColors = radarData.map((item, index) => ({
        skill: isTH ? item.skill_TH : item.skill,
        value: item.value,
        fullMark: 4,
        color: skillColors[index % skillColors.length],
    }));

    const totalPoints = mainSkills.reduce((sum, mainSkill) => {
        const mainSkillPoints = mainSkill.subSkills.reduce(
        (subSum, subSkill) => subSum + subSkill.maxLevel,
        0
        );
        return sum + mainSkillPoints;
    }, 0);

    const pointsTarget = 10;
    const pointsRemaining = Math.max(0, pointsTarget - totalPoints);
    const pointsPassed = totalPoints >= pointsTarget;

    const competenciesCount = radarData.filter((s) => s.maxLevel > 0).length;
    const competenciesTarget = 3;
    const competenciesRemaining = Math.max(
        0,
        competenciesTarget - competenciesCount
    );
    const competenciesPassed = competenciesCount >= competenciesTarget;

    const overallPassed = pointsPassed && competenciesPassed;

    return (
        <div className="w-full space-y-6 p-2">
        {/* Activity Status Alert */}
        <div
            className={`rounded-2xl border-2 overflow-hidden ${
            overallPassed
                ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300"
                : "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300"
            }`}
        >
            <div
            className={`px-4 md:px-6 py-3 md:py-4 ${
                overallPassed
                ? "bg-gradient-to-r from-sky-300 to-emerald-400"
                : "bg-gradient-to-r from-yellow-400 to-orange-400"
            }`}
            >
            <div className="flex items-center gap-2 md:gap-3">
                {overallPassed ? (
                <>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <LucideIcons.Star className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </div>
                    <div className="flex-1">
                    <h3 className="text-base md:text-xl font-black text-white">
                        {t("radar.status.passed")}
                    </h3>
                    </div>
                </>
                ) : (
                <>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <LucideIcons.AlertCircle className="w-6 h-6 md:w-7 md:h-7 text-orange-400" />
                    </div>
                    <div className="flex-1">
                    <h3 className="text-base md:text-xl font-black text-white">
                        {t("radar.status.notPassed")}
                    </h3>
                    </div>
                </>
                )}
            </div>
            </div>

            <div className="p-4 md:p-6">
            <h4 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2">
                <LucideIcons.ListCheck className="w-5 h-5 md:w-6 md:h-6 text-black" />
                {t("radar.summary.title")}
            </h4>

            <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                {/* Total Points Card */}
                <div className="bg-white rounded-xl p-3 md:p-4 border-2 border-gray-200 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                    <div
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        pointsPassed ? "bg-green-100" : "bg-orange-100"
                        }`}
                    >
                        {pointsPassed ? (
                        <LucideIcons.Trophy className="w-5 h-5 md:w-7 md:h-7 text-green-600" />
                        ) : (
                        <LucideIcons.SquareChartGantt className="w-5 h-5 md:w-7 md:h-7 text-red-600" />
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="text-xs md:text-sm font-bold text-gray-600">
                        {t("radar.summary.skillLevel")}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-500">
                        {t("radar.summary.skillLevelDesc", {
                            target: pointsTarget,
                        })}
                        </p>
                    </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                    <p className="text-2xl md:text-3xl font-black text-gray-900">
                        {totalPoints}
                    </p>
                    </div>
                </div>

                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t">
                    <div className="flex items-center justify-between text-xs md:text-sm mb-2">
                    <span className="text-gray-600 font-semibold">
                        {t("radar.summary.target")}
                    </span>
                    <span className="font-bold text-gray-900">
                        ≥ {pointsTarget} {t("radar.units.level")}
                    </span>
                    </div>

                    <div className="relative w-full h-2.5 md:h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                        pointsPassed
                            ? "bg-gradient-to-r from-green-500 to-emerald-500"
                            : "bg-gradient-to-r from-yellow-500 to-orange-500"
                        }`}
                        style={{
                        width: `${Math.min(
                            (totalPoints / pointsTarget) * 100,
                            100
                        )}%`,
                        }}
                    />
                    </div>

                    <div className="mt-2 text-center">
                    {pointsPassed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] md:text-xs font-bold text-green-600">
                        <LucideIcons.CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
                        {t("radar.summary.passedLevel", { value: totalPoints })}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] md:text-xs font-bold text-orange-600">
                        <LucideIcons.AlertTriangle className="w-3 h-3 md:w-4 md:h-4" />
                        {t("radar.summary.needMoreLevel", {
                            value: pointsRemaining,
                        })}
                        </span>
                    )}
                    </div>
                </div>
                </div>

                {/* Competencies Card */}
                <div className="bg-white rounded-xl p-3 md:p-4 border-2 border-gray-200 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                    <div
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        competenciesPassed ? "bg-green-100" : "bg-orange-100"
                        }`}
                    >
                        {competenciesPassed ? (
                        <LucideIcons.Trophy className="w-5 h-5 md:w-7 md:h-7 text-green-600" />
                        ) : (
                        <LucideIcons.SquareChartGantt className="w-5 h-5 md:w-7 md:h-7 text-red-600" />
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="text-xs md:text-sm font-bold text-gray-600">
                        {t("radar.summary.mainSkill")}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-500">
                        {t("radar.summary.mainSkillDesc", {
                            target: competenciesTarget,
                        })}
                        </p>
                    </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                    <p className="text-2xl md:text-3xl font-black text-gray-900">
                        {competenciesCount}
                    </p>
                    </div>
                </div>

                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t">
                    <div className="flex items-center justify-between text-xs md:text-sm mb-2">
                    <span className="text-gray-600 font-semibold">
                        {t("radar.summary.target")}
                    </span>
                    <span className="font-bold text-gray-900">
                        ≥ {competenciesTarget} {t("radar.units.dimension")}
                    </span>
                    </div>

                    <div className="relative w-full h-2.5 md:h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                        competenciesPassed
                            ? "bg-gradient-to-r from-green-500 to-emerald-500"
                            : "bg-gradient-to-r from-yellow-500 to-orange-500"
                        }`}
                        style={{
                        width: `${Math.min(
                            (competenciesCount / competenciesTarget) * 100,
                            100
                        )}%`,
                        }}
                    />
                    </div>

                    <div className="mt-2 text-center">
                    {competenciesPassed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] md:text-xs font-bold text-green-600">
                        <LucideIcons.CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
                        {t("radar.summary.passedSkill", {
                            value: competenciesCount,
                        })}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] md:text-xs font-bold text-orange-600">
                        <LucideIcons.AlertTriangle className="w-3 h-3 md:w-4 md:h-4" />
                        {t("radar.summary.needMoreSkill", {
                            value: competenciesRemaining,
                        })}
                        </span>
                    )}
                    </div>
                </div>
                </div>
            </div>
            </div>
        </div>

        {/* Skill Overview Card */}
        <div className="w-full border rounded-lg shadow-md">
            <div className="p-4 md:p-6">
            <h2 className="text-lg md:text-2xl font-bold w-full items-center flex justify-center mb-4">
                {t("radar.chart.title")}
            </h2>

            <div className="hidden md:block">
                <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={chartData}>
                    <PolarGrid />
                    <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fill: "#374151", fontSize: 14 }}
                    />
                    <PolarRadiusAxis
                    angle={0}
                    domain={[0, 4]}
                    tick={(props) => {
                        const { x, y, payload } = props;
                        return (
                        <text
                            x={x - 3}
                            y={y}
                            fill="#6B7280"
                            fontSize={10}
                            textAnchor="middle"
                            transform={`rotate(0, ${x}, ${y})`}
                        >
                            {payload.value}
                        </text>
                        );
                    }}
                    />
                    <Radar
                    name={t("radar.chart.level")}
                    dataKey="value"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.6}
                    />
                    <Tooltip
                    content={({ payload }) => {
                        if (payload && payload.length > 0) {
                        const data = payload[0].payload as {
                            skill: string;
                            value: number;
                            fullMark: number;
                        };
                        return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border">
                            <p className="font-semibold">{data.skill}</p>
                            <p className="text-sm text-gray-600">
                                {t("radar.chart.level")}: {data.value} /{" "}
                                {data.fullMark}
                            </p>
                            </div>
                        );
                        }
                        return null;
                    }}
                    />
                </RadarChart>
                </ResponsiveContainer>
            </div>

            <div className="block md:hidden">
                <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={chartDataWithColors}>
                    <PolarGrid />
                    <PolarAngleAxis
                    dataKey="skill"
                    tick={(props) => {
                        const { x, y, index } = props;
                        const color =
                        chartDataWithColors[index]?.color || "#3B82F6";
                        return (
                        <g>
                            <circle
                            cx={x}
                            cy={y}
                            r={7}
                            fill={color}
                            stroke="white"
                            strokeWidth={4}
                            />
                        </g>
                        );
                    }}
                    />
                    <PolarRadiusAxis
                    angle={0}
                    domain={[0, 4]}
                    tick={(props) => {
                        const { x, y, payload } = props;
                        return (
                        <text
                            x={x - 3}
                            y={y}
                            fill="#6B7280"
                            fontSize={10}
                            textAnchor="middle"
                            transform={`rotate(0, ${x}, ${y})`}
                        >
                            {payload.value}
                        </text>
                        );
                    }}
                    />
                    <Radar
                    name={t("radar.chart.level")}
                    dataKey="value"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.6}
                    />
                    <Tooltip
                    content={({ payload }) => {
                        if (payload && payload.length > 0) {
                        const data = payload[0].payload as {
                            skill: string;
                            value: number;
                            fullMark: number;
                        };
                        return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border">
                            <p className="font-semibold">{data.skill}</p>
                            <p className="text-sm text-gray-600">
                                {t("radar.chart.level")}: {data.value} /{" "}
                                {data.fullMark}
                            </p>
                            </div>
                        );
                        }
                        return null;
                    }}
                    />
                </RadarChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
                {radarData.map((skill, index) => {
                const color = skillColors[index % skillColors.length];
                const label = isTH ? skill.skill_TH : skill.skill;
                return (
                    <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                    >
                    <div
                        className="w-3 h-3 md:w-4 md:h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] md:text-xs text-gray-600 truncate">
                        {label}
                        </p>
                        <p className="text-xs md:text-sm font-semibold">
                        {t("radar.chart.level")} {skill.value}
                        </p>
                    </div>
                    </div>
                );
                })}
            </div>
            </div>
        </div>
        </div>
    );
};
