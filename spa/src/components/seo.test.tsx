import { render, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SEO } from './seo';

describe('SEO Component', () => {
  it('updates the document title and meta description', async () => {
    render(
      <SEO
        title="Test Title"
        description="Test description."
      />
    );

    await waitFor(() => {
      expect(document.title).toBe('Test Title | Jonathan Yates');
    });

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription?.getAttribute('content')).toBe('Test description.');
  });

  it('sets Open Graph tags', async () => {
    render(
      <SEO
        title="OG Title"
        description="OG Description"
        url="https://jyates.dev/test"
        image="/test-image.jpg"
      />
    );

    await waitFor(() => {
      expect(document.title).toBe('OG Title | Jonathan Yates');
    });

    const ogTitle = document.querySelector('meta[property="og:title"]');
    expect(ogTitle?.getAttribute('content')).toBe('OG Title');

    const ogDescription = document.querySelector('meta[property="og:description"]');
    expect(ogDescription?.getAttribute('content')).toBe('OG Description');

    const ogUrl = document.querySelector('meta[property="og:url"]');
    expect(ogUrl?.getAttribute('content')).toBe('https://jyates.dev/test');

    const ogImage = document.querySelector('meta[property="og:image"]');
    expect(ogImage?.getAttribute('content')).toBe('https://jyates.dev/test-image.jpg');
  });

  it('hoists metadata tags into the document head', async () => {
    render(<SEO title="Head Test" />);

    await waitFor(() => {
      expect(document.head.querySelector('title')?.textContent).toBe('Head Test | Jonathan Yates');
    });
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://jyates.dev'
    );
    expect(document.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe(
      'summary_large_image'
    );
  });
});
