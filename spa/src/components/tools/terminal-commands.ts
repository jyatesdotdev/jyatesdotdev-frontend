import { projects } from '../../data/projects';
import { careerItems } from '../../data/career';
import { libraryItems } from '../../data/library';
import { getPosts } from '../../blog/posts';
import type { GeoData, VisitStats } from '../../api';
import { flagEmoji, ALPHA2_TO_NAME } from './iso-countries';
import {
  INCIDENT_FILES,
  runOnCall,
  runSmartctl,
  type OnCallSession,
} from './terminal-lab';

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
  clearHistory: () => void;
  history: string[];
  /** Home-relative working directory. An empty string represents /home/guest. */
  cwd: string;
  changeDirectory: (path: string) => void;
  onCallSession: OnCallSession;
  updateOnCall: (session: OnCallSession) => void;
  /** User-created files (persisted to localStorage by the Terminal component) */
  files: Record<string, string>;
  writeFile: (name: string, content: string) => void;
  deleteFile: (name: string) => void;
  /** Fetches the caller's edge-resolved location (GET /api/v1/geo) */
  fetchGeo: () => Promise<GeoData>;
  fetchStatus: () => Promise<TerminalStatus>;
  /** Schedules async output; resolved lines are appended when ready */
  runAsync: (task: () => Promise<string[]>) => void;
}

export interface TerminalStatus {
  checkedAt: string;
  route: string;
  build: string;
  api: 'operational' | 'degraded' | 'unavailable';
  latencyMs: number;
  geo?: GeoData;
  visits?: VisitStats;
  errors?: string[];
}

export function formatStatus(status: TerminalStatus, json = false): string[] {
  if (json) return JSON.stringify(status, null, 2).split('\n');
  const location = status.geo?.country
    ? [status.geo.city, status.geo.countryName || status.geo.country].filter(Boolean).join(', ')
    : 'unavailable';
  const traffic = status.visits
    ? `${status.visits.total.toLocaleString()} visits from ${status.visits.countries.length} ${status.visits.countries.length === 1 ? 'country' : 'countries'}`
    : 'unavailable';
  const lines = [
    'jyates.dev status',
    `  api:      ${status.api} (${status.latencyMs} ms)`,
    `  build:    ${status.build}`,
    `  route:    ${status.route}`,
    `  edge:     ${location}`,
    `  traffic:  ${traffic}`,
    `  checked:  ${status.checkedAt}`,
  ];
  if (status.errors?.length) lines.push(`  notes:    ${status.errors.join('; ')}`);
  return lines;
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

function userDirExists(path: string, ctx: TerminalContext): boolean {
  return `${path}/` in ctx.files;
}

function dirExists(path: string, ctx: TerminalContext): boolean {
  return path === '' || path === 'blog' || path === 'incident' || userDirExists(path, ctx);
}

interface ResolvedPath {
  path?: string;
  error?: string;
}

/** Resolves a shell path into a normalized key inside the virtual home directory. */
export function resolvePath(input: string, cwd = ''): ResolvedPath {
  let value = input.trim();
  let segments = cwd ? cwd.split('/') : [];

  if (value === '~' || value === '/' || value === '/home/guest') {
    return { path: '' };
  }
  if (value.startsWith('~/')) {
    segments = [];
    value = value.slice(2);
  } else if (value.startsWith('/home/guest/')) {
    segments = [];
    value = value.slice('/home/guest/'.length);
  } else if (value.startsWith('/')) {
    return { error: `${input}: path is outside /home/guest` };
  }

  for (const segment of value.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (segments.length === 0) return { error: `${input}: path is outside /home/guest` };
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return { path: segments.join('/') };
}

function shellPath(path: string): string {
  return path ? `~/${path}` : '~';
}

function parentMissing(path: string, ctx: TerminalContext): string | null {
  const idx = path.lastIndexOf('/');
  if (idx === -1) return null;
  const parent = path.slice(0, idx);
  return dirExists(parent, ctx) ? null : `jsh: ${parent}: No such directory`;
}

function isReadOnly(path: string): boolean {
  const [root] = path.split('/');
  return Boolean(FILES[root]) || root === 'blog' || root === 'incident';
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

interface CommandDoc {
  usage: string;
  summary: string;
  description: string;
  options?: string[];
  examples?: string[];
}

const COMMAND_DOCS: Record<string, CommandDoc> = {
  help: { usage: 'help', summary: 'list commands', description: 'Prints a compact command index.' },
  man: { usage: 'man <command>', summary: 'show command help', description: 'Shows usage, options, and examples for one jsh command.' },
  ls: { usage: 'ls [path]', summary: 'list directory contents', description: 'Lists files in the current or selected virtual directory.', examples: ['ls', 'ls blog'] },
  cat: { usage: 'cat <file>', summary: 'print a file', description: 'Prints a built-in, blog, incident, or browser-saved file.', examples: ['cat about.txt', 'cat ~/notes.txt'] },
  open: { usage: 'open <page>', summary: 'navigate the site', description: `Navigates to a site page: ${PAGES.join(', ')}.`, examples: ['open projects', 'open blog/wd-smart-reader'] },
  cd: { usage: 'cd [dir]', summary: 'change directory', description: 'Changes the virtual working directory. Supports relative paths, .., ~, and /home/guest.' },
  theme: { usage: 'theme <mode>', summary: 'set site theme', description: 'Sets the site theme.', options: ['dark, light, system'] },
  echo: { usage: 'echo <text>', summary: 'print or redirect text', description: 'Prints text, or writes it to a browser-saved file with > or >>.', examples: ['echo hello', 'echo "one two" > notes.txt'] },
  touch: { usage: 'touch <file>', summary: 'create a file', description: 'Creates an empty browser-saved file.' },
  mkdir: { usage: 'mkdir [-p] <dir>', summary: 'create a directory', description: 'Creates a browser-saved directory.', options: ['-p  create missing parents'] },
  rm: { usage: 'rm [-r] <path>', summary: 'remove a saved path', description: 'Removes browser-saved files. Built-in content is read-only.', options: ['-r  remove a directory recursively'] },
  rmdir: { usage: 'rmdir <dir>', summary: 'remove an empty directory', description: 'Removes an empty browser-saved directory.' },
  tree: { usage: 'tree [path]', summary: 'show a directory tree', description: 'Recursively renders the selected virtual directory.' },
  find: { usage: 'find [path] [pattern]', summary: 'find virtual paths', description: 'Finds descendants by a case-insensitive * and ? wildcard pattern.', examples: ["find . '*.txt'"] },
  grep: { usage: 'grep [-i] <pattern> [file]', summary: 'filter matching lines', description: 'Filters a file or pipeline with a regular expression.', options: ['-i  ignore case'], examples: ['cat projects.txt | grep -i go'] },
  head: { usage: 'head [-n N] [file]', summary: 'print first lines', description: 'Prints the first 10 lines of a file or pipeline by default.' },
  tail: { usage: 'tail [-n N] [file]', summary: 'print last lines', description: 'Prints the last 10 lines of a file or pipeline by default.' },
  sort: { usage: 'sort [-r] [file]', summary: 'sort lines', description: 'Sorts a file or pipeline.', options: ['-r  reverse the result'] },
  wc: { usage: 'wc [-l|-w|-c] [file]', summary: 'count input', description: 'Counts lines, words, and characters in a file or pipeline.' },
  projects: { usage: 'projects [options]', summary: 'query projects', description: 'Queries the projects shown on the portfolio.', options: ['--tech <name>  filter technologies', '--json         emit JSON'] },
  blog: { usage: 'blog [options]', summary: 'query posts', description: 'Queries published blog post metadata.', options: ['--tag <name>  filter tags', '--json        emit JSON'] },
  resume: { usage: 'resume [options]', summary: 'query work history', description: 'Queries the work history shown on the career page.', options: ['--company <name>  filter employers', '--json             emit JSON'] },
  library: { usage: 'library [category] [--json]', summary: 'query the library', description: 'Queries books and websites in the library.' },
  whoami: { usage: 'whoami', summary: 'print the current user', description: 'Prints the virtual shell user.' },
  whereami: { usage: 'whereami', summary: 'show edge location', description: 'Looks up the approximate location supplied by the site edge.' },
  status: { usage: 'status [--json]', summary: 'check live site status', description: 'Measures API latency and reports build, route, edge, and traffic information.' },
  smartctl: { usage: 'smartctl [options] /dev/mybook', summary: 'inspect the simulated My Book', description: 'Prints deterministic SMART health data for a simulated WD My Book device.', options: ['--scan          list simulated devices', '-a, --all       print all SMART data', '-H, --health    print overall health'] },
  oncall: { usage: 'oncall <action>', summary: 'run the incident lab', description: 'Runs a deterministic SEV-2 investigation using read-only evidence in ~/incident.', options: ['start, status, hint, resolve <cause>, reset'] },
  date: { usage: 'date', summary: 'print local date and time', description: 'Prints the browser local date and time.' },
  pwd: { usage: 'pwd', summary: 'print working directory', description: 'Prints the absolute virtual working directory.' },
  history: { usage: 'history [-c]', summary: 'show command history', description: 'Prints persisted command history.', options: ['-c  clear command history'] },
  neofetch: { usage: 'neofetch', summary: 'show site system info', description: 'Prints jsh and site stack information.' },
  clear: { usage: 'clear', summary: 'clear the screen', description: 'Clears terminal output.' },
  exit: { usage: 'exit', summary: 'close the terminal', description: 'Closes the terminal window.' },
};

// Object insertion order is the command display and completion order.
const COMMANDS = Object.keys(COMMAND_DOCS);

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
  ...Object.values(COMMAND_DOCS).map((doc) => `  ${doc.usage.padEnd(30)}${doc.summary}`),
  '',
  "Use 'man <command>' for details.",
];

function manPage(command: string): string[] {
  const doc = COMMAND_DOCS[command];
  if (!doc) return [`No manual entry for ${command}`];
  const lines = [
    command.toUpperCase(),
    '',
    'NAME',
    `  ${command} - ${doc.summary}`,
    '',
    'SYNOPSIS',
    `  ${doc.usage}`,
    '',
    'DESCRIPTION',
    `  ${doc.description}`,
  ];
  if (doc.options?.length) lines.push('', 'OPTIONS', ...doc.options.map((item) => `  ${item}`));
  if (doc.examples?.length) lines.push('', 'EXAMPLES', ...doc.examples.map((item) => `  ${item}`));
  return lines;
}

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
    'Shell:  jsh 2.0.0',
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
interface ShellToken {
  value: string;
  quoted: boolean;
}

function parseTokens(input: string): ShellToken[] {
  const tokens: ShellToken[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let started = false; // lets an empty quoted token ("") survive as ''
  let quoted = false;
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
      quoted = true;
    } else if (/\s/.test(ch)) {
      if (started) tokens.push({ value: current, quoted });
      current = '';
      started = false;
      quoted = false;
    } else {
      current += ch;
      started = true;
    }
  }
  if (started) tokens.push({ value: current, quoted });
  return tokens;
}

export function tokenize(input: string): string[] {
  return parseTokens(input).map((token) => token.value);
}

/** Splits a command pipeline while leaving pipe characters inside quotes alone. */
export function splitPipeline(input: string): string[] {
  const stages: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (const ch of input) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === '|') {
      stages.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  stages.push(current.trim());
  return stages;
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

interface DirectoryEntry {
  name: string;
  path: string;
  directory: boolean;
}

function directoryEntries(path: string, files: Record<string, string>): DirectoryEntry[] {
  const entries = new Map<string, DirectoryEntry>();
  if (path === '') {
    for (const name of Object.keys(FILES)) {
      entries.set(name, { name, path: name, directory: false });
    }
    entries.set('blog/', { name: 'blog/', path: 'blog', directory: true });
    entries.set('incident/', { name: 'incident/', path: 'incident', directory: true });
  } else if (path === 'blog') {
    for (const post of getPosts()) {
      entries.set(post.slug, { name: post.slug, path: `blog/${post.slug}`, directory: false });
    }
  } else if (path === 'incident') {
    for (const filePath of Object.keys(INCIDENT_FILES)) {
      const name = filePath.slice('incident/'.length);
      entries.set(name, { name, path: filePath, directory: false });
    }
  }

  const prefix = path ? `${path}/` : '';
  for (const key of Object.keys(files)) {
    if (!key.startsWith(prefix) || key === prefix) continue;
    const rest = key.slice(prefix.length);
    const slash = rest.indexOf('/');
    const directory = slash !== -1;
    const child = directory ? rest.slice(0, slash) : rest;
    const name = directory ? `${child}/` : child;
    if (!entries.has(name)) {
      entries.set(name, {
        name,
        path: path ? `${path}/${child}` : child,
        directory,
      });
    }
  }
  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function completionCandidates(
  partial: string,
  files: Record<string, string>,
  cwd: string,
  directoriesOnly = false
): string[] {
  const slash = partial.lastIndexOf('/');
  const typedParent = slash === -1 ? '' : partial.slice(0, slash + 1);
  const fragment = slash === -1 ? partial : partial.slice(slash + 1);
  const parentInput = slash === -1 ? '.' : partial.slice(0, slash) || '/';
  const resolved = resolvePath(parentInput, cwd);
  if (resolved.error || resolved.path === undefined) return [];
  return directoryEntries(resolved.path, files)
    .filter((entry) => !directoriesOnly || entry.directory)
    .filter((entry) => entry.name.startsWith(fragment))
    .map((entry) => `${typedParent}${entry.name}`);
}

/** Candidate completions for an argument, by command and current fragment. */
function argCandidates(
  cmd: string,
  partial: string,
  files: Record<string, string>,
  cwd: string
): string[] {
  switch (cmd) {
    case 'cat':
    case 'grep':
    case 'head':
    case 'tail':
    case 'sort':
    case 'wc':
    case 'ls':
    case 'rm':
    case 'rmdir':
    case 'tree':
    case 'find':
    case 'touch':
    case 'mkdir':
      return completionCandidates(partial, files, cwd);
    case 'open':
      if (partial.startsWith('blog/')) return getPosts().map((p) => `blog/${p.slug}`);
      return [...PAGES, 'blog/'];
    case 'cd':
      return completionCandidates(partial, files, cwd, true);
    case 'theme':
      return ['dark', 'light', 'system'];
    case 'man':
      return COMMANDS;
    case 'projects':
      return ['--tech', '--json'];
    case 'blog':
      return ['--tag', '--json'];
    case 'resume':
      return ['--company', '--json'];
    case 'library':
      return [...new Set(libraryItems.map((item) => item.category)), '--json'];
    case 'status':
      return ['--json'];
    case 'history':
      return ['-c'];
    case 'smartctl':
      return ['--scan', '-a', '--all', '-H', '--health', '/dev/mybook'];
    case 'oncall':
      return ['start', 'status', 'hint', 'resolve', 'retry-storm', 'reset'];
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
function completeStage(rawInput: string, files: Record<string, string>, cwd: string): CompleteResult {
  const input = rawInput.replace(/^\s+/, '');
  const parts = input.split(/\s+/);
  const partial = parts[parts.length - 1];
  const candidates = (
    parts.length === 1 ? COMMANDS : argCandidates(parts[0], partial, files, cwd)
  ).filter((c) => c.startsWith(partial));

  if (candidates.length === 0) return { line: rawInput, suggestions: [] };

  const head = parts.slice(0, -1).join(' ');
  const completion = candidates.length === 1 ? `${candidates[0]} ` : longestCommonPrefix(candidates);
  const line = head ? `${head} ${completion}` : completion;
  return { line, suggestions: candidates.length > 1 ? candidates : [] };
}

function lastPipelineSeparator(input: string): number {
  let quote: '"' | "'" | null = null;
  let last = -1;
  for (let index = 0; index < input.length; index++) {
    const value = input[index];
    if (quote) {
      if (value === quote) quote = null;
    } else if (value === '"' || value === "'") {
      quote = value;
    } else if (value === '|') {
      last = index;
    }
  }
  return last;
}

export function complete(rawInput: string, files: Record<string, string>, cwd = ''): CompleteResult {
  const separator = lastPipelineSeparator(rawInput);
  if (separator === -1) return completeStage(rawInput, files, cwd);
  const prefix = rawInput.slice(0, separator + 1);
  const stage = rawInput.slice(separator + 1);
  const leading = stage.match(/^\s*/)?.[0] ?? '';
  const result = completeStage(stage.slice(leading.length), files, cwd);
  return { ...result, line: `${prefix}${leading}${result.line}` };
}

/**
 * Executes one line of input and returns the lines to print.
 * Side effects (navigation, theme, close, clear) go through ctx.
 */
function readFileLines(input: string, ctx: TerminalContext): { lines?: string[]; error?: string } {
  const resolved = resolvePath(input, ctx.cwd);
  if (resolved.error || resolved.path === undefined) return { error: resolved.error };
  const path = resolved.path;
  const file = FILES[path];
  if (file) return { lines: file() };
  if (INCIDENT_FILES[path]) return { lines: INCIDENT_FILES[path] };
  if (dirExists(path, ctx)) return { error: `${input}: Is a directory` };
  if (path in ctx.files) return { lines: ctx.files[path] === '' ? [] : ctx.files[path].split('\n') };
  if (path.startsWith('blog/')) {
    const post = catBlogPost(path.slice('blog/'.length));
    if (post) return { lines: post };
  }
  return { error: `${input}: No such file or directory` };
}

function resolveCommandPath(input: string, ctx: TerminalContext): { path?: string; error?: string } {
  const resolved = resolvePath(input.replace(/\/$/, ''), ctx.cwd);
  if (resolved.error || resolved.path === undefined) return resolved;
  return { path: resolved.path };
}

function listPath(input: string, ctx: TerminalContext): string[] {
  const resolved = resolveCommandPath(input, ctx);
  if (resolved.error || resolved.path === undefined) {
    return [`ls: cannot access '${input}': ${resolved.error}`];
  }
  const path = resolved.path;
  if (dirExists(path, ctx)) {
    const entries = directoryEntries(path, ctx.files);
    return entries.length ? [entries.map((entry) => entry.name).join('  ')] : [];
  }
  if (
    path in ctx.files ||
    FILES[path] ||
    INCIDENT_FILES[path] ||
    (path.startsWith('blog/') && catBlogPost(path.slice(5)))
  ) {
    return [input];
  }
  return [`ls: cannot access '${input}': No such file or directory`];
}

function renderTree(path: string, ctx: TerminalContext): string[] {
  const lines: string[] = [shellPath(path)];

  function walk(directory: string, prefix: string) {
    const entries = directoryEntries(directory, ctx.files);
    entries.forEach((entry, index) => {
      const last = index === entries.length - 1;
      lines.push(`${prefix}${last ? '`-- ' : '|-- '}${entry.name}`);
      if (entry.directory) walk(entry.path, `${prefix}${last ? '    ' : '|   '}`);
    });
  }

  walk(path, '');
  return lines;
}

function globPattern(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replaceAll('*', '.*').replaceAll('?', '.')}$`, 'i');
}

function descendantPaths(path: string, ctx: TerminalContext): string[] {
  const paths = [path];
  function walk(directory: string) {
    for (const entry of directoryEntries(directory, ctx.files)) {
      paths.push(entry.path);
      if (entry.directory) walk(entry.path);
    }
  }
  if (dirExists(path, ctx)) walk(path);
  return paths;
}

function getOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function jsonLines(value: unknown): string[] {
  return JSON.stringify(value, null, 2).split('\n');
}

function unsupportedArg(
  args: string[],
  valueOptions: string[],
  flagOptions: string[],
  allowPositionals = false
): string | undefined {
  for (let index = 0; index < args.length; index++) {
    const value = args[index];
    if (valueOptions.includes(value)) {
      if (!args[index + 1] || args[index + 1].startsWith('--')) return `${value} requires a value`;
      index++;
    } else if (!flagOptions.includes(value) && (!allowPositionals || value.startsWith('-'))) {
      return `unknown option: ${value}`;
    }
  }
  return undefined;
}

function formatProjects(items: typeof projects): string[] {
  if (!items.length) return ['No projects matched.'];
  return items.flatMap((project) => [
    project.title,
    `  tech: ${project.technologies.join(', ')}`,
    `  ${project.description}`,
    ...(project.github ? [`  repo: ${project.github}`] : []),
    '',
  ]).slice(0, -1);
}

function formatPosts(posts: ReturnType<typeof getPosts>): string[] {
  if (!posts.length) return ['No posts matched.'];
  return posts.flatMap((post) => [
    `${post.publishedAt}  ${post.title}`,
    `  tags: ${post.tags.join(', ')}`,
    `  ${post.summary}`,
    `  /blog/${post.slug}`,
    '',
  ]).slice(0, -1);
}

function formatResume(items: typeof careerItems): string[] {
  if (!items.length) return ['No roles matched.'];
  return items.flatMap((item) => [
    `${item.startDate} - ${item.endDate}  ${item.title}, ${item.company}`,
    `  ${item.location}`,
    ...item.description.map((description) => `  - ${description}`),
    '',
  ]).slice(0, -1);
}

function formatLibrary(items: typeof libraryItems): string[] {
  if (!items.length) return ['No library items matched.'];
  return items.flatMap((item) => [
    `${item.dateAdded}  [${item.category}] ${item.title}`,
    `  ${item.description}`,
    `  ${item.url}`,
    '',
  ]).slice(0, -1);
}

function filterInput(
  command: string,
  file: string | undefined,
  stdin: string[] | undefined,
  ctx: TerminalContext
): { lines?: string[]; error?: string } {
  if (file) {
    const result = readFileLines(file, ctx);
    return result.error ? { error: `${command}: ${result.error}` } : result;
  }
  if (stdin) return { lines: stdin };
  return { error: `${command}: missing input (use a file or pipeline)` };
}

function lineCountArgs(args: string[]): { count: number; file?: string; error?: string } {
  let count = 10;
  let file: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const value = args[i];
    if (value === '-n') {
      const parsed = Number(args[++i]);
      if (!Number.isInteger(parsed) || parsed < 0) return { count, error: 'expected a non-negative line count' };
      count = parsed;
    } else if (/^-\d+$/.test(value)) {
      count = Number(value.slice(1));
    } else if (!value.startsWith('-') && !file) {
      file = value;
    } else {
      return { count, error: `unexpected argument: ${value}` };
    }
  }
  return { count, file };
}

function runSingleCommand(rawInput: string, ctx: TerminalContext, stdin?: string[]): string[] {
  const input = rawInput.trim();
  if (!input) return [];

  const [command, ...parsedArgs] = parseTokens(input);
  const cmd = command.value;
  const args = parsedArgs.map((token) => token.value);
  const arg = args.join(' ');

  switch (cmd) {
    case 'help':
      return HELP;

    case 'man':
      return arg ? manPage(arg) : ['What manual page do you want?'];

    case 'clear':
      ctx.clearScreen();
      return [];

    case 'exit':
      ctx.close();
      return [];

    case 'echo': {
      const redirect = parsedArgs.findIndex(
        (token) => !token.quoted && (token.value === '>' || token.value === '>>')
      );
      if (redirect === -1) return [arg];
      const inputPath = args[redirect + 1];
      if (!inputPath) return ['echo: missing file after redirect'];
      const resolved = resolveCommandPath(inputPath, ctx);
      if (resolved.error || resolved.path === undefined) return [`echo: ${resolved.error}`];
      const name = resolved.path;
      const text = args.slice(0, redirect).join(' ');
      const existing = args[redirect] === '>>' ? (ctx.files[name] ?? '') : '';
      const content = existing ? `${existing}\n${text}` : text;
      const err = checkWrite(name, content, ctx);
      if (err) return [err];
      ctx.writeFile(name, content);
      return [];
    }

    case 'touch': {
      const inputPath = args[0];
      if (!inputPath) return ['touch: missing file name'];
      const resolved = resolveCommandPath(inputPath, ctx);
      if (resolved.error || resolved.path === undefined) return [`touch: ${resolved.error}`];
      const name = resolved.path;
      // Existing entries (builtin, user file, or dir) just get a fresh mtime — no-op
      if (FILES[name] || name in ctx.files || dirExists(name, ctx)) return [];
      const err = checkWrite(name, '', ctx);
      if (err) return [err];
      ctx.writeFile(name, '');
      return [];
    }

    case 'mkdir': {
      const withParents = args.includes('-p');
      const inputPath = args.find((a) => !a.startsWith('-'));
      if (!inputPath) return ['mkdir: missing operand'];
      const resolved = resolveCommandPath(inputPath, ctx);
      if (resolved.error || resolved.path === undefined) return [`mkdir: ${resolved.error}`];
      const name = resolved.path;
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
      const inputPath = args[0];
      if (!inputPath) return ['rmdir: missing operand'];
      const resolved = resolveCommandPath(inputPath, ctx);
      if (resolved.error || resolved.path === undefined) return [`rmdir: ${resolved.error}`];
      const name = resolved.path;
      if (!userDirExists(name, ctx))
        return [`rmdir: failed to remove '${inputPath}': No such directory`];
      if (name === ctx.cwd || ctx.cwd.startsWith(`${name}/`))
        return [`rmdir: failed to remove '${inputPath}': Device or resource busy`];
      const prefix = `${name}/`;
      if (Object.keys(ctx.files).some((k) => k.startsWith(prefix) && k !== prefix))
        return [`rmdir: failed to remove '${inputPath}': Directory not empty`];
      ctx.deleteFile(prefix);
      return [];
    }

    case 'projects': {
      const error = unsupportedArg(args, ['--tech'], ['--json']);
      if (error) return [`projects: ${error}`];
      const technology = getOption(args, '--tech')?.toLowerCase();
      const matches = technology
        ? projects.filter((project) =>
            project.technologies.some((item) => item.toLowerCase().includes(technology))
          )
        : projects;
      return args.includes('--json') ? jsonLines(matches) : formatProjects(matches);
    }

    case 'blog': {
      const error = unsupportedArg(args, ['--tag'], ['--json']);
      if (error) return [`blog: ${error}`];
      const tag = getOption(args, '--tag')?.toLowerCase();
      const posts = getPosts();
      const matches = tag
        ? posts.filter((post) => post.tags.some((item) => item.toLowerCase().includes(tag)))
        : posts;
      return args.includes('--json') ? jsonLines(matches) : formatPosts(matches);
    }

    case 'resume': {
      const error = unsupportedArg(args, ['--company'], ['--json']);
      if (error) return [`resume: ${error}`];
      const company = getOption(args, '--company')?.toLowerCase();
      const matches = company
        ? careerItems.filter((item) => item.company.toLowerCase().includes(company))
        : careerItems;
      return args.includes('--json') ? jsonLines(matches) : formatResume(matches);
    }

    case 'library': {
      const error = unsupportedArg(args, [], ['--json'], true);
      if (error) return [`library: ${error}`];
      const categories = new Set(libraryItems.map((item) => item.category));
      const positionals = args.filter((value) => !value.startsWith('-'));
      if (positionals.length > 1) return [`library: unexpected argument: ${positionals[1]}`];
      const category = positionals[0];
      if (category && !categories.has(category.toLowerCase())) {
        return [`library: unknown category: ${category} (${[...categories].join(', ')})`];
      }
      const matches = category
        ? libraryItems.filter((item) => item.category === category.toLowerCase())
        : libraryItems;
      return args.includes('--json') ? jsonLines(matches) : formatLibrary(matches);
    }

    case 'smartctl':
      return runSmartctl(args);

    case 'oncall':
      return runOnCall(args, ctx.onCallSession, ctx.updateOnCall);

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

    case 'status': {
      const json = args.includes('--json');
      const unknown = args.find((value) => value !== '--json');
      if (unknown) return [`status: unknown option: ${unknown}`];
      ctx.runAsync(async () => {
        try {
          return formatStatus(await ctx.fetchStatus(), json);
        } catch {
          return ['status: could not reach site services'];
        }
      });
      return ['checking live services...'];
    }

    case 'pwd':
      return [`/home/guest${ctx.cwd ? `/${ctx.cwd}` : ''}`];

    case 'date':
      return [new Date().toString()];

    case 'history':
      if (arg === '-c') {
        ctx.clearHistory();
        return [];
      }
      if (arg) return [`history: unknown option: ${arg}`];
      return ctx.history.map((h, i) => `  ${i + 1}  ${h}`);

    case 'neofetch':
      return neofetch(ctx.theme);

    case 'ls': {
      return listPath(arg || '.', ctx);
    }

    case 'tree': {
      const inputPath = arg || '.';
      const resolved = resolveCommandPath(inputPath, ctx);
      if (resolved.error || resolved.path === undefined) return [`tree: ${resolved.error}`];
      if (!dirExists(resolved.path, ctx)) {
        const file = readFileLines(inputPath, ctx);
        return file.error ? [`tree: ${file.error}`] : [shellPath(resolved.path)];
      }
      return renderTree(resolved.path, ctx);
    }

    case 'find': {
      const inputPath = args[0] || '.';
      const pattern = args[1] || '*';
      const resolved = resolveCommandPath(inputPath, ctx);
      if (resolved.error || resolved.path === undefined) return [`find: ${resolved.error}`];
      if (!dirExists(resolved.path, ctx) && readFileLines(inputPath, ctx).error) {
        return [`find: '${inputPath}': No such file or directory`];
      }
      let matcher: RegExp;
      try {
        matcher = globPattern(pattern);
      } catch {
        return [`find: invalid pattern: ${pattern}`];
      }
      return descendantPaths(resolved.path, ctx)
        .filter((path) => matcher.test(path.split('/').at(-1) || '~'))
        .map(shellPath);
    }

    case 'cat': {
      if (!arg) return ['cat: missing file (try: cat about.txt)'];
      const result = readFileLines(arg, ctx);
      return result.error ? [`cat: ${result.error}`] : result.lines!;
    }

    case 'grep': {
      const ignoreCase = args.includes('-i');
      const operands = args.filter((value) => value !== '-i');
      const pattern = operands[0];
      if (!pattern) return ['grep: missing pattern'];
      const source = filterInput('grep', operands[1], stdin, ctx);
      if (source.error) return [source.error];
      try {
        const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
        return source.lines!.filter((line) => regex.test(line));
      } catch {
        return [`grep: invalid pattern: ${pattern}`];
      }
    }

    case 'head':
    case 'tail': {
      const parsed = lineCountArgs(args);
      if (parsed.error) return [`${cmd}: ${parsed.error}`];
      const source = filterInput(cmd, parsed.file, stdin, ctx);
      if (source.error) return [source.error];
      if (parsed.count === 0) return [];
      return cmd === 'head'
        ? source.lines!.slice(0, parsed.count)
        : source.lines!.slice(-parsed.count);
    }

    case 'sort': {
      const reverse = args.includes('-r');
      const file = args.find((value) => !value.startsWith('-'));
      const unknown = args.find((value) => value.startsWith('-') && value !== '-r');
      if (unknown) return [`sort: unknown option: ${unknown}`];
      const source = filterInput('sort', file, stdin, ctx);
      if (source.error) return [source.error];
      const lines = [...source.lines!].sort((a, b) => a.localeCompare(b));
      return reverse ? lines.reverse() : lines;
    }

    case 'wc': {
      const option = args.find((value) => value.startsWith('-'));
      if (option && !['-l', '-w', '-c'].includes(option)) return [`wc: unknown option: ${option}`];
      const file = args.find((value) => !value.startsWith('-'));
      const source = filterInput('wc', file, stdin, ctx);
      if (source.error) return [source.error];
      const text = source.lines!.join('\n');
      const lines = source.lines!.length;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      if (option === '-l') return [String(lines)];
      if (option === '-w') return [String(words)];
      if (option === '-c') return [String(chars)];
      return [`${lines} ${words} ${chars}`];
    }

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

    case 'cd': {
      const inputPath = arg || '~';
      const resolved = resolveCommandPath(inputPath, ctx);
      if (resolved.error || resolved.path === undefined) return [`cd: ${resolved.error}`];
      if (!dirExists(resolved.path, ctx)) {
        const file = readFileLines(inputPath, ctx);
        return [
          file.error
            ? `cd: ${inputPath}: No such file or directory`
            : `cd: ${inputPath}: Not a directory`,
        ];
      }
      ctx.changeDirectory(resolved.path);
      return [];
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
      const inputPath = args.find((a) => !a.startsWith('-'));
      if (!inputPath) return ['rm: missing operand'];
      if (['/', '/home/guest', '~', '*', '.'].includes(inputPath)) {
        return ['rm: permission denied (nice try)'];
      }
      const resolved = resolveCommandPath(inputPath, ctx);
      if (resolved.error || resolved.path === undefined) return [`rm: ${resolved.error}`];
      const name = resolved.path;
      if (name === '') return ['rm: permission denied (nice try)'];
      if (name in ctx.files) {
        ctx.deleteFile(name);
        return [];
      }
      if (userDirExists(name, ctx)) {
        if (name === ctx.cwd || ctx.cwd.startsWith(`${name}/`)) {
          return [`rm: cannot remove '${inputPath}': Device or resource busy`];
        }
        if (!recursive) return [`rm: cannot remove '${inputPath}': Is a directory (try rm -r)`];
        for (const key of Object.keys(ctx.files)) {
          if (key.startsWith(`${name}/`)) ctx.deleteFile(key);
        }
        return [];
      }
      if (isReadOnly(name)) {
        return ['rm: permission denied (nice try)'];
      }
      return [`rm: cannot remove '${inputPath}': No such file or directory`];
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

export function runCommand(rawInput: string, ctx: TerminalContext): string[] {
  const input = rawInput.trim();
  if (!input) return [];
  const stages = splitPipeline(input);
  if (stages.some((stage) => stage === '')) return ["jsh: syntax error near unexpected token '|'"];

  let output: string[] | undefined;
  for (const stage of stages) output = runSingleCommand(stage, ctx, output);
  return output ?? [];
}
