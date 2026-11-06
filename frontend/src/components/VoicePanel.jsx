import { getAssistantState } from "../constants/assistantStates.js";
import {
  InfoIcon,
  MicIcon,
  SettingsIcon,
  StopIcon,
  VolumeIcon,
} from "./Icons.jsx";
import MicrophoneButton from "./MicrophoneButton.jsx";
import StatusIndicator from "./StatusIndicator.jsx";
import Waveform from "./Waveform.jsx";

function VoicePanel({
  status,
  isListening,
  isSupported,
  error,
  onMicToggle,
  onStopListening,
  isSpeaking,
  speechOutputSupported,
  speechOutputError,
  onStopSpeaking,
  onOpenSettings,
}) {
  const currentState = getAssistantState(status);
  const notice = !isSupported
    ? {
        type: "warning",
        message:
          "Voice input is not supported in this browser. Use a recent version of Chrome or Edge, and open the app over HTTPS or localhost. You can still type messages below.",
      }
    : error
      ? { type: "error", message: error }
      : null;

  return (
    <section
      className="panel voice-panel"
      aria-label="Voice assistant"
      style={{
        "--status-color": currentState.color,
        "--status-soft": currentState.soft,
        "--status-border": currentState.border,
      }}
    >
      <header className="voice-panel__header">
        <div>
          <p className="eyebrow">Assistant</p>
          <h2 className="voice-panel__title">Speak naturally</h2>
        </div>
        <span className="demo-tag">
          {isListening
            ? "Mic live"
            : isSpeaking
              ? "Speaking"
              : isSupported
                ? "Voice input"
                : "Unavailable"}
        </span>
      </header>

      <div className={`mic-stage mic-stage--${status}`}>
        <span className="mic-stage__halo" aria-hidden="true" />
        <span
          className="mic-stage__ring mic-stage__ring--outer"
          aria-hidden="true"
        />
        <span className="mic-stage__ring" aria-hidden="true" />
        <MicrophoneButton
          listening={isListening}
          disabled={!isSupported}
          onClick={onMicToggle}
        />
      </div>

      <Waveform status={status} />

      <div className="voice-status">
        <StatusIndicator status={status} />
        <p className="voice-status__description">{currentState.description}</p>
      </div>

      <div className="voice-controls">
        <div className="voice-controls__row">
          <span className="voice-controls__label">Microphone</span>
          <span className="voice-controls__meta">
            {isListening ? "Listening now" : "Web Speech API"}
          </span>
        </div>

        <button
          type="button"
          className={`action-button ${
            isListening ? "action-button--stop" : "action-button--primary"
          }`}
          onClick={isListening ? onStopListening : onMicToggle}
          disabled={!isSupported}
        >
          {isListening ? <StopIcon /> : <MicIcon />}
          {isListening ? "Stop microphone" : "Start microphone"}
        </button>

        {notice && (
          <p className={`voice-alert voice-alert--${notice.type}`} role="alert">
            <InfoIcon />
            <span>{notice.message}</span>
          </p>
        )}

        <div className="voice-controls__row voice-controls__row--section">
          <span className="voice-controls__label">Playback</span>
          <span className="voice-controls__meta">
            {isSpeaking ? "Reading reply" : "Browser voices"}
          </span>
        </div>

        {speechOutputSupported ? (
          <div className="voice-controls__buttons">
            <button
              type="button"
              className="action-button action-button--ghost"
              onClick={onStopSpeaking}
              disabled={!isSpeaking}
            >
              <StopIcon />
              Stop speaking
            </button>
            <button
              type="button"
              className="action-button action-button--ghost"
              onClick={onOpenSettings}
            >
              <SettingsIcon />
              Voice settings
            </button>
          </div>
        ) : (
          <p className="voice-controls__message">
            Text-to-speech playback is not supported in this browser. AI replies
            will appear as text only.
          </p>
        )}

        {speechOutputError && (
          <p className="voice-alert voice-alert--error" role="alert">
            <InfoIcon />
            <span>{speechOutputError}</span>
          </p>
        )}
      </div>

      <p className="demo-note">
        <VolumeIcon />
        <span>
          {speechOutputSupported
            ? "Speech is converted to text by your browser, and AI replies are read aloud with the voice you choose in settings."
            : "Speech is converted to text by your browser. AI replies are shown as text because text-to-speech is unavailable here."}
        </span>
      </p>
    </section>
  );
}

export default VoicePanel;
