import { NextRequest, NextResponse } from "next/server";
import { generateSecureQRData } from "@/lib/qrEncryption";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";

interface GenerateQRRequest {
    userId: number;
    validityMinutes?: number;
}

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function POST(req: NextRequest) {
    try {
        const body: GenerateQRRequest = await req.json();

        if (!body.userId) {
            return addCorsHeaders(
                NextResponse.json(
                    { error: "Missing required field: userId" },
                    { status: 400 }
                ),
                req
            );
        }

        const validityMinutes = body.validityMinutes || 1;

        if (validityMinutes < 1 || validityMinutes > 60) {
            return addCorsHeaders(
                NextResponse.json(
                    { error: "Validity minutes must be between 1 and 60" },
                    { status: 400 }
                ),
                req
            );
        }

        const encryptedData = generateSecureQRData(body.userId, validityMinutes);
        const expiry = Date.now() + (validityMinutes * 60 * 1000);

        return addCorsHeaders(
            NextResponse.json({
                success: true,
                encryptedData,
                expiry,
                validityMinutes
            }),
            req
        );
    } catch (error) {
        console.error("QR generation error:", error);
        return addCorsHeaders(
            NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            ),
            req
        );
    }
}