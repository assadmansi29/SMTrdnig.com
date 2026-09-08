import {
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  Time,
  SeriesAttachedParameter,
} from 'lightweight-charts';
import { SmcLuxAlgoSettings, SmcAnalysisResult } from './smcLuxAlgoTypes';
import { CandleData } from './smcLuxAlgoCalculator';
import { timeToLogicalIndex } from './drawingDirectionEnhancer';

class SmcLuxAlgoRenderer implements IPrimitivePaneRenderer {
  private _primitive: SmcLuxAlgoSeriesPrimitive;

  constructor(primitive: SmcLuxAlgoSeriesPrimitive) {
    this._primitive = primitive;
  }

  draw(target: any) {
    if (typeof target?.useBitmapCoordinateSpace === 'function') {
      target.useBitmapCoordinateSpace((scope: any) => {
        this.drawImpl(scope);
      });
    } else if (typeof target?.useMediaCoordinateSpace === 'function') {
      target.useMediaCoordinateSpace((scope: any) => {
        this.drawImpl(scope);
      });
    }
  }

  private drawImpl(scope: any) {
    const ctx = scope.context as CanvasRenderingContext2D;
    if (!ctx) return;

    const pr = scope.horizontalPixelRatio || window.devicePixelRatio || 1;
    const mediaWidth = scope.mediaSize.width;
    const mediaHeight = scope.mediaSize.height;

    const chart = this._primitive.getChart();
    const series = this._primitive.getSeries();
    const settings = this._primitive.getSettings();
    const data = this._primitive.getData();
    const candles = this._primitive.getCandles();

    if (!chart || !series || !settings.enabled || !data) return;

    const timeScale = chart.timeScale();
    const latestCandleTime = candles.length > 0 ? candles[candles.length - 1].time : 0;

    // Coordinate helper: price to pixel Y (in bitmap coordinates)
    const priceToY = (price: number): number | null => {
      const y = series.priceToCoordinate(price);
      if (y === null || y === undefined || isNaN(y)) return null;
      return y * pr;
    };

    // Coordinate helper: time to pixel X (in bitmap coordinates)
    const timeToX = (time: number): number | null => {
      let x = timeScale.timeToCoordinate(time as any);
      if (x !== null && x !== undefined && !isNaN(x)) {
        return x * pr;
      }
      if (candles.length > 0) {
        const logicalIdx = timeToLogicalIndex(time, candles);
        const lx = timeScale.logicalToCoordinate(logicalIdx as any);
        if (lx !== null && lx !== undefined && !isNaN(lx)) {
          return lx * pr;
        }
      }
      return null;
    };

    ctx.save();

    // -------------------------------------------------------------------------
    // 1. Premium & Discount Zones (50% Equilibrium)
    // -------------------------------------------------------------------------
    if (settings.showPremiumDiscount && data.premiumDiscount) {
      const pd = data.premiumDiscount;
      const yHigh = priceToY(pd.highPrice);
      const yLow = priceToY(pd.lowPrice);
      const yEq = priceToY(pd.equilibriumPrice);

      let x1 = timeToX(pd.startTime);
      if (x1 === null) x1 = 0;
      const x2 = mediaWidth * pr;

      if (yHigh !== null && yLow !== null && yEq !== null && x2 > x1) {
        // Premium Zone (above 50% to high) - subtle bearish tint
        ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
        ctx.fillRect(x1, Math.min(yHigh, yEq), x2 - x1, Math.abs(yEq - yHigh));

        // Discount Zone (below 50% to low) - subtle bullish tint
        ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
        ctx.fillRect(x1, Math.min(yEq, yLow), x2 - x1, Math.abs(yLow - yEq));

        // Equilibrium 50% middle line
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.lineWidth = 1 * pr;
        ctx.setLineDash([4 * pr, 4 * pr]);
        ctx.beginPath();
        ctx.moveTo(x1, yEq);
        ctx.lineTo(x2, yEq);
        ctx.stroke();

        // Label: EQ 50.0%
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
        ctx.font = `bold ${Math.round(9 * pr)}px monospace`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`EQ 50% (${pd.equilibriumPrice.toFixed(2)})`, x2 - 8 * pr, yEq - 3 * pr);
      }
    }

    // -------------------------------------------------------------------------
    // 2. Order Blocks (OB+ & OB-)
    // -------------------------------------------------------------------------
    if (settings.showOrderBlocks && data.orderBlocks.length > 0) {
      for (const ob of data.orderBlocks) {
        if (!settings.showMitigatedOB && ob.mitigated) continue;

        const yTop = priceToY(ob.highPrice);
        const yBottom = priceToY(ob.lowPrice);
        if (yTop === null || yBottom === null) continue;

        let xStart = timeToX(ob.startTime);
        if (xStart === null) continue;

        let xEnd = timeToX(ob.endTime);
        if (xEnd === null || !ob.mitigated || ob.endTime >= latestCandleTime) {
          xEnd = mediaWidth * pr;
        }

        const boxW = Math.max(8 * pr, xEnd - xStart);
        const boxH = Math.max(3 * pr, Math.abs(yBottom - yTop));
        const boxY = Math.min(yTop, yBottom);

        const isBull = ob.direction === 'bullish';
        const color = isBull ? settings.bullishColor : settings.bearishColor;
        const opacity = ob.mitigated ? 0.08 : 0.18;

        // Box Fill
        ctx.fillStyle = isBull
          ? `rgba(16, 185, 129, ${opacity})`
          : `rgba(239, 68, 68, ${opacity})`;
        ctx.fillRect(xStart, boxY, boxW, boxH);

        // Box Border
        ctx.strokeStyle = ob.mitigated ? 'rgba(148, 163, 184, 0.3)' : color;
        ctx.lineWidth = (ob.mitigated ? 1 : 1.25) * pr;
        if (ob.mitigated) {
          ctx.setLineDash([3 * pr, 3 * pr]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.strokeRect(xStart, boxY, boxW, boxH);

        // Label Badge (+OB or -OB)
        ctx.setLineDash([]);
        const labelText = ob.mitigated
          ? `${ob.label} (Mitigated)`
          : isBull
          ? '+OB (Bullish)'
          : '-OB (Bearish)';

        ctx.font = `bold ${Math.round(9 * pr)}px monospace`;
        const textMetrics = ctx.measureText(labelText);
        const badgeW = textMetrics.width + 8 * pr;
        const badgeH = 13 * pr;
        const badgeX = xStart + 4 * pr;
        const badgeY = isBull ? boxY + boxH - badgeH - 2 * pr : boxY + 2 * pr;

        // Pill background
        ctx.fillStyle = isBull ? 'rgba(6, 78, 59, 0.85)' : 'rgba(127, 29, 29, 0.85)';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3 * pr);
        ctx.fill();

        ctx.strokeStyle = isBull ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1 * pr;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, badgeX + 4 * pr, badgeY + badgeH / 2);
      }
    }

    // -------------------------------------------------------------------------
    // 3. Fair Value Gaps (FVG+ & FVG-)
    // -------------------------------------------------------------------------
    if (settings.showFvg && data.fvgs.length > 0) {
      for (const fvg of data.fvgs) {
        if (!settings.showMitigatedFvg && fvg.mitigated) continue;

        const yTop = priceToY(fvg.topPrice);
        const yBottom = priceToY(fvg.bottomPrice);
        if (yTop === null || yBottom === null) continue;

        let xStart = timeToX(fvg.startTime);
        if (xStart === null) continue;

        let xEnd = timeToX(fvg.endTime);
        if (xEnd === null || !fvg.mitigated || fvg.endTime >= latestCandleTime) {
          xEnd = mediaWidth * pr;
        }

        const boxW = Math.max(6 * pr, xEnd - xStart);
        const boxH = Math.max(2 * pr, Math.abs(yBottom - yTop));
        const boxY = Math.min(yTop, yBottom);

        const isBull = fvg.direction === 'bullish';
        const strokeColor = isBull ? settings.fvgBullishColor : settings.fvgBearishColor;
        const fillColor = isBull ? 'rgba(6, 182, 212, 0.12)' : 'rgba(245, 158, 11, 0.12)';

        // Fill
        ctx.fillStyle = fillColor;
        ctx.fillRect(xStart, boxY, boxW, boxH);

        // Border (dashed)
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1 * pr;
        ctx.setLineDash([3 * pr, 3 * pr]);
        ctx.strokeRect(xStart, boxY, boxW, boxH);

        // Text tag
        ctx.setLineDash([]);
        ctx.font = `bold ${Math.round(8.5 * pr)}px monospace`;
        ctx.fillStyle = strokeColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(fvg.label, xStart + 4 * pr, boxY + boxH / 2);
      }
    }

    // -------------------------------------------------------------------------
    // 4. Market Structure Lines (BOS & CHoCH)
    // -------------------------------------------------------------------------
    if (settings.showStructure && data.structures.length > 0) {
      for (const st of data.structures) {
        if (st.type === 'bos' && !settings.showBos) continue;
        if (st.type === 'choch' && !settings.showChoch) continue;

        const y = priceToY(st.price);
        if (y === null) continue;

        const xStart = timeToX(st.startTime);
        const xEnd = timeToX(st.endTime);
        if (xStart === null || xEnd === null) continue;

        const isBull = st.direction === 'bullish';
        const color = isBull ? settings.bullishColor : settings.bearishColor;
        const isChoch = st.type === 'choch';

        // Line
        ctx.strokeStyle = color;
        ctx.lineWidth = (isChoch ? 1.75 : 1.25) * pr;
        if (isChoch) {
          ctx.setLineDash([5 * pr, 3 * pr]);
        } else {
          ctx.setLineDash([3 * pr, 3 * pr]);
        }
        ctx.beginPath();
        ctx.moveTo(xStart, y);
        ctx.lineTo(xEnd, y);
        ctx.stroke();

        // Label Pill
        ctx.setLineDash([]);
        const pillText = st.label;
        ctx.font = `bold ${Math.round(9 * pr)}px monospace`;
        const textMetrics = ctx.measureText(pillText);
        const pillW = textMetrics.width + 10 * pr;
        const pillH = 14 * pr;
        const midX = (xStart + xEnd) / 2;
        const pillX = midX - pillW / 2;
        const pillY = y - pillH / 2;

        ctx.fillStyle = isBull ? '#064E3B' : '#7F1D1D';
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 4 * pr);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 1 * pr;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pillText, midX, y);
      }
    }

    // -------------------------------------------------------------------------
    // 5. Swing Pivot Labels (HH, LH, HL, LL & Strong/Weak)
    // -------------------------------------------------------------------------
    if (settings.showSwingLabels && data.pivots.length > 0) {
      for (const p of data.pivots) {
        const y = priceToY(p.price);
        const x = timeToX(p.time);
        if (x === null || y === null) continue;

        const isHigh = p.isHigh;
        const label = p.type;
        const isBullishPivot = p.type === 'HH' || p.type === 'HL';
        const textColor = isBullishPivot ? '#34D399' : '#F87171';

        ctx.font = `bold ${Math.round(8.5 * pr)}px monospace`;
        const metrics = ctx.measureText(label);
        const tagW = metrics.width + 6 * pr;
        const tagH = 12 * pr;
        const tagX = x - tagW / 2;
        const tagY = isHigh ? y - tagH - 6 * pr : y + 6 * pr;

        // Subtle background pill
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.beginPath();
        ctx.roundRect(tagX, tagY, tagW, tagH, 3 * pr);
        ctx.fill();

        ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
        ctx.lineWidth = 1 * pr;
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, tagY + tagH / 2);

        // Strong Low / Strong High Marker
        if (settings.showStrongWeak && p.isStrong && p.strongWeakLabel) {
          const swText = p.strongWeakLabel;
          ctx.font = `bold ${Math.round(8 * pr)}px monospace`;
          const swMetrics = ctx.measureText(swText);
          const swW = swMetrics.width + 8 * pr;
          const swH = 13 * pr;
          const swX = x - swW / 2;
          const swY = isHigh ? tagY - swH - 2 * pr : tagY + tagH + 2 * pr;

          ctx.fillStyle = isHigh ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
          ctx.beginPath();
          ctx.roundRect(swX, swY, swW, swH, 3 * pr);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(swText, x, swY + swH / 2);
        }
      }
    }

    // -------------------------------------------------------------------------
    // 6. Liquidity (Equal Highs EQH / Equal Lows EQL)
    // -------------------------------------------------------------------------
    if (settings.showLiquidity && data.liquidity.length > 0) {
      for (const lq of data.liquidity) {
        const y = priceToY(lq.price);
        if (y === null) continue;

        const xStart = timeToX(lq.startTime);
        let xEnd = timeToX(lq.endTime);
        if (xStart === null) continue;
        if (xEnd === null) xEnd = mediaWidth * pr;

        ctx.strokeStyle = '#FBBF24'; // Amber liquidity color
        ctx.lineWidth = 1.2 * pr;
        ctx.setLineDash([2 * pr, 3 * pr]);
        ctx.beginPath();
        ctx.moveTo(xStart, y);
        ctx.lineTo(xEnd, y);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.font = `bold ${Math.round(8.5 * pr)}px monospace`;
        const textMetrics = ctx.measureText(lq.label);
        const lqW = textMetrics.width + 8 * pr;
        const lqH = 13 * pr;
        const lqX = xEnd - lqW - 4 * pr;
        const lqY = y - lqH / 2;

        ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
        ctx.beginPath();
        ctx.roundRect(lqX, lqY, lqW, lqH, 3 * pr);
        ctx.fill();

        ctx.fillStyle = '#0F172A';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lq.label, lqX + lqW / 2, y);
      }
    }

    ctx.restore();
  }
}

class SmcLuxAlgoPaneView implements IPrimitivePaneView {
  private _renderer: SmcLuxAlgoRenderer;

  constructor(primitive: SmcLuxAlgoSeriesPrimitive) {
    this._renderer = new SmcLuxAlgoRenderer(primitive);
  }

  zOrder(): 'bottom' | 'normal' | 'top' {
    return 'normal';
  }

  renderer(): IPrimitivePaneRenderer {
    return this._renderer;
  }
}

/**
 * Lightweight Charts Series Primitive for LuxAlgo Smart Money Concepts (SMC)
 */
export class SmcLuxAlgoSeriesPrimitive implements ISeriesPrimitive<Time> {
  private _chart: any = null;
  private _series: any = null;
  private _requestUpdate: (() => void) | null = null;
  private _paneView: SmcLuxAlgoPaneView;
  private _settings: SmcLuxAlgoSettings;
  private _data: SmcAnalysisResult | null = null;
  private _candles: CandleData[] = [];

  constructor(settings: SmcLuxAlgoSettings) {
    this._settings = { ...settings };
    this._paneView = new SmcLuxAlgoPaneView(this);
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this._chart = param.chart;
    this._series = param.series;
    this._requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  autoscaleInfo() {
    // Return null so SMC indicator never causes the chart price scale to jump or zoom
    return null;
  }

  updateAllViews(): void {}

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView];
  }

  setData(data: SmcAnalysisResult | null, candles: CandleData[]) {
    this._data = data;
    this._candles = candles;
    this._requestUpdate?.();
  }

  setSettings(settings: SmcLuxAlgoSettings) {
    this._settings = { ...settings };
    this._requestUpdate?.();
  }

  getChart() {
    return this._chart;
  }

  getSeries() {
    return this._series;
  }

  getSettings() {
    return this._settings;
  }

  getData() {
    return this._data;
  }

  getCandles() {
    return this._candles;
  }
}
