import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { User, SafeUser } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'smartbus-transport-secret-key-2026-prod';

export function signToken(user: SafeUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      collegeId: user.collegeId,
      status: user.status,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function sanitizeUser(user: User): SafeUser {
  const { passwordHash, ...safe } = user;
  return safe;
}

export interface AuthRequest extends Request {
  user?: SafeUser;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query?.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as SafeUser;
      const freshUser = db.getUserById(decoded.id);
      if (freshUser && freshUser.status !== 'inactive') {
        req.user = sanitizeUser(freshUser);
      }
    } catch (err) {
      // Invalid or expired token
    }
  }
  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: allowedRoles.includes('admin')
          ? 'Access denied: Changes to fleet, Tirunelveli routes, and bus stops are handled strictly by authorized administrators only.'
          : `Access denied. Requires one of: ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
}

// In-memory rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

export function checkLoginRateLimit(ipOrEmail: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ipOrEmail);
  if (!record) {
    loginAttempts.set(ipOrEmail, { count: 1, firstAttempt: now });
    return true;
  }

  // Reset window after 5 minutes
  if (now - record.firstAttempt > 5 * 60 * 1000) {
    loginAttempts.set(ipOrEmail, { count: 1, firstAttempt: now });
    return true;
  }

  if (record.count >= 15) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
}
