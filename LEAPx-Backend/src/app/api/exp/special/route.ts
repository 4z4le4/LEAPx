import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withSkillAdminAuth, withUserAuth, getUserId } from "@/middleware/auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

interface AddSpecialSkillExpRequest {
    user_id: number;
    specialSkill_id: number;
    expChange: number; 
    reason_TH: string;
    reason_EN: string;
    actionType: 'EVENT_REWARD' | 'BONUS' | 'DISCIPLINE_PENALTY' | 'LATE_PENALTY' | 'ABSENCE_PENALTY' | 'MANUAL_ADJUSTMENT' | 'OTHER';
    event_id?: number;
    note?: string;
}

interface SpecialSkillConfig {
    expPerTier: number; 
    allowNegative: boolean; 
}


async function getSpecialSkillConfig(): Promise<SpecialSkillConfig> {
    // todo: อาจจะเก็บใน database (SystemSettings) แทน ไว้ค่อยกลับมาแก้
    return {
        expPerTier: 10, 
        allowNegative: true 
    };
}

function calculateTierFromExp(currentExp: number, expPerTier: number): {
    tier: number;
    tierProgress: number; 
    tierProgressPercentage: number;
} {
    if (currentExp >= 0) {
        const tier = Math.floor(currentExp / expPerTier);
        const tierProgress = currentExp % expPerTier;
        const tierProgressPercentage = (tierProgress / expPerTier) * 100;
        
        return {
            tier,
            tierProgress,
            tierProgressPercentage: Number(tierProgressPercentage.toFixed(2))
        };
    } else {
        // กรณี EXP ติดลบ
        const absTier = Math.floor(Math.abs(currentExp) / expPerTier);
        const absProgress = Math.abs(currentExp) % expPerTier;
        
        // ถ้ามีเศษ ต้องลดขั้นไปอีก 1
        const tier = absProgress > 0 ? -(absTier + 1) : -absTier;
        const tierProgress = absProgress > 0 ? expPerTier - absProgress : 0;
        const tierProgressPercentage = (tierProgress / expPerTier) * 100;
        
        return {
            tier,
            tierProgress,
            tierProgressPercentage: Number(tierProgressPercentage.toFixed(2))
        };
    }
}


function calculateExpToNextTier(currentExp: number, expPerTier: number): number {
    if (currentExp >= 0) {
        const remainder = currentExp % expPerTier;
        return expPerTier - remainder;
    } else {
        const remainder = Math.abs(currentExp) % expPerTier;
        return remainder === 0 ? expPerTier : remainder;
    }
}

export async function POST(req: NextRequest) {
    return withSkillAdminAuth(req, async (req: NextRequest) => {
        try {
            const adminUserId = getUserId(req);
            const data: AddSpecialSkillExpRequest = await req.json();

            // Validate required fields
            if (!data.user_id || !data.specialSkill_id || data.expChange === undefined || !data.actionType) {
                const response = NextResponse.json(
                    { error: "Missing required fields: user_id, specialSkill_id, expChange, actionType" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            if( data.actionType !== 'EVENT_REWARD' && data.actionType !== 'BONUS' &&
                data.actionType !== 'DISCIPLINE_PENALTY' && data.actionType !== 'LATE_PENALTY' &&
                data.actionType !== 'ABSENCE_PENALTY' && data.actionType !== 'MANUAL_ADJUSTMENT' && data.actionType !== 'OTHER'
            ) {
                const response = NextResponse.json(
                    { error: "Invalid actionType value" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // Validate expChange is not zero
            if (data.expChange === 0) {
                const response = NextResponse.json(
                    { error: "expChange cannot be zero" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // Check if user and specialSkill exist
            const user = await prisma.user.findUnique({ where: { id: data.user_id } });
            const specialSkill = await prisma.specialSkill.findUnique({
                where: { id: data.specialSkill_id }
            });

            if (!user) {
                const response = NextResponse.json({ error: "User not found" }, { status: 404 });
                return addCorsHeaders(response, req);
            }

            if (!specialSkill) {
                const response = NextResponse.json({ error: "Special skill not found" }, { status: 404 });
                return addCorsHeaders(response, req);
            }

            // Get config
            const config = await getSpecialSkillConfig();

            // Get current level or create new
            const currentUserLevel = await prisma.userSpecialSkillLevel.findUnique({
                where: {
                    user_id_specialSkill_id: {
                        user_id: data.user_id,
                        specialSkill_id: data.specialSkill_id
                    }
                }
            });

            const previousExp = currentUserLevel?.currentExp || 0;
            const previousLevel = currentUserLevel?.currentLevel || 0;
            const previousPositiveActions = currentUserLevel?.positiveActions || 0;
            const previousNegativeActions = currentUserLevel?.negativeActions || 0;
            const previousMaxLevelReached = currentUserLevel?.maxLevelReached || 0;

            let newExp = previousExp + data.expChange;

            if (!config.allowNegative && newExp < 0) {
                newExp = 0;
            }

            const tierInfo = calculateTierFromExp(newExp, config.expPerTier);
            const newLevel = tierInfo.tier;

            const isPositive = data.expChange > 0;
            const positiveActions = isPositive ? previousPositiveActions + 1 : previousPositiveActions;
            const negativeActions = !isPositive ? previousNegativeActions + 1 : previousNegativeActions;

            const isNewMaxLevel = newLevel > 0 && newLevel > previousMaxLevelReached;

            // Prepare update data
            const updateData = {
                currentExp: newExp,
                currentLevel: newLevel,
                positiveActions,
                negativeActions,
                maxLevelReached: isNewMaxLevel ? newLevel : previousMaxLevelReached,
                reachedMaxAt: (isNewMaxLevel && !currentUserLevel?.reachedMaxAt) 
                    ? new Date() 
                    : currentUserLevel?.reachedMaxAt,
                lastUpdated: new Date()
            };

            // Update or create user special skill level
            const updatedLevel = await prisma.userSpecialSkillLevel.upsert({
                where: {
                    user_id_specialSkill_id: {
                        user_id: data.user_id,
                        specialSkill_id: data.specialSkill_id
                    }
                },
                update: updateData,
                create: {
                    user_id: data.user_id,
                    specialSkill_id: data.specialSkill_id,
                    ...updateData
                }
            });

            // Create history record
            await prisma.specialSkillHistory.create({
                data: {
                    user_id: data.user_id,
                    specialSkill_id: data.specialSkill_id,
                    event_id: data.event_id,
                    expChange: data.expChange,
                    previousExp,
                    newExp,
                    previousLevel,
                    newLevel,
                    reason_TH: data.reason_TH,
                    reason_EN: data.reason_EN,
                    actionType: data.actionType,
                    adjustedBy: adminUserId ? Number(adminUserId) : undefined,
                    note: data.note || "LEAPx AutoBot System"
                }
            });

            // Generate messages
            const messages: string[] = [];
            const messages_EN: string[] = [];

            if (data.expChange > 0) {
                messages.push(`ได้รับ ${data.expChange} EXP สำหรับ ${specialSkill.name_TH}`);
                messages_EN.push(`Received ${data.expChange} EXP for ${specialSkill.name_EN}`);
            } else {
                messages.push(`ถูกหัก ${Math.abs(data.expChange)} EXP จาก ${specialSkill.name_TH}`);
                messages_EN.push(`Deducted ${Math.abs(data.expChange)} EXP from ${specialSkill.name_EN}`);
            }

            messages.push(`   EXP: ${previousExp} → ${newExp}`);
            messages_EN.push(`   EXP: ${previousExp} → ${newExp}`);

            // แสดงการเปลี่ยนแปลงขั้น
            if (newLevel > previousLevel) {
                const tierGained = newLevel - previousLevel;
                messages.push(`ขึ้นขั้น ${tierGained} ขั้น! (ขั้น ${previousLevel} → ขั้น ${newLevel})`);
                messages_EN.push(`Tier Up ${tierGained} tier(s)! (Tier ${previousLevel} → Tier ${newLevel})`);
            } else if (newLevel < previousLevel) {
                const tierLost = previousLevel - newLevel;
                messages.push(`ลดขั้น ${tierLost} ขั้น (ขั้น ${previousLevel} → ขั้น ${newLevel})`);
                messages_EN.push(`Tier Down ${tierLost} tier(s) (Tier ${previousLevel} → Tier ${newLevel})`);
            } else {
                messages.push(`   ขั้นปัจจุบัน: ขั้น ${newLevel}`);
                messages_EN.push(`   Current Tier: Tier ${newLevel}`);
            }

            // แสดงความคืบหน้าในขั้นปัจจุบัน
            const expToNext = calculateExpToNextTier(newExp, config.expPerTier);
            if (newExp >= 0) {
                messages.push(`ความคืบหน้า: ${tierInfo.tierProgress}/${config.expPerTier} (${tierInfo.tierProgressPercentage}%)`);
                messages.push(`ต้องการอีก ${expToNext} EXP เพื่อขึ้นขั้นถัดไป`);
                messages_EN.push(`Progress: ${tierInfo.tierProgress}/${config.expPerTier} (${tierInfo.tierProgressPercentage}%)`);
                messages_EN.push(`Need ${expToNext} EXP to next tier`);
            } else {
                messages.push(`ความคืบหน้า: ${tierInfo.tierProgress}/${config.expPerTier} (${tierInfo.tierProgressPercentage}%)`);
                messages.push(`ต้องการอีก ${expToNext} EXP เพื่อกลับขั้น ${newLevel + 1}`);
                messages_EN.push(`Progress: ${tierInfo.tierProgress}/${config.expPerTier} (${tierInfo.tierProgressPercentage}%)`);
                messages_EN.push(`Need ${expToNext} EXP to reach Tier ${newLevel + 1}`);
            }

            let successMessage = '';
            if (newLevel > previousLevel) {
                successMessage = `ขึ้นเป็นขั้น ${newLevel}!`;
            } else if (newLevel < previousLevel) {
                successMessage = `ลดเหลือขั้น ${newLevel}`;
            } else if (data.expChange > 0) {
                successMessage = 'เพิ่ม EXP สำเร็จ';
            } else {
                successMessage = 'หัก EXP สำเร็จ';
            }

            const response = NextResponse.json({
                success: true,
                message: successMessage,
                data: {
                    specialSkill: {
                        id: specialSkill.id,
                        name_TH: specialSkill.name_TH,
                        name_EN: specialSkill.name_EN,
                        slug: specialSkill.slug,
                        icon: specialSkill.icon,
                        category: specialSkill.category
                    },
                    updatedLevel: {
                        currentExp: updatedLevel.currentExp,
                        currentLevel: updatedLevel.currentLevel,
                        positiveActions: updatedLevel.positiveActions,
                        negativeActions: updatedLevel.negativeActions,
                        maxLevelReached: updatedLevel.maxLevelReached,
                        reachedMaxAt: updatedLevel.reachedMaxAt
                    },
                    changes: {
                        expChange: data.expChange,
                        tierChange: newLevel - previousLevel,
                        previousExp,
                        newExp,
                        previousTier: previousLevel,
                        newTier: newLevel,
                        isTierUp: newLevel > previousLevel,
                        isTierDown: newLevel < previousLevel
                    },
                    progress: {
                        tierProgress: tierInfo.tierProgress,
                        expPerTier: config.expPerTier,
                        progressPercentage: tierInfo.tierProgressPercentage,
                        expToNextTier: expToNext,
                        isNegative: newExp < 0
                    },
                    logs: messages,
                    logs_EN: messages_EN
                }
            });
            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Add special skill experience error:", error);
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
            const specialSkillId = searchParams.get('specialSkillId');
            const format = searchParams.get('format'); // 'summary' | 'detailed'
            const includeHistory = searchParams.get('includeHistory') === 'true';

            if (!userId) {
                const response = NextResponse.json(
                    { error: "Missing required parameter: userId" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const config = await getSpecialSkillConfig();

            const allSpecialSkills = await prisma.specialSkill.findMany({
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' }
            });

            const whereClause: Record<string, unknown> = {
                user_id: Number(userId)
            };

            if (specialSkillId) {
                whereClause.specialSkill_id = parseInt(specialSkillId);
            }

            const userLevels = await prisma.userSpecialSkillLevel.findMany({
                where: whereClause,
                include: {
                    specialSkill: true
                },
                orderBy: [
                    { specialSkill: { sortOrder: 'asc' } }
                ]
            });

            const userLevelsMap = userLevels.reduce((acc, level) => {
                acc[level.specialSkill_id] = level;
                return acc;
            }, {} as Record<number, typeof userLevels[0]>);

            const summary = allSpecialSkills.map(skill => {
                const userLevel = userLevelsMap[skill.id];

                if (!userLevel) {
                    return {
                        id: skill.id,
                        name_TH: skill.name_TH,
                        name_EN: skill.name_EN,
                        slug: skill.slug,
                        icon: skill.icon,
                        category: skill.category,
                        currentExp: 0,
                        currentTier: 0,
                        maxTierReached: 0,
                        positiveActions: 0,
                        negativeActions: 0,
                        isNegative: false,
                        progress: {
                            tierProgress: 0,
                            expPerTier: config.expPerTier,
                            progressPercentage: 0,
                            expToNextTier: config.expPerTier
                        }
                    };
                }

                const tierInfo = calculateTierFromExp(userLevel.currentExp, config.expPerTier);
                const expToNext = calculateExpToNextTier(userLevel.currentExp, config.expPerTier);

                return {
                    id: skill.id,
                    name_TH: skill.name_TH,
                    name_EN: skill.name_EN,
                    slug: skill.slug,
                    icon: skill.icon,
                    category: skill.category,
                    currentExp: userLevel.currentExp,
                    currentTier: userLevel.currentLevel,
                    maxTierReached: userLevel.maxLevelReached,
                    positiveActions: userLevel.positiveActions,
                    negativeActions: userLevel.negativeActions,
                    reachedMaxAt: userLevel.reachedMaxAt,
                    isNegative: userLevel.currentExp < 0,
                    progress: {
                        tierProgress: tierInfo.tierProgress,
                        expPerTier: config.expPerTier,
                        progressPercentage: tierInfo.tierProgressPercentage,
                        expToNextTier: expToNext
                    }
                };
            });

            const overall = {
                totalSpecialSkills: allSpecialSkills.length,
                skillsStarted: userLevels.length,
                averageTier: userLevels.length > 0 
                    ? Number((userLevels.reduce((sum, l) => sum + l.currentLevel, 0) / userLevels.length).toFixed(2))
                    : 0,
                maxTierReached: Math.max(...userLevels.map(l => l.maxLevelReached), 0),
                totalPositiveActions: userLevels.reduce((sum, l) => sum + l.positiveActions, 0),
                totalNegativeActions: userLevels.reduce((sum, l) => sum + l.negativeActions, 0),
                totalExp: userLevels.reduce((sum, l) => sum + l.currentExp, 0),
                skillsWithNegativeExp: userLevels.filter(l => l.currentExp < 0).length
            };

            if (format === 'summary') {
                const response = NextResponse.json({
                    success: true,
                    data: {
                        summary,
                        overall,
                        config: {
                            expPerTier: config.expPerTier,
                            allowNegative: config.allowNegative
                        }
                    }
                });
                return addCorsHeaders(response, req);
            }

            const detailedData = await Promise.all(summary.map(async (skillSummary) => {
                const userLevel = userLevelsMap[skillSummary.id];
                
                if (!userLevel || !includeHistory) {
                    return {
                        ...skillSummary,
                        history: []
                    };
                }

                const history = await prisma.specialSkillHistory.findMany({
                    where: {
                        user_id: Number(userId),
                        specialSkill_id: skillSummary.id
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 20 
                });

                return {
                    ...skillSummary,
                    history: history.map(h => ({
                        id: h.id,
                        expChange: h.expChange,
                        previousExp: h.previousExp,
                        newExp: h.newExp,
                        previousTier: h.previousLevel,
                        newTier: h.newLevel,
                        reason_TH: h.reason_TH,
                        reason_EN: h.reason_EN,
                        actionType: h.actionType,
                        event_id: h.event_id,
                        note: h.note,
                        createdAt: h.createdAt
                    }))
                };
            }));

            const response = NextResponse.json({
                success: true,
                data: {
                    overall,
                    summary,
                    detailed: detailedData,
                    config: {
                        expPerTier: config.expPerTier,
                        allowNegative: config.allowNegative
                    }
                }
            });
            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Get special skill levels error:", error);
            const response = NextResponse.json(
                { error: "Failed to fetch special skill levels" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}
