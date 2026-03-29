import { useState, useEffect, useCallback } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/AppSidebar"
import { Chat } from "@/components/Chat"
import { deleteConversation } from "@/lib/state"

function App() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleNewChat = useCallback(() => {
    setConversationId(null)
  }, [])

  const handleSelect = useCallback((id: string) => {
    setConversationId(id)
  }, [])

  const handleConversationSaved = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  // Listen for delete events from sidebar
  useEffect(() => {
    const handler = async (e: Event) => {
      const id = (e as CustomEvent).detail
      await deleteConversation(id)
      if (conversationId === id) setConversationId(null)
      setRefreshKey((k) => k + 1)
    }
    window.addEventListener("delete-conversation", handler)
    return () => window.removeEventListener("delete-conversation", handler)
  }, [conversationId])

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          currentId={conversationId}
          onSelect={handleSelect}
          onNewChat={handleNewChat}
          refreshKey={refreshKey}
        />
        <Chat
          conversationId={conversationId}
          onConversationSaved={handleConversationSaved}
        />
      </SidebarProvider>
    </TooltipProvider>
  )
}

export default App
