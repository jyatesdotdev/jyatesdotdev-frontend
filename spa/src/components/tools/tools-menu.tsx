import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { ToolWindow } from './tool-window';
import { Terminal } from './terminal';

// The visitor map bundles world-atlas TopoJSON + d3-geo (~150KB); keep it out
// of the main chunk and only fetch it when the tool is first opened.
const VisitorMap = lazy(() => import('./visitor-map'));

interface Tool {
  id: string;
  name: string;
  windowTitle: string;
  render: (close: () => void) => React.ReactNode;
}

function ToolFallback({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center bg-neutral-950 text-neutral-500 font-mono text-xs">
      {label}
    </div>
  );
}

/** Registry of tools shown in the dropdown. Add new tools here. */
const TOOLS: Tool[] = [
  {
    id: 'terminal',
    name: 'terminal',
    windowTitle: 'guest@jyates.dev — jsh',
    render: (close) => <Terminal onClose={close} />,
  },
  {
    id: 'visitor-map',
    name: 'visitor map',
    windowTitle: 'visitors around the world',
    render: () => (
      <Suspense fallback={<ToolFallback label="loading map…" />}>
        <VisitorMap />
      </Suspense>
    ),
  },
];

/**
 * "tools" nav dropdown. The menu renders in a portal with fixed positioning
 * because the nav container scrolls (overflow-auto would clip it). Open tool
 * windows live here so they survive route changes.
 */
export function ToolsMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [openTool, setOpenTool] = useState<Tool | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  function toggleMenu() {
    if (!menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setMenuOpen((open) => !open);
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className={`transition-all hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1 relative py-1 px-2 ${
          openTool ? 'text-neutral-900 dark:text-neutral-100 font-medium' : 'text-neutral-500'
        }`}
      >
        tools
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3 w-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {menuOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-50 min-w-40 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-1"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                role="menuitem"
                onClick={() => {
                  // Keep terminal mounting inside the tap gesture so mobile
                  // browsers allow its auto-focused input to open the keyboard.
                  flushSync(() => {
                    setOpenTool(tool);
                    setMenuOpen(false);
                  });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                <span className="font-mono text-xs text-neutral-400">&gt;_</span>
                {tool.name}
              </button>
            ))}
          </div>,
          document.body
        )}

      {openTool && (
        <ToolWindow title={openTool.windowTitle} onClose={() => setOpenTool(null)}>
          {openTool.render(() => setOpenTool(null))}
        </ToolWindow>
      )}
    </>
  );
}
