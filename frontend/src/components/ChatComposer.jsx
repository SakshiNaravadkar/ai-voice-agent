import { SendIcon } from "./Icons.jsx";

// Controlled text input and send button.
// The value is owned by App so recognized speech can fill the same field.
function ChatComposer({ value, onChange, onSend, isListening, isSending }) {
  const trimmedValue = value.trim();

  function handleSubmit(event) {
    event.preventDefault();

    if (!trimmedValue || isSending) {
      return;
    }

    onSend(trimmedValue);
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="message-input">
        Message
      </label>

      <div className="composer__field">
        <input
          id="message-input"
          className="composer__input"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            isListening
              ? "Listening... speak now"
              : isSending
                ? "Waiting for the assistant..."
                : "Type your message..."
          }
          maxLength={500}
          autoComplete="off"
          aria-describedby="composer-hint"
        />
        <button
          className={`send-button ${isSending ? "is-loading" : ""}`}
          type="submit"
          disabled={!trimmedValue || isSending}
          aria-label={isSending ? "Waiting for the assistant" : "Send message"}
        >
          {isSending ? (
            <span className="send-button__spinner" aria-hidden="true" />
          ) : (
            <SendIcon />
          )}
        </button>
      </div>

      <p className="composer__hint" id="composer-hint">
        Press <kbd>Enter</kbd> to send ·{" "}
        {isListening
          ? "Listening now"
          : isSending
            ? "Waiting for the assistant…"
            : "AI replies via Groq"}
      </p>
    </form>
  );
}

export default ChatComposer;
