import { useEffect, useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { SquarePen, Trash2, MessageSquare } from "lucide-react"
import { loadConversationList, type ConversationMeta } from "@/lib/state"

interface AppSidebarProps {
  currentId: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
  refreshKey: number
}

function groupByDate(conversations: ConversationMeta[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const groups: { label: string; items: ConversationMeta[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 Days", items: [] },
    { label: "Older", items: [] },
  ]

  for (const c of conversations) {
    const d = new Date(c.updatedAt)
    if (d >= today) groups[0].items.push(c)
    else if (d >= yesterday) groups[1].items.push(c)
    else if (d >= weekAgo) groups[2].items.push(c)
    else groups[3].items.push(c)
  }

  return groups.filter((g) => g.items.length > 0)
}

export function AppSidebar({ currentId, onSelect, onNewChat, refreshKey }: AppSidebarProps) {
  const [conversations, setConversations] = useState<ConversationMeta[]>([])

  useEffect(() => {
    loadConversationList().then(setConversations).catch(() => setConversations([]))
  }, [refreshKey])

  const groups = groupByDate(conversations)

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={onNewChat}
            >
              <SquarePen className="h-4 w-4" />
              New Chat
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No conversations yet
          </div>
        )}
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((conv) => (
                  <SidebarMenuItem key={conv.id}>
                    <SidebarMenuButton
                      isActive={conv.id === currentId}
                      onClick={() => onSelect(conv.id)}
                      className="truncate"
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <span className="truncate">{conv.title}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={(e) => {
                        e.stopPropagation()
                        // Delete handled by parent via custom event
                        window.dispatchEvent(
                          new CustomEvent("delete-conversation", { detail: conv.id })
                        )
                      }}
                      className="opacity-0 group-hover/menu-item:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1 text-xs text-muted-foreground">Faux Foundation</div>
      </SidebarFooter>
    </Sidebar>
  )
}
