/**
 * NOTIF-15 — the darshan "Set reminder" bell promised a notification that is
 * never sent.
 *
 * Both surfaces wrote an id into localStorage['poojly_darshan_reminders'] and
 * then announced "Reminder set for <temple>". Nothing else happened: no API
 * call, no push subscription, no schedule row, no cron step. The server has a
 * PushSubscription table, a working FCM sender and a running notification
 * cron, but there is no DarshanReminder model and no endpoint to write one, so
 * nothing downstream could ever fire. A control that silently does nothing is
 * worse than no control — the devotee stops watching the clock because they
 * were told they would be told.
 *
 * Until the reminder is actually delivered, the control must describe what it
 * really does: save the slot on this device. These tests assert the promise is
 * gone from what the user reads and from what a screen reader announces —
 * deliberately through rendered output, not by scanning the source, so a
 * comment mentioning the old wording cannot pass or fail them.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { DarshanStream } from '../lib/api';

import DarshanScheduleRemindButton from '../components/DarshanScheduleRemindButton';
import DarshanBrowser from '../components/DarshanBrowser';

const PROMISE = /remind|notify|notification|alert me/i;

const SCHEDULED: DarshanStream = {
  id: 'stream-1',
  templeId: 'temple-1',
  playbackUrl: '',
  status: 'scheduled',
  viewerCount: 0,
  peakViewers: 0,
  isPremium: false,
  scheduledStart: '18:30',
  temple: {
    name: 'Kashi Vishwanath',
    slug: 'kashi-vishwanath',
    city: 'Varanasi',
    deityPrimary: 'Shiva',
    images: [],
  },
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('NOTIF-15 — the darshan schedule bell does not promise a notification', () => {
  it('does not offer to set a reminder before it is pressed', () => {
    render(<DarshanScheduleRemindButton reminderId="r1" label="Kashi sandhya aarti" />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label') ?? '').not.toMatch(PROMISE);
  });

  it('announces that the slot was saved on the device, not that a reminder was set', () => {
    render(<DarshanScheduleRemindButton reminderId="r1" label="Kashi sandhya aarti" />);
    fireEvent.click(screen.getByRole('button'));

    const status = screen.getByRole('status');
    expect(status.textContent ?? '').not.toMatch(PROMISE);
    expect(status.textContent ?? '').toMatch(/saved/i);
  });

  it('still persists the selection under the existing storage key', () => {
    render(<DarshanScheduleRemindButton reminderId="r1" label="Kashi sandhya aarti" />);
    fireEvent.click(screen.getByRole('button'));
    expect(
      JSON.parse(window.localStorage.getItem('poojly_darshan_reminders') ?? '[]'),
    ).toEqual(['r1']);
  });

  it('is reversible and says so honestly', () => {
    render(<DarshanScheduleRemindButton reminderId="r1" label="Kashi sandhya aarti" />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByRole('status').textContent ?? '').not.toMatch(PROMISE);
    expect(
      JSON.parse(window.localStorage.getItem('poojly_darshan_reminders') ?? '[]'),
    ).toEqual([]);
  });
});

describe('NOTIF-15 — the upcoming-streams browser carries the same bell', () => {
  it('does not label the control "Remind Me"', () => {
    render(<DarshanBrowser liveStreams={[]} scheduledStreams={[SCHEDULED]} />);
    const buttons = screen.getAllByRole('button');
    const named = buttons.map((b) => b.textContent ?? '').join(' | ');
    expect(named).not.toMatch(PROMISE);
  });

  it('announces a save, not a reminder, when pressed', () => {
    render(<DarshanBrowser liveStreams={[]} scheduledStreams={[SCHEDULED]} />);
    const save = screen.getByRole('button', { name: /save/i });
    fireEvent.click(save);
    const status = screen.getByRole('status');
    expect(status.textContent ?? '').not.toMatch(PROMISE);
    expect(status.textContent ?? '').toMatch(/saved/i);
  });
});
