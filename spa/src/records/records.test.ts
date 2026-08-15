import { describe, it, expect } from 'vitest';
import { toRecordList, resolveRecordModule, getRecords, type RecordModule } from './records';

function makeModule(overrides: Partial<RecordModule['metadata']> = {}): RecordModule {
  return {
    default: () => null,
    metadata: {
      title: 'A Record',
      publishedAt: '2025-01-01',
      summary: 'A summary.',
      tags: ['tag'],
      ...overrides,
    },
  };
}

describe('toRecordList', () => {
  it('derives slugs from file paths and sorts by publishedAt descending', () => {
    const list = toRecordList({
      './records/older.mdx': makeModule({ publishedAt: '2024-01-01' }),
      './records/newer.mdx': makeModule({ publishedAt: '2025-06-01' }),
    });

    expect(list.map((r) => r.slug)).toEqual(['newer', 'older']);
  });

  it('excludes drafts', () => {
    const list = toRecordList({
      './records/published.mdx': makeModule(),
      './records/draft.mdx': makeModule({ draft: true }),
    });

    expect(list.map((r) => r.slug)).toEqual(['published']);
  });
});

describe('resolveRecordModule', () => {
  it('returns undefined for a missing module', () => {
    expect(resolveRecordModule(undefined, true)).toBeUndefined();
    expect(resolveRecordModule(undefined, false)).toBeUndefined();
  });

  it('returns published records regardless of draft gating', () => {
    const module = makeModule();
    expect(resolveRecordModule(module, false)).toBe(module);
    expect(resolveRecordModule(module, true)).toBe(module);
  });

  it('returns drafts only when drafts are allowed (dev preview)', () => {
    const draft = makeModule({ draft: true });
    expect(resolveRecordModule(draft, true)).toBe(draft);
    expect(resolveRecordModule(draft, false)).toBeUndefined();
  });
});

describe('getRecords', () => {
  it('never returns drafts from the real record registry', () => {
    for (const record of getRecords()) {
      expect(record.draft).not.toBe(true);
      expect(record.slug).toBeTruthy();
      expect(record.title).toBeTruthy();
    }
  });
});
