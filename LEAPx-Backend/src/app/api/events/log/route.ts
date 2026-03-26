//!!! ห้ามใช้นอกจากก๋องอนุญาต

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withSkillAdminAuth } from "@/middleware/auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { thaiToUTC, transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

interface CreateRegistrationRequest {
    user_id: number;
    event_id: number;
    status: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    reason?: string;
}

export async function POST(req: NextRequest) {
    return withSkillAdminAuth(req, async (req: NextRequest) => {
        try {
            const data: CreateRegistrationRequest = await req.json();

            // Validate required fields
            if (!data.user_id || !data.event_id || !data.status) {
                const response = NextResponse.json(
                    { 
                        success: false,
                        error: "Missing required fields: user_id, event_id, status" 
                    },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // Validate status
            const validStatuses = [
                'PENDING', 'REGISTERED', 'ATTENDED', 'COMPLETED', 'INCOMPLETE',
                'CANCELLED', 'LATE', 'LATE_PENALTY', 'ABSENT', 'UNDER_REVIEW',
                'NEED_MORE_INFO', 'APPROVED', 'REJECTED'
            ];
            
            if (!validStatuses.includes(data.status)) {
                const response = NextResponse.json(
                    { 
                        success: false,
                        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
                    },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // Check if user exists
            const user = await prisma.user.findUnique({ 
                where: { id: data.user_id },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            });

            if (!user) {
                const response = NextResponse.json(
                    { 
                        success: false,
                        error: `User with ID ${data.user_id} not found` 
                    },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            // Check if event exists
            const event = await prisma.event.findUnique({ 
                where: { id: data.event_id },
                select: {
                    id: true,
                    title_EN: true,
                    title_TH: true,
                    activityStart: true,
                    activityEnd: true
                }
            });

            if (!event) {
                const response = NextResponse.json(
                    { 
                        success: false,
                        error: `Event with ID ${data.event_id} not found` 
                    },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            // Check if registration already exists
            const existingRegistration = await prisma.eventRegistration.findUnique({
                where: {
                    user_id_event_id: {
                        user_id: data.user_id,
                        event_id: data.event_id
                    }
                }
            });

            if (existingRegistration) {
                const response = NextResponse.json(
                    { 
                        success: false,
                        error: "Registration already exists for this user and event",
                        existing: {
                            id: existingRegistration.id,
                            status: existingRegistration.status,
                            createdAt: existingRegistration.createdAt
                        }
                    },
                    { status: 409 }
                );
                return addCorsHeaders(response, req);
            }

            // Parse check-in/out times (frontend sends Thai time → convert to UTC)
            const checkInTime = data.checkInTime ? thaiToUTC(data.checkInTime) : null;
            const checkOutTime = data.checkOutTime ? thaiToUTC(data.checkOutTime) : null;

            // Create registration
            const registration = await prisma.eventRegistration.create({
                data: {
                    user_id: data.user_id,
                    event_id: data.event_id,
                    status: data.status as any,
                    registrationType: "NORMAL",
                    checkedIn: !!checkInTime,
                    checkInTime: checkInTime,
                    checkedOut: !!checkOutTime,
                    checkOutTime: checkOutTime,
                    cancellationReason: data.reason || null,
                    experienceEarned: 0,
                    hasEvaluated: false
                }
            });

            const response = NextResponse.json(transformDatesToThai({
                success: true,
                message: "Registration created successfully",
                data: {
                    registration: {
                        id: registration.id,
                        status: registration.status,
                        createdAt: registration.createdAt
                    },
                    user: {
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email
                    },
                    event: {
                        id: event.id,
                        title_TH: event.title_TH,
                        title_EN: event.title_EN
                    }
                }
            }));
            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Create registration error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            const response = NextResponse.json(
                { 
                    success: false,
                    error: errorMessage 
                },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}

export async function GET(req: NextRequest) {
    return withSkillAdminAuth(req, async (req: NextRequest) => {
        try {
            const { searchParams } = new URL(req.url);
            const userId = searchParams.get('user_id');
            const eventId = searchParams.get('event_id');

            if (!userId && !eventId) {
                const response = NextResponse.json(
                    { 
                        success: false,
                        error: "Please provide user_id or event_id" 
                    },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const where: any = {};
            if (userId) where.user_id = parseInt(userId);
            if (eventId) where.event_id = parseInt(eventId);

            const registrations = await prisma.eventRegistration.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    },
                    event: {
                        select: {
                            id: true,
                            title_TH: true,
                            title_EN: true,
                            activityStart: true,
                            activityEnd: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            const response = NextResponse.json(transformDatesToThai({
                success: true,
                count: registrations.length,
                data: registrations
            }));
            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Get registrations error:", error);
            const response = NextResponse.json(
                { 
                    success: false,
                    error: "Failed to fetch registrations" 
                },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}