import { DrawingToolItem } from './types';

export const DRAWING_TOOLS: DrawingToolItem[] = [
  // Lines
  { id: 'trend-line', name: 'Trend Line', category: 'line', requiredAnchors: 2, description: 'Line connecting two price points' },
  { id: 'horizontal-line', name: 'Horizontal Line', category: 'line', requiredAnchors: 1, description: 'Infinite horizontal price level' },
  { id: 'ray', name: 'Ray', category: 'line', requiredAnchors: 2, description: 'Ray line extending forward infinitely' },
  { id: 'extended-line', name: 'Extended Line', category: 'line', requiredAnchors: 2, description: 'Line extending both directions infinitely' },
  { id: 'horizontal-ray', name: 'Horizontal Ray', category: 'line', requiredAnchors: 1, description: 'Horizontal ray from point to right' },
  { id: 'arrow', name: 'Arrow Line', category: 'line', requiredAnchors: 2, description: 'Directional arrow pointing to price target' },

  // Channels
  { id: 'parallel-channel', name: 'Parallel Channel', category: 'channel', requiredAnchors: 3, description: 'Equidistant channel between support & resistance' },
  { id: 'flat-top-bottom', name: 'Flat Top/Bottom Channel', category: 'channel', requiredAnchors: 3, description: 'Horizontal level with trending counterpart' },

  // Fibonacci
  { id: 'fib-retracement', name: 'Fibonacci Retracement', category: 'fibonacci', requiredAnchors: 2, description: 'Key golden ratio retracement levels (0.382, 0.5, 0.618)' },
  { id: 'fib-extension', name: 'Fibonacci Extension', category: 'fibonacci', requiredAnchors: 3, description: 'Trend-based Fibonacci extension projections' },
  { id: 'fib-channel', name: 'Fibonacci Channel', category: 'fibonacci', requiredAnchors: 3, description: 'Diagonal Fibonacci parallel levels' },
  { id: 'fib-speed-fan', name: 'Fib Speed Resistance Fan', category: 'fibonacci', requiredAnchors: 2, description: 'Fibonacci fan lines for time-price analysis' },

  // Gann
  { id: 'gann-box', name: 'Gann Box', category: 'gann', requiredAnchors: 2, description: 'W.D. Gann time and price square matrix' },
  { id: 'gann-fan', name: 'Gann Fan', category: 'gann', requiredAnchors: 2, description: 'Geometric 1x1, 2x1, 1x2 diagonal angle rays' },
  { id: 'gann-square', name: 'Gann Square', category: 'gann', requiredAnchors: 2, description: 'Fixed price and time square divisions' },

  // Pitchforks
  { id: 'andrews-pitchfork', name: "Andrews' Pitchfork", category: 'pitchfork', requiredAnchors: 3, description: 'Median-line analysis channel based on 3 swing pivots' },
  { id: 'schiff-pitchfork', name: 'Schiff Pitchfork', category: 'pitchfork', requiredAnchors: 3, description: 'Modified pitchfork for shallow sloping trends' },

  // Shapes
  { id: 'rectangle', name: 'Rectangle', category: 'shape', requiredAnchors: 2, description: 'Box zone for supply, demand, or consolidation' },
  { id: 'circle', name: 'Circle', category: 'shape', requiredAnchors: 2, description: 'Circular price cycle highlight' },
  { id: 'triangle', name: 'Triangle', category: 'shape', requiredAnchors: 3, description: 'Three-point converging or diverging wedge pattern' },

  // Annotations
  { id: 'text-annotation', name: 'Text Note', category: 'annotation', requiredAnchors: 1, description: 'Custom chart text note at price point' },
  { id: 'callout', name: 'Callout', category: 'annotation', requiredAnchors: 2, description: 'Speech callout pointing to price bar' },
  { id: 'brush', name: 'Brush', category: 'annotation', requiredAnchors: 2, description: 'Freehand mark on chart canvas' },
];

export const COLOR_PALETTE = [
  { name: 'Sky Blue', hex: '#38bdf8' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Rose Red', hex: '#f43f5e' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'White', hex: '#f8fafc' },
];

export const LINE_WIDTHS = [1, 2, 3, 4];
