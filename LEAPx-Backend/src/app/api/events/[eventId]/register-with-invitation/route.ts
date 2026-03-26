import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withUserAuth, getUserId } from "@/middleware/auth";
import { transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    const userId = await getUserId(req);
    return withUserAuth(req, async () => {
        try {
        const { eventId: eventIdStr } = await context.params;
        const eventId = parseInt(eventIdStr);
        const body = await req.json();
        const { invitationId } = body;

        if (!invitationId) {
            const response = NextResponse.json(
            { error: "Invitation ID is required" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        const invitation = await prisma.eventInvitation.findUnique({
            where: { id: invitationId }
        });

        if (!invitation || invitation.event_id !== eventId) {
            const response = NextResponse.json(
            { error: "Invitation not found" },
            { status: 404 }
            );
            return addCorsHeaders(response, req);
        }

        if (invitation.status !== "PENDING") {
            const response = NextResponse.json(
            { error: "Invitation is no longer valid" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        const user = await prisma.user.findUnique({
            where: { id: Number(userId) }
        });

        if (!user) {
            const response = NextResponse.json(
            { error: "User not found" },
            { status: 404 }
            );
            return addCorsHeaders(response, req);
        }

        if (user.email !== invitation.email && user.id !== invitation.studentId) {
            const response = NextResponse.json(
            { error: "This invitation is not for you" },
            { status: 403 }
            );
            return addCorsHeaders(response, req);
        }

        const event = await prisma.event.findUnique({
            where: { id: eventId }
        });

        if (!event) {
            const response = NextResponse.json(
            { error: "Event not found" },
            { status: 404 }
            );
            return addCorsHeaders(response, req);
        }

        const existingRegistration = await prisma.eventRegistration.findUnique({
            where: {
            user_id_event_id: {
                user_id: Number(userId),
                event_id: eventId
            }
            }
        });

        if (existingRegistration) {
            const response = NextResponse.json(
            { error: "You have already registered for this event" },
            { status: 409 }
            );
            return addCorsHeaders(response, req);
        }

        const bypassCapacity = true; 

        if (!bypassCapacity && event.currentParticipants >= event.maxParticipants) {
            const response = NextResponse.json(
            { error: "Event has reached maximum number of participants" },
            { status: 403 }
            );
            return addCorsHeaders(response, req);
        }

        const [registration, updatedInvitation, updatedEvent] = await prisma.$transaction([
            prisma.eventRegistration.create({
            data: {
                user_id: Number(userId),
                event_id: eventId,
                status: "PENDING",
                registrationType: "NORMAL"
            }
            }),
            prisma.eventInvitation.update({
            where: { id: invitationId },
            data: {
                status: "REGISTERED",
                registeredAt: new Date(),
                studentId: Number(userId) 
            }
            }),
            // Always update participant counts, even for invited users
            prisma.event.update({
            where: { id: eventId },
            data: { 
                currentParticipants: { increment: 1 },
                invitedParticipants: { increment: 1 }
            }
            })
        ]);

        const response = NextResponse.json(transformDatesToThai({
            success: true,
            message: "Registered successfully with invitation",
            data: {
            registration,
            invitation: updatedInvitation,
            event: {
                currentParticipants: updatedEvent.currentParticipants,
                invitedParticipants: updatedEvent.invitedParticipants
            }
            }
        }), { status: 201 });

        return addCorsHeaders(response, req);
        } catch (error) {
        console.error("Register with invitation error:", error);
        const response = NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
        }
    });
}


export async function GET(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withUserAuth(req, async () => {
        try {
        const { eventId } = await context.params;
        const userId = await getUserId(req);

        const user = await prisma.user.findUnique({
            where: { id: Number(userId) }
        });

        if (!user) {
            const response = NextResponse.json(
            { error: "User not found" },
            { status: 404 }
            );
            return addCorsHeaders(response, req);
        }

        const invitation = await prisma.eventInvitation.findFirst({
            where: {
            event_id: parseInt(eventId),
            OR: [
                { email: user.email },
                { studentId: user.id } 
            ]
            }
        });

        if (!invitation) {
            const response = NextResponse.json(
            { success: true, message: "No invitation found for you", data: null },
            { status: 200 }
            );
            return addCorsHeaders(response, req);
        }

        const response = NextResponse.json(
            transformDatesToThai({ success: true, data: invitation }),
            { status: 200 }
        );
        return addCorsHeaders(response, req);

        } catch (error) {
        console.error("Check my invitation error:", error);
        const response = NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
        }
    });
}