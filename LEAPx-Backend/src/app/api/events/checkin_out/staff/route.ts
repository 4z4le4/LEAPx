import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withStaffAuth } from "@/middleware/auth";
import type { Event, EventStaff } from "@prisma/client";
import { verifyAndDecryptQRData } from "@/lib/qrEncryption";
import { utcToThai, transformDatesToThai } from "@/utils/timezone";

interface StaffCheckInOutRequest {
    eventId: number;
    qrCode: string;
    userId?: number;
    action?: "checkin" | "checkout"; 
}

interface AutoActionResult {
    action: "checkin" | "checkout" | null;
    error?: string;
    details?: Record<string, unknown>;
}

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function POST(req: NextRequest) {
    return withStaffAuth(req, async (req: NextRequest) => {
        try {
            const body: StaffCheckInOutRequest = await req.json();

            // Validate required fields
            if (!body.eventId) {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "Missing required fields: eventId and userId" },
                        { status: 400 }
                    ),
                    req
                );
            }

            let userId ;

            if (body.qrCode) {
                const qrVerification = verifyAndDecryptQRData(body.qrCode);

                if (!qrVerification.valid || !qrVerification.data) {
                    return addCorsHeaders(
                        NextResponse.json(
                            { 
                                error: "Invalid or expired QR code",
                                details: qrVerification.error 
                            },
                            { status: 400 }
                        ),
                        req
                    );
                }
                
                userId = qrVerification.data.userId;
            } 
            else if (body.userId) {
                userId = body.userId;
            }
            else {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "Either qrCode or userId is required" },
                        { status: 400 }
                    ),
                    req
                );
            }

            const isManualMode = !!body.action;

            // Validate action if in manual mode
            if (isManualMode && body.action !== "checkin" && body.action !== "checkout") {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "Invalid action. Must be 'checkin' or 'checkout'" },
                        { status: 400 }
                    ),
                    req
                );
            }

            // Fetch event details with major category
            const event = await prisma.event.findUnique({
                where: { id: body.eventId },
                select: {
                    id: true,
                    title_EN: true,
                    title_TH: true,
                    activityStart: true,
                    activityEnd: true,
                    staffCheckInTime: true,
                    lateCheckInPenalty: true,
                    status: true,
                    majorCategory_id: true,
                },
            });

            if (!event) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Event not found" }, { status: 404 }),
                    req
                );
            }

            // Check permission: SUPREME can scan all events, others can only scan events in their managed majors
            const scanningUser = await prisma.user.findUnique({
                where: { id: Number(userId) },
                select: {
                    id: true,
                    role: {
                        select: { name: true }
                    },
                    majorAdmins: {
                        where: { isActive: true },
                        select: { majorCategory_id: true }
                    }
                }
            });

            if (!scanningUser) {
                return addCorsHeaders(
                    NextResponse.json({ error: "User not found" }, { status: 404 }),
                    req
                );
            }

            const isSupreme = scanningUser.role.name === "SUPREME";

            // If not SUPREME, check if user is admin of this event's major category
            if (!isSupreme) {
                // Event must have a major category
                if (!event.majorCategory_id) {
                    return addCorsHeaders(
                        NextResponse.json(
                            { error: "This event does not belong to any major category. Only SUPREME can scan this event." },
                            { status: 403 }
                        ),
                        req
                    );
                }

                // Check if user is admin of this major
                const isMajorAdmin = scanningUser.majorAdmins.some(
                    admin => admin.majorCategory_id === event.majorCategory_id
                );

                if (!isMajorAdmin) {
                    return addCorsHeaders(
                        NextResponse.json(
                            { error: "You do not have permission to manage check-in/out for this event. You can only manage events in your assigned major categories." },
                            { status: 403 }
                        ),
                        req
                    );
                }
            }

            // Check event status
            if (event.status !== "PUBLISHED") {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "Event is not available for check-in/check-out" },
                        { status: 400 }
                    ),
                    req
                );
            }

            // Fetch staff assignment
            const staffAssignment = await prisma.eventStaff.findFirst({
                where: {
                    user_id: Number(userId),
                    event_id: event.id,
                },
            });

            if (!staffAssignment) {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "You are not assigned as staff for this event" },
                        { status: 403 }
                    ),
                    req
                );
            }

            const now = new Date();

            // Auto-detect action if not in manual mode
            if (!isManualMode) {
                const autoAction = await determineStaffAutoAction(
                    event,
                    staffAssignment,
                    now
                );

                if (!autoAction.action) {
                    return addCorsHeaders(
                        NextResponse.json(
                            {
                                error: autoAction.error || "No valid action available at this time",
                                details: autoAction.details,
                            },
                            { status: 400 }
                        ),
                        req
                    );
                }

                body.action = autoAction.action;
            }

            // Handle check-in
            if (body.action === "checkin") {
                return await handleStaffCheckIn(
                    event,
                    staffAssignment,
                    Number(userId),
                    now,
                    req
                );
            }

            // Handle check-out
            if (body.action === "checkout") {
                return await handleStaffCheckOut(
                    event,
                    staffAssignment,
                    Number(userId),
                    now,
                    req
                );
            }

            return addCorsHeaders(
                NextResponse.json({ error: "Invalid action" }, { status: 400 }),
                req
            );
        } catch (error) {
            console.error("Staff check-in/out error:", error);
            return addCorsHeaders(
                NextResponse.json(
                    { error: error instanceof Error ? error.message : "Unknown error" },
                    { status: 500 }
                ),
                req
            );
        }
    });
}

/**
 * Determine what action should be taken automatically
 */
async function determineStaffAutoAction(
    event: Pick<Event, "activityStart" | "activityEnd" | "staffCheckInTime" | "lateCheckInPenalty">,
    staffAssignment: EventStaff,
    now: Date
): Promise<AutoActionResult> {
    const activityStartTime = new Date(event.activityStart);
    const activityEndTime = new Date(event.activityEnd);
    const staffCheckInMinutes = event.staffCheckInTime || 60;
    
    // Calculate when staff can start checking in (e.g., 60 minutes before activity start)
    const checkInAllowedFrom = new Date(
        activityStartTime.getTime() - staffCheckInMinutes * 60 * 1000
    );

    // Not checked in yet
    if (!staffAssignment.checkedIn) {
        // Check if it's too early to check in
        if (now < checkInAllowedFrom) {
            const minutesUntilCheckIn = Math.ceil(
                (checkInAllowedFrom.getTime() - now.getTime()) / (60 * 1000)
            );

            return {
                action: null,
                error: `Check-in period has not started yet. You can check in ${minutesUntilCheckIn} minutes before the event starts.`,
                details: {
                    currentTime: now,
                    checkInAllowedFrom: checkInAllowedFrom,
                    activityStart: activityStartTime,
                    minutesUntilCheckIn,
                },
            };
        }

        // Can check in
        return { action: "checkin" };
    }

    // Already checked in, but not checked out
    if (staffAssignment.checkedIn && !staffAssignment.checkedOut) {
        // Check if event has ended
        if (now < activityEndTime) {
            const minutesUntilEnd = Math.ceil(
                (activityEndTime.getTime() - now.getTime()) / (60 * 1000)
            );

            return {
                action: null,
                error: "Already checked in. Please wait until event ends to check out.",
                details: {
                    checkInTime: staffAssignment.checkInTime,
                    activityEnd: activityEndTime,
                    currentTime: now,
                    minutesUntilEnd,
                    status: staffAssignment.status,
                },
            };
        }

        // Can check out
        return { action: "checkout" };
    }

    // Already completed check-in and check-out
    return {
        action: null,
        error: "Already completed check-in and check-out for this event",
        details: {
            currentTime: now,
            checkInTime: staffAssignment.checkInTime,
            checkOutTime: staffAssignment.checkOutTime,
            status: staffAssignment.status,
        },
    };
}

/**
 * Handle staff check-in with transaction
 */
async function handleStaffCheckIn(
    event: Pick<Event, "id" | "activityStart" | "staffCheckInTime" | "lateCheckInPenalty">,
    staffAssignment: EventStaff,
    userId: number,
    now: Date,
    req: NextRequest
): Promise<NextResponse> {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Lock staff assignment row
            const lockedStaff = await tx.$queryRaw<Array<{
                id: number;
                user_id: number;
                event_id: number;
                checkedIn: boolean;
                checkedOut: boolean;
                checkInTime: Date | null;
                checkOutTime: Date | null;
                status: string;
            }>>`
                SELECT id, user_id, event_id, "checkedIn", "checkedOut", 
                        "checkInTime", "checkOutTime", status
                FROM "EventStaff"
                WHERE user_id = ${userId} AND event_id = ${event.id}
                FOR UPDATE
            `;

            if (!lockedStaff || lockedStaff.length === 0) {
                throw new Error("STAFF_NOT_FOUND");
            }

            const staff = lockedStaff[0];

            // Prevent duplicate check-in
            if (staff.checkedIn) {
                throw new Error("ALREADY_CHECKED_IN");
            }

            const activityStartTime = new Date(event.activityStart);
            const staffCheckInMinutes = event.staffCheckInTime || 60;
            const lateThresholdMinutes = event.lateCheckInPenalty || 60;

            // Calculate when staff can start checking in
            const checkInAllowedFrom = new Date(
                activityStartTime.getTime() - staffCheckInMinutes * 60 * 1000
            );

            // Check if it's too early
            if (now < checkInAllowedFrom) {
                const minutesUntilCheckIn = Math.ceil(
                    (checkInAllowedFrom.getTime() - now.getTime()) / (60 * 1000)
                );
                throw new Error(`TOO_EARLY:${minutesUntilCheckIn}:${checkInAllowedFrom.toISOString()}`);
            }

            // Calculate late threshold
            const lateThresholdTime = new Date(
                activityStartTime.getTime() + lateThresholdMinutes * 60 * 1000
            );

            const isLate = now > lateThresholdTime;
            const minutesLate = isLate
                ? Math.floor((now.getTime() - activityStartTime.getTime()) / (60 * 1000))
                : 0;

            const newStatus = isLate ? "LATE" : "ATTENDED";

            // Update staff assignment
            const updatedStaff = await tx.eventStaff.update({
                where: {
                    event_id_user_id: {
                        user_id: userId,
                        event_id: event.id,
                    },
                },
                data: {
                    status: newStatus,
                    checkedIn: true,
                    checkInTime: now,
                },
            });

            return {
                updatedStaff,
                isLate,
                minutesLate,
                lateThresholdTime,
            };
        }, {
            isolationLevel: 'Serializable',
            maxWait: 5000,
            timeout: 10000,
        });

        return addCorsHeaders(
            NextResponse.json(transformDatesToThai({
                success: true,
                action: "checkin",
                isAutomatic: true,
                message: result.isLate
                    ? `Checked in successfully (Late by ${result.minutesLate} minutes)`
                    : "Checked in successfully",
                data: {
                    staffAssignment: result.updatedStaff,
                    isLate: result.isLate,
                    minutesLate: result.minutesLate,
                    checkInTime: now,
                    activityStart: event.activityStart,
                    lateThreshold: result.lateThresholdTime,
                },
            })),
            req
        );
    } catch (error) {
        console.error("Staff check-in transaction error:", error);

        if (error instanceof Error) {
            const errorMessage = error.message;

            if (errorMessage === "STAFF_NOT_FOUND") {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "Staff assignment not found" },
                        { status: 404 }
                    ),
                    req
                );
            }

            if (errorMessage === "ALREADY_CHECKED_IN") {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "You have already checked in for this event" },
                        { status: 409 }
                    ),
                    req
                );
            }

            if (errorMessage.startsWith("TOO_EARLY:")) {
                const parts = errorMessage.split(":");
                const minutesUntilCheckIn = parts[1];
                const checkInAllowedFrom = parts[2];

                return addCorsHeaders(
                    NextResponse.json(
                        {
                            error: `Check-in period has not started yet. Please check in ${minutesUntilCheckIn} minutes before the event starts.`,
                            checkInAllowedFrom: utcToThai(new Date(checkInAllowedFrom)),
                            currentTime: utcToThai(now),
                        },
                        { status: 400 }
                    ),
                    req
                );
            }
        }

        throw error;
    }
}

/**
 * Handle staff check-out with transaction
 */
async function handleStaffCheckOut(
    event: Pick<Event, "id" | "activityEnd">,
    staffAssignment: EventStaff,
    userId: number,
    now: Date,
    req: NextRequest
): Promise<NextResponse> {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Lock staff assignment row
            const lockedStaff = await tx.$queryRaw<Array<{
                id: number;
                user_id: number;
                event_id: number;
                checkedIn: boolean;
                checkedOut: boolean;
                checkInTime: Date | null;
                checkOutTime: Date | null;
                status: string;
            }>>`
                SELECT id, user_id, event_id, "checkedIn", "checkedOut", 
                        "checkInTime", "checkOutTime", status
                FROM "EventStaff"
                WHERE user_id = ${userId} AND event_id = ${event.id}
                FOR UPDATE
            `;

            if (!lockedStaff || lockedStaff.length === 0) {
                throw new Error("STAFF_NOT_FOUND");
            }

            const staff = lockedStaff[0];

            // Must check in first
            if (!staff.checkedIn) {
                throw new Error("NOT_CHECKED_IN");
            }

            // Prevent duplicate check-out
            if (staff.checkedOut) {
                throw new Error("ALREADY_CHECKED_OUT");
            }

            const activityEndTime = new Date(event.activityEnd);

            // Check if event has ended
            if (now < activityEndTime) {
                const minutesUntilEnd = Math.ceil(
                    (activityEndTime.getTime() - now.getTime()) / (60 * 1000)
                );
                throw new Error(`EVENT_NOT_ENDED:${minutesUntilEnd}:${activityEndTime.toISOString()}:${staff.checkInTime?.toISOString()}`);
            }

            // Determine final status based on check-in status
            const newStatus = staff.status === "LATE" ? "LATE_PENALTY" : "COMPLETED";

            // Update staff assignment
            const updatedStaff = await tx.eventStaff.update({
                where: {
                    event_id_user_id: {
                        user_id: userId,
                        event_id: event.id,
                    },
                },
                data: {
                    status: newStatus,
                    checkedOut: true,
                    checkOutTime: now,
                },
            });

            return {
                updatedStaff,
                newStatus,
            };
        }, {
            isolationLevel: 'Serializable',
            maxWait: 5000,
            timeout: 10000,
        });

        return addCorsHeaders(
            NextResponse.json(transformDatesToThai({
                success: true,
                action: "checkout",
                isAutomatic: true,
                message: "Checked out successfully",
                data: {
                    staffAssignment: result.updatedStaff,
                    checkOutTime: now,
                    finalStatus: result.newStatus,
                },
            })),
            req
        );
    } catch (error) {
        console.error("Staff check-out transaction error:", error);

        if (error instanceof Error) {
            const errorMessage = error.message;

            if (errorMessage === "STAFF_NOT_FOUND") {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "Staff assignment not found" },
                        { status: 404 }
                    ),
                    req
                );
            }

            if (errorMessage === "NOT_CHECKED_IN") {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "You must check in before checking out" },
                        { status: 400 }
                    ),
                    req
                );
            }

            if (errorMessage === "ALREADY_CHECKED_OUT") {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "You have already checked out from this event" },
                        { status: 409 }
                    ),
                    req
                );
            }

            if (errorMessage.startsWith("EVENT_NOT_ENDED:")) {
                const parts = errorMessage.split(":");
                const minutesUntilEnd = parts[1];
                const activityEnd = parts[2];
                const checkInTime = parts[3];

                return addCorsHeaders(
                    NextResponse.json(
                        {
                            error: `Already checked in. Please wait until event ends to check out (${minutesUntilEnd} minutes remaining).`,
                            checkInTime: utcToThai(new Date(checkInTime)),
                            activityEnd: utcToThai(new Date(activityEnd)),
                            currentTime: utcToThai(now),
                            minutesUntilEnd: parseInt(minutesUntilEnd),
                        },
                        { status: 400 }
                    ),
                    req
                );
            }
        }

        throw error;
    }
}