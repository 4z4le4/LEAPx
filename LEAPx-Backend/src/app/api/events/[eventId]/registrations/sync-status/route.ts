import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth } from "@/middleware/auth";
import { transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

/**
 * POST /api/events/[eventId]/registrations/sync-status
 *
 * Sync ค่าสถานะ EventRegistration ให้ตรงกับข้อมูลจริงใน UserCheckInRecord
 *
 * Logic:
 *  - ดึง UserCheckInRecord ทั้งหมดของแต่ละ registration
 *  - ถ้ามี record อย่างน้อย 1 ที่ checkedIn=true และ checkedOut=true ทุก record ที่ checkedIn
 *    → COMPLETED
 *  - ถ้ามี record ที่ checkedIn=true แต่ checkedOut=false อยู่
 *    → ATTENDED (หรือ LATE ถ้า isLate=true อย่างน้อย 1 record)
 *  - อัพเดท checkedIn / checkInTime / checkedOut / checkOutTime ของ EventRegistration ให้ตรงด้วย
 *
 * Query params:
 *  - dryRun=true  → แค่ preview ไม่ save ลง DB
 *  - userId=123   → sync เฉพาะ user เดียว (optional)
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const eventId = parseInt((await context.params).eventId);
            if (isNaN(eventId)) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Invalid event ID" }, { status: 400 }),
                    req
                );
            }

            const { searchParams } = new URL(req.url);
            const dryRun = searchParams.get("dryRun") === "true";
            const filterUserId = searchParams.get("userId")
                ? parseInt(searchParams.get("userId")!)
                : null;

            // ตรวจสอบว่า event มีอยู่
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                select: {
                    id: true,
                    title_TH: true,
                    title_EN: true,
                    allowMultipleCheckIns: true,
                    activityEnd: true,
                    checkInTimeSlots: {
                        select: { id: true, slot_number: true },
                        orderBy: { slot_number: "asc" },
                    },
                },
            });

            if (!event) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Event not found" }, { status: 404 }),
                    req
                );
            }

            // ดึง registrations ทั้งหมด (หรือเฉพาะ userId ที่ระบุ)
            const registrations = await prisma.eventRegistration.findMany({
                where: {
                    event_id: eventId,
                    ...(filterUserId ? { user_id: filterUserId } : {}),
                    // เอาเฉพาะสถานะที่ยังต้อง sync (ไม่ใช่ CANCELLED/ABSENT เป็นต้น)
                    status: {
                        in: ["REGISTERED", "ATTENDED", "LATE", "LATE_PENALTY", "INCOMPLETE"],
                    },
                },
                include: {
                    checkInRecords: {
                        orderBy: { checkInTimeSlot: { slot_number: "asc" } },
                    },
                },
            });

            if (registrations.length === 0) {
                return addCorsHeaders(
                    NextResponse.json(transformDatesToThai({
                        success: true,
                        message: "ไม่มี registration ที่ต้องอัพเดท",
                        dryRun,
                        summary: { total: 0, updated: 0, skipped: 0 },
                        changes: [],
                    })),
                    req
                );
            }

            type ChangeItem = {
                registrationId: number;
                userId: number;
                oldStatus: string;
                newStatus: string;
                oldCheckedIn: boolean;
                newCheckedIn: boolean;
                oldCheckedOut: boolean;
                newCheckedOut: boolean;
                newCheckInTime: Date | null;
                newCheckOutTime: Date | null;
                reason: string;
            };

            const changes: ChangeItem[] = [];
            const updatePromises: Promise<unknown>[] = [];

            for (const reg of registrations) {
                const records = reg.checkInRecords;
                const checkedInRecords = records.filter((r) => r.checkedIn);
                const hasAnyCheckIn = checkedInRecords.length > 0;

                // ไม่มี record หรือมี record แต่ไม่มีการเช็คอินจริง → ABSENT
                if (!hasAnyCheckIn) {
                    if (reg.status === "ABSENT") continue; // ไม่ต้องเปลี่ยนถ้าเป็น ABSENT อยู่แล้ว

                    const absentChange: ChangeItem = {
                        registrationId: reg.id,
                        userId: reg.user_id,
                        oldStatus: reg.status,
                        newStatus: "ABSENT",
                        oldCheckedIn: reg.checkedIn,
                        newCheckedIn: false,
                        oldCheckedOut: reg.checkedOut,
                        newCheckedOut: false,
                        newCheckInTime: null,
                        newCheckOutTime: null,
                        reason: records.length === 0
                            ? "ไม่มีข้อมูลใน UserCheckInRecord เลย"
                            : "มี UserCheckInRecord แต่ checkedIn=false ทั้งหมด",
                    };
                    changes.push(absentChange);

                    if (!dryRun) {
                        updatePromises.push(
                            prisma.eventRegistration.update({
                                where: { id: reg.id },
                                data: {
                                    status: "ABSENT",
                                    checkedIn: false,
                                    checkInTime: null,
                                    checkedOut: false,
                                    checkOutTime: null,
                                },
                            })
                        );
                    }
                    continue;
                }

                // checkedIn = มีอย่างน้อย 1 record ที่ checkedIn
                const newCheckedIn = true;
                const firstCheckInTime = checkedInRecords
                    .map((r) => r.checkInTime)
                    .filter((t): t is Date => t !== null)
                    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

                const checkedOutRecords = records.filter((r) => r.checkedOut);
                const hasAnyLate = checkedInRecords.some((r) => r.isLate);

                // ----- ตัดสิน newCheckedOut และ newStatus -----
                // กรณี multi-slot: ถือว่า "checkout แล้ว" เมื่อ
                //   checkedIn record ทั้งหมด ก็ checkedOut ด้วย
                const allCheckedInAreCheckedOut =
                    checkedInRecords.length > 0 &&
                    checkedInRecords.every((r) => r.checkedOut);

                const lastCheckOutTime =
                    checkedOutRecords.length > 0
                        ? checkedOutRecords
                              .map((r) => r.checkOutTime)
                              .filter((t): t is Date => t !== null)
                              .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
                        : null;

                const newCheckedOut = allCheckedInAreCheckedOut;

                const eventHasEnded = new Date() > new Date(event.activityEnd);

                let newStatus: string;
                if (allCheckedInAreCheckedOut) {
                    newStatus = "COMPLETED";
                } else if (eventHasEnded) {
                    // กิจกรรมจบแล้ว แต่ยังไม่ได้เช็คเอ้าท์ครบ = ไม่สมบูรณ์
                    newStatus = "INCOMPLETE";
                } else if (hasAnyLate) {
                    newStatus = "LATE";
                } else {
                    newStatus = "ATTENDED";
                }

                // เช็คว่าต้องเปลี่ยนจริงไหม
                const statusChanged = reg.status !== newStatus;
                const checkedInChanged = reg.checkedIn !== newCheckedIn;
                const checkedOutChanged = reg.checkedOut !== newCheckedOut;
                const checkInTimeChanged =
                    (reg.checkInTime?.getTime() ?? null) !==
                    (firstCheckInTime?.getTime() ?? null);
                const checkOutTimeChanged =
                    (reg.checkOutTime?.getTime() ?? null) !==
                    (lastCheckOutTime?.getTime() ?? null);

                const needsUpdate =
                    statusChanged ||
                    checkedInChanged ||
                    checkedOutChanged ||
                    checkInTimeChanged ||
                    checkOutTimeChanged;

                if (!needsUpdate) {
                    continue;
                }

                const change: ChangeItem = {
                    registrationId: reg.id,
                    userId: reg.user_id,
                    oldStatus: reg.status,
                    newStatus,
                    oldCheckedIn: reg.checkedIn,
                    newCheckedIn,
                    oldCheckedOut: reg.checkedOut,
                    newCheckedOut,
                    newCheckInTime: firstCheckInTime,
                    newCheckOutTime: lastCheckOutTime,
                    reason: allCheckedInAreCheckedOut
                        ? "checkedIn records ทั้งหมดมี checkedOut=true แล้ว"
                        : eventHasEnded
                        ? "กิจกรรมจบแล้วแต่ยังไม่ได้เช็คเอ้าท์ครบ"
                        : hasAnyLate
                        ? "มี record ที่ isLate=true"
                        : "มี checkedIn=true แต่ยังไม่ครบ checkout",
                };

                changes.push(change);

                if (!dryRun) {
                    updatePromises.push(
                        prisma.eventRegistration.update({
                            where: { id: reg.id },
                            data: {
                                status: newStatus as
                                    | "ATTENDED"
                                    | "LATE"
                                    | "INCOMPLETE"
                                    | "COMPLETED",
                                checkedIn: newCheckedIn,
                                checkInTime: firstCheckInTime,
                                checkedOut: newCheckedOut,
                                checkOutTime: lastCheckOutTime,
                            },
                        })
                    );
                }
            }

            // Execute all updates
            if (!dryRun && updatePromises.length > 0) {
                await Promise.all(updatePromises);
            }

            const statusSummary = changes.reduce(
                (acc, c) => {
                    const key = `${c.oldStatus} → ${c.newStatus}`;
                    acc[key] = (acc[key] ?? 0) + 1;
                    return acc;
                },
                {} as Record<string, number>
            );

            return addCorsHeaders(
                NextResponse.json(transformDatesToThai({
                    success: true,
                    dryRun,
                    message: dryRun
                        ? `[DryRun] พบ ${changes.length} registration ที่ต้องอัพเดท`
                        : `อัพเดทสถานะเรียบร้อย ${changes.length} registration`,
                    summary: {
                        totalRegistrationsChecked: registrations.length,
                        updated: changes.length,
                        skipped: registrations.length - changes.length,
                        statusSummary,
                    },
                    changes: changes.map((c) => ({
                        registrationId: c.registrationId,
                        userId: c.userId,
                        statusChange: `${c.oldStatus} → ${c.newStatus}`,
                        checkedInChange: c.oldCheckedIn !== c.newCheckedIn
                            ? `${c.oldCheckedIn} → ${c.newCheckedIn}`
                            : "ไม่เปลี่ยน",
                        checkedOutChange: c.oldCheckedOut !== c.newCheckedOut
                            ? `${c.oldCheckedOut} → ${c.newCheckedOut}`
                            : "ไม่เปลี่ยน",
                        newCheckInTime: c.newCheckInTime,
                        newCheckOutTime: c.newCheckOutTime,
                        reason: c.reason,
                    })),
                })),
                req
            );
        } catch (error) {
            console.error("Sync registration status error:", error);
            return addCorsHeaders(
                NextResponse.json(
                    {
                        error: "Internal server error",
                        details: error instanceof Error ? error.message : String(error),
                    },
                    { status: 500 }
                ),
                req
            );
        }
    });
}
