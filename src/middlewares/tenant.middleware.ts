// src/middlewares/tenant.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/Jwt.Util';
import { prisma } from '../config/database.config';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    clerkUid: string;
    organizationId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

/**
 * Middleware to validate tenant isolation
 * Ensures that the user's organizationId in JWT matches the organization they're trying to access
 */
export const validateTenantAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required',
      });
    }

    // Verify and decode JWT
    const decoded = verifyToken(token);

    if (!decoded.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Invalid token: missing organization context',
      });
    }

    // Verify organization is still active
    const organization = await prisma.organization.findUnique({
      where: { id: decoded.organizationId },
      select: { id: true, isActive: true, name: true },
    });

    if (!organization || !organization.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Organization is inactive or not found',
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.id,
      clerkUid: decoded.clerkUid,
      organizationId: decoded.organizationId,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: decoded.role,
    };

    next();
  } catch (error: any) {
    console.error('❌ Tenant validation error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Middleware to ensure resource belongs to user's organization
 * Use this for routes that access organization-specific resources
 */
export const ensureResourceBelongsToTenant = (resourceOrgIdField: string = 'organizationId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Extract organizationId from request params, query, or body
      const resourceOrgId = 
        req.params[resourceOrgIdField] || 
        req.query[resourceOrgIdField] || 
        (req.body && req.body[resourceOrgIdField]);

      // If resource has organizationId, validate it matches user's org
      if (resourceOrgId && resourceOrgId !== req.user.organizationId) {
        console.warn(
          `⚠️ Tenant isolation violation attempt: User ${req.user.id} (org: ${req.user.organizationId}) tried to access resource from org: ${resourceOrgId}`
        );
        return res.status(403).json({
          success: false,
          message: 'Access denied: resource belongs to different organization',
        });
      }

      next();
    } catch (error: any) {
      console.error('❌ Resource tenant validation error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
};

/**
 * Helper function to add organizationId filter to Prisma queries
 * Use this in your services to automatically scope queries to user's organization
 */
export const getTenantFilter = (organizationId: string) => {
  return { organizationId };
};
