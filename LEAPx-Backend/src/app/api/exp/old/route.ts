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

function calculateLevelProgress(currentExp: number, threshold: number): { stars: number, remainingExp: number } {
    const stars = Math.floor(currentExp / threshold);
    const remainingExp = currentExp % threshold;
    return { stars, remainingExp };
}

function calculateMaxLevel(subSkillLevel: SubSkillLevel): number {
    if (subSkillLevel.Level_IV_stars > 0) return 4;
    if (subSkillLevel.Level_III_stars > 0) return 3;
    if (subSkillLevel.Level_II_stars > 0) return 2;
    if (subSkillLevel.Level_I_stars > 0) return 1;
    return 0;
}

//* Distribute EXP with cascade logic
function distributeExpWithCascade(
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
    thresholds: { I: number; II: number; III: number; IV: number; }
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

    const addExpToLevel = (
        level: 'I' | 'II' | 'III' | 'IV',
        expToAdd: number,
        isCascade: boolean
    ): number => {
        const levelKey = `Level_${level}_exp` as keyof typeof result;
        const starsKey = `Level_${level}_stars` as keyof typeof result;
        const threshold = thresholds[level];
        const levelName = `Level ${level}`;
        
        const oldExp = result[levelKey] as number;
        const oldStars = result[starsKey] as number;
        
        // Calculate how much EXP is needed for the next star
        const expToNextStar = threshold - (oldExp % threshold);
        const expUsed = isCascade ? expToAdd : Math.min(expToAdd, expToNextStar);
        
        // console.log("expToAdd", expToAdd);
        // console.log("expToNextStar", expToNextStar);
        const overflow = Math.max(0, expToAdd - expUsed);
        
        // Update EXP and calculate new stars
        result[levelKey] = oldExp + expUsed;
        const newStars = Math.floor((result[levelKey] as number) / threshold);
        result[starsKey] = newStars;
        
        const starsGained = newStars - oldStars;
        
        if (expToAdd > 0) {
            distributionLog.push(`เพิ่ม ${expToAdd} EXP ให้ ${levelName} → ใช้ ${expUsed} EXP ได้ ${starsGained} ดาว เหลือเศษ ${overflow} EXP`);
            distributionLog_EN.push(`Added ${expToAdd} EXP to ${levelName} → Used ${expUsed} EXP to get ${starsGained} star(s), ${overflow} EXP overflow`);
        }
        return overflow;
    };

    distributionLog.push(`ได้รับ EXP: ${expAmount} สำหรับ Level ${targetLevel}`);
    distributionLog_EN.push(`Received EXP: ${expAmount} for Level ${targetLevel}`);

    const processCascade = (level: 'I' | 'II' | 'III' | 'IV', expToDistribute: number , isCascade: boolean): number => {
        switch (level) {
            case 'I':
                // Level I has no prerequisites, add directly
                return addExpToLevel('I', expToDistribute , isCascade ? false : true);

            case 'II':
                if (result.Level_I_stars > 0) {
                    // Level I has stars, can add to Level II directly
                    return addExpToLevel('II', expToDistribute , isCascade ? false : true);
                } else {
                    // Need to cascade to Level I first
                    const cascadeExp = Math.floor(expToDistribute / 2);
                    const remainingExp = expToDistribute - cascadeExp;
                    
                    distributionLog.push(`Level II ต้องการ Level I มีดาว → แบ่ง 50% (${cascadeExp}) ให้ Level I`);
                    distributionLog_EN.push(`Level II requires Level I to have at least 1 star → Distribute 50% (${cascadeExp}) to Level I`);
                    
                    // Process cascade to Level I
                    const overflowFromI = processCascade('I', cascadeExp , true);
                    
                    // Check if Level I now has stars after cascade
                    if (result.Level_I_stars > 0) {
                        // Level I has stars, but only use overflow for Level II
                        // The remaining EXP is discarded because it was already "spent" in the cascade process
                        if (overflowFromI > 0) {
                            distributionLog.push(`Level I มีดาวแล้ว → เพิ่ม ${overflowFromI} EXP (เศษ) ให้ Level II`);
                            distributionLog_EN.push(`Level I has stars → Added ${overflowFromI} EXP (overflow) to Level II`);
                            return addExpToLevel('II', overflowFromI , isCascade ? false : true);
                        }
                        if (remainingExp > 0) {
                            distributionLog.push(`${remainingExp} EXP สำหรับ Level II ถูกทิ้ง (ใช้ไปแล้วในการหัก)`);
                            distributionLog_EN.push(`${remainingExp} EXP for Level II is discarded (already used in cascade)`);
                        }
                        return 0;
                    } else {
                        // Level I still has no stars, discard remaining EXP for Level II
                        if (remainingExp > 0) {
                            distributionLog.push(`${remainingExp} EXP สำหรับ Level II ถูกทิ้ง (Level I ยังไม่มีดาว)`);
                            distributionLog_EN.push(`${remainingExp} EXP for Level II is discarded (Level I still has no stars)`);
                        }
                        return 0;
                    }
                }
                
            case 'III':
                if (result.Level_II_stars > 0) {
                    // Level II has stars, can add to Level III directly
                    return addExpToLevel('III', expToDistribute , true);
                } else {
                    // Need to cascade to Level II first
                    const cascadeExp = Math.floor(expToDistribute / 2);
                    const remainingExp = expToDistribute - cascadeExp;
                    
                    distributionLog.push(`Level III ต้องการ Level II มีดาว → แบ่ง 50% (${cascadeExp}) ให้ Level II`);
                    distributionLog_EN.push(`Level III requires Level II to have at least 1 star → Distribute 50% (${cascadeExp}) to Level II`);
                    
                    // Process cascade to Level II (which may further cascade to Level I)
                    const overflowFromII = processCascade('II', cascadeExp , true);
                    
                    // Check if Level II now has stars after cascade
                    if (result.Level_II_stars > 0) {
                        // Level II has stars, but only use overflow for Level III
                        // The remaining EXP is discarded because it was already "spent" in the cascade process
                        if (overflowFromII > 0) {
                            distributionLog.push(`Level II มีดาวแล้ว → เพิ่ม ${overflowFromII} EXP (เศษ) ให้ Level III`);
                            distributionLog_EN.push(`Level II has stars → Added ${overflowFromII} EXP (overflow) to Level III`);
                            return addExpToLevel('III', overflowFromII, false);
                        }
                        if (remainingExp > 0) {
                            distributionLog.push(`${remainingExp} EXP สำหรับ Level III ถูกทิ้ง (ใช้ไปแล้วในการหัก)`);
                            distributionLog_EN.push(`${remainingExp} EXP for Level III is discarded (already used in cascade)`);
                        }
                        return 0;
                    } else {
                        // Level II still has no stars, discard remaining EXP for Level III
                        if (remainingExp > 0) {
                            distributionLog.push(`${remainingExp} EXP สำหรับ Level III ถูกทิ้ง (Level II ยังไม่มีดาว)`);
                            distributionLog_EN.push(`${remainingExp} EXP for Level III is discarded (Level II still has no stars)`);
                        }
                        return 0;
                    }
                }
                
            case 'IV':
                if (result.Level_III_stars > 0) {
                    // Level III has stars, can add to Level IV directly
                    return addExpToLevel('IV', expToDistribute , true);
                } else {
                    // Need to cascade to Level III first
                    const cascadeExp = Math.floor(expToDistribute / 2);
                    const remainingExp = expToDistribute - cascadeExp;
                    
                    distributionLog.push(`Level IV ต้องการ Level III มีดาว → แบ่ง 50% (${cascadeExp}) ให้ Level III`);
                    distributionLog_EN.push(`Level IV requires Level III to have at least 1 star → Distribute 50% (${cascadeExp}) to Level III`);
                    
                    // Process cascade to Level III (which may further cascade to lower levels)
                    const overflowFromIII = processCascade('III', cascadeExp , isCascade ? false : true);
                    
                    // Check if Level III now has stars after cascade
                    if (result.Level_III_stars > 0) {
                        // Level III has stars, can add overflow + remaining to Level IV
                        const totalForIV = overflowFromIII ;
                        if (totalForIV > 0) {
                            distributionLog.push(`Level III มีดาวแล้ว → เพิ่ม ${totalForIV} EXP (${overflowFromIII} เศษ + ${remainingExp} เหลือ) ให้ Level IV`);
                            distributionLog_EN.push(`Level III has stars → Added ${totalForIV} EXP (${overflowFromIII} overflow + ${remainingExp} remaining) to Level IV`);
                            return addExpToLevel('IV', totalForIV , false);
                        }
                        return 0;
                    } else {
                        // Level III still has no stars, discard remaining EXP for Level IV
                        if (remainingExp > 0) {
                            distributionLog.push(`${remainingExp} EXP สำหรับ Level IV ถูกทิ้ง (Level III ยังไม่มีดาว)`);
                            distributionLog_EN.push(`${remainingExp} EXP for Level IV is discarded (Level III still has no stars)`);
                        }
                        return 0;
                    }
                }
                
            default:
                return 0;
        }
    };

    // Process the cascade starting from the target level
    processCascade(targetLevel, expAmount , false);

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

            // Apply cascade EXP distribution logic
            const distributionResult = distributeExpWithCascade(data.levelType, data.exp, previousData, thresholds);

            // Calculate new stars for each level
            const Level_I_stars = calculateLevelProgress(distributionResult.Level_I_exp, thresholds.I).stars;
            const Level_II_stars = calculateLevelProgress(distributionResult.Level_II_exp, thresholds.II).stars;
            const Level_III_stars = calculateLevelProgress(distributionResult.Level_III_exp, thresholds.III).stars;
            const Level_IV_stars = calculateLevelProgress(distributionResult.Level_IV_exp, thresholds.IV).stars;

            // Prepare update data
            const updateData = {
                Level_I_exp: distributionResult.Level_I_exp,
                Level_II_exp: distributionResult.Level_II_exp,
                Level_III_exp: distributionResult.Level_III_exp,
                Level_IV_exp: distributionResult.Level_IV_exp,
                Level_I_stars,
                Level_II_stars,
                Level_III_stars,
                Level_IV_stars,
                totalExp: previousData.totalExp + data.exp,
                currentLevel: 0
            };

            // Calculate new current level
            updateData.currentLevel = Math.max(
                Level_IV_stars > 0 ? 4 : 0,
                Level_III_stars > 0 ? 3 : 0,
                Level_II_stars > 0 ? 2 : 0,
                Level_I_stars > 0 ? 1 : 0
            );

            // Check for level ups across all levels
            const levelUps = {
                Level_I: Level_I_stars > previousData.Level_I_stars,
                Level_II: Level_II_stars > previousData.Level_II_stars,
                Level_III: Level_III_stars > previousData.Level_III_stars,
                Level_IV: Level_IV_stars > previousData.Level_IV_stars
            };

            const starsGained = {
                Level_I: Level_I_stars - previousData.Level_I_stars,
                Level_II: Level_II_stars - previousData.Level_II_stars,
                Level_III: Level_III_stars - previousData.Level_III_stars,
                Level_IV: Level_IV_stars - previousData.Level_IV_stars
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

            // Log experience history with cascade details
            await prisma.experienceHistory.create({
                data: {
                    user_id: data.user_id,
                    subSkillCategory_id: data.subSkillCategory_id,
                    activity_id: Number(userId) || 99999999,
                    experienceGained: data.exp,
                    reason_TH: data.reason_TH + ` (การแจกจ่าย: ${distributionResult.distributionLog.join('; ')})`,
                    reason_EN: data.reason_EN + ` (Distribution: ${distributionResult.distributionLog_EN.join('; ')})`,
                    type: data.type,
                    previousLevel: calculateMaxLevel(previousData),
                    newLevel: updatedLevel.currentLevel,
                    previousExp: previousData.totalExp,
                    newExp: updatedLevel.totalExp,
                }
            });

            // Update main skill level
            await updateMainSkillLevel(data.user_id, subSkill.mainSkillCategory.id);

            // Create level up messages
            const levelUpMessages: string[] = [];
            Object.entries(levelUps).forEach(([level, hasLevelUp]) => {
                if (hasLevelUp) {
                    const starsCount = starsGained[level as keyof typeof starsGained];
                    levelUpMessages.push(`Level ${level.replace('Level_', '')}: +${starsCount} ดาว`);
                }
            });

            const successMessage = levelUpMessages.length > 0 
                ? `Experience added successfully! ${levelUpMessages.join(', ')}`
                : 'Experience added successfully.';

            const response = NextResponse.json({
                success: true,
                message: successMessage,
                data: {
                    name_TH: subSkill.name_TH,
                    name_EN: subSkill.name_EN,
                    updatedLevel,
                    levelUps,
                    starsGained,
                    distributionLog: distributionResult.distributionLog,
                    distributionLog_EN: distributionResult.distributionLog_EN,
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

            if (!userId) {
                const response = NextResponse.json(
                    { error: "Missing required parameter: userId" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const whereClause: Record<string, unknown> = {
                user_id: Number(userId)
            };

            if (subSkillId) {
                whereClause.subSkillCategory_id = parseInt(subSkillId);
            } else if (mainSkillId) {
                whereClause.subSkillCategory = {
                    mainSkillCategory_id: parseInt(mainSkillId)
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

            const mainSkillLevels = mainSkillId ? 
                await prisma.userMainSkillLevel.findMany({
                    where: {
                        user_id: Number(userId),
                        mainSkillCategory_id: parseInt(mainSkillId)
                    },
                    include: {
                        mainSkillCategory: true
                    }
                }) : 
                await prisma.userMainSkillLevel.findMany({
                    where: { user_id: Number(userId) },
                    include: {
                        mainSkillCategory: true
                    }
                });

            const response = NextResponse.json({
                success: true,
                data: {
                    mainSkillLevels,
                    subSkillLevels
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