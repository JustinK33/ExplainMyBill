import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, LockKeyhole, ShieldAlert, Sparkles, TriangleAlert } from 'lucide-react';
import UploadZone from './components/UploadZone';
import ProgressSteps from './components/ProgressSteps';
import BillSummary from './components/BillSummary';
import LineItems from './components/LineItems';
import DisputeLetter from './components/DisputeLetter';
import ChatBox from './components/ChatBox';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const PROGRESS_STEPS = ['Reading your bill...', 'Identifying bill type...', 'Translating charges...', 'Checking for issues...'];
const SAMPLE_BILL_TEXT = `RIVERSIDE REGIONAL MEDICAL CENTER
3200 Healthpark Blvd, Suite 100
Richmond, VA 23235
Tax ID: 54-1928374
NPI: 1234567890
Phone: (804) 555-0192

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATIENT STATEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Statement Date:     03/18/2026
Statement #:        STM-2026-0048821
Account #:          8841921
DOS (Date of Svc):  02/27/2026
Discharge Date:     02/27/2026

Patient:            Jordan Lee
DOB:                09/14/1987
Guarantor:          Jordan Lee
Ins. Plan:          BlueCross BlueShield PPO
Member ID:          XYZ9948821
Group #:            GRP-00441

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ITEMIZED CHARGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rev   CPT      Description                         Billed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0450  99285    ED E&M Level 5 - High Complex       $3,200.00
0761  96374    Ther/proph/diag inj IV push         $   389.00
0761  96374    Ther/proph/diag inj IV push         $   389.00
0270  71046    Radiology chest 2 views             $   612.00
0301  85025    CBC w/ auto diff                    $   198.00
0301  80053    Comp metabolic panel                $   274.00
0260  J2250    MDZ HCL 1MG/ML INJ 2ML             $    48.00
0260  J3010    Fentanyl citrate INJ                $    62.00
0636  99000    Handling/conveyance specimen        $    45.00
0450  99285    ED E&M Level 5 - High Complex       $3,200.00
0710  94760    Noninvasive ear/pulse oximetry      $   218.00
0272  A4570    Splint                              $   185.00
0450  A0021    Amb (transport) - base rate         $   892.00

TOTAL BILLED:                                   $9,712.00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSURANCE PROCESSING SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary Ins. Paid:                             -$2,814.00
Contractual Adj (CO-45):                       -$3,991.00
PR-96 (Non-covered charges):                   -$   607.00
PR-204 (This service/equip not covered):       -$   185.00

BALANCE AFTER INSURANCE:                        $2,115.00

Deductible Applied:                             $1,500.00
Copay Applied:                                  $  150.00
Coinsurance (20%):                              $  465.00

AMOUNT DUE FROM PATIENT:                        $2,115.00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAYMENT DUE BY: 04/20/2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Questions? Call Patient Billing: (804) 555-0199
Hours: Mon-Fri 8am-5pm EST

Financial assistance may be available.
Ask about our charity care program.
Interest will accrue on balances unpaid after 60 days.`
const TRUST_POINTS = [
  {
    label: 'Readability',
    title: 'Larger text and stronger contrast',
    detail: 'Important actions and summaries are easier to scan without squinting.',
    icon: CheckCircle2,
  },
  {
    label: 'Privacy',
    title: 'Your browser talks only to your configured API',
    detail: 'The app uses plain-language privacy guidance instead of vague security claims.',
    icon: LockKeyhole,
  },
  {
    label: 'Clarity',
    title: 'One step at a time',
    detail: 'The screen explains what is happening and what to do next.',
    icon: Sparkles,
  },
];

function isLocalAddress(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}

function getApiSecurityState(apiBase) {
  try {
    const apiUrl = new URL(apiBase, window.location.origin);
    const pageUrl = new URL(window.location.href);
    const pageIsHttps = pageUrl.protocol === 'https:';
    const apiIsHttps = apiUrl.protocol === 'https:';
    const localApi = isLocalAddress(apiUrl.hostname);
    const insecureRemoteApi = !apiIsHttps && !localApi;

    return {
      apiOrigin: apiUrl.origin,
      blockedByMixedContent: pageIsHttps && insecureRemoteApi,
      isSecure: apiIsHttps || localApi,
    };
  } catch {
    return {
      apiOrigin: apiBase,
      blockedByMixedContent: false,
      isSecure: false,
    };
  }
}

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
  const apiSecurity = useMemo(() => getApiSecurityState(API_BASE), []);

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

  const analyzeBill = async ({ file = selectedFile, text = textInput } = {}) => {
    if (apiSecurity.blockedByMixedContent) {
      setError('This page is secure, but the API is set to insecure HTTP. Change VITE_API_URL to an HTTPS endpoint or localhost before uploading private bills.');
      return;
    }

    if (!file && !text.trim()) {
      setError('Upload a bill file or paste the text before analyzing.');
      return;
    }

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (text.trim()) {
      formData.append('text', text.trim());
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

  const handleAnalyze = async () => {
    await analyzeBill();
  };

  const handleUseSampleBill = async () => {
    setSelectedFile(null);
    setTextInput(SAMPLE_BILL_TEXT);
    await analyzeBill({ file: null, text: SAMPLE_BILL_TEXT });
  };

  const handleSendChat = async (message) => {
    if (apiSecurity.blockedByMixedContent) {
      setChatHistory((current) => [
        ...current,
        { role: 'assistant', text: 'Chat is disabled because the app is pointing to an insecure HTTP API from a secure page.' },
      ]);
      return;
    }

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
      <div className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(circle_at_top,_rgba(242,180,93,0.32),_transparent_42%),radial-gradient(circle_at_80%_20%,_rgba(126,225,216,0.16),_transparent_30%)]" />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
          <div className="space-y-5 xl:pb-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              Bill help built for clarity
            </div>
            <div className="max-w-3xl space-y-5">
              <h1 className="display-font text-4xl font-semibold leading-[0.96] text-white sm:text-5xl lg:text-7xl">
                Explain My Bill turns confusing charges into plain English.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
                Upload a medical, insurance, utility, or legal bill. The app explains each line, highlights suspicious charges, and drafts a dispute letter when something looks wrong.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm sm:text-base">
              <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[var(--text)]">Large text</div>
              <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[var(--text)]">High contrast</div>
              <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[var(--text)]">Guided steps</div>
            </div>
          </div>

          <div className="panel-strong rounded-[32px] p-5 sm:p-6">
            <div className="grid gap-4">
              {TRUST_POINTS.map((point) => {
                const Icon = point.icon;
                return (
                  <div key={point.label} className="rounded-[24px] border border-white/[0.08] bg-white/5 p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <Icon className="h-5 w-5 text-[var(--accent)]" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{point.label}</div>
                        <div className="mt-2 text-xl font-semibold text-white">{point.title}</div>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted)] sm:text-base">{point.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {!apiSecurity.isSecure ? (
              <div className="mt-4 rounded-[24px] border border-[var(--danger)]/40 bg-[rgba(255,107,95,0.12)] p-4 text-sm leading-7 text-[#ffe0dc] sm:text-base">
                The current API address is not confirmed as secure. Keep sensitive uploads on localhost or switch the backend to HTTPS.
              </div>
            ) : null}
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] px-5 py-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">1. Add the bill</div>
            <div className="mt-2 text-lg font-semibold text-white">Upload a file or paste readable text</div>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] px-5 py-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">2. Review the summary</div>
            <div className="mt-2 text-lg font-semibold text-white">Look for plain-English explanations and flagged charges</div>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] px-5 py-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">3. Ask follow-up questions</div>
            <div className="mt-2 text-lg font-semibold text-white">Use guided prompts if you want more detail</div>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-1 h-5 w-5 shrink-0 text-[var(--accent)]" />
            <p>
              Your bill is sent securely, analyzed, and immediately discarded. We never store your bill, results, or personal information.            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <UploadZone
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            textInput={textInput}
            onFileChange={setSelectedFile}
            onTextChange={setTextInput}
            onAnalyze={handleAnalyze}
            onUseSampleBill={handleUseSampleBill}
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
            {!analysis && !isAnalyzing ? (
              <div className="mt-5 rounded-[24px] border border-dashed border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                Upload a bill to start. You will see each step light up as the app reads, explains, and reviews the charges.
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-dashed border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                The backend reads the document, identifies the bill type, translates each charge, checks for suspicious items, and then prepares the final response.
              </div>
            )}
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

            <ChatBox history={chatHistory} onSend={handleSendChat} isSending={isSendingChat} />
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;
