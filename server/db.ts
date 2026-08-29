import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

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

const DB_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DB_DIR, 'database.json');

function ensureDbFile(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    // Generate default seed users with hashed passwords
    const salt = bcrypt.genSaltSync(10);
    const now = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(now.getFullYear() + 1);

    const pastDate = new Date();
    pastDate.setMonth(now.getMonth() - 1);

    const initialData: DatabaseSchema = {
      users: [
        {
          id: 'usr_admin_01',
          username: 'admin',
          email: 'admin@smtrading.pro',
          passwordHash: '$2b$12$XXC/paKh35Av8kpvRoMpAuxxphwESXGNLS5xgagZrYA66YTKWhduG', // Bcrypt 12-rounds secure hash
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
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
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
          username: 'admin',
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

export class Database {
  private static getDB(): DatabaseSchema {
    return ensureDbFile();
  }

  private static saveDB(data: DatabaseSchema): void {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  // User Operations
  static findUserByUsername(username: string): UserRecord | undefined {
    const db = this.getDB();
    const clean = username.trim().toLowerCase();
    return db.users.find(u => u.username.toLowerCase() === clean);
  }

  static findUserByEmail(email: string): UserRecord | undefined {
    const db = this.getDB();
    const clean = email.trim().toLowerCase();
    return db.users.find(u => u.email.toLowerCase() === clean);
  }

  static findUserById(id: string): UserRecord | undefined {
    const db = this.getDB();
    return db.users.find(u => u.id === id);
  }

  static findUserByReferralCode(code: string): UserRecord | undefined {
    const db = this.getDB();
    const clean = code.trim().toUpperCase();
    return db.users.find(u => u.referralCode.toUpperCase() === clean);
  }

  static getAllUsers(): UserRecord[] {
    const db = this.getDB();
    return db.users;
  }

  static createUser(user: Omit<UserRecord, 'id' | 'createdAt' | 'lastLoginAt'>): UserRecord {
    const db = this.getDB();
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    
    const newUser: UserRecord = {
      ...user,
      id,
      createdAt: now,
      lastLoginAt: now,
    };

    db.users.push(newUser);
    this.saveDB(db);
    return newUser;
  }

  static updateUser(id: string, updates: Partial<UserRecord>): UserRecord | null {
    const db = this.getDB();
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) return null;

    db.users[index] = {
      ...db.users[index],
      ...updates,
    };

    this.saveDB(db);
    return db.users[index];
  }

  static deleteUser(id: string): boolean {
    const db = this.getDB();
    const initialLen = db.users.length;
    db.users = db.users.filter(u => u.id !== id);
    if (db.users.length !== initialLen) {
      this.saveDB(db);
      return true;
    }
    return false;
  }

  // Referral Calculations & Commission Processing
  static processReferralCommission(referredUserId: string, saleAmount: number, description: string): void {
    const db = this.getDB();
    const buyer = db.users.find(u => u.id === referredUserId);
    if (!buyer || !buyer.referredBy) return;

    // Find referrer by ID or referralCode
    const referrer = db.users.find(u => u.id === buyer.referredBy || u.referralCode.toUpperCase() === buyer.referredBy?.toUpperCase());
    if (!referrer) return;

    const commissionRate = referrer.commissionRate || 10;
    const commissionAmount = Number(((saleAmount * commissionRate) / 100).toFixed(2));

    referrer.balance = Number((referrer.balance + commissionAmount).toFixed(2));
    referrer.totalEarned = Number((referrer.totalEarned + commissionAmount).toFixed(2));

    // Record Transaction
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
    this.saveDB(db);
  }

  // Transaction Operations
  static addTransaction(tx: Omit<TransactionRecord, 'id' | 'createdAt'>): TransactionRecord {
    const db = this.getDB();
    const newTx: TransactionRecord = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    db.transactions.unshift(newTx);
    this.saveDB(db);
    return newTx;
  }

  static getTransactionsByUser(userId: string): TransactionRecord[] {
    const db = this.getDB();
    return db.transactions.filter(t => t.userId === userId);
  }

  static getAllTransactions(): TransactionRecord[] {
    const db = this.getDB();
    return db.transactions;
  }

  static getReferralsForUser(referrerCodeOrId: string): UserRecord[] {
    const db = this.getDB();
    const user = db.users.find(u => u.id === referrerCodeOrId || u.referralCode === referrerCodeOrId);
    if (!user) return [];
    
    return db.users.filter(
      u => u.referredBy === user.id || u.referredBy?.toUpperCase() === user.referralCode.toUpperCase()
    );
  }

  static getSystemSettings(): DatabaseSchema['systemSettings'] {
    const db = this.getDB();
    return db.systemSettings || {
      defaultClientCommission: 10,
      defaultEmployeeCommission: 15,
      defaultAdminCommission: 25,
      siteName: 'SMTrading Pro Desk',
    };
  }

  static updateSystemSettings(settings: Partial<DatabaseSchema['systemSettings']>): DatabaseSchema['systemSettings'] {
    const db = this.getDB();
    db.systemSettings = {
      ...(db.systemSettings || {
        defaultClientCommission: 10,
        defaultEmployeeCommission: 15,
        defaultAdminCommission: 25,
        siteName: 'SMTrading Pro Desk',
      }),
      ...settings,
    };
    this.saveDB(db);
    return db.systemSettings;
  }
}

