import { Time } from 'lightweight-charts';

export interface ChartAnchor {
  time: Time;
  price: number;
}

export interface ChartDrawingStyle {
  lineColor: string;
  lineWidth: number;
  lineDash?: number[];
  fillColor?: string;
  fillOpacity?: number;
  showLabels?: boolean;
}

export interface SerializedDrawingPayload {
  id: string;
  type: string;
  anchors: Array<{ time: number | string; price: number }>;
  style?: ChartDrawingStyle;
  options?: {
    visible?: boolean;
    locked?: boolean;
    zIndex?: number;
    extendLeft?: boolean;
    extendRight?: boolean;
    [key: string]: any;
  };
}

export interface DrawingToolItem {
  id: string;
  name: string;
  category: 'line' | 'channel' | 'fibonacci' | 'gann' | 'pitchfork' | 'shape' | 'annotation';
  requiredAnchors: number;
  description: string;
}
