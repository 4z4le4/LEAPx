export type CreateSkillRewardRequest = {
    subSkillCategory_id: number;
    baseExperience: number;
    bonusExperience?: number;
    levelType: "I" | "II" | "III" | "IV";
}

export type UpdateSkillRewardRequest = {
    id: number;
    baseExperience?: number;
    bonusExperience?: number;
    isActive?: boolean;
}

export type CreateEventRequest = {
    created_by: number;
    title_TH: string;
    title_EN: string;
    description_TH: string;
    description_EN: string;
    slug?: string;
    majorCategory_id: number;
    
    // Capacity
    maxParticipants?: number;
    waitlistEnabled?: boolean;

    walkinEnabled?: boolean;
    walkinCapacity?: number;

     // Year Level Restrictions 
    allowedYearLevels?: number[];      
    staffAllowedYears?: number[];

    // Staff Management
    maxStaffCount?: number;
    staffCommunicationLink?: string;
    
    // Timing
    registrationStart: string;
    registrationEnd: string;
    activityStart: string;
    activityEnd: string;
    
    // Check-in
    checkInStart?: string;
    checkInEnd?: string;
    lateCheckInPenalty?: number;
    staffCheckInTime?: number;
    
    // Status
    status?: string;
    isVisible?: boolean;
    isFeatured?: boolean;
    priority?: number;
    
    // Location
    location_TH: string;
    location_EN: string;
    locationMapUrl?: string;
    isOnline?: boolean;
    meetingLink?: string;
    
    // Additional
    requirements_TH?: string;
    requirements_EN?: string;
    materials_TH?: string;
    materials_EN?: string;
    
    // Skill Rewards (optional - สามารถเพิ่มตอนสร้าง event เลย)
    skillRewards?: Array<{
        subSkillCategory_id: number;
        baseExperience: number;
        bonusExperience?: number;
    }>;
}

export type GetEventsParams  = {
    status?: string;
    isVisible?: boolean;
    isFeatured?: boolean;
    isOnline?: boolean;
    search?: string;

    old_events?: boolean;

    majorCategoryId?: number;      
    yearLevel?: number;             

    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeSkillRewards?: boolean;
    includeStats?: boolean;
}

export type RegisterEventRequest = {
    eventId: number;
    registrationType?: "NORMAL" | "WALK_IN" | "WAITLIST";
}

