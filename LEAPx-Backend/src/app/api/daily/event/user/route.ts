import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, getUserId } from "@/middleware/auth";
import { Prisma } from "@prisma/client";
import { transformDatesToThai } from "@/utils/timezone";

interface ProcessRegistrationRequest {
    action: "approve" | "reject" | "approve_all" | "reject_all" | "approve_all_pending_system";
    eventId?: number; 
    registrationIds?: number[]; 
    reason?: string; 
}

interface ProcessResponse {
    success: boolean;
    message: string;
    data?: {
        processedRegistrations?: number;
        failedRegistrations?: number[];
        details?: unknown[];
    };
}

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const { searchParams } = new URL(req.url);
            const userId = await getUserId(req);
            const mode = searchParams.get('mode') || 'list';
            const eventIdParam = searchParams.get('eventId');
            const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
            const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
            const skip = (page - 1) * limit;
            const search = (searchParams.get('search') || '').trim();

            const eventStatus = searchParams.get('status');
            const isOnlineParam = searchParams.get('isOnline');
            const pendingOnly = searchParams.get('pendingOnly') !== 'false';
            const registrationStatus = searchParams.get('registrationStatus') || (pendingOnly ? 'PENDING' : undefined);
            const majorCategoryIdParam = searchParams.get('majorCategoryId');

            const majorCategoryId = majorCategoryIdParam ? Number(majorCategoryIdParam) : undefined;
            const isOnline = isOnlineParam !== null ? isOnlineParam === 'true' : undefined;
            const eventId = eventIdParam ? Number(eventIdParam) : undefined;

            if (majorCategoryIdParam && (!Number.isInteger(majorCategoryId) || Number(majorCategoryId) <= 0)) {
                return addCorsHeaders(
                    NextResponse.json({ error: 'majorCategoryId must be a positive integer' }, { status: 400 }),
                    req
                );
            }

            if (eventIdParam && (!Number.isInteger(eventId) || Number(eventId) <= 0)) {
                return addCorsHeaders(
                    NextResponse.json({ error: 'eventId must be a positive integer' }, { status: 400 }),
                    req
                );
            }

            const currentUser = await prisma.user.findUnique({
                where: { id: Number(userId) },
                include: {
                    role: true,
                    majorAdmins: {
                        where: { isActive: true },
                        select: { majorCategory_id: true }
                    }
                }
            });

            if (!currentUser) {
                return addCorsHeaders(
                    NextResponse.json({ error: "User not found" }, { status: 404 }),
                    req
                );
            }

            const isSupreme = currentUser.role.name === 'SUPREME';
            const adminMajorIds = currentUser.majorAdmins.map(admin => admin.majorCategory_id);

            if (!isSupreme && adminMajorIds.length === 0) {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "You don't have permission to view events because no major categories are assigned" },
                        { status: 403 }
                    ),
                    req
                );
            }

            const eventWhereClause: Prisma.EventWhereInput = {};

            if (!isSupreme) {
                eventWhereClause.majorCategory_id = { in: adminMajorIds };
            }

            if (majorCategoryId) {
                if (!isSupreme && !adminMajorIds.includes(majorCategoryId)) {
                    return addCorsHeaders(
                        NextResponse.json(
                            { error: "You can only filter events by your managed major categories" },
                            { status: 403 }
                        ),
                        req
                    );
                }
                eventWhereClause.majorCategory_id = majorCategoryId;
            }

            if (eventStatus) {
                eventWhereClause.status = eventStatus as never;
            }

            if (isOnline !== undefined) {
                eventWhereClause.isOnline = isOnline;
            }

            if (search) {
                eventWhereClause.OR = [
                    { title_TH: { contains: search, mode: 'insensitive' } },
                    { title_EN: { contains: search, mode: 'insensitive' } },
                    { description_TH: { contains: search, mode: 'insensitive' } },
                    { description_EN: { contains: search, mode: 'insensitive' } },
                ];
            }

            if (mode === 'detail') {
                if (!eventId) {
                    return addCorsHeaders(
                        NextResponse.json({ error: 'eventId is required when mode=detail' }, { status: 400 }),
                        req
                    );
                }

                const event = await prisma.event.findFirst({
                    where: {
                        ...eventWhereClause,
                        id: eventId,
                    },
                    select: {
                        id: true,
                        title_TH: true,
                        title_EN: true,
                        description_TH: true,
                        description_EN: true,
                        status: true,
                        isOnline: true,
                        activityStart: true,
                        activityEnd: true,
                        maxParticipants: true,
                        currentParticipants: true,
                        majorCategory_id: true,
                        majorCategory: {
                            select: {
                                id: true,
                                code: true,
                                name_TH: true,
                                name_EN: true,
                            }
                        },
                    }
                });

                if (!event) {
                    return addCorsHeaders(
                        NextResponse.json({ error: 'Event not found or no permission' }, { status: 404 }),
                        req
                    );
                }

                const registrationWhere: Prisma.EventRegistrationWhereInput = {
                    event_id: event.id,
                };

                if (registrationStatus) {
                    registrationWhere.status = registrationStatus as never;
                }

                if (search) {
                    registrationWhere.OR = [
                        { user: { firstName: { contains: search, mode: 'insensitive' } } },
                        { user: { lastName: { contains: search, mode: 'insensitive' } } },
                        { user: { email: { contains: search, mode: 'insensitive' } } },
                    ];

                    const numericSearch = Number(search);
                    if (Number.isInteger(numericSearch) && numericSearch > 0) {
                        registrationWhere.OR.push({ user_id: numericSearch });
                    }
                }

                const [totalCount, registrations] = await prisma.$transaction([
                    prisma.eventRegistration.count({ where: registrationWhere }),
                    prisma.eventRegistration.findMany({
                        where: registrationWhere,
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    faculty: true,
                                    major: true,
                                    photo: true,
                                }
                            }
                        },
                        orderBy: { createdAt: 'asc' },
                        skip,
                        take: limit,
                    })
                ]);

                const response = NextResponse.json(transformDatesToThai({
                    success: true,
                    mode: 'detail',
                    data: {
                        event,
                        registrations,
                    },
                    filters: {
                        search,
                        registrationStatus: registrationStatus || null,
                    },
                    pagination: {
                        total: totalCount,
                        page,
                        limit,
                        totalPages: Math.ceil(totalCount / limit),
                    },
                    userPermissions: {
                        isSupreme,
                        adminMajorIds,
                    }
                }));

                return addCorsHeaders(response, req);
            }

            const pendingCountWhere = pendingOnly ? { status: 'PENDING' as const } : undefined;

            const [totalEvents, events] = await prisma.$transaction([
                prisma.event.count({ where: eventWhereClause }),
                prisma.event.findMany({
                    where: eventWhereClause,
                    select: {
                        id: true,
                        title_TH: true,
                        title_EN: true,
                        status: true,
                        isOnline: true,
                        activityStart: true,
                        activityEnd: true,
                        maxParticipants: true,
                        currentParticipants: true,
                        majorCategory_id: true,
                        majorCategory: {
                            select: {
                                id: true,
                                code: true,
                                name_TH: true,
                                name_EN: true,
                            }
                        },
                        _count: {
                            select: {
                                registrations: pendingCountWhere
                                    ? { where: pendingCountWhere }
                                    : true,
                            }
                        }
                    },
                    orderBy: { activityStart: 'desc' },
                    skip,
                    take: limit,
                })
            ]);

            const response = NextResponse.json(transformDatesToThai({
                success: true,
                mode: 'list',
                data: events,
                filters: {
                    search,
                    status: eventStatus || null,
                    isOnline: isOnline ?? null,
                    majorCategoryId: majorCategoryId || null,
                    pendingOnly,
                },
                pagination: {
                    total: totalEvents,
                    page,
                    limit,
                    totalPages: Math.ceil(totalEvents / limit),
                },
                userPermissions: {
                    isSupreme,
                    adminMajorIds,
                }
            }));

            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Get pending registrations error:", error);
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

export async function POST(req: NextRequest) {
    const internalKey = req.headers.get('X-Internal-Key');
    const isInternalCall = internalKey === (process.env.INTERNAL_API_KEY || 'your-secret-key');

    const body = await req.json();
    if (body.action === 'approve_all_pending_system' && !isInternalCall) {
        return addCorsHeaders(
        NextResponse.json(
            { error: "Unauthorized: This action requires internal authentication" },
            { status: 401 }
        ),
        req
        );
    }

    if (isInternalCall && body.action === 'approve_all_pending_system') {
        try {
        const result = await approveAllPendingRegistrationsSystem(body.reason);
        return addCorsHeaders(NextResponse.json(result), req);
        } catch (error) {
        console.error("Process registrations error:", error);
        return addCorsHeaders(
            NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
            ),
            req
        );
        }
    }

    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const body: ProcessRegistrationRequest = await req.json();

            // Validate request
            if (!body.action) {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "Missing required field: action" },
                        { status: 400 }
                    ),
                    req
                );
            }

            // approve_all_pending_system ไม่ต้องเช็ค eventId
            if ((body.action === 'approve' || body.action === 'reject') && !body.eventId) {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "eventId is required for single event operations" },
                        { status: 400 }
                    ),
                    req
                );
            }

            const currentUser = await prisma.user.findUnique({
                where: { id: Number(userId) },
                include: {
                    role: true,
                    majorAdmins: {
                        where: { isActive: true },
                        select: { majorCategory_id: true }
                    }
                }
            });

            if (!currentUser) {
                return addCorsHeaders(
                    NextResponse.json({ error: "User not found" }, { status: 404 }),
                    req
                );
            }

            const isSupreme = currentUser.role.name === 'SUPREME';
            const adminMajorIds = currentUser.majorAdmins.map(admin => admin.majorCategory_id);

            let result: ProcessResponse;

            switch (body.action) {
                case 'approve':
                    result = await processRegistrations(
                        body.eventId!,
                        'REGISTERED',
                        body.registrationIds,
                        isSupreme,
                        adminMajorIds,
                        body.reason
                    );
                    break;

                case 'reject':
                    result = await processRegistrations(
                        body.eventId!,
                        'CANCELLED',
                        body.registrationIds, 
                        isSupreme,
                        adminMajorIds,
                        body.reason
                    );
                    break;

                case 'approve_all':
                    result = await processAllPendingInAllEvents(
                        body.eventId!,
                        'REGISTERED',
                        isSupreme,
                        adminMajorIds,
                        body.reason
                    );
                    break;

                case 'reject_all':
                    result = await processAllPendingInAllEvents(
                        body.eventId!,
                        'CANCELLED',
                        isSupreme,
                        adminMajorIds,
                        body.reason
                    );
                    break;

                case 'approve_all_pending_system':
                    // ไม่เช็คสิทธิ์ - ใช้สำหรับ automation/cron job
                    result = await approveAllPendingRegistrationsSystem(body.reason);
                    break;

                default:
                    return addCorsHeaders(
                        NextResponse.json(
                            { error: "Invalid action" },
                            { status: 400 }
                        ),
                        req
                    );
            }

            return addCorsHeaders(
                NextResponse.json(result),
                req
            );

        } catch (error) {
            console.error("Process registrations error:", error);
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
 * ฟังก์ชันสำหรับ approve ทุก PENDING registrations ในระบบ
 * ไม่เช็คสิทธิ์ - ใช้สำหรับ automation/cron job
 */
async function approveAllPendingRegistrationsSystem(
    _reason?: string
): Promise<ProcessResponse> {
    return await prisma.$transaction(async (tx) => {
        let processedRegistrations = 0;
        const failedRegistrations: number[] = [];
        const eventDetails: Array<{ eventId: number; eventTitle: string; registrations: number; }> = [];

        // ดึงทุก event ที่มี PENDING registrations
        const eventsWithPending = await tx.event.findMany({
            where: {
                registrations: {
                    some: {
                        status: 'PENDING'
                    }
                }
            },
            select: { 
                id: true, 
                title_EN: true, 
                title_TH: true,
                currentParticipants: true,
                maxParticipants: true
            }
        });

        // Process แต่ละ event
        for (const event of eventsWithPending) {
            let eventRegCount = 0;

            // Lock event row สำหรับ update currentParticipants
            await tx.event.findUnique({
                where: { id: event.id },
                select: { id: true }
            });

            // ดึง PENDING registrations ของ event นี้
            const registrations = await tx.eventRegistration.findMany({
                where: {
                    status: 'PENDING',
                    event_id: event.id
                },
                orderBy: { createdAt: 'asc' }
            });

            for (const registration of registrations) {
                try {
                    // Update status เป็น REGISTERED
                    await tx.eventRegistration.update({
                        where: { id: registration.id },
                        data: { status: 'REGISTERED' }
                    });

                    processedRegistrations++;
                    eventRegCount++;
                } catch (error) {
                    console.error(`Failed to process registration ${registration.id}:`, error);
                    failedRegistrations.push(registration.id);
                }
            }

            // Add event details ถ้ามี processing
            if (eventRegCount > 0) {
                eventDetails.push({
                    eventId: event.id,
                    eventTitle: event.title_EN,
                    registrations: eventRegCount,
                });
            }
        }

        return {
            success: true,
            message: `System approved ${processedRegistrations} pending registrations across all events`,
            data: {
                processedRegistrations,
                failedRegistrations: failedRegistrations.length > 0 ? failedRegistrations : undefined,
                details: eventDetails
            }
        };
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 30000
    });
}

async function processRegistrations(
    eventId: number,
    newStatus: 'REGISTERED' | 'CANCELLED',
    registrationIds?: number[],
    isSupreme?: boolean,
    adminMajorIds?: number[],
    reason?: string
): Promise<ProcessResponse> {

    return await prisma.$transaction(async (tx) => {
        // Lock event row ก่อน
        const event = await tx.event.findUnique({
            where: { id: eventId },
            select: { 
                id: true, 
                majorCategory_id: true,
                currentParticipants: true,
                maxParticipants: true
            }
        });

        if (!event) {
            throw new Error("Event not found");
        }

        // Check permissions
        if (!isSupreme) {
            if (event.majorCategory_id && !adminMajorIds?.includes(event.majorCategory_id)) {
                throw new Error("You don't have permission to manage this event");
            }
        }

        let processedRegistrations = 0;
        const failedRegistrations: number[] = [];

        // Build where clause
        const registrationWhere: Prisma.EventRegistrationWhereInput = {
            event_id: eventId,
            status: 'PENDING'
        };

        if (registrationIds && registrationIds.length > 0) {
            registrationWhere.id = { in: registrationIds };
        }

        const registrations = await tx.eventRegistration.findMany({
            where: registrationWhere,
            orderBy: { createdAt: 'asc' }
        });

        for (const registration of registrations) {
            try {
                if (newStatus === 'CANCELLED') {
                    // Decrease participant count atomically
                    await tx.event.update({
                        where: { id: eventId },
                        data: { currentParticipants: { decrement: 1 } }
                    });

                    // Create cancellation record
                    await tx.eventRegistrationCancellation.create({
                        data: {
                            user_id: registration.user_id,
                            event_id: eventId,
                            status: 'CANCELLED',
                            reason: reason
                        }
                    });

                    // Delete registration
                    await tx.eventRegistration.delete({
                        where: { id: registration.id }
                    });
                } else {
                    // Update to REGISTERED
                    await tx.eventRegistration.update({
                        where: { id: registration.id },
                        data: { status: newStatus }
                    });
                }

                processedRegistrations++;
            } catch (error) {
                console.error(`Failed to process registration ${registration.id}:`, error);
                failedRegistrations.push(registration.id);
                
                // ถ้าเป็น unique constraint error ให้ rollback
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    if (error.code === 'P2002') {
                        throw new Error(`Duplicate registration detected for registration ${registration.id}`);
                    }
                }
            }
        }

        return {
            success: true,
            message: `Processed ${processedRegistrations} registrations for event ${eventId}`,
            data: {
                processedRegistrations,
                failedRegistrations: failedRegistrations.length > 0 ? failedRegistrations : undefined
            }
        };
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 30000
    });
}

async function processAllPendingInAllEvents(
    eventId: number,
    newStatus: 'REGISTERED' | 'CANCELLED',
    isSupreme: boolean,
    adminMajorIds: number[],
    reason?: string
): Promise<ProcessResponse> {
    
    return await prisma.$transaction(async (tx) => {
        // Build where clause สำหรับ events
        const eventWhereClause: Prisma.EventWhereInput = { id: eventId };
        
        if (!isSupreme) {
            if (adminMajorIds.length > 0) {
                eventWhereClause.majorCategory_id = { in: adminMajorIds };
            } else {
                throw new Error("You don't have permission to process any events");
            }
        }

        // Lock event rows
        const events = await tx.event.findMany({
            where: eventWhereClause,
            select: { 
                id: true, 
                title_EN: true, 
                title_TH: true,
                currentParticipants: true,
                maxParticipants: true
            }
        });

        const eventIds = events.map(e => e.id);

        if (eventIds.length === 0) {
            return {
                success: true,
                message: "No events found to process",
                data: {
                    processedRegistrations: 0,
                }
            };
        }

        let processedRegistrations = 0;
        const failedRegistrations: number[] = [];
        const eventDetails: Array<{ eventId: number; eventTitle: string; registrations: number; }> = [];

        // Process each event
        for (const event of events) {
            let eventRegCount = 0;

            // Get PENDING registrations for this event
            const registrations = await tx.eventRegistration.findMany({
                where: {
                    status: 'PENDING',
                    event_id: event.id
                },
                orderBy: { createdAt: 'asc' }
            });

            for (const registration of registrations) {
                try {
                    if (newStatus === 'CANCELLED') {
                        // Atomic decrement
                        await tx.event.update({
                            where: { id: registration.event_id },
                            data: { currentParticipants: { decrement: 1 } }
                        });

                        await tx.eventRegistrationCancellation.create({
                            data: {
                                user_id: registration.user_id,
                                event_id: registration.event_id,
                                status: 'CANCELLED',
                                reason: reason
                            }
                        });

                        await tx.eventRegistration.delete({
                            where: { id: registration.id }
                        });
                    } else {
                        await tx.eventRegistration.update({
                            where: { id: registration.id },
                            data: { status: newStatus }
                        });
                    }

                    processedRegistrations++;
                    eventRegCount++;
                } catch (error) {
                    console.error(`Failed to process registration ${registration.id}:`, error);
                    failedRegistrations.push(registration.id);
                    
                    // Handle unique constraint violations
                    if (error instanceof Prisma.PrismaClientKnownRequestError) {
                        if (error.code === 'P2002') {
                            throw new Error(`Duplicate registration detected for registration ${registration.id}`);
                        }
                    }
                }
            }

            // Add event details if any processing occurred
            if (eventRegCount > 0) {
                eventDetails.push({
                    eventId: event.id,
                    eventTitle: event.title_EN,
                    registrations: eventRegCount,
                });
            }
        }

        return {
            success: true,
            message: `Processed ${processedRegistrations} registrations across all events`,
            data: {
                processedRegistrations,
                failedRegistrations: failedRegistrations.length > 0 ? failedRegistrations : undefined,
                details: eventDetails
            }
        };
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 30000
    });
}