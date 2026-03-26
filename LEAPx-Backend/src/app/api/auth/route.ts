import { NextRequest, NextResponse } from "next/server";
import { sign, verify } from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { AuthRequest } from "@/types/AuthRequest";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { getStudentYear } from "@/middleware/auth";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set in environment");
const JWT_SECRET = process.env.JWT_SECRET;

async function getNextAvailableId(): Promise<number> {
  const MAX_ID = 99999999;
  const users = await prisma.user.findMany({
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  if (users.length === 0) return 1;

  for (let i = 0; i < users.length; i++) {
    const expectedId = i + 1;
    if (users[i].id !== expectedId) {
      if (expectedId > MAX_ID) {
        throw new Error("No available ID found (max 99999999)");
      }
      return expectedId;
    }
  }
  const nextId = users.length + 1;
  if (nextId > MAX_ID) {
    throw new Error("No available ID found (max 99999999)");
  }

  return nextId;
}

// Function to generate JWT token
function generateToken(userId: number): string {
  return sign(
    { userId, timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

// Handle CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  return handleCorsPreFlight(req);
}

export async function POST(req: NextRequest) {
  try {
    const body: AuthRequest = await req.json();
    const { cmu_id, email, Fname, Lname, faculty, picture } = body;

    // if (!LEAP_Code || LEAP_Code !== process.env.LEAP_CODE) {
    //   const response = NextResponse.json(
    //     { error: "Invalid Login or Registration" },
    //     { status: 403 }
    //   );
    //   return addCorsHeaders(response, req);
    // }

    // Validate required fields
    if (!email || !Fname  || !faculty) {
      const response = NextResponse.json(
        { error: "Missing required fields: email, Fname, faculty" },
        { status: 400 }
      );
      return addCorsHeaders(response, req);
    }

    let user;
    let isNewUser = false;

    // If ID is provided, validate the scenario
    if (cmu_id) {
      const userId = parseInt(cmu_id);
      if (isNaN(userId) || userId <= 0 ) {
        const response = NextResponse.json(
          { error: "Invalid ID format (must be 1-99999999)" },
          { status: 400 }
        );
        return addCorsHeaders(response, req);
      }

      // Check if user exists with this ID
      const userById = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
      });

      // Check if email exists (with any ID)
      const userByEmail = await prisma.user.findUnique({
        where: { email },
        include: { role: true }
      });

      // Case 1: Both ID and email exist, but they're different users
      if (userById && userByEmail && userById.id !== userByEmail.id) {
        const response = NextResponse.json(
          { error: `Email ${email} already exists with ID ${userByEmail.id}, but you're trying to use ID ${userId}` },
          { status: 409 }
        );
        return addCorsHeaders(response, req);
      }

      // Case 2: ID exists but email is different (update existing user)
      if (userById && !userByEmail) {
        // This means we're updating an existing user with new email
        const response = NextResponse.json(
          { error: `ID ${userId} already exists with email ${userById.email}, cannot change to new email ${email}` },
          { status: 409 }
        );
        return addCorsHeaders(response, req);
      }

      // Case 3: Email exists with same ID (normal login/update)
      else if (userById && userByEmail && userById.id === userByEmail.id) {
        user = await prisma.user.update({
          where: { id: userId },
          data: {
            firstName: Fname,
            lastName: Lname || "-",
            faculty: faculty || "outsider",
            photo: picture || userById.photo,
            updatedAt: new Date()
          },
          include: { role: true }
        });
        isNewUser = false;
      }

      // Case 4: Neither ID nor email exist (create new user with specified ID)
      else if (!userById && !userByEmail) {
        user = await prisma.user.create({
          data: {
            id: userId,
            firstName: Fname,
            lastName: Lname || "-",
            email,
            faculty: faculty || "outsider",
            photo: picture,
            role_id: 1, // USER role
            isActive: true
          },
          include: { role: true }
        });
        isNewUser = true;
      }

    } else {
      // No ID provided, check by email first
      user = await prisma.user.findUnique({
        where: { email },
        include: {
          role: true
        }
      });

      if (!user) {
        // Get next available ID
        const nextId = await getNextAvailableId();
        
        // Create new user
        user = await prisma.user.create({
          data: {
            id: nextId,
            firstName: Fname,
            lastName: Lname || "-",
            email,
            faculty: faculty || "outsider",
            photo: picture,
            role_id: 1, // STUDENT role
            isActive: true
          },
          include: {
            role: true
          }
        });
        isNewUser = true;
      }
    }

    // Check if user is active
    if (!user || !user.isActive) {
      const response = NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 }
      );
      return addCorsHeaders(response, req);
    }

    // Update user info if it's an existing user (login case)
    if (!isNewUser) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: Fname,
          lastName: Lname || "-",
          faculty: faculty || "outsider",
          photo: picture || user.photo,
          updatedAt: new Date()
        },
        include: {
          role: true
        }
      });
    }

    // Generate tokens
    const authToken = generateToken(user.id);
    const leapToken = sign(
      { userId: user.id, role: user.role.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const response = NextResponse.json({
      success: true,
      message: isNewUser ? "Registration successful" : "Login successful",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        faculty: user.faculty || "outsider",
        photo: user.photo,
        // role: user.role.name,
        // isActive: user.isActive
      },
      token: authToken,
      isNewUser
    });

    // Set cookies
    response.cookies.set("LEAP_AUTH", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1 * 24 * 60 * 60, // 1 day
      sameSite: "strict",
      path: "/",
    });

    response.cookies.set("LEAP_USER", leapToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1 * 24 * 60 * 60, // 1 day
      sameSite: "strict",
      path: "/",
    });

    return addCorsHeaders(response, req);

  } catch (error) {
    console.error("Auth error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const response = NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
    return addCorsHeaders(response, req);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const response = NextResponse.json({ 
      success: true,
      message: "Logged out successfully" 
    });

    // Clear cookies
    response.cookies.set("LEAP_AUTH", "", {
      maxAge: 0,
      path: "/",
    });

    response.cookies.set("LEAP_USER", "", {
      maxAge: 0,
      path: "/",
    });

    return addCorsHeaders(response, req);
  } catch (error) {
    console.error("Logout error:", error);
    const response = NextResponse.json(
      { error: "Error logging out" },
      { status: 500 }
    );
    return addCorsHeaders(response, req);
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("LEAP_AUTH")?.value;
    const leapToken = req.cookies.get("LEAP_USER")?.value;
    
    if (!token || !leapToken) {
      const response = NextResponse.json(
        { error: "No token provided" },
        { status: 401 }
      );
      response.cookies.set("LEAP_AUTH", "", { maxAge: 0, path: "/" });
      response.cookies.set("LEAP_USER", "", { maxAge: 0, path: "/" });
      return addCorsHeaders(response, req);
    }

    // Verify token
    const decoded = verify(token, JWT_SECRET) as { userId: number };
    const leapDecoded = verify(leapToken, JWT_SECRET) as { userId: number, role: string };

    if (decoded.userId !== leapDecoded.userId) {
      const response = NextResponse.json(
        { error: "Token mismatch" },
        { status: 401 }
      );
      response.cookies.set("LEAP_AUTH", "", { maxAge: 0, path: "/" });
      response.cookies.set("LEAP_USER", "", { maxAge: 0, path: "/" });
      return addCorsHeaders(response, req);
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: true,
        // mainSkillLevels: {
        //   include: {
        //     mainSkillCategory: true
        //   }
        // },
        // subSkillLevels: {
        //   include: {
        //     subSkillCategory: true
        //   }
        // }
      }
    });

    if (!user || !user.isActive) {
      const response = NextResponse.json(
        { error: "User not found or inactive" },
        { status: 404 }
      );
      return addCorsHeaders(response, req);
    }

    const CMU_YEAR = await getStudentYear(user.id);
    
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        faculty: user.faculty,
        major: user.major,
        // phone: user.phone,
        photo: user.photo,
        // role: user.role.name,
        isActive: user.isActive,
        CMU_YEAR
        // createdAt: user.createdAt,
        // mainSkillLevels: user.mainSkillLevels,
        // subSkillLevels: user.subSkillLevels
      }
    });

    return addCorsHeaders(response, req);

  } catch (error) {
    console.error("Get user error:", error);
    
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      const response = NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );

      response.cookies.set("LEAP_AUTH", "", { maxAge: 0, path: "/" });
      response.cookies.set("LEAP_USER", "", { maxAge: 0, path: "/" });

      return addCorsHeaders(response, req);
    }

    const response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    return addCorsHeaders(response, req);
  }
}