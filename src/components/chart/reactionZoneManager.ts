import {
  HorizontalLine,
  ToolRegistry,
  IDrawing,
  Anchor,
  DrawingStyle,
  DrawingOptions,
  Viewport,
  Point,
} from 'lightweight-charts-drawing';
import { IChartApi, IPrimitivePaneView, IPrimitivePaneRenderer } from 'lightweight-charts';
import { getTranslation, LanguageCode } from '../../locales';
import {
  CandleData,

  LineEvaluationResult,
  calculateAverageCandleRange,
  computeZoneTolerances,
  ReactionZoneSignal,



} from './reactionZoneSignalCalculator';
import {getReactionEvaluation, subscribeReactionTrades} from './reactionZoneTrades';
import { timeToLogicalIndex } from './drawingDirectionEnhancer';

export type ReactionZoneType = 'strong' | 'weak';

/**
 * Universal safe rounded rectangle renderer compatible with all Canvas contexts and webviews.
 */
function drawSafeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export interface ReactionZoneOptions extends DrawingOptions {
  type?: string;
  zoneType?: ReactionZoneType;
  showPrice?: boolean;
  showLabel?: boolean;
  labelText?: string;
  price?: number;
  locked?: boolean;
}

// Active market data cache for Reaction Zone 5m calculations
interface ReactionMarketContext {
  candles: CandleData[];
  interval: string;
  symbol: string;
  activeDrawingId: string | null;
  strategy: string;
  liveObservation: boolean;
}
const newContext = (): ReactionMarketContext => ({ candles: [], interval: '15', symbol: '', activeDrawingId: null, strategy:'default', liveObservation:false });
const defaultContext = newContext();
const chartContexts = new WeakMap<IChartApi, ReactionMarketContext>();
function contextFor(chart?: IChartApi | null): ReactionMarketContext {
  if (!chart) return defaultContext;
  let context = chartContexts.get(chart);
  if (!context) { context = newContext(); chartContexts.set(chart, context); }
  return context;
}

const activeReactionDrawings = new Set<ReactionZoneDrawing>();
subscribeReactionTrades(()=>{
  activeReactionDrawings.forEach(d=>{d.updateSignals();d.requestUpdate();});
});

/**
 * Completely clears all cached reaction zone drawings.
 */
export function clearReactionZoneDrawings(chart?: IChartApi | null): void {
  const context = contextFor(chart);
  activeReactionDrawings.forEach(d => {
    if (d.marketContext !== context) return;
    d.resetSignals();
    activeReactionDrawings.delete(d);
  });
  context.activeDrawingId = null;
}

/**
 * Updates the market data context used by Reaction Zones.
 */
export function setReactionZoneMarketData(candles: CandleData[], interval: string, symbol?: string, chart?: IChartApi | null, strategy?: string | null, liveObservation=false): void {
  const context = contextFor(chart);
  const invStr = interval ? String(interval) : context.interval;
  const symStr = symbol ? String(symbol) : context.symbol;
  const strategyKey=strategy || 'default';
  const changed = invStr !== context.interval || symStr !== context.symbol || strategyKey !== context.strategy;
  context.candles = Array.isArray(candles) ? candles : context.candles;
  context.interval = invStr;
  context.symbol = symStr;
  context.strategy = strategyKey;
  context.liveObservation = liveObservation;

  // Trigger immediate repaints on all active reaction zone drawings
  activeReactionDrawings.forEach((d) => {
    if (d.marketContext !== context) return;
    if (changed) d.resetSignals();
    (d as any)._currentChartInterval = context.interval;
    d.updateSignals();
    d.requestUpdate();
  });
}

export function getReactionZoneCandles(drawing?: ReactionZoneDrawing): CandleData[] {
  return (drawing?.marketContext || defaultContext).candles;
}

/**
 * Identifies the single reaction zone drawing that is currently active and interacting with price.
 * STRICT CRITERIA:
 * 1. ONLY the Reaction Zone line that is currently relevant to the LIVE price is active.
 * 2. If multiple zones exist, exactly ONE (the closest interacting zone) is selected.
 * 3. If price moves away from a zone, it is automatically deactivated.
 * 4. Hysteresis ensures smooth activation/deactivation without jitter or flickering.
 */
export function getActiveLiveReactionDrawing(candles: CandleData[], drawing?: ReactionZoneDrawing): ReactionZoneDrawing | null {
  const context = drawing?.marketContext || defaultContext;
  if (!candles || candles.length === 0 || activeReactionDrawings.size === 0) {
    context.activeDrawingId = null;
    return null;
  }

  const lastCandle = candles[candles.length - 1];
  const currentPrice = lastCandle.close;
  const avgRange = calculateAverageCandleRange(candles, 20);

  const candidates: {
    drawing: ReactionZoneDrawing;
    price: number;
    distance: number;
    nearThreshold: number;
  }[] = [];

  activeReactionDrawings.forEach((d) => {
    if (d.marketContext !== context) return;
    if (!d.options?.visible || !d.isValid()) return;
    const price = d.anchors?.[0]?.price;
    if (typeof price === 'number' && !isNaN(price) && price > 0) {
      // A stale wick must not keep a distant zone active after price has left.
      const dist = Math.abs(currentPrice - price);
      const tolerances = computeZoneTolerances(price, avgRange);
      candidates.push({
        drawing: d,
        price,
        distance: dist,
        nearThreshold: Math.max(tolerances.touchTolerance * 3, avgRange),
      });
    }
  });

  if (candidates.length === 0) {
    context.activeDrawingId = null;
    return null;
  }

  // Sort strictly by closest distance to live price
  candidates.sort((a, b) => a.distance - b.distance);
  const closest = candidates[0];

  // Hysteresis: if this drawing is already active, grant a 20% margin to prevent edge fluttering
  const isAlreadyActive = (closest.drawing as any).id === context.activeDrawingId;
  const threshold = isAlreadyActive ? closest.nearThreshold * 1.2 : closest.nearThreshold;

  if (closest.distance <= threshold) {
    context.activeDrawingId = (closest.drawing as any).id || null;
    return closest.drawing;
  }

  // Live price has moved away from all reaction zones -> completely deactivate
  context.activeDrawingId = null;
  return null;
}

export function getReactionZoneInterval(drawing?: ReactionZoneDrawing): string {
  if (drawing && (drawing as any)._currentChartInterval) {
    return String((drawing as any)._currentChartInterval);
  }
  return (drawing?.marketContext || defaultContext).interval;
}

/**
 * Retrieves the user's currently selected language dynamically from document/localStorage.
 */
export function getActiveLanguage(): LanguageCode {
  if (typeof document !== 'undefined') {
    const htmlLang = document.documentElement.getAttribute('lang') as LanguageCode;
    if (htmlLang === 'ar' || htmlLang === 'ru' || htmlLang === 'uk' || htmlLang === 'en') {
      return htmlLang;
    }
    try {
      const stored = localStorage.getItem('smtrading_language') as LanguageCode;
      if (stored === 'ar' || stored === 'ru' || stored === 'uk' || stored === 'en') {
        return stored;
      }
    } catch {}
  }
  return 'en';
}

/**
 * Returns the localized text for the reaction zone line according to active platform language.
 */
export function getLocalizedReactionZoneName(isStrong: boolean): string {
  const lang = getActiveLanguage();
  return getTranslation(lang, isStrong ? 'reactionZoneStrong' : 'reactionZoneWeak');
}

/**
 * Renderer for Reaction Zone horizontal lines.
 * Renders:
 * 1. High-contrast institutional horizontal line (Red for Strong, Green for Weaker).
 * 2. Left label badge (e.g. 🔴 Strong Reaction Zone / 🟢 Weaker Reaction Zone).
 * 3. Right price badge with exact numeric price level.
 * 4. Draggable visual handle cues for administrators.
 * 5. Test, Retest, and Entry Zone signals strictly on the 5-minute timeframe.
 */
class ReactionZoneRenderer implements IPrimitivePaneRenderer {
  private _drawing: ReactionZoneDrawing;

  constructor(drawing: ReactionZoneDrawing) {
    this._drawing = drawing;
  }

  draw(target: any): void {
    if (typeof target.useMediaCoordinateSpace === 'function') {
      target.useMediaCoordinateSpace((scope: any) => {
        this.renderCanvas(scope.context, scope.mediaSize.width, scope.mediaSize.height, 1);
      });
    } else if (typeof target.useBitmapCoordinateSpace === 'function') {
      target.useBitmapCoordinateSpace((scope: any) => {
        const pr = scope.horizontalPixelRatio || 1;
        this.renderCanvas(scope.context, scope.bitmapSize.width / pr, scope.bitmapSize.height / pr, pr);
      });
    }
  }

  private renderCanvas(
    ctx: CanvasRenderingContext2D,
    mediaWidth: number,
    mediaHeight: number,
    pixelRatio: number
  ): void {
    const viewport = this._drawing.getViewport();
    if (!viewport || !this._drawing.options.visible || !this._drawing.isValid()) return;

    // STRICT ISOLATION: The ReactionZoneRenderer must ONLY execute on ReactionZoneDrawing instances
    if (!this._drawing || !(this._drawing instanceof ReactionZoneDrawing)) return;
    if (this._drawing.zoneType !== 'strong' && this._drawing.zoneType !== 'weak') return;

    const anchor = this._drawing.anchors[0];
    if (!anchor || typeof anchor.price !== 'number' || isNaN(anchor.price)) return;

    const y = viewport.priceScale.priceToCoordinate(anchor.price);
    if (y === null || isNaN(y)) return;

    const isStrong = this._drawing.zoneType === 'strong';
    const color = isStrong ? '#EF4444' : '#22C55E';
    const pr = pixelRatio || 1;

    // Determine if THIS Reaction Zone is the single active zone interacting with live price
    const candles = getReactionZoneCandles(this._drawing);
    const activeDrawing = getActiveLiveReactionDrawing(candles, this._drawing);
    const isCurrentActive = activeDrawing === this._drawing;

    ctx.save();
    ctx.scale(pr, pr);

    // 1. Draw horizontal reaction line across the entire chart
    // ONLY the single active Reaction Zone line is illuminated with vibrant color and subtle glow.
    // Inactive zones are rendered in subdued, non-distracting reference mode.
    ctx.strokeStyle = color;

    if (isCurrentActive) {
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = isStrong ? 2.5 : 2.0;
      if (!isStrong) {
        ctx.setLineDash([6, 4]);
        ctx.shadowColor = 'rgba(34, 197, 94, 0.50)';
        ctx.shadowBlur = 5;
      } else {
        ctx.setLineDash([]);
        // Neon institutional glow for strong reaction level
        ctx.shadowColor = 'rgba(239, 68, 68, 0.55)';
        ctx.shadowBlur = 6;
      }
    } else {
      // Inactive zone: subdued, clean reference line with NO glow or animation
      ctx.globalAlpha = 0.38;
      ctx.lineWidth = isStrong ? 1.5 : 1.2;
      ctx.setLineDash(isStrong ? [] : [6, 4]);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(mediaWidth, y);
    ctx.stroke();

    // Reset shadow & dash for crisp typography
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.setLineDash([]);

    // 2. Format exact price clearly
    const priceNum = Number(anchor.price);
    const formattedPrice = priceNum >= 1000
      ? priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : priceNum >= 1
      ? priceNum.toFixed(2)
      : priceNum.toFixed(5);

    // 3. Small, elegant label directly ON the horizontal line:
    // "Strong Reaction Zone" for Red line, "Weak Reaction Zone" for Green line.
    const activeLang = getActiveLanguage();
    const isArabic = activeLang === 'ar';
    const zoneName = getLocalizedReactionZoneName(isStrong);

    ctx.font = isArabic
      ? 'bold 11px "Cairo", "Segoe UI", -apple-system, sans-serif'
      : '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    const nameMetrics = ctx.measureText(zoneName);
    const pillPadding = 9;
    const dotRadius = 3;
    const dotSpacing = 7;
    const pillW = nameMetrics.width + (pillPadding * 2) + (dotRadius * 2) + dotSpacing;
    const pillH = 20;

    // Position label directly ON the line, cleanly positioned past the left sidebars
    const pillX = 54;
    const pillY = y - (pillH / 2);

    // Integrated pill backdrop - directly sits on the line with deep background
    if (isCurrentActive) {
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = 'rgba(9, 14, 26, 0.98)';
      drawSafeRoundRect(ctx, pillX, pillY, pillW, pillH, 4);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Indicator dot
      const dotX = isArabic ? (pillX + pillW - pillPadding - dotRadius) : (pillX + pillPadding + dotRadius);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dotX, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      // Localized label text
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      if (isArabic) {
        ctx.textAlign = 'right';
        ctx.fillText(zoneName, pillX + pillW - pillPadding - (dotRadius * 2) - dotSpacing, y);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(zoneName, pillX + pillPadding + (dotRadius * 2) + dotSpacing, y);
      }
    } else {
      // Muted inactive zone badge
      ctx.globalAlpha = 0.50;
      ctx.fillStyle = 'rgba(9, 14, 26, 0.70)';
      drawSafeRoundRect(ctx, pillX, pillY, pillW, pillH, 4);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.0;
      ctx.stroke();

      const dotX = isArabic ? (pillX + pillW - pillPadding - dotRadius) : (pillX + pillPadding + dotRadius);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dotX, y, dotRadius - 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.textBaseline = 'middle';
      if (isArabic) {
        ctx.textAlign = 'right';
        ctx.fillText(zoneName, pillX + pillW - pillPadding - (dotRadius * 2) - dotSpacing, y);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(zoneName, pillX + pillPadding + (dotRadius * 2) + dotSpacing, y);
      }
    }

    // 4. Right Price Badge: Exact price label at chart price axis
    const priceText = formattedPrice;
    ctx.font = 'bold 11px "JetBrains Mono", Menlo, Consolas, monospace';
    const priceMetrics = ctx.measureText(priceText);
    const pricePillW = priceMetrics.width + 16;
    const pricePillH = 20;
    const pricePillX = Math.max(pillX + pillW + 10, mediaWidth - pricePillW - 8);
    const pricePillY = y - (pricePillH / 2);

    if (isCurrentActive) {
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = color;
      drawSafeRoundRect(ctx, pricePillX, pricePillY, pricePillW, pricePillH, 4);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(priceText, pricePillX + (pricePillW / 2), y);
    } else {
      ctx.globalAlpha = 0.40;
      ctx.fillStyle = color;
      drawSafeRoundRect(ctx, pricePillX, pricePillY, pricePillW, pricePillH, 4);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(priceText, pricePillX + (pricePillW / 2), y);
      ctx.globalAlpha = 1.0;
    }

    // 5. LIVE REACTION ZONE SIGNALS & RISK CONTAINMENT (20 - 35 PTS STOP LOSS)
    // State is advanced by market updates, independently of paint/visibility.
    // Only the zone currently interacting with live price may display a signal.
    const evalResult = this._drawing.signalEvaluation;
    const activeSignal = evalResult?.activeSignal;

    if (activeSignal) {
        const text = (key: Parameters<typeof getTranslation>[1]) => getTranslation(activeLang, key);
        let statusText = activeSignal.type === 'break' ? `● ${text('reactionBreak')}` : activeSignal.type === 'retest' ? `● ${text('reactionRetest')}` : activeSignal.label;
        let statusColor = '#38BDF8';
        let statusBg = 'rgba(15, 23, 42, 0.96)';

        if (activeSignal.type === 'test') {
          statusText = `● ${text('reactionTest1')}`;
          statusColor = '#38BDF8';
          statusBg = 'rgba(15, 23, 42, 0.96)';
        } else if (activeSignal.type === 'test2') {
          statusText = `● ${text('reactionTest2')}`;
          statusColor = '#F59E0B';
          statusBg = 'rgba(26, 18, 8, 0.96)';
        } else if (activeSignal.type === 'sell_rejection') {
          statusText = activeSignal.formattedSlPrice
            ? `▼ ${text('reactionSell')} (${text('reactionSlShort')}: ${activeSignal.formattedSlPrice})`
            : `▼ ${text('reactionSell')} (${text('reactionSlShort')}: 20-35 ${text('reactionPoints')})`;
          statusColor = '#EF4444';
          statusBg = 'rgba(45, 10, 18, 0.96)';
        } else if (activeSignal.type === 'buy_bounce') {
          statusText = activeSignal.formattedSlPrice
            ? `▲ ${text('reactionBuy')} (${text('reactionSlShort')}: ${activeSignal.formattedSlPrice})`
            : `▲ ${text('reactionBuy')} (${text('reactionSlShort')}: 20-35 ${text('reactionPoints')})`;
          statusColor = '#22C55E';
          statusBg = 'rgba(6, 40, 25, 0.96)';
        } else if (activeSignal.type === 'buy_breakout') {
          statusText = activeSignal.formattedSlPrice
            ? `▲ ${text('reactionBuyBreak')} (${text('reactionSlShort')}: ${activeSignal.formattedSlPrice})`
            : `▲ ${text('reactionBuyBreak')}`;
          statusColor = '#10B981';
          statusBg = 'rgba(6, 40, 25, 0.96)';
        } else if (activeSignal.type === 'sell_breakdown') {
          statusText = activeSignal.formattedSlPrice
            ? `▼ ${text('reactionSellBreak')} (${text('reactionSlShort')}: ${activeSignal.formattedSlPrice})`
            : `▼ ${text('reactionSellBreak')}`;
          statusColor = '#F43F5E';
          statusBg = 'rgba(45, 10, 18, 0.96)';
        }

        ctx.font = isArabic ? 'bold 10px "Cairo", "Segoe UI", sans-serif' : 'bold 10px "JetBrains Mono", Menlo, Consolas, sans-serif';
        ctx.direction = isArabic ? 'rtl' : 'ltr';
        const statusMetrics = ctx.measureText(statusText);
        const statusW = statusMetrics.width + 16;
        const statusH = 20;
        const statusX = pillX + pillW + 8;
        const statusY = y - (statusH / 2);

        // 5A. Active Signal Status Pill directly ON the horizontal line
        if (statusX > 0 && statusX + statusW < pricePillX - 8) {
          ctx.save();
          ctx.globalAlpha = 1.0;
          ctx.fillStyle = statusBg;
          drawSafeRoundRect(ctx, statusX, statusY, statusW, statusH, 4);
          ctx.fill();

          ctx.strokeStyle = statusColor;
          ctx.lineWidth = 1.3;
          ctx.stroke();

          ctx.fillStyle = statusColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(statusText, statusX + (statusW / 2), y);
          ctx.restore();
        }

        // 5B. Render Institutional Stop Loss (20 - 35 Points) Guideline & Badge on Chart
        const isSellSignal = activeSignal.type === 'sell_rejection' || activeSignal.type === 'sell_breakdown';
        const isBuySignal = activeSignal.type === 'buy_bounce' || activeSignal.type === 'buy_breakout';
        if (
          (isSellSignal || isBuySignal) &&
          activeSignal.slPrice &&
          typeof activeSignal.slPrice === 'number'
        ) {
          const priceScale = viewport.priceScale;
          const slY = priceScale.priceToCoordinate(activeSignal.slPrice);
          if (slY !== null && !isNaN(slY) && Math.abs(slY - y) > 2 && Math.abs(slY - y) < mediaHeight) {
            const isSell = isSellSignal;
            const slColor = isSell ? '#EF4444' : '#10B981';
            const slBg = isSell ? 'rgba(45, 10, 18, 0.96)' : 'rgba(6, 40, 25, 0.96)';

            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = slColor;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.95;
            ctx.beginPath();
            ctx.moveTo(Math.max(0, mediaWidth - 380), slY);
            ctx.lineTo(mediaWidth - 8, slY);
            ctx.stroke();
            ctx.setLineDash([]);

            // SL Badge Tag showing Stop Loss 20 - 35 points
            const slTagText = `SL (20-35 ${text('reactionPoints')}): ${activeSignal.formattedSlPrice}`;
            ctx.font = 'bold 10px "JetBrains Mono", Menlo, monospace';
            const slMetrics = ctx.measureText(slTagText);
            const slTagW = slMetrics.width + 16;
            const slTagH = 20;
            const slTagX = mediaWidth - slTagW - 10;
            const slTagY = slY - (slTagH / 2);

            ctx.globalAlpha = 1.0;
            ctx.fillStyle = slBg;
            drawSafeRoundRect(ctx, slTagX, slTagY, slTagW, slTagH, 4);
            ctx.fill();

            ctx.strokeStyle = slColor;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.fillStyle = slColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(slTagText, slTagX + (slTagW / 2), slY);
            ctx.restore();
          }
        }

        // 5C. Line-Anchored Live Interaction Node directly ON the Reaction Zone line
        // NEVER places markers on candles. The signal interaction node is anchored cleanly to the line itself.
        const timeScale = viewport.timeScale;
        const lastCandle = candles[candles.length - 1];
        let liveX = timeScale.timeToCoordinate(lastCandle.time as any);
        if (liveX === null || isNaN(liveX as number)) {
          const numericTime = typeof lastCandle.time === 'number'
            ? lastCandle.time
            : Math.floor(new Date(lastCandle.time).getTime() / 1000);
          const logicalIdx = timeToLogicalIndex(numericTime, candles);
          const lx = timeScale.logicalToCoordinate((logicalIdx ?? (candles.length - 1)) as any);
          if (lx !== null && !isNaN(lx as number)) liveX = lx;
        }

        if (
          liveX !== null &&
          !isNaN(liveX as number) &&
          (liveX as number) > 0 &&
          (liveX as number) < mediaWidth - 10
        ) {
          const cx = liveX as number;
          ctx.save();
          ctx.shadowColor = statusColor;
          ctx.shadowBlur = 8;

          // Outer pulsing halo ring anchored right on the line
          ctx.strokeStyle = statusColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, y, 5, 0, Math.PI * 2);
          ctx.stroke();

          // Inner solid core on the line
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx, y, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
    }

    // 6. Visual handles when line is selected or being dragged by Administrator
    const state = this._drawing.state;
    if (state === 'selected' || state === 'editing') {
      const handles = [
        { x: pillX + pillW + 16, y },
        { x: mediaWidth / 2, y },
        { x: pricePillX - 16, y },
      ];

      for (const h of handles) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

/**
 * Primitive Pane View for Reaction Zone drawings
 */
class ReactionZonePaneView implements IPrimitivePaneView {
  private _drawing: ReactionZoneDrawing;
  private _renderer: ReactionZoneRenderer;

  constructor(drawing: ReactionZoneDrawing) {
    this._drawing = drawing;
    this._renderer = new ReactionZoneRenderer(drawing);
  }

  zOrder(): 'bottom' | 'normal' | 'top' {
    const candles = getReactionZoneCandles(this._drawing);
    const activeDrawing = getActiveLiveReactionDrawing(candles, this._drawing);
    return activeDrawing === this._drawing ? 'top' : 'normal';
  }

  renderer(): IPrimitivePaneRenderer {
    return this._renderer;
  }
}

/**
 * ReactionZoneDrawing - Custom Drawing Class for Reaction Zones.
 * Supports:
 * - Red Strong Reaction Zone (Institutional heavy order flow)
 * - Green Weak Reaction Zone (Secondary liquidity swing)
 * - Exact price display and live draggability
 */
export class ReactionZoneDrawing extends HorizontalLine {
  public readonly zoneType: ReactionZoneType;
  private _rzOptions: ReactionZoneOptions;

  public signalEvaluation: LineEvaluationResult | null = null;

  get marketContext(): ReactionMarketContext { return contextFor(this._chart); }

  resetSignals(): void {

    this.signalEvaluation = null;
  }

  updateSignals(): void {
    const context=this.marketContext;
    this.signalEvaluation=['1','5'].includes(context.interval) ? getReactionEvaluation(context.symbol,context.strategy,this.id,context.interval) : null;
  }

  override attached(params: Parameters<HorizontalLine['attached']>[0]): void {
    super.attached(params);
    activeReactionDrawings.add(this);
    this.updateSignals();
  }

  override detached(): void {
    activeReactionDrawings.delete(this);
    this.resetSignals();
    super.detached();
  }

  constructor(
    id: string,
    anchors?: Anchor[],
    style?: Partial<DrawingStyle>,
    options?: Partial<ReactionZoneOptions>
  ) {
    const isStrong =
      options?.zoneType !== 'weak' &&
      options?.type !== 'reaction-zone-weak' &&
      style?.lineColor !== '#22c55e' &&
      style?.lineColor !== '#10b981';

    const zType: ReactionZoneType = isStrong ? 'strong' : 'weak';
    const defaultColor = isStrong ? '#EF4444' : '#22C55E';
    const defaultWidth = isStrong ? 2.5 : 2;
    const defaultLabel = isStrong ? 'Strong Reaction Zone' : 'Weak Reaction Zone';

    const mergedStyle: Partial<DrawingStyle> = {
      lineColor: style?.lineColor || defaultColor,
      lineWidth: style?.lineWidth ?? defaultWidth,
      lineDash: style?.lineDash ?? (isStrong ? [] : [6, 4]),
      labelColor: '#FFFFFF',
      ...(style || {}),
    };

    const mergedOptions: Partial<ReactionZoneOptions> = {
      showPrice: true,
      showLabel: true,
      labelText: defaultLabel,
      zoneType: zType,
      ...(options || {}),
    };

    super(id, anchors, mergedStyle, mergedOptions);
    this.zoneType = zType;
    this._rzOptions = { ...this.options, ...mergedOptions };
  }

  override paneViews(): IPrimitivePaneView[] {
    return [new ReactionZonePaneView(this)];
  }

  override computeGeometry(viewport: Viewport): any[] {
    if (!this.isValid()) return [];
    const anchor = this.anchors[0];
    if (!anchor) return [];
    const y = viewport.priceScale.priceToCoordinate(anchor.price);
    if (y === null) return [];

    return [
      {
        type: 'line',
        start: { x: 0, y },
        end: { x: viewport.width, y },
      },
    ];
  }

  override testHit(point: Point, viewport: Viewport): boolean {
    if (!this.isValid()) return false;
    // If drawing is locked (e.g. regular users / non-admins), hit test returns false
    if (this.options?.locked) return false;

    const anchor = this.anchors[0];
    if (!anchor) return false;
    const y = viewport.priceScale.priceToCoordinate(anchor.price);
    if (y === null) return false;

    // Tolerance threshold of 8px for easy clicking & dragging
    return Math.abs(point.y - y) <= 8;
  }

  anchorToPixel(anchor: Anchor, viewport: Viewport): Point | null {
    if (!anchor || typeof anchor.price !== 'number') return null;
    const y = viewport.priceScale.priceToCoordinate(anchor.price);
    if (y === null || isNaN(y)) return null;

    let x = viewport.timeScale.timeToCoordinate(anchor.time);
    if (x === null || isNaN(x as number)) {
      x = (viewport.width / 2) as any;
    }
    return { x, y };
  }

  override clone(newId: string): IDrawing {
    const cloned = new ReactionZoneDrawing(
      newId,
      [...this.anchors],
      { ...this.style },
      { ...this.options, zoneType: this.zoneType }
    );
    (cloned as any)._currentChartInterval = (this as any)._currentChartInterval;
    return cloned;
  }
}

/**
 * Registers Reaction Zone tools with lightweight-charts ToolRegistry.
 */
let isRegistered = false;

export function registerReactionZoneTools(): void {
  if (isRegistered) return;

  try {
    const registry = ToolRegistry.getInstance();

    // 1. Strong Reaction Zone (Red)
    registry.register({
      type: 'reaction-zone-strong',
      name: 'Strong Reaction Zone',
      category: 'reaction-zone' as any,
      requiredAnchors: 1,
      factory: (id, anchors, style, options) => {
        return new ReactionZoneDrawing(id, anchors, {
          lineColor: '#EF4444',
          lineWidth: 2.5,
          lineDash: [],
          labelColor: '#FFFFFF',
          ...(style || {}),
        }, {
          showPrice: true,
          showLabel: true,
          labelText: 'Strong Reaction Zone',
          zoneType: 'strong',
          ...(options || {}),
        });
      },
    });

    // 2. Weak Reaction Zone (Green)
    registry.register({
      type: 'reaction-zone-weak',
      name: 'Weak Reaction Zone',
      category: 'reaction-zone' as any,
      requiredAnchors: 1,
      factory: (id, anchors, style, options) => {
        return new ReactionZoneDrawing(id, anchors, {
          lineColor: '#22C55E',
          lineWidth: 2.0,
          lineDash: [6, 4],
          labelColor: '#FFFFFF',
          ...(style || {}),
        }, {
          showPrice: true,
          showLabel: true,
          labelText: 'Weak Reaction Zone',
          zoneType: 'weak',
          ...(options || {}),
        });
      },
    });

    isRegistered = true;
    console.log('[Reaction Zones] Tools registered successfully.');
  } catch (err: any) {
    console.error('[Reaction Zones] Error registering tools:', err.message);
  }
}
