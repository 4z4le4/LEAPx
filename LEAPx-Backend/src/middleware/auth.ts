import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import { verify } from "jsonwebtoken";
import { JWT_SECRET, JWT_SECRET_ENCODED, ROLE_ID } from "@/utils/constants";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { canScanEvent } from "@/lib/permissions";

interface JWTPayload {
  userId: number;
  role_id: number;
}

/**
 * คำนวณปีการศึกษาปัจจุบันตามรหัสนักศึกษา
 * @param studentId - รหัสนักศึกษา (เช่น 650612077)
 * @returns ปีการศึกษาปัจจุบัน (1-4+), "EXTERNAL" สำหรับบุคคลภายนอก, หรือ null ถ้า error
 */
export async function getStudentYear(studentId: number): Promise<number | "EXTERNAL" | null> {
  try {
    const studentIdStr = studentId.toString();
    
    // ถ้าไม่ถึง 9 หลัก = บุคคลภายนอก
    if (studentIdStr.length < 9) {
      return "EXTERNAL";
    }
    
    // ดึงเลขสองหลักแรก (ปีที่เข้า เช่น 65 = พ.ศ. 2565)
    const admissionYearShort = parseInt(studentIdStr.substring(0, 2));
    const admissionYear = 2500 + admissionYearShort;
    
    // ดึงปีการศึกษาปัจจุบัน (ปีเดียว)
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        year_TH: "desc", // เอาปีล่าสุด
      },
    });

    if (!currentAcademicYear) {
      console.error("No active academic year found in database");
      return null;
    }

    // คำนวณชั้นปี
    // ตัวอย่าง: เข้าปี 2565, ปัจจุบัน 2568 = 2568 - 2565 + 1 = ปี 4
    const yearLevel = currentAcademicYear.year_TH - admissionYear + 1;
    
    // ถ้าติดลบหรือ 0 = ยังไม่ถึงเวลาเข้าเรียน
    if (yearLevel <= 0) {
      console.error(`Student ${studentId} has not started yet (admission: ${admissionYear}, current: ${currentAcademicYear.year_TH})`);
      return null;
    }
    
    return yearLevel;
  } catch (error) {
    console.error("Error calculating student year:", error);
    return null;
  }
}

/**
 * ดึงข้อมูลผู้ใช้พร้อมปีการศึกษาจาก request
 * @param req - NextRequest
 * @returns Object ที่มี userId และ yearLevel (number, "EXTERNAL", หรือ null) หรือ NextResponse ถ้า error
 */
export async function getUserWithYear(
    req: NextRequest
  ): Promise<{ userId: number; yearLevel: number | "EXTERNAL" | null } | NextResponse> {
    const authToken = req.cookies.get("LEAP_AUTH")?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    try {
      interface DecodedToken {
        userId: number;
        [key: string]: unknown;
      }

      const decoded = jwt.verify(
        authToken,
        process.env.JWT_SECRET!
      ) as DecodedToken;
      
      const userId = decoded.userId;
      
      // คำนวณปีการศึกษา
      const yearLevel = await getStudentYear(userId);
      
      return { userId, yearLevel };
    } catch (error) {
      console.error("Error verifying token:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
}

/**
 * ตรวจสอบว่านักศึกษามีสิทธิ์เข้าถึงกิจกรรมตามปีการศึกษาหรือไม่
 * @param studentId - รหัสนักศึกษา
 * @param allowedYears - ปีการศึกษาที่อนุญาต เช่น [1, 2, 3, 4] หรือ [] = ทุกปี
 * @returns true ถ้าอนุญาต, false ถ้าไม่อนุญาต (บุคคลภายนอกจะ return false ถ้ามีการจำกัดปี)
 */
export async function checkYearEligibility(
    studentId: number,
    allowedYears: number[]
  ): Promise<boolean> {
    // ถ้าไม่มีการจำกัดปี (array ว่าง) = อนุญาตทุกปี (รวมบุคคลภายนอก)
    if (!allowedYears || allowedYears.length === 0) {
      return true;
    }

    const yearLevel = await getStudentYear(studentId);
    
    // ถ้าเป็นบุคคลภายนอกและมีการจำกัดปี = ไม่อนุญาต
    if (yearLevel === "EXTERNAL") {
      return false;
    }
    
    if (yearLevel === null) {
      return false;
    }

    return allowedYears.includes(yearLevel);
}

export async function verifyAuth(
  req: NextRequest,
  requiredRole = ROLE_ID.USER,
  requireMatchingUserId = false
) {
  const cookieToken = req.cookies.get("LEAP_AUTH")?.value;
  const bearerToken = req.headers.get("Authorization")?.startsWith("Bearer ")
    ? req.headers.get("Authorization")?.split(" ")[1]
    : null;

  if (!cookieToken && !bearerToken) {
    return { authorized: false, message: "No authentication token provided" };
  }

  const token = cookieToken || bearerToken;

  try {
    const tokenData = verify(token as string, JWT_SECRET) as unknown as JWTPayload;
    // console.log("Token userId:", tokenData.userId);
    // console.log("Required role:", requiredRole);

    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId },
      select: { role_id: true },
    });

    // console.log("User role_id:", user?.role_id);

    if (requireMatchingUserId) {
      const url = new URL(req.url);
      const requestedUserId = Number(url.searchParams.get("userId"));


      if (
        tokenData.userId < requestedUserId 
        // && tokenData.role_id < ROLE_ID.ACTIVITY_ADMIN
      ) {
        return {
          authorized: false,
          message: "Cannot access another user's data",
        };
      }
    }


    if (user == null || user.role_id == null || user.role_id < requiredRole) {
      // console.log("Authorization failed: Insufficient permissions");
      return { authorized: false, message: "Insufficient permissions" };
    }
    // console.log("Authorization successful");
    return { authorized: true, user: tokenData };
  } catch {
    // console.log("Authorization failed: Invalid token");
    return { authorized: false, message: "Invalid authentication token" };
  }
}

// Supreme Admin Auth (สูงสุด)
export async function withSupremeAuth(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response | NextResponse>
) {
  const { authorized, message } = await verifyAuth(req, ROLE_ID.SUPREME, true);
  if (!authorized) {
    return NextResponse.json({ message }, { status: 403 });
  }

  const response = await handler(req);

  if (response instanceof NextResponse) {
    return response;
  }

  if (response instanceof Response) {
    return response;
  }

  return NextResponse.json(response);
}

// Skill Admin Auth (แอดมินกลุ่มทักษะ)
export async function withSkillAdminAuth(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response | NextResponse>
) {
  // console.log("Verifying Skill Admin Auth");
  const { authorized, message } = await verifyAuth(req, ROLE_ID.SKILL_ADMIN, true);
  // console.log("role:", ROLE_ID.SKILL_ADMIN);
  if (!authorized) {
    return NextResponse.json({ message }, { status: 403 });
  }

  const response = await handler(req);

  if (response instanceof NextResponse) {
    return response;
  }

  if (response instanceof Response) {
    return response;
  }

  return NextResponse.json(response);
}

// Sup Admin Auth (ผู้ช่วยแอดมิน)
export async function withActivityAdminAuth(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response | NextResponse>
) {
  const { authorized, message } = await verifyAuth(req, ROLE_ID.ACTIVITY_ADMIN, true);
  if (!authorized) {
    return NextResponse.json({ message }, { status: 403 });
  }

  const response = await handler(req);

  if (response instanceof NextResponse) {
    return response;
  }

  if (response instanceof Response) {
    return response;
  }

  return NextResponse.json(response);
}

// Student Auth (นักเรียน)
export async function withStudentAuth(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response | NextResponse>
) {
  const { authorized, message } = await verifyAuth(req, ROLE_ID.STUDENT, true);
  if (!authorized) {
    return NextResponse.json({ message }, { status: 403 });
  }

  const response = await handler(req);

  if (response instanceof NextResponse) {
    return response;
  }

  if (response instanceof Response) {
    return response;
  }

  return NextResponse.json(response);
}

// Alumni Auth (ศิษย์เก่า)
export async function withAlumniAuth(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response | NextResponse>
) {
  const { authorized, message } = await verifyAuth(req, ROLE_ID.ALUMNI, true);
  if (!authorized) {
    return NextResponse.json({ message }, { status: 403 });
  }

  const response = await handler(req);

  if (response instanceof NextResponse) {
    return response;
  }

  if (response instanceof Response) {
    return response;
  }

  return NextResponse.json(response);
}

// Event Staff Auth 
export async function withEventStaffAuth(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response | NextResponse>
) {
  const cookieToken = req.cookies.get("LEAP_AUTH")?.value;
  const bearerToken = req.headers.get("Authorization")?.startsWith("Bearer ")
    ? req.headers.get("Authorization")?.split(" ")[1]
    : null;

  if (!cookieToken && !bearerToken) {
    return NextResponse.json(
      { message: "No authentication token provided" },
      { status: 401 }
    );
  }

  const token = cookieToken || bearerToken;

  try {
    const tokenData = verify(token as string, JWT_SECRET) as unknown as JWTPayload;
    
    // Extract eventId from URL path or body
    let eventId: number | null = null;
    let body: Record<string, unknown> | null = null;
    
    // For GET requests, extract eventId from URL path (e.g., /api/events/123/...)
    if (req.method === "GET") {
      const urlPath = new URL(req.url).pathname;
      const eventIdMatch = urlPath.match(/\/events\/(\d+)/);
      if (eventIdMatch) {
        eventId = parseInt(eventIdMatch[1]);
      }
    } else {
      // For POST/PUT/DELETE requests, try to read from body
      try {
        body = await req.json() as Record<string, unknown>;
        if (body && typeof body.eventId === "number") {
          eventId = body.eventId;
        }
      } catch {
        // Body might be empty or invalid JSON, that's ok for some requests
      }
    }

    if (!eventId) {
      return NextResponse.json(
        { message: "Event ID is required" },
        { status: 400 }
      );
    }

    // Use centralized permission system
    const permissionResult = await canScanEvent(tokenData.userId, eventId);
    
    if (!permissionResult.allowed) {
      return NextResponse.json(
        { message: permissionResult.reason || "Unauthorized" },
        { status: 403 }
      );
    }

    // Permission granted, proceed with handler
    if (req.method === "GET") {
      return await handler(req);
    } else {
      const newReq = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      return await handler(newReq);
    }
  } catch (error) {
    console.error("Authorization error:", error);
    return NextResponse.json(
      { message: "Invalid authentication token" },
      { status: 401 }
    );
  }
}

// User Auth (ผู้ใช้ทั่วไป)
export async function withUserAuth(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response | NextResponse>
) {
  const { authorized, message } = await verifyAuth(req, ROLE_ID.USER, true);
  if (!authorized) {
    return NextResponse.json({ message }, { status: 403 });
  }

  const response = await handler(req);

  if (response instanceof NextResponse) {
    return response;
  }

  if (response instanceof Response) {
    return response;
  }

  return NextResponse.json(response);
}

// ใช้สำหรับ backward compatibility กับโค้ดเดิม
export const withStaffAuth = withActivityAdminAuth;

export function getUserId(req: NextRequest): number | NextResponse {
  const authToken = req.cookies.get("LEAP_AUTH")?.value;
  // console.log("authToken:", authToken);
  if (!authToken) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  let userId;
  try {
    interface DecodedToken {
      userId: number;
      [key: string]: unknown;
    }

    const decoded = jwt.verify(
      authToken,
      process.env.JWT_SECRET!
    ) as DecodedToken;
    userId = decoded.userId;
    // console.log("decoded token:", decoded);
    // console.log("userId from token:", userId);
    return userId;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function CheckUser(
req: NextRequest, p0: (req: NextRequest) => Promise<NextResponse<{ error: string; }> | NextResponse<{ success: boolean; data: { subSkillLevels: ({ subSkillCategory: { mainSkillCategory: { id: number; isActive: boolean; createdAt: Date; updatedAt: Date; description_TH: string | null; description_EN: string | null; slug: string; name_TH: string; name_EN: string; icon: string | null; color: string | null; sortOrder: number; }; } & { id: number; isActive: boolean; createdAt: Date; updatedAt: Date; mainSkillCategory_id: number; description_TH: string | null; description_EN: string | null; slug: string; name_TH: string; name_EN: string; icon: string | null; color: string | null; sortOrder: number; }; } & { id: number; createdAt: Date; updatedAt: Date; user_id: number; totalExp: number; subSkillCategory_id: number; Level_I_exp: number; Level_II_exp: number; Level_III_exp: number; Level_IV_exp: number; Level_I_stars: number; Level_II_stars: number; Level_III_stars: number; Level_IV_stars: number; currentLevel: number; })[]; mainSkillLevels: ({ mainSkillCategory: { id: number; isActive: boolean; createdAt: Date; updatedAt: Date; description_TH: string | null; description_EN: string | null; slug: string; name_TH: string; name_EN: string; icon: string | null; color: string | null; sortOrder: number; }; } & { id: number; createdAt: Date; updatedAt: Date; user_id: number; mainSkillCategory_id: number; maxLevel: number; averageLevel: number; totalExp: number; totalStars: number; Level_I_count: number; Level_II_count: number; Level_III_count: number; Level_IV_count: number; lastCalculated: Date; })[]; }; }>>, userId: string,
): Promise<Response> {
  const user = await prisma.user.findUnique({
    where: {
      id: Number(userId), // แปลง userId เป็น number
    },
    include: {
      role: true, // ใช้ include แทน select เพื่อให้ได้ข้อมูลครบ
    },
  });
  
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }
  
  return NextResponse.json({ message: "Pass" }, { status: 200 });
}

export async function withRoleAdminOrUserIdMatch(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response | NextResponse>,
  idParam: number
) {
  const cookieToken = req.cookies.get("LEAP_AUTH")?.value;
  const bearerToken = req.headers.get("Authorization")?.startsWith("Bearer ")
    ? req.headers.get("Authorization")?.split(" ")[1]
    : null;

  if (!cookieToken && !bearerToken) {
    return NextResponse.json(
      { message: "No authentication token provided" },
      { status: 401 }
    );
  }

  const token = cookieToken || bearerToken;

  try {
    const { payload } = await jose.jwtVerify(
      token as string,
      JWT_SECRET_ENCODED
    );
    const tokenData = payload as unknown as JWTPayload;

    if (tokenData.role_id >= ROLE_ID.SKILL_ADMIN) {
      const response = await handler(req);

      if (response instanceof NextResponse || response instanceof Response) {
        return response;
      }
      return NextResponse.json(response);
    }

    const requestedUserId = Number(idParam);

    if (tokenData.userId !== requestedUserId) {
      return NextResponse.json(
        { message: "Cannot access another user's data" },
        { status: 403 }
      );
    }

    const response = await handler(req);

    if (response instanceof NextResponse || response instanceof Response) {
      return response;
    }
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof jose.errors.JWTInvalid) {
      return NextResponse.json(
        { message: "Invalid authentication token" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Authentication error" },
      { status: 401 }
    );
  }
}


export function isSupreme(roleId: number): boolean {
  return roleId === ROLE_ID.SUPREME;
}

export function isSkillAdmin(roleId: number): boolean {
  return roleId >= ROLE_ID.SKILL_ADMIN;
}

export function isActivityAdmin(roleId: number): boolean {
  return roleId >= ROLE_ID.ACTIVITY_ADMIN;
}

export function isStudent(roleId: number): boolean {
  return roleId >= ROLE_ID.STUDENT;
}

export function isAlumni(roleId: number): boolean {
  return roleId >= ROLE_ID.ALUMNI;
}

export function isUser(roleId: number): boolean {
  return roleId >= ROLE_ID.USER;
}