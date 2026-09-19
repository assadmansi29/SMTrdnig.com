import React from 'react';
import {
  X,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Settings,
  Layers,
  Undo2,
  Redo2,
  Minus,
  Grid3X3,
  Divide,
  Square,
  Type,
  TrendingUp,
  Ruler,
  GitFork,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { DRAWING_TOOLS } from './toolsConfig';

export interface ObjectTreeItem {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  locked: boolean;
  anchorsCount: number;
  color?: string;
  previewText?: string;
  rawDrawing: any;
}

export interface ObjectTreePanelProps {
  isOpen: boolean;
  onClose: () => void;
  drawings: ObjectTreeItem[];
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDeleteDrawing: (id: string) => void;
  onOpenProperties: (idOrDrawing: any) => void;
  onToggleAllVisibility?: () => void;
  onToggleAllLock?: () => void;
  onDeleteSelected?: () => void;
  onDeleteAll?: () => void;
  onClearAll?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  allVisible?: boolean;
  allLocked?: boolean;
}

// Icon helper by drawing type
const getDrawingIcon = (type: string) => {
  if (type.includes('line') || type === 'ray' || type === 'arrow') return TrendingUp;
  if (type.includes('fib')) return Divide;
  if (type.includes('gann')) return Grid3X3;
  if (type.includes('pitchfork')) return GitFork;
  if (type === 'rectangle' || type === 'triangle' || type === 'circle' || type === 'ellipse') return Square;
  if (type.includes('text') || type === 'callout' || type === 'brush') return Type;
  if (type.includes('range') || type.includes('position') || type.includes('measure')) return Ruler;
  return Minus;
};

export const ObjectTreePanel: React.FC<ObjectTreePanelProps> = ({
  isOpen,
  onClose,
  drawings,
  selectedDrawingId,
  onSelectDrawing,
  onToggleVisibility,
  onToggleLock,
  onDeleteDrawing,
  onOpenProperties,
  onToggleAllVisibility,
  onToggleAllLock,
  onDeleteSelected,
  onDeleteAll,
  onClearAll,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  allVisible = true,
  allLocked = false,
}) => {
  if (!isOpen) return null;

  const handleDeleteAllAction = () => {
    if (drawings.length === 0) return;
    if (window.confirm('Delete all drawings on this chart?')) {
      if (onDeleteAll) onDeleteAll();
      else if (onClearAll) onClearAll();
    }
  };

  return (
    <div
      id="chart-object-tree-panel"
      className="absolute right-3 top-12 z-30 w-80 max-h-[calc(100%-4rem)] flex flex-col bg-[#0b0f19]/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden select-none animate-in fade-in slide-in-from-right-4 duration-150 text-slate-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#070a12] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold tracking-wide text-slate-100">Object Tree / Drawings</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded font-mono">
            {drawings.length}
          </span>
        </div>
        <button
          id="btn-close-object-tree"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
          title="Close Object Tree"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Global Actions Bar: Undo, Redo, Hide/Show All, Lock/Unlock All, Clear All */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#090d17] border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-1">
          {/* Undo */}
          <button
            id="btn-tree-undo"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          {/* Redo */}
          <button
            id="btn-tree-redo"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle All Visibility */}
          <button
            id="btn-tree-toggle-all-visibility"
            onClick={onToggleAllVisibility}
            title={allVisible ? 'Hide All Drawings' : 'Show All Drawings'}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            {allVisible ? <Eye className="w-3.5 h-3.5 text-blue-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {/* Toggle All Lock */}
          <button
            id="btn-tree-toggle-all-lock"
            onClick={onToggleAllLock}
            title={allLocked ? 'Unlock All Drawings' : 'Lock All Drawings'}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            {allLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <div className="w-[1px] h-3.5 bg-slate-800 mx-0.5" />

          {/* Delete Selected */}
          {selectedDrawingId && (
            <button
              id="btn-tree-delete-selected"
              onClick={onDeleteSelected}
              title="Delete Selected Drawing"
              className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete All Drawings */}
          <button
            id="btn-tree-delete-all"
            onClick={handleDeleteAllAction}
            disabled={drawings.length === 0}
            title="Delete All Drawings"
            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Drawings List */}
      <div className="flex-1 overflow-y-auto max-h-[340px] divide-y divide-slate-800/50">
        {drawings.length === 0 ? (
          <div className="py-8 px-4 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <Layers className="w-8 h-8 opacity-40 text-slate-600" />
            <span>No drawings on this chart yet.</span>
            <span className="text-[11px] text-slate-600">Select any tool from the toolbar on the left to start drawing.</span>
          </div>
        ) : (
          drawings.map((item) => {
            const isSelected = selectedDrawingId === item.id;
            const Icon = getDrawingIcon(item.type);

            return (
              <div
                key={item.id}
                id={`tree-item-${item.id}`}
                onClick={() => onSelectDrawing(item.id)}
                className={`group flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-200 border-l-2 border-amber-400'
                    : 'hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                {/* Left: Icon & Label */}
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center shrink-0 border"
                    style={{
                      borderColor: item.color || '#3B82F6',
                      backgroundColor: `${item.color || '#3B82F6'}15`,
                    }}
                  >
                    <Icon className="w-3 h-3" style={{ color: item.color || '#3B82F6' }} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium text-slate-200 group-hover:text-white">
                      {item.name}
                    </span>
                    {item.previewText && (
                      <span className="text-[10px] text-slate-500 font-mono truncate">
                        {item.previewText}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions (Visibility, Lock, Settings, Delete) */}
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Visibility Toggle */}
                  <button
                    id={`btn-toggle-vis-${item.id}`}
                    onClick={() => onToggleVisibility(item.id)}
                    title={item.visible ? 'Hide Drawing' : 'Show Drawing'}
                    className={`p-1 rounded transition-colors ${
                      item.visible
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                        : 'text-slate-600 hover:text-slate-400 bg-slate-800/50'
                    }`}
                  >
                    {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400/80" />}
                  </button>

                  {/* Lock Toggle */}
                  <button
                    id={`btn-toggle-lock-${item.id}`}
                    onClick={() => onToggleLock(item.id)}
                    title={item.locked ? 'Unlock Drawing (Currently Locked)' : 'Lock Drawing (Prevent Moving)'}
                    className={`p-1 rounded transition-colors ${
                      item.locked
                        ? 'text-amber-400 bg-amber-500/20'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60'
                    }`}
                  >
                    {item.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  {/* Settings Dialog */}
                  <button
                    id={`btn-settings-${item.id}`}
                    onClick={() => onOpenProperties(item.rawDrawing)}
                    title="Drawing Settings"
                    className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-700/60 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    id={`btn-delete-${item.id}`}
                    onClick={() => onDeleteDrawing(item.id)}
                    title="Delete Drawing"
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
