import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth } from './auth';
import { logger } from '../../logging';
import { sendErrorResponse } from './errorHandler';

// Import Express types extension
import '../../types/express';

// Role hierarchy - higher roles include permissions of lower roles
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.USER, UserRole.GUEST],
  [UserRole.USER]: [UserRole.USER, UserRole.GUEST],
  [UserRole.GUEST]: [UserRole.GUEST],
};

// Role descriptions for OpenAPI documentation
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Full system access - can perform all operations',
  [UserRole.USER]: 'User access - can view and edit their own content',
  [UserRole.GUEST]: 'Guest access - can view public content',
};

export interface RoleRequirementOptions {
  /** Use hierarchical role checking (ADMIN includes all other roles) */
  hierarchical?: boolean;
  /** Custom description for OpenAPI documentation */
  description?: string;
}

/**
 * Enhanced role-based access control middleware with OpenAPI integration
 * @param allowedRoles Array of roles that can access this endpoint
 * @param options Configuration options for role checking
 */
export function requireRoles(
  allowedRoles: UserRole[],
  options: RoleRequirementOptions = {}
) {
  const { hierarchical = true, description } = options;

  return [
    // First ensure user is authenticated
    requireAuth,
    
    // Then check role permissions
    (req: Request, res: Response, next: NextFunction) => {
      const traceId = res.locals.traceId || 'unknown';
      
      if (!req.user) {
        return sendErrorResponse({
          req,
          res,
          errorCode: 'INTERNAL_ERROR',
          logMessage: 'requireRoles called without valid user session',
        });
      }

      // Store role requirements for OpenAPI documentation
      res.locals.requiredRoles = allowedRoles;
      res.locals.roleDescription = description;
      res.locals.hierarchicalRoles = hierarchical;

      // Check if user has any of the required roles
      const hasRequiredRole = allowedRoles.some(requiredRole => {
        if (hierarchical) {
          // Check if any of the user's roles include the required role in hierarchy
          return req.user!.roles.some(userRole => 
            ROLE_HIERARCHY[userRole]?.includes(requiredRole)
          );
        } else {
          // Direct role match only
          return req.user!.roles.includes(requiredRole);
        }
      });
      
      if (!hasRequiredRole) {
        return sendErrorResponse({
          req,
          res,
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          logMessage: `Insufficient role permissions. Access denied. User ID: ${req.user.id}, Required roles: ${allowedRoles.join(', ')}`,
          context: {
            userId: req.user.id,
            userRoles: req.user.roles,
            requiredRoles: allowedRoles,
            hierarchical,
          },
          details: [
            {
              path: 'roles',
              message: `User roles: ${req.user.roles.join(', ')}. Required: ${allowedRoles.join(', ')}`,
            },
          ],
        });
      }

      logger.debug('Role authorization successful', {
        traceId,
        userId: req.user.id,
        userRoles: req.user.roles,
        requiredRoles: allowedRoles,
        hierarchical,
      });

      next();
    }
  ];
}

/**
 * Convenience functions for common role combinations
 */
export const requireAdmin = () => requireRoles([UserRole.ADMIN]);

export const requireUser = () => requireRoles([UserRole.USER, UserRole.ADMIN], {
  description: 'User access required'
});

export const requireGuest = () => requireRoles([UserRole.GUEST, UserRole.USER, UserRole.ADMIN], {
  description: 'Guest access required'
});

/**
 * Utility function to get effective permissions for a user
 * @param userRoles Array of user's roles
 * @param hierarchical Whether to use hierarchical role checking
 */
export function getEffectivePermissions(userRoles: UserRole[], hierarchical: boolean = true): UserRole[] {
  if (!hierarchical) {
    return userRoles;
  }

  const effectiveRoles = new Set<UserRole>();
  
  userRoles.forEach(role => {
    const hierarchyRoles = ROLE_HIERARCHY[role] || [role];
    hierarchyRoles.forEach(r => effectiveRoles.add(r));
  });

  return Array.from(effectiveRoles);
}

/**
 * Check if user has specific role permission
 * @param userRoles Array of user's roles
 * @param requiredRole Role to check for
 * @param hierarchical Whether to use hierarchical checking
 */
export function hasRolePermission(
  userRoles: UserRole[], 
  requiredRole: UserRole, 
  hierarchical: boolean = true
): boolean {
  if (!hierarchical) {
    return userRoles.includes(requiredRole);
  }

  return userRoles.some(userRole => 
    ROLE_HIERARCHY[userRole]?.includes(requiredRole)
  );
}
