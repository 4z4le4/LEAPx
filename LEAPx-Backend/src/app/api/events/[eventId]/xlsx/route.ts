import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withEventStaffAuth } from "@/middleware/auth";
import ExcelJS from "exceljs";
import { Prisma, RegistrationStatus, RegistrationType } from "@prisma/client";
import { utcToThai } from "@/utils/timezone";

type RegistrationWithIncludes = Prisma.EventRegistrationGetPayload<{
    include: {
        user: {
            select: {
                id: true;
                firstName: true;
                lastName: true;
                email: true;
                faculty: true;
                major: true;
                phone: true;
            };
        };
        checkInRecords: {
            include: {
                checkInTimeSlot: true;
            };
        };
    };
}>;

// ---- helpers ---------------------------------------------------------------

function sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9_\-. ]/g, "_").replace(/\s+/g, "_").slice(0, 80);
}

function fmtDT(dt: Date | null | undefined): string {
    if (!dt) return "-";
    const thaiStr = utcToThai(dt);
    if (!thaiStr) return "-";
    // Format as DD/MM/YYYY HH:MM:SS
    const d = new Date(thaiStr);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function regTypeLabel(type: string): string {
    const m: Record<string, string> = {
        NORMAL: "Normal", WALK_IN: "Walk-in", WAITLIST: "Waitlist",
    };
    return m[type] ?? type;
}

function statusLabel(s: string): string {
    const m: Record<string, string> = {
        PENDING: "Pending", REGISTERED: "Registered", ATTENDED: "Attended",
        COMPLETED: "Completed", INCOMPLETE: "Incomplete", CANCELLED: "Cancelled",
        LATE: "Late", LATE_PENALTY: "Late (Penalty)", ABSENT: "Absent",
        UNDER_REVIEW: "Under Review", APPROVED: "Approved", REJECTED: "Rejected",
        NEED_MORE_INFO: "Need More Info",
    };
    return m[s] ?? s;
}

// Status → fill ARGB
const STATUS_COLOR: Record<string, string> = {
    COMPLETED:    "FFD6F5DF", // green
    LATE:         "FFFFF3CD", // yellow
    LATE_PENALTY: "FFFFEEBA", // amber
    ABSENT:       "FFF8D7DA", // red
    CANCELLED:    "FFE2E3E5", // grey
    INCOMPLETE:   "FFFDE8D8", // orange-light
    ATTENDED:     "FFD1ECF1", // teal-light
    REGISTERED:   "FFCCE5FF", // blue-light
};

const HEADER_BG   = "FF2C3E50"; // dark blue-grey
const HEADER_FONT = "FFFFFFFF"; // white

function applyHeaderStyle(cell: ExcelJS.Cell) {
    cell.font      = { bold: true, color: { argb: HEADER_FONT }, size: 10 };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border    = {
        top: { style: "thin" }, bottom: { style: "thin" },
        left: { style: "thin" }, right: { style: "thin" },
    };
}

function applyDataBorder(cell: ExcelJS.Cell) {
    cell.border = {
        top: { style: "thin", color: { argb: "FFD0D0D0" } },
        bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
        left: { style: "thin", color: { argb: "FFD0D0D0" } },
        right: { style: "thin", color: { argb: "FFD0D0D0" } },
    };
}

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

// GET /api/events/[eventId]/xlsx
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ eventId: string }> }
) {
    const { eventId: eventIdStr } = await params;
    return withEventStaffAuth(req, async (req: NextRequest) => {
        try {
            const eventId = parseInt(eventIdStr);
            if (isNaN(eventId)) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Invalid event ID" }, { status: 400 }),
                    req
                );
            }

            const { searchParams } = new URL(req.url);

            // ---- query-param filters (comma-separated OK) ----
            const statusFilter    = searchParams.get("status")?.split(",").filter(Boolean);
            const regTypeFilter   = searchParams.get("registrationType")?.split(",").filter(Boolean);
            const checkedInFilter = searchParams.get("checkedIn");   // "true" | "false"
            const checkedOutFilter = searchParams.get("checkedOut");

            // ---- fetch event ----
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    checkInTimeSlots: { orderBy: { slot_number: "asc" } },
                },
            });

            if (!event) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Event not found" }, { status: 404 }),
                    req
                );
            }

            // ---- build where ----
            const where: Prisma.EventRegistrationWhereInput = { event_id: eventId };

            if (statusFilter?.length)
                where.status = { in: statusFilter as RegistrationStatus[] };
            if (regTypeFilter?.length)
                where.registrationType = { in: regTypeFilter as RegistrationType[] };
            if (checkedInFilter !== null && checkedInFilter !== undefined)
                where.checkedIn = checkedInFilter === "true";
            if (checkedOutFilter !== null && checkedOutFilter !== undefined)
                where.checkedOut = checkedOutFilter === "true";

            // ---- fetch registrations ----
            const registrations: RegistrationWithIncludes[] = await prisma.eventRegistration.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true, firstName: true, lastName: true,
                            email: true, faculty: true, major: true, phone: true,
                        },
                    },
                    checkInRecords: {
                        include: { checkInTimeSlot: true },
                        orderBy: { checkInTimeSlot: { slot_number: "asc" } },
                    },
                },
                orderBy: [{ createdAt: "asc" }],
            });

            // Sort by status priority
            const STATUS_ORDER: Record<string, number> = {
                COMPLETED: 1, LATE: 2, LATE_PENALTY: 3, ATTENDED: 4,
                REGISTERED: 5, PENDING: 6, INCOMPLETE: 7,
                ABSENT: 8, CANCELLED: 9,
            };
            registrations.sort((a, b) =>
                (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
            );

            const slots = event.checkInTimeSlots;
            // Only expand per-slot columns when there are 2+ slots.
            // A single-slot event is fully captured by the main checkedIn/Out columns.
            const hasSlots = slots.length >= 2;

            // ====================================================================
            //  WORKBOOK
            // ====================================================================
            const wb = new ExcelJS.Workbook();
            wb.creator  = "LEAP System";
            wb.created  = new Date();

            // ====================================================================
            //  SHEET 1 – Participants
            // ====================================================================
            const ws = wb.addWorksheet("Participants", {
                views: [{ state: "frozen", ySplit: 1 }], // freeze header row
            });

            // ---- define fixed columns ----
            type ColDef = { header: string; key: string; width: number; style?: Partial<ExcelJS.Style> };
            const fixedCols: ColDef[] = [
                { header: "#",               key: "no",          width: 6 },
                { header: "Student ID",      key: "studentId",   width: 13 },
                { header: "First Name",      key: "firstName",   width: 18 },
                { header: "Last Name",       key: "lastName",    width: 18 },
                { header: "Email",           key: "email",       width: 30 },
                { header: "Faculty",         key: "faculty",     width: 22 },
                { header: "Major",           key: "major",       width: 18 },
                { header: "Phone",           key: "phone",       width: 14 },
                { header: "Reg. Type",       key: "regType",     width: 14 },
                { header: "Status",          key: "status",      width: 15 },
                { header: "Registered At",   key: "registeredAt", width: 20 },
                { header: "Checked In",      key: "checkedIn",   width: 12 },
                { header: "Check-In Time",   key: "checkInTime", width: 20 },
                { header: "Checked Out",     key: "checkedOut",  width: 13 },
                { header: "Check-Out Time",  key: "checkOutTime", width: 20 },
                { header: "EXP Earned",      key: "expEarned",   width: 12 },
                { header: "Evaluated",       key: "evaluated",   width: 12 },
            ];

            // ---- slot columns (appended to the right) ----
            const slotCols: ColDef[] = [];
            if (hasSlots) {
                for (const slot of slots) {
                    const n = slot.slot_number;
                    const label = slot.name_EN || slot.name_TH || `Slot ${n}`;
                    slotCols.push(
                        { header: `Slot ${n} – Check-In\n(${label})`,  key: `s${n}_ci`,     width: 22 },
                        { header: `Slot ${n} – Check-Out\n(${label})`, key: `s${n}_co`,     width: 22 },
                        { header: `Slot ${n} – Late?`,                 key: `s${n}_late`,   width: 12 },
                        { header: `Slot ${n} – EXP`,                   key: `s${n}_exp`,    width: 10 },
                        { header: `Slot ${n} – Status`,                key: `s${n}_status`, width: 14 },
                    );
                }
            }

            const allCols = [...fixedCols, ...slotCols];
            ws.columns = allCols.map(c => ({ key: c.key, width: c.width }));

            // ---- header row (row 1) ----
            const headerRow = ws.addRow(allCols.map(c => c.header));
            headerRow.height = hasSlots ? 36 : 24;
            headerRow.eachCell(cell => {
                applyHeaderStyle(cell);
                if (cell.value && String(cell.value).includes("\n"))
                    cell.alignment = { ...cell.alignment, wrapText: true };
            });

            // ---- auto-filter on header row ----
            ws.autoFilter = {
                from: { row: 1, column: 1 },
                to:   { row: 1, column: allCols.length },
            };

            // ---- data rows ----
            registrations.forEach((reg, idx) => {
                const slotMap = new Map(
                    reg.checkInRecords.map(r => [r.checkInTimeSlot.slot_number, r])
                );

                // Build slot cell values
                const slotValues: (string | number)[] = [];
                if (hasSlots) {
                    for (const slot of slots) {
                        const r = slotMap.get(slot.slot_number);
                        if (!r) {
                            slotValues.push("-", "-", "-", 0, "No Record");
                        } else {
                            slotValues.push(
                                fmtDT(r.checkInTime),
                                fmtDT(r.checkOutTime),
                                r.checkedIn ? (r.isLate ? "Yes" : "No") : "-",
                                r.expEarned,
                                !r.checkedIn ? "Absent"
                                    : !r.checkedOut ? (r.isLate ? "Late (In only)" : "In only")
                                    : r.isLate ? "Late"
                                    : "Completed",
                            );
                        }
                    }
                }

                const rowValues = [
                    idx + 1,
                    reg.user.id,
                    reg.user.firstName,
                    reg.user.lastName,
                    reg.user.email,
                    reg.user.faculty,
                    reg.user.major ?? "-",
                    reg.user.phone ?? "-",
                    regTypeLabel(reg.registrationType),
                    statusLabel(reg.status),
                    fmtDT(reg.createdAt),
                    reg.checkedIn  ? "Yes" : "No",
                    fmtDT(reg.checkInTime),
                    reg.checkedOut ? "Yes" : "No",
                    fmtDT(reg.checkOutTime),
                    reg.experienceEarned,
                    reg.hasEvaluated ? "Yes" : "No",
                    ...slotValues,
                ];

                const dataRow = ws.addRow(rowValues);
                dataRow.height = 18;

                // Row fill by status
                const fillArgb = STATUS_COLOR[reg.status];
                if (fillArgb) {
                    dataRow.eachCell(cell => {
                        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
                    });
                }

                // Bold status cell
                const statusCellIdx = fixedCols.findIndex(c => c.key === "status") + 1;
                dataRow.getCell(statusCellIdx).font = { bold: true, size: 10 };

                // Borders on all cells
                dataRow.eachCell({ includeEmpty: true }, cell => applyDataBorder(cell));
            });

            // ---- column header borders already applied; also style empty cells ----
            // (border applied per row above, header styled via applyHeaderStyle)

            // ====================================================================
            //  SHEET 2 – Statistics
            // ====================================================================
            const ws2 = wb.addWorksheet("Statistics", {
                views: [{ showGridLines: true }],
            });

            // -- gather stats --
            const totalRegs = registrations.length;
            const byStatus: Record<string, number> = {};
            const byRegType: Record<string, number> = {};
            let checkedInCount  = 0;
            let checkedOutCount = 0;
            let lateCount       = 0;
            let absentCount     = 0;
            let completedCount  = 0;
            let totalExp        = 0;
            let evaluatedCount  = 0;

            for (const r of registrations) {
                byStatus[r.status]           = (byStatus[r.status] ?? 0) + 1;
                byRegType[r.registrationType] = (byRegType[r.registrationType] ?? 0) + 1;
                if (r.checkedIn)               checkedInCount++;
                if (r.checkedOut)              checkedOutCount++;
                if (r.status === "LATE" || r.status === "LATE_PENALTY") lateCount++;
                if (r.status === "ABSENT")     absentCount++;
                if (r.status === "COMPLETED")  completedCount++;
                if (r.hasEvaluated)            evaluatedCount++;
                totalExp += r.experienceEarned;
            }

            ws2.columns = [
                { key: "label",  width: 26 },
                { key: "count",  width: 12 },
                { key: "pct",    width: 12 },
            ];

            // Helper: write a section title
            let statsRow = 1;
            const addSectionTitle = (title: string, color = "FF2C3E50") => {
                const r = ws2.addRow([title]);
                statsRow++;
                const cell = r.getCell(1);
                cell.font  = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
                cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
                cell.alignment = { horizontal: "left", vertical: "middle" };
                r.height = 22;
                // merge across 3 cols
                ws2.mergeCells(statsRow - 1, 1, statsRow - 1, 3);
            };
            const addTableHeader = (h1: string, h2: string, h3: string) => {
                const r = ws2.addRow([h1, h2, h3]);
                statsRow++;
                r.eachCell(c => applyHeaderStyle(c));
                r.height = 20;
            };
            const addDataRow = (label: string, count: number, total: number) => {
                const pct = total > 0 ? ((count / total) * 100).toFixed(1) + "%" : "0%";
                const r = ws2.addRow([label, count, pct]);
                statsRow++;
                r.height = 18;
                r.eachCell(c => {
                    applyDataBorder(c);
                    c.font = { size: 10 };
                });
                r.getCell(2).alignment = { horizontal: "center" };
                r.getCell(3).alignment = { horizontal: "center" };
            };

            // Section: Overview
            addSectionTitle(`Event: ${event.title_EN || event.title_TH}`, "FF1A252F");
            ws2.addRow([]); statsRow++;

            addSectionTitle("Overview", "FF2980B9");
            addTableHeader("Metric", "Count", "% of total");
            const overviewStartRow = statsRow + 1;
            addDataRow("Total Registrations",   totalRegs,      totalRegs);
            addDataRow("Checked In",            checkedInCount,  totalRegs);
            addDataRow("Checked Out",           checkedOutCount, totalRegs);
            addDataRow("Completed",             completedCount,  totalRegs);
            addDataRow("Late",                  lateCount,       totalRegs);
            addDataRow("Absent",                absentCount,     totalRegs);
            addDataRow("Evaluated",             evaluatedCount,  totalRegs);
            addDataRow("Total EXP Distributed", totalExp,        1); // % n/a
            const overviewEndRow = statsRow;
            ws2.addRow([]); statsRow++;

            // Section: By Status
            addSectionTitle("By Registration Status", "FF27AE60");
            addTableHeader("Status", "Count", "% of total");
            const statusBreakdownStart = statsRow + 1;
            const statusOrder = ["COMPLETED","LATE","LATE_PENALTY","ATTENDED","REGISTERED","PENDING","INCOMPLETE","ABSENT","CANCELLED"];
            for (const s of statusOrder) {
                if (byStatus[s]) addDataRow(statusLabel(s), byStatus[s], totalRegs);
            }
            for (const [s, cnt] of Object.entries(byStatus)) {
                if (!statusOrder.includes(s)) addDataRow(statusLabel(s), cnt, totalRegs);
            }
            const statusBreakdownEnd = statsRow;
            ws2.addRow([]); statsRow++;

            // Section: By Registration Type
            addSectionTitle("By Registration Type", "FF8E44AD");
            addTableHeader("Type", "Count", "% of total");
            const regTypeStart = statsRow + 1;
            for (const [t, cnt] of Object.entries(byRegType)) {
                addDataRow(regTypeLabel(t), cnt, totalRegs);
            }
            const regTypeEnd = statsRow;
            ws2.addRow([]); statsRow++;

            // ---- Data Bar conditional formatting on Count columns ----
            // This renders a native Excel gradient bar inside each count cell,
            // giving a clean built-in bar-chart look without any external chart object.
            const applyDataBar = (startRow: number, endRow: number, color: string) => {
                if (startRow > endRow) return;
                ws2.addConditionalFormatting({
                    ref: `B${startRow}:B${endRow}`,
                    rules: [{
                        type: "dataBar",
                        gradient: true,
                        cfvo: [
                            { type: "min" },
                            { type: "max" },
                        ],
                        color: { argb: color },
                        showValue: true,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any],
                });
            };

            applyDataBar(overviewStartRow,      overviewEndRow - 1,       "FF2980B9"); // blue
            applyDataBar(statusBreakdownStart,  statusBreakdownEnd,       "FF27AE60"); // green
            applyDataBar(regTypeStart,          regTypeEnd,               "FF8E44AD"); // purple

            // ====================================================================
            //  Finalize & return
            // ====================================================================
            const buffer = await wb.xlsx.writeBuffer();
            const filename = sanitizeFilename(event.title_EN || event.title_TH || `event_${eventId}`);
            const ts = new Date().toISOString().slice(0, 10);
            const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(/:/g, "-"); 

            const xlsxResponse = new NextResponse(buffer, {
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": `attachment; filename="${filename}_${ts}_${time}.xlsx"`,
                },
            });
            return addCorsHeaders(xlsxResponse, req);

        } catch (error) {
            console.error("XLSX export error:", error);
            return addCorsHeaders(
                NextResponse.json(
                    { error: "Failed to generate XLSX", details: error instanceof Error ? error.message : String(error) },
                    { status: 500 }
                ),
                req
            );
        }
    });
}
