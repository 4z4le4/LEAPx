import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AddExpRequest, LevelThresholds, SubSkillLevel } from "@/types/expType";
import { withSkillAdminAuth, withUserAuth, getUserId } from "@/middleware/auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

async function getLevelThresholds(): Promise<LevelThresholds> {
    const thresholds = await prisma.levelThreshold.findMany({
        orderBy: { sortOrder: 'asc' }
    });

    const thresholdMap: LevelThresholds = {
        I: 8,
        II: 16,
        III: 32,
        IV: 64
    };

    thresholds.forEach(threshold => {
        if (threshold.levelType in thresholdMap) {
            thresholdMap[threshold.levelType as keyof LevelThresholds] = threshold.expRequired;
        }
    });

    return thresholdMap;
}

function calculateMaxLevel(subSkillLevel: SubSkillLevel): number {
    if (subSkillLevel.Level_IV_stars > 0) return 4;
    if (subSkillLevel.Level_III_stars > 0) return 3;
    if (subSkillLevel.Level_II_stars > 0) return 2;
    if (subSkillLevel.Level_I_stars > 0) return 1;
    return 0;
}

function isLevelUnlocked(
    targetLevel: 'I' | 'II' | 'III' | 'IV',
    currentData: {
        Level_I_stars: number;
        Level_II_stars: number;
        Level_III_stars: number;
        Level_IV_stars: number;
    }
): boolean {
    switch (targetLevel) {
        case 'I':
            return true; 
        case 'II':
            return currentData.Level_I_stars > 0;
        case 'III':
            return currentData.Level_II_stars > 0;
        case 'IV':
            return currentData.Level_III_stars > 0;
        default:
            return false;
    }
}


function calculateStars(exp: number, threshold: number, isUnlocked: boolean): number {
    if (!isUnlocked) return 0; 
    return Math.floor(exp / threshold);
}


function addExpToLevel(
    targetLevel: 'I' | 'II' | 'III' | 'IV',
    expAmount: number,
    currentData: {
        Level_I_stars: number;
        Level_II_stars: number;
        Level_III_stars: number;
        Level_IV_stars: number;
        Level_I_exp: number;
        Level_II_exp: number;
        Level_III_exp: number;
        Level_IV_exp: number;
    },
    thresholds: LevelThresholds
): {
    Level_I_exp: number;
    Level_II_exp: number;
    Level_III_exp: number;
    Level_IV_exp: number;
    Level_I_stars: number;
    Level_II_stars: number;
    Level_III_stars: number;
    Level_IV_stars: number;
    distributionLog: string[];
    distributionLog_EN: string[];
} {
    const result = { ...currentData };
    const distributionLog: string[] = [];
    const distributionLog_EN: string[] = [];

    const levelKey = `Level_${targetLevel}_exp` as keyof typeof result;
    const starsKey = `Level_${targetLevel}_stars` as keyof typeof result;
    const threshold = thresholds[targetLevel];

    const oldExp = result[levelKey] as number;
    const oldStars = result[starsKey] as number;

    // เพิ่ม EXP เสมอ (ไม่สนว่าปลดล็อคหรือยัง)
    const newExp = oldExp + expAmount;
    result[levelKey] = newExp;

    // ตรวจสอบว่า Level นี้ปลดล็อคแล้วหรือยัง
    const unlocked = isLevelUnlocked(targetLevel, currentData);

    // คำนวณดาวเฉพาะเมื่อปลดล็อคแล้ว
    const newStars = calculateStars(newExp, threshold, unlocked);
    result[starsKey] = newStars;

    const starsGained = newStars - oldStars;
    const remainingExp = newExp % threshold;
    const potentialStars = Math.floor(newExp / threshold); 

    // Log
    if (unlocked) {
        // Level ปลดล็อคแล้ว
        distributionLog.push(`Level ${targetLevel}: ได้รับ ${expAmount} EXP (ปลดล็อคแล้ว)`);
        distributionLog.push(`EXP: ${oldExp} → ${newExp} (${remainingExp}/${threshold})`);
        
        if (starsGained > 0) {
            distributionLog.push(`⭐ ได้ดาว ${starsGained} ดาว! (รวม ${newStars} ดาว)`);
        } else {
            distributionLog.push(`ดาวปัจจุบัน: ${newStars} ดาว`);
        }

        distributionLog_EN.push(`Level ${targetLevel}: Received ${expAmount} EXP (Unlocked)`);
        distributionLog_EN.push(`EXP: ${oldExp} → ${newExp} (${remainingExp}/${threshold})`);
        
        if (starsGained > 0) {
            distributionLog_EN.push(`⭐ Gained ${starsGained} star(s)! (Total: ${newStars})`);
        } else {
            distributionLog_EN.push(`Current stars: ${newStars}`);
        }
    } else {
        // Level ยังไม่ปลดล็อค - เก็บ EXP ไว้
        const prerequisiteLevel = targetLevel === 'II' ? 'I' : targetLevel === 'III' ? 'II' : targetLevel === 'IV' ? 'III' : null;
        
        distributionLog.push(`Level ${targetLevel}: ได้รับ ${expAmount} EXP (ยังไม่ปลดล็อค)`);
        distributionLog.push(`EXP: ${oldExp} → ${newExp} (เก็บสะสมไว้)`);
        distributionLog.push(`ต้องมี Level ${prerequisiteLevel} อย่างน้อย 1 ดาวก่อน`);
        distributionLog.push(`เมื่อปลดล็อค จะได้ ${potentialStars} ดาวทันที`);

        distributionLog_EN.push(`Level ${targetLevel}: Received ${expAmount} EXP (Locked)`);
        distributionLog_EN.push(`EXP: ${oldExp} → ${newExp} (Stored)`);
        distributionLog_EN.push(`Requires Level ${prerequisiteLevel} to have at least 1 star`);
        distributionLog_EN.push(`Will get ${potentialStars} star(s) when unlocked`);
    }

    return {
        Level_I_exp: result.Level_I_exp,
        Level_II_exp: result.Level_II_exp,
        Level_III_exp: result.Level_III_exp,
        Level_IV_exp: result.Level_IV_exp,
        Level_I_stars: result.Level_I_stars,
        Level_II_stars: result.Level_II_stars,
        Level_III_stars: result.Level_III_stars,
        Level_IV_stars: result.Level_IV_stars,
        distributionLog,
        distributionLog_EN
    };
}

function recalculateStarsAfterUnlock(
    currentData: {
        Level_I_stars: number;
        Level_II_stars: number;
        Level_III_stars: number;
        Level_IV_stars: number;
        Level_I_exp: number;
        Level_II_exp: number;
        Level_III_exp: number;
        Level_IV_exp: number;
    },
    thresholds: LevelThresholds
): {
    Level_I_stars: number;
    Level_II_stars: number;
    Level_III_stars: number;
    Level_IV_stars: number;
    unlockMessages: string[];
    unlockMessages_EN: string[];
} {
    const result = {
        Level_I_stars: currentData.Level_I_stars,
        Level_II_stars: currentData.Level_II_stars,
        Level_III_stars: currentData.Level_III_stars,
        Level_IV_stars: currentData.Level_IV_stars,
    };
    const unlockMessages: string[] = [];
    const unlockMessages_EN: string[] = [];

    // เช็ค Level II
    if (currentData.Level_I_stars > 0 && currentData.Level_II_stars === 0 && currentData.Level_II_exp > 0) {
        const newStars = Math.floor(currentData.Level_II_exp / thresholds.II);
        if (newStars > 0) {
            result.Level_II_stars = newStars;
            unlockMessages.push(`Level II ปลดล็อคแล้ว! ได้ดาวทันที ${newStars} ดาว (จาก EXP ที่สะสมไว้ ${currentData.Level_II_exp})`);
            unlockMessages_EN.push(`Level II Unlocked! Instantly gained ${newStars} star(s) (from stored ${currentData.Level_II_exp} EXP)`);
        }
    }

    // เช็ค Level III
    if (result.Level_II_stars > 0 && currentData.Level_III_stars === 0 && currentData.Level_III_exp > 0) {
        const newStars = Math.floor(currentData.Level_III_exp / thresholds.III);
        if (newStars > 0) {
            result.Level_III_stars = newStars;
            unlockMessages.push(`Level III ปลดล็อคแล้ว! ได้ดาวทันที ${newStars} ดาว (จาก EXP ที่สะสมไว้ ${currentData.Level_III_exp})`);
            unlockMessages_EN.push(`Level III Unlocked! Instantly gained ${newStars} star(s) (from stored ${currentData.Level_III_exp} EXP)`);
        }
    }

    // เช็ค Level IV
    if (result.Level_III_stars > 0 && currentData.Level_IV_stars === 0 && currentData.Level_IV_exp > 0) {
        const newStars = Math.floor(currentData.Level_IV_exp / thresholds.IV);
        if (newStars > 0) {
            result.Level_IV_stars = newStars;
            unlockMessages.push(`Level IV ปลดล็อคแล้ว! ได้ดาวทันที ${newStars} ดาว (จาก EXP ที่สะสมไว้ ${currentData.Level_IV_exp})`);
            unlockMessages_EN.push(`Level IV Unlocked! Instantly gained ${newStars} star(s) (from stored ${currentData.Level_IV_exp} EXP)`);
        }
    }

    return {
        ...result,
        unlockMessages,
        unlockMessages_EN
    };
}

// Update main skill level based on sub skills
async function updateMainSkillLevel(user_id: number, mainSkillCategory_id: number): Promise<void> {
    const subSkills = await prisma.userSubSkillLevel.findMany({
        where: {
            user_id,
            subSkillCategory: {
                mainSkillCategory_id,
                isActive: true
            }
        }
    });

    if (subSkills.length === 0) return;

    const maxLevel = Math.max(...subSkills.map(calculateMaxLevel));
    const averageLevel = subSkills.reduce((sum, skill) => sum + calculateMaxLevel(skill), 0) / subSkills.length;
    const totalExp = subSkills.reduce((sum, skill) => sum + skill.totalExp, 0);
    const totalStars = subSkills.reduce((sum, skill) => 
        sum + skill.Level_I_stars + skill.Level_II_stars + skill.Level_III_stars + skill.Level_IV_stars, 0);

    const levelCounts = {
        Level_I_count: subSkills.filter(s => s.Level_I_stars > 0).length,
        Level_II_count: subSkills.filter(s => s.Level_II_stars > 0).length,
        Level_III_count: subSkills.filter(s => s.Level_III_stars > 0).length,
        Level_IV_count: subSkills.filter(s => s.Level_IV_stars > 0).length,
    };

    await prisma.userMainSkillLevel.upsert({
        where: {
            user_id_mainSkillCategory_id: {
                user_id,
                mainSkillCategory_id
            }
        },
        update: {
            maxLevel,
            averageLevel,
            totalExp,
            totalStars,
            ...levelCounts,
            lastCalculated: new Date()
        },
        create: {
            user_id,
            mainSkillCategory_id,
            maxLevel,
            averageLevel,
            totalExp,
            totalStars,
            ...levelCounts
        }
    });
}

export async function POST(req: NextRequest) {
    return withSkillAdminAuth(req, async (req: NextRequest) => {
        try {
            const userId = getUserId(req);
            const data: AddExpRequest = await req.json();

            // Validate required fields
            if (!data.user_id || !data.subSkillCategory_id || !data.levelType || !data.exp) {
                const response = NextResponse.json(
                    { error: "Missing required fields: user_id, subSkillCategory_id, levelType, exp" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // Validate levelType
            if (!['I', 'II', 'III', 'IV'].includes(data.levelType)) {
                const response = NextResponse.json(
                    { error: "Invalid levelType. Must be I, II, III, or IV" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // Validate exp is not zero
            if (data.exp === 0) {
                const response = NextResponse.json(
                    { error: "EXP cannot be zero" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // Check if user and subSkillCategory exist
            const user = await prisma.user.findUnique({ where: { id: data.user_id } });
            const subSkill = await prisma.subSkillCategory.findUnique({
                where: { id: data.subSkillCategory_id },
                include: { mainSkillCategory: true }
            });

            if (!user) {
                const response = NextResponse.json({ error: "User not found" }, { status: 404 });
                return addCorsHeaders(response, req);
            }

            if (!subSkill) {
                const response = NextResponse.json({ error: "Sub skill category not found" }, { status: 404 });
                return addCorsHeaders(response, req);
            }

            // Get level thresholds
            const thresholds = await getLevelThresholds();

            // Get or create user sub skill level
            const currentLevel = await prisma.userSubSkillLevel.findUnique({
                where: {
                    user_id_subSkillCategory_id: {
                        user_id: data.user_id,
                        subSkillCategory_id: data.subSkillCategory_id
                    }
                }
            });

            let previousData = {
                Level_I_exp: 0,
                Level_II_exp: 0,
                Level_III_exp: 0,
                Level_IV_exp: 0,
                Level_I_stars: 0,
                Level_II_stars: 0,
                Level_III_stars: 0,
                Level_IV_stars: 0,
                totalExp: 0
            };

            if (currentLevel) {
                previousData = {
                    Level_I_exp: currentLevel.Level_I_exp,
                    Level_II_exp: currentLevel.Level_II_exp,
                    Level_III_exp: currentLevel.Level_III_exp,
                    Level_IV_exp: currentLevel.Level_IV_exp,
                    Level_I_stars: currentLevel.Level_I_stars,
                    Level_II_stars: currentLevel.Level_II_stars,
                    Level_III_stars: currentLevel.Level_III_stars,
                    Level_IV_stars: currentLevel.Level_IV_stars,
                    totalExp: currentLevel.totalExp
                };
            }

            // เพิ่ม EXP (เก็บไว้เสมอ แม้ยังไม่ปลดล็อค)
            const distributionResult = addExpToLevel(
                data.levelType,
                data.exp,
                previousData,
                thresholds
            );

            // เช็คว่ามีการปลดล็อค Level ใหม่หรือไม่ (จากดาวที่ได้ใหม่)
            const unlockResult = recalculateStarsAfterUnlock(
                distributionResult,
                thresholds
            );

            // Update ดาวที่ได้จากการปลดล็อค
            distributionResult.Level_II_stars = unlockResult.Level_II_stars;
            distributionResult.Level_III_stars = unlockResult.Level_III_stars;
            distributionResult.Level_IV_stars = unlockResult.Level_IV_stars;

            // รวม unlock messages
            const allLogs = [...distributionResult.distributionLog, ...unlockResult.unlockMessages];
            const allLogs_EN = [...distributionResult.distributionLog_EN, ...unlockResult.unlockMessages_EN];

            // คำนวณ current level (ระดับสูงสุดที่มีดาว)
            const currentLevelValue = Math.max(
                distributionResult.Level_IV_stars > 0 ? 4 : 0,
                distributionResult.Level_III_stars > 0 ? 3 : 0,
                distributionResult.Level_II_stars > 0 ? 2 : 0,
                distributionResult.Level_I_stars > 0 ? 1 : 0
            );

            // Prepare update data
            const updateData = {
                Level_I_exp: distributionResult.Level_I_exp,
                Level_II_exp: distributionResult.Level_II_exp,
                Level_III_exp: distributionResult.Level_III_exp,
                Level_IV_exp: distributionResult.Level_IV_exp,
                Level_I_stars: distributionResult.Level_I_stars,
                Level_II_stars: distributionResult.Level_II_stars,
                Level_III_stars: distributionResult.Level_III_stars,
                Level_IV_stars: distributionResult.Level_IV_stars,
                totalExp: previousData.totalExp + data.exp,
                currentLevel: currentLevelValue
            };

            // Check for level ups
            const levelUps = {
                Level_I: distributionResult.Level_I_stars > previousData.Level_I_stars,
                Level_II: distributionResult.Level_II_stars > previousData.Level_II_stars,
                Level_III: distributionResult.Level_III_stars > previousData.Level_III_stars,
                Level_IV: distributionResult.Level_IV_stars > previousData.Level_IV_stars
            };

            const starsGained = {
                Level_I: distributionResult.Level_I_stars - previousData.Level_I_stars,
                Level_II: distributionResult.Level_II_stars - previousData.Level_II_stars,
                Level_III: distributionResult.Level_III_stars - previousData.Level_III_stars,
                Level_IV: distributionResult.Level_IV_stars - previousData.Level_IV_stars
            };

            // Update user sub skill level
            const updatedLevel = await prisma.userSubSkillLevel.upsert({
                where: {
                    user_id_subSkillCategory_id: {
                        user_id: data.user_id,
                        subSkillCategory_id: data.subSkillCategory_id
                    }
                },
                update: updateData,
                create: {
                    user_id: data.user_id,
                    subSkillCategory_id: data.subSkillCategory_id,
                    ...updateData
                }
            });

            // Log experience history
            await prisma.experienceHistory.create({
                data: {
                    user_id: data.user_id,
                    subSkillCategory_id: data.subSkillCategory_id,
                    activity_id: Number(userId) || 99999999,
                    experienceGained: data.exp,
                    reason_TH: data.reason_TH + ` | ${allLogs.join(' | ')}`,
                    reason_EN: data.reason_EN + ` | ${allLogs_EN.join(' | ')}`,
                    type: data.type,
                    previousLevel: calculateMaxLevel(previousData),
                    newLevel: updatedLevel.currentLevel,
                    previousExp: previousData.totalExp,
                    newExp: updatedLevel.totalExp,
                }
            });

            // Update main skill level
            await updateMainSkillLevel(data.user_id, subSkill.mainSkillCategory.id);

            // Create success message
            const levelUpMessages: string[] = [];
            Object.entries(levelUps).forEach(([level, hasLevelUp]) => {
                if (hasLevelUp) {
                    const starsCount = starsGained[level as keyof typeof starsGained];
                    levelUpMessages.push(`Level ${level.replace('Level_', '')}: +${starsCount} ⭐`);
                }
            });

            const hasUnlocks = unlockResult.unlockMessages.length > 0;
            const successMessage = hasUnlocks
                ? `ปลดล็อค Level ใหม่! ${levelUpMessages.join(', ')}`
                : levelUpMessages.length > 0 
                ? `${levelUpMessages.join(', ')}`
                : 'EXP ถูกบันทึกแล้ว';

            const response = NextResponse.json({
                success: true,
                message: successMessage,
                data: {
                    name_TH: subSkill.name_TH,
                    name_EN: subSkill.name_EN,
                    updatedLevel,
                    levelUps,
                    starsGained,
                    distributionLog: allLogs,
                    distributionLog_EN: allLogs_EN,
                    hasUnlocks,
                    expToNextStar: {
                        Level_I: thresholds.I - (distributionResult.Level_I_exp % thresholds.I),
                        Level_II: thresholds.II - (distributionResult.Level_II_exp % thresholds.II),
                        Level_III: thresholds.III - (distributionResult.Level_III_exp % thresholds.III),
                        Level_IV: thresholds.IV - (distributionResult.Level_IV_exp % thresholds.IV)
                    }
                }
            });
            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Add experience error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            const response = NextResponse.json(
                { error: errorMessage },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}

export async function GET(req: NextRequest) {
    return withUserAuth(req, async (req: NextRequest) => {
        try {
            const { searchParams } = new URL(req.url);
            const userId = getUserId(req);
            const mainSkillId = searchParams.get('mainSkillId');
            const subSkillId = searchParams.get('subSkillId');
            const format = searchParams.get('format'); // 'summary' | 'detailed'

            if (!userId) {
                const response = NextResponse.json(
                    { error: "Missing required parameter: userId" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const allMainSkills = await prisma.mainSkillCategory.findMany({
                where: { isActive: true },
                orderBy: { sortOrder: 'desc' }
            });

            const whereClause: Record<string, unknown> = {
                user_id: Number(userId)
            };

            if (subSkillId) {
                whereClause.subSkillCategory_id = parseInt(subSkillId);
            } else if (mainSkillId) {
                whereClause.subSkillCategory = {
                    mainSkillCategory_id: parseInt(mainSkillId),
                    isActive: true
                };
            } else {
                whereClause.subSkillCategory = {
                    isActive: true
                };
            }

            const subSkillLevels = await prisma.userSubSkillLevel.findMany({
                where: whereClause,
                include: {
                    subSkillCategory: {
                        include: {
                            mainSkillCategory: true
                        }
                    }
                },
                orderBy: [
                    { subSkillCategory: { mainSkillCategory_id: 'asc' } },
                    { subSkillCategory: { sortOrder: 'asc' } }
                ]
            });

            const groupedByMainSkill = subSkillLevels.reduce((acc, subSkill) => {
                const mainId = subSkill.subSkillCategory.mainSkillCategory_id;
                if (!acc[mainId]) {
                    acc[mainId] = [];
                }
                acc[mainId].push(subSkill);
                return acc;
            }, {} as Record<number, typeof subSkillLevels>);

            const mainSkillsSummary = allMainSkills.map(mainSkill => {
                const subSkills = groupedByMainSkill[mainSkill.id] || [];
                
                if (subSkills.length === 0) {
                    return {
                        id: mainSkill.id,
                        name_TH: mainSkill.name_TH,
                        name_EN: mainSkill.name_EN,
                        slug: mainSkill.slug,
                        icon: mainSkill.icon,
                        color: mainSkill.color,
                        maxLevel: 0,
                        averageLevel: 0,
                        totalExp: 0,
                        totalStars: 0,
                        totalSubSkills: 0,
                        completedSubSkills: 0,
                        levelBreakdown: {
                            Level_I: 0,
                            Level_II: 0,
                            Level_III: 0,
                            Level_IV: 0
                        },
                        radarValue: 0 // 0-4
                    };
                }

                const maxLevel = Math.max(...subSkills.map(s => calculateMaxLevel(s)));

                const totalLevels = subSkills.reduce((sum, s) => sum + calculateMaxLevel(s), 0);
                const averageLevel = subSkills.length > 0 ? totalLevels / subSkills.length : 0;

                const totalExp = subSkills.reduce((sum, s) => sum + s.totalExp, 0);
                const totalStars = subSkills.reduce((sum, s) => 
                    sum + s.Level_I_stars + s.Level_II_stars + s.Level_III_stars + s.Level_IV_stars, 0);

                const levelBreakdown = {
                    Level_I: subSkills.filter(s => s.Level_I_stars > 0).length,
                    Level_II: subSkills.filter(s => s.Level_II_stars > 0).length,
                    Level_III: subSkills.filter(s => s.Level_III_stars > 0).length,
                    Level_IV: subSkills.filter(s => s.Level_IV_stars > 0).length
                };

                const completedSubSkills = subSkills.filter(s => s.totalExp > 0).length;

                return {
                    id: mainSkill.id,
                    name_TH: mainSkill.name_TH,
                    name_EN: mainSkill.name_EN,
                    slug: mainSkill.slug,
                    icon: mainSkill.icon,
                    color: mainSkill.color,
                    maxLevel, 
                    averageLevel: Number(averageLevel.toFixed(2)),
                    totalExp,
                    totalStars,
                    totalSubSkills: subSkills.length,
                    completedSubSkills,
                    levelBreakdown,

                    radarValue: maxLevel
                };
            });

            if (format === 'summary') {
                const response = NextResponse.json({
                    success: true,
                    data: {
                        summary: mainSkillsSummary,
                        radarData: mainSkillsSummary.map(skill => ({
                            skill: skill.name_EN,
                            skill_TH: skill.name_TH,
                            value: skill.radarValue,
                            maxLevel: skill.maxLevel,
                            color: skill.color
                        })),
                        overall: {
                            totalExp: mainSkillsSummary.reduce((sum, s) => sum + s.totalExp, 0),
                            totalStars: mainSkillsSummary.reduce((sum, s) => sum + s.totalStars, 0),
                            averageLevel: Number(
                                (mainSkillsSummary.reduce((sum, s) => sum + s.averageLevel, 0) / 
                                mainSkillsSummary.length).toFixed(2)
                            ),
                            maxLevel: Math.max(...mainSkillsSummary.map(s => s.maxLevel))
                        }
                    }
                });
                return addCorsHeaders(response, req);
            }

            const detailedData = mainSkillsSummary.map(mainSkillSummary => {
                const subSkills = groupedByMainSkill[mainSkillSummary.id] || [];
                
                return {
                    ...mainSkillSummary,
                    subSkills: subSkills.map(sub => ({
                        id: sub.id,
                        subSkillCategory_id: sub.subSkillCategory_id,
                        name_TH: sub.subSkillCategory.name_TH,
                        name_EN: sub.subSkillCategory.name_EN,
                        slug: sub.subSkillCategory.slug,
                        icon: sub.subSkillCategory.icon,
                        currentLevel: sub.currentLevel,
                        totalExp: sub.totalExp,
                        levels: {
                            I: {
                                exp: sub.Level_I_exp,
                                stars: sub.Level_I_stars,
                                isUnlocked: true,
                                progress: sub.Level_I_exp % 8, // remaining exp
                                threshold: 8
                            },
                            II: {
                                exp: sub.Level_II_exp,
                                stars: sub.Level_II_stars,
                                isUnlocked: sub.Level_I_stars > 0,
                                progress: sub.Level_II_exp % 16,
                                threshold: 16
                            },
                            III: {
                                exp: sub.Level_III_exp,
                                stars: sub.Level_III_stars,
                                isUnlocked: sub.Level_II_stars > 0,
                                progress: sub.Level_III_exp % 32,
                                threshold: 32
                            },
                            IV: {
                                exp: sub.Level_IV_exp,
                                stars: sub.Level_IV_stars,
                                isUnlocked: sub.Level_III_stars > 0,
                                progress: sub.Level_IV_exp % 64,
                                threshold: 64
                            }
                        },
                        totalStars: sub.Level_I_stars + sub.Level_II_stars + 
                                    sub.Level_III_stars + sub.Level_IV_stars
                    }))
                };
            });

            const response = NextResponse.json({
                success: true,
                data: {
                    summary: mainSkillsSummary,
                    detailed: detailedData,
                    radarData: mainSkillsSummary.map(skill => ({
                        skill: skill.name_EN,
                        skill_TH: skill.name_TH,
                        value: skill.radarValue,
                        maxLevel: skill.maxLevel,
                        color: skill.color
                    })),
                    overall: {
                        totalExp: mainSkillsSummary.reduce((sum, s) => sum + s.totalExp, 0),
                        totalStars: mainSkillsSummary.reduce((sum, s) => sum + s.totalStars, 0),
                        averageLevel: Number(
                            (mainSkillsSummary.reduce((sum, s) => sum + s.averageLevel, 0) / 
                            mainSkillsSummary.length).toFixed(2)
                        ),
                        maxLevel: Math.max(...mainSkillsSummary.map(s => s.maxLevel))
                    }
                }
            });
            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Get skill levels error:", error);
            const response = NextResponse.json(
                { error: "Failed to fetch skill levels" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}