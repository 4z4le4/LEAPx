// types/ui/events.ts
export type UiStatus = "OPEN" | "SOON" | "CLOSED";

export type EventCardModel = {
    id: string;
    slug: string;
    title: string;
    badges: string[];
    hours: number;
    date: string;     // ISO (วันเริ่มกิจกรรม)
    location: string;
    skills: string[];
    contact: string;
    status: UiStatus;

    // ⬇️ optional fields for UI card
    regStart?: string;
    imageUrl?: string | null;
    capacity?: {
        participantsMax?: number;
        participantsNow?: number;
        staffMax?: number;
        staffNow?: number;
    };
};