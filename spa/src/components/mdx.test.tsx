import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MDXComponents } from './mdx';

describe('MDXComponents', () => {
  it('highlights code using sugar-high', () => {
    const { container } = render(
      <MDXComponents.code>console.log("test")</MDXComponents.code>
    );
    const codeElement = container.querySelector('code');
    expect(codeElement?.innerHTML).toContain('sh__');
  });

  it('renders rounded images', () => {
    const { container } = render(
      <MDXComponents.img src="test.jpg" alt="test" />
    );
    const imgElement = container.querySelector('img');
    expect(imgElement?.className).toContain('rounded-lg');
  });

  it('renders custom links for internal paths', () => {
    const { container } = render(
      <MemoryRouter>
        <MDXComponents.a href="/internal">Internal</MDXComponents.a>
      </MemoryRouter>
    );
    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('/internal');
  });

  it('renders external links with target="_blank"', () => {
    const { container } = render(
      <MemoryRouter>
        <MDXComponents.a href="https://google.com">External</MDXComponents.a>
      </MemoryRouter>
    );
    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toContain('noopener');
  });
});
