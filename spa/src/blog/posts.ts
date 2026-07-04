import type { ComponentType } from 'react';

export interface PostMetadata {
  title: string;
  publishedAt: string;
  summary: string;
  tags: string[];
  draft?: boolean;
  slug: string;
}

export interface PostModule {
  default: ComponentType;
  metadata: Omit<PostMetadata, 'slug'>;
}

const posts = import.meta.glob<PostModule>('./posts/*.mdx', { eager: true });

/** Builds the sorted post list from glob modules, excluding drafts. Exported for tests. */
export function toPostList(modules: Record<string, PostModule>): PostMetadata[] {
  return Object.entries(modules)
    .filter(([, module]) => module.metadata.draft !== true)
    .map(([path, module]) => {
      const slug = path.replace('./posts/', '').replace('.mdx', '');
      return {
        ...module.metadata,
        slug,
      };
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

/**
 * Resolves a single post module, gating drafts. Drafts are only served when
 * `allowDrafts` is true (dev preview); in prod they must resolve to undefined
 * because the MDX glob bundles every post and the SPA 404-fallback would
 * otherwise render drafts client-side even without prerendered HTML.
 * Exported for tests.
 */
export function resolvePostModule(
  module: PostModule | undefined,
  allowDrafts: boolean
): PostModule | undefined {
  if (!module) return undefined;
  if (module.metadata.draft === true && !allowDrafts) return undefined;
  return module;
}

export function getPosts(): PostMetadata[] {
  return toPostList(posts);
}

export function getPostBySlug(slug: string): PostModule | undefined {
  const path = `./posts/${slug}.mdx`;
  return resolvePostModule(posts[path], import.meta.env.DEV);
}
