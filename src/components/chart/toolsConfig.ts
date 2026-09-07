import { DrawingToolItem } from './types';

export const DRAWING_TOOLS: DrawingToolItem[] = [
  // Lines & Rays
  { id: 'trend-line', name: 'Trend Line', category: 'line', requiredAnchors: 2, description: 'Line connecting two price points' },
  { id: 'ray', name: 'Ray', category: 'line', requiredAnchors: 2, description: 'Ray line extending forward infinitely' },
  { id: 'horizontal-line', name: 'Horizontal Line', category: 'line', requiredAnchors: 1, description: 'Infinite horizontal price level' },
  { id: 'vertical-line', name: 'Vertical Line', category: 'line', requiredAnchors: 1, description: 'Infinite vertical time marker' },
  { id: 'extended-line', name: 'Extended Line', category: 'line', requiredAnchors: 2, description: 'Line extending both directions infinitely' },
  { id: 'arrow', name: 'Arrow', category: 'line', requiredAnchors: 2, description: 'Directional arrow pointing to price target' },
  { id: 'horizontal-ray', name: 'Horizontal Ray', category: 'line', requiredAnchors: 1, description: 'Horizontal ray from point to right' },

  // Channels & Pitchforks
  { id: 'parallel-channel', name: 'Parallel Channel', category: 'channel', requiredAnchors: 3, description: 'Equidistant channel between support & resistance' },
  { id: 'andrews-pitchfork', name: 'Pitchfork', category: 'pitchfork', requiredAnchors: 3, description: 'Median-line analysis channel based on 3 swing pivots' },
  { id: 'schiff-pitchfork', name: 'Schiff Pitchfork', category: 'pitchfork', requiredAnchors: 3, description: 'Modified pitchfork for shallow sloping trends' },
  { id: 'flat-top-bottom', name: 'Flat Top/Bottom', category: 'channel', requiredAnchors: 3, description: 'Horizontal level with trending counterpart' },

  // Fibonacci
  { id: 'fib-retracement', name: 'Fibonacci Retracement', category: 'fibonacci', requiredAnchors: 2, description: 'Key golden ratio retracement levels (0.382, 0.5, 0.618)' },
  { id: 'fib-extension', name: 'Fibonacci Extension', category: 'fibonacci', requiredAnchors: 3, description: 'Trend-based Fibonacci extension projections' },
  { id: 'projection', name: 'Fibonacci Projection', category: 'fibonacci', requiredAnchors: 3, description: 'Trend-based Fibonacci projection targets' },
  { id: 'fib-channel', name: 'Fibonacci Channel', category: 'fibonacci', requiredAnchors: 3, description: 'Diagonal Fibonacci parallel levels' },
  { id: 'fib-speed-fan', name: 'Fib Speed Resistance Fan', category: 'fibonacci', requiredAnchors: 2, description: 'Fibonacci fan lines for time-price analysis' },

  // Gann
  { id: 'gann-box', name: 'Gann Box', category: 'gann', requiredAnchors: 2, description: 'W.D. Gann time and price square matrix' },
  { id: 'gann-fan', name: 'Gann Fan', category: 'gann', requiredAnchors: 2, description: 'Geometric 1x1, 2x1, 1x2 diagonal angle rays' },
  { id: 'gann-angle', name: 'Gann Angles', category: 'gann', requiredAnchors: 2, description: 'Bidirectional geometric Gann angle with degree measurement' },
  { id: 'gann-square', name: 'Gann Square', category: 'gann', requiredAnchors: 2, description: 'Fixed price and time square divisions' },

  // Shapes
  { id: 'rectangle', name: 'Rectangle', category: 'shape', requiredAnchors: 2, description: 'Box zone for supply, demand, or consolidation' },
  { id: 'circle', name: 'Circle', category: 'shape', requiredAnchors: 2, description: 'Circular price cycle highlight' },
  { id: 'ellipse', name: 'Ellipse', category: 'shape', requiredAnchors: 2, description: 'Elliptical price cycle zone' },
  { id: 'triangle', name: 'Triangle', category: 'shape', requiredAnchors: 3, description: 'Three-point converging or diverging wedge pattern' },

  // Annotations & Freehand
  { id: 'text-annotation', name: 'Text', category: 'annotation', requiredAnchors: 1, description: 'Custom chart text note at price point' },
  { id: 'brush', name: 'Brush / Freehand', category: 'annotation', requiredAnchors: 2, description: 'Freehand mark on chart canvas' },
  { id: 'callout', name: 'Callout', category: 'annotation', requiredAnchors: 2, description: 'Speech callout pointing to price bar' },

  // Forecasting & Measurement
  { id: 'date-price-range', name: 'Measure / Ruler', category: 'measurement', requiredAnchors: 2, description: 'Measure time bars, percentage change, and price delta' },
  { id: 'long-position', name: 'Long Position', category: 'forecast', requiredAnchors: 3, description: 'Risk/Reward ratio calculator for long setups' },
  { id: 'short-position', name: 'Short Position', category: 'forecast', requiredAnchors: 3, description: 'Risk/Reward ratio calculator for short setups' },
  { id: 'price-range', name: 'Price Range', category: 'measurement', requiredAnchors: 2, description: 'Price vertical distance and pip change' },
  { id: 'date-range', name: 'Date Range', category: 'measurement', requiredAnchors: 2, description: 'Time bar count and duration measurement' },
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
