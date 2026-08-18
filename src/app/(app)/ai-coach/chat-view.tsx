"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Proposal } from "@/lib/ai/types";
import type { ChatMessage } from "@/lib/services/ai-service";
import { sendMessageAction } from "./actions";
import { ProposalCard } from "./proposal-card";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposals?: Proposal[];
};

const SUGGESTED_PROMPTS = [
  "How did I do this week?",
  "Analyze my habits.",
  "What should I improve?",
  "Compare my habits.",
  "Show my strongest streaks.",
  "What changed this month?",
];

export function ChatView({
  initialConversationId,
  initialMessages,
}: {
  initialConversationId: string | null;
  initialMessages: ChatMessage[];
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<UiMessage[]>(
    initialMessages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);
    setInput("");
    setError(null);

    startTransition(async () => {
      const result = await sendMessageAction(conversationId, trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setConversationId(result.conversationId);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: result.text, proposals: result.proposals },
      ]);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Coach</h1>
        <p className="text-sm text-muted-foreground">Ask about your real tracked data.</p>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <Button key={prompt} variant="outline" size="sm" onClick={() => send(prompt)}>
              {prompt}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="space-y-2">
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "mr-auto bg-muted",
              )}
            >
              {m.content}
            </div>
            {m.proposals?.map((p, i) => (
              <div key={i} className="mr-auto max-w-[85%]">
                <ProposalCard proposal={p} />
              </div>
            ))}
          </div>
        ))}
        {isPending ? (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
            <Sparkles className="size-3.5 animate-pulse" /> Thinking…
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div ref={bottomRef} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-20 flex gap-2 rounded-xl border bg-background p-2 shadow-sm md:bottom-4"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything…"
          disabled={isPending}
          className="border-0 shadow-none focus-visible:ring-0"
        />
        <Button type="submit" size="icon" disabled={isPending || !input.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
