import { useCallback, useEffect, useRef, useState } from "react";

// Speech errors the browser can report. The two cancellation errors are
// raised on purpose when we stop or replace an utterance, so they are ignored.
const IGNORED_ERRORS = new Set(["canceled", "interrupted"]);

const ERROR_MESSAGES = {
  "audio-busy":
    "The browser could not play the audio right now. Close other tabs that use audio and try again.",
  "audio-hardware":
    "No audio output device was found. Connect a speaker or headphones and try again.",
  network:
    "Text-to-speech lost its network connection. Check your connection and try again.",
  "not-allowed":
    "Audio playback was blocked. Interact with the page and try again.",
  "synthesis-failed":
    "The browser could not read the reply aloud. Please try again.",
  "synthesis-unavailable":
    "No speech voices are available in this browser right now.",
};

const VOICE_STORAGE_KEY = "ai-voice-agent:voice";
const RATE_STORAGE_KEY = "ai-voice-agent:rate";
const MIN_RATE = 0.5;
const MAX_RATE = 2;

// Returns the SpeechSynthesis controller, or null when the browser has no support.
function getSpeechSynthesisApi() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.speechSynthesis ?? null;
}

function getUtteranceApi() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechSynthesisUtterance ?? null;
}

// Read a saved preference without ever throwing (private mode can block storage).
function readStoredVoice() {
  try {
    return localStorage.getItem(VOICE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function readStoredRate() {
  try {
    const stored = parseFloat(localStorage.getItem(RATE_STORAGE_KEY));
    return Number.isFinite(stored) ? stored : 1;
  } catch {
    return 1;
  }
}

function clampRate(value) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(MAX_RATE, Math.max(MIN_RATE, value));
}

// Choose the voice to use: the selected one if it still exists, otherwise a
// voice that matches the browser language, otherwise the first available voice.
function pickVoice(voices, voiceURI) {
  if (!voices.length) {
    return null;
  }

  if (voiceURI) {
    const selected = voices.find((voice) => voice.voiceURI === voiceURI);

    if (selected) {
      return selected;
    }
  }

  const language = (navigator.language || "en-US").toLowerCase();

  return (
    voices.find((voice) => voice.lang?.toLowerCase() === language) ??
    voices.find((voice) =>
      voice.lang?.toLowerCase().startsWith(language.slice(0, 2))
    ) ??
    voices[0]
  );
}

// Encapsulates browser text-to-speech so the UI components stay focused on
// layout. Only one utterance can play at a time: starting a new one cancels
// whatever is currently being spoken. The available voices and the chosen
// voice/rate are exposed so a settings panel can drive them.
export function useSpeechSynthesis() {
  const [isSupported] = useState(
    () => Boolean(getSpeechSynthesisApi() && getUtteranceApi())
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURIState] = useState(readStoredVoice);
  const [rate, setRateState] = useState(readStoredRate);

  const utteranceRef = useRef(null);

  // Stop speaking and detach the handlers of the current utterance.
  const stop = useCallback(() => {
    const synth = getSpeechSynthesisApi();
    const utterance = utteranceRef.current;

    if (utterance) {
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      utteranceRef.current = null;
    }

    setIsSpeaking(false);

    if (!synth) {
      return;
    }

    try {
      synth.cancel();
    } catch {
      // Cancelling a synthesis session that has not started can throw.
    }
  }, []);

  const setVoiceURI = useCallback((nextVoiceURI) => {
    const value = typeof nextVoiceURI === "string" ? nextVoiceURI : "";
    setVoiceURIState(value);

    try {
      localStorage.setItem(VOICE_STORAGE_KEY, value);
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const setRate = useCallback((nextRate) => {
    const value = clampRate(nextRate);
    setRateState(value);

    try {
      localStorage.setItem(RATE_STORAGE_KEY, String(value));
    } catch {
      // Ignore storage errors.
    }
  }, []);

  // Speak the given text. Any utterance already playing is cancelled first so
  // responses never overlap. Returns true when playback was requested.
  const speak = useCallback(
    (text) => {
      const synth = getSpeechSynthesisApi();
      const UtteranceApi = getUtteranceApi();
      const content = typeof text === "string" ? text.trim() : "";

      if (!content) {
        return false;
      }

      if (!synth || !UtteranceApi) {
        setError(
          "Text-to-speech playback is not supported in this browser. AI replies will still appear as text."
        );
        return false;
      }

      // Cancel any current speech before starting the new one.
      const previous = utteranceRef.current;

      if (previous) {
        previous.onstart = null;
        previous.onend = null;
        previous.onerror = null;
        utteranceRef.current = null;
      }

      try {
        synth.cancel();
      } catch {
        // The browser may already have stopped the previous session.
      }

      const utterance = new UtteranceApi(content);
      const voice = pickVoice(voices, voiceURI);

      utterance.lang = voice?.lang || navigator.language || "en-US";

      if (voice) {
        utterance.voice = voice;
      }

      utterance.rate = clampRate(rate);

      utterance.onstart = () => {
        if (utteranceRef.current !== utterance) {
          return;
        }

        setError(null);
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        if (utteranceRef.current !== utterance) {
          return;
        }

        utteranceRef.current = null;
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        if (utteranceRef.current !== utterance) {
          return;
        }

        utteranceRef.current = null;
        setIsSpeaking(false);

        if (IGNORED_ERRORS.has(event.error)) {
          return;
        }

        setError(
          ERROR_MESSAGES[event.error] ??
            "The reply could not be read aloud. Please try again."
        );
      };

      utteranceRef.current = utterance;
      setError(null);
      setIsSpeaking(true);

      try {
        synth.speak(utterance);
        return true;
      } catch {
        utteranceRef.current = null;
        setIsSpeaking(false);
        setError("Text-to-speech could not start. Please try again.");
        return false;
      }
    },
    [voiceURI, rate, voices]
  );

  // Load the browser voices. They are often populated asynchronously, so
  // listen for the "voiceschanged" event as well as reading them immediately.
  useEffect(() => {
    const synth = getSpeechSynthesisApi();

    if (!synth) {
      return undefined;
    }

    const loadVoices = () => {
      const available = synth.getVoices?.() ?? [];

      if (available.length) {
        setVoices(available);
      }
    };

    loadVoices();
    synth.addEventListener?.("voiceschanged", loadVoices);

    return () => {
      synth.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, []);

  // Stop speaking and release the utterance when the app unmounts.
  useEffect(() => {
    return () => {
      const synth = getSpeechSynthesisApi();
      const utterance = utteranceRef.current;

      if (utterance) {
        utterance.onstart = null;
        utterance.onend = null;
        utterance.onerror = null;
        utteranceRef.current = null;
      }

      if (!synth) {
        return;
      }

      try {
        synth.cancel();
      } catch {
        // The browser may already have stopped the session.
      }
    };
  }, []);

  return {
    isSupported,
    isSpeaking,
    error,
    voices,
    voiceURI,
    rate,
    setVoiceURI,
    setRate,
    speak,
    stop,
  };
}
