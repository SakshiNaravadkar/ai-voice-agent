import { useEffect, useRef } from "react";
import { InfoIcon, TrashIcon } from "./Icons.jsx";
import ChatComposer from "./ChatComposer.jsx";
import MessageBubble from "./MessageBubble.jsx";
import TypingIndicator from "./TypingIndicator.jsx";

function ConversationPanel({
  messages,
  title,
  draft,
  onDraftChange,
  onSend,
  onClear,
  isListening,
  isSending,
  chatError,
  onSpeak,
  onStopSpeaking,
  speakingMessageId,
  speechSupported,
}) {
  const messagesRef = useRef(null);
  const messageCountLabel =
    messages.length === 1 ? "1 message" : `${messages.length} messages`;

  // Keep the newest message, loading indicator, or error in view.
  useEffect(() => {
    const container = messagesRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isSending, chatError]);

  return (
    <section className="panel conversation-panel" aria-label="Conversation">
      <header className="conversation__header">
        <div className="conversation__heading">
          <p className="eyebrow">Chat</p>
          <h2 className="conversation__title">{title ?? "Conversation"}</h2>
        </div>

        <div className="conversation__actions">
          <span className="conversation__count">{messageCountLabel}</span>
          <button
            type="button"
            className="icon-button"
            onClick={onClear}
            disabled={messages.length <= 1}
            aria-label="Clear conversation"
            title="Clear conversation"
          >
            <TrashIcon />
          </button>
        </div>
      </header>

      <div
        className="conversation__messages"
        ref={messagesRef}
        role="log"
        aria-live="polite"
        aria-label="Messages"
        aria-busy={isSending}
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSpeak={onSpeak}
            onStop={onStopSpeaking}
            isSpeaking={message.id === speakingMessageId}
            speechSupported={speechSupported}
          />
        ))}
        {isSending && <TypingIndicator />}
      </div>

      {chatError && (
        <p className="chat-alert" role="alert">
          <InfoIcon />
          <span>{chatError}</span>
        </p>
      )}

      <ChatComposer
        value={draft}
        onChange={onDraftChange}
        onSend={onSend}
        isListening={isListening}
        isSending={isSending}
      />
    </section>
  );
}

export default ConversationPanel;
