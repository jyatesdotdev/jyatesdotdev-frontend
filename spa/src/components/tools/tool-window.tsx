import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToolWindowProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

interface DragState {
  pointerId: number;
  offsetX: number;
  offsetY: number;
}

const WINDOW_WIDTH = 640;

/**
 * A draggable, OS-style floating window rendered in a portal. The title bar
 * drags (pointer events, so touch works too); traffic lights close, shade
 * (collapse to title bar) and maximize.
 */
export function ToolWindow({ title, onClose, children }: ToolWindowProps) {
  const [pos, setPos] = useState(() => ({
    x: Math.max(16, (window.innerWidth - WINDOW_WIDTH) / 2),
    y: Math.max(72, window.innerHeight * 0.15),
  }));
  const [maximized, setMaximized] = useState(false);
  const [shaded, setShaded] = useState(false);
  const dragState = useRef<DragState | null>(null);

  // Maximizing always unshades; restoring keeps whatever was behind it simple
  function toggleMaximize() {
    setShaded(false);
    setMaximized((m) => !m);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Buttons in the title bar shouldn't start a drag
    if (maximized || (e.target as HTMLElement).closest('button')) return;
    dragState.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setPos({
      x: Math.min(Math.max(e.clientX - drag.offsetX, 80 - WINDOW_WIDTH), window.innerWidth - 80),
      y: Math.min(Math.max(e.clientY - drag.offsetY, 0), window.innerHeight - 40),
    });
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (dragState.current?.pointerId === e.pointerId) dragState.current = null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-label={title}
      className="fixed z-50 flex flex-col rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-900 shadow-2xl overflow-hidden w-[min(40rem,calc(100vw-2rem))]"
      style={
        maximized
          ? shaded
            ? { top: 8, left: 8, right: 8, width: 'auto' }
            : { inset: 8, width: 'auto' }
          : { left: pos.x, top: pos.y }
      }
    >
      <div
        className={`flex items-center gap-2 px-3 py-2 bg-neutral-800 border-b border-neutral-700 select-none touch-none ${
          maximized ? '' : 'cursor-grab active:cursor-grabbing'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onDoubleClick={(e) => {
          // Double-clicks on the traffic lights bubble here; don't also maximize
          if ((e.target as HTMLElement).closest('button')) return;
          toggleMaximize();
        }}
      >
        <div className="flex gap-1.5 group">
          <button
            onClick={onClose}
            aria-label="Close window"
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 text-red-900 text-[8px] leading-none flex items-center justify-center"
          >
            <span className="opacity-0 group-hover:opacity-100">✕</span>
          </button>
          <button
            onClick={() => setShaded((s) => !s)}
            aria-label="Shade window"
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 text-yellow-900 text-[8px] leading-none flex items-center justify-center"
          >
            <span className="opacity-0 group-hover:opacity-100">−</span>
          </button>
          <button
            onClick={toggleMaximize}
            aria-label="Maximize window"
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 text-green-900 text-[8px] leading-none flex items-center justify-center"
          >
            <span className="opacity-0 group-hover:opacity-100">+</span>
          </button>
        </div>
        <span className="flex-1 text-center text-xs font-medium text-neutral-400 truncate pr-12">
          {title}
        </span>
      </div>
      {/* Hide (don't unmount) when shaded so tool state survives */}
      <div
        className={`${maximized ? 'flex-1 min-h-0' : 'h-80 md:h-96'} ${shaded ? 'hidden' : ''}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
