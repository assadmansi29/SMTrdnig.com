import bcrypt from 'bcryptjs';
import dns from 'dns';
import pg from 'pg';
import type { Pool as PgPool, PoolConfig } from 'pg';
const { Pool } = pg;

export type UserRole = 'super_admin' | 'admin' | 'employee' | 'coach' | 'client';
export type SubscriptionStatus = 'active' | 'expired' | 'inactive';

export interface RolePermissions {
  canManageSuperAdmins: boolean;
  canManageAdmins: boolean;
  canManageEmployees: boolean;
  canManageCoaches: boolean;
  canManageClients: boolean;
  canCreateUsers: boolean;
  canDeleteUsers: boolean;
  canResetPasswords: boolean;
  canAdjustBalances: boolean;
  canSetCommissionRates: boolean;
  canManageSubscriptions: boolean;
  canViewTransactions: boolean;
  canManageRBAC: boolean;
  canManageSystemSettings: boolean;
  canManageSecurity: boolean;
  canViewAuditLogs: boolean;
  canAccessOperations: boolean;
  canManageContent: boolean;
  canManageLiveStream: boolean;
  canAccessCoachingDesk: boolean;
  canManageLessons: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    canManageSuperAdmins: true,
    canManageAdmins: true,
    canManageEmployees: true,
    canManageCoaches: true,
    canManageClients: true,
    canCreateUsers: true,
    canDeleteUsers: true,
    canResetPasswords: true,
    canAdjustBalances: true,
    canSetCommissionRates: true,
    canManageSubscriptions: true,
    canViewTransactions: true,
    canManageRBAC: true,
    canManageSystemSettings: true,
    canManageSecurity: true,
    canViewAuditLogs: true,
    canAccessOperations: true,
    canManageContent: true,
    canManageLiveStream: true,
    canAccessCoachingDesk: true,
    canManageLessons: true,
  },
  admin: {
    canManageSuperAdmins: false,
    canManageAdmins: false,
    canManageEmployees: false, // controlled by super_admin
    canManageCoaches: false, // controlled by super_admin
    canManageClients: true,
    canCreateUsers: true, // clients only
    canDeleteUsers: false,
    canResetPasswords: true, // clients only
    canAdjustBalances: false, // super_admin only
    canSetCommissionRates: false, // super_admin only
    canManageSubscriptions: true,
    canViewTransactions: true,
    canManageRBAC: false,
    canManageSystemSettings: false,
    canManageSecurity: false,
    canViewAuditLogs: false,
    canAccessOperations: true,
    canManageContent: true,
    canManageLiveStream: false,
    canAccessCoachingDesk: true,
    canManageLessons: true,
  },
  employee: {
    canManageSuperAdmins: false,
    canManageAdmins: false,
    canManageEmployees: false,
    canManageCoaches: false,
    canManageClients: false, // STRICTLY NO USER MANAGEMENT
    canCreateUsers: false,
    canDeleteUsers: false,
    canResetPasswords: false,
    canAdjustBalances: false,
    canSetCommissionRates: false,
    canManageSubscriptions: false,
    canViewTransactions: false,
    canManageRBAC: false,
    canManageSystemSettings: false,
    canManageSecurity: false,
    canViewAuditLogs: false,
    canAccessOperations: true,
    canManageContent: true,
    canManageLiveStream: true,
    canAccessCoachingDesk: false,
    canManageLessons: false,
  },
  coach: {
    canManageSuperAdmins: false,
    canManageAdmins: false,
    canManageEmployees: false,
    canManageCoaches: false,
    canManageClients: false, // STRICTLY NO USER MANAGEMENT / SENSITIVE DATA
    canCreateUsers: false,
    canDeleteUsers: false,
    canResetPasswords: false,
    canAdjustBalances: false,
    canSetCommissionRates: false,
    canManageSubscriptions: false,
    canViewTransactions: false,
    canManageRBAC: false,
    canManageSystemSettings: false,
    canManageSecurity: false,
    canViewAuditLogs: false,
    canAccessOperations: false,
    canManageContent: false,
    canManageLiveStream: false,
    canAccessCoachingDesk: true,
    canManageLessons: true,
  },
  client: {
    canManageSuperAdmins: false,
    canManageAdmins: false,
    canManageEmployees: false,
    canManageCoaches: false,
    canManageClients: false,
    canCreateUsers: false,
    canDeleteUsers: false,
    canResetPasswords: false,
    canAdjustBalances: false,
    canSetCommissionRates: false,
    canManageSubscriptions: false,
    canViewTransactions: false,
    canManageRBAC: false,
    canManageSystemSettings: false,
    canManageSecurity: false,
    canViewAuditLogs: false,
    canAccessOperations: false,
    canManageContent: false,
    canManageLiveStream: false,
    canAccessCoachingDesk: false,
    canManageLessons: false,
  }
};

export interface TrainingMilestone {
  id: string;
  courseId: string;
  courseName: string;
  completedLessons: number;
  totalLessons: number;
  status: 'in_progress' | 'completed' | 'on_hold';
  lastSessionAt?: string;
  coachNotes?: string;
}

export interface OperationalItemRecord {
  id: string;
  title: string;
  type: 'market_brief' | 'content_review' | 'live_stream_prep' | 'support_ticket';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'resolved';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface AuditLogRecord {
  id: string;
  actorId: string;
  actorUsername: string;
  actorRole: UserRole;
  action: string;
  targetId?: string;
  targetUsername?: string;
  details: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: string;
  subscriptionExpiresAt: string; // ISO date string
  referralCode: string;
  referredBy?: string; // referrer user id or code
  commissionRate: number; // percentage, e.g. 15 for 15%
  balance: number; // available USD commission balance
  pendingBalance: number;
  totalEarned: number; // lifetime earned
  createdAt: string;
  lastLoginAt: string;
  avatarUrl?: string;
  phone?: string;
  notes?: string;
  assignedCoachId?: string;
  coachSpecialty?: string;
  trainingStatus?: 'active_training' | 'mentorship_pending' | 'graduated' | 'paused';
  trainingProgress?: TrainingMilestone[];
  permissions?: Partial<RolePermissions>;
  timezone?: string;
  telegramChatId?: string;
  telegramNotificationsEnabled?: boolean;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  username: string;
  type: 'commission' | 'subscription_purchase' | 'manual_adjustment' | 'payout_request';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'rejected';
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface DatabaseSchema {
  users: UserRecord[];
  transactions: TransactionRecord[];
  auditLogs: AuditLogRecord[];
  operationalQueue: OperationalItemRecord[];
  rbacOverrides: Record<string, Partial<RolePermissions>>;
  systemSettings: {
    defaultClientCommission: number;
    defaultEmployeeCommission: number;
    defaultAdminCommission: number;
    siteName: string;
    youtubeChannelId?: string;
    youtubeChannelHandle?: string;
  };
}

// ----------------------------------------------------
// PostgreSQL Pool & Schema Setup
// ----------------------------------------------------
let pool: PgPool | null = null;
let initPromise: Promise<boolean> | null = null;
let isPostgresHealthy = false;

export function isDatabaseHealthy(): boolean {
  return isPostgresHealthy;
}

// Detect Render internal PostgreSQL hostnames like "dpg-xxxxxx-a" without dots
export function isRenderInternalHost(hostname: string): boolean {
  return /^dpg-[a-z0-9]+(-[a-z0-9]+)*$/i.test(hostname) && !hostname.includes('.');
}

// Check if a hostname can be resolved directly via DNS in the current environment
export function canResolveHost(hostname: string): Promise<boolean> {
  return new Promise((resolve) => {
    dns.lookup(hostname, (err) => {
      resolve(!err);
    });
  });
}

let cachedResolvedConfig: {
  connectionString: string;
  ssl: boolean | { rejectUnauthorized: boolean };
} | null = null;

export async function resolveDatabaseConfig(): Promise<{ connectionString: string; ssl: boolean | { rejectUnauthorized: boolean } } | null> {
  if (cachedResolvedConfig) return cachedResolvedConfig;

  const rawConnectionString = (process.env.INTERNAL_DATABASE_URL || process.env.DATABASE_URL)?.trim();
  if (!rawConnectionString) return null;

  try {
    const parsed = new URL(rawConnectionString);
    const hostname = parsed.hostname;
    const isInternal = isRenderInternalHost(hostname);
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    const isRenderEnv = process.env.RENDER === 'true';

    // Test whether the internal hostname resolves directly via DNS (e.g. within Render's private VPC network)
    const canResolve = isInternal ? await canResolveHost(hostname) : true;

    if (isInternal && (isRenderEnv || canResolve)) {
      // Configure production service to use Render's internal PostgreSQL hostname and internal connection settings (ssl: false)
      console.log(`[Database Config] Configured for Render internal PostgreSQL network (host: ${hostname}, ssl: false).`);
      cachedResolvedConfig = {
        connectionString: rawConnectionString,
        ssl: false, // Render internal private network requires unencrypted connections (ssl: false)
      };
      return cachedResolvedConfig;
    }

    if (isInternal && !canResolve) {
      // In development/preview container outside Render VPC:
      // The internal hostname does not resolve via external DNS.
      // Connect through external gateway with SSL so preview/verification functions properly.
      console.log(`[Database Config] Internal host ${hostname} is not resolvable outside Render VPC. Using external gateway for preview verification.`);
      const extUrl = new URL(rawConnectionString);
      extUrl.hostname = `${hostname}.oregon-postgres.render.com`;
      cachedResolvedConfig = {
        connectionString: extUrl.toString(),
        ssl: { rejectUnauthorized: false },
      };
      return cachedResolvedConfig;
    }

    cachedResolvedConfig = {
      connectionString: rawConnectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    };
    return cachedResolvedConfig;
  } catch (err: any) {
    console.error('[Database Config] Failed to parse database connection URL:', err.message);
    cachedResolvedConfig = {
      connectionString: rawConnectionString,
      ssl: { rejectUnauthorized: false },
    };
    return cachedResolvedConfig;
  }
}

export function normalizeDatabaseUrl(rawUrl: string): string {
  // Preserves the Render internal hostname without forcing external public hostname
  if (!rawUrl) return rawUrl;
  return rawUrl;
}

export function getPool(): PgPool | null {
  if (pool) return pool;
  const rawConnectionString = (process.env.INTERNAL_DATABASE_URL || process.env.DATABASE_URL)?.trim();
  if (!rawConnectionString) return null;

  if (cachedResolvedConfig) {
    try {
      const config: PoolConfig = {
        connectionString: cachedResolvedConfig.connectionString,
        ssl: cachedResolvedConfig.ssl,
        max: parseInt(process.env.DB_POOL_MAX || '20', 10),
        min: parseInt(process.env.DB_POOL_MIN || '0', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '15000', 10),
        connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '10000', 10),
        maxUses: 7500,
      };
      pool = new Pool(config);
      pool.on('error', (err) => {
        console.error('[PostgreSQL Pool Error]', err.message);
        isPostgresHealthy = false;
        initPromise = null;
      });
      return pool;
    } catch {
      return null;
    }
  }

  try {
    let hostname = '';
    try {
      hostname = new URL(rawConnectionString).hostname;
    } catch {}

    const isInternal = isRenderInternalHost(hostname);
    const isRenderEnv = process.env.RENDER === 'true';

    const config: PoolConfig = {
      connectionString: rawConnectionString,
      ssl: (isInternal && isRenderEnv) ? false : (hostname === 'localhost' || hostname === '127.0.0.1' ? false : { rejectUnauthorized: false }),
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '0', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '15000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '10000', 10),
      maxUses: 7500,
    };

    pool = new Pool(config);
    pool.on('error', (err) => {
      console.warn('[PostgreSQL Pool Notice] Connection event:', err.message);
      // Notice: Node-pg automatically discards dead idle sockets and reconnects.
      // Do not mark isPostgresHealthy false on benign idle socket disconnects.
    });

    return pool;
  } catch (err) {
    return null;
  }
}

function safeIsoDate(val: any, fallback = new Date().toISOString()): string {
  if (!val) return fallback;
  const d = new Date(val);
  return isNaN(d.getTime()) ? fallback : d.toISOString();
}

function mapUserRow(row: any): UserRecord {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    role: (row.role === 'admin' && (row.username === 'abuasad2299' || row.id === 'usr_admin_01')) ? 'super_admin' : (row.role as UserRole),
    subscriptionStatus: row.subscription_status as SubscriptionStatus,
    subscriptionPlan: row.subscription_plan,
    subscriptionExpiresAt: safeIsoDate(row.subscription_expires_at, new Date(Date.now() + 365*24*60*60*1000).toISOString()),
    referralCode: row.referral_code,
    referredBy: row.referred_by || undefined,
    commissionRate: parseFloat(row.commission_rate) || 0,
    balance: parseFloat(row.balance) || 0,
    pendingBalance: parseFloat(row.pending_balance) || 0,
    totalEarned: parseFloat(row.total_earned) || 0,
    createdAt: safeIsoDate(row.created_at),
    lastLoginAt: safeIsoDate(row.last_login_at),
    avatarUrl: row.avatar_url || undefined,
    phone: row.phone || undefined,
    notes: row.notes || undefined,
    assignedCoachId: row.assigned_coach_id || undefined,
    coachSpecialty: row.coach_specialty || undefined,
    trainingStatus: row.training_status || undefined,
    trainingProgress: typeof row.training_progress === 'string' ? JSON.parse(row.training_progress) : (row.training_progress || undefined),
    permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || undefined),
    timezone: row.timezone || undefined,
    telegramChatId: row.telegram_chat_id || undefined,
    telegramNotificationsEnabled: row.telegram_notifications_enabled !== false,
  };
}

function mapTransactionRow(row: any): TransactionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    type: row.type,
    amount: parseFloat(row.amount) || 0,
    description: row.description,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || undefined),
  };
}

function mapAuditRow(row: any): AuditLogRecord {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorUsername: row.actor_username,
    actorRole: row.actor_role as UserRole,
    action: row.action,
    targetId: row.target_id || undefined,
    targetUsername: row.target_username || undefined,
    details: row.details,
    timestamp: new Date(row.timestamp || row.created_at).toISOString(),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || undefined),
  };
}

export async function isPostgresReady(): Promise<boolean> {
  if (isPostgresHealthy && pool) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await resolveDatabaseConfig();
      const p = getPool();
      if (!p) return false;
      const client = await p.connect();
      try {
        // Ensure user timezone and notification preference columns exist in PostgreSQL
        await client.query(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_notifications_enabled BOOLEAN DEFAULT true;
        `);

        // Verify connectivity and schema readiness without modifying any user data
        const verifyRes = await client.query('SELECT current_database(), current_user, count(*) as count FROM users;');
        const userCount = parseInt(verifyRes.rows[0].count, 10);
        console.log(`[PostgreSQL] Connection verified. Database: "${verifyRes.rows[0].current_database}", User: "${verifyRes.rows[0].current_user}", Registered Users: ${userCount}`);

        isPostgresHealthy = true;
        return true;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error(`[Database Error] PostgreSQL connection failed: ${err.message}`);
      isPostgresHealthy = false;
      initPromise = null;
      if (pool) {
        try { pool.end(); } catch {}
        pool = null;
      }
      throw err;
    }
  })();

  return initPromise;
}

export async function initPostgres(): Promise<void> {
  const ready = await isPostgresReady();
  if (!ready) {
    throw new Error('PostgreSQL database initialization failed.');
  }
}

async function getActivePg(): Promise<PgPool> {
  let ready = await isPostgresReady();
  let p = getPool();
  if (!p) {
    throw new Error("[Database Error] DATABASE_URL is not configured. PostgreSQL is the only supported storage engine.");
  }
  if (!ready || !isPostgresHealthy) {
    initPromise = null;
    ready = await isPostgresReady();
    p = getPool();
  }
  if (!ready || !p) {
    throw new Error("[Database Error] PostgreSQL connection is not active.");
  }
  return p;
}

// ----------------------------------------------------
// Unified Database Layer API (Strict PostgreSQL Only)
// ----------------------------------------------------
export class Database {
  // User Operations
  static async findUserByUsername(username: string): Promise<UserRecord | undefined> {
    const clean = (username || "").trim().toLowerCase();
    if (!clean) return undefined;
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER($1) LIMIT 1", [clean]);
    return res.rows.length > 0 ? mapUserRow(res.rows[0]) : undefined;
  }

  static async findUserByEmail(email: string): Promise<UserRecord | undefined> {
    const clean = (email || "").trim().toLowerCase();
    if (!clean) return undefined;
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER($1) LIMIT 1", [clean]);
    return res.rows.length > 0 ? mapUserRow(res.rows[0]) : undefined;
  }

  static async findUserById(id: string): Promise<UserRecord | undefined> {
    const clean = (id || "").trim();
    if (!clean) return undefined;
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [clean]);
    return res.rows.length > 0 ? mapUserRow(res.rows[0]) : undefined;
  }

  static async findUserByReferralCode(code: string): Promise<UserRecord | undefined> {
    const clean = (code || "").trim();
    if (!clean) return undefined;
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM users WHERE UPPER(TRIM(referral_code)) = UPPER($1) LIMIT 1", [clean]);
    return res.rows.length > 0 ? mapUserRow(res.rows[0]) : undefined;
  }

  static async getAllUsers(): Promise<UserRecord[]> {
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM users ORDER BY created_at DESC");
    return res.rows.map(mapUserRow);
  }

  static async createUser(user: Omit<UserRecord, "id" | "createdAt" | "lastLoginAt">): Promise<UserRecord> {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const p = await getActivePg();
    const query = `
      INSERT INTO users (
        id, username, email, password_hash, full_name, role,
        subscription_status, subscription_plan, subscription_expires_at,
        referral_code, referred_by, commission_rate, balance, pending_balance,
        total_earned, created_at, last_login_at, avatar_url, phone, notes,
        assigned_coach_id, coach_specialty, training_status, training_progress, permissions,
        timezone, telegram_chat_id, telegram_notifications_enabled
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26, $27, $28
      ) RETURNING *
    `;
    const values = [
      id,
      user.username.trim(),
      user.email.trim().toLowerCase(),
      user.passwordHash,
      user.fullName.trim(),
      user.role,
      user.subscriptionStatus,
      user.subscriptionPlan,
      user.subscriptionExpiresAt,
      user.referralCode.trim().toUpperCase(),
      user.referredBy || null,
      user.commissionRate || 10,
      user.balance || 0,
      user.pendingBalance || 0,
      user.totalEarned || 0,
      now,
      now,
      user.avatarUrl || null,
      user.phone || null,
      user.notes || null,
      user.assignedCoachId || null,
      user.coachSpecialty || null,
      user.trainingStatus || null,
      user.trainingProgress ? JSON.stringify(user.trainingProgress) : null,
      user.permissions ? JSON.stringify(user.permissions) : null,
      user.timezone || null,
      user.telegramChatId || null,
      user.telegramNotificationsEnabled !== false,
    ];
    const res = await p.query(query, values);
    return mapUserRow(res.rows[0]);
  }

  static async updateUser(id: string, updates: Partial<UserRecord>): Promise<UserRecord | null> {
    const p = await getActivePg();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.username !== undefined) {
      fields.push(`username = $${idx++}`);
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(updates.email);
    }
    if (updates.passwordHash !== undefined) {
      fields.push(`password_hash = $${idx++}`);
      values.push(updates.passwordHash);
    }
    if (updates.fullName !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(updates.fullName);
    }
    if (updates.role !== undefined) {
      fields.push(`role = $${idx++}`);
      values.push(updates.role);
    }
    if (updates.subscriptionStatus !== undefined) {
      fields.push(`subscription_status = $${idx++}`);
      values.push(updates.subscriptionStatus);
    }
    if (updates.subscriptionPlan !== undefined) {
      fields.push(`subscription_plan = $${idx++}`);
      values.push(updates.subscriptionPlan);
    }
    if (updates.subscriptionExpiresAt !== undefined) {
      fields.push(`subscription_expires_at = $${idx++}`);
      values.push(updates.subscriptionExpiresAt);
    }
    if (updates.referralCode !== undefined) {
      fields.push(`referral_code = $${idx++}`);
      values.push(updates.referralCode);
    }
    if (updates.referredBy !== undefined) {
      fields.push(`referred_by = $${idx++}`);
      values.push(updates.referredBy);
    }
    if (updates.commissionRate !== undefined) {
      fields.push(`commission_rate = $${idx++}`);
      values.push(updates.commissionRate);
    }
    if (updates.balance !== undefined) {
      fields.push(`balance = $${idx++}`);
      values.push(updates.balance);
    }
    if (updates.pendingBalance !== undefined) {
      fields.push(`pending_balance = $${idx++}`);
      values.push(updates.pendingBalance);
    }
    if (updates.totalEarned !== undefined) {
      fields.push(`total_earned = $${idx++}`);
      values.push(updates.totalEarned);
    }
    if (updates.lastLoginAt !== undefined) {
      fields.push(`last_login_at = $${idx++}`);
      values.push(updates.lastLoginAt);
    }
    if (updates.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(updates.avatarUrl);
    }
    if (updates.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(updates.phone);
    }
    if (updates.notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(updates.notes);
    }
    if (updates.assignedCoachId !== undefined) {
      fields.push(`assigned_coach_id = $${idx++}`);
      values.push(updates.assignedCoachId);
    }
    if (updates.coachSpecialty !== undefined) {
      fields.push(`coach_specialty = $${idx++}`);
      values.push(updates.coachSpecialty);
    }
    if (updates.trainingStatus !== undefined) {
      fields.push(`training_status = $${idx++}`);
      values.push(updates.trainingStatus);
    }
    if (updates.trainingProgress !== undefined) {
      fields.push(`training_progress = $${idx++}`);
      values.push(JSON.stringify(updates.trainingProgress));
    }
    if (updates.permissions !== undefined) {
      fields.push(`permissions = $${idx++}`);
      values.push(JSON.stringify(updates.permissions));
    }
    if (updates.timezone !== undefined) {
      fields.push(`timezone = $${idx++}`);
      values.push(updates.timezone);
    }
    if (updates.telegramChatId !== undefined) {
      fields.push(`telegram_chat_id = $${idx++}`);
      values.push(updates.telegramChatId);
    }
    if (updates.telegramNotificationsEnabled !== undefined) {
      fields.push(`telegram_notifications_enabled = $${idx++}`);
      values.push(updates.telegramNotificationsEnabled);
    }

    if (fields.length === 0) {
      return this.findUserById(id);
    }

    values.push(id);
    const query = `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
    const res = await p.query(query, values);
    return res.rows.length > 0 ? mapUserRow(res.rows[0]) : null;
  }

  static async deleteUser(id: string): Promise<boolean> {
    const p = await getActivePg();
    const res = await p.query("DELETE FROM users WHERE id = $1", [id]);
    return (res.rowCount ?? 0) > 0;
  }

  static async processReferralCommission(referredUserId: string, saleAmount: number, description: string): Promise<void> {
    const p = await getActivePg();
    const client = await p.connect();
    try {
      await client.query("BEGIN");

      const buyerRes = await client.query("SELECT * FROM users WHERE id = $1", [referredUserId]);
      if (buyerRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return;
      }
      const buyer = mapUserRow(buyerRes.rows[0]);
      if (!buyer.referredBy) {
        await client.query("ROLLBACK");
        return;
      }

      // Find referrer by ID or referralCode with row lock
      const referrerRes = await client.query(
        "SELECT * FROM users WHERE (id = $1 OR UPPER(referral_code) = UPPER($2)) FOR UPDATE LIMIT 1",
        [buyer.referredBy, buyer.referredBy]
      );
      if (referrerRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return;
      }
      const referrer = mapUserRow(referrerRes.rows[0]);

      // Guard against self-referral
      if (referrer.id === buyer.id) {
        await client.query("ROLLBACK");
        return;
      }

      const commissionRate = referrer.commissionRate || 10;
      const commissionAmount = Number(((saleAmount * commissionRate) / 100).toFixed(2));

      // Update balances atomically
      await client.query(
        "UPDATE users SET balance = balance + $1, total_earned = total_earned + $1 WHERE id = $2",
        [commissionAmount, referrer.id]
      );

      // Record Transaction
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const metadata = {
        referredUserId: buyer.id,
        referredUsername: buyer.username,
        saleAmount,
        commissionRate,
      };

      await client.query(`
        INSERT INTO transactions (id, user_id, username, type, amount, description, status, created_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        txId,
        referrer.id,
        referrer.username,
        'commission',
        commissionAmount,
        `${description} (Referred: @${buyer.username} [${commissionRate}%])`,
        'completed',
        now,
        JSON.stringify(metadata),
      ]);

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async creditReferralBonus(
    referrerId: string,
    bonusAmount: number,
    description: string,
    metadata: any
  ): Promise<void> {
    const p = await getActivePg();
    const client = await p.connect();
    try {
      await client.query("BEGIN");
      const refRes = await client.query("SELECT * FROM users WHERE id = $1 FOR UPDATE", [referrerId]);
      if (refRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return;
      }
      const referrer = mapUserRow(refRes.rows[0]);

      await client.query(
        "UPDATE users SET balance = balance + $1, total_earned = total_earned + $1 WHERE id = $2",
        [bonusAmount, referrer.id]
      );

      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      await client.query(`
        INSERT INTO transactions (id, user_id, username, type, amount, description, status, created_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        txId,
        referrer.id,
        referrer.username,
        'commission',
        bonusAmount,
        description,
        'completed',
        now,
        JSON.stringify(metadata || {}),
      ]);

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Atomic Payout Request: Row lock, verify balance, move to pending, create transaction
  static async requestPayoutAtomic(
    userId: string,
    requestAmount: number,
    payoutMethod?: string,
    payoutAddress?: string
  ): Promise<{ user: UserRecord; transaction: TransactionRecord }> {
    const p = await getActivePg();
    const client = await p.connect();
    try {
      await client.query("BEGIN");

      // Row-level lock on user row to prevent race conditions & double-spend
      const userRes = await client.query("SELECT * FROM users WHERE id = $1 FOR UPDATE", [userId]);
      if (userRes.rows.length === 0) {
        throw new Error("User not found.");
      }
      const user = mapUserRow(userRes.rows[0]);

      if (user.balance < requestAmount) {
        throw new Error(`Insufficient commission balance. Current available balance is $${user.balance.toFixed(2)}.`);
      }

      const newBalance = Number((user.balance - requestAmount).toFixed(2));
      const newPending = Number((user.pendingBalance + requestAmount).toFixed(2));
      const now = new Date().toISOString();

      const updateRes = await client.query(
        "UPDATE users SET balance = $1, pending_balance = $2 WHERE id = $3 RETURNING *",
        [newBalance, newPending, userId]
      );
      const updatedUser = mapUserRow(updateRes.rows[0]);

      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const metadata = {
        payoutMethod: payoutMethod || 'USDT/Crypto',
        payoutAddress: payoutAddress || 'Standard Wallet',
        requestedAt: now,
      };

      const txRes = await client.query(`
        INSERT INTO transactions (id, user_id, username, type, amount, description, status, created_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        txId,
        user.id,
        user.username,
        'payout_request',
        requestAmount,
        `Payout Request: $${requestAmount.toFixed(2)} via ${metadata.payoutMethod} (${metadata.payoutAddress})`,
        'pending',
        now,
        JSON.stringify(metadata)
      ]);
      const tx = mapTransactionRow(txRes.rows[0]);

      await client.query("COMMIT");
      return { user: updatedUser, transaction: tx };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Atomic Payout Finalization (Approve / Reject): Row lock on transaction and user, atomic balance transition
  static async finalizePayoutTransactionAtomic(
    txId: string,
    newStatus: 'completed' | 'rejected',
    admin: { id: string; username: string; role: string }
  ): Promise<{ transaction: TransactionRecord; user?: UserRecord }> {
    const p = await getActivePg();
    const client = await p.connect();
    try {
      await client.query("BEGIN");

      // Lock transaction row
      const txRes = await client.query("SELECT * FROM transactions WHERE id = $1 FOR UPDATE", [txId]);
      if (txRes.rows.length === 0) {
        throw new Error("Transaction not found.");
      }
      const tx = mapTransactionRow(txRes.rows[0]);

      if (tx.status !== 'pending') {
        throw new Error(`Transaction #${txId} is already in status '${tx.status}' and cannot be modified again.`);
      }

      let updatedUser: UserRecord | undefined;
      const now = new Date().toISOString();

      if (tx.type === 'payout_request') {
        // Lock target user row
        const userRes = await client.query("SELECT * FROM users WHERE id = $1 FOR UPDATE", [tx.userId]);
        if (userRes.rows.length > 0) {
          const targetUser = mapUserRow(userRes.rows[0]);
          if (newStatus === 'rejected') {
            // Restore reserved balance and reduce pending balance
            const restoredBalance = Number((targetUser.balance + tx.amount).toFixed(2));
            const reducedPending = Math.max(0, Number((targetUser.pendingBalance - tx.amount).toFixed(2)));
            const uRes = await client.query(
              "UPDATE users SET balance = $1, pending_balance = $2 WHERE id = $3 RETURNING *",
              [restoredBalance, reducedPending, targetUser.id]
            );
            updatedUser = mapUserRow(uRes.rows[0]);
          } else if (newStatus === 'completed') {
            // Deduct from pending balance
            const reducedPending = Math.max(0, Number((targetUser.pendingBalance - tx.amount).toFixed(2)));
            const uRes = await client.query(
              "UPDATE users SET pending_balance = $1 WHERE id = $2 RETURNING *",
              [reducedPending, targetUser.id]
            );
            updatedUser = mapUserRow(uRes.rows[0]);
          }
        }
      }

      // Update transaction status
      const updatedTxRes = await client.query(
        "UPDATE transactions SET status = $1 WHERE id = $2 RETURNING *",
        [newStatus, txId]
      );
      const updatedTx = mapTransactionRow(updatedTxRes.rows[0]);

      // Record Audit Log inside the same atomic transaction
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await client.query(`
        INSERT INTO audit_logs (id, actor_id, actor_username, actor_role, action, target_id, target_username, details, timestamp, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        logId,
        admin.id,
        admin.username,
        admin.role,
        newStatus === 'rejected' ? 'PAYOUT_REJECTED_BALANCE_RESTORED' : 'PAYOUT_COMPLETED',
        tx.id,
        tx.username,
        `Payout transaction #${tx.id} for @${tx.username} ($${tx.amount.toFixed(2)}) marked '${newStatus}' by @${admin.username} [${admin.role}]`,
        now,
        JSON.stringify({ transactionId: tx.id, amount: tx.amount, status: newStatus, userId: tx.userId })
      ]);

      await client.query("COMMIT");
      return { transaction: updatedTx, user: updatedUser };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Atomic User Balance Adjustment (Super Admin Only): Row lock, atomic balance update, transaction, audit log
  static async adjustUserBalanceAtomic(
    targetUserId: string,
    numAmount: number,
    action: 'add' | 'deduct' | 'set',
    reason: string,
    admin: { id: string; username: string; role: string }
  ): Promise<{ user: UserRecord; transaction: TransactionRecord }> {
    const p = await getActivePg();
    const client = await p.connect();
    try {
      await client.query("BEGIN");

      const userRes = await client.query("SELECT * FROM users WHERE id = $1 FOR UPDATE", [targetUserId]);
      if (userRes.rows.length === 0) {
        throw new Error("User not found.");
      }
      const user = mapUserRow(userRes.rows[0]);

      let newBalance = user.balance;
      if (action === 'add') {
        newBalance = Number((user.balance + numAmount).toFixed(2));
      } else if (action === 'deduct') {
        if (numAmount > user.balance) {
          throw new Error(`Cannot deduct $${numAmount.toFixed(2)} from available balance of $${user.balance.toFixed(2)}. Balances cannot be negative.`);
        }
        newBalance = Number((user.balance - numAmount).toFixed(2));
      } else if (action === 'set') {
        if (numAmount < 0) {
          throw new Error("Balance cannot be negative.");
        }
        newBalance = Number(numAmount.toFixed(2));
      } else {
        throw new Error(`Invalid balance adjustment action: ${action}`);
      }

      if (newBalance < 0) {
        throw new Error("Balance cannot be negative.");
      }

      const now = new Date().toISOString();
      const updateRes = await client.query(
        "UPDATE users SET balance = $1 WHERE id = $2 RETURNING *",
        [newBalance, targetUserId]
      );
      const updatedUser = mapUserRow(updateRes.rows[0]);

      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const metadata = {
        adminId: admin.id,
        adminUsername: admin.username,
        previousBalance: user.balance,
        newBalance,
        action,
        reason,
      };

      const txRes = await client.query(`
        INSERT INTO transactions (id, user_id, username, type, amount, description, status, created_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        txId,
        user.id,
        user.username,
        'manual_adjustment',
        action === 'deduct' ? -numAmount : numAmount,
        `Super Admin Adjustment (@${admin.username}): ${reason}`,
        'completed',
        now,
        JSON.stringify(metadata)
      ]);
      const tx = mapTransactionRow(txRes.rows[0]);

      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await client.query(`
        INSERT INTO audit_logs (id, actor_id, actor_username, actor_role, action, target_id, target_username, details, timestamp, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        logId,
        admin.id,
        admin.username,
        admin.role,
        'BALANCE_ADJUST',
        user.id,
        user.username,
        `Adjusted balance for @${user.username} from $${user.balance} to $${newBalance} (${action}: $${numAmount})`,
        now,
        JSON.stringify({ previousBalance: user.balance, newBalance, reason, action, amount: numAmount })
      ]);

      await client.query("COMMIT");
      return { user: updatedUser, transaction: tx };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Atomic Subscription Activation with Balance: Locks user row, verifies balance >= planCost, deducts balance, updates subscription
  static async activateSubscriptionWithBalanceAtomic(
    userId: string,
    durationMonths: number,
    planName: string,
    planCost: number
  ): Promise<{ user: UserRecord; transaction: TransactionRecord }> {
    const p = await getActivePg();
    const client = await p.connect();
    try {
      await client.query("BEGIN");

      const userRes = await client.query("SELECT * FROM users WHERE id = $1 FOR UPDATE", [userId]);
      if (userRes.rows.length === 0) {
        throw new Error("User not found.");
      }
      const user = mapUserRow(userRes.rows[0]);

      if (user.balance < planCost) {
        throw new Error(`Insufficient commission balance ($${user.balance.toFixed(2)}) to activate ${planName} ($${planCost.toFixed(2)}).`);
      }

      const newBalance = Number((user.balance - planCost).toFixed(2));
      const now = new Date().toISOString();

      const baseDate = user.subscriptionStatus === 'active' && new Date(user.subscriptionExpiresAt) > new Date()
        ? new Date(user.subscriptionExpiresAt)
        : new Date();
      baseDate.setMonth(baseDate.getMonth() + durationMonths);

      const updateRes = await client.query(
        "UPDATE users SET balance = $1, subscription_status = 'active', subscription_plan = $2, subscription_expires_at = $3 WHERE id = $4 RETURNING *",
        [newBalance, planName, baseDate.toISOString(), userId]
      );
      const updatedUser = mapUserRow(updateRes.rows[0]);

      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const metadata = {
        durationMonths,
        planName,
        expiresAt: baseDate.toISOString(),
        paymentMethod: 'commission_balance',
        paidWithBalance: true,
      };

      const txRes = await client.query(`
        INSERT INTO transactions (id, user_id, username, type, amount, description, status, created_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        txId,
        user.id,
        user.username,
        'subscription_purchase',
        planCost,
        `Subscription Activated: ${planName} (${durationMonths} mo) via Account Balance`,
        'completed',
        now,
        JSON.stringify(metadata)
      ]);
      const tx = mapTransactionRow(txRes.rows[0]);

      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await client.query(`
        INSERT INTO audit_logs (id, actor_id, actor_username, actor_role, action, target_id, target_username, details, timestamp, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        logId,
        user.id,
        user.username,
        user.role,
        'SUBSCRIPTION_BALANCE_PURCHASE',
        user.id,
        user.username,
        `Subscribed to ${planName} (${durationMonths} mos) using account balance ($${planCost.toFixed(2)})`,
        now,
        JSON.stringify({ planName, durationMonths, planCost, newBalance })
      ]);

      await client.query("COMMIT");
      return { user: updatedUser, transaction: tx };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ----------------------------------------------------
  // Transaction Operations
  // ----------------------------------------------------
  static async addTransaction(tx: Omit<TransactionRecord, "id" | "createdAt">): Promise<TransactionRecord> {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const p = await getActivePg();
    const res = await p.query(`
      INSERT INTO transactions (id, user_id, username, type, amount, description, status, created_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      tx.userId,
      tx.username,
      tx.type,
      tx.amount,
      tx.description,
      tx.status || "completed",
      now,
      tx.metadata ? JSON.stringify(tx.metadata) : null,
    ]);
    return mapTransactionRow(res.rows[0]);
  }

  static async findTransactionById(id: string): Promise<TransactionRecord | null> {
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM transactions WHERE id = $1 LIMIT 1", [id]);
    return res.rows.length > 0 ? mapTransactionRow(res.rows[0]) : null;
  }

  static async updateTransactionStatus(id: string, status: "completed" | "pending" | "rejected"): Promise<TransactionRecord | null> {
    const p = await getActivePg();
    const res = await p.query("UPDATE transactions SET status = $1 WHERE id = $2 RETURNING *", [status, id]);
    return res.rows.length > 0 ? mapTransactionRow(res.rows[0]) : null;
  }

  static async getTransactionsByUser(userId: string): Promise<TransactionRecord[]> {
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    return res.rows.map(mapTransactionRow);
  }

  static async getAllTransactions(): Promise<TransactionRecord[]> {
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM transactions ORDER BY created_at DESC");
    return res.rows.map(mapTransactionRow);
  }

  static async getReferralsForUser(referrerCodeOrId: string): Promise<UserRecord[]> {
    const p = await getActivePg();
    const user = await this.findUserById(referrerCodeOrId) || await this.findUserByReferralCode(referrerCodeOrId);
    if (!user) return [];

    const res = await p.query(
      "SELECT * FROM users WHERE referred_by = $1 OR UPPER(referred_by) = UPPER($2) ORDER BY created_at DESC",
      [user.id, user.referralCode]
    );
    return res.rows.map(mapUserRow);
  }

  // ----------------------------------------------------
  // System Settings Operations
  // ----------------------------------------------------
  static async getSystemSettings(): Promise<DatabaseSchema["systemSettings"]> {
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM system_settings WHERE id = 1 LIMIT 1");
    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        defaultClientCommission: parseFloat(row.default_client_commission) || 10,
        defaultEmployeeCommission: parseFloat(row.default_employee_commission) || 18,
        defaultAdminCommission: parseFloat(row.default_admin_commission) || 25,
        siteName: row.site_name || "SMTrading.pro",
        youtubeChannelId: row.youtube_channel_id || undefined,
        youtubeChannelHandle: row.youtube_channel_handle || undefined,
      };
    }
    return {
      defaultClientCommission: 10,
      defaultEmployeeCommission: 18,
      defaultAdminCommission: 25,
      siteName: "SMTrading.pro",
    };
  }

  static async updateSystemSettings(settings: Partial<DatabaseSchema["systemSettings"]>): Promise<DatabaseSchema["systemSettings"]> {
    const p = await getActivePg();
    const current = await this.getSystemSettings();
    const updated = { ...current, ...settings };

    await p.query(`
      INSERT INTO system_settings (
        id, default_client_commission, default_employee_commission, default_admin_commission, site_name, youtube_channel_id, youtube_channel_handle
      ) VALUES (
        1, $1, $2, $3, $4, $5, $6
      ) ON CONFLICT (id) DO UPDATE SET
        default_client_commission = EXCLUDED.default_client_commission,
        default_employee_commission = EXCLUDED.default_employee_commission,
        default_admin_commission = EXCLUDED.default_admin_commission,
        site_name = EXCLUDED.site_name,
        youtube_channel_id = EXCLUDED.youtube_channel_id,
        youtube_channel_handle = EXCLUDED.youtube_channel_handle
    `, [
      updated.defaultClientCommission,
      updated.defaultEmployeeCommission,
      updated.defaultAdminCommission,
      updated.siteName,
      updated.youtubeChannelId || null,
      updated.youtubeChannelHandle || null,
    ]);

    return updated;
  }

  // ----------------------------------------------------
  // Audit Logs Operations
  // ----------------------------------------------------
  static async addAuditLog(entry: Omit<AuditLogRecord, "id" | "timestamp">): Promise<AuditLogRecord> {
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();
    const p = await getActivePg();
    const res = await p.query(`
      INSERT INTO audit_logs (id, actor_id, actor_username, actor_role, action, target_id, target_username, details, timestamp, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      id,
      entry.actorId,
      entry.actorUsername,
      entry.actorRole,
      entry.action,
      entry.targetId || null,
      entry.targetUsername || null,
      entry.details,
      timestamp,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ]);
    return mapAuditRow(res.rows[0]);
  }

  static async getAuditLogs(limit: number = 100): Promise<AuditLogRecord[]> {
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1", [limit]);
    return res.rows.map(mapAuditRow);
  }

  // ----------------------------------------------------
  // RBAC Settings & Permissions
  // ----------------------------------------------------
  static async getRBACSettings(): Promise<Record<UserRole, RolePermissions>> {
    const baseSettings = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)) as Record<UserRole, RolePermissions>;
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM rbac_settings");
    for (const row of res.rows) {
      const role = row.role as UserRole;
      const perms = typeof row.permissions === "string" ? JSON.parse(row.permissions) : row.permissions;
      if (baseSettings[role]) {
        baseSettings[role] = { ...baseSettings[role], ...perms };
      }
    }
    return baseSettings;
  }

  static async updateRBACSettings(role: UserRole, permissions: Partial<RolePermissions>, updatedBy: string): Promise<RolePermissions> {
    const current = await this.getRBACSettings();
    const updated = { ...current[role], ...permissions };
    const p = await getActivePg();
    await p.query(`
      INSERT INTO rbac_settings (role, permissions, updated_at, updated_by)
      VALUES ($1, $2, NOW(), $3)
      ON CONFLICT (role) DO UPDATE SET
        permissions = EXCLUDED.permissions,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by
    `, [role, JSON.stringify(updated), updatedBy]);
    return updated;
  }

  // ----------------------------------------------------
  // Coaching Students & Progress Operations
  // ----------------------------------------------------
  static async getCoachingStudents(coachId?: string): Promise<UserRecord[]> {
    const p = await getActivePg();
    let query = "SELECT * FROM users WHERE role = 'client' ";
    const values: any[] = [];
    if (coachId) {
      query += "AND assigned_coach_id = $1 ";
      values.push(coachId);
    }
    query += "ORDER BY created_at DESC";
    const res = await p.query(query, values);
    return res.rows.map(mapUserRow);
  }

  static async updateStudentTrainingProgress(
    studentId: string,
    progress: TrainingMilestone[],
    status?: "active_training" | "mentorship_pending" | "graduated" | "paused",
    coachNotes?: string
  ): Promise<UserRecord | null> {
    const updates: Partial<UserRecord> = {
      trainingProgress: progress,
    };
    if (status) updates.trainingStatus = status;
    if (coachNotes !== undefined) updates.notes = coachNotes;

    return this.updateUser(studentId, updates);
  }

  static async assignStudentCoach(studentId: string, coachId: string): Promise<UserRecord | null> {
    return this.updateUser(studentId, { assignedCoachId: coachId });
  }

  // ----------------------------------------------------
  // Operational Queue Operations
  // ----------------------------------------------------
  static async getOperationalItems(): Promise<OperationalItemRecord[]> {
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM operational_items ORDER BY created_at DESC");
    return res.rows.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      priority: r.priority,
      status: r.status,
      assignedTo: r.assigned_to || undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      notes: r.notes || undefined,
    }));
  }

  static async addOperationalItem(item: Omit<OperationalItemRecord, "id" | "createdAt" | "updatedAt">): Promise<OperationalItemRecord> {
    const id = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const p = await getActivePg();
    const res = await p.query(`
      INSERT INTO operational_items (id, title, type, priority, status, assigned_to, created_at, updated_at, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      item.title,
      item.type,
      item.priority,
      item.status,
      item.assignedTo || null,
      now,
      now,
      item.notes || null,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      title: r.title,
      type: r.type,
      priority: r.priority,
      status: r.status,
      assignedTo: r.assigned_to || undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      notes: r.notes || undefined,
    };
  }

  static async updateOperationalItem(id: string, updates: Partial<OperationalItemRecord>): Promise<OperationalItemRecord | null> {
    const p = await getActivePg();
    const fields: string[] = ["updated_at = NOW()"];
    const values: any[] = [];
    let idx = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(updates.title);
    }
    if (updates.type !== undefined) {
      fields.push(`type = $${idx++}`);
      values.push(updates.type);
    }
    if (updates.priority !== undefined) {
      fields.push(`priority = $${idx++}`);
      values.push(updates.priority);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.assignedTo !== undefined) {
      fields.push(`assigned_to = $${idx++}`);
      values.push(updates.assignedTo);
    }
    if (updates.notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(updates.notes);
    }

    values.push(id);
    const query = `UPDATE operational_items SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
    const res = await p.query(query, values);
    if (res.rows.length > 0) {
      const r = res.rows[0];
      return {
        id: r.id,
        title: r.title,
        type: r.type,
        priority: r.priority,
        status: r.status,
        assignedTo: r.assigned_to || undefined,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
        notes: r.notes || undefined,
      };
    }
    return null;
  }
}
