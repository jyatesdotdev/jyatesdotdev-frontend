import { describe, it, expect, vi } from 'vitest';
import {
  runCommand,
  formatGeo,
  formatStatus,
  tokenize,
  splitPipeline,
  complete,
  type TerminalContext,
} from './terminal-commands';

function makeContext(overrides: Partial<TerminalContext> = {}): TerminalContext {
  return {
    navigate: vi.fn(),
    setTheme: vi.fn(),
    theme: 'dark',
    close: vi.fn(),
    clearScreen: vi.fn(),
    clearHistory: vi.fn(),
    history: [],
    cwd: '',
    changeDirectory: vi.fn(),
    onCallSession: { status: 'idle', attempts: 0, hints: 0 },
    updateOnCall: vi.fn(),
    files: {},
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    fetchGeo: vi.fn().mockResolvedValue({ country: '' }),
    fetchStatus: vi.fn().mockResolvedValue({
      checkedAt: '2026-07-10T12:00:00.000Z',
      route: '/',
      build: 'development',
      api: 'operational',
      latencyMs: 12,
    }),
    runAsync: vi.fn(),
    ...overrides,
  };
}

describe('runCommand', () => {
  it('returns nothing for empty input', () => {
    expect(runCommand('', makeContext())).toEqual([]);
    expect(runCommand('   ', makeContext())).toEqual([]);
  });

  it('help lists the available commands', () => {
    const output = runCommand('help', makeContext()).join('\n');
    for (const cmd of ['ls', 'cat', 'open', 'theme', 'clear', 'exit']) {
      expect(output).toContain(cmd);
    }
  });

  it('renders manual pages from the command registry', () => {
    const output = runCommand('man grep', makeContext()).join('\n');
    expect(output).toContain('SYNOPSIS');
    expect(output).toContain('grep [-i] <pattern> [file]');
    expect(runCommand('man nope', makeContext())).toEqual(['No manual entry for nope']);
  });

  it('echoes text back', () => {
    expect(runCommand('echo hello world', makeContext())).toEqual(['hello world']);
  });

  it('reports unknown commands', () => {
    expect(runCommand('frobnicate', makeContext())).toEqual([
      "jsh: command not found: frobnicate (try 'help')",
    ]);
  });

  it('whoami and pwd', () => {
    expect(runCommand('whoami', makeContext())).toEqual(['guest']);
    expect(runCommand('pwd', makeContext())).toEqual(['/home/guest']);
  });

  it('ls lists the virtual files including blog/', () => {
    const output = runCommand('ls', makeContext()).join(' ');
    expect(output).toContain('about.txt');
    expect(output).toContain('blog/');
  });

  it('ls blog lists post slugs', () => {
    const output = runCommand('ls blog', makeContext());
    expect(output.length).toBeGreaterThan(0);
  });

  it('ls of an unknown path errors', () => {
    expect(runCommand('ls nope', makeContext())[0]).toMatch(/No such file or directory/);
  });

  it('cat about.txt prints the bio', () => {
    const output = runCommand('cat about.txt', makeContext()).join('\n');
    expect(output).toContain('Jonathan Yates');
  });

  it('cat of a missing file errors', () => {
    expect(runCommand('cat nope.txt', makeContext())[0]).toMatch(/No such file or directory/);
  });

  it('open navigates to known pages', () => {
    const ctx = makeContext();
    expect(runCommand('open blog', ctx)).toEqual(['→ /blog']);
    expect(ctx.navigate).toHaveBeenCalledWith('/blog');
  });

  it('open home navigates to /', () => {
    const ctx = makeContext();
    runCommand('open home', ctx);
    expect(ctx.navigate).toHaveBeenCalledWith('/');
  });

  it('open of an unknown page errors without navigating', () => {
    const ctx = makeContext();
    expect(runCommand('open nowhere', ctx)[0]).toMatch(/no such page/);
    expect(ctx.navigate).not.toHaveBeenCalled();
  });

  it('cd changes the virtual working directory without navigating', () => {
    const ctx = makeContext({ files: { 'docs/': '' } });
    expect(runCommand('cd docs', ctx)).toEqual([]);
    expect(ctx.changeDirectory).toHaveBeenCalledWith('docs');
    expect(ctx.navigate).not.toHaveBeenCalled();
  });

  it('cd supports parent and home paths', () => {
    const ctx = makeContext({ cwd: 'docs/sub', files: { 'docs/': '', 'docs/sub/': '' } });
    runCommand('cd ..', ctx);
    expect(ctx.changeDirectory).toHaveBeenCalledWith('docs');
    runCommand('cd ~', ctx);
    expect(ctx.changeDirectory).toHaveBeenCalledWith('');
  });

  it('cd rejects files and missing directories', () => {
    const ctx = makeContext({ files: { 'notes.txt': '' } });
    expect(runCommand('cd notes.txt', ctx)[0]).toMatch(/Not a directory/);
    expect(runCommand('cd nowhere', ctx)[0]).toMatch(/No such file or directory/);
  });

  it('theme sets a valid mode', () => {
    const ctx = makeContext();
    expect(runCommand('theme light', ctx)).toEqual(['theme set to light']);
    expect(ctx.setTheme).toHaveBeenCalledWith('light');
  });

  it('theme rejects invalid modes', () => {
    const ctx = makeContext();
    expect(runCommand('theme neon', ctx)[0]).toMatch(/expected 'dark', 'light' or 'system'/);
    expect(ctx.setTheme).not.toHaveBeenCalled();
  });

  it('clear calls clearScreen', () => {
    const ctx = makeContext();
    expect(runCommand('clear', ctx)).toEqual([]);
    expect(ctx.clearScreen).toHaveBeenCalled();
  });

  it('exit closes the terminal', () => {
    const ctx = makeContext();
    runCommand('exit', ctx);
    expect(ctx.close).toHaveBeenCalled();
  });

  it('history prints numbered entries', () => {
    const ctx = makeContext({ history: ['ls', 'help'] });
    expect(runCommand('history', ctx)).toEqual(['  1  ls', '  2  help']);
  });

  it('history -c clears persisted history', () => {
    const ctx = makeContext({ history: ['ls'] });
    expect(runCommand('history -c', ctx)).toEqual([]);
    expect(ctx.clearHistory).toHaveBeenCalledOnce();
  });

  it('touch creates a new empty file', () => {
    const ctx = makeContext();
    expect(runCommand('touch notes.txt', ctx)).toEqual([]);
    expect(ctx.writeFile).toHaveBeenCalledWith('notes.txt', '');
  });

  it('touch on an existing file is a no-op', () => {
    const ctx = makeContext({ files: { 'notes.txt': 'hi' } });
    expect(runCommand('touch notes.txt', ctx)).toEqual([]);
    expect(ctx.writeFile).not.toHaveBeenCalled();
    runCommand('touch about.txt', ctx);
    expect(ctx.writeFile).not.toHaveBeenCalled();
  });

  it('touch rejects invalid file names', () => {
    const ctx = makeContext();
    expect(runCommand('touch ../evil', ctx)[0]).toMatch(/outside \/home\/guest/);
    expect(ctx.writeFile).not.toHaveBeenCalled();
  });

  it('echo > writes a file and echo >> appends', () => {
    const ctx = makeContext();
    expect(runCommand('echo hello world > notes.txt', ctx)).toEqual([]);
    expect(ctx.writeFile).toHaveBeenCalledWith('notes.txt', 'hello world');

    const ctx2 = makeContext({ files: { 'notes.txt': 'line one' } });
    runCommand('echo line two >> notes.txt', ctx2);
    expect(ctx2.writeFile).toHaveBeenCalledWith('notes.txt', 'line one\nline two');
  });

  it('echo > refuses to overwrite built-in files', () => {
    const ctx = makeContext();
    expect(runCommand('echo hax > about.txt', ctx)[0]).toMatch(/read-only/);
    expect(ctx.writeFile).not.toHaveBeenCalled();
  });

  it('cat prints a user file', () => {
    const ctx = makeContext({ files: { 'notes.txt': 'one\ntwo' } });
    expect(runCommand('cat notes.txt', ctx)).toEqual(['one', 'two']);
  });

  it('ls includes user files', () => {
    const ctx = makeContext({ files: { 'zzz.txt': '' } });
    expect(runCommand('ls', ctx)[0]).toContain('zzz.txt');
  });

  it('rm deletes a user file', () => {
    const ctx = makeContext({ files: { 'notes.txt': 'hi' } });
    expect(runCommand('rm notes.txt', ctx)).toEqual([]);
    expect(ctx.deleteFile).toHaveBeenCalledWith('notes.txt');
  });

  it('rm refuses built-ins and missing files', () => {
    const ctx = makeContext();
    expect(runCommand('rm about.txt', ctx)[0]).toMatch(/permission denied/);
    expect(runCommand('rm -rf /', ctx)[0]).toMatch(/permission denied/);
    expect(runCommand('rm -rf ~/', ctx)[0]).toMatch(/permission denied/);
    expect(runCommand('rm nope.txt', ctx)[0]).toMatch(/No such file/);
    expect(ctx.deleteFile).not.toHaveBeenCalled();
  });

  it('mkdir creates a directory', () => {
    const ctx = makeContext();
    expect(runCommand('mkdir docs', ctx)).toEqual([]);
    expect(ctx.writeFile).toHaveBeenCalledWith('docs/', '');
  });

  it('mkdir refuses duplicates and read-only names', () => {
    const ctx = makeContext({ files: { 'docs/': '' } });
    expect(runCommand('mkdir docs', ctx)[0]).toMatch(/File exists/);
    expect(runCommand('mkdir blog', ctx)[0]).toMatch(/read-only/);
    expect(ctx.writeFile).not.toHaveBeenCalled();
  });

  it('mkdir requires an existing parent unless -p is given', () => {
    const ctx = makeContext();
    expect(runCommand('mkdir a/b', ctx)[0]).toMatch(/No such directory/);
    expect(ctx.writeFile).not.toHaveBeenCalled();

    expect(runCommand('mkdir -p a/b', ctx)).toEqual([]);
    expect(ctx.writeFile).toHaveBeenCalledWith('a/', '');
    expect(ctx.writeFile).toHaveBeenCalledWith('a/b/', '');
  });

  it('mkdir caps path depth', () => {
    const ctx = makeContext();
    expect(runCommand('mkdir -p a/b/c/d/e', ctx)[0]).toMatch(/path too deep/);
  });

  it('writes files inside directories, but only existing ones', () => {
    const ctx = makeContext({ files: { 'docs/': '' } });
    runCommand('echo hi > docs/note.txt', ctx);
    expect(ctx.writeFile).toHaveBeenCalledWith('docs/note.txt', 'hi');

    const ctx2 = makeContext();
    expect(runCommand('touch nope/file.txt', ctx2)[0]).toMatch(/No such directory/);
    expect(ctx2.writeFile).not.toHaveBeenCalled();
  });

  it('resolves reads and writes relative to the working directory', () => {
    const ctx = makeContext({
      cwd: 'docs',
      files: { 'docs/': '', 'docs/note.txt': 'hello', 'root.txt': 'root' },
    });
    expect(runCommand('pwd', ctx)).toEqual(['/home/guest/docs']);
    expect(runCommand('cat note.txt', ctx)).toEqual(['hello']);
    expect(runCommand('cat ~/root.txt', ctx)).toEqual(['root']);
    runCommand('echo next > second.txt', ctx);
    expect(ctx.writeFile).toHaveBeenCalledWith('docs/second.txt', 'next');
  });

  it('lists the current and parent directories', () => {
    const ctx = makeContext({
      cwd: 'docs',
      files: { 'docs/': '', 'docs/a.txt': '', 'root.txt': '' },
    });
    expect(runCommand('ls', ctx)).toEqual(['a.txt']);
    expect(runCommand('ls ..', ctx)[0]).toContain('root.txt');
  });

  it('renders trees and finds matching descendants', () => {
    const ctx = makeContext({
      files: {
        'docs/': '',
        'docs/a.txt': '',
        'docs/sub/': '',
        'docs/sub/b.log': '',
      },
    });
    const tree = runCommand('tree docs', ctx).join('\n');
    expect(tree).toContain('a.txt');
    expect(tree).toContain('sub/');
    expect(tree).toContain('b.log');
    expect(runCommand("find docs '*.txt'", ctx)).toEqual(['~/docs/a.txt']);
  });

  it('ls shows directories at the root and lists their contents', () => {
    const ctx = makeContext({
      files: { 'docs/': '', 'docs/a.txt': '', 'docs/sub/': '', 'docs/sub/b.txt': '', 'top.txt': '' },
    });
    const root = runCommand('ls', ctx)[0];
    expect(root).toContain('docs/');
    expect(root).toContain('top.txt');
    expect(root).not.toContain('a.txt');
    expect(runCommand('ls docs', ctx)).toEqual(['a.txt  sub/']);
    expect(runCommand('ls docs/sub', ctx)).toEqual(['b.txt']);
  });

  it('cat on a directory errors', () => {
    const ctx = makeContext({ files: { 'docs/': '' } });
    expect(runCommand('cat docs', ctx)[0]).toMatch(/Is a directory/);
  });

  it('rm needs -r for directories and then removes recursively', () => {
    const ctx = makeContext({ files: { 'docs/': '', 'docs/a.txt': '', 'docs/sub/': '' } });
    expect(runCommand('rm docs', ctx)[0]).toMatch(/Is a directory/);
    expect(ctx.deleteFile).not.toHaveBeenCalled();

    expect(runCommand('rm -r docs', ctx)).toEqual([]);
    expect(ctx.deleteFile).toHaveBeenCalledWith('docs/');
    expect(ctx.deleteFile).toHaveBeenCalledWith('docs/a.txt');
    expect(ctx.deleteFile).toHaveBeenCalledWith('docs/sub/');
  });

  it('rmdir only removes empty directories', () => {
    const ctx = makeContext({ files: { 'docs/': '', 'docs/a.txt': '' } });
    expect(runCommand('rmdir docs', ctx)[0]).toMatch(/not empty/i);

    const ctx2 = makeContext({ files: { 'docs/': '' } });
    expect(runCommand('rmdir docs', ctx2)).toEqual([]);
    expect(ctx2.deleteFile).toHaveBeenCalledWith('docs/');
  });

  it('enforces the file count quota', () => {
    const files = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`f${i}.txt`, ''])
    );
    const ctx = makeContext({ files });
    expect(runCommand('touch one-more.txt', ctx)[0]).toMatch(/too many files/);
    expect(ctx.writeFile).not.toHaveBeenCalled();
  });

  it('sudo easter egg', () => {
    expect(runCommand('sudo make me a sandwich', makeContext())[0]).toMatch(/not in the sudoers file/);
  });

  it('neofetch shows the current theme', () => {
    const output = runCommand('neofetch', makeContext({ theme: 'light' })).join('\n');
    expect(output).toContain('jyates.dev');
    expect(output).toContain('light');
  });

  it('schedules a live status check', () => {
    const runAsync = vi.fn();
    const ctx = makeContext({ runAsync });
    expect(runCommand('status', ctx)).toEqual(['checking live services...']);
    expect(runAsync).toHaveBeenCalledOnce();
  });

  it('queries projects by technology and emits JSON', () => {
    const readable = runCommand('projects --tech go', makeContext()).join('\n');
    expect(readable).toContain('Personal Portfolio');
    const parsed = JSON.parse(runCommand('projects --tech rust --json', makeContext()).join('\n'));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Comprehensive Project Templates');
  });

  it('queries posts by tag', () => {
    expect(runCommand('blog --tag definitely-not-a-tag', makeContext())).toEqual([
      'No posts matched.',
    ]);
    expect(JSON.parse(runCommand('blog --json', makeContext()).join('\n')).length).toBeGreaterThan(0);
  });

  it('queries work history by company', () => {
    const output = runCommand('resume --company amazon', makeContext()).join('\n');
    expect(output).toContain('Software Development Engineer II, Amazon');
    expect(output).not.toContain('INVIDI');
  });

  it('filters the library by category', () => {
    const books = JSON.parse(runCommand('library books --json', makeContext()).join('\n'));
    expect(books.length).toBeGreaterThan(0);
    expect(books.every((item: { category: string }) => item.category === 'books')).toBe(true);
    expect(runCommand('library videos', makeContext())[0]).toMatch(/unknown category/);
    expect(runCommand('library books websites', makeContext())[0]).toMatch(/unexpected argument/);
  });

  it('mounts read-only incident evidence in the virtual filesystem', () => {
    const ctx = makeContext();
    expect(runCommand('ls incident', ctx)[0]).toContain('app.log');
    expect(runCommand('cat incident/deploys.log | grep RETRY', ctx)).toEqual([
      '  RETRY_MAX_ATTEMPTS: 3 -> 12',
      '  RETRY_JITTER_MS:   250 -> 0',
    ]);
    expect(runCommand('rm -r incident', ctx)[0]).toMatch(/permission denied/);
  });

  it('reports deterministic SMART data for the simulated My Book', () => {
    expect(runCommand('smartctl --scan', makeContext())[0]).toContain('/dev/mybook');
    const report = runCommand('smartctl -a /dev/mybook', makeContext()).join('\n');
    expect(report).toContain('PASSED');
    expect(report).toContain('Reallocated_Sector_Ct');
    expect(report).toContain('open blog/wd-smart-reader');
  });

  it('starts and resolves the on-call lab from evidence', () => {
    const start = makeContext();
    expect(runCommand('oncall start', start)[0]).toContain('PAGE');
    expect(start.updateOnCall).toHaveBeenCalledWith({ status: 'active', attempts: 0, hints: 0 });

    const active = makeContext({ onCallSession: { status: 'active', attempts: 1, hints: 1 } });
    const result = runCommand('oncall resolve retry-storm', active).join('\n');
    expect(result).toContain('RESOLVED');
    expect(result).toContain('75/100');
    expect(active.updateOnCall).toHaveBeenCalledWith({ status: 'resolved', attempts: 1, hints: 1 });
  });

  it('rejects unsupported on-call diagnoses and tracks attempts', () => {
    const ctx = makeContext({ onCallSession: { status: 'active', attempts: 0, hints: 0 } });
    expect(runCommand('oncall resolve add-capacity', ctx)[0]).toMatch(/rejected/);
    expect(ctx.updateOnCall).toHaveBeenCalledWith({ status: 'active', attempts: 1, hints: 0 });
  });

  it('neofetch renders the JY block-caps logo (not the old slant art)', () => {
    const output = runCommand('neofetch', makeContext()).join('\n');
    // Distinctive rows of the figlet "standard" JY logo
    expect(output).toContain('| |_| | | |');
    expect(output).toContain(' \\___/  |_|');
    // The old slanted lowercase "jy" had a (_) j-dot — make sure it's gone
    expect(output).not.toContain('(_)');
  });

  it('whereami prints a status line and schedules an async lookup', () => {
    const ctx = makeContext();
    expect(runCommand('whereami', ctx)).toEqual(['locating…']);
    expect(ctx.runAsync).toHaveBeenCalledOnce();
  });

  it('whereami async task formats the fetched location', async () => {
    const ctx = makeContext({
      fetchGeo: vi.fn().mockResolvedValue({
        country: 'US',
        countryName: 'United States',
        city: 'Seattle',
        timeZone: 'America/Los_Angeles',
      }),
    });
    runCommand('whereami', ctx);
    const task = (ctx.runAsync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const lines = await task();
    expect(lines[0]).toContain('Seattle, United States');
    expect(lines.join('\n')).toContain('America/Los_Angeles');
  });

  it('whereami async task handles fetch failure gracefully', async () => {
    const ctx = makeContext({ fetchGeo: vi.fn().mockRejectedValue(new Error('offline')) });
    runCommand('whereami', ctx);
    const task = (ctx.runAsync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect((await task())[0]).toMatch(/could not reach the geo service/);
  });
});

describe('formatGeo', () => {
  it('reports an unavailable location when there is no country', () => {
    expect(formatGeo({ country: '' })[0]).toMatch(/location unavailable/);
  });

  it('includes city, country name, and a flag emoji', () => {
    const lines = formatGeo({ country: 'DE', countryName: 'Germany', city: 'Berlin' });
    expect(lines[0]).toContain('Berlin, Germany');
    expect(lines[0]).toContain('🇩🇪');
  });

  it('omits lat/long when only one is present', () => {
    const lines = formatGeo({ country: 'US', latitude: '47.6' }).join('\n');
    expect(lines).not.toContain('approx');
  });

  it('enriches the country name from the code when the API omits it', () => {
    // CloudFront often sends only the country code for datacenter IPs
    expect(formatGeo({ country: 'GB' })[0]).toContain('United Kingdom');
  });
});

describe('formatStatus', () => {
  const status = {
    checkedAt: '2026-07-10T12:00:00.000Z',
    route: '/projects',
    build: 'abc123',
    api: 'operational' as const,
    latencyMs: 18,
    geo: { country: 'US', countryName: 'United States', city: 'Seattle' },
    visits: { total: 42, countries: [{ country: 'US', countryName: 'United States', count: 42 }] },
  };

  it('formats a readable live summary', () => {
    const output = formatStatus(status).join('\n');
    expect(output).toContain('operational (18 ms)');
    expect(output).toContain('Seattle, United States');
    expect(output).toContain('42 visits from 1 country');
    expect(output).toContain('/projects');
  });

  it('supports machine-readable JSON', () => {
    expect(JSON.parse(formatStatus(status, true).join('\n'))).toMatchObject({
      api: 'operational',
      build: 'abc123',
    });
  });
});

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('echo hello world')).toEqual(['echo', 'hello', 'world']);
  });

  it('groups double-quoted segments and strips the quotes', () => {
    expect(tokenize('echo "hello world" > f')).toEqual(['echo', 'hello world', '>', 'f']);
  });

  it('groups single-quoted segments and strips the quotes', () => {
    expect(tokenize("echo 'a b c'")).toEqual(['echo', 'a b c']);
  });

  it('keeps a quoted redirect char as text', () => {
    expect(tokenize('echo ">" > f')).toEqual(['echo', '>', '>', 'f']);
  });

  it('preserves an empty quoted token', () => {
    expect(tokenize('echo "" > f')).toEqual(['echo', '', '>', 'f']);
  });
});

describe('echo redirection with quotes', () => {
  it('writes the unquoted text, not the quote characters', () => {
    const ctx = makeContext();
    runCommand('echo "hello world" > notes.txt', ctx);
    expect(ctx.writeFile).toHaveBeenCalledWith('notes.txt', 'hello world');
  });

  it('strips single quotes too', () => {
    const ctx = makeContext();
    runCommand("echo 'quoted' > notes.txt", ctx);
    expect(ctx.writeFile).toHaveBeenCalledWith('notes.txt', 'quoted');
  });

  it('still prints unquoted echo unchanged', () => {
    expect(runCommand('echo hello world', makeContext())).toEqual(['hello world']);
  });

  it('does not treat a quoted redirect operator as redirection', () => {
    const ctx = makeContext();
    expect(runCommand('echo ">"', ctx)).toEqual(['>']);
    expect(ctx.writeFile).not.toHaveBeenCalled();
  });
});

describe('pipelines and filters', () => {
  it('splits only on unquoted pipe characters', () => {
    expect(splitPipeline('echo "a|b" | wc -c')).toEqual(['echo "a|b"', 'wc -c']);
    expect(runCommand('echo "a|b"', makeContext())).toEqual(['a|b']);
  });

  it('filters built-in file content through a pipeline', () => {
    const lines = runCommand('cat projects.txt | grep -i go | head -n 1', makeContext());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/go/i);
  });

  it('supports direct file input and reverse sorting', () => {
    const ctx = makeContext({ files: { 'letters.txt': 'b\na\nc' } });
    expect(runCommand('sort -r letters.txt', ctx)).toEqual(['c', 'b', 'a']);
  });

  it('counts pipeline output', () => {
    expect(runCommand('echo one two three | wc -w', makeContext())).toEqual(['3']);
    expect(runCommand('history | tail -n 1', makeContext({ history: ['ls', 'help'] }))).toEqual([
      '  2  help',
    ]);
  });

  it('returns no lines for head or tail with a zero count', () => {
    expect(runCommand('echo hello | head -n 0', makeContext())).toEqual([]);
    expect(runCommand('echo hello | tail -n 0', makeContext())).toEqual([]);
  });

  it('reports malformed pipelines and patterns', () => {
    expect(runCommand('echo hi |', makeContext())[0]).toMatch(/syntax error/);
    expect(runCommand('echo hi | grep [', makeContext())[0]).toMatch(/invalid pattern/);
  });
});

describe('complete (tab completion)', () => {
  it('completes a unique command and adds a trailing space', () => {
    expect(complete('ca', {}).line).toBe('cat ');
  });

  it('extends to the common prefix and lists ambiguous commands', () => {
    const { line, suggestions } = complete('c', {});
    expect(line).toBe('c');
    expect(suggestions).toEqual(expect.arrayContaining(['cat', 'cd', 'clear']));
  });

  it('lists all commands on an empty line', () => {
    const { suggestions } = complete('', {});
    expect(suggestions).toContain('help');
    expect(suggestions).toContain('whereami');
  });

  it('completes theme values', () => {
    expect(complete('theme da', {}).line).toBe('theme dark ');
  });

  it('completes built-in file names for cat', () => {
    expect(complete('cat ab', {}).line).toBe('cat about.txt ');
  });

  it('completes user-created files', () => {
    expect(complete('cat no', { 'notes.txt': 'hi' }).line).toBe('cat notes.txt ');
  });

  it('completes paths relative to the working directory', () => {
    const files = { 'docs/': '', 'docs/note.txt': 'hi' };
    expect(complete('cat no', files, 'docs').line).toBe('cat note.txt ');
    expect(complete('cd do', files).line).toBe('cd docs/ ');
  });

  it('completes blog post slugs under blog/', () => {
    const { line } = complete('open blog/', {});
    expect(line.startsWith('open blog/')).toBe(true);
  });

  it('completes page names for open', () => {
    expect(complete('open ca', {}).line).toBe('open career ');
  });

  it('returns the input unchanged when nothing matches', () => {
    expect(complete('zzz', {})).toEqual({ line: 'zzz', suggestions: [] });
  });

  it('completes the active stage of a pipeline', () => {
    expect(complete('cat about.txt | gre', {}).line).toBe('cat about.txt | grep ');
  });
});
