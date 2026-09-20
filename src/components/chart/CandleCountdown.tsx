import {serverNow} from '../../services/serverClock';
import { useInterfaceText } from '../../hooks/useInterfaceText';
import { memo, useEffect, useState, type RefObject } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { candleTimeRemaining } from './candleCountdownTime';

interface Props {
  interval: string;
  chartRef: RefObject<IChartApi | null>;
  seriesRef: RefObject<ISeriesApi<'Candlestick'> | null>;
  candlesRef: RefObject<readonly { time: number; close: number }[]>;
}

export const CandleCountdown = memo(function CandleCountdown({ interval, chartRef, seriesRef, candlesRef }: Props) {
  const ui = useInterfaceText();
  const [display, setDisplay] = useState<{ text: string; top: number; width: number } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      const chart = chartRef.current;
      const series = seriesRef.current;
      const candle = candlesRef.current.at(-1);
      if (!chart || !series || !candle || typeof candle.time !== 'number') {
        setDisplay(null);
        return;
      }
      const text = Number.isFinite(serverNow()) ? candleTimeRemaining(candle.time, interval, serverNow()) : null;
      const top = series.priceToCoordinate(candle.close);
      const height = chart.paneSize().height;
      const labelOffset = chart.options().layout.fontSize / 2 + 6;
      setDisplay(text && top !== null && top >= 0 && top + labelOffset + 16 <= height
        ? { text, top: top + labelOffset, width: chart.priceScale('right').width() }
        : null);
    };
    const tick = () => {
      update();
      timer = setTimeout(tick, Number.isFinite(serverNow()) ? 1000 - serverNow() % 1000 : 1000);
    };
    tick();
    document.addEventListener('visibilitychange', update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [interval, chartRef, seriesRef, candlesRef]);

  if (!display) return null;
  return <div role="timer" aria-label={ui("Candle close countdown")}
    className="pointer-events-none absolute z-10 rounded bg-[#0A0F1D]/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 tabular-nums whitespace-nowrap"
    style={{ top: display.top, right: 0, width: display.width, textAlign: 'center' }}>
    {display.text}
  </div>;
});
