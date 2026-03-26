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
    return withActivityAdminAuth(req, async () => {
        try {
            const { eventId } = await context.params;
            const eventIdNum = parseInt(eventId);

            const { searchParams } = new URL(req.url);
            const status = searchParams.get("status");

            const event = await prisma.event.findUnique({
                where: { id: eventIdNum }
            });

            if (!event) {
                const response = NextResponse.json(
                    { error: "Event not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            const whereClause: Record<string, unknown> = { event_id: eventIdNum };
            if (status) {
                whereClause.status = status;
            }

            const invitations = await prisma.eventInvitation.findMany({
                where: whereClause,
                orderBy: { invitedAt: "desc" }
            });

            const invitationsWithUserStatus = await Promise.all(
                invitations.map(async (invitation) => {
                    let isExistingUser = false;

                    if (invitation.studentId) {
                        const user = await prisma.user.findUnique({
                            where: { id: invitation.studentId }
                        });
                        isExistingUser = !!user;
                    } else {
                        const user = await prisma.user.findUnique({
                            where: { email: invitation.email }
                        });
                        isExistingUser = !!user;
                    }

                    return {
                        id: invitation.id,
                        email: invitation.email,
                        firstName: invitation.firstName,
                        lastName: invitation.lastName,
                        studentId: invitation.studentId,
                        status: invitation.status,
                        invitedAt: invitation.invitedAt,
                        registeredAt: invitation.registeredAt,
                        note: invitation.note,
                        isExistingUser
                    };
                })
            );

            const summary = {
                total: invitations.length,
                pending: invitations.filter(i => i.status === "PENDING").length,
                registered: invitations.filter(i => i.status === "REGISTERED").length,
                expired: invitations.filter(i => i.status === "EXPIRED").length,
                cancelled: invitations.filter(i => i.status === "CANCELLED").length
            };

            const response = NextResponse.json(transformDatesToThai({
                success: true,
                data: {
                    invitations: invitationsWithUserStatus,
                    summary
                }
            }));

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Get invitations error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withActivityAdminAuth(req, async () => {
        try {
            const { eventId } = await context.params;
            const eventIdNum = parseInt(eventId);

            const { searchParams } = new URL(req.url);
            const invitationId = searchParams.get("invitationId");
            const all_cancel = searchParams.get("all_cancel");

            if (!invitationId) {
                const response = NextResponse.json(
                    { error: "Invitation ID is required" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const invitation = await prisma.eventInvitation.findUnique({
                where: { id: parseInt(invitationId) }
            });

            if (all_cancel === "true") {
                await prisma.eventInvitation.updateMany({
                    where: { event_id: eventIdNum, status: 'PENDING' },
                    data: { status: "CANCELLED" }
                });
            }

            if (!invitation || invitation.event_id !== eventIdNum) {
                const response = NextResponse.json(
                    { error: "Invitation not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            await prisma.eventInvitation.update({
                where: { id: parseInt(invitationId) },
                data: { status: "CANCELLED" }
            });

            const response = NextResponse.json({
                success: true,
                message: "Invitation cancelled successfully"
            });

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Cancel invitation error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}
