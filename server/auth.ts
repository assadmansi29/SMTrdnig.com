import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Database, UserRecord, UserRole } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'smtrading_super_secret_jwt_key_2026';
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
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function sanitizeUser(user: UserRecord) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
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
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
    const user = Database.findUserById(decoded.id);

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

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Requires one of [${roles.join(', ')}] permissions. Your current role is '${req.user.role}'.`
      });
      return;
    }

    next();
  };
}

export function requireActiveSubscription(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  // Admins and Employees have permanent internal access
  if (req.user.role === 'admin' || req.user.role === 'employee') {
    next();
    return;
  }

  if (req.user.subscriptionStatus !== 'active') {
    res.status(403).json({
      error: 'Subscription required or expired.',
      subscriptionStatus: req.user.subscriptionStatus,
      expiresAt: req.user.subscriptionExpiresAt,
      code: 'SUBSCRIPTION_INACTIVE'
    });
    return;
  }

  // Check date expiration
  const expDate = new Date(req.user.subscriptionExpiresAt);
  if (expDate < new Date()) {
    // Automatically update to expired
    Database.updateUser(req.user.id, { subscriptionStatus: 'expired' });
    res.status(403).json({
      error: 'Subscription has expired. Please renew your membership.',
      subscriptionStatus: 'expired',
      expiresAt: req.user.subscriptionExpiresAt,
      code: 'SUBSCRIPTION_EXPIRED'
    });
    return;
  }

  next();
}
