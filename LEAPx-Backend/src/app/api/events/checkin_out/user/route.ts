import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withEventStaffAuth } from "@/middleware/auth";
import type { Event, EventRegistration, UserCheckInRecord, CheckInTimeSlot } from "@prisma/client";
import { verifyAndDecryptQRData } from "@/lib/qrEncryption";
import { calculateEventTotalExp, awardSkillExp } from "@/lib/expCalculation";
import { isWithinCheckInWindow } from "@/lib/timeSlotValidation";
import { transformDatesToThai } from "@/utils/timezone";    

interface AutoCheckInOutRequest {
    eventId: number;
    userId?: number;
    qrCode?: string;
}

interface ManualCheckInOutRequest {
    eventId: number;
    userId?: number;
    qrCode?: string;
    action: "checkin" | "checkout";
}

type CheckInOutRequest = AutoCheckInOutRequest | ManualCheckInOutRequest;

function findCurrentSlot(
    slots: CheckInTimeSlot[], 
    now: Date
): CheckInTimeSlot | undefined {
    return slots.find(slot => {
        const slotStart = new Date(slot.startTime);
        const slotEnd = new Date(slot.endTime);
        return now >= slotStart && now <= slotEnd;
    });
}

/**
 * Find the slot that is currently open for CHECK-IN, taking per-slot
 * earlyCheckInMinutes into account.  Falls back to the event-level
 * checkInWindowBefore when earlyCheckInMinutes is null.
 *
 * A slot is "open for check-in" when:
 *   (slotStart - earlyMinutes)  <=  now  <=  slotEnd
 */
function findCurrentSlotForCheckIn(
    slots: CheckInTimeSlot[],
    now: Date,
    eventCheckInWindowBefore: number
): CheckInTimeSlot | undefined {
    return slots.find(slot => {
        const earlyMinutes =
            slot.earlyCheckInMinutes !== null && slot.earlyCheckInMinutes !== undefined
                ? slot.earlyCheckInMinutes
                : eventCheckInWindowBefore;
        const slotStart = new Date(slot.startTime);
        const slotEnd   = new Date(slot.endTime);
        const earlyStart = new Date(slotStart.getTime() - earlyMinutes * 60 * 1000);
        return now >= earlyStart && now <= slotEnd;
    });
}

function findLastEndedSlot(
    slots: CheckInTimeSlot[], 
    now: Date
): CheckInTimeSlot | undefined {
    return slots
        .filter(slot => new Date(slot.endTime) < now)
        .sort((a, b) => 
            new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
        )[0];
}

function findNextSlot(
    slots: CheckInTimeSlot[], 
    now: Date
): CheckInTimeSlot | undefined {
    return slots
        .filter(slot => new Date(slot.startTime) > now)
        .sort((a, b) => 
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )[0];
}

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function POST(req: NextRequest) {
    
    return withEventStaffAuth(req, async (req: NextRequest) => {
        try {
            const body: CheckInOutRequest = await req.json();

            if (!body.eventId ) {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "Missing required fields: eventId " },
                        { status: 400 }
                    ),
                    req
                );
            }

            let userId;
            
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

            const isManualMode = 'action' in body && body.action;
            
            if (isManualMode && body.action !== "checkin" && body.action !== "checkout") {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "Invalid action. Must be 'checkin' or 'checkout'" },
                        { status: 400 }
                    ),
                    req
                );
            }

            const event = await prisma.event.findUnique({
                where: { id: body.eventId },
                include: {
                    checkInTimeSlots: {
                        orderBy: { slot_number: 'asc' }
                    }
                }
            });

            if (!event) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Event not found",
                        userId: userId
                    }, { status: 404 }),
                    req
                );
            }

            if (event.status !== "PUBLISHED") {
                return addCorsHeaders(
                    NextResponse.json(
                        { 
                            error: "Event is not available for check-in/check-out",
                            userId: userId
                        },
                        { status: 400 }
                    ),
                    req
                );
            }

            // ===== รองรับ WALK-IN =====
            let registration = await prisma.eventRegistration.findUnique({
                where: {
                    user_id_event_id: {
                        user_id: Number(userId),
                        event_id: event.id,
                    },
                },
                include: {
                    checkInRecords: {
                        include: {
                            checkInTimeSlot: true
                        },
                        orderBy: {
                            checkInTimeSlot: {
                                slot_number: 'asc'
                            }
                        }
                    }
                }
            });

            // Handle Walk-in: Auto-create registration if walk-in is enabled
            if (!registration && event.walkinEnabled) {
                // Use transaction with locking to prevent race condition
                try {
                    registration = await prisma.$transaction(async (tx) => {
                        // Lock event row with FOR UPDATE
                        const lockedEvent = await tx.$queryRaw<Array<{
                            id: number;
                            currentWalkins: number;
                            walkinCapacity: number;
                            walkinEnabled: boolean;
                        }>>`
                            SELECT id, "currentWalkins", "walkinCapacity", "walkinEnabled"
                            FROM "Event"
                            WHERE id = ${event.id}
                            FOR UPDATE
                        `;

                        if (!lockedEvent || lockedEvent.length === 0) {
                            throw new Error('EVENT_NOT_FOUND');
                        }

                        const currentEvent = lockedEvent[0];

                        // Check walk-in capacity inside transaction
                        if (currentEvent.currentWalkins >= currentEvent.walkinCapacity) {
                            throw new Error('WALKIN_FULL');
                        }

                        // Check if registration was created concurrently
                        const existingReg = await tx.eventRegistration.findUnique({
                            where: {
                                user_id_event_id: {
                                    user_id: Number(userId),
                                    event_id: currentEvent.id
                                }
                            }
                        });

                        if (existingReg) {
                            // Registration exists, return it with check-in records
                            return await tx.eventRegistration.findUnique({
                                where: {
                                    user_id_event_id: {
                                        user_id: Number(userId),
                                        event_id: currentEvent.id
                                    }
                                },
                                include: {
                                    checkInRecords: {
                                        include: {
                                            checkInTimeSlot: true
                                        },
                                        orderBy: {
                                            checkInTimeSlot: {
                                                slot_number: 'asc'
                                            }
                                        }
                                    }
                                }
                            });
                        }

                        // Create walk-in registration
                        const newRegistration = await tx.eventRegistration.create({
                            data: {
                                user_id: Number(userId),
                                event_id: currentEvent.id,
                                registrationType: "WALK_IN",
                                status: "REGISTERED"
                            },
                            include: {
                                checkInRecords: {
                                    include: {
                                        checkInTimeSlot: true
                                    },
                                    orderBy: {
                                        checkInTimeSlot: {
                                            slot_number: 'asc'
                                        }
                                    }
                                }
                            }
                        });

                        // Update walk-in count
                        await tx.event.update({
                            where: { id: currentEvent.id },
                            data: {
                                currentWalkins: { increment: 1 },
                                currentParticipants: { increment: 1 }
                            }
                        });

                        return newRegistration;
                    }, {
                        isolationLevel: 'Serializable',
                        maxWait: 5000,
                        timeout: 10000
                    });

                } catch (error) {
                    console.error("Walk-in registration error:", error);
                    
                    if (error instanceof Error) {
                        const errorMessage = error.message;
                        
                        if (errorMessage === 'WALKIN_FULL') {
                            return addCorsHeaders(
                                NextResponse.json(
                                    { 
                                        error: "Walk-in capacity is full",
                                        userId: userId,
                                        currentWalkins: event.currentWalkins,
                                        maxCapacity: event.walkinCapacity
                                    },
                                    { status: 403 }
                                ),
                                req
                            );
                        }
                        
                        if (errorMessage === 'EVENT_NOT_FOUND') {
                            return addCorsHeaders(
                                NextResponse.json(
                                    { error: "Event not found" },
                                    { status: 404 }
                                ),
                                req
                            );
                        }
                    }
                    
                    return addCorsHeaders(
                        NextResponse.json(
                            { 
                                error: "Failed to create walk-in registration",
                                userId: userId
                            },
                            { status: 500 }
                        ),
                        req
                    );
                }
            } else if (!registration) {
                return addCorsHeaders(
                    NextResponse.json(
                        { 
                            error: "You are not registered for this event. Walk-in is not available.",
                            userId: userId,
                            walkinEnabled: event.walkinEnabled
                        },
                        { status: 403 }
                    ),
                    req
                );
            }
            
            // TypeScript null check - this should never happen due to above logic
            if (!registration) {
                return addCorsHeaders(
                    NextResponse.json(
                        { 
                            error: "Registration not found",
                            userId: userId
                        },
                        { status: 404 }
                    ),
                    req
                );
            }

            if (registration.status !== "REGISTERED" && registration.status !== "LATE" && registration.status !== "ATTENDED") {
                return addCorsHeaders(
                    NextResponse.json(
                        { 
                            error: `Cannot check-in/check-out with registration status: ${registration.status}`,
                            userId: userId
                        },
                        { status: 400 }
                    ),
                    req
                );
            }

            const now = new Date();

            if (!isManualMode) {
                const autoAction = await determineAutoAction(event, registration, now);
                
                if (!autoAction.action) {
                    return addCorsHeaders(
                        NextResponse.json({
                            error: autoAction.error || "No valid action available at this time",
                            details: autoAction.details,
                            userId: userId
                        }, { status: 400 }),
                        req
                    );
                }
                
                (body as ManualCheckInOutRequest).action = autoAction.action;
            }

            if (event.allowMultipleCheckIns) {
                return await handleMultipleCheckIns(
                    event,
                    registration,
                    body as ManualCheckInOutRequest,
                    now,
                    req
                );
            }

            return await handleSingleCheckIn(
                event,
                registration,
                body as ManualCheckInOutRequest,
                now,
                req,
                Number(userId)
            );

        } catch (error) {
            console.error("Check-in/out error:", error);
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

async function determineAutoAction(
    event: Event & { checkInTimeSlots: CheckInTimeSlot[] },
    registration: EventRegistration & { checkInRecords: (UserCheckInRecord & { checkInTimeSlot: CheckInTimeSlot })[] },
    now: Date
): Promise<{ 
    action: "checkin" | "checkout" | null; 
    error?: string;
    details?: Record<string, unknown>;
}> {
    if (event.allowMultipleCheckIns) {
        let currentSlot = findCurrentSlotForCheckIn(
            event.checkInTimeSlots,
            now,
            event.checkInWindowBefore ?? 60
        );

        if (!currentSlot) {
            const lastEndedSlot = findLastEndedSlot(event.checkInTimeSlots, now);
            const nextSlot = findNextSlot(event.checkInTimeSlots, now);

            if (lastEndedSlot) {
                const shouldAllowCheckout = !nextSlot || 
                    now < new Date(nextSlot.startTime);
                
                if (shouldAllowCheckout) {
                    const existingRecord = registration.checkInRecords.find(
                        record => record.checkInTimeSlot_id === lastEndedSlot.id
                    );

                    if (existingRecord?.checkedIn && !existingRecord.checkedOut) {
                        currentSlot = lastEndedSlot;
                    } else if (existingRecord?.checkedOut) {
                        return {
                            action: null,
                            error: "Already checked out from this slot",
                            details: {
                                slot_number: lastEndedSlot.slot_number,
                                checkInTime: existingRecord.checkInTime,
                                checkOutTime: existingRecord.checkOutTime
                            }
                        };
                    } else {
                        return {
                            action: null,
                            error: "No active check-in/out slot at this time",
                            details: {
                                currentTime: now,
                                availableSlots: event.checkInTimeSlots.map(s => ({
                                    slot_number: s.slot_number,
                                    startTime: s.startTime,
                                    endTime: s.endTime
                                }))
                            }
                        };
                    }
                }
            }
        }

        if (!currentSlot) {
            return {
                action: null,
                error: "No active check-in/out slot at this time",
                details: {
                    currentTime: now,
                    availableSlots: event.checkInTimeSlots.map(s => ({
                        slot_number: s.slot_number,
                        startTime: s.startTime,
                        endTime: s.endTime
                    }))
                }
            };
        }

        await markAbsentAndAutoCheckout(event, registration, currentSlot, now);

        const existingRecord = registration.checkInRecords.find(
            record => record.checkInTimeSlot_id === currentSlot.id
        );

        if (!existingRecord || !existingRecord.checkedIn) {
            return { action: "checkin" };
        }

        if (existingRecord.checkedIn && !existingRecord.checkedOut) {
            const slotEnd = new Date(currentSlot.endTime);
            if (now < slotEnd) {
                return {
                    action: null,
                    error: "Already checked in for this slot. Please wait until slot ends to check out.",
                    details: {
                        slot_number: currentSlot.slot_number,
                        checkInTime: existingRecord.checkInTime,
                        slotEndTime: currentSlot.endTime,
                        currentTime: now
                    }
                };
            }
            return { action: "checkout" };
        }

        return {
            action: null,
            error: "Already completed check-in and check-out for this slot",
            details: {
                currentTime: now,
                slot_number: currentSlot.slot_number,
                checkInTime: existingRecord.checkInTime,
                checkOutTime: existingRecord.checkOutTime
            }
        };
    } else {
        if (!registration.checkedIn) {
            return { action: "checkin" };
        }

        if (registration.checkedIn && !registration.checkedOut) {
            const activityEnd = new Date(event.activityEnd);
            if (now < activityEnd) {
                return {
                    action: null,
                    error: "Already checked in. Please wait until event ends to check out.",
                    details: {
                        checkInTime: registration.checkInTime,
                        activityEnd: event.activityEnd,
                        currentTime: now
                    }
                };
            }
            return { action: "checkout" };
        }

        return {
            action: null,
            error: "Already completed check-in and check-out for this event",
            details: {
                currentTime: now,
                checkInTime: registration.checkInTime,
                checkOutTime: registration.checkOutTime,
                status: registration.status
            }
        };
    }
}

async function markAbsentAndAutoCheckout(
    event: Event & { checkInTimeSlots: CheckInTimeSlot[] },
    registration: EventRegistration & { checkInRecords: (UserCheckInRecord & { checkInTimeSlot: CheckInTimeSlot })[] },
    currentSlot: CheckInTimeSlot,
    _now: Date
) {
    const pastSlots = event.checkInTimeSlots.filter(slot => {
        return slot.slot_number < currentSlot.slot_number;
    });

    for (const slot of pastSlots) {
        const existingRecord = registration.checkInRecords.find(
            r => r.checkInTimeSlot_id === slot.id
        );

        if (!existingRecord) {
            await prisma.userCheckInRecord.create({
                data: {
                    eventRegistration_id: registration.id,
                    checkInTimeSlot_id: slot.id,
                    checkedIn: false,
                    checkedOut: false,
                    isLate: false,
                    expEarned: 0
                }
            });
        } else if (existingRecord.checkedIn && !existingRecord.checkedOut) {
            await prisma.userCheckInRecord.update({
                where: { id: existingRecord.id },
                data: {
                    checkedOut: true,
                    checkOutTime: new Date(slot.endTime)
                }
            });
        }
    }
}

async function handleMultipleCheckIns(
    event: Event & { checkInTimeSlots: CheckInTimeSlot[] },
    registration: EventRegistration & { checkInRecords: (UserCheckInRecord & { checkInTimeSlot: CheckInTimeSlot })[] },
    body: ManualCheckInOutRequest,
    now: Date,
    req: NextRequest
) {
    if (body.action === "checkin") {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const lockedReg = await tx.$queryRaw<Array<{
                    id: number;
                    user_id: number;
                    event_id: number;
                    checkedIn: boolean;
                    checkedOut: boolean;
                    checkInTime: Date | null;
                    status: string;
                }>>`
                    SELECT id, user_id, event_id, "checkedIn", "checkedOut", 
                            "checkInTime", status
                    FROM "EventRegistration"
                    WHERE user_id = ${registration.user_id} AND event_id = ${event.id}
                    FOR UPDATE
                `;

                if (!lockedReg || lockedReg.length === 0) {
                    throw new Error("REGISTRATION_NOT_FOUND");
                }

                const currentSlot = findCurrentSlotForCheckIn(
                    event.checkInTimeSlots,
                    now,
                    event.checkInWindowBefore ?? 60
                );

                if (!currentSlot) {
                    throw new Error(`NO_ACTIVE_SLOT:${JSON.stringify({
                        currentTime: now,
                        availableSlots: event.checkInTimeSlots.map((s: CheckInTimeSlot) => ({
                            slot_number: s.slot_number,
                            startTime: s.startTime,
                            endTime: s.endTime
                        }))
                    })}`);
                }

                // Validate check-in time window
                const windowCheck = isWithinCheckInWindow(
                    currentSlot.startTime,
                    currentSlot.endTime,
                    now,
                    currentSlot.earlyCheckInMinutes !== null && currentSlot.earlyCheckInMinutes !== undefined
                        ? currentSlot.earlyCheckInMinutes
                        : (event.checkInWindowBefore ?? 60),
                    event.checkInWindowAfter ?? 30
                );

                if (!windowCheck.allowed) {
                    throw new Error(`CHECK_IN_WINDOW:${JSON.stringify({
                        reason: windowCheck.reason,
                        earliestCheckIn: windowCheck.earliestCheckIn,
                        latestCheckIn: windowCheck.latestCheckIn,
                        currentTime: now
                    })}`);
                }

                const slotStart = new Date(currentSlot.startTime);

                const pastSlots = event.checkInTimeSlots.filter(slot => {
                    return slot.slot_number < currentSlot.slot_number;
                });

                for (const slot of pastSlots) {
                    const existingRecord = registration.checkInRecords.find(
                        r => r.checkInTimeSlot_id === slot.id
                    );

                    if (!existingRecord) {
                        await tx.userCheckInRecord.create({
                            data: {
                                eventRegistration_id: registration.id,
                                checkInTimeSlot_id: slot.id,
                                checkedIn: false,
                                checkedOut: false,
                                isLate: false,
                                expEarned: 0
                            }
                        });
                    } else if (existingRecord.checkedIn && !existingRecord.checkedOut) {
                        await tx.userCheckInRecord.update({
                            where: { id: existingRecord.id },
                            data: {
                                checkedOut: true,
                                checkOutTime: new Date(slot.endTime)
                            }
                        });
                    }
                }

                const existingRecord = await tx.userCheckInRecord.findUnique({
                    where: {
                        eventRegistration_id_checkInTimeSlot_id: {
                            eventRegistration_id: registration.id,
                            checkInTimeSlot_id: currentSlot.id
                        }
                    }
                });

                if (existingRecord?.checkedIn) {
                    throw new Error(`ALREADY_CHECKED_IN_SLOT:${JSON.stringify({
                        slot_number: currentSlot.slot_number,
                        checkInTime: existingRecord.checkInTime
                    })}`);
                }

                const lateThresholdMinutes = event.lateCheckInPenalty || 60;
                const lateThresholdTime = new Date(
                    slotStart.getTime() + lateThresholdMinutes * 60 * 1000
                );
                const isLate = now > lateThresholdTime;

                await tx.userCheckInRecord.upsert({
                    where: {
                        eventRegistration_id_checkInTimeSlot_id: {
                            eventRegistration_id: registration.id,
                            checkInTimeSlot_id: currentSlot.id
                        }
                    },
                    create: {
                        eventRegistration_id: registration.id,
                        checkInTimeSlot_id: currentSlot.id,
                        checkedIn: true,
                        checkInTime: now,
                        isLate
                    },
                    update: {
                        checkedIn: true,
                        checkInTime: now,
                        isLate
                    }
                });

                const allRecords = await tx.userCheckInRecord.findMany({
                    where: { eventRegistration_id: registration.id }
                });

                const hasAnyCheckIn = allRecords.some(r => r.checkedIn);
                const hasAnyLate = allRecords.some(r => r.isLate);

                if (hasAnyCheckIn && !lockedReg[0].checkedIn) {
                    await tx.eventRegistration.update({
                        where: { id: registration.id },
                        data: {
                            checkedIn: true,
                            checkInTime: now,
                            status: hasAnyLate ? "LATE" : "ATTENDED"
                        }
                    });
                }

                const absentSlots = allRecords.filter(r => !r.checkedIn).length;

                return {
                    currentSlot,
                    isLate,
                    allRecords,
                    absentSlots
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
                    mode: "multiple",
                    isAutomatic: true,
                    message: result.isLate
                        ? `Checked in for slot ${result.currentSlot.slot_number} (Late)`
                        : `Checked in for slot ${result.currentSlot.slot_number}`,
                    data: {
                        userId: registration.user_id,
                        slot: {
                            id: result.currentSlot.id,
                            slot_number: result.currentSlot.slot_number,
                            startTime: result.currentSlot.startTime,
                            endTime: result.currentSlot.endTime
                        },
                        checkInTime: now,
                        isLate: result.isLate,
                        totalSlotsCheckedIn: result.allRecords.filter(r => r.checkedIn).length,
                        totalSlots: event.checkInTimeSlots.length,
                        absentSlots: result.absentSlots
                    }
                })),
                req
            );
        } catch (error) {
            console.error("Multiple check-in transaction error:", error);

            if (error instanceof Error) {
                const errorMessage = error.message;

                if (errorMessage === "REGISTRATION_NOT_FOUND") {
                    return addCorsHeaders(
                        NextResponse.json(
                            { 
                                error: "Registration not found",
                                userId: registration.user_id
                            },
                            { status: 404 }
                        ),
                        req
                    );
                }

                if (errorMessage.startsWith("NO_ACTIVE_SLOT:")) {
                    const details = JSON.parse(errorMessage.split("NO_ACTIVE_SLOT:")[1]);
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "No active check-in slot at this time",
                            currentsTime: details.currentTime,
                            availableSlots: details.availableSlots,
                            userId: registration.user_id
                        }, { status: 400 }),
                        req
                    );
                }

                if (errorMessage.startsWith("CHECK_IN_WINDOW:")) {
                    const details = JSON.parse(errorMessage.split("CHECK_IN_WINDOW:")[1]);
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "Check-in outside allowed time window",
                            reason: details.reason,
                            earliestCheckIn: details.earliestCheckIn,
                            latestCheckIn: details.latestCheckIn,
                            currentTime: details.currentTime,
                            userId: registration.user_id
                        }, { status: 400 }),
                        req
                    );
                }

                if (errorMessage.startsWith("ALREADY_CHECKED_IN_SLOT:")) {
                    const details = JSON.parse(errorMessage.split("ALREADY_CHECKED_IN_SLOT:")[1]);
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "You have already checked in for this slot",
                            currentsTime: now,
                            slot: details,
                            userId: registration.user_id
                        }, { status: 409 }),
                        req
                    );
                }
            }

            throw error;
        }
    }

    if (body.action === "checkout") {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const lockedReg = await tx.$queryRaw<Array<{
                    id: number;
                    status: string;
                }>>`
                    SELECT id, status
                    FROM "EventRegistration"
                    WHERE user_id = ${registration.user_id} AND event_id = ${event.id}
                    FOR UPDATE
                `;

                if (!lockedReg || lockedReg.length === 0) {
                    throw new Error("REGISTRATION_NOT_FOUND");
                }

                let currentSlot = findCurrentSlot(event.checkInTimeSlots, now);

                if (!currentSlot) {
                    const lastEndedSlot = findLastEndedSlot(event.checkInTimeSlots, now);
                    const nextSlot = findNextSlot(event.checkInTimeSlots, now);

                    if (lastEndedSlot) {
                        const shouldAllowCheckout = !nextSlot || 
                            now < new Date(nextSlot.startTime);
                        
                        if (shouldAllowCheckout) {
                            currentSlot = lastEndedSlot;
                        }
                    }
                }

                if (!currentSlot) {
                    throw new Error("NO_ACTIVE_CHECKOUT_SLOT");
                }

                // Check checkout window: within 60 minutes after activityEnd
                const checkoutDeadline = new Date(new Date(event.activityEnd).getTime() + 60 * 60 * 1000);
                if (now > checkoutDeadline) {
                    throw new Error(`CHECKOUT_WINDOW_EXPIRED:${JSON.stringify({
                        activityEnd: event.activityEnd,
                        checkoutDeadline,
                        currentTime: now
                    })}`);
                }

                const existingRecord = await tx.userCheckInRecord.findUnique({
                    where: {
                        eventRegistration_id_checkInTimeSlot_id: {
                            eventRegistration_id: registration.id,
                            checkInTimeSlot_id: currentSlot.id
                        }
                    }
                });

                if (!existingRecord?.checkedIn) {
                    throw new Error("NOT_CHECKED_IN_SLOT");
                }

                if (existingRecord.checkedOut) {
                    throw new Error("ALREADY_CHECKED_OUT_SLOT");
                }

                await tx.userCheckInRecord.update({
                    where: { id: existingRecord.id },
                    data: {
                        checkedOut: true,
                        checkOutTime: now
                    }
                });

                const allRecords = await tx.userCheckInRecord.findMany({
                    where: { eventRegistration_id: registration.id },
                    include: { checkInTimeSlot: true }
                });

                const totalSlots = event.checkInTimeSlots.length;
                const completedSlots = allRecords.filter(
                    r => r.checkedIn && r.checkedOut
                ).length;
                const hasAnyLate = allRecords.some(r => r.isLate);

                let newStatus: EventRegistration['status'] = lockedReg[0].status as EventRegistration['status'];
                let expResult = null;
                
                if (completedSlots === totalSlots) {
                    newStatus = (hasAnyLate ? "LATE" : "COMPLETED") as EventRegistration['status'];
                    await tx.eventRegistration.update({
                        where: { id: registration.id },
                        data: {
                            checkedOut: true,
                            checkOutTime: now,
                            status: newStatus
                        }
                    });

                    // คำนวณ EXP เมื่อ checkout ครบทุก slot
                    try {
                        expResult = await calculateEventTotalExp(event.id, registration.user_id);
                        
                        // บันทึก EXP ลงใน UserCheckInRecord แต่ละ slot
                        for (const record of allRecords) {
                            const slotRewards = expResult.skillRewards.filter(
                                _r => record.checkInTimeSlot.id === record.checkInTimeSlot_id
                            );
                            
                            const slotTotalExp = slotRewards.reduce((sum, r) => sum + r.expEarned, 0);
                            
                            await tx.userCheckInRecord.update({
                                where: { id: record.id },
                                data: { expEarned: slotTotalExp }
                            });
                        }

                        // อัพเดท experienceEarned ใน EventRegistration
                        await tx.eventRegistration.update({
                            where: { id: registration.id },
                            data: { experienceEarned: expResult.totalExp }
                        });

                        // บันทึก EXP ลงในระบบ (UserSubSkillLevel และ ExperienceHistory)
                        // ส่ง tx ไปเพื่อใช้ transaction เดียวกัน
                        await awardSkillExp(registration.user_id, event.id, expResult.skillRewards, tx);
                        
                    } catch (expError) {
                        console.error("Error calculating/awarding EXP:", expError);
                        // throw error เพื่อ rollback transaction
                        throw new Error(`EXP_CALCULATION_ERROR:${expError instanceof Error ? expError.message : 'Unknown error'}`);
                    }
                }

                return {
                    currentSlot,
                    completedSlots,
                    totalSlots,
                    newStatus,
                    expResult
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
                    mode: "multiple",
                    isAutomatic: true,
                    message: result.completedSlots === result.totalSlots 
                        ? `Checked out from slot ${result.currentSlot.slot_number}. Event completed!`
                        : `Checked out from slot ${result.currentSlot.slot_number}`,
                    data: {
                        userId: registration.user_id,
                        slot: {
                            id: result.currentSlot.id,
                            slot_number: result.currentSlot.slot_number
                        },
                        checkOutTime: now,
                        completedSlots: result.completedSlots,
                        totalSlots: result.totalSlots,
                        isFullyCompleted: result.completedSlots === result.totalSlots,
                        finalStatus: result.completedSlots === result.totalSlots ? result.newStatus : registration.status,
                        expEarned: result.expResult?.totalExp || 0,
                        skillRewards: result.expResult?.skillRewards || []
                    }
                })),
                req
            );
        } catch (error) {
            console.error("Multiple checkout transaction error:", error);

            if (error instanceof Error) {
                const errorMessage = error.message;

                if (errorMessage === "REGISTRATION_NOT_FOUND") {
                    return addCorsHeaders(
                        NextResponse.json(
                            { 
                                error: "Registration not found",
                                userId: registration.user_id
                            },
                            { status: 404 }
                        ),
                        req
                    );
                }

                if (errorMessage === "NO_ACTIVE_CHECKOUT_SLOT") {
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "No active check-out slot at this time",
                            userId: registration.user_id
                        }, { status: 400 }),
                        req
                    );
                }

                if (errorMessage === "NOT_CHECKED_IN_SLOT") {
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "You must check in for this slot before checking out",
                            userId: registration.user_id
                        }, { status: 400 }),
                        req
                    );
                }

                if (errorMessage === "ALREADY_CHECKED_OUT_SLOT") {
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "You have already checked out from this slot",
                            userId: registration.user_id
                        }, { status: 409 }),
                        req
                    );
                }

                if (errorMessage.startsWith("CHECKOUT_WINDOW_EXPIRED:")) {
                    const details = JSON.parse(errorMessage.split("CHECKOUT_WINDOW_EXPIRED:")[1]);
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "Check-out window has expired. Check-out is only allowed within 60 minutes after activity ends.",
                            details,
                            userId: registration.user_id
                        }, { status: 400 }),
                        req
                    );
                }

                if (errorMessage.startsWith("EXP_CALCULATION_ERROR:")) {
                    const details = errorMessage.split("EXP_CALCULATION_ERROR:")[1];
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "Failed to calculate experience points",
                            details,
                            userId: registration.user_id
                        }, { status: 500 }),
                        req
                    );
                }
            }

            throw error;
        }
    }

    return addCorsHeaders(
        NextResponse.json({ error: "Invalid action" }, { status: 400 }),
        req
    );
}

async function handleSingleCheckIn(
    event: Event,
    registration: EventRegistration & { checkInRecords?: UserCheckInRecord[] },
    body: ManualCheckInOutRequest,
    now: Date,
    req: NextRequest,
    userId: number
) {
    if (body.action === "checkin") {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const lockedReg = await tx.$queryRaw<Array<{
                    id: number;
                    user_id: number;
                    event_id: number;
                    checkedIn: boolean;
                    status: string;
                }>>`
                    SELECT id, user_id, event_id, "checkedIn", status
                    FROM "EventRegistration"
                    WHERE user_id = ${userId} AND event_id = ${event.id}
                    FOR UPDATE
                `;

                if (!lockedReg || lockedReg.length === 0) {
                    throw new Error("REGISTRATION_NOT_FOUND");
                }

                if (lockedReg[0].checkedIn) {
                    throw new Error("ALREADY_CHECKED_IN");
                }

                const activityStartTime = new Date(event.activityStart);
                const lateThresholdMinutes = event.lateCheckInPenalty || 60;
                const lateThresholdTime = new Date(
                    activityStartTime.getTime() + lateThresholdMinutes * 60 * 1000
                );
                const isLate = now > lateThresholdTime;
                const newStatus = isLate ? "LATE" : "ATTENDED";

                const updatedRegistration = await tx.eventRegistration.update({
                    where: {
                        user_id_event_id: {
                            user_id: userId,
                            event_id: event.id,
                        },
                    },
                    data: {
                        checkedIn: true,
                        checkInTime: now,
                        status: newStatus,
                    },
                });

                return {
                    updatedRegistration,
                    isLate
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
                    mode: "single",
                    isAutomatic: true,
                    message: result.isLate
                        ? "Checked in successfully (Late)"
                        : "Checked in successfully",
                    data: {
                        userId: userId,
                        registration: result.updatedRegistration,
                        isLate: result.isLate,
                        checkInTime: now,
                    },
                })),
                req
            );
        } catch (error) {
            console.error("Single check-in transaction error:", error);

            if (error instanceof Error) {
                const errorMessage = error.message;

                if (errorMessage === "REGISTRATION_NOT_FOUND") {
                    return addCorsHeaders(
                        NextResponse.json(
                            { 
                                error: "Registration not found",
                                userId: userId
                            },
                            { status: 404 }
                        ),
                        req
                    );
                }

                if (errorMessage === "ALREADY_CHECKED_IN") {
                    return addCorsHeaders(
                        NextResponse.json(
                            { 
                                error: "You have already checked in for this event",
                                userId: userId
                            },
                            { status: 409 }
                        ),
                        req
                    );
                }
            }

            throw error;
        }
    }

    if (body.action === "checkout") {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const lockedReg = await tx.$queryRaw<Array<{
                    id: number;
                    user_id: number;
                    event_id: number;
                    checkedIn: boolean;
                    checkedOut: boolean;
                    status: string;
                }>>`
                    SELECT id, user_id, event_id, "checkedIn", "checkedOut", status
                    FROM "EventRegistration"
                    WHERE user_id = ${userId} AND event_id = ${body.eventId}
                    FOR UPDATE
                `;

                if (!lockedReg || lockedReg.length === 0) {
                    throw new Error("REGISTRATION_NOT_FOUND");
                }

                if (!lockedReg[0].checkedIn) {
                    throw new Error("NOT_CHECKED_IN");
                }

                if (lockedReg[0].checkedOut) {
                    throw new Error("ALREADY_CHECKED_OUT");
                }

                // Check checkout window: within 60 minutes after activityEnd
                const checkoutDeadline = new Date(new Date(event.activityEnd).getTime() + 60 * 60 * 1000);
                if (now > checkoutDeadline) {
                    throw new Error(`CHECKOUT_WINDOW_EXPIRED:${JSON.stringify({
                        activityEnd: event.activityEnd,
                        checkoutDeadline,
                        currentTime: now
                    })}`);
                }

                const newStatus = lockedReg[0].status === "LATE" ? "LATE" : "COMPLETED";

                const updatedRegistration = await tx.eventRegistration.update({
                    where: {
                        user_id_event_id: {
                            user_id: userId,
                            event_id: body.eventId,
                        },
                    },
                    data: {
                        checkedOut: true,
                        checkOutTime: now,
                        status: newStatus,
                    },
                });

                return {
                    updatedRegistration
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
                    mode: "single",
                    isAutomatic: true,
                    message: "Checked out successfully",
                    data: {
                        userId: userId,
                        registration: result.updatedRegistration,
                        checkOutTime: now,
                    },
                })),
                req
            );
        } catch (error) {
            console.error("Single checkout transaction error:", error);

            if (error instanceof Error) {
                const errorMessage = error.message;

                if (errorMessage === "REGISTRATION_NOT_FOUND") {
                    return addCorsHeaders(
                        NextResponse.json(
                            { 
                                error: "Registration not found",
                                userId: userId
                            },
                            { status: 404 }
                        ),
                        req
                    );
                }

                if (errorMessage === "NOT_CHECKED_IN") {
                    return addCorsHeaders(
                        NextResponse.json(
                            { 
                                error: "You must check in before checking out",
                                userId: userId
                            },
                            { status: 400 }
                        ),
                        req
                    );
                }

                if (errorMessage === "ALREADY_CHECKED_OUT") {
                    return addCorsHeaders(
                        NextResponse.json(
                            { 
                                error: "You have already checked out from this event",
                                userId: userId
                            },
                            { status: 409 }
                        ),
                        req
                    );
                }

                if (errorMessage.startsWith("CHECKOUT_WINDOW_EXPIRED:")) {
                    const details = JSON.parse(errorMessage.split("CHECKOUT_WINDOW_EXPIRED:")[1]);
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "Check-out window has expired. Check-out is only allowed within 60 minutes after activity ends.",
                            details,
                            userId: userId
                        }, { status: 400 }),
                        req
                    );
                }
            }

            throw error;
        }
    }

    return addCorsHeaders(
        NextResponse.json({ error: "Invalid action" }, { status: 400 }),
        req
    );
}