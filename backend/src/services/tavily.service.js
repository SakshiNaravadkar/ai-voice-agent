// Tavily web search integration.
// The API key is read from the environment (backend/.env) and never leaves the
// server, so the browser can never see it. Only the free Tavily search endpoint
// is used - no paid features or automatic upgrades.

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const MAX_RESULTS = 5;
const REQUEST_TIMEOUT_MS = 15000;

// True when a Tavily key is configured. When false, web search is simply not
// offered to the model and the assistant answers from its own knowledge.
export function isTavilyConfigured() {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

// Run a search and return a compact list of { title, url, content } results.
// Throws an Error with a `.code` so callers can react gracefully:
// NOT_CONFIGURED, AUTH, RATE_LIMIT, TIMEOUT, NETWORK, REQUEST_FAILED.
export async function searchWeb(query) {
  const apiKey = process.env.TAVILY_API_KEY?.trim();

  if (!apiKey) {
    const error = new Error("Web search is not configured.");
    error.code = "NOT_CONFIGURED";
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;

  try {
    response = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: MAX_RESULTS,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    const wrapped = new Error("Could not reach the web search service.");
    wrapped.code = error?.name === "AbortError" ? "TIMEOUT" : "NETWORK";
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = new Error("The web search request failed.");

    if (response.status === 401 || response.status === 403) {
      error.code = "AUTH";
    } else if (
      response.status === 429 ||
      response.status === 432 ||
      response.status === 433
    ) {
      // Tavily signals free-tier usage limits with these status codes.
      error.code = "RATE_LIMIT";
    } else {
      error.code = "REQUEST_FAILED";
    }

    throw error;
  }

  const data = await response.json().catch(() => null);
  const results = Array.isArray(data?.results) ? data.results : [];

  return results
    .filter((item) => item && typeof item.url === "string" && item.url)
    .slice(0, MAX_RESULTS)
    .map((item) => ({
      title:
        typeof item.title === "string" && item.title.trim()
          ? item.title.trim()
          : item.url,
      url: item.url,
      content: typeof item.content === "string" ? item.content.trim() : "",
    }));
}
