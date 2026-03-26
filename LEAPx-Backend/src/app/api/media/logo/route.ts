import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, withUserAuth, getUserId } from "@/middleware/auth";
import { uploadImage, deleteImage } from "@/lib/cloudinary";
import { transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
    return withUserAuth(req, async (req: NextRequest) => {
        try {
            const { searchParams } = new URL(req.url);
            const mode = searchParams.get('mode'); // 'display' หรือ 'manage'
            const isActive = searchParams.get('isActive');

            const whereClause: Record<string, unknown> = {};
            
            // Mode: display = เฉพาะที่ active, manage = ทั้งหมด
            if (mode === 'display') {
                whereClause.isActive = true;
            } else if (isActive !== null) {
                whereClause.isActive = isActive === 'true';
            }

            const logos = await prisma.leapLogo.findMany({
                where: whereClause,
                include: {
                    cloudinaryImage: {
                        select: {
                            id: true,
                            url: true,
                            secureUrl: true,
                            width: true,
                            height: true,
                            format: true,
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc' // ใหม่กว่าขึ้นก่อน
                }
            });

            // Response แบบย่อสำหรับ display mode (เฉพาะ URL)
            if (mode === 'display') {
                // ส่งเฉพาะโลโก้ที่ active อันแรก (ถ้ามี)
                const activeLogo = logos[0];
                
                if (!activeLogo) {
                    const response = NextResponse.json({
                        success: true,
                        data: null,
                        message: "No active logo found"
                    });
                    return addCorsHeaders(response, req);
                }

                const response = NextResponse.json({
                    success: true,
                    data: {
                        id: activeLogo.id,
                        url: activeLogo.cloudinaryImage.secureUrl,
                    }
                });
                return addCorsHeaders(response, req);
            }

            // Response แบบเต็มสำหรับ manage mode
            const response = NextResponse.json(transformDatesToThai({
                success: true,
                data: logos
            }));
            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Get logos error:", error);
            const response = NextResponse.json(
                { error: "Failed to fetch logos" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}

export async function POST(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const formData = await req.formData();

            
            const file = formData.get('image') as File | null;
            const name_TH = formData.get('name_TH') as string | null;
            const name_EN = formData.get('name_EN') as string | null;
            const isActive = formData.get('isActive') === 'true'; // default = false (ไม่แสดง)

            // Validate image
            if (!file || file.size === 0) {
                const response = NextResponse.json(
                    { error: "Image file is required" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            if (!file.type.startsWith('image/')) {
                const response = NextResponse.json(
                    { error: "File must be an image" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // Upload image to Cloudinary
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 8);
            const publicId = `logo-${timestamp}-${randomStr}`;

            const uploadResult = await uploadImage(file, {
                folder: 'logos',
                tags: ['logo', 'website'],
                uploadedBy: Number(userId),
                publicId: publicId,
            });

            const logo = await prisma.$transaction(async (tx) => {
                if (isActive) {
                    await tx.leapLogo.updateMany({
                        data: { isActive: false }
                    });
                }

                const newLogo = await tx.leapLogo.create({
                    data: {
                        cloudinaryImage_id: uploadResult.cloudinaryImage.id,
                        name_TH: name_TH || '',
                        name_EN: name_EN || '',
                        isActive,
                    },
                    include: {
                        cloudinaryImage: {
                            select: {
                                id: true,
                                url: true,
                                secureUrl: true,
                                width: true,
                                height: true,
                                format: true,
                            }
                        }
                    }
                });

                return newLogo;
            });

            const response = NextResponse.json({
                success: true,
                message: isActive 
                    ? "Logo uploaded and set as active" 
                    : "Logo uploaded successfully (inactive by default)",
                data: logo
            }, { status: 201 });
            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Create logo error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            const response = NextResponse.json(
                { error: errorMessage },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}

export async function PUT(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const contentType = req.headers.get('content-type') || '';
            const isFormData = contentType.includes('multipart/form-data');

            let logoId: number;
            const updateData: Record<string, unknown> = {};
            let newImageFile: File | null = null;

            if (isFormData) {
                const formData = await req.formData();
                
                const idParam = formData.get('id');
                if (!idParam) {
                    return addCorsHeaders(
                        NextResponse.json({ error: "Missing required field: id" }, { status: 400 }),
                        req
                    );
                }
                logoId = parseInt(idParam as string);

                // Parse update fields
                if (formData.get('isActive') !== null) {
                    updateData.isActive = formData.get('isActive') === 'true';
                }

                // Check for new image
                const file = formData.get('image') as File | null;
                if (file && file.size > 0) {
                    if (!file.type.startsWith('image/')) {
                        return addCorsHeaders(
                            NextResponse.json({ error: "File must be an image" }, { status: 400 }),
                            req
                        );
                    }
                    newImageFile = file;
                }
            } else {
                const body = await req.json();
                logoId = body.id;
                
                if (body.isActive !== undefined) updateData.isActive = body.isActive;
            }

            if (!logoId) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Missing required field: id" }, { status: 400 }),
                    req
                );
            }

            // Check if logo exists
            const existing = await prisma.leapLogo.findUnique({
                where: { id: logoId },
                include: {
                    cloudinaryImage: true
                }
            });

            if (!existing) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Logo not found" }, { status: 404 }),
                    req
                );
            }

            // Update in transaction
            const updated = await prisma.$transaction(async (tx) => {
                let cloudinaryImageId = existing.cloudinaryImage_id;

                // Upload new image if provided
                if (newImageFile) {
                    const timestamp = Date.now();
                    const randomStr = Math.random().toString(36).substring(2, 8);
                    const publicId = `logo-${timestamp}-${randomStr}`;

                    const uploadResult = await uploadImage(newImageFile, {
                        folder: 'logos',
                        tags: ['logo', 'website'],
                        uploadedBy: Number(userId),
                        publicId: publicId,
                    });

                    cloudinaryImageId = uploadResult.cloudinaryImage.id;
                    updateData.cloudinaryImage_id = cloudinaryImageId;

                    // Delete old image from Cloudinary
                    try {
                        await deleteImage(existing.cloudinaryImage.publicId);
                        await tx.cloudinaryImage.delete({
                            where: { id: existing.cloudinaryImage_id }
                        });
                    } catch (error) {
                        console.error('Failed to delete old image:', error);
                    }
                }

                // If setting as active, deactivate all other logos
                if (updateData.isActive === true) {
                    await tx.leapLogo.updateMany({
                        where: { id: { not: logoId } },
                        data: { isActive: false }
                    });
                }

                // Update logo
                const updatedLogo = await tx.leapLogo.update({
                    where: { id: logoId },
                    data: updateData,
                    include: {
                        cloudinaryImage: {
                            select: {
                                id: true,
                                url: true,
                                secureUrl: true,
                                width: true,
                                height: true,
                                format: true,
                            }
                        }
                    }
                });

                return updatedLogo;
            });

            return addCorsHeaders(
                NextResponse.json({
                    success: true,
                    message: "Logo updated successfully",
                    data: updated,
                    imageUpdated: newImageFile !== null
                }),
                req
            );

        } catch (error) {
            console.error("Update logo error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return addCorsHeaders(
                NextResponse.json({ error: errorMessage }, { status: 500 }),
                req
            );
        }
    });
}

export async function DELETE(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get("id");

            if (!id) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Missing required parameter: id" }, { status: 400 }),
                    req
                );
            }

            const logoId = parseInt(id);

            const existing = await prisma.leapLogo.findUnique({
                where: { id: logoId },
                include: {
                    cloudinaryImage: true,
                },
            });

            if (!existing) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Logo not found" }, { status: 404 }),
                    req
                );
            }

            if (existing.isActive) {
                console.warn(
                    "Deleting active logo. Consider setting another logo as active first."
                );
            }

            await prisma.$transaction(async (tx) => {
                await tx.leapLogo.delete({
                    where: { id: logoId },
                });

                await tx.cloudinaryImage.delete({
                    where: { id: existing.cloudinaryImage_id },
                });
            });

            try {
                await deleteImage(existing.cloudinaryImage.publicId);
            } catch (error) {
                console.error("Failed to delete from Cloudinary:", error);
            }

            return addCorsHeaders(
                NextResponse.json({
                    success: true,
                    message: "Logo deleted successfully",
                    data: {
                        id: logoId,
                    },
                }),
                req
            );
        } catch (error) {
            console.error("Delete logo error:", error);
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            return addCorsHeaders(
                NextResponse.json({ error: errorMessage }, { status: 500 }),
                req
            );
        }
    });
}
