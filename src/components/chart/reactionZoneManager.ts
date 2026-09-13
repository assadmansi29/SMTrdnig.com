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
import { IPrimitivePaneView, IPrimitivePaneRenderer } from 'lightweight-charts';
import { getTranslation, LanguageCode } from '../../locales';

export type ReactionZoneType = 'strong' | 'weak';

export interface ReactionZoneOptions extends DrawingOptions {
  type?: string;
  zoneType?: ReactionZoneType;
  showPrice?: boolean;
  showLabel?: boolean;
  labelText?: string;
  price?: number;
  locked?: boolean;
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

    const anchor = this._drawing.anchors[0];
    if (!anchor || typeof anchor.price !== 'number' || isNaN(anchor.price)) return;

    const y = viewport.priceScale.priceToCoordinate(anchor.price);
    if (y === null || isNaN(y)) return;

    const isStrong = this._drawing.zoneType === 'strong';
    const color = isStrong ? '#EF4444' : '#22C55E';
    const pr = pixelRatio || 1;

    ctx.save();
    ctx.scale(pr, pr);

    // 1. Draw horizontal reaction line across the entire chart
    ctx.strokeStyle = color;
    ctx.lineWidth = isStrong ? 2.5 : 2.0;

    if (!isStrong) {
      ctx.setLineDash([6, 4]);
    } else {
      ctx.setLineDash([]);
      // Subtle neon glow for strong institutional reaction levels
      ctx.shadowColor = 'rgba(239, 68, 68, 0.45)';
      ctx.shadowBlur = 4;
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
    // Text is rendered directly on the line, moves with the line, and updates dynamically with platform language.
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
    ctx.fillStyle = 'rgba(9, 14, 26, 0.96)';
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(pillX, pillY, pillW, pillH, 4);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fill();

    // 1px border matching the line color, visually integrating the label into the line
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Small indicator dot directly inside the pill
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

    // 4. Right Price Badge: High-contrast exact price label at chart price axis
    const priceText = formattedPrice;
    ctx.font = 'bold 11px "JetBrains Mono", Menlo, Consolas, monospace';
    const priceMetrics = ctx.measureText(priceText);
    const pricePillW = priceMetrics.width + 16;
    const pricePillH = 20;
    // Align badge to the right margin before the native price axis
    const pricePillX = Math.max(pillX + pillW + 10, mediaWidth - pricePillW - 8);
    const pricePillY = y - (pricePillH / 2);

    // Pill background matching zone color
    ctx.fillStyle = color;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(pricePillX, pricePillY, pricePillW, pricePillH, 4);
    } else {
      ctx.rect(pricePillX, pricePillY, pricePillW, pricePillH);
    }
    ctx.fill();

    // Exact price text in crisp white
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(priceText, pricePillX + (pricePillW / 2), y);

    // 5. Visual handles when line is selected or being dragged by Administrator
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
  private _renderer: ReactionZoneRenderer;

  constructor(drawing: ReactionZoneDrawing) {
    this._renderer = new ReactionZoneRenderer(drawing);
  }

  zOrder(): 'bottom' | 'normal' | 'top' {
    return 'normal';
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
    return new ReactionZoneDrawing(
      newId,
      [...this.anchors],
      { ...this.style },
      { ...this.options, zoneType: this.zoneType }
    );
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
