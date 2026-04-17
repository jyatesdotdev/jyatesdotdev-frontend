import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Library } from './library';
import { libraryItems } from '../data/library';

describe('Library', () => {
  it('renders correctly with title and items', () => {
    render(
      <BrowserRouter>
        <Library />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/Library/i)).toBeInTheDocument();
    
    // Check if some library items are rendered
    libraryItems.slice(0, 3).forEach(item => {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    });
  });
});
