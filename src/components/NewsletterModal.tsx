import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewsletterModal: React.FC<NewsletterModalProps> = ({ isOpen, onClose }) => {
  const { t, isRTL } = useTranslation();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => {
        // Keep feedback visible briefly
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-[#0D121F] border border-amber-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-200 relative my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 rtl:right-auto rtl:left-3.5 min-w-[42px] min-h-[42px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md active:scale-95 z-20"
          aria-label="Close newsletter modal"
        >
          <X className="w-5 h-5" />
        </button>

        {subscribed ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-xl text-white">{t('newsSuccessTitle')}</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              {t('newsSuccessBody')} <strong className="text-amber-300">{email}</strong>.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
            >
              {t('newsBackBtn')}
            </button>
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-amber-400/10 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-md border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {t('newsBadge')}
              </div>
              <h2 className="font-extrabold text-2xl text-white">
                {t('newsTitle')}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('newsDescription')}
              </p>
            </div>

            <div className="bg-[#080B12] p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                <span>{t('newsBenefit1')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span>{t('newsBenefit2')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                <span>{t('newsBenefit3')}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder={t('newsInputPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#070A10] border border-slate-700 rounded-xl pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {t('newsSubmitBtn')}
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('newsPrivacy')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

