import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToolWindowProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'default' | 'large';
}

interface DragState {
  pointerId: number;
  offsetX: number;
  offsetY: number;
}

interface WindowRegistration {
  id: string;
  zIndex: number;
  offset: number;
}

const WINDOW_SIZES = {
  default: {
    width: 640,
    windowClass: 'w-[min(40rem,calc(100vw-2rem))]',
    contentClass: 'h-80 md:h-96',
  },
  large: {
    width: 720,
    windowClass: 'w-[min(45rem,calc(100vw-2rem))]',
    contentClass: 'h-[22rem] md:h-[27rem]',
  },
} as const;

const WINDOW_Z_INDEX_BASE = 100;
const WINDOW_CASCADE_OFFSET = 32;
let highestWindowZIndex = WINDOW_Z_INDEX_BASE;
const activeWindows = new Map<string, WindowRegistration>();

function registerWindow(id: string): WindowRegistration {
  const existing = activeWindows.get(id);
  if (existing) return existing;

  const highestOffset = Math.max(
    -WINDOW_CASCADE_OFFSET,
    ...Array.from(activeWindows.values(), (window) => window.offset)
  );
  const registration = {
    id,
    zIndex: ++highestWindowZIndex,
    offset: highestOffset + WINDOW_CASCADE_OFFSET,
  };
  activeWindows.set(registration.id, registration);
  return registration;
}

function focusWindow(id: string) {
  const registration = activeWindows.get(id);
  if (!registration) return highestWindowZIndex;
  registration.zIndex = ++highestWindowZIndex;
  return registration.zIndex;
}

function unregisterWindow(id: string) {
  activeWindows.delete(id);
}

function isFrontmostWindow(id: string) {
  const current = activeWindows.get(id);
  if (!current) return false;
  return Array.from(activeWindows.values()).every(
    (registration) => registration.zIndex <= current.zIndex
  );
}

function positionForOffset(width: number, offset: number) {
  const renderedWidth = Math.min(width, window.innerWidth - 32);
  const centeredX = (window.innerWidth - renderedWidth) / 2;
  const maxX = Math.max(16, window.innerWidth - renderedWidth - 16);
  return {
    x: Math.min(maxX, centeredX + offset),
    y: Math.min(Math.max(72, window.innerHeight * 0.15) + offset, window.innerHeight - 80),
  };
}

/**
 * A draggable, OS-style floating window rendered in a portal. The title bar
 * drags (pointer events, so touch works too); traffic lights close, shade
 * (collapse to title bar) and maximize.
 */
export function ToolWindow({ title, onClose, children, size = 'default' }: ToolWindowProps) {
  const windowSize = WINDOW_SIZES[size];
  const windowId = useId();
  const [registration] = useState(() => registerWindow(windowId));
  const [zIndex, setZIndex] = useState(registration.zIndex);
  const [pos, setPos] = useState(() =>
    positionForOffset(windowSize.width, registration.offset)
  );
  const [maximized, setMaximized] = useState(false);
  const [shaded, setShaded] = useState(false);
  const dragState = useRef<DragState | null>(null);

  function bringToFront() {
    setZIndex(focusWindow(windowId));
  }

  // Maximizing always unshades; restoring keeps whatever was behind it simple
  function toggleMaximize() {
    setShaded(false);
    setMaximized((m) => !m);
  }

  useEffect(() => {
    activeWindows.set(windowId, registration);
    return () => unregisterWindow(windowId);
  }, [registration, windowId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isFrontmostWindow(windowId)) {
        e.stopImmediatePropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, windowId]);

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
      x: Math.min(
        Math.max(e.clientX - drag.offsetX, 80 - windowSize.width),
        window.innerWidth - 80
      ),
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
      className={`fixed flex flex-col rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-900 shadow-2xl overflow-hidden ${windowSize.windowClass}`}
      style={{
        ...(maximized
          ? shaded
            ? { top: 8, left: 8, right: 8, width: 'auto' }
            : { inset: 8, width: 'auto' }
          : { left: pos.x, top: pos.y }),
        zIndex,
      }}
      onPointerDownCapture={bringToFront}
      onFocusCapture={bringToFront}
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
        className={`${maximized ? 'flex-1 min-h-0' : windowSize.contentClass} ${shaded ? 'hidden' : ''}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
