import { Router } from "express";
import Groq from "groq-sdk";
import { isTavilyConfigured, searchWeb } from "../services/tavily.service.js";

const router = Router();

const MAX_MESSAGE_LENGTH = 4000;
// Limits that keep the conversation history within the model's context window.
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_CHARS = 12000;
// At most this many search rounds per reply, which caps the number of Tavily
// calls (and Groq calls) to keep the free tiers safe.
const MAX_SEARCH_ROUNDS = 2;
const MAX_SOURCES = 5;
// Groq-hosted open-weight model available on the free plan.
// Override it with GROQ_MODEL in backend/.env if your account uses another model.
const DEFAULT_MODEL = "openai/gpt-oss-20b";

const BASE_SYSTEM_PROMPT =
  "You are a helpful, friendly AI voice assistant. Keep answers clear and reasonably concise.";

// The tool the model can call to search the internet. Its description tells the
// model to search only for current/real-time info and to answer ordinary
// general-knowledge questions directly, without an unnecessary search.
const WEB_SEARCH_TOOL = {
  type: "function",
  function: {
    name: "web_search",
    description:
      "Search the internet for current, recent, or real-time information such as news, live data, prices, schedules, or anything that may have changed after your training data. Do not use this for general knowledge you already know.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "A concise internet search query.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

const SEARCH_ERROR_MESSAGES = {
  NOT_CONFIGURED: "Web search is not configured on the server.",
  AUTH: "Web search could not authenticate with its API key.",
  RATE_LIMIT: "The web search free-tier limit has been reached.",
  TIMEOUT: "The web search timed out.",
  NETWORK: "Could not reach the web search service.",
  REQUEST_FAILED: "The web search service returned an error.",
};

// The system prompt grows a web-search section only when the tool is available.
function buildSystemPrompt(searchEnabled) {
  if (!searchEnabled) {
    return BASE_SYSTEM_PROMPT;
  }

  return (
    `${BASE_SYSTEM_PROMPT}\n\n` +
    "You can use the web_search tool to look up current or real-time information. " +
    "Use it when the question depends on recent events, live data, or facts you are not confident about. " +
    "For ordinary general knowledge you already know, answer directly without searching. " +
    "When you answer using web results, base your answer on them and make clear the information comes from the web."
  );
}

// Safely read the search query from a tool call's JSON arguments.
function parseSearchQuery(rawArguments) {
  if (typeof rawArguments !== "string" || !rawArguments.trim()) {
    return "";
  }

  try {
    const parsed = JSON.parse(rawArguments);
    return typeof parsed?.query === "string"
      ? parsed.query.trim().slice(0, 400)
      : "";
  } catch {
    return "";
  }
}

// Format search results as plain text for the model to read.
function formatSearchResults(query, results) {
  const lines = results.map(
    (result, index) =>
      `${index + 1}. ${result.title} (${result.url})\n${result.content}`
  );

  return `Web search results for "${query}":\n\n${lines.join("\n\n")}`;
}

// Add new results to the source list, avoiding duplicate URLs.
function collectSources(target, results) {
  for (const result of results) {
    if (target.length >= MAX_SOURCES) {
      break;
    }

    if (!target.some((source) => source.url === result.url)) {
      target.push({ title: result.title, url: result.url });
    }
  }
}

// Run a search without throwing, so a Tavily failure never breaks the reply.
// Returns the text to hand back to the model plus the results (or null on error).
async function runSearchSafely(query) {
  if (!query) {
    return {
      content: "No search query was provided. Please answer without searching.",
      results: null,
      errorCode: null,
    };
  }

  try {
    const results = await searchWeb(query);

    if (results.length === 0) {
      return {
        content: `No web results were found for "${query}".`,
        results: [],
        errorCode: null,
      };
    }

    return {
      content: formatSearchResults(query, results),
      results,
      errorCode: null,
    };
  } catch (error) {
    const errorCode = error?.code ?? "REQUEST_FAILED";

    return {
      content:
        "Web search is unavailable right now. Answer the question using your own knowledge and mention that you could not check the web.",
      results: null,
      errorCode,
    };
  }
}

// Turn the client's conversation history into a clean list of Groq messages.
// Unknown roles and empty entries are dropped, each message is capped, and only
// the most recent turns are kept so the request never exceeds the context
// window. Returns null when no usable history is present.
function normalizeHistory(rawMessages) {
  if (!Array.isArray(rawMessages)) {
    return null;
  }

  const history = [];

  for (const entry of rawMessages) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const role =
      entry.role === "user" || entry.role === "assistant" ? entry.role : null;
    const content =
      typeof entry.content === "string" ? entry.content.trim() : "";

    if (!role || !content) {
      continue;
    }

    history.push({ role, content: content.slice(0, MAX_MESSAGE_LENGTH) });
  }

  if (history.length === 0) {
    return null;
  }

  // Keep the most recent turns, then trim from the oldest side until the total
  // size fits. The very latest message is always kept.
  let recent = history.slice(-MAX_HISTORY_MESSAGES);

  while (recent.length > 1) {
    const total = recent.reduce((sum, item) => sum + item.content.length, 0);

    if (total <= MAX_HISTORY_CHARS) {
      break;
    }

    recent = recent.slice(1);
  }

  return recent;
}

// Build the client per request so the API key is read after dotenv has loaded
// and is never captured in frontend code or logs.
function createClient(apiKey) {
  return new Groq({
    apiKey,
    timeout: 30000,
    maxRetries: 1,
  });
}

// POST /api/chat
// Accepts { messages: [{ role: "user" | "assistant", content: string }, ...] }
// containing the conversation so far. Returns { reply, usedSearch, sources,
// searchError }. The model can call a Tavily-backed web_search tool when a
// question needs current information; both API keys stay on the server.
router.post("/chat", async (req, res) => {
  const rawMessages = req.body?.messages;
  const rawLastEntry = Array.isArray(rawMessages)
    ? rawMessages[rawMessages.length - 1]
    : null;
  const lastContent =
    typeof rawLastEntry?.content === "string"
      ? rawLastEntry.content.trim()
      : "";

  if (!lastContent) {
    return res.status(400).json({
      status: "error",
      error: {
        code: "INVALID_MESSAGE",
        message: "Please enter a message before sending.",
      },
    });
  }

  if (lastContent.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      status: "error",
      error: {
        code: "MESSAGE_TOO_LONG",
        message: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      },
    });
  }

  const history = normalizeHistory(rawMessages);

  if (!history || history[history.length - 1].role !== "user") {
    return res.status(400).json({
      status: "error",
      error: {
        code: "INVALID_MESSAGE",
        message: "The conversation must end with a user message.",
      },
    });
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    return res.status(503).json({
      status: "error",
      error: {
        code: "MISSING_API_KEY",
        message:
          "The AI service is not configured yet. Add GROQ_API_KEY to the backend .env file and restart the server.",
      },
    });
  }

  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
  const searchEnabled = isTavilyConfigured();

  try {
    const client = createClient(apiKey);

    // The working conversation starts with the system prompt and the full chat
    // history. Tool calls and their results are appended as we go.
    const conversation = [
      { role: "system", content: buildSystemPrompt(searchEnabled) },
      ...history,
    ];

    const sources = [];
    let reply = "";
    let usedSearch = false;
    let searchErrorCode = null;

    // Each round lets the model optionally call web_search. The final round
    // runs without tools, so the model always produces a text answer.
    for (let round = 0; round <= MAX_SEARCH_ROUNDS; round += 1) {
      const allowTools = searchEnabled && round < MAX_SEARCH_ROUNDS;

      const completion = await client.chat.completions.create({
        model,
        messages: conversation,
        ...(allowTools ? { tools: [WEB_SEARCH_TOOL], tool_choice: "auto" } : {}),
        max_completion_tokens: 1024,
      });

      const message = completion.choices?.[0]?.message;
      const toolCalls = Array.isArray(message?.tool_calls)
        ? message.tool_calls
        : [];

      // No tool calls means the model produced its final answer.
      if (toolCalls.length === 0) {
        reply = typeof message?.content === "string" ? message.content.trim() : "";
        break;
      }

      // Keep the assistant's tool request in the conversation, then run each
      // requested search and hand the results back to the model.
      conversation.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        const query = parseSearchQuery(toolCall?.function?.arguments);
        const outcome = await runSearchSafely(query);

        if (outcome.results && outcome.results.length > 0) {
          usedSearch = true;
          collectSources(sources, outcome.results);
        } else if (outcome.errorCode) {
          searchErrorCode = outcome.errorCode;
        }

        conversation.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall?.function?.name ?? "web_search",
          content: outcome.content,
        });
      }
    }

    if (!reply) {
      return res.status(502).json({
        status: "error",
        error: {
          code: "EMPTY_AI_RESPONSE",
          message:
            "The AI assistant returned an empty response. Please try again.",
        },
      });
    }

    return res.status(200).json({
      status: "ok",
      reply,
      usedSearch,
      sources,
      searchError: searchErrorCode
        ? SEARCH_ERROR_MESSAGES[searchErrorCode] ??
          "Web search failed. The answer comes from the AI's own knowledge."
        : null,
    });
  } catch (error) {
    // Log only safe metadata. Never log the API key or request headers.
    const errorBody =
      error?.error && typeof error.error === "object" ? error.error : {};
    const details =
      errorBody.error && typeof errorBody.error === "object"
        ? errorBody.error
        : errorBody;
    const errorCode = details.code ?? error?.code ?? "";
    const errorType = details.type ?? error?.type ?? "";

    console.error("Groq request failed:", {
      name: error?.name ?? "Error",
      status: error?.status ?? null,
      code: errorCode || null,
      type: errorType || null,
    });

    if (error?.status === 401 || error?.status === 403) {
      return res.status(503).json({
        status: "error",
        error: {
          code: "AI_AUTH_ERROR",
          message:
            "The AI service rejected the server credentials. Check GROQ_API_KEY in the backend .env file.",
        },
      });
    }

    if (
      error?.status === 404 ||
      errorCode === "model_not_found" ||
      errorType === "model_not_found" ||
      errorCode === "model_decommissioned"
    ) {
      return res.status(502).json({
        status: "error",
        error: {
          code: "AI_MODEL_ERROR",
          message:
            "The configured Groq model is unavailable. Check GROQ_MODEL in the backend .env file.",
        },
      });
    }

    if (error?.status === 429) {
      return res.status(429).json({
        status: "error",
        error: {
          code: "AI_RATE_LIMIT",
          message:
            "The AI service is rate-limited right now. Wait a moment and try again, or check your Groq usage limits.",
        },
      });
    }

    if (errorCode === "context_length_exceeded") {
      return res.status(400).json({
        status: "error",
        error: {
          code: "MESSAGE_TOO_LONG",
          message:
            "The message is too long for the selected Groq model. Try a shorter message.",
        },
      });
    }

    if (
      error?.name === "APIConnectionError" ||
      error?.name === "APIConnectionTimeoutError"
    ) {
      return res.status(502).json({
        status: "error",
        error: {
          code: "AI_UNAVAILABLE",
          message:
            "Could not reach the AI service. Check your internet connection and try again.",
        },
      });
    }

    return res.status(502).json({
      status: "error",
      error: {
        code: "AI_REQUEST_FAILED",
        message:
          "The AI assistant could not respond right now. Please try again.",
      },
    });
  }
});

export default router;
