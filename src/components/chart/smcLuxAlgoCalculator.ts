import {
  SmcLuxAlgoSettings,
  SmcAnalysisResult,
  SmcDirection,
  SmcStructureLine,
  SmcOrderBlock,
  SmcFvg,
  SmcSwingPivot,
  SmcLiquidityLevel,
  SmcPremiumDiscount,
  SmcPivotType,
} from './smcLuxAlgoTypes';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * High-performance pure mathematical calculation of LuxAlgo Smart Money Concepts (SMC)
 * Computes Market Structure (BOS & CHoCH), Order Blocks (OB), Fair Value Gaps (FVG),
 * Swing Highs/Lows (HH/LH/HL/LL), Liquidity Pools (EQH/EQL), and Equilibrium (50%) Zones.
 */
export function calculateSmcLuxAlgo(
  candles: CandleData[],
  settings: SmcLuxAlgoSettings
): SmcAnalysisResult {
  const N = candles.length;
  if (N < 10) {
    return {
      trend: 'bullish',
      structures: [],
      orderBlocks: [],
      fvgs: [],
      pivots: [],
      liquidity: [],
      premiumDiscount: null,
    };
  }

  const length = Math.max(2, Math.min(20, Math.round(settings.swingLength || 5)));
  const latestTime = candles[N - 1].time;

  // 1. Detect Swing Highs and Swing Lows (Fractals)
  const rawHighs: { index: number; price: number; time: number }[] = [];
  const rawLows: { index: number; price: number; time: number }[] = [];

  for (let i = length; i < N - length; i++) {
    const curH = candles[i].high;
    const curL = candles[i].low;

    let isHigh = true;
    let isLow = true;

    for (let k = 1; k <= length; k++) {
      if (candles[i - k].high > curH || candles[i + k].high > curH) {
        isHigh = false;
      }
      if (candles[i - k].low < curL || candles[i + k].low < curL) {
        isLow = false;
      }
      if (!isHigh && !isLow) break;
    }

    if (isHigh) {
      rawHighs.push({ index: i, price: curH, time: candles[i].time });
    }
    if (isLow) {
      rawLows.push({ index: i, price: curL, time: candles[i].time });
    }
  }

  // 2. Classify Swing Pivots (HH, LH, HL, LL)
  const pivots: SmcSwingPivot[] = [];

  for (let i = 0; i < rawHighs.length; i++) {
    const curr = rawHighs[i];
    const prev = i > 0 ? rawHighs[i - 1] : null;
    let type: SmcPivotType = 'HH';
    if (prev) {
      type = curr.price >= prev.price ? 'HH' : 'LH';
    }
    pivots.push({
      id: `p-high-${curr.index}`,
      type,
      isHigh: true,
      price: curr.price,
      time: curr.time,
      index: curr.index,
    });
  }

  for (let i = 0; i < rawLows.length; i++) {
    const curr = rawLows[i];
    const prev = i > 0 ? rawLows[i - 1] : null;
    let type: SmcPivotType = 'LL';
    if (prev) {
      type = curr.price <= prev.price ? 'LL' : 'HL';
    }
    pivots.push({
      id: `p-low-${curr.index}`,
      type,
      isHigh: false,
      price: curr.price,
      time: curr.time,
      index: curr.index,
    });
  }

  pivots.sort((a, b) => a.index - b.index);

  // 3. Detect Market Structure Shifts (BOS & CHoCH) and Order Blocks (OB)
  let trend: SmcDirection = 'bullish';
  if (rawHighs.length > 1 && rawLows.length > 1) {
    const lastH = rawHighs[rawHighs.length - 1].price;
    const prevH = rawHighs[rawHighs.length - 2].price;
    const lastL = rawLows[rawLows.length - 1].price;
    const prevL = rawLows[rawLows.length - 2].price;
    if (lastH < prevH && lastL < prevL) {
      trend = 'bearish';
    }
  }

  const structures: SmcStructureLine[] = [];
  const rawOrderBlocks: SmcOrderBlock[] = [];

  // Track active unmitigated swing levels to test for break
  let activeSwingHigh: { index: number; price: number; time: number } | null = null;
  let activeSwingLow: { index: number; price: number; time: number } | null = null;

  for (let i = 0; i < N; i++) {
    const candle = candles[i];

    // Check if new confirmed swing high becomes active
    const sh = rawHighs.find((h) => h.index === i - length);
    if (sh) {
      activeSwingHigh = sh;
    }
    const sl = rawLows.find((l) => l.index === i - length);
    if (sl) {
      activeSwingLow = sl;
    }

    // Bullish Structure Break (Price crosses above active Swing High)
    if (activeSwingHigh && candle.close > activeSwingHigh.price && i > activeSwingHigh.index) {
      const isChoch = trend === 'bearish';
      const type = isChoch ? 'choch' : 'bos';
      const label = isChoch ? '+CHoCH' : '+BOS';

      structures.push({
        id: `struct-bull-${activeSwingHigh.index}-${i}`,
        type,
        direction: 'bullish',
        price: activeSwingHigh.price,
        startTime: activeSwingHigh.time,
        endTime: candle.time,
        startIndex: activeSwingHigh.index,
        endIndex: i,
        label,
      });

      // Mark preceding swing low as Strong Low
      if (activeSwingLow) {
        const pivotObj = pivots.find((p) => p.index === activeSwingLow!.index && !p.isHigh);
        if (pivotObj) {
          pivotObj.isStrong = true;
          pivotObj.strongWeakLabel = 'Strong Low';
        }
      }

      // Detect Bullish Order Block (OB+):
      // The last down candle (or lowest candle) in the displacement origin
      let obIdx = Math.max(0, i - 1);
      for (let k = i - 1; k >= Math.max(0, activeSwingHigh.index - 5); k--) {
        if (candles[k].close < candles[k].open) {
          obIdx = k;
          break;
        }
      }

      const obCandle = candles[obIdx];
      const obHigh = Math.max(obCandle.open, obCandle.close);
      const obLow = obCandle.low;

      // Check if already captured nearby
      const existing = rawOrderBlocks.find(
        (b) => b.direction === 'bullish' && Math.abs(b.startIndex - obIdx) <= 2
      );
      if (!existing) {
        rawOrderBlocks.push({
          id: `ob-bull-${obIdx}`,
          direction: 'bullish',
          highPrice: obHigh,
          lowPrice: obLow,
          startTime: obCandle.time,
          endTime: latestTime,
          startIndex: obIdx,
          endIndex: N - 1,
          mitigated: false,
          label: '+OB',
        });
      }

      if (isChoch) {
        trend = 'bullish';
      }
      activeSwingHigh = null; // Break confirmed, reset
    }

    // Bearish Structure Break (Price crosses below active Swing Low)
    if (activeSwingLow && candle.close < activeSwingLow.price && i > activeSwingLow.index) {
      const isChoch = trend === 'bullish';
      const type = isChoch ? 'choch' : 'bos';
      const label = isChoch ? '-CHoCH' : '-BOS';

      structures.push({
        id: `struct-bear-${activeSwingLow.index}-${i}`,
        type,
        direction: 'bearish',
        price: activeSwingLow.price,
        startTime: activeSwingLow.time,
        endTime: candle.time,
        startIndex: activeSwingLow.index,
        endIndex: i,
        label,
      });

      // Mark preceding swing high as Strong High
      if (activeSwingHigh) {
        const pivotObj = pivots.find((p) => p.index === activeSwingHigh!.index && p.isHigh);
        if (pivotObj) {
          pivotObj.isStrong = true;
          pivotObj.strongWeakLabel = 'Strong High';
        }
      }

      // Detect Bearish Order Block (OB-):
      // The last up candle in the displacement origin
      let obIdx = Math.max(0, i - 1);
      for (let k = i - 1; k >= Math.max(0, activeSwingLow.index - 5); k--) {
        if (candles[k].close > candles[k].open) {
          obIdx = k;
          break;
        }
      }

      const obCandle = candles[obIdx];
      const obHigh = obCandle.high;
      const obLow = Math.min(obCandle.open, obCandle.close);

      const existing = rawOrderBlocks.find(
        (b) => b.direction === 'bearish' && Math.abs(b.startIndex - obIdx) <= 2
      );
      if (!existing) {
        rawOrderBlocks.push({
          id: `ob-bear-${obIdx}`,
          direction: 'bearish',
          highPrice: obHigh,
          lowPrice: obLow,
          startTime: obCandle.time,
          endTime: latestTime,
          startIndex: obIdx,
          endIndex: N - 1,
          mitigated: false,
          label: '-OB',
        });
      }

      if (isChoch) {
        trend = 'bearish';
      }
      activeSwingLow = null; // Break confirmed, reset
    }
  }

  // 4. Track Mitigation on Order Blocks
  for (const ob of rawOrderBlocks) {
    for (let k = ob.startIndex + 1; k < N; k++) {
      const c = candles[k];
      if (ob.direction === 'bullish') {
        if (c.low < ob.lowPrice) {
          ob.mitigated = true;
          ob.endTime = c.time;
          ob.endIndex = k;
          break;
        }
      } else {
        if (c.high > ob.highPrice) {
          ob.mitigated = true;
          ob.endTime = c.time;
          ob.endIndex = k;
          break;
        }
      }
    }
  }

  // Filter Order Blocks according to settings
  const filteredOBs = rawOrderBlocks
    .filter((ob) => (settings.showMitigatedOB ? true : !ob.mitigated))
    .slice(-Math.max(2, settings.maxOrderBlocks || 5));

  // 5. Detect Fair Value Gaps (FVG)
  const rawFvgs: SmcFvg[] = [];

  for (let i = 2; i < N; i++) {
    const c0 = candles[i - 2];
    const c1 = candles[i - 1];
    const c2 = candles[i];

    // Bullish FVG (+FVG): gap between candle 0 high and candle 2 low
    if (c2.low > c0.high) {
      const gapSize = c2.low - c0.high;
      const avgBody = (Math.abs(c1.close - c1.open) + Math.abs(c2.close - c2.open)) / 2;
      if (gapSize > avgBody * 0.15) {
        const fvg: SmcFvg = {
          id: `fvg-bull-${i - 1}`,
          direction: 'bullish',
          topPrice: c2.low,
          bottomPrice: c0.high,
          startTime: c1.time,
          endTime: latestTime,
          startIndex: i - 1,
          endIndex: N - 1,
          mitigated: false,
          label: '+FVG',
        };

        // Check if filled later
        for (let k = i + 1; k < N; k++) {
          if (candles[k].low <= fvg.bottomPrice) {
            fvg.mitigated = true;
            fvg.endTime = candles[k].time;
            fvg.endIndex = k;
            break;
          }
        }

        rawFvgs.push(fvg);
      }
    }

    // Bearish FVG (-FVG): gap between candle 2 high and candle 0 low
    if (c2.high < c0.low) {
      const gapSize = c0.low - c2.high;
      const avgBody = (Math.abs(c1.close - c1.open) + Math.abs(c2.close - c2.open)) / 2;
      if (gapSize > avgBody * 0.15) {
        const fvg: SmcFvg = {
          id: `fvg-bear-${i - 1}`,
          direction: 'bearish',
          topPrice: c0.low,
          bottomPrice: c2.high,
          startTime: c1.time,
          endTime: latestTime,
          startIndex: i - 1,
          endIndex: N - 1,
          mitigated: false,
          label: '-FVG',
        };

        // Check if filled later
        for (let k = i + 1; k < N; k++) {
          if (candles[k].high >= fvg.topPrice) {
            fvg.mitigated = true;
            fvg.endTime = candles[k].time;
            fvg.endIndex = k;
            break;
          }
        }

        rawFvgs.push(fvg);
      }
    }
  }

  // Filter FVGs according to settings
  const filteredFvgs = rawFvgs
    .filter((f) => (settings.showMitigatedFvg ? true : !f.mitigated))
    .slice(-Math.max(2, settings.maxFvg || 5));

  // 6. Detect Liquidity (Equal Highs EQH / Equal Lows EQL)
  const liquidityLevels: SmcLiquidityLevel[] = [];
  const threshold = (settings.liquidityThresholdPct || 0.08) / 100;

  for (let i = 1; i < rawHighs.length; i++) {
    const h1 = rawHighs[i - 1];
    const h2 = rawHighs[i];
    if (Math.abs(h1.price - h2.price) / h1.price <= threshold && h2.index - h1.index >= 3) {
      const avgPrice = (h1.price + h2.price) / 2;
      liquidityLevels.push({
        id: `eqh-${h1.index}-${h2.index}`,
        type: 'EQH',
        price: avgPrice,
        startTime: h1.time,
        endTime: latestTime,
        startIndex: h1.index,
        endIndex: N - 1,
        label: 'EQH (Buy-Side Liquidity)',
      });
    }
  }

  for (let i = 1; i < rawLows.length; i++) {
    const l1 = rawLows[i - 1];
    const l2 = rawLows[i];
    if (Math.abs(l1.price - l2.price) / l1.price <= threshold && l2.index - l1.index >= 3) {
      const avgPrice = (l1.price + l2.price) / 2;
      liquidityLevels.push({
        id: `eql-${l1.index}-${l2.index}`,
        type: 'EQL',
        price: avgPrice,
        startTime: l1.time,
        endTime: latestTime,
        startIndex: l1.index,
        endIndex: N - 1,
        label: 'EQL (Sell-Side Liquidity)',
      });
    }
  }

  // 7. Detect Premium / Discount & Equilibrium (50%) Zone
  let premiumDiscount: SmcPremiumDiscount | null = null;
  if (rawHighs.length > 0 && rawLows.length > 0) {
    const recentHigh = rawHighs[rawHighs.length - 1];
    const recentLow = rawLows[rawLows.length - 1];
    const minStart = Math.min(recentHigh.time, recentLow.time);
    const maxHigh = recentHigh.price;
    const minLow = recentLow.price;
    if (maxHigh > minLow) {
      premiumDiscount = {
        highPrice: maxHigh,
        lowPrice: minLow,
        equilibriumPrice: (maxHigh + minLow) / 2,
        startTime: minStart,
        endTime: latestTime,
      };
    }
  }

  // Keep most recent structures (e.g. up to 10 for clarity without visual clutter)
  const recentStructures = structures.slice(-10);

  // Latest signal summary
  const lastStruct = recentStructures[recentStructures.length - 1];
  const lastSignal = lastStruct
    ? {
        type: lastStruct.label,
        direction: lastStruct.direction,
        price: lastStruct.price,
        time: lastStruct.endTime,
      }
    : undefined;

  return {
    trend,
    structures: recentStructures,
    orderBlocks: filteredOBs,
    fvgs: filteredFvgs,
    pivots: pivots.slice(-16), // Recent 16 pivots
    liquidity: liquidityLevels.slice(-4),
    premiumDiscount,
    lastSignal,
  };
}
