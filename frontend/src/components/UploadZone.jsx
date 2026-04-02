import { useCallback, useRef } from 'react';
import { ArrowRight, FileUp, FileText, Image as ImageIcon, LoaderCircle, UploadCloud, X } from 'lucide-react';

function UploadZone({ selectedFile, previewUrl, textInput, onFileChange, onTextChange, onAnalyze, isAnalyzing, error }) {
  const fileInputRef = useRef(null);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      const droppedFile = event.dataTransfer.files?.[0];
      if (droppedFile) {
        onFileChange(droppedFile);
      }
    },
    [onFileChange],
  );

  const openPicker = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileLabel = selectedFile ? selectedFile.name : 'Drop a PDF, PNG, JPG, or WEBP file here';
  const isImage = selectedFile && selectedFile.type.startsWith('image/');

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Upload</div>
          <h2 className="display-font mt-2 text-2xl font-semibold text-white">Bring the confusing bill here</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
          Max 10 MB
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        className="group relative overflow-hidden rounded-[24px] border border-dashed border-white/[0.15] bg-white/[0.04] p-5 transition duration-300 hover:border-[var(--accent)]/60 hover:bg-white/[0.06]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(242,180,93,0.18),_transparent_45%)] opacity-70" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <UploadCloud className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">Drag and drop your file</div>
              <div className="text-sm text-[var(--muted)]">or paste the bill text below</div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
            className="hidden"
            onChange={(event) => onFileChange(event.target.files?.[0] || null)}
          />

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white transition hover:border-[var(--accent)]/40 hover:bg-white/[0.12]"
            >
              <FileUp className="h-4 w-4" />
              Choose file
            </button>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-extrabold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAnalyzing ? <LoaderIcon /> : <ArrowLabel />}
              {isAnalyzing ? 'Analyzing...' : 'Explain my bill'}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                {isImage ? <ImageIcon className="h-4 w-4 text-[var(--accent-2)]" /> : <FileText className="h-4 w-4 text-[var(--accent-2)]" />}
                {fileLabel}
              </div>
              {selectedFile ? (
                <button type="button" onClick={clearFile} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-white">
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              ) : null}
            </div>
            {selectedFile ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                {isImage ? (
                  <img src={previewUrl} alt="Bill preview" className="h-64 w-full object-cover" />
                ) : (
                  <div className="flex h-64 items-center justify-center px-6 text-center text-sm leading-6 text-[var(--muted)]">
                    PDF uploaded successfully. The backend will extract text before analysis.
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 text-sm leading-6 text-[var(--muted)]">
                The app accepts PDFs, image bills, and pasted text. If the scan is messy, paste the readable text directly for a cleaner analysis.
              </div>
            )}
          </div>
        </div>
      </div>

      <label className="mt-5 block">
        <div className="mb-2 text-sm font-semibold text-white">Paste bill text instead</div>
        <textarea
          value={textInput}
          onChange={(event) => onTextChange(event.target.value)}
          rows={8}
          className="w-full rounded-[22px] border border-white/10 bg-black/25 px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]/70 focus:ring-2 focus:ring-[var(--accent)]/20"
          placeholder="Paste line items, totals, or the full bill text here..."
        />
      </label>

      {error ? (
        <div className="mt-4 rounded-2xl border border-[var(--danger)]/40 bg-[rgba(255,107,95,0.1)] px-4 py-3 text-sm text-[#ffd5d1]">
          {error}
        </div>
      ) : null}
    </section>
  );
}

function LoaderIcon() {
  return <LoaderCircle className="h-4 w-4 animate-spin" />;
}

function ArrowLabel() {
  return <ArrowRight className="h-4 w-4" />;
}

export default UploadZone;
