function BillSummary({ summary }) {
  return (
    <article className="panel rounded-[28px] p-5 sm:p-6 xl:col-span-1">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Bill Summary</div>
          <h2 className="display-font mt-2 text-2xl font-semibold text-white">What this bill is saying</h2>
        </div>
      </div>
      <p className="text-lg leading-9 text-[rgba(245,239,228,0.95)]">{summary}</p>
    </article>
  );
}

export default BillSummary;
