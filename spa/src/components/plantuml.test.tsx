import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PlantUML } from './plantuml';

vi.mock('plantuml-encoder', () => ({
  default: { encode: () => 'SoWkIImgAStDuNBAJrBGjLDmpCbCJbMmKiX8pSd9vt98pKi1IW80' },
  encode: () => 'SoWkIImgAStDuNBAJrBGjLDmpCbCJbMmKiX8pSd9vt98pKi1IW80',
}));

describe('PlantUML', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as any;
    render(<PlantUML>{'@startuml\nA -> B\n@enduml'}</PlantUML>);
    expect(screen.getByText('Loading diagram…')).toBeInTheDocument();
  });

  it('renders diagram on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<svg xmlns="http://www.w3.org/2000/svg"><text>test</text></svg>'),
    }) as any;

    render(<PlantUML>{'@startuml\nA -> B\n@enduml'}</PlantUML>);

    await waitFor(() => {
      const img = screen.getByAltText('PlantUML diagram');
      expect(img).toBeInTheDocument();
      expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml;base64,/);
    });
  });

  it('falls back to code block on error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fail')) as any;

    render(<PlantUML>{'@startuml\nA -> B\n@enduml'}</PlantUML>);

    await waitFor(() => {
      expect(screen.getByRole('code')).toBeInTheDocument();
    });
  });
});
