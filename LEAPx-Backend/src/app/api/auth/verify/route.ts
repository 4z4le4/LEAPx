import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { getStudentYear } from "@/middleware/auth";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set in environment");
const JWT_SECRET = process.env.JWT_SECRET;
export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
    }

    export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("LEAP_AUTH")?.value;
        const leapToken = req.cookies.get("LEAP_USER")?.value;
        if (!token || !leapToken) {
        const response = NextResponse.json(
            { 
            success: false,
            authenticated: false,
            error: "No authentication token found" 
            },
            { status: 401 }
        );
        return addCorsHeaders(response, req);
        }
        try {
        // Verify tokens
        const decoded = verify(token, JWT_SECRET) as { userId: number };
        const leapDecoded = verify(leapToken, JWT_SECRET) as { userId: number, role: string };

        if (decoded.userId !== leapDecoded.userId) {
            const response = NextResponse.json(
            { 
                success: false,
                authenticated: false,
                error: "Token mismatch" 
            },
            { status: 401 }
            );
            return addCorsHeaders(response, req);
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
            role: true
            }
        });

        if (!user || !user.isActive) {
            const response = NextResponse.json(
            { 
                success: false,
                authenticated: false,
                error: "User not found or inactive" 
            },
            { status: 404 }
            );
            return addCorsHeaders(response, req);
        }

        const CMU_YEAR = await getStudentYear(user.id);
        // ส่งข้อมูล user กลับไป
        const response = NextResponse.json({
            success: true,
            authenticated: true,
            user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            faculty: user.faculty,
            major: user.major,
            photo: user.photo,
            role: user.role.name,
            isActive: user.isActive,
            CMU_YEAR
            }
        });

        return addCorsHeaders(response, req);

        } catch {
        const response = NextResponse.json(
            { 
            success: false,
            authenticated: false,
            error: "Invalid or expired token" 
            },
            { status: 401 }
        );
        return addCorsHeaders(response, req);
        }

    } catch (error) {
        console.error("Verify error:", error);
        const response = NextResponse.json(
        { 
            success: false,
            authenticated: false,
            error: "Internal server error" 
        },
        { status: 500 }
        );
        return addCorsHeaders(response, req);
    }
}