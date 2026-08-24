import { describe, it, expect } from 'vitest';
import {
  LIFECYCLE_EVENT_TYPES,
  isLifecycleEvent,
  statusForLifecycleEvent,
  buildPaymentFailureAlert,
  type PaymentFailureFacts,
} from '../../functions/src/subscriptionLifecycle';

/**
 * The gap these guard: the live webhook endpoint subscribed only to
 * `checkout.session.completed`, so nothing ever learned that a renewal had failed. One
 * member's card failed on 2026-08-02, Stripe made a single attempt and stopped, and the
 * lapse surfaced three weeks later only by reading invoices by hand.
 */

const facts = (over: Partial<PaymentFailureFacts> = {}): PaymentFailureFacts => ({
  email: 'member@example.com',
  customerName: 'Sandra Adams',
  amountDue: 5000,
  attemptCount: 1,
  nextAttemptAt: '2026-08-09T00:00:00.000Z',
  hostedInvoiceUrl: 'https://invoice.stripe.com/i/live_abc',
  subscriptionId: 'sub_live_1',
  ...over,
});

describe('isLifecycleEvent', () => {
  it.each(LIFECYCLE_EVENT_TYPES)('recognises %s', type => {
    expect(isLifecycleEvent(type)).toBe(true);
  });

  /**
   * `checkout.session.completed` must NOT be a lifecycle event: it is the fulfillment
   * path, and routing it here would stop every purchase being recorded.
   */
  it.each([
    'checkout.session.completed',
    'invoice.payment_succeeded',
    'customer.subscription.updated',
    'charge.refunded',
  ])('leaves %s to the existing paths', type => {
    expect(isLifecycleEvent(type)).toBe(false);
  });
});

describe('statusForLifecycleEvent', () => {
  /**
   * `past_due`, not `canceled`. Stripe keeps the subscription alive through its retry
   * window, and writing a member off on the first failed charge would drop someone who is
   * one card update away from being current.
   */
  it('treats a failed payment as past_due rather than canceled', () => {
    expect(statusForLifecycleEvent('invoice.payment_failed')).toBe('past_due');
  });

  it('restores active on a successful renewal', () => {
    expect(statusForLifecycleEvent('invoice.paid')).toBe('active');
  });

  it('marks a deleted subscription canceled', () => {
    expect(statusForLifecycleEvent('customer.subscription.deleted')).toBe('canceled');
  });
});

describe('buildPaymentFailureAlert', () => {
  it('says Stripe will retry, and does not raise an alarm, while retries remain', () => {
    const alert = buildPaymentFailureAlert(facts());
    expect(alert.subject).toContain('Stripe will retry');
    expect(alert.subject).not.toContain('FAILED');
    expect(alert.text).toContain('2026-08-09T00:00:00.000Z');
    expect(alert.text).toContain('No action needed yet');
  });

  /**
   * The case that actually went wrong. `next_payment_attempt: null` means the retry
   * schedule is exhausted and nothing further happens automatically — the member lapses
   * unless a person intervenes. The alert has to distinguish this from a routine first
   * failure, or it reads as noise and gets ignored.
   */
  it('escalates loudly when Stripe has stopped retrying', () => {
    const alert = buildPaymentFailureAlert(facts({ nextAttemptAt: null, attemptCount: 1 }));
    expect(alert.subject).toContain('FAILED');
    expect(alert.subject).toContain('no further retries');
    expect(alert.text).toContain('STOPPED retrying');
    expect(alert.text).toContain('This needs a person');
    expect(alert.text).not.toContain('No action needed');
  });

  it('includes the payable invoice link, which is how the member is recovered', () => {
    const alert = buildPaymentFailureAlert(facts({ nextAttemptAt: null }));
    expect(alert.text).toContain('https://invoice.stripe.com/i/live_abc');
  });

  it('formats the amount from cents', () => {
    expect(buildPaymentFailureAlert(facts({ amountDue: 2500 })).text).toContain('$25.00');
  });

  /**
   * A missing amount must not read as a $0.00 charge failing — that would look like a
   * bug in our own billing rather than a card decline.
   */
  it('says "an unknown amount" rather than $0.00 when the amount is absent', () => {
    const text = buildPaymentFailureAlert(facts({ amountDue: null })).text;
    expect(text).toContain('an unknown amount');
    expect(text).not.toContain('$0.00');
  });

  it('still produces a usable alert when Stripe sent no identifying details', () => {
    const alert = buildPaymentFailureAlert(
      facts({ email: null, customerName: null, hostedInvoiceUrl: null, subscriptionId: null })
    );
    expect(alert.subject).toContain('unknown email');
    expect(alert.text).toContain('An unidentified member');
  });

  it('falls back to the email address when Stripe collected no name', () => {
    expect(buildPaymentFailureAlert(facts({ customerName: null })).text)
      .toContain('member@example.com had a membership renewal payment fail');
  });
});
