import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withUserAuth, getUserId } from "@/middleware/auth";
import { transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
    return withUserAuth(req, async () => {
        try {
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

        const invitations = await prisma.eventInvitation.findMany({
            where: {
            OR: [
                { email: user.email },
                { studentId: user.id }
            ]
            },
            orderBy: { invitedAt: "desc" },
            include: {
            event: true 
            }
        });

        const response = NextResponse.json(
            transformDatesToThai({ success: true, data: invitations }),
            { status: 200 }
        );
        return addCorsHeaders(response, req);

        } catch (error) {
        console.error("Check my invitations error:", error);
        const response = NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
        }
    });
}
