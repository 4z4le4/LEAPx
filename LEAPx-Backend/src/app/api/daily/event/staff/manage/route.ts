import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, getUserId } from "@/middleware/auth";
import { transformDatesToThai } from "@/utils/timezone";

interface CancelStaffRequest {
    eventId: number;
    staffIds: number[];
    reason?: string;
}

interface UpdateStaffRoleRequest {
    eventId: number;
    staffId: number;
    newRoleId: number;
}

interface CancelStaffResponse {
    success: boolean;
    message: string;
    data?: {
        cancelledCount: number;
        failedStaff?: number[];
        details?: Array<{
            staffId: number;
            userId: number;
            userName: string;
            reason?: string;
        }>;
    };
}

interface UpdateStaffRoleResponse {
    success: boolean;
    message: string;
    data?: {
        staffId: number;
        userId: number;
        previousRoleId: number;
        previousRoleName: string;
        newRoleId: number;
        newRoleName_TH: string;
        newRoleName_EN: string;
        eventId: number;
        eventTitle: string;
    };
}

interface StaffRoleResponse {
    success: boolean;
    data: Array<{
        id: number;
        name: string;
        description_TH: string | null;
        description_EN: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}

interface ErrorResponse {
    success: boolean;
    error: string;
}


export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest): Promise<Response> {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const staffRoles = await prisma.staffRole.findMany({
                select: {
                    id: true,
                    name: true,
                    description_TH: true,
                    description_EN: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy: {
                    name: 'asc'
                }
            });

            const response: StaffRoleResponse = {
                success: true,
                data: staffRoles
            };

            return addCorsHeaders(
                NextResponse.json(transformDatesToThai(response)),
                req
            );

        } catch (error) {
            console.error("Get staff roles error:", error);
            const errorResponse: ErrorResponse = {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
            return addCorsHeaders(
                NextResponse.json(errorResponse, { status: 500 }),
                req
            );
        }
    });
}


export async function POST(req: NextRequest): Promise<Response> {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const body = await req.json();
            const action = body.action as string | undefined;

            // Validate action
            if (!action) {
                const errorResponse: ErrorResponse = {
                    success: false,
                    error: "Missing required field: action"
                };
                return addCorsHeaders(
                    NextResponse.json(errorResponse, { status: 400 }),
                    req
                );
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
                const errorResponse: ErrorResponse = {
                    success: false,
                    error: "User not found"
                };
                return addCorsHeaders(
                    NextResponse.json(errorResponse, { status: 404 }),
                    req
                );
            }

            const isSupreme = currentUser.role.name === 'SUPREME';
            const adminMajorIds = currentUser.majorAdmins.map(admin => admin.majorCategory_id);

            let result: NextResponse;

            switch (action) {
                case 'cancel_staff':
                    result = await handleCancelStaff(
                        body as CancelStaffRequest,
                        isSupreme,
                        adminMajorIds,
                        req
                    );
                    break;

                case 'update_staff_role':
                    result = await handleUpdateStaffRole(
                        body as UpdateStaffRoleRequest,
                        isSupreme,
                        adminMajorIds,
                        req
                    );
                    break;

                default:
                    const errorResponse: ErrorResponse = {
                        success: false,
                        error: "Invalid action. Use 'cancel_staff' or 'update_staff_role'"
                    };
                    return addCorsHeaders(
                        NextResponse.json(errorResponse, { status: 400 }),
                        req
                    );
            }

            return result;

        } catch (error) {
            console.error("Staff management error:", error);
            const errorResponse: ErrorResponse = {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
            return addCorsHeaders(
                NextResponse.json(errorResponse, { status: 500 }),
                req
            );
        }
    });
}


async function handleCancelStaff(
    body: CancelStaffRequest,
    isSupreme: boolean,
    adminMajorIds: number[],
    req: NextRequest
): Promise<NextResponse> {
    const { eventId, staffIds, reason } = body;

    // Validate required fields
    if (!eventId || !staffIds || staffIds.length === 0) {
        const errorResponse: ErrorResponse = {
            success: false,
            error: "Missing required fields: eventId and staffIds"
        };
        return addCorsHeaders(
            NextResponse.json(errorResponse, { status: 400 }),
            req
        );
    }

    // Check event permissions
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            title_EN: true,
            title_TH: true,
            majorCategory_id: true
        }
    });

    if (!event) {
        const errorResponse: ErrorResponse = {
            success: false,
            error: "Event not found"
        };
        return addCorsHeaders(
            NextResponse.json(errorResponse, { status: 404 }),
            req
        );
    }

    // Check permissions
    if (!isSupreme) {
        if (event.majorCategory_id && !adminMajorIds.includes(event.majorCategory_id)) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: "You don't have permission to manage this event"
            };
            return addCorsHeaders(
                NextResponse.json(errorResponse, { status: 403 }),
                req
            );
        }
    }

    // Process cancellation
    const result = await prisma.$transaction(async (tx) => {
        let cancelledCount = 0;
        const failedStaff: number[] = [];
        const details: Array<{
            staffId: number;
            userId: number;
            userName: string;
            reason?: string;
        }> = [];

        for (const staffId of staffIds) {
            try {
                // Find staff assignment
                const staff = await tx.eventStaff.findUnique({
                    where: { id: staffId },
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

                if (!staff) {
                    failedStaff.push(staffId);
                    continue;
                }

                // Verify staff belongs to the specified event
                if (staff.event_id !== eventId) {
                    failedStaff.push(staffId);
                    continue;
                }

                // Only cancel if status is REGISTERED
                if (staff.status !== 'REGISTERED') {
                    failedStaff.push(staffId);
                    continue;
                }

                // Create cancellation record
                await tx.eventRegistrationCancellation.create({
                    data: {
                        user_id: staff.user_id,
                        event_id: eventId,
                        status: 'CANCELLED',
                        reason: reason || 'Staff cancelled by admin'
                    }
                });

                // Update staff status to CANCELLED
                await tx.eventStaff.update({
                    where: { id: staffId },
                    data: { 
                        status: 'CANCELLED',
                        updatedAt: new Date()
                    }
                });

                // Decrease staff count
                await tx.event.update({
                    where: { id: eventId },
                    data: { currentStaffCount: { decrement: 1 } }
                });

                cancelledCount++;
                details.push({
                    staffId: staff.id,
                    userId: staff.user_id,
                    userName: `${staff.user.firstName} ${staff.user.lastName}`,
                    reason: reason
                });

            } catch (error) {
                console.error(`Failed to cancel staff ${staffId}:`, error);
                failedStaff.push(staffId);
            }
        }

        const response: CancelStaffResponse = {
            success: true,
            message: `Cancelled ${cancelledCount} staff member(s)`,
            data: {
                cancelledCount,
                failedStaff: failedStaff.length > 0 ? failedStaff : undefined,
                details
            }
        };

        return response;
    });

    return addCorsHeaders(
        NextResponse.json(result),
        req
    );
}

async function handleUpdateStaffRole(
    body: UpdateStaffRoleRequest,
    isSupreme: boolean,
    adminMajorIds: number[],
    req: NextRequest
): Promise<NextResponse> {
    const { eventId, staffId, newRoleId } = body;

    // Validate required fields
    if (!eventId || !staffId || !newRoleId) {
        const errorResponse: ErrorResponse = {
            success: false,
            error: "Missing required fields: eventId, staffId, and newRoleId"
        };
        return addCorsHeaders(
            NextResponse.json(errorResponse, { status: 400 }),
            req
        );
    }

    // Check event permissions
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            title_EN: true,
            title_TH: true,
            majorCategory_id: true
        }
    });

    if (!event) {
        const errorResponse: ErrorResponse = {
            success: false,
            error: "Event not found"
        };
        return addCorsHeaders(
            NextResponse.json(errorResponse, { status: 404 }),
            req
        );
    }

    // Check permissions
    if (!isSupreme) {
        if (event.majorCategory_id && !adminMajorIds.includes(event.majorCategory_id)) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: "You don't have permission to manage this event"
            };
            return addCorsHeaders(
                NextResponse.json(errorResponse, { status: 403 }),
                req
            );
        }
    }

    // Verify new role exists
    const newRole = await prisma.staffRole.findUnique({
        where: { id: newRoleId },
        select: {
            id: true,
            name: true,
            description_TH: true,
            description_EN: true
        }
    });

    if (!newRole) {
        const errorResponse: ErrorResponse = {
            success: false,
            error: "New staff role not found"
        };
        return addCorsHeaders(
            NextResponse.json(errorResponse, { status: 404 }),
            req
        );
    }

    // Process role update
    const result = await prisma.$transaction(async (tx) => {
        // Find staff assignment
        const staff = await tx.eventStaff.findUnique({
            where: { id: staffId },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        description_TH: true,
                        description_EN: true
                    }
                }
            }
        });

        if (!staff) {
            throw new Error("Staff assignment not found");
        }

        // Verify staff belongs to the specified event
        if (staff.event_id !== eventId) {
            throw new Error("Staff does not belong to this event");
        }

        // Check if role is already the same
        if (staff.StaffRole_id === newRoleId) {
            throw new Error("Staff already has this role");
        }

        // Update staff role
        await tx.eventStaff.update({
            where: { id: staffId },
            data: {
                StaffRole_id: newRoleId,
                responsibilities_TH: newRole.description_TH,
                responsibilities_EN: newRole.description_EN,
                updatedAt: new Date()
            }
        });

        const response: UpdateStaffRoleResponse = {
            success: true,
            message: "Staff role updated successfully",
            data: {
                staffId: staff.id,
                userId: staff.user_id,
                previousRoleId: staff.StaffRole_id,
                previousRoleName: staff.role.name,
                newRoleId: newRole.id,
                newRoleName_TH: newRole.description_TH || '',
                newRoleName_EN: newRole.description_EN || '',
                eventId: event.id,
                eventTitle: event.title_EN
            }
        };

        return response;
    });

    return addCorsHeaders(
        NextResponse.json(result),
        req
    );
}