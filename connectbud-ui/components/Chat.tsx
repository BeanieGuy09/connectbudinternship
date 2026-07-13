"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);

    setInput("");

    const response = await fetch("http://localhost:3001/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: input,
      }),
    });

    const data = await response.json();

    const assistantMessage: Message = {
      role: "assistant",
      content: data.reply,
    };

    setMessages((prev) => [
      ...prev,
      assistantMessage,
    ]);
  }

  return (
    <div
      style={{
        width: "600px",
        margin: "40px auto",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          height: "500px",
          border: "1px solid #ccc",
          padding: "20px",
          overflowY: "auto",
          marginBottom: "10px",
        }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              marginBottom: "15px",
              textAlign:
                message.role === "user"
                  ? "right"
                  : "left",
            }}
          >
            <b>
              {message.role === "user"
                ? "You"
                : "Tutor"}
              :
            </b>

            <p>{message.content}</p>
          </div>
        ))}
      </div>

      <input
        style={{
          width: "80%",
          padding: "10px",
        }}
        value={input}
        onChange={(e) =>
          setInput(e.target.value)
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            sendMessage();
          }
        }}
        placeholder="Ask ConnectBud Tutor..."
      />

      <button
        style={{
          padding: "10px",
          marginLeft: "10px",
        }}
        onClick={sendMessage}
      >
        Send
      </button>
    </div>
  );
}