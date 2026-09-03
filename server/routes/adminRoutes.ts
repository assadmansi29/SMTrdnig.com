import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Database, UserRecord, UserRole, SubscriptionStatus, RolePermissions } from '../db';
import { authenticateToken, requireRole, requirePermission, sanitizeUser, AuthRequest } from '../auth';

const router = Router();

// All routes require valid authentication
router.use(authenticateToken);

// ====================================================
// 1. STATS OVERVIEW (Super Admin & Admin)
// ====================================================
router.get('/stats', requirePermission('canManageClients'), async (req: AuthRequest, res: Response): Promise<void> => {
  const users = await Database.getAllUsers();
  const transactions = await Database.getAllTransactions();

  const totalUsers = users.length;
  const activeSubscribers = users.filter(u => u.subscriptionStatus === 'active').length;
  const expiredSubscribers = users.filter(u => u.subscriptionStatus === 'expired').length;
  const superAdminCount = users.filter(u => u.role === 'super_admin').length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const employeeCount = users.filter(u => u.role === 'employee').length;
  const coachCount = users.filter(u => u.role === 'coach').length;
  const clientCount = users.filter(u => u.role === 'client').length;

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
      superAdminCount,
      adminCount,
      employeeCount,
      coachCount,
      clientCount,
      totalBalanceLiability: Number(totalBalanceLiability.toFixed(2)),
      totalCommissionsPaid: Number(totalCommissionsPaid.toFixed(2)),
      totalTransactions: transactions.length,
      isSuperAdmin: req.user!.role === 'super_admin',
    }
  });
});

// ====================================================
// 2. USER MANAGEMENT (Super Admin & Admin)
// ====================================================
// GET /api/admin/users
router.get('/users', requirePermission('canManageClients'), async (req: AuthRequest, res: Response): Promise<void> => {
  const callerRole = req.user!.role;
  const users = await Database.getAllUsers();

  // Aggregate referral counts across in-memory user list
  const referralCounts: Record<string, number> = {};
  for (const u of users) {
    if (u.referredBy) {
      referralCounts[u.referredBy] = (referralCounts[u.referredBy] || 0) + 1;
    }
  }

  const sanitized = users.map((u) => {
    const byIdCount = referralCounts[u.id] || 0;
    const byCodeCount = u.referralCode ? (referralCounts[u.referralCode] || referralCounts[u.referralCode.toUpperCase()] || 0) : 0;
    return {
      ...sanitizeUser(u, callerRole),
      referralsCount: Math.max(byIdCount, byCodeCount, (byIdCount + byCodeCount)),
    };
  });

  res.json({ success: true, users: sanitized });
});

// POST /api/admin/users (Create User)
router.post('/users', requirePermission('canCreateUsers'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const callerRole = req.user!.role;
    const {
      username,
      email,
      password,
      fullName,
      role = 'client',
      subscriptionStatus = 'active',
      commissionRate,
      balance = 0,
      planName,
      coachSpecialty,
      assignedCoachId,
    } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email, and password are required.' });
      return;
    }

    // Role creation constraint: Admin can ONLY create clients. Only Super Admin can create super_admin, admin, employee, or coach
    if (callerRole === 'admin' && role !== 'client') {
      res.status(403).json({
        error: 'Standard Admins are only authorized to create Client accounts. Creating Super Admin, Admin, Employee, or Coach accounts requires Super Admin privileges.',
      });
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

    const defaultCommRate = role === 'super_admin' ? 25 : role === 'admin' ? 20 : role === 'employee' ? 18 : role === 'coach' ? 18 : 10;

    const newUser = await Database.createUser({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      fullName: fullName?.trim() || username.trim(),
      role: role as UserRole,
      subscriptionStatus: (subscriptionStatus as SubscriptionStatus) || 'active',
      subscriptionPlan: planName || (role === 'client' ? 'Standard Pro SMC Enrollment' : 'Institutional Staff Access'),
      subscriptionExpiresAt: expDate.toISOString(),
      referralCode: userRefCode,
      commissionRate: Number(commissionRate) || defaultCommRate,
      balance: callerRole === 'super_admin' ? Number(balance) || 0.0 : 0.0,
      pendingBalance: 0.0,
      totalEarned: callerRole === 'super_admin' ? Number(balance) || 0.0 : 0.0,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
      notes: `Created by ${req.user!.role.toUpperCase()} @${req.user!.username}`,
      assignedCoachId: assignedCoachId || undefined,
      coachSpecialty: coachSpecialty || undefined,
      trainingStatus: role === 'client' ? 'active_training' : undefined,
    });

    // Record Audit Log
    await Database.addAuditLog({
      actorId: req.user!.id,
      actorUsername: req.user!.username,
      actorRole: req.user!.role,
      action: 'USER_CREATE',
      targetId: newUser.id,
      targetUsername: newUser.username,
      details: `Created new user @${newUser.username} with role '${role}' and plan '${newUser.subscriptionPlan}'`,
      metadata: { role, email: newUser.email, creatorRole: callerRole },
    });

    res.status(201).json({ success: true, user: sanitizeUser(newUser, callerRole) });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create user account.' });
  }
});

// PATCH /api/admin/users/:id/role (SUPER ADMIN ONLY)
router.patch('/users/:id/role', requirePermission('canManageAdmins'), async (req: AuthRequest, res: Response): Promise<void> => {
  const callerRole = req.user!.role;
  const { id } = req.params;
  const { role } = req.body;

  // STRICT RBAC: Changing roles or promoting/demoting is restricted to Super Admin
  if (callerRole !== 'super_admin') {
    res.status(403).json({
      error: 'Access denied. Modifying account roles, staff appointments, or RBAC assignments is strictly restricted to Super Admin only.',
    });
    return;
  }

  if (!['super_admin', 'admin', 'employee', 'coach', 'client'].includes(role)) {
    res.status(400).json({ error: 'Invalid role. Must be super_admin, admin, employee, coach, or client.' });
    return;
  }

  const targetUser = await Database.findUserById(id);
  if (!targetUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Prevent demoting self if caller is the super admin
  if (id === req.user!.id && role !== 'super_admin') {
    res.status(400).json({ error: 'You cannot demote your own active Super Admin account.' });
    return;
  }

  const prevRole = targetUser.role;
  const updated = await Database.updateUser(id, { role });

  // Record Audit Log
  await Database.addAuditLog({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    actorRole: req.user!.role,
    action: 'ROLE_CHANGE',
    targetId: targetUser.id,
    targetUsername: targetUser.username,
    details: `Updated role of @${targetUser.username} from '${prevRole}' to '${role}'`,
    metadata: { previousRole: prevRole, newRole: role },
  });

  res.json({ success: true, message: `User role updated to ${role}`, user: sanitizeUser(updated!, callerRole) });
});

// PATCH /api/admin/users/:id/subscription (Super Admin & Admin)
router.patch('/users/:id/subscription', requirePermission('canManageSubscriptions'), async (req: AuthRequest, res: Response): Promise<void> => {
  const callerRole = req.user!.role;
  const { id } = req.params;
  const { status, planName, expiresAt, addMonths } = req.body;

  const targetUser = await Database.findUserById(id);
  if (!targetUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Admin can ONLY modify subscriptions for normal 'client' accounts
  if (callerRole === 'admin' && targetUser.role !== 'client') {
    res.status(403).json({
      error: 'Access denied. Administrators are strictly restricted to managing subscriptions for Client accounts only. Modifying staff or higher-privilege accounts requires Super Admin authorization.',
    });
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

  // Record Audit Log
  await Database.addAuditLog({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    actorRole: req.user!.role,
    action: 'SUBSCRIPTION_UPDATE',
    targetId: targetUser.id,
    targetUsername: targetUser.username,
    details: `Updated subscription for @${targetUser.username}: status=${updates.subscriptionStatus || targetUser.subscriptionStatus}, expiresAt=${updates.subscriptionExpiresAt || targetUser.subscriptionExpiresAt}`,
    metadata: { updates },
  });

  res.json({ success: true, message: 'Subscription updated successfully', user: sanitizeUser(updated!, callerRole) });
});

// PATCH /api/admin/users/:id/balance (SUPER ADMIN ONLY)
router.patch('/users/:id/balance', requirePermission('canAdjustBalances'), async (req: AuthRequest, res: Response): Promise<void> => {
  const callerRole = req.user!.role;
  if (callerRole !== 'super_admin') {
    res.status(403).json({
      error: 'Direct balance adjustments and financial ledger corrections require Super Admin authorization.',
    });
    return;
  }

  const { id } = req.params;
  const { amount, action = 'set', reason = 'Super Admin Balance Adjustment' } = req.body;

  const validActions = ['add', 'deduct', 'set'];
  if (!validActions.includes(action)) {
    res.status(400).json({ error: `Invalid action '${action}'. Allowed actions: add, deduct, set.` });
    return;
  }

  const numAmount = Number(amount);
  if (amount === undefined || isNaN(numAmount) || !Number.isFinite(numAmount) || numAmount < 0) {
    res.status(400).json({ error: 'Amount must be a non-negative, finite number.' });
    return;
  }

  if (numAmount > 10000000) {
    res.status(400).json({ error: 'Amount exceeds maximum allowable threshold ($10,000,000).' });
    return;
  }

  const user = await Database.findUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  if (action === 'deduct' && numAmount > user.balance) {
    res.status(400).json({
      error: `Cannot deduct $${numAmount.toFixed(2)} from available balance of $${user.balance.toFixed(2)}. Balances cannot be negative.`,
    });
    return;
  }

  try {
    const result = await Database.adjustUserBalanceAtomic(
      id,
      numAmount,
      action,
      String(reason).trim() || 'Super Admin Balance Adjustment',
      req.user!
    );

    res.json({
      success: true,
      message: `Balance updated to $${result.user.balance.toFixed(2)}`,
      user: sanitizeUser(result.user, callerRole),
      transaction: result.transaction,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to adjust balance.' });
  }
});

// PATCH /api/admin/users/:id/commission-rate (SUPER ADMIN ONLY)
router.patch('/users/:id/commission-rate', requirePermission('canSetCommissionRates'), async (req: AuthRequest, res: Response): Promise<void> => {
  const callerRole = req.user!.role;
  if (callerRole !== 'super_admin') {
    res.status(403).json({ error: 'Setting referral commission rates requires Super Admin authorization.' });
    return;
  }

  const { id } = req.params;
  const { rate } = req.body;

  const numRate = Number(rate);
  if (isNaN(numRate) || numRate < 0 || numRate > 100) {
    res.status(400).json({ error: 'Commission rate must be a percentage between 0 and 100.' });
    return;
  }

  const targetUser = await Database.findUserById(id);
  if (!targetUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const updated = await Database.updateUser(id, { commissionRate: numRate });

  // Record Audit Log
  await Database.addAuditLog({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    actorRole: req.user!.role,
    action: 'COMMISSION_RATE_UPDATE',
    targetId: targetUser.id,
    targetUsername: targetUser.username,
    details: `Changed commission rate for @${targetUser.username} from ${targetUser.commissionRate}% to ${numRate}%`,
    metadata: { previousRate: targetUser.commissionRate, newRate: numRate },
  });

  res.json({ success: true, message: `Referral commission rate set to ${numRate}%`, user: sanitizeUser(updated!, callerRole) });
});

// PATCH /api/admin/users/:id/reset-password (Super Admin & Admin)
router.patch('/users/:id/reset-password', requirePermission('canResetPasswords'), async (req: AuthRequest, res: Response): Promise<void> => {
  const callerRole = req.user!.role;
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  const targetUser = await Database.findUserById(id);
  if (!targetUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Admin can ONLY reset password for normal 'client' users
  if (callerRole === 'admin' && targetUser.role !== 'client') {
    res.status(403).json({
      error: 'Admins are only authorized to reset passwords for Client accounts. Resetting staff or admin passwords requires Super Admin authorization.',
    });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  const updated = await Database.updateUser(id, { passwordHash });

  // Record Audit Log
  await Database.addAuditLog({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    actorRole: req.user!.role,
    action: 'PASSWORD_RESET',
    targetId: targetUser.id,
    targetUsername: targetUser.username,
    details: `Reset password for user @${targetUser.username}`,
    metadata: { resetByRole: callerRole },
  });

  res.json({ success: true, message: `Password for @${updated!.username} successfully reset.` });
});

// DELETE /api/admin/users/:id (SUPER ADMIN ONLY)
router.delete('/users/:id', requirePermission('canDeleteUsers'), async (req: AuthRequest, res: Response): Promise<void> => {
  const callerRole = req.user!.role;
  if (callerRole !== 'super_admin') {
    res.status(403).json({ error: 'Account deletion is permanently restricted to Super Admin only.' });
    return;
  }

  const { id } = req.params;

  if (id === req.user!.id) {
    res.status(400).json({ error: 'You cannot delete your own Super Admin account.' });
    return;
  }

  const targetUser = await Database.findUserById(id);
  if (!targetUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const deleted = await Database.deleteUser(id);
  if (!deleted) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Record Audit Log
  await Database.addAuditLog({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    actorRole: req.user!.role,
    action: 'USER_DELETE',
    targetId: targetUser.id,
    targetUsername: targetUser.username,
    details: `Permanently deleted user account @${targetUser.username} (Role: ${targetUser.role})`,
    metadata: { deletedUser: targetUser.username, role: targetUser.role },
  });

  res.json({ success: true, message: `User account @${targetUser.username} removed permanently.` });
});

// ====================================================
// 3. TRANSACTIONS (Super Admin & Admin)
// ====================================================
router.get('/transactions', requirePermission('canViewTransactions'), async (req: AuthRequest, res: Response): Promise<void> => {
  const transactions = await Database.getAllTransactions();
  res.json({ success: true, transactions });
});

router.patch('/transactions/:id/status', requirePermission('canViewTransactions'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['completed', 'pending', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Invalid status.' });
    return;
  }

  const existingTx = await Database.findTransactionById(id);
  if (!existingTx) {
    res.status(404).json({ error: 'Transaction not found.' });
    return;
  }

  // Prevent Admin (and any non-super admin) self-approval or modification of own payout transactions
  if ((req.user!.role === 'admin' || req.user!.role !== 'super_admin') && existingTx.userId === req.user!.id) {
    res.status(403).json({
      error: 'Segregation of duties violation: Administrators are strictly prohibited from approving or modifying their own payout transactions.',
    });
    return;
  }

  // Double execution & replay protection: transactions are immutable once finalized
  if (existingTx.status === status) {
    res.status(400).json({ error: `Transaction #${id} is already in status '${status}'.` });
    return;
  }

  if (existingTx.status !== 'pending') {
    res.status(400).json({
      error: `Transaction #${id} has already been finalized as '${existingTx.status}' and cannot be modified again.`,
    });
    return;
  }

  try {
    if (existingTx.type === 'payout_request') {
      const result = await Database.finalizePayoutTransactionAtomic(id, status, req.user!);
      res.json({
        success: true,
        transaction: result.transaction,
        user: result.user ? sanitizeUser(result.user, req.user!.role) : undefined,
      });
      return;
    }

    const updatedTx = await Database.updateTransactionStatus(id, status);

    // Record Audit Log
    await Database.addAuditLog({
      actorId: req.user!.id,
      actorUsername: req.user!.username,
      actorRole: req.user!.role,
      action: 'TRANSACTION_STATUS_UPDATE',
      targetId: updatedTx!.id,
      details: `Updated transaction #${updatedTx!.id} status to '${status}'`,
      metadata: { transactionId: updatedTx!.id, status, amount: updatedTx!.amount },
    });

    res.json({ success: true, transaction: updatedTx });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update transaction status.' });
  }
});

// ====================================================
// 4. AUDIT LOGS (SUPER ADMIN ONLY)
// ====================================================
router.get('/audit-logs', requirePermission('canViewAuditLogs'), async (req: AuthRequest, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const logs = await Database.getAuditLogs(limit);
  res.json({ success: true, logs });
});

// ====================================================
// 5. RBAC DYNAMIC PERMISSION MATRIX (SUPER ADMIN ONLY)
// ====================================================
router.get(['/rbac', '/rbac-settings'], requirePermission('canManageRBAC'), async (req: AuthRequest, res: Response): Promise<void> => {
  const settings = await Database.getRBACSettings();
  res.json({ success: true, rbac: settings, rbacSettings: settings });
});

router.patch('/rbac-settings', requirePermission('canManageRBAC'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, permission, value, permissions } = req.body;

  if (!role || !['admin', 'employee', 'coach', 'client'].includes(role)) {
    res.status(400).json({ error: 'Valid configurable role (admin, employee, coach, client) is required.' });
    return;
  }

  let permsToUpdate: Partial<RolePermissions> = {};
  if (permission && typeof value === 'boolean') {
    permsToUpdate = { [permission]: value };
  } else if (permissions && typeof permissions === 'object') {
    permsToUpdate = permissions;
  } else {
    res.status(400).json({ error: 'Invalid permission payload provided.' });
    return;
  }

  const updated = await Database.updateRBACSettings(role as UserRole, permsToUpdate, req.user!.username);
  const allSettings = await Database.getRBACSettings();

  await Database.addAuditLog({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    actorRole: req.user!.role,
    action: 'RBAC_CONFIG_UPDATE',
    details: `Updated RBAC permissions for role '${role}': ${JSON.stringify(permsToUpdate)}`,
    metadata: { role, updates: permsToUpdate },
  });

  res.json({ success: true, message: `RBAC permissions updated for role ${role}`, rbacSettings: allSettings, permissions: updated });
});

router.patch('/rbac/:role', requirePermission('canManageRBAC'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { role } = req.params;
  const permissions = req.body.permissions as Partial<RolePermissions>;

  if (!['super_admin', 'admin', 'employee', 'coach', 'client'].includes(role)) {
    res.status(400).json({ error: 'Invalid role specified.' });
    return;
  }

  if (role === 'super_admin') {
    res.status(400).json({ error: 'Super Admin permissions are immutable and permanently full.' });
    return;
  }

  const updated = await Database.updateRBACSettings(role as UserRole, permissions, req.user!.username);
  const allSettings = await Database.getRBACSettings();

  // Record Audit Log
  await Database.addAuditLog({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    actorRole: req.user!.role,
    action: 'RBAC_CONFIG_UPDATE',
    details: `Updated RBAC permission matrix for role '${role}'`,
    metadata: { role, permissions },
  });

  res.json({ success: true, message: `RBAC permissions updated for role ${role}`, permissions: updated, rbacSettings: allSettings });
});

// ====================================================
// 6. COACHING DESK (Coach, Admin, Super Admin)
// ====================================================
router.get(['/coaching/students', '/coaching-students'], requirePermission('canAccessCoachingDesk'), async (req: AuthRequest, res: Response): Promise<void> => {
  const callerRole = req.user!.role;
  const coachFilter = callerRole === 'coach' ? req.user!.id : (req.query.coachId as string | undefined);

  const students = await Database.getCoachingStudents(coachFilter);
  const sanitized = students.map(s => sanitizeUser(s, callerRole));

  res.json({ success: true, students: sanitized });
});

router.patch(['/coaching/students/:id/progress', '/coaching-students/:id'], requirePermission('canAccessCoachingDesk'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { progress, trainingProgress, trainingStatus, coachNotes, coachingNotes } = req.body;

  const targetStudent = await Database.findUserById(id);
  if (!targetStudent) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }

  if (targetStudent.role !== 'client') {
    res.status(400).json({ error: 'Coaching training milestones can only be updated for student accounts.' });
    return;
  }

  // If caller is coach, verify they are assigned to this student
  if (req.user!.role === 'coach' && targetStudent.assignedCoachId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied. You can only update training milestones for your personally assigned students.' });
    return;
  }

  const updatedMilestones = trainingProgress || progress;
  const updatedNotes = coachingNotes || coachNotes;

  const updated = await Database.updateStudentTrainingProgress(id, updatedMilestones, trainingStatus, updatedNotes);

  // Record Audit Log
  await Database.addAuditLog({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    actorRole: req.user!.role,
    action: 'COACHING_PROGRESS_UPDATE',
    targetId: targetStudent.id,
    targetUsername: targetStudent.username,
    details: `Updated coaching training milestones & notes for student @${targetStudent.username}`,
    metadata: { student: targetStudent.username, trainingStatus },
  });

  res.json({ success: true, message: 'Coaching progress updated', student: sanitizeUser(updated!, req.user!.role) });
});

router.patch(['/coaching/students/:id/assign-coach', '/coaching-students/:id/assign-coach'], requirePermission('canAccessCoachingDesk'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { coachId } = req.body;

  if (req.user!.role === 'coach') {
    res.status(403).json({ error: 'Coaches cannot assign or reassign student accounts. Admin or Super Admin privileges required.' });
    return;
  }

  const student = await Database.findUserById(id);
  if (!student) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }

  if (student.role !== 'client') {
    res.status(400).json({ error: 'Coaches can only be assigned to Client student accounts.' });
    return;
  }

  const coach = await Database.findUserById(coachId);
  if (!coach || coach.role !== 'coach') {
    res.status(400).json({ error: 'Target user is not a valid certified coach.' });
    return;
  }

  const updated = await Database.assignStudentCoach(id, coachId);

  // Record Audit Log
  await Database.addAuditLog({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    actorRole: req.user!.role,
    action: 'COACH_ASSIGNMENT',
    targetId: student.id,
    targetUsername: student.username,
    details: `Assigned coach @${coach.username} to student @${student.username}`,
    metadata: { studentId: student.id, coachId: coach.id },
  });

  res.json({ success: true, message: `Student assigned to Coach @${coach.username}`, student: sanitizeUser(updated!, req.user!.role) });
});

// ====================================================
// 7. OPERATIONS QUEUE (Employee, Admin, Super Admin)
// ====================================================
router.get(['/operations/queue', '/operations-queue'], requirePermission('canAccessOperations'), async (req: AuthRequest, res: Response): Promise<void> => {
  const items = await Database.getOperationalItems();
  res.json({ success: true, items });
});

router.post(['/operations/queue', '/operations-queue'], requirePermission('canAccessOperations'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, type, priority = 'medium', status = 'pending', assignedTo, notes } = req.body;

  if (!title || !type) {
    res.status(400).json({ error: 'Title and type are required.' });
    return;
  }

  const newItem = await Database.addOperationalItem({
    title,
    type,
    priority,
    status,
    assignedTo: assignedTo || req.user!.username,
    notes,
  });

  res.status(201).json({ success: true, item: newItem });
});

router.patch(['/operations/queue/:id', '/operations-queue/:id'], requirePermission('canAccessOperations'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, type, priority, status, assignedTo, notes } = req.body;

  const updated = await Database.updateOperationalItem(id, {
    title,
    type,
    priority,
    status,
    assignedTo,
    notes,
  });

  if (!updated) {
    res.status(404).json({ error: 'Operational item not found.' });
    return;
  }

  res.json({ success: true, item: updated });
});

export default router;
