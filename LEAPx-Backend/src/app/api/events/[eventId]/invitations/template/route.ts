import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth } from "@/middleware/auth";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    const { eventId } = await context.params;
    return withActivityAdminAuth(req, async () => {
        try {
        const templateData = [
            {
            "Student ID (Optional)": "650619999",
            "Email (Required)": "student@cmu.ac.th",
            "First Name (Optional)": "ข้าวเกรียบ",
            "Last Name (Optional)": "ตัวจริง",
            "Note (Optional)": "หมายเหตุ",
            "Faculty (Optional)": "วิศวกรรมศาสตร์",
            },
            {
            "Student ID (Optional)": "",
            "Email (Required)": "external@email.com",
            "First Name (Optional)": "John",
            "Last Name (Optional)": "Doe",
            "Note (Optional)": "Note",
            "Faculty (Optional)": "",
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        
        worksheet['!cols'] = [
            { wch: 25 }, // Student ID
            { wch: 30 }, // Email
            { wch: 20 }, // First Name
            { wch: 20 }, // Last Name
            { wch: 30 }, // Note
            { wch: 30 }  // Faculty
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Invitations");

        const buffer = XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
        });

        const response = new NextResponse(buffer, {
            status: 200,
            headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="event_invitation_template_${eventId}.xlsx"`
            }
        });

        return addCorsHeaders(response, req);
        } catch (error) {
        console.error("Template generation error:", error);
        const response = NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
        }
    });
}