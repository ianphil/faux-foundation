import { useReducer, useRef, useEffect, useCallback, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { SendHorizonal, Loader2, ChevronDown } from "lucide-react"
import {
  saveConversation,
  loadConversation,
  upsertConversationInList,
  type Message,
  type Conversation,
} from "@/lib/state"

// --- State machine ---

type ChatPhase = "empty" | "loading" | "ready" | "streaming" | "error"

interface ChatState {
  phase: ChatPhase
  conversationId: string | null
  title: string
  model: string
  messages: Message[]
  error: string | null
}

type ChatAction =
  | { type: "NEW_CHAT" }
  | { type: "LOAD_START"; conversationId: string }
  | { type: "LOAD_COMPLETE"; conversation: Conversation }
  | { type: "LOAD_FAILED"; error: string }
  | { type: "SEND_MESSAGE"; text: string; conversationId: string; title: string }
  | { type: "STREAM_DELTA"; delta: string }
  | { type: "STREAM_COMPLETE"; finalContent: string }
  | { type: "STREAM_ERROR"; error: string }
  | { type: "SET_MODEL"; model: string }

const DEFAULT_MODEL = "claude-sonnet-4.6"

function createInitialState(): ChatState {
  return {
    phase: "empty",
    conversationId: null,
    title: "",
    model: DEFAULT_MODEL,
    messages: [],
    error: null,
  }
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "NEW_CHAT":
      return createInitialState()

    case "LOAD_START":
      return { ...state, phase: "loading", conversationId: action.conversationId }

    case "LOAD_COMPLETE":
      return {
        ...state,
        phase: "ready",
        conversationId: action.conversation.id,
        title: action.conversation.title,
        model: action.conversation.model,
        messages: action.conversation.messages,
        error: null,
      }

    case "LOAD_FAILED":
      return { ...state, phase: "error", error: action.error }

    case "SEND_MESSAGE": {
      const userMsg: Message = { role: "user", content: action.text, timestamp: new Date().toISOString() }
      const assistantMsg: Message = { role: "assistant", content: "", timestamp: new Date().toISOString() }
      return {
        ...state,
        phase: "streaming",
        conversationId: action.conversationId,
        title: action.title,
        messages: [...state.messages, userMsg, assistantMsg],
        error: null,
      }
    }

    case "STREAM_DELTA": {
      const msgs = [...state.messages]
      const last = msgs[msgs.length - 1]
      msgs[msgs.length - 1] = { ...last, content: last.content + action.delta }
      return { ...state, messages: msgs }
    }

    case "STREAM_COMPLETE": {
      const msgs = [...state.messages]
      const last = msgs[msgs.length - 1]
      msgs[msgs.length - 1] = { ...last, content: action.finalContent, timestamp: new Date().toISOString() }
      return { ...state, phase: "ready", messages: msgs }
    }

    case "STREAM_ERROR": {
      const msgs = [...state.messages]
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: `Error: ${action.error}` }
      return { ...state, phase: "error", messages: msgs, error: action.error }
    }

    case "SET_MODEL":
      return { ...state, model: action.model }

    default:
      return state
  }
}

// --- Component ---

interface Model {
  id: string
  name: string
}

interface ChatProps {
  conversationId: string | null
  onConversationSaved: () => void
}

export function Chat({ conversationId, onConversationSaved }: ChatProps) {
  const [state, dispatch] = useReducer(chatReducer, undefined, createInitialState)
  const [input, setInput] = useState("")
  const [models, setModels] = useState<Model[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load conversation when prop changes
  useEffect(() => {
    if (conversationId === null) {
      dispatch({ type: "NEW_CHAT" })
      return
    }
    dispatch({ type: "LOAD_START", conversationId })
    loadConversation(conversationId).then((conv) => {
      if (conv) {
        dispatch({ type: "LOAD_COMPLETE", conversation: conv })
      } else {
        dispatch({ type: "LOAD_FAILED", error: "Conversation not found" })
      }
    }).catch((err) => {
      dispatch({ type: "LOAD_FAILED", error: String(err) })
    })
  }, [conversationId])

  // Fetch available models on mount
  useEffect(() => {
    fetch("/v1.0/invoke/llm-proxy/method/v1/models")
      .then((res) => res.json())
      .then((data) => {
        const fetched: Model[] = (data.data ?? []).map((m: { id: string; name: string }) => ({
          id: m.id,
          name: m.name,
        }))
        setModels(fetched)
      })
      .catch(() => {
        setModels([{ id: DEFAULT_MODEL, name: "Claude Sonnet 4.6" }])
      })
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [state.messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || state.phase === "streaming") return

    const convId = state.conversationId ?? crypto.randomUUID()
    const convTitle = state.title || text.slice(0, 50)

    setInput("")
    dispatch({ type: "SEND_MESSAGE", text, conversationId: convId, title: convTitle })

    let fullContent = ""

    try {
      const res = await fetch("/v1.0/invoke/llm-proxy/method/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: state.model, input: text, stream: true }),
      })

      if (!res.ok) {
        const err = await res.text()
        dispatch({ type: "STREAM_ERROR", error: `${res.status} — ${err}` })
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
            if (event.type === "response.output_text.delta") {
              const delta = event.delta ?? ""
              fullContent += delta
              dispatch({ type: "STREAM_DELTA", delta })
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }

      dispatch({ type: "STREAM_COMPLETE", finalContent: fullContent })

      // Persist — build final messages from the pre-send state + new pair
      const userMsg: Message = { role: "user", content: text, timestamp: new Date().toISOString() }
      const assistantMsg: Message = { role: "assistant", content: fullContent, timestamp: new Date().toISOString() }
      const finalMessages = [...state.messages, userMsg, assistantMsg]

      const conv: Conversation = { id: convId, title: convTitle, model: state.model, messages: finalMessages }
      await saveConversation(conv)
      await upsertConversationInList(conv)
      onConversationSaved()
    } catch (err) {
      dispatch({ type: "STREAM_ERROR", error: err instanceof Error ? err.message : String(err) })
    }
  }, [input, state, onConversationSaved])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isStreaming = state.phase === "streaming"
  const isLoading = state.phase === "loading"

  return (
    <div className="flex h-screen flex-1 flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-sm font-medium text-foreground truncate max-w-[200px]">
            {state.title || "New Chat"}
          </h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              {models.find((m) => m.id === state.model)?.name ?? state.model}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
            <DropdownMenuLabel>Model</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={state.model}
              onValueChange={(m) => dispatch({ type: "SET_MODEL", model: m })}
            >
              {models.map((m) => (
                <DropdownMenuRadioItem key={m.id} value={m.id}>
                  {m.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="mx-auto max-w-3xl space-y-4 pb-4">
          {isLoading && (
            <div className="flex h-[60vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && state.messages.length === 0 && (
            <div className="flex h-[60vh] items-center justify-center">
              <p className="text-muted-foreground text-lg">
                Send a message to start chatting.
              </p>
            </div>
          )}
          {state.messages.map((msg, i) => (
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
                  {isStreaming && i === state.messages.length - 1 && (
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
            disabled={isStreaming || isLoading}
            autoFocus
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || isLoading}
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
