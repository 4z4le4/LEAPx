import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, getUserId } from "@/middleware/auth";
import { Prisma } from "@prisma/client";

type ThresholdMap = {
  I: number;
  II: number;
  III: number;
  IV: number;
};

type ScenarioExp = {
  Level_I_exp: number;
  Level_II_exp: number;
  Level_III_exp: number;
  Level_IV_exp: number;
  scenarioTag: string;
};

type EventLevelType = "I" | "II" | "III" | "IV";

type EventPlan = {
  index: number;
  levelType: EventLevelType;
};

type SubSkillRow = {
  subSkillCategory_id: number;
  mainSkillCategory_id: number;
  scenarioTag: string;
  Level_I_exp: number;
  Level_II_exp: number;
  Level_III_exp: number;
  Level_IV_exp: number;
  Level_I_stars: number;
  Level_II_stars: number;
  Level_III_stars: number;
  Level_IV_stars: number;
  currentLevel: number;
  totalExp: number;
};

const DEFAULT_THRESHOLDS: ThresholdMap = {
  I: 8,
  II: 16,
  III: 32,
  IV: 64,
};

const MAX_USER_ID = 99_999_999;
const DEFAULT_EVENT_COUNT = 15;
const DUMMY_SLUG_PREFIX = "dummy-event";
const DUMMY_REASON_PREFIX = "Dummy activity simulation";
const DUMMY_CREATE_TX_MAX_WAIT_MS = 15_000;
const DUMMY_CREATE_TX_TIMEOUT_MS = 120_000;
const DUMMY_DELETE_TX_MAX_WAIT_MS = 15_000;
const DUMMY_DELETE_TX_TIMEOUT_MS = 120_000;

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreFlight(req);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toPositiveInt(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function hashEmailToIdSeed(email: string): number {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) % MAX_USER_ID;
  }

  // Keep generated ids in a stable, practical range (7 digits+).
  const min = 1_000_000;
  const span = MAX_USER_ID - min;
  return min + (hash % span);
}

function pickScenarioExp(index: number, thresholds: ThresholdMap): ScenarioExp {
  const caseIndex = index % 6;

  if (caseIndex === 0) {
    return {
      Level_I_exp: 0,
      Level_II_exp: thresholds.II * 2 + 7,
      Level_III_exp: thresholds.III + 11,
      Level_IV_exp: thresholds.IV * 3 + 5,
      scenarioTag: "LOCKED_WITH_STORED_EXP",
    };
  }

  if (caseIndex === 1) {
    return {
      Level_I_exp: thresholds.I * 3 + 2,
      Level_II_exp: thresholds.II - 1,
      Level_III_exp: 0,
      Level_IV_exp: 0,
      scenarioTag: "LEVEL_I_MULTI_STARS_ONLY",
    };
  }

  if (caseIndex === 2) {
    return {
      Level_I_exp: thresholds.I * 2,
      Level_II_exp: thresholds.II * 3 + 4,
      Level_III_exp: thresholds.III * 2 + 9,
      Level_IV_exp: 0,
      scenarioTag: "LEVEL_II_UNLOCKED_III_STORED",
    };
  }

  if (caseIndex === 3) {
    return {
      Level_I_exp: thresholds.I,
      Level_II_exp: thresholds.II * 2,
      Level_III_exp: thresholds.III * 2 + 13,
      Level_IV_exp: thresholds.IV + 3,
      scenarioTag: "LEVEL_III_UNLOCKED_IV_STORED",
    };
  }

  if (caseIndex === 4) {
    return {
      Level_I_exp: thresholds.I * 4,
      Level_II_exp: thresholds.II * 5,
      Level_III_exp: thresholds.III * 3,
      Level_IV_exp: thresholds.IV * 2 + 8,
      scenarioTag: "FULLY_UNLOCKED_MULTI_STARS",
    };
  }

  return {
    Level_I_exp: 0,
    Level_II_exp: 0,
    Level_III_exp: 0,
    Level_IV_exp: 0,
    scenarioTag: "NO_EXP",
  };
}

function calculateStarsFromExp(exp: ScenarioExp, thresholds: ThresholdMap) {
  const Level_I_stars = Math.floor(exp.Level_I_exp / thresholds.I);
  const Level_II_stars = Level_I_stars > 0
    ? Math.floor(exp.Level_II_exp / thresholds.II)
    : 0;
  const Level_III_stars = Level_II_stars > 0
    ? Math.floor(exp.Level_III_exp / thresholds.III)
    : 0;
  const Level_IV_stars = Level_III_stars > 0
    ? Math.floor(exp.Level_IV_exp / thresholds.IV)
    : 0;

  let currentLevel = 0;
  if (Level_IV_stars > 0) currentLevel = 4;
  else if (Level_III_stars > 0) currentLevel = 3;
  else if (Level_II_stars > 0) currentLevel = 2;
  else if (Level_I_stars > 0) currentLevel = 1;

  return {
    Level_I_stars,
    Level_II_stars,
    Level_III_stars,
    Level_IV_stars,
    currentLevel,
  };
}

async function getThresholds(): Promise<ThresholdMap> {
  const rows = await prisma.levelThreshold.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const thresholds = { ...DEFAULT_THRESHOLDS };
  for (const row of rows) {
    if (row.levelType in thresholds) {
      thresholds[row.levelType as keyof ThresholdMap] = row.expRequired;
    }
  }

  return thresholds;
}

async function resolveUserId(email: string, requestedId?: number): Promise<number> {
  if (requestedId !== undefined) {
    if (!Number.isInteger(requestedId) || requestedId <= 0 || requestedId > MAX_USER_ID) {
      throw new Error("INVALID_REQUESTED_ID");
    }
    const existingById = await prisma.user.findUnique({
      where: { id: requestedId },
      select: { id: true },
    });
    if (existingById) {
      throw new Error("REQUESTED_ID_ALREADY_EXISTS");
    }
    return requestedId;
  }

  const existingIds = new Set(
    (await prisma.user.findMany({
      select: { id: true },
    })).map((u) => u.id)
  );

  const candidate = hashEmailToIdSeed(email);
  for (let i = 0; i < MAX_USER_ID; i++) {
    const id = ((candidate + i - 1) % MAX_USER_ID) + 1;
    if (!existingIds.has(id)) {
      return id;
    }
  }

  throw new Error("NO_AVAILABLE_ID");
}

function splitEvenly(total: number, slots: number): number[] {
  if (slots <= 0 || total <= 0) {
    return Array.from({ length: Math.max(0, slots) }, () => 0);
  }

  const base = Math.floor(total / slots);
  let remainder = total % slots;

  const result = Array.from({ length: slots }, () => base);
  for (let i = 0; i < result.length && remainder > 0; i++) {
    result[i] += 1;
    remainder -= 1;
  }

  return result;
}

function buildEventPlan(count: number): EventPlan[] {
  const pattern: EventLevelType[] = [
    "I", "II", "III", "IV", "II",
    "III", "IV", "I", "III", "II",
    "IV", "I", "II", "III", "IV",
  ];

  return Array.from({ length: count }, (_, index) => ({
    index,
    levelType: pattern[index % pattern.length],
  }));
}

function buildSubSkillRows(
  activeSubSkills: Array<{ id: number; mainSkillCategory_id: number }>,
  thresholds: ThresholdMap
): SubSkillRow[] {
  return activeSubSkills.map((skill, index) => {
    const expScenario = pickScenarioExp(index, thresholds);
    const stars = calculateStarsFromExp(expScenario, thresholds);
    const totalExp =
      expScenario.Level_I_exp +
      expScenario.Level_II_exp +
      expScenario.Level_III_exp +
      expScenario.Level_IV_exp;

    return {
      subSkillCategory_id: skill.id,
      mainSkillCategory_id: skill.mainSkillCategory_id,
      scenarioTag: expScenario.scenarioTag,
      Level_I_exp: expScenario.Level_I_exp,
      Level_II_exp: expScenario.Level_II_exp,
      Level_III_exp: expScenario.Level_III_exp,
      Level_IV_exp: expScenario.Level_IV_exp,
      Level_I_stars: stars.Level_I_stars,
      Level_II_stars: stars.Level_II_stars,
      Level_III_stars: stars.Level_III_stars,
      Level_IV_stars: stars.Level_IV_stars,
      currentLevel: stars.currentLevel,
      totalExp,
    };
  });
}

function buildEventRewardMatrix(
  subSkillRows: SubSkillRow[],
  eventPlan: EventPlan[]
): number[][] {
  const levelToEventIndices: Record<EventLevelType, number[]> = {
    I: [],
    II: [],
    III: [],
    IV: [],
  };

  for (const event of eventPlan) {
    levelToEventIndices[event.levelType].push(event.index);
  }

  return subSkillRows.map((row) => {
    const perEvent = Array.from({ length: eventPlan.length }, () => 0);
    const byLevel: Record<EventLevelType, number> = {
      I: row.Level_I_exp,
      II: row.Level_II_exp,
      III: row.Level_III_exp,
      IV: row.Level_IV_exp,
    };

    (Object.keys(byLevel) as EventLevelType[]).forEach((levelType) => {
      const eventIndices = levelToEventIndices[levelType];
      if (eventIndices.length === 0) return;

      const chunks = splitEvenly(byLevel[levelType], eventIndices.length);
      for (let i = 0; i < eventIndices.length; i++) {
        perEvent[eventIndices[i]] += chunks[i];
      }
    });

    return perEvent;
  });
}

function getDummySlugPrefixForUser(userId: number): string {
  return `${DUMMY_SLUG_PREFIX}-${userId}-`;
}

export async function POST(req: NextRequest) {
  return withActivityAdminAuth(req, async (req: NextRequest) => {
    try {
      const actorId = getUserId(req);
      if (actorId instanceof NextResponse) {
        return addCorsHeaders(actorId, req);
      }

      const body = await req.json();
      const rawEmail = typeof body.email === "string" ? body.email : "";
      const email = normalizeEmail(rawEmail);

      if (!email) {
        return addCorsHeaders(
          NextResponse.json({ error: "email is required" }, { status: 400 }),
          req
        );
      }

      if (!isValidEmail(email)) {
        return addCorsHeaders(
          NextResponse.json({ error: "invalid email format" }, { status: 400 }),
          req
        );
      }

      const existingByEmail = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      });

      if (existingByEmail) {
        return addCorsHeaders(
          NextResponse.json(
            {
              error: `email already exists: ${existingByEmail.email}`,
              existingUserId: existingByEmail.id,
            },
            { status: 409 }
          ),
          req
        );
      }

      const rawRequestedId = body.id ?? body.requestedId;
      const requestedId = toPositiveInt(rawRequestedId);
      if (rawRequestedId !== undefined && rawRequestedId !== null && rawRequestedId !== "" && requestedId === null) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "invalid id (must be integer in range 1..99999999)" },
            { status: 400 }
          ),
          req
        );
      }

      const userId = await resolveUserId(email, requestedId ?? undefined);

      const thresholds = await getThresholds();
      const activeSubSkills = await prisma.subSkillCategory.findMany({
        where: { isActive: true },
        select: {
          id: true,
          mainSkillCategory_id: true,
        },
        orderBy: [
          { mainSkillCategory_id: "asc" },
          { sortOrder: "asc" },
          { id: "asc" },
        ],
      });

      if (activeSubSkills.length === 0) {
        return addCorsHeaders(
          NextResponse.json({ error: "no active sub skills found" }, { status: 400 }),
          req
        );
      }

      const requestedEventCount = toPositiveInt(body.eventCount);
      const eventCount = Math.max(DEFAULT_EVENT_COUNT, requestedEventCount ?? DEFAULT_EVENT_COUNT);
      const eventPlan = buildEventPlan(eventCount);

      const userFirstName = typeof body.firstName === "string" && body.firstName.trim()
        ? body.firstName.trim()
        : "Dummy";
      const userLastName = typeof body.lastName === "string" && body.lastName.trim()
        ? body.lastName.trim()
        : `User_${userId}`;
      const userFaculty = typeof body.faculty === "string" && body.faculty.trim()
        ? body.faculty.trim()
        : "Engineering";
      const userMajor = typeof body.major === "string" && body.major.trim()
        ? body.major.trim()
        : "Computer Engineering";
      const userPhone = typeof body.phone === "string" && body.phone.trim()
        ? body.phone.trim()
        : null;

      const now = new Date();
      const subSkillRows = buildSubSkillRows(activeSubSkills, thresholds);
      const rewardMatrix = buildEventRewardMatrix(subSkillRows, eventPlan);

      const totalEventExp = subSkillRows.reduce((sum, row) => sum + row.totalExp, 0);

      const result = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            id: userId,
            firstName: userFirstName,
            lastName: userLastName,
            email,
            faculty: userFaculty,
            major: userMajor,
            phone: userPhone,
            role_id: 1,
            isActive: true,
          },
        });

        const createdEvents: Array<{ id: number; levelType: EventLevelType }> = [];

        for (const plannedEvent of eventPlan) {
          const dayOffset = eventPlan.length - plannedEvent.index;
          const registrationStart = new Date(now.getTime() - (dayOffset + 7) * 24 * 60 * 60 * 1000);
          const registrationEnd = new Date(now.getTime() - (dayOffset + 2) * 24 * 60 * 60 * 1000);
          const activityStart = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
          const activityEnd = new Date(now.getTime() - (dayOffset * 24 - 1) * 60 * 60 * 1000);

          const event = await tx.event.create({
            data: {
              created_by: createdUser.id,
              title_TH: `กิจกรรมจำลอง #${plannedEvent.index + 1} (LV ${plannedEvent.levelType})`,
              title_EN: `Dummy Activity #${plannedEvent.index + 1} (LV ${plannedEvent.levelType})`,
              description_TH: "กิจกรรมจำลองสำหรับทดสอบการกระจาย EXP หลายเลเวล",
              description_EN: "Dummy event for multi-level EXP distribution test",
              slug: `${DUMMY_SLUG_PREFIX}-${createdUser.id}-${Date.now()}-${plannedEvent.index + 1}`,
              registrationStart,
              registrationEnd,
              activityStart,
              activityEnd,
              location_TH: "ห้องทดลองระบบ",
              location_EN: "System Lab",
              status: "COMPLETED",
              maxParticipants: 100,
              currentParticipants: 1,
            },
          });

          const rewardsPayload: Prisma.EventSkillRewardCreateManyInput[] = [];
          const historiesPayload: Prisma.ExperienceHistoryCreateManyInput[] = [];
          let eventExpTotal = 0;

          for (let skillIndex = 0; skillIndex < subSkillRows.length; skillIndex++) {
            const skill = subSkillRows[skillIndex];
            const expForEvent = rewardMatrix[skillIndex][plannedEvent.index];
            if (expForEvent <= 0) continue;

            eventExpTotal += expForEvent;
            const baseExperience = Math.max(1, Math.floor(expForEvent * 0.8));
            const bonusExperience = Math.max(0, expForEvent - baseExperience);

            rewardsPayload.push({
              event_id: event.id,
              subSkillCategory_id: skill.subSkillCategory_id,
              levelType: plannedEvent.levelType,
              baseExperience,
              bonusExperience,
            });

            historiesPayload.push({
              user_id: createdUser.id,
              activity_id: event.id,
              subSkillCategory_id: skill.subSkillCategory_id,
              experienceGained: expForEvent,
              reason_TH: `ข้อมูลจำลองจากกิจกรรม #${plannedEvent.index + 1} (${skill.scenarioTag}, LV ${plannedEvent.levelType})`,
              reason_EN: `${DUMMY_REASON_PREFIX} #${plannedEvent.index + 1} (${skill.scenarioTag}, LV ${plannedEvent.levelType})`,
              type: "ACTIVITY_COMPLETION",
              previousLevel: 0,
              newLevel: skill.currentLevel,
              previousExp: 0,
              newExp: expForEvent,
              bonusApplied: bonusExperience > 0,
            });
          }

          if (rewardsPayload.length > 0) {
            await tx.eventSkillReward.createMany({
              data: rewardsPayload,
            });
          }

          if (historiesPayload.length > 0) {
            await tx.experienceHistory.createMany({
              data: historiesPayload,
            });
          }

          await tx.eventRegistration.create({
            data: {
              user_id: createdUser.id,
              event_id: event.id,
              registrationType: "NORMAL",
              status: "COMPLETED",
              checkedIn: true,
              checkInTime: activityStart,
              checkedOut: true,
              checkOutTime: activityEnd,
              experienceEarned: eventExpTotal,
              hasEvaluated: false,
            },
          });

          createdEvents.push({ id: event.id, levelType: plannedEvent.levelType });
        }

        await tx.userSubSkillLevel.createMany({
          data: subSkillRows.map((row) => ({
            user_id: createdUser.id,
            subSkillCategory_id: row.subSkillCategory_id,
            Level_I_exp: row.Level_I_exp,
            Level_II_exp: row.Level_II_exp,
            Level_III_exp: row.Level_III_exp,
            Level_IV_exp: row.Level_IV_exp,
            Level_I_stars: row.Level_I_stars,
            Level_II_stars: row.Level_II_stars,
            Level_III_stars: row.Level_III_stars,
            Level_IV_stars: row.Level_IV_stars,
            currentLevel: row.currentLevel,
            totalExp: row.totalExp,
          })),
        });

        const groupedMain = new Map<number, typeof subSkillRows>();
        for (const row of subSkillRows) {
          const current = groupedMain.get(row.mainSkillCategory_id) || [];
          current.push(row);
          groupedMain.set(row.mainSkillCategory_id, current);
        }

        const mainRows: Prisma.UserMainSkillLevelCreateManyInput[] = [];
        for (const [mainSkillCategory_id, rows] of groupedMain.entries()) {
          const maxLevel = Math.max(...rows.map((r) => r.currentLevel));
          const averageLevel = rows.reduce((sum, r) => sum + r.currentLevel, 0) / rows.length;
          const totalExp = rows.reduce((sum, r) => sum + r.totalExp, 0);
          const totalStars = rows.reduce(
            (sum, r) => sum + r.Level_I_stars + r.Level_II_stars + r.Level_III_stars + r.Level_IV_stars,
            0
          );

          mainRows.push({
            user_id: createdUser.id,
            mainSkillCategory_id,
            maxLevel,
            averageLevel,
            totalExp,
            totalStars,
            Level_I_count: rows.filter((r) => r.Level_I_stars > 0).length,
            Level_II_count: rows.filter((r) => r.Level_II_stars > 0).length,
            Level_III_count: rows.filter((r) => r.Level_III_stars > 0).length,
            Level_IV_count: rows.filter((r) => r.Level_IV_stars > 0).length,
            lastCalculated: now,
          });
        }

        if (mainRows.length > 0) {
          await tx.userMainSkillLevel.createMany({
            data: mainRows,
          });
        }

        const scenarioSummary = subSkillRows.reduce<Record<string, number>>((acc, row) => {
          acc[row.scenarioTag] = (acc[row.scenarioTag] || 0) + 1;
          return acc;
        }, {});

        return {
          user: createdUser,
          eventIds: createdEvents.map((e) => e.id),
          eventLevelSummary: createdEvents.reduce<Record<EventLevelType, number>>(
            (acc, item) => {
              acc[item.levelType] += 1;
              return acc;
            },
            { I: 0, II: 0, III: 0, IV: 0 }
          ),
          totalSubSkills: subSkillRows.length,
          totalMainSkills: mainRows.length,
          totalExp: totalEventExp,
          scenarioSummary,
        };
      }, {
        maxWait: DUMMY_CREATE_TX_MAX_WAIT_MS,
        timeout: DUMMY_CREATE_TX_TIMEOUT_MS,
      });

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          message: "Dummy user with activity/exp history created successfully",
          data: {
            user: {
              id: result.user.id,
              email: result.user.email,
              firstName: result.user.firstName,
              lastName: result.user.lastName,
            },
            eventCount: result.eventIds.length,
            eventIds: result.eventIds,
            eventLevelSummary: result.eventLevelSummary,
            totalSubSkills: result.totalSubSkills,
            totalMainSkills: result.totalMainSkills,
            totalExp: result.totalExp,
            scenarioSummary: result.scenarioSummary,
            thresholds,
            requestedBy: actorId,
          },
        }),
        req
      );
    } catch (error) {
      console.error("Create dummy user error:", error);

      const message = error instanceof Error ? error.message : "Unknown error";
      if (message === "INVALID_REQUESTED_ID") {
        return addCorsHeaders(
          NextResponse.json(
            { error: "invalid id (must be integer in range 1..99999999)" },
            { status: 400 }
          ),
          req
        );
      }

      if (message === "REQUESTED_ID_ALREADY_EXISTS") {
        return addCorsHeaders(
          NextResponse.json(
            { error: "requested id already exists" },
            { status: 409 }
          ),
          req
        );
      }

      if (message === "NO_AVAILABLE_ID") {
        return addCorsHeaders(
          NextResponse.json({ error: "no available id" }, { status: 500 }),
          req
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "duplicate value found while creating dummy user" },
            { status: 409 }
          ),
          req
        );
      }

      return addCorsHeaders(
        NextResponse.json({ error: message }, { status: 500 }),
        req
      );
    }
  });
}

export async function DELETE(req: NextRequest) {
  return withActivityAdminAuth(req, async (req: NextRequest) => {
    try {
      const actorId = getUserId(req);
      if (actorId instanceof NextResponse) {
        return addCorsHeaders(actorId, req);
      }

      let body: Record<string, unknown> = {};
      try {
        body = await req.json();
      } catch {
        body = {};
      }

      const idFromBody = toPositiveInt(body.id ?? body.userId);
      const emailFromBody = typeof body.email === "string" ? normalizeEmail(body.email) : null;

      if (!idFromBody && !emailFromBody) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "provide id/userId or email to delete dummy user" },
            { status: 400 }
          ),
          req
        );
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(idFromBody ? [{ id: idFromBody }] : []),
            ...(emailFromBody ? [{ email: emailFromBody }] : []),
          ],
        },
        select: {
          id: true,
          email: true,
          role_id: true,
        },
      });

      if (!user) {
        return addCorsHeaders(
          NextResponse.json({ error: "user not found" }, { status: 404 }),
          req
        );
      }

      const dummySlugPrefix = getDummySlugPrefixForUser(user.id);
      const dummyEvents = await prisma.event.findMany({
        where: {
          created_by: user.id,
          slug: { startsWith: dummySlugPrefix },
        },
        select: { id: true },
      });

      if (dummyEvents.length === 0) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "target user does not have dummy data created by this API" },
            { status: 409 }
          ),
          req
        );
      }

      const dummyEventIds = dummyEvents.map((e) => e.id);

      const [nonDummyRegs, nonDummyHistory] = await Promise.all([
        prisma.eventRegistration.count({
          where: {
            user_id: user.id,
            event_id: { notIn: dummyEventIds },
          },
        }),
        prisma.experienceHistory.count({
          where: {
            user_id: user.id,
            OR: [
              { reason_EN: { not: { startsWith: DUMMY_REASON_PREFIX } } },
              { activity_id: { notIn: dummyEventIds } },
            ],
          },
        }),
      ]);

      if (nonDummyRegs > 0 || nonDummyHistory > 0) {
        return addCorsHeaders(
          NextResponse.json(
            {
              error: "user has non-dummy history, refusing to delete",
              nonDummyRegistrations: nonDummyRegs,
              nonDummyExperienceHistory: nonDummyHistory,
            },
            { status: 409 }
          ),
          req
        );
      }

      const deleted = await prisma.$transaction(async (tx) => {
        const registrations = await tx.eventRegistration.findMany({
          where: { event_id: { in: dummyEventIds } },
          select: { id: true },
        });
        const registrationIds = registrations.map((r) => r.id);

        const evaluations = await tx.eventEvaluation.findMany({
          where: { event_id: { in: dummyEventIds } },
          select: { id: true },
        });
        const evaluationIds = evaluations.map((e) => e.id);

        if (evaluationIds.length > 0) {
          await tx.evaluationAnswer.deleteMany({
            where: {
              response: {
                evaluation_id: { in: evaluationIds },
              },
            },
          });

          await tx.evaluationResponse.deleteMany({
            where: {
              evaluation_id: { in: evaluationIds },
            },
          });

          await tx.evaluationQuestion.deleteMany({
            where: {
              evaluation_id: { in: evaluationIds },
            },
          });

          await tx.eventEvaluation.deleteMany({
            where: {
              id: { in: evaluationIds },
            },
          });
        }

        if (registrationIds.length > 0) {
          await tx.userCheckInRecord.deleteMany({
            where: {
              eventRegistration_id: { in: registrationIds },
            },
          });

          await tx.evaluationResponse.deleteMany({
            where: {
              registration_id: { in: registrationIds },
            },
          });
        }

        await tx.checkInTimeSlotSkillReward.deleteMany({
          where: {
            checkInTimeSlot: {
              event_id: { in: dummyEventIds },
            },
          },
        });

        await tx.checkInTimeSlot.deleteMany({
          where: {
            event_id: { in: dummyEventIds },
          },
        });

        await tx.eventStaff.deleteMany({
          where: {
            event_id: { in: dummyEventIds },
          },
        });

        await tx.eventInvitation.deleteMany({
          where: {
            event_id: { in: dummyEventIds },
          },
        });

        await tx.eventPhoto.deleteMany({
          where: {
            event_id: { in: dummyEventIds },
          },
        });

        await tx.eventSpecialSkillReward.deleteMany({
          where: {
            event_id: { in: dummyEventIds },
          },
        });

        await tx.eventSkillReward.deleteMany({
          where: {
            event_id: { in: dummyEventIds },
          },
        });

        await tx.eventPrerequisite.deleteMany({
          where: {
            OR: [
              { event_id: { in: dummyEventIds } },
              { prerequisite_event_id: { in: dummyEventIds } },
            ],
          },
        });

        await tx.eventRegistrationCancellation.deleteMany({
          where: {
            event_id: { in: dummyEventIds },
          },
        });

        await tx.eventRegistration.deleteMany({
          where: {
            event_id: { in: dummyEventIds },
          },
        });

        await tx.experienceHistory.deleteMany({
          where: {
            user_id: user.id,
            OR: [
              { activity_id: { in: dummyEventIds } },
              { reason_EN: { startsWith: DUMMY_REASON_PREFIX } },
            ],
          },
        });

        await tx.userMainSkillLevel.deleteMany({
          where: {
            user_id: user.id,
          },
        });

        await tx.userSubSkillLevel.deleteMany({
          where: {
            user_id: user.id,
          },
        });

        await tx.event.deleteMany({
          where: {
            id: { in: dummyEventIds },
          },
        });

        await tx.user.delete({
          where: { id: user.id },
        });

        return {
          deletedUserId: user.id,
          deletedEventCount: dummyEventIds.length,
        };
      }, {
        maxWait: DUMMY_DELETE_TX_MAX_WAIT_MS,
        timeout: DUMMY_DELETE_TX_TIMEOUT_MS,
      });

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          message: "Dummy user and related dummy data deleted successfully",
          data: {
            deletedUserId: deleted.deletedUserId,
            deletedEventCount: deleted.deletedEventCount,
            requestedBy: actorId,
          },
        }),
        req
      );
    } catch (error) {
      console.error("Delete dummy user error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return addCorsHeaders(
          NextResponse.json({ error: "dummy user not found" }, { status: 404 }),
          req
        );
      }

      return addCorsHeaders(
        NextResponse.json({ error: message }, { status: 500 }),
        req
      );
    }
  });
}
