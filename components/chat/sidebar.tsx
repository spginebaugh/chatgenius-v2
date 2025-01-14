"use client"

import Link from "next/link"
import { Channel, User } from "@/types/database"

interface SidebarProps {
  channels: Channel[]
  storeUsers: User[]  // Renamed from users to storeUsers for clarity
  currentView: {
    type: 'channel' | 'dm'
    data: Channel | User
  }
}

export function Sidebar({ channels, storeUsers, currentView }: SidebarProps) {
  return (
    <div className="w-64 bg-[#333F48] flex flex-col">
      <div className="flex-1 overflow-y-auto">
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

        <div className="px-3 py-4">
          <h2 className="text-white font-semibold mb-2">Direct Messages</h2>
          <ul className="space-y-1">
            {storeUsers.map((user) => (
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
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    user.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                  {user.username}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
} 