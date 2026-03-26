import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserId, withUserAuth } from "@/middleware/auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import type { UserSubSkillLevel } from "@prisma/client";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
    return withUserAuth(req, async (req: NextRequest) => {
        try {
        const { searchParams } = new URL(req.url);
        const userId = getUserId(req);
        const mainSkillId = searchParams.get('mainSkillId');
        const includeInactive = searchParams.get('includeInactive') === 'true';

        // Validate userId
        if (!userId) {
            const response = NextResponse.json(
                { 
                    success: false,
                    error: "Missing required parameter: userId" 
                },
                { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                faculty: true,
                major: true
            }
        });

        if (!user) {
            const response = NextResponse.json(
                { 
                    success: false,
                    error: "User not found" 
                },
                { status: 404 }
            );
            return addCorsHeaders(response, req);
        }

        // Build where clause for main skills
        const mainSkillWhere: { isActive: boolean; id?: number } = { isActive: true };
        if (mainSkillId) {
            mainSkillWhere.id = parseInt(mainSkillId);
        }

        // Fetch all main skills with sub skills
        const mainSkills = await prisma.mainSkillCategory.findMany({
            where: mainSkillWhere,
            orderBy: { sortOrder: 'desc' },
            include: {
                subSkills: {
                    where: includeInactive ? {} : { isActive: true },
                    orderBy: { sortOrder: 'asc' }
                }
            }
        });

        // Fetch user's skill levels
        const userSubSkillLevels = await prisma.userSubSkillLevel.findMany({
            where: {
                user_id: Number(userId),
                subSkillCategory: {
                    mainSkillCategory_id: mainSkillId ? Number(mainSkillId) : undefined,
                    isActive: includeInactive ? undefined : true
                }
            },
            include: {
                subSkillCategory: true
            }
        });

        // Create a map for quick lookup
        const userSkillMap = new Map<number, UserSubSkillLevel>(
            userSubSkillLevels.map(level => [level.subSkillCategory_id, level])
        );

        // Calculate helper functions
        const calculateMaxLevel = (skillLevel?: UserSubSkillLevel | null): number => {
            if (!skillLevel) return 0;
            if (skillLevel.Level_IV_stars > 0) return 4;
            if (skillLevel.Level_III_stars > 0) return 3;
            if (skillLevel.Level_II_stars > 0) return 2;
            if (skillLevel.Level_I_stars > 0) return 1;
            return 0;
        };

        // Format the response
        const formattedSkills = mainSkills.map(mainSkill => {
            // Get all sub skills for this main skill
            const subSkillsData = mainSkill.subSkills.map(subSkill => {
                const userLevel = userSkillMap.get(subSkill.id);
                const maxLevel = calculateMaxLevel(userLevel);

                return {
                    id: subSkill.id,
                    name_TH: subSkill.name_TH,
                    name_EN: subSkill.name_EN,
                    slug: subSkill.slug,
                    icon: subSkill.icon,
                    color: subSkill.color,
                    description_TH: subSkill.description_TH,
                    description_EN: subSkill.description_EN,
                    sortOrder: subSkill.sortOrder,
                    
                    // User's progress
                    currentLevel: userLevel?.currentLevel || 0,
                    maxLevel: maxLevel,
                    totalExp: userLevel?.totalExp || 0,
                    
                    // Level details
                    levels: {
                        I: {
                            exp: userLevel?.Level_I_exp || 0,
                            stars: userLevel?.Level_I_stars || 0,
                            isUnlocked: true,
                            threshold: 8,
                            progress: userLevel ? userLevel.Level_I_exp % 8 : 0,
                            expToNextStar: userLevel ? 8 - (userLevel.Level_I_exp % 8) : 8
                        },
                        II: {
                            exp: userLevel?.Level_II_exp || 0,
                            stars: userLevel?.Level_II_stars || 0,
                            isUnlocked: userLevel ? userLevel.Level_I_stars > 0 : false,
                            threshold: 16,
                            progress: userLevel ? userLevel.Level_II_exp % 16 : 0,
                            expToNextStar: userLevel ? 16 - (userLevel.Level_II_exp % 16) : 16
                        },
                        III: {
                            exp: userLevel?.Level_III_exp || 0,
                            stars: userLevel?.Level_III_stars || 0,
                            isUnlocked: userLevel ? userLevel.Level_II_stars > 0 : false,
                            threshold: 32,
                            progress: userLevel ? userLevel.Level_III_exp % 32 : 0,
                            expToNextStar: userLevel ? 32 - (userLevel.Level_III_exp % 32) : 32
                        },
                        IV: {
                            exp: userLevel?.Level_IV_exp || 0,
                            stars: userLevel?.Level_IV_stars || 0,
                            isUnlocked: userLevel ? userLevel.Level_III_stars > 0 : false,
                            threshold: 64,
                            progress: userLevel ? userLevel.Level_IV_exp % 64 : 0,
                            expToNextStar: userLevel ? 64 - (userLevel.Level_IV_exp % 64) : 64
                        }
                    },
                    
                    // Total stars across all levels
                    totalStars: userLevel 
                        ? userLevel.Level_I_stars + userLevel.Level_II_stars + 
                          userLevel.Level_III_stars + userLevel.Level_IV_stars
                        : 0
                };
            });

            // Calculate main skill statistics
            const subSkillsWithExp = subSkillsData.filter(s => s.totalExp > 0);
            const totalExp = subSkillsData.reduce((sum, s) => sum + s.totalExp, 0);
            const totalStars = subSkillsData.reduce((sum, s) => sum + s.totalStars, 0);
            const maxLevel = Math.max(...subSkillsData.map(s => s.maxLevel), 0);
            const averageLevel = subSkillsWithExp.length > 0
                ? subSkillsWithExp.reduce((sum, s) => sum + s.maxLevel, 0) / subSkillsWithExp.length
                : 0;

            return {
                id: mainSkill.id,
                name_TH: mainSkill.name_TH,
                name_EN: mainSkill.name_EN,
                slug: mainSkill.slug,
                icon: mainSkill.icon,
                color: mainSkill.color,
                description_TH: mainSkill.description_TH,
                description_EN: mainSkill.description_EN,
                sortOrder: mainSkill.sortOrder,
                
                // Statistics
                statistics: {
                    maxLevel: maxLevel,
                    averageLevel: Number(averageLevel.toFixed(2)),
                    totalExp: totalExp,
                    totalStars: totalStars,
                    totalSubSkills: subSkillsData.length,
                    completedSubSkills: subSkillsWithExp.length,
                    completionPercentage: Number(
                        ((subSkillsWithExp.length / subSkillsData.length) * 100).toFixed(1)
                    ),
                    
                    // Level breakdown
                    levelBreakdown: {
                        Level_I: subSkillsData.filter(s => s.levels.I.stars > 0).length,
                        Level_II: subSkillsData.filter(s => s.levels.II.stars > 0).length,
                        Level_III: subSkillsData.filter(s => s.levels.III.stars > 0).length,
                        Level_IV: subSkillsData.filter(s => s.levels.IV.stars > 0).length
                    }
                },
                
                // Sub skills
                subSkills: subSkillsData
            };
        });

        // Calculate overall statistics
        const overallStats = {
            totalExp: formattedSkills.reduce((sum, s) => sum + s.statistics.totalExp, 0),
            totalStars: formattedSkills.reduce((sum, s) => sum + s.statistics.totalStars, 0),
            totalMainSkills: formattedSkills.length,
            totalSubSkills: formattedSkills.reduce((sum, s) => sum + s.statistics.totalSubSkills, 0),
            completedSubSkills: formattedSkills.reduce((sum, s) => sum + s.statistics.completedSubSkills, 0),
            averageLevel: Number(
                (formattedSkills.reduce((sum, s) => sum + s.statistics.averageLevel, 0) / 
                formattedSkills.length).toFixed(2)
            ),
            maxLevel: Math.max(...formattedSkills.map(s => s.statistics.maxLevel), 0),
            completionPercentage: Number(
                ((formattedSkills.reduce((sum, s) => sum + s.statistics.completedSubSkills, 0) /
                formattedSkills.reduce((sum, s) => sum + s.statistics.totalSubSkills, 0)) * 100).toFixed(1)
            )
        };

        const response = NextResponse.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: `${user.firstName} ${user.lastName}`,
                    faculty: user.faculty,
                    major: user.major
                },
                overallStats,
                mainSkills: formattedSkills
            }
        });

        return addCorsHeaders(response, req);

    } catch (error) {
        console.error("Get user skills error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const response = NextResponse.json(
            { 
                success: false,
                error: "Failed to fetch user skills",
                details: errorMessage 
            },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
    }
    });
}