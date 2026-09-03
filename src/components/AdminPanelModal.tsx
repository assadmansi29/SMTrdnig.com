import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UserProfile, 
  Transaction, 
  UserRole, 
  SubscriptionStatus, 
  YouTubeLiveStatus, 
  AuditLogEntry, 
  RolePermissions, 
  CoachingStudent, 
  OperationalItem 
} from '../types';
import { UserAvatar } from './UserAvatar';
import { 
  X, 
  ShieldCheck, 
  Crown, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  AlertCircle, 
  Clock, 
  Lock, 
  Calendar, 
  RefreshCw,
  Wallet,
  Settings,
  ArrowUpRight,
  UserPlus,
  Radio,
  Tv,
  ExternalLink,
  KeyRound,
  GraduationCap,
  Briefcase,
  Sliders,
  FileText,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ListTodo
} from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  
  // Available tabs based on role
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  const isCoach = user?.role === 'coach';
  const isStaff = isSuperAdmin || isAdmin || isEmployee || isCoach;

  type TabType = 'users' | 'audit_logs' | 'rbac' | 'coaching' | 'operations' | 'transactions' | 'create_user' | 'youtube';
  const [activeTab, setActiveTab] = useState<TabType>(
    isCoach ? 'coaching' : isEmployee ? 'operations' : 'users'
  );

  // Core Data states
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [rbacSettings, setRbacSettings] = useState<Record<UserRole, RolePermissions> | null>(null);
  const [coachingStudents, setCoachingStudents] = useState<CoachingStudent[]>([]);
  const [operationsQueue, setOperationsQueue] = useState<OperationalItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState('');

  // YouTube Stream Config state
  const [ytChannelHandle, setYtChannelHandle] = useState('');
  const [ytChannelId, setYtChannelId] = useState('');
  const [ytApiKeyConfigured, setYtApiKeyConfigured] = useState(false);
  const [ytLiveStatus, setYtLiveStatus] = useState<YouTubeLiveStatus | null>(null);
  const [ytTesting, setYtTesting] = useState(false);
  const [ytSaveStatus, setYtSaveStatus] = useState<string | null>(null);

  // Balance Adjustment Submodal (Super Admin Only)
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<UserProfile | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [balanceReason, setBalanceReason] = useState('Desk performance reward');
  const [balanceStatus, setBalanceStatus] = useState<string | null>(null);

  // Commission Rate Submodal (Super Admin Only)
  const [selectedUserForRate, setSelectedUserForRate] = useState<UserProfile | null>(null);
  const [newCommissionRate, setNewCommissionRate] = useState('');
  const [rateStatus, setRateStatus] = useState<string | null>(null);

  // Password Reset Submodal
  const [selectedUserForPass, setSelectedUserForPass] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passStatus, setPassStatus] = useState<string | null>(null);

  // Create User Form
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('client');
  const [newSubStatus, setNewSubStatus] = useState<SubscriptionStatus>('active');
  const [newInitialBalance, setNewInitialBalance] = useState('0');
  const [newRate, setNewRate] = useState('10');
  const [createStatus, setCreateStatus] = useState<string | null>(null);

  // New Operation Item Modal
  const [showNewOpModal, setShowNewOpModal] = useState(false);
  const [newOpTitle, setNewOpTitle] = useState('');
  const [newOpType, setNewOpType] = useState<OperationalItem['type']>('market_brief');
  const [newOpPriority, setNewOpPriority] = useState<OperationalItem['priority']>('medium');
  const [newOpNotes, setNewOpNotes] = useState('');

  // Selected Student for Coaching Note Edit
  const [selectedStudentForNote, setSelectedStudentForNote] = useState<CoachingStudent | null>(null);
  const [studentNoteDraft, setStudentNoteDraft] = useState('');
  const [studentStatusDraft, setStudentStatusDraft] = useState<CoachingStudent['trainingStatus']>('active_training');

  const fetchAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch common data
      const promises: Promise<any>[] = [
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
      ];

      // 2. Fetch role-specific data
      if (isSuperAdmin || isAdmin) {
        promises.push(fetch('/api/admin/transactions', { headers: { 'Authorization': `Bearer ${token}` } }));
      }
      if (isSuperAdmin) {
        promises.push(fetch('/api/admin/audit-logs', { headers: { 'Authorization': `Bearer ${token}` } }));
        promises.push(fetch('/api/admin/rbac-settings', { headers: { 'Authorization': `Bearer ${token}` } }));
      }
      if (isSuperAdmin || isAdmin || isCoach) {
        promises.push(fetch('/api/admin/coaching-students', { headers: { 'Authorization': `Bearer ${token}` } }));
      }
      if (isSuperAdmin || isAdmin || isEmployee) {
        promises.push(fetch('/api/admin/operations-queue', { headers: { 'Authorization': `Bearer ${token}` } }));
      }

      const results = await Promise.allSettled(promises);
      
      // Parse Users
      if (results[0].status === 'fulfilled' && results[0].value.ok) {
        const uData = await results[0].value.json();
        setUsers(uData.users || []);
      }
      // Parse Stats
      if (results[1].status === 'fulfilled' && results[1].value.ok) {
        const sData = await results[1].value.json();
        setStats(sData.stats);
      }

      // Handle other results based on presence
      let resIdx = 2;
      if (isSuperAdmin || isAdmin) {
        const tRes = results[resIdx++];
        if (tRes && tRes.status === 'fulfilled' && tRes.value.ok) {
          const tData = await tRes.value.json();
          setTransactions(tData.transactions || []);
        }
      }
      if (isSuperAdmin) {
        const aRes = results[resIdx++];
        if (aRes && aRes.status === 'fulfilled' && aRes.value.ok) {
          const aData = await aRes.value.json();
          setAuditLogs(aData.logs || []);
        }
        const rRes = results[resIdx++];
        if (rRes && rRes.status === 'fulfilled' && rRes.value.ok) {
          const rData = await rRes.value.json();
          setRbacSettings(rData.rbacSettings || null);
        }
      }
      if (isSuperAdmin || isAdmin || isCoach) {
        const cRes = results[resIdx++];
        if (cRes && cRes.status === 'fulfilled' && cRes.value.ok) {
          const cData = await cRes.value.json();
          setCoachingStudents(cData.students || []);
        }
      }
      if (isSuperAdmin || isAdmin || isEmployee) {
        const oRes = results[resIdx++];
        if (oRes && oRes.status === 'fulfilled' && oRes.value.ok) {
          const oData = await oRes.value.json();
          setOperationsQueue(oData.queue || []);
        }
      }
    } catch (err) {
      console.error('Error loading desk data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchYouTubeSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/youtube/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setYtApiKeyConfigured(data.configured);
        setYtChannelId(data.channelId || '');
        setYtChannelHandle(data.channelHandle || '');
      }
    } catch (err) {
      console.error('Error loading YouTube settings:', err);
    }
  };

  const testYouTubeStreamScan = async () => {
    setYtTesting(true);
    try {
      const res = await fetch('/api/youtube/live-stream?force=true');
      const data = await res.json();
      setYtLiveStatus(data);
    } catch (err: any) {
      console.error('Error scanning live stream:', err);
    } finally {
      setYtTesting(false);
    }
  };

  const handleSaveYouTubeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setYtSaveStatus('Saving channel settings...');
    try {
      const res = await fetch('/api/youtube/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          channelId: ytChannelId.trim(),
          channelHandle: ytChannelHandle.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setYtSaveStatus('YouTube settings saved & live scanner refreshed!');
        testYouTubeStreamScan();
        setTimeout(() => setYtSaveStatus(null), 3000);
      } else {
        setYtSaveStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setYtSaveStatus(`Failed: ${err.message}`);
    }
  };

  useEffect(() => {
    if (isOpen && isStaff) {
      fetchAdminData();
      if (isSuperAdmin || isAdmin || isEmployee) {
        fetchYouTubeSettings();
        testYouTubeStreamScan();
      }
    }
  }, [isOpen, token, user]);

  if (!isOpen || !isStaff) return null;

  // Super Admin: Role Change
  const handleRoleChange = async (userId: string, role: UserRole) => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
        fetchAdminData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to change role');
      }
    } catch (err) {
      console.error('Failed to change role:', err);
    }
  };

  // Subscription Status Change
  const handleSubscriptionChange = async (userId: string, status: SubscriptionStatus) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, subscriptionStatus: status } : u));
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to change subscription:', err);
    }
  };

  // Subscription Extension
  const handleExtendSubscription = async (userId: string, months: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ addMonths: months, status: 'active' }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to extend subscription:', err);
    }
  };

  // Balance Adjustment (Super Admin)
  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForBalance || !balanceAmount || !isSuperAdmin) return;

    setBalanceStatus('Submitting update...');
    try {
      const res = await fetch(`/api/admin/users/${selectedUserForBalance.id}/balance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(balanceAmount),
          action: balanceAction,
          reason: balanceReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBalanceStatus('Balance successfully updated!');
        fetchAdminData();
        setTimeout(() => {
          setSelectedUserForBalance(null);
          setBalanceStatus(null);
          setBalanceAmount('');
        }, 1500);
      } else {
        setBalanceStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setBalanceStatus(`Error: ${err.message}`);
    }
  };

  // Commission Rate Change (Super Admin)
  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForRate || !newCommissionRate || !isSuperAdmin) return;

    setRateStatus('Updating rate...');
    try {
      const res = await fetch(`/api/admin/users/${selectedUserForRate.id}/commission-rate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ rate: Number(newCommissionRate) }),
      });
      if (res.ok) {
        setRateStatus('Commission rate updated!');
        fetchAdminData();
        setTimeout(() => {
          setSelectedUserForRate(null);
          setRateStatus(null);
        }, 1500);
      } else {
        const data = await res.json();
        setRateStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setRateStatus(`Error: ${err.message}`);
    }
  };

  // Password Reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPass || !newPassword) return;

    setPassStatus('Resetting password...');
    try {
      const res = await fetch(`/api/admin/users/${selectedUserForPass.id}/reset-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) {
        setPassStatus('Password reset successfully!');
        fetchAdminData();
        setTimeout(() => {
          setSelectedUserForPass(null);
          setPassStatus(null);
          setNewPassword('');
        }, 1500);
      } else {
        const data = await res.json();
        setPassStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setPassStatus(`Error: ${err.message}`);
    }
  };

  // Delete User (Super Admin Only)
  const handleDeleteUser = async (userId: string, username: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Are you sure you want to permanently delete @${username}? This action is irreversible.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        fetchAdminData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  // Create User
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateStatus('Creating user account...');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          email: newEmail.trim(),
          password: newPass,
          fullName: newFullName.trim() || newUsername.trim(),
          role: isSuperAdmin ? newRole : 'client',
          subscriptionStatus: newSubStatus,
          commissionRate: isSuperAdmin ? Number(newRate) : 10,
          balance: isSuperAdmin ? Number(newInitialBalance) : 0,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCreateStatus('Account successfully created!');
        fetchAdminData();
        setNewUsername('');
        setNewEmail('');
        setNewFullName('');
        setNewPass('');
        setTimeout(() => {
          setActiveTab('users');
          setCreateStatus(null);
        }, 1500);
      } else {
        setCreateStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setCreateStatus(`Failed: ${err.message}`);
    }
  };

  // RBAC Matrix Toggle (Super Admin Only)
  const handleToggleRbacPermission = async (role: UserRole, permissionKey: keyof RolePermissions, currentValue: boolean) => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch('/api/admin/rbac-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          role,
          permission: permissionKey,
          value: !currentValue,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRbacSettings(data.rbacSettings);
      }
    } catch (err) {
      console.error('Failed to update RBAC permission:', err);
    }
  };

  // Operations Queue: Add item
  const handleAddOpItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpTitle.trim()) return;
    try {
      const res = await fetch('/api/admin/operations-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newOpTitle.trim(),
          type: newOpType,
          priority: newOpPriority,
          notes: newOpNotes.trim(),
        }),
      });
      if (res.ok) {
        setShowNewOpModal(false);
        setNewOpTitle('');
        setNewOpNotes('');
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to add operation task:', err);
    }
  };

  // Operations Queue: Update status
  const handleUpdateOpStatus = async (itemId: string, status: OperationalItem['status']) => {
    try {
      const res = await fetch(`/api/admin/operations-queue/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setOperationsQueue(prev => prev.map(item => item.id === itemId ? { ...item, status } : item));
      }
    } catch (err) {
      console.error('Failed to update operation item:', err);
    }
  };

  // Coaching Student: Save Note / Status
  const handleSaveStudentNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForNote) return;
    try {
      const res = await fetch(`/api/admin/coaching-students/${selectedStudentForNote.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          coachingNotes: studentNoteDraft,
          trainingStatus: studentStatusDraft,
        }),
      });
      if (res.ok) {
        setCoachingStudents(prev => prev.map(s => s.id === selectedStudentForNote.id ? { 
          ...s, 
          coachingNotes: studentNoteDraft,
          trainingStatus: studentStatusDraft
        } : s));
        setSelectedStudentForNote(null);
      }
    } catch (err) {
      console.error('Failed to update student notes:', err);
    }
  };

  // Coaching Student: Update milestone
  const handleUpdateMilestone = async (studentId: string, milestoneIndex: number, completedLessons: number) => {
    const student = coachingStudents.find(s => s.id === studentId);
    if (!student) return;

    const updatedMilestones = [...student.trainingProgress];
    if (updatedMilestones[milestoneIndex]) {
      updatedMilestones[milestoneIndex].completedLessons = completedLessons;
      if (completedLessons >= updatedMilestones[milestoneIndex].totalLessons) {
        updatedMilestones[milestoneIndex].status = 'completed';
      }
    }

    try {
      const res = await fetch(`/api/admin/coaching-students/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          trainingProgress: updatedMilestones,
        }),
      });
      if (res.ok) {
        setCoachingStudents(prev => prev.map(s => s.id === studentId ? { ...s, trainingProgress: updatedMilestones } : s));
      }
    } catch (err) {
      console.error('Failed to update student milestone:', err);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.referralCode || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.subscriptionStatus === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter(log => {
    if (!auditSearch) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.actorUsername.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      (log.targetUsername || '').toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-[#0B0F19] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-6 flex flex-col max-h-[94vh]">
        
        {/* Top Header */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#080C14] gap-2 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-1 rtl:pr-0 rtl:pl-1">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl p-[1px] shadow-lg shrink-0 ${
              isSuperAdmin 
                ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 shadow-amber-500/20'
                : isCoach
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/20'
                : isEmployee
                ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-500/20'
                : 'bg-gradient-to-br from-purple-400 to-purple-600 shadow-purple-500/20'
            }`}>
              <div className="w-full h-full bg-[#0E131F] rounded-[11px] flex items-center justify-center">
                {isSuperAdmin ? (
                  <Crown className="w-5 h-5 text-amber-400" />
                ) : isCoach ? (
                  <GraduationCap className="w-5 h-5 text-emerald-400" />
                ) : isEmployee ? (
                  <Briefcase className="w-5 h-5 text-blue-400" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black text-white truncate max-w-[150px] sm:max-w-none">
                  {isSuperAdmin 
                    ? 'SM Trading Master Super Admin'
                    : isCoach 
                    ? 'SM Trading Master Coaching Desk'
                    : isEmployee
                    ? 'SM Trading Operational Desk'
                    : 'SM Trading Management Desk'}
                </h2>
                <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  isSuperAdmin
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : isCoach
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : isEmployee
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                }`}>
                  {isSuperAdmin ? 'Full Authority' : isCoach ? 'Coach Staff' : isEmployee ? 'Operations' : 'Admin'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-xs sm:max-w-xl">
                {isSuperAdmin
                  ? 'Unrestricted control: Users, Roles, Balances, Subscriptions, Audit Logs & RBAC Matrix'
                  : isCoach
                  ? 'Manage student progress, review lessons, and update training milestones'
                  : isEmployee
                  ? 'Operational tasks, market research briefs, and live stream coordination'
                  : 'Manage client accounts, subscriptions, and operational queues'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchAdminData}
              className="min-w-[38px] min-h-[38px] w-9 h-9 sm:w-10 sm:h-10 text-slate-400 hover:text-amber-400 rounded-xl bg-slate-850 border border-slate-700/60 hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-sm active:scale-95"
              title="Refresh Desk Data"
              aria-label="Refresh Desk Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[42px] min-h-[42px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
              aria-label="Close Admin Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* System Stats Row (Visible to Super Admin & Admin) */}
        {stats && (isSuperAdmin || isAdmin) && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 sm:p-4 bg-[#070A11] border-b border-slate-800 text-xs">
            <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase text-[10px] font-bold">Total Accounts</span>
              <span className="text-base sm:text-lg font-black text-white">{stats.totalUsers}</span>
            </div>
            <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-emerald-400 block uppercase text-[10px] font-bold">Active Subs</span>
              <span className="text-base sm:text-lg font-black text-emerald-300">{stats.activeSubscribers}</span>
            </div>
            <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-rose-400 block uppercase text-[10px] font-bold">Expired</span>
              <span className="text-base sm:text-lg font-black text-rose-300">{stats.expiredSubscribers}</span>
            </div>
            <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-amber-400 block uppercase text-[10px] font-bold">Balance Liability</span>
              <span className="text-base sm:text-lg font-black text-amber-300">${stats.totalBalanceLiability?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-blue-400 block uppercase text-[10px] font-bold">Commissions Paid</span>
              <span className="text-base sm:text-lg font-black text-blue-300">${stats.totalCommissionsPaid?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        )}

        {/* Tab Navigation (Responsive Horizontal Scroll) */}
        <div className="flex items-center px-4 sm:px-6 pt-2 border-b border-slate-800 bg-[#080C14] overflow-x-auto no-scrollbar gap-2 sm:gap-4">
          
          {/* User Directory Tab */}
          {(isSuperAdmin || isAdmin || isEmployee) && (
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'users' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{isSuperAdmin ? `Users & Staff (${users.length})` : `User Directory (${users.length})`}</span>
            </button>
          )}

          {/* Audit Logs Tab (Super Admin Only) */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'audit_logs' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Audit Trail ({auditLogs.length})</span>
            </button>
          )}

          {/* RBAC Matrix Tab (Super Admin Only) */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('rbac')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'rbac' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>RBAC Permissions</span>
            </button>
          )}

          {/* Coaching Desk Tab */}
          {(isSuperAdmin || isAdmin || isCoach) && (
            <button
              onClick={() => setActiveTab('coaching')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'coaching' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>Coaching Desk ({coachingStudents.length})</span>
            </button>
          )}

          {/* Operations Queue Tab */}
          {(isSuperAdmin || isAdmin || isEmployee) && (
            <button
              onClick={() => setActiveTab('operations')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'operations' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListTodo className="w-4 h-4 text-blue-400" />
              <span>Operations Queue ({operationsQueue.length})</span>
            </button>
          )}

          {/* Global Transactions Tab (Super Admin & Admin) */}
          {(isSuperAdmin || isAdmin) && (
            <button
              onClick={() => setActiveTab('transactions')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'transactions' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Financial Ledger ({transactions.length})</span>
            </button>
          )}

          {/* Create User Tab */}
          {(isSuperAdmin || isAdmin) && (
            <button
              onClick={() => setActiveTab('create_user')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'create_user' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSuperAdmin ? 'Create Any Account' : 'Create Client'}</span>
            </button>
          )}

          {/* YouTube Live Desk */}
          {(isSuperAdmin || isAdmin || isEmployee) && (
            <button
              onClick={() => setActiveTab('youtube')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'youtube' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-4 h-4 text-rose-400" />
              <span>YouTube Live Stream</span>
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          
          {/* TAB 1: USERS DIRECTORY */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by username, name, email, ref code..."
                    className="w-full bg-[#070A11] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-[#070A11] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                  >
                    <option value="all">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="employee">Employee</option>
                    <option value="coach">Coach</option>
                    <option value="client">Client</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#070A11] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Table / Cards Container */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#070A11]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0E1322] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">User & Identity</th>
                        <th className="px-4 py-3">Role & Authority</th>
                        <th className="px-4 py-3">Subscription</th>
                        {(isSuperAdmin || isAdmin) && <th className="px-4 py-3">Balance & Commission</th>}
                        <th className="px-4 py-3 text-right">Desk Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            No accounts match the current filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isTargetSuperAdmin = u.role === 'super_admin';
                          const isCurrentSelf = u.id === user?.id;
                          const canAdminManageTarget = isSuperAdmin || (isAdmin && u.role === 'client');

                          return (
                            <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                              
                              {/* User identity */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <UserAvatar user={u} size="sm" className="rounded-lg ring-1 ring-slate-700" />
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-white">{u.fullName || u.username}</span>
                                      <span className="text-[11px] text-slate-400 font-mono">@{u.username}</span>
                                      {isTargetSuperAdmin && <Crown className="w-3 h-3 text-amber-400" />}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                      <span>{u.email}</span>
                                      {u.referralCode && (
                                        <>
                                          <span>•</span>
                                          <span className="font-mono text-amber-400/80">Ref: {u.referralCode}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Role Selector or Badge */}
                              <td className="px-4 py-3">
                                {isSuperAdmin ? (
                                  <select
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
                                  >
                                    <option value="super_admin">👑 Super Admin</option>
                                    <option value="admin">🛡️ Admin</option>
                                    <option value="employee">💼 Employee</option>
                                    <option value="coach">🎓 Coach</option>
                                    <option value="client">👤 Pro Client</option>
                                  </select>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    u.role === 'super_admin'
                                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                      : u.role === 'coach'
                                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                                      : u.role === 'employee'
                                      ? 'bg-blue-400/20 text-blue-300 border border-blue-400/40'
                                      : u.role === 'admin'
                                      ? 'bg-purple-400/20 text-purple-300 border border-purple-400/40'
                                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                                  }`}>
                                    {u.role === 'super_admin' ? 'Super Admin' : u.role === 'coach' ? 'Coach' : u.role === 'employee' ? 'Employee' : u.role === 'admin' ? 'Admin' : 'Client'}
                                  </span>
                                )}
                              </td>

                              {/* Subscription */}
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${
                                      u.subscriptionStatus === 'active' ? 'bg-emerald-400' : 'bg-rose-500'
                                    }`} />
                                    <span className={`text-[11px] font-bold uppercase ${
                                      u.subscriptionStatus === 'active' ? 'text-emerald-300' : 'text-rose-400'
                                    }`}>
                                      {u.subscriptionStatus}
                                    </span>
                                  </div>
                                  
                                  {/* Quick extend buttons if authorized */}
                                  {(isSuperAdmin || isAdmin) && u.role === 'client' && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleExtendSubscription(u.id, 1)}
                                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium transition-colors"
                                        title="Extend by 1 month"
                                      >
                                        +1m
                                      </button>
                                      <button
                                        onClick={() => handleExtendSubscription(u.id, 12)}
                                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium transition-colors"
                                        title="Extend by 1 year"
                                      >
                                        +1y
                                      </button>
                                      <button
                                        onClick={() => handleSubscriptionChange(u.id, u.subscriptionStatus === 'active' ? 'expired' : 'active')}
                                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium transition-colors"
                                      >
                                        Toggle
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Balance & Commission */}
                              {(isSuperAdmin || isAdmin) && (
                                <td className="px-4 py-3">
                                  <div className="font-mono">
                                    <div className="text-white font-bold flex items-center gap-1">
                                      <span>${(u.balance || 0).toFixed(2)}</span>
                                      {isSuperAdmin && (
                                        <button
                                          onClick={() => {
                                            setSelectedUserForBalance(u);
                                            setBalanceAmount('');
                                          }}
                                          className="text-amber-400 hover:text-amber-300 p-0.5 rounded hover:bg-slate-800"
                                          title="Super Admin Direct Balance Adjustment"
                                        >
                                          <DollarSign className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                      <span>Rate: {u.commissionRate || 10}%</span>
                                      {isSuperAdmin && (
                                        <button
                                          onClick={() => {
                                            setSelectedUserForRate(u);
                                            setNewCommissionRate(String(u.commissionRate || 10));
                                          }}
                                          className="text-slate-400 hover:text-white p-0.5"
                                          title="Update Commission Rate"
                                        >
                                          <Edit className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              )}

                              {/* Actions */}
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  
                                  {/* Password Reset */}
                                  {canAdminManageTarget && (
                                    <button
                                      onClick={() => {
                                        setSelectedUserForPass(u);
                                        setNewPassword('');
                                      }}
                                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded-lg text-xs transition-colors"
                                      title="Reset Password"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Delete Account (Super Admin only, cannot delete self) */}
                                  {isSuperAdmin && !isCurrentSelf && (
                                    <button
                                      onClick={() => handleDeleteUser(u.id, u.username)}
                                      className="p-1.5 bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 rounded-lg text-xs transition-colors border border-rose-900/30"
                                      title="Delete Account (Irreversible)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>

                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: AUDIT TRAIL (SUPER ADMIN ONLY) */}
          {activeTab === 'audit_logs' && isSuperAdmin && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Security & Governance Audit Trail</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Immutable log of all administrative actions, role modifications, financial changes, and security events.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search audit trail..."
                    className="w-full bg-[#070A11] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#070A11]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0E1322] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Actor & Authority</th>
                        <th className="px-4 py-3">Action Type</th>
                        <th className="px-4 py-3">Target</th>
                        <th className="px-4 py-3">Audit Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {filteredAuditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-sans">
                            No security audit logs found.
                          </td>
                        </tr>
                      ) : (
                        filteredAuditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-900/50">
                            <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="font-bold text-white">@{log.actorUsername}</span>
                              <span className="ml-1.5 px-1.5 py-0.2 bg-slate-800 text-[10px] text-amber-300 rounded font-sans uppercase">
                                {log.actorRole}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 bg-cyan-950/60 border border-cyan-800 text-cyan-300 rounded font-bold">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-300">
                              {log.targetUsername ? `@${log.targetUsername}` : 'System'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-200 font-sans text-xs">
                              {log.details}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RBAC MATRIX (SUPER ADMIN ONLY) */}
          {activeTab === 'rbac' && isSuperAdmin && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>Role-Based Access Control (RBAC) Permission Matrix</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Super Admin can configure role permissions. Changes apply across server authorization guards.
                </p>
              </div>

              {rbacSettings ? (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#070A11]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#0E1322] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Permission Descriptor</th>
                          <th className="px-4 py-3 text-center text-amber-300">👑 Super Admin</th>
                          <th className="px-4 py-3 text-center text-purple-300">🛡️ Admin</th>
                          <th className="px-4 py-3 text-center text-blue-300">💼 Employee</th>
                          <th className="px-4 py-3 text-center text-emerald-300">🎓 Coach</th>
                          <th className="px-4 py-3 text-center text-slate-400">👤 Client</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {[
                          { key: 'canManageSuperAdmins', label: 'Manage Super Admin Accounts' },
                          { key: 'canManageAdmins', label: 'Manage Admin Accounts' },
                          { key: 'canManageEmployees', label: 'Manage Employee Accounts' },
                          { key: 'canManageCoaches', label: 'Manage Coach Accounts' },
                          { key: 'canManageClients', label: 'Manage Client Accounts' },
                          { key: 'canCreateUsers', label: 'Create New User Accounts' },
                          { key: 'canDeleteUsers', label: 'Permanently Delete Accounts' },
                          { key: 'canResetPasswords', label: 'Reset User Passwords' },
                          { key: 'canAdjustBalances', label: 'Direct Wallet Balance Adjustment' },
                          { key: 'canSetCommissionRates', label: 'Modify Affiliate Commission Rates' },
                          { key: 'canManageSubscriptions', label: 'Manage & Extend Subscriptions' },
                          { key: 'canViewTransactions', label: 'Access Global Financial Ledger' },
                          { key: 'canManageRBAC', label: 'Modify RBAC Security Matrix' },
                          { key: 'canViewAuditLogs', label: 'View Audit Logs & Event Trail' },
                          { key: 'canAccessOperations', label: 'Access Operations & Tasks Queue' },
                          { key: 'canManageLiveStream', label: 'Configure YouTube Stream Settings' },
                          { key: 'canAccessCoachingDesk', label: 'Access Student Coaching Desk' },
                          { key: 'canManageLessons', label: 'Update Student Lesson Milestones' },
                        ].map((perm) => (
                          <tr key={perm.key} className="hover:bg-slate-900/50">
                            <td className="px-4 py-2.5 font-semibold text-white">
                              {perm.label}
                            </td>
                            {(['super_admin', 'admin', 'employee', 'coach', 'client'] as UserRole[]).map((role) => {
                              const isEnabled = (rbacSettings[role] as any)?.[perm.key] || false;
                              const isSuperAdminCol = role === 'super_admin';

                              return (
                                <td key={role} className="px-4 py-2.5 text-center">
                                  {isSuperAdminCol ? (
                                    <span className="inline-flex p-1 rounded-md bg-amber-400/20 text-amber-400">
                                      <Check className="w-3.5 h-3.5" />
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleToggleRbacPermission(role, perm.key as keyof RolePermissions, isEnabled)}
                                      className={`p-1 rounded-md cursor-pointer transition-colors ${
                                        isEnabled
                                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                          : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                      }`}
                                      title={`Toggle ${perm.label} for ${role}`}
                                    >
                                      {isEnabled ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">Loading RBAC matrix...</div>
              )}
            </div>
          )}

          {/* TAB 4: COACHING DESK */}
          {activeTab === 'coaching' && (isSuperAdmin || isAdmin || isCoach) && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                    <span>SM Trading Student Mentorship & Coaching Desk</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Track institutional trading students, SMC curriculum milestones, order flow lessons, and review notes.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coachingStudents.length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-slate-500 bg-[#070A11] border border-slate-800 rounded-xl">
                    No students currently enrolled in the coaching roster.
                  </div>
                ) : (
                  coachingStudents.map((student) => (
                    <div key={student.id} className="p-4 bg-[#070A11] border border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar user={{ username: student.username, fullName: student.fullName, avatarUrl: student.avatarUrl } as any} size="sm" />
                          <div>
                            <span className="font-bold text-white text-xs block">{student.fullName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">@{student.username}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          student.trainingStatus === 'graduated'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : student.trainingStatus === 'active_training'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {student.trainingStatus.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Milestone Progress */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3 text-amber-400" />
                          <span>Curriculum Milestones</span>
                        </span>
                        {student.trainingProgress?.map((m, idx) => {
                          const pct = Math.round((m.completedLessons / m.totalLessons) * 100);
                          return (
                            <div key={m.id} className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="font-semibold text-slate-200">{m.courseName}</span>
                                <span className="font-mono text-emerald-400 font-bold">{m.completedLessons}/{m.totalLessons} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1.5">
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-400">Lessons Completed</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleUpdateMilestone(student.id, idx, Math.max(0, m.completedLessons - 1))}
                                    className="px-1.5 py-0.2 bg-slate-800 hover:bg-slate-700 text-white rounded cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={() => handleUpdateMilestone(student.id, idx, Math.min(m.totalLessons, m.completedLessons + 1))}
                                    className="px-1.5 py-0.2 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                                  >
                                    +1 Lesson
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Coach Notes & Action */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {student.coachingNotes ? `Note: ${student.coachingNotes}` : 'No review notes yet.'}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedStudentForNote(student);
                            setStudentNoteDraft(student.coachingNotes || '');
                            setStudentStatusDraft(student.trainingStatus);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Edit Notes
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: OPERATIONS QUEUE */}
          {activeTab === 'operations' && (isSuperAdmin || isAdmin || isEmployee) && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-blue-400" />
                    <span>Institutional Trading Operations & Live Stream Queue</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time operational tasks: Market briefs, stream preparations, content reviews, and support tickets.
                  </p>
                </div>
                <button
                  onClick={() => setShowNewOpModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Operational Task</span>
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#070A11]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0E1322] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Task & Scope</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {operationsQueue.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            No operational tasks in queue.
                          </td>
                        </tr>
                      ) : (
                        operationsQueue.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-900/50">
                            <td className="px-4 py-3">
                              <span className="font-bold text-white block">{item.title}</span>
                              {item.notes && <span className="text-[11px] text-slate-400">{item.notes}</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] uppercase font-semibold">
                                {item.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                item.priority === 'high'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : item.priority === 'medium'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {item.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                item.status === 'resolved'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : item.status === 'in_progress'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  : 'bg-slate-800 text-slate-300'
                              }`}>
                                {item.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <select
                                value={item.status}
                                onChange={(e) => handleUpdateOpStatus(item.id, e.target.value as any)}
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: GLOBAL FINANCIAL LEDGER (SUPER ADMIN & ADMIN) */}
          {activeTab === 'transactions' && (isSuperAdmin || isAdmin) && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <span>Global Financial & Commission Ledger</span>
                </h3>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#070A11]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0E1322] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            No ledger transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-900/50 font-mono text-[11px]">
                            <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                              {new Date(t.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2.5 text-white font-sans font-bold">
                              @{t.username || t.userId}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] uppercase font-sans font-bold">
                                {t.type}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-bold">
                              <span className={t.type === 'commission' || t.type === 'manual_adjustment' ? 'text-emerald-400' : 'text-rose-400'}>
                                {t.type === 'payout_request' ? '-' : '+'}${t.amount.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-300 font-sans">
                              {t.description}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase ${
                                t.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : t.status === 'pending'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CREATE USER */}
          {activeTab === 'create_user' && (isSuperAdmin || isAdmin) && (
            <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-[#070A11] border border-slate-800 rounded-2xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <span>{isSuperAdmin ? 'Provision Any Account (Super Admin, Admin, Coach, Employee, Client)' : 'Provision New Client Account'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isSuperAdmin
                    ? 'Super Admin has authority to generate any tier role directly into the server database.'
                    : 'Admins can provision new client accounts.'}
                </p>
              </div>

              <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. smc_trader"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="e.g. Alex Trader"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="trader@smtrading.pro"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Initial Password *</label>
                    <input
                      type="password"
                      required
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {isSuperAdmin && (
                    <div>
                      <label className="block text-xs font-bold text-amber-300 mb-1">Account Role</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                      >
                        <option value="client">👤 Pro Client</option>
                        <option value="coach">🎓 Certified Coach</option>
                        <option value="employee">💼 Operations Employee</option>
                        <option value="admin">🛡️ System Admin</option>
                        <option value="super_admin">👑 Master Super Admin</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Subscription Status</label>
                    <select
                      value={newSubStatus}
                      onChange={(e) => setNewSubStatus(e.target.value as SubscriptionStatus)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {isSuperAdmin && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Initial Balance ($)</label>
                        <input
                          type="number"
                          value={newInitialBalance}
                          onChange={(e) => setNewInitialBalance(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Commission Rate (%)</label>
                        <input
                          type="number"
                          value={newRate}
                          onChange={(e) => setNewRate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </>
                  )}
                </div>

                {createStatus && (
                  <div className={`p-3 rounded-lg text-xs font-bold ${
                    createStatus.startsWith('Error') || createStatus.startsWith('Failed')
                      ? 'bg-rose-950/50 text-rose-300 border border-rose-800'
                      : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800'
                  }`}>
                    {createStatus}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Create Account
                </button>
              </form>
            </div>
          )}

          {/* TAB 8: YOUTUBE LIVE DESK */}
          {activeTab === 'youtube' && (isSuperAdmin || isAdmin || isEmployee) && (
            <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-[#070A11] border border-slate-800 rounded-2xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-500" />
                  <span>YouTube Live Stream Management</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Configure YouTube channel handle or ID to auto-detect and embed live trading sessions into client terminals.
                </p>
              </div>

              <form onSubmit={handleSaveYouTubeSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">YouTube Channel Handle</label>
                  <input
                    type="text"
                    value={ytChannelHandle}
                    onChange={(e) => setYtChannelHandle(e.target.value)}
                    placeholder="@SMTrading"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">YouTube Channel ID (Optional)</label>
                  <input
                    type="text"
                    value={ytChannelId}
                    onChange={(e) => setYtChannelId(e.target.value)}
                    placeholder="e.g. UCxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className={`w-2 h-2 rounded-full ${ytApiKeyConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span>API Key Status: {ytApiKeyConfigured ? 'Configured on Server' : 'Public HTML Mode Fallback'}</span>
                </div>

                {ytSaveStatus && (
                  <div className={`p-3 rounded-lg text-xs font-bold ${
                    ytSaveStatus.startsWith('Error') || ytSaveStatus.startsWith('Failed')
                      ? 'bg-rose-950/50 text-rose-300 border border-rose-800'
                      : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800'
                  }`}>
                    {ytSaveStatus}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Save YouTube Settings
                  </button>

                  <button
                    type="button"
                    onClick={testYouTubeStreamScan}
                    disabled={ytTesting}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    {ytTesting ? 'Testing Scanner...' : 'Test Scanner Now'}
                  </button>
                </div>
              </form>

              {ytLiveStatus && (
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-xs space-y-2">
                  <span className="font-bold text-white block">Scanner Test Results:</span>
                  <div className="text-slate-300">
                    Live Status: <span className={ytLiveStatus.isLive ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                      {ytLiveStatus.isLive ? '🔴 LIVE NOW' : 'Offline'}
                    </span>
                  </div>
                  {ytLiveStatus.stream?.title && <div>Title: <span className="text-white">{ytLiveStatus.stream.title}</span></div>}
                  {ytLiveStatus.stream?.videoId && <div className="font-mono text-slate-400">Video ID: {ytLiveStatus.stream.videoId}</div>}
                </div>
              )}
            </div>
          )}

        </div>

        {/* SUBMODAL: Balance Adjustment (Super Admin Only) */}
        {selectedUserForBalance && isSuperAdmin && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0C111E] border border-amber-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center gap-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 min-w-0 flex-1 truncate">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">Super Admin Balance Adjustment</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedUserForBalance(null)}
                  className="min-w-[36px] min-h-[36px] w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-300">
                User: <span className="text-white font-bold">@{selectedUserForBalance.username}</span> ({selectedUserForBalance.email})
                <br />
                Current Balance: <span className="text-emerald-400 font-mono font-bold">${selectedUserForBalance.balance.toFixed(2)}</span>
              </div>

              <form onSubmit={handleBalanceSubmit} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBalanceAction('add')}
                    className={`py-1.5 rounded-lg text-xs font-bold ${
                      balanceAction === 'add' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    + Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceAction('deduct')}
                    className={`py-1.5 rounded-lg text-xs font-bold ${
                      balanceAction === 'deduct' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    - Debit
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceAction('set')}
                    className={`py-1.5 rounded-lg text-xs font-bold ${
                      balanceAction === 'set' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    = Set Exact
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Reason (Audit Trail Record)</label>
                  <input
                    type="text"
                    required
                    value={balanceReason}
                    onChange={(e) => setBalanceReason(e.target.value)}
                    placeholder="e.g. Desk bonus, manual correction"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {balanceStatus && (
                  <div className={`p-2.5 rounded-lg text-xs font-bold ${
                    balanceStatus.startsWith('Error') ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'
                  }`}>
                    {balanceStatus}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Confirm Balance Adjustment
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SUBMODAL: Commission Rate (Super Admin Only) */}
        {selectedUserForRate && isSuperAdmin && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0C111E] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center gap-2">
                <h4 className="text-sm font-bold text-white min-w-0 flex-1 truncate">Update Commission Rate</h4>
                <button
                  type="button"
                  onClick={() => setSelectedUserForRate(null)}
                  className="min-w-[36px] min-h-[36px] w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRateSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">New Commission Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {rateStatus && (
                  <div className={`p-2.5 rounded-lg text-xs font-bold ${
                    rateStatus.startsWith('Error') ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'
                  }`}>
                    {rateStatus}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Save Commission Rate
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SUBMODAL: Password Reset */}
        {selectedUserForPass && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0C111E] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center gap-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 min-w-0 flex-1 truncate">
                  <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">Reset Password for @{selectedUserForPass.username}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedUserForPass(null)}
                  className="min-w-[36px] min-h-[36px] w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">New Password (Min. 6 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {passStatus && (
                  <div className={`p-2.5 rounded-lg text-xs font-bold ${
                    passStatus.startsWith('Error') ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'
                  }`}>
                    {passStatus}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Confirm Password Reset
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SUBMODAL: Add Operational Task */}
        {showNewOpModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0C111E] border border-blue-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center gap-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 min-w-0 flex-1 truncate">
                  <Plus className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="truncate">Add Operational Task</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowNewOpModal(false)}
                  className="min-w-[36px] min-h-[36px] w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddOpItem} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={newOpTitle}
                    onChange={(e) => setNewOpTitle(e.target.value)}
                    placeholder="e.g. FOMC Pre-Market Briefing Prep"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Type</label>
                    <select
                      value={newOpType}
                      onChange={(e) => setNewOpType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="market_brief">Market Brief</option>
                      <option value="live_stream_prep">Live Stream Prep</option>
                      <option value="content_review">Content Review</option>
                      <option value="support_ticket">Support Ticket</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Priority</label>
                    <select
                      value={newOpPriority}
                      onChange={(e) => setNewOpPriority(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Notes & Instructions</label>
                  <textarea
                    rows={3}
                    value={newOpNotes}
                    onChange={(e) => setNewOpNotes(e.target.value)}
                    placeholder="Additional details for operational staff..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Create Task
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SUBMODAL: Edit Student Coaching Notes */}
        {selectedStudentForNote && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0C111E] border border-emerald-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center gap-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 min-w-0 flex-1 truncate">
                  <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Mentorship Notes: {selectedStudentForNote.fullName}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForNote(null)}
                  className="min-w-[36px] min-h-[36px] w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveStudentNotes} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Student Status</label>
                  <select
                    value={studentStatusDraft}
                    onChange={(e) => setStudentStatusDraft(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="active_training">Active Training</option>
                    <option value="mentorship_pending">Mentorship Pending</option>
                    <option value="graduated">Graduated</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Coach Notes & Lesson Feedback</label>
                  <textarea
                    rows={4}
                    value={studentNoteDraft}
                    onChange={(e) => setStudentNoteDraft(e.target.value)}
                    placeholder="Enter observations on student's trade setups, risk management, and order flow execution..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Save Coaching Feedback
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
