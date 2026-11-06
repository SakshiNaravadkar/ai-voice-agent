import { useEffect } from "react";
import { CloseIcon, VolumeIcon } from "./Icons.jsx";

// Slide-over panel with the browser voice picker and the speech speed slider.
function SettingsPanel({
  open,
  onClose,
  voices,
  voiceURI,
  onVoiceChange,
  rate,
  onRateChange,
  supported,
}) {
  // Close on Escape while the panel is open.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="settings-layer">
      <button
        type="button"
        className="sidebar-scrim"
        aria-label="Close settings"
        onClick={onClose}
      />

      <aside
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Voice settings"
      >
        <div className="settings-panel__header">
          <div className="settings-panel__heading">
            <span className="settings-panel__icon" aria-hidden="true">
              <VolumeIcon />
            </span>
            <div>
              <p className="eyebrow">Preferences</p>
              <h2 className="settings-panel__title">Voice settings</h2>
            </div>
          </div>

          <button
            type="button"
            className="icon-button icon-button--ghost"
            onClick={onClose}
            aria-label="Close settings"
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {!supported ? (
          <p className="settings-panel__note">
            Text-to-speech is not available in this browser, so there are no
            voices to configure. AI replies will still appear as text.
          </p>
        ) : (
          <>
            <div className="settings-field">
              <div className="settings-field__head">
                <label
                  className="settings-field__label"
                  htmlFor="voice-select"
                >
                  Voice
                </label>
                <span className="settings-field__value">
                  {voices.length} available
                </span>
              </div>

              <select
                id="voice-select"
                className="settings-select"
                value={voiceURI}
                onChange={(event) => onVoiceChange(event.target.value)}
              >
                <option value="">Automatic (browser default)</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} · {voice.lang}
                    {voice.default ? " · Default" : ""}
                  </option>
                ))}
              </select>

              {voices.length === 0 && (
                <p className="settings-panel__note">
                  No voices have loaded yet. They usually appear a moment after
                  the page opens.
                </p>
              )}
            </div>

            <div className="settings-field">
              <div className="settings-field__head">
                <label
                  className="settings-field__label"
                  htmlFor="rate-slider"
                >
                  Speech speed
                </label>
                <span className="settings-field__value">
                  {rate.toFixed(1)}×
                </span>
              </div>

              <input
                id="rate-slider"
                className="settings-range"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={rate}
                onChange={(event) => onRateChange(Number(event.target.value))}
              />

              <div className="settings-range__scale" aria-hidden="true">
                <span>Slower</span>
                <span>Normal</span>
                <span>Faster</span>
              </div>
            </div>

            <p className="settings-panel__note">
              These preferences are saved in your browser and used the next time
              a reply is read aloud.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}

export default SettingsPanel;
