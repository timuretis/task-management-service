import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('shows the page title', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Task Management' })).toBeInTheDocument();
  });
});
