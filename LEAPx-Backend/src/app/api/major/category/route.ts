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
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const code = searchParams.get("code");
        const isActive = searchParams.get("isActive");
        const includeAdmins = searchParams.get("includeAdmins") === "true";
        const includeEvents = searchParams.get("includeEvents") === "true";

        const whereClause: Record<string, unknown> = {};

        if (id) {
            whereClause["id"] = parseInt(id);
        }

        if (code) {
            whereClause["code"] = code;
        }

        if (isActive !== null && isActive !== undefined) {
            whereClause["isActive"] = isActive === "true";
        }

        const includeClause: Record<string, unknown> = {};

        if (includeAdmins) {
            includeClause["admins"] = {
                where: { isActive: true },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            photo: true
                        }
                    }
                },
                orderBy: [
                    { role: "asc" },
                    { assignedAt: "asc" }
                ]
            };
        }

        if (includeEvents) {
            includeClause["events"] = {
                where: { status: "PUBLISHED" },
                select: {
                    id: true,
                    title_TH: true,
                    title_EN: true,
                    status: true,
                    activityStart: true,
                    activityEnd: true
                },
                orderBy: { activityStart: "desc" },
                take: 10
            };
        }

        if (id) {
            const majorCategory = await prisma.majorCategory.findUnique({
                where: { id: parseInt(id) },
                include: Object.keys(includeClause).length > 0 ? includeClause : undefined
            });

            if (!majorCategory) {
                const response = NextResponse.json(
                    { error: "Major category not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            const response = NextResponse.json({
                success: true,
                data: majorCategory
            });
            return addCorsHeaders(response, req);
        }

        const majorCategories = await prisma.majorCategory.findMany({
            where: whereClause,
            include: Object.keys(includeClause).length > 0 ? includeClause : undefined,
            orderBy: [
                { isActive: "desc" },
                { code: "asc" }
            ]
        });

        const response = NextResponse.json({
            success: true,
            total: majorCategories.length,
            data: majorCategories,
        });
        return addCorsHeaders(response, req);
    } catch (error) {
        console.error("Get major categories error:", error);
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
            const {
                code,
                name_TH,
                name_EN,
                faculty_TH,
                faculty_EN,
                description_TH,
                description_EN,
                icon,
                isActive = true,
            } = body;

            // Validation
            if (!code || !name_TH || !name_EN) {
                const response = NextResponse.json(
                    { error: "Missing required fields: code, name_TH, name_EN" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // SUPREME เท่านั้น
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
                const response = NextResponse.json(
                    { error: "Only SUPREME can create major categories" },
                    { status: 403 }
                );
                return addCorsHeaders(response, req);
            }

            const existingMajor = await prisma.majorCategory.findUnique({
                where: { code: code.toUpperCase() }
            });

            if (existingMajor) {
                const response = NextResponse.json(
                    { error: `Major category with code "${code}" already exists` },
                    { status: 409 }
                );
                return addCorsHeaders(response, req);
            }

            const existingNameTH = await prisma.majorCategory.findFirst({
                where: { name_TH }
            });

            if (existingNameTH) {
                const response = NextResponse.json(
                    { error: `Major category with name_TH "${name_TH}" already exists` },
                    { status: 409 }
                );
                return addCorsHeaders(response, req);
            }
            const existingNameEN = await prisma.majorCategory.findFirst({
                where: { name_EN }
            });

            if (existingNameEN) {
                const response = NextResponse.json(
                    { error: `Major category with name_EN "${name_EN}" already exists` },
                    { status: 409 }
                );
                return addCorsHeaders(response, req);
            }

            const majorCategory = await prisma.majorCategory.create({
                data: {
                    code: code.toUpperCase(),
                    name_TH,
                    name_EN,
                    faculty_TH,
                    faculty_EN,
                    description_TH,
                    description_EN,
                    icon,
                    isActive
                }
            });

            // ถ้า assignOwner = true ให้กำหนดผู้สร้างเป็น OWNER
            // if (assignOwner) {
            //     await prisma.majorAdmin.create({
            //         data: {
            //             user_id: Number(userId),
            //             majorCategory_id: majorCategory.id,
            //             role: "OWNER",
            //             assignedBy: Number(userId),
            //             isActive: true
            //         }
            //     });
            // }

            // ดึงข้อมูลพร้อม admins
            const majorCategoryWithAdmins = await prisma.majorCategory.findUnique({
                where: { id: majorCategory.id },
                include: {
                    admins: {
                        where: { isActive: true },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    photo: true
                                }
                            }
                        }
                    }
                }
            });

            const response = NextResponse.json({
                success: true,
                message: "Major category created successfully",
                data: majorCategoryWithAdmins
            }, { status: 201 });

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Create major category error:", error);
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
            const {
                id,
                code,
                name_TH,
                name_EN,
                description_TH,
                description_EN,
                icon,
                isActive
            } = body;

            if (!id) {
                const response = NextResponse.json(
                    { error: "Missing required field: id" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const existingMajor = await prisma.majorCategory.findUnique({
                where: { id }
            });

            if (!existingMajor) {
                const response = NextResponse.json(
                    { error: "Major category not found" },
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
                        majorCategory_id: id,
                        role: "OWNER",
                        isActive: true
                    }
                });

                if (!isOwner) {
                    const response = NextResponse.json(
                        { error: "Only SUPREME or OWNER can update major category" },
                        { status: 403 }
                    );
                    return addCorsHeaders(response, req);
                }
            }

            if (code && code !== existingMajor.code) {
                const duplicateCode = await prisma.majorCategory.findUnique({
                    where: { code: code.toUpperCase() }
                });

                if (duplicateCode) {
                    const response = NextResponse.json(
                        { error: `Major category with code "${code}" already exists` },
                        { status: 409 }
                    );
                    return addCorsHeaders(response, req);
                }
            }

            const updateData: Record<string, unknown> = {};
            if (code !== undefined) updateData.code = code.toUpperCase();
            if (name_TH !== undefined) updateData.name_TH = name_TH;
            if (name_EN !== undefined) updateData.name_EN = name_EN;
            if (description_TH !== undefined) updateData.description_TH = description_TH;
            if (description_EN !== undefined) updateData.description_EN = description_EN;
            if (icon !== undefined) updateData.icon = icon;
            if (isActive !== undefined) updateData.isActive = isActive;
            updateData.updatedAt = new Date();

            const updatedMajor = await prisma.majorCategory.update({
                where: { id },
                data: updateData,
                include: {
                    admins: {
                        where: { isActive: true },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    photo: true
                                }
                            }
                        }
                    }
                }
            });

            const response = NextResponse.json({
                success: true,
                message: "Major category updated successfully",
                data: updatedMajor
            });

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Update major category error:", error);
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
            const idParam = searchParams.get("id");
            const hardDelete = searchParams.get("hardDelete") === "true";

            if (!idParam) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Missing required field: id" }, { status: 400 }),
                    req
                );
            }

            const idNum = parseInt(idParam, 10);
            if (isNaN(idNum)) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Invalid id parameter" }, { status: 400 }),
                    req
                );
            }
            const id = idNum;

            const existingMajor = await prisma.majorCategory.findUnique({
                where: { id: id },
                include: {
                    events: true,
                    admins: { where: { isActive: true } }
                }
            });

            if (!existingMajor) {
                const response = NextResponse.json(
                    { error: "Major category not found" },
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
                const response = NextResponse.json(
                    { error: "Only SUPREME can delete major categories" },
                    { status: 403 }
                );
                return addCorsHeaders(response, req);
            }

            if (existingMajor.events.length > 0 && hardDelete) {
                const response = NextResponse.json(
                    { error: `Cannot hard delete. This major has ${existingMajor.events.length} events. Use soft delete instead.` },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            if (hardDelete) {
                await prisma.majorCategory.delete({
                    where: { id: id }
                });

                const response = NextResponse.json({
                    success: true,
                    message: "Major category deleted permanently (hard deleted)"
                });
                return addCorsHeaders(response, req);
            } else {
                // Soft delete: ตั้ง isActive = false
                await prisma.majorCategory.update({
                    where: { id: id },
                    data: {
                        isActive: false,
                        updatedAt: new Date()
                    }
                });

                const response = NextResponse.json({
                    success: true,
                    message: "Major category deactivated successfully (soft deleted)"
                });
                return addCorsHeaders(response, req);
            }
        } catch (error) {
            console.error("Delete major category error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}