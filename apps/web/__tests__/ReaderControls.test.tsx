import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReaderControls, __testing } from '../components/books/ReaderControls';
import { DEFAULT_READER_PREFERENCES, type ReaderPreferences } from '@poojly/shared';

describe('ReaderControls', () => {
  it('exposes 3 themes and 4 sizes', () => {
    expect(__testing.THEMES.map((t) => t.key)).toEqual(['saffron', 'sepia', 'night']);
    expect(__testing.SIZES).toEqual(['sm', 'md', 'lg', 'xl']);
  });

  it('panel is hidden until trigger pressed', () => {
    render(<ReaderControls prefs={DEFAULT_READER_PREFERENCES} onChange={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens settings dialog on trigger click', () => {
    render(<ReaderControls prefs={DEFAULT_READER_PREFERENCES} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /reader settings/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onChange when a theme button is clicked', () => {
    const onChange = vi.fn();
    render(<ReaderControls prefs={DEFAULT_READER_PREFERENCES} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /reader settings/i }));
    fireEvent.click(screen.getByRole('button', { name: /^night$/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining<Partial<ReaderPreferences>>({ theme: 'night' })
    );
  });

  it('toggles sanskrit visibility', () => {
    const onChange = vi.fn();
    const prefs: ReaderPreferences = { ...DEFAULT_READER_PREFERENCES, showSanskrit: true };
    render(<ReaderControls prefs={prefs} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /reader settings/i }));
    const sanskritSwitch = screen.getByRole('switch', { name: /sanskrit/i });
    expect(sanskritSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(sanskritSwitch);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ showSanskrit: false })
    );
  });

  it('reflects current font size as pressed', () => {
    const prefs: ReaderPreferences = { ...DEFAULT_READER_PREFERENCES, fontSize: 'lg' };
    render(<ReaderControls prefs={prefs} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /reader settings/i }));
    const sizeButtons = screen.getAllByRole('button', { name: 'Aa' });
    // Order: sm, md, lg, xl. lg index = 2.
    expect(sizeButtons[2]).toHaveAttribute('aria-pressed', 'true');
    expect(sizeButtons[0]).toHaveAttribute('aria-pressed', 'false');
  });
});
