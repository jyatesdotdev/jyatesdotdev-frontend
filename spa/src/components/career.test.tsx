import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { Career } from './career';
import { careerItems } from '../data/career';

describe('Career', () => {
  it('renders correctly with title and items', () => {
    render(
      <BrowserRouter>
        <Career />
      </BrowserRouter>
    );
    
    expect(screen.getByRole('heading', { level: 1, name: /Career Timeline/i })).toBeInTheDocument();
    
    // Check if some career items are rendered
    careerItems.slice(0, 3).forEach(item => {
      expect(screen.getByText(item.title)).toBeInTheDocument();
      if (item.company) {
        expect(screen.getByText(item.company)).toBeInTheDocument();
      }
    });
  });
});
