import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, getUserId } from "@/middleware/auth";
import { transformDatesToThai } from "@/utils/timezone";
import type {
    CreateTimeSlotSkillRewardRequest,
    UpdateTimeSlotSkillRewardRequest
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
 * GET - ดึง Skill Rewards ของ Time Slot
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ eventId: string; slotId: string }> }
) {
    const userId = await getUserId(req);
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const params = await context.params;
            const eventId = parseInt(params.eventId);
            const slotId = parseInt(params.slotId);

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

            // ตรวจสอบว่า time slot อยู่ใน event นี้จริงหรือไม่
            const timeSlot = await prisma.checkInTimeSlot.findUnique({
                where: { id: slotId },
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
                }
            });

            if (!timeSlot || timeSlot.event_id !== eventId) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Time slot not found or doesn't belong to this event" 
                    }, { status: 404 }),
                    req
                );
            }

            return addCorsHeaders(
                NextResponse.json(transformDatesToThai({
                    success: true,
                    data: {
                        timeSlot: {
                            id: timeSlot.id,
                            slot_number: timeSlot.slot_number,
                            startTime: timeSlot.startTime,
                            endTime: timeSlot.endTime,
                            name_TH: timeSlot.name_TH,
                            name_EN: timeSlot.name_EN
                        },
                        skillRewards: timeSlot.skillRewards,
                        totalRewards: timeSlot.skillRewards.length
                    }
                })),
                req
            );

        } catch (error) {
            console.error("Get time slot skill rewards error:", error);
            return addCorsHeaders(
                NextResponse.json({ 
                    error: "Failed to fetch skill rewards" 
                }, { status: 500 }),
                req
            );
        }
    });
}

/**
 * POST - เพิ่ม Skill Reward ให้ Time Slot
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ eventId: string; slotId: string }> }
) {
    const userId = await getUserId(req);
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const params = await context.params;
            const eventId = parseInt(params.eventId);
            const slotId = parseInt(params.slotId);
            const body: CreateTimeSlotSkillRewardRequest = await req.json();

            if (isNaN(eventId) || isNaN(slotId)) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Invalid event ID or slot ID" 
                    }, { status: 400 }),
                    req
                );
            }

            // Validate required fields
            if (!body.subSkillCategory_id || !body.levelType || body.baseExperience === undefined) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Missing required fields: subSkillCategory_id, levelType, baseExperience" 
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

            // ตรวจสอบว่า time slot อยู่ใน event นี้จริงหรือไม่
            const timeSlot = await prisma.checkInTimeSlot.findUnique({
                where: { id: slotId }
            });

            if (!timeSlot || timeSlot.event_id !== eventId) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Time slot not found or doesn't belong to this event" 
                    }, { status: 404 }),
                    req
                );
            }

            // ตรวจสอบว่า subSkillCategory มีอยู่จริง
            const subSkill = await prisma.subSkillCategory.findUnique({
                where: { id: body.subSkillCategory_id }
            });

            if (!subSkill) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Sub skill category not found" 
                    }, { status: 404 }),
                    req
                );
            }

            // ตรวจสอบว่าไม่มี reward ซ้ำ (เดียวกันทั้ง subSkillCategory และ levelType)
            const existingReward = await prisma.checkInTimeSlotSkillReward.findFirst({
                where: {
                    checkInTimeSlot_id: slotId,
                    subSkillCategory_id: body.subSkillCategory_id,
                    levelType: body.levelType
                }
            });

            if (existingReward) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Skill reward already exists for this combination" 
                    }, { status: 409 }),
                    req
                );
            }

            // สร้าง Skill Reward
            const skillReward = await prisma.checkInTimeSlotSkillReward.create({
                data: {
                    checkInTimeSlot_id: slotId,
                    subSkillCategory_id: body.subSkillCategory_id,
                    levelType: body.levelType,
                    baseExperience: body.baseExperience,
                    bonusExperience: body.bonusExperience || 0,
                    requireCheckIn: body.requireCheckIn ?? true,
                    requireCheckOut: body.requireCheckOut ?? true,
                    requireOnTime: body.requireOnTime ?? false
                },
                include: {
                    subSkillCategory: {
                        include: {
                            mainSkillCategory: true
                        }
                    }
                }
            });

            return addCorsHeaders(
                NextResponse.json(transformDatesToThai({
                    success: true,
                    message: "Skill reward added successfully",
                    data: skillReward
                })),
                req
            );

        } catch (error) {
            console.error("Add skill reward error:", error);
            return addCorsHeaders(
                NextResponse.json({ 
                    error: error instanceof Error ? error.message : "Failed to add skill reward" 
                }, { status: 500 }),
                req
            );
        }
    });
}

/**
 * PATCH - อัพเดท Skill Reward
 */
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ eventId: string; slotId: string }> }
) {
    const userId = await getUserId(req);
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const params = await context.params;
            const eventId = parseInt(params.eventId);
            const slotId = parseInt(params.slotId);
            const body: UpdateTimeSlotSkillRewardRequest = await req.json();

            if (isNaN(eventId) || isNaN(slotId)) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Invalid event ID or slot ID" 
                    }, { status: 400 }),
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

            // ตรวจสอบว่า skill reward นี้อยู่ใน time slot นี้จริงหรือไม่
            const existingReward = await prisma.checkInTimeSlotSkillReward.findUnique({
                where: { id: body.id },
                include: {
                    checkInTimeSlot: true
                }
            });

            if (!existingReward || 
                existingReward.checkInTimeSlot_id !== slotId ||
                existingReward.checkInTimeSlot.event_id !== eventId) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Skill reward not found or doesn't belong to this time slot" 
                    }, { status: 404 }),
                    req
                );
            }

            // อัพเดท Skill Reward
            const updateData: Prisma.CheckInTimeSlotSkillRewardUpdateInput = {};
            
            if (body.baseExperience !== undefined) updateData.baseExperience = body.baseExperience;
            if (body.bonusExperience !== undefined) updateData.bonusExperience = body.bonusExperience;
            if (body.requireCheckIn !== undefined) updateData.requireCheckIn = body.requireCheckIn;
            if (body.requireCheckOut !== undefined) updateData.requireCheckOut = body.requireCheckOut;
            if (body.requireOnTime !== undefined) updateData.requireOnTime = body.requireOnTime;

            const updatedReward = await prisma.checkInTimeSlotSkillReward.update({
                where: { id: body.id },
                data: updateData,
                include: {
                    subSkillCategory: {
                        include: {
                            mainSkillCategory: true
                        }
                    }
                }
            });

            return addCorsHeaders(
                NextResponse.json(transformDatesToThai({
                    success: true,
                    message: "Skill reward updated successfully",
                    data: updatedReward
                })),
                req
            );

        } catch (error) {
            console.error("Update skill reward error:", error);
            return addCorsHeaders(
                NextResponse.json({ 
                    error: error instanceof Error ? error.message : "Failed to update skill reward" 
                }, { status: 500 }),
                req
            );
        }
    });
}

/**
 * DELETE - ลบ Skill Reward
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ eventId: string; slotId: string }> }
) {
    const userId = await getUserId(req);
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const params = await context.params;
            const eventId = parseInt(params.eventId);
            const slotId = parseInt(params.slotId);
            const { searchParams } = new URL(req.url);
            const rewardId = parseInt(searchParams.get('rewardId') || '');

            if (isNaN(eventId) || isNaN(slotId) || isNaN(rewardId)) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Invalid event ID, slot ID, or reward ID" 
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

            // ตรวจสอบว่า skill reward นี้อยู่ใน time slot นี้จริงหรือไม่
            const existingReward = await prisma.checkInTimeSlotSkillReward.findUnique({
                where: { id: rewardId },
                include: {
                    checkInTimeSlot: true
                }
            });

            if (!existingReward || 
                existingReward.checkInTimeSlot_id !== slotId ||
                existingReward.checkInTimeSlot.event_id !== eventId) {
                return addCorsHeaders(
                    NextResponse.json({ 
                        error: "Skill reward not found or doesn't belong to this time slot" 
                    }, { status: 404 }),
                    req
                );
            }

            // ลบ Skill Reward
            await prisma.checkInTimeSlotSkillReward.delete({
                where: { id: rewardId }
            });

            return addCorsHeaders(
                NextResponse.json({
                    success: true,
                    message: "Skill reward deleted successfully"
                }),
                req
            );

        } catch (error) {
            console.error("Delete skill reward error:", error);
            return addCorsHeaders(
                NextResponse.json({ 
                    error: error instanceof Error ? error.message : "Failed to delete skill reward" 
                }, { status: 500 }),
                req
            );
        }
    });
}
