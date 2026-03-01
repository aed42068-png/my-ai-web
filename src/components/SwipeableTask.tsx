import React, { useState, useRef } from 'react';

export function SwipeableTask({ task, onEdit, onDelete, onClick, children }: any) {
  const [x, setX] = useState(0);
  const startPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    startPos.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      isDragging.current = true;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (x === 0) {
      onClick && onClick(task);
    } else {
      setX(0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const diffX = e.touches[0].clientX - startPos.current.x;
    const diffY = e.touches[0].clientY - startPos.current.y;
    if (Math.abs(diffX) > Math.abs(diffY)) {
      let newX = x + diffX;
      if (newX > 0) newX = 0;
      if (newX < -140) newX = -140;
      setX(newX);
    }
  };
  const handleTouchEnd = () => {
    if (x < -70) setX(-140);
    else setX(0);
  };

  return (
    <div className="relative w-full overflow-hidden bg-pink-50 border-b border-gray-100 list-group-separator rounded-2xl">
      <div className="absolute right-0 top-0 bottom-0 flex">
        <button onClick={(e) => { e.stopPropagation(); onEdit(task); setX(0); }} className="bg-pink-100 text-pink-600 w-[70px] flex items-center justify-center text-sm font-medium">修改</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(task); setX(0); }} className="bg-pink-500 text-white w-[70px] flex items-center justify-center text-sm font-medium">删除</button>
      </div>
      <div
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative z-10 bg-white transition-transform w-full h-full flex items-center"
        style={{ transform: `translateX(${x}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
