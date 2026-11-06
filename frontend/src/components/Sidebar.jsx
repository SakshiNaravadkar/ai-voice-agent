import { formatRelativeTime, getConversationTitle } from "../utils/conversation.js";
import { ChatIcon, CloseIcon, PlusIcon, TrashIcon } from "./Icons.jsx";

function Sidebar({
  conversations,
  activeId,
  open,
  onClose,
  onNewChat,
  onSelect,
  onDelete,
}) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close chat history"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar ${open ? "sidebar--open" : ""}`}
        aria-label="Chat history"
      >
        <div className="sidebar__header">
          <div className="sidebar__heading">
            <span className="sidebar__icon" aria-hidden="true">
              <ChatIcon />
            </span>
            <div>
              <p className="eyebrow">History</p>
              <h2 className="sidebar__title">Conversations</h2>
            </div>
          </div>

          <button
            type="button"
            className="icon-button icon-button--ghost sidebar__close"
            onClick={onClose}
            aria-label="Close chat history"
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <button type="button" className="new-chat-button" onClick={onNewChat}>
          <PlusIcon />
          New chat
        </button>

        <nav className="sidebar__list" aria-label="Saved conversations">
          {conversations.map((conversation) => {
            const isActive = conversation.id === activeId;
            const title = getConversationTitle(conversation);

            return (
              <div
                key={conversation.id}
                className={`conversation-item ${
                  isActive ? "conversation-item--active" : ""
                }`}
              >
                <button
                  type="button"
                  className="conversation-item__main"
                  onClick={() => onSelect(conversation.id)}
                  aria-current={isActive}
                >
                  <span className="conversation-item__title">{title}</span>
                  <span className="conversation-item__time">
                    {formatRelativeTime(conversation.updatedAt)}
                  </span>
                </button>

                <button
                  type="button"
                  className="conversation-item__delete"
                  onClick={() => onDelete(conversation.id)}
                  aria-label={`Delete conversation: ${title}`}
                  title="Delete conversation"
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </nav>

        <p className="sidebar__footer">Saved on this device</p>
      </aside>
    </>
  );
}

export default Sidebar;
