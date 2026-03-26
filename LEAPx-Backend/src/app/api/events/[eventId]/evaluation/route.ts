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

            const evaluations = await prisma.eventEvaluation.findMany({
                where: {
                    event_id: eventIdNum,
                    isActive: true
                },
                include: {
                    questions: {
                        orderBy: { questionNumber: 'asc' }
                    },
                    _count: {
                        select: {
                            responses: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            const response = NextResponse.json(transformDatesToThai({
                success: true,
                data: evaluations
            }));

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Get evaluation error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}
