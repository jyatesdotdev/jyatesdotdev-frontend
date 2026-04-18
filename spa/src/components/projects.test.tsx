import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Projects } from './projects';

describe('Projects', () => {
  it('renders correctly with projects data', () => {
    render(
      <BrowserRouter>
        <Projects />
      </BrowserRouter>
    );
    
    expect(screen.getByRole('heading', { name: /Projects/i })).toBeInTheDocument();
    expect(screen.getByText(/Personal Portfolio/i)).toBeInTheDocument();
  });
});
