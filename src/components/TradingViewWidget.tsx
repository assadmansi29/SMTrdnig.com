import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  ColorType,
  IChartApi,
  ISeriesApi,
  MouseEventParams,
} from 'lightweight-charts';
import {
  DrawingManager,
  ToolRegistry,
  IDrawing,
} from 'lightweight-charts-drawing';
import { DrawingToolbar } from './chart/DrawingToolbar';
import { DrawingPropertiesDialog } from './chart/DrawingPropertiesDialog';
import { ObjectTreePanel, ObjectTreeItem } from './chart/ObjectTreePanel';
import { DRAWING_TOOLS } from './chart/toolsConfig';
import { ChartAnchor, SerializedDrawingPayload } from './chart/types';
import { Check, Loader2, X, Database, RefreshCw, Save, RotateCcw } from 'lucide-react';
import { installGannBoxEnhancer } from './chart/gannBoxEnhancer';
import { installDirectionalEnhancers } from './chart/drawingDirectionEnhancer';

// Install TradingView-style Gann Box & Directional (Ray, Gann Fan, Gann Angle) enhancers
installGannBoxEnhancer();
installDirectionalEnhancers();

function formatIntervalDisplay(inv: string): string {
  const raw = (inv || '15').trim();
  if (raw === '1M' || raw === 'M' || raw.toLowerCase() === '1mo' || raw.toLowerCase() === 'month') return 'Month';
  if (raw === '1W' || raw === 'W' || raw.toLowerCase() === 'week') return 'Week';
  if (raw === '1D' || raw === 'D' || raw.toLowerCase() === 'day') return 'DAY';
  if (raw === '240' || raw.toLowerCase() === '4h') return '4H';
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
  if (norm === '240' || norm === '4h') return '4H';
  if (norm === 'd' || norm === '1d' || norm === 'day') return 'DAY';
  if (norm === 'w' || norm === '1w' || norm === 'week') return 'Week';
  if (norm === 'm' || norm === '1mo' || norm === 'month') return 'Month';
  return inv.endsWith('m') ? inv : `${inv}m`;
}

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'dark' | 'light';
  interval?: string;
  timezone?: string;
  hideSideToolbar?: boolean;
  enableDrawingTools?: boolean;
  height?: string;
  className?: string;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const saveStrategyDrawingsLocal = (sym: string, drawings: any[]) => {
  try {
    const cleanSym = (sym || 'XAUUSD').replace(/[^a-zA-Z0-9]/g, '_');
    localStorage.setItem(`tv_drawings_${cleanSym}`, JSON.stringify(drawings || []));
  } catch (err) {
    console.warn('[Financial Chart] Local storage save failed:', err);
  }
};

const loadStrategyDrawingsLocal = (sym: string): any[] => {
  try {
    const cleanSym = (sym || 'XAUUSD').replace(/[^a-zA-Z0-9]/g, '_');
    const raw = localStorage.getItem(`tv_drawings_${cleanSym}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = memo(({
  symbol = 'OANDA:XAUUSD',
  interval = '15',
  enableDrawingTools = false,
  height,
  className,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesApiRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const drawingManagerRef = useRef<DrawingManager | null>(null);
  const candlesRef = useRef<CandleData[]>([]);

  // State
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [pendingAnchors, setPendingAnchors] = useState<ChartAnchor[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState<string>('#38bdf8');
  const [currentWidth, setCurrentWidth] = useState<number>(2);
  const [saveStatus, setSaveStatus] = useState<'synced' | 'saving' | 'idle'>('idle');
  const [lastBarInfo, setLastBarInfo] = useState<{ open: number; high: number; low: number; close: number } | null>(null);
  const [isRefreshingStrategy, setIsRefreshingStrategy] = useState<boolean>(false);
  const [refreshNotification, setRefreshNotification] = useState<string | null>(null);

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

  // Snaps given time and price coordinates to the nearest candle's Open, High, Low, or Close
  const snapToCandleOHLC = useCallback((t: number, p: number): { time: number; price: number } => {
    const candles = candlesRef.current;
    if (!candles || candles.length === 0) return { time: t, price: p };

    const N = candles.length;
    const lastCandle = candles[N - 1];
    const firstCandle = candles[0];
    const lastTime = Number(lastCandle.time);
    const firstTime = Number(firstCandle.time);

    // If timestamp is in the future area beyond the last candle, do not clamp or pull time backwards
    if (t > lastTime) {
      return { time: t, price: p };
    }
    if (t < firstTime) {
      return { time: t, price: p };
    }

    // 1. Find the candle with the closest timestamp
    let closestCandle = candles[0];
    let minTimeDiff = Math.abs((candles[0].time as number) - t);

    for (let i = 1; i < candles.length; i++) {
      const diff = Math.abs((candles[i].time as number) - t);
      if (diff < minTimeDiff) {
        minTimeDiff = diff;
        closestCandle = candles[i];
      }
    }

    // 2. Find the candle OHLC price point closest to cursor price
    const ohlcLevels = [
      closestCandle.open,
      closestCandle.high,
      closestCandle.low,
      closestCandle.close,
    ];

    let closestPrice = ohlcLevels[0];
    let minPriceDiff = Math.abs(ohlcLevels[0] - p);

    for (let i = 1; i < ohlcLevels.length; i++) {
      const diff = Math.abs(ohlcLevels[i] - p);
      if (diff < minPriceDiff) {
        minPriceDiff = diff;
        closestPrice = ohlcLevels[i];
      }
    }

    return {
      time: closestCandle.time as number,
      price: Number(closestPrice.toFixed(2)),
    };
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
  const enableDrawingToolsRef = useRef<boolean>(enableDrawingTools);
  enableDrawingToolsRef.current = enableDrawingTools;

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
      // Disable chart scrolling/panning so click & drag directly draws without moving canvas
      chart?.applyOptions({
        handleScroll: false,
        handleScale: false,
      });
      if (container) {
        container.style.cursor = 'crosshair';
      }
      drawingManagerRef.current?.deselectAll();
      setSelectedDrawingId(null);
    } else {
      chart?.applyOptions({
        handleScroll: true,
        handleScale: true,
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
    return localStorage.getItem('smtrading_token');
  }, []);

  // Track currently active symbol and interval loaded in chart series
  const lastLoadedKeyRef = useRef<string>('');

  // 2. Fetch Candle Data
  const fetchCandles = useCallback(async (sym: string, inv: string, isSilent: boolean = false) => {
    // If user is actively drawing or dragging, suppress silent candle updates to keep chart coordinates locked
    if (isSilent && (dragStateRef.current || drawingCreationRef.current)) {
      return;
    }
    const requestKey = `${sym}_${inv}`;
    try {
      if (!isSilent) {
        setIsLoadingCandles(true);
      }
      const res = await fetch(`/api/market/candles?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(inv)}`);
      const data = await res.json();

      if (data.status === 'ok' && Array.isArray(data.candles) && data.candles.length > 0) {
        candlesRef.current = data.candles;
        (window as any).__chartCandles = data.candles;
        if (seriesApiRef.current) {
          seriesApiRef.current.setData(data.candles);
          const last = data.candles[data.candles.length - 1];
          setLastBarInfo({ open: last.open, high: last.high, low: last.low, close: last.close });
        }
        // ONLY call fitContent on initial explicit load of a new symbol or interval!
        // NEVER reset the time scale during silent updates, panning, zooming, dragging, or resizing!
        if (!isSilent && chartApiRef.current) {
          chartApiRef.current.timeScale().fitContent();
        }
        lastLoadedKeyRef.current = requestKey;
      }
    } catch (err: any) {
      console.error('[Financial Chart] Error loading candles:', err.message);
    } finally {
      if (!isSilent) {
        setIsLoadingCandles(false);
      }
    }
  }, []);

  // 3. Fetch Published Drawings (PostgreSQL with LocalStorage fallback)
  const loadPostgresDrawings = useCallback(async (sym: string, inv: string) => {
    try {
      const manager = drawingManagerRef.current;
      if (!manager) return;

      let rawDrawings: SerializedDrawingPayload[] = [];
      try {
        const res = await fetch(`/api/chart-drawings?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(inv)}`);
        const data = await res.json();
        if (data.status === 'ok' && Array.isArray(data.drawings) && data.drawings.length > 0) {
          rawDrawings = data.drawings;
        }
      } catch (networkErr: any) {
        console.warn('[Financial Chart] Network fetch drawings notice:', networkErr.message);
      }

      // Fallback to local storage if PostgreSQL returns empty
      if (rawDrawings.length === 0) {
        const localList = loadStrategyDrawingsLocal(sym);
        if (Array.isArray(localList) && localList.length > 0) {
          rawDrawings = localList;
        }
      }

      if (rawDrawings.length >= 0) {
        manager.clearAll();
        const registry = ToolRegistry.getInstance();

        rawDrawings.forEach((d: SerializedDrawingPayload) => {
          if (!d.type || !d.anchors || d.anchors.length === 0) return;
          try {
            let actualType = d.type;
            if (!registry.has(actualType)) {
              if (actualType === 'pitchfork') actualType = 'andrews-pitchfork';
              else if (actualType === 'measure') actualType = 'date-price-range';
              else if (actualType === 'gann-angle') actualType = 'trend-angle';
            }

            const isLocked = !enableDrawingTools;
            const restored = registry.createDrawing(
              actualType,
              d.id,
              d.anchors as any,
              d.style,
              { ...d.options, locked: isLocked }
            );

            if (restored) {
              (restored as any)._currentChartInterval = interval;
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
            }
          } catch (restoreErr: any) {
            console.warn('[Financial Chart] Failed to restore drawing:', d.id, restoreErr.message);
          }
        });

        setSaveStatus('synced');
        syncDrawingsList();
      }
    } catch (err: any) {
      console.error('[Financial Chart] Error loading drawings:', err.message);
    }
  }, [enableDrawingTools, interval, syncDrawingsList]);

  // 4. Save Single Drawing (Local Storage & PostgreSQL)
  const saveDrawingToPostgres = useCallback(async (drawingPayload: any) => {
    const manager = drawingManagerRef.current;
    if (manager) {
      saveStrategyDrawingsLocal(symbol, manager.exportDrawings());
    }

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

  // 5. Batch Save Drawings (Local Storage & PostgreSQL)
  const batchSaveToPostgres = useCallback(async () => {
    const manager = drawingManagerRef.current;
    if (!manager) return;

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

    saveStrategyDrawingsLocal(symbol, allDrawings);

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
      await loadPostgresDrawings(symbol, interval);
      setRefreshNotification('Strategy Refreshed');
      setTimeout(() => {
        setRefreshNotification(null);
      }, 2500);
    } catch (err: any) {
      console.error('[Financial Chart] Strategy refresh error:', err?.message || err);
    } finally {
      setIsRefreshingStrategy(false);
    }
  }, [isRefreshingStrategy, loadPostgresDrawings, symbol, interval]);

  // 5.2 Manual Save Strategy (for Super Admin & Admin)
  const handleManualSaveStrategy = useCallback(async () => {
    if (saveStatus === 'saving') return;
    await batchSaveToPostgres();
  }, [saveStatus, batchSaveToPostgres]);

  // 5.3 Reset / Refresh Chart View (returns chart to standard initial view, zoom, and position without deleting drawings)
  const handleResetChartView = useCallback(() => {
    if (!chartApiRef.current) return;
    try {
      chartApiRef.current.timeScale().resetTimeScale();
      chartApiRef.current.timeScale().fitContent();
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

  // 6. Delete Selected Drawing
  const handleDeleteSelected = useCallback(async () => {
    if (!selectedDrawingId) return;
    const manager = drawingManagerRef.current;
    if (manager) {
      manager.removeDrawing(selectedDrawingId);
    }

    const token = getAuthToken();
    if (token) {
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
  }, [selectedDrawingId, getAuthToken, syncDrawingsList]);

  // 7. Clear All Drawings
  const handleClearAll = useCallback(async () => {
    pushUndoSnapshot();
    const manager = drawingManagerRef.current;
    if (manager) {
      manager.clearAll();
    }

    const token = getAuthToken();
    if (token) {
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
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 25,
      },
      width: container.clientWidth || 800,
      height: container.clientHeight || 500,
    });

    chartApiRef.current = chart;
    (window as any).__currentChart = chart;

    // Add Candlestick Series
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    seriesApiRef.current = series;

    // Attach Drawing Manager
    const manager = new DrawingManager();
    manager.attach(chart, series, container);
    drawingManagerRef.current = manager;

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
      const logical = chartTs?.coordinateToLogical ? chartTs.coordinateToLogical(px) : null;

      if (candlesRef.current.length > 0 && logical !== null && !isNaN(logical)) {
        const N = candlesRef.current.length;
        const lastCandle = candlesRef.current[N - 1];
        const firstCandle = candlesRef.current[0];
        const step = N >= 2 ? (Number(lastCandle.time) - Number(candlesRef.current[N - 2].time)) || 3600 : 3600;
        if (logical >= N - 1) {
          time = Number(lastCandle.time) + Math.round((logical - (N - 1)) * step);
        } else if (logical < 0) {
          time = Number(firstCandle.time) + Math.round(logical * step);
        } else {
          const idx = Math.max(0, Math.min(N - 1, Math.round(logical)));
          time = Number(candlesRef.current[idx].time);
        }
      }

      if (!time) {
        const t = chartTs.coordinateToTime(px);
        if (t !== null && t !== undefined) time = t as number;
      }

      if (!time) return null;

      let finalTime = time;
      let finalPrice = Number(price.toFixed(2));
      if (isMagnetActiveRef.current) {
        const snapped = snapToCandleOHLC(time, price);
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
            saveStrategyDrawingsLocal(symbol, currentManager.exportDrawings());
            currentChart.applyOptions({ handleScroll: true, handleScale: true });
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
        currentChart.applyOptions({ handleScroll: false, handleScale: false });

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
              saveStrategyDrawingsLocal(symbol, currentManager.exportDrawings());
              pushUndoSnapshot();
              syncDrawingsList();
            }
          } catch (err: any) {
            console.error('[Financial Chart] Error creating 1-point drawing:', err.message);
          }

          currentChart.applyOptions({ handleScroll: true, handleScale: true });
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
              saveStrategyDrawingsLocal(symbol, currentManager.exportDrawings());
              pushUndoSnapshot();
              syncDrawingsList();
            }
          } catch (err: any) {
            console.error('[Financial Chart] Error creating position tool:', err.message);
          }

          currentChart.applyOptions({ handleScroll: true, handleScale: true });
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
          currentChart.applyOptions({ handleScroll: true, handleScale: true });
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

        currentChart.applyOptions({
          handleScroll: false,
          handleScale: false,
        });

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

        currentChart.applyOptions({
          handleScroll: false,
          handleScale: false,
        });

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

      currentChart.applyOptions({
        handleScroll: true,
        handleScale: true,
      });
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
            const snapped = snapToCandleOHLC(time as number, price);
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
              saveStrategyDrawingsLocal(symbol, currentManager?.exportDrawings());
              currentChart?.applyOptions({ handleScroll: true, handleScale: true });
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

      // Re-enable chart pan/scroll when mouse or touch is released
      if (currentChart && !activeToolRef.current) {
        currentChart.applyOptions({
          handleScroll: true,
          handleScale: true,
        });
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

    // Register prioritized listeners
    container.addEventListener('mousedown', handlePointerDownCapture, { capture: true });
    container.addEventListener('touchstart', handlePointerDownCapture, { capture: true, passive: false });
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
      manager.detach();
      chart.remove();
      chartApiRef.current = null;
      seriesApiRef.current = null;
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
    fetchCandles(symbol, interval, false);
    loadPostgresDrawings(symbol, interval);
  }, [symbol, interval, fetchCandles, loadPostgresDrawings]);

  // Periodic candle refresh (every 15 seconds) to keep stream live - completely silent, preserves zoom/pan!
  useEffect(() => {
    const timer = setInterval(() => {
      if (!dragStateRef.current && chartApiRef.current) {
        fetchCandles(symbol, interval, true);
      }
    }, 15000);
    return () => clearInterval(timer);
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

  return (
    <div
      className={`tradingview-widget-container w-full flex-1 min-h-0 min-w-0 bg-[#090D17] flex flex-col relative overflow-hidden ${
        className || 'h-full'
      }`}
      style={height ? { height } : undefined}
    >
      {/* 1. Header Bar: Symbol Info, Live OHLC, and Role Status */}
      <div className="h-9 bg-[#070A10] border-b border-[#131B2E] px-3 flex items-center justify-between text-xs shrink-0 select-none z-10">
        {/* Symbol & Interval */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tracking-wide">{symbol}</span>
            <span className="text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              {formatIntervalDisplay(interval)}
            </span>
          </div>

          {/* OHLC readout */}
          {lastBarInfo && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400">
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
          {enableDrawingTools && (
            <button
              id="btn-save-strategy"
              type="button"
              onClick={handleManualSaveStrategy}
              disabled={saveStatus === 'saving'}
              title="Save all drawings to PostgreSQL strategy database"
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-amber-200 hover:text-amber-100 bg-gradient-to-r from-amber-500/20 via-amber-600/15 to-amber-500/10 hover:from-amber-500/30 hover:via-amber-600/25 hover:to-amber-500/20 border border-amber-500/40 hover:border-amber-400/80 rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.12)] hover:shadow-[0_0_16px_rgba(245,158,11,0.25)] group"
            >
              {saveStatus === 'saving' ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
              )}
              <span className="tracking-tight">{saveStatus === 'saving' ? 'Saving...' : 'Save Strategy'}</span>
            </button>
          )}

          {/* Refresh Strategy Button for Clients and Admins */}
          <button
            id="btn-refresh-strategy"
            type="button"
            onClick={handleManualRefreshStrategy}
            disabled={isRefreshingStrategy}
            title="Fetch and apply latest admin strategy drawings without reloading the page"
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-cyan-200 hover:text-cyan-100 bg-gradient-to-r from-cyan-500/15 via-blue-600/15 to-indigo-600/15 hover:from-cyan-500/25 hover:via-blue-600/25 hover:to-indigo-600/25 border border-cyan-500/40 hover:border-cyan-400/80 rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.12)] hover:shadow-[0_0_16px_rgba(6,182,212,0.25)] group"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-300 group-hover:rotate-180 transition-transform duration-500 ${isRefreshingStrategy ? 'animate-spin' : ''}`} />
            <span className="tracking-tight">{isRefreshingStrategy ? 'Refreshing...' : 'Refresh Strategy'}</span>
          </button>

          {enableDrawingTools ? (
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

      {/* 2. Active Tool Guide Banner (when admin is placing anchors) */}
      {enableDrawingTools && activeToolDef && (
        <div className="absolute top-10 left-14 z-30 bg-amber-500/90 text-slate-950 text-xs font-medium px-3 py-1 rounded-md shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <span>
            <strong>{activeToolDef.name}:</strong> Click chart to place point {pendingAnchors.length + 1} of {activeToolDef.requiredAnchors}
          </span>
          <button
            onClick={() => {
              setActiveTool(null);
              setPendingAnchors([]);
            }}
            className="hover:bg-amber-600/40 p-0.5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Sleek Left Drawing Toolbar (Visible ONLY to Admin & Super Admin) */}
      {enableDrawingTools && (
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
        {/* Reset Chart View Button: Positioned on the left side on the chart under the symbol */}
        <button
          id="btn-reset-chart-view"
          type="button"
          onClick={handleResetChartView}
          title="Reset chart to standard initial view, zoom, and position without deleting drawings (Alt+R)"
          className={`absolute top-2.5 ${
            enableDrawingTools ? 'left-14' : 'left-3'
          } z-20 flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-[#0A0F1D]/85 hover:bg-[#111A30] border border-slate-700/80 hover:border-amber-400/60 rounded-lg shadow-lg backdrop-blur-md transition-all duration-200 active:scale-95 group cursor-pointer select-none`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 group-hover:-rotate-90 transition-all duration-300" />
          <span className="tracking-wide">Reset View</span>
        </button>

        {/* Loading Spinner */}
        {isLoadingCandles && (
          <div className="absolute inset-0 z-20 bg-[#090D17]/80 flex flex-col items-center justify-center gap-2 pointer-events-none">
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
