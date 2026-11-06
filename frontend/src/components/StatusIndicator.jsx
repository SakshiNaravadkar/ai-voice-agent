import { getAssistantState } from "../constants/assistantStates.js";

// Reusable status pill. The color comes from CSS custom properties set by the parent.
function StatusIndicator({ status }) {
  const state = getAssistantState(status);
  const isLive = status !== "ready";

  return (
    <span
      className={`status-indicator ${isLive ? "is-live" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="status-indicator__dot" aria-hidden="true" />
      <span>{state.label}</span>
    </span>
  );
}

export default StatusIndicator;
