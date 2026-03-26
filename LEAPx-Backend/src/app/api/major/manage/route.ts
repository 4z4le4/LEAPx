import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withUserAuth, getUserId } from "@/middleware/auth";
import { ROLE_ID, ROLE_NAME } from '../../../../utils/constants';

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
    return withUserAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const { searchParams } = new URL(req.url);
            const majorCategoryId = searchParams.get("majorCategoryId");

            const user = await prisma.user.findUnique({
                where: { id: Number(userId) },
                include: { role: true }
            });

            if (!user) {
                const response = NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            const whereClause: Record<string, unknown> = { isActive: true };

            if (majorCategoryId) {
                whereClause["majorCategory_id"] = parseInt(majorCategoryId);
                if (user.role.name !== "SUPREME") {
                    const isAdmin = await prisma.majorAdmin.findFirst({
                        where: {
                            user_id: Number(userId),
                            majorCategory_id: parseInt(majorCategoryId),
                            isActive: true
                        }
                    });

                    if (!isAdmin) {
                        const response = NextResponse.json(
                            { error: "You don't have permission to view admins for this major" },
                            { status: 403 }
                        );
                        return addCorsHeaders(response, req);
                    }
                }
            }

            const admins = await prisma.majorAdmin.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            faculty: true,
                            major: true,
                            photo: true
                        }
                    },
                    majorCategory: {
                        select: {
                            id: true,
                            code: true,
                            name_TH: true,
                            name_EN: true
                        }
                    }
                },
                orderBy: [
                    { role: "asc" }, 
                    { assignedAt: "asc" }
                ]
            });

            const response = NextResponse.json({ 
                success: true, 
                data: admins 
            });
            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Get major admins error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}

export async function POST(req: NextRequest) {
    return withUserAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const body = await req.json();
            const { user_id, majorCategoryId, role = "ADMIN" } = body;

            if (!user_id || !majorCategoryId) {
                const response = NextResponse.json(
                    { error: "Missing required fields: user_id, majorCategoryId" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            if (!["OWNER", "ADMIN"].includes(role)) {
                const response = NextResponse.json(
                    { error: "Invalid role. Must be OWNER or ADMIN" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const currentUser = await prisma.user.findUnique({
                where: { id: Number(userId) },
                include: { role: true }
            });

            if (!currentUser) {
                const response = NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            if (currentUser.role.name !== "SUPREME") {
                const isOwner = await prisma.majorAdmin.findFirst({
                    where: {
                        user_id: Number(userId),
                        majorCategory_id: majorCategoryId,
                        role: "OWNER",
                        isActive: true
                    }
                });

                if (!isOwner) {
                    const response = NextResponse.json(
                        { error: "Only SUPREME or OWNER can add new admins" },
                        { status: 403 }
                    );
                    return addCorsHeaders(response, req);
                }
            }

            const majorCategory = await prisma.majorCategory.findUnique({
                where: { id: majorCategoryId }
            });

            if (!majorCategory) {
                const response = NextResponse.json(
                    { error: "Major category not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            const targetUser = await prisma.user.findUnique({
                where: { id: user_id },
                include: { role: true }
            });

            if (!targetUser) {
                const response = NextResponse.json(
                    { error: "Target user not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            const existingAdmin = await prisma.majorAdmin.findUnique({
                where: {
                    user_id_majorCategory_id: {
                        user_id: user_id,
                        majorCategory_id: majorCategoryId
                    }
                }
            });

            let majorAdmin;

            if (existingAdmin) {
                const response = NextResponse.json(
                    { error: "This user is already assigned as admin for the specified major" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            } else {
                majorAdmin = await prisma.majorAdmin.create({
                    data: {
                        user_id: user_id,
                        majorCategory_id: majorCategoryId,
                        role,
                        assignedBy: Number(userId),
                        isActive: true
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        },
                        majorCategory: {
                            select: {
                                id: true,
                                code: true,
                                name_TH: true,
                                name_EN: true
                            }
                        }
                    }
                });

                
                if( targetUser.role.name === ROLE_NAME.USER ){
                    await prisma.user.update({
                        where: { id: user_id },
                        data: {
                            role_id: ROLE_ID.ACTIVITY_ADMIN
                        }
                    });
                }
            }

            const response = NextResponse.json({
                success: true,
                message: "Admin assigned successfully",
                data: majorAdmin
            }, { status: 201 });

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Add major admin error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}

export async function PATCH(req: NextRequest) {
    return withUserAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const body = await req.json();
            const { user_id, role, majorCategoryId } = body;

            if (!user_id) {
                const response = NextResponse.json(
                    { error: "Missing required field: user_id" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            if (!majorCategoryId) {
                const response = NextResponse.json(
                    { error: "Missing required field: majorCategoryId" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            if (role && !["OWNER", "ADMIN"].includes(role)) {
                const response = NextResponse.json(
                    { error: "Invalid role. Must be OWNER or ADMIN" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const existingAdmin = await prisma.majorAdmin.findUnique({
                where: {
                    user_id_majorCategory_id: {
                        user_id: user_id,
                        majorCategory_id: majorCategoryId
                    }
                },
                include: {
                    majorCategory: true
                }
            });

            if (!existingAdmin) {
                const response = NextResponse.json(
                    { error: "Admin record not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            const currentUser = await prisma.user.findUnique({
                where: { id: Number(userId) },
                include: { role: true }
            });

            if (!currentUser) {
                const response = NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            if (currentUser.role.name !== "SUPREME") {
                const isOwner = await prisma.majorAdmin.findFirst({
                    where: {
                        user_id: Number(userId),
                        majorCategory_id: existingAdmin.majorCategory_id,
                        role: "OWNER",
                        isActive: true
                    }
                });

                if (!isOwner) {
                    const response = NextResponse.json(
                        { error: "Only SUPREME or OWNER can modify admin roles" },
                        { status: 403 }
                    );
                    return addCorsHeaders(response, req);
                }

                if (existingAdmin.role === "OWNER" && existingAdmin.user_id !== Number(userId)) {
                    const response = NextResponse.json(
                        { error: "Cannot modify other OWNER's role" },
                        { status: 403 }
                    );
                    return addCorsHeaders(response, req);
                }
            }

            const updateData: Record<string, unknown> = {};
            if (role !== undefined) updateData.role = role;
            // if (isActive !== undefined) updateData.isActive = isActive;
            updateData.updatedAt = new Date();

            const updatedAdmin = await prisma.majorAdmin.update({
                where: { id: existingAdmin.id },
                data: updateData,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    },
                    majorCategory: {
                        select: {
                            id: true,
                            code: true,
                            name_TH: true,
                            name_EN: true
                        }
                    }
                }
            });

            const response = NextResponse.json({
                success: true,
                message: "Admin updated successfully",
                data: updatedAdmin
            });

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Update major admin error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}

export async function DELETE(req: NextRequest) {
    return withUserAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const { searchParams } = new URL(req.url);
            const user_id = searchParams.get("user_id");
            const majorCategoryId = searchParams.get("majorCategoryId");

            if (!user_id) {
                const response = NextResponse.json(
                    { error: "Missing required field: user_id" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            if (!majorCategoryId) {
                const response = NextResponse.json(
                    { error: "Missing required field: majorCategoryId" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const existingAdmin = await prisma.majorAdmin.findUnique({
                where: {
                    user_id_majorCategory_id: {
                        user_id: Number(user_id),
                        majorCategory_id: Number(majorCategoryId)
                    }
                },
                include: {
                    majorCategory: true
                }
            });

            if (!existingAdmin) {
                const response = NextResponse.json(
                    { error: "Admin record not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            if (!existingAdmin) {
                const response = NextResponse.json(
                    { error: "Admin record not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            const currentUser = await prisma.user.findUnique({
                where: { id: Number(userId) },
                include: { role: true }
            });

            if (!currentUser) {
                const response = NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            if (currentUser.role.name !== "SUPREME") {
                const isOwner = await prisma.majorAdmin.findFirst({
                    where: {
                        user_id: Number(userId),
                        majorCategory_id: existingAdmin.majorCategory_id,
                        role: "OWNER",
                        isActive: true
                    }
                });

                if (!isOwner) {
                    const response = NextResponse.json(
                        { error: "Only SUPREME or OWNER can remove admins" },
                        { status: 403 }
                    );
                    return addCorsHeaders(response, req);
                }

                if (existingAdmin.role === "OWNER" && existingAdmin.user_id !== Number(userId)) {
                    const response = NextResponse.json(
                        { error: "Cannot remove other OWNER" },
                        { status: 403 }
                    );
                    return addCorsHeaders(response, req);
                }
            }

            // // ตรวจสอบว่าเป็น OWNER คนสุดท้ายหรือไม่
            // if (existingAdmin.role === "OWNER") {
            //     const ownerCount = await prisma.majorAdmin.count({
            //         where: {
            //             majorCategory_id: existingAdmin.majorCategory_id,
            //             role: "OWNER",
            //             isActive: true
            //         }
            //     });

            //     if (ownerCount <= 1) {
            //         const response = NextResponse.json(
            //             { error: "Cannot remove the last OWNER. Please assign another OWNER first." },
            //             { status: 400 }
            //         );
            //         return addCorsHeaders(response, req);
            //     }
            // }

            // // Soft delete: ตั้ง isActive = false
            // await prisma.majorAdmin.update({
            //     where: { id: existingAdmin.id },
            //     data: {
            //         isActive: false,
            //         updatedAt: new Date()
            //     }
            // });

            // Hard delete
            await prisma.majorAdmin.delete({
                where: { id: existingAdmin.id }
            });

            if( currentUser.role.name === ROLE_NAME.ACTIVITY_ADMIN ){
            await prisma.user.update({
                where: { id: Number(user_id) },
                data: {
                    role_id: ROLE_ID.USER
                }
            });
            }

            const response = NextResponse.json({
                success: true,
                message: "Removed successfully"
            });

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Delete major admin error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}