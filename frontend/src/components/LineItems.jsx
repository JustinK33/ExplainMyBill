import { AlertTriangle, CheckCircle2, ChevronsRight } from 'lucide-react';

function LineItems({ items }) {
  return (
    <article className="panel rounded-[28px] p-5 sm:p-6 xl:col-span-1">
      <div className="mb-4">
        <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Line Items</div>
        <h2 className="display-font mt-2 text-2xl font-semibold text-white">Charge-by-charge translation</h2>
      </div>
      <div className="space-y-3 max-h-[680px] overflow-auto pr-1 scrollbar-thin">
        {items?.map((item) => (
          <div key={`${item.label}-${item.original_text}`} className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4 transition hover:border-white/[0.15] hover:bg-white/[0.06]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ChevronsRight className="h-4 w-4 text-[var(--accent-2)]" />
                  <span className="break-words">{item.label}</span>
                </div>
                <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.original_text}</div>
              </div>
              <div
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  item.flagged
                    ? 'bg-[rgba(255,107,95,0.14)] text-[#ffd5d1]'
                    : 'bg-[rgba(126,225,216,0.12)] text-[var(--accent-2)]'
                }`}
              >
                {item.flagged ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {item.flagged ? 'Flagged' : 'Looks normal'}
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm leading-7 text-white">
              {item.plain_english}
            </div>
            {item.flagged && item.flag_reason ? (
              <div className="mt-3 rounded-2xl border border-[var(--danger)]/30 bg-[rgba(255,107,95,0.08)] px-4 py-3 text-sm leading-6 text-[#ffd5d1]">
                {item.flag_reason}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </article>
  );
}

export default LineItems;
