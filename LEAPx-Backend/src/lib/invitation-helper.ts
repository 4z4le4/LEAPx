import prisma from "@/lib/prisma";


export async function checkInvitationValidity(
    eventId: number,
    email: string
): Promise<{
    isValid: boolean;
    invitation?: {
        id: number;
        status: string;
    };
    reason?: string;
}> {
    try {
        const invitation = await prisma.eventInvitation.findUnique({
        where: {
            event_id_email: {
            event_id: eventId,
            email: email
            }
        }
        });

        if (!invitation) {
        return {
            isValid: false,
            reason: "No invitation found for this email"
        };
        }

        if (invitation.status === "REGISTERED") {
        return {
            isValid: false,
            invitation: {
            id: invitation.id,
            status: invitation.status
            },
            reason: "Invitation already used"
        };
        }

        if (invitation.status === "CANCELLED") {
        return {
            isValid: false,
            invitation: {
            id: invitation.id,
            status: invitation.status
            },
            reason: "Invitation has been cancelled"
        };
        }

        if (invitation.status === "EXPIRED") {
        return {
            isValid: false,
            invitation: {
            id: invitation.id,
            status: invitation.status
            },
            reason: "Invitation has expired"
        };
        }

        return {
        isValid: true,
        invitation: {
            id: invitation.id,
            status: invitation.status
        }
        };
    } catch (error) {
        console.error("Error checking invitation validity:", error);
        return {
        isValid: false,
        reason: "Error checking invitation"
        };
    }
}

/**
 * อัพเดทสถานะ invitation เป็น EXPIRED สำหรับ event ที่ผ่านไปแล้ว
 */
export async function expireOldInvitations(): Promise<number> {
    try {
        const result = await prisma.eventInvitation.updateMany({
        where: {
            status: "PENDING",
            event: {
            registrationEnd: {
                lt: new Date()
            }
            }
        },
        data: {
            status: "EXPIRED"
        }
        });

        return result.count;
    } catch (error) {
        console.error("Error expiring old invitations:", error);
        return 0;
    }
}

/**
 * ส่งอีเมลเชิญเข้าร่วมกิจกรรม
 */
export async function sendInvitationEmail(
    invitation: {
        id: number;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
    },
    event: {
        id: number;
        title_EN: string;
        title_TH: string;
    }
): Promise<boolean> {
    try {
        // todo: Implement email sending logic
        // ใช้ service Nodemailer เดี๋ยวทำทีหลัง
        
        console.log(`Sending invitation email to ${invitation.email} for event ${event.title_EN}`);
        
        const emailContent = {
        to: invitation.email,
        subject: `คุณได้รับเชิญเข้าร่วมกิจกรรม: ${event.title_TH}`,
        html: `
            <h2>สวัสดีคุณ ${invitation.firstName || ""} ${invitation.lastName || ""}</h2>
            <p>คุณได้รับเชิญให้เข้าร่วมกิจกรรม <strong>${event.title_TH}</strong></p>
            <p>กรุณาคลิกลิงก์ด้านล่างเพื่อลงทะเบียน:</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/events/${event.id}/register?invitation=${invitation.id}">
            ลงทะเบียนเข้าร่วมกิจกรรม
            </a>
        `
        };
        console.log('emailContent:', emailContent);

        // todo: Send email using email service Nodemailer
        
        return true;
    } catch (error) {
        console.error("Error sending invitation email:", error);
        return false;
    }
}

/**
 * ส่งอีเมลเชิญแบบ batch
 */
export async function sendBatchInvitationEmails(
    invitationIds: number[]
): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const invitationId of invitationIds) {
        try {
        const invitation = await prisma.eventInvitation.findUnique({
            where: { id: invitationId },
            include: {
            event: {
                select: {
                id: true,
                title_EN: true,
                title_TH: true
                }
            }
            }
        });

        if (invitation && invitation.status === "PENDING") {
            const sent = await sendInvitationEmail(invitation, invitation.event);
            if (sent) {
            success++;
            } else {
            failed++;
            }
        }
        } catch (error) {
        console.error(`Error sending invitation ${invitationId}:`, error);
        failed++;
        }
    }

    return { success, failed };
}