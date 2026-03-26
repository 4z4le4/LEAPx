export interface InvitationData {
    studentId?: number;
    email: string;
    firstName?: string;
    lastName?: string;
    note?: string;
}

export interface InvitationUploadRequest {
    eventId: number;
    invitations: InvitationData[];
}

export interface InvitationUploadResponse {
    success: boolean;
    message: string;
    data: {
        totalInvitations: number;
        successCount: number;
        skippedCount: number;
        errorCount: number;
        errors: Array<{
        row: number;
        email: string;
        reason: string;
        }>;
        invitations: Array<{
        id: number;
        email: string;
        status: string;
        isExistingUser: boolean;
        }>;
    };
}

export interface InvitationListResponse {
    success: boolean;
    data: {
        invitations: Array<{
        id: number;
        email: string;
        firstName: string | null;
        lastName: string | null;
        studentId: number | null;
        status: string;
        invitedAt: Date;
        registeredAt: Date | null;
        isExistingUser: boolean;
        }>;
        summary: {
        total: number;
        pending: number;
        registered: number;
        expired: number;
        cancelled: number;
        };
    };
}