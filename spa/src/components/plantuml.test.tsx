import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PlantUML } from './plantuml';
import { fnv1aHex } from '../lib/hash';

const ENCODED = 'SoWkIImgAStDuNBAJrBGjLDmpCbCJbMmKiX8pSd9vt98pKi1IW80';

vi.mock('plantuml-encoder', () => ({
  default: { encode: () => ENCODED },
  encode: () => ENCODED,
}));

const SOURCE = '@startuml\nA -> B\n@enduml';

describe('PlantUML', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders loading state initially', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    render(<PlantUML>{SOURCE}</PlantUML>);
    expect(screen.getByText('Loading diagram…')).toBeInTheDocument();
  });

  it('renders diagram on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<svg xmlns="http://www.w3.org/2000/svg"><text>test</text></svg>'),
    }) as unknown as typeof fetch;

    render(<PlantUML>{SOURCE}</PlantUML>);

    await waitFor(() => {
      const img = screen.getByAltText('PlantUML diagram');
      expect(img).toBeInTheDocument();
      expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml;base64,/);
    });
  });

  it('fetches from plantuml.com in dev', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<svg xmlns="http://www.w3.org/2000/svg" />'),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<PlantUML>{SOURCE}</PlantUML>);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`https://www.plantuml.com/plantuml/svg/${ENCODED}`);
    });
  });

  it('fetches the prebuilt local SVG in prod', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<svg xmlns="http://www.w3.org/2000/svg" />'),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<PlantUML>{SOURCE}</PlantUML>);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`/diagrams/${fnv1aHex(SOURCE)}.svg`);
    });
  });

  it('falls back to code block on error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fail')) as unknown as typeof fetch;

    render(<PlantUML>{SOURCE}</PlantUML>);

    await waitFor(() => {
      expect(screen.getByRole('code')).toBeInTheDocument();
    });
  });

  it('falls back to code block when the prebuilt SVG is missing in prod', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    }) as unknown as typeof fetch;

    render(<PlantUML>{SOURCE}</PlantUML>);

    await waitFor(() => {
      expect(screen.getByRole('code')).toBeInTheDocument();
    });
  });
});
