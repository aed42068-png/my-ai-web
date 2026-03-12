import { useRef, type PointerEvent as ReactPointerEvent } from 'react';

interface ImagePositionerProps {
  image: string;
  offsetY: number;
  onChange: (offsetY: number) => void;
  hint?: string;
}

export default function ImagePositioner({
  image,
  offsetY,
  onChange,
  hint = '上下拖动调整封面位置',
}: ImagePositionerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startOffsetY = useRef(0);
  const activePointerId = useRef<number | null>(null);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    startY.current = event.clientY;
    startOffsetY.current = offsetY;
    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId || !containerRef.current) {
      return;
    }

    const deltaY = event.clientY - startY.current;
    const height = containerRef.current.clientHeight || 1;
    const nextOffset = Math.max(0, Math.min(100, startOffsetY.current - (deltaY / height) * 100));
    onChange(nextOffset);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current === event.pointerId) {
      activePointerId.current = null;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current === event.pointerId) {
      activePointerId.current = null;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="relative aspect-video w-full cursor-ns-resize overflow-hidden rounded-xl shadow-sm touch-none"
      >
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{ backgroundImage: `url('${image}')`, backgroundPosition: `center ${offsetY}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-xs font-medium text-white">
          {hint}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span>封面位置</span>
          <span>{Math.round(offsetY)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={offsetY}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-primary"
        />
        <div className="mt-2 text-[11px] text-slate-400">如果拖动不顺手，可以直接滑动这个位置条。</div>
      </div>
    </div>
  );
}
