import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Database, UserRecord, UserRole } from '../db';
import { generateToken, sanitizeUser, authenticateToken, AuthRequest } from '../auth';
import { sendEmailVerificationCode, verifyEmailCode } from '../emailService';
import { loginRateLimiter, verificationCodeLimiter } from '../middleware/security';

const router = Router();

// POST /api/auth/send-register-code (DISABLED - Self-registration forbidden)
router.post('/send-register-code', (req: AuthRequest, res: Response): void => {
  res.status(403).json({
    error: 'Self-registration is disabled. Client accounts are created exclusively by the Administrator upon USDT (TRC20) payment verification.',
    code: 'REGISTRATION_DISABLED'
  });
});

// POST /api/auth/login
router.post('/login', loginRateLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const cleanInput = (username || '').toString().trim();
    const cleanPassword = (password || '').toString();

    // Strip leading '@' in case user entered @username
    const strippedInput = cleanInput.replace(/^@+/, '').trim();

    // Lookup user by username, stripped username, email, or referral code
    let user = await Database.findUserByUsername(cleanInput);
    if (!user && strippedInput !== cleanInput) {
      user = await Database.findUserByUsername(strippedInput);
    }
    if (!user) {
      user = (await Database.findUserByEmail(cleanInput)) || (await Database.findUserByEmail(strippedInput));
    }
    if (!user) {
      user = (await Database.findUserByReferralCode(cleanInput)) || (await Database.findUserByReferralCode(strippedInput));
    }

    if (!user || !user.passwordHash || typeof user.passwordHash !== 'string') {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    // Enforce strict bcrypt password verification against stored password hash
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(cleanPassword, user.passwordHash);
    } catch (cmpErr) {
      console.error('Password comparison error:', cmpErr);
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    // Check if subscription has expired chronologically (non-blocking)
    if (user.subscriptionStatus === 'active' && user.role === 'client') {
      try {
        const expDate = new Date(user.subscriptionExpiresAt);
        if (!isNaN(expDate.getTime()) && expDate < new Date()) {
          await Database.updateUser(user.id, { subscriptionStatus: 'expired' });
          user.subscriptionStatus = 'expired';
        }
      } catch (subErr) {
        console.warn('Subscription status check notice:', subErr);
      }
    }

    // Update last login (non-blocking, don't fail authentication if metadata write has a transient glitch)
    try {
      await Database.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
    } catch (logErr) {
      console.warn('Last login timestamp update notice:', logErr);
    }

    const token = generateToken(user);

    // Set HTTP-only cookie
    try {
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    } catch (cookieErr) {
      console.warn('Cookie set notice:', cookieErr);
    }

    res.json({
      success: true,
      message: `Welcome back, ${user.fullName || user.username}`,
      token,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({
      error: 'Internal server error during login.',
      details: err?.message || 'Authentication error',
    });
  }
});

// POST /api/auth/register (DISABLED - Self-registration forbidden)
router.post('/register', (req: AuthRequest, res: Response): void => {
  res.status(403).json({
    error: 'Self-registration is disabled. Client accounts are created exclusively by the Super Admin and Admin upon payment approval.',
    code: 'REGISTRATION_DISABLED'
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  // Refresh and sanitize
  const freshUser = await Database.findUserById(req.user.id);
  if (!freshUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.json({
    authenticated: true,
    user: sanitizeUser(freshUser),
  });
});

// POST /api/auth/logout
router.post('/logout', (req: AuthRequest, res: Response): void => {
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/submit-payment-order (Public checkout submission for USDT TRC20 subscriptions)
router.post('/submit-payment-order', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planId, planName, price, email, telegramUsername, txHash, referralCode, notes } = req.body;
    if (!planId || !planName || !price) {
      res.status(400).json({ error: 'Missing package details.' });
      return;
    }
    const cleanEmail = email ? String(email).trim().toLowerCase() : 'Not provided';
    const cleanTelegram = telegramUsername ? String(telegramUsername).trim().replace(/^@/, '') : 'Not provided';
    const cleanTx = txHash ? String(txHash).trim() : 'Pending confirmation';
    const cleanRef = referralCode ? String(referralCode).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') : '';
    const cleanNotes = notes ? String(notes).trim() : '';

    const refTag = cleanRef ? ` [Ref: ${cleanRef}]` : '';
    const opItem = await Database.addOperationalItem({
      title: `USDT TRC20 Payment Verification: [${planName} - ${price}] from @${cleanTelegram}${refTag}`,
      type: 'payment_verification' as any,
      priority: 'high',
      status: 'pending',
      assignedTo: 'abuasad2299',
      notes: JSON.stringify({
        subscriberEmail: cleanEmail,
        telegramUsername: cleanTelegram,
        planId,
        planName,
        price,
        referralCode: cleanRef || undefined,
        paymentMethod: 'USDT (TRC20)',
        txHash: cleanTx,
        notes: cleanNotes,
        submittedAt: new Date().toISOString(),
        verificationNotice: 'Instant verification — subscription will be activated after confirmation.'
      })
    });

    res.json({
      success: true,
      orderId: opItem.id,
      message: 'Subscription payment order submitted successfully! Instant verification — subscription will be activated after confirmation.'
    });
  } catch (err: any) {
    console.error('Error submitting payment order:', err);
    res.status(500).json({ error: 'Failed to record payment order. Please contact @SMTrading_SUPPORT directly on Telegram.' });
  }
});

export default router;
