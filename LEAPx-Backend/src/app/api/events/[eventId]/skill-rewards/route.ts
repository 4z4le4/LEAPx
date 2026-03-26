import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, getUserId } from "@/middleware/auth";
import { CreateSkillRewardRequest, UpdateSkillRewardRequest } from "@/types/EventType";
import { transformDatesToThai } from "@/utils/timezone";

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
                    error: "You don't have permission to access this event. Only SUPREME or Major Admin of this category can manage events.",
                    status: 403
                };
            }
        } else {
            if (event.created_by !== userId) {
                return {
                    error: "You don't have permission to access this event.",
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
                    NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status }),
                    req
                );
            }

            const { event } = permissionCheck;

            const skillRewards = await prisma.eventSkillReward.findMany({
                where: { event_id: eventId },
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
                },
                orderBy: { createdAt: 'asc' }
            });

            return addCorsHeaders(
                NextResponse.json(transformDatesToThai({
                    success: true,
                    data: {
                        event: {
                            id: event.id,
                            title_EN: event.title_EN,
                            title_TH: event.title_TH
                        },
                        skillRewards,
                        totalRewards: skillRewards.length,
                        activeRewards: skillRewards.filter(r => r.subSkillCategory?.isActive).length
                    }
                })),
                req
            );

        } catch (error) {
            console.error("Get event skill rewards error:", error);
            return addCorsHeaders(
                NextResponse.json({ error: "Failed to fetch event skill rewards" }, { status: 500 }),
                req
            );
        }
    });
}

export async function POST(
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

            const body: CreateSkillRewardRequest = await req.json();

            // Validate required fields
            if (!body.subSkillCategory_id || body.baseExperience === undefined) {
                return addCorsHeaders(
                    NextResponse.json({
                        error: "Missing required fields: subSkillCategory_id, baseExperience"
                    }, { status: 400 }),
                    req
                );
            }

            // Validate experience values
            if (body.baseExperience < 0) {
                return addCorsHeaders(
                    NextResponse.json({ error: "baseExperience must be non-negative" }, { status: 400 }),
                    req
                );
            }

            if (body.bonusExperience !== undefined && body.bonusExperience < 0) {
                return addCorsHeaders(
                    NextResponse.json({ error: "bonusExperience must be non-negative" }, { status: 400 }),
                    req
                );
            }

            // ตรวจสอบสิทธิ์
            const permissionCheck = await checkEventPermission(eventId, Number(userId));
            if ('error' in permissionCheck) {
                return addCorsHeaders(
                    NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status }),
                    req
                );
            }

            // ตรวจสอบว่า subSkillCategory มีอยู่จริงและ active
            const subSkill = await prisma.subSkillCategory.findUnique({
                where: { id: body.subSkillCategory_id },
                include: {
                    mainSkillCategory: true
                }
            });

            if (!subSkill) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Sub skill category not found" }, { status: 404 }),
                    req
                );
            }

            if (!subSkill.isActive) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Sub skill category is not active" }, { status: 400 }),
                    req
                );
            }

            // ตรวจสอบว่ามี reward สำหรับ skill นี้อยู่แล้วหรือไม่
            const existing = await prisma.eventSkillReward.findFirst({
                where: {
                    event_id: eventId,
                    subSkillCategory_id: body.subSkillCategory_id
                }
            });

            if (existing) {
                return addCorsHeaders(
                    NextResponse.json({
                        error: "This skill reward already exists for this event"
                    }, { status: 409 }),
                    req
                );
            }

            // สร้าง skill reward
            const skillReward = await prisma.eventSkillReward.create({
                data: {
                    event_id: eventId,
                    subSkillCategory_id: body.subSkillCategory_id,
                    baseExperience: body.baseExperience,
                    bonusExperience: body.bonusExperience || 0,
                    levelType: body.levelType || "-",
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
                    message: "Event skill reward created successfully",
                    data: skillReward
                })),
                req
            );

        } catch (error) {
            console.error("Create event skill reward error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return addCorsHeaders(
                NextResponse.json({ error: errorMessage }, { status: 500 }),
                req
            );
        }
    });
}

export async function PUT(
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

            const body: UpdateSkillRewardRequest = await req.json();

            if (!body.id) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Missing required field: id" }, { status: 400 }),
                    req
                );
            }

            // ตรวจสอบสิทธิ์
            const permissionCheck = await checkEventPermission(eventId, Number(userId));
            if ('error' in permissionCheck) {
                return addCorsHeaders(
                    NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status }),
                    req
                );
            }

            const existing = await prisma.eventSkillReward.findUnique({
                where: { id: body.id },
                include: {
                    event: true,
                    subSkillCategory: true
                }
            });

            if (!existing) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Event skill reward not found" }, { status: 404 }),
                    req
                );
            }

            if (existing.event_id !== eventId) {
                return addCorsHeaders(
                    NextResponse.json({
                        error: "This skill reward does not belong to this event"
                    }, { status: 400 }),
                    req
                );
            }

            if (body.baseExperience !== undefined && body.baseExperience < 0) {
                return addCorsHeaders(
                    NextResponse.json({ error: "baseExperience must be non-negative" }, { status: 400 }),
                    req
                );
            }

            if (body.bonusExperience !== undefined && body.bonusExperience < 0) {
                return addCorsHeaders(
                    NextResponse.json({ error: "bonusExperience must be non-negative" }, { status: 400 }),
                    req
                );
            }

            const updateData: Partial<CreateSkillRewardRequest & { isActive: boolean }> = {};
            if (body.baseExperience !== undefined) updateData.baseExperience = body.baseExperience;
            if (body.bonusExperience !== undefined) updateData.bonusExperience = body.bonusExperience;
            if (body.isActive !== undefined) updateData.isActive = body.isActive;

            const updated = await prisma.eventSkillReward.update({
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
                    message: "Event skill reward updated successfully",
                    data: updated
                })),
                req
            );

        } catch (error) {
            console.error("Update event skill reward error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return addCorsHeaders(
                NextResponse.json({ error: errorMessage }, { status: 500 }),
                req
            );
        }
    });
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const eventId = parseInt((await context.params).eventId);
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (isNaN(eventId) || !id) {
                return addCorsHeaders(
                    NextResponse.json({
                        error: "Invalid event ID or missing skill reward ID"
                    }, { status: 400 }),
                    req
                );
            }

            // ตรวจสอบสิทธิ์
            const permissionCheck = await checkEventPermission(eventId, Number(userId));
            if ('error' in permissionCheck) {
                return addCorsHeaders(
                    NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status }),
                    req
                );
            }

            const rewardId = parseInt(id);

            const existing = await prisma.eventSkillReward.findUnique({
                where: { id: rewardId },
                include: {
                    event: true,
                    subSkillCategory: true
                }
            });

            if (!existing) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Event skill reward not found" }, { status: 404 }),
                    req
                );
            }

            if (existing.event_id !== eventId) {
                return addCorsHeaders(
                    NextResponse.json({
                        error: "This skill reward does not belong to this event"
                    }, { status: 400 }),
                    req
                );
            }

            // ตรวจสอบว่ามีผู้เข้าร่วมได้รับ experience แล้วหรือไม่
            const registrationsWithExp = await prisma.eventRegistration.findMany({
                where: {
                    event_id: eventId,
                    experienceEarned: { gt: 0 }
                }
            });

            if (registrationsWithExp.length > 0) {
                return addCorsHeaders(
                    NextResponse.json({
                        error: "Cannot delete skill reward - participants have already received experience",
                        details: {
                            participantsCount: registrationsWithExp.length,
                            message: "Consider setting isActive to false instead"
                        }
                    }, { status: 400 }),
                    req
                );
            }

            await prisma.eventSkillReward.delete({
                where: { id: rewardId }
            });

            return addCorsHeaders(
                NextResponse.json({
                    success: true,
                    message: "Event skill reward deleted successfully",
                    data: {
                        id: rewardId,
                        event_id: eventId,
                        subSkillCategory: {
                            id: existing.subSkillCategory_id,
                            name_EN: existing.subSkillCategory.name_EN,
                            name_TH: existing.subSkillCategory.name_TH
                        }
                    }
                }),
                req
            );

        } catch (error) {
            console.error("Delete event skill reward error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return addCorsHeaders(
                NextResponse.json({ error: errorMessage }, { status: 500 }),
                req
            );
        }
    });
}