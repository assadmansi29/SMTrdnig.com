import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile, Transaction, UserRole, SubscriptionStatus, YouTubeLiveStatus } from '../types';
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
  KeyRound
} from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'create_user' | 'youtube'>('users');
  
  // Data states
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // YouTube Stream Config state
  const [ytChannelHandle, setYtChannelHandle] = useState('');
  const [ytChannelId, setYtChannelId] = useState('');
  const [ytApiKeyConfigured, setYtApiKeyConfigured] = useState(false);
  const [ytLiveStatus, setYtLiveStatus] = useState<YouTubeLiveStatus | null>(null);
  const [ytTesting, setYtTesting] = useState(false);
  const [ytSaveStatus, setYtSaveStatus] = useState<string | null>(null);

  // Balance Adjustment Submodal
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<UserProfile | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [balanceReason, setBalanceReason] = useState('Desk performance reward');
  const [balanceStatus, setBalanceStatus] = useState<string | null>(null);

  // Commission Rate Submodal
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

  const fetchAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [usersRes, txRes, statsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/transactions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
      }
      if (txRes.ok) {
        const tData = await txRes.json();
        setTransactions(tData.transactions || []);
      }
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData.stats);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
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
    if (isOpen && user?.role === 'admin') {
      fetchAdminData();
      fetchYouTubeSettings();
      testYouTubeStreamScan();
    }
  }, [isOpen, token, user]);

  if (!isOpen || user?.role !== 'admin') return null;

  const handleRoleChange = async (userId: string, role: UserRole) => {
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
      }
    } catch (err) {
      console.error('Failed to change role:', err);
    }
  };

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
      }
    } catch (err) {
      console.error('Failed to change subscription:', err);
    }
  };

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

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForBalance || !balanceAmount) return;

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

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForRate || !newCommissionRate) return;

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
      }
    } catch (err: any) {
      setRateStatus(`Error: ${err.message}`);
    }
  };

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
        setTimeout(() => {
          setSelectedUserForPass(null);
          setPassStatus(null);
          setNewPassword('');
        }, 1500);
      }
    } catch (err: any) {
      setPassStatus(`Error: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user @${username}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

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
          role: newRole,
          subscriptionStatus: newSubStatus,
          commissionRate: Number(newRate),
          balance: Number(newInitialBalance),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCreateStatus('User account successfully created!');
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

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.referralCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.subscriptionStatus === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-[#0B0F19] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#080C14]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-[1px] shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#0E131F] rounded-[11px] flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">SM Trading Master Admin Portal</h2>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Full Authority
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Server-side protected • Role assignments, subscriptions, balances, and referral commissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminData}
              className="p-2 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* System Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-4 bg-[#070A11] border-b border-slate-800 text-xs">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase text-[10px] font-bold">Total Accounts</span>
              <span className="text-lg font-black text-white">{stats.totalUsers}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-emerald-400 block uppercase text-[10px] font-bold">Active Subscribers</span>
              <span className="text-lg font-black text-emerald-300">{stats.activeSubscribers}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-rose-400 block uppercase text-[10px] font-bold">Expired Subscriptions</span>
              <span className="text-lg font-black text-rose-300">{stats.expiredSubscribers}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-amber-400 block uppercase text-[10px] font-bold">Balance Liability</span>
              <span className="text-lg font-black text-amber-300">${stats.totalBalanceLiability.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-blue-400 block uppercase text-[10px] font-bold">Commissions Paid</span>
              <span className="text-lg font-black text-blue-300">${stats.totalCommissionsPaid.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-slate-800 bg-[#080C14]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'users' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Directory & Permissions ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'transactions' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Global Audit & Commission Ledger ({transactions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('create_user')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'create_user' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>

            <button
              onClick={() => setActiveTab('youtube')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'youtube' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-4 h-4 text-rose-400" />
              <span>Live Desk (YouTube API)</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1">
          
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
                    <option value="client">Client</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#070A11] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                  >
                    <option value="all">All Subscriptions</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  <button
                    onClick={() => setActiveTab('create_user')}
                    className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add User</span>
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-[#070A11] border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">User & Contact</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Subscription</th>
                      <th className="px-4 py-3">Balance ($)</th>
                      <th className="px-4 py-3">Referrals & %</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.map((u) => {
                      const isExpired = u.subscriptionStatus === 'expired';
                      const expDate = new Date(u.subscriptionExpiresAt).toLocaleDateString();

                      return (
                        <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                          {/* User Info */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={u.avatarUrl || (u.role === 'admin' ? '/abu_asad_almansi.jpg' : `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`)}
                                alt={u.username}
                                className="w-8 h-8 rounded-lg bg-slate-800 object-cover shrink-0"
                              />
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>@{u.username}</span>
                                  {u.id === user.id && (
                                    <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1 rounded">You</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">{u.fullName || u.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role Selector */}
                          <td className="px-4 py-3">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                              className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs font-bold text-amber-300 uppercase focus:outline-none focus:border-amber-400 cursor-pointer"
                            >
                              <option value="client">Client</option>
                              <option value="employee">Employee</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>

                          {/* Subscription Control */}
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <select
                                value={u.subscriptionStatus}
                                onChange={(e) => handleSubscriptionChange(u.id, e.target.value as SubscriptionStatus)}
                                className={`border rounded-md px-2 py-0.5 text-[11px] font-bold uppercase cursor-pointer ${
                                  u.subscriptionStatus === 'active'
                                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                                    : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                                }`}
                              >
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                                <option value="inactive">Inactive</option>
                              </select>
                              <div className="text-[10px] text-slate-500">Exp: {expDate}</div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleExtendSubscription(u.id, 1)}
                                  className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1 py-0.2 rounded cursor-pointer"
                                  title="Add 1 Month"
                                >
                                  +1M
                                </button>
                                <button
                                  onClick={() => handleExtendSubscription(u.id, 3)}
                                  className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1 py-0.2 rounded cursor-pointer"
                                  title="Add 3 Months"
                                >
                                  +3M
                                </button>
                                <button
                                  onClick={() => handleExtendSubscription(u.id, 12)}
                                  className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1 py-0.2 rounded cursor-pointer"
                                  title="Add 1 Year"
                                >
                                  +1Y
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Balance ($) */}
                          <td className="px-4 py-3">
                            <div className="font-mono font-black text-amber-300 text-sm">
                              ${u.balance.toFixed(2)}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedUserForBalance(u);
                                setBalanceAmount('');
                                setBalanceStatus(null);
                              }}
                              className="mt-1 text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-0.5 underline cursor-pointer"
                            >
                              <Edit className="w-2.5 h-2.5" />
                              <span>Adjust</span>
                            </button>
                          </td>

                          {/* Referral & Rate */}
                          <td className="px-4 py-3">
                            <div className="text-xs">
                              <span className="font-mono text-slate-400">{u.referralCode}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="font-bold text-emerald-400">{u.commissionRate}% Rate</span>
                                <button
                                  onClick={() => {
                                    setSelectedUserForRate(u);
                                    setNewCommissionRate(String(u.commissionRate));
                                  }}
                                  className="text-slate-500 hover:text-white"
                                >
                                  <Edit className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              <div className="text-[10px] text-slate-500">{u.referralsCount || 0} referred</div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedUserForPass(u);
                                  setNewPassword('');
                                  setPassStatus(null);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors cursor-pointer"
                                title="Reset Password"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>

                              {u.id !== user.id && (
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  className="p-1.5 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/60 text-rose-400 rounded-md transition-colors cursor-pointer"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: GLOBAL TRANSACTIONS & COMMISSION AUDIT */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="bg-[#070A11] border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Date & ID</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Amount ($)</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-slate-200 font-semibold">{new Date(tx.createdAt).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{tx.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-white">@{tx.username}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="uppercase text-[10px] font-bold text-slate-400">{tx.type}</span>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-slate-300">
                          {tx.description}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-sm">
                          <span className={tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {tx.amount >= 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            tx.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                            tx.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CREATE USER ACCOUNT */}
          {activeTab === 'create_user' && (
            <div className="max-w-xl mx-auto bg-[#070A11] border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Onboard New System Account</span>
              </h3>

              {createStatus && (
                <div className="p-3 bg-slate-900 text-amber-300 text-xs rounded-lg border border-amber-400/30">
                  {createStatus}
                </div>
              )}

              <form onSubmit={handleCreateUserSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Full Name</label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Faisal Qasim"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Username *</label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. trader_vip"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Email *</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="trader@domain.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Initial Password *</label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 uppercase font-bold"
                    >
                      <option value="client">Client</option>
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Subscription Status</label>
                    <select
                      value={newSubStatus}
                      onChange={(e) => setNewSubStatus(e.target.value as SubscriptionStatus)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 uppercase font-bold"
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Initial Balance ($ USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newInitialBalance}
                      onChange={(e) => setNewInitialBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Referral Commission Rate (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      placeholder="10"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg transition-all cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    Create User Account
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: YOUTUBE LIVE STREAM DESK INTEGRATION */}
          {activeTab === 'youtube' && (
            <div className="space-y-6 max-w-4xl">
              {/* Header Box */}
              <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 rounded-2xl p-5 space-y-2 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>YouTube Live Stream Automated Detector</span>
                      <span className="text-[10px] bg-rose-600/30 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-mono font-bold">
                        SECURE SERVER PROXY
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Dynamically detects and streams your active YouTube broadcast directly inside the LIVE TRADE room.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status and Health Diagnostics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* 1. API Key Status */}
                <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 uppercase font-bold text-[10px]">YouTube API Key</span>
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${ytApiKeyConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                    <span className={`font-bold ${ytApiKeyConfigured ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {ytApiKeyConfigured ? 'Connected (Server-Side)' : 'Set in .env or Settings'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Key is securely stored on the backend; never exposed to clients.
                  </p>
                </div>

                {/* 2. Detected Channel Handle / ID */}
                <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 uppercase font-bold text-[10px]">Target Channel</span>
                    <Tv className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="font-bold text-white font-mono truncate">
                    {ytChannelHandle || ytChannelId || '@SMTradingOfficial'}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Live events on this channel are automatically scanned.
                  </p>
                </div>

                {/* 3. Live Detection Status */}
                <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 uppercase font-bold text-[10px]">Current Stream Status</span>
                    <button
                      onClick={testYouTubeStreamScan}
                      disabled={ytTesting}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <RefreshCw className={`w-3 h-3 ${ytTesting ? 'animate-spin' : ''}`} />
                      <span>Test Scan</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${ytLiveStatus?.isLive ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`}></span>
                    <span className={`font-black ${ytLiveStatus?.isLive ? 'text-rose-400' : 'text-slate-300'}`}>
                      {ytLiveStatus?.isLive ? 'STREAMING NOW 🔴' : 'No Live Stream Currently'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {ytLiveStatus?.checkedAt ? `Last scanned: ${new Date(ytLiveStatus.checkedAt).toLocaleTimeString()}` : 'Auto-scanning every 45s'}
                  </p>
                </div>
              </div>

              {/* Channel Configuration Form */}
              <form onSubmit={handleSaveYouTubeSettings} className="bg-[#090D17] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <Settings className="w-4 h-4 text-amber-400" />
                    <span>Channel Identification Settings</span>
                  </h4>
                  {ytSaveStatus && (
                    <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      {ytSaveStatus}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">
                      YouTube Channel Handle (Recommended)
                    </label>
                    <input
                      type="text"
                      value={ytChannelHandle}
                      onChange={(e) => setYtChannelHandle(e.target.value)}
                      placeholder="@YourChannelHandle (e.g. @SMTrading)"
                      className="w-full bg-[#070A11] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      The backend automatically resolves this to the canonical Channel ID via API.
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">
                      Direct Channel ID (Optional fallback)
                    </label>
                    <input
                      type="text"
                      value={ytChannelId}
                      onChange={(e) => setYtChannelId(e.target.value)}
                      placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-[#070A11] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      24-character YouTube Channel ID starting with &quot;UC&quot;.
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    Changes take effect immediately and flush the live stream cache.
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg transition-all cursor-pointer shadow-md shadow-amber-500/20 text-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Channel Configuration</span>
                  </button>
                </div>
              </form>

              {/* Live Preview / Diagnostic Result */}
              {ytLiveStatus && (
                <div className="bg-[#090D17] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="font-bold text-slate-300">Live API Diagnostic Payload:</span>
                    <span className="font-mono text-slate-500 text-[10px]">{ytLiveStatus.checkedAt}</span>
                  </div>

                  {ytLiveStatus.isLive && ytLiveStatus.stream ? (
                    <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-300 text-sm">{ytLiveStatus.stream.title}</span>
                        <a 
                          href={ytLiveStatus.stream.watchUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-amber-400 hover:underline text-[11px]"
                        >
                          <span>Open Live Video</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Channel: <span className="text-white font-medium">{ytLiveStatus.stream.channelTitle}</span> • Viewers: <span className="text-emerald-400 font-bold">{ytLiveStatus.stream.concurrentViewers || 'Live'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-200 block">Status: No Live Stream Currently</span>
                        <span className="text-[11px] text-slate-400">{ytLiveStatus.message}</span>
                      </div>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded font-mono">
                        SCAN READY
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Submodal: Balance Adjuster */}
        {selectedUserForBalance && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#0D121F] border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">
                  Adjust Balance for @{selectedUserForBalance.username}
                </h3>
                <button onClick={() => setSelectedUserForBalance(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between p-2.5 bg-slate-950 rounded-lg">
                <span>Current Balance:</span>
                <span className="font-mono font-black text-amber-300 text-sm">
                  ${selectedUserForBalance.balance.toFixed(2)}
                </span>
              </div>

              {balanceStatus && (
                <div className="p-2.5 bg-slate-800 text-amber-300 text-xs rounded-lg border border-amber-400/30">
                  {balanceStatus}
                </div>
              )}

              <form onSubmit={handleBalanceSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Action</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBalanceAction('add')}
                      className={`py-1.5 rounded font-bold cursor-pointer ${
                        balanceAction === 'add' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalanceAction('deduct')}
                      className={`py-1.5 rounded font-bold cursor-pointer ${
                        balanceAction === 'deduct' ? 'bg-rose-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      - Deduct
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalanceAction('set')}
                      className={`py-1.5 rounded font-bold cursor-pointer ${
                        balanceAction === 'set' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      = Set Total
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Amount ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="e.g. 500.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Audit Reason / Note</label>
                  <input
                    type="text"
                    required
                    value={balanceReason}
                    onChange={(e) => setBalanceReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForBalance(null)}
                    className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg transition-all"
                  >
                    Confirm Balance Adjustment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Submodal: Commission Rate */}
        {selectedUserForRate && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-sm bg-[#0D121F] border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">
                  Set Referral Rate for @{selectedUserForRate.username}
                </h3>
                <button onClick={() => setSelectedUserForRate(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {rateStatus && (
                <div className="p-2.5 bg-slate-800 text-amber-300 text-xs rounded-lg border border-amber-400/30">
                  {rateStatus}
                </div>
              )}

              <form onSubmit={handleRateSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Commission Percentage (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForRate(null)}
                    className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg transition-all"
                  >
                    Save Percentage
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Submodal: Password Reset */}
        {selectedUserForPass && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-sm bg-[#0D121F] border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">
                  Reset Password for @{selectedUserForPass.username}
                </h3>
                <button onClick={() => setSelectedUserForPass(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {passStatus && (
                <div className="p-2.5 bg-slate-800 text-amber-300 text-xs rounded-lg border border-amber-400/30">
                  {passStatus}
                </div>
              )}

              <form onSubmit={handlePasswordReset} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">New Password (min 6 chars)</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForPass(null)}
                    className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg transition-all"
                  >
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
