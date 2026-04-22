import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTravelBuddies } from "../hooks/useTravelBuddies";
import {
  sendMessage,
  addReaction,
} from "../api/travel-buddies-api";

function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem("wanderpall.account.tokens");
    if (!raw) return null;
    const tokens = JSON.parse(raw);
    return tokens.accessToken || null;
  } catch {
    return null;
  }
}

export function ChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { messages, refreshMessages } = useTravelBuddies();
  const [text, setText] = useState("");

  useEffect(() => {
    refreshMessages();
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!text.trim() || !token || !groupId) return;
    await sendMessage(token, groupId, { content: text });
    setText("");
    refreshMessages();
  }

  async function handleReact(emoji: string) {
    const token = getAccessToken();
    if (!token || !groupId) return;
    const msgId = messages[0]?.id;
    if (!msgId) return;
    await addReaction(token, groupId, msgId, emoji);
    refreshMessages();
  }

  if (!groupId) {
    return <div className="tb-empty">No group selected</div>;
  }

  return (
    <div className="tb-chat">
      <div className="tb-chat-messages">
        {messages.length === 0 ? (
          <div className="tb-chat-empty">No messages yet</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="tb-message">
              <div className="tb-message-author">{msg.user_id}</div>
              <div className="tb-message-content">{msg.content}</div>
              {Object.entries(msg.reactions || {}).map(([emoji, count]) => (
                <span key={emoji} className="tb-emoji-count">
                  {emoji} {count}
                </span>
              ))}
            </div>
          ))
        )}
      </div>
      <form className="tb-chat-input" onSubmit={handleSend}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          maxLength={5000}
        />
        <button type="submit">Send</button>
      </form>
      <div className="tb-emoji-bar">
        {["👍", "❤️", "😄", "😢", "😮"].map((e) => (
          <button key={e} type="button" onClick={() => handleReact(e)}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}