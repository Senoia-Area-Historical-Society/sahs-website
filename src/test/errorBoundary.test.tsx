import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorBoundary from '../components/ErrorBoundary';

function Boom(): React.ReactElement { throw new Error('chunk failed'); }

describe('ErrorBoundary', () => {
  it('renders the fallback instead of unmounting the tree when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <div>
        <p>sibling survives</p>
        <ErrorBoundary label="test" fallback={<span>map unavailable</span>}>
          <Boom />
        </ErrorBoundary>
      </div>
    );
    expect(screen.getByText('map unavailable')).toBeTruthy();
    expect(screen.getByText('sibling survives')).toBeTruthy();
    spy.mockRestore();
  });

  it('renders children normally when they do not throw', () => {
    render(<ErrorBoundary label="test" fallback={<span>nope</span>}><span>ok</span></ErrorBoundary>);
    expect(screen.getByText('ok')).toBeTruthy();
  });
});
