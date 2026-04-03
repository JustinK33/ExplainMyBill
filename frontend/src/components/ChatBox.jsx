import { SendHorizonal, Bot, User } from 'lucide-react';
import { useState } from 'react';

const QUICK_QUESTIONS = [
  'What is the biggest charge on this bill?',
  'Why was this item flagged?',
  'Which line should I ask about first?',
];

function ChatBox({ history, onSend, isSending }) {
  const [message, setMessage] = useState('');

  const submitMessage = async (event) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    await onSend(trimmed);
    setMessage('');
  };

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Chat</div>
          <h2 className="display-font mt-2 text-2xl font-semibold text-white">Ask follow-up questions</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
          Conversation stays on this page
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        {QUICK_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => setMessage(question)}
            className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)]/40 hover:bg-white/[0.08] sm:text-base"
          >
            {question}
          </button>
        ))}
      </div>

      <div className="space-y-3 rounded-[24px] border border-white/10 bg-black/[0.18] p-4">
        {history.length === 0 ? (
          <div className="text-base leading-7 text-[var(--muted)]">
            Try a suggested question above, or ask something simple like “What does line 4 mean?”
          </div>
        ) : (
          history.map((entry, index) => (
            <div
              key={`${entry.role}-${index}`}
              className={`flex gap-3 ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {entry.role === 'assistant' ? (
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[var(--accent-2)]">
                  <Bot className="h-5 w-5" />
                </div>
              ) : null}
              <div
                className={`max-w-3xl rounded-[22px] px-4 py-3 text-base leading-8 ${
                  entry.role === 'user'
                    ? 'bg-[rgba(242,180,93,0.16)] text-white'
                    : 'border border-white/10 bg-white/[0.06] text-[var(--text)]'
                }`}
              >
                {entry.text}
              </div>
              {entry.role === 'user' ? (
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[rgba(242,180,93,0.14)] text-[var(--accent)]">
                  <User className="h-5 w-5" />
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <form onSubmit={submitMessage} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask about a line item, fee, or flag..."
          className="min-h-14 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 text-base text-white outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]/70 focus:ring-2 focus:ring-[var(--accent)]/20"
        />
        <button
          type="submit"
          disabled={isSending}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-6 py-3 text-base font-extrabold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <SendHorizonal className="h-5 w-5" />
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </section>
  );
}

export default ChatBox;
