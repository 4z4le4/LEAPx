import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, getUserId } from "@/middleware/auth";
import { transformDatesToThai } from "@/utils/timezone";

interface RegisteredStaffResponse {
    success: boolean;
    data?: {
        eventId: number;
        eventTitle: string;
        totalStaff: number;
        staff: Array<{
            id: number;
            userId: number;
            firstName: string;
            lastName: string;
            email: string;
            faculty: string;
            major: string | null;
            phone: string | null;
            photo: string | null;
            roleId: number;
            roleName: string;
            roleDescription_TH: string | null;
            roleDescription_EN: string | null;
            responsibilities_TH: string | null;
            responsibilities_EN: string | null;
            status: string;
            assignedAt: Date;
            assignedBy: string | null;
            checkedIn: boolean;
            checkInTime: Date | null;
            checkedOut: boolean;
            checkOutTime: Date | null;
        }>;
    };
    error?: string;
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
    return handleCorsPreFlight(req);
}

// GET /api/staff/registered?eventId=123
export async function GET(req: NextRequest): Promise<Response> {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const { searchParams } = new URL(req.url);
            const eventId = searchParams.get('eventId');

            // Validate eventId
            if (!eventId) {
                const errorResponse: RegisteredStaffResponse = {
                    success: false,
                    error: "Missing required parameter: eventId"
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
                const errorResponse: RegisteredStaffResponse = {
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

            // Check event permissions
            const event = await prisma.event.findUnique({
                where: { id: Number(eventId) },
                select: {
                    id: true,
                    title_EN: true,
                    title_TH: true,
                    majorCategory_id: true,
                    created_by: true
                }
            });

            if (!event) {
                const errorResponse: RegisteredStaffResponse = {
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
                // Check if user is event creator
                const isCreator = event.created_by === Number(userId);
                
                // Check if user is major admin for this event
                const isMajorAdmin = event.majorCategory_id && 
                    adminMajorIds.includes(event.majorCategory_id);

                if (!isCreator && !isMajorAdmin) {
                    const errorResponse: RegisteredStaffResponse = {
                        success: false,
                        error: "You don't have permission to view this event's staff"
                    };
                    return addCorsHeaders(
                        NextResponse.json(errorResponse, { status: 403 }),
                        req
                    );
                }
            }

            // Get registered staff
            const registeredStaff = await prisma.eventStaff.findMany({
                where: {
                    event_id: Number(eventId),
                    status: 'REGISTERED'
                },
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
                            photo: true
                        }
                    },
                    role: {
                        select: {
                            id: true,
                            name: true,
                            description_TH: true,
                            description_EN: true
                        }
                    }
                },
                orderBy: [
                    { assignedAt: 'desc' }
                ]
            });

            // Format response
            const formattedStaff = registeredStaff.map(staff => ({
                id: staff.id,
                userId: staff.user.id,
                firstName: staff.user.firstName,
                lastName: staff.user.lastName,
                email: staff.user.email,
                faculty: staff.user.faculty,
                major: staff.user.major,
                phone: staff.user.phone,
                photo: staff.user.photo,
                roleId: staff.role.id,
                roleName: staff.role.name,
                roleDescription_TH: staff.role.description_TH,
                roleDescription_EN: staff.role.description_EN,
                responsibilities_TH: staff.responsibilities_TH,
                responsibilities_EN: staff.responsibilities_EN,
                status: staff.status,
                assignedAt: staff.assignedAt,
                assignedBy: staff.assignedBy,
                checkedIn: staff.checkedIn,
                checkInTime: staff.checkInTime,
                checkedOut: staff.checkedOut,
                checkOutTime: staff.checkOutTime
            }));

            const response: RegisteredStaffResponse = {
                success: true,
                data: {
                    eventId: event.id,
                    eventTitle: event.title_EN,
                    totalStaff: formattedStaff.length,
                    staff: formattedStaff
                }
            };

            return addCorsHeaders(
                NextResponse.json(transformDatesToThai(response)),
                req
            );

        } catch (error) {
            console.error("Get registered staff error:", error);
            const errorResponse: RegisteredStaffResponse = {
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