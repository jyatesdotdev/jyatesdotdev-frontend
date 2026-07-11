import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ToolWindow } from '../tools/tool-window';
import { UnderConstruction } from './under-construction';

const SECTIONS = [
  { id: 'games', label: 'games' },
  { id: 'lab', label: 'lab' },
  { id: 'research', label: 'research' },
] as const;

type Section = (typeof SECTIONS)[number];
type SectionId = Section['id'];

interface OpenSection {
  instanceId: number;
  section: Section;
}

const MENU_WIDTH = 184;

/**
 * Placeholder nav menus for sections that will grow into their own registries.
 * A single controller keeps their dropdowns and floating window mutually exclusive.
 */
export function ConstructionMenus() {
  const [openMenu, setOpenMenu] = useState<SectionId | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [openSections, setOpenSections] = useState<OpenSection[]>([]);
  const nextInstanceId = useRef(0);
  const buttonRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const clickedButton = Object.values(buttonRefs.current).some((button) =>
        button?.contains(target)
      );
      if (clickedButton || menuRef.current?.contains(target)) return;
      setOpenMenu(null);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenMenu(null);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu]);

  function toggleMenu(section: Section) {
    if (openMenu === section.id) {
      setOpenMenu(null);
      return;
    }

    const button = buttonRefs.current[section.id];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8)),
      });
    }
    setOpenMenu(section.id);
  }

  function closeSection(instanceId: number) {
    setOpenSections((open) => open.filter((instance) => instance.instanceId !== instanceId));
  }

  const menuSection = SECTIONS.find((section) => section.id === openMenu);

  return (
    <>
      {SECTIONS.map((section) => (
        <button
          key={section.id}
          ref={(node) => {
            buttonRefs.current[section.id] = node;
          }}
          onClick={() => toggleMenu(section)}
          aria-expanded={openMenu === section.id}
          aria-haspopup="menu"
          className={`transition-all hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1 relative py-1 px-2 ${
            openSections.some((instance) => instance.section.id === section.id) ||
            openMenu === section.id
              ? 'text-neutral-900 dark:text-neutral-100 font-medium'
              : 'text-neutral-500'
          }`}
        >
          {section.label}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3 w-3 transition-transform ${openMenu === section.id ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ))}

      {menuSection &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`${menuSection.label} menu`}
            className="fixed z-[10000] w-46 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-1"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              role="menuitem"
              onClick={() => {
                setOpenSections((open) => [
                  ...open,
                  { instanceId: ++nextInstanceId.current, section: menuSection },
                ]);
                setOpenMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              <span
                aria-hidden="true"
                className="flex h-4 w-4 shrink-0 items-center justify-center border border-yellow-700 bg-yellow-300 font-mono text-[11px] font-bold leading-none text-black"
              >
                !
              </span>
              under construction
            </button>
          </div>,
          document.body
        )}

      {openSections.map(({ instanceId, section }) => (
        <ToolWindow
          key={instanceId}
          title={`${section.label} / under construction`}
          onClose={() => closeSection(instanceId)}
          size="large"
        >
          <UnderConstruction section={section.label} />
        </ToolWindow>
      ))}
    </>
  );
}
