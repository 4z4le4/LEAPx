import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withEventStaffAuth } from "@/middleware/auth";
import ExcelJS from "exceljs";
import { RegistrationStatus } from "@prisma/client";
import { utcToThai, transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withEventStaffAuth(req, async (req: NextRequest) => {
        try {
            const eventId = parseInt((await context.params).eventId);
            if (isNaN(eventId)) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Invalid event ID" }, { status: 400 }),
                    req
                );
            }

            const { searchParams } = new URL(req.url);

            // Query params
            const page      = Math.max(1, parseInt(searchParams.get("page")  || "1"));
            const limit     = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "20")));
            const skip      = (page - 1) * limit;
            const search    = searchParams.get("search")?.trim() || undefined;
            const status    = searchParams.get("status") || undefined;
            const sortBy    = searchParams.get("sortBy") || "createdAt";
            const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";
            const format    = searchParams.get("format") || "json"; // "json" | "xlsx" | "csv"

            // ดึง event
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                select: {
                    id: true,
                    title_TH: true,
                    title_EN: true,
                    slug: true,
                    status: true,
                    registrationStart: true,
                    registrationEnd: true,
                    activityStart: true,
                    activityEnd: true,
                    maxParticipants: true,
                    currentParticipants: true,
                    allowMultipleCheckIns: true,
                    photos: {
                        select: {
                            isMain: true,
                            cloudinaryImage: {
                                select: { url: true },
                            },
                        },
                    },
                    majorCategory: {
                        select: {
                            id: true,
                            name_TH: true,
                            name_EN: true,
                            code: true,
                        },
                    },
                },
            });

            if (!event) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Event not found" }, { status: 404 }),
                    req
                );
            }

            // ---- build where clause ----
            type WhereClause = {
                event_id: number;
                status?: RegistrationStatus;
                user?: {
                    OR: Array<Record<string, unknown>>;
                };
            };

            const where: WhereClause = { event_id: eventId };

            if (status && Object.values(RegistrationStatus).includes(status as RegistrationStatus)) {
                where.status = status as RegistrationStatus;
            }

            if (search) {
                const numericSearch = parseInt(search);
                where.user = {
                    OR: [
                        { firstName: { contains: search, mode: "insensitive" } },
                        { lastName:  { contains: search, mode: "insensitive" } },
                        { email:     { contains: search, mode: "insensitive" } },
                        ...(isNaN(numericSearch) ? [] : [{ id: numericSearch }]),
                    ],
                };
            }

            // ---- total count ----
            const totalCount = await prisma.eventRegistration.count({ where });

            // ---- ดึง registrations ----
            const validSortFields = ["createdAt", "updatedAt", "status", "experienceEarned"];
            const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";

            const registrations = await prisma.eventRegistration.findMany({
                where,
                select: {
                    id: true,
                    user_id: true,
                    status: true,
                    registrationType: true,
                    checkedIn: true,
                    checkInTime: true,
                    checkedOut: true,
                    checkOutTime: true,
                    experienceEarned: true,
                    hasEvaluated: true,
                    createdAt: true,
                    updatedAt: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            faculty: true,
                            major: true,
                            photo: true,
                        },
                    },
                },
                orderBy: { [safeSortBy]: sortOrder },
                skip: format === "json" ? skip : 0,
                take: format === "json" ? limit : undefined,
            });

            // ---- ดึง ExperienceHistory ทุกคนในกลุ่มนี้ ด้วย query เดียว ----
            const userIds = registrations.map((r) => r.user_id);

            const expHistories = await prisma.experienceHistory.findMany({
                where: {
                    activity_id: eventId,
                    user_id: { in: userIds },
                },
                include: {
                    subSkillCategory: {
                        select: {
                            id: true,
                            name_TH: true,
                            name_EN: true,
                            slug: true,
                            icon: true,
                            color: true,
                            mainSkillCategory: {
                                select: {
                                    id: true,
                                    name_TH: true,
                                    name_EN: true,
                                    slug: true,
                                    icon: true,
                                    color: true,
                                },
                            },
                        },
                    },
                },
            });

            // group by user_id
            const expByUser = expHistories.reduce((acc, exp) => {
                if (!acc[exp.user_id]) acc[exp.user_id] = [];
                acc[exp.user_id].push(exp);
                return acc;
            }, {} as Record<number, typeof expHistories>);

            // ---- แปลงข้อมูล ----
            const participants = registrations.map((reg) => {
                const userExp = expByUser[reg.user_id] ?? [];

                const skills = userExp.map((exp) => ({
                    skillId:           exp.subSkillCategory.id,
                    skillName_TH:      exp.subSkillCategory.name_TH,
                    skillName_EN:      exp.subSkillCategory.name_EN,
                    skillSlug:         exp.subSkillCategory.slug,
                    skillIcon:         exp.subSkillCategory.icon,
                    skillColor:        exp.subSkillCategory.color,
                    mainSkillId:       exp.subSkillCategory.mainSkillCategory.id,
                    mainSkillName_TH:  exp.subSkillCategory.mainSkillCategory.name_TH,
                    mainSkillName_EN:  exp.subSkillCategory.mainSkillCategory.name_EN,
                    mainSkillSlug:     exp.subSkillCategory.mainSkillCategory.slug,
                    mainSkillIcon:     exp.subSkillCategory.mainSkillCategory.icon,
                    mainSkillColor:    exp.subSkillCategory.mainSkillCategory.color,
                    levelType:         exp.newLevel,       // ระดับที่ได้รับหลังกิจกรรม
                    previousLevel:     exp.previousLevel,
                    expEarned:         exp.experienceGained,
                    expType:           exp.type,
                    earnedAt:          exp.createdAt,
                }));

                return {
                    registrationId:   reg.id,
                    studentId:        reg.user.id,
                    firstName:        reg.user.firstName,
                    lastName:         reg.user.lastName,
                    fullName:         `${reg.user.firstName} ${reg.user.lastName}`,
                    email:            reg.user.email,
                    faculty:          reg.user.faculty,
                    major:            reg.user.major ?? "-",
                    photo:            reg.user.photo,
                    registrationType: reg.registrationType,
                    status:           reg.status,
                    statusDate:       reg.updatedAt,
                    checkedIn:        reg.checkedIn,
                    checkInTime:      reg.checkInTime,
                    checkedOut:       reg.checkedOut,
                    checkOutTime:     reg.checkOutTime,
                    totalExpEarned:   reg.experienceEarned,
                    hasEvaluated:     reg.hasEvaluated,
                    registeredAt:     reg.createdAt,
                    skills,
                };
            });

            // ---- สถิติ ----
            const statistics = {
                total: totalCount,
                checkedIn:   registrations.filter((r) => r.checkedIn).length,
                checkedOut:  registrations.filter((r) => r.checkedOut).length,
                completed:   registrations.filter((r) => r.status === "COMPLETED").length,
                late:        registrations.filter((r) => r.status === "LATE").length,
                absent:      registrations.filter((r) => r.status === "ABSENT").length,
                totalExpDistributed: registrations.reduce((s, r) => s + r.experienceEarned, 0),
            };

            // ==============================
            // JSON Response
            // ==============================
            if (format === "json") {
                return addCorsHeaders(
                    NextResponse.json(transformDatesToThai({
                        success: true,
                        data: {
                            event: {
                                id:                   event.id,
                                title_TH:             event.title_TH,
                                title_EN:             event.title_EN,
                                slug:                 event.slug,
                                status:               event.status,
                                registrationStart:    event.registrationStart,
                                registrationEnd:      event.registrationEnd,
                                activityStart:        event.activityStart,
                                activityEnd:          event.activityEnd,
                                maxParticipants:      event.maxParticipants,
                                currentParticipants:  event.currentParticipants,
                                allowMultipleCheckIns: event.allowMultipleCheckIns,
                                photos:               event.photos,
                                majorCategory:        event.majorCategory,
                            },
                            statistics,
                            participants,
                            pagination: {
                                total:      totalCount,
                                page,
                                limit,
                                totalPages: Math.ceil(totalCount / limit),
                                hasMore:    page * limit < totalCount,
                            },
                        },
                    })),
                    req
                );
            }

            // ==============================
            // CSV Export
            // ==============================
            if (format === "csv") {
                const headers = [
                    "ลำดับ", "รหัสนักศึกษา", "ชื่อ", "นามสกุล", "อีเมล",
                    "คณะ", "สาขา", "ประเภทการลงทะเบียน", "สถานะ", "วันที่อัพเดตสถานะ",
                    "เช็คอิน", "เวลาเช็คอิน", "เช็คเอาท์", "เวลาเช็คเอาท์",
                    "EXP รวม", "ทักษะที่ได้รับ (TH)", "ทักษะที่ได้รับ (EN)", "ระดับทักษะ", "EXP ต่อทักษะ"
                ];

                const csvRows = [headers.join(",")];

                participants.forEach((p, idx) => {
                    const skillsTH = p.skills.map((s) => `${s.mainSkillName_TH}/${s.skillName_TH}`).join(" | ");
                    const skillsEN = p.skills.map((s) => `${s.mainSkillName_EN}/${s.skillName_EN}`).join(" | ");
                    const levels   = p.skills.map((s) => s.levelType ?? "-").join(" | ");
                    const expList  = p.skills.map((s) => s.expEarned).join(" | ");

                    const row = [
                        idx + 1,
                        p.studentId,
                        `"${p.firstName}"`,
                        `"${p.lastName}"`,
                        p.email,
                        `"${p.faculty}"`,
                        `"${p.major}"`,
                        p.registrationType,
                        p.status,
                        p.statusDate ? utcToThai(new Date(p.statusDate)) ?? "-" : "-",
                        p.checkedIn ? "ใช่" : "ไม่",
                        p.checkInTime ? utcToThai(new Date(p.checkInTime)) ?? "-" : "-",
                        p.checkedOut ? "ใช่" : "ไม่",
                        p.checkOutTime ? utcToThai(new Date(p.checkOutTime)) ?? "-" : "-",
                        p.totalExpEarned,
                        `"${skillsTH}"`,
                        `"${skillsEN}"`,
                        `"${levels}"`,
                        `"${expList}"`,
                    ];
                    csvRows.push(row.join(","));
                });

                const csvContent = "\uFEFF" + csvRows.join("\n"); // BOM for Excel UTF-8
                const filename = `participants_event_${eventId}_${Date.now()}.csv`;

                return addCorsHeaders(
                    new NextResponse(csvContent, {
                        status: 200,
                        headers: {
                            "Content-Type": "text/csv; charset=utf-8",
                            "Content-Disposition": `attachment; filename="${filename}"`,
                        },
                    }),
                    req
                );
            }

            // ==============================
            // XLSX Export
            // ==============================
            if (format === "xlsx") {
                const workbook = new ExcelJS.Workbook();
                workbook.creator = "LEAP System";
                workbook.created = new Date();

                const ws = workbook.addWorksheet("ผู้เข้าร่วมกิจกรรม");

                // Title row
                ws.mergeCells("A1:S1");
                const titleCell = ws.getCell("A1");
                titleCell.value = `รายชื่อผู้เข้าร่วมกิจกรรม: ${event.title_TH}`;
                titleCell.font = { bold: true, size: 14 };
                titleCell.alignment = { horizontal: "center", vertical: "middle" };
                ws.getRow(1).height = 28;

                // Stats row
                ws.mergeCells("A2:S2");
                const statsCell = ws.getCell("A2");
                statsCell.value =
                    `ลงทะเบียน ${statistics.total} คน  |  เช็คอิน ${statistics.checkedIn} คน  |  เสร็จสมบูรณ์ ${statistics.completed} คน  |  มาสาย ${statistics.late} คน  |  ขาด ${statistics.absent} คน  |  EXP รวม ${statistics.totalExpDistributed}`;
                statsCell.font = { size: 11 };
                statsCell.alignment = { horizontal: "center" };

                // Column definitions
                ws.columns = [
                    { key: "no",               width: 6  },
                    { key: "studentId",         width: 14 },
                    { key: "firstName",         width: 16 },
                    { key: "lastName",          width: 16 },
                    { key: "email",             width: 32 },
                    { key: "faculty",           width: 16 },
                    { key: "major",             width: 18 },
                    { key: "registrationType",  width: 18 },
                    { key: "status",            width: 16 },
                    { key: "statusDate",        width: 22 },
                    { key: "checkedIn",         width: 10 },
                    { key: "checkInTime",       width: 22 },
                    { key: "checkedOut",        width: 12 },
                    { key: "checkOutTime",      width: 22 },
                    { key: "totalExp",          width: 12 },
                    { key: "skillNameTH",       width: 28 },
                    { key: "skillNameEN",       width: 28 },
                    { key: "skillLevel",        width: 14 },
                    { key: "skillExp",          width: 14 },
                ];

                // Header row
                const headerRow = ws.addRow([
                    "ลำดับ", "รหัสนักศึกษา", "ชื่อ", "นามสกุล", "อีเมล",
                    "คณะ", "สาขา", "ประเภทการลงทะเบียน", "สถานะ", "วันที่อัพเดตสถานะ",
                    "เช็คอิน", "เวลาเช็คอิน", "เช็คเอาท์", "เวลาเช็คเอาท์",
                    "EXP รวม",
                    "ทักษะที่ได้รับ (TH)", "ทักษะที่ได้รับ (EN)",
                    "ระดับทักษะ", "EXP ต่อทักษะ",
                ]);
                headerRow.font = { bold: true };
                headerRow.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FF3B5998" },
                };
                headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
                headerRow.alignment = { horizontal: "center", vertical: "middle" };
                headerRow.height = 20;

                const statusColors: Record<string, string> = {
                    COMPLETED:      "FFD4EDDA",
                    LATE:           "FFFFF3CD",
                    ABSENT:         "FFF8D7DA",
                    LATE_PENALTY:   "FFFFE5D0",
                    REGISTERED:     "FFD1ECF1",
                    ATTENDED:       "FFD1ECF1",
                    CANCELLED:      "FFE2E3E5",
                };

                const regTypeLabel: Record<string, string> = {
                    NORMAL:   "ปกติ",
                    WALK_IN:  "Walk-in",
                    WAITLIST: "Waitlist",
                };

                participants.forEach((p, idx) => {
                    const skillsTH = p.skills.map((s) => `${s.mainSkillName_TH} > ${s.skillName_TH}`).join("\n");
                    const skillsEN = p.skills.map((s) => `${s.mainSkillName_EN} > ${s.skillName_EN}`).join("\n");
                    const levels   = p.skills.map((s) => (s.levelType !== null && s.levelType !== undefined ? `Level ${s.levelType}` : "-")).join("\n");
                    const expList  = p.skills.map((s) => s.expEarned).join("\n");

                    const row = ws.addRow([
                        idx + 1,
                        p.studentId,
                        p.firstName,
                        p.lastName,
                        p.email,
                        p.faculty,
                        p.major,
                        regTypeLabel[p.registrationType] ?? p.registrationType,
                        p.status,
                        p.statusDate ? utcToThai(new Date(p.statusDate)) ?? "-" : "-",
                        p.checkedIn ? "✓" : "✗",
                        p.checkInTime  ? utcToThai(new Date(p.checkInTime))  ?? "-" : "-",
                        p.checkedOut ? "✓" : "✗",
                        p.checkOutTime ? utcToThai(new Date(p.checkOutTime)) ?? "-" : "-",
                        p.totalExpEarned,
                        skillsTH || "-",
                        skillsEN || "-",
                        levels   || "-",
                        expList  || "-",
                    ]);

                    const color = statusColors[p.status] ?? "FFFFFFFF";
                    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
                    row.alignment = { wrapText: true, vertical: "top" };
                });

                // Generate buffer
                const buffer = await workbook.xlsx.writeBuffer();
                const filename = `participants_event_${eventId}_${Date.now()}.xlsx`;

                return addCorsHeaders(
                    new NextResponse(new Uint8Array(buffer), {
                        status: 200,
                        headers: {
                            "Content-Type":
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            "Content-Disposition": `attachment; filename="${filename}"`,
                        },
                    }),
                    req
                );
            }

            // Fallback
            return addCorsHeaders(
                NextResponse.json({ error: "Unsupported format. Use json, csv, or xlsx" }, { status: 400 }),
                req
            );
        } catch (error) {
            console.error("GET /participants error:", error);
            const msg = error instanceof Error ? error.message : "Unknown error";
            return addCorsHeaders(
                NextResponse.json(
                    { error: "Failed to fetch participants", details: msg },
                    { status: 500 }
                ),
                req
            );
        }
    });
}
