/**
 * Keeps the Functions emulator from writing to the real Google Calendar.
 *
 * This is the same class of hazard as the Storage one in CLAUDE.md, and it has the
 * worse blast radius. `npm run emulators` runs `onPostWritten` for real, and there is
 * no Google Calendar emulator — `getCalendarAuth()` builds a `GoogleAuth` from
 * Application Default Credentials, so an insert from a *local* seed lands on the live
 * SAHS Membership Calendar, where members see it. The emulator warns about exactly this
 * on startup ("Non-emulated services will access production using these credentials")
 * and it is easy to read past.
 *
 * That is not hypothetical: seeding the Poker Run to the emulator in September 2026
 * published a real entry to the members' calendar, and the emulator then persisted the
 * returned `googleCalendarEventId` into `./emulator-data` — so the next *local* edit of
 * that post would have taken the patch path against the production entry.
 *
 * `FUNCTIONS_EMULATOR` is set in the function runtime by the emulator itself;
 * `firebase-functions` branches on it internally for the same reason.
 *
 * The escape hatch is deliberate. Suppressing the sync unconditionally would remove any
 * way to exercise it outside production, which is how a sync path rots — set
 * `ALLOW_EMULATOR_CALENDAR_WRITES=1` when you genuinely mean to hit the real calendar
 * from a local run, and know that you are writing to the calendar members subscribe to.
 *
 * No imports, on purpose: `src/test/` pulls this into the ROOT build, which has neither
 * `node` types nor the functions dependencies. See the TS2591/TS2307 trap in CLAUDE.md.
 */

/** The subset of the environment this decision reads. Avoids `NodeJS.ProcessEnv`, which needs node types. */
type Env = Record<string, string | undefined>;

/**
 * True when calendar writes should be suppressed because this is an emulated runtime.
 *
 * Returns false when the escape hatch is set, whatever the runtime — an explicit opt-in
 * beats the guard, which is the only way to test the sync locally on purpose.
 */
export function shouldSkipCalendarWrites(env: Env): boolean {
  if (env.ALLOW_EMULATOR_CALENDAR_WRITES) return false;
  return Boolean(env.FUNCTIONS_EMULATOR);
}
