import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ReferralData, Transaction } from '../types';
import { 
  X, 
  User, 
  ShieldCheck, 
  Crown, 
  Wallet, 
  Share2, 
  Copy, 
  Check, 
  Clock, 
  Calendar, 
  ArrowUpRight, 
  DollarSign, 
  Users, 
  TrendingUp, 
  CreditCard, 
  LogOut, 
  Zap, 
  ChevronRight, 
  AlertCircle,
  Sparkles,
  Phone,
  Mail,
  Edit3,
  Save,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Camera,
  Upload,
  ImageIcon
} from 'lucide-react';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { UserAvatar } from './UserAvatar';
import { AvatarUploadModal } from './AvatarUploadModal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdmin?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenAdmin,
}) => {
  const { user, token, logout, updateProfile, activateSubscription, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'referrals' | 'transactions' | 'subscription'>('profile');

  // Referral data state
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loadingRef, setLoadingRef] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Avatar upload modal state
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.fullName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatarUrl || '');
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Change Password state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error' | 'loading'; msg: string } | null>(null);

  // Payout state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('USDT (TRC20)');
  const [payoutAddress, setPayoutAddress] = useState('');
  const [payoutStatus, setPayoutStatus] = useState<string | null>(null);

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Renewal state
  const [renewing, setRenewing] = useState(false);
  const [renewMsg, setRenewMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEditName(user.fullName || '');
      setEditEmail(user.email || '');
      setEditPhone(user.phone || '');
      setEditAvatar(user.avatarUrl || '');
      setEditUsername(user.username || '');
    }
  }, [user]);

  // Fetch referrals when modal opens or tab changes
  useEffect(() => {
    if (!isOpen || !token) return;

    const fetchReferrals = async () => {
      setLoadingRef(true);
      try {
        const res = await fetch('/api/user/referrals', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReferralData(data);
        }
      } catch (err) {
        console.error('Error fetching referrals:', err);
      } finally {
        setLoadingRef(false);
      }
    };

    const fetchTransactions = async () => {
      setLoadingTx(true);
      try {
        const res = await fetch('/api/user/transactions', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions || []);
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setLoadingTx(false);
      }
    };

    fetchReferrals();
    fetchTransactions();
  }, [isOpen, token, activeTab]);

  if (!isOpen || !user) return null;

  const referralLink = `${window.location.origin}/?ref=${user.referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveProfile = async () => {
    setSaveStatus('Saving changes...');
    const payload: { fullName?: string; email?: string; phone?: string; avatarUrl?: string; username?: string } = {
      fullName: editName,
      email: editEmail,
      phone: editPhone,
      avatarUrl: editAvatar,
    };
    if (user.role === 'admin') {
      payload.username = editUsername;
    }
    const res = await updateProfile(payload);
    if (res.success) {
      setSaveStatus('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSaveStatus(null), 2500);
    } else {
      setSaveStatus(`Failed: ${res.error}`);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutAmount || Number(payoutAmount) <= 0) {
      setPayoutStatus('Please enter a valid payout amount.');
      return;
    }

    setPayoutStatus('Processing request...');
    try {
      const res = await fetch('/api/user/request-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(payoutAmount),
          payoutMethod,
          payoutAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPayoutStatus(`Error: ${data.error}`);
      } else {
        setPayoutStatus('Payout request submitted successfully!');
        setPayoutAmount('');
        setPayoutAddress('');
        setTimeout(() => {
          setShowPayoutModal(false);
          setPayoutStatus(null);
        }, 2000);
      }
    } catch (err: any) {
      setPayoutStatus(`Failed: ${err.message}`);
    }
  };

  const handleRenewSubscription = async (months: number, planName: string) => {
    setRenewing(true);
    setRenewMsg(null);
    const res = await activateSubscription(months, planName);
    setRenewing(false);
    if (res.success) {
      setRenewMsg(res.message || 'Subscription successfully updated!');
      setTimeout(() => setRenewMsg(null), 3000);
    } else {
      setRenewMsg(`Error: ${res.error}`);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordStatus({ type: 'error', msg: 'Please enter your current password.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus({ type: 'error', msg: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', msg: 'New passwords do not match. Please verify.' });
      return;
    }

    setPasswordStatus({ type: 'loading', msg: 'Verifying and encrypting new password...' });

    const res = await changePassword(currentPassword, newPassword);
    if (res.success) {
      setPasswordStatus({ type: 'success', msg: res.message || 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordStatus(null);
        setShowPasswordChange(false);
      }, 3000);
    } else {
      setPasswordStatus({ type: 'error', msg: res.error || 'Failed to update password.' });
    }
  };

  const isRoleAdmin = user.role === 'admin';
  const isRoleEmployee = user.role === 'employee';
  const expiresDate = new Date(user.subscriptionExpiresAt);
  const formattedExpiry = expiresDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const isExpired = user.subscriptionStatus === 'expired' || (user.role === 'client' && expiresDate < new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0C111E] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#080C14]">
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => setShowAvatarModal(true)} title="Click to change profile picture">
              <UserAvatar
                user={user}
                size="lg"
                isEditable={true}
                onEditClick={() => setShowAvatarModal(true)}
                className="w-11 h-11 ring-2 ring-amber-400/40 group-hover:ring-amber-400 transition-all rounded-xl shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow-sm border border-slate-900">
                <Camera className="w-2.5 h-2.5" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-white">
                  {user.fullName || user.username}
                </span>
                <span className="text-xs text-slate-400 font-mono">(@{user.username})</span>
                
                {/* Role Badge */}
                {isRoleAdmin ? (
                  <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-400/40 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>Master Admin</span>
                  </span>
                ) : isRoleEmployee ? (
                  <span className="bg-blue-400/20 text-blue-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-400/40 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-400" />
                    <span>Desk Employee</span>
                  </span>
                ) : (
                  <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-400/40 flex items-center gap-1">
                    <BlueVerifiedBadge size="sm" />
                    <span>Pro Client</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{user.email}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                  <span className={isExpired ? 'text-rose-400 font-bold' : 'text-emerald-300 font-medium'}>
                    {isRoleAdmin || isRoleEmployee ? 'Permanent Desk Access' : (isExpired ? 'Subscription Expired' : `Active (${formattedExpiry})`)}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRoleAdmin && onOpenAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAdmin();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Admin Panel</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-[#080C14] overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile & Account</span>
          </button>

          <button
            onClick={() => setActiveTab('referrals')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'referrals'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Referrals & Commissions</span>
            <span className="ml-1 bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
              ${user.balance.toFixed(2)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Transactions</span>
          </button>

          <button
            onClick={() => setActiveTab('subscription')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'subscription'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Subscription Plan</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: PROFILE & ACCOUNT */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              
              {/* Financial Balance Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30">
                  <div className="flex items-center justify-between text-xs text-amber-400 font-bold uppercase tracking-wider">
                    <span>Available Commission</span>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-white">
                    ${user.balance.toFixed(2)}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Rate: {user.commissionRate}% per sale</span>
                    <button
                      onClick={() => setShowPayoutModal(true)}
                      className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-md transition-all cursor-pointer"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <span>Pending Payout</span>
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-200">
                    ${user.pendingBalance.toFixed(2)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Under admin review
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-bold uppercase tracking-wider">
                    <span>Lifetime Earned</span>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-300">
                    ${user.totalEarned.toFixed(2)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Total commissions earned
                  </div>
                </div>
              </div>

              {/* Profile Avatar & Photo Management Card */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
                      <UserAvatar
                        user={user}
                        size="2xl"
                        isEditable={true}
                        onEditClick={() => setShowAvatarModal(true)}
                        className="ring-2 ring-amber-400/40 group-hover:ring-amber-400 transition-all rounded-2xl shadow-lg"
                      />
                      <span className="absolute -bottom-1.5 -right-1.5 bg-amber-400 text-slate-950 p-1 rounded-full shadow-md border border-slate-900">
                        <Camera className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">Profile Photo</h3>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {user.avatarUrl ? 'Custom Image' : 'Default Avatar'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        Click your photo or tap the button to choose an image from Gallery Photos or Files (JPG, PNG, WEBP).
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowAvatarModal(true)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-amber-400/20"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                    </button>

                    {user.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setShowAvatarModal(true)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>Manage</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Details & Edit Form */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Member Credentials & Information
                  </h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
                  </button>
                </div>

                {saveStatus && (
                  <div className="mb-4 p-2.5 bg-slate-800 text-amber-300 text-xs rounded-lg border border-amber-400/30">
                    {saveStatus}
                  </div>
                )}

                {isEditing ? (
                  <div className="space-y-4">
                    {/* Username Field (Editable ONLY for Super Admin) */}
                    {user.role === 'admin' ? (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-amber-400" />
                            <span>Super Admin Username</span>
                          </label>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                            Super Admin Privilege
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-sm font-mono select-none">
                            @
                          </span>
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            placeholder="admin_username"
                            className="w-full bg-slate-950 border border-amber-500/40 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                          />
                        </div>
                        <p className="text-[11px] text-amber-300/80">
                          As Super Admin, you can change your system-wide handle/username.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Username</span>
                          </label>
                          <span className="text-[10px] text-slate-500">
                            Locked (Super Admin Only)
                          </span>
                        </div>
                        <input
                          type="text"
                          disabled
                          value={`@${user.username}`}
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 font-mono cursor-not-allowed"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-semibold flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>Full Display Name</span>
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="e.g. Tariq Al-Mansoor"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-semibold flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>Email Address</span>
                        </label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="trader@example.com"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-semibold flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>Phone Number / Contact</span>
                        </label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000 or @telegram"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                            <span>Avatar Image</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowAvatarModal(true)}
                              className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Upload File</span>
                            </button>
                            {user.role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => setEditAvatar('/abu_asad_almansi.jpg')}
                                className="text-[10px] text-slate-400 hover:text-white underline font-medium cursor-pointer"
                              >
                                Abu Asad Photo
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editAvatar}
                            onChange={(e) => setEditAvatar(e.target.value)}
                            placeholder="/abu_asad_almansi.jpg or https://... or base64"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleSaveProfile}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-amber-400/20"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Username</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-200 font-bold">@{user.username}</span>
                        {user.role === 'admin' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                            Super Admin
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Email Address</span>
                      <span className="text-slate-200 font-medium">{user.email || 'Not configured'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Phone Number / Contact</span>
                      <span className="text-slate-200 font-medium">{user.phone || 'Not configured'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Full Display Name</span>
                      <span className="text-slate-200 font-medium">{user.fullName || user.username}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Account Role</span>
                      <span className="font-bold uppercase text-amber-400">{user.role}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Member Since</span>
                      <span className="text-slate-300">{new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Referral Code</span>
                      <span className="font-mono text-amber-300 font-bold">{user.referralCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Referral Commission Rate</span>
                      <span className="font-bold text-emerald-400">{user.commissionRate}% per referred plan</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Security & Password Management Card */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400 shrink-0">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Account Security & Password</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded border border-slate-700">
                          Bcrypt 12-Rounds
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Change your account password with end-to-end cryptographic hashing.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(!showPasswordChange);
                      setPasswordStatus(null);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                      showPasswordChange 
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' 
                        : 'bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/40'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{showPasswordChange ? 'Close Form' : 'Change Password'}</span>
                  </button>
                </div>

                {showPasswordChange && (
                  <form onSubmit={handleChangePasswordSubmit} className="mt-4 pt-4 border-t border-slate-800/90 space-y-4">
                    {passwordStatus && (
                      <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                        passwordStatus.type === 'success' 
                          ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' 
                          : passwordStatus.type === 'error'
                          ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                          : 'bg-slate-800 text-amber-300 border border-amber-400/30'
                      }`}>
                        {passwordStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {passwordStatus.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                        <span>{passwordStatus.msg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {/* Current Password */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-semibold">Current Password</label>
                        <div className="relative">
                          <input
                            type={showCurrentPass ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            required
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 pr-9 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPass(!showCurrentPass)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                          >
                            {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-semibold">New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPass ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            required
                            minLength={6}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 pr-9 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                          >
                            {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-semibold">Confirm New Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmPass ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-type new password"
                            required
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 pr-9 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                          >
                            {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Live helper notes & match indicator */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px]">
                      <div className="flex items-center gap-3">
                        {newPassword && (
                          <span className={`font-mono font-bold ${
                            newPassword.length >= 8 ? 'text-emerald-400' : newPassword.length >= 6 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            Strength: {newPassword.length >= 8 ? 'Strong' : newPassword.length >= 6 ? 'Fair' : 'Too Short'}
                          </span>
                        )}
                        {newPassword && confirmPassword && (
                          <span className={`font-semibold ${
                            newPassword === confirmPassword ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                          </span>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={passwordStatus?.type === 'loading'}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm shadow-amber-500/20"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{passwordStatus?.type === 'loading' ? 'Updating...' : 'Save New Password'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Logout Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <span className="text-xs text-slate-500">Need to switch accounts or end session?</span>
                <button
                  onClick={() => {
                    onClose();
                    logout();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: REFERRALS & COMMISSIONS */}
          {activeTab === 'referrals' && (
            <div className="space-y-6">
              
              {/* Referral Link & Code Box */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-[#0E1526] via-[#121B30] to-[#16233F] border border-amber-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Your Institutional Referral Engine
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  Share your personal link with fellow traders. Every time a member registers and activates a trading pass using your referral code, you automatically earn a <strong className="text-amber-300 font-bold">{user.commissionRate}% instant cash commission</strong> credited directly to your balance!
                </p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Referral Code */}
                  <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Referral Code</span>
                      <span className="text-sm font-mono font-black text-amber-300">{user.referralCode}</span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Referral Link */}
                  <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Shareable Invite Link</span>
                      <span className="text-xs font-mono text-slate-300 truncate block">{referralLink}</span>
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-md text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Referred Traders List */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Referred Traders ({referralData?.totalReferredCount || 0})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">Commission Rate: <strong className="text-emerald-400">{user.commissionRate}%</strong></span>
                </div>

                {loadingRef ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-mono">Loading referral tree...</div>
                ) : referralData && referralData.referrals.length > 0 ? (
                  <div className="divide-y divide-slate-800/80">
                    {referralData.referrals.map((refUser) => (
                      <div key={refUser.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            user={refUser}
                            size="md"
                            className="rounded-lg"
                          />
                          <div>
                            <div className="font-bold text-slate-200">@{refUser.username}</div>
                            <div className="text-[10px] text-slate-500">{new Date(refUser.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            refUser.subscriptionStatus === 'active' 
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {refUser.subscriptionStatus}
                          </span>
                          <span className="font-bold text-emerald-400 text-xs">+ Commission Active</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-lg border border-dashed border-slate-800">
                    <Share2 className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-300">No referred traders yet.</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Share your referral link above to start generating automatic commission balances.</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: TRANSACTIONS & COMMISSION LEDGER */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Account Ledger & Financial Activity
                </h3>
                <button
                  onClick={() => setShowPayoutModal(true)}
                  className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Request Payout ($)
                </button>
              </div>

              {loadingTx ? (
                <div className="py-8 text-center text-xs text-slate-500 font-mono">Loading transaction records...</div>
              ) : transactions.length > 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-900/80 transition-colors">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-200 flex items-center gap-2">
                          <span>{tx.description}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase font-mono ${
                            tx.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                            tx.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {new Date(tx.createdAt).toLocaleString()} • Ref ID: {tx.id}
                        </div>
                      </div>
                      <div className={`text-sm font-mono font-black ${
                        tx.amount > 0 ? 'text-emerald-400' : 'text-slate-300'
                      }`}>
                        {tx.amount > 0 ? `+$${tx.amount.toFixed(2)}` : `$${tx.amount.toFixed(2)}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                  <Wallet className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-300">No transaction records found.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Commission earnings and subscription receipts will be logged here.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SUBSCRIPTION PLAN & RENEWAL */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              
              {/* Current Active Plan Status */}
              <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Current Membership Plan</span>
                  <h3 className="text-lg font-black text-white">{user.subscriptionPlan || 'Pro Order Flow SMC'}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className={`inline-flex items-center gap-1 font-bold ${isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
                      <span>{isExpired ? 'Expired' : 'Active Status'}</span>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">
                      {isRoleAdmin || isRoleEmployee ? 'Internal Permanent Access' : `Expires on ${formattedExpiry}`}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-500 block uppercase">Permissions</span>
                  <span className="text-xs font-bold text-amber-300 uppercase">
                    Full Quantitative Alpha Access
                  </span>
                </div>
              </div>

              {renewMsg && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{renewMsg}</span>
                </div>
              )}

              {/* Renewal Options */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Extend or Upgrade Membership
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-[#090D15] border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Monthly SMC Pass</div>
                      <div className="text-xl font-black text-amber-400 mt-1">$120 <span className="text-xs text-slate-400 font-normal">/ 30 days</span></div>
                      <p className="text-[11px] text-slate-400 mt-1">Single month extension.</p>
                    </div>
                    <button
                      disabled={renewing}
                      onClick={() => handleRenewSubscription(1, 'Pro Monthly SMC Pass')}
                      className="mt-4 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      {renewing ? 'Updating...' : 'Extend 1 Month'}
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/60 flex flex-col justify-between relative">
                    <span className="absolute -top-2 right-3 bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.2 rounded-full">
                      Best Value
                    </span>
                    <div>
                      <div className="text-xs font-bold text-amber-300">Quarterly VIP Pass</div>
                      <div className="text-xl font-black text-white mt-1">$290 <span className="text-xs text-slate-400 font-normal">/ 90 days</span></div>
                      <p className="text-[11px] text-slate-400 mt-1">90 days access + priority signals.</p>
                    </div>
                    <button
                      disabled={renewing}
                      onClick={() => handleRenewSubscription(3, 'Pro Quarterly VIP Pass')}
                      className="mt-4 w-full py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-lg transition-all cursor-pointer shadow-md shadow-amber-500/20"
                    >
                      {renewing ? 'Updating...' : 'Extend 3 Months ($290)'}
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-[#090D15] border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-emerald-300">Annual Institutional</div>
                      <div className="text-xl font-black text-white mt-1">$990 <span className="text-xs text-slate-400 font-normal">/ 365 days</span></div>
                      <p className="text-[11px] text-slate-400 mt-1">Full 1-year institutional tier.</p>
                    </div>
                    <button
                      disabled={renewing}
                      onClick={() => handleRenewSubscription(12, 'Annual Institutional Elite')}
                      className="mt-4 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      {renewing ? 'Updating...' : 'Extend 1 Year ($990)'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-[#080C14] flex items-center justify-between text-xs text-slate-500">
          <span>Logged in as @{user.username} ({user.role})</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* Payout Modal Sub-Dialog */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0D121F] border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Request Commission Payout</span>
              </h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-xl text-xs flex items-center justify-between">
              <span className="text-slate-300">Available Balance:</span>
              <span className="text-base font-black text-amber-300 font-mono">${user.balance.toFixed(2)}</span>
            </div>

            {payoutStatus && (
              <div className="p-2.5 bg-slate-800 text-amber-300 text-xs rounded-lg border border-amber-400/30">
                {payoutStatus}
              </div>
            )}

            <form onSubmit={handlePayoutSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Payout Amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={user.balance}
                  min={50}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Min $50.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Payout Method</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="USDT (TRC20)">USDT (TRC20 - Instant Network)</option>
                  <option value="USDT (ERC20)">USDT (ERC20)</option>
                  <option value="Bitcoin (BTC)">Bitcoin (BTC)</option>
                  <option value="Bank Wire">International Bank Wire</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Wallet Address or Bank Details</label>
                <input
                  type="text"
                  required
                  value={payoutAddress}
                  onChange={(e) => setPayoutAddress(e.target.value)}
                  placeholder="TRC20 Address / IBAN / Account"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-lg transition-all cursor-pointer"
                >
                  Submit Payout Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Avatar Upload Modal */}
      <AvatarUploadModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
      />
    </div>
  );
};
