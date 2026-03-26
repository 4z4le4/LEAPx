import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, withUserAuth } from "@/middleware/auth";
import { 
    CreateIconRequest, 
    UpdateIconRequest, 
    GetIconsParams 
} from "@/types/IconType";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
    return withUserAuth(req, async (req: NextRequest) => {
    try {
        const { searchParams } = new URL(req.url);
        
        const params: GetIconsParams = {
        search: searchParams.get('search') || undefined,
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '50'),
        sortBy: (searchParams.get('sortBy') as GetIconsParams['sortBy']) || 'name',
        sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
        };

        const whereClause: Record<string, unknown> = {};
        
        if (params.search) {
        whereClause.OR = [
            { name: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
        ];
        }

        const skip = ((params.page || 1) - 1) * (params.limit || 50);
        const take = params.limit || 50;
        const totalCount = await prisma.icon.count({ where: whereClause });

        const icons = await prisma.icon.findMany({
        where: whereClause,
        orderBy: { [params.sortBy || 'name']: params.sortOrder || 'asc' },
        skip,
        take,
        });

        const response = NextResponse.json({
        success: true,
        data: icons,
        pagination: {
            total: totalCount,
            page: params.page || 1,
            limit: params.limit || 50,
            totalPages: Math.ceil(totalCount / (params.limit || 50)),
        }
        });
        return addCorsHeaders(response, req);

    } catch (error) {
        console.error("Get icons error:", error);
        const response = NextResponse.json(
        { 
            success: false,
            error: "Failed to fetch icons" 
        },
        { status: 500 }
        );
        return addCorsHeaders(response, req);
    }
    });
}

export async function POST(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
    try {
        const body: CreateIconRequest = await req.json();

        if (!body.name) {
        const response = NextResponse.json(
            { 
            success: false,
            error: "Missing required field: name" 
            },
            { status: 400 }
        );
        return addCorsHeaders(response, req);
        }

        const existingIcon = await prisma.icon.findUnique({
        where: { name: body.name }
        });

        if (existingIcon) {
        const response = NextResponse.json(
            { 
            success: false,
            error: "Icon name already exists" 
            },
            { status: 409 }
        );
        return addCorsHeaders(response, req);
        }

        const url = body.url || `https://lucide.dev/icons/${body.name.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '')}`;

        const icon = await prisma.icon.create({
        data: {
            name: body.name,
            url,
            description: body.description || null,
        }
        });

        const response = NextResponse.json({
        success: true,
        message: "Icon created successfully",
        data: icon
        }, { status: 201 });
        return addCorsHeaders(response, req);

    } catch (error) {
        console.error("Create icon error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const response = NextResponse.json(
        { 
            success: false,
            error: errorMessage 
        },
        { status: 500 }
        );
        return addCorsHeaders(response, req);
    }
    });
}

export async function PUT(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
    try {
        const body: UpdateIconRequest = await req.json();

        if (!body.id) {
        const response = NextResponse.json(
            { 
            success: false,
            error: "Missing required field: id" 
            },
            { status: 400 }
        );
        return addCorsHeaders(response, req);
        }

        const existing = await prisma.icon.findUnique({
        where: { id: body.id }
        });

        if (!existing) {
        const response = NextResponse.json(
            { 
            success: false,
            error: "Icon not found" 
            },
            { status: 404 }
        );
        return addCorsHeaders(response, req);
        }

        if (body.name && body.name !== existing.name) {
        const existingName = await prisma.icon.findUnique({
            where: { name: body.name }
        });

        if (existingName) {
            const response = NextResponse.json(
            { 
                success: false,
                error: "Icon name already exists" 
            },
            { status: 409 }
            );
            return addCorsHeaders(response, req);
        }
        }

        const updateData: Record<string, unknown> = {};
        
        if (body.name !== undefined) updateData.name = body.name;
        if (body.url !== undefined) updateData.url = body.url;
        if (body.description !== undefined) updateData.description = body.description;

        const updated = await prisma.icon.update({
        where: { id: body.id },
        data: updateData,
        });

        const response = NextResponse.json({
        success: true,
        message: "Icon updated successfully",
        data: updated
        });
        return addCorsHeaders(response, req);

    } catch (error) {
        console.error("Update icon error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const response = NextResponse.json(
        { 
            success: false,
            error: errorMessage 
        },
        { status: 500 }
        );
        return addCorsHeaders(response, req);
    }
    });
}

export async function DELETE(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
        const response = NextResponse.json(
            { 
            success: false,
            error: "Missing required parameter: id" 
            },
            { status: 400 }
        );
        return addCorsHeaders(response, req);
        }

        const iconId = parseInt(id);

        const existing = await prisma.icon.findUnique({
        where: { id: iconId }
        });

        if (!existing) {
        const response = NextResponse.json(
            { 
            success: false,
            error: "Icon not found" 
            },
            { status: 404 }
        );
        return addCorsHeaders(response, req);
        }

        await prisma.icon.delete({
        where: { id: iconId }
        });

        const response = NextResponse.json({
        success: true,
        message: "Icon deleted successfully",
        data: {
            id: iconId,
            name: existing.name
        }
        });
        return addCorsHeaders(response, req);

    } catch (error) {
        console.error("Delete icon error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const response = NextResponse.json(
        { 
            success: false,
            error: errorMessage 
        },
        { status: 500 }
        );
        return addCorsHeaders(response, req);
    }
    });
}