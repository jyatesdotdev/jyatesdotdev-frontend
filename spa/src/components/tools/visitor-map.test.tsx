import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { describe, it, expect, vi, afterEach } from 'vitest';
import VisitorMap from './visitor-map';
import { flagEmoji } from './iso-countries';

function renderMap() {
  // Fresh SWR cache per render so tests don't share fetched data
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <VisitorMap />
    </SWRConfig>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('flagEmoji', () => {
  it('converts a country code to its flag', () => {
    expect(flagEmoji('US')).toBe('🇺🇸');
    expect(flagEmoji('de')).toBe('🇩🇪');
  });

  it('returns empty string for invalid input', () => {
    expect(flagEmoji('USA')).toBe('');
    expect(flagEmoji('')).toBe('');
  });
});

describe('VisitorMap', () => {
  it('renders the summary and top countries from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          total: 12,
          you: 'US',
          countries: [
            { country: 'US', countryName: 'United States', count: 10 },
            { country: 'DE', countryName: 'Germany', count: 2 },
          ],
        }),
      })
    );

    renderMap();

    await waitFor(() => {
      expect(screen.getByText(/12 hits from 2 countries/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/United States/)).toBeInTheDocument();
    expect(screen.getByText(/◄ you/)).toBeInTheDocument();
    // The world map SVG renders
    expect(screen.getByRole('img', { name: /world map/i })).toBeInTheDocument();
  });

  it('handles an empty dataset', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ total: 0, countries: [] }),
      })
    );

    renderMap();

    await waitFor(() => {
      expect(screen.getByText(/no visits recorded yet/i)).toBeInTheDocument();
    });
  });

  it('shows an error state when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    renderMap();

    await waitFor(() => {
      expect(screen.getByText(/could not load visitor data/i)).toBeInTheDocument();
    });
  });
});
