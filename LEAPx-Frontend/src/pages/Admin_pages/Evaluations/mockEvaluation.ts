import type { Evaluation } from "../../../../types/evaluation/evaluation";

export const mockEvaluation: Evaluation = {
  id: "eval-001",
  titleTH: "แบบประเมินความรู้ก่อนอบรม",
  eventTitle: "โครงการพัฒนาทักษะการเขียนโปรแกรม",
  type: "PRE",
  startAt: "2026-03-01T08:00:00.000Z",
  endAt: "2026-03-10T23:59:59.000Z",

  questions: [
    // TEXT
    {
      id: "q1",
      titleTH: "ชื่อ-นามสกุลของคุณ",
      descriptionTH: "กรุณากรอกชื่อจริงและนามสกุล",
      required: true,
      type: "TEXT",
    },

    // TEXTAREA
    {
      id: "q2",
      titleTH: "คุณคาดหวังอะไรจากการอบรมครั้งนี้",
      descriptionTH: "อธิบายความคาดหวังของคุณโดยละเอียด",
      required: false,
      type: "TEXTAREA",
    },

    // SINGLE CHOICE
    {
      id: "q3",
      titleTH: "คุณเคยมีประสบการณ์เขียนโปรแกรมมาก่อนหรือไม่",
      required: true,
      type: "SINGLE_CHOICE",
      options: [
        { id: "q3o1", labelTH: "ไม่เคยเลย", value: "NO" },
        { id: "q3o2", labelTH: "เคยเล็กน้อย", value: "BASIC" },
        { id: "q3o3", labelTH: "มีประสบการณ์พอสมควร", value: "INTERMEDIATE" },
        { id: "q3o4", labelTH: "เชี่ยวชาญแล้ว", value: "ADVANCED" },
      ],
    },

    // MULTIPLE CHOICE
    {
      id: "q4",
      titleTH: "คุณสนใจเรียนรู้ภาษาโปรแกรมใดบ้าง",
      required: false,
      type: "MULTIPLE_CHOICE",
      options: [
        { id: "q4o1", labelTH: "JavaScript", value: "JS" },
        { id: "q4o2", labelTH: "Python", value: "PY" },
        { id: "q4o3", labelTH: "Java", value: "JAVA" },
        { id: "q4o4", labelTH: "C#", value: "CSHARP" },
      ],
    },

    // RATING
    {
      id: "q5",
      titleTH: "ให้คะแนนความมั่นใจของคุณในการเขียนโค้ด (1-5)",
      descriptionTH: "1 = น้อยที่สุด, 5 = มากที่สุด",
      required: true,
      type: "RATING",
    },
  ],
};
