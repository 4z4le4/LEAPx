import { NextRequest, NextResponse } from 'next/server';

import { addCorsHeaders, handleCorsPreFlight } from '@/lib/cors';

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {

    const response = NextResponse.json({ 
        LEAPx: 'Hello LEAPx!🍀🍀🍀',
    });

    return addCorsHeaders(response, req);
}