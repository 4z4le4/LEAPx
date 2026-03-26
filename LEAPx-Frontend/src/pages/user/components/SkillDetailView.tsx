import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { useTranslation } from "react-i18next";

interface LevelDetail {
    exp: number;
    threshold: number;
    stars: number;
    isUnlocked: boolean;
    expToNextStar: number;
}

interface SubSkillDetail {
    id: number;
    name_TH: string;
    name_EN: string;
    icon: string;
    currentLevel: number;
    totalExp: number;
    totalStars: number;
    levels: {
        I: LevelDetail;
        II: LevelDetail;
        III: LevelDetail;
        IV: LevelDetail;
    };
}

interface MainSkillDetail {
    id: number;
    name_TH: string;
    name_EN: string;
    icon: string;
    statistics: {
        maxLevel: number;
        totalExp: number;
        totalStars: number;
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
    mainSkills: MainSkillDetail[];
}

export const SkillDetailView: React.FC<Props> = ({ mainSkills }) => {
    const { t, i18n } = useTranslation("profilePage");
    const isTH = i18n.language.toLowerCase().startsWith("th");

    const [selectedMainSkill, setSelectedMainSkill] = useState<number | null>(
        mainSkills.length > 0 ? mainSkills[0].id : null
    );

    const currentMainSkill = mainSkills.find((s) => s.id === selectedMainSkill);

    return (
        <div className="space-y-6 p-2">
        {/* Main Skill Selector */}
        <Card>
            <CardHeader>
            <CardTitle className="text-base md:text-lg">
                {t("skillDetail.selectMainSkill")}
            </CardTitle>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {mainSkills.map((skill) => {
                const IconComponent =
                    (
                    LucideIcons as unknown as Record<
                        string,
                        React.ComponentType<React.SVGProps<SVGSVGElement>>
                    >
                    )[skill.icon] || LucideIcons.Circle;

                const isSelected = skill.id === selectedMainSkill;

                return (
                    <button
                    key={skill.id}
                    onClick={() => setSelectedMainSkill(skill.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                        isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                    >
                    <IconComponent
                        className={`w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 ${
                        isSelected ? "text-blue-600" : "text-gray-600"
                        }`}
                    />
                    <p className="text-[10px] md:text-xs text-center font-medium">
                        {isTH ? skill.name_TH : skill.name_EN}
                    </p>
                    <p className="text-base md:text-lg font-bold text-center mt-1">
                        {t("skillDetail.lvShort")}
                        {skill.statistics.maxLevel}
                    </p>
                    </button>
                );
                })}
            </div>
            </CardContent>
        </Card>

        {/* Main Skill Statistics */}
        {currentMainSkill && (
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 md:gap-3">
                {(() => {
                    const IconComponent =
                    (
                        LucideIcons as unknown as Record<
                        string,
                        React.ComponentType<React.SVGProps<SVGSVGElement>>
                        >
                    )[currentMainSkill.icon] || LucideIcons.Circle;

                    return (
                    <IconComponent className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                    );
                })()}

                <div>
                    <p className="text-base md:text-lg">
                    {isTH ? currentMainSkill.name_TH : currentMainSkill.name_EN}
                    </p>
                    <p className="text-xs md:text-sm text-gray-600 font-normal">
                    {isTH ? currentMainSkill.name_EN : currentMainSkill.name_TH}
                    </p>
                </div>
                </CardTitle>
            </CardHeader>

            <CardContent>
                {/* Sub Skills */}
                <div className="space-y-4">
                <h3 className="text-base md:text-lg font-semibold">
                    {t("skillDetail.subSkillsTitle")}
                </h3>

                {currentMainSkill.subSkills.map((subSkill) => (
                    <SubSkillCard key={subSkill.id} subSkill={subSkill} />
                ))}
                </div>
            </CardContent>
            </Card>
        )}
        </div>
    );
};

const SubSkillCard: React.FC<{ subSkill: SubSkillDetail }> = ({ subSkill }) => {
    const { t, i18n } = useTranslation("profilePage");
    const isTH = i18n.language.toLowerCase().startsWith("th");

    const [expanded, setExpanded] = useState(false);

    const IconComponent =
        (
        LucideIcons as unknown as Record<
            string,
            React.ComponentType<React.SVGProps<SVGSVGElement>>
        >
        )[subSkill.icon] || LucideIcons.Circle;

    const getLevelColor = (level: number) => {
        switch (level) {
        case 1:
            return "text-blue-600 bg-blue-400";
        case 2:
            return "text-green-600 bg-green-400";
        case 3:
            return "text-yellow-600 bg-yellow-400";
        case 4:
            return "text-purple-600 bg-purple-400";
        default:
            return "text-gray-600 bg-gray-400";
        }
    };

    const getLevelName = (levelKey: "I" | "II" | "III" | "IV") => {
        // ใช้ i18n key แทนฮาร์ดโค้ด
        return t(`skillDetail.levelNames.${levelKey}`);
    };

    return (
        <Card className="hover:shadow-md transition-shadow rounded-xl">
        <CardContent className="p-3 md:p-4 mt-3 md:-mt-1">
            <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setExpanded(!expanded)}
            >
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                <IconComponent className="w-5 h-5 md:w-6 md:h-6 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm md:text-base truncate">
                    {isTH ? subSkill.name_TH : subSkill.name_EN}
                </p>
                <p className="text-xs md:text-sm text-gray-600 truncate">
                    {isTH ? subSkill.name_EN : subSkill.name_TH}
                </p>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                <Badge
                className={`${getLevelColor(
                    subSkill.currentLevel
                )} text-[10px] md:text-xs px-1.5 md:px-2`}
                >
                {t("skillDetail.lv")} {subSkill.currentLevel || 0}
                </Badge>

                <div className="flex items-center gap-0.5 md:gap-1">
                <LucideIcons.Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-xs md:text-sm">
                    {subSkill.totalStars}
                </span>
                </div>
            </div>
            </div>

            {expanded && (
            <div className="mt-3 md:mt-4 space-y-2 md:space-y-3 pt-3 md:pt-4 border-t">
                {(["I", "II", "III", "IV"] as const).map((levelKey) => {
                const level = subSkill.levels[levelKey];
                const percentage = Math.min(
                    (level.exp / level.threshold) * 100,
                    100
                );
                const isFull = level.exp >= level.threshold;

                return (
                    <div key={levelKey} className="space-y-1.5 md:space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                        <Badge
                            variant="outline"
                            className="text-[10px] md:text-xs flex-shrink-0"
                        >
                            {t("skillDetail.lv")} {levelKey}
                        </Badge>

                        <span className="text-xs md:text-sm text-gray-600 truncate">
                            {getLevelName(levelKey)}
                        </span>

                        {!level.isUnlocked && (
                            <LucideIcons.Lock className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
                        )}
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                        <span className="text-[10px] md:text-sm text-gray-600 flex gap-1">
                            {level.exp} / {level.threshold}
                            <span className="text-[10px] md:text-sm text-yellow-600">
                            {t("skillDetail.exp")}
                            </span>
                        </span>

                        <div className="flex items-center gap-0.5 md:gap-1">
                            <LucideIcons.Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs md:text-sm font-semibold">
                            {level.stars}
                            </span>
                        </div>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="relative h-2.5 md:h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${
                            level.isUnlocked
                                ? isFull
                                ? "bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 shadow-lg shadow-cyan-400/50"
                                : "bg-gradient-to-r from-cyan-400 to-teal-400"
                                : "bg-gray-300"
                            }`}
                            style={{
                            width: `${level.isUnlocked ? percentage : 0}%`,
                            }}
                        />
                        {level.isUnlocked && isFull && (
                            <div
                            className="absolute inset-0 animate-shimmer"
                            style={{
                                background:
                                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                                backgroundSize: "200% 100%",
                            }}
                            />
                        )}
                        </div>

                        {!level.isUnlocked && level.exp > 0 && (
                        <div className="mt-1 text-[10px] md:text-xs text-orange-600 flex items-center gap-1">
                            <LucideIcons.Lock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            <span>
                            {t("skillDetail.pendingUnlock", {
                                exp: level.exp,
                                stars: Math.floor(level.exp / level.threshold),
                            })}
                            </span>
                        </div>
                        )}

                        {level.isUnlocked && !isFull && (
                        <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                            {t("skillDetail.toNextStar", {
                            exp: level.expToNextStar,
                            })}
                        </p>
                        )}

                        {level.isUnlocked && isFull && (
                        <p className="text-[10px] md:text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                            <LucideIcons.CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            {t("skillDetail.full")}
                        </p>
                        )}
                    </div>
                    </div>
                );
                })}
            </div>
            )}
        </CardContent>

        <style>{`
            @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
            }
            .animate-shimmer {
            animation: shimmer 2s infinite linear;
            }
        `}</style>
        </Card>
    );
};

export default SkillDetailView;
