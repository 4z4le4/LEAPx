import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, getUserId } from "@/middleware/auth";
import { validateTimeSlot } from "@/lib/timeSlotValidation";
import { thaiToUTC, transformDatesToThai } from "@/utils/timezone";
import type { 
    CreateCheckInTimeSlotRequest,
    UpdateCheckInTimeSlotRequest
} from "@/types/checkInTypes";

/**
 * ตรวจสอบสิทธิ์การจัดการ Event
 */
async function checkEventPermission(eventId: number, userId: number) {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            title_EN: true,
            title_TH: true,
            majorCategory_id: true,
            created_by: true
        }
    });

    if (!event) {
        return { error: "Event not found", status: 404 };
    }

    const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            role: true,
            majorAdmins: {
                where: { isActive: true },
                select: { majorCategory_id: true }
            }
        }
    });

    if (!currentUser) {
        return { error: "User not found", status: 404 };
    }

    const isSupreme = currentUser.role.name === 'SUPREME';
    const adminMajorIds = currentUser.majorAdmins.map(admin => admin.majorCategory_id);

    if (!isSupreme) {
        if (event.majorCategory_id) {
            if (!adminMajorIds.includes(event.majorCategory_id)) {
                return {
                    error: "You don't have permission to manage this event",
                    status: 403
                };
            }
        } else {
            if (event.created_by !== userId) {
                return {
                    error: "You don't have permission to manage this event",
                    status: 403
                };
            }
        }
    }

    return { event, currentUser, isSupreme };
}

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

/**
 * GET - ดึงรายการ Time Slots ของ Event
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const eventId = parseInt((await context.params).eventId);

            if (isNaN(eventId)) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Invalid event ID" }, { status: 400 }),
                    req
                );
            }

            const permissionCheck = await checkEventPermission(eventId, Number(userId));
            if ('error' in permissionCheck) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: permissionCheck.error 
                    }, { status: permissionCheck.status }),
                    req
                );
            }

            const timeSlots = await prisma.checkInTimeSlot.findMany({
                where: { event_id: eventId },
                include: {
                    skillRewards: {
                        include: {
                            subSkillCategory: {
                                include: {
                                    mainSkillCategory: {
                                        select: {
                                            id: true,
                                            name_EN: true,
                                            name_TH: true,
                                            color: true,
                                            icon: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { slot_number: 'asc' }
            });

            return addCorsHeaders(
                NextResponse.json(transformDatesToThai({
                    success: true,
                    data: {
                        event: {
                            id: permissionCheck.event.id,
                            title_EN: permissionCheck.event.title_EN,
                            title_TH: permissionCheck.event.title_TH
                        },
                        timeSlots,
                        totalSlots: timeSlots.length
                    }
                })),
                req
            );

        } catch (error) {
            console.error("Get time slots error:", error);
            return addCorsHeaders(
                NextResponse.json({ 
                    error: "Failed to fetch time slots" 
                }, { status: 500 }),
                req
            );
        }
    });
}

/**
 * POST - สร้าง Time Slot ใหม่
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const eventId = parseInt((await context.params).eventId);
            const body: CreateCheckInTimeSlotRequest = await req.json();

            if (isNaN(eventId)) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Invalid event ID" }, { status: 400 }),
                    req
                );
            }

            // Validate required fields
            if (!body.startTime || !body.endTime || body.slot_number === undefined) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Missing required fields: startTime, endTime, slot_number" 
                    }, { status: 400 }),
                    req
                );
            }

            const permissionCheck = await checkEventPermission(eventId, Number(userId));
            if ('error' in permissionCheck) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: permissionCheck.error 
                    }, { status: permissionCheck.status }),
                    req
                );
            }

            // ตรวจสอบว่า slot_number ซ้ำหรือไม่
            const existingSlot = await prisma.checkInTimeSlot.findFirst({
                where: {
                    event_id: eventId,
                    slot_number: body.slot_number
                }
            });

            if (existingSlot) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: `Slot number ${body.slot_number} already exists for this event` 
                    }, { status: 409 }),
                    req
                );
            }

            // Validate time slot (overlap, boundaries, etc.)
            const validation = await validateTimeSlot(
                eventId,
                thaiToUTC(body.startTime),
                thaiToUTC(body.endTime),
                body.slot_number
            );

            if (!validation.valid) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: validation.error,
                        overlappingSlot: validation.overlappingSlot
                    }, { status: 400 }),
                    req
                );
            }

            // สร้าง Time Slot พร้อม Skill Rewards
            const timeSlot = await prisma.checkInTimeSlot.create({
                data: {
                    event_id: eventId,
                    startTime: thaiToUTC(body.startTime),
                    endTime: thaiToUTC(body.endTime),
                    slot_number: body.slot_number,
                    name_TH: body.name_TH,
                    name_EN: body.name_EN,
                    description_TH: body.description_TH,
                    description_EN: body.description_EN,
                    earlyCheckInMinutes: body.earlyCheckInMinutes !== undefined ? body.earlyCheckInMinutes : null,
                    skillRewards: body.skillRewards ? {
                        create: body.skillRewards.map(reward => ({
                            subSkillCategory_id: reward.subSkillCategory_id,
                            levelType: reward.levelType,
                            baseExperience: reward.baseExperience,
                            bonusExperience: reward.bonusExperience || 0,
                            requireCheckIn: reward.requireCheckIn ?? true,
                            requireCheckOut: reward.requireCheckOut ?? true,
                            requireOnTime: reward.requireOnTime ?? false
                        }))
                    } : undefined
                },
                include: {
                    skillRewards: {
                        include: {
                            subSkillCategory: {
                                include: {
                                    mainSkillCategory: true
                                }
                            }
                        }
                    }
                }
            });

            // อัพเดท Event ให้เปิด allowMultipleCheckIns ถ้ามี time slots
            const totalSlots = await prisma.checkInTimeSlot.count({
                where: { event_id: eventId }
            });

            if (totalSlots > 0) {
                await prisma.event.update({
                    where: { id: eventId },
                    data: { allowMultipleCheckIns: true }
                });
            }

            return addCorsHeaders(
                NextResponse.json(transformDatesToThai({
                    success: true,
                    message: "Time slot created successfully",
                    data: timeSlot
                })),
                req
            );

        } catch (error) {
            console.error("Create time slot error:", error);
            return addCorsHeaders(
                NextResponse.json({ 
                    error: error instanceof Error ? error.message : "Failed to create time slot" 
                }, { status: 500 }),
                req
            );
        }
    });
}

/**
 * PATCH - อัพเดท Time Slot
 */
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const eventId = parseInt((await context.params).eventId);
            const body: UpdateCheckInTimeSlotRequest = await req.json();

            if (isNaN(eventId)) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Invalid event ID" }, { status: 400 }),
                    req
                );
            }

            if (!body.id) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Missing required field: id" 
                    }, { status: 400 }),
                    req
                );
            }

            const permissionCheck = await checkEventPermission(eventId, Number(userId));
            if ('error' in permissionCheck) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: permissionCheck.error 
                    }, { status: permissionCheck.status }),
                    req
                );
            }

            // ตรวจสอบว่า time slot นี้อยู่ใน event นี้จริงหรือไม่
            const existingSlot = await prisma.checkInTimeSlot.findUnique({
                where: { id: body.id }
            });

            if (!existingSlot || existingSlot.event_id !== eventId) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Time slot not found or doesn't belong to this event" 
                    }, { status: 404 }),
                    req
                );
            }

            // อัพเดท Time Slot
            const updateData: Prisma.CheckInTimeSlotUpdateInput = {};
            
            if (body.startTime) updateData.startTime = thaiToUTC(body.startTime);
            if (body.endTime) updateData.endTime = thaiToUTC(body.endTime);
            if (body.slot_number !== undefined) updateData.slot_number = body.slot_number;
            if (body.name_TH !== undefined) updateData.name_TH = body.name_TH;
            if (body.name_EN !== undefined) updateData.name_EN = body.name_EN;
            if (body.description_TH !== undefined) updateData.description_TH = body.description_TH;
            if (body.description_EN !== undefined) updateData.description_EN = body.description_EN;
            if (body.earlyCheckInMinutes !== undefined) updateData.earlyCheckInMinutes = body.earlyCheckInMinutes;

            const updatedSlot = await prisma.checkInTimeSlot.update({
                where: { id: body.id },
                data: updateData,
                include: {
                    skillRewards: {
                        include: {
                            subSkillCategory: {
                                include: {
                                    mainSkillCategory: true
                                }
                            }
                        }
                    }
                }
            });

            return addCorsHeaders(
                NextResponse.json(transformDatesToThai({
                    success: true,
                    message: "Time slot updated successfully",
                    data: updatedSlot
                })),
                req
            );

        } catch (error) {
            console.error("Update time slot error:", error);
            return addCorsHeaders(
                NextResponse.json({ 
                    error: error instanceof Error ? error.message : "Failed to update time slot" 
                }, { status: 500 }),
                req
            );
        }
    });
}

/**
 * DELETE - ลบ Time Slot
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const eventId = parseInt((await context.params).eventId);
            const { searchParams } = new URL(req.url);
            const slotId = parseInt(searchParams.get('slotId') || '');

            if (isNaN(eventId) || isNaN(slotId)) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Invalid event ID or slot ID" 
                    }, { status: 400 }),
                    req
                );
            }

            const permissionCheck = await checkEventPermission(eventId, Number(userId));
            if ('error' in permissionCheck) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: permissionCheck.error 
                    }, { status: permissionCheck.status }),
                    req
                );
            }

            // ตรวจสอบว่า time slot นี้อยู่ใน event นี้จริงหรือไม่
            const existingSlot = await prisma.checkInTimeSlot.findUnique({
                where: { id: slotId },
                include: {
                    userCheckInRecords: true
                }
            });

            if (!existingSlot || existingSlot.event_id !== eventId) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Time slot not found or doesn't belong to this event" 
                    }, { status: 404 }),
                    req
                );
            }

            // ตรวจสอบว่ามีคนเช็คอินแล้วหรือไม่
            if (existingSlot.userCheckInRecords.length > 0) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Cannot delete time slot with existing check-in records" 
                    }, { status: 409 }),
                    req
                );
            }

            // ลบ Time Slot (cascade จะลบ skill rewards อัตโนมัติ)
            await prisma.checkInTimeSlot.delete({
                where: { id: slotId }
            });

            // ตรวจสอบว่ายังมี time slots เหลือหรือไม่
            const remainingSlots = await prisma.checkInTimeSlot.count({
                where: { event_id: eventId }
            });

            // ถ้าไม่มีเหลือเลย ให้ปิด allowMultipleCheckIns
            if (remainingSlots === 0) {
                await prisma.event.update({
                    where: { id: eventId },
                    data: { allowMultipleCheckIns: false }
                });
            }

            return addCorsHeaders(
                NextResponse.json({
                    success: true,
                    message: "Time slot deleted successfully"
                }),
                req
            );

        } catch (error) {
            console.error("Delete time slot error:", error);
            return addCorsHeaders(
                NextResponse.json({ 
                    error: error instanceof Error ? error.message : "Failed to delete time slot" 
                }, { status: 500 }),
                req
            );
        }
    });
}
