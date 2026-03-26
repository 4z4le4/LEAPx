import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, getUserId } from "@/middleware/auth";
import { uploadImage, deleteImage } from "@/lib/cloudinary";
import { transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}


export async function GET(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const { searchParams } = new URL(req.url);
            const mode = searchParams.get('mode'); // 'display' หรือ 'manage'
            const isActive = searchParams.get('isActive');
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '20');

            const whereClause: Record<string, unknown> = {};
            
            // Mode: display = เฉพาะที่ active, manage = ทั้งหมด
            if (mode === 'display') {
                whereClause.isActive = true;
            } else if (isActive !== null) {
                whereClause.isActive = isActive === 'true';
            }

            const skip = (page - 1) * limit;
            const totalCount = await prisma.leapBanner.count({ where: whereClause });

            const banners = await prisma.leapBanner.findMany({
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
                orderBy: [
                    { isMain: 'desc' },    // รูปหลักขึ้นก่อน
                    { sortOrder: 'asc' },  // เรียงตามลำดับ (0,1,2,3...)
                    { createdAt: 'desc' }  // ใหม่กว่าขึ้นก่อน
                ],
                skip: mode === 'display' ? 0 : skip,
                take: mode === 'display' ? 100 : limit, // display mode ดึงหมด
            });

            // Response แบบย่อสำหรับ display mode (เฉพาะ URL)
            if (mode === 'display') {
                const bannerUrls = banners.map(banner => ({
                    id: banner.id,
                    url: banner.cloudinaryImage.secureUrl,
                    caption_TH: banner.name_TH ,
                    caption_EN: banner.name_EN,
                    isMain: banner.isMain,
                    sortOrder: banner.sortOrder
                }));

                const response = NextResponse.json({
                    success: true,
                    data: bannerUrls
                });
                return addCorsHeaders(response, req);
            }

            // Response แบบเต็มสำหรับ manage mode
            const response = NextResponse.json(transformDatesToThai({
                success: true,
                data: banners,
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit),
                }
            }));
            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Get banners error:", error);
            const response = NextResponse.json(
                { error: "Failed to fetch banners" },
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
            const isMain = formData.get('isMain') === 'true';
            const sortOrder = formData.get('sortOrder') ? parseInt(formData.get('sortOrder') as string) : undefined;
            const isActive = formData.get('isActive') === 'true' ? true : false;

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

            if (!name_TH && !name_EN) {
                const response = NextResponse.json(
                    { error: "At least one of name_TH or name_EN is required" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // Auto-generate sortOrder if not provided (ใช้ max + 1)
            let finalSortOrder = sortOrder;
            if (finalSortOrder === undefined) {
                const maxSort = await prisma.leapBanner.aggregate({
                    _max: { sortOrder: true }
                });
                finalSortOrder = (maxSort._max.sortOrder || -1) + 1;
            }

            // Upload image to Cloudinary
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 8);
            const publicId = `banner-${timestamp}-${randomStr}`;

            const uploadResult = await uploadImage(file, {
                folder: 'banners',
                tags: ['banner', 'website'],
                uploadedBy: Number(userId),
                publicId: publicId,
            });

            // Create banner in transaction
            const banner = await prisma.$transaction(async (tx) => {
                // If isMain is true, set other banners to not main
                if (isMain) {
                    await tx.leapBanner.updateMany({
                        data: { isMain: false }
                    });
                }

                // Create new banner
                const newBanner = await tx.leapBanner.create({
                    data: {
                        cloudinaryImage_id: uploadResult.cloudinaryImage.id,
                        name_TH: name_TH || '-',
                        name_EN: name_EN || '-',
                        isMain,
                        sortOrder: finalSortOrder!,
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

                return newBanner;
            });

            const response = NextResponse.json({
                success: true,
                message: "Banner uploaded successfully (inactive by default)",
                data: banner
            }, { status: 201 });
            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Create banner error:", error);
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

            let bannerId: number;
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
                bannerId = parseInt(idParam as string);

                // Parse update fields
                if (formData.get('caption_TH') !== null) updateData.caption_TH = formData.get('caption_TH') as string;
                if (formData.get('caption_EN') !== null) updateData.caption_EN = formData.get('caption_EN') as string;
                if (formData.get('isMain') !== null) updateData.isMain = formData.get('isMain') === 'true';
                if (formData.get('sortOrder') !== null) updateData.sortOrder = parseInt(formData.get('sortOrder') as string);
                if (formData.get('isActive') !== null) updateData.isActive = formData.get('isActive') === 'true';

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
                bannerId = body.id;
                
                if (body.caption_TH !== undefined) updateData.caption_TH = body.caption_TH;
                if (body.caption_EN !== undefined) updateData.caption_EN = body.caption_EN;
                if (body.isMain !== undefined) updateData.isMain = body.isMain;
                if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
                if (body.isActive !== undefined) updateData.isActive = body.isActive;
            }

            if (!bannerId) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Missing required field: id" }, { status: 400 }),
                    req
                );
            }

            // Check if banner exists
            const existing = await prisma.leapBanner.findUnique({
                where: { id: bannerId },
                include: {
                    cloudinaryImage: true
                }
            });

            if (!existing) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Banner not found" }, { status: 404 }),
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
                    const publicId = `banner-${timestamp}-${randomStr}`;

                    const uploadResult = await uploadImage(newImageFile, {
                        folder: 'banners',
                        tags: ['banner', 'website'],
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

                // If setting as main, remove main from others
                if (updateData.isMain === true) {
                    await tx.leapBanner.updateMany({
                        where: { id: { not: bannerId } },
                        data: { isMain: false }
                    });
                }

                // Update banner
                const updatedBanner = await tx.leapBanner.update({
                    where: { id: bannerId },
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

                return updatedBanner;
            });

            return addCorsHeaders(
                NextResponse.json({
                    success: true,
                    message: "Banner updated successfully",
                    data: updated,
                    imageUpdated: newImageFile !== null
                }),
                req
            );

        } catch (error) {
            console.error("Update banner error:", error);
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
            const id = searchParams.get('id');

            if (!id) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Missing required parameter: id" }, { status: 400 }),
                    req
                );
            }

            const bannerId = parseInt(id);

            // Check if banner exists
            const existing = await prisma.leapBanner.findUnique({
                where: { id: bannerId },
                include: {
                    cloudinaryImage: true
                }
            });

            if (!existing) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Banner not found" }, { status: 404 }),
                    req
                );
            }

            // Delete in transaction
            await prisma.$transaction(async (tx) => {
                await tx.leapBanner.delete({
                    where: { id: bannerId },
                });

                await tx.cloudinaryImage.delete({
                    where: { id: existing.cloudinaryImage_id },
                });
            });

            // Delete from Cloudinary service (นอก transaction)
            try {
                await deleteImage(existing.cloudinaryImage.publicId);
            } catch (error) {
                console.error("Failed to delete from Cloudinary:", error);
            }


            return addCorsHeaders(
                NextResponse.json({
                    success: true,
                    message: "Banner deleted successfully",
                    data: {
                        id: bannerId
                    }
                }),
                req
            );

        } catch (error) {
            console.error("Delete banner error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return addCorsHeaders(
                NextResponse.json({ error: errorMessage }, { status: 500 }),
                req
            );
        }
    });
}