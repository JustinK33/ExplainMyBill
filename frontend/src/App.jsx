import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Copy, FileText, LoaderCircle, ShieldAlert, Sparkles, UploadCloud } from 'lucide-react';
import UploadZone from './components/UploadZone';
import ProgressSteps from './components/ProgressSteps';
import BillSummary from './components/BillSummary';
import LineItems from './components/LineItems';
import DisputeLetter from './components/DisputeLetter';
import ChatBox from './components/ChatBox';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const PROGRESS_STEPS = ['Reading your bill...', 'Identifying bill type...', 'Translating charges...', 'Checking for issues...'];

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const progressTimerRef = useRef(null);
  const previewUrl = useMemo(() => (selectedFile ? URL.createObjectURL(selectedFile) : ''), [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!isAnalyzing) {
      setActiveStep(analysis ? PROGRESS_STEPS.length : 0);
      return;
    }

    setActiveStep(0);
    progressTimerRef.current = window.setInterval(() => {
      setActiveStep((current) => {
        if (current >= PROGRESS_STEPS.length - 1) {
          return current;
        }
        return current + 1;
      });
    }, 1100);

    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
    };
  }, [isAnalyzing, analysis]);

  const handleAnalyze = async () => {
    if (!selectedFile && !textInput.trim()) {
      setError('Upload a bill file or paste the text before analyzing.');
      return;
    }

    const formData = new FormData();
    if (selectedFile) {
      formData.append('file', selectedFile);
    }
    if (textInput.trim()) {
      formData.append('text', textInput.trim());
    }

    setIsAnalyzing(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || 'The bill could not be analyzed.');
      }

      setAnalysis(payload);
      setChatHistory([]);
      setActiveStep(PROGRESS_STEPS.length);
    } catch (err) {
      setError(err.message || 'Something went wrong while analyzing the bill.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendChat = async (message) => {
    if (!analysis || !message.trim()) {
      return;
    }

    setChatHistory((current) => [...current, { role: 'user', text: message }]);
    setIsSendingChat(true);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          bill_context: JSON.stringify(analysis),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || 'Could not answer that question right now.');
      }

      setChatHistory((current) => [...current, { role: 'assistant', text: payload.answer }]);
    } catch (err) {
      setChatHistory((current) => [
        ...current,
        { role: 'assistant', text: err.message || 'I could not answer that question.' },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const flaggedCount = analysis?.line_items?.filter((item) => item.flagged).length || 0;

  return (
    <div className="relative min-h-screen overflow-hidden text-[var(--text)]">
      <div className="grain" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(circle_at_top,_rgba(242,180,93,0.25),_transparent_40%),radial-gradient(circle_at_80%_20%,_rgba(126,225,216,0.14),_transparent_30%)]" />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              Bill translation lab
            </div>
            <div className="max-w-3xl space-y-4">
              <h1 className="display-font text-4xl font-semibold leading-[0.95] text-white sm:text-5xl lg:text-7xl">
                Explain My Bill turns confusing charges into plain English.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                Upload a medical, insurance, utility, or legal bill. The app explains each line, flags suspicious items, and drafts a dispute letter when something looks wrong.
              </p>
            </div>
          </div>

          <div className="panel-strong rounded-[28px] p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.08] bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Focus</div>
                <div className="mt-2 text-lg font-semibold text-white">One bill at a time</div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Style</div>
                <div className="mt-2 text-lg font-semibold text-white">Compact and readable</div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Safety</div>
                <div className="mt-2 text-lg font-semibold text-white">OpenAI key stays in .env</div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <UploadZone
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            textInput={textInput}
            onFileChange={setSelectedFile}
            onTextChange={setTextInput}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            error={error}
          />
          <div className="panel rounded-[28px] p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Processing</div>
                <h2 className="display-font mt-2 text-2xl font-semibold text-white">Progress</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {analysis ? 'Complete' : isAnalyzing ? 'Live' : 'Idle'}
              </div>
            </div>
            <ProgressSteps steps={PROGRESS_STEPS} activeStep={activeStep} isBusy={isAnalyzing} />
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-[var(--muted)]">
              The backend runs a five-step LangChain pipeline: load the document, classify the bill type, route to a specialist explainer, review for flags, and assemble the final response.
            </div>
          </div>
        </section>

        {analysis ? (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 sm:px-6">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Analysis complete</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {flaggedCount > 0 ? `${flaggedCount} item${flaggedCount === 1 ? '' : 's'} flagged for review` : 'No obvious issues found'}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                <ShieldAlert className="h-4 w-4 text-[var(--accent)]" />
                The dispute letter appears only when at least one item is flagged.
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <BillSummary summary={analysis.summary} />
              <LineItems items={analysis.line_items} />
              <DisputeLetter letter={analysis.dispute_letter} />
            </div>

            <ChatBox
              history={chatHistory}
              onSend={handleSendChat}
              isSending={isSendingChat}
              billContext={analysis}
            />
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;
