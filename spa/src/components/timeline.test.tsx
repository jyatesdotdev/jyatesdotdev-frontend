import { render, screen } from '@testing-library/react';
import { Timeline } from './timeline';

const mockItems = [
  {
    title: 'Senior Developer',
    company: 'Test Company',
    startDate: '2022-01-01',
    description: ['Did some testing'],
    location: 'Remote',
    logo: '/test.svg'
  }
];

describe('Timeline', () => {
  it('renders company name and job title', () => {
    render(<Timeline items={mockItems} />);
    expect(screen.getByText('Test Company')).toBeInTheDocument();
    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
  });

  it('renders description items', () => {
    render(<Timeline items={mockItems} />);
    expect(screen.getByText('Did some testing')).toBeInTheDocument();
  });
});
