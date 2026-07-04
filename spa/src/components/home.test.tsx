import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { Home } from './home';

describe('Home', () => {
  it('renders correctly with personal details and SEO metadata', async () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/Jonathan Yates/i)).toBeInTheDocument();
    expect(screen.getByText(/Software Development Engineer/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(document.title).toBe('Jonathan Yates');
    });

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription?.getAttribute('content')).toContain('Software Development Engineer at Amazon');
  });
});
