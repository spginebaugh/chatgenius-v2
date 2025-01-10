"use client"

interface MessageInputProps {
  placeholder: string
  onSendMessage: (message: string) => Promise<void>
}

export function MessageInput({ placeholder, onSendMessage }: MessageInputProps) {
  return (
    <div className="px-4 py-3 bg-white border-t border-gray-200">
      <form onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const formData = new FormData(form)
        const message = formData.get('message') as string
        if (message.trim()) {
          await onSendMessage(message)
          form.reset()
        }
      }}>
        <input
          type="text"
          name="message"
          placeholder={placeholder}
          className="w-full p-2 rounded bg-white border border-gray-300 text-gray-700 placeholder-gray-500 focus:outline-none focus:border-[#BF5700] focus:ring-1 focus:ring-[#BF5700]"
        />
      </form>
    </div>
  )
} 