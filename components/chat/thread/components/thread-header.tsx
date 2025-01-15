interface ThreadHeaderProps {
  onClose: () => void
}

export function ThreadHeader({ onClose }: ThreadHeaderProps) {
  return (
    <div className="h-14 bg-[#333F48] flex items-center justify-between px-4">
      <div className="text-white font-semibold">Thread</div>
      <button 
        onClick={onClose}
        className="text-white hover:text-gray-300"
      >
        ✕
      </button>
    </div>
  )
} 