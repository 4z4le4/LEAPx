export interface CreateTimeSlotRequest {
  slot_number: number;
  startTime: string;
  endTime: string;
  name_TH: string;
  name_EN: string;
  description_TH: string | null;
  description_EN: string | null;
}

export interface TimeSlot {
  id: number;
  event_id: number;
  slot_number: number;
  startTime: string;
  endTime: string;
  name_TH: string;
  name_EN: string;
}

export interface CreateTimeSlotResponse {
  success: boolean;
  message: string;
  data: TimeSlot;
}