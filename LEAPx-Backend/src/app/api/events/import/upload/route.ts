import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, getUserId } from "@/middleware/auth";
import { awardSkillExp } from "@/lib/expCalculation";
import type { LevelType } from "@/types/checkInTypes";
import { levelType as PrismaLevelType } from "@prisma/client";
import { TEMPLATE_LAYOUT } from "@/lib/eventImportLayout";
import { transformDatesToThai } from "@/utils/timezone";

// =============================================================================
// Types
// =============================================================================
interface ImportSkillReward {
    subSkillId: number;
    subSkillName: string;
    levelType: LevelType;
    baseExp: number;
    bonusExp: number;
}

interface ImportParticipant {
    studentId: number | null;
    email: string;
    firstName: string;
    lastName: string;
    rowNum: number;
}

type SkillRewardInput = Parameters<typeof awardSkillExp>[2][number];

// =============================================================================
// OPTIONS
// =============================================================================
export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

// =============================================================================
// POST /api/events/import/upload
// อัพโหลด Excel และนำเข้าข้อมูลกิจกรรม + ผู้เข้าร่วม + แจก EXP
//
// Form-data:
//   file: .xlsx (ดาวน์โหลด template จาก GET /api/events/import/template)
//
// Auth: ACTIVITY_ADMIN+
// =============================================================================
export async function POST(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            // ดึง user ID ของ admin ที่กำลัง import
            const createdBy = getUserId(req);
            if (createdBy instanceof NextResponse) {
                return addCorsHeaders(createdBy, req);
            }

            // อ่านไฟล์
            const formData = await req.formData();
            const file = formData.get("file") as File | null;

            if (!file) {
                return addCorsHeaders(
                    NextResponse.json({ error: "ไม่พบไฟล์ที่อัพโหลด (field name: file)" }, { status: 400 }),
                    req
                );
            }
            if (!file.name.toLowerCase().endsWith(".xlsx")) {
                return addCorsHeaders(
                    NextResponse.json({ error: "รองรับเฉพาะไฟล์ .xlsx เท่านั้น" }, { status: 400 }),
                    req
                );
            }

            const bytes = await file.arrayBuffer();

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(bytes);

            // =========================================================
            // STEP 1: Parse Sheet 1 — Event Info (key-value rows)
            // =========================================================
            const ws1 = workbook.getWorksheet(1);
            if (!ws1) {
                return addCorsHeaders(
                    NextResponse.json({ error: "ไม่พบชีตที่ 1 (ข้อมูลกิจกรรม)" }, { status: 400 }),
                    req
                );
            }

            const L1 = TEMPLATE_LAYOUT.SHEET1;

            const title_TH       = getCellText(ws1, L1.TITLE_TH_ROW,  2);
            const title_EN       = getCellText(ws1, L1.TITLE_EN_ROW,  2);
            const description_TH = getCellText(ws1, L1.DESC_TH_ROW,  2) || title_TH;
            const description_EN = getCellText(ws1, L1.DESC_EN_ROW,  2) || title_EN;
            const location_TH    = getCellText(ws1, L1.LOC_TH_ROW,   2);
            const location_EN    = getCellText(ws1, L1.LOC_EN_ROW,   2);
            const activityStart  = parseCellDate(ws1, L1.ACT_START_ROW, 2);
            const activityEnd    = parseCellDate(ws1, L1.ACT_END_ROW,   2);
            const regStartRaw    = parseCellDate(ws1, L1.REG_START_ROW, 2);
            const regEndRaw      = parseCellDate(ws1, L1.REG_END_ROW,   2);

            // Validate required fields
            const validationErrors: string[] = [];
            if (!title_TH)      validationErrors.push("ชื่อกิจกรรม (TH) ว่างเปล่า");
            if (!title_EN)      validationErrors.push("ชื่อกิจกรรม (EN) ว่างเปล่า");
            if (!location_TH)   validationErrors.push("สถานที่จัดงาน (TH) ว่างเปล่า");
            if (!location_EN)   validationErrors.push("สถานที่จัดงาน (EN) ว่างเปล่า");
            if (!activityStart) validationErrors.push("วันที่เริ่มกิจกรรมไม่ถูกต้อง (รูปแบบ: YYYY-MM-DD HH:mm)");
            if (!activityEnd)   validationErrors.push("วันที่สิ้นสุดกิจกรรมไม่ถูกต้อง (รูปแบบ: YYYY-MM-DD HH:mm)");
            if (activityStart && activityEnd && activityEnd <= activityStart) {
                validationErrors.push("วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มกิจกรรม");
            }

            if (validationErrors.length > 0) {
                return addCorsHeaders(
                    NextResponse.json({ error: "ข้อมูลกิจกรรมไม่ครบถ้วน", details: validationErrors }, { status: 400 }),
                    req
                );
            }

            // ค่า default ถ้าไม่กรอก regStart/regEnd
            const registrationStart = regStartRaw ?? activityStart!;
            const registrationEnd   = regEndRaw   ?? activityStart!;

            // =========================================================
            // STEP 2: Parse Sheet 1 — Skills Table (row 15+)
            // =========================================================
            const importSkills: ImportSkillReward[] = [];
            const skillParseErrors: string[] = [];

            for (let rn = L1.SKILLS_DATA_START_ROW; rn <= L1.SKILLS_DATA_START_ROW + 500; rn++) {
                const row = ws1.getRow(rn);
                const idCell = row.getCell(1).value;

                // หยุดเมื่อเจอแถวว่าง
                if (idCell === null || idCell === undefined || String(idCell).trim() === "") break;

                const subSkillId =
                    typeof idCell === "number"
                        ? idCell
                        : parseInt(String(idCell).trim());

                if (isNaN(subSkillId) || subSkillId <= 0) {
                    skillParseErrors.push(`แถว ${rn}: SubSkill ID "${idCell}" ไม่ใช่ตัวเลขที่ถูกต้อง`);
                    continue;
                }

                const levelRaw = getCellText(ws1, rn, 3).toUpperCase().replace(/\s/g, "");
                if (!(["I", "II", "III", "IV"] as string[]).includes(levelRaw)) {
                    skillParseErrors.push(`แถว ${rn}: Level "${levelRaw}" ไม่ถูกต้อง (ต้องเป็น I, II, III, หรือ IV)`);
                    continue;
                }

                const baseExp  = parseFloat(getCellText(ws1, rn, 4));
                const bonusExp = parseFloat(getCellText(ws1, rn, 5)) || 0;

                if (isNaN(baseExp) || baseExp <= 0) {
                    skillParseErrors.push(`แถว ${rn}: EXP พื้นฐาน "${getCellText(ws1, rn, 4)}" ไม่ถูกต้อง (ต้องเป็นตัวเลข > 0)`);
                    continue;
                }

                importSkills.push({
                    subSkillId,
                    subSkillName: getCellText(ws1, rn, 2),
                    levelType:  levelRaw as LevelType,
                    baseExp:    Math.round(baseExp),
                    bonusExp:   Math.max(0, Math.round(bonusExp)),
                });
            }

            if (skillParseErrors.length > 0) {
                return addCorsHeaders(
                    NextResponse.json({ error: "ข้อมูลทักษะไม่ถูกต้อง", details: skillParseErrors }, { status: 400 }),
                    req
                );
            }

            // Validate SubSkill IDs exist in DB
            if (importSkills.length > 0) {
                const skillIds = [...new Set(importSkills.map((s) => s.subSkillId))];
                const dbSkills = await prisma.subSkillCategory.findMany({
                    where: { id: { in: skillIds } },
                    select: { id: true },
                });
                const existingIds = new Set(dbSkills.map((s) => s.id));
                const missingIds = skillIds.filter((id) => !existingIds.has(id));
                if (missingIds.length > 0) {
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "SubSkill ID บางอันไม่มีในระบบ",
                            details: missingIds.map((id) => `SubSkill ID ${id} ไม่พบ — ดูรายการที่ถูกต้องในชีต ทักษะอ้างอิง`),
                        }, { status: 400 }),
                        req
                    );
                }
            }

            // =========================================================
            // STEP 3: Parse Sheet 2 — Participants
            // =========================================================
            const ws2 = workbook.getWorksheet(2);
            if (!ws2) {
                return addCorsHeaders(
                    NextResponse.json({ error: "ไม่พบชีตที่ 2 (รายชื่อผู้เข้าร่วม)" }, { status: 400 }),
                    req
                );
            }

            const L2 = TEMPLATE_LAYOUT.SHEET2;
            const importParticipants: ImportParticipant[] = [];

            for (let rn = L2.DATA_START_ROW; rn <= L2.DATA_START_ROW + 2000; rn++) {
                const row = ws2.getRow(rn);
                const sidRaw   = row.getCell(1).value;
                const emailRaw = getCellText(ws2, rn, 2);

                // หยุดเมื่อเจอแถวว่างทั้งคู่
                if (
                    (sidRaw === null || sidRaw === undefined || String(sidRaw).trim() === "") &&
                    !emailRaw
                ) {
                    break;
                }

                const sidNum =
                    sidRaw !== null && sidRaw !== undefined && String(sidRaw).trim() !== ""
                        ? parseInt(String(sidRaw).trim())
                        : NaN;

                importParticipants.push({
                    studentId: isNaN(sidNum) ? null : sidNum,
                    email:     emailRaw,
                    firstName: getCellText(ws2, rn, 3),
                    lastName:  getCellText(ws2, rn, 4),
                    rowNum:    rn,
                });
            }

            if (importParticipants.length === 0) {
                return addCorsHeaders(
                    NextResponse.json({ error: "ไม่พบรายชื่อผู้เข้าร่วมในชีตที่ 2" }, { status: 400 }),
                    req
                );
            }

            // =========================================================
            // STEP 4: Create Event + EventSkillReward
            // =========================================================
            const slug = generateSlug(title_EN!);

            const newEvent = await prisma.event.create({
                data: {
                    created_by:       createdBy,
                    title_TH:         title_TH!,
                    title_EN:         title_EN!,
                    description_TH:   description_TH || title_TH!,
                    description_EN:   description_EN || title_EN!,
                    slug,
                    location_TH:      location_TH!,
                    location_EN:      location_EN!,
                    activityStart:    activityStart!,
                    activityEnd:      activityEnd!,
                    registrationStart,
                    registrationEnd,
                    status:           "COMPLETED",
                    priority:         1,
                    maxParticipants:  importParticipants.length,
                    currentParticipants: 0, // will update after processing
                },
            });

            if (importSkills.length > 0) {
                await prisma.eventSkillReward.createMany({
                    data: importSkills.map((s) => ({
                        event_id:            newEvent.id,
                        subSkillCategory_id: s.subSkillId,
                        levelType:           s.levelType as PrismaLevelType,
                        baseExperience:      s.baseExp,
                        bonusExperience:     s.bonusExp,
                    })),
                    skipDuplicates: true,
                });
            }

            // =========================================================
            // STEP 5: Resolve users (student ID first, email fallback)
            // =========================================================
            const allStudentIds = importParticipants
                .map((p) => p.studentId)
                .filter((id): id is number => id !== null);
            const allEmails = importParticipants
                .map((p) => p.email)
                .filter((e) => e.length > 0);

            const [usersByStudentId, usersByEmail] = await Promise.all([
                prisma.user.findMany({
                    where: { id: { in: allStudentIds } },
                    select: { id: true, email: true, firstName: true, lastName: true },
                }),
                allEmails.length > 0
                    ? prisma.user.findMany({
                          where: { email: { in: allEmails } },
                          select: { id: true, email: true, firstName: true, lastName: true },
                      })
                    : Promise.resolve([]),
            ]);

            const userMapById    = new Map(usersByStudentId.map((u) => [u.id, u]));
            const userMapByEmail = new Map(usersByEmail.map((u) => [u.email, u]));

            // =========================================================
            // STEP 6: Create EventRegistration + award EXP per user
            // =========================================================
            const totalExpPerUser = importSkills.reduce(
                (sum, s) => sum + s.baseExp + s.bonusExp,
                0
            );

            // Prepare skill rewards array for awardSkillExp
            const skillRewardsForExp: SkillRewardInput[] = importSkills.map((s) => ({
                subSkillCategory_id: s.subSkillId,
                levelType:          s.levelType,
                expEarned:          s.baseExp + s.bonusExp,
                baseExperience:     s.baseExp,
                bonusExperience:    s.bonusExp,
                reason_TH:          `จากกิจกรรม: ${title_TH}`,
                reason_EN:          `From event: ${title_EN}`,
            }));

            const processed: Array<{
                rowNum:     number;
                userId:     number;
                studentId:  number | null;
                email:      string;
                firstName:  string;
                lastName:   string;
                expAwarded: number;
            }> = [];

            const failed: Array<{
                rowNum:    number;
                studentId: number | null;
                email:     string;
                error:     string;
            }> = [];

            for (const p of importParticipants) {
                try {
                    // Resolve user
                    let user =
                        p.studentId !== null
                            ? (userMapById.get(p.studentId) ?? null)
                            : null;
                    if (!user && p.email) {
                        user = userMapByEmail.get(p.email) ?? null;
                    }

                    if (!user) {
                        failed.push({
                            rowNum:    p.rowNum,
                            studentId: p.studentId,
                            email:     p.email,
                            error:     `ไม่พบผู้ใช้รหัส ${p.studentId ?? "-"} / อีเมล ${p.email || "-"} ในระบบ`,
                        });
                        continue;
                    }

                    // Check duplicate registration
                    const existing = await prisma.eventRegistration.findUnique({
                        where: {
                            user_id_event_id: {
                                user_id:  user.id,
                                event_id: newEvent.id,
                            },
                        },
                        select: { id: true },
                    });

                    if (existing) {
                        failed.push({
                            rowNum:    p.rowNum,
                            studentId: p.studentId,
                            email:     p.email,
                            error:     `ผู้ใช้ ID ${user.id} (${user.firstName} ${user.lastName}) ถูกเพิ่มซ้ำในไฟล์`,
                        });
                        continue;
                    }

                    // Create registration
                    await prisma.eventRegistration.create({
                        data: {
                            user_id:          user.id,
                            event_id:         newEvent.id,
                            status:           "COMPLETED",
                            registrationType: "NORMAL",
                            checkedIn:        true,
                            checkInTime:      activityStart,
                            checkedOut:       true,
                            checkOutTime:     activityEnd,
                            experienceEarned: totalExpPerUser,
                            hasEvaluated:     false,
                        },
                    });

                    // Award EXP + update UserSubSkillLevel + MainSkillLevel + ExperienceHistory
                    if (skillRewardsForExp.length > 0) {
                        await awardSkillExp(user.id, newEvent.id, skillRewardsForExp);
                    }

                    processed.push({
                        rowNum:     p.rowNum,
                        userId:     user.id,
                        studentId:  user.id,
                        email:      user.email,
                        firstName:  user.firstName,
                        lastName:   user.lastName,
                        expAwarded: totalExpPerUser,
                    });
                } catch (err) {
                    failed.push({
                        rowNum:    p.rowNum,
                        studentId: p.studentId,
                        email:     p.email,
                        error:     err instanceof Error ? err.message : "Unknown error",
                    });
                }
            }

            // อัพเดต currentParticipants
            await prisma.event.update({
                where: { id: newEvent.id },
                data:  { currentParticipants: processed.length },
            });

            return addCorsHeaders(
                NextResponse.json(transformDatesToThai({
                    success: true,
                    data: {
                        event: {
                            id:           newEvent.id,
                            title_TH:     newEvent.title_TH,
                            title_EN:     newEvent.title_EN,
                            slug:         newEvent.slug,
                            status:       newEvent.status,
                            activityStart: newEvent.activityStart,
                            activityEnd:   newEvent.activityEnd,
                        },
                        skillRewards: importSkills.map((s) => ({
                            subSkillId:   s.subSkillId,
                            subSkillName: s.subSkillName,
                            levelType:    s.levelType,
                            baseExp:      s.baseExp,
                            bonusExp:     s.bonusExp,
                            totalExp:     s.baseExp + s.bonusExp,
                        })),
                        summary: {
                            totalInFile:      importParticipants.length,
                            processed:        processed.length,
                            failed:           failed.length,
                            totalExpPerUser,
                            totalExpDistributed: totalExpPerUser * processed.length,
                        },
                        processed,
                        failed,
                    },
                })),
                req
            );
        } catch (error) {
            console.error("POST /events/import/upload error:", error);
            return addCorsHeaders(
                NextResponse.json(
                    {
                        error: "เกิดข้อผิดพลาดในการนำเข้ากิจกรรม",
                        details: error instanceof Error ? error.message : "Unknown error",
                    },
                    { status: 500 }
                ),
                req
            );
        }
    });
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * ดึงค่าเซลล์เป็น string (รองรับทุก CellValue type ของ ExcelJS)
 */
function extractCellValue(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value.trim();
    if (typeof value === "boolean") return String(value);
    // CellFormulaValue
    if (typeof value === "object" && "result" in value) {
        return extractCellValue((value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    }
    // CellRichTextValue
    if (typeof value === "object" && "richText" in value) {
        return (value as ExcelJS.CellRichTextValue).richText
            .map((r) => r.text)
            .join("")
            .trim();
    }
    // CellHyperlinkValue
    if (typeof value === "object" && "text" in value && "hyperlink" in value) {
        return String((value as ExcelJS.CellHyperlinkValue).text).trim();
    }
    return "";
}

function getCellText(ws: ExcelJS.Worksheet, rowNum: number, colNum: number): string {
    return extractCellValue(ws.getRow(rowNum).getCell(colNum).value);
}

/**
 * แปลง cell value เป็น Date
 * รองรับ: Date object, "YYYY-MM-DD HH:mm", ISO string, Excel serial date (number)
 */
function parseCellDate(ws: ExcelJS.Worksheet, rowNum: number, colNum: number): Date | null {
    const cell = ws.getRow(rowNum).getCell(colNum);
    const value = cell.value;

    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "number") {
        // Excel serial date — ExcelJS normally converts these automatically;
        // if it arrives here as a raw number it might be a serial date.
        // We attempt a naive conversion: Excel epoch is 1899-12-30.
        const epoch = new Date(Date.UTC(1899, 11, 30));
        epoch.setUTCDate(epoch.getUTCDate() + Math.floor(value));
        if (epoch.getFullYear() > 1970) return epoch;
        return null;
    }

    const str = extractCellValue(value).trim();
    if (!str) return null;

    // "YYYY-MM-DD HH:mm" or "YYYY-MM-DD HH:mm:ss"
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})/);
    if (match) {
        // Parse as UTC+7 (Bangkok)
        const d = new Date(
            `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00+07:00`
        );
        return isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * สร้าง slug จาก title_EN + timestamp
 */
function generateSlug(titleEN: string): string {
    const base = titleEN
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 60);

    return `${base}-${Date.now()}`;
}
