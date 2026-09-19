import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck,
  Send,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';

interface MemberLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribeClick?: () => void;
}

export const MemberLoginModal: React.FC<MemberLoginModalProps> = ({
  isOpen,
  onClose,
  onSubscribeClick,
}) => {
  const { login } = useAuth();
  const { t, isRTL } = useTranslation();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg(t('authErrorProvideCreds'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await login(username.trim(), password);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || t('authFailedGeneral'));
    }
  };

  return (
    <div 
      id="modal-member-login"
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex flex-col justify-center items-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div 
        className="w-full max-w-md bg-[#090D17] border border-slate-800 rounded-3xl shadow-2xl shadow-black text-slate-100 p-6 sm:p-8 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 rtl:right-auto rtl:left-5 w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-[1.5px] shadow-lg shadow-amber-500/20 mx-auto">
            <div className="w-full h-full bg-[#0E131F] rounded-[14px] flex items-center justify-center">
              <span className="font-black text-lg bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                SM
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h3 className="text-xl font-black text-white tracking-tight">
                Client Portal Login
              </h3>
              <BlueVerifiedBadge size="sm" />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Sign in with your active subscription credentials
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('authLabelUsernameOrEmail')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('authPlaceholderUsernameOrEmail')}
                autoComplete="username"
                className="w-full pl-10 rtl:pl-3.5 rtl:pr-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('authLabelPassword')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('authPlaceholderPassword')}
                autoComplete="current-password"
                className="w-full pl-10 rtl:pl-3.5 rtl:pr-10 pr-10 rtl:pr-3.5 rtl:pl-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3.5 rtl:pr-0 rtl:pl-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 text-slate-950 font-black rounded-xl text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Trading Terminal</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Support Direct Assistance Note */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            Need credentials or assistance activating your membership?
          </p>
          <a
            href="https://t.me/SMTrading_SUPPORT"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Contact Support: @SMTrading_SUPPORT</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {onSubscribeClick && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSubscribeClick();
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold transition-colors underline cursor-pointer"
              >
                Not a subscriber yet? View Subscription Packages
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
