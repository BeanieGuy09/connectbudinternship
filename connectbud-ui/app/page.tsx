"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm **ConnectBud Tutor** 👋\n\nI can answer questions, recommend courses, and help you find tutors.\n\nWhat would you like to learn today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestedPrompts = [
    "Teach me about water",
    "Recommend a course for someone who likes Legos",
    "Find me a physics tutor",
    "What are Legos made of?",
    "I like castles. What should I learn?",
  ];

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(messageText?: string) {
    const userMessage = (messageText ?? input).trim();

    if (!userMessage || loading) return;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong connecting to the server.",
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#f7faf6",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "white",
          borderBottom: "4px solid #43A047",
          padding: "24px",
          boxShadow: "0 2px 12px rgba(0,0,0,.05)",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "#2E7D32",
            fontSize: 34,
          }}
        >
          🌿 ConnectBud Tutor
        </h1>

        <p
          style={{
            marginTop: 8,
            color: "#666",
          }}
        >
          Personalized tutoring, course recommendations, and learning
          assistance.
        </p>
      </header>

      {/* Chat Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "25px",
        }}
      >
        {/* Suggested prompts */}
        {messages.length === 1 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 30,
            }}
          >
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "1px solid #81C784",
                  background: "white",
                  color: "#2E7D32",
                  cursor: "pointer",
                  fontWeight: 500,
                  transition: "0.2s",
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent:
                message.role === "user"
                  ? "flex-end"
                  : "flex-start",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                maxWidth: "72%",
                padding: "14px 18px",
                borderRadius: 18,
                lineHeight: 1.6,
                background:
                  message.role === "user"
                    ? "#43A047"
                    : "#ffffff",
                color:
                  message.role === "user"
                    ? "white"
                    : "#333",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,.08)",
              }}
            >
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        ))}

        {loading && (
          <div
            style={{
              color: "#2E7D32",
              marginBottom: 15,
            }}
          >
            🌿 ConnectBud Tutor is thinking...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: 20,
          borderTop: "1px solid #d8e8d5",
          background: "white",
        }}
      >
        <input
          value={input}
          placeholder="Ask anything..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
          style={{
            flex: 1,
            padding: "16px",
            borderRadius: "14px",
            border: "2px solid #A5D6A7",
            fontSize: 16,
            color: "#222",
            background: "#ffffff",
            outline: "none",
          }}
        />

        <button
          onClick={() => sendMessage()}
          disabled={loading}
          style={{
            padding: "14px 26px",
            borderRadius: "14px",
            border: "none",
            background: "#43A047",
            color: "white",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(255,152,0,.25)",
          }}
        >
          Send →
        </button>
      </div>
    </main>
  );
}