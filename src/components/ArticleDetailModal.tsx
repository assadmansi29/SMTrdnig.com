import React, { useState } from 'react';
import { Article, Comment, TradeSetup } from '../types';
import { 
  X, 
  Bookmark, 
  Share2, 
  Clock, 
  Eye, 
  ThumbsUp, 
  ThumbsDown, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  MessageSquare, 
  Send, 
  Check, 
  AlertCircle,
  Copy,
  ArrowRight,
  BookOpen
} from 'lucide-react';

interface ArticleDetailModalProps {
  article: Article | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (articleId: string) => void;
  onOpenCalculatorWithSetup: (setup: TradeSetup) => void;
  onSelectArticle: (article: Article) => void;
  allArticles: Article[];
}

export const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({
  article,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onOpenCalculatorWithSetup,
  onSelectArticle,
  allArticles
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');

  // Reader Sentiment State
  const [userVote, setUserVote] = useState<'BULLISH' | 'BEARISH' | null>(null);
  const [bullishCount, setBullishCount] = useState<number>(article?.bullishVotes || 320);
  const [bearishCount, setBearishCount] = useState<number>(article?.bearishVotes || 28);

  // Reader Comments State
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 'c-1',
      authorName: 'David K., Prop Trader (Chicago)',
      authorBadge: 'Verified Trader',
      date: '2 hours ago',
      content: 'Excellent breakdown of the bid absorption footprint. We noticed the exact same CVD divergence on the ES open this morning during the London handover.',
      likes: 24,
      sentiment: 'BULLISH'
    },
    {
      id: 'c-2',
      authorName: 'Mikhail S.',
      authorBadge: 'Quantitative Analyst',
      date: '5 hours ago',
      content: 'The Kalman filter formulation in Python is very clean. For pairs trading, are you adjusting the lookback window during volatile FOMC announcements?',
      likes: 12,
      sentiment: 'NEUTRAL'
    }
  ]);

  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentSentiment, setNewCommentSentiment] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('BULLISH');

  if (!article) return null;

  const totalVotes = bullishCount + bearishCount;
  const bullishPercent = totalVotes > 0 ? Math.round((bullishCount / totalVotes) * 100) : 50;

  const handleVote = (type: 'BULLISH' | 'BEARISH') => {
    if (userVote === type) return;
    if (type === 'BULLISH') {
      setBullishCount(prev => prev + 1);
      if (userVote === 'BEARISH') setBearishCount(prev => Math.max(0, prev - 1));
    } else {
      setBearishCount(prev => prev + 1);
      if (userVote === 'BULLISH') setBullishCount(prev => Math.max(0, prev - 1));
    }
    setUserVote(type);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      authorName: newCommentName.trim() || 'Anonymous Trader',
      authorBadge: 'Community Member',
      date: 'Just now',
      content: newCommentText.trim(),
      likes: 1,
      sentiment: newCommentSentiment
    };

    setComments(prev => [newComment, ...prev]);
    setNewCommentText('');
    setNewCommentName('');
  };

  const relatedArticles = allArticles
    .filter(a => a.id !== article.id)
    .slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-200">
        {/* Top Control Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-[#080C14]/95 backdrop-blur-md border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400/10 text-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded border border-amber-400/30">
              {article.category}
            </span>
            <span className="text-xs text-slate-400 font-mono-num hidden sm:inline">
              • {article.readTime}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Font size toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setFontSize('normal')}
                className={`px-2 py-1 rounded font-semibold ${fontSize === 'normal' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                Aa
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-2 py-1 rounded font-semibold text-sm ${fontSize === 'large' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                A+
              </button>
            </div>

            {/* Bookmark */}
            <button
              onClick={() => onToggleBookmark(article.id)}
              className={`p-2 rounded-lg border transition-colors ${
                isBookmarked
                  ? 'bg-amber-400 text-slate-950 border-amber-400'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
              }`}
              title="Bookmark Article"
            >
              <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:text-white border border-slate-800 transition-colors relative"
              title="Share Link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Reader Content */}
        <div className="overflow-y-auto px-6 sm:px-10 py-8 space-y-8">
          {/* Article Header */}
          <div className="space-y-4 max-w-3xl">
            <h1 className="font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white leading-tight">
              {article.title}
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              {article.subtitle}
            </p>

            {/* Author Profile Bar */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={article.author.avatar}
                  alt={article.author.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-amber-400/40"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm sm:text-base">
                      {article.author.name}
                    </span>
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-xs text-slate-400">
                    {article.author.role} • {article.publishedAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 font-mono-num">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4 text-slate-500" />
                  {article.views.toLocaleString()} Reads
                </span>
                <span className="bg-slate-800/90 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">
                  Tier: {article.difficulty}
                </span>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
            <img
              src={article.image}
              alt={article.title}
              className="w-full max-h-[440px] object-cover object-center"
            />
            {article.imageCaption && (
              <div className="p-3 bg-[#090D17] text-xs text-slate-400 text-center border-t border-slate-800 font-mono-num">
                {article.imageCaption}
              </div>
            )}
          </div>

          {/* Executive Summary Takeaways */}
          <div className="bg-gradient-to-r from-amber-950/20 via-[#101726] to-[#101726] border border-amber-500/30 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              Executive Quantitative Summary
            </div>
            <ul className="space-y-2 text-sm text-slate-300">
              {article.summary.map((sum, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></span>
                  <span>{sum}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive Trade Setup Component (If Available) */}
          {article.tradeSetup && (
            <div className="bg-gradient-to-br from-[#0C1220] to-[#111A2E] border border-emerald-500/40 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                  <h3 className="font-bold text-white text-base">
                    SMTrading Live Strategy Blueprint: {article.tradeSetup.asset}
                  </h3>
                </div>

                <span
                  className={`px-3 py-1 rounded-md text-xs font-mono-num font-bold ${
                    article.tradeSetup.direction === 'LONG'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : article.tradeSetup.direction === 'SHORT'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {article.tradeSetup.direction} ({article.tradeSetup.timeframe})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#080B12] p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Entry Zone</span>
                  <span className="text-sm font-bold text-white font-mono-num">{article.tradeSetup.entryZone}</span>
                </div>

                <div className="bg-[#080B12] p-3 rounded-lg border border-rose-900/40">
                  <span className="text-[11px] text-rose-400 block">Stop Loss Invalidation</span>
                  <span className="text-sm font-bold text-rose-300 font-mono-num">{article.tradeSetup.stopLoss}</span>
                </div>

                <div className="bg-[#080B12] p-3 rounded-lg border border-emerald-900/40">
                  <span className="text-[11px] text-emerald-400 block">Target 1 / Target 2</span>
                  <span className="text-sm font-bold text-emerald-300 font-mono-num">{article.tradeSetup.takeProfit1}</span>
                </div>

                <div className="bg-[#080B12] p-3 rounded-lg border border-amber-900/40">
                  <span className="text-[11px] text-amber-400 block">Risk : Reward</span>
                  <span className="text-sm font-bold text-amber-300 font-mono-num">{article.tradeSetup.riskReward}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-400">
                <span><strong>Catalyst:</strong> {article.tradeSetup.keyCatalyst}</span>
                <button
                  onClick={() => onOpenCalculatorWithSetup(article.tradeSetup!)}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Load into Risk Calculator
                </button>
              </div>
            </div>
          )}

          {/* Deep Dive Article Content */}
          <div className={`space-y-6 text-slate-200 ${fontSize === 'large' ? 'text-lg leading-relaxed' : 'text-base leading-relaxed'}`}>
            {article.content.map((sec, idx) => (
              <section key={sec.sectionId || idx} className="space-y-4">
                <h2 className="font-bold text-xl sm:text-2xl text-white pt-3 border-t border-slate-800/80">
                  {sec.sectionTitle}
                </h2>

                {sec.paragraphs.map((p, pIdx) => (
                  <p key={pIdx} className="text-slate-300 leading-relaxed font-light">
                    {p}
                  </p>
                ))}

                {sec.callout && (
                  <div className={`p-4 rounded-xl border ${
                    sec.callout.type === 'alpha'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : sec.callout.type === 'warning'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      : sec.callout.type === 'stat'
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  }`}>
                    <h4 className="font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {sec.callout.title}
                    </h4>
                    <p className="text-sm text-slate-200">{sec.callout.text}</p>
                  </div>
                )}

                {sec.codeBlock && (
                  <div className="bg-[#06080E] border border-slate-800 rounded-xl overflow-hidden my-4 font-mono-num text-xs">
                    <div className="bg-[#090D17] px-4 py-2 flex items-center justify-between border-b border-slate-800 text-slate-400">
                      <span>{sec.codeBlock.language.toUpperCase()} ALGORITHM</span>
                      <button
                        onClick={() => handleCopyCode(sec.codeBlock!.code, idx)}
                        className="flex items-center gap-1 text-slate-400 hover:text-white text-[11px]"
                      >
                        {copiedCodeIndex === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Code
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-amber-200 leading-relaxed">
                      <code>{sec.codeBlock.code}</code>
                    </pre>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Tags */}
          <div className="pt-6 border-t border-slate-800 flex flex-wrap gap-2">
            {article.tags.map(tag => (
              <span key={tag} className="text-xs bg-slate-900 text-slate-400 px-3 py-1 rounded-md border border-slate-800">
                #{tag}
              </span>
            ))}
          </div>

          {/* Reader Sentiment Voting Box */}
          <div className="bg-[#090D17] border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Community Strategy Sentiment: What's your bias on this setup?
            </h3>

            {/* Voting Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono-num font-semibold">
                <span className="text-emerald-400">{bullishPercent}% Bullish ({bullishCount})</span>
                <span className="text-rose-400">{100 - bullishPercent}% Bearish ({bearishCount})</span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                <div style={{ width: `${bullishPercent}%` }} className="bg-emerald-500 transition-all duration-500"></div>
                <div style={{ width: `${100 - bullishPercent}%` }} className="bg-rose-500 transition-all duration-500"></div>
              </div>
            </div>

            {/* Vote Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleVote('BULLISH')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  userVote === 'BULLISH'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                Vote Bullish
              </button>

              <button
                onClick={() => handleVote('BEARISH')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  userVote === 'BEARISH'
                    ? 'bg-rose-500 text-slate-950 border-rose-400 shadow-md'
                    : 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/60'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                Vote Bearish
              </button>
            </div>
          </div>

          {/* Interactive Comments & Discussions */}
          <div className="space-y-6 pt-4 border-t border-slate-800">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              Trader Discussion ({comments.length})
            </h3>

            {/* Post comment form */}
            <form onSubmit={handleAddComment} className="bg-[#090D17] border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Your Name & Prop Firm / Desk (e.g. Alex M., Futures Trader)"
                  value={newCommentName}
                  onChange={(e) => setNewCommentName(e.target.value)}
                  className="bg-[#070A10] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Position Bias:</span>
                  {(['BULLISH', 'NEUTRAL', 'BEARISH'] as const).map(b => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setNewCommentSentiment(b)}
                      className={`text-xs px-2.5 py-1 rounded-md font-mono-num font-semibold transition-all ${
                        newCommentSentiment === b
                          ? b === 'BULLISH'
                            ? 'bg-emerald-500 text-slate-950'
                            : b === 'BEARISH'
                            ? 'bg-rose-500 text-slate-950'
                            : 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="Share your quantitative perspective, order book observations, or risk questions..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full bg-[#070A10] border border-slate-700 rounded-lg p-3 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
              ></textarea>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Post Discussion Note
                </button>
              </div>
            </form>

            {/* Comments list */}
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="bg-[#090D17] border border-slate-800/80 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{c.authorName}</span>
                      {c.authorBadge && (
                        <span className="bg-amber-500/10 text-amber-300 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30">
                          {c.authorBadge}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono-num font-bold px-1.5 py-0.5 rounded uppercase ${
                          c.sentiment === 'BULLISH'
                            ? 'text-emerald-400 bg-emerald-950/60'
                            : c.sentiment === 'BEARISH'
                            ? 'text-rose-400 bg-rose-950/60'
                            : 'text-amber-300 bg-amber-950/60'
                        }`}
                      >
                        {c.sentiment}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono-num">{c.date}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{c.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Related Articles Footer */}
          {relatedArticles.length > 0 && (
            <div className="pt-8 border-t border-slate-800 space-y-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                Related Research Papers & Setups
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedArticles.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => onSelectArticle(rel)}
                    className="p-4 bg-[#090D17] hover:bg-slate-800/50 border border-slate-800 rounded-xl cursor-pointer transition-all group space-y-2"
                  >
                    <span className="text-[10px] text-amber-400 font-semibold">{rel.category}</span>
                    <h4 className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                      {rel.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono-num">
                      <Clock className="w-3 h-3" /> {rel.readTime}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
