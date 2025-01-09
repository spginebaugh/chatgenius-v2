"use client"

import { sendDirectMessage } from "@/app/actions/chat"
import { logout } from "@/app/actions"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Channel, DirectMessage, Profile, User } from "@/types/database"
import { useEffect } from "react"

interface DirectMessageClientProps {
  channels: Channel[]
  otherUser: Profile
  messages: (DirectMessage & { profiles: Profile })[]
  users: Profile[]
  currentUser: User
}

export function DirectMessageClient({ 
  channels, 
  otherUser, 
  messages, 
  users,
  currentUser 
}: DirectMessageClientProps) {
  const router = useRouter()

  useEffect(() => {
    if (!otherUser) {
      router.push("/")
    }
  }, [otherUser, router])

  const handleLogout = async () => {
    try {
      const result = await logout()
      if (result.success) {
        router.push("/sign-in")
      }
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
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
                  className="flex items-center px-3 py-1 text-white hover:bg-[#a64a00]"
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
                    user.id === otherUser.id ? 'bg-[#a64a00]' : ''
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* DM Header */}
        <div className="h-14 bg-[#333F48] flex items-center px-4">
          <div className="flex items-center text-white">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            <h2 className="font-semibold">{otherUser.username}</h2>
          </div>
          <button onClick={handleLogout} className="ml-auto text-white hover:text-gray-300">
            Logout
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages?.map((message) => (
            <div key={message.id} className="flex items-start gap-3 hover:bg-gray-50 px-2 py-1 rounded">
              <div className="w-9 h-9 rounded bg-[#BF5700] text-white flex items-center justify-center uppercase font-medium">
                {message.profiles?.username?.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-gray-900 text-base">
                    {message.profiles?.username || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(message.inserted_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{message.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="px-4 py-3 bg-white border-t border-gray-200">
          <form action={sendDirectMessage}>
            <input type="hidden" name="receiverId" value={otherUser.id} />
            <input
              type="text"
              name="message"
              placeholder={`Message ${otherUser.username}`}
              className="w-full p-2 rounded bg-white border border-gray-300 text-gray-700 placeholder-gray-500 focus:outline-none focus:border-[#BF5700] focus:ring-1 focus:ring-[#BF5700]"
            />
          </form>
        </div>
      </div>
    </div>
  )
} 