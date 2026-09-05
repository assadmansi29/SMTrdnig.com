import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Palette,
  Sliders,
  Compass,
  RotateCw,
  Type,
  Maximize2,
  Grid,
  Layers,
  Calendar,
  Clock,
  Percent,
  ArrowUpDown,
  RefreshCw,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { DRAWING_TOOLS, COLOR_PALETTE, LINE_WIDTHS } from './toolsConfig';
import {
  DEFAULT_GANN_PRICE_LEVELS,
  DEFAULT_GANN_TIME_LEVELS,
  DEFAULT_GANN_VISIBILITY,
  getGannRatioColor,
  isTimeframeVisible,
  GannVisibilitySettings,
} from './gannBoxEnhancer';

export interface DrawingPropertiesDialogProps {
  drawing: any;
  chartApi: any;
  seriesApi: any;
  candles?: any[];
  currentInterval?: string;
  isOpen: boolean;
  onClose: () => void;
  onApply: (updatedDrawing: any) => void;
  onDelete: (drawingId: string) => void;
}

export const DrawingPropertiesDialog: React.FC<DrawingPropertiesDialogProps> = ({
  drawing,
  chartApi,
  seriesApi,
  candles = [],
  currentInterval = '15',
  isOpen,
  onClose,
  onApply,
  onDelete,
}) => {
  if (!isOpen || !drawing) return null;

  // Track active tab: 'style' | 'coordinates' | 'visibility'
  const [activeTab, setActiveTab] = useState<'style' | 'coordinates' | 'visibility'>('style');

  // Initial snapshot for cancel/revert
  const initialSnapshotRef = useRef<{
    style: any;
    options: any;
    anchors: any[];
    specificOptions: any;
  } | null>(null);

  const isGannBox = drawing.type === 'gann-box';

  // Identify tool metadata
  const toolItem = DRAWING_TOOLS.find((t) => t.id === drawing.type) || {
    id: drawing.type,
    name: drawing.type === 'gann-box' ? 'Gann Box' : drawing.type.charAt(0).toUpperCase() + drawing.type.slice(1).replace(/-/g, ' '),
    category: drawing.type === 'gann-box' ? 'gann' : 'line',
    description: drawing.type === 'gann-box' ? 'Gann Box geometric time and price projection grid' : '',
  };

  // Extract initial properties
  const [styleState, setStyleState] = useState(() => ({
    lineColor: drawing.style?.lineColor || '#2962FF',
    lineWidth: drawing.style?.lineWidth ?? 2,
    lineDash: drawing.style?.lineDash || [],
    fillColor: drawing.style?.fillColor || 'rgba(41, 98, 255, 0.15)',
    fillOpacity: drawing.style?.fillOpacity ?? 0.15,
    showLabels: drawing.style?.showLabels ?? true,
    labelColor: drawing.style?.labelColor || '#2962FF',
  }));

  // Tool-specific options getter
  const getSpecificOptions = () => {
    const proto = Object.getPrototypeOf(drawing);
    const getterKey = Object.getOwnPropertyNames(proto).find(
      (k) => k.endsWith('Options') && k !== 'options'
    );
    if (getterKey && drawing[getterKey]) {
      return { ...drawing[getterKey] };
    }
    // Also check direct props or drawing.options
    return { ...drawing.options };
  };

  const [optionsState, setOptionsState] = useState(() => {
    const base = {
      visible: drawing.options?.visible !== false,
      locked: !!drawing.options?.locked,
      extendLeft: !!drawing.options?.extendLeft,
      extendRight: !!drawing.options?.extendRight,
      ...getSpecificOptions(),
    };

    if (isGannBox) {
      const gannOpts = (drawing as any).gannOptions || {};
      const activePLevels: Record<string, boolean> = {};
      DEFAULT_GANN_PRICE_LEVELS.forEach((lvl) => {
        activePLevels[String(lvl)] = true;
      });

      const activeTLevels: Record<string, boolean> = {};
      DEFAULT_GANN_TIME_LEVELS.forEach((lvl) => {
        activeTLevels[String(lvl)] = true;
      });

      return {
        ...base,
        showPriceLevels: gannOpts.showPriceLevels ?? base.showPriceLevels ?? true,
        showTimeLevels: gannOpts.showTimeLevels ?? base.showTimeLevels ?? true,
        showTopLabels: gannOpts.showTopLabels ?? base.showTopLabels ?? gannOpts.topLabels ?? true,
        showBottomLabels: gannOpts.showBottomLabels ?? base.showBottomLabels ?? gannOpts.bottomLabels ?? false,
        useOneColor: gannOpts.useOneColor ?? base.useOneColor ?? true,
        angles: gannOpts.angles ?? base.angles ?? gannOpts.showDiagonals ?? true,
        showDiagonals: gannOpts.showDiagonals ?? base.showDiagonals ?? true,
        reverse: gannOpts.reverse ?? base.reverse ?? false,
        priceLevels: gannOpts.priceLevels || base.priceLevels || DEFAULT_GANN_PRICE_LEVELS,
        timeLevels: gannOpts.timeLevels || base.timeLevels || DEFAULT_GANN_TIME_LEVELS,
        activePriceLevels: gannOpts.activePriceLevels || base.activePriceLevels || activePLevels,
        activeTimeLevels: gannOpts.activeTimeLevels || base.activeTimeLevels || activeTLevels,
        visibility: gannOpts.visibility || base.visibility || { ...DEFAULT_GANN_VISIBILITY },
      };
    }

    return base;
  });

  const [anchorsState, setAnchorsState] = useState(() =>
    (drawing.anchors || []).map((a: any) => ({
      time: a.time,
      price: Number(a.price),
    }))
  );

  // Compute angle in screen degrees
  const computeAngle = (a1: any, a2: any): number => {
    if (!a1 || !a2) return 0;
    if (chartApi && seriesApi) {
      try {
        const timeScale = chartApi.timeScale();
        const x1 = timeScale.timeToCoordinate(a1.time);
        const y1 = seriesApi.priceToCoordinate(a1.price);
        const x2 = timeScale.timeToCoordinate(a2.time);
        const y2 = seriesApi.priceToCoordinate(a2.price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const dx = x2 - x1;
          const dy = y2 - y1;
          // In screen coordinates y goes down, so negative dy is upward
          const rad = Math.atan2(-dy, dx);
          return Math.round(rad * (180 / Math.PI) * 10) / 10;
        }
      } catch {}
    }
    // Fallback: price difference ratio
    const dPrice = a2.price - a1.price;
    return dPrice >= 0 ? 30 : -30;
  };

  const [angleState, setAngleState] = useState<number>(() => {
    if (anchorsState.length >= 2) {
      return computeAngle(anchorsState[0], anchorsState[1]);
    }
    return 0;
  });

  // Store snapshot when dialog opens
  useEffect(() => {
    initialSnapshotRef.current = {
      style: { ...drawing.style },
      options: { ...drawing.options },
      anchors: (drawing.anchors || []).map((a: any) => ({ ...a })),
      specificOptions: getSpecificOptions(),
    };
  }, [drawing.id]);

  // Apply live visual update to the chart drawing
  const applyLiveUpdates = (
    newStyle: typeof styleState,
    newOpts: typeof optionsState,
    newAnchors: typeof anchorsState
  ) => {
    try {
      // 1. Update style
      drawing.updateStyle({
        lineColor: newStyle.lineColor,
        lineWidth: newStyle.lineWidth,
        lineDash: newStyle.lineDash,
        fillColor: newStyle.fillColor,
        fillOpacity: newStyle.fillOpacity,
        showLabels: newStyle.showLabels,
        labelColor: newStyle.labelColor,
      });

      // 2. Update base options
      drawing.updateOptions({
        visible: newOpts.visible,
        locked: newOpts.locked,
        extendLeft: newOpts.extendLeft,
        extendRight: newOpts.extendRight,
        ...newOpts,
      });

      // 3. Call tool-specific setters if available
      if (typeof drawing.setRectangleOptions === 'function') drawing.setRectangleOptions(newOpts);
      if (typeof drawing.setTrendLineOptions === 'function') drawing.setTrendLineOptions(newOpts);
      if (typeof drawing.setRayOptions === 'function') drawing.setRayOptions(newOpts);
      if (typeof drawing.setExtendedLineOptions === 'function') drawing.setExtendedLineOptions(newOpts);
      if (typeof drawing.setHorizontalLineOptions === 'function') drawing.setHorizontalLineOptions(newOpts);
      if (typeof drawing.setHorizontalRayOptions === 'function') drawing.setHorizontalRayOptions(newOpts);
      if (typeof drawing.setArrowOptions === 'function') drawing.setArrowOptions(newOpts);
      if (typeof drawing.setChannelOptions === 'function') drawing.setChannelOptions(newOpts);
      if (typeof drawing.setFibOptions === 'function') drawing.setFibOptions(newOpts);
      if (typeof drawing.setGannOptions === 'function') drawing.setGannOptions(newOpts);
      if (drawing.type === 'gann-box') {
        (drawing as any).gannOptions = {
          ...((drawing as any).gannOptions || {}),
          ...newOpts,
        };
      }
      if (typeof drawing.setPitchforkOptions === 'function') drawing.setPitchforkOptions(newOpts);
      if (typeof drawing.setCircleOptions === 'function') drawing.setCircleOptions(newOpts);
      if (typeof drawing.setTriangleOptions === 'function') drawing.setTriangleOptions(newOpts);
      if (typeof drawing.setTextOptions === 'function') drawing.setTextOptions(newOpts);
      if (typeof drawing.setCalloutOptions === 'function') drawing.setCalloutOptions(newOpts);
      if (typeof drawing.setBrushOptions === 'function') drawing.setBrushOptions(newOpts);
      if (typeof drawing.setRotatedRectangleOptions === 'function') drawing.setRotatedRectangleOptions(newOpts);
      if (typeof drawing.setTrendAngleOptions === 'function') drawing.setTrendAngleOptions(newOpts);

      // 4. Update anchors if changed
      if (Array.isArray(newAnchors) && newAnchors.length === drawing.anchors.length) {
        drawing.setAnchors(newAnchors);
      }

      drawing.requestUpdate();
    } catch (err: any) {
      console.warn('[Drawing Properties] Live update error:', err.message);
    }
  };

  // Handle Style Change
  const updateStyleProp = (key: keyof typeof styleState, val: any) => {
    setStyleState((prev) => {
      const next = { ...prev, [key]: val };
      applyLiveUpdates(next, optionsState, anchorsState);
      return next;
    });
  };

  // Handle Option Change
  const updateOptionProp = (key: string, val: any) => {
    setOptionsState((prev: any) => {
      const next = { ...prev, [key]: val };
      applyLiveUpdates(styleState, next, anchorsState);
      return next;
    });
  };

  // Handle Anchor Coordinate Change
  const updateAnchorPrice = (index: number, newPrice: number) => {
    if (isNaN(newPrice)) return;
    setAnchorsState((prev) => {
      const next = prev.map((a, i) => (i === index ? { ...a, price: newPrice } : a));
      applyLiveUpdates(styleState, optionsState, next);
      if (next.length >= 2) {
        setAngleState(computeAngle(next[0], next[1]));
      }
      return next;
    });
  };

  // Helper to find candle index (bar index) from timestamp
  const getBarIndex = (timeVal: any): number => {
    if (!candles || candles.length === 0) return 0;
    const t = typeof timeVal === 'number' ? timeVal : Number(timeVal);
    let bestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < candles.length; i++) {
      const diff = Math.abs(candles[i].time - t);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  // Helper to convert candle index (bar index) back to timestamp
  const getTimeFromBarIndex = (barIdx: number): number => {
    if (!candles || candles.length === 0) return Math.floor(Date.now() / 1000);
    const clamped = Math.max(0, Math.min(candles.length - 1, barIdx));
    return candles[clamped].time;
  };

  // Handle Anchor Bar Change
  const updateAnchorBar = (index: number, newBarIndex: number) => {
    if (isNaN(newBarIndex)) return;
    const newTime = getTimeFromBarIndex(newBarIndex);
    setAnchorsState((prev) => {
      const next = prev.map((a, i) => (i === index ? { ...a, time: newTime } : a));
      applyLiveUpdates(styleState, optionsState, next);
      if (next.length >= 2) {
        setAngleState(computeAngle(next[0], next[1]));
      }
      return next;
    });
  };

  // Calculate live Gann price level value
  const calculateGannPrice = (ratio: number): number => {
    if (anchorsState.length < 2) return 0;
    const p1 = anchorsState[0].price;
    const p2 = anchorsState[1].price;
    const effectiveRatio = optionsState.reverse ? 1 - ratio : ratio;
    return p1 + (p2 - p1) * effectiveRatio;
  };

  // Handle Visibility Setting Change
  const updateVisibilitySetting = (key: keyof GannVisibilitySettings, val: boolean) => {
    const currentVis = optionsState.visibility || { ...DEFAULT_GANN_VISIBILITY };
    const nextVis = { ...currentVis, [key]: val };
    updateOptionProp('visibility', nextVis);
  };

  // Handle Angle Adjustment
  const handleAngleChange = (newAngleDeg: number) => {
    setAngleState(newAngleDeg);
    if (anchorsState.length >= 2 && chartApi && seriesApi) {
      try {
        const timeScale = chartApi.timeScale();
        const a1 = anchorsState[0];
        const a2 = anchorsState[1];
        const x1 = timeScale.timeToCoordinate(a1.time);
        const y1 = seriesApi.priceToCoordinate(a1.price);
        const x2 = timeScale.timeToCoordinate(a2.time);
        const y2 = seriesApi.priceToCoordinate(a2.price);

        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const dist = Math.hypot(x2 - x1, y2 - y1) || 120;
          const rad = (newAngleDeg * Math.PI) / 180;
          const newX2 = x1 + dist * Math.cos(rad);
          const newY2 = y1 - dist * Math.sin(rad); // y is inverted on screen

          const newPrice = seriesApi.coordinateToPrice(newY2);
          let newTime = timeScale.coordinateToTime(newX2);
          if (!newTime) newTime = a2.time;

          if (newPrice !== null && !isNaN(newPrice)) {
            const formattedPrice = Number(newPrice.toFixed(2));
            setAnchorsState((prev) => {
              const next = [prev[0], { time: newTime, price: formattedPrice }, ...prev.slice(2)];
              applyLiveUpdates(styleState, optionsState, next);
              return next;
            });
          }
        }
      } catch (err: any) {
        console.warn('[Drawing Properties] Angle update failed:', err.message);
      }
    }
  };

  // On Cancel: revert to initial snapshot
  const handleCancel = () => {
    if (initialSnapshotRef.current) {
      const snap = initialSnapshotRef.current;
      try {
        drawing.updateStyle(snap.style);
        drawing.updateOptions(snap.options);
        if (typeof drawing.setRectangleOptions === 'function') drawing.setRectangleOptions(snap.specificOptions);
        if (typeof drawing.setTrendLineOptions === 'function') drawing.setTrendLineOptions(snap.specificOptions);
        if (typeof drawing.setRayOptions === 'function') drawing.setRayOptions(snap.specificOptions);
        if (typeof drawing.setExtendedLineOptions === 'function') drawing.setExtendedLineOptions(snap.specificOptions);
        if (typeof drawing.setHorizontalLineOptions === 'function') drawing.setHorizontalLineOptions(snap.specificOptions);
        if (typeof drawing.setHorizontalRayOptions === 'function') drawing.setHorizontalRayOptions(snap.specificOptions);
        if (typeof drawing.setArrowOptions === 'function') drawing.setArrowOptions(snap.specificOptions);
        if (typeof drawing.setChannelOptions === 'function') drawing.setChannelOptions(snap.specificOptions);
        if (typeof drawing.setFibOptions === 'function') drawing.setFibOptions(snap.specificOptions);
        if (typeof drawing.setGannOptions === 'function') drawing.setGannOptions(snap.specificOptions);
        if (typeof drawing.setPitchforkOptions === 'function') drawing.setPitchforkOptions(snap.specificOptions);
        if (typeof drawing.setCircleOptions === 'function') drawing.setCircleOptions(snap.specificOptions);
        if (typeof drawing.setTriangleOptions === 'function') drawing.setTriangleOptions(snap.specificOptions);
        if (typeof drawing.setTextOptions === 'function') drawing.setTextOptions(snap.specificOptions);
        if (typeof drawing.setCalloutOptions === 'function') drawing.setCalloutOptions(snap.specificOptions);
        if (typeof drawing.setBrushOptions === 'function') drawing.setBrushOptions(snap.specificOptions);
        if (typeof drawing.setRotatedRectangleOptions === 'function') drawing.setRotatedRectangleOptions(snap.specificOptions);
        if (typeof drawing.setTrendAngleOptions === 'function') drawing.setTrendAngleOptions(snap.specificOptions);
        drawing.setAnchors(snap.anchors);
        drawing.requestUpdate();
      } catch {}
    }
    onClose();
  };

  // On Apply: commit changes and trigger PostgreSQL batch save
  const handleApply = () => {
    applyLiveUpdates(styleState, optionsState, anchorsState);
    if (drawing.type === 'gann-box') {
      (drawing as any).gannOptions = {
        ...((drawing as any).gannOptions || {}),
        ...optionsState,
      };
    }
    onApply(drawing);
    onClose();
  };

  // Supported capabilities per tool type
  const type = drawing.type || '';
  const hasFill = [
    'rectangle',
    'circle',
    'triangle',
    'parallel-channel',
    'flat-top-bottom',
    'fib-channel',
    'fib-speed-fan',
    'gann-box',
    'gann-square',
    'andrews-pitchfork',
    'schiff-pitchfork',
    'rotated-rectangle',
  ].includes(type);

  const hasAngleSupport = [
    'trend-line',
    'ray',
    'extended-line',
    'arrow',
    'trend-angle',
    'rotated-rectangle',
  ].includes(type);

  const hasExtendOptions = [
    'trend-line',
    'ray',
    'extended-line',
    'parallel-channel',
    'rectangle',
    'flat-top-bottom',
    'fib-retracement',
    'fib-extension',
    'fib-channel',
    'andrews-pitchfork',
    'schiff-pitchfork',
    'rotated-rectangle',
  ].includes(type);

  const isTextTool = ['text-annotation', 'callout'].includes(type);
  const isLineTool = ['trend-line', 'ray', 'extended-line', 'horizontal-line', 'horizontal-ray', 'arrow', 'trend-angle'].includes(type);
  const isFibTool = ['fib-retracement', 'fib-extension', 'fib-channel', 'fib-speed-fan'].includes(type);
  const isGannTool = ['gann-box', 'gann-fan', 'gann-square'].includes(type);
  const isPitchforkTool = ['andrews-pitchfork', 'schiff-pitchfork'].includes(type);

  // Line style representation
  const getLineStyleName = (dash: number[]) => {
    if (!dash || dash.length === 0) return 'solid';
    if (dash[0] > 4) return 'dashed';
    return 'dotted';
  };

  const currentLineStyle = getLineStyleName(styleState.lineDash);

  return (
    <div
      id="drawing-properties-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div
        id="drawing-properties-modal"
        className="w-full max-w-md bg-[#1e222d] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-200 select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/70 bg-[#171b26]">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: styleState.lineColor }} />
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                {toolItem.name} Settings
              </h3>
              <p className="text-[11px] text-slate-400 capitalize">
                {toolItem.category} • ID: {drawing.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            id="properties-close-btn"
            type="button"
            onClick={handleCancel}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-md transition-colors"
            title="Close without saving"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-700/70 bg-[#131722] px-4 gap-1">
          <button
            id="tab-style-btn"
            type="button"
            onClick={() => setActiveTab('style')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'style'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Style
          </button>
          <button
            id="tab-coords-btn"
            type="button"
            onClick={() => setActiveTab('coordinates')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'coordinates'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Coordinates
          </button>
          <button
            id="tab-vis-btn"
            type="button"
            onClick={() => setActiveTab('visibility')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'visibility'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Visibility
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* TAB 1: STYLE */}
          {activeTab === 'style' && (
            <div className="space-y-4">
              {/* Border / Line Color & Width */}
              <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-300">
                    {hasFill ? 'Border / Outline' : 'Line Color'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      id="line-color-picker"
                      type="color"
                      value={styleState.lineColor}
                      onChange={(e) => updateStyleProp('lineColor', e.target.value)}
                      className="w-7 h-7 rounded border border-slate-600 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-slate-400 uppercase">
                      {styleState.lineColor}
                    </span>
                  </div>
                </div>

                {/* Color presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => updateStyleProp('lineColor', c.hex)}
                      className={`w-5 h-5 rounded-full border transition-transform ${
                        styleState.lineColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'scale-125 border-white shadow-sm ring-2 ring-blue-500/50'
                          : 'border-transparent hover:scale-110 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>

                {/* Line Thickness */}
                <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-400">Line Thickness</span>
                  <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-md border border-slate-700/60">
                    {LINE_WIDTHS.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updateStyleProp('lineWidth', w)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          styleState.lineWidth === w
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <span
                          className="w-2.5 inline-block bg-current rounded-full"
                          style={{ height: `${w}px` }}
                        />
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Style (Solid, Dashed, Dotted) */}
                <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-400">Line Pattern</span>
                  <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-md border border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => updateStyleProp('lineDash', [])}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        currentLineStyle === 'solid'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      Solid
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStyleProp('lineDash', [6, 6])}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        currentLineStyle === 'dashed'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      Dashed
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStyleProp('lineDash', [2, 3])}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        currentLineStyle === 'dotted'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      Dotted
                    </button>
                  </div>
                </div>
              </div>

              {/* Fill Settings (If Supported) */}
              {hasFill && (
                <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-300">
                      <input
                        type="checkbox"
                        checked={optionsState.filled !== false}
                        onChange={(e) => updateOptionProp('filled', e.target.checked)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-900"
                      />
                      Background Fill
                    </label>

                    {optionsState.filled !== false && (
                      <div className="flex items-center gap-2">
                        <input
                          id="fill-color-picker"
                          type="color"
                          value={
                            styleState.fillColor.startsWith('#')
                              ? styleState.fillColor
                              : '#2962FF'
                          }
                          onChange={(e) => updateStyleProp('fillColor', e.target.value)}
                          className="w-7 h-7 rounded border border-slate-600 bg-transparent cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {optionsState.filled !== false && (
                    <div className="pt-2 border-t border-slate-700/50 space-y-1.5">
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Fill Opacity</span>
                        <span className="font-mono text-slate-200">
                          {Math.round(styleState.fillOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={styleState.fillOpacity}
                        onChange={(e) => updateStyleProp('fillOpacity', parseFloat(e.target.value))}
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Text / Annotation Settings (If Text tool) */}
              {isTextTool && (
                <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/60 space-y-3">
                  <div className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Type className="w-3.5 h-3.5 text-blue-400" />
                    Text Content & Typography
                  </div>
                  <div>
                    <textarea
                      value={optionsState.text || ''}
                      onChange={(e) => updateOptionProp('text', e.target.value)}
                      placeholder="Enter label text..."
                      rows={2}
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-md p-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-sans"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400">Font Size</span>
                    <select
                      value={optionsState.fontSize || 14}
                      onChange={(e) => updateOptionProp('fontSize', parseInt(e.target.value, 10))}
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {[10, 12, 14, 16, 18, 20, 24].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}px
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Tool-Specific Options */}
              <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/60 space-y-2.5">
                <span className="font-medium text-slate-300 block mb-1">
                  Feature Settings
                </span>

                {/* Extend Left / Right */}
                {hasExtendOptions && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={!!optionsState.extendLeft}
                        onChange={(e) => updateOptionProp('extendLeft', e.target.checked)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                      />
                      Extend Left
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={!!optionsState.extendRight}
                        onChange={(e) => updateOptionProp('extendRight', e.target.checked)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                      />
                      Extend Right
                    </label>
                  </div>
                )}

                {/* Line Angle Toggles */}
                {isLineTool && optionsState.showAngle !== undefined && (
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                    <input
                      type="checkbox"
                      checked={!!optionsState.showAngle}
                      onChange={(e) => updateOptionProp('showAngle', e.target.checked)}
                      className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                    />
                    Display Slope Angle
                  </label>
                )}

                {/* Trend Line specific */}
                {type === 'trend-line' && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/40">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={!!optionsState.showPriceChange}
                        onChange={(e) => updateOptionProp('showPriceChange', e.target.checked)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                      />
                      Price Delta
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={!!optionsState.showPercentChange}
                        onChange={(e) => updateOptionProp('showPercentChange', e.target.checked)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                      />
                      % Delta
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={!!optionsState.showBars}
                        onChange={(e) => updateOptionProp('showBars', e.target.checked)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                      />
                      Bar Count
                    </label>
                  </div>
                )}

                {/* Horizontal Line specific */}
                {type === 'horizontal-line' && (
                  <div className="space-y-2 pt-1 border-t border-slate-700/40">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={optionsState.showPrice !== false}
                        onChange={(e) => updateOptionProp('showPrice', e.target.checked)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                      />
                      Show Price Tag on Axis
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={!!optionsState.showLabel}
                          onChange={(e) => updateOptionProp('showLabel', e.target.checked)}
                          className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                        />
                        Label:
                      </label>
                      <input
                        type="text"
                        value={optionsState.labelText || ''}
                        onChange={(e) => updateOptionProp('labelText', e.target.value)}
                        placeholder="e.g. Major Resistance"
                        className="flex-1 bg-slate-900/80 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Rectangle Dimensions */}
                {(type === 'rectangle' || type === 'rotated-rectangle') && (
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                    <input
                      type="checkbox"
                      checked={!!optionsState.showDimensions}
                      onChange={(e) => updateOptionProp('showDimensions', e.target.checked)}
                      className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                    />
                    Show Dimensions & Price Range
                  </label>
                )}

                {/* Channel specific */}
                {type === 'parallel-channel' && (
                  <div className="space-y-2 pt-1 border-t border-slate-700/40">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={optionsState.showMiddleLine !== false}
                        onChange={(e) => updateOptionProp('showMiddleLine', e.target.checked)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                      />
                      Show Median (Middle) Line
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={!!optionsState.extendLines}
                        onChange={(e) => updateOptionProp('extendLines', e.target.checked)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                      />
                      Extend Channel Outward
                    </label>
                  </div>
                )}

                {/* Fibonacci specific */}
                {isFibTool && (
                  <div className="space-y-2 pt-1 border-t border-slate-700/40">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                        <input
                          type="checkbox"
                          checked={optionsState.showPrices !== false}
                          onChange={(e) => updateOptionProp('showPrices', e.target.checked)}
                          className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                        />
                        Show Prices
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                        <input
                          type="checkbox"
                          checked={optionsState.showPercentages !== false}
                          onChange={(e) => updateOptionProp('showPercentages', e.target.checked)}
                          className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                        />
                        Show Percentages
                      </label>
                    </div>
                    {optionsState.reverseDirection !== undefined && (
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                        <input
                          type="checkbox"
                          checked={!!optionsState.reverseDirection}
                          onChange={(e) => updateOptionProp('reverseDirection', e.target.checked)}
                          className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                        />
                        Reverse Direction (100% & 0%)
                      </label>
                    )}
                  </div>
                )}

                {/* Pitchfork specific */}
                {isPitchforkTool && (
                  <div className="space-y-2 pt-1 border-t border-slate-700/40">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={optionsState.showMedianLine !== false}
                        onChange={(e) => updateOptionProp('showMedianLine', e.target.checked)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                      />
                      Show Median Line
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={optionsState.showOuterLines !== false}
                        onChange={(e) => updateOptionProp('showOuterLines', e.target.checked)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                      />
                      Show Outer Warning Lines
                    </label>
                  </div>
                )}

                {/* Gann Box specific (TradingView Style) */}
                {type === 'gann-box' && (
                  <div className="space-y-4 pt-2 border-t border-slate-700/60">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                      <Grid className="w-3.5 h-3.5 text-blue-400" />
                      <span>Gann Box Style Configuration</span>
                    </div>

                    {/* Master Toggles: Use One Color, Angels, Reverse, Top/Bottom Labels */}
                    <div className="p-3 bg-slate-900/70 rounded-lg border border-slate-700/50 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white transition-colors">
                          <input
                            type="checkbox"
                            checked={optionsState.useOneColor !== false}
                            onChange={(e) => updateOptionProp('useOneColor', e.target.checked)}
                            className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-950"
                          />
                          <span className="font-medium">Use one color</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white transition-colors">
                          <input
                            type="checkbox"
                            checked={optionsState.angles !== false && optionsState.showDiagonals !== false}
                            onChange={(e) => {
                              updateOptionProp('angles', e.target.checked);
                              updateOptionProp('showDiagonals', e.target.checked);
                            }}
                            className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-950"
                          />
                          <span className="font-medium">Angels (Diagonals)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white transition-colors">
                          <input
                            type="checkbox"
                            checked={!!optionsState.reverse}
                            onChange={(e) => updateOptionProp('reverse', e.target.checked)}
                            className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-950"
                          />
                          <span className="font-medium">Reverse</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white transition-colors">
                          <input
                            type="checkbox"
                            checked={optionsState.topLabels !== false && optionsState.showTopLabels !== false}
                            onChange={(e) => {
                              updateOptionProp('topLabels', e.target.checked);
                              updateOptionProp('showTopLabels', e.target.checked);
                            }}
                            className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-950"
                          />
                          <span className="font-medium">Top labels</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white transition-colors">
                          <input
                            type="checkbox"
                            checked={!!optionsState.bottomLabels || !!optionsState.showBottomLabels}
                            onChange={(e) => {
                              updateOptionProp('bottomLabels', e.target.checked);
                              updateOptionProp('showBottomLabels', e.target.checked);
                            }}
                            className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-950"
                          />
                          <span className="font-medium">Bottom labels</span>
                        </label>
                      </div>
                    </div>

                    {/* PRICE LEVELS SECTION */}
                    <div className="p-3 bg-slate-900/70 rounded-lg border border-slate-700/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                          <input
                            type="checkbox"
                            checked={optionsState.showPriceLevels !== false}
                            onChange={(e) => updateOptionProp('showPriceLevels', e.target.checked)}
                            className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-950"
                          />
                          <span>PRICE LEVELS</span>
                        </label>

                        <div className="flex items-center gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              const standard = { '0': true, '0.25': true, '0.5': true, '0.75': true, '1': true };
                              updateOptionProp('activePriceLevels', standard);
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            Gann Standard
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const fib = { '0': true, '0.236': true, '0.382': true, '0.5': true, '0.618': true, '0.786': true, '1': true };
                              updateOptionProp('activePriceLevels', fib);
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            Fibonacci
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const all: Record<string, boolean> = {};
                              DEFAULT_GANN_PRICE_LEVELS.forEach((l) => (all[String(l)] = true));
                              updateOptionProp('activePriceLevels', all);
                            }}
                            className="px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 transition-colors"
                          >
                            All
                          </button>
                        </div>
                      </div>

                      {/* Price levels list */}
                      {optionsState.showPriceLevels !== false && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {DEFAULT_GANN_PRICE_LEVELS.map((ratio) => {
                            const isChecked = optionsState.activePriceLevels
                              ? !!optionsState.activePriceLevels[String(ratio)]
                              : true;
                            const livePrice = calculateGannPrice(ratio);
                            const ratioColor = getGannRatioColor(ratio);

                            return (
                              <div
                                key={ratio}
                                className={`flex items-center justify-between px-2 py-1 rounded text-xs border transition-colors ${
                                  isChecked
                                    ? 'bg-slate-950/80 border-slate-700/80 text-slate-200'
                                    : 'bg-slate-950/30 border-slate-800/40 text-slate-500'
                                }`}
                              >
                                <label className="flex items-center gap-2 cursor-pointer flex-1 select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const next = { ...(optionsState.activePriceLevels || {}) };
                                      next[String(ratio)] = e.target.checked;
                                      updateOptionProp('activePriceLevels', next);
                                    }}
                                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                                  />
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-2 h-2 rounded-full inline-block shrink-0"
                                      style={{
                                        backgroundColor: optionsState.useOneColor !== false ? styleState.lineColor : ratioColor,
                                      }}
                                    />
                                    <span className="font-mono font-medium">{ratio}</span>
                                    <span className="text-[10px] text-slate-500">
                                      ({(ratio * 100).toFixed(1)}%)
                                    </span>
                                  </div>
                                </label>

                                <span className="font-mono text-[11px] text-slate-300 ml-2">
                                  ${livePrice.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* TIME LEVELS SECTION */}
                    <div className="p-3 bg-slate-900/70 rounded-lg border border-slate-700/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                          <input
                            type="checkbox"
                            checked={optionsState.showTimeLevels !== false}
                            onChange={(e) => updateOptionProp('showTimeLevels', e.target.checked)}
                            className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-950"
                          />
                          <span>TIME LEVELS</span>
                        </label>

                        <div className="flex items-center gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              const quarters = { '0': true, '0.25': true, '0.5': true, '0.75': true, '1': true };
                              updateOptionProp('activeTimeLevels', quarters);
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            Quarters (1/4)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const thirds = { '0': true, '0.333': true, '0.5': true, '0.667': true, '1': true };
                              updateOptionProp('activeTimeLevels', thirds);
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            Thirds (1/3)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const all: Record<string, boolean> = {};
                              DEFAULT_GANN_TIME_LEVELS.forEach((l) => (all[String(l)] = true));
                              updateOptionProp('activeTimeLevels', all);
                            }}
                            className="px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 transition-colors"
                          >
                            All
                          </button>
                        </div>
                      </div>

                      {/* Time levels list */}
                      {optionsState.showTimeLevels !== false && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                          {DEFAULT_GANN_TIME_LEVELS.map((ratio) => {
                            const isChecked = optionsState.activeTimeLevels
                              ? !!optionsState.activeTimeLevels[String(ratio)]
                              : true;
                            const ratioColor = getGannRatioColor(ratio);

                            return (
                              <div
                                key={ratio}
                                className={`flex items-center justify-between px-2 py-1 rounded text-xs border transition-colors ${
                                  isChecked
                                    ? 'bg-slate-950/80 border-slate-700/80 text-slate-200'
                                    : 'bg-slate-950/30 border-slate-800/40 text-slate-500'
                                }`}
                              >
                                <label className="flex items-center gap-2 cursor-pointer flex-1 select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const next = { ...(optionsState.activeTimeLevels || {}) };
                                      next[String(ratio)] = e.target.checked;
                                      updateOptionProp('activeTimeLevels', next);
                                    }}
                                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                                  />
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-2 h-2 rounded-full inline-block shrink-0"
                                      style={{
                                        backgroundColor: optionsState.useOneColor !== false ? styleState.lineColor : ratioColor,
                                      }}
                                    />
                                    <span className="font-mono font-medium">{ratio}</span>
                                    <span className="text-[10px] text-slate-500">
                                      ({(ratio * 100).toFixed(1)}%)
                                    </span>
                                  </div>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Gann other tools specific */}
                {isGannTool && type !== 'gann-box' && (
                  <div className="space-y-2 pt-1 border-t border-slate-700/40">
                    {optionsState.showDiagonals !== undefined && (
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                        <input
                          type="checkbox"
                          checked={optionsState.showDiagonals !== false}
                          onChange={(e) => updateOptionProp('showDiagonals', e.target.checked)}
                          className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                        />
                        Show Geometric Diagonals
                      </label>
                    )}
                    {optionsState.divisions !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Divisions</span>
                        <select
                          value={optionsState.divisions}
                          onChange={(e) => updateOptionProp('divisions', parseInt(e.target.value, 10))}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                        >
                          <option value={4}>4 Divisions</option>
                          <option value={8}>8 Divisions</option>
                          <option value={16}>16 Divisions</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Trend Angle specific */}
                {type === 'trend-angle' && (
                  <div className="space-y-2 pt-1 border-t border-slate-700/40">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={optionsState.showArc !== false}
                        onChange={(e) => updateOptionProp('showArc', e.target.checked)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                      />
                      Show Angular Arc
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={optionsState.showDegrees !== false}
                        onChange={(e) => updateOptionProp('showDegrees', e.target.checked)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900"
                      />
                      Show Degrees Text
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COORDINATES */}
          {activeTab === 'coordinates' && (
            <div className="space-y-4">
              <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-200 text-xs">
                    Price & Bar Coordinates
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Total Candles Loaded: {candles.length}
                  </span>
                </div>

                {anchorsState.map((anchor, idx) => {
                  const barIndex = getBarIndex(anchor.time);
                  const isPoint1 = idx === 0;
                  const isPoint2 = idx === 1;
                  const pointTitle = isPoint1
                    ? '#1 (price, bar)'
                    : isPoint2
                    ? '#2 (price, bar)'
                    : `#${idx + 1} (price, bar)`;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-md bg-slate-900/80 border border-slate-700/60 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-blue-400 font-mono flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          {pointTitle}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                          {isPoint1 ? 'Start Anchor' : isPoint2 ? 'Opposite Anchor' : `Anchor ${idx + 1}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Price input */}
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            Price
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              step="0.01"
                              value={anchor.price}
                              onChange={(e) => updateAnchorPrice(idx, parseFloat(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500 pr-12"
                            />
                            <div className="absolute right-1 flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => updateAnchorPrice(idx, Number((anchor.price + 0.5).toFixed(2)))}
                                className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => updateAnchorPrice(idx, Number((anchor.price - 0.5).toFixed(2)))}
                                className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                              >
                                -
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Bar Index input */}
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            Bar
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max={Math.max(0, candles.length - 1)}
                              value={barIndex}
                              onChange={(e) => updateAnchorBar(idx, parseInt(e.target.value, 10))}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500 pr-12"
                            />
                            <div className="absolute right-1 flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => updateAnchorBar(idx, barIndex + 1)}
                                className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => updateAnchorBar(idx, Math.max(0, barIndex - 1))}
                                className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                              >
                                -
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Readable timestamp */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/40 px-2 py-1 rounded border border-slate-800/40">
                        <span className="text-slate-500">Timestamp:</span>
                        <span className="text-slate-300">
                          {typeof anchor.time === 'number'
                            ? new Date(anchor.time * 1000).toISOString().slice(0, 19).replace('T', ' ') + ' UTC'
                            : String(anchor.time)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Summary delta stats */}
                {anchorsState.length >= 2 && (
                  <div className="p-2.5 bg-blue-950/20 border border-blue-800/40 rounded-md flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-blue-300">
                    <div>
                      <span className="text-blue-400/70">Price Range: </span>
                      <span>
                        ${Math.abs(anchorsState[1].price - anchorsState[0].price).toFixed(2)} (
                        {anchorsState[0].price !== 0
                          ? ((Math.abs(anchorsState[1].price - anchorsState[0].price) / anchorsState[0].price) * 100).toFixed(2)
                          : '0.00'}
                        %)
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-400/70">Bar Span: </span>
                      <span>
                        {Math.abs(getBarIndex(anchorsState[1].time) - getBarIndex(anchorsState[0].time))} bars
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Angle / Rotation Property (If tool supports angle) */}
              {hasAngleSupport && anchorsState.length >= 2 && (
                <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-slate-300">
                      <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                      Slope Angle
                    </div>
                    <span className="font-mono text-xs font-semibold text-blue-400">
                      {angleState.toFixed(1)}°
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      step="0.5"
                      value={angleState}
                      onChange={(e) => handleAngleChange(parseFloat(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                    <input
                      type="number"
                      min="-180"
                      max="180"
                      step="0.5"
                      value={angleState}
                      onChange={(e) => handleAngleChange(parseFloat(e.target.value))}
                      className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Quick Angle Presets */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      { label: '0° Flat', angle: 0 },
                      { label: '30°', angle: 30 },
                      { label: '45°', angle: 45 },
                      { label: '-45°', angle: -45 },
                      { label: '90° Vert', angle: 90 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => handleAngleChange(p.angle)}
                        className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                          Math.abs(angleState - p.angle) < 0.5
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VISIBILITY */}
          {activeTab === 'visibility' && (
            <div className="space-y-4">
              {/* Overlay Master & Lock */}
              <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/60 space-y-3">
                <span className="font-medium text-slate-200 text-xs block mb-1">
                  General Visibility & Protection
                </span>

                <div className="flex items-center justify-between p-2.5 rounded-md bg-slate-900/70 border border-slate-700/50">
                  <div className="flex items-center gap-2.5">
                    {optionsState.visible !== false ? (
                      <Eye className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-500" />
                    )}
                    <div>
                      <div className="text-xs font-medium text-slate-200">Visible on Chart</div>
                      <div className="text-[11px] text-slate-400">
                        Master render switch for this drawing
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={optionsState.visible !== false}
                    onChange={(e) => updateOptionProp('visible', e.target.checked)}
                    className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-950"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-md bg-slate-900/70 border border-slate-700/50">
                  <div className="flex items-center gap-2.5">
                    {optionsState.locked ? (
                      <Lock className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Unlock className="w-4 h-4 text-slate-500" />
                    )}
                    <div>
                      <div className="text-xs font-medium text-slate-200">Lock Position</div>
                      <div className="text-[11px] text-slate-400">
                        Prevent accidental dragging or coordinate modifications
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!optionsState.locked}
                    onChange={(e) => updateOptionProp('locked', e.target.checked)}
                    className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-950"
                  />
                </div>
              </div>

              {/* TIMEFRAME RESOLUTION VISIBILITY (Ticks, Seconds, Minutes, Hours, Days, Weeks, Months, Ranges) */}
              <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-200 text-xs block">
                      Timeframe Visibility Rules
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Select which chart resolution intervals display this drawing
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const allOn: GannVisibilitySettings = {
                          ticks: true,
                          seconds: true,
                          minutes: true,
                          hours: true,
                          days: true,
                          weeks: true,
                          months: true,
                          ranges: true,
                        };
                        updateOptionProp('visibility', allOn);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-medium transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateOptionProp('visibility', { ...DEFAULT_GANN_VISIBILITY });
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-medium transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Active timeframe indicator */}
                {(() => {
                  const currentVis = optionsState.visibility || { ...DEFAULT_GANN_VISIBILITY };
                  const isVisibleOnCurrent = isTimeframeVisible(currentInterval, currentVis);

                  return (
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Current Chart Timeframe:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/50">
                          {currentInterval}m
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isVisibleOnCurrent
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {isVisibleOnCurrent ? 'VISIBLE ON ACTIVE CHART' : 'HIDDEN ON ACTIVE CHART'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* 8 Specific Timeframe Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    { key: 'ticks', label: 'Ticks', desc: 'Tick & sub-second execution charts' },
                    { key: 'seconds', label: 'Seconds', desc: '1s, 5s, 15s, 30s bars' },
                    { key: 'minutes', label: 'Minutes', desc: '1m, 3m, 5m, 15m, 30m, 45m bars' },
                    { key: 'hours', label: 'Hours', desc: '1h, 2h, 4h, 12h bars' },
                    { key: 'days', label: 'Days', desc: '1D, 2D, 3D daily bars' },
                    { key: 'weeks', label: 'Weeks', desc: '1W weekly bars' },
                    { key: 'months', label: 'Months', desc: '1M, 3M, 12M monthly bars' },
                    { key: 'ranges', label: 'Ranges', desc: 'Range bars, Renko, & Kagi' },
                  ].map((item) => {
                    const vis = optionsState.visibility || { ...DEFAULT_GANN_VISIBILITY };
                    const isChecked = (vis as any)[item.key] !== false;

                    return (
                      <label
                        key={item.key}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-slate-900/80 border-slate-700 hover:border-blue-500/50'
                            : 'bg-slate-950/40 border-slate-800/60 opacity-60 hover:opacity-80'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => updateVisibilitySetting(item.key as keyof GannVisibilitySettings, e.target.checked)}
                          className="mt-0.5 rounded border-slate-600 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-950 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-200">{item.label}</div>
                          <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-700/70 bg-[#171b26]">
          <button
            id="properties-delete-btn"
            type="button"
            onClick={() => {
              onDelete(drawing.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
            title="Delete this drawing permanently"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          <div className="flex items-center gap-2">
            <button
              id="properties-cancel-btn"
              type="button"
              onClick={handleCancel}
              className="px-4 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
            >
              Cancel
            </button>
            <button
              id="properties-apply-btn"
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
