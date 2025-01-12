"use client"

import Link from "next/link"
import { Channel, User } from "@/types/database"
import clsx from "clsx"
import { useUsers } from "@/lib/hooks/use-users"

interface SidebarProps {
  channels: Channel[]
  users: User[]
  currentView: {
    type: "channel" | "dm"
    data: Channel | User
  }
}

export function Sidebar({ channels, users: initialUsers, currentView }: SidebarProps) {
  // Use users hook for real-time updates and status
  const { users: realtimeUsers } = useUsers()
  
  // Combine initial users with realtime updates
  const users = Object.values(realtimeUsers).length > 0 
    ? Object.values(realtimeUsers)
    : initialUsers

  return (
    <div className="w-64 bg-[#BF5700] text-white flex flex-col">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-xl font-bold">Chat</h1>
      </div>

      {/* Channels */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 px-3">Channels</h2>
        <ul className="space-y-1">
          {channels?.map((channel) => (
            <li key={channel.channel_id}>
              <Link 
                href={`/channel/${channel.channel_id}`}
                className={clsx(
                  "block px-4 py-2 hover:bg-[#a64a00]",
                  currentView.type === "channel" && channel.channel_id === (currentView.data as Channel).channel_id
                    ? "bg-[#8B3E00]"
                    : ""
                )}
              >
                <span className="mr-2">#</span>
                {channel.slug}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Direct Messages */}
      <div>
        <h2 className="text-sm font-semibold mb-2 px-3">Direct Messages</h2>
        <ul className="space-y-1">
          {users?.map((user) => (
            <li key={user.id}>
              <Link 
                href={`/dm/${user.id}`}
                className={`text-white hover:bg-[#a64a00] flex items-center px-3 py-1 ${
                  currentView.type === "dm" && user.id === (currentView.data as User).id
                    ? 'bg-[#8B3E00]'
                    : ''
                }`}
              >
                <span 
                  className={clsx(
                    "w-2 h-2 rounded-full mr-2",
                    user.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-500'
                  )}
                  title={user.status === 'ONLINE' ? 'Online' : 'Offline'}
                />
                {user.username}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
} 