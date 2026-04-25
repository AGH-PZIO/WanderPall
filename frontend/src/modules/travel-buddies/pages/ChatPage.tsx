import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTravelBuddies } from "../hooks/useTravelBuddies";
import {
  sendMessage,
  addReaction,
} from "../api/travel-buddies-api";

export function ChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { messages, refreshMessages, accessToken } = useTravelBuddies();
  const [text, setText] = useState("");

  useEffect(() => {
    if (groupId) {
      refreshMessages(groupId);
    }
  }, [groupId, refreshMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !accessToken || !groupId) return;
    await sendMessage(accessToken, groupId, { content: text, attachment_ids: [] });
    setText("");
    refreshMessages(groupId);
  }

  async function handleReact(messageId: string, emoji: string) {
    if (!accessToken || !groupId) return;
    await addReaction(accessToken, groupId, messageId, emoji);
    refreshMessages(groupId);
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
              {[...new Map(Object.entries(msg.reactions || {}).filter(([, count]) => count > 0).map(([emoji, count]) => [decodeURIComponent(emoji), count])).entries()].map(([emoji, count]) => (
                <span key={emoji} className="tb-emoji-count">
                  {emoji} {count}
                </span>
              ))}
              <div className="tb-emoji-bar">
                {["👍", "❤️", "😄", "😢", "😮"].map((e) => (
                  <button key={e} type="button" onClick={() => handleReact(msg.id, e)}>
                    {e}
                  </button>
                ))}
              </div>
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
    </div>
  );
}