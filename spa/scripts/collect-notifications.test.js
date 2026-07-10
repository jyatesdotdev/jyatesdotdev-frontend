import { describe, expect, it } from 'vitest';
import {
  blogEventFromSource,
  collectProjectEvents,
  extractProjects,
  shouldPublishBlogEvent,
} from './collect-notifications.js';

const previousProjects = `
export const projects = [
  { id: 'existing', title: 'Existing', description: 'Already there', technologies: ['Go'], github: 'https://github.com/example/existing' },
];`;

const currentProjects = `
export const projects = [
  { id: 'existing', title: 'Existing', description: 'Already there', technologies: ['Go'], github: 'https://github.com/example/existing' },
  {
    id: 'new-tool',
    title: 'New Tool',
    description: 'A structured parser test.',
    technologies: ['TypeScript', 'AWS'],
    github: 'https://github.com/example/new-tool',
  },
];`;

describe('collect-notifications', () => {
  it('extracts typed project data through the TypeScript AST', () => {
    expect(extractProjects(currentProjects)[1]).toEqual({
      id: 'new-tool',
      title: 'New Tool',
      description: 'A structured parser test.',
      technologies: ['TypeScript', 'AWS'],
      github: 'https://github.com/example/new-tool',
    });
  });

  it('emits events only for newly added projects', () => {
    expect(collectProjectEvents(previousProjects, currentProjects)).toEqual([
      {
        topic: 'projects',
        title: 'New Tool',
        summary: 'A structured parser test.',
        url: 'https://jyates.dev/projects',
      },
    ]);
  });

  it('does not treat a project rename as a new project', () => {
    const renamed = currentProjects.replace("title: 'Existing'", "title: 'Renamed'");
    expect(collectProjectEvents(currentProjects, renamed)).toEqual([]);
  });

  it('does not announce existing projects when stable IDs are introduced', () => {
    const legacy = previousProjects.replace("id: 'existing', ", '');
    expect(collectProjectEvents(legacy, previousProjects)).toEqual([]);
  });

  it('parses published post frontmatter', () => {
    const event = blogEventFromSource(
      `---\ntitle: A Post\nsummary: Useful details.\npublishedAt: 2026-07-10\n---\nBody`,
      'a-post'
    );
    expect(event).toEqual({
      topic: 'blog',
      title: 'A Post',
      summary: 'Useful details.',
      url: 'https://jyates.dev/blog/a-post',
    });
  });

  it('does not publish draft posts', () => {
    expect(
      blogEventFromSource(
        `---\ntitle: Draft\nsummary: Not ready.\ndraft: true\n---\nBody`,
        'draft'
      )
    ).toBeUndefined();
  });

  it('normalizes a trailing slash in the site URL', () => {
    expect(
      blogEventFromSource(
        `---\ntitle: A Post\nsummary: Useful details.\n---\nBody`,
        'a-post',
        'https://jyates.dev/'
      )?.url
    ).toBe('https://jyates.dev/blog/a-post');
  });

  it('publishes a post when a committed draft becomes public', () => {
    const draft = `---\ntitle: A Post\nsummary: Useful details.\ndraft: true\n---\nBody`;
    const published = `---\ntitle: A Post\nsummary: Useful details.\ndraft: false\n---\nBody`;
    expect(shouldPublishBlogEvent(draft, published)).toBe(true);
    expect(shouldPublishBlogEvent(published, published)).toBe(false);
    expect(shouldPublishBlogEvent(undefined, published)).toBe(true);
  });
});
