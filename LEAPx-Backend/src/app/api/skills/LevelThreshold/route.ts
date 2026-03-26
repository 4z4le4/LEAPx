import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth } from "@/middleware/auth";
import { levelType } from "@prisma/client";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(
    req: NextRequest,
) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {

            const LevelThresholds = await prisma.levelThreshold.findMany({
                select: {
                    id: true,
                    levelType: true,
                    expRequired: true,
                    levelName_TH: true,
                    levelName_EN: true
                }
            });

            return addCorsHeaders(
                NextResponse.json({
                    success: true,
                    levelTypes: levelType,
                    data: {
                        levelThresholds: LevelThresholds
                    }
                }),
                req
            );

        } catch (error) {
            console.error("Failed to fetch level thresholds:", error);
            return addCorsHeaders(
                NextResponse.json({ error: "Failed to fetch level thresholds" }, { status: 500 }),
                req
            );
        }
    });
}

