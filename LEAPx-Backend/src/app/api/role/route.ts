import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserId, withActivityAdminAuth } from "@/middleware/auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { ROLE_ID, ROLE_NAME } from "@/utils/constants";

//todo : add table for save log {who change, old_role, new_role, when}

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreFlight(req);
}

export async function GET(request: NextRequest) {
  return withActivityAdminAuth(request, async (request: NextRequest) => {
    try {
      const actingUserId = getUserId(request);
      if (actingUserId === undefined || typeof actingUserId !== "number") {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid token" }, { status: 400 }),
          request
        );
      }

      const { searchParams } = new URL(request.url);
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
      );
      const skip = (page - 1) * limit;

      const search = (searchParams.get("search") || "").trim();
      const majorCategoryIdQuery = searchParams.get("majorCategoryId");
      const majorCategoryId =
        majorCategoryIdQuery !== null ? Number(majorCategoryIdQuery) : null;

      if (
        majorCategoryIdQuery !== null &&
        (!Number.isInteger(majorCategoryId) || Number(majorCategoryId) <= 0)
      ) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "majorCategoryId must be a positive integer" },
            { status: 400 }
          ),
          request
        );
      }

      const actingUser = await prisma.user.findUnique({
        where: { id: actingUserId },
        include: {
          role: true,
          majorAdmins: {
            where: { isActive: true },
            select: { majorCategory_id: true },
          },
        },
      });

      if (!actingUser) {
        return addCorsHeaders(
          NextResponse.json({ error: "User not found" }, { status: 404 }),
          request
        );
      }

      const isSupreme = actingUser.role.name === ROLE_NAME.SUPREME;
      const actorMajorCategoryIds = actingUser.majorAdmins.map(
        (admin) => admin.majorCategory_id
      );

      if (!isSupreme && actorMajorCategoryIds.length === 0) {
        return addCorsHeaders(
          NextResponse.json(
            {
              error:
                "You don't have permission to manage roles because you are not assigned to any major category",
            },
            { status: 403 }
          ),
          request
        );
      }

      const whereClause: Record<string, unknown> = {};

      if (search) {
        const searchOrFilters: Array<
          | { firstName: { contains: string; mode: "insensitive" } }
          | { lastName: { contains: string; mode: "insensitive" } }
          | { email: { contains: string; mode: "insensitive" } }
          | { id: number }
        > = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];

        const numericSearch = Number(search);
        if (Number.isInteger(numericSearch) && numericSearch > 0) {
          searchOrFilters.push({ id: numericSearch });
        }

        whereClause.OR = searchOrFilters;
      }

      if (majorCategoryId !== null && !isSupreme) {
        if (!actorMajorCategoryIds.includes(majorCategoryId)) {
          return addCorsHeaders(
            NextResponse.json(
              {
                error:
                  "You can only view users in your managed major categories",
              },
              { status: 403 }
            ),
            request
          );
        }
      }

      if (majorCategoryId !== null) {
        whereClause.majorAdmins = {
          some: {
            isActive: true,
            majorCategory_id: majorCategoryId,
          },
        };
      } else if (!isSupreme) {
        whereClause.majorAdmins = {
          some: {
            isActive: true,
            majorCategory_id: {
              in: actorMajorCategoryIds,
            },
          },
        };
      }

      const [totalCount, users] = await prisma.$transaction([
        prisma.user.count({ where: whereClause }),
        prisma.user.findMany({
          where: whereClause,
          skip,
          take: limit,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
            majorAdmins: {
              where: { isActive: true },
              select: {
                role: true,
                majorCategory_id: true,
                majorCategory: {
                  select: {
                    id: true,
                    code: true,
                    name_TH: true,
                    name_EN: true,
                  },
                },
              },
              orderBy: {
                majorCategory_id: "asc",
              },
            },
          },
          orderBy: [{ id: "asc" }],
        }),
      ]);

      const data = users.map((user) => {
        const targetMajorIds = user.majorAdmins.map(
          (admin) => admin.majorCategory_id
        );
        const editableMajorCategoryIds = isSupreme
          ? targetMajorIds
          : targetMajorIds.filter((id) => actorMajorCategoryIds.includes(id));

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          currentRole: {
            id: user.role.id,
            name: user.role.name,
          },
          majorCategories: user.majorAdmins.map((admin) => ({
            id: admin.majorCategory.id,
            code: admin.majorCategory.code,
            name_TH: admin.majorCategory.name_TH,
            name_EN: admin.majorCategory.name_EN,
            majorAdminRole: admin.role,
          })),
          permission: {
            canEdit: isSupreme || editableMajorCategoryIds.length > 0,
            editableMajorCategoryIds,
          },
        };
      });

      const totalPages = Math.ceil(totalCount / limit);
      return addCorsHeaders(
        NextResponse.json({
          success: true,
          data,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
          access: {
            role: actingUser.role.name,
            isSupreme,
            managedMajorCategoryIds: isSupreme ? "ALL" : actorMajorCategoryIds,
          },
        }),
        request
      );
    } catch (error) {
      console.error("Get role management list error:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 }
        ),
        request
      );
    }
  });
}

export async function PATCH(request: NextRequest) {
  return withActivityAdminAuth(request, async (request: NextRequest) => {
    try {
      const { user_id, new_role_id } = await request.json();
      const targetUserId = Number(user_id);
      const newRoleId = Number(new_role_id);

      if (!targetUserId || !newRoleId) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "user_id and new_role_id are required" },
            { status: 400 }
          ),
          request
        );
      }

      if (!Number.isInteger(targetUserId) || !Number.isInteger(newRoleId)) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "user_id and new_role_id must be integers" },
            { status: 400 }
          ),
          request
        );
      }

      const actingUserId = getUserId(request);
      if (!actingUserId || typeof actingUserId !== "number") {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid token" }, { status: 400 }),
          request
        );
      }

      const [actingUser, targetUser, targetRole] = await prisma.$transaction([
        prisma.user.findUnique({
          where: { id: actingUserId },
          include: {
            role: true,
            majorAdmins: {
              where: { isActive: true },
              select: { majorCategory_id: true },
            },
          },
        }),
        prisma.user.findUnique({
          where: { id: targetUserId },
          include: {
            role: true,
            majorAdmins: {
              where: { isActive: true },
              select: { majorCategory_id: true },
            },
          },
        }),
        prisma.role.findUnique({
          where: { id: newRoleId },
          select: { id: true, name: true },
        }),
      ]);

      if (!actingUser || !targetUser) {
        return addCorsHeaders(
          NextResponse.json({ error: "User not found" }, { status: 404 }),
          request
        );
      }

      if (!targetRole) {
        return addCorsHeaders(
          NextResponse.json({ error: "Target role not found" }, { status: 400 }),
          request
        );
      }

      const isSupreme = actingUser.role.name === ROLE_NAME.SUPREME;

      if (!isSupreme) {
        const actorMajorIds = actingUser.majorAdmins.map(
          (admin) => admin.majorCategory_id
        );
        if (actorMajorIds.length === 0) {
          return addCorsHeaders(
            NextResponse.json(
              { error: "You do not have any managed major categories" },
              { status: 403 }
            ),
            request
          );
        }

        if (
          targetUser.role_id >= ROLE_ID.SKILL_ADMIN ||
          newRoleId >= ROLE_ID.SKILL_ADMIN
        ) {
          return addCorsHeaders(
            NextResponse.json(
              {
                error:
                  "Category admin can only update roles below SKILL_ADMIN",
              },
              { status: 403 }
            ),
            request
          );
        }

        const targetMajorIds = targetUser.majorAdmins.map(
          (admin) => admin.majorCategory_id
        );
        const hasSharedCategory = targetMajorIds.some((id) =>
          actorMajorIds.includes(id)
        );

        if (!hasSharedCategory) {
          return addCorsHeaders(
            NextResponse.json(
              {
                error:
                  "You can only change role for users in your managed categories",
              },
              { status: 403 }
            ),
            request
          );
        }
      }

      if (targetUser.role_id === newRoleId) {
        return addCorsHeaders(
          NextResponse.json(
            {
              success: true,
              message: "Role is already up to date",
              user: targetUser,
            },
            { status: 200 }
          ),
          request
        );
      }

      const user = await prisma.user.update({
        where: { id: targetUserId },
        data: { role_id: newRoleId },
        include: { role: true },
      });

      return addCorsHeaders(
        NextResponse.json(
          {
            success: true,
            message: "User role updated successfully",
            data: {
              user,
              previousRole: {
                id: targetUser.role_id,
                name: targetUser.role.name,
              },
              newRole: {
                id: targetRole.id,
                name: targetRole.name,
              },
            },
          },
          { status: 200 }
        ),
        request
      );
    } catch (error) {
      return addCorsHeaders(
        NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "Invalid token or request",
          },
          { status: 500 }
        ),
        request
      );
    }
  });
}
