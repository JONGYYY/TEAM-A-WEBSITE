"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import {
  getChats,
  createChat,
  getMessages,
  addMessage,
  renameChat,
} from "@/lib/essays";
import type { EssayChat, EssayMessage, EssayPromptSnapshot } from "@/lib/types";
import s from "./EssayChatPanel.module.css";

interface Props {
  essayId: string;
  ownerEmail: string;
  promptSnapshot: EssayPromptSnapshot;
  getEssayText: () => string;
  selection: string;
  clearSelection: () => void;
  profileSummary?: string;
}

interface Idea { title: string; angle: string; why: string; opening: string }

const QUICK: { label: string; text: string }[] = [
  { label: "Outline it", text: "Help me outline this essay into clear parts based on the prompt." },
  { label: "Improve this section", text: "How can I make the section I'm working on more specific and vivid?" },
  { label: "Check prompt fit", text: "Does my draft actually answer the prompt? What am I missing?" },
];

function formatIdeas(ideas: Idea[]): string {
  if (!ideas.length) return "I couldn't pull ideas from your profile just now. Tell me a moment that mattered to you and we'll build from there.";
  return (
    "Here are a few authentic angles drawn from your profile:\n\n" +
    ideas
      .map((i, n) => `${n + 1}. ${i.title}\n   ${i.angle}${i.why ? `\n   Why it fits: ${i.why}` : ""}${i.opening ? `\n   Try opening: "${i.opening}"` : ""}`)
      .join("\n\n") +
    "\n\nWant to develop one of these? Tell me the number and I'll help you outline it."
  );
}

export function EssayChatPanel({ essayId, ownerEmail, promptSnapshot, getEssayText, selection, clearSelection, profileSummary }: Props) {
  const [chats, setChats] = useState<EssayChat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<EssayMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);

  // Load or create the essay's chat threads.
  useEffect(() => {
    let active = true;
    (async () => {
      let list = await getChats(essayId);
      if (!list.length) {
        const c = await createChat(essayId, ownerEmail);
        if (c) list = [c];
      }
      if (!active) return;
      setChats(list);
      setActiveChat((prev) => prev ?? list[0]?.id ?? null);
    })();
    return () => { active = false; };
  }, [essayId, ownerEmail]);

  useEffect(() => {
    if (!activeChat) return;
    let active = true;
    getMessages(activeChat).then((m) => { if (active) setMessages(m); });
    return () => { active = false; };
  }, [activeChat]);

  useEffect(() => {
    msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function newThread() {
    const c = await createChat(essayId, ownerEmail);
    if (c) {
      setChats((prev) => [...prev, c]);
      setActiveChat(c.id);
      setMessages([]);
    }
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy || !activeChat) return;
    setInput("");
    setBusy(true);

    const userMsg: EssayMessage = { id: `tmp_${Date.now()}`, chatId: activeChat, role: "user", content, createdAt: new Date().toISOString() };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    const sel = selection;
    clearSelection();
    addMessage(activeChat, "user", content).catch(() => {});

    // Rename a fresh thread to the first question.
    const chat = chats.find((c) => c.id === activeChat);
    if (chat && chat.title === "New chat") {
      const title = content.slice(0, 40);
      renameChat(activeChat, title).catch(() => {});
      setChats((prev) => prev.map((c) => (c.id === activeChat ? { ...c, title } : c)));
    }

    setStreaming("");
    let acc = "";
    try {
      const res = await fetch("/api/essay/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptSnapshot,
          essayText: getEssayText(),
          selection: sel,
          history,
          message: content,
        }),
      });
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setStreaming(acc);
        }
      } else {
        acc = await res.text();
      }
    } catch {
      acc = acc || "Sorry — I couldn't reach the AI service. Please try again.";
    }

    const aiMsg: EssayMessage = { id: `tmp_ai_${Date.now()}`, chatId: activeChat, role: "assistant", content: acc, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, aiMsg]);
    setStreaming(null);
    setBusy(false);
    addMessage(activeChat, "assistant", acc).catch(() => {});
  }

  async function brainstorm() {
    if (busy || !activeChat) return;
    setBusy(true);
    const q: EssayMessage = { id: `tmp_${Date.now()}`, chatId: activeChat, role: "user", content: "Brainstorm essay ideas from my profile", createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, q]);
    addMessage(activeChat, "user", q.content).catch(() => {});
    setStreaming("");
    let text = "";
    try {
      const res = await fetch("/api/essay/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptSnapshot, profileSummary: profileSummary || "" }),
      });
      const data = (await res.json()) as { ideas?: Idea[] };
      text = formatIdeas(data.ideas ?? []);
    } catch {
      text = "I couldn't brainstorm just now. Tell me a moment that mattered to you and we'll build from there.";
    }
    const aiMsg: EssayMessage = { id: `tmp_ai_${Date.now()}`, chatId: activeChat, role: "assistant", content: text, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, aiMsg]);
    setStreaming(null);
    setBusy(false);
    addMessage(activeChat, "assistant", text).catch(() => {});
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const empty = messages.length === 0 && streaming === null;

  return (
    <div className={s.chat}>
      <div className={s.threads}>
        <select className={s.threadSel} value={activeChat ?? ""} onChange={(e) => setActiveChat(e.target.value)} aria-label="Chat thread">
          {chats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <button className={s.iconBtn} onClick={newThread} aria-label="New chat thread" title="New chat"><Icon name="spark" size={16} /></button>
      </div>

      <div className={s.msgs} ref={msgsRef}>
        {empty && (
          <div className={s.intro}>
            <span className={s.emptyIcon}><Icon name="sparkle" size={22} /></span>
            <h4>Your writing coach</h4>
            <p>Ask for ideas, structure help, or feedback on any part of your draft. Highlight text in the editor to ask about it directly.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`${s.msg} ${m.role === "user" ? s.msgUser : s.msgAI}`}>
            <div className={s.bubble}>{m.content}</div>
          </div>
        ))}
        {streaming !== null && (
          <div className={`${s.msg} ${s.msgAI}`}>
            <div className={s.bubble}>
              {streaming || <span className={s.typingDots}><span /><span /><span /></span>}
            </div>
          </div>
        )}
      </div>

      {empty && (
        <div className={s.quick}>
          <button className={s.quickBtn} onClick={brainstorm} disabled={busy}>Brainstorm from my profile</button>
          {QUICK.map((q) => (
            <button key={q.label} className={s.quickBtn} onClick={() => send(q.text)} disabled={busy}>{q.label}</button>
          ))}
        </div>
      )}

      {selection && (
        <div className={s.selChip}>
          <Icon name="quote" size={14} />
          <span>{selection}</span>
          <button onClick={clearSelection} aria-label="Clear selection"><Icon name="x" size={14} /></button>
        </div>
      )}

      <div className={s.composer}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={selection ? "Ask about the highlighted text…" : "Ask your writing coach…"}
          rows={1}
          aria-label="Message"
        />
        <button className={s.sendBtn} onClick={() => send(input)} disabled={busy || !input.trim()} aria-label="Send">
          <Icon name="arrow" size={18} />
        </button>
      </div>
    </div>
  );
}
