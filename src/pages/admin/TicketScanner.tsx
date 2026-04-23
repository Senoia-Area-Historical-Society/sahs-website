import { useState, useRef, useEffect } from 'react';
import AdminHeader from './AdminHeader';
import { verifyTicketConfirmation } from '../../services/api';
import { CheckCircle, XCircle, ScanLine, RotateCcw, Users, Ticket } from 'lucide-react';

type ScanState = 'idle' | 'loading' | 'valid' | 'invalid';

const INVALID_REASONS: Record<string, string> = {
  not_found: 'No ticket found with that confirmation number.',
  cancelled: 'This ticket has been cancelled.',
  server_error: 'Server error — please try again.',
  missing_confirmation_number: 'Please enter a confirmation number.',
};

export default function TicketScanner() {
  const [input, setInput] = useState('');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [verifiedTicket, setVerifiedTicket] = useState<any>(null);
  const [invalidReason, setInvalidReason] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scanState === 'idle') inputRef.current?.focus();
  }, [scanState]);

  const handleVerify = async (value?: string) => {
    const num = (value ?? input).trim().toUpperCase();
    if (!num) return;
    setScanState('loading');
    setVerifiedTicket(null);
    setInvalidReason('');
    try {
      const result = await verifyTicketConfirmation(num);
      if (result.valid && result.ticket) {
        setVerifiedTicket(result.ticket);
        setScanState('valid');
      } else {
        setInvalidReason(INVALID_REASONS[result.reason || ''] || 'Ticket not recognized.');
        setScanState('invalid');
      }
    } catch {
      setInvalidReason('Failed to connect. Please try again.');
      setScanState('invalid');
    }
  };

  const reset = () => { setInput(''); setScanState('idle'); setVerifiedTicket(null); setInvalidReason(''); };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AdminHeader />
      <main className="flex-grow flex flex-col items-center justify-start px-4 py-10 max-w-2xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-tan/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <ScanLine size={28} className="text-tan" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Ticket Scanner</h1>
          <p className="text-sm text-charcoal/60 font-sans mt-1">Scan a QR code or type a confirmation number to verify.</p>
        </div>

        {(scanState === 'idle' || scanState === 'loading') && (
          <div className="w-full bg-white rounded-xl border border-tan-light shadow-sm p-6 mb-6">
            <label className="block text-xs font-bold text-charcoal/50 uppercase tracking-wider mb-2">Confirmation Number</label>
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder="e.g. A1B2C3D4"
                disabled={scanState === 'loading'}
                autoComplete="off"
                spellCheck={false}
                className="flex-1 px-4 py-3 border border-tan-light rounded-lg font-mono text-xl tracking-widest text-charcoal focus:outline-none focus:ring-2 focus:ring-tan/50 uppercase placeholder:normal-case placeholder:text-charcoal/30 placeholder:text-base placeholder:tracking-normal disabled:opacity-50"
              />
              <button
                onClick={() => handleVerify()}
                disabled={!input.trim() || scanState === 'loading'}
                className="px-6 py-3 bg-tan text-white rounded-lg font-bold uppercase tracking-wider text-sm hover:bg-tan-dark transition-colors disabled:opacity-50 flex items-center"
              >
                {scanState === 'loading' ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : 'Verify'}
              </button>
            </div>
            <p className="text-xs text-charcoal/40 mt-2 font-sans">USB barcode scanners work automatically — they send Enter after scanning.</p>
          </div>
        )}

        {scanState === 'valid' && verifiedTicket && (
          <div className="w-full">
            <div className="bg-green-50 border-2 border-green-400 rounded-xl p-8 text-center mb-4">
              <CheckCircle size={56} className="text-green-500 mx-auto mb-3" />
              <p className="text-3xl font-serif font-bold text-green-800 mb-1">Valid Ticket</p>
              <p className="font-mono text-lg text-green-700 mb-6">{verifiedTicket.confirmationNumber}</p>
              <div className="bg-white rounded-lg border border-green-200 p-4 text-left space-y-3 text-sm font-sans">
                <div className="flex items-center gap-2 text-charcoal/70">
                  <Ticket size={15} className="text-tan" />
                  <span className="font-bold text-charcoal">{verifiedTicket.eventTitle}</span>
                </div>
                {verifiedTicket.customerName && (
                  <div className="flex items-center gap-2 text-charcoal/70">
                    <Users size={15} className="text-tan" />
                    <span>{verifiedTicket.customerName} — {verifiedTicket.email}</span>
                  </div>
                )}
                <div className="text-charcoal/70">
                  <span className="font-bold text-tan">{verifiedTicket.quantity}</span> ticket{verifiedTicket.quantity !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <button onClick={reset} className="w-full flex items-center justify-center gap-2 py-3 border border-tan text-tan rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-tan/5 transition-colors">
              <RotateCcw size={16} /> Check Another Ticket
            </button>
          </div>
        )}

        {scanState === 'invalid' && (
          <div className="w-full">
            <div className="bg-red-50 border-2 border-red-400 rounded-xl p-8 text-center mb-4">
              <XCircle size={56} className="text-red-500 mx-auto mb-3" />
              <p className="text-3xl font-serif font-bold text-red-800 mb-2">Invalid</p>
              <p className="text-red-700 font-sans">{invalidReason}</p>
            </div>
            <button onClick={reset} className="w-full flex items-center justify-center gap-2 py-3 border border-tan text-tan rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-tan/5 transition-colors">
              <RotateCcw size={16} /> Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
