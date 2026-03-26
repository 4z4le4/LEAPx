import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ResetLevelRequest, SubSkillLevelData } from "@/types/expType";
import { withSkillAdminAuth } from "@/middleware/auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";

// Calculate max level from sub skill levels
function calculateMaxLevel(subSkillLevel: { Level_I_stars: number; Level_II_stars: number; Level_III_stars: number; Level_IV_stars: number }): number {
    if (subSkillLevel.Level_IV_stars > 0) return 4;
    if (subSkillLevel.Level_III_stars > 0) return 3;
    if (subSkillLevel.Level_II_stars > 0) return 2;
    if (subSkillLevel.Level_I_stars > 0) return 1;
    return 0;
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

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function POST(req: NextRequest) {
    return withSkillAdminAuth(req, async (req: NextRequest) => {
        try {
        const data: ResetLevelRequest = await req.json();

        // Validate required fields
        if (!data.user_id || !data.resetType || !data.reason_TH || !data.reason_EN) {
            const response = NextResponse.json(
            { error: "Missing required fields: user_id, resetType, reason_TH, reason_EN" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        // Validate resetType
        if (!['COMPLETE', 'PARTIAL'].includes(data.resetType)) {
            const response = NextResponse.json(
            { error: "Invalid resetType. Must be COMPLETE or PARTIAL" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        // Check if user exists
        const user = await prisma.user.findUnique({ 
            where: { id: data.user_id },
            select: { id: true, firstName: true, lastName: true }
        });

        if (!user) {
            const response = NextResponse.json({ error: "User not found" }, { status: 404 });
            return addCorsHeaders(response, req);
        }

        let affectedSubSkills: SubSkillLevelData[] = [];
        const affectedMainSkills: Set<number> = new Set();

        // Determine which sub skills to reset
        if (data.subSkillCategory_id) {
            // Reset specific sub skill
            const subSkill = await prisma.subSkillCategory.findUnique({
            where: { id: data.subSkillCategory_id },
            include: { mainSkillCategory: true }
            });

            if (!subSkill) {
            const response = NextResponse.json(
                { error: "Sub skill category not found" },
                { status: 404 }
            );
            return addCorsHeaders(response, req);
            }

            const existingLevel = await prisma.userSubSkillLevel.findUnique({
            where: {
                user_id_subSkillCategory_id: {
                user_id: data.user_id,
                subSkillCategory_id: data.subSkillCategory_id
                }
            }
            });

            if (existingLevel) {
            affectedSubSkills = [{
                ...existingLevel,
                subSkillCategory: 0
            }];
            affectedMainSkills.add(subSkill.mainSkillCategory.id);
            }
        } else {
            // Reset all sub skills for user
            const foundSubSkills = await prisma.userSubSkillLevel.findMany({
            where: { user_id: data.user_id },
            include: {
                subSkillCategory: {
                include: { mainSkillCategory: true }
                }
            }
            });

            affectedSubSkills = foundSubSkills.map(skill => ({
            ...skill,
            subSkillCategory: skill.subSkillCategory.id
            }));

            foundSubSkills.forEach(skill => {
            affectedMainSkills.add(skill.subSkillCategory.mainSkillCategory.id);
            });
        }

        if (affectedSubSkills.length === 0) {
            const response = NextResponse.json(
            { error: "No skill levels found to reset" },
            { status: 404 }
            );
            return addCorsHeaders(response, req);
        }

        const resetResults: unknown[] = [];

        // Process each sub skill
        for (const skillLevel of affectedSubSkills) {
            const previousData = {
            Level_I_exp: skillLevel.Level_I_exp,
            Level_II_exp: skillLevel.Level_II_exp,
            Level_III_exp: skillLevel.Level_III_exp,
            Level_IV_exp: skillLevel.Level_IV_exp,
            Level_I_stars: skillLevel.Level_I_stars,
            Level_II_stars: skillLevel.Level_II_stars,
            Level_III_stars: skillLevel.Level_III_stars,
            Level_IV_stars: skillLevel.Level_IV_stars,
            currentLevel: skillLevel.currentLevel,
            totalExp: skillLevel.totalExp
            };

            let newData = { ...previousData };

            if (data.resetType === 'COMPLETE') {
            // Complete reset - all levels to 0
            newData = {
                Level_I_exp: 0,
                Level_II_exp: 0,
                Level_III_exp: 0,
                Level_IV_exp: 0,
                Level_I_stars: 0,
                Level_II_stars: 0,
                Level_III_stars: 0,
                Level_IV_stars: 0,
                currentLevel: 0,
                totalExp: 0
            };
            } else if (data.resetType === 'PARTIAL' && data.resetOptions) {
            // Partial reset based on options
            const options = data.resetOptions;

            if (options.Level_I) {
                if (options.resetExp) newData.Level_I_exp = 0;
                if (options.resetStars) newData.Level_I_stars = 0;
            }
            if (options.Level_II) {
                if (options.resetExp) newData.Level_II_exp = 0;
                if (options.resetStars) newData.Level_II_stars = 0;
            }
            if (options.Level_III) {
                if (options.resetExp) newData.Level_III_exp = 0;
                if (options.resetStars) newData.Level_III_stars = 0;
            }
            if (options.Level_IV) {
                if (options.resetExp) newData.Level_IV_exp = 0;
                if (options.resetStars) newData.Level_IV_stars = 0;
            }

            // Recalculate currentLevel and totalExp
            newData.currentLevel = Math.max(
                newData.Level_IV_stars > 0 ? 4 : 0,
                newData.Level_III_stars > 0 ? 3 : 0,
                newData.Level_II_stars > 0 ? 2 : 0,
                newData.Level_I_stars > 0 ? 1 : 0
            );

            newData.totalExp = newData.Level_I_exp + newData.Level_II_exp + 
                                newData.Level_III_exp + newData.Level_IV_exp;
            }

            // Update the skill level
            const updatedLevel = await prisma.userSubSkillLevel.update({
            where: { id: skillLevel.id },
            data: newData
            });

            // Log the reset in experience history
            const expLost = previousData.totalExp - newData.totalExp;
            await prisma.experienceHistory.create({
            data: {
                user_id: data.user_id,
                subSkillCategory_id: skillLevel.subSkillCategory_id,
                experienceGained: -expLost, // Negative for lost exp
                reason_TH: data.reason_TH,
                reason_EN: data.reason_EN,
                type: 'MANUAL_ADJUSTMENT',
                previousLevel: previousData.currentLevel,
                newLevel: newData.currentLevel,
                previousExp: previousData.totalExp,
                newExp: newData.totalExp,
            }
            });

            resetResults.push({
            subSkillCategory: {
                id: skillLevel.subSkillCategory_id,
                // name_TH: skillLevel.subSkillCategory?.name_TH,
                // name_EN: skillLevel.subSkillCategory?.name_EN
            },
            previousData,
            newData: updatedLevel,
            expLost
            });
        }

        // Update all affected main skills
        for (const mainSkillId of affectedMainSkills) {
            await updateMainSkillLevel(data.user_id, mainSkillId);
        }

        // Prepare response message
        const totalExpLost = resetResults.reduce((sum: number, result) => sum + (result as { expLost: number }).expLost, 0);
        const resetCount = resetResults.length;
        const message = data.resetType === 'COMPLETE' 
            ? `Successfully reset ${resetCount} skill(s) completely. Total EXP lost: ${totalExpLost}`
            : `Successfully reset ${resetCount} skill(s) partially. Total EXP lost: ${totalExpLost}`;

        const response = NextResponse.json({
            success: true,
            message,
            data: {
            user: {
                id: user.id,
                name: `${user.firstName} ${user.lastName}`
            },
            resetType: data.resetType,
            resetOptions: data.resetOptions,
            affectedSkills: resetResults.length,
            totalExpLost,
            details: resetResults
            }
        });
        return addCorsHeaders(response, req);

        } catch (error) {
        console.error("Reset level error:", error);
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
    return withSkillAdminAuth(req, async (req: NextRequest) => {
        try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const subSkillId = searchParams.get('subSkillId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        if (!userId) {
            const response = NextResponse.json(
            { error: "Missing required parameter: userId" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        // Build where clause
        const whereClause: Record<string, unknown> = {
            user_id: parseInt(userId),
            type: 'MANUAL_ADJUSTMENT',
            experienceGained: { lt: 0 } // Only negative exp changes (resets)
        };

        if (subSkillId) {
            whereClause.subSkillCategory_id = parseInt(subSkillId);
        }

        const resetHistory = await prisma.experienceHistory.findMany({
            where: whereClause,
            include: {
            user: {
                select: {
                id: true,
                firstName: true,
                lastName: true
                }
            },
            subSkillCategory: {
                include: {
                mainSkillCategory: {
                    select: {
                    id: true,
                    name_TH: true,
                    name_EN: true
                    }
                }
                }
            }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });

        const totalCount = await prisma.experienceHistory.count({
            where: whereClause
        });

        const response = NextResponse.json({
            success: true,
            data: {
            history: resetHistory,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount
            }
            }
        });
        return addCorsHeaders(response, req);

        } catch (error) {
        console.error("Get reset history error:", error);
        const response = NextResponse.json(
            { error: "Failed to fetch reset history" },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
        }
    });
}