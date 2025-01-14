interface MessageTimeProps {
  timestamp: string
  className?: string
}

export function MessageTime({ timestamp, className = '' }: MessageTimeProps) {
  const formattedTime = new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })

  return (
    <span className={`text-xs text-gray-500 ${className}`}>
      {formattedTime}
    </span>
  )
} 