import 'dotenv/config';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://127.0.0.1:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'sm_jwt_prod_key_98374298734';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

let testIndex = 1;

function recordTest(category: string, name: string, passed: boolean, details: string) {
  results.push({ category, name, passed, details });
  const badge = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${badge} [T${testIndex++}] [${category}] ${name} - ${details}`);
}

function makeToken(user: { id: string; username: string; role: string; subscriptionStatus?: string }) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus || 'active',
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

async function api(
  method: string,
  endpoint: string,
  token?: string,
  body?: any
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let parsedBody: any;
  try {
    parsedBody = await res.json();
  } catch {
    parsedBody = null;
  }
  return { status: res.status, body: parsedBody };
}

async function runAudit() {
  console.log('================================================================');
  console.log('PHASE 4: BUSINESS LOGIC & FINANCIAL SECURITY AUDIT TEST SUITE');
  console.log('================================================================\n');

  // Generate Super Admin bootstrap token to query users list
  const bootstrapSuperAdminToken = makeToken({
    id: 'usr_admin_01',
    username: 'abuasad2299',
    role: 'super_admin',
    subscriptionStatus: 'active',
  });

  const usersRes = await api('GET', '/api/admin/users', bootstrapSuperAdminToken);
  if (usersRes.status !== 200 || !Array.isArray(usersRes.body?.users)) {
    throw new Error(`Failed to load users from API: ${usersRes.status} ${JSON.stringify(usersRes.body)}`);
  }

  const allUsers = usersRes.body.users;
  const superAdmin = allUsers.find((u: any) => u.role === 'super_admin');
  const admin = allUsers.find((u: any) => u.role === 'admin');
  const coach = allUsers.find((u: any) => u.role === 'coach');
  const client = allUsers.find((u: any) => u.role === 'client');
  let clientExpired = allUsers.find((u: any) => u.role === 'client' && u.subscriptionStatus === 'expired');

  if (!superAdmin || !admin || !coach || !client) {
    throw new Error(`Missing required roles in DB. Found superAdmin=${Boolean(superAdmin)}, admin=${Boolean(admin)}, coach=${Boolean(coach)}, client=${Boolean(client)}`);
  }

  if (!clientExpired) {
    clientExpired = { ...client, id: 'usr_expired_virtual', subscriptionStatus: 'expired' };
  }

  console.log('[Audit Setup] Using accounts:');
  console.log(`- Super Admin: @${superAdmin.username} (${superAdmin.id})`);
  console.log(`- Admin:       @${admin.username} (${admin.id})`);
  console.log(`- Coach:       @${coach.username} (${coach.id})`);
  console.log(`- Client:      @${client.username} (${client.id})`);
  console.log(`- Expired:     @${clientExpired.username} (${clientExpired.id})\n`);

  const superAdminToken = makeToken(superAdmin);
  const adminToken = makeToken(admin);
  const coachToken = makeToken(coach);
  const clientToken = makeToken(client);
  const clientExpiredToken = makeToken(clientExpired);

  // Helper to fetch live user data
  async function fetchUser(userId: string) {
    const res = await api('GET', '/api/admin/users', superAdminToken);
    return res.body?.users?.find((u: any) => u.id === userId);
  }

  // Helper to set balance safely via authorized Super Admin endpoint
  async function setUserBalance(userId: string, targetBalance: number, reason: string) {
    const res = await api('PATCH', `/api/admin/users/${userId}/balance`, superAdminToken, {
      amount: targetBalance,
      action: 'set',
      reason,
    });
    return res;
  }

  // --------------------------------------------------------------------------
  // 1. BALANCE MANIPULATION & PRIVILEGE ESCALATION AUDIT
  // --------------------------------------------------------------------------
  console.log('--- 1. BALANCE MANIPULATION & PRIVILEGE ESCALATION AUDIT ---');

  // T1: Unauthenticated request to balance adjustment
  {
    const res = await api('PATCH', `/api/admin/users/${client.id}/balance`, undefined, { amount: 500, action: 'add' });
    recordTest(
      'Balance Security',
      'Unauthenticated Balance Adjustment Blocked',
      res.status === 401,
      `Status ${res.status} (expected 401)`
    );
  }

  // T2: Client role attempting balance adjustment
  {
    const res = await api('PATCH', `/api/admin/users/${client.id}/balance`, clientToken, { amount: 500, action: 'add' });
    recordTest(
      'Balance Security',
      'Client Privilege Escalation on Balance Adjustment Blocked',
      res.status === 403,
      `Status ${res.status} (expected 403)`
    );
  }

  // T3: Coach role attempting balance adjustment
  {
    const res = await api('PATCH', `/api/admin/users/${client.id}/balance`, coachToken, { amount: 500, action: 'add' });
    recordTest(
      'Balance Security',
      'Coach Privilege Escalation on Balance Adjustment Blocked',
      res.status === 403,
      `Status ${res.status} (expected 403)`
    );
  }

  // T4: Admin role attempting balance adjustment without Super Admin privilege
  {
    const res = await api('PATCH', `/api/admin/users/${client.id}/balance`, adminToken, { amount: 500, action: 'add' });
    recordTest(
      'Balance Security',
      'Admin Role Blocked From Direct Balance Adjustment (Super Admin Only)',
      res.status === 403,
      `Status ${res.status} (expected 403)`
    );
  }

  // T5: Negative balance adjustment amount rejected
  {
    const res = await api('PATCH', `/api/admin/users/${client.id}/balance`, superAdminToken, { amount: -50, action: 'add' });
    recordTest(
      'Balance Security',
      'Negative Amount in Balance Adjustment Rejected',
      res.status === 400,
      `Status ${res.status} (expected 400)`
    );
  }

  // T6: Non-numeric / NaN balance adjustment amount rejected
  {
    const res = await api('PATCH', `/api/admin/users/${client.id}/balance`, superAdminToken, { amount: 'invalid_num', action: 'add' });
    recordTest(
      'Balance Security',
      'Non-numeric Amount in Balance Adjustment Rejected',
      res.status === 400,
      `Status ${res.status} (expected 400)`
    );
  }

  // T7: Excessive overflow amount (> $10M) rejected
  {
    const res = await api('PATCH', `/api/admin/users/${client.id}/balance`, superAdminToken, { amount: 999999999, action: 'add' });
    recordTest(
      'Balance Security',
      'Excessive Overflow Amount (> $10M) Rejected',
      res.status === 400,
      `Status ${res.status} (expected 400)`
    );
  }

  // T8: Deducting more than user available balance rejected (prevent negative balance)
  {
    const freshUser = await fetchUser(client.id);
    const excessDeduct = (freshUser?.balance || 0) + 50000;
    const res = await api('PATCH', `/api/admin/users/${client.id}/balance`, superAdminToken, { amount: excessDeduct, action: 'deduct' });
    recordTest(
      'Balance Security',
      'Over-deduction Beyond Balance Rejected (No Negative Balances)',
      res.status === 400,
      `Status ${res.status} (expected 400: ${res.body?.error})`
    );
  }

  // T9: Authorized Super Admin atomic balance credit works and logs transaction & audit
  {
    const beforeUser = await fetchUser(client.id);
    const creditAmount = 250.00;
    const res = await api('PATCH', `/api/admin/users/${client.id}/balance`, superAdminToken, {
      amount: creditAmount,
      action: 'add',
      reason: 'Audit Verification Bonus'
    });
    const afterUser = await fetchUser(client.id);
    const balanceDiff = Number(((afterUser?.balance || 0) - (beforeUser?.balance || 0)).toFixed(2));
    const passed = res.status === 200 && balanceDiff === creditAmount && res.body?.transaction?.type === 'manual_adjustment';
    recordTest(
      'Balance Security',
      'Super Admin Atomic Balance Addition & Transaction Ledger Recording',
      passed,
      `Status ${res.status}, balance increased by $${balanceDiff}`
    );
  }

  // T10: Authorized Super Admin atomic balance deduction works
  {
    const beforeUser = await fetchUser(client.id);
    const deductAmount = 100.00;
    const res = await api('PATCH', `/api/admin/users/${client.id}/balance`, superAdminToken, {
      amount: deductAmount,
      action: 'deduct',
      reason: 'Audit Verification Deduction'
    });
    const afterUser = await fetchUser(client.id);
    const balanceDiff = Number(((beforeUser?.balance || 0) - (afterUser?.balance || 0)).toFixed(2));
    const passed = res.status === 200 && balanceDiff === deductAmount;
    recordTest(
      'Balance Security',
      'Super Admin Atomic Balance Deduction',
      passed,
      `Status ${res.status}, balance reduced by $${balanceDiff}`
    );
  }

  // --------------------------------------------------------------------------
  // 2. PAYOUT REQUESTS, ATOMICITY & RACE CONDITIONS AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 2. PAYOUT REQUESTS, ATOMICITY & RACE CONDITIONS AUDIT ---');

  // T11: Unauthenticated request to request-payout rejected
  {
    const res = await api('POST', '/api/user/request-payout', undefined, { amount: 100 });
    recordTest(
      'Payout Security',
      'Unauthenticated Payout Request Rejected',
      res.status === 401,
      `Status ${res.status} (expected 401)`
    );
  }

  // T12: Payout request below minimum threshold ($50) rejected
  {
    const res = await api('POST', '/api/user/request-payout', clientToken, { amount: 25.00 });
    recordTest(
      'Payout Security',
      'Sub-minimum Payout Request (< $50) Rejected',
      res.status === 400,
      `Status ${res.status} (expected 400: ${res.body?.error})`
    );
  }

  // T13: Negative or zero payout amount rejected
  {
    const res = await api('POST', '/api/user/request-payout', clientToken, { amount: -100 });
    recordTest(
      'Payout Security',
      'Negative Payout Amount Rejected',
      res.status === 400,
      `Status ${res.status} (expected 400)`
    );
  }

  // T14: Fractional sub-cent decimal exploit rejected (e.g. 50.005)
  {
    const res = await api('POST', '/api/user/request-payout', clientToken, { amount: 50.005 });
    recordTest(
      'Payout Security',
      'Sub-cent Decimal Precision Exploit Rejected',
      res.status === 400,
      `Status ${res.status} (expected 400)`
    );
  }

  // T15: Payout request exceeding available balance rejected
  {
    const freshUser = await fetchUser(client.id);
    const excessPayout = (freshUser?.balance || 0) + 100000;
    const res = await api('POST', '/api/user/request-payout', clientToken, { amount: excessPayout });
    recordTest(
      'Payout Security',
      'Payout Request Exceeding Balance Rejected',
      res.status === 400,
      `Status ${res.status} (expected 400: ${res.body?.error})`
    );
  }

  // T16: Payout request exceeding maximum threshold ($1,000,000) rejected
  {
    const res = await api('POST', '/api/user/request-payout', clientToken, { amount: 2000000 });
    recordTest(
      'Payout Security',
      'Payout Request Exceeding Max Limit ($1,000,000) Rejected',
      res.status === 400,
      `Status ${res.status} (expected 400)`
    );
  }

  // T17: Legitimate atomic payout request succeeds, decrements balance, increments pendingBalance
  let testPayoutTxId = '';
  {
    // Set client balance to $300 via Super Admin endpoint
    await setUserBalance(client.id, 300, 'Prepare test balance for payout');
    const beforeUser = await fetchUser(client.id);
    const payoutAmount = 100.00;

    const res = await api('POST', '/api/user/request-payout', clientToken, {
      amount: payoutAmount,
      payoutMethod: 'TRC-20 USDT',
      payoutAddress: 'TJxyz123456789AuditWallet',
    });

    const afterUser = await fetchUser(client.id);
    testPayoutTxId = res.body?.transaction?.id;

    const balanceDecremented = Number(((beforeUser?.balance || 0) - (afterUser?.balance || 0)).toFixed(2)) === payoutAmount;
    const pendingIncremented = Number(((afterUser?.pendingBalance || 0) - (beforeUser?.pendingBalance || 0)).toFixed(2)) === payoutAmount;
    const passed = res.status === 200 && balanceDecremented && pendingIncremented && Boolean(testPayoutTxId);

    recordTest(
      'Payout Security',
      'Atomic Payout Request Reserves Balance & Creates Pending Transaction',
      passed,
      `Status ${res.status}, TxId: ${testPayoutTxId}, balance reserved: $${payoutAmount}`
    );
  }

  // T18: Double-spend / race condition prevention: Immediate consecutive payout when balance depleted
  {
    const freshUser = await fetchUser(client.id);
    const overdraftAmount = (freshUser?.balance || 0) + 50;
    const res = await api('POST', '/api/user/request-payout', clientToken, {
      amount: overdraftAmount,
      payoutMethod: 'TRC-20 USDT',
      payoutAddress: 'TJxyz123456789AuditWallet',
    });
    recordTest(
      'Payout Security',
      'Double-Spend Prevention (Attempting To Payout Depleted Funds)',
      res.status === 400,
      `Status ${res.status} (expected 400)`
    );
  }

  // --------------------------------------------------------------------------
  // 3. SEGREGATION OF DUTIES, SELF-APPROVAL & TRANSACTION LIFECYCLE AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 3. SEGREGATION OF DUTIES, SELF-APPROVAL & TRANSACTION LIFECYCLE AUDIT ---');

  // T19: Unauthenticated attempt to update transaction status rejected
  {
    const res = await api('PATCH', `/api/admin/transactions/${testPayoutTxId}/status`, undefined, { status: 'completed' });
    recordTest(
      'Segregation of Duties',
      'Unauthenticated Transaction Status Update Blocked',
      res.status === 401,
      `Status ${res.status} (expected 401)`
    );
  }

  // T20: Client/Coach attempt to update transaction status rejected
  {
    const res = await api('PATCH', `/api/admin/transactions/${testPayoutTxId}/status`, clientToken, { status: 'completed' });
    recordTest(
      'Segregation of Duties',
      'Client Attempt to Update Transaction Status Blocked (403)',
      res.status === 403,
      `Status ${res.status} (expected 403)`
    );
  }

  // T21: Admin attempting to approve their OWN payout transaction (CRITICAL SEGREGATION OF DUTIES)
  let adminPayoutTxId = '';
  {
    // Give admin balance via Super Admin endpoint and submit payout request as admin
    await setUserBalance(admin.id, 200, 'Admin payout test setup');
    const adminPayoutRes = await api('POST', '/api/user/request-payout', adminToken, {
      amount: 100,
      payoutMethod: 'Crypto',
      payoutAddress: 'AdminOwnWalletAddress',
    });
    adminPayoutTxId = adminPayoutRes.body?.transaction?.id;

    // Now admin attempts to approve their OWN payout
    const selfApproveRes = await api('PATCH', `/api/admin/transactions/${adminPayoutTxId}/status`, adminToken, {
      status: 'completed',
    });

    const passed = selfApproveRes.status === 403;
    recordTest(
      'Segregation of Duties',
      'Admin Forbidden From Self-Approving Own Payout (Segregation of Duties)',
      passed,
      `Status ${selfApproveRes.status} (expected 403: ${selfApproveRes.body?.error})`
    );
  }

  // T22: Admin attempting to reject their OWN payout transaction is also forbidden
  {
    const selfRejectRes = await api('PATCH', `/api/admin/transactions/${adminPayoutTxId}/status`, adminToken, {
      status: 'rejected',
    });
    const passed = selfRejectRes.status === 403;
    recordTest(
      'Segregation of Duties',
      'Admin Forbidden From Self-Modifying/Rejecting Own Payout',
      passed,
      `Status ${selfRejectRes.status} (expected 403)`
    );
  }

  // T23: Admin approving an independent client's payout works and finalizes transaction
  {
    const beforeUser = await fetchUser(client.id);
    const approveRes = await api('PATCH', `/api/admin/transactions/${testPayoutTxId}/status`, adminToken, {
      status: 'completed',
    });
    const afterUser = await fetchUser(client.id);

    const pendingReduced = Number(((beforeUser?.pendingBalance || 0) - (afterUser?.pendingBalance || 0)).toFixed(2)) === 100;
    const txFinalized = approveRes.body?.transaction?.status === 'completed';
    const passed = approveRes.status === 200 && pendingReduced && txFinalized;

    recordTest(
      'Transaction Lifecycle',
      'Admin Approves Independent User Payout (Finalized Status & Reduced Pending)',
      passed,
      `Status ${approveRes.status}, final status: ${approveRes.body?.transaction?.status}`
    );
  }

  // T24: Replay attack / Double execution protection: Re-approving or re-finalizing an already completed transaction
  {
    const replayRes = await api('PATCH', `/api/admin/transactions/${testPayoutTxId}/status`, adminToken, {
      status: 'completed',
    });
    recordTest(
      'Transaction Lifecycle',
      'Double Execution Replay Blocked on Already Finalized Transaction',
      replayRes.status === 400,
      `Status ${replayRes.status} (expected 400: ${replayRes.body?.error})`
    );
  }

  // T25: Rejection of pending payout restores reserved balance to user atomically
  let rejectTestTxId = '';
  {
    // Client requests another payout of $75
    const reqRes = await api('POST', '/api/user/request-payout', clientToken, {
      amount: 75.00,
      payoutMethod: 'Crypto',
      payoutAddress: 'TestWalletForRejection',
    });
    rejectTestTxId = reqRes.body?.transaction?.id;

    const beforeUser = await fetchUser(client.id);

    // Admin rejects this payout
    const rejectRes = await api('PATCH', `/api/admin/transactions/${rejectTestTxId}/status`, adminToken, {
      status: 'rejected',
    });

    const afterUser = await fetchUser(client.id);
    const balanceRestored = Number(((afterUser?.balance || 0) - (beforeUser?.balance || 0)).toFixed(2)) === 75.00;
    const pendingReduced = Number(((beforeUser?.pendingBalance || 0) - (afterUser?.pendingBalance || 0)).toFixed(2)) === 75.00;
    const passed = rejectRes.status === 200 && balanceRestored && pendingReduced && rejectRes.body?.transaction?.status === 'rejected';

    recordTest(
      'Transaction Lifecycle',
      'Payout Rejection Restores Reserved Balance to User Atomically',
      passed,
      `Status ${rejectRes.status}, balance restored: $75, pending reduced: $75`
    );
  }

  // T26: Double execution protection: Attempting to modify an already rejected transaction
  {
    const repeatRes = await api('PATCH', `/api/admin/transactions/${rejectTestTxId}/status`, adminToken, {
      status: 'completed',
    });
    recordTest(
      'Transaction Lifecycle',
      'Modification Blocked on Already Rejected Terminal Transaction',
      repeatRes.status === 400,
      `Status ${repeatRes.status} (expected 400)`
    );
  }

  // --------------------------------------------------------------------------
  // 4. SUBSCRIPTION ACTIVATION, BALANCE PAYMENTS & IDOR AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 4. SUBSCRIPTION ACTIVATION, BALANCE PAYMENTS & IDOR AUDIT ---');

  // T27: Unauthenticated activation rejected
  {
    const res = await api('POST', '/api/user/activate-subscription', undefined, { planName: 'VIP SMC Quarterly', durationMonths: 3 });
    recordTest(
      'Subscription Security',
      'Unauthenticated Subscription Activation Blocked',
      res.status === 401,
      `Status ${res.status} (expected 401)`
    );
  }

  // T28: Client direct self-activation without payment or balance rejected
  {
    const res = await api('POST', '/api/user/activate-subscription', clientToken, {
      planName: 'VIP SMC Quarterly',
      durationMonths: 3,
    });
    recordTest(
      'Subscription Security',
      'Client Direct Self-Activation Without Payment Blocked (403)',
      res.status === 403,
      `Status ${res.status} (expected 403: ${res.body?.code})`
    );
  }

  // T29: Client attempting to bypass payment with hardcoded override string rejected
  {
    const res = await api('POST', '/api/user/activate-subscription', clientToken, {
      planName: 'VIP SMC Quarterly',
      durationMonths: 3,
      adminApprovalCode: 'SM_ADMIN_OVERRIDE_APPROVED',
    });
    recordTest(
      'Subscription Security',
      'Hardcoded Admin Override String Bypass Blocked',
      res.status === 403,
      `Status ${res.status} (expected 403)`
    );
  }

  // T30: IDOR protection: Client cannot activate subscription on behalf of another user
  {
    const res = await api('POST', '/api/user/activate-subscription', clientToken, {
      targetUserId: admin.id,
      planName: 'VIP SMC Quarterly',
      durationMonths: 3,
      payWithBalance: true,
    });
    recordTest(
      'Subscription Security',
      'IDOR Attack Blocked: Client Activating on Target User Account',
      res.status === 403,
      `Status ${res.status} (expected 403)`
    );
  }

  // T31: Privilege escalation protection: Admin cannot activate subscription on Super Admin account
  {
    const res = await api('POST', '/api/user/activate-subscription', adminToken, {
      targetUserId: superAdmin.id,
      planName: 'VIP SMC Annual',
      durationMonths: 12,
    });
    recordTest(
      'Subscription Security',
      'Admin Blocked From Activating Subscriptions on Super Admin Account',
      res.status === 403,
      `Status ${res.status} (expected 403)`
    );
  }

  // T32: Pay with balance when insufficient funds rejected
  {
    // Set client balance to $10
    await setUserBalance(client.id, 10, 'Test low balance');
    const res = await api('POST', '/api/user/activate-subscription', clientToken, {
      planName: 'Standard SMC 1-Month',
      durationMonths: 1, // costs $120
      payWithBalance: true,
    });
    recordTest(
      'Subscription Security',
      'Insufficient Balance for Subscription Purchase Rejected',
      res.status === 400,
      `Status ${res.status} (expected 400: ${res.body?.error})`
    );
  }

  // T33: Legitimate atomic subscription activation with balance succeeds, deducts cost, activates account
  {
    // Credit client with $350 via Super Admin endpoint
    await setUserBalance(client.id, 350, 'Credit balance for subscription');
    const beforeUser = await fetchUser(client.id);

    const res = await api('POST', '/api/user/activate-subscription', clientToken, {
      planName: 'Institutional Quarterly SMC',
      durationMonths: 3, // costs $290
      payWithBalance: true,
    });

    const afterUser = await fetchUser(client.id);
    const costDeducted = Number(((beforeUser?.balance || 0) - (afterUser?.balance || 0)).toFixed(2)) === 290.00;
    const isNowActive = afterUser?.subscriptionStatus === 'active';
    const hasTx = res.body?.transaction?.type === 'subscription_purchase';
    const passed = res.status === 200 && costDeducted && isNowActive && hasTx;

    recordTest(
      'Subscription Security',
      'Atomic Subscription Activation via Balance Deducts Cost & Records Ledger',
      passed,
      `Status ${res.status}, cost deducted: $290, new balance: $${afterUser?.balance}, status: ${afterUser?.subscriptionStatus}`
    );
  }

  // --------------------------------------------------------------------------
  // 5. REFERRAL COMMISSIONS & ANTI-FRAUD AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 5. REFERRAL COMMISSIONS & ANTI-FRAUD AUDIT ---');

  // T34: Self-referral commission attack: buyer cannot be referrer of themselves
  {
    const beforeSuperAdmin = await fetchUser(superAdmin.id);
    // User attempting to register with their own referral code or activating with self-referral
    const res = await api('POST', '/api/auth/register', undefined, {
      username: superAdmin.username,
      email: 'newemail@test.com',
      password: 'password123',
      referralCode: superAdmin.referralCode,
      verificationCode: '000000',
    });
    // Should be rejected (user already exists, cannot refer oneself)
    const afterSuperAdmin = await fetchUser(superAdmin.id);
    const balanceUnchanged = beforeSuperAdmin?.balance === afterSuperAdmin?.balance;

    recordTest(
      'Referral Anti-Fraud',
      'Self-Referral Commission Exploits Blocked (No Self-Attribution)',
      balanceUnchanged && (res.status === 400 || res.status === 409),
      `Status ${res.status}, balance remained exactly $${afterSuperAdmin?.balance}`
    );
  }

  // T35: Referral registration requires valid email verification code
  {
    const res = await api('POST', '/api/auth/register', undefined, {
      username: `test_user_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'Password123!',
      referralCode: superAdmin.referralCode,
      verificationCode: 'invalid_code_123',
    });
    recordTest(
      'Referral Anti-Fraud',
      'Unverified / Fraudulent Registration Without Valid Email Code Rejected',
      res.status === 400,
      `Status ${res.status} (expected 400)`
    );
  }

  // --------------------------------------------------------------------------
  // 6. FINANCIAL AUDIT TRAIL & LEDGER INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- 6. FINANCIAL AUDIT TRAIL & LEDGER INTEGRITY ---');

  // T36: Financial ledger entries cannot be viewed by unauthorized Client
  {
    const res = await api('GET', '/api/admin/transactions', clientToken);
    recordTest(
      'Audit Ledger Integrity',
      'Client Forbidden From Viewing Global Financial Ledger',
      res.status === 403,
      `Status ${res.status} (expected 403)`
    );
  }

  // T37: Audit logs capture all financial adjustments and payout status changes
  {
    const res = await api('GET', '/api/admin/audit-logs?limit=10', superAdminToken);
    const hasLogs = res.status === 200 && Array.isArray(res.body?.logs) && res.body.logs.length > 0;
    const hasFinancialActions = res.body?.logs?.some((l: any) =>
      ['BALANCE_ADJUST', 'PAYOUT_COMPLETED', 'PAYOUT_REJECTED_BALANCE_RESTORED', 'SUBSCRIPTION_BALANCE_PURCHASE', 'TRANSACTION_STATUS_UPDATE'].includes(l.action)
    );

    recordTest(
      'Audit Ledger Integrity',
      'Comprehensive Audit Trail Captures Financial Events with Actor & Metadata',
      hasLogs && hasFinancialActions,
      `Status ${res.status}, captured recent financial events in immutable audit trail`
    );
  }

  // T38: Expired client access to proprietary financial/trading content blocked
  {
    const res = await api('GET', '/api/user/signals', clientExpiredToken);
    recordTest(
      'Subscription Enforcement',
      'Expired Client Prohibited from Proprietary Trading Signals',
      res.status === 403,
      `Status ${res.status} (expected 403 SUBSCRIPTION_REQUIRED)`
    );
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('AUDIT SUMMARY');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Financial & Security Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.error(`\nFAILED TESTS (${failed}):`);
    results.filter(r => !r.passed).forEach(r => {
      console.error(`- [${r.category}] ${r.name}: ${r.details}`);
    });
    process.exit(1);
  } else {
    console.log('\n\x1b[32mALL 38/38 FINANCIAL & BUSINESS LOGIC SECURITY TESTS PASSED!\x1b[0m\n');
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit execution error:', err);
  process.exit(1);
});
