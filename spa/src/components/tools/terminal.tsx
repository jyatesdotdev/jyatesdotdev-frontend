import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTheme } from '../theme-provider';
import { runCommand, complete } from './terminal-commands';
import { loadUserFiles, saveUserFiles } from './user-files';
import { api, fetcher, type GeoData } from '../../api';

const PROMPT = 'guest@jyates.dev:~$';

interface Line {
  id: number;
  kind: 'cmd' | 'out';
  text: string;
}

const WELCOME: string[] = [
  'jsh 1.0.0 — welcome to jyates.dev',
  "type 'help' to get started · Tab completes",
  '',
];

export function Terminal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const nextId = useRef(WELCOME.length);
  const [lines, setLines] = useState<Line[]>(() =>
    WELCOME.map((text, id) => ({ id, kind: 'out', text }))
  );
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [userFiles, setUserFiles] = useState<Record<string, string>>(loadUserFiles);

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

  function append(kind: Line['kind'], texts: string[]) {
    setLines((prev) => [
      ...prev,
      ...texts.map((text) => ({ id: nextId.current++, kind, text })),
    ]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = input;
    setInput('');
    setHistoryIndex(null);
    append('cmd', [raw]);

    const trimmed = raw.trim();
    const newHistory = trimmed ? [...history, trimmed] : history;
    if (trimmed) setHistory(newHistory);

    const output = runCommand(raw, {
      navigate,
      setTheme,
      theme,
      close: onClose,
      clearScreen: () => setLines([]),
      history: newHistory,
      files: userFiles,
      writeFile,
      deleteFile,
      fetchGeo: () => fetcher(api.geo.get()) as Promise<GeoData>,
      runAsync: (task) => {
        task().then((lines) => {
          if (lines.length > 0) append('out', lines);
        });
      },
    });
    if (output.length > 0) append('out', output);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { line, suggestions } = complete(input, userFiles);
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
            <span className="text-emerald-400">{PROMPT}</span> {line.text}
          </div>
        ) : (
          <div key={line.id} className="whitespace-pre-wrap break-words min-h-[1.25rem]">
            {line.text}
          </div>
        )
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <span className="text-emerald-400 whitespace-pre">{PROMPT}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
