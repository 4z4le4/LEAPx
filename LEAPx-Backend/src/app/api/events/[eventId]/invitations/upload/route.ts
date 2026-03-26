import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, getUserId } from "@/middleware/auth";
import { InvitationData } from "@/types/InvitationType";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    const userId = await getUserId(req);

    return withActivityAdminAuth(req, async () => {
        try {
            const { eventId } = await context.params; 
            const eventIdNum = parseInt(eventId);

            const event = await prisma.event.findUnique({
                where: { id: eventIdNum }
            });

            if (!event) {
                const response = NextResponse.json(
                    { error: "Event not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            const formData = await req.formData();
            const file = formData.get("file") as File;

            if (!file) {
                const response = NextResponse.json(
                    { error: "No file uploaded" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const workbook = XLSX.read(buffer);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(
                worksheet
            ) as Array<Record<string, string | number>>;

            if (data.length === 0) {
                const response = NextResponse.json(
                    { error: "Excel file is empty" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const invitations: InvitationData[] = [];
            const errors: Array<{ row: number; email: string; reason: string }> = [];

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const rowNumber = i + 2;

                const email = row["Email (Required)"]?.toString().trim();

                if (!email) {
                    errors.push({
                        row: rowNumber,
                        email: "",
                        reason: "Email is required"
                    });
                    continue;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    errors.push({
                        row: rowNumber,
                        email,
                        reason: "Invalid email format"
                    });
                    continue;
                }

                const studentIdStr = row["Student ID (Optional)"]?.toString().trim();
                const studentId = studentIdStr ? parseInt(studentIdStr) : undefined;

                if (studentIdStr && isNaN(studentId as number)) {
                    errors.push({
                        row: rowNumber,
                        email,
                        reason: "Invalid Student ID format"
                    });
                    continue;
                }

                invitations.push({
                    email,
                    studentId,
                    firstName: row["First Name (Optional)"]?.toString().trim() || undefined,
                    lastName: row["Last Name (Optional)"]?.toString().trim() || undefined,
                    note: row["Note (Optional)"]?.toString().trim() || undefined
                });
            }

            let successCount = 0;
            let skippedCount = 0;
            const createdInvitations: Array<{
                id: number;
                email: string;
                status: string;
                isExistingUser: boolean;
            }> = [];

            for (const invitation of invitations) {
                try {
                    let existingUser = null;

                    if (invitation.studentId) {
                        existingUser = await prisma.user.findUnique({
                            where: { id: invitation.studentId }
                        });
                    } else {
                        existingUser = await prisma.user.findUnique({
                            where: { email: invitation.email }
                        });
                    }

                    const existingInvitation = await prisma.eventInvitation.findUnique({
                        where: {
                            event_id_email: {
                                event_id: eventIdNum,
                                email: invitation.email
                            }
                        }
                    });

                    if (existingInvitation) {
                        skippedCount++;
                        errors.push({
                            row: 0,
                            email: invitation.email,
                            reason: "Already invited to this event"
                        });
                        continue;
                    }

                    if (existingUser) {
                        const existingRegistration = await prisma.eventRegistration.findUnique({
                            where: {
                                user_id_event_id: {
                                    user_id: existingUser.id,
                                    event_id: eventIdNum
                                }
                            }
                        });

                        if (existingRegistration) {
                            skippedCount++;
                            errors.push({
                                row: 0,
                                email: invitation.email,
                                reason: "Already registered for this event"
                            });
                            continue;
                        }
                    }

                    const created = await prisma.eventInvitation.create({
                        data: {
                            event_id: eventIdNum,
                            email: invitation.email,
                            firstName: invitation.firstName,
                            lastName: invitation.lastName,
                            studentId: existingUser?.id || invitation.studentId,
                            invitedBy: Number(userId),
                            note: invitation.note,
                            status: "PENDING"
                        }
                    });

                    successCount++;
                    createdInvitations.push({
                        id: created.id,
                        email: created.email,
                        status: created.status,
                        isExistingUser: !!existingUser
                    });
                } catch (error) {
                    console.error("Error creating invitation:", error);
                    errors.push({
                        row: 0,
                        email: invitation.email,
                        reason: error instanceof Error ? error.message : "Unknown error"
                    });
                }
            }

            const response = NextResponse.json(
                {
                    success: true,
                    message: "Invitations processed successfully",
                    data: {
                        totalInvitations: invitations.length,
                        successCount,
                        skippedCount,
                        errorCount: errors.length,
                        errors,
                        invitations: createdInvitations
                    }
                },
                { status: 201 }
            );

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Upload invitations error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}
