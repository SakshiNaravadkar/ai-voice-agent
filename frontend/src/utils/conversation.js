// Small shared helpers for labelling conversations in the sidebar and the chat
// header, so both stay consistent.

// Turn a conversation's first question into a short, readable title.
export function getConversationTitle(conversation) {
  const firstUserMessage = conversation.messages.find(
    (message) => message.role === "user"
  );

  if (!firstUserMessage) {
    return "New chat";
  }

  const text = firstUserMessage.text.trim().replace(/\s+/g, " ");

  return text.length > 34 ? `${text.slice(0, 34)}…` : text;
}

// A friendly "2m ago" style timestamp for the conversation list.
export function formatRelativeTime(timestamp) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000)
  );

  if (elapsedSeconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(elapsedSeconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(timestamp).toLocaleDateString();
}
