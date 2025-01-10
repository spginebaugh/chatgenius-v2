"use client"

import Link from "next/link"
import { Channel, User } from "@/types/database"

interface SidebarProps {
  channels: Channel[]
  users: User[]
  currentView: {
    type: "channel" | "dm"
    data: Channel | User
  }
}

export function Sidebar({ channels, users, currentView }: SidebarProps) {
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
            <li key={channel.id}>
              <Link 
                href={`/channel/${channel.id}`}
                className={`flex items-center px-3 py-1 ${
                  currentView.type === "channel" && channel.id === (currentView.data as Channel).id
                    ? 'bg-[#a64a00] text-white'
                    : 'text-white hover:bg-[#a64a00]'
                }`}
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
                    ? 'bg-[#a64a00]'
                    : ''
                }`}
              >
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {user.username}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
} 