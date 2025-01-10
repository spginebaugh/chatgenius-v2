"use client"

interface MessageListProps {
  messages: Array<{
    id: string
    message: string
    inserted_at: string
    profiles: {
      id: string
      username: string
    }
  }>
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages?.map((message) => (
        <div key={message.id} className="flex items-start gap-3 hover:bg-gray-50 px-2 py-1 rounded group">
          <div className="w-9 h-9 rounded bg-[#BF5700] text-white flex items-center justify-center uppercase font-medium">
            {message.profiles?.username?.charAt(0) || '?'}
          </div>
          <div className="flex-1 relative">
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
            <button className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm text-gray-500 hover:text-gray-700 bg-white px-3 py-1 rounded border border-gray-200 shadow-sm">
              Reply to thread
            </button>
          </div>
        </div>
      ))}
    </div>
  )
} 