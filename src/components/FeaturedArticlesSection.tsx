import React from 'react';
import { Article, TradeSetup } from '../types';
import { 
  GraduationCap, 
  ShieldCheck, 
  Zap, 
  CheckCircle, 
  Award
} from 'lucide-react';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { useAbuAsadAvatar } from '../context/AvatarContext';
import { useTranslation } from '../locales';

interface FeaturedArticlesSectionProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  savedArticleIds: string[];
  onToggleBookmark: (articleId: string) => void;
  onOpenCalculatorWithSetup?: (setup: TradeSetup) => void;
}

export const FeaturedArticlesSection: React.FC<FeaturedArticlesSectionProps> = ({
  onOpenCalculatorWithSetup
}) => {
  const { abuAsadAvatar } = useAbuAsadAvatar();
  const { t, isRTL } = useTranslation();

  return (
    <section aria-label="Institutional Trading Academy" className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-transparent text-amber-300 text-[11px] font-mono-num font-bold px-3 py-1 rounded-full border border-amber-400/30 uppercase tracking-widest shadow-sm">
              <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
              <span>Institutional Mentorship</span>
            </span>
            <span className="text-xs text-slate-400 font-mono-num hidden sm:inline">
              • Direct Founder Guidance & Elite Curriculum
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Institutional Trading Academy
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl">
            Master the exact mechanics of Smart Money Concepts (SMC) and quantitative execution under senior mentorship.
          </p>
        </div>
      </div>

      {/* Primary Academy Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Founder & CEO Card */}
        <div className="relative rounded-3xl overflow-hidden border border-amber-500/35 bg-gradient-to-br from-[#0D1322] via-[#0E162B] to-[#0A0F1D] p-6 sm:p-8 shadow-2xl flex flex-col justify-between space-y-6">
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
          
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <span className="bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-400/20">
                <Award className="w-3.5 h-3.5 fill-slate-950" />
                LEADER & FLAGSHIP MENTOR
              </span>
              <span className="bg-slate-950/80 backdrop-blur-md text-amber-300 text-xs font-mono-num px-3 py-1 rounded-full border border-amber-400/30">
                SMC Masterclass
              </span>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="relative shrink-0">
                <img
                  src={abuAsadAvatar || '/abu_asad_almansi.jpg'}
                  alt="Abu Asad Almansi"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-2xl object-cover object-top border-2 border-amber-400 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 rtl:-left-1 rtl:right-auto bg-amber-400 text-slate-950 p-0.5 rounded-full ring-2 ring-[#0B0F19]">
                  <ShieldCheck className="w-3 h-3" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-black text-white">Abu Asad Almansi</h3>
                  <BlueVerifiedBadge size="sm" />
                </div>
                <span className="text-xs text-amber-300 font-bold block mt-0.5">
                  Founder & CEO
                </span>
                <span className="text-[11px] text-slate-400 font-mono block">
                  Chief Quantitative Strategist
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pioneering Smart Money Concepts (SMC) and institutional order flow microstructure. Guiding traders from retail guesswork to algorithmic precision across global currency, index, and commodity markets.
            </p>

            <div className="bg-[#070A11]/95 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono-num">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Core Curriculum Focus
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Institutional Order Blocks & Liquidity Pool Sweeps</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Fair Value Gap (FVG) Retracements & Premium/Discount Arrays</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono-num text-slate-400">
            <span>24 Modules • Full Certification</span>
            <span className="text-amber-400 font-bold">Included in All-Inclusive Pass</span>
          </div>
        </div>

        {/* Co-Founder Card */}
        <div className="relative rounded-3xl overflow-hidden border border-blue-500/35 bg-gradient-to-br from-[#0D1322] via-[#0E162B] to-[#0A0F1D] p-6 sm:p-8 shadow-2xl flex flex-col justify-between space-y-6">
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
          
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <span className="bg-blue-500 text-slate-950 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-blue-500/20">
                <Award className="w-3.5 h-3.5 fill-slate-950" />
                Co-Founder & Director
              </span>
              <span className="bg-slate-950/80 backdrop-blur-md text-blue-300 text-xs font-mono-num px-3 py-1 rounded-full border border-blue-500/30">
                Strategy 144 Masterclass
              </span>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="relative shrink-0">
                <img
                  src="/ahmad_nader_attar.jpg"
                  alt="Ahmad Nader Attar"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-2xl object-cover object-top border-2 border-blue-400 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 rtl:-left-1 rtl:right-auto bg-blue-400 text-slate-950 p-0.5 rounded-full ring-2 ring-[#0B0F19]">
                  <ShieldCheck className="w-3 h-3" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-black text-white">Ahmad Nader Attar</h3>
                  <BlueVerifiedBadge size="sm" />
                </div>
                <span className="text-xs text-blue-300 font-bold block mt-0.5">
                  Co-Founder
                </span>
                <span className="text-[11px] text-slate-400 font-mono block">
                  Head of Execution & Systems Architecture
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Specializing in quantitative timing models, Gann vibrational cycles, and proprietary Strategy 144 frameworks. Ensuring robust trade execution infrastructure and risk discipline.
            </p>

            <div className="bg-[#070A11]/95 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 font-mono-num">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                Core Curriculum Focus
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Algorithmic Timing & Gann Time-Price Vibrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Prop Firm Risk Architecture & Capital Allocation Rules</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono-num text-slate-400">
            <span>Advanced Framework • Live Mentorship</span>
            <span className="text-blue-400 font-bold">Included in All-Inclusive Pass</span>
          </div>
        </div>

      </div>
    </section>
  );
};
