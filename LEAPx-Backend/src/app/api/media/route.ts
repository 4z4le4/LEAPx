import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
        try {
            const { searchParams } = new URL(req.url);
            const type = searchParams.get('type'); // 'banner', 'logo','
            const limit = parseInt(searchParams.get('limit') || '10'); 

            const response: {
                success: boolean;
                data: {
                    logo?: { id: number; url: string } | null;
                    banners?: Array<{
                        id: number;
                        url: string;
                        caption_TH?: string | null;
                        caption_EN?: string | null;
                        isMain: boolean;
                        sortOrder: number;
                    }>;
                };
            } = {
                success: true,
                data: {}
            };

            // Fetch Logo
            if (!type || type === 'logo' ) {
                const activeLogo = await prisma.leapLogo.findFirst({
                    where: { isActive: true },
                    include: {
                        cloudinaryImage: {
                            select: {
                                secureUrl: true,
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                });

                response.data.logo = activeLogo ? {
                    id: activeLogo.id,
                    url: activeLogo.cloudinaryImage.secureUrl
                } : null;
            }

            // Fetch Banners
            if (!type || type === 'banner') {
                const activeBanners = await prisma.leapBanner.findMany({
                    where: { isActive: true },
                    include: {
                        cloudinaryImage: {
                            select: {
                                secureUrl: true,
                            }
                        }
                    },
                    orderBy: [
                        { isMain: 'desc' },    // Main banner ก่อน
                        { sortOrder: 'asc' },  // เรียงตาม sortOrder
                        { createdAt: 'desc' }  // ใหม่กว่าก่อน
                    ],
                    take: limit
                });

                response.data.banners = activeBanners.map(banner => ({
                    id: banner.id,
                    url: banner.cloudinaryImage.secureUrl,
                    caption_TH: banner.name_TH,
                    caption_EN: banner.name_EN,
                    isMain: banner.isMain,
                    sortOrder: banner.sortOrder
                }));
            }

            const result = NextResponse.json(response);
            return addCorsHeaders(result, req);

        } catch (error) {
            console.error("Get media error:", error);
            const result = NextResponse.json(
                { error: "Failed to fetch media" },
                { status: 500 }
            );
            return addCorsHeaders(result, req);
        }
}