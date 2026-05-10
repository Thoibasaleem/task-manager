import { useEffect, useState } from 'react';

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

export function LiveTimer({ active, onTick }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return undefined;
    }
    const started = Date.now();
    const id = setInterval(() => {
      const next = (Date.now() - started) / 1000;
      setElapsed(next);
      onTick?.(next);
    }, 100);
    return () => clearInterval(id);
  }, [active, onTick]);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-ethara-muted">Live timer</span>
      <div className="font-display text-4xl font-semibold tabular-nums tracking-tight text-white">
        {formatDuration(elapsed)}
      </div>
    </div>
  );
}

export function formatSeconds(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}
