import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Database, UserRecord, UserRole, RolePermissions, DEFAULT_ROLE_PERMISSIONS } from './db';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length > 0) {
    return secret.trim();
  }
  return 'smtrading_jwt_secure_session_key_europe_west2_2026_prod';
}

const TOKEN_EXPIRY = '7d';

export interface AuthRequest extends Request {
  user?: UserRecord;
}

export function generateToken(user: UserRecord): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
    },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function sanitizeUser(user: UserRecord, viewerRole?: UserRole) {
  const { passwordHash, ...safe } = user;

  // Coach viewing: strict sanitization (no financials, no email, no phone)
  if (viewerRole === 'coach') {
    return {
      id: safe.id,
      username: safe.username,
      fullName: safe.fullName,
      avatarUrl: safe.avatarUrl,
      role: safe.role,
      assignedCoachId: safe.assignedCoachId,
      coachSpecialty: safe.coachSpecialty,
      trainingStatus: safe.trainingStatus || 'active_training',
      trainingProgress: safe.trainingProgress || [],
      notes: safe.notes,
      createdAt: safe.createdAt,
    };
  }

  // Employee viewing: operational sanitization (no financials, no private email/phone)
  if (viewerRole === 'employee') {
    return {
      id: safe.id,
      username: safe.username,
      fullName: safe.fullName,
      avatarUrl: safe.avatarUrl,
      role: safe.role,
      subscriptionPlan: safe.subscriptionPlan,
      createdAt: safe.createdAt,
    };
  }

  return safe;
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token && req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; username: string };
    const user = await Database.findUserById(decoded.id);

    if (!user) {
      res.status(401).json({ error: 'User no longer exists or session expired.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    // Super Admin has full and unrestricted control over all role gates
    if (req.user.role === 'super_admin') {
      next();
      return;
    }

    if (roles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({
      error: `Access denied. Requires one of [${roles.join(', ')}] permissions. Your current role is '${req.user.role}'.`
    });
  };
}

export function requirePermission(permissionKey: keyof RolePermissions) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    // Super Admin has full, unrestricted control across all gates and permissions
    if (req.user.role === 'super_admin') {
      next();
      return;
    }

    // Check individual user permission override if explicitly specified
    if (req.user.permissions && typeof req.user.permissions[permissionKey] === 'boolean') {
      if (req.user.permissions[permissionKey]) {
        next();
        return;
      } else {
        res.status(403).json({
          error: `Access denied. Permission '${permissionKey}' is revoked for your account.`,
          code: 'PERMISSION_DENIED',
          permission: permissionKey,
        });
        return;
      }
    }

    try {
      // Connect directly to live dynamic rbac_settings in database
      const rbacSettings = await Database.getRBACSettings();
      const rolePerms = rbacSettings[req.user.role];

      if (rolePerms && rolePerms[permissionKey] === true) {
        next();
        return;
      }

      res.status(403).json({
        error: `Access denied. Role '${req.user.role}' lacks required permission '${permissionKey}'.`,
        code: 'PERMISSION_DENIED',
        permission: permissionKey,
        role: req.user.role,
      });
    } catch (err: any) {
      // Graceful fallback to static defaults if DB is temporarily unreachable
      const defaultRolePerms = DEFAULT_ROLE_PERMISSIONS[req.user.role];
      if (defaultRolePerms && defaultRolePerms[permissionKey] === true) {
        next();
        return;
      }

      res.status(403).json({
        error: `Access denied. Required permission '${permissionKey}' could not be verified.`,
        code: 'PERMISSION_DENIED',
        permission: permissionKey,
      });
    }
  };
}

export async function requireActiveSubscription(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  // Super Admins, Admins, Employees, and Coaches have permanent institutional staff access
  if (['super_admin', 'admin', 'employee', 'coach'].includes(req.user.role)) {
    next();
    return;
  }

  if (req.user.subscriptionStatus !== 'active') {
    const isExpired = req.user.subscriptionStatus === 'expired';
    res.status(403).json({
      error: isExpired ? 'Subscription has expired. Please renew your membership.' : 'Active subscription required.',
      subscriptionStatus: req.user.subscriptionStatus,
      expiresAt: req.user.subscriptionExpiresAt,
      code: isExpired ? 'SUBSCRIPTION_EXPIRED' : 'SUBSCRIPTION_INACTIVE'
    });
    return;
  }

  // Check date expiration
  if (req.user.subscriptionExpiresAt) {
    const expDate = new Date(req.user.subscriptionExpiresAt);
    if (!isNaN(expDate.getTime()) && expDate < new Date()) {
      // Automatically update to expired in DB
      await Database.updateUser(req.user.id, { subscriptionStatus: 'expired' });
      res.status(403).json({
        error: 'Subscription has expired. Please renew your membership.',
        subscriptionStatus: 'expired',
        expiresAt: req.user.subscriptionExpiresAt,
        code: 'SUBSCRIPTION_EXPIRED'
      });
      return;
    }
  }

  next();
}
