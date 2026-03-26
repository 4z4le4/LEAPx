import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth } from "@/middleware/auth";

interface ExpUploadRow {
    studentId: string;
    email: string;
    skills: {
        subSkillId: number;
        subSkillName: string;
        exp: number;
        levelType: 'I' | 'II' | 'III' | 'IV';
    }[];
}

interface ProcessingResult {
    success: boolean;
    totalUsers: number;
    processedUsers: number;
    failedUsers: number;
    totalExpUpdates: number;
    errors: {
        row: number;
        userId: number;
        email: string;
        error: string;
    }[];
}

// Threshold สำหรับแต่ละระดับ
const LEVEL_THRESHOLDS = {
    Level_I: 8,
    Level_II: 16,
    Level_III: 32,
    Level_IV: 64
} as const;

/**
 * OPTIONS /api/exp/upload
 * Handle CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

/**
 * POST /api/exp/upload
 * อัพโหลดไฟล์ Excel เพื่อเพิ่มประวัติคะแนน (EXP) แบบ bulk
 * 
 * Authorization: STAFF, ACTIVITY_ADMIN, SUPREME
 * Content-Type: multipart/form-data
 * 
 * Body:
 * - file: Excel file (.xlsx)
 * 
 * Features:
 * - รองรับการผูกกับ Event (optional)
 * - Validate users และ events
 * - คำนวณและกระจาย EXP อัตโนมัติ
 * - Auto-unlock levels
 * - บันทึก ExperienceHistory
 * - รองรับการประมวลผลแบบ partial (บาง row error ยังประมวลผลต่อได้)
 */
export async function POST(
    req: NextRequest
) {
    return withActivityAdminAuth(req, async () => {
        try {
            // อ่านไฟล์
            const formData = await req.formData();
            const file = formData.get("file") as File;

            if (!file || !file.name.endsWith(".xlsx")) {
                const response = NextResponse.json(
                    { error: "ไม่พบไฟล์ Excel หรือรูปแบบไม่ถูกต้อง" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // แปลงไฟล์เป็น buffer
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // อ่าน Excel
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(worksheet) as Record<string, string | number>[];

            if (rawData.length === 0) {
                const response = NextResponse.json(
                    { error: "ไฟล์ไม่มีข้อมูล" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // ดึง SubSkills ทั้งหมดเพื่อ map ชื่อกับ ID
            const allSubSkills = await prisma.subSkillCategory.findMany({
                select: { id: true, name_TH: true, name_EN: true }
            });

            const skillNameToId = new Map<string, number>();
            allSubSkills.forEach(skill => {
                skillNameToId.set(skill.name_TH, skill.id);
                skillNameToId.set(skill.name_EN, skill.id);
            });

            // Parse ข้อมูล
            const parsedData: ExpUploadRow[] = [];
            const errors: ProcessingResult['errors'] = [];

            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i];
                const rowNumber = i + 2; // Row 1 = header

                try {
                    const studentId = String(row["รหัสนักศึกษา"] || "").trim();
                    if (!studentId) {
                        errors.push({
                            row: rowNumber,
                            userId: 0,
                            email: String(row["Email"] || ""),
                            error: "รหัสนักศึกษาว่างเปล่า"
                        });
                        continue;
                    }

                    const email = String(row["Email"] || "").trim();

                    // Parse skills (คอลัมน์ที่ไม่ใช่ รหัสนักศึกษา และ Email)
                    const skills: ExpUploadRow['skills'] = [];
                    const processedSkills = new Set<string>(); // เพื่อไม่ให้ process ทักษะซ้ำ

                    for (const [colName, value] of Object.entries(row)) {
                        // ข้าม columns พื้นฐาน
                        if (["รหัสนักศึกษา", "Email"].includes(colName)) {
                            continue;
                        }

                        // ข้าม column ที่เป็น Level (จะประมวลผลพร้อมกับ skill column)
                        if (colName.endsWith(" - Level")) {
                            continue;
                        }

                        // ข้ามถ้า skill นี้ถูก process แล้ว
                        if (processedSkills.has(colName)) {
                            continue;
                        }

                        const exp = Number(value);

                        // ข้ามถ้าไม่มีค่าหรือค่าเป็น 0
                        if (!value || isNaN(exp) || exp <= 0) continue;

                        // หา subSkillId
                        const subSkillId = skillNameToId.get(colName);
                        if (!subSkillId) {
                            console.warn(`Row ${rowNumber}: ไม่พบทักษะ "${colName}"`);
                            continue;
                        }

                        // หา Level column สำหรับทักษะนี้
                        const levelColName = `${colName} - Level`;
                        const levelValue = String(row[levelColName] || "").trim().toUpperCase();

                        // Validate Level
                        if (!["I", "II", "III", "IV"].includes(levelValue)) {
                            errors.push({
                                row: rowNumber,
                                userId: 0,
                                email: String(row["Email"] || ""),
                                error: `ทักษะ "${colName}": Level ไม่ถูกต้อง (ต้องเป็น I, II, III, หรือ IV) แต่ได้ "${levelValue}"`
                            });
                            continue;
                        }

                        skills.push({
                            subSkillId,
                            subSkillName: colName,
                            exp,
                            levelType: levelValue as 'I' | 'II' | 'III' | 'IV'
                        });

                        processedSkills.add(colName);
                    }

                    // ข้ามถ้าไม่มีทักษะใดๆ
                    if (skills.length === 0) {
                        continue;
                    }

                    parsedData.push({
                        studentId,
                        email,
                        skills
                    });

                } catch (error) {
                    errors.push({
                        row: rowNumber,
                        userId: 0,
                        email: String(row["Email"] || ""),
                        error: error instanceof Error ? error.message : "Unknown parsing error"
                    });
                }
            }

            if (parsedData.length === 0) {
                const response = NextResponse.json(
                    {
                        error: "ไม่มีข้อมูลที่ถูกต้องสำหรับประมวลผล",
                        errors
                    },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // Validate users (แปลง studentId เป็น number และหา user)
            const studentIds = [...new Set(parsedData.map(d => d.studentId))];
            const studentIdNumbers = studentIds.map(id => {
                const num = parseInt(id);
                return isNaN(num) ? null : num;
            }).filter(id => id !== null) as number[];

            const existingUsers = await prisma.user.findMany({
                where: { id: { in: studentIdNumbers } },
                select: { id: true }
            });

            const existingUserIds = new Set(existingUsers.map(u => u.id));

            // สร้าง map จาก studentId (string) -> userId (number)
            const studentIdToUserId = new Map<string, number>();
            studentIds.forEach(sid => {
                const num = parseInt(sid);
                if (!isNaN(num) && existingUserIds.has(num)) {
                    studentIdToUserId.set(sid, num);
                }
            });

            // ประมวลผลแต่ละรายการ
            let processedCount = 0;
            let totalExpUpdates = 0;

            for (const userData of parsedData) {
                try {
                    // แปลง studentId เป็น userId
                    const userId = studentIdToUserId.get(userData.studentId);
                    if (!userId) {
                        errors.push({
                            row: -1,
                            userId: 0,
                            email: userData.email,
                            error: `ไม่พบรหัสนักศึกษา ${userData.studentId} ในระบบ`
                        });
                        continue;
                    }

                    // ประมวลผลแต่ละทักษะ
                    for (const skillData of userData.skills) {
                        await processExpGain(
                            userId,
                            skillData.subSkillId,
                            skillData.levelType,
                            skillData.exp
                        );
                        totalExpUpdates++;
                    }

                    processedCount++;

                } catch (error) {
                    errors.push({
                        row: -1,
                        userId: 0,
                        email: userData.email,
                        error: error instanceof Error ? error.message : "Unknown processing error"
                    });
                }
            }

            const result: ProcessingResult = {
                success: true,
                totalUsers: parsedData.length,
                processedUsers: processedCount,
                failedUsers: parsedData.length - processedCount,
                totalExpUpdates,
                errors
            };

            const response = NextResponse.json(result, { status: 200 });
            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Error processing upload:", error);
            const response = NextResponse.json(
                {
                    error: "เกิดข้อผิดพลาดในการประมวลผล",
                    details: error instanceof Error ? error.message : "Unknown error"
                },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}

/**
 * ประมวลผลการเพิ่ม EXP ที่ระดับเฉพาะ
 */
async function processExpGain(
    userId: number,
    subSkillId: number,
    levelType: 'I' | 'II' | 'III' | 'IV',
    expAmount: number
): Promise<void> {
    // ดึงข้อมูล UserSubSkillLevel ปัจจุบัน
    let currentLevel = await prisma.userSubSkillLevel.findUnique({
        where: {
            user_id_subSkillCategory_id: {
                user_id: userId,
                subSkillCategory_id: subSkillId
            }
        }
    });

    // ถ้ายังไม่มี สร้างใหม่
    if (!currentLevel) {
        currentLevel = await prisma.userSubSkillLevel.create({
            data: {
                user_id: userId,
                subSkillCategory_id: subSkillId,
                Level_I_exp: 0,
                Level_I_stars: 0,
                Level_II_exp: 0,
                Level_II_stars: 0,
                Level_III_exp: 0,
                Level_III_stars: 0,
                Level_IV_exp: 0,
                Level_IV_stars: 0,
                totalExp: 0,
                currentLevel: 1 // Level I เริ่มต้น unlock
            }
        });
    }

    // เก็บค่าเดิม
    const previousData = {
        totalExp: currentLevel.totalExp,
        currentLevel: currentLevel.currentLevel,
        Level_I_exp: currentLevel.Level_I_exp,
        Level_I_stars: currentLevel.Level_I_stars,
        Level_II_exp: currentLevel.Level_II_exp,
        Level_II_stars: currentLevel.Level_II_stars,
        Level_III_exp: currentLevel.Level_III_exp,
        Level_III_stars: currentLevel.Level_III_stars,
        Level_IV_exp: currentLevel.Level_IV_exp,
        Level_IV_stars: currentLevel.Level_IV_stars
    };

    // กำหนด level number
    const levelMap: Record<string, number> = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4 };
    const targetLevelNum = levelMap[levelType];

    // คำนวณ EXP ใหม่
    const levelExpKey = `Level_${levelType}_exp` as keyof typeof currentLevel;
    const levelStarsKey = `Level_${levelType}_stars` as keyof typeof currentLevel;
    const currentLevelExp = currentLevel[levelExpKey] as number;
    const currentStars = currentLevel[levelStarsKey] as number;

    // ถ้าครบ 5 stars แล้ว → skip (ไม่ต้องเพิ่มอีก)
    if (currentStars >= 5) {
        console.warn(`User ${userId} Level ${levelType} for skill ${subSkillId} already has 5 stars`);
        return;
    }

    const threshold = LEVEL_THRESHOLDS[`Level_${levelType}` as keyof typeof LEVEL_THRESHOLDS];
    const newLevelExp = currentLevelExp + expAmount;
    const newStars = Math.min(5, Math.floor((newLevelExp / threshold) * 5));

    // สร้างข้อมูลใหม่
    const newData = {
        ...previousData,
        [levelExpKey]: newLevelExp,
        [levelStarsKey]: newStars
    };

    const newTotalExp = previousData.totalExp + expAmount;

    // ตรวจสอบว่าต้อง unlock level ถัดไปหรือไม่
    // เงื่อนไข: Level ที่ให้ EXP ต้อง unlock แล้ว + ครบ 5 ดาว + ไม่ใช่ Level IV
    let newCurrentLevel = previousData.currentLevel;
    const isLevelUnlocked = currentLevel.currentLevel >= targetLevelNum;
    if (isLevelUnlocked && newStars >= 5 && targetLevelNum < 4) {
        newCurrentLevel = Math.max(newCurrentLevel, targetLevelNum + 1);
    }

    // บันทึกลง database
    await prisma.userSubSkillLevel.update({
        where: {
            user_id_subSkillCategory_id: {
                user_id: userId,
                subSkillCategory_id: subSkillId
            }
        },
        data: {
            Level_I_exp: newData.Level_I_exp,
            Level_I_stars: newData.Level_I_stars,
            Level_II_exp: newData.Level_II_exp,
            Level_II_stars: newData.Level_II_stars,
            Level_III_exp: newData.Level_III_exp,
            Level_III_stars: newData.Level_III_stars,
            Level_IV_exp: newData.Level_IV_exp,
            Level_IV_stars: newData.Level_IV_stars,
            totalExp: newTotalExp,
            currentLevel: newCurrentLevel,
            updatedAt: new Date()
        }
    });

    // บันทึก history
    await prisma.experienceHistory.create({
        data: {
            user_id: userId,
            subSkillCategory_id: subSkillId,
            experienceGained: expAmount,
            reason_TH: `นำเข้าจากไฟล์ Excel - Level ${levelType}`,
            reason_EN: `Imported from Excel file - Level ${levelType}`,
            type: 'MANUAL_ADJUSTMENT',
            activity_id: null,
            previousLevel: previousData.currentLevel,
            newLevel: newCurrentLevel,
            previousExp: previousData.totalExp,
            newExp: newTotalExp,
            bonusApplied: false
        }
    });
}
