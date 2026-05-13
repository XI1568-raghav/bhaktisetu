import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import OnboardingModal from '../components/OnboardingModal';
import {
  ONBOARDING_LANGUAGE_KEY,
  ONBOARDING_STORAGE_KEY,
  getOnboarding,
} from '../lib/onboarding-store';

describe('OnboardingModal', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Stub location.assign so jsdom does not throw on completion redirect.
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: vi.fn() },
      writable: true,
    });
  });

  it('renders nothing when open=false', () => {
    const { container } = render(<OnboardingModal open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders step 1 (intent picker) on first open', () => {
    render(<OnboardingModal open onClose={() => {}} />);
    expect(screen.getByText(/what brings you here/i)).toBeInTheDocument();
    expect(screen.getByText('Live Darshan')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('selecting an intent advances to step 2 (language)', () => {
    render(<OnboardingModal open onClose={() => {}} />);
    fireEvent.click(screen.getByText('Live Darshan'));
    expect(screen.getByText(/choose your language/i)).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    const persisted = getOnboarding();
    expect(persisted?.primaryIntent).toBe('darshan');
    expect(persisted?.currentStep).toBe(1);
  });

  it('Back from step 2 returns to step 1', () => {
    render(<OnboardingModal open onClose={() => {}} />);
    fireEvent.click(screen.getByText('Live Darshan'));
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('selecting a language advances to step 3 and writes both keys', () => {
    render(<OnboardingModal open onClose={() => {}} />);
    fireEvent.click(screen.getByText('Live Darshan'));
    fireEvent.click(screen.getByText('हिन्दी'));
    expect(screen.getByText(/where are you based/i)).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    expect(window.localStorage.getItem(ONBOARDING_LANGUAGE_KEY)).toBe('hi');
    expect(getOnboarding()?.lang).toBe('hi');
  });

  it('disabled languages do not advance the flow', () => {
    render(<OnboardingModal open onClose={() => {}} />);
    fireEvent.click(screen.getByText('Live Darshan'));
    fireEvent.click(screen.getByText('தமிழ்'));
    // Still on step 2 — Tamil is not active.
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  });

  it('completing step 3 writes the full state and closes', () => {
    const onClose = vi.fn();
    render(<OnboardingModal open onClose={onClose} />);
    fireEvent.click(screen.getByText('Live Darshan'));
    fireEvent.click(screen.getByText('हिन्दी'));
    fireEvent.click(screen.getByText('Outside India'));
    expect(onClose).toHaveBeenCalled();
    const final = getOnboarding();
    expect(final?.primaryIntent).toBe('darshan');
    expect(final?.lang).toBe('hi');
    expect(final?.isNri).toBe(true);
    expect(final?.currentStep).toBe(3);
    expect(final?.completedAt).toBeTruthy();
  });

  it('Skip closes and persists what was selected so far', () => {
    const onClose = vi.fn();
    render(<OnboardingModal open onClose={onClose} />);
    fireEvent.click(screen.getByText('Live Darshan'));
    // On step 2 — skip without choosing a language.
    fireEvent.click(screen.getByText('Skip'));
    expect(onClose).toHaveBeenCalled();
    const persisted = getOnboarding();
    expect(persisted?.primaryIntent).toBe('darshan');
    expect(persisted?.lang).toBeNull();
    // Storage is intact, not cleared.
    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).not.toBeNull();
  });

  it('close button (X) calls onClose without clearing state', () => {
    const onClose = vi.fn();
    render(<OnboardingModal open onClose={onClose} />);
    fireEvent.click(screen.getByText('Live Darshan'));
    fireEvent.click(screen.getByLabelText(/close onboarding/i));
    expect(onClose).toHaveBeenCalled();
    expect(getOnboarding()?.primaryIntent).toBe('darshan');
  });
});
