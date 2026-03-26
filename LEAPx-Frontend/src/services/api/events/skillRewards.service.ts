import { backend_url } from "../../../../utils/constants";
import type {
  CreateSkillRewardRequest,
  CreateSkillRewardResponse,
} from "../../../../src/pages/Admin_pages/EventManagement/types/skillRewards.types";

export async function createSkillReward(
  eventId: number,
  slotId: number,
  payload: CreateSkillRewardRequest
): Promise<CreateSkillRewardResponse> {
  const res = await fetch(
    `${backend_url}/api/events/${eventId}/time-slots/${slotId}/skill-rewards`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to create skill reward");
  }

  return res.json();
}