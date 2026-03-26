import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth } from "@/middleware/auth";
import { transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
        const eventId = parseInt((await context.params).eventId);
        const { searchParams } = new URL(req.url);

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const status = searchParams.get('status') || undefined;
        const search = searchParams.get('search') || undefined;
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

        if (isNaN(eventId)) {
            const response = NextResponse.json(
            { error: "Invalid event ID" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: {
            id: true,
            title_EN: true,
            title_TH: true,
            slug: true,
            maxParticipants: true,
            currentParticipants: true,
            maxStaffCount: true,
            currentStaffCount: true,
            registrationStart: true,
            registrationEnd: true,
            activityStart: true,
            activityEnd: true,
            status: true,
            }
        });

        if (!event) {
            const response = NextResponse.json(
            { error: "Event not found" },
            { status: 404 }
            );
            return addCorsHeaders(response, req);
        }

        const whereClause: Record<string, unknown> = {
            event_id: eventId,
        };

        if (status) {
            whereClause.status = status;
        }

        if (search) {
            whereClause.user = {
            OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { id: isNaN(parseInt(search)) ? undefined : parseInt(search) }
            ].filter(condition => condition.id !== undefined || Object.keys(condition).length > 0)
            };
        }

        const totalRegistrations = await prisma.eventRegistration.count({
            where: whereClause
        });

        const statusBreakdown = await prisma.eventRegistration.groupBy({
            by: ['status'],
            where: { event_id: eventId },
            _count: { status: true }
        });

        const registrationTypeBreakdown = await prisma.eventRegistration.groupBy({
            by: ['registrationType'],
            where: { event_id: eventId },
            _count: { registrationType: true }
        });

        // const checkInStats = await prisma.eventRegistration.aggregate({
        //     where: { event_id: eventId },
        //     _count: {
        //     checkedIn: true,
        //     checkedOut: true,
        //     }
        // });

        const checkedInCount = await prisma.eventRegistration.count({
            where: {
            event_id: eventId,
            checkedIn: true
            }
        });

        const checkedOutCount = await prisma.eventRegistration.count({
            where: {
            event_id: eventId,
            checkedOut: true
            }
        });

        const registrations = await prisma.eventRegistration.findMany({
            where: whereClause,
            select: {
            id: true,
            user_id: true,
            status: true,
            registrationType: true,
            checkedIn: true,
            checkInTime: true,
            checkedOut: true,
            checkOutTime: true,
            experienceEarned: true,
            hasEvaluated: true,
            cancellationReason: true,
            cancelledAt: true,
            createdAt: true,
            updatedAt: true,
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
            orderBy: { [sortBy]: sortOrder },
            skip,
            take: limit,
        });

        const expStats = await prisma.eventRegistration.aggregate({
            where: { event_id: eventId },
            _sum: { experienceEarned: true },
            _avg: { experienceEarned: true },
            _max: { experienceEarned: true },
            _min: { experienceEarned: true },
        });

        // const evaluationStats = await prisma.eventRegistration.aggregate({
        //     where: { event_id: eventId },
        //     _count: { hasEvaluated: true }
        // });

        const evaluatedCount = await prisma.eventRegistration.count({
            where: {
            event_id: eventId,
            hasEvaluated: true
            }
        });

        const summary = {
            event: {
            id: event.id,
            title_EN: event.title_EN,
            title_TH: event.title_TH,
            slug: event.slug,
            status: event.status,
            capacity: {
                maxParticipants: event.maxParticipants,
                currentParticipants: event.currentParticipants,
                availableSlots: Math.max(0, event.maxParticipants - event.currentParticipants),
                utilizationRate: event.maxParticipants > 0 
                ? ((event.currentParticipants / event.maxParticipants) * 100).toFixed(2) + '%'
                : '0%'
            },
            staff: {
                maxStaffCount: event.maxStaffCount,
                currentStaffCount: event.currentStaffCount,
                availableSlots: Math.max(0, event.maxStaffCount - event.currentStaffCount),
            },
            timeline: {
                registrationStart: event.registrationStart,
                registrationEnd: event.registrationEnd,
                activityStart: event.activityStart,
                activityEnd: event.activityEnd,
            }
            },
            statistics: {
            total: totalRegistrations,
            byStatus: statusBreakdown.reduce((acc, item) => {
                acc[item.status] = item._count.status;
                return acc;
            }, {} as Record<string, number>),
            byRegistrationType: registrationTypeBreakdown.reduce((acc, item) => {
                acc[item.registrationType] = item._count.registrationType;
                return acc;
            }, {} as Record<string, number>),
            checkIn: {
                checkedIn: checkedInCount,
                checkedOut: checkedOutCount,
                notCheckedIn: totalRegistrations - checkedInCount,
                checkInRate: totalRegistrations > 0 
                ? ((checkedInCount / totalRegistrations) * 100).toFixed(2) + '%'
                : '0%',
                checkOutRate: checkedInCount > 0
                ? ((checkedOutCount / checkedInCount) * 100).toFixed(2) + '%'
                : '0%'
            },
            experience: {
                totalEarned: expStats._sum.experienceEarned || 0,
                averageEarned: expStats._avg.experienceEarned 
                ? parseFloat(expStats._avg.experienceEarned.toFixed(2))
                : 0,
                maxEarned: expStats._max.experienceEarned || 0,
                minEarned: expStats._min.experienceEarned || 0,
            },
            evaluation: {
                completed: evaluatedCount,
                notCompleted: totalRegistrations - evaluatedCount,
                completionRate: totalRegistrations > 0
                ? ((evaluatedCount / totalRegistrations) * 100).toFixed(2) + '%'
                : '0%'
            }
            },
            registrations: registrations,
            pagination: {
            total: totalRegistrations,
            page,
            limit,
            totalPages: Math.ceil(totalRegistrations / limit),
            hasMore: page * limit < totalRegistrations
            }
        };

        const response = NextResponse.json(transformDatesToThai({
            success: true,
            data: summary
        }));
        return addCorsHeaders(response, req);

        } catch (error) {
        console.error("Get event registrations summary error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const response = NextResponse.json(
            { error: "Failed to fetch event registrations summary", details: errorMessage },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
        }
    });
}