import { useCallback, useEffect, useRef, useState } from "react";

// Friendly messages for the errors the Web Speech API can report.
const ERROR_MESSAGES = {
  "not-allowed":
    "Microphone access was denied. Allow microphone permission in your browser settings and try again.",
  "service-not-allowed":
    "Speech recognition is blocked. Check your microphone permissions and try again.",
  "audio-capture":
    "No microphone was found. Connect a microphone and try again.",
  "no-speech": "No speech was detected. Click the microphone and try again.",
  network:
    "Speech recognition lost its network connection. Check your connection and try again.",
  "language-not-supported":
    "Speech recognition does not support your browser's language.",
};

// Chrome and Edge expose webkitSpeechRecognition; other browsers may use the
// standard name. Returns null when the browser has no support.
function getSpeechRecognitionApi() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

// Encapsulates the Web Speech API so the UI components stay focused on layout.
export function useSpeechRecognition() {
  const [isSupported] = useState(() => Boolean(getSpeechRecognitionApi()));
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");

  // Merge words that are still marked as interim into the final transcript.
  const finalizeInterim = useCallback(() => {
    const leftover = interimTranscriptRef.current;

    if (!leftover) {
      return;
    }

    finalTranscriptRef.current = [finalTranscriptRef.current, leftover]
      .filter(Boolean)
      .join(" ");
    interimTranscriptRef.current = "";
    setFinalTranscript(finalTranscriptRef.current);
    setInterimTranscript("");
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      return;
    }

    try {
      recognition.stop();
    } catch {
      // Stopping a recognition session that has not fully started can throw.
      try {
        recognition.abort();
      } catch {
        // Ignore abort errors as well; there is nothing left to stop.
      }
    }

    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognitionApi = getSpeechRecognitionApi();

    if (!SpeechRecognitionApi) {
      setError(
        "Voice input is not supported in this browser. Use a recent version of Chrome or Edge."
      );
      return false;
    }

    // A previous session may still be shutting down. Cancel it and detach its
    // handlers so it cannot change the state of the session starting now.
    if (recognitionRef.current) {
      const previousRecognition = recognitionRef.current;
      recognitionRef.current = null;
      previousRecognition.onstart = null;
      previousRecognition.onresult = null;
      previousRecognition.onerror = null;
      previousRecognition.onend = null;

      try {
        previousRecognition.abort();
      } catch {
        // The browser may already have ended the session.
      }

      finalizeInterim();
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = navigator.language || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");
    setError(null);

    recognition.onstart = () => {
      if (recognitionRef.current !== recognition) {
        return;
      }

      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) {
        return;
      }

      let interim = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        const text = result[0]?.transcript?.trim() ?? "";

        if (!text) {
          continue;
        }

        if (result.isFinal) {
          finalTranscriptRef.current = [
            finalTranscriptRef.current,
            text,
          ]
            .filter(Boolean)
            .join(" ");
        } else {
          interim = [interim, text].filter(Boolean).join(" ");
        }
      }

      interimTranscriptRef.current = interim;
      setFinalTranscript(finalTranscriptRef.current);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) {
        return;
      }

      recognitionRef.current = null;
      setIsListening(false);
      finalizeInterim();

      // "aborted" happens when the session is cancelled on purpose.
      if (event.error === "aborted") {
        return;
      }

      setError(
        ERROR_MESSAGES[event.error] ??
          "Speech recognition failed. Please try again."
      );
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) {
        return;
      }

      // Keep any words that arrived as interim results when listening stops.
      finalizeInterim();
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      return true;
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setError("Speech recognition could not start. Please try again.");
      return false;
    }
  }, [finalizeInterim]);

  // Stop and detach the recognition instance when the app unmounts.
  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;

      if (!recognition) {
        return;
      }

      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;

      try {
        recognition.abort();
      } catch {
        // The browser may already have ended the session.
      }

      recognitionRef.current = null;
    };
  }, []);

  const transcript = [finalTranscript, interimTranscript]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    isSupported,
    isListening,
    transcript,
    error,
    start,
    stop,
  };
}
