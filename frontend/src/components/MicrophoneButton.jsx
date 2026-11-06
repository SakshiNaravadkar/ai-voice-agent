import { MicIcon } from "./Icons.jsx";

// Central microphone control. Clicking it starts or stops real browser
// speech recognition. The browser handles the microphone permission prompt.
// While listening it shows animated pulse rings driven purely by CSS.
function MicrophoneButton({ listening, disabled, onClick }) {
  let label = "Start voice input";

  if (disabled) {
    label = "Voice input is not supported in this browser";
  } else if (listening) {
    label = "Stop listening";
  }

  return (
    <button
      type="button"
      className={`mic-button ${listening ? "is-listening" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={label}
      title={label}
    >
      {listening && (
        <>
          <span className="mic-button__pulse" aria-hidden="true" />
          <span
            className="mic-button__pulse mic-button__pulse--delay"
            aria-hidden="true"
          />
        </>
      )}
      <MicIcon />
    </button>
  );
}

export default MicrophoneButton;
