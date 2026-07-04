import { describe, it, expect } from 'vitest';
import { toPostList, resolvePostModule, getPosts, type PostModule } from './posts';

function makeModule(overrides: Partial<PostModule['metadata']> = {}): PostModule {
  return {
    default: () => null,
    metadata: {
      title: 'A Post',
      publishedAt: '2025-01-01',
      summary: 'A summary.',
      tags: ['tag'],
      ...overrides,
    },
  };
}

describe('toPostList', () => {
  it('derives slugs from file paths and sorts by publishedAt descending', () => {
    const list = toPostList({
      './posts/older.mdx': makeModule({ publishedAt: '2024-01-01' }),
      './posts/newer.mdx': makeModule({ publishedAt: '2025-06-01' }),
    });

    expect(list.map((p) => p.slug)).toEqual(['newer', 'older']);
  });

  it('excludes drafts', () => {
    const list = toPostList({
      './posts/published.mdx': makeModule(),
      './posts/draft.mdx': makeModule({ draft: true }),
    });

    expect(list.map((p) => p.slug)).toEqual(['published']);
  });

  it('includes posts with an explicit draft: false', () => {
    const list = toPostList({
      './posts/explicit.mdx': makeModule({ draft: false }),
    });

    expect(list.map((p) => p.slug)).toEqual(['explicit']);
  });
});

describe('resolvePostModule', () => {
  it('returns undefined for a missing module', () => {
    expect(resolvePostModule(undefined, true)).toBeUndefined();
    expect(resolvePostModule(undefined, false)).toBeUndefined();
  });

  it('returns published posts regardless of draft gating', () => {
    const module = makeModule();
    expect(resolvePostModule(module, false)).toBe(module);
    expect(resolvePostModule(module, true)).toBe(module);
  });

  it('returns drafts only when drafts are allowed (dev preview)', () => {
    const draft = makeModule({ draft: true });
    expect(resolvePostModule(draft, true)).toBe(draft);
    expect(resolvePostModule(draft, false)).toBeUndefined();
  });
});

describe('getPosts', () => {
  it('never returns drafts from the real post registry', () => {
    for (const post of getPosts()) {
      expect(post.draft).not.toBe(true);
      expect(post.slug).toBeTruthy();
      expect(post.title).toBeTruthy();
    }
  });
});
