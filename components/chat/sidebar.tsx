"use client"

// Imports
// -----------------------------------------------
import Link from "next/link"
import { cn } from "@/lib/utils"

// Types
// -----------------------------------------------
import type { Channel, User } from "@/types/database"
import type { SidebarProps } from "./shared/types"

// Components
// -----------------------------------------------
import { UserAvatar } from "./shared"

// Internal Types
// -----------------------------------------------
interface ChannelListProps {
  channels: Channel[]
  currentView: SidebarProps['currentView']
}

interface DirectMessageListProps {
  users: User[]
  currentView: SidebarProps['currentView']
}

// UI Components
// -----------------------------------------------
function ChannelList({ channels, currentView }: ChannelListProps) {
  return (
    <div className="px-3 py-4">
      <h2 className="text-white font-semibold mb-2">Channels</h2>
      <ul className="space-y-1">
        {channels.map((channel) => (
          <li key={channel.channel_id}>
            <Link
              href={`/channel/${channel.channel_id}`}
              className={cn(
                'block px-2 py-1 hover:bg-[#A64A00]',
                (currentView.data as Channel).channel_id === channel.channel_id && 'bg-[#A64A00]'
              )}
            >
              # {channel.slug}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DirectMessageList({ users, currentView }: DirectMessageListProps) {
  return (
    <div className="px-3 py-4">
      <h2 className="text-white font-semibold mb-2">Direct Messages</h2>
      <ul className="space-y-1">
        {users.map((user) => (
          <li key={user.user_id}>
            <Link
              href={`/dm/${user.user_id}`}
              className={cn(
                'block px-2 py-1 hover:bg-[#A64A00]',
                (currentView.data as User).user_id === user.user_id && 'bg-[#A64A00]'
              )}
            >
              <div className="flex items-center min-w-0">
                <UserAvatar 
                  username={user.username}
                  status={user.status}
                  size="sm"
                />
                <span className="ml-2 truncate text-white">{user.username}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Main Component
// -----------------------------------------------
export function Sidebar({ channels, storeUsers, currentView }: SidebarProps) {
  return (
    <div className="w-64 bg-[#BF5700] flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <ChannelList channels={channels} currentView={currentView} />
        <DirectMessageList users={storeUsers} currentView={currentView} />
      </div>
    </div>
  )
} 