import {
  Ray,
  GannFan,
  TrendAngle,
  ToolRegistry,
  GannBox,
  Drawing,
} from 'lightweight-charts-drawing';

/**
 * Clips a ray originating at `start` in direction (dx, dy) to the chart viewport bounds [0, width] x [0, height].
 * Always extends forward along (dx, dy) and NEVER snaps backwards.
 */
export function clipRayToViewport(
  start: { x: number; y: number },
  dx: number,
  dy: number,
  width: number,
  height: number
): { x: number; y: number } {
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return { ...start };

  let tMin = Infinity;

  // X boundary checks
  if (dx < -1e-6) {
    // Heading left: intersects x = 0
    const t = (0 - start.x) / dx;
    if (t > 0 && t < tMin) tMin = t;
  } else if (dx > 1e-6) {
    // Heading right: intersects x = width
    const t = (width - start.x) / dx;
    if (t > 0 && t < tMin) tMin = t;
  }

  // Y boundary checks
  if (dy < -1e-6) {
    // Heading up: intersects y = 0
    const t = (0 - start.y) / dy;
    if (t > 0 && t < tMin) tMin = t;
  } else if (dy > 1e-6) {
    // Heading down: intersects y = height
    const t = (height - start.y) / dy;
    if (t > 0 && t < tMin) tMin = t;
  }

  // Fallback if ray originates outside or parallel
  if (tMin === Infinity || tMin <= 0) {
    tMin = (Math.max(width, height) * 2) / dist;
  }

  return {
    x: start.x + tMin * dx,
    y: start.y + tMin * dy,
  };
}

/**
 * Calculates perpendicular distance from `point` to a forward ray from `start` through `dirPoint`.
 */
export function distanceToRay(
  point: { x: number; y: number },
  start: { x: number; y: number },
  dirPoint: { x: number; y: number }
): number {
  const dx = dirPoint.x - start.x;
  const dy = dirPoint.y - start.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const wx = point.x - start.x;
  const wy = point.y - start.y;
  const proj = (wx * dx + wy * dy) / lenSq;

  if (proj < 0) {
    // Point is behind ray origin
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const nearestX = start.x + proj * dx;
  const nearestY = start.y + proj * dy;
  return Math.hypot(point.x - nearestX, point.y - nearestY);
}

// -----------------------------------------------------------------------------
// 1. Bidirectional Ray Renderer & PaneView
// -----------------------------------------------------------------------------
class BidirectionalRayRenderer {
  private _drawing: any;

  constructor(drawing: any) {
    this._drawing = drawing;
  }

  renderer() {
    return this;
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

  drawImpl(scope: any) {
    const ctx = scope.context;
    const pr = scope.horizontalPixelRatio || window.devicePixelRatio || 1;
    const viewport = this._drawing.getViewport?.();
    if (!ctx || !viewport || !this._drawing.options.visible || !this._drawing.isValid()) return;

    const anchors = this._drawing.anchors;
    const r = this._drawing.anchorToPixel(anchors[0], viewport);
    const a = this._drawing.anchorToPixel(anchors[1], viewport);
    if (!r || !a) return;

    const dx = a.x - r.x;
    const dy = a.y - r.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) return;

    ctx.save();

    const style = this._drawing.style || {};
    const lineColor = style.lineColor || '#2962FF';
    const lineWidth = (style.lineWidth || 2) * pr;
    const lineDash = style.lineDash && style.lineDash.length > 0 ? style.lineDash.map((d: number) => d * pr) : [];

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    if (lineDash.length > 0) {
      ctx.setLineDash(lineDash);
    } else {
      ctx.setLineDash([]);
    }

    // Clip forward ray to viewport in the exact direction (dx, dy)
    const endPoint = clipRayToViewport(r, dx, dy, viewport.width, viewport.height);

    ctx.beginPath();
    ctx.moveTo(r.x * pr, r.y * pr);
    ctx.lineTo(endPoint.x * pr, endPoint.y * pr);
    ctx.stroke();

    // Show Angle readout if enabled
    const rayOpts = this._drawing.rayOptions || {};
    if (rayOpts.showAngle) {
      const angleDeg = Math.atan2(r.y - a.y, a.x - r.x) * (180 / Math.PI);
      const mid = { x: (r.x + a.x) / 2, y: (r.y + a.y) / 2 };
      const labelText = `${angleDeg.toFixed(1)}°`;

      ctx.font = `${Math.round(11 * pr)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const textMetrics = ctx.measureText(labelText);
      const pillW = textMetrics.width + 8 * pr;
      const pillH = 16 * pr;

      ctx.fillStyle = 'rgba(14, 19, 31, 0.85)';
      ctx.fillRect(mid.x * pr - pillW / 2, (mid.y - 18) * pr, pillW, pillH);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1 * pr;
      ctx.strokeRect(mid.x * pr - pillW / 2, (mid.y - 18) * pr, pillW, pillH);

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, mid.x * pr, (mid.y - 18) * pr + pillH / 2);
    }

    // Interactive Selection Handles
    if (this._drawing.state === 'selected' || this._drawing.state === 'editing') {
      ctx.setLineDash([]);
      const radius = 5 * pr;
      for (const pt of [r, a]) {
        ctx.beginPath();
        ctx.arc(pt.x * pr, pt.y * pr, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2 * pr;
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

class BidirectionalRayPaneView {
  private _renderer: BidirectionalRayRenderer;

  constructor(drawing: any) {
    this._renderer = new BidirectionalRayRenderer(drawing);
  }

  zOrder() {
    return 'normal';
  }

  renderer() {
    return this._renderer;
  }
}

// -----------------------------------------------------------------------------
// 2. Bidirectional Gann Fan Renderer & PaneView
// -----------------------------------------------------------------------------
const DEFAULT_GANN_FAN_ANGLES = [
  { ratio: 8, label: '8x1', color: '#EF4444' },
  { ratio: 4, label: '4x1', color: '#F97316' },
  { ratio: 3, label: '3x1', color: '#F59E0B' },
  { ratio: 2, label: '2x1', color: '#EAB308' },
  { ratio: 1, label: '1x1', color: '#3B82F6' },
  { ratio: 0.5, label: '1x2', color: '#10B981' },
  { ratio: 0.333, label: '1x3', color: '#06B6D4' },
  { ratio: 0.25, label: '1x4', color: '#6366F1' },
  { ratio: 0.125, label: '1x8', color: '#8B5CF6' },
];

class BidirectionalGannFanRenderer {
  private _drawing: any;

  constructor(drawing: any) {
    this._drawing = drawing;
  }

  renderer() {
    return this;
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

  drawImpl(scope: any) {
    const ctx = scope.context;
    const pr = scope.horizontalPixelRatio || window.devicePixelRatio || 1;
    const viewport = this._drawing.getViewport?.();
    if (!ctx || !viewport || !this._drawing.options.visible || !this._drawing.isValid()) return;

    const anchors = this._drawing.anchors;
    const r = this._drawing.anchorToPixel(anchors[0], viewport);
    const a = this._drawing.anchorToPixel(anchors[1], viewport);
    if (!r || !a) return;

    const dx = a.x - r.x;
    const dy = a.y - r.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) return;

    const gannOpts = this._drawing.gannOptions || {};
    const angles = gannOpts.angles || DEFAULT_GANN_FAN_ANGLES;
    const extendLines = gannOpts.extendLines !== false;
    const showLabels = gannOpts.showLabels !== false;
    const style = this._drawing.style || {};
    const baseLineWidth = (style.lineWidth || 1.5) * pr;

    ctx.save();

    for (const item of angles) {
      const ratio = item.ratio ?? 1;
      const label = item.label ?? `${ratio}x1`;
      const color = item.color || style.lineColor || '#3B82F6';

      // Horizontal component vx maintains the exact direction (left or right) of the user drag!
      const vx = dx;
      const vy = dy * ratio;

      const endPoint = extendLines
        ? clipRayToViewport(r, vx, vy, viewport.width, viewport.height)
        : { x: r.x + vx * 2.5, y: r.y + vy * 2.5 };

      ctx.strokeStyle = color;
      ctx.lineWidth = label === '1x1' ? baseLineWidth * 1.5 : baseLineWidth;
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(r.x * pr, r.y * pr);
      ctx.lineTo(endPoint.x * pr, endPoint.y * pr);
      ctx.stroke();

      if (showLabels) {
        // Position label 35% along the fan ray
        const labelPos = {
          x: (r.x + vx * 0.4) * pr,
          y: (r.y + vy * 0.4) * pr,
        };

        ctx.font = `bold ${Math.round(9.5 * pr)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const textMetrics = ctx.measureText(label);
        const pillW = textMetrics.width + 6 * pr;
        const pillH = 14 * pr;

        ctx.fillStyle = 'rgba(13, 19, 34, 0.88)';
        ctx.fillRect(labelPos.x - pillW / 2, labelPos.y - pillH / 2, pillW, pillH);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 * pr;
        ctx.strokeRect(labelPos.x - pillW / 2, labelPos.y - pillH / 2, pillW, pillH);

        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelPos.x, labelPos.y);
      }
    }

    // Interactive Selection Handles at anchor 0 and anchor 1
    if (this._drawing.state === 'selected' || this._drawing.state === 'editing') {
      ctx.setLineDash([]);
      const radius = 5 * pr;
      for (const pt of [r, a]) {
        ctx.beginPath();
        ctx.arc(pt.x * pr, pt.y * pr, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2 * pr;
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

class BidirectionalGannFanPaneView {
  private _renderer: BidirectionalGannFanRenderer;

  constructor(drawing: any) {
    this._renderer = new BidirectionalGannFanRenderer(drawing);
  }

  zOrder() {
    return 'normal';
  }

  renderer() {
    return this._renderer;
  }
}

// -----------------------------------------------------------------------------
// 3. Bidirectional Trend Angle / Gann Angle Renderer & PaneView
// -----------------------------------------------------------------------------
class BidirectionalTrendAngleRenderer {
  private _drawing: any;

  constructor(drawing: any) {
    this._drawing = drawing;
  }

  renderer() {
    return this;
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

  drawImpl(scope: any) {
    const ctx = scope.context;
    const pr = scope.horizontalPixelRatio || window.devicePixelRatio || 1;
    const viewport = this._drawing.getViewport?.();
    if (!ctx || !viewport || !this._drawing.options.visible || !this._drawing.isValid()) return;

    const anchors = this._drawing.anchors;
    const r = this._drawing.anchorToPixel(anchors[0], viewport);
    const a = this._drawing.anchorToPixel(anchors[1], viewport);
    if (!r || !a) return;

    const dx = a.x - r.x;
    const dy = a.y - r.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) return;

    const style = this._drawing.style || {};
    const lineColor = style.lineColor || '#F59E0B';
    const lineWidth = (style.lineWidth || 2) * pr;
    const trendOpts = this._drawing.trendAngleOptions || {};
    const arcRadius = (trendOpts.arcRadius || 42) * pr;
    const isLeft = dx < 0;

    ctx.save();

    // 1. Primary Trend Angle Line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(r.x * pr, r.y * pr);
    ctx.lineTo(a.x * pr, a.y * pr);
    ctx.stroke();

    // 2. Horizontal Reference Baseline (points Left when dragged left, Right when dragged right!)
    if (trendOpts.showArc !== false) {
      const baselineLength = arcRadius + 24 * pr;
      const baselineEndX = isLeft ? r.x * pr - baselineLength : r.x * pr + baselineLength;

      ctx.save();
      ctx.setLineDash([4 * pr, 4 * pr]);
      ctx.strokeStyle = `${lineColor}88`;
      ctx.lineWidth = 1 * pr;
      ctx.beginPath();
      ctx.moveTo(r.x * pr, r.y * pr);
      ctx.lineTo(baselineEndX, r.y * pr);
      ctx.stroke();
      ctx.restore();

      // 3. Arc Wedge & Fill
      const lineAngle = Math.atan2(dy, dx);
      const baseAngle = isLeft ? Math.PI : 0;

      ctx.beginPath();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.8 * pr;

      // Arc connects baseline to trend line in shortest angular direction
      if (isLeft) {
        if (dy >= 0) {
          ctx.arc(r.x * pr, r.y * pr, arcRadius, Math.PI, lineAngle, false);
        } else {
          ctx.arc(r.x * pr, r.y * pr, arcRadius, Math.PI, lineAngle, true);
        }
      } else {
        if (dy >= 0) {
          ctx.arc(r.x * pr, r.y * pr, arcRadius, 0, lineAngle, false);
        } else {
          ctx.arc(r.x * pr, r.y * pr, arcRadius, 0, lineAngle, true);
        }
      }
      ctx.stroke();

      // Soft wedge fill
      ctx.beginPath();
      ctx.moveTo(r.x * pr, r.y * pr);
      if (isLeft) {
        if (dy >= 0) {
          ctx.arc(r.x * pr, r.y * pr, arcRadius, Math.PI, lineAngle, false);
        } else {
          ctx.arc(r.x * pr, r.y * pr, arcRadius, Math.PI, lineAngle, true);
        }
      } else {
        if (dy >= 0) {
          ctx.arc(r.x * pr, r.y * pr, arcRadius, 0, lineAngle, false);
        } else {
          ctx.arc(r.x * pr, r.y * pr, arcRadius, 0, lineAngle, true);
        }
      }
      ctx.closePath();
      ctx.fillStyle = `${lineColor}22`;
      ctx.fill();
    }

    // 4. Degree Readout Badge
    if (trendOpts.showDegrees !== false) {
      // Geometric angle relative to the horizontal baseline
      const angleFromHorizontal = Math.abs(Math.atan2(-dy, Math.abs(dx))) * (180 / Math.PI);
      const labelText = `${angleFromHorizontal.toFixed(1)}°`;

      const midAngle = isLeft
        ? (dy >= 0 ? Math.PI - (Math.PI - Math.atan2(dy, dx)) / 2 : -Math.PI + (Math.PI + Math.atan2(dy, dx)) / 2)
        : Math.atan2(dy, dx) / 2;

      const badgeDist = arcRadius + 16 * pr;
      const badgeX = r.x * pr + badgeDist * Math.cos(midAngle);
      const badgeY = r.y * pr + badgeDist * Math.sin(midAngle);

      ctx.font = `bold ${Math.round(11 * pr)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const textMetrics = ctx.measureText(labelText);
      const pillW = textMetrics.width + 8 * pr;
      const pillH = 16 * pr;

      ctx.fillStyle = 'rgba(14, 19, 31, 0.9)';
      ctx.fillRect(badgeX - pillW / 2, badgeY - pillH / 2, pillW, pillH);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1 * pr;
      ctx.strokeRect(badgeX - pillW / 2, badgeY - pillH / 2, pillW, pillH);

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, badgeX, badgeY);
    }

    // Interactive Selection Handles
    if (this._drawing.state === 'selected' || this._drawing.state === 'editing') {
      ctx.setLineDash([]);
      const radius = 5 * pr;
      for (const pt of [r, a]) {
        ctx.beginPath();
        ctx.arc(pt.x * pr, pt.y * pr, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2 * pr;
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

class BidirectionalTrendAnglePaneView {
  private _renderer: BidirectionalTrendAngleRenderer;

  constructor(drawing: any) {
    this._renderer = new BidirectionalTrendAngleRenderer(drawing);
  }

  zOrder() {
    return 'normal';
  }

  renderer() {
    return this._renderer;
  }
}

// -----------------------------------------------------------------------------
// 3.5 Dense Gann Angle Grid Renderer & PaneView (Matching Reference Image)
// -----------------------------------------------------------------------------
export const DEFAULT_GANN_ANGLE_RATIOS = [
  { ratio: 16, label: '16x1', color: '#60A5FA', width: 1 },
  { ratio: 8, label: '8x1', color: '#3B82F6', width: 1.2 },
  { ratio: 4, label: '4x1', color: '#3B82F6', width: 1.4 },
  { ratio: 3, label: '3x1', color: '#60A5FA', width: 1 },
  { ratio: 2, label: '2x1', color: '#2563EB', width: 1.5 },
  { ratio: 1.5, label: '1.5x1', color: '#60A5FA', width: 1 },
  { ratio: 1.25, label: '1.25x1', color: '#93C5FD', width: 1 },
  { ratio: 1, label: '1x1', color: '#1D4ED8', width: 2 }, // Master baseline
  { ratio: 1 / 1.25, label: '1x1.25', color: '#93C5FD', width: 1 },
  { ratio: 1 / 1.5, label: '1x1.5', color: '#60A5FA', width: 1 },
  { ratio: 1 / 2, label: '1x2', color: '#2563EB', width: 1.5 },
  { ratio: 1 / 3, label: '1x3', color: '#60A5FA', width: 1 },
  { ratio: 1 / 4, label: '1x4', color: '#3B82F6', width: 1.4 },
  { ratio: 1 / 8, label: '1x8', color: '#3B82F6', width: 1.2 },
  { ratio: 1 / 16, label: '1x16', color: '#60A5FA', width: 1 },
];

export function isPointNearGannGrid(
  point: { x: number; y: number },
  r: { x: number; y: number },
  a: { x: number; y: number }
): boolean {
  if (Math.hypot(point.x - r.x, point.y - r.y) <= 12) return true;
  if (Math.hypot(point.x - a.x, point.y - a.y) <= 12) return true;

  const dx = a.x - r.x;
  const dy = a.y - r.y;
  if (Math.hypot(dx, dy) < 1e-6) return false;

  for (const item of DEFAULT_GANN_ANGLE_RATIOS) {
    const ratio = item.ratio;
    const vy = dy * ratio;

    // Rays from Anchor 0
    if (
      distanceToRay(point, r, { x: r.x + dx, y: r.y + vy }) <= 8 ||
      distanceToRay(point, r, { x: r.x + dx, y: r.y - vy }) <= 8 ||
      distanceToRay(point, r, { x: r.x - dx, y: r.y - vy }) <= 8 ||
      distanceToRay(point, r, { x: r.x - dx, y: r.y + vy }) <= 8
    ) {
      return true;
    }

    // Counter rays from Anchor 1
    if (
      distanceToRay(point, a, { x: a.x - dx, y: a.y - vy }) <= 8 ||
      distanceToRay(point, a, { x: a.x - dx, y: a.y + vy }) <= 8 ||
      distanceToRay(point, a, { x: a.x + dx, y: a.y + vy }) <= 8 ||
      distanceToRay(point, a, { x: a.x + dx, y: a.y - vy }) <= 8
    ) {
      return true;
    }
  }

  return false;
}

class DenseGannAngleGridRenderer {
  private _drawing: any;

  constructor(drawing: any) {
    this._drawing = drawing;
  }

  renderer() {
    return this;
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

  drawImpl(scope: any) {
    const ctx = scope.context;
    const pr = scope.horizontalPixelRatio || window.devicePixelRatio || 1;
    const viewport = this._drawing.getViewport?.();
    if (!ctx || !viewport || !this._drawing.options?.visible || !this._drawing.isValid?.()) return;

    const anchors = this._drawing.anchors;
    if (!anchors || anchors.length < 2) return;
    const r = this._drawing.anchorToPixel(anchors[0], viewport);
    const a = this._drawing.anchorToPixel(anchors[1], viewport);
    if (!r || !a) return;

    const dx = a.x - r.x;
    const dy = a.y - r.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-4) return;

    const width = viewport.width;
    const height = viewport.height;
    const style = this._drawing.style || {};
    const isSelected = this._drawing.state === 'selected' || this._drawing.state === 'editing';

    ctx.save();

    // Helper to draw a single ray clipped to viewport
    const drawRay = (
      origin: { x: number; y: number },
      vx: number,
      vy: number,
      color: string,
      lineWidth: number,
      dash: number[] = []
    ) => {
      const end = clipRayToViewport(origin, vx, vy, width, height);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * pr;
      ctx.setLineDash(dash.map((d) => d * pr));
      ctx.beginPath();
      ctx.moveTo(origin.x * pr, origin.y * pr);
      ctx.lineTo(end.x * pr, end.y * pr);
      ctx.stroke();
      return end;
    };

    // Helper to render angle label
    const drawBadge = (
      origin: { x: number; y: number },
      vx: number,
      vy: number,
      text: string
    ) => {
      const labelDist = Math.min(dist * 0.45, 160);
      const vLen = Math.hypot(vx, vy);
      if (vLen < 1e-6) return;
      const nx = vx / vLen;
      const ny = vy / vLen;
      const lx = origin.x + nx * labelDist;
      const ly = origin.y + ny * labelDist;

      if (lx < 10 || lx > width - 10 || ly < 10 || ly > height - 10) return;

      ctx.save();
      ctx.font = `bold ${Math.round(10 * pr)}px "JetBrains Mono", Consolas, monospace`;
      const tm = ctx.measureText(text);
      const pw = tm.width + 8 * pr;
      const ph = 15 * pr;

      ctx.fillStyle = 'rgba(10, 16, 30, 0.88)';
      ctx.fillRect(lx * pr - pw / 2, ly * pr - ph / 2, pw, ph);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 1 * pr;
      ctx.strokeRect(lx * pr - pw / 2, ly * pr - ph / 2, pw, ph);

      ctx.fillStyle = '#93C5FD';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, lx * pr, ly * pr);
      ctx.restore();
    };

    // Draw all angle lines radiating in both directions from Anchor 0 and Anchor 1
    for (const item of DEFAULT_GANN_ANGLE_RATIOS) {
      const ratio = item.ratio;
      const vy = dy * ratio;
      const strokeColor = item.color;
      const lineW = item.width;

      // 1. Radiating from Anchor 0 (r):
      // Forward positive
      drawRay(r, dx, vy, strokeColor, lineW);
      // Forward symmetrical negative (opposite slope)
      drawRay(r, dx, -vy, strokeColor, lineW);
      // Backward positive (extending in opposite direction across chart)
      drawRay(r, -dx, -vy, strokeColor, lineW, [4, 4]);
      // Backward negative
      drawRay(r, -dx, vy, strokeColor, lineW, [4, 4]);

      // 2. Counter-radiating from Anchor 1 (a) across the grid:
      drawRay(a, -dx, -vy, strokeColor, lineW * 0.9);
      drawRay(a, -dx, vy, strokeColor, lineW * 0.9);
      drawRay(a, dx, vy, strokeColor, lineW * 0.9, [4, 4]);
      drawRay(a, dx, -vy, strokeColor, lineW * 0.9, [4, 4]);

      // Clear readable badges on key Gann ratios
      if (['1x1', '2x1', '1x2', '4x1', '1x4', '8x1', '1x8'].includes(item.label)) {
        drawBadge(r, dx, vy, item.label);
      }
    }

    // Prominent Master 1x1 Vector line between anchors
    ctx.strokeStyle = '#1D4ED8';
    ctx.lineWidth = 2.5 * pr;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(r.x * pr, r.y * pr);
    ctx.lineTo(a.x * pr, a.y * pr);
    ctx.stroke();

    // Interactive Drag Handles
    if (isSelected) {
      ctx.setLineDash([]);
      for (const pt of [r, a]) {
        // Outer halo
        ctx.beginPath();
        ctx.arc(pt.x * pr, pt.y * pr, 7 * pr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(37, 99, 235, 0.35)';
        ctx.fill();

        // White handle circle
        ctx.beginPath();
        ctx.arc(pt.x * pr, pt.y * pr, 5 * pr, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2 * pr;
        ctx.stroke();

        // Blue center dot
        ctx.beginPath();
        ctx.arc(pt.x * pr, pt.y * pr, 2 * pr, 0, Math.PI * 2);
        ctx.fillStyle = '#2563EB';
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

class DenseGannAngleGridPaneView {
  private _renderer: DenseGannAngleGridRenderer;

  constructor(drawing: any) {
    this._renderer = new DenseGannAngleGridRenderer(drawing);
  }

  zOrder() {
    return 'normal';
  }

  renderer() {
    return this._renderer;
  }

  update() {}
}

// -----------------------------------------------------------------------------
function projectLogicalCoordinate(timeScale: any, logicalIdx: number): number | null {
  if (!timeScale?.logicalToCoordinate || isNaN(logicalIdx)) return null;

  const floorIdx = Math.floor(logicalIdx);
  const ceilIdx = Math.ceil(logicalIdx);

  if (floorIdx === ceilIdx) {
    const coord = timeScale.logicalToCoordinate(floorIdx);
    return coord !== null && !isNaN(coord) ? coord : null;
  }

  const coordFloor = timeScale.logicalToCoordinate(floorIdx);
  const coordCeil = timeScale.logicalToCoordinate(ceilIdx);

  if (coordFloor !== null && coordCeil !== null && !isNaN(coordFloor) && !isNaN(coordCeil)) {
    return coordFloor + (logicalIdx - floorIdx) * (coordCeil - coordFloor);
  }
  if (coordFloor !== null && !isNaN(coordFloor)) return coordFloor;
  if (coordCeil !== null && !isNaN(coordCeil)) return coordCeil;
  return null;
}

// 4. Prototype Patching & Registry Installation
// -----------------------------------------------------------------------------
export function installDirectionalEnhancers() {
  if (typeof window === 'undefined') return;

  try {
    // 0. Patch Drawing.prototype.anchorToPixel to support future cycle analysis bars (e.g. +144 bars)
    if (Drawing && Drawing.prototype) {
      const origAnchorToPixel = Drawing.prototype.anchorToPixel;
      Drawing.prototype.anchorToPixel = function (anchor: any, viewport: any) {
        if (!anchor || !viewport) return null;
        const direct = origAnchorToPixel ? origAnchorToPixel.call(this, anchor, viewport) : null;
        if (direct && direct.x !== null && !isNaN(direct.x) && direct.y !== null && !isNaN(direct.y)) {
          return direct;
        }

        const timeScale = viewport.timeScale;
        const priceScale = viewport.priceScale;
        if (!timeScale || !priceScale) return direct;

        const y = direct?.y ?? priceScale.priceToCoordinate?.(anchor.price);
        if (y === null || isNaN(y)) return null;

        let x = direct?.x;
        if ((x === null || x === undefined || isNaN(x)) && timeScale.logicalToCoordinate) {
          const candles = (window as any).__chartCandles;
          if (Array.isArray(candles) && candles.length >= 2) {
            const N = candles.length;
            const lastCandle = candles[N - 1];
            const prevCandle = candles[N - 2];
            const step = (Number(lastCandle.time) - Number(prevCandle.time)) || 3600;
            const targetTime = typeof anchor.time === 'number' ? anchor.time : Number(anchor.time);
            if (step > 0 && !isNaN(targetTime)) {
              const lastTime = Number(lastCandle.time);
              const firstTime = Number(candles[0].time);
              let logicalIdx: number;
              if (targetTime >= lastTime) {
                const barsDiff = (targetTime - lastTime) / step;
                logicalIdx = (N - 1) + barsDiff;
              } else if (targetTime < firstTime) {
                const barsDiff = (targetTime - firstTime) / step;
                logicalIdx = barsDiff;
              } else {
                const barsDiff = (targetTime - firstTime) / step;
                logicalIdx = barsDiff;
              }
              const projectedX = projectLogicalCoordinate(timeScale, logicalIdx);
              if (projectedX !== null && !isNaN(projectedX)) {
                x = projectedX;
              }
            }
          }
        }

        if (x === null || x === undefined || isNaN(x) || y === null || isNaN(y)) {
          return null;
        }
        return { x, y };
      };

      const origPixelToAnchor = (Drawing.prototype as any).pixelToAnchor;
      (Drawing.prototype as any).pixelToAnchor = function (point: any, viewport: any) {
        if (!point || !viewport) return null;
        const direct = origPixelToAnchor ? origPixelToAnchor.call(this, point, viewport) : null;
        if (direct && direct.time !== null && direct.time !== undefined && direct.price !== null && !isNaN(direct.price)) {
          return direct;
        }
        const timeScale = viewport.timeScale;
        const priceScale = viewport.priceScale;
        if (!timeScale || !priceScale) return direct;

        const price = direct?.price ?? priceScale.coordinateToPrice?.(point.y);
        if (price === null || isNaN(price)) return null;

        let time = direct?.time;
        if (!time) {
          const chart = (window as any).__currentChart;
          const rawTs = chart?.timeScale?.() || timeScale;
          const logical = rawTs?.coordinateToLogical ? rawTs.coordinateToLogical(point.x) : null;
          const candles = (window as any).__chartCandles;
          if (logical !== null && logical !== undefined && !isNaN(logical) && Array.isArray(candles) && candles.length > 0) {
            const N = candles.length;
            const lastCandle = candles[N - 1];
            const firstCandle = candles[0];
            const step = N >= 2 ? (Number(lastCandle.time) - Number(candles[N - 2].time)) || 3600 : 3600;
            if (logical >= N - 1) {
              time = Number(lastCandle.time) + Math.round((logical - (N - 1)) * step);
            } else if (logical < 0) {
              time = Number(firstCandle.time) + Math.round(logical * step);
            } else {
              const idx = Math.max(0, Math.min(N - 1, Math.round(logical)));
              time = Number(candles[idx].time);
            }
          }
        }

        if (time === null || time === undefined || price === null || isNaN(price)) {
          return null;
        }
        return { time, price: Number(price.toFixed(2)) };
      };
    }

    // 1. Patch Ray
    if (Ray && Ray.prototype) {
      (Ray.prototype as any).paneViews = function () {
        return [new BidirectionalRayPaneView(this)];
      };

      (Ray.prototype as any).testHit = function (point: { x: number; y: number }, viewport: any) {
        if (!this.isValid()) return false;
        const vp = viewport || this.getViewport?.();
        if (!vp) return false;
        const r = this.anchorToPixel(this._anchors[0], vp);
        const a = this.anchorToPixel(this._anchors[1], vp);
        if (!r || !a) return false;
        return distanceToRay(point, r, a) <= 8;
      };

      (Ray.prototype as any).computeGeometry = function (viewport: any) {
        if (!this.isValid()) return [];
        const vp = viewport || this.getViewport?.();
        if (!vp) return [];
        const s = this.anchorToPixel(this._anchors[0], vp);
        const e = this.anchorToPixel(this._anchors[1], vp);
        if (!s || !e) return [];
        const isLeft = e.x < s.x;
        return [{
          type: 'line',
          start: s,
          end: e,
          extendLeft: isLeft,
          extendRight: !isLeft,
        }];
      };
    }

    // 2. Patch GannFan
    if (GannFan && GannFan.prototype) {
      (GannFan.prototype as any).paneViews = function () {
        return [new BidirectionalGannFanPaneView(this)];
      };

      (GannFan.prototype as any).testHit = function (point: { x: number; y: number }, viewport: any) {
        if (!this.isValid()) return false;
        const vp = viewport || this.getViewport?.();
        if (!vp) return false;
        const r = this.anchorToPixel(this._anchors[0], vp);
        const a = this.anchorToPixel(this._anchors[1], vp);
        if (!r || !a) return false;

        const dx = a.x - r.x;
        const dy = a.y - r.y;
        const angles = this._gannOptions?.angles || DEFAULT_GANN_FAN_ANGLES;

        for (const item of angles) {
          const ratio = item.ratio ?? 1;
          const vx = dx;
          const vy = dy * ratio;
          const fanDirPoint = { x: r.x + vx, y: r.y + vy };
          if (distanceToRay(point, r, fanDirPoint) <= 8) {
            return true;
          }
        }
        return false;
      };
    }

    // 3. Patch TrendAngle (Dense Gann Angle Grid for 'gann-angle', Bidirectional for 'trend-angle')
    if (TrendAngle && TrendAngle.prototype) {
      (TrendAngle.prototype as any).paneViews = function () {
        if (this.type === 'gann-angle') {
          return [new DenseGannAngleGridPaneView(this)];
        }
        return [new BidirectionalTrendAnglePaneView(this)];
      };

      (TrendAngle.prototype as any).testHit = function (point: { x: number; y: number }, viewport: any) {
        if (!this.isValid()) return false;
        const vp = viewport || this.getViewport?.();
        if (!vp) return false;
        const r = this.anchorToPixel(this._anchors[0], vp);
        const a = this.anchorToPixel(this._anchors[1], vp);
        if (!r || !a) return false;

        if (this.type === 'gann-angle') {
          return isPointNearGannGrid(point, r, a);
        }

        return distanceToRay(point, r, a) <= 8;
      };
    }

    // 4. Patch GannBox control points so handles correspond to actual draggable corners
    if (GannBox && GannBox.prototype) {
      (GannBox.prototype as any).getControlPoints = function (viewport: any) {
        const vp = viewport || this.getViewport?.();
        if (!vp || !this.isValid()) return [];
        const p0 = this.anchorToPixel(this._anchors[0], vp);
        const p1 = this.anchorToPixel(this._anchors[1], vp);
        if (!p0 || !p1) return [];

        return [
          { index: 0, x: p0.x, y: p0.y, radius: 6 },
          { index: 1, x: p1.x, y: p1.y, radius: 6 },
          // Opposite diagonal corners
          { index: 0, x: p0.x, y: p1.y, radius: 6 },
          { index: 1, x: p1.x, y: p0.y, radius: 6 },
        ];
      };
    }

    // 5. Register 'gann-angle' tool in ToolRegistry
    const registry = ToolRegistry.getInstance();
    try {
      if (registry.has('gann-angle')) {
        (registry as any)._tools?.delete?.('gann-angle');
      }
      registry.register({
        type: 'gann-angle',
        name: 'Gann Angle',
        category: 'gann',
        requiredAnchors: 2,
        factory: (id: string, anchors: any[], options: any) => {
          const drawing = new TrendAngle(id, anchors, {
            ...options,
            trendAngleOptions: {
              showArc: true,
              showDegrees: true,
              arcRadius: 40,
            },
          });
          (drawing as any).type = 'gann-angle';
          return drawing;
        },
      } as any);
    } catch {
      // safe fallback
    }

    console.log('[Drawing Direction Enhancer] Bidirectional Ray, Gann Fan, Dense Gann Angle Grid, and Gann Box installed successfully.');
  } catch (err: any) {
    console.warn('[Drawing Direction Enhancer] Failed to patch prototypes:', err.message);
  }
}
