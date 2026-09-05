/**
 * Gann Box Drawing Enhancer
 *
 * Implements TradingView-grade rendering and configuration for Gann Box:
 * (STYLE): Price Levels, Time Levels, Top labels, Bottom labels, use one color, Angles (diagonals), reverse
 * (COORDINATES): #1 (price, bar), #2 (price, bar)
 * (VISIBILITY): Ticks, Seconds, Minutes, Hours, Days, Weeks, Months, Ranges
 */

import { GannBox } from 'lightweight-charts-drawing';

export interface GannVisibilitySettings {
  ticks: boolean;
  seconds: boolean;
  minutes: boolean;
  hours: boolean;
  days: boolean;
  weeks: boolean;
  months: boolean;
  ranges: boolean;
}

export const DEFAULT_GANN_VISIBILITY: GannVisibilitySettings = {
  ticks: true,
  seconds: true,
  minutes: true,
  hours: true,
  days: true,
  weeks: true,
  months: true,
  ranges: true,
};

export const DEFAULT_GANN_PRICE_LEVELS = [0, 0.236, 0.25, 0.382, 0.5, 0.618, 0.75, 0.786, 1.0];
export const DEFAULT_GANN_TIME_LEVELS = [0, 0.25, 0.333, 0.5, 0.667, 0.75, 1.0];

export function getGannRatioColor(lvl: number): string {
  const rounded = Math.round(lvl * 1000) / 1000;
  if (rounded === 0 || rounded === 1) return '#3B82F6';
  if (rounded === 0.5) return '#F59E0B'; // Golden 50%
  if (rounded === 0.25 || rounded === 0.75) return '#10B981'; // Gann 4ths
  if (rounded === 0.382 || rounded === 0.618) return '#06B6D4'; // Golden ratios
  if (rounded === 0.236 || rounded === 0.786) return '#EC4899'; // Retracements
  if (rounded === 0.333 || rounded === 0.667) return '#8B5CF6'; // Gann 3rds
  return '#94A3B8';
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba')) return hex;
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isTimeframeVisible(interval: string, visibility?: GannVisibilitySettings): boolean {
  if (!visibility) return true;
  const inv = (interval || '').trim().toLowerCase();

  if (inv === 'tick' || inv.includes('ticks')) {
    return visibility.ticks !== false;
  }
  if (inv.endsWith('s') || inv.includes('sec')) {
    return visibility.seconds !== false;
  }
  if (inv === '1m' && interval === '1M') {
    return visibility.months !== false;
  }
  if (inv.endsWith('d') || inv === 'd') {
    return visibility.days !== false;
  }
  if (inv.endsWith('w') || inv === 'w') {
    return visibility.weeks !== false;
  }
  if (inv.endsWith('m') && interval.toUpperCase().includes('M') && !inv.includes('15m') && !inv.includes('5m') && !inv.includes('1m') && !inv.includes('30m')) {
    return visibility.months !== false;
  }
  if (inv.endsWith('h') || inv === '60' || inv === '120' || inv === '240') {
    return visibility.hours !== false;
  }
  if (inv.startsWith('r') || inv.includes('range')) {
    return visibility.ranges !== false;
  }
  return visibility.minutes !== false;
}

export class EnhancedGannBoxRenderer {
  private _drawing: any;

  constructor(drawing: any) {
    this._drawing = drawing;
  }

  draw(target: any) {
    target.useBitmapCoordinateSpace((scope: any) => {
      this.drawImpl(scope);
    });
  }

  drawImpl(scope: any) {
    const { context: ctx, horizontalPixelRatio: pr } = scope;
    const drawing = this._drawing;
    const viewport = drawing.getViewport();
    if (!viewport || drawing.options?.visible === false || !drawing.isValid()) return;

    // Check timeframe visibility
    const options = drawing.gannOptions || drawing.options || {};
    if (options.visibility && drawing._currentChartInterval) {
      if (!isTimeframeVisible(drawing._currentChartInterval, options.visibility)) {
        return;
      }
    }

    const anchors = drawing.anchors;
    if (!anchors || anchors.length < 2) return;

    const p1 = drawing.anchorToPixel(anchors[0], viewport);
    const p2 = drawing.anchorToPixel(anchors[1], viewport);
    if (!p1 || !p2) return;

    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    const width = maxX - minX;
    const height = maxY - minY;

    if (width <= 0 || height <= 0) return;

    const style = drawing.style || {};
    const lineColor = style.lineColor || '#2962FF';
    const lineWidth = (style.lineWidth || 1.5) * pr;
    const lineDash = style.lineDash && style.lineDash.length > 0 ? style.lineDash.map((d: number) => d * pr) : [];
    const fillColor = style.fillColor || 'rgba(41, 98, 255, 0.15)';
    const fillOpacity = style.fillOpacity ?? 0.15;
    const useOneColor = options.useOneColor !== false;
    const reverse = !!options.reverse;

    ctx.save();

    // 1. Background Fill
    if (options.filled !== false && fillColor && fillOpacity > 0) {
      ctx.fillStyle = fillColor.startsWith('rgba') ? fillColor : hexToRgba(fillColor, fillOpacity);
      ctx.fillRect(minX * pr, minY * pr, width * pr, height * pr);
    }

    // 2. Outer Bounding Box
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    if (lineDash.length > 0) {
      ctx.setLineDash(lineDash);
    } else {
      ctx.setLineDash([]);
    }
    ctx.strokeRect(minX * pr, minY * pr, width * pr, height * pr);

    // 3. Price Levels
    const showPriceLevels = options.showPriceLevels !== false;
    const rawPriceLevels: number[] = options.priceLevels || DEFAULT_GANN_PRICE_LEVELS;
    const activePriceLevels: Record<string, boolean> = options.activePriceLevels || {};

    if (showPriceLevels) {
      ctx.lineWidth = Math.max(1, lineWidth * 0.85);
      ctx.setLineDash([4 * pr, 3 * pr]);

      for (const lvl of rawPriceLevels) {
        const lvlKey = String(lvl);
        if (activePriceLevels[lvlKey] === false) continue;
        if (lvl === 0 || lvl === 1) continue; // outer border already drawn

        const effectiveLvl = reverse ? (1 - lvl) : lvl;
        const y = (minY + height * effectiveLvl) * pr;
        const levelColor = useOneColor ? lineColor : getGannRatioColor(lvl);

        ctx.strokeStyle = levelColor;
        ctx.beginPath();
        ctx.moveTo(minX * pr, y);
        ctx.lineTo(maxX * pr, y);
        ctx.stroke();

        // Right side percentage label
        const pctText = `${(lvl * 100).toFixed(lvl % 1 === 0 ? 0 : 1)}%`;
        ctx.font = `${Math.round(10 * pr)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = levelColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(pctText, (maxX + 5) * pr, y);
      }
    }

    // 4. Time Levels
    const showTimeLevels = options.showTimeLevels !== false;
    const rawTimeLevels: number[] = options.timeLevels || DEFAULT_GANN_TIME_LEVELS;
    const activeTimeLevels: Record<string, boolean> = options.activeTimeLevels || {};

    if (showTimeLevels) {
      ctx.lineWidth = Math.max(1, lineWidth * 0.85);
      ctx.setLineDash([4 * pr, 3 * pr]);

      for (const lvl of rawTimeLevels) {
        const lvlKey = String(lvl);
        if (activeTimeLevels[lvlKey] === false) continue;
        if (lvl === 0 || lvl === 1) continue;

        const effectiveLvl = reverse ? (1 - lvl) : lvl;
        const x = (minX + width * effectiveLvl) * pr;
        const levelColor = useOneColor ? lineColor : getGannRatioColor(lvl);

        ctx.strokeStyle = levelColor;
        ctx.beginPath();
        ctx.moveTo(x, minY * pr);
        ctx.lineTo(x, maxY * pr);
        ctx.stroke();
      }
    }

    // 5. Top Labels
    const showTopLabels = !!options.showTopLabels || !!options.topLabels;
    if (showTopLabels) {
      ctx.setLineDash([]);
      ctx.font = `bold ${Math.round(9 * pr)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const lvl of rawTimeLevels) {
        const lvlKey = String(lvl);
        if (activeTimeLevels[lvlKey] === false) continue;

        const effectiveLvl = reverse ? (1 - lvl) : lvl;
        const x = (minX + width * effectiveLvl) * pr;
        const labelText = `${(lvl * 100).toFixed(0)}%`;
        const labelColor = useOneColor ? lineColor : getGannRatioColor(lvl);

        const textMetrics = ctx.measureText(labelText);
        const pillW = textMetrics.width + 8 * pr;
        const pillH = 14 * pr;
        const pillY = (minY - 3) * pr - pillH;

        ctx.fillStyle = 'rgba(9, 13, 23, 0.88)';
        ctx.fillRect(x - pillW / 2, pillY, pillW, pillH);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 1 * pr;
        ctx.strokeRect(x - pillW / 2, pillY, pillW, pillH);

        ctx.fillStyle = labelColor;
        ctx.fillText(labelText, x, pillY + pillH / 2);
      }
    }

    // 6. Bottom Labels
    const showBottomLabels = !!options.showBottomLabels || !!options.bottomLabels;
    if (showBottomLabels) {
      ctx.setLineDash([]);
      ctx.font = `bold ${Math.round(9 * pr)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const lvl of rawTimeLevels) {
        const lvlKey = String(lvl);
        if (activeTimeLevels[lvlKey] === false) continue;

        const effectiveLvl = reverse ? (1 - lvl) : lvl;
        const x = (minX + width * effectiveLvl) * pr;
        const labelText = `${(lvl * 100).toFixed(0)}%`;
        const labelColor = useOneColor ? lineColor : getGannRatioColor(lvl);

        const textMetrics = ctx.measureText(labelText);
        const pillW = textMetrics.width + 8 * pr;
        const pillH = 14 * pr;
        const pillY = (maxY + 4) * pr;

        ctx.fillStyle = 'rgba(9, 13, 23, 0.88)';
        ctx.fillRect(x - pillW / 2, pillY, pillW, pillH);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 1 * pr;
        ctx.strokeRect(x - pillW / 2, pillY, pillW, pillH);

        ctx.fillStyle = labelColor;
        ctx.fillText(labelText, x, pillY + pillH / 2);
      }
    }

    // 7. Angles (Angels) / Geometric Diagonals
    const showDiagonals = options.showDiagonals !== false && options.angles !== false;
    if (showDiagonals) {
      ctx.lineWidth = Math.max(1, lineWidth * 0.9);
      ctx.strokeStyle = useOneColor ? lineColor : '#F59E0B';
      ctx.setLineDash([6 * pr, 4 * pr]);

      // Diagonal 1: Top-Left to Bottom-Right
      ctx.beginPath();
      ctx.moveTo(minX * pr, minY * pr);
      ctx.lineTo(maxX * pr, maxY * pr);
      ctx.stroke();

      // Diagonal 2: Bottom-Left to Top-Right
      ctx.beginPath();
      ctx.moveTo(minX * pr, maxY * pr);
      ctx.lineTo(maxX * pr, minY * pr);
      ctx.stroke();
    }

    // 8. Interactive Selection & Editing Handles
    if (drawing.state === 'selected' || drawing.state === 'editing') {
      ctx.setLineDash([]);
      const handles = [
        { x: minX * pr, y: minY * pr },
        { x: maxX * pr, y: minY * pr },
        { x: maxX * pr, y: maxY * pr },
        { x: minX * pr, y: maxY * pr },
        { x: (minX + width * 0.5) * pr, y: minY * pr },
        { x: (minX + width * 0.5) * pr, y: maxY * pr },
        { x: minX * pr, y: (minY + height * 0.5) * pr },
        { x: maxX * pr, y: (minY + height * 0.5) * pr },
      ];
      const radius = 4.5 * pr;
      for (const h of handles) {
        ctx.beginPath();
        ctx.arc(h.x, h.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2 * pr;
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

export class EnhancedGannBoxPaneView {
  private _renderer: EnhancedGannBoxRenderer;

  constructor(drawing: any) {
    this._renderer = new EnhancedGannBoxRenderer(drawing);
  }

  zOrder(): any {
    return 'normal';
  }

  renderer() {
    return this._renderer;
  }
}

/**
 * Patch GannBox prototype so that all GannBox instances (new or restored)
 * render with the full TradingView-style Gann Box feature set.
 */
export function installGannBoxEnhancer() {
  if (typeof window === 'undefined') return;
  try {
    if (GannBox && GannBox.prototype) {
      (GannBox.prototype as any).paneViews = function () {
        return [new EnhancedGannBoxPaneView(this)];
      };
      console.log('[Gann Box Enhancer] TradingView-style GannBox installed successfully.');
    }
  } catch (err: any) {
    console.warn('[Gann Box Enhancer] Failed to patch GannBox prototype:', err.message);
  }
}
