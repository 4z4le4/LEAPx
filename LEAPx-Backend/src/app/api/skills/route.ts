import { NextRequest, NextResponse } from "next/server";
// import { verify } from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withSkillAdminAuth, withUserAuth} from "@/middleware/auth";
// import { withSkillAdminAuth, withUserAuth, getUserId } from "@/middleware/auth";


//todo : new model calculation exp and level 

import { CreateMainSkillRequest, 
  CreateSubSkillRequest, 
  UpdateMainSkillRequest, 
  UpdateSubSkillRequest, 
  // JWTPayloadSkills, 
  // UserWithRole, 
  // GetSkillsParams, 
  SkillSummary, 
  MainSkillCategoryWithSummary, 
  SubSkillWithLevels, 
  UserSubSkillLevel } from "@/types/skillsTyps";

// if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set in environment");
// const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to verify admin permissions
// async function verifyAdminPermissions(token: string, requiredRole: string[] = ['SUPREME', 'SKILL_ADMIN']): Promise<UserWithRole> {
//   try {
//     const decoded = verify(token, JWT_SECRET) as JWTPayloadSkills;
//     const user = await prisma.user.findUnique({
//       where: { id: decoded.userId },
//       include: { role: true }
//     });

//     if (!user || !user.isActive) {
//       throw new Error("User not found or inactive");
//     }

//     if (!requiredRole.includes(user.role.name)) {
//       throw new Error("Insufficient permissions");
//     }

//     return user;
//   } catch {
//     throw new Error("Authentication failed");
//   }
// }

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
  return withUserAuth(req, async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      
      // Parse parameters
      const skillType = searchParams.get('skillType'); // 'main', 'sub', or null (both)
      const mainSkillId = searchParams.get('mainSkillId'); // For filtering sub skills
      const activeOnly = searchParams.get('activeOnly') !== 'false'; // default true
      const includeSubSkills = searchParams.get('includeSubSkills') === 'true';
      const userId = searchParams.get('userId');
      const includeUserLevels = searchParams.get('includeUserLevels') === 'true';



      
      const LevelThresholds = await prisma.levelThreshold.findMany({
          select: {
              id: true,
              levelType: true,
              expRequired: true,
              levelName_TH: true,
              levelName_EN: true
          }
      });


      // Case 1: Get only Main Skills
      if (skillType === 'main') {
        const whereClause = {
          ...(activeOnly && { isActive: true })
        };

        const includeClause: Record<string, unknown> = {};

        // Include sub skills if requested
        if (includeSubSkills) {
          includeClause.subSkills = {
            where: activeOnly ? { isActive: true } : {},
            orderBy: { sortOrder: 'asc' },
          };

          // Include user levels if requested
          if (userId && includeUserLevels) {
            includeClause.userMainSkillLevels = {
              where: { user_id: parseInt(userId) },
            };
            
            const subSkillsInclude = includeClause.subSkills as Record<string, unknown>;
            subSkillsInclude.include = {
              userSubSkillLevels: {
                where: { user_id: parseInt(userId) },
              },
            };
          }
        }

        const mainSkillCategories = await prisma.mainSkillCategory.findMany({
          where: whereClause,
          include: includeClause,
          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' }
          ],
        });

        // Calculate summary for each main category if user levels are requested
        const categoriesWithSummary: MainSkillCategoryWithSummary[] = mainSkillCategories.map(category => {
          let summary: SkillSummary | null = null;
          
          if (includeSubSkills && userId && includeUserLevels && category.subSkills) {
            const subSkills = category.subSkills as SubSkillWithLevels[];
            const subSkillLevels = subSkills
              .map(sub => sub.userSubSkillLevels?.[0])
              .filter((level): level is UserSubSkillLevel => Boolean(level));

            if (subSkillLevels.length > 0) {
              const levels = subSkillLevels.map(level => level.currentLevel);
              
              summary = {
                maxLevel: Math.max(...levels),
                averageLevel: levels.reduce((sum, level) => sum + level, 0) / levels.length,
                completedSubSkills: levels.filter(level => level > 0).length,
                totalSubSkills: subSkills.length,
              };
            } else {
              summary = {
                maxLevel: 0,
                averageLevel: 0,
                totalExp: 0,
                completedSubSkills: 0,
                totalSubSkills: subSkills?.length || 0,
              };
            }
          }

          return {
            ...category,
            summary,
          };
        });

        const response = NextResponse.json({
          success: true,
          type: 'main',
          levelThresholds: LevelThresholds,
          data: categoriesWithSummary,
          total: mainSkillCategories.length
        });
        return addCorsHeaders(response, req);
      }

      // Case 2: Get only Sub Skills
      if (skillType === 'sub') {
        const whereClause: Record<string, unknown> = {
          ...(activeOnly && { isActive: true }),
          ...(mainSkillId && { mainSkillCategory_id: parseInt(mainSkillId) })
        };

        const includeClause: Record<string, unknown> = {
          mainSkillCategory: {
            select: {
              id: true,
              name_TH: true,
              name_EN: true,
              slug: true,
              icon: true,
              color: true,
              isActive: true
            }
          }
        };

        // Include user levels if requested
        if (userId && includeUserLevels) {
          includeClause.userSubSkillLevels = {
            where: { user_id: parseInt(userId) },
          };
        }

        const subSkillCategories = await prisma.subSkillCategory.findMany({
          where: whereClause,
          include: includeClause,
          orderBy: [
            { mainSkillCategory_id: 'asc' },
            { sortOrder: 'asc' },
            { id: 'asc' }
          ],
        });

        // Group by main category if no specific mainSkillId
        let responseData;
        if (!mainSkillId) {
          // Group sub skills by main category
          const groupedData = subSkillCategories.reduce((acc, subSkill) => {
            const mainCategoryId = subSkill.mainSkillCategory_id;
            if (!acc[mainCategoryId]) {
              acc[mainCategoryId] = {
                mainSkillCategory: subSkill.mainSkillCategory,
                subSkills: []
              };
            }
            acc[mainCategoryId].subSkills.push(subSkill);
            return acc;
          }, {} as Record<number, { mainSkillCategory: unknown; subSkills: unknown[] }>);

          responseData = Object.values(groupedData);
        } else {
          responseData = subSkillCategories;
        }

        const response = NextResponse.json({
          success: true,
          type: 'sub',
          levelThresholds: LevelThresholds,
          mainSkillId: mainSkillId ? parseInt(mainSkillId) : null,
          data: responseData,
          total: subSkillCategories.length
        });
        return addCorsHeaders(response, req);
      }

      // Case 3: Get both Main and Sub Skills (when skillType is null/not specified)
      const mainWhereClause = {
        ...(activeOnly && { isActive: true })
      };

      const mainIncludeClause: Record<string, unknown> = {
        subSkills: {
          where: activeOnly ? { isActive: true } : {},
          orderBy: { sortOrder: 'asc' },
        }
      };

      if (userId && includeUserLevels) {
        mainIncludeClause.userMainSkillLevels = {
          where: { user_id: parseInt(userId) },
        };
        
        const subSkillsInclude = mainIncludeClause.subSkills as Record<string, unknown>;
        subSkillsInclude.include = {
          userSubSkillLevels: {
            where: { user_id: parseInt(userId) },
          },
        };
      }

      const allSkills = await prisma.mainSkillCategory.findMany({
        where: mainWhereClause,
        include: mainIncludeClause,
        orderBy: [
          { sortOrder: 'asc' },
          { id: 'asc' }
        ],
      });

      // Calculate summary for main categories
      const skillsWithSummary = allSkills.map(category => {
        let summary: SkillSummary | null = null;
        
        if (userId && includeUserLevels && category.subSkills) {
          const subSkills = category.subSkills as SubSkillWithLevels[];
          const subSkillLevels = subSkills
            .map(sub => sub.userSubSkillLevels?.[0])
            .filter((level): level is UserSubSkillLevel => Boolean(level));

          if (subSkillLevels.length > 0) {
            const levels = subSkillLevels.map(level => level.currentLevel);
            
            summary = {
              maxLevel: Math.max(...levels),
              averageLevel: levels.reduce((sum, level) => sum + level, 0) / levels.length,
              completedSubSkills: levels.filter(level => level > 0).length,
              totalSubSkills: subSkills.length,
            };
          } else {
            summary = {
              maxLevel: 0,
              averageLevel: 0,
              completedSubSkills: 0,
              totalSubSkills: subSkills?.length || 0,
            };
          }
        }

        return {
          ...category,
          summary,
        };
      });

      const response = NextResponse.json({
        success: true,
        type: 'both',
        levelThresholds: LevelThresholds,
        data: skillsWithSummary,
        total: allSkills.length,
        totalSubSkills: allSkills.reduce((sum, cat) => sum + (cat.subSkills?.length || 0), 0)
      });
      return addCorsHeaders(response, req);

    } catch (error) {
      console.error("Get skill categories error:", error);
      const response = NextResponse.json(
        { error: "Failed to fetch skill categories" },
        { status: 500 }
      );
      return addCorsHeaders(response, req);
    }
  });
}


export async function POST(req: NextRequest) {
  return withSkillAdminAuth(req, async (req: NextRequest) => {
  try {
    const token = req.cookies.get("LEAP_AUTH")?.value;
    if (!token) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return addCorsHeaders(response, req);
    }


    const body = await req.json();
    const { type } = body; // 'main' or 'sub'

    if (type === 'main') {
      const data: CreateMainSkillRequest = body;
      
      // Validate required fields
      if (!data.name_TH || !data.name_EN ) {
        const response = NextResponse.json(
          { error: "Missing required fields: name_TH, name_EN" },
          { status: 400 }
        );
        return addCorsHeaders(response, req);
      }

      const slug = data.slug || data.name_EN.toLowerCase().replace(/\s+/g, '-');
      // Check if slug already exists
      const existingSlug = await prisma.mainSkillCategory.findUnique({
        where: { slug: slug }
      });

      if (existingSlug) {
        const response = NextResponse.json(
          { error: "Slug already exists" },
          { status: 409 }
        );
        return addCorsHeaders(response, req);
      }

      const mainSkillCategory = await prisma.mainSkillCategory.create({
        data: {
          name_TH: data.name_TH,
          name_EN: data.name_EN,
          description_TH: data.description_TH,
          description_EN: data.description_EN,
          slug: slug,
          icon: data.icon,
          color: data.color,
          sortOrder: data.sortOrder || 0,
        }
      });

      const response = NextResponse.json({
        success: true,
        message: "Main skill category created successfully",
        data: mainSkillCategory
      });
      return addCorsHeaders(response, req);

    } else if (type === 'sub') {
      const data: CreateSubSkillRequest = body;
      
      // Validate required fields
      if (!data.mainSkillCategory_id || !data.name_TH || !data.name_EN || !data.slug || !data.sortOrder) {
        const response = NextResponse.json(
          { error: "Missing required fields: mainSkillCategory_id, name_TH, name_EN, slug, sortOrder" },
          { status: 400 }
        );
        return addCorsHeaders(response, req);
      }

      // Validate sortOrder (should be 1, 2, or 3)
      if (data.sortOrder < 1 || data.sortOrder > 3) {
        const response = NextResponse.json(
          { error: "sortOrder must be between 1 and 3" },
          { status: 400 }
        );
        return addCorsHeaders(response, req);
      }

      // Check if main skill category exists
      const mainCategory = await prisma.mainSkillCategory.findUnique({
        where: { id: data.mainSkillCategory_id, isActive: true }
      });

      if (!mainCategory) {
        const response = NextResponse.json(
          { error: "Main skill category not found or inactive" },
          { status: 400 }
        );
        return addCorsHeaders(response, req);
      }

      // Check if slug already exists
      const existingSlug = await prisma.subSkillCategory.findUnique({
        where: { slug: data.slug }
      });

      if (existingSlug) {
        const response = NextResponse.json(
          { error: "Slug already exists" },
          { status: 409 }
        );
        return addCorsHeaders(response, req);
      }

      // Check if sortOrder already exists for this main category
      const existingSortOrder = await prisma.subSkillCategory.findFirst({
        where: {
          mainSkillCategory_id: data.mainSkillCategory_id,
          sortOrder: data.sortOrder,
          isActive: true
        }
      });

      if (existingSortOrder) {
        const response = NextResponse.json(
          { error: `Sort order ${data.sortOrder} already exists for this main category` },
          { status: 409 }
        );
        return addCorsHeaders(response, req);
      }

      const subSkillCategory = await prisma.subSkillCategory.create({
        data: {
          mainSkillCategory_id: data.mainSkillCategory_id,
          name_TH: data.name_TH,
          name_EN: data.name_EN,
          description_TH: data.description_TH,
          description_EN: data.description_EN,
          slug: data.slug,
          icon: data.icon,
          color: data.color,
          sortOrder: data.sortOrder,
        },
        include: {
          mainSkillCategory: true,
        }
      });

      const response = NextResponse.json({
        success: true,
        message: "Sub skill category created successfully",
        data: subSkillCategory
      });
      return addCorsHeaders(response, req);

    } else {
      const response = NextResponse.json(
        { error: "Invalid type. Must be 'main' or 'sub'" },
        { status: 400 }
      );
      return addCorsHeaders(response, req);
    }

  } catch (error) {
    console.error("Create skill category error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const response = NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
    return addCorsHeaders(response, req);
  }
  });
}

export async function PUT(req: NextRequest){
  return withSkillAdminAuth(req, async (req: NextRequest) => {
  try {
    const token = req.cookies.get("LEAP_AUTH")?.value;
    if (!token) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return addCorsHeaders(response, req);
    }


    const body = await req.json();
    const { type } = body; // 'main' or 'sub'

    if (type === 'main') {
      const data: UpdateMainSkillRequest = body;
      
      if (!data.id) {
        const response = NextResponse.json(
          { error: "Missing required field: id" },
          { status: 400 }
        );
        return addCorsHeaders(response, req);
      }

      // Check if main skill category exists
      const existing = await prisma.mainSkillCategory.findUnique({
        where: { id: data.id }
      });

      if (!existing) {
        const response = NextResponse.json(
          { error: "Main skill category not found" },
          { status: 404 }
        );
        return addCorsHeaders(response, req);
      }

      // Check slug uniqueness if updating slug
      if (data.slug && data.slug !== existing.slug) {
        const existingSlug = await prisma.mainSkillCategory.findUnique({
          where: { slug: data.slug }
        });

        if (existingSlug) {
          const response = NextResponse.json(
            { error: "Slug already exists" },
            { status: 409 }
          );
          return addCorsHeaders(response, req);
        }
      }

      // Prepare update data
      const updateData: Partial<CreateMainSkillRequest & { isActive: boolean }> = {};
      if (data.name_TH) updateData.name_TH = data.name_TH;
      if (data.name_EN) updateData.name_EN = data.name_EN;
      if (data.description_TH !== undefined) updateData.description_TH = data.description_TH;
      if (data.description_EN !== undefined) updateData.description_EN = data.description_EN;
      if (data.slug) updateData.slug = data.slug;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const updatedCategory = await prisma.mainSkillCategory.update({
        where: { id: data.id },
        data: updateData
      });

      const response = NextResponse.json({
        success: true,
        message: "Main skill category updated successfully",
        data: updatedCategory
      });
      return addCorsHeaders(response, req);

    } else if (type === 'sub') {
      const data: UpdateSubSkillRequest = body;
      
      if (!data.id) {
        const response = NextResponse.json(
          { error: "Missing required field: id" },
          { status: 400 }
        );
        return addCorsHeaders(response, req);
      }

      // Check if sub skill category exists
      const existing = await prisma.subSkillCategory.findUnique({
        where: { id: data.id }
      });

      if (!existing) {
        const response = NextResponse.json(
          { error: "Sub skill category not found" },
          { status: 404 }
        );
        return addCorsHeaders(response, req);
      }

      // Check slug uniqueness if updating slug
      if (data.slug && data.slug !== existing.slug) {
        const existingSlug = await prisma.subSkillCategory.findUnique({
          where: { slug: data.slug }
        });

        if (existingSlug) {
          const response = NextResponse.json(
            { error: "Slug already exists" },
            { status: 409 }
          );
          return addCorsHeaders(response, req);
        }
      }

      // Validate sortOrder if updating
      if (data.sortOrder && (data.sortOrder < 1 || data.sortOrder > 3)) {
        const response = NextResponse.json(
          { error: "sortOrder must be between 1 and 3" },
          { status: 400 }
        );
        return addCorsHeaders(response, req);
      }

      // Check sortOrder uniqueness if updating sortOrder
      if (data.sortOrder && data.sortOrder !== existing.sortOrder) {
        const existingSortOrder = await prisma.subSkillCategory.findFirst({
          where: {
            mainSkillCategory_id: existing.mainSkillCategory_id,
            sortOrder: data.sortOrder,
            isActive: true,
            id: { not: data.id }
          }
        });

        if (existingSortOrder) {
          const response = NextResponse.json(
            { error: `Sort order ${data.sortOrder} already exists for this main category` },
            { status: 409 }
          );
          return addCorsHeaders(response, req);
        }
      }

      // Prepare update data
      const updateData: Partial<CreateSubSkillRequest & { isActive: boolean }> = {};
      if (data.name_TH) updateData.name_TH = data.name_TH;
      if (data.name_EN) updateData.name_EN = data.name_EN;
      if (data.description_TH !== undefined) updateData.description_TH = data.description_TH;
      if (data.description_EN !== undefined) updateData.description_EN = data.description_EN;
      if (data.slug) updateData.slug = data.slug;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const updatedCategory = await prisma.subSkillCategory.update({
        where: { id: data.id },
        data: updateData,
        include: {
          mainSkillCategory: true,
        }
      });

      const response = NextResponse.json({
        success: true,
        message: "Sub skill category updated successfully",
        data: updatedCategory
      });
      return addCorsHeaders(response, req);

    } else {
      const response = NextResponse.json(
        { error: "Invalid type. Must be 'main' or 'sub'" },
        { status: 400 }
      );
      return addCorsHeaders(response, req);
    }

  } catch (error) {
    console.error("Update skill category error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const response = NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
    return addCorsHeaders(response, req);
  }
  });
}

export async function DELETE(req: NextRequest) {
    return withSkillAdminAuth(req, async (req: NextRequest) => {
        try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // 'main' or 'sub'
        const id = searchParams.get('id');

        if (!type || !id) {
            const response = NextResponse.json(
            { error: "Missing required parameters: type and id" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        if (type === 'main') {
            const categoryId = parseInt(id);
            
            // Check if main skill category exists
            const existing = await prisma.mainSkillCategory.findUnique({
            where: { id: categoryId },
            include: {
                subSkills: true, 
                userMainSkillLevels: true,
                // adminCategories: true,
            }
            });

            if (!existing) {
            const response = NextResponse.json(
                { error: "Main skill category not found" },
                { status: 404 }
            );
            return addCorsHeaders(response, req);
            }

            // Check if there are ANY sub skills (active or inactive)
            // if (existing.subSkills.length > 0) {
            // const response = NextResponse.json(
            //     { 
            //     error: "Cannot delete main skill category with sub skills. Please delete all sub skills first.",
            //     details: {
            //         subSkillCount: existing.subSkills.length,
            //         subSkills: existing.subSkills.map(s => ({ 
            //         id: s.id, 
            //         name_EN: s.name_EN, 
            //         isActive: s.isActive 
            //         }))
            //     }
            //     },
            //     { status: 400 }
            // );
            // return addCorsHeaders(response, req);
            // }

            // Check if there are users with levels in this category
            // if (existing.userMainSkillLevels.length > 0) {
            // const response = NextResponse.json(
            //     { 
            //     error: "Cannot delete main skill category with existing user skill levels.",
            //     details: {
            //         userCount: existing.userMainSkillLevels.length,
            //         message: "This skill has been assigned to users and cannot be permanently deleted."
            //     }
            //     },
            //     { status: 400 }
            // );
            // return addCorsHeaders(response, req);
            // }

            // Check if there are admins assigned to this category
            // if (existing.adminCategories.length > 0) {
            // const response = NextResponse.json(
            //     { 
            //     error: "Cannot delete main skill category with assigned admins. Please remove admins first.",
            //     details: {
            //         adminCount: existing.adminCategories.length
            //     }
            //     },
            //     { status: 400 }
            // );
            // return addCorsHeaders(response, req);
            // }

            // Hard delete - permanent removal
            await prisma.mainSkillCategory.delete({
            where: { id: categoryId }
            });

            const response = NextResponse.json({
            success: true,
            message: "Main skill category permanently deleted successfully",
            data: {
                id: categoryId,
                name_EN: existing.name_EN,
                name_TH: existing.name_TH
            }
            });
            return addCorsHeaders(response, req);

        } else if (type === 'sub') {
            const categoryId = parseInt(id);
            
            // Check if sub skill category exists
            const existing = await prisma.subSkillCategory.findUnique({
            where: { id: categoryId },
            include: {
                userSubSkillLevels: true,
                // events: true, 
                experienceHistory: true,
                mainSkillCategory: {
                select: {
                    id: true,
                    name_EN: true,
                    name_TH: true
                }
                }
            }
            });

            if (!existing) {
            const response = NextResponse.json(
                { error: "Sub skill category not found" },
                { status: 404 }
            );
            return addCorsHeaders(response, req);
            }

            // Check if there are users with levels in this category
            if (existing.userSubSkillLevels.length > 0) {
            const response = NextResponse.json(
                { 
                error: "Cannot delete sub skill category with existing user skill levels.",
                details: {
                    userCount: existing.userSubSkillLevels.length,
                    message: "This skill has been assigned to users and cannot be permanently deleted."
                }
                },
                { status: 400 }
            );
            return addCorsHeaders(response, req);
            }

            // todo: re check this and remove 
            // Check if there are ANY events (including cancelled ones)
            // if (existing.events.length > 0) {
            // const activeEvents = existing.events.filter(e => e.status !== 'CANCELLED');
            // const response = NextResponse.json(
            //     { 
            //     error: "Cannot delete sub skill category with existing events.",
            //     details: {
            //         totalEvents: existing.events.length,
            //         activeEvents: activeEvents.length,
            //         message: "This skill is linked to events and cannot be permanently deleted. Please remove or reassign all events first."
            //     }
            //     },
            //     { status: 400 }
            // );
            // return addCorsHeaders(response, req);
            // }

            // Check if there is experience history
            if (existing.experienceHistory.length > 0) {
            const response = NextResponse.json(
                { 
                error: "Cannot delete sub skill category with experience history.",
                details: {
                    historyCount: existing.experienceHistory.length,
                    message: "This skill has experience records and cannot be permanently deleted."
                }
                },
                { status: 400 }
            );
            return addCorsHeaders(response, req);
            }

            // Hard delete - permanent removal
            await prisma.subSkillCategory.delete({
            where: { id: categoryId }
            });

            const response = NextResponse.json({
            success: true,
            message: "Sub skill category permanently deleted successfully",
            data: {
                id: categoryId,
                name_EN: existing.name_EN,
                name_TH: existing.name_TH,
                mainCategory: existing.mainSkillCategory
            }
            });
            return addCorsHeaders(response, req);

        } else {
            const response = NextResponse.json(
            { error: "Invalid type. Must be 'main' or 'sub'" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        } catch (error) {
        console.error("Hard delete skill category error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const response = NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
        }
    });
}

export async function PATCH(req: NextRequest) {
    return withSkillAdminAuth(req, async (req: NextRequest) => {
        try {
            const { searchParams } = new URL(req.url);
            const type = searchParams.get('type'); // 'main' or 'sub'
            const id = searchParams.get('id');

            if (!type || !id) {
                const response = NextResponse.json(
                    { error: "Missing required parameters: type and id" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const body = await req.json();
            const { isActive } = body;

            if (typeof isActive !== 'boolean') {
                const response = NextResponse.json(
                    { error: "isActive must be a boolean value" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            if (type === 'main') {
                const categoryId = parseInt(id);

                // Check if main skill category exists
                const existing = await prisma.mainSkillCategory.findUnique({
                    where: { id: categoryId },
                    include: {
                        subSkills: {
                            where: { isActive: true }
                        }
                    }
                });

                if (!existing) {
                    const response = NextResponse.json(
                        { error: "Main skill category not found" },
                        { status: 404 }
                    );
                    return addCorsHeaders(response, req);
                }

                // Warning if disabling main category with active sub skills
                if (!isActive && existing.subSkills.length > 0) {
                    const response = NextResponse.json(
                        {
                            error: "Cannot disable main skill category with active sub skills",
                            details: {
                                activeSubSkillCount: existing.subSkills.length,
                                activeSubSkills: existing.subSkills.map(s => ({
                                    id: s.id,
                                    name_EN: s.name_EN,
                                    name_TH: s.name_TH
                                })),
                                message: "Please disable all sub skills first before disabling the main category."
                            }
                        },
                        { status: 400 }
                    );
                    return addCorsHeaders(response, req);
                }

                // Update isActive status
                const updated = await prisma.mainSkillCategory.update({
                    where: { id: categoryId },
                    data: { isActive },
                    select: {
                        id: true,
                        name_EN: true,
                        name_TH: true,
                        isActive: true,
                        updatedAt: true
                    }
                });

                const response = NextResponse.json({
                    success: true,
                    message: `Main skill category ${isActive ? 'enabled' : 'disabled'} successfully`,
                    data: updated
                });
                return addCorsHeaders(response, req);

            } else if (type === 'sub') {
                const categoryId = parseInt(id);

                // Check if sub skill category exists
                const existing = await prisma.subSkillCategory.findUnique({
                    where: { id: categoryId },
                    include: {
                        mainSkillCategory: {
                            select: {
                                id: true,
                                name_EN: true,
                                name_TH: true,
                                isActive: true
                            }
                        },
                        // events: {
                        //     where: {
                        //         status: {
                        //             notIn: ['COMPLETED', 'CANCELLED']
                        //         }
                        //     },
                        //     select: {
                        //         id: true,
                        //         title_EN: true,
                        //         status: true
                        //     }
                        // }
                    }
                });

                if (!existing) {
                    const response = NextResponse.json(
                        { error: "Sub skill category not found" },
                        { status: 404 }
                    );
                    return addCorsHeaders(response, req);
                }

                // Check if main category is active when enabling sub skill
                if (isActive && !existing.mainSkillCategory.isActive) {
                    const response = NextResponse.json(
                        {
                            error: "Cannot enable sub skill when main category is disabled",
                            details: {
                                mainCategory: existing.mainSkillCategory,
                                message: "Please enable the main category first."
                            }
                        },
                        { status: 400 }
                    );
                    return addCorsHeaders(response, req);
                }

                // todo: re check this and remove
                // Warning if disabling sub skill with active events
                // if (!isActive && existing.events.length > 0) {
                //     const response = NextResponse.json(
                //         {
                //             error: "Cannot disable sub skill with active or upcoming events",
                //             details: {
                //                 activeEventCount: existing.events.length,
                //                 activeEvents: existing.events,
                //                 message: "Please complete or cancel all active events first."
                //             }
                //         },
                //         { status: 400 }
                //     );
                //     return addCorsHeaders(response, req);
                // }

                // Update isActive status
                const updated = await prisma.subSkillCategory.update({
                    where: { id: categoryId },
                    data: { isActive },
                    select: {
                        id: true,
                        name_EN: true,
                        name_TH: true,
                        isActive: true,
                        mainSkillCategory: {
                            select: {
                                id: true,
                                name_EN: true,
                                name_TH: true
                            }
                        },
                        updatedAt: true
                    }
                });

                const response = NextResponse.json({
                    success: true,
                    message: `Sub skill category ${isActive ? 'enabled' : 'disabled'} successfully`,
                    data: updated
                });
                return addCorsHeaders(response, req);

            } else {
                const response = NextResponse.json(
                    { error: "Invalid type. Must be 'main' or 'sub'" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

        } catch (error) {
            console.error("Toggle isActive error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            const response = NextResponse.json(
                { error: errorMessage },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}