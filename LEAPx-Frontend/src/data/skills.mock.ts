export type MainSkillCategory = {
  id: number;
  name_TH: string;
  name_EN: string;
  description_TH?: string | null;
  description_EN?: string | null;
  slug: string;
  icon?: string | null;
  color?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  subSkills: Array<{
    id: number;
    mainSkillCategory_id: number;
    name_TH: string;
    name_EN: string;
    description_TH?: string | null;
    description_EN?: string | null;
    slug: string;
    icon?: string | null;
    color?: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt?: string;
    updatedAt?: string;
  }>;
  summary?: string | null;
};

export const SKILL_CATEGORIES: MainSkillCategory[] = [
  {
    id: 1,
    name_TH: "การสื่อสารและการทำงานร่วมกัน",
    name_EN: "Communication & Collaboration",
    description_TH: "สื่อสารอย่างมีประสิทธิภาพและทำงานร่วมกับผู้อื่นเพื่อบรรลุเป้าหมาย",
    description_EN: "Communicate effectively and collaborate with others to achieve goals.",
    slug: "communication-&-collaboration",
    icon: "users",
    color: "#0EA5E9",
    isActive: true,
    sortOrder: 1,
    createdAt: "2025-10-21T13:47:51.003Z",
    updatedAt: "2025-10-21T13:47:51.003Z",
    subSkills: [
      {
        id: 1,
        mainSkillCategory_id: 1,
        name_TH: "การสื่อสารทางเทคนิค",
        name_EN: "Technical Communication",
        description_TH: "ถ่ายทอดเนื้อหาวิศวกรรมอย่างชัดเจนทั้งเอกสารและการนำเสนอ",
        description_EN: "Convey engineering content clearly in writing and presentations.",
        slug: "technical-communication",
        icon: "file-text",
        color: "#38BDF8",
        isActive: true,
        sortOrder: 1,
        createdAt: "2025-10-21T13:52:20.895Z",
        updatedAt: "2025-10-21T13:52:20.895Z",
      },
      {
        id: 2,
        mainSkillCategory_id: 1,
        name_TH: "การทำงานร่วมกัน",
        name_EN: "Collaboration",
        description_TH: "ทำงานเป็นทีม แบ่งบทบาท รับฟัง และแก้ปัญหาร่วมกัน",
        description_EN: "Work in teams, share roles, listen, and solve problems together.",
        slug: "collaboration",
        icon: "handshake",
        color: "#22D3EE",
        isActive: true,
        sortOrder: 2,
        createdAt: "2025-10-21T13:52:47.935Z",
        updatedAt: "2025-10-21T13:52:47.935Z",
      },
      {
        id: 3,
        mainSkillCategory_id: 1,
        name_TH: "การสื่อสารภาษาอังกฤษเชิงวิชาชีพ",
        name_EN: "Professional English Communication",
        description_TH: "ใช้ภาษาอังกฤษสื่อสารในบริบทวิชาชีพอย่างเหมาะสม",
        description_EN: "Use English appropriately in professional contexts.",
        slug: "professional-english-communication",
        icon: "languages",
        color: "#60A5FA",
        isActive: true,
        sortOrder: 3,
        createdAt: "2025-10-21T13:53:07.152Z",
        updatedAt: "2025-10-21T13:53:07.152Z",
      },
    ],
    summary: null,
  },
];