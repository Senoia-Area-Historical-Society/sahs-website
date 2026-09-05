import { describe, it, expect } from 'vitest';
import { shouldSkipCalendarWrites } from '../../functions/src/calendarGuard';

/**
 * The behaviour these pin is "a local run must not touch the members' calendar."
 *
 * A unit test cannot prove the guard fires inside the emulator — that depends on the
 * emulator actually populating FUNCTIONS_EMULATOR in the function runtime, which is a
 * property of the runtime, not of this function. That half was verified by hand against
 * a running emulator; see the note in calendarGuard.ts. What is pinned here is the
 * decision itself, including the escape hatch, so neither can be dropped silently.
 */
describe('shouldSkipCalendarWrites', () => {
  it('suppresses writes when the functions emulator is running', () => {
    expect(shouldSkipCalendarWrites({ FUNCTIONS_EMULATOR: 'true' })).toBe(true);
  });

  it('allows writes in a deployed runtime', () => {
    expect(shouldSkipCalendarWrites({})).toBe(false);
  });

  it('does not read the value, only the presence — the emulator has set both "true" and "1"', () => {
    expect(shouldSkipCalendarWrites({ FUNCTIONS_EMULATOR: '1' })).toBe(true);
  });

  it('lets an explicit opt-in beat the guard, so the sync stays testable on purpose', () => {
    expect(
      shouldSkipCalendarWrites({ FUNCTIONS_EMULATOR: 'true', ALLOW_EMULATOR_CALENDAR_WRITES: '1' })
    ).toBe(false);
  });

  it('treats an empty opt-in as unset, so `ALLOW_EMULATOR_CALENDAR_WRITES=` does not silently re-arm production writes', () => {
    expect(
      shouldSkipCalendarWrites({ FUNCTIONS_EMULATOR: 'true', ALLOW_EMULATOR_CALENDAR_WRITES: '' })
    ).toBe(true);
  });
});
