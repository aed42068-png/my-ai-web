import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  useRef,
  useState,
} from 'react';

interface SwipeableTaskProps<T> {
  task: T;
  onEdit: (task: T) => void;
  onDelete: (task: T) => void;
  onClick?: (task: T) => void;
  children: ReactNode;
}

export function SwipeableTask<T>({
  task,
  onEdit,
  onDelete,
  onClick,
  children,
}: SwipeableTaskProps<T>) {
  const [offsetX, setOffsetX] = useState(0);
  const startPos = useRef({ x: 0, y: 0, offset: 0 });
  const isDragging = useRef(false);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    startPos.current = { x: event.clientX, y: event.clientY, offset: offsetX };
    isDragging.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dx = event.clientX - startPos.current.x;
    const dy = event.clientY - startPos.current.y;
    if (Math.abs(dx) <= Math.abs(dy)) {
      return;
    }

    isDragging.current = Math.abs(dx) > 10;
    setOffsetX(clampOffset(startPos.current.offset + dx));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dx = event.clientX - startPos.current.x;
    const dy = event.clientY - startPos.current.y;
    isDragging.current = Math.sqrt(dx * dx + dy * dy) > 10;
    setOffsetX(getSettledOffset(offsetX));
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    setOffsetX(getSettledOffset(offsetX));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (offsetX === 0) {
      onClick?.(task);
    } else {
      setOffsetX(0);
    }
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    startPos.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      offset: offsetX,
    };
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    const diffX = event.touches[0].clientX - startPos.current.x;
    const diffY = event.touches[0].clientY - startPos.current.y;
    if (Math.abs(diffX) <= Math.abs(diffY)) {
      return;
    }

    isDragging.current = Math.abs(diffX) > 10;
    setOffsetX(clampOffset(startPos.current.offset + diffX));
  };

  const handleTouchEnd = () => {
    setOffsetX(getSettledOffset(offsetX));
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border-b border-gray-100 bg-pink-50 list-group-separator">
      <div className="absolute bottom-0 right-0 top-0 flex">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onEdit(task);
            setOffsetX(0);
          }}
          className="flex w-[70px] items-center justify-center bg-pink-100 text-sm font-medium text-pink-600"
        >
          修改
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete(task);
            setOffsetX(0);
          }}
          className="flex w-[70px] items-center justify-center bg-pink-500 text-sm font-medium text-white"
        >
          删除
        </button>
      </div>
      <div
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative z-10 flex h-full w-full items-center bg-white transition-transform [touch-action:pan-y]"
        style={{ transform: `translateX(${offsetX}px)` }}
      >
        {children}
      </div>
    </div>
  );
}

function clampOffset(value: number): number {
  if (value > 0) {
    return 0;
  }

  if (value < -140) {
    return -140;
  }

  return value;
}

function getSettledOffset(value: number): number {
  return value < -70 ? -140 : 0;
}
