import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTheme } from '../theme-provider';
import { runCommand, complete } from './terminal-commands';
import { INITIAL_ONCALL_SESSION } from './terminal-lab';
import {
  loadCommandHistory,
  loadUserFiles,
  saveCommandHistory,
  saveUserFiles,
} from './user-files';
import { api, fetcher, type GeoData, type VisitStats } from '../../api';

const BUILD_SHA = import.meta.env.VITE_BUILD_SHA || 'development';

function promptFor(cwd: string) {
  return `guest@jyates.dev:~${cwd ? `/${cwd}` : ''}$`;
}

interface Line {
  id: number;
  kind: 'cmd' | 'out';
  text: string;
  prompt?: string;
}

const WELCOME: string[] = [
  'jsh 2.0.0 — welcome to jyates.dev',
  "type 'help' to get started · Tab completes",
  '',
];

export function Terminal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const nextId = useRef(WELCOME.length);
  const [lines, setLines] = useState<Line[]>(() =>
    WELCOME.map((text, id) => ({ id, kind: 'out', text }))
  );
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>(loadCommandHistory);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const reverseSearch = useRef('');
  const [userFiles, setUserFiles] = useState<Record<string, string>>(loadUserFiles);
  const [cwd, setCwd] = useState('');
  const [onCallSession, setOnCallSession] = useState(INITIAL_ONCALL_SESSION);

  function writeFile(name: string, content: string) {
    setUserFiles((prev) => {
      const next = { ...prev, [name]: content };
      saveUserFiles(next);
      return next;
    });
  }

  function deleteFile(name: string) {
    setUserFiles((prev) => {
      const next = { ...prev };
      delete next[name];
      saveUserFiles(next);
      return next;
    });
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  function append(kind: Line['kind'], texts: string[], prompt?: string) {
    setLines((prev) => [
      ...prev,
      ...texts.map((text) => ({ id: nextId.current++, kind, text, prompt })),
    ]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = input;
    setInput('');
    setHistoryIndex(null);
    append('cmd', [raw], promptFor(cwd));

    let command = raw;
    if (raw.trim() === '!!') {
      const previous = history.at(-1);
      if (!previous) {
        append('out', ['jsh: !!: event not found']);
        return;
      }
      command = previous;
      append('out', [previous]);
    }

    const trimmed = command.trim();
    const newHistory = trimmed ? [...history, trimmed] : history;
    if (trimmed) {
      setHistory(newHistory);
      saveCommandHistory(newHistory);
    }

    const output = runCommand(command, {
      navigate,
      setTheme,
      theme,
      close: onClose,
      clearScreen: () => setLines([]),
      clearHistory: () => {
        setHistory([]);
        setHistoryIndex(null);
        saveCommandHistory([]);
      },
      history: newHistory,
      cwd,
      changeDirectory: setCwd,
      onCallSession,
      updateOnCall: setOnCallSession,
      files: userFiles,
      writeFile,
      deleteFile,
      fetchGeo: () => fetcher(api.geo.get()) as Promise<GeoData>,
      fetchStatus: async () => {
        const startedAt = performance.now();
        const [geo, visits] = await Promise.allSettled([
          fetcher<GeoData>(api.geo.get()),
          fetcher<VisitStats>(api.visits.get()),
        ]);
        const errors: string[] = [];
        if (geo.status === 'rejected') errors.push('geo unavailable');
        if (visits.status === 'rejected') errors.push('visit stats unavailable');
        return {
          checkedAt: new Date().toISOString(),
          route: location.pathname,
          build: BUILD_SHA === 'development' ? BUILD_SHA : BUILD_SHA.slice(0, 12),
          api: errors.length === 0 ? 'operational' : errors.length === 1 ? 'degraded' : 'unavailable',
          latencyMs: Math.round(performance.now() - startedAt),
          geo: geo.status === 'fulfilled' ? geo.value : undefined,
          visits: visits.status === 'fulfilled' ? visits.value : undefined,
          errors: errors.length ? errors : undefined,
        };
      },
      runAsync: (task) => {
        task().then((lines) => {
          if (lines.length > 0) append('out', lines);
        });
      },
    });
    if (output.length > 0) append('out', output);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      setLines([]);
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      append('cmd', [`${input}^C`], promptFor(cwd));
      setInput('');
      setHistoryIndex(null);
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      if (history.length === 0) return;
      if (historyIndex === null) reverseSearch.current = input;
      const start = historyIndex === null ? history.length - 1 : historyIndex - 1;
      for (let index = start; index >= 0; index--) {
        if (history[index].includes(reverseSearch.current)) {
          setHistoryIndex(index);
          setInput(history[index]);
          break;
        }
      }
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'd' && input === '') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const { line, suggestions } = complete(input, userFiles, cwd);
      setInput(line);
      // Bash-style: list options above the prompt when the match is ambiguous
      if (suggestions.length > 1) append('out', [suggestions.join('   ')]);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const idx = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(idx);
      setInput(history[idx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === null) return;
      const idx = historyIndex + 1;
      if (idx >= history.length) {
        setHistoryIndex(null);
        setInput('');
      } else {
        setHistoryIndex(idx);
        setInput(history[idx]);
      }
    }
  }

  return (
    <div
      ref={scrollRef}
      data-testid="terminal"
      className="h-full overflow-y-auto bg-neutral-950 text-neutral-200 font-mono text-[13px] leading-relaxed p-3 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {lines.map((line) =>
        line.kind === 'cmd' ? (
          <div key={line.id} className="whitespace-pre-wrap break-words">
            <span className="text-emerald-400">{line.prompt}</span> {line.text}
          </div>
        ) : (
          <div key={line.id} className="whitespace-pre-wrap break-words min-h-[1.25rem]">
            {line.text}
          </div>
        )
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <span className="text-emerald-400 whitespace-pre">{promptFor(cwd)}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setHistoryIndex(null);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-transparent outline-none text-neutral-200 caret-emerald-400"
          aria-label="Terminal input"
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}
