/**
 * Skills Section - Wraps EventExpPerDayEditor for skills and EXP configuration
 */

import EventExpPerDayEditor, {
  type DayExpConfig,
} from "../../../../../components/Event/exp/EventExpPerDayEditor";

import type { UICheckInTimeSlot } from "../../../../../../types/ui/checkIn.types";

interface SkillsSectionProps {
  dates: string[];
  expByDay: DayExpConfig[];
  onExpByDayChange: (value: DayExpConfig[]) => void;

  checkInSlots?: UICheckInTimeSlot[];

  validateSignal?: number;
}

export default function SkillsSection({
  dates,
  expByDay,
  onExpByDayChange,
  checkInSlots,
  validateSignal,
}: SkillsSectionProps) {
  return (
    <div id="exp-editor">
      <EventExpPerDayEditor
        dates={dates}
        value={expByDay}
        onChange={onExpByDayChange}
        checkInSlots={checkInSlots}
        validateSignal={validateSignal}
      />
    </div>
  );
}
