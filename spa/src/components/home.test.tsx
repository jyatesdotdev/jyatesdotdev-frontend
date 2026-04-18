import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Home } from './home';

describe('Home', () => {
  it('renders correctly with personal details and SEO metadata', async () => {
    render(
      <HelmetProvider>
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      </HelmetProvider>
    );
    
    expect(screen.getByText(/Jonathan Yates/i)).toBeInTheDocument();
    expect(screen.getByText(/Software Development Engineer/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(document.title).toBe('Jonathan Yates | Jonathan Yates');
    });

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription?.getAttribute('content')).toContain('Software Development Engineer at Amazon');
  });
});
