import React, { useEffect, useRef, useState } from "react";
import { FaBolt, FaMoon, FaPaperPlane, FaRobot, FaSmile, FaTimes } from "react-icons/fa";
import { askGroq } from "../api/groq";

const suggestions = [
  "Late-night thriller with a smart plot",
  "Feel-good movies for a weekend",
  "Movies like Interstellar",
];

const quickPicks = [
  { label: "Surprise me", icon: FaBolt, prompt: "Surprise me with 5 excellent movies I probably missed." },
  { label: "Comfort", icon: FaSmile, prompt: "Give me comforting feel-good movies for tonight." },
  { label: "After dark", icon: FaMoon, prompt: "Recommend intense late-night thrillers with strong pacing." },
];

export default function AiPopup() {
  const messagesRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    {
      ai: "Tell me your mood, a movie you already like, or who you are watching with. I will suggest a tighter watchlist.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [chat, loading, open]);

  const send = async (override) => {
    const text = (override || message).trim();
    if (!text || loading) return;

    const next = [...chat, { me: text }];
    setChat(next);
    setMessage("");
    setLoading(true);

    const response = await askGroq(text);
    setChat([...next, { ai: response }]);
    setLoading(false);
  };

  return (
    <>
      <button type="button" className="ai-float" onClick={() => setOpen((value) => !value)} aria-label="Open CineAI assistant">
        <FaRobot />
      </button>

      {open && (
        <aside className="ai-chat" aria-label="CineAI assistant">
          <header className="ai-header">
            <div>
              <strong>CineAI Assistant</strong>
              <span>Smart picks from mood and taste</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant">
              <FaTimes />
            </button>
          </header>

          <div className="ai-messages" ref={messagesRef} aria-live="polite">
            {chat.map((item, index) => (
              <div key={`${index}-${item.me || item.ai?.slice(0, 10)}`}>
                {item.me && <div className="message me">{item.me}</div>}
                {item.ai && <div className="message ai">{item.ai}</div>}
              </div>
            ))}
            {loading && <div className="message ai">Thinking through your taste profile...</div>}
          </div>

          <div className="quick-picks">
            {quickPicks.map((item) => {
              const Icon = item.icon;
              return (
                <button type="button" key={item.label} onClick={() => send(item.prompt)}>
                  <Icon />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="suggestion-chips">
            {suggestions.map((item) => (
              <button type="button" key={item} onClick={() => send(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="ai-input">
            <input
              placeholder="Ask for movies like Dune..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") send();
              }}
            />
            <button type="button" onClick={() => send()} aria-label="Send message">
              <FaPaperPlane />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
