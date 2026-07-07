import { AlertCircle } from 'lucide-react';

export default function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 font-sans text-sm">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>
        {message} Check the browser console for details — this usually means a Firestore permissions or
        index error rather than there being no data.
      </span>
    </div>
  );
}
