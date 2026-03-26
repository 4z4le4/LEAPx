import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withUserAuth, getUserId, getStudentYear } from "@/middleware/auth";
import { UserRegisterRequest } from "@/types/EventLogic";
import { transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
    return withUserAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const { searchParams } = new URL(req.url);
            const eventId = searchParams.get("eventId");
            const page = parseInt(searchParams.get("page") || "1");
            const limit = parseInt(searchParams.get("limit") || "10");
            
            // Calculate skip value for pagination
            const skip = (page - 1) * limit;

            const whereClause: Record<string, unknown> = { user_id: Number(userId) };
            if (eventId) {
                whereClause["event_id"] = parseInt(eventId);
            }

            // Get total count for pagination metadata
            const totalCount = await prisma.eventRegistration.count({
                where: whereClause,
            });

            const registrations = await prisma.eventRegistration.findMany({
                where: whereClause,
                include: {
                    event: {
                        select: {
                            id: true,
                            title_EN: true,
                            title_TH: true,
                            status: true,
                            activityStart: true,
                            activityEnd: true,
                            skillRewards: {
                                include: {
                                    subSkillCategory: {
                                        include: {
                                            mainSkillCategory: true
                                        }
                                    }
                                }
                            },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: skip,
                take: limit,
            });

            // Transform data to group by main skills
            const transformedRegistrations = registrations.map(registration => {
                // Group skill rewards by main skill category
                const skillsByMainCategory = new Map<number, {
                    mainSkill: {
                        id: number;
                        name_TH: string;
                        name_EN: string;
                        slug: string;
                        icon: string | null;
                        color: string | null;
                    };
                    subSkills: Array<{
                        id: number;
                        name_TH: string;
                        name_EN: string;
                        slug: string;
                        icon: string | null;
                        color: string | null;
                        levelType: string;
                        baseExperience: number;
                        bonusExperience: number;
                    }>;
                }>();

                registration.event.skillRewards.forEach(reward => {
                    const mainSkillId = reward.subSkillCategory.mainSkillCategory.id;
                    
                    if (!skillsByMainCategory.has(mainSkillId)) {
                        skillsByMainCategory.set(mainSkillId, {
                            mainSkill: {
                                id: reward.subSkillCategory.mainSkillCategory.id,
                                name_TH: reward.subSkillCategory.mainSkillCategory.name_TH,
                                name_EN: reward.subSkillCategory.mainSkillCategory.name_EN,
                                slug: reward.subSkillCategory.mainSkillCategory.slug,
                                icon: reward.subSkillCategory.mainSkillCategory.icon,
                                color: reward.subSkillCategory.mainSkillCategory.color,
                            },
                            subSkills: []
                        });
                    }

                    skillsByMainCategory.get(mainSkillId)!.subSkills.push({
                        id: reward.subSkillCategory.id,
                        name_TH: reward.subSkillCategory.name_TH,
                        name_EN: reward.subSkillCategory.name_EN,
                        slug: reward.subSkillCategory.slug,
                        icon: reward.subSkillCategory.icon,
                        color: reward.subSkillCategory.color,
                        levelType: reward.levelType,
                        baseExperience: reward.baseExperience,
                        bonusExperience: reward.bonusExperience,
                    });
                });

                return {
                    ...registration,
                    event: {
                        id: registration.event.id,
                        title_EN: registration.event.title_EN,
                        title_TH: registration.event.title_TH,
                        status: registration.event.status,
                        activityStart: registration.event.activityStart,
                        activityEnd: registration.event.activityEnd,
                        skillsByMainCategory: Array.from(skillsByMainCategory.values())
                    }
                };
            });

            const totalPages = Math.ceil(totalCount / limit);

            const response = NextResponse.json(transformDatesToThai({
                success: true,
                data: transformedRegistrations,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalCount: totalCount,
                    limit: limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                }
            }));
            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Get registrations error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}

export async function POST(req: NextRequest) {
    return withUserAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const body: UserRegisterRequest = await req.json();

            if (!body.eventId || !body.action) {
                const response = NextResponse.json(
                    { error: "Missing required fields: eventId and action" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            if (body.action !== "register" && body.action !== "cancel") {
                const response = NextResponse.json(
                    { error: "Invalid action. Must be 'register' or 'cancel'" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // ใช้ $transaction เพื่อป้องกันข้อมูลทับกัน
            if (body.action === "register") {
                try {
                    const registration = await prisma.$transaction(async (tx) => {
                        // Lock event row และ query ข้อมูล
                        const event = await tx.$queryRaw<Array<{
                            id: number;
                            registrationStart: Date | null;
                            registrationEnd: Date | null;
                            allowedYearLevels: number[];
                            currentParticipants: number;
                            maxParticipants: number;
                            isForCMUEngineering: boolean | null;
                        }>>`
                            SELECT id, "registrationStart", "registrationEnd", "allowedYearLevels", 
                                    "currentParticipants", "maxParticipants", "isForCMUEngineering"
                            FROM "Event"
                            WHERE id = ${body.eventId}
                            FOR UPDATE
                        `;

                        if (!event || event.length === 0) {
                            throw new Error("EVENT_NOT_FOUND");
                        }

                        const eventData = event[0];
                        const now = new Date();
                        const start = new Date(eventData.registrationStart!);
                        const end = new Date(eventData.registrationEnd!);;
                        if (!eventData.registrationStart || !eventData.registrationEnd) {
                            throw new Error("REGISTRATION_PERIOD_NOT_SET");
                        }

                        if (now < start || now > end) {
                            throw new Error("REGISTRATION_CLOSED");
                        }

                        // ตรวจสอบ year level
                        const yearLevel = await getStudentYear(Number(userId));

                        if (eventData.allowedYearLevels && eventData.allowedYearLevels.length > 0) {
                            if (yearLevel === "EXTERNAL") {
                                throw new Error("STUDENT_ONLY");
                            }

                            let userYear = Number(yearLevel);
                            
                            if (userYear > 4) {
                                userYear = 4;
                            }
                            
                            if (!eventData.allowedYearLevels.includes(userYear)) {
                                throw new Error(`YEAR_NOT_ALLOWED:${eventData.allowedYearLevels.join(",")}`);
                            }
                        }

                        // check isForCMUEngineering
                        if (eventData.isForCMUEngineering === true) {
                            await prisma.user.findUnique({
                                where: { id: Number(userId) },
                                select: { faculty: true },
                            }).then(user => {
                                if (!user || user.faculty !== "Faculty of Engineering") {
                                    throw new Error("Faculty of Engineering ONLY");
                                }
                            });
                        } 


                        // ตรวจสอบจำนวนการยกเลิก
                        const limit = await tx.eventRegistrationCancellation.count({
                            where: { event_id: body.eventId, user_id: Number(userId), status: "CANCELLED" },
                        });

                        if (limit >= 2) {
                            throw new Error("MAX_CANCELLATION_REACHED");
                        }

                        // ตรวจสอบการลงทะเบียนซ้ำ
                        const existing = await tx.eventRegistration.findUnique({
                            where: { user_id_event_id: { user_id: Number(userId), event_id: eventData.id } },
                        });

                        if (existing) {
                            throw new Error("ALREADY_REGISTERED");
                        }

                        // ตรวจสอบ staff
                        const existing_staff = await tx.eventStaff.findFirst({
                            where: { user_id: Number(userId), event_id: eventData.id },
                        });

                        if (existing_staff) {
                            throw new Error("ALREADY_STAFF");
                        }

                        // ตรวจสอบที่นั่งว่าง
                        if (eventData.currentParticipants >= eventData.maxParticipants) {
                            throw new Error("EVENT_FULL");
                        }

                        // ตรวจสอบ slot capacity ถ้าเป็น time-slot event
                        let checkInSlot_id = null;
                        if (body.slotId) {
                            const slot = await tx.checkInTimeSlot.findUnique({
                                where: { id: body.slotId }
                            });
                            
                            if (!slot) {
                                throw new Error("SLOT_NOT_FOUND");
                            }
                            
                            if (slot.event_id !== eventData.id) {
                                throw new Error("SLOT_MISMATCH");
                            }
                            
                            // ตรวจสอบ slot capacity ถ้ามีการกำหนดไว้
                            if (slot.slotCapacity && slot.currentParticipants >= slot.slotCapacity) {
                                throw new Error("SLOT_FULL");
                            }
                            
                            // เพิ่ม slot counter
                            await tx.checkInTimeSlot.update({
                                where: { id: slot.id },
                                data: { currentParticipants: { increment: 1 } }
                            });
                            
                            checkInSlot_id = slot.id;
                        }

                        // อัพเดท currentParticipants
                        await tx.event.update({
                            where: { id: eventData.id },
                            data: { currentParticipants: { increment: 1 } },
                        });

                        // สร้าง registration
                        const newRegistration = await tx.eventRegistration.create({
                            data: {
                                user_id: Number(userId),
                                event_id: eventData.id,
                                status: "PENDING",
                                registrationType: body.registrationType || "NORMAL",
                                checkInSlot_id: checkInSlot_id
                            },
                        });

                        return newRegistration;
                    }, {
                        isolationLevel: 'Serializable', 
                        maxWait: 5000, 
                        timeout: 10000, 
                    });

                    const response = NextResponse.json(
                        transformDatesToThai({
                            success: true,
                            action: "register",
                            message: "Registered successfully",
                            data: registration,
                        }),
                        { status: 201 }
                    );

                    return addCorsHeaders(response, req);

                } catch (error) {
                    // console.error("Register transaction error:", error);
                    
                    // Handle specific errors
                    if (error instanceof Error) {
                        const errorMessage = error.message;
                        
                        if (errorMessage === "EVENT_NOT_FOUND") {
                            const response = NextResponse.json(
                                { error: "Event not found" },
                                { status: 404 }
                            );
                            return addCorsHeaders(response, req);
                        }
                        
                        if (errorMessage === "REGISTRATION_PERIOD_NOT_SET") {
                            const response = NextResponse.json(
                                { error: "Event registration period is not set" },
                                { status: 400 }
                            );
                            return addCorsHeaders(response, req);
                        }
                        
                        if (errorMessage === "REGISTRATION_CLOSED") {
                            const response = NextResponse.json(
                                { error: "Event is not open for registration" },
                                { status: 400 }
                            );
                            return addCorsHeaders(response, req);
                        }
                        
                        if (errorMessage === "STUDENT_ONLY") {
                            const response = NextResponse.json(
                                { error: "This event is only available for students" },
                                { status: 403 }
                            );
                            return addCorsHeaders(response, req);
                        }
                        
                        if (errorMessage.startsWith("YEAR_NOT_ALLOWED:")) {
                            const allowedYears = errorMessage.split(":")[1];
                            const response = NextResponse.json(
                                { error: `This event is only available for year ${allowedYears} students` },
                                { status: 403 }
                            );
                            return addCorsHeaders(response, req);
                        }
                        
                        if (errorMessage === "MAX_CANCELLATION_REACHED") {
                            const response = NextResponse.json(
                                { error: "You have reached the maximum number of cancellations for this event." },
                                { status: 403 }
                            );
                            return addCorsHeaders(response, req);
                        }
                        
                        if (errorMessage === "ALREADY_REGISTERED") {
                            const response = NextResponse.json(
                                { error: "You have already registered for this event" },
                                { status: 409 }
                            );
                            return addCorsHeaders(response, req);
                        }
                        
                        if (errorMessage === "ALREADY_STAFF") {
                            const response = NextResponse.json(
                                { error: "You have already registered as staff for this event" },
                                { status: 409 }
                            );
                            return addCorsHeaders(response, req);
                        }
                        
                        if (errorMessage === "EVENT_FULL") {
                            const response = NextResponse.json(
                                { error: "Event has reached maximum number of participants" },
                                { status: 403 }
                            );
                            return addCorsHeaders(response, req);
                        }
                        
                        if (errorMessage === "SLOT_NOT_FOUND") {
                            const response = NextResponse.json(
                                { error: "Time slot not found" },
                                { status: 404 }
                            );
                            return addCorsHeaders(response, req);
                        }
                        
                        if (errorMessage === "SLOT_MISMATCH") {
                            const response = NextResponse.json(
                                { error: "Time slot does not belong to this event" },
                                { status: 400 }
                            );
                            return addCorsHeaders(response, req);
                        }
                        
                        if (errorMessage === "SLOT_FULL") {
                            const response = NextResponse.json(
                                { error: "This time slot has reached maximum capacity" },
                                { status: 403 }
                            );
                            return addCorsHeaders(response, req);
                        }
                    }
                    
                    throw error;
                }
            }

            if (body.action === "cancel") {
                try {
                    await prisma.$transaction(async (tx) => {
                        // Lock event row และ query ข้อมูล
                        const event = await tx.$queryRaw<Array<{
                            id: number;
                            registrationStart: Date | null;
                            registrationEnd: Date | null;
                        }>>`
                            SELECT id, "registrationStart", "registrationEnd"
                            FROM "Event"
                            WHERE id = ${body.eventId}
                            FOR UPDATE
                        `;

                        if (!event || event.length === 0) {
                            throw new Error("EVENT_NOT_FOUND");
                        }

                        const eventData = event[0];
                        // const now = new Date();

                        if (!eventData.registrationStart || !eventData.registrationEnd) {
                            throw new Error("REGISTRATION_PERIOD_NOT_SET");
                        }

                        // if (now < new Date(eventData.registrationStart) || now > new Date(eventData.registrationEnd)) {
                        //     throw new Error("CANCELLATION_CLOSED");
                        // }

                        // ตรวจสอบว่ามี registration หรือไม่
                        const existing = await tx.eventRegistration.findUnique({
                            where: { user_id_event_id: { user_id: Number(userId), event_id: eventData.id } },
                        });

                        if (!existing) {
                            throw new Error("NOT_REGISTERED");
                        }

                        // คืน slot capacity ถ้าลงทะเบียนแบบ time-slot
                        if (existing.checkInSlot_id) {
                            await tx.checkInTimeSlot.update({
                                where: { id: existing.checkInSlot_id },
                                data: { currentParticipants: { decrement: 1 } }
                            });
                        }

                        // ลบ registration
                        await tx.eventRegistration.delete({
                            where: { user_id_event_id: { user_id: Number(userId), event_id: eventData.id } },
                        });

                        // ลด currentParticipants
                        await tx.event.update({
                            where: { id: eventData.id },
                            data: { currentParticipants: { decrement: 1 } },
                        });

                        // บันทึกการยกเลิก
                        await tx.eventRegistrationCancellation.create({
                            data: {
                                user_id: Number(userId),
                                event_id: eventData.id,
                                status: "CANCELLED",
                            },
                        });
                    }, {
                        isolationLevel: 'Serializable',
                        maxWait: 5000,
                        timeout: 10000,
                    });

                    const response = NextResponse.json(
                        {
                            success: true,
                            action: "cancel",
                            message: "Registration cancelled successfully",
                        },
                        { status: 200 }
                    );

                    return addCorsHeaders(response, req);

                } catch (error) {
                    console.error("Cancel transaction error:", error);
                    
                    // Handle specific errors
                    if (error instanceof Error) {
                        const errorMessage = error.message;
                        
                        if (errorMessage === "EVENT_NOT_FOUND") {
                            const response = NextResponse.json(
                                { error: "Event not found" },
                                { status: 404 }
                            );
                            return addCorsHeaders(response, req);
                        }
                        
                        if (errorMessage === "REGISTRATION_PERIOD_NOT_SET") {
                            const response = NextResponse.json(
                                { error: "Event registration period is not set" },
                                { status: 400 }
                            );
                            return addCorsHeaders(response, req);
                        }
                        
                        // if (errorMessage === "CANCELLATION_CLOSED") {
                        //     const response = NextResponse.json(
                        //         { error: "Cancellation is not allowed outside registration period" },
                        //         { status: 400 }
                        //     );
                        //     return addCorsHeaders(response, req);
                        // }
                        
                        if (errorMessage === "NOT_REGISTERED") {
                            const response = NextResponse.json(
                                { error: "You are not registered for this event" },
                                { status: 404 }
                            );
                            return addCorsHeaders(response, req);
                        }
                    }
                    
                    throw error;
                }
            }

            const response = NextResponse.json(
                { error: "Invalid action" },
                { status: 400 }
            );
            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Register/Cancel error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}