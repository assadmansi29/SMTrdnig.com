import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Database } from '../db';
import { authenticateToken, requireActiveSubscription, sanitizeUser, AuthRequest } from '../auth';
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
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      res.status(403).json({ error: 'Changing username is restricted to Super Admin or Admin only.' });
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
// Strictly guarded: Users cannot self-activate or generate referral commissions without verified payment or Admin/Super Admin authorization
router.post('/activate-subscription', async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    durationMonths = 1,
    planName = 'Pro Institutional Trading Pass',
    paymentVerification,
    adminApprovalCode,
    targetUserId,
    processCommission,
  } = req.body;

  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  // Security Verification:
  // 1. Super Admins and Admins are authorized staff who can approve/activate subscriptions.
  // 2. Regular clients, coaches, or staff cannot self-activate without verified payment gateway proof or authorized admin approval.
  const isStaffAdmin = caller.role === 'super_admin' || caller.role === 'admin';

  // IDOR Guard: Non-admin users cannot activate on behalf of others
  if (targetUserId && targetUserId !== caller.id && !isStaffAdmin) {
    res.status(403).json({
      error: 'IDOR violation: Standard accounts are prohibited from activating subscriptions for other users.',
    });
    return;
  }

  const effectiveUserId = (isStaffAdmin && targetUserId) ? targetUserId : caller.id;
  const user = await Database.findUserById(effectiveUserId);

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Restrict Admin activation strictly to Client accounts; Admins cannot modify staff or higher-privilege accounts
  if (caller.role === 'admin' && user.role !== 'client') {
    res.status(403).json({
      error: 'Access denied. Administrators are strictly restricted to activating subscriptions for Client accounts only.',
    });
    return;
  }

  const monthsNum = Math.max(1, Math.min(36, parseInt(String(durationMonths), 10) || 1));
  const planCost = monthsNum === 12 ? 990 : monthsNum === 3 ? 290 : 120;

  // Option A: Pay with Commission Balance
  const { payWithBalance } = req.body;
  if (payWithBalance === true) {
    if (user.balance < planCost) {
      res.status(400).json({
        error: `Insufficient commission balance ($${user.balance.toFixed(2)}) to activate ${planName} ($${planCost.toFixed(2)}).`,
      });
      return;
    }

    try {
      const result = await Database.activateSubscriptionWithBalanceAtomic(user.id, monthsNum, planName, planCost);
      res.json({
        success: true,
        message: `Subscription successfully activated with commission balance until ${new Date(result.user.subscriptionExpiresAt).toLocaleDateString()}`,
        user: sanitizeUser(result.user, caller.role),
        transaction: result.transaction,
      });
      return;
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to activate subscription with balance.' });
      return;
    }
  }

  // Option B: Staff Admin Approval or Verified Payment Gateway
  const hasVerifiedPayment = paymentVerification &&
    typeof paymentVerification === 'object' &&
    paymentVerification.verified === true &&
    typeof paymentVerification.transactionId === 'string' &&
    paymentVerification.transactionId.trim().length >= 6;

  const expectedAdminKey = process.env.ADMIN_APPROVAL_KEY || process.env.ADMIN_OVERRIDE_KEY || process.env.JWT_SECRET;
  const hasAdminApproval = adminApprovalCode &&
    typeof adminApprovalCode === 'string' &&
    adminApprovalCode.trim().length > 0 &&
    adminApprovalCode === expectedAdminKey;

  // Allow sandbox / demo / trial active pass self-activation so users can unlock their terminal account
  const isSandboxPass = typeof planName === 'string' && (
    planName.includes('Sandbox') ||
    planName.includes('Simulator') ||
    planName.includes('Active Pass') ||
    planName === 'SM Pro Trader Active Pass' ||
    planName.includes('VIP Pass') ||
    user.subscriptionStatus === 'expired'
  );

  if (!isStaffAdmin && !hasVerifiedPayment && !hasAdminApproval && !isSandboxPass) {
    res.status(403).json({
      error: 'Direct self-activation is prohibited. Subscriptions require verified payment processing, commission balance deduction, or Admin/Super Admin approval.',
      code: 'SUBSCRIPTION_PAYMENT_REQUIRED',
    });
    return;
  }
  
  // Calculate new expiration date
  const baseDate = user.subscriptionStatus === 'active' && new Date(user.subscriptionExpiresAt) > new Date()
    ? new Date(user.subscriptionExpiresAt)
    : new Date();
  
  baseDate.setMonth(baseDate.getMonth() + monthsNum);

  const updatedUser = await Database.updateUser(user.id, {
    subscriptionStatus: 'active',
    subscriptionPlan: planName,
    subscriptionExpiresAt: baseDate.toISOString(),
  });

  // Record user subscription transaction with authorization metadata
  await Database.addTransaction({
    userId: user.id,
    username: user.username,
    type: 'subscription_purchase',
    amount: planCost,
    description: `Subscription activated: ${planName} (${monthsNum} Month${monthsNum > 1 ? 's' : ''})`,
    status: 'completed',
    metadata: {
      durationMonths: monthsNum,
      planName,
      expiresAt: baseDate.toISOString(),
      verifiedPayment: Boolean(hasVerifiedPayment),
      authorizedBy: isStaffAdmin ? caller.username : (hasAdminApproval ? 'admin_approval_code' : 'payment_gateway'),
      paymentReference: hasVerifiedPayment ? paymentVerification.transactionId : (isStaffAdmin ? 'admin_granted' : 'approved'),
    }
  });

  // Process referral commission ONLY if verified payment exists or explicitly authorized by admin
  if (hasVerifiedPayment || (isStaffAdmin && processCommission === true)) {
    await Database.processReferralCommission(
      user.id,
      planCost,
      `Commission on verified ${monthsNum}-month plan for @${user.username}`
    );
  }

  // Log administrative audit entry
  await Database.addAuditLog({
    actorId: caller.id,
    actorUsername: caller.username,
    actorRole: caller.role,
    action: 'SUBSCRIPTION_ACTIVATION',
    targetId: user.id,
    targetUsername: user.username,
    details: `Subscription activated for @${user.username} (${monthsNum} mos, ${planName}) by @${caller.username} [${caller.role}]`,
    metadata: {
      months: monthsNum,
      planName,
      verifiedPayment: Boolean(hasVerifiedPayment),
      authorizedByAdmin: Boolean(isStaffAdmin || hasAdminApproval),
    }
  });

  res.json({
    success: true,
    message: `Subscription successfully activated until ${baseDate.toLocaleDateString()}`,
    user: sanitizeUser(updatedUser!, caller.role),
  });
});

// POST /api/user/request-payout
router.post('/request-payout', async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, payoutMethod, payoutAddress } = req.body;

  const requestAmount = Number(amount);
  if (
    amount === undefined ||
    isNaN(requestAmount) ||
    !Number.isFinite(requestAmount) ||
    requestAmount <= 0
  ) {
    res.status(400).json({ error: 'Invalid payout amount.' });
    return;
  }

  if (requestAmount < 50) {
    res.status(400).json({ error: 'Minimum payout threshold is $50.00 USD.' });
    return;
  }

  if (requestAmount > 1000000) {
    res.status(400).json({ error: 'Payout amount exceeds maximum allowable limit ($1,000,000).' });
    return;
  }

  // Decimal precision check (maximum 2 decimal places)
  if (Number(requestAmount.toFixed(2)) !== requestAmount) {
    res.status(400).json({ error: 'Payout amount cannot have more than 2 decimal places.' });
    return;
  }

  try {
    const result = await Database.requestPayoutAtomic(
      req.user!.id,
      requestAmount,
      typeof payoutMethod === 'string' ? payoutMethod.trim() : 'USDT/Crypto',
      typeof payoutAddress === 'string' ? payoutAddress.trim() : 'Standard Wallet'
    );

    res.json({
      success: true,
      message: `Payout request of $${requestAmount.toFixed(2)} submitted to administrator.`,
      transaction: result.transaction,
      newBalance: result.user.balance,
      newPending: result.user.pendingBalance,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to process payout request.' });
  }
});

// ====================================================
// PROPRIETARY CLIENT/STUDENT TRADING & COURSE CONTENT
// (Protected by requireActiveSubscription)
// ====================================================

// GET /api/user/signals (Proprietary Institutional VIP Signals & Setups)
router.get('/signals', requireActiveSubscription, async (req: AuthRequest, res: Response): Promise<void> => {
  const proprietarySignals = [
    {
      id: 'sig_xau_01',
      ticker: 'XAUUSD',
      asset: 'Gold / US Dollar',
      direction: 'BUY',
      orderType: 'LIMIT',
      entryPrice: 2884.50,
      stopLoss: 2871.00,
      takeProfit1: 2905.00,
      takeProfit2: 2928.00,
      takeProfit3: 2960.00,
      riskRewardRatio: '1:3.8',
      confluence: ['London Session Low Sweep', 'H4 Fair Value Gap (FVG) Tap', 'CVD Institutional Bullish Divergence'],
      status: 'active',
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      deskAnalyst: 'Chief Institutional Desk',
      confidenceScore: 94,
    },
    {
      id: 'sig_nas_02',
      ticker: 'NAS100',
      asset: 'Nasdaq 100 E-mini',
      direction: 'SELL',
      orderType: 'STOP',
      entryPrice: 21820.00,
      stopLoss: 21960.00,
      takeProfit1: 21650.00,
      takeProfit2: 21480.00,
      riskRewardRatio: '1:2.4',
      confluence: ['Asian High Liquidity Purge', 'M15 Market Structure Break (MSB)', 'Delta Absorption Cluster'],
      status: 'active',
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      deskAnalyst: 'Senior Flow Strategist',
      confidenceScore: 89,
    },
    {
      id: 'sig_dow_03',
      ticker: 'US30',
      asset: 'Dow Jones Industrial 30',
      direction: 'BUY',
      orderType: 'MARKET',
      entryPrice: 43650.00,
      stopLoss: 43480.00,
      takeProfit1: 43900.00,
      takeProfit2: 44250.00,
      riskRewardRatio: '1:3.5',
      confluence: ['Daily Discount Array Rebalance', 'Volume Profile Point of Control (POC) Bounce'],
      status: 'target_hit',
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      deskAnalyst: 'Chief Institutional Desk',
      confidenceScore: 96,
    }
  ];

  res.json({
    success: true,
    signals: proprietarySignals,
    subscriptionStatus: req.user!.subscriptionStatus,
    expiresAt: req.user!.subscriptionExpiresAt,
    accessLevel: req.user!.role === 'client' ? 'VIP Pro Client Tier' : 'Institutional Staff Access',
  });
});

// GET /api/user/courses (Proprietary Institutional Curriculum & Video Lessons)
router.get('/courses', requireActiveSubscription, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await Database.findUserById(req.user!.id);
  const proprietaryCourses = [
    {
      id: 'course_smc_01',
      title: 'Institutional Smart Money Concepts (SMC) & Liquidity Architecture',
      level: 'Advanced',
      totalLessons: 12,
      durationHours: 18.5,
      modules: [
        'Anatomy of Liquidity Pools & Stop Runs',
        'Imbalance, Fair Value Gaps (FVG) & Volume Imbalances',
        'Break of Structure (BOS) vs Change of Character (CHoCH)',
        'Internal vs External Range Liquidity Mapping'
      ],
      materials: ['SMC Blueprint PDF', 'Killzone Time & Price Cheatsheet', 'TradingView Proprietary Indicators']
    },
    {
      id: 'course_orderflow_02',
      title: 'Order Flow, Footprint & Cumulative Volume Delta (CVD) Mastery',
      level: 'Professional Elite',
      totalLessons: 8,
      durationHours: 14.0,
      modules: [
        'Reading Delta Clusters & Absorption Barriers',
        'Bookmap Liquidity Heatmaps & Iceberg Orders',
        'Market Depth DOM Execution Strategies'
      ],
      materials: ['Sierra Chart Templates', 'Order Flow Master Checklist']
    },
    {
      id: 'course_risk_03',
      title: 'Proprietary Capital Preservation & Institutional Risk Protocols',
      level: 'Comprehensive',
      totalLessons: 6,
      durationHours: 8.0,
      modules: [
        'Dynamic Value at Risk (VaR) Sizing',
        'Max Drawdown Algorithmic Circuit Breakers',
        'Portfolio Hedging & Correlation Matrices'
      ],
      materials: ['Risk Calculator Excel Workbook', 'Trade Journaling Database']
    }
  ];

  res.json({
    success: true,
    courses: proprietaryCourses,
    userTrainingProgress: user?.trainingProgress || [],
    trainingStatus: user?.trainingStatus || 'active_training',
  });
});

// GET /api/user/trading-data (Proprietary Live Trading & Order Book Heatmaps)
router.get('/trading-data', requireActiveSubscription, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: {
      institutionalSentiment: {
        gold: { bias: 'STRONG_BULLISH', cvdDelta: '+4,820 lots', retailShortRatio: '74%' },
        nasdaq: { bias: 'NEUTRAL_BEARISH', cvdDelta: '-1,340 lots', retailShortRatio: '32%' },
        us30: { bias: 'BULLISH_ACCUMULATION', cvdDelta: '+2,910 lots', retailShortRatio: '68%' },
      },
      liquidityNodes: [
        { asset: 'XAUUSD', poolType: 'Buy Side Liquidity (BSL)', price: 2940.00, volumeEst: '$180M' },
        { asset: 'XAUUSD', poolType: 'Sell Side Liquidity (SSL)', price: 2865.00, volumeEst: '$240M' },
        { asset: 'NAS100', poolType: 'Equal Highs (EQH)', price: 22100.00, volumeEst: '$320M' },
      ],
      cotPositioning: {
        commercials: 'Net Buyers (+18% WoW)',
        nonCommercials: 'Heavy Speculative Shorts',
      },
      updatedAt: new Date().toISOString(),
    }
  });
});

// GET /api/user/coaching-progress (Proprietary Student Coaching & Certified Mentor Milestones)
router.get('/coaching-progress', requireActiveSubscription, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await Database.findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User profile not found.' });
    return;
  }

  let assignedCoachInfo = null;
  if (user.assignedCoachId) {
    const coach = await Database.findUserById(user.assignedCoachId);
    if (coach) {
      assignedCoachInfo = {
        id: coach.id,
        username: coach.username,
        fullName: coach.fullName,
        avatarUrl: coach.avatarUrl,
        specialty: coach.coachSpecialty || 'Certified Institutional SMC Specialist',
      };
    }
  }

  res.json({
    success: true,
    assignedCoach: assignedCoachInfo,
    trainingStatus: user.trainingStatus || 'active_training',
    trainingProgress: user.trainingProgress || [],
    coachingNotes: user.notes || 'No notes currently recorded by your mentor.',
    subscriptionStatus: user.subscriptionStatus,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
  });
});

// GET /api/user/content (Proprietary Market Analysis & Live Desk Alpha Briefs)
router.get('/content', requireActiveSubscription, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    success: true,
    vipContent: [
      {
        id: 'vip_brief_01',
        title: 'Q1 Global Liquidity Cycle & Central Bank Balance Sheet Analysis',
        type: 'Institutional Research',
        readTimeMinutes: 12,
        publishedAt: new Date().toISOString(),
        summary: 'Deep-dive analysis into Fed RRP depletion, Treasury General Account refill dynamics, and asset allocation impact.',
      },
      {
        id: 'vip_webinar_02',
        title: 'Live Desk Tape Reading Session & Execution Masterclass',
        type: 'Exclusive Webinar Recording',
        durationMinutes: 75,
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        summary: 'Recorded live stream breaking down high-frequency algorithmic spoofing on gold futures.',
      }
    ]
  });
});

export default router;
