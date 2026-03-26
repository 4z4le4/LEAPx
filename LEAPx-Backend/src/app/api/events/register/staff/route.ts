import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withUserAuth, getUserId, getStudentYear } from "@/middleware/auth";
import { StaffRegisterRequest } from "@/types/EventLogic";
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
            const search = searchParams.get("search") || "";
            const filter = searchParams.get("filter") || "all";
            const sort = searchParams.get("sort") || "activityStart_desc"; 
            
            const skip = (page - 1) * limit;

            const user = await prisma.user.findUnique({
                where: { id: Number(userId) },
                include: {
                    role: true,
                    majorAdmins: {
                        where: { isActive: true },
                        include: {
                            majorCategory: true
                        }
                    }
                }
            });

            if (!user) {
                return addCorsHeaders(
                    NextResponse.json({ error: "User not found" }, { status: 404 }),
                    req
                );
            }

            const isSupreme = user.role.name === "SUPREME";
            const isActivityAdmin = user.role.name === "ACTIVITY_ADMIN";

            let eventIds: number[] = [];

            if (isSupreme) {
                const allEvents = await prisma.event.findMany({
                    where: eventId ? { id: parseInt(eventId) } : {},
                    select: { id: true }
                });
                eventIds = allEvents.map(e => e.id);
            } else if (isActivityAdmin) {
                const adminMajorIds = user.majorAdmins.map(ma => ma.majorCategory_id);
                const adminEvents = await prisma.event.findMany({
                    where: {
                        ...(eventId ? { id: parseInt(eventId) } : {}),
                        majorCategory_id: { in: adminMajorIds }
                    },
                    select: { id: true }
                });
                eventIds = adminEvents.map(e => e.id);
            }
            
            const whereClause: Record<string, unknown> = { user_id: Number(userId) };
            if (eventId) {
                whereClause["event_id"] = parseInt(eventId);
            }

            const staffRegistrations = await prisma.eventStaff.findMany({
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
                            location_TH: true,
                            location_EN: true,
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
                    },
                    role: true
                }
            });

            let adminEvents: Array<(typeof staffRegistrations)[number]> = [];
            if (isSupreme || isActivityAdmin) {
                const adminEventData = await prisma.event.findMany({
                    where: {
                        id: { in: eventIds },
                        NOT: {
                            id: { in: staffRegistrations.map(sr => sr.event_id) }
                        }
                    },
                    select: {
                        id: true,
                        title_EN: true,
                        title_TH: true,
                        status: true,
                        activityStart: true,
                        activityEnd: true,
                        location_TH: true,
                        location_EN: true,
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

                adminEvents = adminEventData.map(event => ({
                    id: 0,
                    user_id: Number(userId),
                    event_id: event.id,
                    StaffRole_id: 0,
                    status: "REGISTERED" as const,
                    responsibilities_TH: isSupreme ? "ผู้ดูแลระบบสูงสุด" : "ผู้ดูแลกิจกรรม",
                    responsibilities_EN: isSupreme ? "Supreme Admin" : "Activity Admin",
                    assignedAt: new Date(),
                    assignedBy: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    checkedIn: false,
                    checkInTime: null,
                    checkedOut: false,
                    checkOutTime: null,
                    event: event,
                    role: {
                        id: 0,
                        name: isSupreme ? "Supreme" : "Activity Admin",
                        canScanQR: true,
                        description_TH: null,
                        description_EN: null,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                }));
            }

            let allRegistrations = [...staffRegistrations, ...adminEvents];

            if (search.trim()) {
                const searchLower = search.toLowerCase();
                allRegistrations = allRegistrations.filter(registration => {
                    const titleTH = registration.event.title_TH.toLowerCase();
                    const titleEN = registration.event.title_EN.toLowerCase();
                    const locationTH = (registration.event.location_TH || "").toLowerCase();
                    const locationEN = (registration.event.location_EN || "").toLowerCase();
                    
                    return (
                        titleTH.includes(searchLower) ||
                        titleEN.includes(searchLower) ||
                        locationTH.includes(searchLower) ||
                        locationEN.includes(searchLower)
                    );
                });
            }

            if (filter !== "all") {
                const now = new Date();
                
                allRegistrations = allRegistrations.filter(registration => {
                    const startTime = new Date(registration.event.activityStart);
                    const endTime = new Date(registration.event.activityEnd);
                    
                    switch (filter) {
                        case "pending":
                            return registration.status === "PENDING";
                        case "upcoming":
                            return registration.status !== "PENDING" && now < startTime;
                        case "ongoing":
                            return registration.status !== "PENDING" && now >= startTime && now <= endTime;
                        case "completed":
                            return registration.status !== "PENDING" && now > endTime;
                        default:
                            return true;
                    }
                });
            }

            const totalCount = allRegistrations.length;
            
            allRegistrations.sort((a, b) => {
                switch (sort) {
                    case "activityStart_asc":
                        return new Date(a.event.activityStart).getTime() - new Date(b.event.activityStart).getTime();
                    
                    case "activityStart_desc":
                    default:
                        return new Date(b.event.activityStart).getTime() - new Date(a.event.activityStart).getTime();
                    
                    case "createdAt_asc":
                        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    
                    case "createdAt_desc":
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
            });
            
            const paginatedRegistrations = allRegistrations.slice(skip, skip + limit);

            const transformedRegistrations = paginatedRegistrations.map(registration => {
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
                        location_TH: registration.event.location_TH,
                        location_EN: registration.event.location_EN,
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
            console.error("Get staff registrations error:", error);
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
            const body: StaffRegisterRequest = await req.json();

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

            if (body.action === "register") {
                try {
                    const registration = await prisma.$transaction(async (tx) => {
                        const event = await tx.$queryRaw<Array<{
                            id: number;
                            registrationStart: Date | null;
                            registrationEnd: Date | null;
                            staffAllowedYears: number[];
                            currentStaffCount: number;
                            maxStaffCount: number;
                            isForCMUEngineering_Staff: boolean | null;
                        }>>`
                            SELECT id, "registrationStart", "registrationEnd", "staffAllowedYears", 
                                    "currentStaffCount", "maxStaffCount"
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
                        const end = new Date(eventData.registrationEnd!);

                        if (!eventData.registrationStart || !eventData.registrationEnd) {
                            throw new Error("REGISTRATION_PERIOD_NOT_SET");
                        }

                        if (now < start || now > end) {
                            throw new Error("REGISTRATION_CLOSED");
                        }

                        const yearLevel = await getStudentYear(Number(userId));

                        if (eventData.staffAllowedYears && eventData.staffAllowedYears.length > 0) {
                            if (yearLevel === "EXTERNAL") {
                                throw new Error("STUDENT_ONLY");
                            }

                            let userYear = Number(yearLevel);
                            if (userYear > 4) {
                                userYear = 4;
                            }
                            
                            if (!eventData.staffAllowedYears.includes(userYear)) {
                                throw new Error(`YEAR_NOT_ALLOWED:${eventData.staffAllowedYears.join(",")}`);
                            }
                        }

                        if (eventData.isForCMUEngineering_Staff === true) {
                            await prisma.user.findUnique({
                                where: { id: Number(userId) },
                                select: { faculty: true },
                            }).then(user => {
                                if (!user || user.faculty !== "Faculty of Engineering") {
                                    throw new Error("Faculty of Engineering ONLY");
                                }
                            });
                        }

                        const limit = await tx.eventRegistrationCancellation.count({
                            where: { event_id: body.eventId, user_id: Number(userId), status: "CANCELLED" },
                        });

                        if (limit >= 2) {
                            throw new Error("MAX_CANCELLATION_REACHED");
                        }

                        const existing = await tx.eventRegistration.findFirst({
                            where: { user_id: Number(userId), event_id: eventData.id },
                        });

                        const existing_staff = await tx.eventStaff.findFirst({
                            where: { user_id: Number(userId), event_id: eventData.id },
                        });

                        if (existing || existing_staff) {
                            throw new Error("ALREADY_REGISTERED");
                        }

                        if (eventData.currentStaffCount >= eventData.maxStaffCount) {
                            throw new Error("STAFF_FULL");
                        }

                        await tx.event.update({
                            where: { id: eventData.id },
                            data: { currentStaffCount: { increment: 1 } },
                        });

                        const newRegistration = await tx.eventStaff.create({
                            data: {
                                user_id: Number(userId),
                                event_id: eventData.id,
                                status: "PENDING",
                                StaffRole_id: 1,
                                responsibilities_TH: "-",
                                responsibilities_EN: "-",
                            },
                        });

                        return newRegistration;
                    }, {
                        isolationLevel: 'Serializable', // ใช้ Serializable เพื่อความปลอดภัยสูงสุด
                        maxWait: 5000, // รอ lock สูงสุด 5 วินาที
                        timeout: 10000, // timeout ทั้งหมด 10 วินาที
                    });

                    const response = NextResponse.json(
                        transformDatesToThai({
                            success: true,
                            action: "register",
                            message: "Registered as staff successfully",
                            data: registration,
                        }),
                        { status: 201 }
                    );

                    return addCorsHeaders(response, req);

                } catch (error) {
                    // console.error("Staff register transaction error:", error);
                    
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
                        
                        if (errorMessage === "STAFF_FULL") {
                            const response = NextResponse.json(
                                { error: "Event has reached maximum number of staff positions" },
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

                        const existing_staff = await tx.eventStaff.findFirst({
                            where: { user_id: Number(userId), event_id: eventData.id },
                        });

                        if (!existing_staff) {
                            throw new Error("NOT_REGISTERED_AS_STAFF");
                        }

                        await tx.eventStaff.deleteMany({
                            where: { user_id: Number(userId), event_id: eventData.id },
                        });

                        await tx.event.update({
                            where: { id: eventData.id },
                            data: { currentStaffCount: { decrement: 1 } },
                        });

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
                            message: "Staff registration cancelled successfully",
                        },
                        { status: 200 }
                    );

                    return addCorsHeaders(response, req);

                } catch (error) {
                    console.error("Staff cancel transaction error:", error);
                    
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
                        
                        if (errorMessage === "NOT_REGISTERED_AS_STAFF") {
                            const response = NextResponse.json(
                                { error: "You are not registered as staff for this event" },
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
            console.error("Staff Register/Cancel error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}