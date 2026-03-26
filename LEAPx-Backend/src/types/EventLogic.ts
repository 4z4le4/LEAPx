export interface StaffCheckInOutRequest {
    eventId: number;
    action: "checkin" | "checkout";
    userId: number;

}

export interface CheckInOutRequest {
    eventId: number;
    action: "checkin" | "checkout";
    slotId?: number; 
    userId: number;
}

export interface StaffRegisterRequest {
    eventId: number;
    action: "register" | "cancel";
}

export interface UserRegisterRequest {
    eventId: number;
    action: "register" | "cancel";
    registrationType?: "NORMAL" | "WALK_IN" | "WAITLIST";
    slotId?: number; // For time-slot events
}