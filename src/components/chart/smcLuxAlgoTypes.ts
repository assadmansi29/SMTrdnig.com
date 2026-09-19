export interface SmcLuxAlgoSettings {
  enabled: boolean;
  swingLength: number; // 3 to 20 (default: 5)
  showStructure: boolean; // BOS and CHoCH
  showBos: boolean;
  showChoch: boolean;
  showSwingLabels: boolean; // HH, LH, HL, LL
  showStrongWeak: boolean; // Strong High / Low, Weak High / Low
  showOrderBlocks: boolean; // OB+ and OB-
  showMitigatedOB: boolean;
  maxOrderBlocks: number; // 2 to 10
  showFvg: boolean; // Fair Value Gaps
  showMitigatedFvg: boolean;
  maxFvg: number; // 2 to 10
  showLiquidity: boolean; // Equal Highs (EQH) & Equal Lows (EQL)
  liquidityThresholdPct: number; // 0.05% to 0.2%
  showPremiumDiscount: boolean; // Equilibrium 50%, Premium & Discount zones
  bullishColor: string; // Default: #10B981
  bearishColor: string; // Default: #EF4444
  fvgBullishColor: string; // Default: #06B6D4
  fvgBearishColor: string; // Default: #F59E0B
}

export const DEFAULT_SMC_SETTINGS: SmcLuxAlgoSettings = {
  enabled: true,
  swingLength: 5,
  showStructure: true,
  showBos: true,
  showChoch: true,
  showSwingLabels: true,
  showStrongWeak: true,
  showOrderBlocks: true,
  showMitigatedOB: false,
  maxOrderBlocks: 5,
  showFvg: true,
  showMitigatedFvg: false,
  maxFvg: 5,
  showLiquidity: true,
  liquidityThresholdPct: 0.08,
  showPremiumDiscount: true,
  bullishColor: '#10B981',
  bearishColor: '#EF4444',
  fvgBullishColor: '#06B6D4',
  fvgBearishColor: '#F59E0B',
};

export type SmcStructureType = 'bos' | 'choch';
export type SmcDirection = 'bullish' | 'bearish';
export type SmcPivotType = 'HH' | 'LH' | 'HL' | 'LL';

export interface SmcStructureLine {
  id: string;
  type: SmcStructureType;
  direction: SmcDirection;
  price: number;
  startTime: number;
  endTime: number;
  startIndex: number;
  endIndex: number;
  label: string; // '+BOS', '-BOS', '+CHoCH', '-CHoCH'
}

export interface SmcOrderBlock {
  id: string;
  direction: SmcDirection;
  highPrice: number;
  lowPrice: number;
  startTime: number;
  endTime: number;
  startIndex: number;
  endIndex: number;
  mitigated: boolean;
  mitigatedTime?: number;
  label: string; // '+OB' or '-OB'
}

export interface SmcFvg {
  id: string;
  direction: SmcDirection;
  topPrice: number;
  bottomPrice: number;
  startTime: number;
  endTime: number;
  startIndex: number;
  endIndex: number;
  mitigated: boolean;
  mitigatedTime?: number;
  label: string; // '+FVG' or '-FVG'
}

export interface SmcSwingPivot {
  id: string;
  type: SmcPivotType;
  isHigh: boolean;
  price: number;
  time: number;
  index: number;
  isStrong?: boolean;
  isWeak?: boolean;
  strongWeakLabel?: string; // 'Strong Low', 'Weak High', etc.
}

export interface SmcLiquidityLevel {
  id: string;
  type: 'EQH' | 'EQL';
  price: number;
  startTime: number;
  endTime: number;
  startIndex: number;
  endIndex: number;
  label: string; // 'EQH (BSL)' or 'EQL (SSL)'
}

export interface SmcPremiumDiscount {
  highPrice: number;
  lowPrice: number;
  equilibriumPrice: number;
  startTime: number;
  endTime: number;
}

export interface SmcAnalysisResult {
  trend: SmcDirection;
  structures: SmcStructureLine[];
  orderBlocks: SmcOrderBlock[];
  fvgs: SmcFvg[];
  pivots: SmcSwingPivot[];
  liquidity: SmcLiquidityLevel[];
  premiumDiscount: SmcPremiumDiscount | null;
  lastSignal?: {
    type: string;
    direction: SmcDirection;
    price: number;
    time: number;
  };
}
