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

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    startY.current = event.clientY;
    startOffsetY.current = offsetY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1 || !containerRef.current) {
      return;
    }

    const deltaY = event.clientY - startY.current;
    const height = containerRef.current.clientHeight || 1;
    const nextOffset = Math.max(0, Math.min(100, startOffsetY.current - (deltaY / height) * 100));
    onChange(nextOffset);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      className="relative mt-3 aspect-video w-full cursor-ns-resize overflow-hidden rounded-xl shadow-sm touch-none"
    >
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{ backgroundImage: `url('${image}')`, backgroundPosition: `center ${offsetY}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-xs font-medium text-white">
        {hint}
      </div>
    </div>
  );
}
