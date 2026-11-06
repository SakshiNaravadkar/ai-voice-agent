import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "./api/chat.js";
import AppHeader from "./components/AppHeader.jsx";
import ConversationPanel from "./components/ConversationPanel.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import Sidebar from "./components/Sidebar.jsx";
import VoicePanel from "./components/VoicePanel.jsx";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition.js";
import { useSpeechSynthesis } from "./hooks/useSpeechSynthesis.js";
import { getConversationTitle } from "./utils/conversation.js";
import "./App.css";

const WELCOME_TEXT = "Hello! I'm your AI assistant. How can I help you today?";
const CONVERSATIONS_STORAGE_KEY = "ai-voice-agent:conversations";
const THEME_STORAGE_KEY = "ai-voice-agent:theme";

// A small id helper with a fallback for browsers without crypto.randomUUID.
function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createWelcomeMessage() {
  return {
    id: createId(),
    role: "assistant",
    text: WELCOME_TEXT,
    timestamp: Date.now(),
    // The greeting is shown in the UI but is not part of the AI conversation.
    isWelcome: true,
  };
}

// A conversation is a titled list of messages plus timestamps used by the
// sidebar to show recent activity.
function createConversation() {
  const now = Date.now();

  return {
    id: createId(),
    messages: [createWelcomeMessage()],
    createdAt: now,
    updatedAt: now,
  };
}

// Convert the on-screen messages into the history sent to the backend.
// The welcome greeting is skipped, and only real user/assistant turns are kept
// so the AI receives the conversation in the correct order.
function toApiHistory(messages) {
  return messages
    .filter(
      (message) =>
        !message.isWelcome &&
        (message.role === "user" || message.role === "assistant")
    )
    .map((message) => ({ role: message.role, content: message.text }));
}

// Restore saved conversations from localStorage. Any malformed entry is
// dropped so a corrupted value can never break the app.
function loadStoredConversations() {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const conversations = parsed.filter(
      (conversation) =>
        conversation &&
        typeof conversation.id === "string" &&
        Array.isArray(conversation.messages) &&
        conversation.messages.length > 0
    );

    return conversations.length ? conversations : null;
  } catch {
    return null;
  }
}

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "dark";
  } catch {
    return "dark";
  }
}

function App() {
  // Compute the starting conversations and active id once so their ids match.
  const initialStateRef = useRef(null);

  if (initialStateRef.current === null) {
    const stored = loadStoredConversations();
    const list = stored && stored.length ? stored : [createConversation()];
    initialStateRef.current = { list, activeId: list[0].id };
  }

  const [conversations, setConversations] = useState(
    initialStateRef.current.list
  );
  const [activeId, setActiveId] = useState(initialStateRef.current.activeId);
  const [theme, setTheme] = useState(readStoredTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [status, setStatus] = useState("ready");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const speechBaseRef = useRef("");
  const suppressSpeechRef = useRef(false);
  const requestControllerRef = useRef(null);
  const sendingRef = useRef(false);
  const speech = useSpeechRecognition();
  const tts = useSpeechSynthesis();

  // The conversation currently shown. Falls back to the first one so the view
  // never breaks if the active id is momentarily out of sync.
  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ??
    conversations[0];
  const messages = activeConversation.messages;
  const activeTitle = getConversationTitle(activeConversation);

  // Keep the saved conversations and theme in sync with the UI.
  useEffect(() => {
    try {
      localStorage.setItem(
        CONVERSATIONS_STORAGE_KEY,
        JSON.stringify(conversations)
      );
    } catch {
      // Ignore storage errors (private mode, quota, etc.).
    }
  }, [conversations]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors.
    }
  }, [theme]);

  // Cancel an in-flight request if the app unmounts.
  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, []);

  // The visual status follows the real microphone and playback state. If a
  // reply is still loading, stopping the microphone returns to Thinking
  // instead of Ready.
  useEffect(() => {
    if (speech.isListening) {
      setStatus("listening");
      return;
    }

    if (tts.isSpeaking) {
      setStatus("speaking");
      return;
    }

    setStatus((currentStatus) => {
      if (currentStatus !== "listening" && currentStatus !== "speaking") {
        return currentStatus;
      }

      return sendingRef.current ? "thinking" : "ready";
    });
  }, [speech.isListening, tts.isSpeaking]);

  // Clear the "currently speaking" highlight once playback finishes.
  useEffect(() => {
    if (!tts.isSpeaking) {
      setSpeakingMessageId(null);
    }
  }, [tts.isSpeaking]);

  // Put recognized speech into the existing message input.
  // Whatever was already typed is kept as a prefix for the spoken words.
  useEffect(() => {
    if (suppressSpeechRef.current || !speech.transcript) {
      return;
    }

    const nextDraft = [speechBaseRef.current, speech.transcript]
      .filter(Boolean)
      .join(" ")
      .slice(0, 500);

    setDraft(nextDraft);
  }, [speech.transcript]);

  // Switch status immediately.
  function updateStatus(nextStatus) {
    setStatus(nextStatus);
  }

  // Apply a change to one conversation by id, leaving the others untouched.
  function updateConversation(id, updater) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id ? updater(conversation) : conversation
      )
    );
  }

  // Abort any reply that is still loading and release the send lock.
  function cancelInFlight() {
    const controller = requestControllerRef.current;

    if (controller) {
      requestControllerRef.current = null;
      controller.abort();
    }

    sendingRef.current = false;
    setIsSending(false);
  }

  // Read an assistant reply aloud. Starting a new reply cancels the previous
  // one inside the hook, so two responses never speak at the same time.
  function handleSpeak(message) {
    const started = tts.speak(message.text);

    if (started) {
      setSpeakingMessageId(message.id);
    }
  }

  // Stop whatever is currently being spoken.
  function handleStopSpeaking() {
    tts.stop();
    setSpeakingMessageId(null);
  }

  function handleStopListening() {
    speech.stop();
    updateStatus(sendingRef.current ? "thinking" : "ready");
  }

  function handleMicToggle() {
    if (speech.isListening) {
      handleStopListening();
      return;
    }

    if (!speech.isSupported) {
      return;
    }

    // Stop any playback so the microphone does not pick up the spoken reply.
    if (tts.isSpeaking) {
      handleStopSpeaking();
    }

    // The click requests microphone permission through the Web Speech API.
    updateStatus(sendingRef.current ? "thinking" : "ready");
    speechBaseRef.current = draft.trim();
    suppressSpeechRef.current = false;
    speech.start();
  }

  async function handleSend(text) {
    // Guard against duplicate submissions before React has re-rendered.
    if (sendingRef.current) {
      return;
    }

    if (speech.isListening) {
      speech.stop();
    }

    // Stop any reply that is still being read aloud before sending again.
    if (tts.isSpeaking) {
      handleStopSpeaking();
    }

    // Ignore late recognition results once the message has been submitted.
    suppressSpeechRef.current = true;
    setDraft("");
    setChatError(null);

    const conversationId = activeConversation.id;
    const userMessage = {
      id: createId(),
      role: "user",
      text,
      timestamp: Date.now(),
    };

    // Send the earlier turns plus this new message so the AI has context.
    const history = [
      ...toApiHistory(messages),
      { role: "user", content: text },
    ];

    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      messages: [...conversation.messages, userMessage],
      updatedAt: Date.now(),
    }));
    updateStatus("thinking");

    sendingRef.current = true;
    setIsSending(true);

    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      const result = await sendChatMessage(history, {
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      const assistantMessage = {
        id: createId(),
        role: "assistant",
        text: result.reply,
        timestamp: Date.now(),
        // Web-search metadata shown as a badge and source links in the UI.
        usedSearch: result.usedSearch,
        sources: result.sources,
        searchError: result.searchError,
      };

      // Append to the conversation the message was sent from, even if the user
      // has switched to a different one while waiting.
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, assistantMessage],
        updatedAt: Date.now(),
      }));
      setStatus((currentStatus) =>
        currentStatus === "listening" ? currentStatus : "ready"
      );

      // Read the new reply aloud automatically.
      handleSpeak(assistantMessage);
    } catch (error) {
      if (error?.name === "AbortError" || controller.signal.aborted) {
        return;
      }

      setChatError(
        error?.message ||
          "The AI assistant could not respond. Please try again."
      );
      setStatus((currentStatus) =>
        currentStatus === "listening" ? currentStatus : "ready"
      );
    } finally {
      // If the conversation was cleared or the app unmounted, a newer request
      // (or no request) owns the state now, so do not touch it.
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        sendingRef.current = false;
        setIsSending(false);
      }
    }
  }

  // Reset the active conversation back to just the greeting.
  function handleClear() {
    if (speech.isListening) {
      speech.stop();
    }

    handleStopSpeaking();
    cancelInFlight();
    setChatError(null);
    setDraft("");
    suppressSpeechRef.current = true;
    updateStatus("ready");

    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      messages: [createWelcomeMessage()],
      updatedAt: Date.now(),
    }));
  }

  // Start a fresh conversation and make it active.
  function handleNewChat() {
    if (speech.isListening) {
      speech.stop();
    }

    handleStopSpeaking();
    cancelInFlight();
    setChatError(null);
    setDraft("");
    suppressSpeechRef.current = true;
    updateStatus("ready");

    const conversation = createConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setSidebarOpen(false);
  }

  function handleSelectConversation(id) {
    if (id === activeConversation.id) {
      setSidebarOpen(false);
      return;
    }

    if (speech.isListening) {
      speech.stop();
    }

    handleStopSpeaking();
    cancelInFlight();
    setChatError(null);
    setDraft("");
    suppressSpeechRef.current = true;
    updateStatus("ready");
    setActiveId(id);
    setSidebarOpen(false);
  }

  function handleDeleteConversation(id) {
    const remaining = conversations.filter(
      (conversation) => conversation.id !== id
    );

    // Never leave the app without a conversation to show.
    if (remaining.length === 0) {
      const conversation = createConversation();
      setConversations([conversation]);
      setActiveId(conversation.id);
      return;
    }

    setConversations(remaining);

    if (id === activeConversation.id) {
      if (speech.isListening) {
        speech.stop();
      }

      handleStopSpeaking();
      cancelInFlight();
      setChatError(null);
      setDraft("");
      suppressSpeechRef.current = true;
      updateStatus("ready");
      setActiveId(remaining[0].id);
    }
  }

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark"
    );
  }

  return (
    <div className="app-shell">
      <AppHeader
        status={status}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="app-body">
        <Sidebar
          conversations={conversations}
          activeId={activeConversation.id}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNewChat={handleNewChat}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
        />

        <main className="workspace">
          <ConversationPanel
            messages={messages}
            title={activeTitle}
            draft={draft}
            onDraftChange={setDraft}
            onSend={handleSend}
            onClear={handleClear}
            isListening={speech.isListening}
            isSending={isSending}
            chatError={chatError}
            onSpeak={handleSpeak}
            onStopSpeaking={handleStopSpeaking}
            speakingMessageId={speakingMessageId}
            speechSupported={tts.isSupported}
          />

          <VoicePanel
            status={status}
            isListening={speech.isListening}
            isSupported={speech.isSupported}
            error={speech.error}
            onMicToggle={handleMicToggle}
            onStopListening={handleStopListening}
            isSpeaking={tts.isSpeaking}
            speechOutputSupported={tts.isSupported}
            speechOutputError={tts.error}
            onStopSpeaking={handleStopSpeaking}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </main>
      </div>

      <footer className="app-footer">
        <span>AI Voice Agent</span>
        <span>Groq replies · Tavily web search · In-browser speech</span>
      </footer>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        voices={tts.voices}
        voiceURI={tts.voiceURI}
        onVoiceChange={tts.setVoiceURI}
        rate={tts.rate}
        onRateChange={tts.setRate}
        supported={tts.isSupported}
      />
    </div>
  );
}

export default App;
