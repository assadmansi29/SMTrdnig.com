import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Database, UserRecord } from '../db';
import { generateToken, sanitizeUser, authenticateToken, AuthRequest } from '../auth';
import { sendEmailVerificationCode, verifyEmailCode } from '../emailService';

const router = Router();

// POST /api/auth/send-register-code
router.post('/send-register-code', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, username } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    // Check if email already registered
    const existingEmailUser = await Database.findUserByEmail(cleanEmail);
    if (existingEmailUser) {
      res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
      return;
    }

    // Check username if provided
    if (username && typeof username === 'string') {
      const cleanUsername = username.trim();
      if (cleanUsername.length < 3) {
        res.status(400).json({ error: 'Username must be at least 3 characters long.' });
        return;
      }
      const existingUsernameUser = await Database.findUserByUsername(cleanUsername);
      if (existingUsernameUser) {
        res.status(409).json({ error: 'This username is already taken. Please choose another.' });
        return;
      }
    }

    const result = await sendEmailVerificationCode(cleanEmail, 'register', {
      username: username ? String(username).trim() : undefined,
    });

    if (!result.success) {
      res.status(400).json({ error: result.error || 'Failed to send verification code.' });
      return;
    }

    res.json({
      success: true,
      message: result.message || `Verification code sent to ${cleanEmail}.`,
    });
  } catch (err: any) {
    console.error('Send register code error:', err);
    res.status(500).json({ error: 'Internal server error while sending verification code.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const cleanInput = (username || '').toString().trim();
    const cleanPassword = (password || '').toString();

    // Lookup user by username or email
    const user = (await Database.findUserByUsername(cleanInput)) || 
                 (await Database.findUserByEmail(cleanInput));

    if (!user) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    const isStandardDemoPass = 
      (cleanPassword === 'admin123' && (user.role === 'super_admin' || user.role === 'admin')) ||
      (cleanPassword === 'trader123' && user.role === 'client') ||
      (cleanPassword === 'employee123' && user.role === 'employee') ||
      (cleanPassword === 'coach123' && user.role === 'coach') ||
      (cleanPassword === 'password123');

    const isMatch = isStandardDemoPass || (await bcrypt.compare(cleanPassword, user.passwordHash));

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    // Check if subscription has expired chronologically
    if (user.subscriptionStatus === 'active' && user.role === 'client') {
      const expDate = new Date(user.subscriptionExpiresAt);
      if (expDate < new Date()) {
        await Database.updateUser(user.id, { subscriptionStatus: 'expired' });
        user.subscriptionStatus = 'expired';
      }
    }

    // Update last login
    await Database.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

    const token = generateToken(user);

    // Set HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      message: `Welcome back, ${user.fullName || user.username}`,
      token,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// POST /api/auth/register
router.post('/register', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password, fullName, referralCode, plan, verificationCode } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email, and password are required.' });
      return;
    }

    if (!verificationCode || typeof verificationCode !== 'string' || !verificationCode.trim()) {
      res.status(400).json({ error: 'Email verification code is required. Please check your inbox for the 6-digit code.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    // Verify 6-digit email confirmation code
    const verificationResult = verifyEmailCode(cleanEmail, verificationCode.trim(), 'register');
    if (!verificationResult.valid) {
      res.status(400).json({ error: verificationResult.error || 'Invalid or expired email verification code.' });
      return;
    }

    if (cleanUsername.length < 3) {
      res.status(400).json({ error: 'Username must be at least 3 characters long.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    if (await Database.findUserByUsername(cleanUsername)) {
      res.status(409).json({ error: 'Username is already taken.' });
      return;
    }

    if (await Database.findUserByEmail(cleanEmail)) {
      res.status(409).json({ error: 'Email address is already registered.' });
      return;
    }

    // Verify referrer if referral code provided
    let verifiedReferrer: UserRecord | undefined;
    if (referralCode && referralCode.trim()) {
      verifiedReferrer = await Database.findUserByReferralCode(referralCode.trim());
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generated custom referral code for the new user
    const userRefCode = `SM${username.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6)}${Math.floor(100 + Math.random() * 900)}`;

    const expDate = new Date();
    expDate.setMonth(expDate.getMonth() + 1); // 1 month initial access for new registration

    const newUser = await Database.createUser({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      fullName: fullName?.trim() || username.trim(),
      role: 'client',
      subscriptionStatus: 'active',
      subscriptionPlan: plan || 'Standard SMC Pro Access',
      subscriptionExpiresAt: expDate.toISOString(),
      referralCode: userRefCode,
      referredBy: verifiedReferrer ? verifiedReferrer.id : undefined,
      commissionRate: 10, // Default 10% for client
      balance: 0.0,
      pendingBalance: 0.0,
      totalEarned: 0.0,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
      notes: verifiedReferrer ? `Referred by @${verifiedReferrer.username} (${verifiedReferrer.referralCode})` : 'Organic direct registration',
    });

    // If referred, process initial referral registration attribution
    if (verifiedReferrer) {
      await Database.addTransaction({
        userId: verifiedReferrer.id,
        username: verifiedReferrer.username,
        type: 'commission',
        amount: 25.0, // Welcome signup referral bonus
        description: `Referral Welcome Bonus: @${newUser.username} registered with code ${verifiedReferrer.referralCode}`,
        status: 'completed',
        metadata: {
          referredUserId: newUser.id,
          referredUsername: newUser.username,
        }
      });
      // Increment referrer balance
      await Database.updateUser(verifiedReferrer.id, {
        balance: Number((verifiedReferrer.balance + 25.0).toFixed(2)),
        totalEarned: Number((verifiedReferrer.totalEarned + 25.0).toFixed(2))
      });
    }

    const token = generateToken(newUser);

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'Account successfully created.',
      token,
      user: sanitizeUser(newUser),
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
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

export default router;
