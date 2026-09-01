import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Database } from '../db';
import { authenticateToken, sanitizeUser, AuthRequest } from '../auth';
import { sendEmailVerificationCode, verifyEmailCode } from '../emailService';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/user/send-profile-code (Send email verification code before updating personal info)
router.post('/send-profile-code', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await Database.findUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    const { targetEmail } = req.body;
    // If updating email, send verification to either target email or current email
    const emailToVerify = (targetEmail && typeof targetEmail === 'string' && targetEmail.trim()) 
      ? targetEmail.trim().toLowerCase() 
      : user.email;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToVerify)) {
      res.status(400).json({ error: 'Invalid email address provided.' });
      return;
    }

    // If target email is changing to a new one, check if it's already used by someone else
    if (emailToVerify !== user.email) {
      const existingUser = await Database.findUserByEmail(emailToVerify);
      if (existingUser && existingUser.id !== user.id) {
        res.status(409).json({ error: 'This email address is already in use by another account.' });
        return;
      }
    }

    const result = await sendEmailVerificationCode(emailToVerify, 'profile_update', {
      username: user.username,
      actionDesc: 'Profile Information Update',
    });

    if (!result.success) {
      res.status(400).json({ error: result.error || 'Failed to send security code.' });
      return;
    }

    res.json({
      success: true,
      email: emailToVerify,
      message: result.message || `Verification code sent to ${emailToVerify}.`,
      previewCode: result.previewCode,
    });
  } catch (err: any) {
    console.error('Send profile code error:', err);
    res.status(500).json({ error: 'Internal server error while sending profile verification code.' });
  }
});

// GET /api/user/profile
router.get('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await Database.findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User profile not found.' });
    return;
  }
  res.json({ success: true, profile: sanitizeUser(user) });
});

// PATCH /api/user/profile
router.patch('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  const { fullName, phone, avatarUrl, email, username, verificationCode } = req.body;
  const user = await Database.findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const updates: any = {};
  let isPersonalInfoChanging = false;

  if (fullName !== undefined && fullName.trim() !== (user.fullName || '')) {
    updates.fullName = fullName.trim();
    isPersonalInfoChanging = true;
  }

  if (phone !== undefined && phone.trim() !== (user.phone || '')) {
    updates.phone = phone.trim();
    isPersonalInfoChanging = true;
  }

  if (avatarUrl !== undefined) {
    updates.avatarUrl = avatarUrl.trim();
  }

  // Email update validation
  let targetEmail = user.email;
  if (email !== undefined && email.trim().toLowerCase() !== user.email.toLowerCase()) {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    const existingUser = await Database.findUserByEmail(cleanEmail);
    if (existingUser && existingUser.id !== user.id) {
      res.status(400).json({ error: 'This email address is already registered to another account.' });
      return;
    }
    updates.email = cleanEmail;
    targetEmail = cleanEmail;
    isPersonalInfoChanging = true;
  }

  // Username update validation (Admin / Super Admin privilege only)
  if (username !== undefined && username.trim() !== user.username) {
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
    const existingUser = await Database.findUserByUsername(cleanUsername);
    if (existingUser && existingUser.id !== user.id) {
      res.status(400).json({ error: 'This username is already taken by another account.' });
      return;
    }
    updates.username = cleanUsername;
    isPersonalInfoChanging = true;
  }

  // If personal details (name, email, phone, or username) are being modified, require verification code!
  if (isPersonalInfoChanging) {
    if (!verificationCode || typeof verificationCode !== 'string' || !verificationCode.trim()) {
      res.status(400).json({ 
        error: 'Email verification code is required to update personal profile information.',
        requiresVerification: true,
      });
      return;
    }

    // Try verifying against targetEmail first, then existing user email
    let verification = verifyEmailCode(targetEmail, verificationCode.trim(), 'profile_update');
    if (!verification.valid && targetEmail !== user.email) {
      verification = verifyEmailCode(user.email, verificationCode.trim(), 'profile_update');
    }

    if (!verification.valid) {
      res.status(400).json({ 
        error: verification.error || 'Invalid or expired security code. Please request a new code.',
        requiresVerification: true,
      });
      return;
    }
  }

  if (Object.keys(updates).length === 0) {
    res.json({ success: true, profile: sanitizeUser(user), message: 'No changes detected.' });
    return;
  }

  const updated = await Database.updateUser(user.id, updates);
  if (!updated) {
    res.status(404).json({ error: 'Failed to update profile.' });
    return;
  }

  res.json({ success: true, profile: sanitizeUser(updated), message: 'Profile updated successfully.' });
});

// POST /api/user/avatar (Upload & Link Profile Picture)
router.post('/avatar', async (req: AuthRequest, res: Response): Promise<void> => {
  const { avatarData } = req.body;
  const user = req.user!;

  if (!avatarData || typeof avatarData !== 'string') {
    res.status(400).json({ error: 'Image data is required.' });
    return;
  }

  const trimmed = avatarData.trim();

  // Validate format (Data URI or valid image URL)
  const isDataUri = /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(trimmed);
  const isHttpUrl = /^https?:\/\/.+\.(jpg|jpeg|png|webp|svg)(\?.*)?$/i.test(trimmed) || trimmed.startsWith('/');

  if (!isDataUri && !isHttpUrl) {
    res.status(400).json({
      error: 'Invalid image format. Please provide a valid JPG, JPEG, PNG, or WEBP photo.',
    });
    return;
  }

  // Validate size if data URI (Max 10MB base64)
  if (isDataUri) {
    const sizeInBytes = (trimmed.length * 3) / 4;
    const maxSizeBytes = 8 * 1024 * 1024; // 8MB
    if (sizeInBytes > maxSizeBytes) {
      res.status(400).json({
        error: 'The selected image is too large. Maximum supported size is 5MB.',
      });
      return;
    }
  }

  const updatedUser = await Database.updateUser(user.id, {
    avatarUrl: trimmed,
  });

  if (!updatedUser) {
    res.status(404).json({ error: 'Failed to update avatar in database.' });
    return;
  }

  res.json({
    success: true,
    message: 'Profile picture successfully updated and saved.',
    avatarUrl: updatedUser.avatarUrl,
    user: sanitizeUser(updatedUser),
  });
});

// DELETE /api/user/avatar (Remove Profile Picture & Reset to Default)
router.delete('/avatar', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;

  const updatedUser = await Database.updateUser(user.id, {
    avatarUrl: '',
  });

  if (!updatedUser) {
    res.status(404).json({ error: 'Failed to remove avatar.' });
    return;
  }

  res.json({
    success: true,
    message: 'Profile picture removed. Default avatar restored.',
    user: sanitizeUser(updatedUser),
  });
});

// POST /api/user/change-password
router.post('/change-password', async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const user = await Database.findUserById(req.user!.id);

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

  await Database.updateUser(user.id, { passwordHash: newPasswordHash });

  // Log password update in transactions/audit
  await Database.addTransaction({
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
router.get('/referrals', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const user = await Database.findUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const referrals = await Database.getReferralsForUser(user.id);
  const sanitizedReferrals = referrals.map(r => ({
    id: r.id,
    username: r.username,
    fullName: r.fullName,
    role: r.role,
    subscriptionStatus: r.subscriptionStatus,
    createdAt: r.createdAt,
    avatarUrl: r.avatarUrl,
  }));

  const userTransactions = await Database.getTransactionsByUser(userId);
  const transactions = userTransactions.filter(t => t.type === 'commission');

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
router.get('/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  const transactions = await Database.getTransactionsByUser(req.user!.id);
  res.json({ success: true, transactions });
});

// POST /api/user/activate-subscription
router.post('/activate-subscription', async (req: AuthRequest, res: Response): Promise<void> => {
  const { durationMonths = 1, planName = 'Pro Institutional Trading Pass' } = req.body;
  const user = await Database.findUserById(req.user!.id);

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

  const updatedUser = await Database.updateUser(user.id, {
    subscriptionStatus: 'active',
    subscriptionPlan: planName,
    subscriptionExpiresAt: baseDate.toISOString(),
  });

  // Record user subscription transaction
  await Database.addTransaction({
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
  await Database.processReferralCommission(
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
router.post('/request-payout', async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, payoutMethod, payoutAddress } = req.body;
  const user = await Database.findUserById(req.user!.id);

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

  await Database.updateUser(user.id, {
    balance: newBalance,
    pendingBalance: newPending,
  });

  const tx = await Database.addTransaction({
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
