import { render, screen } from '@testing-library/react';
import { HealthBadge } from './HealthBadge';

describe('HealthBadge', () => {
  it('says it is checking before the first answer', () => {
    render(<HealthBadge isLoading isOnline={false} />);

    expect(screen.getByRole('status')).toHaveTextContent('Checking API…');
  });

  it('says the API is online', () => {
    render(<HealthBadge isLoading={false} isOnline />);

    expect(screen.getByRole('status')).toHaveTextContent('API online');
  });

  it('says the API is offline', () => {
    render(<HealthBadge isLoading={false} isOnline={false} />);

    expect(screen.getByRole('status')).toHaveTextContent('API offline');
  });
});
