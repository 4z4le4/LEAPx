import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withUserAuth, getUserId } from "@/middleware/auth";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
    
    return withUserAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const { searchParams } = new URL(req.url);
            const queryUserId = searchParams.get("userId"); // Optional: ถ้าต้องการดูของคนอื่น
            const targetUserId = queryUserId ? parseInt(queryUserId) : Number(userId);
            if (queryUserId && Number(userId) !== targetUserId) {
                const user = await prisma.user.findUnique({
                    where: { id: Number(userId) },
                    include: { role: true }
                });

                if (!user || user.role.name !== "SUPREME") {
                    const response = NextResponse.json(
                        { error: "You don't have permission to view other users' admin roles" },
                        { status: 403 }
                    );
                    return addCorsHeaders(response, req);
                }
            }

            const majorAdmins = await prisma.majorAdmin.findMany({
                where: {
                    user_id: targetUserId,
                    isActive: true
                },
                include: {
                    majorCategory: {
                        select: {
                            id: true,
                            code: true,
                            name_TH: true,
                            name_EN: true,
                            faculty_TH: true,
                            faculty_EN: true,
                            icon: true,
                            isActive: true
                        }
                    }
                },
                orderBy: {
                    assignedAt: "desc"
                }
            });

            const formattedData = majorAdmins.map(admin => ({
                id: admin.id,
                role: admin.role, // OWNER หรือ ADMIN
                assignedAt: admin.assignedAt,
                majorCategory: {
                    id: admin.majorCategory.id,
                    code: admin.majorCategory.code,
                    name_TH: admin.majorCategory.name_TH,
                    name_EN: admin.majorCategory.name_EN,
                    faculty_TH: admin.majorCategory.faculty_TH,
                    faculty_EN: admin.majorCategory.faculty_EN,
                    icon: admin.majorCategory.icon
                }
            }));

            const response = NextResponse.json({ 
                success: true,
                userId: targetUserId,
                adminCount: formattedData.length,
                data: formattedData
            });
            
            return addCorsHeaders(response, req);
            
        } catch (error) {
            console.error("Get user major admin roles error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}