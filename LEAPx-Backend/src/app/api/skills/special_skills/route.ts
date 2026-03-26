import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withUserAuth , withSkillAdminAuth } from "@/middleware/auth";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
    return withUserAuth(req, async (req: NextRequest) => {
        try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const category = searchParams.get("category");
        const isActive = searchParams.get("isActive");
        const includeInactive = searchParams.get("includeInactive");

        if (id) {
            const specialSkill = await prisma.specialSkill.findUnique({
            where: { id: parseInt(id) },
            include: {
                _count: {
                select: {
                    userSpecialSkillLevels: true,
                    specialSkillHistory: true,
                    eventSpecialSkillRewards: true,
                },
                },
            },
            });

            if (!specialSkill) {
            const response = NextResponse.json(
                { error: "Special skill not found" },
                { status: 404 }
            );
            return addCorsHeaders(response, req);
            }

            const response = NextResponse.json({
            success: true,
            data: specialSkill,
            });
            return addCorsHeaders(response, req);
        }

        const whereClause: Record<string, unknown> = {};

        if (category) {
            whereClause.category = category;
        }

        if (isActive !== null && includeInactive !== "true") {
            whereClause.isActive = isActive === "true";
        }

        const specialSkills = await prisma.specialSkill.findMany({
            where: whereClause,
            include: {
            _count: {
                select: {
                userSpecialSkillLevels: true,
                specialSkillHistory: true,
                eventSpecialSkillRewards: true,
                },
            },
            },
            orderBy: [
            { category: "asc" },
            { sortOrder: "desc" },
            { id: "asc" },
            ],
        });

        const response = NextResponse.json({
            success: true,
            data: specialSkills,
            count: specialSkills.length,
        });
        return addCorsHeaders(response, req);
        } catch (error) {
        console.error("Get special skills error:", error);
        const response = NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
        }
    });
}

export async function POST(req: NextRequest) {
    return withSkillAdminAuth(req, async (req: NextRequest) => {
        try {
        const body = await req.json();

        if (!body.name_TH || !body.name_EN || !body.slug) {
            const response = NextResponse.json(
            { error: "Missing required fields: name_TH, name_EN, and slug" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        const existingSkill = await prisma.specialSkill.findUnique({
            where: { slug: body.slug },
        });

        if (existingSkill) {
            const response = NextResponse.json(
            { error: "A special skill with this slug already exists" },
            { status: 409 }
            );
            return addCorsHeaders(response, req);
        }

        const specialSkill = await prisma.specialSkill.create({
            data: {
            name_TH: body.name_TH,
            name_EN: body.name_EN,
            slug: body.slug,
            description_TH: body.description_TH || null,
            description_EN: body.description_EN || null,
            icon: body.icon || null,
            category: body.category || "DISCIPLINE",
            sortOrder: body.sortOrder || 0,
            isActive: body.isActive !== undefined ? body.isActive : true,
            },
        });

        const response = NextResponse.json(
            {
            success: true,
            message: "Special skill created successfully",
            data: specialSkill,
            },
            { status: 201 }
        );
        return addCorsHeaders(response, req);
        } catch (error) {
        console.error("Create special skill error:", error);
        const response = NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
        }
    });
}

export async function PUT(req: NextRequest) {
    return withSkillAdminAuth(req, async (req: NextRequest) => {
        try {
        const body = await req.json();

        if (!body.id) {
            const response = NextResponse.json(
            { error: "Missing required field: id" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        const existingSkill = await prisma.specialSkill.findUnique({
            where: { id: body.id },
        });

        if (!existingSkill) {
            const response = NextResponse.json(
            { error: "Special skill not found" },
            { status: 404 }
            );
            return addCorsHeaders(response, req);
        }

        if (body.slug && body.slug !== existingSkill.slug) {
            const slugExists = await prisma.specialSkill.findUnique({
            where: { slug: body.slug },
            });

            if (slugExists) {
            const response = NextResponse.json(
                { error: "A special skill with this slug already exists" },
                { status: 409 }
            );
            return addCorsHeaders(response, req);
            }
        }

        const updatedSkill = await prisma.specialSkill.update({
            where: { id: body.id },
            data: {
            name_TH: body.name_TH,
            name_EN: body.name_EN,
            slug: body.slug,
            description_TH: body.description_TH,
            description_EN: body.description_EN,
            icon: body.icon,
            category: body.category,
            sortOrder: body.sortOrder,
            isActive: body.isActive,
            },
        });

        const response = NextResponse.json({
            success: true,
            message: "Special skill updated successfully",
            data: updatedSkill,
        });
        return addCorsHeaders(response, req);
        } catch (error) {
        console.error("Update special skill error:", error);
        const response = NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
        }
    });
}

export async function DELETE(req: NextRequest) {
    return withSkillAdminAuth(req, async (req: NextRequest) => {
        try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const hardDelete = searchParams.get("hardDelete") === "true";

        if (!id) {
            const response = NextResponse.json(
            { error: "Missing required parameter: id" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        const existingSkill = await prisma.specialSkill.findUnique({
            where: { id: parseInt(id) },
            include: {
            _count: {
                select: {
                userSpecialSkillLevels: true,
                specialSkillHistory: true,
                eventSpecialSkillRewards: true,
                },
            },
            },
        });

        if (!existingSkill) {
            const response = NextResponse.json(
            { error: "Special skill not found" },
            { status: 404 }
            );
            return addCorsHeaders(response, req);
        }

        const isBeingUsed =
            existingSkill._count.userSpecialSkillLevels > 0 ||
            existingSkill._count.specialSkillHistory > 0 ||
            existingSkill._count.eventSpecialSkillRewards > 0;

        if (isBeingUsed && hardDelete) {
            const response = NextResponse.json(
            {
                error:
                "Cannot hard delete special skill that is being used. Use soft delete instead.",
                details: {
                userLevels: existingSkill._count.userSpecialSkillLevels,
                history: existingSkill._count.specialSkillHistory,
                eventRewards: existingSkill._count.eventSpecialSkillRewards,
                },
            },
            { status: 409 }
            );
            return addCorsHeaders(response, req);
        }

        if (hardDelete && !isBeingUsed) {
            // Hard delete
            await prisma.specialSkill.delete({
            where: { id: parseInt(id) },
            });

            const response = NextResponse.json({
            success: true,
            message: "Special skill permanently deleted",
            });
            return addCorsHeaders(response, req);
        } else {
            // Soft delete
            const updatedSkill = await prisma.specialSkill.update({
            where: { id: parseInt(id) },
            data: { isActive: false },
            });

            const response = NextResponse.json({
            success: true,
            message: "Special skill deactivated",
            data: updatedSkill,
            });
            return addCorsHeaders(response, req);
        }
        } catch (error) {
        console.error("Delete special skill error:", error);
        const response = NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
        }
    });
}