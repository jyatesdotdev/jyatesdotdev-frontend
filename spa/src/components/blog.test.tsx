import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Blog } from './blog';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as posts from '../blog/posts';

// Mock the posts utility
vi.mock('../blog/posts', () => ({
  getPosts: vi.fn(() => [
    {
      title: 'Mock Post 1',
      publishedAt: '2024-04-14',
      summary: 'Summary 1',
      tags: ['react', 'test'],
      slug: 'mock-post-1',
    },
    {
      title: 'Mock Post 2',
      publishedAt: '2024-04-13',
      summary: 'Summary 2',
      tags: ['aws'],
      slug: 'mock-post-2',
    },
  ]),
}));

const mockLargePosts: posts.PostMetadata[] = Array.from({ length: 15 }, (_, i) => ({
  slug: `post-${i + 1}`,
  title: `Post ${i + 1}`,
  publishedAt: '2024-04-14',
  summary: `Summary ${i + 1}`,
  tags: i < 5 ? ['react'] : ['aws'],
}));

describe('Blog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders blog title and posts', () => {
    render(
      <BrowserRouter>
        <Blog />
      </BrowserRouter>
    );

    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('Mock Post 1')).toBeInTheDocument();
    expect(screen.getByText('Summary 1')).toBeInTheDocument();
    expect(screen.getByText('Mock Post 2')).toBeInTheDocument();
    expect(screen.getByText('Summary 2')).toBeInTheDocument();
  });

  it('filters posts by tag', () => {
    render(
      <MemoryRouter initialEntries={['/blog?tag=react']}>
        <Blog />
      </MemoryRouter>
    );

    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('Mock Post 1')).toBeInTheDocument();
    expect(screen.queryByText('Mock Post 2')).not.toBeInTheDocument();
  });

  it('renders relative dates', () => {
    vi.setSystemTime(new Date('2024-06-14'));
    render(
      <BrowserRouter>
        <Blog />
      </BrowserRouter>
    );

    const dates = screen.getAllByText('2mo ago');
    expect(dates.length).toBe(2);
  });

  it('handles pagination', () => {
    vi.mocked(posts.getPosts).mockReturnValue(mockLargePosts);

    render(
      <MemoryRouter initialEntries={['/blog']}>
        <Blog />
      </MemoryRouter>
    );

    // Should render first 10 posts
    expect(screen.getByText('Post 1')).toBeInTheDocument();
    expect(screen.getByText('Post 10')).toBeInTheDocument();
    expect(screen.queryByText('Post 11')).not.toBeInTheDocument();

    // Should show pagination
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });
});
