import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth } from "@/middleware/auth";
import { TEMPLATE_LAYOUT } from "@/lib/eventImportLayout";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

// =============================================================================
// GET /api/events/import/template
// ดาวน์โหลด Excel template สำหรับนำเข้ากิจกรรมพร้อมรายชื่อผู้เข้าร่วม
// Auth: ACTIVITY_ADMIN+
// =============================================================================
export async function GET(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            // ดึงทักษะย่อยทั้งหมด (ที่ active) สำหรับ reference sheet + ตัวอย่าง
            const subSkills = await prisma.subSkillCategory.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    name_TH: true,
                    name_EN: true,
                    mainSkillCategory: {
                        select: {
                            name_TH: true,
                            name_EN: true,
                        },
                    },
                },
                orderBy: [
                    { mainSkillCategory: { sortOrder: "asc" } },
                    { sortOrder: "asc" },
                ],
            });

            const workbook = new ExcelJS.Workbook();
            workbook.creator = "LEAP System";
            workbook.created = new Date();
            workbook.lastModifiedBy = "LEAP System";
            workbook.modified = new Date();

            // =========================================================
            // Sheet 1: ข้อมูลกิจกรรม
            // =========================================================
            const ws1 = workbook.addWorksheet("ข้อมูลกิจกรรม");
            ws1.views = [{ showGridLines: true }];

            const L = TEMPLATE_LAYOUT.SHEET1;

            // ----- Column widths -----
            ws1.getColumn(1).width = 48; // Label / Skill ID
            ws1.getColumn(2).width = 52; // Value / ชื่อทักษะ
            ws1.getColumn(3).width = 20; // Level
            ws1.getColumn(4).width = 16; // Base EXP
            ws1.getColumn(5).width = 14; // Bonus EXP

            // ----- Title row 1 -----
            applyCell(ws1.getCell("A1"), {
                value: "กรอกข้อมูลกิจกรรม — Event Import Template  (อย่าลบหรือเพิ่มแถวในชีตนี้)",
                bold: true,
                fontSize: 13,
                fontColor: "FFFFFFFF",
                bgColor: "FF004D40",
                hAlign: "center",
                rowHeight: ws1.getRow(1),
                height: 32,
            });

            // ----- Event info section -----
            const INFO_ROWS: Array<{
                row: number;
                label: string;
                example: string;
                required: boolean;
            }> = [
                {
                    row: L.TITLE_TH_ROW,
                    label: "ชื่อกิจกรรม (TH) *",
                    example: "งานพัฒนาตัวเอง CMU 2026",
                    required: true,
                },
                {
                    row: L.TITLE_EN_ROW,
                    label: "ชื่อกิจกรรม (EN) *",
                    example: "CMU Self-Development 2026",
                    required: true,
                },
                {
                    row: L.DESC_TH_ROW,
                    label: "คำอธิบายกิจกรรม (TH)",
                    example: "กิจกรรมพัฒนาทักษะสำหรับนักศึกษาคณะวิศวกรรมศาสตร์",
                    required: false,
                },
                {
                    row: L.DESC_EN_ROW,
                    label: "คำอธิบายกิจกรรม (EN)",
                    example: "Skill development activity for engineering students",
                    required: false,
                },
                {
                    row: L.LOC_TH_ROW,
                    label: "สถานที่จัดงาน (TH) *",
                    example: "ห้อง ENB3306 คณะวิศวกรรมศาสตร์ มช.",
                    required: true,
                },
                {
                    row: L.LOC_EN_ROW,
                    label: "สถานที่จัดงาน (EN) *",
                    example: "Room ENB3306, Engineering Faculty, CMU",
                    required: true,
                },
                {
                    row: L.ACT_START_ROW,
                    label: "วันที่เริ่มกิจกรรม * (YYYY-MM-DD HH:mm)",
                    example: "2026-03-01 08:00",
                    required: true,
                },
                {
                    row: L.ACT_END_ROW,
                    label: "วันที่สิ้นสุดกิจกรรม * (YYYY-MM-DD HH:mm)",
                    example: "2026-03-01 17:00",
                    required: true,
                },
                {
                    row: L.REG_START_ROW,
                    label: "วันที่เริ่มลงทะเบียน (ถ้าไม่กรอกจะใช้วันเริ่มกิจกรรม)",
                    example: "2026-02-01 08:00",
                    required: false,
                },
                {
                    row: L.REG_END_ROW,
                    label: "วันที่สิ้นสุดลงทะเบียน (ถ้าไม่กรอกจะใช้วันเริ่มกิจกรรม)",
                    example: "2026-02-28 23:59",
                    required: false,
                },
            ];

            for (const { row, label, example, required } of INFO_ROWS) {
                const labelCell = ws1.getRow(row).getCell(1);
                const valueCell = ws1.getRow(row).getCell(2);

                applyCell(labelCell, {
                    value: label,
                    bold: required,
                    bgColor: required ? "FFB2DFDB" : "FFE0F2F1",
                    border: true,
                    rowHeight: ws1.getRow(row),
                    heightValue: 22,
                });
                applyCell(valueCell, {
                    value: example,
                    bgColor: "FFE0F7FA",
                    border: true,
                });
            }

            // ----- Row 12: separator -----
            ws1.getRow(12).height = 8;

            // ----- Row 13: Skills section header -----
            applyCell(ws1.getCell("A13"), {
                value:
                    "ทักษะที่ได้รับจากกิจกรรม  —  ดู SubSkill ID ในชีต \"ทักษะอ้างอิง\"  |  เพิ่มแถวได้แต่ห้ามเว้นแถวว่างกลาง",
                bold: true,
                fontSize: 11,
                fontColor: "FFFFFFFF",
                bgColor: "FF00695C",
                hAlign: "center",
                rowHeight: ws1.getRow(13),
                height: 26,
            });

            // ----- Row 14: Skills table header -----
            const SKILLS_COL_HEADERS = [
                "SubSkill ID *",
                "ชื่อทักษะ (อ้างอิง — ห้ามแก้ไข)",
                "Level * (I / II / III / IV)",
                "EXP พื้นฐาน *",
                "EXP โบนัส",
            ] as const;

            SKILLS_COL_HEADERS.forEach((h, i) => {
                applyCell(ws1.getRow(14).getCell(i + 1), {
                    value: h,
                    bold: true,
                    fontColor: "FF004D40",
                    bgColor: "FFB2EBF2",
                    hAlign: "center",
                    border: true,
                });
            });
            ws1.getRow(14).height = 22;

            // ----- example skill rows (first 3 subskills) -----
            const exampleSkills = subSkills.slice(0, 3);
            exampleSkills.forEach((skill, i) => {
                const rowNum = L.SKILLS_DATA_START_ROW + i;
                const dataRow = ws1.getRow(rowNum);

                dataRow.getCell(1).value = skill.id;
                dataRow.getCell(2).value = `${skill.mainSkillCategory.name_TH} > ${skill.name_TH}`;
                dataRow.getCell(3).value = "I";
                dataRow.getCell(4).value = 30;
                dataRow.getCell(5).value = 0;

                for (let c = 1; c <= 5; c++) {
                    applyCell(dataRow.getCell(c), {
                        bgColor: "FFE0F7FA",
                        border: true,
                        hAlign: c === 1 || c >= 3 ? "center" : "left",
                    });
                }
                dataRow.height = 20;
            });

            // =========================================================
            // Sheet 2: รายชื่อผู้เข้าร่วม
            // =========================================================
            const ws2 = workbook.addWorksheet("รายชื่อผู้เข้าร่วม");
            const L2 = TEMPLATE_LAYOUT.SHEET2;

            ws2.getColumn(1).width = 20; // รหัสนักศึกษา
            ws2.getColumn(2).width = 34; // อีเมล
            ws2.getColumn(3).width = 22; // ชื่อ
            ws2.getColumn(4).width = 22; // นามสกุล
            ws2.getColumn(5).width = 30; // คณะ
            ws2.getColumn(6).width = 30; // สาขา

            // Row 1: Note
            applyCell(ws2.getCell("A1"), {
                value:
                    "* = จำเป็นต้องกรอก  |  รหัสนักศึกษาต้องมีอยู่ในระบบ  |  อีเมลใช้ค้นหาสำรอง  |  ชื่อ-นามสกุลเป็นข้อมูลอ้างอิงเท่านั้น (ไม่บังคับ)",
                italic: true,
                fontSize: 10,
                fontColor: "FF004D40",
                bgColor: "FFE0F2F1",
                rowHeight: ws2.getRow(L2.NOTE_ROW),
                height: 32,
            });

            // Row 2: Headers
            const P_HEADERS = [
                "รหัสนักศึกษา *",
                "อีเมล *",
                "ชื่อ (อ้างอิง)",
                "นามสกุล (อ้างอิง)",
                "คณะ (อ้างอิง)",
                "สาขา (อ้างอิง)",
            ];
            P_HEADERS.forEach((h, i) => {
                applyCell(ws2.getRow(L2.HEADER_ROW).getCell(i + 1), {
                    value: h,
                    bold: true,
                    fontColor: "FFFFFFFF",
                    bgColor: "FF00695C",
                    hAlign: "center",
                    border: true,
                });
            });
            ws2.getRow(L2.HEADER_ROW).height = 22;

            // Row 3: Example
            const exRow2 = ws2.getRow(L2.DATA_START_ROW);
            [650612345, "student@cmu.ac.th", "ชนาธิป", "มีสุข", "วิศวกรรมศาสตร์", "วิศวกรรมคอมพิวเตอร์"].forEach((v, i) => {
                applyCell(exRow2.getCell(i + 1), {
                    value: v,
                    bgColor: "FFE0F7FA",
                    border: true,
                });
            });
            exRow2.height = 20;

            ws2.views = [{ state: "frozen", ySplit: 2 }];

            // =========================================================
            // Sheet 3: ทักษะอ้างอิง (Read-only reference)
            // =========================================================
            const ws3 = workbook.addWorksheet("ทักษะอ้างอิง");

            ws3.getColumn(1).width = 14;
            ws3.getColumn(2).width = 38;
            ws3.getColumn(3).width = 38;
            ws3.getColumn(4).width = 32;
            ws3.getColumn(5).width = 32;

            const S_HEADERS = [
                "SubSkill ID",
                "ชื่อทักษะ (TH)",
                "ชื่อทักษะ (EN)",
                "ทักษะหลัก (TH)",
                "ทักษะหลัก (EN)",
            ];
            S_HEADERS.forEach((h, i) => {
                applyCell(ws3.getRow(1).getCell(i + 1), {
                    value: h,
                    bold: true,
                    fontColor: "FFFFFFFF",
                    bgColor: "FF004D40",
                    hAlign: "center",
                    border: true,
                });
            });
            ws3.getRow(1).height = 22;

            subSkills.forEach((skill, i) => {
                const row = ws3.getRow(i + 2);
                [
                    skill.id,
                    skill.name_TH,
                    skill.name_EN,
                    skill.mainSkillCategory.name_TH,
                    skill.mainSkillCategory.name_EN,
                ].forEach((v, j) => {
                    applyCell(row.getCell(j + 1), {
                        value: v,
                        bgColor: i % 2 === 0 ? "FFE0F2F1" : "FFFFFFFF",
                        border: true,
                        hAlign: j === 0 ? "center" : "left",
                    });
                });
                row.height = 18;
            });

            ws3.views = [{ state: "frozen", ySplit: 1 }];

            // =========================================================
            // Generate buffer & send
            // =========================================================
            const buffer = await workbook.xlsx.writeBuffer();
            const filename = `Event_Import_Template_${Date.now()}.xlsx`;

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
        } catch (error) {
            console.error("Error generating event import template:", error);
            return addCorsHeaders(
                NextResponse.json(
                    {
                        error: "ไม่สามารถสร้าง template ได้",
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
// Helper: apply common styling to an ExcelJS cell
// =============================================================================
interface ApplyCellOptions {
    value?: ExcelJS.CellValue;
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    fontColor?: string;  // ARGB hex e.g. "FFFFFFFF"
    bgColor?: string;    // ARGB hex
    hAlign?: ExcelJS.Alignment["horizontal"];
    wrapText?: boolean;
    border?: boolean;
    rowHeight?: ExcelJS.Row;
    height?: number;
    heightValue?: number;
}

function applyCell(cell: ExcelJS.Cell, opts: ApplyCellOptions): void {
    if (opts.value !== undefined) cell.value = opts.value;

    const font: Partial<ExcelJS.Font> = {};
    if (opts.bold)             font.bold = true;
    if (opts.italic)           font.italic = true;
    if (opts.fontSize)         font.size = opts.fontSize;
    if (opts.fontColor)        font.color = { argb: opts.fontColor };
    if (Object.keys(font).length) cell.font = font;

    if (opts.bgColor) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.bgColor } };
    }

    const alignment: Partial<ExcelJS.Alignment> = {};
    if (opts.hAlign)   alignment.horizontal = opts.hAlign;
    if (opts.wrapText) alignment.wrapText   = true;
    alignment.vertical = "middle";
    cell.alignment = alignment;

    if (opts.border) {
        const bs: ExcelJS.BorderStyle = "thin";
        const bc = { argb: "FFCCCCCC" };
        cell.border = {
            top:    { style: bs, color: bc },
            left:   { style: bs, color: bc },
            bottom: { style: bs, color: bc },
            right:  { style: bs, color: bc },
        };
    }

    if (opts.rowHeight && opts.height) {
        opts.rowHeight.height = opts.height;
    }
    // legacy single-name alias kept for backward compat
    if (opts.rowHeight && opts.heightValue) {
        opts.rowHeight.height = opts.heightValue;
    }
}
