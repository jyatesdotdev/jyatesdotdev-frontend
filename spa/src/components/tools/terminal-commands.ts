import { projects } from '../../data/projects';
import { getPosts } from '../../blog/posts';
import type { GeoData } from '../../api';
import { flagEmoji, ALPHA2_TO_NAME } from './iso-countries';

/**
 * Side effects the terminal can trigger. Kept behind an interface so the
 * command engine stays pure and unit-testable without rendering anything.
 */
export interface TerminalContext {
  navigate: (path: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  theme: string;
  close: () => void;
  clearScreen: () => void;
  history: string[];
  /** User-created files (persisted to localStorage by the Terminal component) */
  files: Record<string, string>;
  writeFile: (name: string, content: string) => void;
  deleteFile: (name: string) => void;
  /** Fetches the caller's edge-resolved location (GET /api/v1/geo) */
  fetchGeo: () => Promise<GeoData>;
  /** Schedules async output; resolved lines are appended when ready */
  runAsync: (task: () => Promise<string[]>) => void;
}

/** Formats a geo lookup into terminal lines. Pure, so it's unit-tested directly. */
export function formatGeo(geo: GeoData): string[] {
  if (!geo.country) {
    return ['whereami: location unavailable (running locally, or behind a proxy?)'];
  }
  const countryName = geo.countryName || ALPHA2_TO_NAME[geo.country] || geo.country;
  const place = [geo.city, countryName].filter(Boolean).join(', ');
  const lines = [`You appear to be visiting from ${place} ${flagEmoji(geo.country)}`.trim()];
  if (geo.timeZone) lines.push(`  time zone: ${geo.timeZone}`);
  if (geo.latitude && geo.longitude) {
    lines.push(`  approx:    ${geo.latitude}, ${geo.longitude}`);
  }
  lines.push("  (open the 'visitor map' tool to see everyone else)");
  return lines;
}

const MAX_USER_FILES = 50;
const MAX_FILE_BYTES = 10_000;
const MAX_PATH_DEPTH = 4;
// Directories are stored as keys with a trailing '/' (flat, S3-style)
const SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function validatePath(path: string): string | null {
  const segments = path.split('/');
  if (segments.length > MAX_PATH_DEPTH) return `jsh: path too deep (max ${MAX_PATH_DEPTH} levels)`;
  for (const segment of segments) {
    if (!SEGMENT_PATTERN.test(segment)) return `jsh: invalid name: ${path}`;
  }
  return null;
}

function dirExists(path: string, ctx: TerminalContext): boolean {
  return `${path}/` in ctx.files;
}

function parentMissing(path: string, ctx: TerminalContext): string | null {
  const idx = path.lastIndexOf('/');
  if (idx === -1) return null;
  const parent = path.slice(0, idx);
  return dirExists(parent, ctx) ? null : `jsh: ${parent}: No such directory`;
}

function isReadOnly(path: string): boolean {
  const [root] = path.split('/');
  return Boolean(FILES[root]) || root === 'blog';
}

/** Returns an error line if the file write is not allowed, otherwise null. */
function checkWrite(name: string, content: string, ctx: TerminalContext): string | null {
  const invalid = validatePath(name);
  if (invalid) return invalid;
  if (isReadOnly(name)) return `jsh: ${name}: read-only file`;
  if (dirExists(name, ctx)) return `jsh: ${name}: Is a directory`;
  if (!(name in ctx.files) && Object.keys(ctx.files).length >= MAX_USER_FILES)
    return 'jsh: too many files (rm something first)';
  if (content.length > MAX_FILE_BYTES) return 'jsh: disk quota exceeded';
  return parentMissing(name, ctx);
}

const PAGES = ['home', 'blog', 'career', 'projects', 'library', 'contact'];

// Commands offered by tab-completion of the first token (kept in display order).
const COMMANDS = [
  'help', 'ls', 'cat', 'open', 'cd', 'theme', 'echo', 'touch', 'mkdir',
  'rm', 'rmdir', 'whoami', 'whereami', 'date', 'pwd', 'history', 'neofetch',
  'clear', 'exit',
];

const FILES: Record<string, () => string[]> = {
  'about.txt': () => [
    'Jonathan Yates',
    'Software Development Engineer at Amazon',
    '',
    'Passionate about software development, cloud technologies, and',
    'continuous learning. Currently focused on building scalable',
    'microservices and mentoring fellow developers.',
  ],
  'contact.txt': () => [
    'email:   use the form at /contact  (try: open contact)',
    'github:  https://github.com/jyatesdotdev',
  ],
  'projects.txt': () =>
    projects.flatMap((p) => [
      `* ${p.title}`,
      `  ${p.description}`,
      `  [${p.technologies.join(', ')}]`,
      '',
    ]),
};

function listBlog(): string[] {
  return getPosts().map((p) => `${p.publishedAt}  ${p.slug}`);
}

function catBlogPost(slug: string): string[] | undefined {
  const post = getPosts().find((p) => p.slug === slug);
  if (!post) return undefined;
  return [
    post.title,
    `published: ${post.publishedAt}`,
    `tags: ${post.tags.join(', ')}`,
    '',
    post.summary,
    '',
    `(read it in full: open blog/${slug})`,
  ];
}

const HELP: string[] = [
  'jsh — available commands:',
  '',
  '  help              show this help',
  '  ls [dir]          list files',
  '  cat <file>        print a file        (try: cat about.txt)',
  '  open <page>       go to a page        (home, blog, blog/<slug>, career,',
  '                                         projects, library, contact)',
  '  theme <mode>      set the site theme  (dark, light, system)',
  '  echo <text>       print text          (echo hi > notes.txt writes a file)',
  '  touch <file>      create a file       (saved in your browser)',
  '  mkdir <dir>       create a directory  (-p for parents)',
  '  rm <path>         remove a file you created (-r for directories)',
  '  rmdir <dir>       remove an empty directory',
  '  whoami            who are you?',
  '  whereami          show your (approximate) location',
  '  date              current date and time',
  '  pwd               print working directory',
  '  history           command history',
  '  neofetch          system info',
  '  clear             clear the screen',
  '  exit              close the terminal',
];

function neofetch(theme: string): string[] {
  // "JY" in the figlet "standard" block-caps font, zipped with the info column.
  const logo = [
    '     ___   __',
    '    | \\ \\ / /',
    ' _  | |\\ V /',
    '| |_| | | |',
    ' \\___/  |_|',
  ];
  const info = [
    'guest@jyates.dev',
    '----------------',
    'Host:   jyates.dev',
    'Stack:  React 19 + Go on AWS Lambda',
    'Shell:  jsh 1.0.0',
    'Theme:  ' + theme,
  ];
  const width = Math.max(...logo.map((l) => l.length));
  return info.map((line, i) => `${(logo[i] ?? '').padEnd(width)}   ${line}`);
}

/**
 * Splits a command line into tokens, honoring single/double quotes so that
 * `echo "hello world" > f` writes `hello world` (not `"hello world"`), and a
 * quoted `>` counts as text rather than a redirect. Quote characters are
 * consumed, mirroring a real shell.
 */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let started = false; // lets an empty quoted token ("") survive as ''
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
    } else if (/\s/.test(ch)) {
      if (started) tokens.push(current);
      current = '';
      started = false;
    } else {
      current += ch;
      started = true;
    }
  }
  if (started) tokens.push(current);
  return tokens;
}

export interface CompleteResult {
  /** The input line after completion (extended to the longest common prefix). */
  line: string;
  /** Candidates to display when the completion is ambiguous (empty otherwise). */
  suggestions: string[];
}

function longestCommonPrefix(strings: string[]): string {
  let prefix = strings[0] ?? '';
  for (const s of strings) {
    while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

/** Built-in files + the blog dir + user files/dirs (dir keys already end in "/"). */
function fileNames(files: Record<string, string>): string[] {
  return [...Object.keys(FILES), 'blog/', ...Object.keys(files)];
}

/** Candidate completions for an argument, by command and current fragment. */
function argCandidates(cmd: string, partial: string, files: Record<string, string>): string[] {
  switch (cmd) {
    case 'cat':
    case 'ls':
    case 'rm':
    case 'rmdir':
    case 'touch':
    case 'mkdir':
      if (partial.startsWith('blog/')) return getPosts().map((p) => `blog/${p.slug}`);
      return fileNames(files);
    case 'open':
    case 'cd':
      if (partial.startsWith('blog/')) return getPosts().map((p) => `blog/${p.slug}`);
      return [...PAGES, 'blog/'];
    case 'theme':
      return ['dark', 'light', 'system'];
    default:
      return [];
  }
}

/**
 * Tab-completion. Completes the last whitespace-delimited fragment against
 * command names (first token) or command-specific arguments (files, pages,
 * themes). Returns the updated line and, when ambiguous, the candidates to show.
 * Pure, so it is unit-tested without rendering.
 */
export function complete(rawInput: string, files: Record<string, string>): CompleteResult {
  const input = rawInput.replace(/^\s+/, '');
  const parts = input.split(/\s+/);
  const partial = parts[parts.length - 1];
  const candidates = (
    parts.length === 1 ? COMMANDS : argCandidates(parts[0], partial, files)
  ).filter((c) => c.startsWith(partial));

  if (candidates.length === 0) return { line: rawInput, suggestions: [] };

  const head = parts.slice(0, -1).join(' ');
  const completion = candidates.length === 1 ? `${candidates[0]} ` : longestCommonPrefix(candidates);
  const line = head ? `${head} ${completion}` : completion;
  return { line, suggestions: candidates.length > 1 ? candidates : [] };
}

/**
 * Executes one line of input and returns the lines to print.
 * Side effects (navigation, theme, close, clear) go through ctx.
 */
export function runCommand(rawInput: string, ctx: TerminalContext): string[] {
  const input = rawInput.trim();
  if (!input) return [];

  const [cmd, ...args] = tokenize(input);
  const arg = args.join(' ');

  switch (cmd) {
    case 'help':
      return HELP;

    case 'clear':
      ctx.clearScreen();
      return [];

    case 'exit':
      ctx.close();
      return [];

    case 'echo': {
      const redirect = args.findIndex((a) => a === '>' || a === '>>');
      if (redirect === -1) return [arg];
      const name = args[redirect + 1];
      if (!name) return ['echo: missing file after redirect'];
      const text = args.slice(0, redirect).join(' ');
      const existing = args[redirect] === '>>' ? (ctx.files[name] ?? '') : '';
      const content = existing ? `${existing}\n${text}` : text;
      const err = checkWrite(name, content, ctx);
      if (err) return [err];
      ctx.writeFile(name, content);
      return [];
    }

    case 'touch': {
      const name = args[0]?.replace(/\/$/, '');
      if (!name) return ['touch: missing file name'];
      // Existing entries (builtin, user file, or dir) just get a fresh mtime — no-op
      if (FILES[name] || name in ctx.files || dirExists(name, ctx)) return [];
      const err = checkWrite(name, '', ctx);
      if (err) return [err];
      ctx.writeFile(name, '');
      return [];
    }

    case 'mkdir': {
      const withParents = args.includes('-p');
      const name = args.find((a) => !a.startsWith('-'))?.replace(/\/$/, '');
      if (!name) return ['mkdir: missing operand'];
      const invalid = validatePath(name);
      if (invalid) return [invalid];
      if (isReadOnly(name)) return [`mkdir: cannot create directory '${name}': read-only`];
      if (dirExists(name, ctx)) {
        return withParents ? [] : [`mkdir: cannot create directory '${name}': File exists`];
      }
      if (Object.keys(ctx.files).length >= MAX_USER_FILES)
        return ['jsh: too many files (rm something first)'];
      const segments = name.split('/');
      if (!withParents && parentMissing(name, ctx)) {
        return [parentMissing(name, ctx)!];
      }
      // With -p, create every missing ancestor along the way
      for (let i = 1; i <= segments.length; i++) {
        const path = segments.slice(0, i).join('/');
        if (path in ctx.files)
          return [`mkdir: cannot create directory '${path}': File exists`];
        if (i === segments.length || (withParents && !dirExists(path, ctx))) {
          ctx.writeFile(`${path}/`, '');
        }
      }
      return [];
    }

    case 'rmdir': {
      const name = args[0]?.replace(/\/$/, '');
      if (!name) return ['rmdir: missing operand'];
      if (!dirExists(name, ctx))
        return [`rmdir: failed to remove '${name}': No such directory`];
      const prefix = `${name}/`;
      if (Object.keys(ctx.files).some((k) => k.startsWith(prefix) && k !== prefix))
        return [`rmdir: failed to remove '${name}': Directory not empty`];
      ctx.deleteFile(prefix);
      return [];
    }

    case 'whoami':
      return ['guest'];

    case 'whereami': {
      ctx.runAsync(async () => {
        try {
          return formatGeo(await ctx.fetchGeo());
        } catch {
          return ['whereami: could not reach the geo service'];
        }
      });
      return ['locating…'];
    }

    case 'pwd':
      return ['/home/guest'];

    case 'date':
      return [new Date().toString()];

    case 'history':
      return ctx.history.map((h, i) => `  ${i + 1}  ${h}`);

    case 'neofetch':
      return neofetch(ctx.theme);

    case 'ls': {
      if (!arg || arg === '.' || arg === '~') {
        const rootEntries = Object.keys(ctx.files)
          .filter((k) => {
            const slash = k.indexOf('/');
            return slash === -1 || slash === k.length - 1;
          })
          .sort();
        return [[...Object.keys(FILES), 'blog/', ...rootEntries].join('  ')];
      }
      if (arg === 'blog' || arg === 'blog/') {
        return listBlog();
      }
      const target = arg.replace(/\/$/, '');
      if (dirExists(target, ctx)) {
        const prefix = `${target}/`;
        const entries = new Set<string>();
        for (const key of Object.keys(ctx.files)) {
          if (!key.startsWith(prefix) || key === prefix) continue;
          const rest = key.slice(prefix.length);
          const slash = rest.indexOf('/');
          entries.add(slash === -1 ? rest : rest.slice(0, slash + 1));
        }
        return entries.size ? [[...entries].sort().join('  ')] : [];
      }
      if (target in ctx.files) return [target];
      return [`ls: cannot access '${arg}': No such file or directory`];
    }

    case 'cat': {
      if (!arg) return ['cat: missing file (try: cat about.txt)'];
      const file = FILES[arg];
      if (file) return file();
      if (dirExists(arg.replace(/\/$/, ''), ctx)) return [`cat: ${arg}: Is a directory`];
      if (arg in ctx.files) {
        return ctx.files[arg] === '' ? [] : ctx.files[arg].split('\n');
      }
      if (arg.startsWith('blog/')) {
        const post = catBlogPost(arg.slice('blog/'.length));
        if (post) return post;
      }
      return [`cat: ${arg}: No such file or directory`];
    }

    case 'cd':
    case 'open': {
      if (!arg) return [`${cmd}: missing page (try: open blog)`];
      const path = arg.replace(/^\//, '').replace(/\/$/, '');
      if (path === '' || path === 'home' || path === '~') {
        ctx.navigate('/');
        return ['→ /'];
      }
      const [page] = path.split('/');
      if (PAGES.includes(page)) {
        ctx.navigate(`/${path}`);
        return [`→ /${path}`];
      }
      return [`${cmd}: no such page: ${arg} (pages: ${PAGES.join(', ')})`];
    }

    case 'theme': {
      if (arg === 'dark' || arg === 'light' || arg === 'system') {
        ctx.setTheme(arg);
        return [`theme set to ${arg}`];
      }
      return [`theme: expected 'dark', 'light' or 'system' (current: ${ctx.theme})`];
    }

    case 'sudo':
      return ['guest is not in the sudoers file. This incident will be reported.'];

    case 'rm': {
      const recursive = args.some((a) => /^-[A-Za-z]*r/i.test(a));
      const raw = args.find((a) => !a.startsWith('-'));
      if (!raw) return ['rm: missing operand'];
      const name = raw.replace(/\/$/, '');
      if (name in ctx.files) {
        ctx.deleteFile(name);
        return [];
      }
      if (dirExists(name, ctx)) {
        if (!recursive) return [`rm: cannot remove '${name}': Is a directory (try rm -r)`];
        for (const key of Object.keys(ctx.files)) {
          if (key.startsWith(`${name}/`)) ctx.deleteFile(key);
        }
        return [];
      }
      if (isReadOnly(name) || ['/', '~', '*', '.'].includes(raw)) {
        return ['rm: permission denied (nice try)'];
      }
      return [`rm: cannot remove '${name}': No such file or directory`];
    }

    case 'vim':
    case 'vi':
    case 'emacs':
    case 'nano':
      return [`${cmd}: no editors here — this shell is read-only. You may exit freely, though.`];

    default:
      return [`jsh: command not found: ${cmd} (try 'help')`];
  }
}
