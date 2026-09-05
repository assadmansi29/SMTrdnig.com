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
import { DRAWING_TOOLS } from './chart/toolsConfig';
import { ChartAnchor, SerializedDrawingPayload } from './chart/types';
import { Check, Loader2, X, Database } from 'lucide-react';
import { installGannBoxEnhancer } from './chart/gannBoxEnhancer';

// Install TradingView-style Gann Box rendering enhancer
installGannBoxEnhancer();

function formatIntervalDisplay(inv: string): string {
  const norm = (inv || '15').trim().toLowerCase();
  if (norm === '1' || norm === '1m') return '1m';
  if (norm === '5' || norm === '5m') return '5m';
  if (norm === '15' || norm === '15m') return '15m';
  if (norm === '30' || norm === '30m') return '30m';
  if (norm === '60' || norm === '1h') return '1H';
  if (norm === '240' || norm === '4h') return '4H';
  if (norm === 'd' || norm === '1d' || norm === 'day') return 'DAY';
  if (norm === 'w' || norm === '1w' || norm === 'week') return 'Week';
  if (norm === 'm' || norm === '1mo' || norm === 'month' || norm === 'monthe') return 'Month';
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

  const batchSaveRef = useRef<() => void>(() => {});

  // 1. Get Auth Token for persistent PostgreSQL saving
  const getAuthToken = useCallback((): string | null => {
    return localStorage.getItem('smtrading_token');
  }, []);

  // Track currently active symbol and interval loaded in chart series
  const lastLoadedKeyRef = useRef<string>('');

  // 2. Fetch Candle Data
  const fetchCandles = useCallback(async (sym: string, inv: string, isSilent: boolean = false) => {
    const requestKey = `${sym}_${inv}`;
    try {
      if (!isSilent) {
        setIsLoadingCandles(true);
      }
      const res = await fetch(`/api/market/candles?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(inv)}`);
      const data = await res.json();

      if (data.status === 'ok' && Array.isArray(data.candles) && data.candles.length > 0) {
        candlesRef.current = data.candles;
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

  // 3. Fetch Published PostgreSQL Drawings
  const loadPostgresDrawings = useCallback(async (sym: string, inv: string) => {
    try {
      const res = await fetch(`/api/chart-drawings?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(inv)}`);
      const data = await res.json();

      if (data.status === 'ok' && Array.isArray(data.drawings)) {
        const manager = drawingManagerRef.current;
        if (!manager) return;

        // Clear existing drawings in manager
        manager.clearAll();

        const registry = ToolRegistry.getInstance();

        data.drawings.forEach((d: SerializedDrawingPayload) => {
          if (!d.type || !d.anchors || d.anchors.length === 0) return;
          try {
            // Visitors see drawings in locked (read-only) mode
            const isLocked = !enableDrawingTools;
            const restored = registry.createDrawing(
              d.type,
              d.id,
              d.anchors as any,
              d.style,
              { ...d.options, locked: isLocked }
            );

            if (restored) {
              (restored as any)._currentChartInterval = interval;
              if (d.type === 'gann-box') {
                (restored as any).gannOptions = {
                  ...(d.options || {}),
                  ...((d as any).gannOptions || {}),
                };
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
      }
    } catch (err: any) {
      console.error('[Financial Chart] Error loading drawings from PostgreSQL:', err.message);
    }
  }, [enableDrawingTools, interval]);

  // 4. Save Single Drawing to PostgreSQL
  const saveDrawingToPostgres = useCallback(async (drawingPayload: any) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setSaveStatus('saving');
      const manager = drawingManagerRef.current;
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

  // 5. Batch Save Drawings (e.g. after drag or multiple updates)
  const batchSaveToPostgres = useCallback(async () => {
    const token = getAuthToken();
    const manager = drawingManagerRef.current;
    if (!token || !manager) return;

    try {
      setSaveStatus('saving');
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

      const res = await fetch('/api/chart-drawings/batch', {
        method: 'PUT',
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
      }
    } catch (err: any) {
      console.error('[Financial Chart] Batch save error:', err.message);
      setSaveStatus('idle');
    }
  }, [symbol, interval, getAuthToken]);
  batchSaveRef.current = batchSaveToPostgres;

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
  }, [selectedDrawingId, getAuthToken]);

  // 7. Clear All Drawings
  const handleClearAll = useCallback(async () => {
    const manager = drawingManagerRef.current;
    if (manager) {
      manager.clearAll();
    }

    const token = getAuthToken();
    if (token) {
      try {
        setSaveStatus('saving');
        await fetch('/api/chart-drawings/batch', {
          method: 'PUT',
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
  }, [symbol, interval, getAuthToken]);

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
      },
      width: container.clientWidth || 800,
      height: container.clientHeight || 500,
    });

    chartApiRef.current = chart;

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

    // Helper to detect if cursor hits any anchor handle of a drawing
    const getHitAnchor = (drawing: any, point: { x: number; y: number }): number | null => {
      if (!drawing || !drawingManagerRef.current) return null;
      const viewport = (drawingManagerRef.current as any).getViewport?.();
      if (!viewport) return null;

      // 1. Precise control point check
      if (typeof drawing.getControlPoints === 'function') {
        const cps = drawing.getControlPoints(viewport);
        if (Array.isArray(cps)) {
          for (const cp of cps) {
            const dist = Math.hypot(point.x - cp.x, point.y - cp.y);
            // 14px hit area gives a responsive, forgiving grip on corner/edge handles
            if (dist <= 14) {
              return cp.index;
            }
          }
        }
      }

      // 2. Fallback to drawing.hitTestAnchor
      if (typeof drawing.hitTestAnchor === 'function') {
        const idx = drawing.hitTestAnchor(point, viewport);
        if (idx !== null && idx !== undefined) return idx;
      }

      return null;
    };

    // Prioritized pointer/mouse down capture handler
    const handlePointerDownCapture = (e: MouseEvent | TouchEvent) => {
      const currentManager = drawingManagerRef.current;
      const currentChart = chartApiRef.current;
      const currentContainer = chartContainerRef.current;
      if (!currentManager || !currentChart || !currentContainer || !enableDrawingToolsRef.current) return;

      // When placing points for a new tool from toolbar, allow clicks through
      if (activeToolRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = currentContainer.getBoundingClientRect();
      const point = { x: clientX - rect.left, y: clientY - rect.top };

      const selected = currentManager.getSelectedDrawing();
      const viewport = (currentManager as any).getViewport?.();

      // Check hits
      let hitAnchorIdx: number | null = null;
      if (selected && !selected.options.locked) {
        hitAnchorIdx = getHitAnchor(selected, point);
      }
      const hitDrawing = currentManager.hitTest(point);

      // Priority 0: Double-click detector on drawings or handles to open Properties Dialog
      const now = Date.now();
      const lastClick = lastClickRef.current;
      const clickedTarget = hitDrawing || (hitAnchorIdx !== null ? selected : null);

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

      // Priority 1: Check if an anchor handle of the selected drawing is hit
      if (hitAnchorIdx !== null && selected) {
        // Prevent pointer event from reaching the chart's pan/scroll handler
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.cancelable) e.preventDefault();

        // Lock chart pan/scroll so candles remain completely stationary
        currentChart.applyOptions({
          handleScroll: false,
          handleScale: false,
        });

        selected.setState('editing');
        selected.requestUpdate();

        dragStateRef.current = {
          type: 'handle',
          drawing: selected,
          anchorIndex: hitAnchorIdx,
          startPoint: point,
          hasMoved: false,
        };
        return;
      }

      // Priority 2: Check if a drawing element body is hit
      if (hitDrawing && !hitDrawing.options.locked) {
        // Prevent pointer event from reaching the chart's pan/scroll handler
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.cancelable) e.preventDefault();

        // Select the drawing if not already selected
        if (!selected || selected.id !== hitDrawing.id) {
          currentManager.selectDrawing(hitDrawing.id);
          setSelectedDrawingId(hitDrawing.id);
        }

        // Lock chart pan/scroll so candles remain stationary while repositioning
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

      // Priority 3: User dragged/clicked empty chart space where no drawing is selected or edited
      if (selected) {
        currentManager.deselectAll();
        setSelectedDrawingId(null);
      }

      // Ensure chart pan/scroll is active so chart pans smoothly
      currentChart.applyOptions({
        handleScroll: true,
        handleScale: true,
      });
    };

    // Prioritized pointer/mouse move handler during drag
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const currentManager = drawingManagerRef.current;
      const currentContainer = chartContainerRef.current;
      if (!currentManager || !currentContainer) return;

      // Prevent event from propagating during drawing drag
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      dragState.hasMoved = true;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = currentContainer.getBoundingClientRect();
      const point = { x: clientX - rect.left, y: clientY - rect.top };

      const viewport = (currentManager as any).getViewport?.();
      if (!viewport) return;

      if (dragState.type === 'handle' && dragState.anchorIndex !== undefined) {
        // Resize / reposition corner or edge handle
        let time = viewport.timeScale.coordinateToTime(point.x);
        const price = viewport.priceScale.coordinateToPrice(point.y);

        if (!time && candlesRef.current.length > 0) {
          const lastCandle = candlesRef.current[candlesRef.current.length - 1];
          const firstCandle = candlesRef.current[0];
          time = (point.x > currentContainer.clientWidth / 2 ? lastCandle.time : firstCandle.time) as any;
        }

        if (time !== null && price !== null && !isNaN(price)) {
          dragState.drawing.updateAnchor(dragState.anchorIndex, {
            time,
            price: Number(price.toFixed(2)),
          });
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
            const lastCandle = candlesRef.current[candlesRef.current.length - 1];
            const firstCandle = candlesRef.current[0];
            newTime = (movedPixel.x > currentContainer.clientWidth / 2 ? lastCandle.time : firstCandle.time) as any;
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
    const handlePointerUp = () => {
      const dragState = dragStateRef.current;
      const currentChart = chartApiRef.current;

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
      if (currentChart) {
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
      if (dragStateRef.current) return;
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

    // Handle Chart Click for Placing Drawing Anchors
    const handleChartClick = (param: MouseEventParams) => {
      const currentTool = activeToolRef.current;
      if (!currentTool || !param.point) return;

      const toolDef = DRAWING_TOOLS.find((t) => t.id === currentTool);
      if (!toolDef) return;

      const price = series.coordinateToPrice(param.point.y);
      if (price === null || isNaN(price)) return;

      let time = param.time as number | undefined;
      if (!time) {
        const t = chart.timeScale().coordinateToTime(param.point.x);
        if (t !== null) {
          time = t as number;
        } else if (candlesRef.current.length > 0) {
          const lastCandle = candlesRef.current[candlesRef.current.length - 1];
          time = lastCandle.time;
        }
      }

      if (!time) return;

      const newAnchor: ChartAnchor = {
        time: time as any,
        price: Number(price.toFixed(2)),
      };

      const updatedAnchors = [...pendingAnchorsRef.current, newAnchor];
      setPendingAnchors(updatedAnchors);

      // Check if all anchors required for this tool have been placed
      if (updatedAnchors.length >= toolDef.requiredAnchors) {
        try {
          const registry = ToolRegistry.getInstance();
          const drawingId = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const drawing = registry.createDrawing(
            currentTool,
            drawingId,
            updatedAnchors as any,
            {
              lineColor: currentColorRef.current,
              lineWidth: currentWidthRef.current,
              fillColor: `${currentColorRef.current}1a`, // 10% opacity fill
              fillOpacity: 0.1,
              showLabels: true,
            },
            {
              visible: true,
              locked: false,
            }
          );

          if (drawing) {
            (drawing as any)._currentChartInterval = interval;
            manager.addDrawing(drawing);
            manager.selectDrawing(drawingId);
            saveDrawingToPostgres(drawing.toJSON());
          }
        } catch (createErr: any) {
          console.error('[Financial Chart] Error creating drawing:', createErr.message);
        }

        // Reset tool state
        setActiveTool(null);
        setPendingAnchors([]);
      }
    };

    chart.subscribeClick(handleChartClick);

    // Responsive Size Synchronization & ResizeObserver
    const syncChartSize = () => {
      if (!chartContainerRef.current || !chartApiRef.current) return;
      const el = chartContainerRef.current;
      const width = Math.floor(el.clientWidth);
      const height = Math.floor(el.clientHeight);
      if (width > 0 && height > 0) {
        chartApiRef.current.applyOptions({ width, height });
      }
    };

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

    // Keyboard Shortcuts (Escape to cancel tool, Delete to remove selected)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTool(null);
        setPendingAnchors([]);
        manager.deselectAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = manager.getSelectedDrawing();
        if (selected) {
          handleDeleteSelected();
        }
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

        {/* Right Info: Save Status & Role Mode */}
        <div className="flex items-center gap-2">
          {enableDrawingTools ? (
            <div className="flex items-center gap-2">
              {/* PostgreSQL Sync Status */}
              <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                <Database className="w-3 h-3 text-amber-400" />
                {saveStatus === 'saving' ? (
                  <span className="text-amber-300 flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving
                  </span>
                ) : saveStatus === 'synced' ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> PostgreSQL Synced
                  </span>
                ) : (
                  <span>PostgreSQL Ready</span>
                )}
              </span>
              <span className="hidden md:inline text-[10px] text-amber-300 font-medium bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                Admin Analysis Mode
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
              Published Analysis (View-Only)
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
        />
      )}

      {/* 4. Main Chart Canvas */}
      <div
        ref={chartContainerRef}
        id="lightweight-financial-chart-container"
        className={`w-full h-full flex-1 min-h-0 min-w-0 relative overflow-hidden ${activeTool ? 'cursor-crosshair' : 'cursor-default'}`}
      >
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
