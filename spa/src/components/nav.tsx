import { NavLink } from 'react-router-dom';
import { useTheme } from './theme-provider';

interface NavItem {
  name: string;
  external?: boolean;
}

const navItems: Record<string, NavItem> = {
  '/': {
    name: 'home',
  },
  '/blog': {
    name: 'blog',
  },
  '/career': {
    name: 'career',
  },
  '/projects': {
    name: 'projects',
  },
  '/library': {
    name: 'library',
  },
  '/contact': {
    name: 'contact',
  },
};

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <aside className="mb-16 tracking-tight">
      <div className="lg:sticky lg:top-20">
        <nav
          className="flex flex-row items-center relative px-0 pb-0 fade md:overflow-auto scroll-pr-6 md:relative justify-between"
          id="nav"
        >
          <div className="flex flex-row flex-wrap gap-2">
            {Object.entries(navItems).map(([path, { name }]) => {
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) => 
                    `transition-all hover:text-neutral-800 dark:hover:text-neutral-200 flex align-middle relative py-1 px-2 ${
                      isActive ? 'text-neutral-900 dark:text-neutral-100 font-medium' : 'text-neutral-500'
                    }`
                  }
                >
                  {name}
                </NavLink>
              );
            })}
          </div>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </nav>
      </div>
    </aside>
  );
}
