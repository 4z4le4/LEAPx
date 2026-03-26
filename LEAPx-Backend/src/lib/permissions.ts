import { PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * Centralized permission checker for event management
 * Consolidates authorization logic across different routes
 */

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a user can manage an event (create, update, delete)
 * 
 * Rules:
 * - SUPREME: Full access to all events
 * - ACTIVITY_ADMIN: Can manage events in their major categories
 * - Others: No access
 */
export async function canManageEvent(
  userId: number,
  eventId: number,
  prismaClient: PrismaClient = prisma
): Promise<PermissionResult> {
  try {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        majorAdmins: {
          where: { isActive: true },
          select: { majorCategory_id: true }
        }
      }
    });

    if (!user) {
      return { allowed: false, reason: "User not found" };
    }

    // SUPREME has full access
    if (user.role.name === 'SUPREME') {
      return { allowed: true };
    }

    // Get event
    const event = await prismaClient.event.findUnique({
      where: { id: eventId },
      select: { 
        id: true,
        majorCategory_id: true,
        created_by: true
      }
    });

    if (!event) {
      return { allowed: false, reason: "Event not found" };
    }

    // ACTIVITY_ADMIN needs major_admin relationship
    if (user.role.name === 'ACTIVITY_ADMIN') {
      if (event.majorCategory_id) {
        const hasMajorAccess = user.majorAdmins.some(
          admin => admin.majorCategory_id === event.majorCategory_id
        );
        
        if (hasMajorAccess) {
          return { allowed: true };
        }
        
        return { 
          allowed: false, 
          reason: "You don't have permission to manage events in this major category" 
        };
      } else {
        // Event without major category - check if user created it
        if (event.created_by === userId) {
          return { allowed: true };
        }
        
        return { 
          allowed: false, 
          reason: "You don't have permission to manage this event" 
        };
      }
    }

    return { 
      allowed: false, 
      reason: "Insufficient permissions" 
    };
  } catch (error) {
    console.error("Error checking event management permission:", error);
    return { 
      allowed: false, 
      reason: "Error checking permissions" 
    };
  }
}

/**
 * Check if a user can scan QR codes for event check-in/out
 * 
 * Rules:
 * - SUPREME: Can scan all events
 * - ACTIVITY_ADMIN: Can scan events in their major categories
 * - STAFF: Can scan if assigned to event with canScanQR permission
 */
export async function canScanEvent(
  userId: number,
  eventId: number,
  prismaClient: PrismaClient = prisma
): Promise<PermissionResult> {
  try {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        majorAdmins: {
          where: { isActive: true },
          select: { majorCategory_id: true }
        }
      }
    });

    if (!user) {
      return { allowed: false, reason: "User not found" };
    }

    // SUPREME has full access
    if (user.role.name === 'SUPREME') {
      return { allowed: true };
    }

    // Get event
    const event = await prismaClient.event.findUnique({
      where: { id: eventId },
      select: { 
        id: true,
        majorCategory_id: true 
      }
    });

    if (!event) {
      return { allowed: false, reason: "Event not found" };
    }

    // ACTIVITY_ADMIN needs major_admin relationship
    if (user.role.name === 'ACTIVITY_ADMIN') {
      if (event.majorCategory_id) {
        const hasMajorAccess = user.majorAdmins.some(
          admin => admin.majorCategory_id === event.majorCategory_id
        );
        
        if (hasMajorAccess) {
          return { allowed: true };
        }
        
        return { 
          allowed: false, 
          reason: "You don't have permission to scan QR for events in this major category" 
        };
      } else {
        // Event without major - admins can still scan
        return { allowed: true };
      }
    }

    // STAFF needs StaffRole permission
    const staffRole = await prismaClient.eventStaff.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId
        }
      },
      include: {
        role: true
      }
    });

    if (staffRole) {
      if (staffRole.status !== 'REGISTERED') {
        return { 
          allowed: false, 
          reason: "Your staff assignment is not active" 
        };
      }
      
      if (!staffRole.role.canScanQR) {
        return { 
          allowed: false, 
          reason: "Your staff role does not have QR scanning permission" 
        };
      }
      
      return { allowed: true };
    }

    return { 
      allowed: false, 
      reason: "You are not authorized to scan QR for this event" 
    };
  } catch (error) {
    console.error("Error checking event scan permission:", error);
    return { 
      allowed: false, 
      reason: "Error checking permissions" 
    };
  }
}

/**
 * Check if a user can view event details
 * 
 * Rules:
 * - Anyone can view published events
 * - SUPREME can view all events
 * - ACTIVITY_ADMIN can view events in their major categories
 * - STAFF can view events they're assigned to
 * - Creator can view their own events
 */
export async function canViewEvent(
  userId: number,
  eventId: number,
  prismaClient: PrismaClient = prisma
): Promise<PermissionResult> {
  try {
    const event = await prismaClient.event.findUnique({
      where: { id: eventId },
      select: { 
        id: true,
        status: true,
        majorCategory_id: true,
        created_by: true
      }
    });

    if (!event) {
      return { allowed: false, reason: "Event not found" };
    }

    // Published events are visible to everyone
    if (event.status === 'PUBLISHED') {
      return { allowed: true };
    }

    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        majorAdmins: {
          where: { isActive: true },
          select: { majorCategory_id: true }
        }
      }
    });

    if (!user) {
      return { allowed: false, reason: "User not found" };
    }

    // SUPREME can view all
    if (user.role.name === 'SUPREME') {
      return { allowed: true };
    }

    // Creator can view their own
    if (event.created_by === userId) {
      return { allowed: true };
    }

    // ACTIVITY_ADMIN can view events in their majors
    if (user.role.name === 'ACTIVITY_ADMIN' && event.majorCategory_id) {
      const hasMajorAccess = user.majorAdmins.some(
        admin => admin.majorCategory_id === event.majorCategory_id
      );
      
      if (hasMajorAccess) {
        return { allowed: true };
      }
    }

    // Check if user is staff
    const isStaff = await prismaClient.eventStaff.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId
        }
      }
    });

    if (isStaff) {
      return { allowed: true };
    }

    return { 
      allowed: false, 
      reason: "You don't have permission to view this event" 
    };
  } catch (error) {
    console.error("Error checking event view permission:", error);
    return { 
      allowed: false, 
      reason: "Error checking permissions" 
    };
  }
}

/**
 * Helper function to check if user is SUPREME
 */
export async function isSupremeUser(
  userId: number,
  prismaClient: PrismaClient = prisma
): Promise<boolean> {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    include: { role: true }
  });
  
  return user?.role.name === 'SUPREME';
}

/**
 * Helper function to check if user is ACTIVITY_ADMIN
 */
export async function isActivityAdmin(
  userId: number,
  prismaClient: PrismaClient = prisma
): Promise<boolean> {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    include: { role: true }
  });
  
  return user?.role.name === 'ACTIVITY_ADMIN' || user?.role.name === 'SUPREME';
}
