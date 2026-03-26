import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, getUserId } from "@/middleware/auth";
import { GetEventsParams } from "@/types/EventType";
import { transformDatesToThai } from "@/utils/timezone";

interface ProcessRegistrationRequest {
    action: "approve" | "reject" | "approve_all" | "reject_all";
    eventId?: number; 
    staffIds?: number[]; 
    reason?: string; 
}

interface ProcessResponse {
    success: boolean;
    message: string;
    data?: {
        processedStaff?: number;
        failedStaff?: number[];
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
        const eventId = eventIdParam ? Number(eventIdParam) : undefined;
        const staffStatus = searchParams.get('staffStatus') || 'PENDING';
        const staffSearch = (searchParams.get('staffSearch') || '').trim();

        if (eventIdParam && (!Number.isInteger(eventId) || Number(eventId) <= 0)) {
            const response = NextResponse.json(
                { error: 'eventId must be a positive integer' },
                { status: 400 }
            );
            return addCorsHeaders(response, req);
        }
        
        const params: GetEventsParams = {
            status: searchParams.get('status') || undefined,
            isOnline: searchParams.get('isOnline') ? searchParams.get('isOnline') === 'true' : undefined,
            search: searchParams.get('search') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '20'),
            sortBy: searchParams.get('sortBy') || 'activityStart',
            sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
            includeSkillRewards: searchParams.get('includeSkillRewards') === 'true',
            includeStats: searchParams.get('includeStats') === 'true',
            old_events: searchParams.get('old_events') === 'false',
        };

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
                const response = NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

        const isSupreme = currentUser.role.name === 'SUPREME';
        const adminMajorIds = currentUser.majorAdmins.map(admin => admin.majorCategory_id);

        const whereClause: Record<string, unknown> = {};

        if (!isSupreme) {
            if (adminMajorIds.length > 0) {
                whereClause.majorCategory_id = { in: adminMajorIds };
            } else {
                whereClause.id = -1;
            }
        }
        
        if (params.status) {
            whereClause.status = params.status;
        }
        
        if (params.isOnline !== undefined) {
            whereClause.isOnline = params.isOnline;
        }
        
        // Filter old events based on old_events parameter
        if (params.old_events === false) {
            // ไม่แสดง event ที่จบไปแล้ว (activityEnd < ปัจจุบัน)
            whereClause.activityEnd = {
                gte: new Date() // activityEnd >= วันเวลาปัจจุบัน
            };
        }
        
        if (params.search) {
            const searchConditions = [
                { title_TH: { contains: params.search, mode: 'insensitive' } },
                { title_EN: { contains: params.search, mode: 'insensitive' } },
                { description_TH: { contains: params.search, mode: 'insensitive' } },
                { description_EN: { contains: params.search, mode: 'insensitive' } },
            ];

            if (whereClause.OR) {
                whereClause.AND = [
                    { OR: whereClause.OR },
                    { OR: searchConditions }
                ];
                delete whereClause.OR;
            } else {
                whereClause.OR = searchConditions;
            }
        }

        if (eventId) {
            whereClause.id = eventId;
        }

        if (mode === 'detail') {
            if (!eventId) {
                const response = NextResponse.json(
                    { error: 'eventId is required when mode=detail' },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const event = await prisma.event.findFirst({
                where: whereClause,
                select: {
                    id: true,
                    title_TH: true,
                    title_EN: true,
                    status: true,
                    isOnline: true,
                    activityStart: true,
                    activityEnd: true,
                    maxStaffCount: true,
                    currentStaffCount: true,
                    majorCategory: {
                        select: {
                            id: true,
                            code: true,
                            name_TH: true,
                            name_EN: true,
                            faculty_TH: true,
                            faculty_EN: true,
                        }
                    }
                }
            });

            if (!event) {
                const response = NextResponse.json(
                    { error: 'Event not found or no permission' },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            const staffWhere: Record<string, unknown> = {
                event_id: event.id,
            };

            if (staffStatus) {
                staffWhere.status = staffStatus;
            }

            if (staffSearch) {
                const searchConditions: Array<Record<string, unknown>> = [
                    { user: { firstName: { contains: staffSearch, mode: 'insensitive' } } },
                    { user: { lastName: { contains: staffSearch, mode: 'insensitive' } } },
                    { user: { email: { contains: staffSearch, mode: 'insensitive' } } },
                ];

                const numericStaffSearch = Number(staffSearch);
                if (Number.isInteger(numericStaffSearch) && numericStaffSearch > 0) {
                    searchConditions.push({ user_id: numericStaffSearch });
                }

                staffWhere.OR = searchConditions;
            }

            const skip = ((params.page || 1) - 1) * (params.limit || 20);
            const take = params.limit || 20;

            const [totalCount, staff] = await prisma.$transaction([
                prisma.eventStaff.count({ where: staffWhere }),
                prisma.eventStaff.findMany({
                    where: staffWhere,
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                faculty: true,
                                major: true,
                                phone: true,
                                photo: true,
                            }
                        },
                        role: {
                            select: {
                                id: true,
                                name: true,
                                description_TH: true,
                                description_EN: true,
                            }
                        }
                    },
                    orderBy: { assignedAt: 'asc' },
                    skip,
                    take,
                })
            ]);

            const response = NextResponse.json(transformDatesToThai({
                success: true,
                mode: 'detail',
                data: {
                    event,
                    staff,
                },
                filters: {
                    search: params.search || null,
                    staffSearch,
                    status: params.status || null,
                    staffStatus: staffStatus || null,
                },
                pagination: {
                    total: totalCount,
                    page: params.page || 1,
                    limit: params.limit || 20,
                    totalPages: Math.ceil(totalCount / (params.limit || 20)),
                },
                userPermissions: {
                    isSupreme,
                    adminMajorIds,
                }
            }));
            return addCorsHeaders(response, req);
        }

        const includeClause: Record<string, unknown> = {
            creator: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                }
            },
            majorCategory: {
                select: {
                    id: true,
                    code: true,
                    name_TH: true,
                    name_EN: true,
                    faculty_TH: true,
                    faculty_EN: true,
                    icon: true,
                }
            },
            photos: {
                include: {
                    cloudinaryImage: {
                    select: {
                        url: true,
                    }
                    }
                },
                orderBy: [
                    { isMain: 'desc' },
                    { sortOrder: 'asc' }
                ]
            },
            checkInTimeSlots: {
                orderBy: { slot_number: 'asc' }
            },
            _count: {
                select: {
                    staffAssignments: {
                        where: {
                            status: 'PENDING'
                        }
                    }
                }
            },
        };

        if (params.includeSkillRewards) {
            includeClause.skillRewards = {
            select: {
                levelType: true
            },
            include: {
                subSkillCategory: {
                include: {
                    mainSkillCategory: {
                    select: {
                        id: true,
                        name_EN: true,
                        name_TH: true,
                        color: true,
                        icon: true,
                    }
                    }
                }
                }
            }
            };
        }

        if (params.includeStats) {
            includeClause._count = {
                select: {
                    registrations: true,
                    skillRewards: true,
                    staffAssignments: true,
                }
            };
        }

        const skip = ((params.page || 1) - 1) * (params.limit || 20);
        const take = params.limit || 20;

        const totalCount = await prisma.event.count({ where: whereClause });

        const events = await prisma.event.findMany({
            where: whereClause,
            include: includeClause,
            orderBy: { [params.sortBy || 'activityStart']: params.sortOrder || 'asc' },
            skip,
            take,
        });

        const response = NextResponse.json(transformDatesToThai({
            success: true,
            mode: 'list',
            data: events,
            filters: {
                search: params.search || null,
                status: params.status || null,
                isOnline: params.isOnline ?? null,
                sortBy: params.sortBy || 'activityStart',
                sortOrder: params.sortOrder || 'asc',
            },
            pagination: {
                total: totalCount,
                page: params.page || 1,
                limit: params.limit || 20,
                totalPages: Math.ceil(totalCount / (params.limit || 20)),
            },
            userPermissions: {
                isSupreme,
                adminMajorIds,
            }
        }));
        return addCorsHeaders(response, req);

        } catch (error) {
        console.error("Get events error:", error);
        const response = NextResponse.json(
            { error: "Failed to fetch events" },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
        }
    });
}
export async function POST(req: NextRequest) {
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

            // For single/multiple staff operations, need either eventId or staffIds
            if ((body.action === 'approve' || body.action === 'reject')) {
                if (!body.eventId && (!body.staffIds || body.staffIds.length === 0)) {
                    return addCorsHeaders(
                        NextResponse.json(
                            { error: "Either eventId or staffIds is required" },
                            { status: 400 }
                        ),
                        req
                    );
                }
            }

            // Check user permissions
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
                    result = await processStaffRegistrations(
                        'REGISTERED',
                        body.eventId,
                        body.staffIds,
                        isSupreme,
                        adminMajorIds
                    );
                    break;

                case 'reject':
                    result = await processStaffRegistrations(
                        'CANCELLED',
                        body.eventId,
                        body.staffIds,
                        isSupreme,
                        adminMajorIds,
                        body.reason
                    );
                    break;

                case 'approve_all':
                    result = await processAllPendingInAllEvents(
                        'REGISTERED',
                        isSupreme,
                        adminMajorIds
                    );
                    break;

                case 'reject_all':
                    result = await processAllPendingInAllEvents(
                        'CANCELLED',
                        isSupreme,
                        adminMajorIds,
                        body.reason
                    );
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
            console.error("Process staff registrations error:", error);
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

async function processStaffRegistrations(
    newStatus: 'REGISTERED' | 'CANCELLED',
    eventId?: number,
    staffIds?: number[],
    isSupreme?: boolean,
    adminMajorIds?: number[],
    reason?: string
): Promise<ProcessResponse> {
    
    return await prisma.$transaction(async (tx) => {
        let processedStaff = 0;
        const failedStaff: number[] = [];
        const processedDetails: Array<{
            staffId: number;
            userId: number;
            userName: string;
            eventId: number;
            eventTitle: string;
            action: string;
        }> = [];

        // Build where clause
        const staffWhere: Record<string, unknown> = {
            status: 'PENDING'
        };

        if (eventId) {
            staffWhere.event_id = eventId;
        }

        if (staffIds && staffIds.length > 0) {
            staffWhere.id = { in: staffIds };
        }

        // Get all matching staff
        const staffMembers = await tx.eventStaff.findMany({
            where: staffWhere,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                event: {
                    select: {
                        id: true,
                        title_EN: true,
                        title_TH: true,
                        majorCategory_id: true,
                        maxStaffCount: true,
                        currentStaffCount: true
                    }
                }
            }
        });

        // Check permissions for each event
        for (const staff of staffMembers) {
            try {
                // Permission check
                if (!isSupreme) {
                    if (staff.event.majorCategory_id && 
                        !adminMajorIds?.includes(staff.event.majorCategory_id)) {
                        failedStaff.push(staff.id);
                        continue;
                    }
                }

                if (newStatus === 'REGISTERED') {
                    // Check capacity
                    if (staff.event.currentStaffCount >= staff.event.maxStaffCount) {
                        console.warn(`Event ${staff.event.id} is full. Cannot approve staff ${staff.id}`);
                        failedStaff.push(staff.id);
                        continue;
                    }

                    // Approve: Update status to REGISTERED
                    await tx.eventStaff.update({
                        where: { id: staff.id },
                        data: { status: 'REGISTERED' }
                    });

                    // Increment staff count
                    await tx.event.update({
                        where: { id: staff.event_id },
                        data: { currentStaffCount: { increment: 1 } }
                    });

                } else {
                    // Reject: Create cancellation record and delete staff
                    await tx.eventRegistrationCancellation.create({
                        data: {
                            user_id: staff.user_id,
                            event_id: staff.event_id,
                            status: 'CANCELLED',
                            reason: reason || 'Staff application rejected by admin'
                        }
                    });

                    // Delete staff assignment
                    await tx.eventStaff.delete({
                        where: { id: staff.id }
                    });
                }

                processedStaff++;
                processedDetails.push({
                    staffId: staff.id,
                    userId: staff.user.id,
                    userName: `${staff.user.firstName} ${staff.user.lastName}`,
                    eventId: staff.event.id,
                    eventTitle: staff.event.title_EN,
                    action: newStatus === 'REGISTERED' ? 'approved' : 'rejected'
                });

            } catch (error) {
                console.error(`Failed to process staff ${staff.id}:`, error);
                failedStaff.push(staff.id);
            }
        }

        return {
            success: true,
            message: `Processed ${processedStaff} staff member(s). ${failedStaff.length > 0 ? `Failed: ${failedStaff.length}` : ''}`,
            data: {
                processedStaff,
                failedStaff: failedStaff.length > 0 ? failedStaff : undefined,
                details: processedDetails
            }
        };
    });
}

async function processAllPendingInAllEvents(
    newStatus: 'REGISTERED' | 'CANCELLED',
    isSupreme: boolean,
    adminMajorIds: number[],
    reason?: string
): Promise<ProcessResponse> {
    // Build event filter based on permissions
    const eventWhereClause: Record<string, unknown> = {};
    
    if (!isSupreme) {
        if (adminMajorIds.length > 0) {
            eventWhereClause.majorCategory_id = { in: adminMajorIds };
        } else {
            throw new Error("You don't have permission to process any events");
        }
    }

    return await prisma.$transaction(async (tx) => {
        // Query events ภายใน transaction
        const events = await tx.event.findMany({
            where: eventWhereClause,
            select: { 
                id: true, 
                title_EN: true, 
                title_TH: true,
                maxStaffCount: true,
                currentStaffCount: true
            }
        });

        if (events.length === 0) {
            return {
                success: true,
                message: "No events found to process",
                data: { processedStaff: 0 }
            };
        }

        let processedStaff = 0;
        const failedStaff: number[] = [];
        const eventDetails: Array<{ 
            eventId: number; 
            eventTitle: string; 
            approved: number;
            rejected: number;
        }> = [];
        
        // Process each event
        for (const event of events) {
            let approvedCount = 0;
            let rejectedCount = 0;

            const staffMembers = await tx.eventStaff.findMany({
                where: {
                    status: 'PENDING',
                    event_id: event.id
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });

            for (const staff of staffMembers) {
                try {
                    if (newStatus === 'REGISTERED') {
                        // ไม่ต้อง query event อีกรอบ ใช้ค่าจาก events ที่ query มาแล้ว
                        if (event.currentStaffCount >= event.maxStaffCount) {
                            console.warn(`Event ${event.id} is full. Skipping staff ${staff.id}`);
                            failedStaff.push(staff.id);
                            continue;
                        }

                        await tx.eventStaff.update({
                            where: { id: staff.id },
                            data: { status: 'REGISTERED' }
                        });

                        await tx.event.update({
                            where: { id: event.id },
                            data: { currentStaffCount: { increment: 1 } }
                        });

                        // อัพเดท local state
                        event.currentStaffCount++;
                        approvedCount++;
                    } else {
                        await tx.eventRegistrationCancellation.create({
                            data: {
                                user_id: staff.user_id,
                                event_id: staff.event_id,
                                status: 'CANCELLED',
                                reason: reason || 'Bulk rejection by admin'
                            }
                        });

                        await tx.eventStaff.delete({
                            where: { id: staff.id }
                        });

                        rejectedCount++;
                    }

                    processedStaff++;
                } catch (error) {
                    console.error(`Failed to process staff ${staff.id}:`, error);
                    failedStaff.push(staff.id);
                }
            }

            if (approvedCount > 0 || rejectedCount > 0) {
                eventDetails.push({
                    eventId: event.id,
                    eventTitle: event.title_EN,
                    approved: approvedCount,
                    rejected: rejectedCount
                });
            }
        }

        return {
            success: true,
            message: `Processed ${processedStaff} staff member(s) across ${eventDetails.length} event(s)`,
            data: {
                processedStaff,
                failedStaff: failedStaff.length > 0 ? failedStaff : undefined,
                details: eventDetails
            }
        };
    }, {
        timeout: 30000, // เพิ่ม timeout เป็น 30 วินาทีถ้าจำเป็น
    });
}