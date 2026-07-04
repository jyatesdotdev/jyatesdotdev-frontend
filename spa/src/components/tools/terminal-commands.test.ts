import { describe, it, expect, vi } from 'vitest';
import { runCommand, formatGeo, type TerminalContext } from './terminal-commands';

function makeContext(overrides: Partial<TerminalContext> = {}): TerminalContext {
  return {
    navigate: vi.fn(),
    setTheme: vi.fn(),
    theme: 'dark',
    close: vi.fn(),
    clearScreen: vi.fn(),
    history: [],
    files: {},
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    fetchGeo: vi.fn().mockResolvedValue({ country: '' }),
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

  it('cd behaves like open', () => {
    const ctx = makeContext();
    runCommand('cd projects', ctx);
    expect(ctx.navigate).toHaveBeenCalledWith('/projects');
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
    expect(runCommand('touch ../evil', ctx)[0]).toMatch(/invalid name/);
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
