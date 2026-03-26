// !!! todo: remove this mock data @93bazmi
// import type { ApiEvent } from "../../types/api/event";
// import type { EventDetail } from "../../types/event/event-detail";
// import { toEventDetail } from "../lib/adapters/event-adapter";
// import { ENRICH_BY_ID } from "./events.enrich";
// import { SKILL_CATEGORIES } from "./skills.mock";

// /** Helpers: ดึง main/sub skill จาก mock data เพื่อ build skillRewards */
// const pickMain = (mainId: number) => {
//   const m = SKILL_CATEGORIES.find((c) => c.id === mainId);
//   if (!m) throw new Error(`MainSkillCategory ${mainId} not found`);
//   return m;
// };
// const pickSub = (mainId: number, subId: number) => {
//   const m = pickMain(mainId);
//   const s = m.subSkills.find((x) => x.id === subId);
//   if (!s) throw new Error(`SubSkill ${subId} not found in main ${mainId}`);
//   return { main: m, sub: s };
// };

// /** RAW: ตรงตาม Prisma model Event */
// // export const RAW_EVENTS: ApiEvent[] = [
// //   {
// //     id: 201,
// //     created_by: 1,
// //     title_TH: "จกปูนเพื่อชุมชน",
// //     title_EN: "Community Cement Mixing",
// //     description_TH: "อาสาช่วยซ่อมพื้น/ผนัง ผสมและเทปูนอย่างปลอดภัย",
// //     description_EN: "Volunteer to mix and pour cement safely for community repairs.",
// //     slug: "community-cement-mixing-2025",

// //     // Capacity
// //     maxParticipants: 40,
// //     currentParticipants: 0,
// //     waitlistEnabled: true,

// //     // Timing
// //     registrationStart: "2025-02-01T00:00:00.000Z",
// //     registrationEnd: "2025-02-10T23:59:59.000Z",
// //     activityStart: "2025-02-15T09:00:00.000Z",
// //     activityEnd: "2025-02-15T16:00:00.000Z",

// //     // Check-in
// //     checkInStart: "2025-02-15T08:30:00.000Z",
// //     checkInEnd: "2025-02-15T09:30:00.000Z",
// //     lateCheckInPenalty: 2,

// //     // Status & Visibility
// //     status: "DRAFT",
// //     isVisible: true,
// //     priority: 1,

// //     // Location
// //     location_TH: "หน่วยบำเพ็ญประโยชน์ คณะวิศวฯ",
// //     location_EN: "Engineering Volunteer Unit",
// //     locationMapUrl: "https://maps.google.com/?q=18.7950,98.9520",
// //     isOnline: false,
// //     meetingLink: null,

// //     // Additional
// //     requirements_TH: "สุขภาพแข็งแรง ใส่รองเท้าหุ้มส้น",
// //     requirements_EN: "Physically fit; closed-toe shoes required",
// //     materials_TH: "หมวก/ถุงมือ (มีหน้างานให้ยืม)",
// //     materials_EN: "Hat/Gloves (available on site)",

// //     createdAt: "2025-10-19T10:45:03.214Z",
// //     updatedAt: "2025-10-19T10:45:03.214Z",

// //     creator: {
// //       id: 1,
// //       firstName: "Jane",
// //       lastName: "Smith",
// //       email: "jane.smith@leap.ac.th",
// //     },
// //     photos: [
// //       {
// //         id: 301,
// //         event_id: 201, // ✅ แก้ให้ตรงกับ id ของอีเวนต์นี้
// //         photoUrl:
// //           "https://images.unsplash.com/photo-1604881984452-0d2ee1b1d9a3?q=80&w=1600&auto=format&fit=crop",
// //         caption_TH: "ทำงานอาสา",
// //         caption_EN: "Volunteer work",
// //         isMain: true,
// //         sortOrder: 0,
// //         createdAt: "2025-10-19T10:45:03.214Z",
// //         updatedAt: "2025-10-19T10:45:03.214Z",
// //       },
// //     ],

// //     // ✅ skillRewards: ดึงจาก MainSkillCategory#1 และ sub skills #1,#2 (ตัวอย่าง)
// //     skillRewards: (() => {
// //       const s1 = pickSub(1, 1); // การสื่อสารทางเทคนิค
// //       const s2 = pickSub(1, 2); // การทำงานร่วมกัน
// //       // const s3 = pickSub(1, 3); // การสื่อสารภาษาอังกฤษเชิงวิชาชีพ (ถ้าอยากเพิ่ม)
// //       return [
// //         {
// //           subSkillCategory: {
// //             id: s1.sub.id,
// //             name_TH: s1.sub.name_TH,
// //             name_EN: s1.sub.name_EN,
// //             mainSkillCategory: {
// //               id: s1.main.id,
// //               name_TH: s1.main.name_TH,
// //               name_EN: s1.main.name_EN,
// //               color: s1.main.color ?? null,
// //               icon: s1.main.icon ?? null,
// //             },
// //           },
// //           baseExperience: 12,
// //           bonusExperience: 2,
// //         },
// //         {
// //           subSkillCategory: {
// //             id: s2.sub.id,
// //             name_TH: s2.sub.name_TH,
// //             name_EN: s2.sub.name_EN,
// //             mainSkillCategory: {
// //               id: s2.main.id,
// //               name_TH: s2.main.name_TH,
// //               name_EN: s2.main.name_EN,
// //               color: s2.main.color ?? null,
// //               icon: s2.main.icon ?? null,
// //             },
// //           },
// //           baseExperience: 16,
// //           bonusExperience: 0,
// //         },
// //       ];
// //     })(),
// //   },
// // ];

// /** VIEW: แปลงเป็น EventDetail แล้ว enrich จาก mock เก่า (ถ้ามี) */
// export const EVENTS: EventDetail[] = RAW_EVENTS
//   .map(toEventDetail)
//   .map((e) => {
//     const add = ENRICH_BY_ID[e.id];
//     if (!add) return e;
//     return {
//       ...e,
//       coverUrl: add.coverUrl ?? e.coverUrl,
//       lat: add.lat ?? e.lat,
//       lng: add.lng ?? e.lng,
//       staff: {
//         current: add.staff?.current ?? e.staff.current,
//         max: add.staff?.max ?? e.staff.max,
//       },
//       chips: add.chips ?? e.chips,
//     };
//   });

// export const getEventById = (id: string) =>
//   EVENTS.find((ev) => ev.id === id) ?? null;

// export const getEventBySlug = (slug: string) =>
//   EVENTS.find((e) => e.slug === slug) ?? null;