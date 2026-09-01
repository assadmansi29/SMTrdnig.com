import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import type { Pool as PgPool, PoolConfig } from 'pg';
const { Pool } = pg;

export type UserRole = 'client' | 'employee' | 'admin';
export type SubscriptionStatus = 'active' | 'expired' | 'inactive';

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

export function getPool(): PgPool | null {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return null;

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  try {
    const config: PoolConfig = {
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '0', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '15000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '3000', 10),
      maxUses: 7500, // Recycle connections periodically to prevent memory leaks
    };

    pool = new Pool(config);
    pool.on('error', (err) => {
      // Handle idle client disconnections cleanly without crashing
      isPostgresHealthy = false;
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
    role: row.role as UserRole,
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

export async function isPostgresReady(): Promise<boolean> {
  const p = getPool();
  if (!p) return false;

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
            notes TEXT
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
          CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(type, status);
          CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
        `);

        // 2. Check if database is completely empty before seeding
        const userCountRes = await client.query('SELECT COUNT(*) as count FROM users');
        const userCount = parseInt(userCountRes.rows[0].count, 10);

        if (userCount === 0) {
          console.log('[PostgreSQL] Database is empty. Seeding initial institutional records...');

          const now = new Date();
          const futureDate = new Date();
          futureDate.setFullYear(now.getFullYear() + 1);
          const pastDate = new Date();
          pastDate.setMonth(now.getMonth() - 1);

          // Seed default administrative, employee and client records
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
              'Abu Asad Almansi (Super Admin)', 'admin', 'active',
              'Institutional Master VIP', $1, 'SMADMIN', NULL,
              25.00, 14500.00, 1200.00, 48900.00, '2025-01-01T00:00:00.000Z', $2,
              '/abu_asad_almansi.jpg', 'Main system super administrator with full institutional permissions'
            ),
            (
              'usr_emp_01', 'employee', 'analyst@smtrading.pro',
              '$2b$10$grhF2lAM/3xcYrrwyFP1PeFuIQxg8Wn2c/S/z2YX/8HJJ6ze729ai',
              'Senior Market Analyst', 'employee', 'active',
              'Staff Executive Access', $1, 'SMSTAFF', 'usr_admin_01',
              18.00, 3420.00, 450.00, 12800.00, '2025-03-15T00:00:00.000Z', $2,
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
              'SM Trading staff desk trader and support analyst'
            ),
            (
              'usr_client_01', 'trader_pro', 'trader@example.com',
              '$2b$10$uZxbDSOwUGDC6ULexY6XMO7pLcM8s5jQs13nd3KuMXB906Rz79fU6',
              'Tariq Al-Mansoor', 'client', 'active',
              'Pro Order Flow & SMC Quarterly', $1, 'TRADERPRO99', 'usr_emp_01',
              10.00, 850.00, 150.00, 2400.00, '2025-06-10T00:00:00.000Z', $2,
              'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
              'Active VIP member with verified membership'
            ),
            (
              'usr_client_02', 'trader_expired', 'expired_user@example.com',
              '$2b$10$uZxbDSOwUGDC6ULexY6XMO7pLcM8s5jQs13nd3KuMXB906Rz79fU6',
              'Sami Vance', 'client', 'expired',
              'Monthly SMC Pass (Expired)', $3, 'SAMIVANCE', 'usr_emp_01',
              10.00, 120.00, 0.00, 350.00, '2025-02-01T00:00:00.000Z', $3,
              'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80',
              'Subscription ended last month. Needs renewal.'
            )
            ON CONFLICT (id) DO NOTHING;
          `, [futureDate.toISOString(), now.toISOString(), pastDate.toISOString()]);

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
      console.log(`[Database] PostgreSQL connection not established (${err.message || 'using local storage'}) — active storage engine: Local Persistent JSON.`);
      isPostgresHealthy = false;
      if (pool) {
        try { pool.end(); } catch {}
        pool = null;
      }
      return false;
    }
  })();

  return initPromise;
}

export async function initPostgres(): Promise<void> {
  await isPostgresReady();
}

// ----------------------------------------------------
// Fallback Local File Storage (when DATABASE_URL not set)
// ----------------------------------------------------
const DB_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DB_DIR, 'database.json');

function ensureDbFile(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(now.getFullYear() + 1);
    const pastDate = new Date();
    pastDate.setMonth(now.getMonth() - 1);

    const initialData: DatabaseSchema = {
      users: [
        {
          id: 'usr_admin_01',
          username: 'abuasad2299',
          email: 'admin@smtrading.pro',
          passwordHash: '$2b$10$1nj2foj1RxoiTnWdiSUMGePY5aP5G92IwHfIad5rc0WliaLOCBZJO',
          fullName: 'Abu Asad Almansi (Super Admin)',
          role: 'admin',
          subscriptionStatus: 'active',
          subscriptionPlan: 'Institutional Master VIP',
          subscriptionExpiresAt: futureDate.toISOString(),
          referralCode: 'SMADMIN',
          commissionRate: 25,
          balance: 14500.0,
          pendingBalance: 1200.0,
          totalEarned: 48900.0,
          createdAt: new Date('2025-01-01').toISOString(),
          lastLoginAt: now.toISOString(),
          avatarUrl: '/abu_asad_almansi.jpg',
          notes: 'Main system super administrator with full institutional permissions',
        },
        {
          id: 'usr_emp_01',
          username: 'employee',
          email: 'analyst@smtrading.pro',
          passwordHash: '$2b$10$grhF2lAM/3xcYrrwyFP1PeFuIQxg8Wn2c/S/z2YX/8HJJ6ze729ai',
          fullName: 'Senior Market Analyst',
          role: 'employee',
          subscriptionStatus: 'active',
          subscriptionPlan: 'Staff Executive Access',
          subscriptionExpiresAt: futureDate.toISOString(),
          referralCode: 'SMSTAFF',
          referredBy: 'usr_admin_01',
          commissionRate: 18,
          balance: 3420.0,
          pendingBalance: 450.0,
          totalEarned: 12800.0,
          createdAt: new Date('2025-03-15').toISOString(),
          lastLoginAt: now.toISOString(),
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
          notes: 'SM Trading staff desk trader and support analyst',
        },
        {
          id: 'usr_client_01',
          username: 'trader_pro',
          email: 'trader@example.com',
          passwordHash: '$2b$10$uZxbDSOwUGDC6ULexY6XMO7pLcM8s5jQs13nd3KuMXB906Rz79fU6',
          fullName: 'Tariq Al-Mansoor',
          role: 'client',
          subscriptionStatus: 'active',
          subscriptionPlan: 'Pro Order Flow & SMC Quarterly',
          subscriptionExpiresAt: futureDate.toISOString(),
          referralCode: 'TRADERPRO99',
          referredBy: 'usr_emp_01',
          commissionRate: 10,
          balance: 850.0,
          pendingBalance: 150.0,
          totalEarned: 2400.0,
          createdAt: new Date('2025-06-10').toISOString(),
          lastLoginAt: now.toISOString(),
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
          notes: 'Active VIP member with verified membership',
        },
        {
          id: 'usr_client_02',
          username: 'trader_expired',
          email: 'expired_user@example.com',
          passwordHash: '$2b$10$uZxbDSOwUGDC6ULexY6XMO7pLcM8s5jQs13nd3KuMXB906Rz79fU6',
          fullName: 'Sami Vance',
          role: 'client',
          subscriptionStatus: 'expired',
          subscriptionPlan: 'Monthly SMC Pass (Expired)',
          subscriptionExpiresAt: pastDate.toISOString(),
          referralCode: 'SAMIVANCE',
          referredBy: 'usr_emp_01',
          commissionRate: 10,
          balance: 120.0,
          pendingBalance: 0.0,
          totalEarned: 350.0,
          createdAt: new Date('2025-02-01').toISOString(),
          lastLoginAt: pastDate.toISOString(),
          avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80',
          notes: 'Subscription ended last month. Needs renewal.',
        }
      ],
      transactions: [
        {
          id: 'tx_seed_01',
          userId: 'usr_admin_01',
          username: 'abuasad2299',
          type: 'commission',
          amount: 500.0,
          description: 'Tier-1 Referral Commission from VIP Enterprise Enrollment',
          status: 'completed',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: 'tx_seed_02',
          userId: 'usr_emp_01',
          username: 'employee',
          type: 'commission',
          amount: 250.0,
          description: 'Direct Affiliate commission for Bookmap Master Strategy sale',
          status: 'completed',
          createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        },
        {
          id: 'tx_seed_03',
          userId: 'usr_client_01',
          username: 'trader_pro',
          type: 'commission',
          amount: 80.0,
          description: 'Referral reward from invited trading buddy',
          status: 'completed',
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        }
      ],
      systemSettings: {
        defaultClientCommission: 10,
        defaultEmployeeCommission: 18,
        defaultAdminCommission: 25,
        siteName: 'SMTrading.pro',
      },
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch (err) {
    console.error('Error reading database file, reinitializing', err);
    return ensureDbFile();
  }
}

function saveDbFile(data: DatabaseSchema): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  const tempFile = `${DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    // Direct write fallback
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }
}

async function getActivePg(): Promise<PgPool | null> {
  const hasDatabaseUrl = !!process.env.DATABASE_URL?.trim();

  try {
    const ready = await isPostgresReady();

    if (ready && isPostgresHealthy && pool) {
      return pool;
    }

    if (hasDatabaseUrl) {
      throw new Error('PostgreSQL is configured but currently unavailable.');
    }
  } catch (err) {
    isPostgresHealthy = false;

    if (hasDatabaseUrl) {
      throw err;
    }
  }

  return null;
}

// ----------------------------------------------------
// Unified Database Layer API
// ----------------------------------------------------
export class Database {
  // User Operations
  static async findUserByUsername(username: string): Promise<UserRecord | undefined> {
    const clean = (username || '').trim().toLowerCase();
    const p = await getActivePg();
    if (p) {
      try {
        const res = await p.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [clean]);
        if (res.rows.length > 0) return mapUserRow(res.rows[0]);
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    return db.users.find(u => u.username.toLowerCase() === clean);
  }

  static async findUserByEmail(email: string): Promise<UserRecord | undefined> {
    const clean = (email || '').trim().toLowerCase();
    const p = await getActivePg();
    if (p) {
      try {
        const res = await p.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [clean]);
        if (res.rows.length > 0) return mapUserRow(res.rows[0]);
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    return db.users.find(u => u.email.toLowerCase() === clean);
  }

  static async findUserById(id: string): Promise<UserRecord | undefined> {
    const p = await getActivePg();
    if (p) {
      try {
        const res = await p.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
        return res.rows.length > 0 ? mapUserRow(res.rows[0]) : undefined;
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    return db.users.find(u => u.id === id);
  }

  static async findUserByReferralCode(code: string): Promise<UserRecord | undefined> {
    const p = await getActivePg();
    if (p) {
      try {
        const res = await p.query('SELECT * FROM users WHERE UPPER(referral_code) = UPPER($1) LIMIT 1', [code.trim()]);
        return res.rows.length > 0 ? mapUserRow(res.rows[0]) : undefined;
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    const clean = code.trim().toUpperCase();
    return db.users.find(u => u.referralCode.toUpperCase() === clean);
  }

  static async getAllUsers(): Promise<UserRecord[]> {
    const p = await getActivePg();
    if (p) {
      try {
        const res = await p.query('SELECT * FROM users ORDER BY created_at DESC');
        return res.rows.map(mapUserRow);
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    return db.users;
  }

  static async createUser(user: Omit<UserRecord, 'id' | 'createdAt' | 'lastLoginAt'>): Promise<UserRecord> {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const p = await getActivePg();
    if (p) {
      try {
        const query = `
          INSERT INTO users (
            id, username, email, password_hash, full_name, role,
            subscription_status, subscription_plan, subscription_expires_at,
            referral_code, referred_by, commission_rate, balance, pending_balance,
            total_earned, created_at, last_login_at, avatar_url, phone, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18, $19, $20
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
        ];
        const res = await p.query(query, values);
        return mapUserRow(res.rows[0]);
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    const newUser: UserRecord = {
      ...user,
      id,
      createdAt: now,
      lastLoginAt: now,
    };
    db.users.push(newUser);
    saveDbFile(db);
    return newUser;
  }

  static async updateUser(id: string, updates: Partial<UserRecord>): Promise<UserRecord | null> {
    const p = await getActivePg();
    if (p) {
      try {
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

        if (fields.length === 0) {
          return this.findUserById(id);
        }

        values.push(id);
        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
        const res = await p.query(query, values);
        return res.rows.length > 0 ? mapUserRow(res.rows[0]) : null;
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) return null;

    db.users[index] = {
      ...db.users[index],
      ...updates,
    };
    saveDbFile(db);
    return db.users[index];
  }

  static async deleteUser(id: string): Promise<boolean> {
    const p = await getActivePg();
    if (p) {
      try {
        const res = await p.query('DELETE FROM users WHERE id = $1', [id]);
        return (res.rowCount ?? 0) > 0;
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    const initialLen = db.users.length;
    db.users = db.users.filter(u => u.id !== id);
    if (db.users.length !== initialLen) {
      saveDbFile(db);
      return true;
    }
    return false;
  }

  // Multi-step Atomic Referral Commission Processing
  static async processReferralCommission(referredUserId: string, saleAmount: number, description: string): Promise<void> {
    const p = await getActivePg();
    if (p) {
      const client = await p.connect();
      try {
        await client.query('BEGIN');

        const buyerRes = await client.query('SELECT * FROM users WHERE id = $1', [referredUserId]);
        if (buyerRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return;
        }
        const buyer = mapUserRow(buyerRes.rows[0]);
        if (!buyer.referredBy) {
          await client.query('ROLLBACK');
          return;
        }

        // Find referrer by ID or referralCode
        const referrerRes = await client.query(
          'SELECT * FROM users WHERE id = $1 OR UPPER(referral_code) = UPPER($2) LIMIT 1',
          [buyer.referredBy, buyer.referredBy]
        );
        if (referrerRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return;
        }
        const referrer = mapUserRow(referrerRes.rows[0]);

        const commissionRate = referrer.commissionRate || 10;
        const commissionAmount = Number(((saleAmount * commissionRate) / 100).toFixed(2));

        // Update balances atomically
        await client.query(
          'UPDATE users SET balance = balance + $1, total_earned = total_earned + $1 WHERE id = $2',
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
          VALUES ($1, $2, $3, 'commission', $4, $5, 'completed', $6, $7)
        `, [
          txId,
          referrer.id,
          referrer.username,
          commissionAmount,
          `${description} (Referred: @${buyer.username} [${commissionRate}%])`,
          now,
          JSON.stringify(metadata),
        ]);

        await client.query('COMMIT');
        return;
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn('[PostgreSQL referral commission error, falling back to JSON db]:', err);
      } finally {
        client.release();
      }
    }

    const db = ensureDbFile();
    const buyer = db.users.find(u => u.id === referredUserId);
    if (!buyer || !buyer.referredBy) return;

    const referrer = db.users.find(u => u.id === buyer.referredBy || u.referralCode.toUpperCase() === buyer.referredBy?.toUpperCase());
    if (!referrer) return;

    const commissionRate = referrer.commissionRate || 10;
    const commissionAmount = Number(((saleAmount * commissionRate) / 100).toFixed(2));

    referrer.balance = Number((referrer.balance + commissionAmount).toFixed(2));
    referrer.totalEarned = Number((referrer.totalEarned + commissionAmount).toFixed(2));

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tx: TransactionRecord = {
      id: txId,
      userId: referrer.id,
      username: referrer.username,
      type: 'commission',
      amount: commissionAmount,
      description: `${description} (Referred: @${buyer.username} [${commissionRate}%])`,
      status: 'completed',
      createdAt: new Date().toISOString(),
      metadata: {
        referredUserId: buyer.id,
        referredUsername: buyer.username,
        saleAmount,
        commissionRate,
      },
    };

    db.transactions.unshift(tx);
    saveDbFile(db);
  }

  // Transaction Operations
  static async addTransaction(tx: Omit<TransactionRecord, 'id' | 'createdAt'>): Promise<TransactionRecord> {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const p = await getActivePg();
    if (p) {
      try {
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
          tx.status || 'completed',
          now,
          tx.metadata ? JSON.stringify(tx.metadata) : null,
        ]);
        return mapTransactionRow(res.rows[0]);
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    const newTx: TransactionRecord = {
      ...tx,
      id,
      createdAt: now,
    };
    db.transactions.unshift(newTx);
    saveDbFile(db);
    return newTx;
  }

  static async updateTransactionStatus(id: string, status: 'completed' | 'pending' | 'rejected'): Promise<TransactionRecord | null> {
    const p = await getActivePg();
    if (p) {
      try {
        const res = await p.query('UPDATE transactions SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
        return res.rows.length > 0 ? mapTransactionRow(res.rows[0]) : null;
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    const tx = db.transactions.find(t => t.id === id);
    if (!tx) return null;
    tx.status = status;
    saveDbFile(db);
    return tx;
  }

  static async getTransactionsByUser(userId: string): Promise<TransactionRecord[]> {
    const p = await getActivePg();
    if (p) {
      try {
        const res = await p.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return res.rows.map(mapTransactionRow);
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    return db.transactions.filter(t => t.userId === userId);
  }

  static async getAllTransactions(): Promise<TransactionRecord[]> {
    const p = await getActivePg();
    if (p) {
      try {
        const res = await p.query('SELECT * FROM transactions ORDER BY created_at DESC');
        return res.rows.map(mapTransactionRow);
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    return db.transactions;
  }

  static async getReferralsForUser(referrerCodeOrId: string): Promise<UserRecord[]> {
    const p = await getActivePg();
    if (p) {
      try {
        const user = await this.findUserById(referrerCodeOrId) || await this.findUserByReferralCode(referrerCodeOrId);
        if (!user) return [];

        const res = await p.query(
          'SELECT * FROM users WHERE referred_by = $1 OR UPPER(referred_by) = UPPER($2) ORDER BY created_at DESC',
          [user.id, user.referralCode]
        );
        return res.rows.map(mapUserRow);
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    const user = db.users.find(u => u.id === referrerCodeOrId || u.referralCode === referrerCodeOrId);
    if (!user) return [];

    return db.users.filter(
      u => u.referredBy === user.id || u.referredBy?.toUpperCase() === user.referralCode.toUpperCase()
    );
  }

  static async getSystemSettings(): Promise<DatabaseSchema['systemSettings']> {
    const p = await getActivePg();
    if (p) {
      try {
        const res = await p.query('SELECT * FROM system_settings WHERE id = 1 LIMIT 1');
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            defaultClientCommission: parseFloat(row.default_client_commission) || 10,
            defaultEmployeeCommission: parseFloat(row.default_employee_commission) || 18,
            defaultAdminCommission: parseFloat(row.default_admin_commission) || 25,
            siteName: row.site_name || 'SMTrading.pro',
            youtubeChannelId: row.youtube_channel_id || undefined,
            youtubeChannelHandle: row.youtube_channel_handle || undefined,
          };
        }
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    return db.systemSettings || {
      defaultClientCommission: 10,
      defaultEmployeeCommission: 18,
      defaultAdminCommission: 25,
      siteName: 'SMTrading.pro',
    };
  }

  static async updateSystemSettings(settings: Partial<DatabaseSchema['systemSettings']>): Promise<DatabaseSchema['systemSettings']> {
    const p = await getActivePg();
    if (p) {
      try {
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
      } catch (err) {
        console.warn('[PostgreSQL query error, fallback to JSON db]:', err);
      }
    }

    const db = ensureDbFile();
    db.systemSettings = {
      ...(db.systemSettings || {
        defaultClientCommission: 10,
        defaultEmployeeCommission: 18,
        defaultAdminCommission: 25,
        siteName: 'SMTrading.pro',
      }),
      ...settings,
    };
    saveDbFile(db);
    return db.systemSettings;
  }
}
