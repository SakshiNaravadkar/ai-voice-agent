import {
  GlobeIcon,
  SparklesIcon,
  SpeakerIcon,
  StopIcon,
  UserIcon,
} from "./Icons.jsx";

const ROLE_LABELS = {
  assistant: "Assistant",
  user: "You",
};

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({ message, onSpeak, onStop, isSpeaking, speechSupported }) {
  const isUser = message.role === "user";
  // Only AI replies can be replayed, and only when the browser can speak.
  const canReplay = !isUser && speechSupported;
  const replayLabel = isSpeaking ? "Stop speaking" : "Replay this reply";

  // Real AI replies carry web-search metadata. The welcome greeting does not,
  // so it never shows a source badge.
  const hasSearchMeta = !isUser && typeof message.usedSearch === "boolean";
  const sources = Array.isArray(message.sources) ? message.sources : [];

  return (
    <article
      className={`message ${isUser ? "message--user" : "message--assistant"}`}
    >
      <div className="message__avatar" aria-hidden="true">
        {isUser ? <UserIcon /> : <SparklesIcon />}
      </div>

      <div className="message__body">
        <div className="message__meta">
          <span className="message__author">
            {ROLE_LABELS[message.role] ?? "Assistant"}
          </span>
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {canReplay && (
            <button
              type="button"
              className={`message__speak ${isSpeaking ? "is-speaking" : ""}`}
              onClick={() => (isSpeaking ? onStop() : onSpeak(message))}
              aria-label={replayLabel}
              title={replayLabel}
            >
              {isSpeaking ? <StopIcon /> : <SpeakerIcon />}
            </button>
          )}
        </div>

        {hasSearchMeta && (
          <p
            className={`message__source-badge ${
              message.usedSearch ? "is-web" : "is-ai"
            }`}
          >
            {message.usedSearch ? <GlobeIcon /> : <SparklesIcon />}
            <span>{message.usedSearch ? "From the web" : "From AI knowledge"}</span>
          </p>
        )}

        <p className="message__bubble">{message.text}</p>

        {message.usedSearch && sources.length > 0 && (
          <div className="message__sources">
            <span className="message__sources-label">Sources</span>
            <ul className="message__sources-list">
              {sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={source.url}
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasSearchMeta && message.searchError && (
          <p className="message__search-note">{message.searchError}</p>
        )}
      </div>
    </article>
  );
}

export default MessageBubble;
