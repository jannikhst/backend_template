import { UserRole } from '@prisma/client';
import { SessionPayload } from '../services/sessionService';
import { ApiKeyWithUser } from '../../modules/api-keys/service';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
        roles: UserRole[];
        isActive: boolean;
      };
      session?: SessionPayload;
      sessionToken?: string;
      apiKey?: ApiKeyWithUser;
      country?: string;
      realIp?: string;
    }
    
    interface Locals {
      traceId?: string;
      requiredRoles?: UserRole[];
      roleDescription?: string;
      hierarchicalRoles?: boolean;
    }
  }
}

// Export empty object to make this a module
export {};
