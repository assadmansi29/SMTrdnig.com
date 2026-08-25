import React, { useState } from 'react';
import { X, LineChart, Layers, Eye, TrendingUp, TrendingDown, RefreshCw, Crosshair, BarChart3 } from 'lucide-react';

interface ChartSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  label?: string;
}

const SAMPLE_CANDLES: Candle[] = [
  { time: '09:30', open: 5890, high: 5902, low: 5885, close: 5900, volume: 1420 },
  { time: '10:00', open: 5900, high: 5914, low: 5895, close: 5910, volume: 1950, label: 'Liquidity Sweep' },
  { time: '10:30', open: 5910, high: 5912, low: 5888, close: 5892, volume: 2400 },
  { time: '11:00', open: 5892, high: 5898, low: 5880, close: 5885, volume: 3100, label: 'Iceberg Absorption' },
  { time: '11:30', open: 5885, high: 5905, low: 5882, close: 5902, volume: 2800 },
  { time: '12:00', open: 5902, high: 5922, low: 5900, close: 5918, volume: 2100 },
  { time: '12:30', open: 5918, high: 5930, low: 5915, close: 5928, volume: 1800 },
  { time: '13:00', open: 5928, high: 5945, low: 5924, close: 5942, volume: 3400, label: 'Breakout Expansion' },
  { time: '13:30', open: 5942, high: 5954, low: 5938, close: 5948, volume: 2900 },
  { time: '14:00', open: 5948, high: 5962, low: 5944, close: 5958, volume: 3800 },
  { time: '14:30', open: 5958, high: 5970, low: 5952, close: 5965, volume: 4100 },
  { time: '15:00', open: 5965, high: 5975, low: 5960, close: 5972, volume: 3600, label: 'Target 2 Met' },
];

export const ChartSimulatorModal: React.FC<ChartSimulatorModalProps> = ({ isOpen, onClose }) => {
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [showOrderBlocks, setShowOrderBlocks] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState<'5M' | '15M' | '1H' | '4H' | '1D'>('15M');
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(SAMPLE_CANDLES[SAMPLE_CANDLES.length - 1]);

  if (!isOpen) return null;

  // Chart calculation parameters
  const minPrice = 5875;
  const maxPrice = 5985;
  const priceRange = maxPrice - minPrice;
  const chartHeight = 280;
  const chartWidth = 620;

  const getY = (price: number) => {
    return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  const candleSpacing = chartWidth / SAMPLE_CANDLES.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0D121F] border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#090D17]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">SMTrading Institutional Chart Studio</h3>
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono-num font-bold px-1.5 py-0.5 rounded border border-cyan-500/30">
                  ES FUTURES
                </span>
              </div>
              <p className="text-xs text-slate-400">Algorithmic Order Flow & Price Action Pattern Simulator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-2.5 bg-[#0B0F19] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Timeframes */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {(['5M', '15M', '1H', '4H', '1D'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-2 py-0.5 rounded text-xs font-semibold font-mono-num transition-all ${
                  activeTimeframe === tf
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSMA(!showSMA)}
              className={`px-2.5 py-1 rounded text-xs font-mono-num border transition-all ${
                showSMA
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              SMA 20
            </button>

            <button
              onClick={() => setShowEMA(!showEMA)}
              className={`px-2.5 py-1 rounded text-xs font-mono-num border transition-all ${
                showEMA
                  ? 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              EMA 50
            </button>

            <button
              onClick={() => setShowOrderBlocks(!showOrderBlocks)}
              className={`px-2.5 py-1 rounded text-xs font-mono-num border transition-all ${
                showOrderBlocks
                  ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              Order Blocks
            </button>

            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2.5 py-1 rounded text-xs font-mono-num border transition-all ${
                showVolume
                  ? 'bg-purple-400/20 text-purple-300 border-purple-400/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              Volume Profile
            </button>
          </div>
        </div>

        {/* Dynamic Candlestick Info Bar */}
        {hoveredCandle && (
          <div className="px-6 py-2 bg-[#080B12] border-b border-slate-800/80 text-[11px] font-mono-num flex flex-wrap items-center gap-4 text-slate-400">
            <span>Time: <strong className="text-slate-200">{hoveredCandle.time}</strong></span>
            <span>O: <strong className="text-slate-200">{hoveredCandle.open}</strong></span>
            <span>H: <strong className="text-emerald-400">{hoveredCandle.high}</strong></span>
            <span>L: <strong className="text-rose-400">{hoveredCandle.low}</strong></span>
            <span>C: <strong className="text-amber-300">{hoveredCandle.close}</strong></span>
            <span>Vol: <strong className="text-slate-200">{hoveredCandle.volume.toLocaleString()}</strong></span>
            {hoveredCandle.label && (
              <span className="bg-amber-400/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30">
                ⭐ {hoveredCandle.label}
              </span>
            )}
          </div>
        )}

        {/* SVG Interactive Candlestick Canvas */}
        <div className="p-6 bg-[#080C14] relative select-none">
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight + (showVolume ? 60 : 0)}`}
              className="w-full h-[340px] overflow-visible"
            >
              {/* Background Grid Lines */}
              {[5880, 5900, 5920, 5940, 5960].map((level) => {
                const y = getY(level);
                return (
                  <g key={level}>
                    <line
                      x1="0"
                      y1={y}
                      x2={chartWidth}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={chartWidth - 5}
                      y={y - 4}
                      fill="#64748b"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="JetBrains Mono"
                    >
                      {level}.00
                    </text>
                  </g>
                );
              })}

              {/* Institutional Order Block Zone */}
              {showOrderBlocks && (
                <g>
                  <rect
                    x="0"
                    y={getY(5895)}
                    width={chartWidth}
                    height={getY(5880) - getY(5895)}
                    fill="rgba(16, 185, 129, 0.08)"
                    stroke="rgba(16, 185, 129, 0.3)"
                    strokeDasharray="2 2"
                  />
                  <text
                    x="10"
                    y={getY(5883)}
                    fill="#34d399"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono"
                  >
                    Institutional Demand Block (Liquidity Sieve)
                  </text>
                </g>
              )}

              {/* Candles */}
              {SAMPLE_CANDLES.map((c, i) => {
                const isBullish = c.close >= c.open;
                const x = i * candleSpacing + candleSpacing / 2;
                const yOpen = getY(c.open);
                const yClose = getY(c.close);
                const yHigh = getY(c.high);
                const yLow = getY(c.low);

                const topY = Math.min(yOpen, yClose);
                const bodyHeight = Math.max(Math.abs(yClose - yOpen), 3);
                const color = isBullish ? '#10b981' : '#f43f5e';

                return (
                  <g
                    key={c.time}
                    onMouseEnter={() => setHoveredCandle(c)}
                    className="cursor-pointer group"
                  >
                    {/* Hover column backdrop */}
                    <rect
                      x={x - candleSpacing / 2}
                      y="0"
                      width={candleSpacing}
                      height={chartHeight}
                      fill="transparent"
                      className="hover:fill-slate-800/30"
                    />

                    {/* Wick */}
                    <line
                      x1={x}
                      y1={yHigh}
                      x2={x}
                      y2={yLow}
                      stroke={color}
                      strokeWidth="1.5"
                    />

                    {/* Candle Body */}
                    <rect
                      x={x - 8}
                      y={topY}
                      width={16}
                      height={bodyHeight}
                      fill={color}
                      rx="1"
                    />

                    {/* Volume Bar */}
                    {showVolume && (
                      <rect
                        x={x - 6}
                        y={chartHeight + 50 - (c.volume / 4500) * 45}
                        width={12}
                        height={(c.volume / 4500) * 45}
                        fill={isBullish ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}
                        rx="1"
                      />
                    )}

                    {/* Annotation Badge */}
                    {c.label && (
                      <g>
                        <circle cx={x} cy={yHigh - 12} r="3" fill="#f59e0b" />
                        <line x1={x} y1={yHigh - 9} x2={x} y2={yHigh} stroke="#f59e0b" strokeWidth="1" />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Moving average overlays */}
              {showSMA && (
                <path
                  d="M 25 210 Q 150 200, 280 160 T 580 50"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  opacity="0.85"
                />
              )}

              {showEMA && (
                <path
                  d="M 25 220 Q 160 215, 300 175 T 580 75"
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="2"
                  opacity="0.85"
                />
              )}
            </svg>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#090D17] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> SMA 20 (Trend Direction)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> EMA 50 (Dynamic Support)
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
          >
            Close Chart View
          </button>
        </div>
      </div>
    </div>
  );
};
