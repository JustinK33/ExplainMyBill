function ProgressSteps({ steps, activeStep, isBusy }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => {
        const isActive = isBusy && activeStep === index;
        const isComplete = activeStep > index || (!isBusy && activeStep >= steps.length);
        return (
          <li
            key={step}
            className={`flex items-center gap-4 rounded-2xl border px-4 py-4 transition duration-300 ${
              isActive
                ? 'border-[var(--accent)]/60 bg-white/[0.08] shadow-[0_0_0_1px_rgba(242,180,93,0.15)]'
                : 'border-white/[0.08] bg-white/[0.04]'
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-extrabold transition ${
                isComplete
                  ? 'border-[var(--accent-2)]/60 bg-[rgba(126,225,216,0.15)] text-[var(--accent-2)]'
                  : isActive
                  ? 'border-[var(--accent)]/60 bg-[rgba(242,180,93,0.16)] text-[var(--accent)]'
                  : 'border-white/10 bg-black/20 text-[var(--muted)]'
              }`}
            >
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">{step}</div>
              <div className="mt-1 text-xs leading-5 text-[var(--muted)]">
                {index === 0 && 'Pulling text from the file or pasted content.'}
                {index === 1 && 'Classifying the bill type so the correct specialist prompt can be used.'}
                {index === 2 && 'Translating each line into language a non-expert can follow.'}
                {index === 3 && 'Checking for duplicate, vague, or suspicious charges.'}
              </div>
            </div>
            {isActive ? <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--accent)]" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export default ProgressSteps;
