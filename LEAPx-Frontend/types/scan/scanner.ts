export interface QRCodeData {
    userId: number;
    timestamp: number;
    expiry: number;
    }

export interface CheckInOutRequest {
    eventId: number;
    userId: number;
    action: 'checkin' | 'checkout';
}

export interface ScanResult {
    success: boolean;
    message: string;
    userId?: number;
    action?: string;
}

export type ScanMode = 'user' | 'staff';

export interface Event {
    id: number;
    title_TH: string;
    title_EN: string;
    activityStart: string;
    activityEnd: string;
}