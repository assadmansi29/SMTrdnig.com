import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Send, 
  ShieldCheck, 
  AlertCircle, 
  Copy, 
  ExternalLink, 
  Crown, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  QrCode,
  ArrowRight
} from 'lucide-react';
import { SubscriptionPlanInfo } from '../types/subscription';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { useTranslation } from '../context/LanguageContext';

interface SubscriptionCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: SubscriptionPlanInfo | null;
  onSelectPlan?: (plan: SubscriptionPlanInfo) => void;
}

export const SubscriptionCheckoutModal: React.FC<SubscriptionCheckoutModalProps> = ({
  isOpen,
  onClose,
  selectedPlan,
}) => {
  const { isRTL } = useTranslation();
  const [copiedHandle, setCopiedHandle] = useState(false);
  
  // Confirmation submission form state
  const [telegramHandle, setTelegramHandle] = useState('');
  const [email, setEmail] = useState('');
  const [txHash, setTxHash] = useState('');
  const [referralCode, setReferralCode] = useState(() => {
    try {
      return localStorage.getItem('smtrading_ref') || '';
    } catch {
      return '';
    }
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !selectedPlan) return null;

  const handleCopySupportHandle = () => {
    navigator.clipboard.writeText('@SMTrading_SUPPORT');
    setCopiedHandle(true);
    setTimeout(() => setCopiedHandle(false), 2500);
  };

  const telegramPrefillMessage = encodeURIComponent(
    `Hello SM Trading Pro Support,\n\nI would like to subscribe to the "${selectedPlan.name}" package (${selectedPlan.priceDisplay} / ${selectedPlan.billingPeriod}).\n\nPlease provide the official USDT TRC20 payment address and payment instructions.\n\nThank you!`
  );

  const telegramSupportUrl = `https://t.me/SMTrading_SUPPORT?text=${telegramPrefillMessage}`;

  const handleSubmitConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramHandle.trim() && !email.trim()) {
      setErrorMessage('Please provide either your Telegram username or email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/submit-payment-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          price: selectedPlan.priceDisplay,
          email: email.trim(),
          telegramUsername: telegramHandle.trim(),
          txHash: txHash.trim(),
          referralCode: referralCode.trim().toUpperCase(),
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess(true);
        setOrderId(data.orderId || `ORD-${Date.now().toString().slice(-6)}`);
      } else {
        setErrorMessage(data.error || 'Failed to submit payment details. Please message @SMTrading_SUPPORT directly on Telegram.');
      }
    } catch (err: any) {
      setErrorMessage('Unable to connect to server. Please message @SMTrading_SUPPORT directly on Telegram.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="modal-subscription-checkout"
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div 
        className="w-full max-w-4xl bg-[#090D17] border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black text-slate-100 flex flex-col max-h-[94vh] relative animate-in slide-in-from-bottom-8 duration-200 my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 bg-[#0C1220] border-b border-slate-800 flex items-center justify-between gap-3 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center p-[1px] shrink-0 ${
              selectedPlan.isBestOffer
                ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-md shadow-amber-500/20'
                : 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-500/20'
            }`}>
              <div className="w-full h-full bg-[#0E1526] rounded-[11px] flex items-center justify-center">
                {selectedPlan.isBestOffer ? (
                  <Crown className="w-5 h-5 text-amber-400" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Checkout & Payment: <span className={selectedPlan.isBestOffer ? 'text-amber-400' : 'text-emerald-400'}>{selectedPlan.name}</span>
                </h2>
                {selectedPlan.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    selectedPlan.isBestOffer 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {selectedPlan.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Official SM Trading Pro Subscription Activation via USDT
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">

          {/* Two Columns Grid: Plan Summary vs Payment Instructions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Plan Summary Card */}
            <div className="lg:col-span-5 bg-[#0C1220] border border-slate-800/90 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {selectedPlan.isSiteSubscription ? 'Site Subscription Package' : 'Premium Membership'}
                  </span>
                  <h3 className="text-lg font-black text-white mt-0.5">{selectedPlan.name}</h3>
                </div>
                <div className="text-right rtl:text-left">
                  <div className="text-2xl font-black text-white font-mono-num">{selectedPlan.priceDisplay}</div>
                  <span className="text-[11px] text-slate-400">{selectedPlan.billingPeriod}</span>
                </div>
              </div>

              {/* Inclusions List */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-300 block">Package Inclusions:</span>
                <ul className="space-y-2">
                  {selectedPlan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Course disclaimer for Site Subscriptions */}
              {selectedPlan.disclaimer && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-amber-300 leading-snug">
                      {selectedPlan.disclaimer}
                    </p>
                  </div>
                </div>
              )}

              {/* All-Inclusive Course Highlight */}
              {selectedPlan.isBestOffer && (
                <div className="p-3.5 bg-gradient-to-br from-amber-500/15 via-[#111928] to-slate-900 border border-amber-500/40 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>Included Educational Masterclasses:</span>
                  </div>
                  <ul className="space-y-1.5 pl-1">
                    <li className="text-xs text-slate-200 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <strong>SMC Trading Course</strong> (Full Institutional Curriculum)
                    </li>
                    <li className="text-xs text-slate-200 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <strong>144 Strategy Course</strong> (Proprietary Execution System)
                    </li>
                  </ul>
                </div>
              )}

              {/* Security Trust Note */}
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Immediate account verification & manual desk onboarding</span>
              </div>
            </div>

            {/* Right Column: USDT Payment Details & Official Telegram Support */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Payment Method Banner: USDT (TRC20) ONLY */}
              <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-[#0E1526] to-slate-900 border border-emerald-500/40 rounded-2xl">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-xs">
                      ₮
                    </div>
                    <span className="text-sm font-black text-white">Payment Method: <span className="text-emerald-400 font-mono">USDT (TRC20)</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                    <span>USDT ONLY</span>
                    <span>•</span>
                    <span>NETWORK: TRC20</span>
                  </div>
                </div>
                
                <p className="text-xs text-slate-300 leading-relaxed">
                  Payment must be <strong>USDT ONLY</strong>. The <strong>ONLY supported USDT network is TRC20</strong>.
                </p>
              </div>

              {/* Official Instructions Notice */}
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">How To Complete Your Subscription:</h4>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      “To complete your subscription, contact our support team to receive the USDT TRC20 payment address and payment instructions.”
                    </p>
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Instant verification — subscription will be activated after confirmation.</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Telegram Support Card with Official QR Code Image */}
              <div className="p-5 bg-gradient-to-br from-[#0C1425] via-[#0E1526] to-[#0A0F1D] border border-blue-500/30 rounded-2xl shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  
                  {/* Visual Telegram QR Reference */}
                  <div className="shrink-0 flex flex-col items-center bg-white p-2.5 rounded-2xl shadow-lg border border-slate-200">
                    <img
                      src="/telegram_support_qr.png"
                      alt="SM Trading Pro Official Telegram Support QR Code"
                      className="w-32 h-32 object-contain"
                    />
                    <span className="text-[9px] font-bold text-slate-700 mt-1 text-center font-mono">
                      SCAN VIA TELEGRAM
                    </span>
                  </div>

                  {/* Desk Info & Primary CTA */}
                  <div className="min-w-0 flex-1 text-center sm:text-left rtl:sm:text-right space-y-3">
                    <div>
                      <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                        Official SM Trading Pro Support Desk
                      </span>
                      <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 flex-wrap">
                        <span className="text-lg font-black text-white font-mono">@SMTrading_SUPPORT</span>
                        <BlueVerifiedBadge size="sm" />
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Active 24/7 for instant USDT payment instructions, transaction validation, and member onboarding.
                      </p>
                    </div>

                    {/* Prominent Action Button: Contact Support for Payment Details */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <a
                        href={telegramSupportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-3 bg-[#24A1DE] hover:bg-[#2094cc] active:bg-[#1b81b3] text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#24A1DE]/25 transition-all cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Contact Support for Payment Details</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </a>

                      <button
                        type="button"
                        onClick={handleCopySupportHandle}
                        className="px-3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                        title="Copy support handle"
                      >
                        {copiedHandle ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy Handle</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Confirmation & Subscription Activation Submission Form */}
              <div className="p-5 bg-[#0C1220] border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Submit Payment Confirmation / TxID</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Already sent your USDT transfer or messaging support? Submit your transaction details below for immediate manual verification and credential dispatch.
                    </p>
                  </div>
                </div>

                {submitSuccess ? (
                  <div className="p-4 bg-emerald-950/50 border border-emerald-500/50 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Payment Confirmation Received!</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      Your order reference is <strong className="font-mono text-emerald-300">{orderId}</strong>. Our support desk has received your submission.
                    </p>
                    <div className="pt-2">
                      <a
                        href={`https://t.me/SMTrading_SUPPORT?text=${encodeURIComponent(`Hello @SMTrading_SUPPORT, I have submitted my payment confirmation for Order ID: ${orderId} (${selectedPlan.name}). Please activate my account.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#24A1DE] text-white text-xs font-bold rounded-lg hover:bg-[#2094cc] transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Notify Support on Telegram</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitConfirmation} className="space-y-3">
                    {errorMessage && (
                      <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Your Telegram Username <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={telegramHandle}
                          onChange={(e) => setTelegramHandle(e.target.value)}
                          placeholder="@username"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Your Email (For Account Credentials) <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@domain.com"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        USDT (TRC20) Transaction Hash / TxID (Or "Pending Transfer with Support")
                      </label>
                      <input
                        type="text"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        placeholder="e.g. TRC20 Transaction Hash (or Pending with Support)"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Referral / Affiliate Code (Optional)
                        </label>
                        {referralCode && (
                          <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Applied
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SMATTAR123"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-mono uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Additional Notes (Optional requested username, questions)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Any additional instructions or requested username..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                      />
                    </div>

                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2 text-slate-300 text-xs">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Instant verification — subscription will be activated after confirmation.</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Submitting Confirmation...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit Payment Details for Verification</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Modal Bottom Sticky Close Bar */}
        <div className="p-3 sm:p-4 bg-[#0A0E1A] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Support online on Telegram: <strong>@SMTrading_SUPPORT</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
