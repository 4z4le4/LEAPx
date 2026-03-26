import { NextRequest, NextResponse } from 'next/server';
import { getUserId, getStudentYear } from "@/middleware/auth";
import { addCorsHeaders, handleCorsPreFlight } from '@/lib/cors';

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
    try {
    const userId = getUserId(req);
    if (userId instanceof NextResponse) {
        return addCorsHeaders(userId, req);
    }
    const yearLevel = await getStudentYear(userId);
    
    let displayText = "";
    let isExternal = false;
    
    if (yearLevel === "EXTERNAL") {
        displayText = "บุคคลภายนอก";
        isExternal = true;
    } else if (yearLevel !== null) {
        displayText = `นักศึกษาปี ${yearLevel}`;
    } else {
        displayText = "ไม่สามารถระบุสถานะได้";
    }
    const response = NextResponse.json({ 
        LEAP: 'Hello LEAP!🍀🍀🍀',
        userId,
        CMU_YEAR: yearLevel,
        displayText,
        isExternal
    });

    return addCorsHeaders(response, req);
    } catch (error) {
        console.error("hello/info error:", error);
        return addCorsHeaders(
            NextResponse.json({ error: "Internal server error" }, { status: 500 }),
            req
        );
    }
}