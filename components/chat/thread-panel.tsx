"use client"

import { Message } from "@/types/database"
import { MessageInput } from "./message-input"

interface ThreadPanelProps {
  parentMessage: {
    id: string
    message: string
    inserted_at: string
    profiles: {
      id: string
      username: string
    }
  }
  responses: Array<{
    id: string
    message: string
    inserted_at: string
    profiles: {
      id: string
      username: string
    }
  }>
  onClose: () => void
  onSendMessage: (message: string) => Promise<void>
}

export function ThreadPanel({ parentMessage, responses, onClose, onSendMessage }: ThreadPanelProps) {
  return (
    <div className="w-96 border-l border-gray-200 flex flex-col bg-white">
      {/* Header */}
      <div className="h-14 bg-[#333F48] flex items-center justify-between px-4">
        <div className="text-white font-semibold">Thread</div>
        <button 
          onClick={onClose}
          className="text-white hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Parent Message */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded bg-[#BF5700] text-white flex items-center justify-center uppercase font-medium">
              {parentMessage.profiles?.username?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-bold text-gray-900 text-base">
                  {parentMessage.profiles?.username || 'Unknown User'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(parentMessage.inserted_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </span>
              </div>
              <p className="text-gray-700 text-sm">{parentMessage.message}</p>
            </div>
          </div>
        </div>

        {/* Responses */}
        <div className="p-4 space-y-4">
          {responses.map((response) => (
            <div key={response.id} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded bg-[#BF5700] text-white flex items-center justify-center uppercase font-medium">
                {response.profiles?.username?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-gray-900 text-base">
                    {response.profiles?.username || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(response.inserted_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{response.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <MessageInput
        placeholder="Reply to thread..."
        onSendMessage={onSendMessage}
      />
    </div>
  )
} 