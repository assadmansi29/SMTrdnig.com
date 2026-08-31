import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Database, UserRecord, UserRole, SubscriptionStatus } from '../db';
import { authenticateToken, requireRole, sanitizeUser, AuthRequest } from '../auth';

const router = Router();

// Strict server-side security: all routes here require Authentication and 'admin' role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// GET /api/admin/stats
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  const users = await Database.getAllUsers();
  const transactions = await Database.getAllTransactions();

  const totalUsers = users.length;
  const activeSubscribers = users.filter(u => u.subscriptionStatus === 'active').length;
  const expiredSubscribers = users.filter(u => u.subscriptionStatus === 'expired').length;
  const employeeCount = users.filter(u => u.role === 'employee').length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const totalBalanceLiability = users.reduce((acc, u) => acc + (u.balance || 0), 0);
  const totalCommissionsPaid = transactions
    .filter(t => t.type === 'commission')
    .reduce((acc, t) => acc + t.amount, 0);

  res.json({
    success: true,
    stats: {
      totalUsers,
      activeSubscribers,
      expiredSubscribers,
      employeeCount,
      adminCount,
      totalBalanceLiability: Number(totalBalanceLiability.toFixed(2)),
      totalCommissionsPaid: Number(totalCommissionsPaid.toFixed(2)),
      totalTransactions: transactions.length,
    }
  });
});

// GET /api/admin/users
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  const users = await Database.getAllUsers();
  const sanitized = await Promise.all(
    users.map(async (u) => {
      const referrals = await Database.getReferralsForUser(u.id);
      return {
        ...sanitizeUser(u),
        referralsCount: referrals.length,
      };
    })
  );
  res.json({ success: true, users: sanitized });
});

// POST /api/admin/users (Create User)
router.post('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password, fullName, role, subscriptionStatus, commissionRate, balance, planName } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email, and password are required.' });
      return;
    }

    if (await Database.findUserByUsername(username)) {
      res.status(409).json({ error: 'Username already in use.' });
      return;
    }

    if (await Database.findUserByEmail(email)) {
      res.status(409).json({ error: 'Email already in use.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRefCode = `SM${username.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6)}${Math.floor(100 + Math.random() * 900)}`;
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 1);

    const newUser = await Database.createUser({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      fullName: fullName?.trim() || username.trim(),
      role: (role as UserRole) || 'client',
      subscriptionStatus: (subscriptionStatus as SubscriptionStatus) || 'active',
      subscriptionPlan: planName || 'Administrator Managed Access',
      subscriptionExpiresAt: expDate.toISOString(),
      referralCode: userRefCode,
      commissionRate: Number(commissionRate) || (role === 'admin' ? 25 : role === 'employee' ? 18 : 10),
      balance: Number(balance) || 0.0,
      pendingBalance: 0.0,
      totalEarned: Number(balance) || 0.0,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
      notes: `Created directly by Admin @${req.user!.username}`,
    });

    res.status(201).json({ success: true, user: sanitizeUser(newUser) });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['client', 'employee', 'admin'].includes(role)) {
    res.status(400).json({ error: 'Invalid role. Must be client, employee, or admin.' });
    return;
  }

  // Prevent admin from locking themselves out if they are the only admin
  if (id === req.user!.id && role !== 'admin') {
    res.status(400).json({ error: 'You cannot demote your own active admin account.' });
    return;
  }

  const updated = await Database.updateUser(id, { role });
  if (!updated) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.json({ success: true, message: `User role updated to ${role}`, user: sanitizeUser(updated) });
});

// PATCH /api/admin/users/:id/subscription
router.patch('/users/:id/subscription', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, planName, expiresAt, addMonths } = req.body;

  const targetUser = await Database.findUserById(id);
  if (!targetUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const updates: Partial<UserRecord> = {};
  if (status && ['active', 'expired', 'inactive'].includes(status)) {
    updates.subscriptionStatus = status as SubscriptionStatus;
  }
  if (planName) {
    updates.subscriptionPlan = planName;
  }
  if (expiresAt) {
    updates.subscriptionExpiresAt = new Date(expiresAt).toISOString();
  } else if (addMonths && !isNaN(Number(addMonths))) {
    const base = new Date(targetUser.subscriptionExpiresAt > new Date().toISOString() ? targetUser.subscriptionExpiresAt : new Date());
    base.setMonth(base.getMonth() + Number(addMonths));
    updates.subscriptionExpiresAt = base.toISOString();
    if (!status) updates.subscriptionStatus = 'active';
  }

  const updated = await Database.updateUser(id, updates);
  res.json({ success: true, message: 'Subscription updated successfully', user: sanitizeUser(updated!) });
});

// PATCH /api/admin/users/:id/balance
router.patch('/users/:id/balance', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { amount, action = 'set', reason = 'Admin Balance Adjustment' } = req.body;

  const user = await Database.findUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount)) {
    res.status(400).json({ error: 'Invalid amount.' });
    return;
  }

  let newBalance = user.balance;
  if (action === 'add') {
    newBalance = Number((user.balance + numAmount).toFixed(2));
  } else if (action === 'deduct') {
    newBalance = Number((user.balance - numAmount).toFixed(2));
  } else {
    // action === 'set'
    newBalance = Number(numAmount.toFixed(2));
  }

  const updated = await Database.updateUser(id, { balance: newBalance });

  // Record audit transaction
  await Database.addTransaction({
    userId: user.id,
    username: user.username,
    type: 'manual_adjustment',
    amount: action === 'deduct' ? -numAmount : numAmount,
    description: `Admin Adjustment (@${req.user!.username}): ${reason}`,
    status: 'completed',
    metadata: {
      adminId: req.user!.id,
      adminUsername: req.user!.username,
      previousBalance: user.balance,
      newBalance,
      action,
    }
  });

  res.json({ success: true, message: `Balance updated to $${newBalance.toFixed(2)}`, user: sanitizeUser(updated!) });
});

// PATCH /api/admin/users/:id/commission-rate
router.patch('/users/:id/commission-rate', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { rate } = req.body;

  const numRate = Number(rate);
  if (isNaN(numRate) || numRate < 0 || numRate > 100) {
    res.status(400).json({ error: 'Commission rate must be a percentage between 0 and 100.' });
    return;
  }

  const updated = await Database.updateUser(id, { commissionRate: numRate });
  if (!updated) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.json({ success: true, message: `Referral commission rate set to ${numRate}%`, user: sanitizeUser(updated) });
});

// PATCH /api/admin/users/:id/reset-password
router.patch('/users/:id/reset-password', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  const updated = await Database.updateUser(id, { passwordHash });
  if (!updated) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.json({ success: true, message: `Password for @${updated.username} successfully reset.` });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (id === req.user!.id) {
    res.status(400).json({ error: 'You cannot delete your own admin account.' });
    return;
  }

  const deleted = await Database.deleteUser(id);
  if (!deleted) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.json({ success: true, message: 'User account removed.' });
});

// GET /api/admin/transactions
router.get('/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  const transactions = await Database.getAllTransactions();
  res.json({ success: true, transactions });
});

// PATCH /api/admin/transactions/:id/status
router.patch('/transactions/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['completed', 'pending', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Invalid status.' });
    return;
  }

  const updatedTx = await Database.updateTransactionStatus(id, status);
  if (!updatedTx) {
    res.status(404).json({ error: 'Transaction not found.' });
    return;
  }

  res.json({ success: true, transaction: updatedTx });
});

export default router;
