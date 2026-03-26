import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth } from "@/middleware/auth";
import { LevelThresholds } from "@/types/expType";

interface ExpUploadRow {
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
    skillExpData: Array<{
        subSkillId: number;
        subSkillName: string;
        levelType: 'I' | 'II' | 'III' | 'IV';
        exp: number;
    }>;
}

interface ProcessResult {
    userId: number;
    userName: string;
    success: number;
    failed: number;
    details: Array<{
        skill: string;
        level: string;
        exp: number;
        status: 'success' | 'error';
        message?: string;
    }>;
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
) {
    const result = { ...currentData };
    const levelKey = `Level_${targetLevel}_exp` as keyof typeof result;
    const starsKey = `Level_${targetLevel}_stars` as keyof typeof result;
    const threshold = thresholds[targetLevel];

    const oldExp = result[levelKey] as number;
    const newExp = oldExp + expAmount;
    result[levelKey] = newExp;

    const unlocked = isLevelUnlocked(targetLevel, currentData);
    const newStars = calculateStars(newExp, threshold, unlocked);
    result[starsKey] = newStars;

    return result;
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
) {
    const result = {
        Level_I_stars: currentData.Level_I_stars,
        Level_II_stars: currentData.Level_II_stars,
        Level_III_stars: currentData.Level_III_stars,
        Level_IV_stars: currentData.Level_IV_stars,
    };

    if (currentData.Level_I_stars > 0 && currentData.Level_II_stars === 0 && currentData.Level_II_exp > 0) {
        result.Level_II_stars = Math.floor(currentData.Level_II_exp / thresholds.II);
    }

    if (result.Level_II_stars > 0 && currentData.Level_III_stars === 0 && currentData.Level_III_exp > 0) {
        result.Level_III_stars = Math.floor(currentData.Level_III_exp / thresholds.III);
    }

    if (result.Level_III_stars > 0 && currentData.Level_IV_stars === 0 && currentData.Level_IV_exp > 0) {
        result.Level_IV_stars = Math.floor(currentData.Level_IV_exp / thresholds.IV);
    }

    return result;
}

function calculateMaxLevel(subSkillLevel: {
    Level_I_stars: number;
    Level_II_stars: number;
    Level_III_stars: number;
    Level_IV_stars: number;
}): number {
    if (subSkillLevel.Level_IV_stars > 0) return 4;
    if (subSkillLevel.Level_III_stars > 0) return 3;
    if (subSkillLevel.Level_II_stars > 0) return 2;
    if (subSkillLevel.Level_I_stars > 0) return 1;
    return 0;
}

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

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withActivityAdminAuth(req, async () => {
        try {
            const { eventId } = await context.params;
            const eventIdNum = parseInt(eventId);

            // ตรวจสอบกิจกรรม
            const event = await prisma.event.findUnique({
                where: { id: eventIdNum }
            });

            if (!event) {
                const response = NextResponse.json(
                    { error: "Event not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            // อ่านไฟล์
            const formData = await req.formData();
            const file = formData.get("file") as File;

            if (!file) {
                const response = NextResponse.json(
                    { error: "No file uploaded" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const workbook = XLSX.read(buffer);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json(
                worksheet
            ) as Array<Record<string, string | number>>;

            if (rawData.length === 0) {
                const response = NextResponse.json(
                    { error: "Excel file is empty" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // ดึงข้อมูลทักษะทั้งหมด
            const subSkills = await prisma.subSkillCategory.findMany({
                where: { isActive: true },
                include: {
                    mainSkillCategory: true
                }
            });

            // สร้าง mapping ระหว่างชื่อคอลัมน์กับ skill
            const skillColumnMap = new Map<string, { subSkillId: number; level: 'I' | 'II' | 'III' | 'IV'; skillName: string }>();
            
            subSkills.forEach(skill => {
                ['I', 'II', 'III', 'IV'].forEach(level => {
                    const colName = `${skill.name_TH} - Level ${level}`;
                    skillColumnMap.set(colName, {
                        subSkillId: skill.id,
                        level: level as 'I' | 'II' | 'III' | 'IV',
                        skillName: skill.name_TH
                    });
                });
            });

            // Parse ข้อมูล
            const parsedData: ExpUploadRow[] = [];
            const parseErrors: Array<{ row: number; reason: string }> = [];

            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i];
                const rowNumber = i + 2;

                const userIdStr = row["User ID"]?.toString().trim();
                if (!userIdStr) {
                    parseErrors.push({ row: rowNumber, reason: "User ID is required" });
                    continue;
                }

                const userId = parseInt(userIdStr);
                if (isNaN(userId)) {
                    parseErrors.push({ row: rowNumber, reason: "Invalid User ID format" });
                    continue;
                }

                const skillExpData: ExpUploadRow['skillExpData'] = [];

                // อ่านข้อมูล EXP จากแต่ละคอลัมน์ทักษะ
                for (const [colName, skillInfo] of skillColumnMap.entries()) {
                    const expValue = row[colName];
                    
                    if (expValue !== undefined && expValue !== null && expValue !== "") {
                        const exp = typeof expValue === 'number' ? expValue : parseFloat(expValue.toString());
                        
                        if (isNaN(exp)) {
                            parseErrors.push({ 
                                row: rowNumber, 
                                reason: `Invalid EXP value for ${colName}: ${expValue}` 
                            });
                            continue;
                        }

                        if (exp < 0) {
                            parseErrors.push({ 
                                row: rowNumber, 
                                reason: `EXP cannot be negative for ${colName}` 
                            });
                            continue;
                        }

                        if (exp > 0) {
                            skillExpData.push({
                                subSkillId: skillInfo.subSkillId,
                                subSkillName: skillInfo.skillName,
                                levelType: skillInfo.level,
                                exp
                            });
                        }
                    }
                }

                if (skillExpData.length > 0) {
                    parsedData.push({
                        userId,
                        email: row["Email"]?.toString() || "",
                        firstName: row["First Name"]?.toString() || "",
                        lastName: row["Last Name"]?.toString() || "",
                        skillExpData
                    });
                }
            }

            if (parsedData.length === 0) {
                const response = NextResponse.json(
                    { 
                        error: "No valid data to process",
                        parseErrors
                    },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // ประมวลผล EXP
            const thresholds = await getLevelThresholds();
            const results: ProcessResult[] = [];
            let totalSuccess = 0;
            let totalFailed = 0;

            for (const userData of parsedData) {
                // ตรวจสอบ user
                const user = await prisma.user.findUnique({
                    where: { id: userData.userId }
                });

                if (!user) {
                    results.push({
                        userId: userData.userId,
                        userName: `${userData.firstName} ${userData.lastName}`,
                        success: 0,
                        failed: userData.skillExpData.length,
                        details: userData.skillExpData.map(skill => ({
                            skill: skill.subSkillName,
                            level: skill.levelType,
                            exp: skill.exp,
                            status: 'error',
                            message: 'User not found'
                        }))
                    });
                    totalFailed += userData.skillExpData.length;
                    continue;
                }

                const userResult: ProcessResult = {
                    userId: userData.userId,
                    userName: `${user.firstName} ${user.lastName}`,
                    success: 0,
                    failed: 0,
                    details: []
                };

                const mainSkillsToUpdate = new Set<number>();

                // ประมวลผลแต่ละทักษะ
                for (const skillData of userData.skillExpData) {
                    try {
                        const subSkill = await prisma.subSkillCategory.findUnique({
                            where: { id: skillData.subSkillId }
                        });

                        if (!subSkill) {
                            userResult.failed++;
                            totalFailed++;
                            userResult.details.push({
                                skill: skillData.subSkillName,
                                level: skillData.levelType,
                                exp: skillData.exp,
                                status: 'error',
                                message: 'Skill not found'
                            });
                            continue;
                        }

                        // Get or create user sub skill level
                        const currentLevel = await prisma.userSubSkillLevel.findUnique({
                            where: {
                                user_id_subSkillCategory_id: {
                                    user_id: userData.userId,
                                    subSkillCategory_id: skillData.subSkillId
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

                        // คำนวณ EXP ใหม่
                        const distributionResult = addExpToLevel(
                            skillData.levelType,
                            skillData.exp,
                            previousData,
                            thresholds
                        );

                        const unlockResult = recalculateStarsAfterUnlock(
                            distributionResult,
                            thresholds
                        );

                        distributionResult.Level_II_stars = unlockResult.Level_II_stars;
                        distributionResult.Level_III_stars = unlockResult.Level_III_stars;
                        distributionResult.Level_IV_stars = unlockResult.Level_IV_stars;

                        const newTotalExp = previousData.totalExp + skillData.exp;
                        const newCurrentLevel = calculateMaxLevel(distributionResult);

                        // บันทึกลง database
                        await prisma.userSubSkillLevel.upsert({
                            where: {
                                user_id_subSkillCategory_id: {
                                    user_id: userData.userId,
                                    subSkillCategory_id: skillData.subSkillId
                                }
                            },
                            update: {
                                Level_I_exp: distributionResult.Level_I_exp,
                                Level_II_exp: distributionResult.Level_II_exp,
                                Level_III_exp: distributionResult.Level_III_exp,
                                Level_IV_exp: distributionResult.Level_IV_exp,
                                Level_I_stars: distributionResult.Level_I_stars,
                                Level_II_stars: distributionResult.Level_II_stars,
                                Level_III_stars: distributionResult.Level_III_stars,
                                Level_IV_stars: distributionResult.Level_IV_stars,
                                totalExp: newTotalExp,
                                currentLevel: newCurrentLevel,
                                updatedAt: new Date()
                            },
                            create: {
                                user_id: userData.userId,
                                subSkillCategory_id: skillData.subSkillId,
                                Level_I_exp: distributionResult.Level_I_exp,
                                Level_II_exp: distributionResult.Level_II_exp,
                                Level_III_exp: distributionResult.Level_III_exp,
                                Level_IV_exp: distributionResult.Level_IV_exp,
                                Level_I_stars: distributionResult.Level_I_stars,
                                Level_II_stars: distributionResult.Level_II_stars,
                                Level_III_stars: distributionResult.Level_III_stars,
                                Level_IV_stars: distributionResult.Level_IV_stars,
                                totalExp: newTotalExp,
                                currentLevel: newCurrentLevel
                            }
                        });

                        // บันทึก history
                        await prisma.experienceHistory.create({
                            data: {
                                user_id: userData.userId,
                                subSkillCategory_id: skillData.subSkillId,
                                experienceGained: skillData.exp,
                                reason_TH: `นำเข้าจาก Excel - กิจกรรม: ${event.title_TH} - Level ${skillData.levelType}`,
                                reason_EN: `Imported from Excel - Event: ${event.title_EN} - Level ${skillData.levelType}`,
                                type: 'MANUAL_ADJUSTMENT',
                                activity_id: eventIdNum,
                                previousLevel: calculateMaxLevel(previousData),
                                newLevel: newCurrentLevel,
                                previousExp: previousData.totalExp,
                                newExp: newTotalExp,
                                bonusApplied: false
                            }
                        });

                        mainSkillsToUpdate.add(subSkill.mainSkillCategory_id);
                        userResult.success++;
                        totalSuccess++;
                        userResult.details.push({
                            skill: skillData.subSkillName,
                            level: skillData.levelType,
                            exp: skillData.exp,
                            status: 'success'
                        });

                    } catch (error) {
                        userResult.failed++;
                        totalFailed++;
                        userResult.details.push({
                            skill: skillData.subSkillName,
                            level: skillData.levelType,
                            exp: skillData.exp,
                            status: 'error',
                            message: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                }

                // อัปเดต Main Skill Levels
                for (const mainSkillId of mainSkillsToUpdate) {
                    await updateMainSkillLevel(userData.userId, mainSkillId);
                }

                results.push(userResult);
            }

            const response = NextResponse.json({
                success: true,
                message: "EXP upload completed",
                summary: {
                    totalUsers: parsedData.length,
                    totalSuccess,
                    totalFailed,
                    parseErrors: parseErrors.length
                },
                results,
                parseErrors
            });

            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("EXP upload error:", error);
            const response = NextResponse.json(
                {
                    error: "Failed to process EXP upload",
                    details: error instanceof Error ? error.message : "Unknown error"
                },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}
