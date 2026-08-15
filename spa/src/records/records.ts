import type { ComponentType } from 'react';

export interface RecordMetadata {
  title: string;
  publishedAt: string;
  summary: string;
  tags: string[];
  draft?: boolean;
  slug: string;
}

export interface RecordModule {
  default: ComponentType;
  metadata: Omit<RecordMetadata, 'slug'>;
}

const records = import.meta.glob<RecordModule>('./records/*.mdx', { eager: true });

/** Builds the sorted record list from glob modules, excluding drafts. Exported for tests. */
export function toRecordList(modules: Record<string, RecordModule>): RecordMetadata[] {
  return Object.entries(modules)
    .filter(([, module]) => module.metadata.draft !== true)
    .map(([path, module]) => {
      const slug = path.replace('./records/', '').replace('.mdx', '');
      return {
        ...module.metadata,
        slug,
      };
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

/**
 * Resolves a single record module, gating drafts the same way the blog does:
 * drafts are only served in dev. Exported for tests.
 */
export function resolveRecordModule(
  module: RecordModule | undefined,
  allowDrafts: boolean
): RecordModule | undefined {
  if (!module) return undefined;
  if (module.metadata.draft === true && !allowDrafts) return undefined;
  return module;
}

export function getRecords(): RecordMetadata[] {
  return toRecordList(records);
}

export function getRecordBySlug(slug: string): RecordModule | undefined {
  const path = `./records/${slug}.mdx`;
  return resolveRecordModule(records[path], import.meta.env.DEV);
}
