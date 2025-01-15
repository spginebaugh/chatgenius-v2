"use client"

// Imports
// -----------------------------------------------
import Link from "next/link"

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
          <li key={channel.id}>
            <Link
              href={`/channel/${channel.id}`}
              className={`block px-2 py-1 rounded ${
                currentView.type === 'channel' && 
                (currentView.data as Channel).id === channel.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
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
          <li key={user.id}>
            <Link
              href={`/dm/${user.id}`}
              className={`flex items-center px-2 py-1 rounded ${
                currentView.type === 'dm' && 
                (currentView.data as User).id === user.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <UserAvatar 
                username={user.username}
                status={user.status}
                size="sm"
              />
              <span className="ml-2">{user.username}</span>
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
    <div className="w-64 bg-[#333F48] flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <ChannelList channels={channels} currentView={currentView} />
        <DirectMessageList users={storeUsers} currentView={currentView} />
      </div>
    </div>
  )
} 