import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  ColorType,
  IChartApi,
  ISeriesApi,
  MouseEventParams,
} from 'lightweight-charts';
import {
  DrawingManager,
  ToolRegistry,
  IDrawing,
  Drawing,
  GannFan,
  GannBox,
} from 'lightweight-charts-drawing';
import { DrawingToolbar } from './chart/DrawingToolbar';
import { DrawingPropertiesDialog } from './chart/DrawingPropertiesDialog';
import { ObjectTreePanel, ObjectTreeItem } from './chart/ObjectTreePanel';
import { DRAWING_TOOLS } from './chart/toolsConfig';
import { ChartAnchor, SerializedDrawingPayload } from './chart/types';
import { Check, Loader2, X, Database, RefreshCw, Save, RotateCcw, ZoomIn, ZoomOut, Zap, Radio } from 'lucide-react';
import { installGannBoxEnhancer } from './chart/gannBoxEnhancer';
import { installDirectionalEnhancers, timeToLogicalIndex } from './chart/drawingDirectionEnhancer';
import { useAuth } from '../context/AuthContext';
import { MarketStreamClient } from '../services/marketStreamClient';
import { SmcLuxAlgoSeriesPrimitive } from './chart/smcLuxAlgoPrimitive';
import { SmcLuxAlgoSettings, DEFAULT_SMC_SETTINGS, SmcAnalysisResult } from './chart/smcLuxAlgoTypes';
import { calculateSmcLuxAlgo } from './chart/smcLuxAlgoCalculator';
import { SmcLuxAlgoOverlay } from './chart/SmcLuxAlgoOverlay';

// Install TradingView-style Gann Box & Directional (Ray, Gann Fan, Gann Angle) enhancers
installGannBoxEnhancer();
installDirectionalEnhancers();

// Permanently disable autoscaleInfo on Drawing and all subclasses so drawings NEVER cause the chart to zoom in or out
if (Drawing && Drawing.prototype) {
  (Drawing.prototype as any).autoscaleInfo = function () {
    return null;
  };
}
if (GannFan && (GannFan as any).prototype) {
  ((GannFan as any).prototype as any).autoscaleInfo = function () {
    return null;
  };
}
if (GannBox && (GannBox as any).prototype) {
  ((GannBox as any).prototype as any).autoscaleInfo = function () {
    return null;
  };
}

function formatIntervalDisplay(inv: string): string {
  const raw = (inv || '15').trim();
  if (raw === '1M' || raw === 'M' || raw.toLowerCase() === '1mo' || raw.toLowerCase() === 'month') return '1M';
  if (raw === '1W' || raw === 'W' || raw.toLowerCase() === 'week') return '1W';
  if (raw === '1D' || raw === 'D' || raw.toLowerCase() === 'day') return '1D';
  if (raw === '240' || raw.toLowerCase() === '4h') return '4H';
  if (raw === '120' || raw.toLowerCase() === '2h') return '2H';
  if (raw === '60' || raw.toLowerCase() === '1h') return '1H';
  if (raw === '30' || raw.toLowerCase() === '30m') return '30m';
  if (raw === '15' || raw.toLowerCase() === '15m') return '15m';
  if (raw === '5' || raw.toLowerCase() === '5m') return '5m';
  if (raw === '1' || raw.toLowerCase() === '1m') return '1m';
  const norm = raw.toLowerCase();
  if (norm === '1' || norm === '1m') return '1m';
  if (norm === '5' || norm === '5m') return '5m';
  if (norm === '15' || norm === '15m') return '15m';
  if (norm === '30' || norm === '30m') return '30m';
  if (norm === '60' || norm === '1h') return '1H';
  if (norm === '120' || norm === '2h') return '2H';
  if (norm === '240' || norm === '4h') return '4H';
  if (norm === 'd' || norm === '1d' || norm === 'day') return '1D';
  if (norm === 'w' || norm === '1w' || norm === 'week') return '1W';
  if (norm === 'm' || norm === '1mo' || norm === 'month') return '1M';
  return inv.endsWith('m') ? inv : `${inv}m`;
}

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'dark' | 'light';
  interval?: string;
  onSelectInterval?: (interval: string) => void;
  timezone?: string;
  hideSideToolbar?: boolean;
  enableDrawingTools?: boolean;
  height?: string;
  className?: string;
  activeStrategy?: '144' | 'smc' | 'fib' | null;
  onSelectStrategy?: (strategy: '144' | 'smc' | 'fib' | null) => void;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const getStrategyStorageKey = (sym: string, strategy?: string | null): string => {
  const cleanSym = (sym || 'XAUUSD').replace(/[^a-zA-Z0-9]/g, '_');
  const stratKey = (strategy || 'default').toLowerCase();
  return `tv_drawings_${cleanSym}_${stratKey}`;
};

const saveStrategyDrawingsLocal = (
  sym: string,
  arg2: string | null | undefined | any[],
  arg3?: any[]
) => {
  try {
    let strategy: string | null | undefined = 'default';
    let drawings: any[] = [];
    if (Array.isArray(arg2)) {
      drawings = arg2;
      strategy = typeof arg3 === 'string' ? arg3 : undefined;
    } else {
      strategy = arg2;
      drawings = arg3 || [];
    }
    const key = getStrategyStorageKey(sym, strategy);
    localStorage.setItem(key, JSON.stringify(drawings || []));
  } catch (err) {
    console.warn('[Financial Chart] Local storage save failed:', err);
  }
};

const loadStrategyDrawingsLocal = (sym: string, strategy?: string | null): any[] => {
  try {
    const key = getStrategyStorageKey(sym, strategy);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    // Legacy fallback for default view
    if (!strategy || strategy === 'default') {
      const cleanSym = (sym || 'XAUUSD').replace(/[^a-zA-Z0-9]/g, '_');
      const legacy = localStorage.getItem(`tv_drawings_${cleanSym}`);
      return legacy ? JSON.parse(legacy) : [];
    }
    return [];
  } catch {
    return [];
  }
};

export function parseIntervalToSeconds(inv: string): number {
  const norm = (inv || '15').trim().toLowerCase();
  if (norm === '1' || norm === '1m') return 60;
  if (norm === '5' || norm === '5m') return 300;
  if (norm === '15' || norm === '15m') return 900;
  if (norm === '30' || norm === '30m') return 1800;
  if (norm === '60' || norm === '1h') return 3600;
  if (norm === '240' || norm === '4h') return 14400;
  if (norm === 'd' || norm === '1d' || norm === 'day') return 86400;
  if (norm === 'w' || norm === '1w' || norm === 'week') return 604800;
  if (norm === 'm' || norm === '1m' || norm === '1mo' || norm === 'month') return 2592000;
  const num = parseInt(norm, 10);
  return !isNaN(num) && num > 0 ? num * 60 : 900;
}

export function calculateCandleStepSeconds(candles: any[], interval?: string): number {
  if (Array.isArray(candles) && candles.length >= 2) {
    const diffs: number[] = [];
    const N = candles.length;
    const samples = Math.min(N - 1, 30);
    for (let i = N - 1; i > N - 1 - samples; i--) {
      const d = Number(candles[i].time) - Number(candles[i - 1].time);
      if (d > 0) diffs.push(d);
    }
    diffs.sort((a, b) => a - b);
    if (diffs.length > 0) {
      return diffs[Math.floor(diffs.length / 2)];
    }
  }
  return parseIntervalToSeconds(interval || '15');
}

/**
 * Generates continuous future time scale timestamps (whitespace data) beyond the latest market candle.
 * Provides a continuous real-time coordinate system for drawing tools like a 144-candle Gann Box without fake price candles.
 */
export function generateFutureWhitespaceScale(
  realCandles: any[],
  interval: string,
  futureCount = 500
): { time: any }[] {
  if (!realCandles || realCandles.length === 0) return [];
  const N = realCandles.length;
  const lastTime = Number(realCandles[N - 1].time);
  const step = calculateCandleStepSeconds(realCandles, interval);

  const whitespaceItems: { time: any }[] = [];
  for (let i = 1; i <= futureCount; i++) {
    whitespaceItems.push({
      time: (lastTime + i * step) as any,
    });
  }
  return whitespaceItems;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = memo(({
  symbol = 'OANDA:XAUUSD',
  interval = '15',
  onSelectInterval,
  enableDrawingTools = false,
  hideSideToolbar,
  height,
  className,
  activeStrategy = null,
  onSelectStrategy,
}) => {
  const { user, token: authToken } = useAuth();
  const isOwnerOrAdmin = user?.role === 'super_admin' || user?.role === 'admin' || user?.email === 'am29multibrand@gmail.com';
  const isOwnerOrAdminRef = useRef<boolean>(isOwnerOrAdmin);
  isOwnerOrAdminRef.current = isOwnerOrAdmin;

  const activeStrategyRef = useRef<'144' | 'smc' | 'fib' | null>(activeStrategy);
  activeStrategyRef.current = activeStrategy;

  // View-Only enforcement for strategy views:
  // ONLY admin/owner can create, edit, move, delete, or save drawings inside these 3 strategy views.
  // Regular visitors/users are strictly VIEW-ONLY.
  const effectiveDrawingTools = Boolean(
    isOwnerOrAdmin
      ? enableDrawingTools || Boolean(activeStrategy)
      : enableDrawingTools && !activeStrategy
  );
  const effectiveHideSideToolbar = hideSideToolbar !== undefined ? hideSideToolbar : !effectiveDrawingTools;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesApiRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const whitespaceSeriesApiRef = useRef<ISeriesApi<'Line'> | null>(null);
  const drawingManagerRef = useRef<DrawingManager | null>(null);
  const candlesRef = useRef<CandleData[]>([]);

  // State
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(true);

  // Safety watchdog: clear loading spinner after 3.5 seconds under all conditions
  useEffect(() => {
    if (isLoadingCandles) {
      const timer = setTimeout(() => {
        setIsLoadingCandles(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingCandles]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [pendingAnchors, setPendingAnchors] = useState<ChartAnchor[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState<string>('#38bdf8');
  const [currentWidth, setCurrentWidth] = useState<number>(2);
  const [saveStatus, setSaveStatus] = useState<'synced' | 'saving' | 'idle'>('idle');
  const [lastBarInfo, setLastBarInfo] = useState<{ open: number; high: number; low: number; close: number } | null>(null);
  const [isRefreshingStrategy, setIsRefreshingStrategy] = useState<boolean>(false);
  const [refreshNotification, setRefreshNotification] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'error'>('connecting');

  // Smart Money Concepts (SMC LuxAlgo) Indicator State & Primitive
  const [smcSettings, setSmcSettings] = useState<SmcLuxAlgoSettings>(() => {
    try {
      const saved = localStorage.getItem('smc_luxalgo_settings');
      if (saved) {
        return { ...DEFAULT_SMC_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_SMC_SETTINGS;
  });
  const smcSettingsRef = useRef<SmcLuxAlgoSettings>(smcSettings);
  useEffect(() => {
    smcSettingsRef.current = smcSettings;
    try {
      localStorage.setItem('smc_luxalgo_settings', JSON.stringify(smcSettings));
    } catch {}
  }, [smcSettings]);

  const [smcAnalysis, setSmcAnalysis] = useState<SmcAnalysisResult | null>(null);
  const smcPrimitiveRef = useRef<SmcLuxAlgoSeriesPrimitive | null>(null);

  // Recalculate and update SMC LuxAlgo Indicator
  const updateSmcIndicator = useCallback((candles: any[]) => {
    if (!candles || candles.length === 0) return;
    try {
      const analysis = calculateSmcLuxAlgo(candles, smcSettingsRef.current);
      setSmcAnalysis(analysis);
      smcPrimitiveRef.current?.setData(analysis, candles);
    } catch (err) {
      console.error('[Financial Chart] Error calculating SMC LuxAlgo:', err);
    }
  }, []);

  const handleUpdateSmcSettings = useCallback((newSettings: SmcLuxAlgoSettings) => {
    setSmcSettings(newSettings);
    smcSettingsRef.current = newSettings;
    smcPrimitiveRef.current?.setSettings(newSettings);
    if (candlesRef.current && candlesRef.current.length > 0) {
      updateSmcIndicator(candlesRef.current);
    }
  }, [updateSmcIndicator]);

  // The SMC indicator is active strictly and exclusively for the SMC Strategy button
  useEffect(() => {
    const isSmc = activeStrategy === 'smc';
    smcPrimitiveRef.current?.setActiveStrategy(isSmc);
    if (isSmc) {
      setSmcSettings((prev) => (prev.enabled ? prev : { ...prev, enabled: true }));
    }
  }, [activeStrategy]);

  // Magnet Mode State (Snap drawing anchors to candle OHLC levels)
  const [isMagnetActive, setIsMagnetActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('smt_chart_magnet') === 'true';
    } catch {
      return false;
    }
  });
  const isMagnetActiveRef = useRef<boolean>(isMagnetActive);
  useEffect(() => {
    isMagnetActiveRef.current = isMagnetActive;
    try {
      localStorage.setItem('smt_chart_magnet', String(isMagnetActive));
    } catch {}
  }, [isMagnetActive]);

  const handleToggleMagnet = useCallback(() => {
    setIsMagnetActive((prev) => !prev);
  }, []);

  // Professional TradingView-style Magnet: Snaps to nearest Candle OHLC only when cursor is within 24px snap radius
  const snapToCandleOHLC = useCallback((px: number, py: number, t: number, p: number): { time: number; price: number; snapped: boolean } => {
    const candles = candlesRef.current;
    const chart = chartApiRef.current;
    const series = seriesApiRef.current;
    if (!candles || candles.length === 0 || !chart || !series) {
      return { time: t, price: p, snapped: false };
    }

    const timeScale = chart.timeScale();
    const SNAP_RADIUS_PX = 24; // Professional 24px magnetic capture radius

    // Binary search to find candle index closest to timestamp t
    let low = 0;
    let high = candles.length - 1;
    let mid = 0;
    while (low <= high) {
      mid = (low + high) >> 1;
      const cTime = Number(candles[mid].time);
      if (cTime === t) break;
      if (cTime < t) low = mid + 1;
      else high = mid - 1;
    }

    // Check candidate candles within +/- 5 bars around mid
    const startIdx = Math.max(0, mid - 5);
    const endIdx = Math.min(candles.length - 1, mid + 5);

    let bestCandle: CandleData | null = null;
    let bestLevel: number | null = null;
    let minDistance = Infinity;

    for (let i = startIdx; i <= endIdx; i++) {
      const c = candles[i];
      const candleX = timeScale.timeToCoordinate(c.time as any);
      if (candleX === null || candleX === undefined || isNaN(candleX)) continue;

      const dx = Math.abs(px - candleX);
      if (dx > SNAP_RADIUS_PX + 6) continue;

      const levels = [c.high, c.low, c.open, c.close];
      for (const level of levels) {
        const levelY = series.priceToCoordinate(level);
        if (levelY === null || levelY === undefined || isNaN(levelY)) continue;

        const dist = Math.hypot(px - candleX, py - levelY);
        if (dist < minDistance) {
          minDistance = dist;
          bestCandle = c;
          bestLevel = level;
        }
      }
    }

    // If within magnetic snap radius, lock onto the exact OHLC point
    if (bestCandle && bestLevel !== null && minDistance <= SNAP_RADIUS_PX) {
      return {
        time: bestCandle.time as number,
        price: Number(bestLevel.toFixed(2)),
        snapped: true,
      };
    }

    // Outside snap radius: return smooth cursor coordinates (no forced jumping)
    return { time: t, price: p, snapped: false };
  }, []);

  // Drawing Properties Dialog State
  const [propertiesDrawing, setPropertiesDrawing] = useState<any | null>(null);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState<boolean>(false);

  const openPropertiesModal = useCallback((drawing: any) => {
    if (!drawing || !enableDrawingToolsRef.current) return;
    setPropertiesDrawing(drawing);
    setIsPropertiesOpen(true);
  }, []);
  const openPropertiesModalRef = useRef(openPropertiesModal);
  openPropertiesModalRef.current = openPropertiesModal;

  // Double-click tracker on drawings and handles
  const lastClickRef = useRef<{
    drawingId: string;
    time: number;
    point: { x: number; y: number };
  } | null>(null);

  // Sync ref with latest state for chart click callback
  const activeToolRef = useRef<string | null>(null);
  activeToolRef.current = activeTool;
  const pendingAnchorsRef = useRef<ChartAnchor[]>([]);
  pendingAnchorsRef.current = pendingAnchors;
  const currentColorRef = useRef<string>(currentColor);
  currentColorRef.current = currentColor;
  const currentWidthRef = useRef<number>(currentWidth);
  currentWidthRef.current = currentWidth;
  const enableDrawingToolsRef = useRef<boolean>(effectiveDrawingTools);
  enableDrawingToolsRef.current = effectiveDrawingTools;

  // Track active drawing drag state (anchor handle resize/move or whole drawing reposition)
  const dragStateRef = useRef<{
    type: 'handle' | 'element';
    drawing: any;
    anchorIndex?: number;
    startPoint: { x: number; y: number };
    initialPixels?: Array<{ x: number; y: number } | null>;
    initialAnchors?: Array<{ time: any; price: number }>;
    hasMoved?: boolean;
  } | null>(null);

  // Track active interactive drawing creation (1-click, 2-click, 3-click tools with live interactive preview)
  const drawingCreationRef = useRef<{
    tool: string;
    actualType: string;
    drawing: any;
    requiredAnchors: number;
    anchors: ChartAnchor[];
    startPoint: { x: number; y: number };
    hasMoved: boolean;
    isDragging: boolean;
    waitingForNextClick?: boolean;
  } | null>(null);

  const batchSaveRef = useRef<() => void>(() => {});

  // Camera state snapshot ref to lock chart position and zoom during drawing/editing
  const cameraSnapshotRef = useRef<{
    logicalRange: { from: number; to: number } | null;
    priceRange: { from: number; to: number } | null;
  } | null>(null);

  // Viewport stability guards: track manual user interactions (zoom/pan) to prevent any automatic viewport shifts
  const userHasManuallyInteractedRef = useRef<boolean>(false);
  const hasInitialFitCompletedRef = useRef<boolean>(false);

  const lockCameraForInteraction = useCallback((chart: IChartApi) => {
    try {
      const ts = chart.timeScale();
      const ps = chart.priceScale('right');
      const logicalRange = ts.getVisibleLogicalRange();
      const priceRange = ps?.getVisibleRange() ?? null;
      cameraSnapshotRef.current = { logicalRange, priceRange };

      // Disable canvas dragging and wheel/pinch zooming during active drawing or moving handles,
      // so placing a drawing (like Gann Fan) NEVER accidentally triggers zoom in or zoom out!
      chart.applyOptions({
        handleScroll: {
          pressedMouseMove: false,
          horzTouchDrag: false,
          vertTouchDrag: false,
          mouseWheel: false,
        },
        handleScale: {
          mouseWheel: false,
          pinch: false,
          axisPressedMouseMove: false,
          axisDoubleClickReset: false,
        },
      });
    } catch (e: any) {
      console.warn('[Financial Chart] Could not lock camera:', e);
    }
  }, []);

  const unlockCameraAfterInteraction = useCallback((chart: IChartApi, toolStillActive: boolean) => {
    try {
      // Re-enable chart pan and zoom controls cleanly without resetting or overriding user viewport
      if (!toolStillActive) {
        chart.applyOptions({
          handleScroll: {
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true,
            mouseWheel: true,
          },
          handleScale: {
            mouseWheel: true,
            pinch: true,
            axisPressedMouseMove: true,
            axisDoubleClickReset: true,
          },
        });
      }
      cameraSnapshotRef.current = null;
    } catch (e: any) {
      console.warn('[Financial Chart] Could not unlock camera:', e);
    }
  }, []);

  // Dedicated Tool Selection Handler
  const handleSelectTool = useCallback((toolId: string | null) => {
    if (drawingCreationRef.current) {
      drawingManagerRef.current?.removeDrawing(drawingCreationRef.current.drawing.id);
      drawingCreationRef.current = null;
    }
    setActiveTool(toolId);
    activeToolRef.current = toolId;
    setPendingAnchors([]);

    const chart = chartApiRef.current;
    const container = chartContainerRef.current;

    if (toolId) {
      // While a tool is selected for drawing, prevent accidental wheel/pinch zooming or dragging
      chart?.applyOptions({
        handleScroll: {
          pressedMouseMove: false,
          horzTouchDrag: false,
          vertTouchDrag: false,
          mouseWheel: false,
        },
        handleScale: {
          mouseWheel: false,
          pinch: false,
          axisPressedMouseMove: false,
          axisDoubleClickReset: false,
        },
      });
      if (container) {
        container.style.cursor = 'crosshair';
      }
      drawingManagerRef.current?.deselectAll();
      setSelectedDrawingId(null);
    } else {
      chart?.applyOptions({
        handleScroll: {
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
          mouseWheel: true,
        },
        handleScale: {
          mouseWheel: true,
          pinch: true,
          axisPressedMouseMove: true,
          axisDoubleClickReset: true,
        },
      });
      if (container) {
        container.style.cursor = '';
      }
    }
  }, []);

  // Object Tree and Undo/Redo State
  const [isObjectTreeOpen, setIsObjectTreeOpen] = useState<boolean>(false);
  const [drawingsList, setDrawingsList] = useState<ObjectTreeItem[]>([]);
  const undoStackRef = useRef<any[]>([]);
  const redoStackRef = useRef<any[]>([]);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  const syncDrawingsList = useCallback(() => {
    const manager = drawingManagerRef.current;
    if (!manager) {
      setDrawingsList([]);
      return;
    }
    const all = manager.getAllDrawings() || [];
    const list: ObjectTreeItem[] = all.map((d: any) => {
      const tool = DRAWING_TOOLS.find((t) => t.id === d.type);
      const name = tool?.name || (d.type ? d.type.charAt(0).toUpperCase() + d.type.slice(1).replace(/-/g, ' ') : 'Drawing');
      const firstAnchor = d.anchors?.[0];
      const previewText = firstAnchor?.price ? `$${Number(firstAnchor.price).toFixed(2)}` : undefined;
      return {
        id: d.id,
        type: d.type,
        name,
        visible: d.options?.visible !== false,
        locked: !!d.options?.locked,
        anchorsCount: d.anchors?.length || 0,
        color: d.style?.lineColor || '#3B82F6',
        previewText,
        rawDrawing: d,
      };
    });
    setDrawingsList(list);
  }, []);

  const pushUndoSnapshot = useCallback(() => {
    const manager = drawingManagerRef.current;
    if (!manager) return;
    try {
      const current = manager.exportDrawings();
      undoStackRef.current.push(current);
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
      redoStackRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
    } catch {}
  }, []);

  const handleUndo = useCallback(async () => {
    const manager = drawingManagerRef.current;
    if (!manager || undoStackRef.current.length === 0) return;
    try {
      const current = manager.exportDrawings();
      redoStackRef.current.push(current);
      const prev = undoStackRef.current.pop();
      if (!prev) return;

      manager.clearAll();
      const registry = ToolRegistry.getInstance();
      prev.forEach((d: any) => {
        try {
          const restored = registry.createDrawing(d.type, d.id, d.anchors, d.style, d.options);
          if (restored) manager.addDrawing(restored);
        } catch {}
      });

      setCanUndo(undoStackRef.current.length > 0);
      setCanRedo(true);
      syncDrawingsList();
      batchSaveRef.current?.();
    } catch (e: any) {
      console.warn('[Financial Chart] Undo error:', e.message);
    }
  }, [syncDrawingsList]);

  const handleRedo = useCallback(async () => {
    const manager = drawingManagerRef.current;
    if (!manager || redoStackRef.current.length === 0) return;
    try {
      const current = manager.exportDrawings();
      undoStackRef.current.push(current);
      const next = redoStackRef.current.pop();
      if (!next) return;

      manager.clearAll();
      const registry = ToolRegistry.getInstance();
      next.forEach((d: any) => {
        try {
          const restored = registry.createDrawing(d.type, d.id, d.anchors, d.style, d.options);
          if (restored) manager.addDrawing(restored);
        } catch {}
      });

      setCanUndo(true);
      setCanRedo(redoStackRef.current.length > 0);
      syncDrawingsList();
      batchSaveRef.current?.();
    } catch (e: any) {
      console.warn('[Financial Chart] Redo error:', e.message);
    }
  }, [syncDrawingsList]);

  // 1. Get Auth Token for persistent PostgreSQL saving
  const getAuthToken = useCallback((): string | null => {
    return authToken || localStorage.getItem('smtrading_token');
  }, [authToken]);

  // Track currently active symbol and interval loaded in chart series
  const lastLoadedKeyRef = useRef<string>('');
  const prevSymbolRef = useRef<string>('');

  // 2. Fetch Candle Data
  const fetchCandles = useCallback(async (
    sym: string,
    inv: string,
    isSilent: boolean = false,
    isTimeframeChange: boolean = false,
    isSymbolChange: boolean = false,
  ) => {
    // If user is actively drawing or dragging, suppress silent candle updates to keep chart coordinates locked
    if (isSilent && (dragStateRef.current || drawingCreationRef.current)) {
      return;
    }
    const requestKey = `${sym}_${inv}`;
    const isColdMount = candlesRef.current.length === 0;

    // Capture visible time and price window before updating if timeframe change
    const prevTimeRange = isTimeframeChange ? chartApiRef.current?.timeScale().getVisibleRange() : null;
    const prevPriceRange = isTimeframeChange ? chartApiRef.current?.priceScale('right')?.getVisibleRange() : null;
    const isPriceAutoScaled = isTimeframeChange ? (chartApiRef.current?.priceScale('right')?.options().autoScale ?? true) : true;

    try {
      if (!isSilent || isColdMount) {
        setIsLoadingCandles(true);
      }

      // Resilient fetch with automatic retries for container start-ups and network blips
      let res: Response | null = null;
      let data: any = null;
      const maxRetries = isSilent ? 1 : 2;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);
          res = await fetch(
            `/api/market/candles?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(inv)}`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              data = await res.json();
              if (data?.status === 'ok' && Array.isArray(data?.candles) && data.candles.length > 0) {
                break;
              }
            } else {
              console.warn('[Financial Chart] Non-JSON Content-Type received:', contentType);
            }
          }
        } catch (fetchErr: any) {
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          } else {
            throw fetchErr;
          }
        }
      }

      // If network fetch failed or returned no candles, attempt to restore from local storage cache
      if (!data || data.status !== 'ok' || !Array.isArray(data.candles) || data.candles.length === 0) {
        const localKey = `smtrading_cached_candles_${sym}_${inv}`;
        const cachedRaw = localStorage.getItem(localKey);
        if (cachedRaw) {
          try {
            const parsed = JSON.parse(cachedRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              data = { status: 'ok', candles: parsed, source: 'local_cache' };
            }
          } catch {}
        }
      }

      if (data && data.status === 'ok' && Array.isArray(data.candles) && data.candles.length > 0) {
        const incomingCandles = data.candles;
        const existingCandles = candlesRef.current;

        candlesRef.current = incomingCandles;
        (window as any).__chartCandles = incomingCandles;
        (window as any).__chartInterval = inv;

        // Persist to local cache for offline/instant resilience
        try {
          const localKey = `smtrading_cached_candles_${sym}_${inv}`;
          localStorage.setItem(localKey, JSON.stringify(incomingCandles.slice(-200)));
        } catch {}

        // Update LuxAlgo Smart Money Concepts (SMC) Indicator
        updateSmcIndicator(incomingCandles);

        if (seriesApiRef.current) {
          if (isSymbolChange) {
            // Explicit symbol change initiated by user: initialize future whitespace and set comfortable initial viewport
            const futureWhitespace = generateFutureWhitespaceScale(incomingCandles, inv, 500);
            if (whitespaceSeriesApiRef.current) {
              const fullTimeline = [
                ...incomingCandles.map((c: any) => ({ time: c.time })),
                ...futureWhitespace,
              ];
              whitespaceSeriesApiRef.current.setData(fullTimeline);
            }
            seriesApiRef.current.setData(incomingCandles);
            const totalReal = incomingCandles.length;
            const visibleBars = 100;
            const futureMargin = 25;
            const from = Math.max(0, totalReal - visibleBars + futureMargin);
            const to = totalReal + futureMargin;
            chartApiRef.current?.timeScale().setVisibleLogicalRange({ from, to });
            userHasManuallyInteractedRef.current = false;
            hasInitialFitCompletedRef.current = true;
          } else if (isColdMount && !hasInitialFitCompletedRef.current && !userHasManuallyInteractedRef.current) {
            // First time loading candles on cold start: initialize future whitespace and set comfortable initial viewport once
            const futureWhitespace = generateFutureWhitespaceScale(incomingCandles, inv, 500);
            if (whitespaceSeriesApiRef.current) {
              const fullTimeline = [
                ...incomingCandles.map((c: any) => ({ time: c.time })),
                ...futureWhitespace,
              ];
              whitespaceSeriesApiRef.current.setData(fullTimeline);
            }
            seriesApiRef.current.setData(incomingCandles);
            const totalReal = incomingCandles.length;
            const visibleBars = 100;
            const futureMargin = 25;
            const from = Math.max(0, totalReal - visibleBars + futureMargin);
            const to = totalReal + futureMargin;
            chartApiRef.current?.timeScale().setVisibleLogicalRange({ from, to });
            hasInitialFitCompletedRef.current = true;
          } else if (isTimeframeChange) {
            // Timeframe change: update future whitespace and dataset
            const futureWhitespace = generateFutureWhitespaceScale(incomingCandles, inv, 500);
            if (whitespaceSeriesApiRef.current) {
              const fullTimeline = [
                ...incomingCandles.map((c: any) => ({ time: c.time })),
                ...futureWhitespace,
              ];
              whitespaceSeriesApiRef.current.setData(fullTimeline);
            }
            seriesApiRef.current.setData(incomingCandles);

            // Cleanly position viewport to display the latest price action with optimal density.
            // If the previous visible range safely maps to a healthy bar count on the new timeframe,
            // maintain that range; otherwise, reset to standard 100 visible bars + 20 future margin.
            const totalReal = incomingCandles.length;
            let appliedValidRange = false;
            if (prevTimeRange && typeof prevTimeRange.from === 'number' && typeof prevTimeRange.to === 'number' && prevTimeRange.to > prevTimeRange.from) {
              try {
                const logicalFrom = timeToLogicalIndex(prevTimeRange.from, incomingCandles);
                const logicalTo = timeToLogicalIndex(prevTimeRange.to, incomingCandles);
                const barCount = logicalTo - logicalFrom;
                if (!isNaN(logicalFrom) && !isNaN(logicalTo) && barCount >= 25 && barCount <= 250 && logicalFrom >= -10 && logicalTo <= totalReal + 80) {
                  chartApiRef.current?.timeScale().setVisibleLogicalRange({ from: logicalFrom, to: logicalTo });
                  appliedValidRange = true;
                }
              } catch {
                appliedValidRange = false;
              }
            }

            if (!appliedValidRange) {
              const visibleBars = Math.min(100, Math.max(30, totalReal));
              const futureMargin = 20;
              const from = Math.max(0, totalReal - visibleBars + futureMargin);
              const to = totalReal + futureMargin;
              chartApiRef.current?.timeScale().setVisibleLogicalRange({ from, to });
            }
            chartApiRef.current?.priceScale('right')?.applyOptions({ autoScale: true });
          } else {
            // Live candle updates / background streaming polling:
            // The chart must NEVER automatically call fitContent, reset the visible range,
            // recreate the chart, or restore the default viewport after the user manually zooms or pans.
            // Live candle updates update the data only (via series.update) and must not change the user's current viewport.
            // Never call setData on either series or touch the viewport during live updates.
            if (incomingCandles.length > 0) {
              const lastIncoming = incomingCandles[incomingCandles.length - 1];
              seriesApiRef.current.update(lastIncoming);
              updateSmcIndicator(incomingCandles);
            }
          }

          const last = incomingCandles[incomingCandles.length - 1];
          setLastBarInfo({ open: last.open, high: last.high, low: last.low, close: last.close });
        }

        if (chartApiRef.current) {
          (chartApiRef.current as any)._candles = incomingCandles;
          (chartApiRef.current as any)._currentInterval = inv;
        }

        // Immediately recalculate screen positions for all drawings on the new timeframe
        const manager = drawingManagerRef.current;
        if (manager) {
          const all = manager.getAllDrawings() || [];
          all.forEach((d: any) => {
            d._currentChartInterval = inv;
            d.requestUpdate?.();
          });
          requestAnimationFrame(() => {
            all.forEach((d: any) => d.requestUpdate?.());
          });
          setTimeout(() => {
            all.forEach((d: any) => d.requestUpdate?.());
          }, 80);
        }
        syncDrawingsList();
        lastLoadedKeyRef.current = requestKey;
      }
    } catch (err: any) {
      if (isSilent) {
        console.warn('[Financial Chart] Background candle refresh skipped:', err.message);
      } else {
        console.warn('[Financial Chart] Candle feed notice:', err.message);
        // If cold mount failed, schedule a single deferred retry
        if (isColdMount) {
          setTimeout(() => {
            if (candlesRef.current.length === 0) {
              fetchCandles(sym, inv, false, false, false);
            }
          }, 2500);
        }
      }
    } finally {
      setIsLoadingCandles(false);
    }
  }, [syncDrawingsList]);

  // 3. Fetch Published Drawings (PostgreSQL with LocalStorage fallback) partitioned by Strategy View
  const loadPostgresDrawings = useCallback(async (
    sym: string,
    inv: string,
    force: boolean = false,
    targetStrategy: '144' | 'smc' | 'fib' | null = activeStrategyRef.current
  ) => {
    try {
      const manager = drawingManagerRef.current;
      if (!manager) return;

      const stratKey = (targetStrategy || 'default').toLowerCase();

      // If not forcing a reload and we already have drawings loaded for this symbol & strategy, keep them
      if (!force && (manager.getAllDrawings() || []).length > 0) {
        return;
      }

      let rawDrawings: SerializedDrawingPayload[] = [];
      try {
        const res = await fetch(`/api/chart-drawings?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(inv)}&strategy=${encodeURIComponent(stratKey)}`);
        const data = await res.json();
        if (data.status === 'ok' && Array.isArray(data.drawings)) {
          rawDrawings = data.drawings;
        }
      } catch (networkErr: any) {
        console.warn('[Financial Chart] Network fetch drawings notice:', networkErr.message);
      }

      // Fallback to local storage if PostgreSQL returns empty
      if (rawDrawings.length === 0) {
        const localList = loadStrategyDrawingsLocal(sym, targetStrategy);
        if (Array.isArray(localList) && localList.length > 0) {
          rawDrawings = localList;
        }
      }

      // Clear previous drawings to render a clean, isolated strategy view
      manager.clearAll();

      if (rawDrawings.length > 0) {
        const registry = ToolRegistry.getInstance();
        // Regular visitors/users in a strategy view are strictly view-only (drawings locked)
        const isReadOnlyView = Boolean(targetStrategy) && !isOwnerOrAdminRef.current;

        rawDrawings.forEach((d: SerializedDrawingPayload) => {
          if (!d.type || !d.anchors || d.anchors.length === 0) return;
          try {
            let actualType = d.type;
            if (!registry.has(actualType)) {
              if (actualType === 'pitchfork') actualType = 'andrews-pitchfork';
              else if (actualType === 'measure') actualType = 'date-price-range';
              else if (actualType === 'gann-angle') actualType = 'trend-angle';
            }

            const isLocked = isReadOnlyView || !enableDrawingToolsRef.current;
            const restored = registry.createDrawing(
              actualType,
              d.id,
              d.anchors as any,
              d.style,
              { ...d.options, locked: isLocked }
            );

            if (restored) {
              (restored as any)._currentChartInterval = inv;
              (restored as any)._strategy = stratKey;
              if (actualType === 'gann-box' || actualType === 'gannbox') {
                const combinedGannOpts = {
                  ...(d.options || {}),
                  ...((d as any).gannOptions || {}),
                };
                if (typeof (restored as any).setGannOptions === 'function') {
                  (restored as any).setGannOptions(combinedGannOpts);
                }
              }
              if (d.options) {
                const restAny = restored as any;
                if (typeof restAny.setRectangleOptions === 'function') restAny.setRectangleOptions(d.options);
                if (typeof restAny.setTrendLineOptions === 'function') restAny.setTrendLineOptions(d.options);
                if (typeof restAny.setRayOptions === 'function') restAny.setRayOptions(d.options);
                if (typeof restAny.setExtendedLineOptions === 'function') restAny.setExtendedLineOptions(d.options);
                if (typeof restAny.setHorizontalLineOptions === 'function') restAny.setHorizontalLineOptions(d.options);
                if (typeof restAny.setHorizontalRayOptions === 'function') restAny.setHorizontalRayOptions(d.options);
                if (typeof restAny.setArrowOptions === 'function') restAny.setArrowOptions(d.options);
                if (typeof restAny.setChannelOptions === 'function') restAny.setChannelOptions(d.options);
                if (typeof restAny.setFibOptions === 'function') restAny.setFibOptions(d.options);
                if (typeof restAny.setGannOptions === 'function') restAny.setGannOptions(d.options);
                if (typeof restAny.setPitchforkOptions === 'function') restAny.setPitchforkOptions(d.options);
                if (typeof restAny.setCircleOptions === 'function') restAny.setCircleOptions(d.options);
                if (typeof restAny.setTriangleOptions === 'function') restAny.setTriangleOptions(d.options);
                if (typeof restAny.setTextOptions === 'function') restAny.setTextOptions(d.options);
                if (typeof restAny.setCalloutOptions === 'function') restAny.setCalloutOptions(d.options);
                if (typeof restAny.setBrushOptions === 'function') restAny.setBrushOptions(d.options);
                if (typeof restAny.setRotatedRectangleOptions === 'function') restAny.setRotatedRectangleOptions(d.options);
                if (typeof restAny.setTrendAngleOptions === 'function') restAny.setTrendAngleOptions(d.options);
              }
              manager.addDrawing(restored);
              restored.requestUpdate?.();
            }
          } catch (restoreErr: any) {
            console.warn('[Financial Chart] Failed to restore drawing:', d.id, restoreErr.message);
          }
        });
      }

      setSaveStatus('synced');
      syncDrawingsList();
    } catch (err: any) {
      console.error('[Financial Chart] Error loading drawings:', err.message);
    }
  }, [syncDrawingsList]);

  // 4. Save Single Drawing (Local Storage & PostgreSQL) partitioned by Strategy View
  const saveDrawingToPostgres = useCallback(async (drawingPayload: any) => {
    const manager = drawingManagerRef.current;
    const currentStrat = activeStrategyRef.current;
    if (manager) {
      saveStrategyDrawingsLocal(symbol, currentStrat, manager.exportDrawings());
    }

    if (!isOwnerOrAdminRef.current) return;

    const token = getAuthToken();
    if (!token) return;

    try {
      setSaveStatus('saving');
      let finalPayload = drawingPayload;
      if (manager && drawingPayload?.id) {
        const live = manager.getDrawing(drawingPayload.id);
        if (live && (live as any).gannOptions) {
          finalPayload = {
            ...drawingPayload,
            options: {
              ...(drawingPayload.options || {}),
              ...(live as any).gannOptions,
            },
            gannOptions: (live as any).gannOptions,
          };
        }
      }

      const res = await fetch('/api/chart-drawings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol,
          interval,
          strategy: (currentStrat || 'default').toLowerCase(),
          drawing: finalPayload,
        }),
      });

      if (res.ok) {
        setSaveStatus('synced');
      }
    } catch (err: any) {
      console.error('[Financial Chart] Failed to save drawing to PostgreSQL:', err.message);
      setSaveStatus('idle');
    }
  }, [symbol, interval, getAuthToken]);

  // 5. Batch Save Drawings (Local Storage & PostgreSQL) partitioned by Strategy View
  const batchSaveToPostgres = useCallback(async () => {
    const manager = drawingManagerRef.current;
    if (!manager) return;

    const currentStrat = activeStrategyRef.current;
    const allDrawings = manager.exportDrawings().map((d: any) => {
      const live = manager.getDrawing(d.id);
      if (live && (live as any).gannOptions) {
        return {
          ...d,
          options: {
            ...(d.options || {}),
            ...(live as any).gannOptions,
          },
          gannOptions: (live as any).gannOptions,
        };
      }
      return d;
    });

    saveStrategyDrawingsLocal(symbol, currentStrat, allDrawings);

    if (!isOwnerOrAdminRef.current) {
      setSaveStatus('synced');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setSaveStatus('synced');
      return;
    }

    try {
      setSaveStatus('saving');
      const res = await fetch('/api/chart-drawings/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol,
          interval,
          strategy: (currentStrat || 'default').toLowerCase(),
          drawings: allDrawings,
        }),
      });

      if (res.ok) {
        setSaveStatus('synced');
      } else {
        setSaveStatus('idle');
      }
    } catch (err: any) {
      console.error('[Financial Chart] Batch save error:', err.message);
      setSaveStatus('idle');
    }
  }, [symbol, interval, getAuthToken]);
  batchSaveRef.current = batchSaveToPostgres;

  // 5.1 Manual Refresh Strategy (fetches & applies latest saved strategy without reloading page, preserving symbol & interval)
  const handleManualRefreshStrategy = useCallback(async () => {
    if (isRefreshingStrategy) return;
    setIsRefreshingStrategy(true);
    setRefreshNotification(null);
    try {
      await loadPostgresDrawings(symbol, interval, true, activeStrategy);
      const stratLabel = activeStrategy === '144' ? '144 Strategy' : activeStrategy === 'smc' ? 'SMC Strategy' : activeStrategy === 'fib' ? 'Fibonacci Strategy' : 'Strategy';
      setRefreshNotification(`${stratLabel} Refreshed`);
      setTimeout(() => {
        setRefreshNotification(null);
      }, 2500);
    } catch (err: any) {
      console.error('[Financial Chart] Strategy refresh error:', err?.message || err);
    } finally {
      setIsRefreshingStrategy(false);
    }
  }, [isRefreshingStrategy, loadPostgresDrawings, symbol, interval, activeStrategy]);

  // 5.2 Manual Save Strategy (for Super Admin & Admin)
  const handleManualSaveStrategy = useCallback(async () => {
    if (saveStatus === 'saving') return;
    await batchSaveToPostgres();
  }, [saveStatus, batchSaveToPostgres]);

  // 5.3 Reset / Refresh Chart View (returns chart to standard initial view, zoom, and position without deleting drawings)
  const handleResetChartView = useCallback(() => {
    if (!chartApiRef.current) return;
    try {
      userHasManuallyInteractedRef.current = false;
      hasInitialFitCompletedRef.current = false;
      chartApiRef.current.timeScale().resetTimeScale();
      const totalReal = candlesRef.current.length;
      if (totalReal > 0) {
        const visibleBars = 100;
        const futureMargin = 25;
        const from = Math.max(0, totalReal - visibleBars + futureMargin);
        const to = totalReal + futureMargin;
        chartApiRef.current.timeScale().setVisibleLogicalRange({ from, to });
      } else {
        chartApiRef.current.timeScale().fitContent();
      }
      chartApiRef.current.priceScale('right')?.applyOptions({
        autoScale: true,
      });
      // Synchronize all drawings so their viewport projection matches the reset state
      drawingManagerRef.current?.getAllDrawings().forEach((d: any) => {
        d.requestUpdate?.();
      });
      setRefreshNotification('Chart view reset to standard initial position');
      setTimeout(() => {
        setRefreshNotification(null);
      }, 2500);
    } catch (err: any) {
      console.warn('[Financial Chart] Error resetting chart view:', err.message);
    }
  }, []);

  // 5.4 Explicit Zoom In / Zoom Out Controls
  const handleZoomIn = useCallback(() => {
    if (!chartApiRef.current) return;
    try {
      const ts = chartApiRef.current.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (!range) return;
      const span = range.to - range.from;
      const delta = Math.max(1, span * 0.15);
      ts.setVisibleLogicalRange({
        from: range.from + delta,
        to: range.to - delta,
      });
      drawingManagerRef.current?.getAllDrawings().forEach((d: any) => d.requestUpdate?.());
    } catch (err: any) {
      console.warn('[Financial Chart] Error zooming in:', err);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!chartApiRef.current) return;
    try {
      const ts = chartApiRef.current.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (!range) return;
      const span = range.to - range.from;
      const delta = Math.max(1, span * 0.15);
      ts.setVisibleLogicalRange({
        from: range.from - delta,
        to: range.to + delta,
      });
      drawingManagerRef.current?.getAllDrawings().forEach((d: any) => d.requestUpdate?.());
    } catch (err: any) {
      console.warn('[Financial Chart] Error zooming out:', err);
    }
  }, []);

  // 6. Delete Selected Drawing
  const handleDeleteSelected = useCallback(async () => {
    if (!selectedDrawingId) return;
    const manager = drawingManagerRef.current;
    if (manager) {
      manager.removeDrawing(selectedDrawingId);
      saveStrategyDrawingsLocal(symbol, activeStrategyRef.current, manager.exportDrawings());
    }

    const token = getAuthToken();
    if (token && isOwnerOrAdminRef.current) {
      try {
        setSaveStatus('saving');
        await fetch(`/api/chart-drawings/${encodeURIComponent(selectedDrawingId)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        setSaveStatus('synced');
      } catch (err: any) {
        console.error('[Financial Chart] Delete drawing error:', err.message);
      }
    }

    setSelectedDrawingId(null);
    syncDrawingsList();
  }, [selectedDrawingId, getAuthToken, symbol, syncDrawingsList]);

  // 7. Clear All Drawings
  const handleClearAll = useCallback(async () => {
    pushUndoSnapshot();
    const manager = drawingManagerRef.current;
    if (manager) {
      manager.clearAll();
      saveStrategyDrawingsLocal(symbol, activeStrategyRef.current, []);
    }

    const token = getAuthToken();
    if (token && isOwnerOrAdminRef.current) {
      try {
        setSaveStatus('saving');
        await fetch('/api/chart-drawings/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            symbol,
            interval,
            strategy: (activeStrategyRef.current || 'default').toLowerCase(),
            drawings: [],
          }),
        });
        setSaveStatus('synced');
      } catch (err: any) {
        console.error('[Financial Chart] Clear all error:', err.message);
      }
    }

    setSelectedDrawingId(null);
    syncDrawingsList();
  }, [symbol, interval, getAuthToken, pushUndoSnapshot, syncDrawingsList]);

  // 7.1 Object Tree & Drawing Manager Actions
  const handleToggleDrawingVisibility = useCallback((id: string) => {
    const manager = drawingManagerRef.current;
    if (!manager) return;
    const d = manager.getDrawing(id);
    if (!d) return;
    d.options.visible = d.options.visible === false ? true : false;
    d.requestUpdate?.();
    syncDrawingsList();
    batchSaveRef.current?.();
  }, [syncDrawingsList]);

  const handleToggleDrawingLock = useCallback((id: string) => {
    const manager = drawingManagerRef.current;
    if (!manager) return;
    const d = manager.getDrawing(id);
    if (!d) return;
    d.options.locked = !d.options.locked;
    d.requestUpdate?.();
    syncDrawingsList();
    batchSaveRef.current?.();
  }, [syncDrawingsList]);

  const handleToggleAllVisibility = useCallback(() => {
    const manager = drawingManagerRef.current;
    if (!manager) return;
    const all = manager.getAllDrawings() || [];
    if (all.length === 0) return;
    const anyVisible = all.some((d: any) => d.options.visible !== false);
    const targetVis = !anyVisible;
    all.forEach((d: any) => {
      d.options.visible = targetVis;
      d.requestUpdate?.();
    });
    syncDrawingsList();
    batchSaveRef.current?.();
  }, [syncDrawingsList]);

  const handleToggleAllLock = useCallback(() => {
    const manager = drawingManagerRef.current;
    if (!manager) return;
    const all = manager.getAllDrawings() || [];
    if (all.length === 0) return;
    const allAreLocked = all.every((d: any) => !!d.options.locked);
    const targetLocked = !allAreLocked;
    all.forEach((d: any) => {
      d.options.locked = targetLocked;
      d.requestUpdate?.();
    });
    syncDrawingsList();
    batchSaveRef.current?.();
  }, [syncDrawingsList]);

  const handleDeleteIndividualDrawing = useCallback(async (id: string) => {
    const manager = drawingManagerRef.current;
    if (!manager) return;
    pushUndoSnapshot();
    manager.removeDrawing(id);
    if (selectedDrawingId === id) setSelectedDrawingId(null);
    syncDrawingsList();

    const token = getAuthToken();
    if (token) {
      try {
        setSaveStatus('saving');
        await fetch(`/api/chart-drawings/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        setSaveStatus('synced');
      } catch (err: any) {
        console.error('[Financial Chart] Delete drawing error:', err.message);
      }
    }
  }, [selectedDrawingId, pushUndoSnapshot, syncDrawingsList, getAuthToken]);

  // 8. Initialize Lightweight Chart & Drawing Manager
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create Chart Instance
    const container = chartContainerRef.current;
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#090D17' },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#131B2E' },
        horzLines: { color: '#131B2E' },
      },
      crosshair: {
        vertLine: { color: '#475569', width: 1, style: 2 },
        horzLine: { color: '#475569', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: true,
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 25,
        shiftVisibleRangeOnNewBar: false,
        allowShiftVisibleRangeOnWhitespaceReplacement: false,
      },
      handleScroll: {
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
        mouseWheel: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
        axisDoubleClickReset: true,
      },
      width: container.clientWidth || 800,
      height: container.clientHeight || 500,
    });

    chartApiRef.current = chart;
    (window as any).__currentChart = chart;

    // Add Candlestick Series with pure candle-based autoscale (ignoring all drawings)
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      autoscaleInfoProvider: (original: () => any) => {
        // Pure candle-based autoscale, ignoring any drawings completely
        return original();
      },
    });

    seriesApiRef.current = series;

    // Attach LuxAlgo Smart Money Concepts (SMC) Series Primitive (active strictly and exclusively for SMC Strategy)
    const smcPrimitive = new SmcLuxAlgoSeriesPrimitive(smcSettingsRef.current);
    smcPrimitive.setActiveStrategy(activeStrategy === 'smc');
    try {
      series.attachPrimitive(smcPrimitive);
      smcPrimitiveRef.current = smcPrimitive;
      if (candlesRef.current && candlesRef.current.length > 0) {
        const initialAnalysis = calculateSmcLuxAlgo(candlesRef.current, smcSettingsRef.current);
        setSmcAnalysis(initialAnalysis);
        smcPrimitive.setData(initialAnalysis, candlesRef.current);
      }
    } catch (err) {
      console.error('[Financial Chart] Failed to attach SMC LuxAlgo primitive:', err);
    }

    // Add invisible auxiliary Whitespace Series to extend the horizontal time axis
    // into future time coordinates (without fake price candles or affecting price scale)
    const whitespaceSeries = chart.addSeries(LineSeries, {
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      autoscaleInfoProvider: () => null,
    });
    whitespaceSeriesApiRef.current = whitespaceSeries;

    // Attach Drawing Manager
    const manager = new DrawingManager();
    manager.attach(chart, series, container);
    drawingManagerRef.current = manager;

    // Ensure all drawings added to manager explicitly have autoscaleInfo disabled
    manager.on('drawing:added', (payload: any) => {
      const d = payload?.drawing || payload;
      if (d) {
        d.autoscaleInfo = () => null;
      }
    });

    // Remove DrawingManager's default unhandled listeners so our prioritized capture handler
    // has complete control over hit-testing, event propagation, and chart pan prevention
    const rawManager = manager as any;
    if (typeof rawManager.handleMouseDown === 'function') {
      container.removeEventListener('mousedown', rawManager.handleMouseDown);
    }
    if (typeof rawManager.handleMouseMove === 'function') {
      container.removeEventListener('mousemove', rawManager.handleMouseMove);
    }
    if (typeof rawManager.handleMouseUp === 'function') {
      container.removeEventListener('mouseup', rawManager.handleMouseUp);
    }
    if (typeof rawManager.handleClick === 'function') {
      try {
        chart.unsubscribeClick(rawManager.handleClick);
      } catch {}
    }

    // Helper to detect if cursor hits any anchor handle of a drawing
    const getHitAnchor = (drawing: any, point: { x: number; y: number }): number | null => {
      if (!drawing || !drawingManagerRef.current) return null;
      const viewport = (drawingManagerRef.current as any).getViewport?.();
      if (!viewport) return null;

      // 1. Precise control point check (Gann Box 6 control points & custom tools)
      if (typeof drawing.getControlPoints === 'function') {
        const cps = drawing.getControlPoints(viewport);
        if (Array.isArray(cps)) {
          for (const cp of cps) {
            const dist = Math.hypot(point.x - cp.x, point.y - cp.y);
            if (dist <= 14) {
              return cp.index;
            }
          }
        }
      }

      // 2. Direct distance check to each anchor pixel
      if (Array.isArray(drawing.anchors)) {
        for (let i = 0; i < drawing.anchors.length; i++) {
          const pixel = drawing.anchorToPixel?.(drawing.anchors[i], viewport);
          if (pixel && !isNaN(pixel.x) && !isNaN(pixel.y)) {
            if (Math.hypot(pixel.x - point.x, pixel.y - point.y) <= 12) {
              return i;
            }
          }
        }
      }

      // 3. Fallback to drawing.hitTestAnchor
      if (typeof drawing.hitTestAnchor === 'function') {
        const idx = drawing.hitTestAnchor(point, viewport);
        if (idx !== null && idx !== undefined) return idx;
      }

      return null;
    };

    // Helper to calculate exact chart anchor { time, price } from container pixel coordinates
    const getPointCoords = (px: number, py: number): { time: any; price: number } | null => {
      const currentChart = chartApiRef.current;
      const currentSeries = seriesApiRef.current;
      if (!currentChart || !currentSeries) return null;
      const price = currentSeries.coordinateToPrice(py);
      if (price === null || isNaN(price)) return null;

      const chartTs = currentChart.timeScale();
      let time: number | null = null;

      // 1. Direct native coordinateToTime from continuous timeScale (works seamlessly across all real & future bars!)
      const directTime = chartTs?.coordinateToTime ? chartTs.coordinateToTime(px) : null;
      if (directTime !== null && directTime !== undefined) {
        if (typeof directTime === 'number') {
          time = directTime;
        } else if (typeof directTime === 'string') {
          time = Math.floor(new Date(directTime).getTime() / 1000);
        } else if (typeof directTime === 'object' && directTime && 'year' in (directTime as any)) {
          const bd = directTime as any;
          time = Math.floor(Date.UTC(bd.year, bd.month - 1, bd.day) / 1000);
        }
      }

      // 2. Fallback logical projection if coordinate is beyond the future whitespace runway
      if (!time && candlesRef.current.length > 0) {
        const logical = chartTs?.coordinateToLogical ? chartTs.coordinateToLogical(px) : null;
        if (logical !== null && !isNaN(logical)) {
          const N = candlesRef.current.length;
          const lastCandle = candlesRef.current[N - 1];
          const firstCandle = candlesRef.current[0];
          const step = calculateCandleStepSeconds(candlesRef.current, interval);
          if (logical >= N - 1) {
            time = Number(lastCandle.time) + Math.round((logical - (N - 1)) * step);
          } else if (logical < 0) {
            time = Number(firstCandle.time) + Math.round(logical * step);
          } else {
            const floor = Math.floor(logical);
            const ceil = Math.ceil(logical);
            if (floor === ceil || !candlesRef.current[ceil]) {
              const idx = Math.max(0, Math.min(N - 1, floor));
              time = Number(candlesRef.current[idx].time);
            } else {
              const t0 = Number(candlesRef.current[floor].time);
              const t1 = Number(candlesRef.current[ceil].time);
              time = Math.round(t0 + (logical - floor) * (t1 - t0));
            }
          }
        }
      }

      if (!time) return null;

      let finalTime = time;
      let finalPrice = Number(price.toFixed(2));
      if (isMagnetActiveRef.current) {
        const snapped = snapToCandleOHLC(px, py, time, price);
        finalTime = snapped.time as any;
        finalPrice = snapped.price;
      }

      return { time: finalTime, price: finalPrice };
    };

    // Prioritized pointer/mouse down capture handler
    const handlePointerDownCapture = (e: MouseEvent | TouchEvent) => {
      const currentManager = drawingManagerRef.current;
      const currentChart = chartApiRef.current;
      const currentContainer = chartContainerRef.current;
      if (!currentManager || !currentChart || !currentContainer || !enableDrawingToolsRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = currentContainer.getBoundingClientRect();
      const point = { x: clientX - rect.left, y: clientY - rect.top };

      // Allow native Lightweight Charts axis dragging / scaling on right price scale & bottom time scale!
      const priceScaleWidth = 68;
      const timeScaleHeight = 32;
      if (point.x >= rect.width - priceScaleWidth || point.y >= rect.height - timeScaleHeight) {
        return;
      }

      // 1. ACTIVE TOOL DRAWING MODE (Real interactive drawing for all tools)
      if (activeToolRef.current) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.cancelable) e.preventDefault();

        const coords = getPointCoords(point.x, point.y);
        if (!coords) return;

        const currentTool = activeToolRef.current;
        const toolDef = DRAWING_TOOLS.find(t => t.id === currentTool) || {
          id: currentTool,
          name: currentTool,
          category: 'line',
          requiredAnchors: 2,
        };

        // Case A: Next anchor placement for multi-click tool (e.g. click 2 for Trend Line / Gann Box or click 3 for Channel / Pitchfork)
        if (drawingCreationRef.current && drawingCreationRef.current.waitingForNextClick) {
          const creation = drawingCreationRef.current;
          const nextIndex = creation.anchors.length;
          creation.anchors.push(coords);
          creation.drawing.updateAnchor(nextIndex, coords);
          creation.drawing.requestUpdate();

          if (creation.anchors.length >= creation.requiredAnchors) {
            // All required anchors placed! Complete the drawing immediately!
            creation.drawing.setState('selected');
            creation.drawing.requestUpdate();
            currentManager.selectDrawing(creation.drawing.id);
            setSelectedDrawingId(creation.drawing.id);
            saveDrawingToPostgres(creation.drawing.toJSON());
            saveStrategyDrawingsLocal(symbol, activeStrategyRef.current, currentManager.exportDrawings());
            unlockCameraAfterInteraction(currentChart, false);
            currentContainer.style.cursor = '';
            setActiveTool(null);
            activeToolRef.current = null;
            setPendingAnchors([]);
            drawingCreationRef.current = null;
            pushUndoSnapshot();
            syncDrawingsList();
            return;
          } else {
            // Waiting for the next anchor (e.g. anchor 3)
            creation.waitingForNextClick = true;
            setPendingAnchors([...creation.anchors]);
            return;
          }
        }

        // Case B: First anchor placement / Start new drawing!
        lockCameraForInteraction(currentChart);

        const registry = ToolRegistry.getInstance();
        const drawingId = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        let actualToolType = currentTool;
        if (!registry.has(actualToolType)) {
          if (actualToolType === 'pitchfork') actualToolType = 'andrews-pitchfork';
          else if (actualToolType === 'measure') actualToolType = 'date-price-range';
          else if (actualToolType === 'gann-angle') actualToolType = 'trend-angle';
        }

        const requiredAnchors = toolDef.requiredAnchors || 2;

        // Subcase 1: Single-click tools (Horizontal Line, Vertical Line, Horizontal Ray, Text)
        if (requiredAnchors === 1) {
          try {
            const drawing = registry.createDrawing(
              actualToolType,
              drawingId,
              [coords],
              {
                lineColor: currentColorRef.current,
                lineWidth: currentWidthRef.current,
                fillColor: `${currentColorRef.current}1a`,
                fillOpacity: 0.15,
                showLabels: true,
              },
              { visible: true, locked: false }
            );

            if (drawing) {
              (drawing as any)._currentChartInterval = interval;
              currentManager.addDrawing(drawing);
              drawing.setState('selected');
              drawing.requestUpdate();
              currentManager.selectDrawing(drawing.id);
              setSelectedDrawingId(drawing.id);
              saveDrawingToPostgres(drawing.toJSON());
              saveStrategyDrawingsLocal(symbol, activeStrategyRef.current, currentManager.exportDrawings());
              pushUndoSnapshot();
              syncDrawingsList();
            }
          } catch (err: any) {
            console.error('[Financial Chart] Error creating 1-point drawing:', err.message);
          }

          unlockCameraAfterInteraction(currentChart, false);
          currentContainer.style.cursor = '';
          setActiveTool(null);
          activeToolRef.current = null;
          setPendingAnchors([]);
          drawingCreationRef.current = null;
          return;
        }

        // Subcase 2: Position / Risk-Reward tools (Long Position, Short Position)
        if (currentTool === 'long-position' || currentTool === 'short-position') {
          try {
            const isLong = currentTool === 'long-position';
            const candleStep = 3600;
            const tpPrice = Number((coords.price * (isLong ? 1.02 : 0.98)).toFixed(2));
            const slPrice = Number((coords.price * (isLong ? 0.99 : 1.01)).toFixed(2));
            const targetTime = Number(coords.time) + candleStep * 20;

            const positionAnchors = [
              { time: coords.time, price: coords.price },
              { time: targetTime, price: tpPrice },
              { time: targetTime, price: slPrice },
            ];

            const drawing = registry.createDrawing(
              actualToolType,
              drawingId,
              positionAnchors,
              {
                lineColor: currentColorRef.current,
                lineWidth: currentWidthRef.current,
                fillColor: `${currentColorRef.current}1a`,
                fillOpacity: 0.15,
                showLabels: true,
              },
              { visible: true, locked: false }
            );

            if (drawing) {
              (drawing as any)._currentChartInterval = interval;
              currentManager.addDrawing(drawing);
              drawing.setState('selected');
              drawing.requestUpdate();
              currentManager.selectDrawing(drawing.id);
              setSelectedDrawingId(drawing.id);
              saveDrawingToPostgres(drawing.toJSON());
              saveStrategyDrawingsLocal(symbol, activeStrategyRef.current, currentManager.exportDrawings());
              pushUndoSnapshot();
              syncDrawingsList();
            }
          } catch (err: any) {
            console.error('[Financial Chart] Error creating position tool:', err.message);
          }

          unlockCameraAfterInteraction(currentChart, false);
          currentContainer.style.cursor = '';
          setActiveTool(null);
          activeToolRef.current = null;
          setPendingAnchors([]);
          drawingCreationRef.current = null;
          return;
        }

        // Subcase 3: Multi-point tools (Trend Line, Ray, Extended Line, Arrow, Brush, Gann Box, Gann Fan, Gann Angles, Rectangle, Circle, Ellipse, Triangle, Channels, Pitchfork, Fibonacci, Ruler/Measure, Ranges)
        try {
          const initialAnchors = Array(requiredAnchors).fill({ time: coords.time, price: coords.price });
          const drawing = registry.createDrawing(
            actualToolType,
            drawingId,
            initialAnchors,
            {
              lineColor: currentColorRef.current,
              lineWidth: currentWidthRef.current,
              fillColor: `${currentColorRef.current}1a`,
              fillOpacity: 0.15,
              showLabels: true,
            },
            { visible: true, locked: false }
          );

          if (drawing) {
            (drawing as any).autoscaleInfo = () => null;
            (drawing as any)._currentChartInterval = interval;
            if (currentTool === 'gann-box') {
              (drawing as any).setGannOptions?.({
                showPriceLevels: true,
                showTimeLevels: true,
                showTopLabels: true,
                showBottomLabels: false,
                useOneColor: true,
                angles: true,
                showDiagonals: true,
              });
            }
            currentManager.addDrawing(drawing);
            drawing.setState('editing');
            drawing.requestUpdate();
          }

          drawingCreationRef.current = {
            tool: currentTool,
            actualType: actualToolType,
            drawing,
            requiredAnchors,
            anchors: [coords],
            startPoint: point,
            hasMoved: false,
            isDragging: true,
            waitingForNextClick: false,
          };
          setPendingAnchors([coords]);
        } catch (createErr: any) {
          console.error('[Financial Chart] Error creating tool:', currentTool, createErr.message);
          unlockCameraAfterInteraction(currentChart, false);
        }
        return;
      }

      // 2. CURSOR / SELECTION / DRAG MODE (No active tool selected)
      const selected = currentManager.getSelectedDrawing();
      const viewport = (currentManager as any).getViewport?.();

      // Priority 0: Double-click detector on drawings or handles to open Properties Dialog
      const hitDrawing = currentManager.hitTest(point);
      let hitAnchorIdx: number | null = null;
      let targetDrawingForAnchor: IDrawing | null = null;

      if (selected && !selected.options.locked) {
        hitAnchorIdx = getHitAnchor(selected, point);
        if (hitAnchorIdx !== null) {
          targetDrawingForAnchor = selected;
        }
      }

      if (hitAnchorIdx === null) {
        const allDrawings = currentManager.getAllDrawings();
        for (const d of allDrawings) {
          if (!d.options.locked) {
            const idx = getHitAnchor(d, point);
            if (idx !== null) {
              hitAnchorIdx = idx;
              targetDrawingForAnchor = d;
              break;
            }
          }
        }
      }

      const now = Date.now();
      const lastClick = lastClickRef.current;
      const clickedTarget = hitDrawing || targetDrawingForAnchor;

      if (
        clickedTarget &&
        lastClick &&
        lastClick.drawingId === clickedTarget.id &&
        now - lastClick.time < 450 &&
        Math.hypot(point.x - lastClick.point.x, point.y - lastClick.point.y) < 25
      ) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.cancelable) e.preventDefault();
        lastClickRef.current = null;
        openPropertiesModalRef.current(clickedTarget);
        return;
      }

      if (clickedTarget) {
        lastClickRef.current = { drawingId: clickedTarget.id, time: now, point };
      } else {
        lastClickRef.current = null;
      }

      // Priority 1: Check if an anchor handle of a drawing is hit
      if (hitAnchorIdx !== null && targetDrawingForAnchor) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.cancelable) e.preventDefault();

        if (!selected || selected.id !== targetDrawingForAnchor.id) {
          currentManager.selectDrawing(targetDrawingForAnchor.id);
          setSelectedDrawingId(targetDrawingForAnchor.id);
        }

        lockCameraForInteraction(currentChart);

        targetDrawingForAnchor.setState('editing');
        targetDrawingForAnchor.requestUpdate();

        dragStateRef.current = {
          type: 'handle',
          drawing: targetDrawingForAnchor,
          anchorIndex: hitAnchorIdx,
          startPoint: point,
          hasMoved: false,
        };
        return;
      }

      // Priority 2: Check if an actual drawing element line/body is hit
      if (hitDrawing && !hitDrawing.options.locked) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.cancelable) e.preventDefault();

        if (!selected || selected.id !== hitDrawing.id) {
          currentManager.selectDrawing(hitDrawing.id);
          setSelectedDrawingId(hitDrawing.id);
        }

        lockCameraForInteraction(currentChart);

        const initPixels = viewport
          ? hitDrawing.anchors.map((a: any) => (hitDrawing as any).anchorToPixel?.(a, viewport))
          : [];

        dragStateRef.current = {
          type: 'element',
          drawing: hitDrawing,
          startPoint: point,
          initialPixels: initPixels,
          initialAnchors: hitDrawing.anchors.map((a: any) => ({ ...a })),
          hasMoved: false,
        };
        return;
      }

      // Priority 3: User clicked empty chart space
      if (selected) {
        currentManager.deselectAll();
        setSelectedDrawingId(null);
      }

      // User clicked canvas without active drawing tool: track that the user is interacting with the chart
      if (!activeToolRef.current) {
        userHasManuallyInteractedRef.current = true;
      }
    };

    // Prioritized pointer/mouse move handler
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const currentManager = drawingManagerRef.current;
      const currentContainer = chartContainerRef.current;
      if (!currentManager || !currentContainer) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = currentContainer.getBoundingClientRect();
      const point = { x: clientX - rect.left, y: clientY - rect.top };

      // 1. Live Interactive Drawing Preview (during tool creation)
      if (drawingCreationRef.current) {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        const creation = drawingCreationRef.current;
        creation.hasMoved = true;
        const coords = getPointCoords(point.x, point.y);
        if (coords && creation.drawing) {
          if (creation.anchors.length === 1) {
            // Live update second point
            creation.drawing.updateAnchor(1, coords);
            // If tool needs 3 points, also live update third point
            if (creation.requiredAnchors >= 3 && creation.drawing.anchors.length > 2) {
              creation.drawing.updateAnchor(2, coords);
            }
          } else if (creation.anchors.length === 2) {
            // Live update third point
            creation.drawing.updateAnchor(2, coords);
          }
          creation.drawing.requestUpdate();
        }
        return;
      }

      // 2. Active Dragging of Anchor Handle or Whole Drawing
      const dragState = dragStateRef.current;
      if (!dragState) return;

      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      dragState.hasMoved = true;

      const viewport = (currentManager as any).getViewport?.();
      if (!viewport) return;

      if (dragState.type === 'handle' && dragState.anchorIndex !== undefined) {
        // Resize / reposition corner or edge handle
        const chartTs = chartApiRef.current?.timeScale?.();
        let time = viewport.timeScale.coordinateToTime(point.x);
        const price = viewport.priceScale.coordinateToPrice(point.y);

        if (!time && candlesRef.current.length > 0) {
          const N = candlesRef.current.length;
          const lastCandle = candlesRef.current[N - 1];
          const firstCandle = candlesRef.current[0];
          const step = N >= 2 ? (Number(lastCandle.time) - Number(candlesRef.current[N - 2].time)) || 3600 : 3600;
          const logical = chartTs?.coordinateToLogical ? chartTs.coordinateToLogical(point.x) : null;
          if (logical !== null && !isNaN(logical)) {
            if (logical >= N - 1) {
              time = (Number(lastCandle.time) + Math.round((logical - (N - 1)) * step)) as any;
            } else if (logical < 0) {
              time = (Number(firstCandle.time) + Math.round(logical * step)) as any;
            } else {
              const idx = Math.max(0, Math.min(N - 1, Math.round(logical)));
              time = Number(candlesRef.current[idx].time) as any;
            }
          }
        }

        if (time !== null && price !== null && !isNaN(price)) {
          let finalTime = time;
          let finalPrice = Number(price.toFixed(2));

          if (isMagnetActiveRef.current) {
            const snapped = snapToCandleOHLC(point.x, point.y, time as number, price);
            finalTime = snapped.time as any;
            finalPrice = snapped.price;
          }

          const isGannBox = dragState.drawing?.type === 'gann-box' || dragState.drawing?.type === 'gannbox';
          if (isGannBox && dragState.drawing.anchors?.length >= 2) {
            const a0 = dragState.drawing.anchors[0];
            const a1 = dragState.drawing.anchors[1];
            if (dragState.anchorIndex === 0) {
              dragState.drawing.updateAnchor(0, { time: finalTime, price: finalPrice });
            } else if (dragState.anchorIndex === 1) {
              dragState.drawing.updateAnchor(1, { time: finalTime, price: finalPrice });
            } else if (dragState.anchorIndex === 2) {
              dragState.drawing.updateAnchor(1, { time: finalTime, price: a1.price });
              dragState.drawing.updateAnchor(0, { time: a0.time, price: finalPrice });
            } else if (dragState.anchorIndex === 3) {
              dragState.drawing.updateAnchor(0, { time: finalTime, price: a0.price });
              dragState.drawing.updateAnchor(1, { time: a1.time, price: finalPrice });
            } else if (dragState.anchorIndex === 4) {
              dragState.drawing.updateAnchor(1, { time: finalTime, price: a1.price });
            } else if (dragState.anchorIndex === 5) {
              dragState.drawing.updateAnchor(0, { time: finalTime, price: a0.price });
            }
          } else {
            dragState.drawing.updateAnchor(dragState.anchorIndex, {
              time: finalTime,
              price: finalPrice,
            });
          }
          dragState.drawing.requestUpdate();
          (currentManager as any).emit?.('drawing:updated', {
            drawingId: dragState.drawing.id,
            drawing: dragState.drawing,
          });
        }
      } else if (dragState.type === 'element' && dragState.initialPixels) {
        // Reposition whole drawing element
        const dx = point.x - dragState.startPoint.x;
        const dy = point.y - dragState.startPoint.y;

        const newAnchors: any[] = [];
        let allValid = true;

        for (let i = 0; i < dragState.initialPixels.length; i++) {
          const initPix = dragState.initialPixels[i];
          if (!initPix) {
            allValid = false;
            break;
          }
          const movedPixel = { x: initPix.x + dx, y: initPix.y + dy };
          let newTime = viewport.timeScale.coordinateToTime(movedPixel.x);
          const newPrice = viewport.priceScale.coordinateToPrice(movedPixel.y);

          if (!newTime && candlesRef.current.length > 0) {
            const chartTs = chartApiRef.current?.timeScale?.();
            const N = candlesRef.current.length;
            const lastCandle = candlesRef.current[N - 1];
            const firstCandle = candlesRef.current[0];
            const step = N >= 2 ? (Number(lastCandle.time) - Number(candlesRef.current[N - 2].time)) || 3600 : 3600;
            const logical = chartTs?.coordinateToLogical ? chartTs.coordinateToLogical(movedPixel.x) : null;
            if (logical !== null && !isNaN(logical)) {
              if (logical >= N - 1) {
                newTime = (Number(lastCandle.time) + Math.round((logical - (N - 1)) * step)) as any;
              } else if (logical < 0) {
                newTime = (Number(firstCandle.time) + Math.round(logical * step)) as any;
              } else {
                const idx = Math.max(0, Math.min(N - 1, Math.round(logical)));
                newTime = Number(candlesRef.current[idx].time) as any;
              }
            }
          }

          if (newTime === null || newPrice === null || isNaN(newPrice)) {
            allValid = false;
            break;
          }

          newAnchors.push({
            time: newTime,
            price: Number(newPrice.toFixed(2)),
          });
        }

        if (allValid && newAnchors.length === dragState.drawing.anchors.length) {
          dragState.drawing.setAnchors(newAnchors);
          dragState.drawing.requestUpdate();
          (currentManager as any).emit?.('drawing:updated', {
            drawingId: dragState.drawing.id,
            drawing: dragState.drawing,
          });
        }
      }
    };

    // Release pointer handler
    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      const currentManager = drawingManagerRef.current;
      const currentChart = chartApiRef.current;
      const currentContainer = chartContainerRef.current;

      // 1. Tool creation pointer up
      if (drawingCreationRef.current) {
        const creation = drawingCreationRef.current;
        if (creation.isDragging) {
          creation.isDragging = false;
          const clientX = 'changedTouches' in e && (e as any).changedTouches ? (e as any).changedTouches[0].clientX : (e as MouseEvent).clientX;
          const clientY = 'changedTouches' in e && (e as any).changedTouches ? (e as any).changedTouches[0].clientY : (e as MouseEvent).clientY;
          let point = creation.startPoint;
          if (currentContainer && clientX !== undefined && clientY !== undefined) {
            const rect = currentContainer.getBoundingClientRect();
            point = { x: clientX - rect.left, y: clientY - rect.top };
          }
          const dist = Math.hypot(point.x - creation.startPoint.x, point.y - creation.startPoint.y);

          if (dist > 8) {
            // Drag-and-release completed
            if (creation.requiredAnchors === 2) {
              const coords = getPointCoords(point.x, point.y) || creation.drawing.anchors[1];
              creation.drawing.updateAnchor(1, coords);
              creation.drawing.setState('selected');
              creation.drawing.requestUpdate();
              currentManager?.selectDrawing(creation.drawing.id);
              setSelectedDrawingId(creation.drawing.id);
              saveDrawingToPostgres(creation.drawing.toJSON());
              saveStrategyDrawingsLocal(symbol, activeStrategyRef.current, currentManager?.exportDrawings());
              if (currentChart) unlockCameraAfterInteraction(currentChart, false);
              if (currentContainer) currentContainer.style.cursor = '';
              setActiveTool(null);
              activeToolRef.current = null;
              setPendingAnchors([]);
              drawingCreationRef.current = null;
              pushUndoSnapshot();
              syncDrawingsList();
              return;
            } else if (creation.requiredAnchors === 3) {
              const coords = getPointCoords(point.x, point.y) || creation.drawing.anchors[1];
              creation.drawing.updateAnchor(1, coords);
              creation.anchors.push(coords);
              creation.waitingForNextClick = true;
              setPendingAnchors([...creation.anchors]);
              return;
            }
          } else {
            // Click-only without drag: waiting for subsequent click
            creation.waitingForNextClick = true;
            return;
          }
        }
        return;
      }

      // 2. Element / handle drag release
      const dragState = dragStateRef.current;
      if (dragState) {
        if (dragState.drawing) {
          dragState.drawing.setState('selected');
          dragState.drawing.requestUpdate();
        }

        if (dragState.hasMoved) {
          batchSaveRef.current();
        }

        dragStateRef.current = null;
      }

      // Re-enable chart pan/scroll when mouse or touch is released if camera was locked for drawing
      if (currentChart && cameraSnapshotRef.current) {
        unlockCameraAfterInteraction(currentChart, !!activeToolRef.current);
      }
    };

    // Hover cursor feedback when not dragging
    const handleHoverMove = (e: MouseEvent) => {
      if (dragStateRef.current) return;
      const currentManager = drawingManagerRef.current;
      const currentContainer = chartContainerRef.current;
      if (!currentManager || !currentContainer || !enableDrawingToolsRef.current || activeToolRef.current) return;

      const rect = currentContainer.getBoundingClientRect();
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const selected = currentManager.getSelectedDrawing();

      if (selected && !selected.options.locked) {
        const hitAnchor = getHitAnchor(selected, point);
        if (hitAnchor !== null) {
          currentContainer.style.cursor = 'crosshair';
          return;
        }
      }

      const hitDrawing = currentManager.hitTest(point);
      if (hitDrawing && !hitDrawing.options.locked) {
        currentContainer.style.cursor = 'move';
      } else {
        currentContainer.style.cursor = 'default';
      }
    };

    const handleContainerDoubleClick = (e: MouseEvent) => {
      if (!enableDrawingToolsRef.current) return;
      const currentManager = drawingManagerRef.current;
      const currentContainer = chartContainerRef.current;
      if (!currentManager || !currentContainer) return;

      const rect = currentContainer.getBoundingClientRect();
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const hit = currentManager.hitTest(point);
      const selected = currentManager.getSelectedDrawing();
      const target = hit || selected;

      if (target) {
        e.stopPropagation();
        e.preventDefault();
        openPropertiesModalRef.current(target);
      }
    };

    // Intercept wheel events on chart container when actively placing drawings or dragging handles
    const handleWheelCapture = (e: WheelEvent) => {
      if (activeToolRef.current || drawingCreationRef.current || dragStateRef.current) {
        e.stopPropagation();
        e.preventDefault();
      } else {
        userHasManuallyInteractedRef.current = true;
      }
    };

    // Register prioritized listeners
    container.addEventListener('mousedown', handlePointerDownCapture, { capture: true });
    container.addEventListener('touchstart', handlePointerDownCapture, { capture: true, passive: false });
    container.addEventListener('wheel', handleWheelCapture, { capture: true, passive: false });
    container.addEventListener('dblclick', handleContainerDoubleClick, { capture: true });
    container.addEventListener('mousemove', handleHoverMove);

    window.addEventListener('mousemove', handlePointerMove, { passive: false });
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('touchcancel', handlePointerUp);

    // Drawing Manager Events
    manager.on('drawing:selected', (evt: any) => {
      setSelectedDrawingId(evt.drawingId || null);
    });

    manager.on('drawing:deselected', () => {
      setSelectedDrawingId(null);
    });

    manager.on('drawing:updated', () => {
      // Sync to PostgreSQL - do NOT flood network or re-renders during active drag!
      // The pointer up handler will perform batch save when the drag gesture completes.
      if (!dragStateRef.current) {
        batchSaveRef.current();
      }
    });

    // Crosshair move handler for OHLC header display (optimized to avoid re-renders when bar doesn't change)
    let lastKnownBar: { open: number; high: number; low: number; close: number } | null = null;
    chart.subscribeCrosshairMove((param) => {
      if (dragStateRef.current || drawingCreationRef.current) return;
      if (param.time && param.seriesData.get(series)) {
        const bar = param.seriesData.get(series) as any;
        if (bar && bar.open != null) {
          if (
            !lastKnownBar ||
            lastKnownBar.open !== bar.open ||
            lastKnownBar.high !== bar.high ||
            lastKnownBar.low !== bar.low ||
            lastKnownBar.close !== bar.close
          ) {
            lastKnownBar = { open: bar.open, high: bar.high, low: bar.low, close: bar.close };
            setLastBarInfo(lastKnownBar);
          }
        }
      }
    });

    // Responsive Size Synchronization & ResizeObserver
    const syncChartSize = () => {
      if (!chartContainerRef.current || !chartApiRef.current) return;
      const el = chartContainerRef.current;
      const width = Math.floor(el.clientWidth);
      const height = Math.floor(el.clientHeight);
      if (width > 0 && height > 0) {
        chartApiRef.current.applyOptions({ width, height });
        // Synchronize all drawings so they align with the updated viewport dimensions
        manager.getAllDrawings().forEach((d: any) => d.requestUpdate?.());
      }
    };

    // Keep drawings synchronized during zoom / pan without delay
    const handleVisibleRangeChange = () => {
      userHasManuallyInteractedRef.current = true;
      manager.getAllDrawings().forEach((d: any) => d.requestUpdate?.());
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    let resizeFrameId: number | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartContainerRef.current || !chartApiRef.current) return;
      if (resizeFrameId !== null) cancelAnimationFrame(resizeFrameId);
      resizeFrameId = requestAnimationFrame(() => {
        syncChartSize();
      });
    });

    resizeObserver.observe(container);

    // Multi-cycle initial dimension sync so chart occupies 100% of flex container immediately
    syncChartSize();
    requestAnimationFrame(syncChartSize);
    const initTimer1 = setTimeout(syncChartSize, 80);
    const initTimer2 = setTimeout(syncChartSize, 250);

    const handleWindowResize = () => {
      if (resizeFrameId !== null) cancelAnimationFrame(resizeFrameId);
      resizeFrameId = requestAnimationFrame(syncChartSize);
    };
    window.addEventListener('resize', handleWindowResize);

    // Keyboard Shortcuts (Escape to cancel tool, Delete to remove selected, Ctrl+Z/Y for Undo/Redo)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        setActiveTool(null);
        setPendingAnchors([]);
        manager.deselectAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = manager.getSelectedDrawing();
        if (selected) {
          handleDeleteSelected();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      if (resizeFrameId !== null) cancelAnimationFrame(resizeFrameId);
      clearTimeout(initTimer1);
      clearTimeout(initTimer2);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('mousedown', handlePointerDownCapture, { capture: true } as any);
      container.removeEventListener('touchstart', handlePointerDownCapture, { capture: true } as any);
      container.removeEventListener('wheel', handleWheelCapture, { capture: true } as any);
      container.removeEventListener('dblclick', handleContainerDoubleClick, { capture: true } as any);
      container.removeEventListener('mousemove', handleHoverMove);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('touchcancel', handlePointerUp);
      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      } catch {}
      resizeObserver.disconnect();
      if (smcPrimitiveRef.current && series) {
        try {
          series.detachPrimitive(smcPrimitiveRef.current);
        } catch {}
        smcPrimitiveRef.current = null;
      }
      manager.detach();
      chart.remove();
      chartApiRef.current = null;
      seriesApiRef.current = null;
      whitespaceSeriesApiRef.current = null;
      drawingManagerRef.current = null;
    };
  }, []);

  // 9. Load Market Data & Published Drawings on Symbol/Interval Change
  useEffect(() => {
    const key = `${symbol}_${interval}`;
    // If the chart already has this exact symbol and interval loaded, DO NOT reload!
    if (lastLoadedKeyRef.current === key) {
      return;
    }

    const isInitialMount = !prevSymbolRef.current;
    const isSymbolChange = Boolean(prevSymbolRef.current && prevSymbolRef.current !== symbol);
    prevSymbolRef.current = symbol;

    if (isInitialMount || isSymbolChange) {
      // Symbol changed: persist drawings for previous symbol, clear canvas, load drawings for new symbol
      batchSaveRef.current?.();
      if (isSymbolChange) {
        drawingManagerRef.current?.clearAll();
      }
      fetchCandles(symbol, interval, false, false, isSymbolChange);
      loadPostgresDrawings(symbol, interval, true, activeStrategy);
    } else {
      // Only interval changed: drawings are shared across all timeframes for the same symbol & strategy!
      // Persist any in-memory tweaks, fetch new candles, and reproject existing drawings onto the new timeframe
      batchSaveRef.current?.();
      fetchCandles(symbol, interval, false, true, false);
      // Only fetch from database if the manager currently has no drawings loaded
      const manager = drawingManagerRef.current;
      if (!manager || (manager.getAllDrawings() || []).length === 0) {
        loadPostgresDrawings(symbol, interval, false, activeStrategy);
      }
    }
  }, [symbol, interval, activeStrategy, fetchCandles, loadPostgresDrawings]);

  // Switch Independent Strategy Chart View (144 Strategy, SMC Strategy, Fibonacci Strategy)
  const prevStrategyRef = useRef<string | null>(activeStrategy);
  useEffect(() => {
    if (prevStrategyRef.current !== activeStrategy) {
      prevStrategyRef.current = activeStrategy;

      // Disarm any active drawing tool & pending clicks
      handleSelectTool(null);
      setPendingAnchors([]);
      setSelectedDrawingId(null);
      setIsPropertiesOpen(false);

      // Open a clean chart view containing only the drawings for this independent strategy view
      loadPostgresDrawings(symbol, interval, true, activeStrategy);
    }
  }, [activeStrategy, symbol, interval, handleSelectTool, loadPostgresDrawings]);

  // Persistent real-time market data stream (WebSocket with auto-fallback to SSE) for lowest possible latency (0s delay)
  useEffect(() => {
    const handleStreamEvent = (data: any) => {
      if (!seriesApiRef.current || !candlesRef.current || candlesRef.current.length === 0) {
        return;
      }

      if (data.type === 'bar' && data.bar) {
        const updatedBar = data.bar;
        const current = candlesRef.current;
        const lastIdx = current.length - 1;
        if (lastIdx >= 0) {
          if (current[lastIdx].time === updatedBar.time) {
            current[lastIdx] = updatedBar;
          } else if (Number(updatedBar.time) > Number(current[lastIdx].time)) {
            current.push(updatedBar);
          }
        }
        seriesApiRef.current.update(updatedBar as any);
        setLastBarInfo({ open: updatedBar.open, high: updatedBar.high, low: updatedBar.low, close: updatedBar.close });
      } else if (data.type === 'tick' && typeof data.price === 'number' && !isNaN(data.price) && data.price > 0) {
        const price = data.price;
        const current = candlesRef.current;
        if (current.length > 0) {
          const last = current[current.length - 1];
          const updatedBar: CandleData = {
            ...last,
            close: price,
            high: Math.max(last.high, price),
            low: Math.min(last.low, price),
          };
          current[current.length - 1] = updatedBar;
          seriesApiRef.current.update(updatedBar as any);
          setLastBarInfo({ open: updatedBar.open, high: updatedBar.high, low: updatedBar.low, close: updatedBar.close });
        }
      }
    };

    const client = new MarketStreamClient(handleStreamEvent, (status) => {
      setStreamStatus(status);
    });
    client.subscribe(symbol, interval);

    // Visibility change handler: when user returns to tab after sleeping, quietly re-sync completed candles
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && chartApiRef.current && !dragStateRef.current) {
        fetchCandles(symbol, interval, true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      client.destroy();
    };
  }, [symbol, interval, fetchCandles]);

  // Handle color change for selected drawing
  const handleColorChange = (newColor: string) => {
    setCurrentColor(newColor);
    const manager = drawingManagerRef.current;
    if (manager && selectedDrawingId) {
      const drawing = manager.getDrawing(selectedDrawingId);
      if (drawing) {
        drawing.updateStyle({ lineColor: newColor, fillColor: `${newColor}1a` });
        batchSaveToPostgres();
      }
    }
  };

  // Handle width change for selected drawing
  const handleWidthChange = (newWidth: number) => {
    setCurrentWidth(newWidth);
    const manager = drawingManagerRef.current;
    if (manager && selectedDrawingId) {
      const drawing = manager.getDrawing(selectedDrawingId);
      if (drawing) {
        drawing.updateStyle({ lineWidth: newWidth });
        batchSaveToPostgres();
      }
    }
  };

  const activeToolDef = activeTool ? DRAWING_TOOLS.find((t) => t.id === activeTool) : null;

  // Derive broker name and clean ticker symbol from composite symbol (e.g. BLACKBULL:XAUUSD -> BlackBull + XAUUSD)
  const [rawBroker, rawTicker] = symbol.includes(':') ? symbol.split(':') : ['', symbol];
  const brokerName = rawBroker === 'BLACKBULL' ? 'BlackBull' : rawBroker === 'CME_MINI' ? 'CME' : rawBroker === 'TVC' ? 'TVC' : rawBroker;
  const displayTicker = rawTicker || symbol;

  return (
    <div
      className={`tradingview-widget-container w-full flex-1 min-h-0 min-w-0 bg-[#090D17] flex flex-col relative overflow-hidden ${
        className || 'h-full'
      }`}
      style={height ? { height } : undefined}
    >
      {/* 1. Header Bar: Broker, Symbol, Timeframe, Live OHLC, and Role Status */}
      <div className="h-9 bg-[#070A10] border-b border-[#131B2E] px-3 flex items-center justify-between text-xs shrink-0 select-none z-10">
        {/* Broker, Symbol & Timeframe Interval */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                streamStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : streamStatus === 'reconnecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-slate-400'
              }`}
              title={streamStatus === 'connected' ? 'Real-Time Stream Active (0s delay)' : 'Connecting stream...'}
            />
            {brokerName && (
              <span 
                className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-amber-300 border border-slate-700/60 font-semibold shrink-0" 
                title={`Market Feed Broker: ${brokerName}`}
              >
                {brokerName}
              </span>
            )}
            <span className="tracking-wide font-bold text-white">{displayTicker}</span>
            <span 
              className="text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-semibold shrink-0"
              title={`Chart Timeframe: ${formatIntervalDisplay(interval)}`}
            >
              {formatIntervalDisplay(interval)}
            </span>
            <span
              className={`hidden md:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                streamStatus === 'connected'
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              }`}
              title="Persistent market streaming feed"
            >
              <Zap className="w-2.5 h-2.5" />
              <span>{streamStatus === 'connected' ? 'Live Stream' : 'Syncing'}</span>
            </span>
          </div>

          {/* OHLC readout */}
          {lastBarInfo && (
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span>O: <strong className="text-slate-300">{lastBarInfo.open}</strong></span>
              <span>H: <strong className="text-emerald-400">{lastBarInfo.high}</strong></span>
              <span>L: <strong className="text-rose-400">{lastBarInfo.low}</strong></span>
              <span>C: <strong className={lastBarInfo.close >= lastBarInfo.open ? 'text-emerald-400' : 'text-rose-400'}>{lastBarInfo.close}</strong></span>
            </div>
          )}
        </div>

        {/* Right Info: Strategy Save / Refresh & PostgreSQL Sync Status */}
        <div className="flex items-center gap-2">
          {refreshNotification && (
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-0.5 rounded shadow-sm flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" /> {refreshNotification}
            </span>
          )}

          {/* Admin / Super Admin Save Strategy Button */}
          {isOwnerOrAdmin && (
            <button
              id="btn-save-strategy"
              type="button"
              onClick={handleManualSaveStrategy}
              disabled={saveStatus === 'saving'}
              title="Save all drawings to PostgreSQL strategy database"
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400/60 rounded-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs group"
            >
              {saveStatus === 'saving' ? (
                <Loader2 className="w-3 h-3 text-amber-300 animate-spin" />
              ) : (
                <Save className="w-3 h-3 text-amber-400 group-hover:scale-105 transition-transform" />
              )}
              <span className="tracking-tight">
                {saveStatus === 'saving'
                  ? 'Saving...'
                  : activeStrategy === '144'
                  ? 'Save (144)'
                  : activeStrategy === 'smc'
                  ? 'Save (SMC)'
                  : activeStrategy === 'fib'
                  ? 'Save (Fib)'
                  : 'Save Strategy'}
              </span>
            </button>
          )}

          {/* Refresh Strategy Button for Clients and Admins */}
          <button
            id="btn-refresh-strategy"
            type="button"
            onClick={handleManualRefreshStrategy}
            disabled={isRefreshingStrategy}
            title="Fetch and apply latest admin strategy drawings without reloading the page"
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400/60 rounded-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs group"
          >
            <RefreshCw className={`w-3 h-3 text-cyan-400 group-hover:rotate-180 transition-transform duration-500 ${isRefreshingStrategy ? 'animate-spin' : ''}`} />
            <span className="tracking-tight">
              {isRefreshingStrategy
                ? 'Refreshing...'
                : activeStrategy === '144'
                ? 'Refresh (144)'
                : activeStrategy === 'smc'
                ? 'Refresh (SMC)'
                : activeStrategy === 'fib'
                ? 'Refresh (Fib)'
                : 'Refresh'}
            </span>
          </button>

          {isOwnerOrAdmin ? (
            <div className="hidden lg:flex items-center gap-2">
              {/* PostgreSQL Sync Status */}
              <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                <Database className="w-3 h-3 text-amber-400" />
                {saveStatus === 'saving' ? (
                  <span className="text-amber-300 flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving
                  </span>
                ) : saveStatus === 'synced' ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Synced
                  </span>
                ) : (
                  <span>Ready</span>
                )}
              </span>
              <span className="hidden xl:inline text-[10px] text-amber-300 font-medium bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                Admin Mode
              </span>
            </div>
          ) : (
            <span className="hidden md:inline text-[10px] text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
              Published Analysis
            </span>
          )}
        </div>
      </div>

      {/* 2. Active Tool Guide Banner (when user or admin is placing anchors) */}
      {effectiveDrawingTools && activeToolDef && (
        <div className="absolute top-10 left-14 z-30 bg-amber-500/95 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1 border border-amber-400">
          <span>
            <strong>{activeToolDef.name}:</strong> Click chart to place point {pendingAnchors.length + 1} of {activeToolDef.requiredAnchors}
          </span>
          <button
            onClick={() => {
              setActiveTool(null);
              setPendingAnchors([]);
            }}
            className="hover:bg-amber-600/50 p-0.5 rounded transition-colors"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2.1 Active Strategy Mode Pill Banner */}
      {activeStrategy && !activeToolDef && (
        <div className="absolute top-10 left-14 z-30 bg-[#090E1B]/95 text-slate-200 text-xs font-medium px-3.5 py-1.5 rounded-xl shadow-xl flex items-center gap-2.5 border border-slate-700/80 backdrop-blur-md animate-in fade-in">
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${
              activeStrategy === '144'
                ? 'bg-amber-400'
                : activeStrategy === 'smc'
                ? 'bg-sky-400'
                : 'bg-emerald-400'
            }`}
          />
          <span>
            Strategy View:{' '}
            <strong className="text-white font-semibold">
              {activeStrategy === '144'
                ? '144 Strategy'
                : activeStrategy === 'smc'
                ? 'SMC Strategy'
                : 'Fibonacci Strategy'}
            </strong>
            {isOwnerOrAdmin ? (
              <span className="ml-2 text-[10px] text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                Admin Edit Mode
              </span>
            ) : (
              <span className="ml-2 text-[10px] text-sky-300 bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30">
                Published Analysis • View Only
              </span>
            )}
          </span>
          <button
            onClick={() => onSelectStrategy?.(null)}
            className="hover:bg-slate-800 p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
            title="Exit Strategy View (Return to Normal Chart)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Sleek Left Drawing Toolbar (Visible ONLY when user has edit permissions) */}
      {effectiveDrawingTools && !effectiveHideSideToolbar && (
        <DrawingToolbar
          activeTool={activeTool}
          onSelectTool={(toolId) => {
            setActiveTool(toolId);
            setPendingAnchors([]);
          }}
          selectedDrawingId={selectedDrawingId}
          onDeleteSelected={handleDeleteSelected}
          onClearAll={handleClearAll}
          onOpenProperties={() => {
            const manager = drawingManagerRef.current;
            if (manager) {
              const sel = manager.getSelectedDrawing();
              if (sel) openPropertiesModal(sel);
            }
          }}
          currentColor={currentColor}
          onColorChange={handleColorChange}
          currentWidth={currentWidth}
          onWidthChange={handleWidthChange}
          isMagnetActive={isMagnetActive}
          onToggleMagnet={handleToggleMagnet}
          isObjectTreeOpen={isObjectTreeOpen}
          onToggleObjectTree={() => setIsObjectTreeOpen((prev) => !prev)}
          drawingsCount={drawingsList.length}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          allLocked={drawingsList.length > 0 && drawingsList.every((d) => d.locked)}
          onToggleAllLock={handleToggleAllLock}
          allVisible={drawingsList.length === 0 || drawingsList.some((d) => d.visible)}
          onToggleAllVisibility={handleToggleAllVisibility}
        />
      )}

      {/* 3.1 TradingView-style Object Tree Panel */}
      {enableDrawingTools && (
        <ObjectTreePanel
          isOpen={isObjectTreeOpen}
          onClose={() => setIsObjectTreeOpen(false)}
          drawings={drawingsList}
          selectedDrawingId={selectedDrawingId}
          onSelectDrawing={(id) => {
            const manager = drawingManagerRef.current;
            if (manager) {
              manager.selectDrawing(id);
              setSelectedDrawingId(id);
            }
          }}
          onToggleVisibility={handleToggleDrawingVisibility}
          onToggleLock={handleToggleDrawingLock}
          onDeleteDrawing={handleDeleteIndividualDrawing}
          onOpenProperties={(id) => {
            const manager = drawingManagerRef.current;
            if (manager) {
              const d = manager.getDrawing(id);
              if (d) openPropertiesModal(d);
            }
          }}
          onToggleAllVisibility={handleToggleAllVisibility}
          onToggleAllLock={handleToggleAllLock}
          onDeleteSelected={handleDeleteSelected}
          onDeleteAll={handleClearAll}
          onClearAll={handleClearAll}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          allVisible={drawingsList.length === 0 || drawingsList.some((d) => d.visible)}
          allLocked={drawingsList.length > 0 && drawingsList.every((d) => d.locked)}
        />
      )}

      {/* 4. Main Chart Canvas */}
      <div
        ref={chartContainerRef}
        id="lightweight-financial-chart-container"
        className={`w-full h-full flex-1 min-h-0 min-w-0 relative overflow-hidden ${activeTool ? 'cursor-crosshair' : 'cursor-default'}`}
      >
        {/* Chart View Controls Group: Zoom In, Zoom Out, and Reset View */}
        <div
          id="chart-view-controls-group"
          className={`absolute top-2.5 ${
            enableDrawingTools ? 'left-14' : 'left-3'
          } z-20 flex items-center gap-1 p-0.5 bg-[#0A0F1D]/85 border border-slate-700/80 rounded-lg shadow-lg backdrop-blur-md`}
        >
          <button
            id="btn-zoom-in-chart"
            type="button"
            onClick={handleZoomIn}
            title="Zoom In (Time Scale)"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded transition-colors cursor-pointer select-none active:scale-95"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-zoom-out-chart"
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out (Time Scale)"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded transition-colors cursor-pointer select-none active:scale-95"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />
          <button
            id="btn-reset-chart-view"
            type="button"
            onClick={handleResetChartView}
            title="Reset chart to standard initial view, zoom, and position without deleting drawings (Alt+R)"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded transition-all duration-200 active:scale-95 group cursor-pointer select-none"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 group-hover:-rotate-90 transition-all duration-300" />
            <span className="tracking-wide">Reset</span>
          </button>
        </div>

        {/* LuxAlgo Smart Money Concepts (SMC) Indicator Overlay - visible strictly and exclusively for SMC Strategy */}
        {activeStrategy === 'smc' && smcSettings.enabled && (
          <SmcLuxAlgoOverlay
            settings={smcSettings}
            onUpdateSettings={handleUpdateSmcSettings}
            analysis={smcAnalysis}
            className={enableDrawingTools ? 'left-14 top-11' : 'left-3 top-11'}
          />
        )}

        {/* Loading Spinner - only shown on first cold load when no candles exist yet */}
        {isLoadingCandles && candlesRef.current.length === 0 && (
          <div className="absolute inset-0 z-20 bg-[#090D17]/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2 pointer-events-none">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            <span className="text-[11px] font-mono text-slate-400">Loading {symbol} chart...</span>
          </div>
        )}
      </div>

      {/* 5. Chart Footer Attribution */}
      <div className="h-5 bg-[#070A10] border-t border-[#131B2E] px-3 flex items-center justify-between text-[9px] shrink-0 text-slate-500 select-none">
        <span className="font-mono">
          Lightweight Charts Engine • {symbol} ({formatIntervalDisplay(interval)})
        </span>
        <span>
          {enableDrawingTools ? 'Drawing Toolbar Active' : 'Read-Only Mode'}
        </span>
      </div>

      {/* 6. TradingView-style Drawing Properties Dialog */}
      {enableDrawingTools && isPropertiesOpen && propertiesDrawing && (
        <DrawingPropertiesDialog
          drawing={propertiesDrawing}
          chartApi={chartApiRef.current}
          seriesApi={seriesApiRef.current}
          candles={candlesRef.current}
          currentInterval={interval}
          isOpen={isPropertiesOpen}
          onClose={() => {
            setIsPropertiesOpen(false);
            setPropertiesDrawing(null);
          }}
          onApply={() => {
            batchSaveToPostgres();
          }}
          onDelete={(drawingId) => {
            const manager = drawingManagerRef.current;
            if (manager) {
              manager.removeDrawing(drawingId);
              setSelectedDrawingId(null);
              batchSaveToPostgres();
            }
          }}
        />
      )}
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';
