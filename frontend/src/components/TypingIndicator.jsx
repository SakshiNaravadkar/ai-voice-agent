import { SparklesIcon } from "./Icons.jsx";

// Shown in the conversation while the backend is waiting for Groq.
function TypingIndicator() {
  return (
    <article
      className="message message--assistant message--typing"
      aria-label="Assistant is thinking"
    >
      <div className="message__avatar" aria-hidden="true">
        <SparklesIcon />
      </div>

      <div className="message__body">
        <div className="message__meta">
          <span className="message__author">Assistant</span>
          <span>Thinking…</span>
        </div>
        <div className="typing-bubble" role="status" aria-live="polite">
          <span className="sr-only">Assistant is thinking</span>
          <span className="typing-bubble__dot" aria-hidden="true" />
          <span className="typing-bubble__dot" aria-hidden="true" />
          <span className="typing-bubble__dot" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}

export default TypingIndicator;
