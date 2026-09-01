import nodemailer from 'nodemailer';

interface VerificationEntry {
  email: string;
  code: string;
  purpose: 'register' | 'profile_update' | 'password_change' | 'email_change';
  expiresAt: number;
  attempts: number;
  data?: any;
}

// In-memory verification storage with TTL
const verificationStore = new Map<string, VerificationEntry>();

// Clean up expired codes periodically every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of verificationStore.entries()) {
    if (entry.expiresAt < now) {
      verificationStore.delete(key);
    }
  }
}, 60 * 1000);

/**
 * Configure Nodemailer transporter dynamically from environment variables
 * Reads from process.env:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASS
 * - SMTP_SECURE
 * - SMTP_FROM
 */
function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const rawPort = process.env.SMTP_PORT?.trim();
  const port = rawPort ? parseInt(rawPort, 10) : 587;
  const secure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || port === 465;

  if (host && user && pass) {
    try {
      return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    } catch (err) {
      console.error('[EmailService] Failed to create SMTP transporter:', err);
      return null;
    }
  }

  return null;
}

/**
 * Generate a 6-digit numeric verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store and send verification code
 */
export async function sendEmailVerificationCode(
  email: string,
  purpose: 'register' | 'profile_update' | 'password_change' | 'email_change',
  metadata?: { username?: string; actionDesc?: string }
): Promise<{ success: boolean; error?: string; message?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Please provide a valid email address.' };
  }

  const key = `${cleanEmail}:${purpose}`;
  const existing = verificationStore.get(key);

  // Rate limit: prevent spamming within 30 seconds
  const now = Date.now();
  if (existing && existing.expiresAt - now > (10 * 60 - 30) * 1000) {
    const waitSeconds = Math.ceil(((10 * 60 - 30) * 1000 - (existing.expiresAt - now)) / 1000) || 30;
    return {
      success: false,
      error: `Please wait ${Math.max(1, waitSeconds)} seconds before requesting a new verification code.`,
    };
  }

  const code = generateVerificationCode();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes validity

  verificationStore.set(key, {
    email: cleanEmail,
    code,
    purpose,
    expiresAt,
    attempts: 0,
    data: metadata,
  });

  let actionTitle = 'Security Verification';
  let actionDetails = 'verifying your action';

  if (purpose === 'register') {
    actionTitle = 'Account Registration Verification';
    actionDetails = 'creating your SMTrading Pro institutional terminal account';
  } else if (purpose === 'password_change') {
    actionTitle = 'Password Change Security Verification';
    actionDetails = 'authorizing a password reset / update on your SMTrading account';
  } else if (purpose === 'email_change') {
    actionTitle = 'Email Address Change Verification';
    actionDetails = 'linking and confirming your new email address on SMTrading';
  } else {
    actionTitle = 'Personal Profile Security Verification';
    actionDetails = 'authorizing an update to your personal profile credentials';
  }

  const htmlContent = `
    <div style="background-color: #070a11; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #f1f5f9; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #b45309); padding: 12px 18px; border-radius: 12px; font-weight: 900; font-size: 20px; color: #070a11; letter-spacing: -0.5px;">
          SMTrading.pro
        </div>
        <div style="color: #94a3b8; font-size: 12px; margin-top: 8px; font-family: monospace; letter-spacing: 1px;">
          SECURITY VERIFICATION DESK
        </div>
      </div>

      <div style="background-color: #0d121f; border-radius: 12px; border: 1px solid #334155; padding: 30px 25px; text-align: center;">
        <h2 style="color: #ffffff; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          ${actionTitle}
        </h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          You are receiving this security code for ${actionDetails}. Enter the 6-digit confirmation code below to verify your identity:
        </p>

        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border: 2px solid #f59e0b; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #f59e0b; font-family: monospace; user-select: all;">
            ${code}
          </span>
        </div>

        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; margin-bottom: 0;">
          ⏳ This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
        </p>
      </div>

      <div style="margin-top: 30px; border-top: 1px solid #1e293b; padding-top: 20px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.5;">
        <p style="margin: 0 0 6px 0;">
          If you did not initiate this request, please contact our support desk immediately at <a href="mailto:smtradingsupprt@gmail.com" style="color: #f59e0b; text-decoration: none;">smtradingsupprt@gmail.com</a>.
        </p>
        <p style="margin: 0; font-size: 11px;">
          SMTrading Institutional Platform &copy; ${new Date().getFullYear()} All rights reserved.
        </p>
      </div>
    </div>
  `;

  const mailTransporter = getTransporter();

  if (mailTransporter) {
    try {
      const fromAddress = process.env.SMTP_FROM || `"SMTrading Security" <${process.env.SMTP_USER || 'smtradingsupprt@gmail.com'}>`;
      await mailTransporter.sendMail({
        from: fromAddress,
        to: cleanEmail,
        subject: `[${code}] SMTrading Security Verification Code`,
        text: `Your SMTrading verification code is: ${code}. This code is valid for 10 minutes. For support: smtradingsupprt@gmail.com`,
        html: htmlContent,
      });
      console.log(`[EmailService] Verification email dispatched successfully to ${cleanEmail}`);
      return { 
        success: true, 
        message: `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
      };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email via SMTP to ${cleanEmail}:`, err);
      let errorDetail = err.message || 'SMTP transport error';

      if (errorDetail.includes('502') || errorDetail.includes('not yet activated') || errorDetail.includes('Your SMTP account is not yet activated')) {
        errorDetail = 'Your Brevo (Sendinblue) SMTP account is not yet activated. Please log in to Brevo (app.brevo.com), verify your sender email/domain under Senders & IP, and request transactional activation, or use an alternative active SMTP provider (such as Gmail App Password, Resend, or SendGrid).';
      } else if (errorDetail.includes('535') || errorDetail.includes('Authentication failed')) {
        errorDetail = 'SMTP Authentication failed. Please check your SMTP_USER and SMTP_PASS (or Brevo Master Key) on Render.';
      }

      return {
        success: false,
        error: `Failed to dispatch verification email: ${errorDetail}`,
      };
    }
  } else {
    console.error(`[EmailService] SMTP credentials are not configured in process.env (SMTP_HOST: ${process.env.SMTP_HOST ? 'Set' : 'Missing'}, SMTP_USER: ${process.env.SMTP_USER ? 'Set' : 'Missing'}, SMTP_PASS: ${process.env.SMTP_PASS ? 'Set' : 'Missing'})`);
    return {
      success: false,
      error: 'Email service is unavailable on the server. Please ensure SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are configured on Render.',
    };
  }
}

/**
 * Verify code
 */
export function verifyEmailCode(
  email: string,
  code: string,
  purpose: 'register' | 'profile_update' | 'password_change' | 'email_change'
): { valid: boolean; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();
  const key = `${cleanEmail}:${purpose}`;

  const entry = verificationStore.get(key);

  if (!entry) {
    return { valid: false, error: 'No verification code was requested for this email or it has expired.' };
  }

  if (Date.now() > entry.expiresAt) {
    verificationStore.delete(key);
    return { valid: false, error: 'Verification code has expired. Please request a new code.' };
  }

  if (entry.attempts >= 5) {
    verificationStore.delete(key);
    return { valid: false, error: 'Too many invalid attempts. Please request a new verification code.' };
  }

  if (entry.code !== cleanCode) {
    entry.attempts += 1;
    return { valid: false, error: `Invalid verification code (${5 - entry.attempts} attempts remaining).` };
  }

  // Verification successful: consume code
  verificationStore.delete(key);
  return { valid: true };
}
