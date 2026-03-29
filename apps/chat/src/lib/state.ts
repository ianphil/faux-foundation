const STORE_NAME = "statestore"
const LIST_KEY = "conversation-list"

export interface ConversationMeta {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
  preview: string
}

export interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  title: string
  model: string
  messages: Message[]
}

const stateUrl = (key: string) => `/v1.0/state/${STORE_NAME}/${key}`

export async function loadConversationList(): Promise<ConversationMeta[]> {
  const res = await fetch(stateUrl(LIST_KEY))
  if (!res.ok || res.status === 204) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function saveConversationList(list: ConversationMeta[]): Promise<void> {
  await fetch(`/v1.0/state/${STORE_NAME}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ key: LIST_KEY, value: list }]),
  })
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  const res = await fetch(stateUrl(`conversation:${id}`))
  if (!res.ok || res.status === 204) return null
  return res.json()
}

export async function saveConversation(conv: Conversation): Promise<void> {
  await fetch(`/v1.0/state/${STORE_NAME}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ key: `conversation:${conv.id}`, value: conv }]),
  })
}

export async function deleteConversation(id: string): Promise<void> {
  await fetch(stateUrl(`conversation:${id}`), { method: "DELETE" })
  const list = await loadConversationList()
  const updated = list.filter((c) => c.id !== id)
  await saveConversationList(updated)
}

export async function upsertConversationInList(conv: Conversation): Promise<void> {
  const list = await loadConversationList()
  const firstUserMsg = conv.messages.find((m) => m.role === "user")
  const preview = conv.messages[conv.messages.length - 1]?.content.slice(0, 80) ?? ""
  const title = conv.title || firstUserMsg?.content.slice(0, 50) || "New conversation"

  const existing = list.findIndex((c) => c.id === conv.id)
  const meta: ConversationMeta = {
    id: conv.id,
    title,
    model: conv.model,
    createdAt: existing >= 0 ? list[existing].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preview,
  }

  if (existing >= 0) {
    list[existing] = meta
  } else {
    list.unshift(meta)
  }

  await saveConversationList(list)
}
