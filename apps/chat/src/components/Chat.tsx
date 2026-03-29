import { useState, useRef, useEffect, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SendHorizonal, Loader2 } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setIsStreaming(true)

    // Add empty assistant message to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    try {
      const res = await fetch("/v1.0/invoke/llm-proxy/method/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4.6",
          input: text,
          stream: true,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Error: ${res.status} — ${err}`,
          }
          return updated
        })
        setIsStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error("No response body")

      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6)
          if (data === "[DONE]") continue

          try {
            const event = JSON.parse(data)
            // Responses API streaming: look for output_text.delta
            if (event.type === "response.output_text.delta") {
              const delta = event.delta ?? ""
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + delta,
                }
                return updated
              })
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="mx-auto max-w-3xl space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="flex h-[60vh] items-center justify-center">
              <p className="text-muted-foreground text-lg">
                Send a message to start chatting.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <div className="max-w-[80%] rounded-lg bg-primary px-4 py-2 whitespace-pre-wrap text-primary-foreground">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[80%] rounded-lg bg-muted px-4 py-3 text-foreground">
                  <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-background/50 [&_pre]:p-3 [&_code]:rounded [&_code]:bg-background/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_p]:leading-relaxed [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_table]:text-sm [&_th]:px-3 [&_th]:py-1.5 [&_td]:px-3 [&_td]:py-1.5 [&_hr]:border-border">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  {isStreaming && i === messages.length - 1 && (
                    <span className="ml-1 inline-block animate-pulse text-muted-foreground">▊</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-background p-4">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message…"
            className="min-h-[44px] max-h-[200px] resize-none"
            rows={1}
            disabled={isStreaming}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizonal className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
