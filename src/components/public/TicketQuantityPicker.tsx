import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { clampQuantity } from '../../lib/ticketQuantity';

interface TicketQuantityPickerProps {
  id: string;
  label: string;
  value: number;
  max: number;
  onChange: (quantity: number) => void;
  compact?: boolean;
}

/**
 * −/+ stepper with a typeable number in the middle. Quantity cannot be changed on
 * Stripe's checkout page, so this is the only place a buyer picks how many — it has
 * to be obvious, and ordering twelve must not take eleven taps.
 *
 * While focused the field shows the buyer's raw text, so they can clear it and type
 * "12"; the committed quantity is clamped on every keystroke and the text snaps to it
 * on blur. The −/+ buttons take focus, so they always act on the committed value.
 */
export default function TicketQuantityPicker({ id, label, value, max, onChange, compact = false }: TicketQuantityPickerProps) {
  // Non-null only while the buyer is typing; otherwise the field shows `value`.
  const [draft, setDraft] = useState<string | null>(null);

  const icon = compact ? 16 : 18;
  const button = 'p-1.5 rounded-full text-charcoal hover:bg-tan/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors';

  return (
    <div>
      <label htmlFor={id} className={`block font-bold uppercase tracking-wider text-charcoal/60 mb-1 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        {label}
      </label>
      <div className="inline-flex items-center gap-1 bg-cream border border-tan/40 rounded-md px-1.5 py-1">
        <button
          type="button"
          onClick={() => onChange(clampQuantity(value - 1, max))}
          disabled={value <= 1}
          aria-label="Decrease quantity"
          className={button}
        >
          <Minus size={icon} aria-hidden="true" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={draft ?? String(value)}
          onChange={e => {
            setDraft(e.target.value);
            if (e.target.value !== '') onChange(clampQuantity(e.target.value, max));
          }}
          onBlur={() => setDraft(null)}
          onFocus={e => e.target.select()}
          className={`w-12 bg-white border border-tan/30 rounded text-center font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-tan/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${compact ? 'text-base py-0.5' : 'text-lg py-1'}`}
        />
        <button
          type="button"
          onClick={() => onChange(clampQuantity(value + 1, max))}
          disabled={value >= max}
          aria-label="Increase quantity"
          className={button}
        >
          <Plus size={icon} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
