import React, { useState, useRef, useEffect } from "react";
import "./Chatbot.css";

import { apiUrl } from "../../config/api";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Chào bạn! Mình là AI của PTIT. Bạn cần tìm hiểu gì về trường?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatBoxRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input;
    // 1. Hiện tin nhắn user
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");
    setIsLoading(true);

    try {
      // 2. Gửi sang Backend Gemini
      const response = await fetch(apiUrl("api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      const data = await response.json();
      
      // 3. Hiện phản hồi AI
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: "bot", text: "Lỗi kết nối." }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "bot", text: "Server không phản hồi." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <>
      <button className="chatbot-toggler" onClick={() => setIsOpen(!isOpen)}>
        <span style={{ opacity: isOpen ? 0 : 1 }}><i className="bi bi-chat-dots-fill"></i></span>
        <span style={{ opacity: isOpen ? 1 : 0 }}><i className="bi bi-x-lg"></i></span>
      </button>

      <div className={`chatbot-window ${isOpen ? "show" : ""}`}>
        <div className="chat-header">
          <i className="bi bi-robot" style={{fontSize: '1.5rem'}}></i>
          <div>
            <h3>PTIT Assistant</h3>
            <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>Online</span>
          </div>
        </div>

        <div className="chat-box" ref={chatBoxRef}>
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              {msg.text}
            </div>
          ))}
          {isLoading && (
            <div className="message bot">
              <span className="typing-indicator">Đang nhập...</span>
            </div>
          )}
        </div>

        <div className="chat-input-area">
          <input
            type="text"
            placeholder="Nhập câu hỏi..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button className="send-btn" onClick={handleSend} disabled={isLoading}>
            <i className="bi bi-send-fill"></i>
          </button>
        </div>
      </div>
    </>
  );
}