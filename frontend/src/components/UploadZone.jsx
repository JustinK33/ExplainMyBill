import { useCallback, useRef } from 'react';
import { ArrowRight, Camera, FileUp, FileText, FlaskConical, Image as ImageIcon, LoaderCircle, UploadCloud, X } from 'lucide-react';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'md'];

function UploadZone({ selectedFile, previewUrl, textInput, onFileChange, onTextChange, onAnalyze, onUseSampleBill, isAnalyzing, error }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const updateFile = useCallback(
    (file) => {
      if (!file) {
        onFileChange(null);
        return;
      }

      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        window.alert('Please choose a PDF, image, or text file.');
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        window.alert('Please choose a file smaller than 10 MB.');
        return;
      }

      onFileChange(file);
    },
    [onFileChange],
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      const droppedFile = event.dataTransfer.files?.[0];
      if (droppedFile) {
        updateFile(droppedFile);
      }
    },
    [updateFile],
  );

  const openPicker = () => {
    fileInputRef.current?.click();
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
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
              <UploadCloud className="h-7 w-7 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-xl font-semibold text-white">Drag and drop your file</div>
              <div className="text-base text-[var(--muted)]">or paste the bill text below if that feels easier</div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
            className="hidden"
            onChange={(event) => updateFile(event.target.files?.[0] || null)}
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => updateFile(event.target.files?.[0] || null)}
          />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-3 text-base font-semibold text-white transition hover:border-[var(--accent)]/40 hover:bg-white/[0.12]"
            >
              <FileUp className="h-5 w-5" />
              Choose file
            </button>
            <button
              type="button"
              onClick={openCamera}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-3 text-base font-semibold text-white transition hover:border-[var(--accent)]/40 hover:bg-white/[0.12]"
            >
              <Camera className="h-5 w-5" />
              Take photo
            </button>
            <button
              type="button"
              onClick={onUseSampleBill}
              disabled={isAnalyzing}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[var(--accent)]/30 bg-[rgba(242,180,93,0.08)] px-5 py-3 text-base font-semibold text-[var(--text)] transition hover:border-[var(--accent)]/50 hover:bg-[rgba(242,180,93,0.14)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <FlaskConical className="h-5 w-5 text-[var(--accent)]" />
              Try sample bill
            </button>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-6 py-3 text-base font-extrabold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAnalyzing ? <LoaderIcon /> : <ArrowLabel />}
              {isAnalyzing ? 'Analyzing...' : 'Explain my bill'}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-base font-semibold text-white">
                {isImage ? <ImageIcon className="h-5 w-5 text-[var(--accent-2)]" /> : <FileText className="h-5 w-5 text-[var(--accent-2)]" />}
                {fileLabel}
              </div>
              {selectedFile ? (
                <button type="button" onClick={clearFile} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--muted)] hover:text-white">
                  <X className="h-4 w-4" />
                  Clear
                </button>
              ) : null}
            </div>
            {selectedFile ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                {isImage ? (
                  <img src={previewUrl} alt="Bill preview" className="h-64 w-full object-cover" />
                ) : (
                  <div className="flex h-64 items-center justify-center px-6 text-center text-base leading-7 text-[var(--muted)]">
                    PDF uploaded successfully. The backend will extract text before analysis.
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 text-base leading-7 text-[var(--muted)]">
                The app accepts PDFs, image bills, and pasted text. If the scan is messy, paste the readable text directly for a cleaner analysis.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
          Best result: include the page with line items and totals.
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
          Accepted files: PDF, JPG, PNG, WEBP, TXT, and MD.
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
          On a phone, Take photo opens the camera so you can snap the bill directly.
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
          Try sample bill runs a built-in example through the same pipeline.
        </div>
      </div>

      <label className="mt-5 block">
        <div className="mb-2 text-base font-semibold text-white">Paste bill text instead</div>
        <textarea
          value={textInput}
          onChange={(event) => onTextChange(event.target.value)}
          rows={9}
          className="w-full rounded-[22px] border border-white/10 bg-black/25 px-4 py-4 text-base leading-8 text-white outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]/70 focus:ring-2 focus:ring-[var(--accent)]/20"
          placeholder="Paste line items, totals, or the full bill text here..."
        />
      </label>

      {error ? (
        <div role="alert" aria-live="polite" className="mt-4 rounded-2xl border border-[var(--danger)]/40 bg-[rgba(255,107,95,0.1)] px-4 py-3 text-base leading-7 text-[#ffd5d1]">
          {error}
        </div>
      ) : null}
    </section>
  );
}

function LoaderIcon() {
  return <LoaderCircle className="h-5 w-5 animate-spin" />;
}

function ArrowLabel() {
  return <ArrowRight className="h-5 w-5" />;
}

export default UploadZone;
