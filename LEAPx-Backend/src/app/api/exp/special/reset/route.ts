import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withSkillAdminAuth } from "@/middleware/auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

interface AddSpecialSkillExpRequest {
    user_id: number;
    specialSkill_id: number;
    expChange: number; 
    reason_TH: string;
    reason_EN: string;
    actionType: 'EVENT_REWARD' | 'BONUS' | 'DISCIPLINE_PENALTY' | 'LATE_PENALTY' | 'ABSENCE_PENALTY' | 'MANUAL_ADJUSTMENT' | 'OTHER';
    event_id?: number;
    note?: string;
}

export async function POST(req: NextRequest) {
    return withSkillAdminAuth(req, async (req: NextRequest) => {
        try {
            const data: AddSpecialSkillExpRequest = await req.json();

            // Validate required fields
            if (!data.user_id || !data.specialSkill_id ) {
                const response = NextResponse.json(
                    { error: "Missing required fields: user_id, specialSkill_id" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
                }

            //rest special skill level
            const specialSkillLevel = await prisma.userSpecialSkillLevel.deleteMany({
                where: {
                    user_id: data.user_id,
                    specialSkill_id: data.specialSkill_id,
                },
            });

            if (specialSkillLevel.count === 0) {
                const response = NextResponse.json(
                    { error: "No special skill level record found to reset." },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            const response = NextResponse.json(
                {
                    message: "Special skill experience reset successfully.",
                    user_id: data.user_id,
                    specialSkill_id: data.specialSkill_id,
                }
            );
            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Add special skill experience error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            const response = NextResponse.json(
                { error: errorMessage },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}
