import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter for Login Attempts
 * Limits each IP to 10 authentication requests per 15 minutes.
 * Defends against brute-force attacks and credential stuffing.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts from this IP. Please wait 15 minutes before trying again.',
  },
});

/**
 * Rate Limiter for Verification Code Dispatch
 * Limits code generation to 5 requests per 10 minutes.
 * Defends against SMS/Email bombing and quota exhaustion.
 */
export const verificationCodeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many verification code requests. Please wait 10 minutes before requesting another code.',
  },
});

/**
 * Rate Limiter for Financial Payout Submissions
 * Prevents automated or rapid-fire payout requests.
 */
export const payoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many payout requests submitted. Please wait 15 minutes before trying again.',
  },
});

/**
 * Rate Limiter for Password Reset Submissions
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many password reset requests. Please wait 15 minutes before trying again.',
  },
});
