import React, { useState, useRef, useEffect } from 'react';
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
  ChevronRight,
  Palette,
  Settings,
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
}) => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside toolbar
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenCategory(null);
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getToolsByCategory = (category: string) => {
    return DRAWING_TOOLS.filter((t) => t.category === category);
  };

  const categories = [
    { id: 'line', label: 'Lines & Rays', icon: Minus },
    { id: 'channel', label: 'Channels', icon: Columns },
    { id: 'fibonacci', label: 'Fibonacci Tools', icon: Divide },
    { id: 'gann', label: 'Gann Analysis', icon: Grid3X3 },
    { id: 'pitchfork', label: 'Pitchforks', icon: GitFork },
    { id: 'shape', label: 'Geometric Shapes', icon: Square },
    { id: 'annotation', label: 'Annotations & Notes', icon: Type },
  ];

  const handleToolClick = (tool: DrawingToolItem) => {
    onSelectTool(tool.id);
    setOpenCategory(null);
  };

  return (
    <div
      ref={toolbarRef}
      className="absolute left-2 top-12 z-20 flex flex-col items-center bg-[#0d1322]/95 backdrop-blur-md border border-slate-700/70 rounded-xl p-1 shadow-2xl select-none"
    >
      {/* 1. Cursor / Select Mode */}
      <button
        id="btn-chart-tool-cursor"
        title="Cursor / Select Drawing (Esc)"
        onClick={() => {
          onSelectTool(null);
          setOpenCategory(null);
        }}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          activeTool === null
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
        }`}
      >
        <MousePointer className="w-4 h-4" />
      </button>

      <div className="w-5 h-[1px] bg-slate-800 my-1" />

      {/* 2. Tool Categories with Flyout Submenus */}
      {categories.map((cat) => {
        const IconComponent = cat.icon;
        const isCatActive =
          activeTool !== null &&
          DRAWING_TOOLS.find((t) => t.id === activeTool)?.category === cat.id;
        const isOpen = openCategory === cat.id;
        const catTools = getToolsByCategory(cat.id);

        return (
          <div key={cat.id} className="relative group">
            <button
              id={`btn-chart-cat-${cat.id}`}
              title={cat.label}
              onClick={() => {
                setOpenCategory(isOpen ? null : cat.id);
                setShowColorPicker(false);
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all my-0.5 relative ${
                isCatActive
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                  : isOpen
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-slate-500" />
            </button>

            {/* Flyout Submenu */}
            {isOpen && (
              <div
                className="absolute left-full ml-2 top-0 bg-[#0d1322] border border-slate-700/80 rounded-xl shadow-2xl p-1.5 w-56 z-30 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="text-[10px] font-semibold tracking-wider text-slate-400 px-2 py-1 uppercase border-b border-slate-800/80 mb-1">
                  {cat.label}
                </div>
                <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto">
                  {catTools.map((tool) => {
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
              </div>
            )}
          </div>
        );
      })}

      <div className="w-5 h-[1px] bg-slate-800 my-1" />

      {/* 3. Color & Line Width Controller */}
      <div className="relative">
        <button
          id="btn-chart-color-picker"
          title="Line Color & Thickness"
          onClick={() => {
            setShowColorPicker(!showColorPicker);
            setOpenCategory(null);
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 relative my-0.5"
        >
          <Palette className="w-4 h-4" />
          <span
            className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-black"
            style={{ backgroundColor: currentColor }}
          />
        </button>

        {showColorPicker && (
          <div className="absolute left-full ml-2 top-0 bg-[#0d1322] border border-slate-700/80 rounded-xl shadow-2xl p-2.5 w-48 z-30">
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
          </div>
        )}
      </div>

      {/* 4. Properties for Selected Drawing */}
      {selectedDrawingId && onOpenProperties && (
        <button
          id="btn-chart-properties-selected"
          title="Drawing Properties / Settings (Double Click Drawing)"
          onClick={onOpenProperties}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 my-0.5"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}

      {/* 5. Delete Selected Drawing */}
      {selectedDrawingId && (
        <button
          id="btn-chart-delete-selected"
          title="Delete Selected Drawing (Delete)"
          onClick={onDeleteSelected}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 my-0.5 animate-pulse"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* 6. Clear All Drawings */}
      <button
        id="btn-chart-clear-all"
        title="Clear All Drawings on this Chart"
        onClick={() => {
          if (window.confirm('Clear all drawings on this timeframe and symbol?')) {
            onClearAll();
          }
        }}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 my-0.5"
      >
        <Trash2 className="w-3.5 h-3.5 opacity-60" />
      </button>
    </div>
  );
};
