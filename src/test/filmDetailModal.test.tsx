import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FilmDetailModal from '../components/film/FilmDetailModal';
import { SENOIA_FILM_CATALOG } from '../data/senoiaFilms';

const film = SENOIA_FILM_CATALOG[0];
const ui = (onClose: () => void, f: typeof film | null = film) => (
  <MemoryRouter>
    <FilmDetailModal film={f} onClose={onClose} />
  </MemoryRouter>
);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.style.overflow = '';
});

describe('FilmDetailModal', () => {
  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(ui(onClose));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wraps Tab from the last control to the first, and Shift+Tab back', () => {
    render(ui(vi.fn()));
    const dialog = screen.getByRole('dialog');
    const controls = Array.from(
      dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    );
    const first = controls[0];
    const last = controls[controls.length - 1];

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('pulls focus back in if it has escaped the dialog', () => {
    render(
      <>
        <button>outside</button>
        {ui(vi.fn())}
      </>
    );
    screen.getByText('outside').focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('does not reset focus or scroll lock when the parent re-renders with a new onClose', () => {
    vi.useFakeTimers();
    const { rerender } = render(ui(() => {}));
    act(() => {
      vi.advanceTimersByTime(60);
    });
    const closeBtn = screen.getByLabelText('Close dialog');
    expect(document.activeElement).toBe(closeBtn);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(ui(() => {})); // fresh function identity, as the page passes every render
    expect(document.activeElement).toBe(closeBtn);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores scroll and focus to the opener on close', () => {
    vi.useFakeTimers();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = render(ui(vi.fn()));
    act(() => {
      vi.advanceTimersByTime(60);
    });
    rerender(ui(vi.fn(), null));

    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
