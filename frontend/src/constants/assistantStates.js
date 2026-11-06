// The four interface states of the assistant.
// Each state has its own accent color used by the status pill, waveform and microphone.
export const ASSISTANT_STATES = [
  {
    id: "ready",
    label: "Ready",
    description: "Standing by. Click the microphone or type a message to begin.",
    color: "#34d399",
    soft: "rgba(52, 211, 153, 0.12)",
    border: "rgba(52, 211, 153, 0.32)",
  },
  {
    id: "listening",
    label: "Listening",
    description:
      "Microphone is active. Speak naturally — your words appear in the message box.",
    color: "#fb7185",
    soft: "rgba(251, 113, 133, 0.13)",
    border: "rgba(251, 113, 133, 0.32)",
  },
  {
    id: "thinking",
    label: "Thinking",
    description:
      "Waiting for the AI assistant to respond.",
    color: "#fbbf24",
    soft: "rgba(251, 191, 36, 0.12)",
    border: "rgba(251, 191, 36, 0.32)",
  },
  {
    id: "speaking",
    label: "Speaking",
    description: "Reading the AI reply aloud with your browser's built-in voice.",
    color: "#60a5fa",
    soft: "rgba(96, 165, 250, 0.12)",
    border: "rgba(96, 165, 250, 0.32)",
  },
];

// Look up a state by id, falling back to "Ready" for an unknown value.
export function getAssistantState(statusId) {
  return (
    ASSISTANT_STATES.find((state) => state.id === statusId) ??
    ASSISTANT_STATES[0]
  );
}
