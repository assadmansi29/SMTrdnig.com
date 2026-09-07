import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MousePointer,
  Minus,
  Columns,
  Divide,
  Grid3X3,
  GitFork,
  Square,
  Type,
  Trash2,
  Palette,
  Settings,
  Magnet,
  Layers,
  Undo2,
  Redo2,
  TrendingUp,
  Ruler,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DRAWING_TOOLS, COLOR_PALETTE, LINE_WIDTHS } from './toolsConfig';
import { DrawingToolItem } from './types';

interface DrawingToolbarProps {
  activeTool: string | null;
  onSelectTool: (toolId: string | null) => void;
  selectedDrawingId: string | null;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  onOpenProperties?: () => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  currentWidth: number;
  onWidthChange: (width: number) => void;
  isMagnetActive?: boolean;
  onToggleMagnet?: () => void;
  isObjectTreeOpen?: boolean;
  onToggleObjectTree?: () => void;
  drawingsCount?: number;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  allLocked?: boolean;
  onToggleAllLock?: () => void;
  allVisible?: boolean;
  onToggleAllVisibility?: () => void;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeTool,
  onSelectTool,
  selectedDrawingId,
  onDeleteSelected,
  onClearAll,
  onOpenProperties,
  currentColor,
  onColorChange,
  currentWidth,
  onWidthChange,
  isMagnetActive,
  onToggleMagnet,
  isObjectTreeOpen,
  onToggleObjectTree,
  drawingsCount = 0,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  allLocked = false,
  onToggleAllLock,
  allVisible = true,
  onToggleAllVisibility,
}) => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [colorPickerPos, setColorPickerPos] = useState<{ top: number; left: number } | null>(null);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside toolbar or popups
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inToolbar = toolbarRef.current?.contains(target);
      const inFlyout = flyoutRef.current?.contains(target);
      const inColor = colorPickerRef.current?.contains(target);

      if (!inToolbar && !inFlyout && !inColor) {
        setOpenCategory(null);
        setFlyoutPos(null);
        setShowColorPicker(false);
        setColorPickerPos(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick, true);
    return () => document.removeEventListener('mousedown', handleOutsideClick, true);
  }, []);

  const getToolsByCategory = (category: string) => {
    if (category === 'channel') {
      return DRAWING_TOOLS.filter((t) => t.category === 'channel' || t.category === 'pitchfork');
    }
    if (category === 'measurement') {
      return DRAWING_TOOLS.filter((t) => t.category === 'measurement' || t.category === 'forecast');
    }
    return DRAWING_TOOLS.filter((t) => t.category === category);
  };

  const categories = [
    { id: 'line', label: 'Lines & Rays', icon: TrendingUp },
    { id: 'channel', label: 'Channels & Pitchforks', icon: GitFork },
    { id: 'fibonacci', label: 'Fibonacci Tools', icon: Divide },
    { id: 'gann', label: 'Gann Analysis', icon: Grid3X3 },
    { id: 'shape', label: 'Geometric Shapes', icon: Square },
    { id: 'annotation', label: 'Annotations & Freehand', icon: Type },
    { id: 'measurement', label: 'Forecasting & Measurement', icon: Ruler },
  ];

  const handleToolClick = (tool: DrawingToolItem) => {
    onSelectTool(tool.id);
    setOpenCategory(null);
    setFlyoutPos(null);
  };

  const handleCategoryToggle = (catId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openCategory === catId) {
      setOpenCategory(null);
      setFlyoutPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const safeTop = Math.max(10, Math.min(rect.top, window.innerHeight - 320));
      setFlyoutPos({ top: safeTop, left: rect.right + 6 });
      setOpenCategory(catId);
      setShowColorPicker(false);
      setColorPickerPos(null);
    }
  };

  const handleColorToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (showColorPicker) {
      setShowColorPicker(false);
      setColorPickerPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const safeTop = Math.max(10, Math.min(rect.top, window.innerHeight - 260));
      setColorPickerPos({ top: safeTop, left: rect.right + 6 });
      setShowColorPicker(true);
      setOpenCategory(null);
      setFlyoutPos(null);
    }
  };

  return (
    <>
      <div
        ref={toolbarRef}
        className="absolute left-2 top-11 z-20 flex flex-col items-center bg-[#0d1322]/95 backdrop-blur-md border border-slate-700/70 rounded-xl p-0.5 shadow-2xl select-none max-h-[calc(100%-54px)] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* 1. Cursor / Select Mode */}
        <button
          id="btn-chart-tool-cursor"
          title="Cursor / Select Drawing (Esc)"
          onClick={() => {
            onSelectTool(null);
            setOpenCategory(null);
            setFlyoutPos(null);
          }}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
            activeTool === null
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
          }`}
        >
          <MousePointer className="w-3.5 h-3.5" />
        </button>

        <div className="w-4 h-[1px] bg-slate-800 my-0.5" />

        {/* 2. Tool Categories with Submenu Triggers */}
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          const isCatActive =
            activeTool !== null &&
            getToolsByCategory(cat.id).some((t) => t.id === activeTool);
          const isOpen = openCategory === cat.id;

          return (
            <div key={cat.id} className="relative">
              <button
                id={`btn-chart-cat-${cat.id}`}
                title={cat.label}
                onClick={(e) => handleCategoryToggle(cat.id, e)}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all my-0.5 relative ${
                  isCatActive
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                    : isOpen
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-slate-500" />
              </button>
            </div>
          );
        })}

        <div className="w-4 h-[1px] bg-slate-800 my-0.5" />

        {/* Magnet Mode Toggle (Snap to Candle OHLC) */}
        {onToggleMagnet && (
          <button
            id="btn-chart-magnet-toggle"
            title={isMagnetActive ? 'Magnet Mode: ON (Snapping to Candle OHLC)' : 'Magnet Mode: OFF (Free positioning)'}
            onClick={onToggleMagnet}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all my-0.5 relative ${
              isMagnetActive
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            {isMagnetActive && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>
        )}

        {/* 3. Color & Line Width Controller */}
        <div className="relative">
          <button
            id="btn-chart-color-picker"
            title="Line Color & Thickness"
            onClick={handleColorToggle}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 relative my-0.5"
          >
            <Palette className="w-3.5 h-3.5" />
            <span
              className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full border border-black"
              style={{ backgroundColor: currentColor }}
            />
          </button>
        </div>

        {/* 4. Properties for Selected Drawing */}
        {selectedDrawingId && onOpenProperties && (
          <button
            id="btn-chart-properties-selected"
            title="Drawing Properties / Settings (Double Click Drawing)"
            onClick={onOpenProperties}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-all text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 my-0.5"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 5. Delete Selected Drawing */}
        {selectedDrawingId && (
          <button
            id="btn-chart-delete-selected"
            title="Delete Selected Drawing (Delete)"
            onClick={onDeleteSelected}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-all text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 my-0.5 animate-pulse"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="w-4 h-[1px] bg-slate-800 my-0.5" />

        {/* 6. Object Tree / Drawings Manager Toggle */}
        {onToggleObjectTree && (
          <button
            id="btn-chart-object-tree-toggle"
            title={`Object Tree / Drawings Manager (${drawingsCount} items)`}
            onClick={onToggleObjectTree}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all my-0.5 relative ${
              isObjectTreeOpen
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {drawingsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 bg-amber-500 text-[#090D17] text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                {drawingsCount}
              </span>
            )}
          </button>
        )}

        {/* 7. Hide All / Show All Drawings */}
        {onToggleAllVisibility && (
          <button
            id="btn-chart-toggle-all-visibility"
            title={allVisible ? 'Hide All Drawings' : 'Show All Drawings'}
            onClick={onToggleAllVisibility}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 my-0.5"
          >
            {allVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400" />}
          </button>
        )}

        {/* 8. Lock All / Unlock All Drawings */}
        {onToggleAllLock && (
          <button
            id="btn-chart-toggle-all-lock"
            title={allLocked ? 'Unlock All Drawings' : 'Lock All Drawings'}
            onClick={onToggleAllLock}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all my-0.5 ${
              allLocked ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            {allLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* 9. Undo & Redo */}
        {onUndo && (
          <button
            id="btn-chart-undo"
            title="Undo (Ctrl+Z)"
            onClick={onUndo}
            disabled={!canUndo}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-transparent my-0.5"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
        )}

        {onRedo && (
          <button
            id="btn-chart-redo"
            title="Redo (Ctrl+Y)"
            onClick={onRedo}
            disabled={!canRedo}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-transparent my-0.5"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="w-4 h-[1px] bg-slate-800 my-0.5" />

        {/* 10. Clear All Drawings */}
        <button
          id="btn-chart-clear-all"
          title="Clear All Drawings on this Chart"
          onClick={() => {
            if (window.confirm('Clear all drawings on this timeframe and symbol?')) {
              onClearAll();
            }
          }}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-all text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 my-0.5"
        >
          <Trash2 className="w-3.5 h-3.5 opacity-60" />
        </button>
      </div>

      {/* Floating Submenu Rendered as Unclipped Fixed Portal */}
      {openCategory && flyoutPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={flyoutRef}
          style={{ top: `${flyoutPos.top}px`, left: `${flyoutPos.left}px` }}
          className="fixed bg-[#0d1322] border border-slate-700/90 rounded-xl shadow-2xl p-1.5 w-60 z-50 animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          <div className="text-[10px] font-semibold tracking-wider text-slate-400 px-2 py-1 uppercase border-b border-slate-800/80 mb-1">
            {categories.find((c) => c.id === openCategory)?.label}
          </div>
          <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto">
            {getToolsByCategory(openCategory).map((tool) => {
              const isSelected = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  id={`btn-chart-tool-${tool.id}`}
                  onClick={() => handleToolClick(tool)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                  }`}
                >
                  <span className="truncate">{tool.name}</span>
                  <span className="text-[9px] text-slate-500 font-mono shrink-0 ml-1">
                    {tool.requiredAnchors} pt{tool.requiredAnchors > 1 ? 's' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* Floating Color Picker Rendered as Unclipped Fixed Portal */}
      {showColorPicker && colorPickerPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={colorPickerRef}
          style={{ top: `${colorPickerPos.top}px`, left: `${colorPickerPos.left}px` }}
          className="fixed bg-[#0d1322] border border-slate-700/90 rounded-xl shadow-2xl p-2.5 w-48 z-50 animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Color Palette
          </div>
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.hex}
                id={`btn-color-${c.hex.replace('#', '')}`}
                title={c.name}
                onClick={() => onColorChange(c.hex)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  currentColor === c.hex
                    ? 'scale-110 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950'
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>

          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Line Width
          </div>
          <div className="flex gap-1">
            {LINE_WIDTHS.map((w) => (
              <button
                key={w}
                id={`btn-width-${w}`}
                onClick={() => onWidthChange(w)}
                className={`flex-1 py-1 text-xs rounded font-mono ${
                  currentWidth === w
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

