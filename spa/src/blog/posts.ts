import type { ComponentType } from 'react';

export interface PostMetadata {
  title: string;
  publishedAt: string;
  summary: string;
  tags: string[];
  slug: string;
}

export interface PostModule {
  default: ComponentType;
  metadata: Omit<PostMetadata, 'slug'>;
}

const posts = import.meta.glob<PostModule>('./posts/*.mdx', { eager: true });

export function getPosts(): PostMetadata[] {
  return Object.entries(posts)
    .map(([path, module]) => {
      const slug = path.replace('./posts/', '').replace('.mdx', '');
      return {
        ...module.metadata,
        slug,
      };
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function getPostBySlug(slug: string): PostModule | undefined {
  const path = `./posts/${slug}.mdx`;
  return posts[path];
}
