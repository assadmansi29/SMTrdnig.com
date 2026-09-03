import bcrypt from 'bcryptjs';
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

export function normalizeDatabaseUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    // Detect Render internal hostnames like "dpg-xxxxxx-a" without dots
    if (/^dpg-[a-z0-9]+(-[a-z0-9]+)*$/i.test(parsed.hostname) && !parsed.hostname.includes('.')) {
      parsed.hostname = `${parsed.hostname}.oregon-postgres.render.com`;
      return parsed.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export function getPool(): PgPool | null {
  if (pool) return pool;
  const rawConnectionString = process.env.DATABASE_URL?.trim();
  if (!rawConnectionString) return null;

  const connectionString = normalizeDatabaseUrl(rawConnectionString);
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  try {
    const config: PoolConfig = {
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '0', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '15000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '10000', 10),
      maxUses: 7500, // Recycle connections periodically to prevent memory leaks
    };

    pool = new Pool(config);
    pool.on('error', (err) => {
      // Handle idle client disconnections cleanly without crashing
      isPostgresHealthy = false;
      initPromise = null;
    });

    return pool;
  } catch (err) {
    return null;
  }
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
    subscriptionExpiresAt: new Date(row.subscription_expires_at).toISOString(),
    referralCode: row.referral_code,
    referredBy: row.referred_by || undefined,
    commissionRate: parseFloat(row.commission_rate) || 0,
    balance: parseFloat(row.balance) || 0,
    pendingBalance: parseFloat(row.pending_balance) || 0,
    totalEarned: parseFloat(row.total_earned) || 0,
    createdAt: new Date(row.created_at).toISOString(),
    lastLoginAt: new Date(row.last_login_at).toISOString(),
    avatarUrl: row.avatar_url || undefined,
    phone: row.phone || undefined,
    notes: row.notes || undefined,
    assignedCoachId: row.assigned_coach_id || undefined,
    coachSpecialty: row.coach_specialty || undefined,
    trainingStatus: row.training_status || undefined,
    trainingProgress: typeof row.training_progress === 'string' ? JSON.parse(row.training_progress) : (row.training_progress || undefined),
    permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || undefined),
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
  const p = getPool();
  if (!p) return false;

  if (isPostgresHealthy) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const client = await p.connect();
      try {
        // 1. Create tables and indexes if they do not exist
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(100) PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'client',
            subscription_status VARCHAR(50) NOT NULL DEFAULT 'active',
            subscription_plan VARCHAR(255) NOT NULL DEFAULT 'Standard SMC Pro Access',
            subscription_expires_at TIMESTAMPTZ NOT NULL,
            referral_code VARCHAR(50) UNIQUE NOT NULL,
            referred_by VARCHAR(100),
            commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
            balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            total_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            avatar_url TEXT,
            phone VARCHAR(100),
            notes TEXT,
            assigned_coach_id VARCHAR(100),
            coach_specialty VARCHAR(255),
            training_status VARCHAR(50),
            training_progress JSONB,
            permissions JSONB
          );

          CREATE TABLE IF NOT EXISTS transactions (
            id VARCHAR(100) PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            username VARCHAR(100) NOT NULL,
            type VARCHAR(50) NOT NULL,
            amount NUMERIC(12, 2) NOT NULL,
            description TEXT NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'completed',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            metadata JSONB
          );

          CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR(100) PRIMARY KEY,
            actor_id VARCHAR(100) NOT NULL,
            actor_username VARCHAR(100) NOT NULL,
            actor_role VARCHAR(50) NOT NULL,
            action VARCHAR(100) NOT NULL,
            target_id VARCHAR(100),
            target_username VARCHAR(100),
            details TEXT NOT NULL,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            metadata JSONB
          );

          CREATE TABLE IF NOT EXISTS operational_items (
            id VARCHAR(100) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            priority VARCHAR(50) NOT NULL DEFAULT 'medium',
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            assigned_to VARCHAR(100),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            notes TEXT
          );

          CREATE TABLE IF NOT EXISTS rbac_settings (
            role VARCHAR(50) PRIMARY KEY,
            permissions JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_by VARCHAR(100)
          );

          CREATE TABLE IF NOT EXISTS system_settings (
            id INT PRIMARY KEY DEFAULT 1,
            default_client_commission NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
            default_employee_commission NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
            default_admin_commission NUMERIC(5, 2) NOT NULL DEFAULT 25.00,
            site_name VARCHAR(255) NOT NULL DEFAULT 'SMTrading.pro',
            youtube_channel_id VARCHAR(255),
            youtube_channel_handle VARCHAR(255)
          );

          CREATE INDEX IF NOT EXISTS idx_users_username ON users(LOWER(username));
          CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
          CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(UPPER(referral_code));
          CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
          CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, subscription_status);
          CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
          CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
        `);

        // Check if database needs seeding
        const userCountRes = await client.query('SELECT COUNT(*) as count FROM users');
        const userCount = parseInt(userCountRes.rows[0].count, 10);

        if (userCount === 0) {
          console.log('[PostgreSQL] Database is empty. Seeding initial institutional records with multi-role hierarchy...');

          const now = new Date();
          const futureDate = new Date();
          futureDate.setFullYear(now.getFullYear() + 1);
          const pastDate = new Date();
          pastDate.setMonth(now.getMonth() - 1);

          await client.query(`
            INSERT INTO users (
              id, username, email, password_hash, full_name, role,
              subscription_status, subscription_plan, subscription_expires_at,
              referral_code, referred_by, commission_rate, balance, pending_balance,
              total_earned, created_at, last_login_at, avatar_url, notes
            ) VALUES 
            (
              'usr_admin_01', 'abuasad2299', 'admin@smtrading.pro',
              '$2b$10$1nj2foj1RxoiTnWdiSUMGePY5aP5G92IwHfIad5rc0WliaLOCBZJO',
              'Abu Asad Almansi (Super Admin)', 'super_admin', 'active',
              'Institutional Master VIP', $1, 'SMADMIN', NULL,
              25.00, 14500.00, 1200.00, 48900.00, '2025-01-01T00:00:00.000Z', $2,
              '/abu_asad_almansi.jpg', 'Master Super Administrator with full platform control'
            ),
            (
              'usr_admin_02', 'admin_sarah', 'sarah.admin@smtrading.pro',
              '$2b$10$1nj2foj1RxoiTnWdiSUMGePY5aP5G92IwHfIad5rc0WliaLOCBZJO',
              'Sarah Jenkins (Operations & Student Admin)', 'admin', 'active',
              'Administrative Executive Access', $1, 'SARAHADMIN', 'usr_admin_01',
              20.00, 2800.00, 200.00, 7500.00, '2025-02-10T00:00:00.000Z', $2,
              'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
              'General Admin managing client enrollments and subscriptions'
            ),
            (
              'usr_emp_01', 'employee', 'analyst@smtrading.pro',
              '$2b$10$grhF2lAM/3xcYrrwyFP1PeFuIQxg8Wn2c/S/z2YX/8HJJ6ze729ai',
              'Senior Market Analyst (Staff Desk)', 'employee', 'active',
              'Staff Executive Access', $1, 'SMSTAFF', 'usr_admin_01',
              18.00, 3420.00, 450.00, 12800.00, '2025-03-15T00:00:00.000Z', $2,
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
              'Operations staff responsible for market briefs and live stream monitoring'
            ),
            (
              'usr_coach_01', 'coach_tariq', 'coach.tariq@smtrading.pro',
              '$2b$10$grhF2lAM/3xcYrrwyFP1PeFuIQxg8Wn2c/S/z2YX/8HJJ6ze729ai',
              'Coach Tariq Al-Mansoor (Institutional SMC Coach)', 'coach', 'active',
              'Certified SMC Master Coach', $1, 'COACHTARIQ', 'usr_admin_01',
              18.00, 2150.00, 300.00, 8900.00, '2025-04-01T00:00:00.000Z', $2,
              'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
              'Dedicated SMC Order Flow and Execution Coach'
            ),
            (
              'usr_client_01', 'trader_pro', 'trader@example.com',
              '$2b$10$uZxbDSOwUGDC6ULexY6XMO7pLcM8s5jQs13nd3KuMXB906Rz79fU6',
              'Karim Benali (VIP Student)', 'client', 'active',
              'Pro Order Flow & SMC Quarterly', $1, 'TRADERPRO99', 'usr_emp_01',
              10.00, 850.00, 150.00, 2400.00, '2025-06-10T00:00:00.000Z', $2,
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
              'Active mentorship student assigned to Coach Tariq'
            ),
            (
              'usr_client_02', 'trader_expired', 'expired_user@example.com',
              '$2b$10$uZxbDSOwUGDC6ULexY6XMO7pLcM8s5jQs13nd3KuMXB906Rz79fU6',
              'Sami Vance (Client)', 'client', 'expired',
              'Monthly SMC Pass (Expired)', $3, 'SAMIVANCE', 'usr_emp_01',
              10.00, 120.00, 0.00, 350.00, '2025-02-01T00:00:00.000Z', $3,
              'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80',
              'Subscription ended last month. Needs renewal.'
            )
            ON CONFLICT (id) DO NOTHING;
          `, [futureDate.toISOString(), now.toISOString(), pastDate.toISOString()]);

          // Seed default audit logs
          await client.query(`
            INSERT INTO audit_logs (id, actor_id, actor_username, actor_role, action, target_id, target_username, details, timestamp)
            VALUES
            ('log_seed_01', 'usr_admin_01', 'abuasad2299', 'super_admin', 'SYSTEM_INITIALIZATION', NULL, NULL, 'Platform initialized with Super Admin, Admin, Employee, and Coach RBAC tiers', NOW() - INTERVAL '10 days'),
            ('log_seed_02', 'usr_admin_01', 'abuasad2299', 'super_admin', 'ROLE_ASSIGNMENT', 'usr_admin_02', 'admin_sarah', 'Appointed Sarah Jenkins as Operations & Student Administrator', NOW() - INTERVAL '8 days'),
            ('log_seed_03', 'usr_admin_01', 'abuasad2299', 'super_admin', 'COACH_ASSIGNMENT', 'usr_coach_01', 'coach_tariq', 'Assigned Institutional SMC Coaching duties to Tariq Al-Mansoor', NOW() - INTERVAL '5 days')
            ON CONFLICT (id) DO NOTHING;
          `);

          // Seed default transactions
          await client.query(`
            INSERT INTO transactions (id, user_id, username, type, amount, description, status, created_at)
            VALUES
            ('tx_seed_01', 'usr_admin_01', 'abuasad2299', 'commission', 500.00, 'Tier-1 Referral Commission from VIP Enterprise Enrollment', 'completed', NOW() - INTERVAL '2 days'),
            ('tx_seed_02', 'usr_emp_01', 'employee', 'commission', 250.00, 'Direct Affiliate commission for Bookmap Master Strategy sale', 'completed', NOW() - INTERVAL '4 days'),
            ('tx_seed_03', 'usr_client_01', 'trader_pro', 'commission', 80.00, 'Referral reward from invited trading buddy', 'completed', NOW() - INTERVAL '7 days')
            ON CONFLICT (id) DO NOTHING;
          `);

          // Seed system settings
          await client.query(`
            INSERT INTO system_settings (id, default_client_commission, default_employee_commission, default_admin_commission, site_name)
            VALUES (1, 10.00, 18.00, 25.00, 'SMTrading.pro')
            ON CONFLICT (id) DO NOTHING;
          `);

          console.log('[PostgreSQL] Initial seed completed successfully.');
        } else {
          // Ensure default system settings row exists
          await client.query(`
            INSERT INTO system_settings (id, default_client_commission, default_employee_commission, default_admin_commission, site_name)
            VALUES (1, 10.00, 18.00, 25.00, 'SMTrading.pro')
            ON CONFLICT (id) DO NOTHING;
          `);
        }

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
  const p = getPool();
  if (!p) {
    throw new Error("[Database Error] DATABASE_URL is not configured. PostgreSQL is the only supported storage engine.");
  }
  const ready = await isPostgresReady();
  if (!ready || !isPostgresHealthy) {
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
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1", [clean]);
    return res.rows.length > 0 ? mapUserRow(res.rows[0]) : undefined;
  }

  static async findUserByEmail(email: string): Promise<UserRecord | undefined> {
    const clean = (email || "").trim().toLowerCase();
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [clean]);
    return res.rows.length > 0 ? mapUserRow(res.rows[0]) : undefined;
  }

  static async findUserById(id: string): Promise<UserRecord | undefined> {
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
    return res.rows.length > 0 ? mapUserRow(res.rows[0]) : undefined;
  }

  static async findUserByReferralCode(code: string): Promise<UserRecord | undefined> {
    const p = await getActivePg();
    const res = await p.query("SELECT * FROM users WHERE UPPER(referral_code) = UPPER($1) LIMIT 1", [code.trim()]);
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
        assigned_coach_id, coach_specialty, training_status, training_progress, permissions
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25
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

      // Find referrer by ID or referralCode
      const referrerRes = await client.query(
        "SELECT * FROM users WHERE id = $1 OR UPPER(referral_code) = UPPER($2) LIMIT 1",
        [buyer.referredBy, buyer.referredBy]
      );
      if (referrerRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return;
      }
      const referrer = mapUserRow(referrerRes.rows[0]);

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
        VALUES ($1, $2, $3, commission, $4, $5, completed, $6, $7)
      `, [
        txId,
        referrer.id,
        referrer.username,
        commissionAmount,
        `${description} (Referred: @${buyer.username} [${commissionRate}%])`,
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
