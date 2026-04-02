import { Copy, FileText } from 'lucide-react';
import { useState } from 'react';

function DisputeLetter({ letter }) {
  const [copyState, setCopyState] = useState('Copy');

  const handleCopy = async () => {
    if (!letter) {
      return;
    }

    await navigator.clipboard.writeText(letter);
    setCopyState('Copied');
    window.setTimeout(() => setCopyState('Copy'), 1800);
  };

  if (!letter) {
    return (
      <article className="panel rounded-[28px] p-5 sm:p-6 xl:col-span-1">
        <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Dispute Letter</div>
        <h2 className="display-font mt-2 text-2xl font-semibold text-white">No letter needed</h2>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          The bill did not surface any items that looked suspicious enough to justify a dispute letter.
        </p>
      </article>
    );
  }

  return (
    <article className="panel rounded-[28px] p-5 sm:p-6 xl:col-span-1">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Dispute Letter</div>
          <h2 className="display-font mt-2 text-2xl font-semibold text-white">Ready to send</h2>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white transition hover:border-[var(--accent)]/40 hover:bg-white/10"
        >
          <Copy className="h-3.5 w-3.5" />
          {copyState}
        </button>
      </div>
      <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
        <pre className="max-h-[620px] overflow-auto whitespace-pre-wrap break-words text-sm leading-7 text-[var(--text)] scrollbar-thin">
          {letter}
        </pre>
      </div>
    </article>
  );
}

export default DisputeLetter;
