import { getAssistantState } from "../constants/assistantStates.js";
import {
  MenuIcon,
  MicIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
} from "./Icons.jsx";

// Top bar: brand, live status, theme switch, settings and the sidebar toggle
// (used on smaller screens where the history drawer is collapsed).
function AppHeader({ status, theme, onToggleTheme, onToggleSidebar, onOpenSettings }) {
  const state = getAssistantState(status);
  const isDark = theme === "dark";

  return (
    <header className="topbar">
      <div className="brand">
        <button
          type="button"
          className="icon-button icon-button--ghost topbar__sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle chat history"
          title="Chat history"
        >
          <MenuIcon />
        </button>

        <span className="brand__mark" aria-hidden="true">
          <MicIcon />
        </span>
        <div className="brand__text">
          <p className="brand__eyebrow">AI Voice Agent</p>
          <h1 className="brand__title">Voice Assistant</h1>
        </div>
      </div>

      <div className="topbar__meta">
        <span
          className="header-status"
          style={{
            "--status-color": state.color,
            "--status-soft": state.soft,
            "--status-border": state.border,
          }}
        >
          <span className="status-indicator__dot" aria-hidden="true" />
          {state.label}
        </span>

        <span className="topbar__text">Groq powered</span>

        <button
          type="button"
          className="icon-button icon-button--ghost"
          onClick={onToggleTheme}
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          title={isDark ? "Light theme" : "Dark theme"}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>

        <button
          type="button"
          className="icon-button icon-button--ghost"
          onClick={onOpenSettings}
          aria-label="Open voice settings"
          title="Voice settings"
        >
          <SettingsIcon />
        </button>
      </div>
    </header>
  );
}

export default AppHeader;
