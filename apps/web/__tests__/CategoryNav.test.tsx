import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CategoryNav } from '../components/CategoryNav';
import { CATEGORY_TREE } from '../lib/category-tree';

describe('CategoryNav', () => {
  it('renders all 5 category triggers', () => {
    render(<CategoryNav />);
    for (const c of CATEGORY_TREE) {
      expect(
        screen.getByRole('button', { name: new RegExp(`^${c.label}$`, 'i') }),
      ).toBeInTheDocument();
    }
    expect(CATEGORY_TREE).toHaveLength(5);
  });

  it('starts with no menu open', () => {
    render(<CategoryNav />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    for (const c of CATEGORY_TREE) {
      const btn = screen.getByRole('button', {
        name: new RegExp(`^${c.label}$`, 'i'),
      });
      expect(btn).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('opens the mega-menu when a trigger is clicked', () => {
    render(<CategoryNav />);
    const worship = screen.getByRole('button', { name: /^Worship$/i });
    fireEvent.click(worship);
    expect(worship).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    // First Worship item should be present in the panel.
    const firstItemLabel = CATEGORY_TREE[0].items[0].label;
    expect(within(menu).getByText(firstItemLabel)).toBeInTheDocument();
  });

  it('closes the menu when Escape is pressed', () => {
    render(<CategoryNav />);
    const worship = screen.getByRole('button', { name: /^Worship$/i });
    fireEvent.click(worship);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(worship).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggling the same trigger twice closes the panel', () => {
    render(<CategoryNav />);
    const library = screen.getByRole('button', { name: /^Library$/i });
    fireEvent.click(library);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(library);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
