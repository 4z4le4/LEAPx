import { toISO } from "../../src/pages/Admin_pages/EventManagement/utils/dateHelpers";
import type { CheckInTimeSlot } from "../../src/services/api";
import type { UICheckInTimeSlot } from "../../types/ui/checkIn.types";

export function  mapApiToUI(slot: CheckInTimeSlot): UICheckInTimeSlot {
  const [date, timePart] = slot.startTime.split("T");

  return {
    id: slot.id ?? Date.now(),
    slot_number: slot.slot_number,
    date,
    startTime: timePart.slice(0, 5),
    endTime: slot.endTime.split("T")[1].slice(0, 5),
    name_TH: slot.name_TH,
    name_EN: slot.name_EN,
    description_TH: slot.description_TH ?? "",
    description_EN: slot.description_EN ?? "",
    skillRewards: (slot.skillRewards ?? []).map(r => ({
      id: r.id,
      subSkillCategory_id: r.subSkillCategory_id,
      baseExperience: r.baseExperience,
      bonusExperience: r.bonusExperience,
      levelType: r.levelType,
      requireCheckIn: r.requireCheckIn ?? false,
      requireCheckOut: r.requireCheckOut ?? false,
      requireOnTime: r.requireOnTime ?? false,
    })),
  };
}

export function  mapUIToApi(slot: UICheckInTimeSlot) {
  return {
    slot_number: slot.slot_number,
    startTime: toISO(slot.date, slot.startTime),
    endTime: toISO(slot.date, slot.endTime),
    name_TH: slot.name_TH,
    name_EN: slot.name_EN,
    description_TH: slot.description_TH ?? null,
    description_EN: slot.description_EN ?? null,
    skillRewards: slot.skillRewards.map(r => ({
      subSkillCategory_id: r.subSkillCategory_id,
      baseExperience: r.baseExperience,
      bonusExperience: r.bonusExperience,
      levelType: r.levelType,
      requireCheckIn: r.requireCheckIn,
      requireCheckOut: r.requireCheckOut,
      requireOnTime: r.requireOnTime,
    })),
  };
}