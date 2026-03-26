import { createSkillReward } from "./skillRewards.service";
import type { DayExpConfig } from "../../../components/Event/exp/EventExpPerDayEditor";
import type { CreateSkillRewardRequest } from "../../../../src/pages/Admin_pages/EventManagement/types/skillRewards.types";

export async function createRewards(
  eventId: number,
  expByDay: DayExpConfig[],
  slotIdMap: Record<number, number>
): Promise<void> {

  for (const day of expByDay) {

    for (const slot of day.slots) {

      if (slot.checkInTimeSlotId == null) {
        continue;
      }

      const dbSlotId = slotIdMap[slot.checkInTimeSlotId];

      if (!dbSlotId) {
        continue;
      }

      for (const item of slot.items) {

        if (!item.skillId || !item.activityType) {
          continue;
        }

        const payload: CreateSkillRewardRequest = {
          subSkillCategory_id: Number(item.skillId),
          levelType: item.activityType,
          baseExperience: item.exp ?? 0,
          bonusExperience: 0,
          requireCheckIn: slot.requireCheckIn ?? true,
          requireCheckOut: slot.requireCheckOut ?? false,
          requireOnTime: false,
        };

        await createSkillReward(eventId, dbSlotId, payload);
      }
    }
  }
}