import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  User, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Crown, 
  ArrowRight, 
  LogOut, 
  Zap, 
  Gift, 
  RefreshCw,
  Clock,
  Mail,
  KeyRound,
  Edit2,
  Send
} from 'lucide-react';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from '../context/LanguageContext';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, login, sendRegisterVerificationCode, register, logout, activateSubscription } = useAuth();
  const { t, isRTL, language } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Registration Email Verification states
  const [regStep, setRegStep] = useState<'form' | 'verify'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);

  // Subscription Gate states
  const [renewing, setRenewing] = useState(false);
  const [selectedPlanMonths, setSelectedPlanMonths] = useState<number>(3);

  // Resend countdown timer
  useEffect(() => {
    if (codeCountdown <= 0) return;
    const timer = setInterval(() => {
      setCodeCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [codeCountdown]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg(t('authErrorProvideCreds'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await login(username.trim(), password);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || t('authFailedGeneral'));
    }
  };

  const handleRequestVerificationCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!username.trim() || !email.trim() || !password) {
      setErrorMsg(t('authErrorCompleteFields'));
      return;
    }

    if (username.trim().length < 3) {
      setErrorMsg(t('authLabelUsernameReq') + ' (min 3 chars)');
      return;
    }

    if (password.length < 6) {
      setErrorMsg(t('authPlaceholderPasswordReq'));
      return;
    }

    setIsSendingCode(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await sendRegisterVerificationCode(email.trim(), username.trim());
    setIsSendingCode(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to send verification code.');
    } else {
      setRegStep('verify');
      setCodeCountdown(60);
      setSuccessMsg(res.message || t('authCodeSentToast'));
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setErrorMsg(t('profileVerifyNeedCode'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await register({
      username: username.trim(),
      email: email.trim(),
      password,
      fullName: fullName.trim() || username.trim(),
      referralCode: referralCode.trim() || undefined,
      verificationCode: verificationCode.trim(),
    });

    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || t('authFailedGeneral'));
    } else {
      setSuccessMsg(t('authSuccessRegistered'));
    }
  };

  const handleActivatePlan = async (months: number, planName: string) => {
    setRenewing(true);
    setErrorMsg(null);
    const res = await activateSubscription(months, planName);
    setRenewing(false);
    if (!res.success) {
      setErrorMsg(res.error || t('authFailedGeneral'));
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A11] flex flex-col items-center justify-center p-4">
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 p-[1.5px] animate-pulse">
          <div className="w-full h-full bg-[#0E131F] rounded-[14px] flex items-center justify-center">
            <span className="font-bold text-2xl tracking-tighter bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
              SM
            </span>
          </div>
        </div>
        <p className="mt-4 text-slate-400 text-xs font-mono tracking-widest uppercase">
          {t('authLoading')}
        </p>
      </div>
    );
  }

  // 2. Subscription Expired/Inactive Gate (If logged in as Client but subscription expired)
  if (user && user.role === 'client' && user.subscriptionStatus !== 'active') {
    const isExpired = user.subscriptionStatus === 'expired';
    const expiresFormatted = user.subscriptionExpiresAt 
      ? new Date(user.subscriptionExpiresAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : language === 'ru' ? 'ru-RU' : language === 'uk' ? 'uk-UA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'N/A';

    return (
      <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col justify-between relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[350px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Top bar */}
        <div className="max-w-6xl mx-auto w-full px-4 py-4 flex items-center justify-between z-10 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-700 p-[1px]">
              <div className="w-full h-full bg-[#0E131F] rounded-[7px] flex items-center justify-center">
                <span className="font-bold text-sm text-amber-300">SM</span>
              </div>
            </div>
            <span className="font-black text-lg text-white">SMTrading<span className="text-amber-400">.pro</span></span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <div className="text-right rtl:text-left hidden sm:block">
              <div className="text-xs font-semibold text-white">@{user.username}</div>
              <div className="text-[10px] text-slate-400">{user.email}</div>
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{t('authSubLogOut')}</span>
            </button>
          </div>
        </div>

        {/* Gate Content */}
        <main className="max-w-4xl mx-auto w-full px-4 py-10 z-10 flex-1 flex flex-col justify-center">
          <div className="bg-[#0C111C]/90 border border-amber-500/30 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('authSubMembership')} {isExpired ? t('authSubExpired') : t('authSubInactive')}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t('authSubRequiredTitle')}
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              {t('authSubHello')} <strong className="text-amber-400">@{user.username}</strong>, {t('authSubExpiredDesc', { expiresFormatted })}
            </p>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Subscription Plans Grid */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Plan 1: 1 Month */}
              <div 
                onClick={() => setSelectedPlanMonths(1)}
                className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlanMonths === 1 
                    ? 'bg-amber-500/10 border-amber-400 shadow-lg shadow-amber-500/10' 
                    : 'bg-[#090D15] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('authSubPlanMonthly')}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">{t('authSubPlanMonthlyPrice')}</span>
                    <span className="text-xs text-slate-400">{t('authSubPlanMonthlyPeriod')}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{t('authSubPlanMonthlyDesc')}</p>
                </div>
                <button
                  disabled={renewing}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActivatePlan(1, 'Pro Monthly SMC Pass');
                  }}
                  className="mt-5 w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  {renewing && selectedPlanMonths === 1 ? t('authSubActivating') : t('authSubPlanMonthlyBtn')}
                </button>
              </div>

              {/* Plan 2: 3 Months (Recommended) */}
              <div 
                onClick={() => setSelectedPlanMonths(3)}
                className={`p-5 rounded-xl border relative transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlanMonths === 3 
                    ? 'bg-gradient-to-b from-amber-500/20 to-amber-500/5 border-amber-400 shadow-xl shadow-amber-500/15' 
                    : 'bg-[#090D15] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="absolute -top-2.5 right-4 rtl:right-auto rtl:left-4 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                  {t('authSubPlanQuarterlyBadge')}
                </div>
                <div>
                  <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{t('authSubPlanQuarterly')}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">{t('authSubPlanQuarterlyPrice')}</span>
                    <span className="text-xs text-slate-400">{t('authSubPlanQuarterlyPeriod')}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{t('authSubPlanQuarterlyDesc')}</p>
                </div>
                <button
                  disabled={renewing}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActivatePlan(3, 'Pro Quarterly VIP Pass');
                  }}
                  className="mt-5 w-full py-2 px-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-lg transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {renewing && selectedPlanMonths === 3 ? t('authSubActivating') : t('authSubPlanQuarterlyBtn')}
                </button>
              </div>

              {/* Plan 3: 1 Year Institutional */}
              <div 
                onClick={() => setSelectedPlanMonths(12)}
                className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlanMonths === 12 
                    ? 'bg-amber-500/10 border-amber-400 shadow-lg shadow-amber-500/10' 
                    : 'bg-[#090D15] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">{t('authSubPlanAnnual')}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">{t('authSubPlanAnnualPrice')}</span>
                    <span className="text-xs text-slate-400">{t('authSubPlanAnnualPeriod')}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{t('authSubPlanAnnualDesc')}</p>
                </div>
                <button
                  disabled={renewing}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActivatePlan(12, 'Annual Institutional Elite');
                  }}
                  className="mt-5 w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  {renewing && selectedPlanMonths === 12 ? t('authSubActivating') : t('authSubPlanAnnualBtn')}
                </button>
              </div>
            </div>

            {/* Instant Demo Sandbox Simulator Activator */}
            <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-white">{t('authSubSandboxTitle')}</span> {t('authSubSandboxDesc')}
                </div>
              </div>
              <button
                disabled={renewing}
                onClick={() => handleActivatePlan(selectedPlanMonths, 'SM Pro Trader Active Pass')}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                {renewing ? t('authSubSandboxUnlocking') : t('authSubSandboxBtn')}
              </button>
            </div>
          </div>
        </main>

        <footer className="py-4 text-center text-xs text-slate-500 z-10">
          {t('authSubFooter')}
        </footer>
      </div>
    );
  }

  // 3. User is Logged in and has Active Subscription (or Employee / Admin role) -> Render Dashboard!
  if (user) {
    return <>{children}</>;
  }

  // 4. Pre-Dashboard Login / Register Gatekeeper Screen
  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-amber-500/15 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[350px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 flex items-center justify-between z-10 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-[1px] shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-[#0E131F] rounded-[11px] flex items-center justify-center">
              <span className="font-black text-base bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                SM
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl text-white tracking-tight">
                SMTrading<span className="text-amber-400">.pro</span>
              </span>
              <div className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/40">
                <span>{t('authAuthor')}</span>
                <BlueVerifiedBadge size="sm" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {t('authHeaderTagline')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector />
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="max-w-5xl mx-auto w-full px-4 py-8 sm:py-12 z-10 flex-1 flex flex-col items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Platform Highlights & Institutional Overview */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left rtl:lg:text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-amber-400 text-xs font-semibold">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('authHeaderBadge')}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              {t('authHeroTitlePre')} <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                {t('authHeroTitleHighlight')}
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg mx-auto lg:mx-0">
              {t('authHeroDesc')}
            </p>

            {/* Highlights List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-left rtl:text-right">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">{t('authFeatureBookmapTitle')}</div>
                  <div className="text-[11px] text-slate-400">{t('authFeatureBookmapDesc')}</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-left rtl:text-right">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">{t('authFeatureReferralTitle')}</div>
                  <div className="text-[11px] text-slate-400">{t('authFeatureReferralDesc')}</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-left rtl:text-right">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">{t('authFeatureLiveTradeTitle')}</div>
                  <div className="text-[11px] text-slate-400">{t('authFeatureLiveTradeDesc')}</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-left rtl:text-right">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">{t('authFeatureSupportTitle')}</div>
                  <div className="text-[11px] text-slate-400">{t('authFeatureSupportDesc')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Login & Register Box */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-[#0D121F]/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
              
              {/* Tab Selector */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800/80 mb-6">
                <button
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('authTabSignIn')}
                </button>
                <button
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('authTabRegister')}
                </button>
              </div>

              {/* Status alerts */}
              {errorMsg && (
                <div className="mb-4 p-3 bg-rose-950/70 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Login Form */}
              {mode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      {t('authLabelUsernameOrEmail')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t('authPlaceholderUsernameOrEmail')}
                        className="w-full bg-[#080B12] border border-slate-700/80 rounded-xl ps-9 pe-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      {t('authLabelPassword')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('authPlaceholderPassword')}
                        className="w-full bg-[#080B12] border border-slate-700/80 rounded-xl ps-9 pe-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t('authBtnSigningIn')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('authBtnSignIn')}</span>
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      </>
                    )}
                  </button>
                </form>
              ) : regStep === 'form' ? (
                /* Registration Form - Step 1 */
                <form onSubmit={handleRequestVerificationCode} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      {t('authLabelFullName')}
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t('authPlaceholderFullName')}
                      className="w-full bg-[#080B12] border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        {t('authLabelUsernameReq')}
                      </label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t('authPlaceholderUsername')}
                        className="w-full bg-[#080B12] border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        {t('authLabelEmailReq')}
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('authPlaceholderEmail')}
                        className="w-full bg-[#080B12] border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      {t('authLabelPasswordReq')}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('authPlaceholderPasswordReq')}
                        className="w-full bg-[#080B12] border border-slate-700/80 rounded-xl px-3.5 pe-10 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      <span className="flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t('authLabelReferralCode')}</span>
                      </span>
                      <span className="text-[10px] text-amber-400 font-normal">{t('authReferralBonusBadge')}</span>
                    </label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder={t('authPlaceholderReferral')}
                      className="w-full bg-[#080B12] border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-amber-300 font-mono placeholder-slate-600 focus:outline-none focus:border-amber-400 uppercase"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingCode}
                    className="w-full mt-2 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingCode ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t('authBtnSendingCode')}</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>{t('authBtnSendCode')}</span>
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Registration Step 2 - Verification Code Entry */
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 shrink-0 mt-0.5">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                            {t('authVerificationStep')}
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setRegStep('form');
                              setErrorMsg(null);
                            }}
                            className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer underline"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>{t('authChangeEmail')}</span>
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {t('authVerificationNotice')}{' '}
                          <span className="text-white font-mono font-bold">{email}</span>.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      {t('authVerificationCodeLabel')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                        <KeyRound className="w-4 h-4 text-amber-400" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder={t('authVerificationCodePlaceholder')}
                        className="w-full bg-[#080B12] border border-amber-500/50 rounded-xl ps-10 pe-4 py-3 text-center text-xl font-mono tracking-widest text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>
                      {codeCountdown > 0 ? (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          {t('authResendIn').replace('{seconds}', codeCountdown.toString())}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRequestVerificationCode()}
                          disabled={isSendingCode}
                          className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          <span>{t('authResendCode')}</span>
                        </button>
                      )}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || verificationCode.length < 6}
                    className="w-full py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t('authBtnRegistering')}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{t('authBtnVerifyAndRegister')}</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Security & Access Notice */}
              <div className="mt-6 pt-5 border-t border-slate-800">
                <div className="p-3 bg-slate-950/80 border border-slate-800/90 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold text-slate-300 block">{t('authEncryptionTitle')}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{t('authEncryptionDesc')}</span>
                    </div>
                  </div>
                  <span className="text-[9px] bg-amber-400/10 border border-amber-400/30 text-amber-300 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                    {t('authInstitutionalBadge')}
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-4 py-4 text-center text-xs text-slate-500 z-10 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>{t('authFooterCopyright')}</span>
        <div className="flex items-center gap-4 text-slate-400">
          <span>{t('authFooterEncrypted')}</span>
          <span>•</span>
          <span>{t('authFooterRoleGuarded')}</span>
        </div>
      </footer>
    </div>
  );
};

