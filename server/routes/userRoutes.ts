import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Database } from '../db';
import { authenticateToken, sanitizeUser, AuthRequest } from '../auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/user/profile
router.get('/profile', (req: AuthRequest, res: Response): void => {
  const user = Database.findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User profile not found.' });
    return;
  }
  res.json({ success: true, profile: sanitizeUser(user) });
});

// PATCH /api/user/profile
router.patch('/profile', (req: AuthRequest, res: Response): void => {
  const { fullName, phone, avatarUrl, email, username } = req.body;
  const user = req.user!;
  const updates: any = {};

  if (fullName !== undefined) updates.fullName = fullName.trim();
  if (phone !== undefined) updates.phone = phone.trim();
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl.trim();

  // Email update validation
  if (email !== undefined) {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    const existingUser = Database.findUserByEmail(cleanEmail);
    if (existingUser && existingUser.id !== user.id) {
      res.status(400).json({ error: 'This email address is already registered to another account.' });
      return;
    }
    updates.email = cleanEmail;
  }

  // Username update validation (Admin / Super Admin privilege only)
  if (username !== undefined) {
    const cleanUsername = username.trim();
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Changing username is restricted to Super Admin only.' });
      return;
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      res.status(400).json({ error: 'Username must be at least 3 characters long.' });
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, dashes, and periods.' });
      return;
    }
    const existingUser = Database.findUserByUsername(cleanUsername);
    if (existingUser && existingUser.id !== user.id) {
      res.status(400).json({ error: 'This username is already taken by another account.' });
      return;
    }
    updates.username = cleanUsername;
  }

  const updated = Database.updateUser(user.id, updates);
  if (!updated) {
    res.status(404).json({ error: 'Failed to update profile.' });
    return;
  }

  res.json({ success: true, profile: sanitizeUser(updated) });
});

// POST /api/user/change-password
router.post('/change-password', (req: AuthRequest, res: Response): void => {
  const { currentPassword, newPassword } = req.body;
  const user = Database.findUserById(req.user!.id);

  if (!user) {
    res.status(404).json({ error: 'User account not found.' });
    return;
  }

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Both current password and new password are required.' });
    return;
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    return;
  }

  // Verify current password against stored bcrypt hash
  const isMatch = bcrypt.compareSync(currentPassword, user.passwordHash);
  if (!isMatch) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

  // Generate strong salt and hash new password
  const salt = bcrypt.genSaltSync(12);
  const newPasswordHash = bcrypt.hashSync(newPassword, salt);

  Database.updateUser(user.id, { passwordHash: newPasswordHash });

  // Log password update in transactions/audit
  Database.addTransaction({
    userId: user.id,
    username: user.username,
    type: 'manual_adjustment',
    amount: 0,
    description: 'Security credential update: Password modified by account holder',
    status: 'completed',
    metadata: {
      action: 'change_password',
      timestamp: new Date().toISOString(),
    }
  });

  res.json({
    success: true,
    message: 'Your password has been changed successfully.',
  });
});

// GET /api/user/referrals
router.get('/referrals', (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const user = Database.findUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const referrals = Database.getReferralsForUser(user.id);
  const sanitizedReferrals = referrals.map(r => ({
    id: r.id,
    username: r.username,
    fullName: r.fullName,
    role: r.role,
    subscriptionStatus: r.subscriptionStatus,
    createdAt: r.createdAt,
    avatarUrl: r.avatarUrl,
  }));

  const transactions = Database.getTransactionsByUser(userId).filter(t => t.type === 'commission');

  res.json({
    success: true,
    referralCode: user.referralCode,
    commissionRate: user.commissionRate,
    balance: user.balance,
    pendingBalance: user.pendingBalance,
    totalEarned: user.totalEarned,
    totalReferredCount: sanitizedReferrals.length,
    referrals: sanitizedReferrals,
    commissionHistory: transactions,
  });
});

// GET /api/user/transactions
router.get('/transactions', (req: AuthRequest, res: Response): void => {
  const transactions = Database.getTransactionsByUser(req.user!.id);
  res.json({ success: true, transactions });
});

// POST /api/user/activate-subscription
router.post('/activate-subscription', (req: AuthRequest, res: Response): void => {
  const { durationMonths = 1, planName = 'Pro Institutional Trading Pass' } = req.body;
  const user = Database.findUserById(req.user!.id);

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const planCost = durationMonths === 12 ? 990 : durationMonths === 3 ? 290 : 120;
  
  // Calculate new expiration date
  const baseDate = user.subscriptionStatus === 'active' && new Date(user.subscriptionExpiresAt) > new Date()
    ? new Date(user.subscriptionExpiresAt)
    : new Date();
  
  baseDate.setMonth(baseDate.getMonth() + Number(durationMonths));

  const updatedUser = Database.updateUser(user.id, {
    subscriptionStatus: 'active',
    subscriptionPlan: planName,
    subscriptionExpiresAt: baseDate.toISOString(),
  });

  // Record user subscription transaction
  Database.addTransaction({
    userId: user.id,
    username: user.username,
    type: 'subscription_purchase',
    amount: planCost,
    description: `Subscription activated: ${planName} (${durationMonths} Month${durationMonths > 1 ? 's' : ''})`,
    status: 'completed',
    metadata: {
      durationMonths,
      planName,
      expiresAt: baseDate.toISOString(),
    }
  });

  // Process referral commission for referrer if user was referred
  Database.processReferralCommission(
    user.id,
    planCost,
    `Commission on ${durationMonths}-month plan renewal`
  );

  res.json({
    success: true,
    message: `Subscription successfully activated until ${baseDate.toLocaleDateString()}`,
    user: sanitizeUser(updatedUser!),
  });
});

// POST /api/user/request-payout
router.post('/request-payout', (req: AuthRequest, res: Response): void => {
  const { amount, payoutMethod, payoutAddress } = req.body;
  const user = Database.findUserById(req.user!.id);

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const requestAmount = Number(amount);
  if (!requestAmount || isNaN(requestAmount) || requestAmount <= 0) {
    res.status(400).json({ error: 'Invalid payout amount.' });
    return;
  }

  if (requestAmount > user.balance) {
    res.status(400).json({ error: `Insufficient commission balance. Current available balance is $${user.balance.toFixed(2)}.` });
    return;
  }

  if (requestAmount < 50) {
    res.status(400).json({ error: 'Minimum payout threshold is $50.00 USD.' });
    return;
  }

  // Deduct balance and move to pending
  const newBalance = Number((user.balance - requestAmount).toFixed(2));
  const newPending = Number((user.pendingBalance + requestAmount).toFixed(2));

  Database.updateUser(user.id, {
    balance: newBalance,
    pendingBalance: newPending,
  });

  const tx = Database.addTransaction({
    userId: user.id,
    username: user.username,
    type: 'payout_request',
    amount: requestAmount,
    description: `Payout Request: $${requestAmount.toFixed(2)} via ${payoutMethod || 'USDT/Crypto'} (${payoutAddress || 'Standard Wallet'})`,
    status: 'pending',
    metadata: {
      payoutMethod,
      payoutAddress,
      requestedAt: new Date().toISOString(),
    }
  });

  res.json({
    success: true,
    message: `Payout request of $${requestAmount.toFixed(2)} submitted to administrator.`,
    transaction: tx,
    newBalance,
    newPending,
  });
});

export default router;
