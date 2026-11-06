const CHAT_ENDPOINT = "/api/chat";

const NETWORK_ERROR_MESSAGE =
  "Could not reach the AI assistant. Make sure the backend is running and try again.";

// Send the conversation so far to the backend so the AI can use earlier
// messages as context. The Groq and Tavily keys stay on the server; the browser
// only ever talks to our own /api/chat endpoint.
// `messages` is a list of { role: "user" | "assistant", content: string }.
// Returns { reply, usedSearch, sources, searchError }.
export async function sendChatMessage(messages, { signal } = {}) {
  let response;

  try {
    response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const friendlyMessage =
      data?.error?.message ||
      data?.message ||
      "The AI assistant could not respond. Please try again.";

    const error = new Error(friendlyMessage);
    error.status = response.status;
    throw error;
  }

  const reply = typeof data?.reply === "string" ? data.reply.trim() : "";

  if (!reply) {
    throw new Error(
      "The AI assistant returned an empty response. Please try again."
    );
  }

  // Normalize the optional web-search metadata. Older backend responses without
  // these fields simply behave as "no web search".
  const sources = Array.isArray(data?.sources)
    ? data.sources
        .filter((source) => source && typeof source.url === "string")
        .map((source) => ({
          title:
            typeof source.title === "string" && source.title.trim()
              ? source.title.trim()
              : source.url,
          url: source.url,
        }))
    : [];

  return {
    reply,
    usedSearch: Boolean(data?.usedSearch) && sources.length > 0,
    sources,
    searchError:
      typeof data?.searchError === "string" && data.searchError.trim()
        ? data.searchError.trim()
        : null,
  };
}
