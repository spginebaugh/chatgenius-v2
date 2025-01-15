import { Button } from "@/components/ui/button"
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover"
import { SmileIcon } from "lucide-react"
import { EMOJI_LIST } from "../../shared"

interface EmojiButtonProps {
  messageId: number
  onEmojiSelect: (messageId: number, emoji: string) => Promise<void>
}

export function EmojiButton({ messageId, onEmojiSelect }: EmojiButtonProps) {
  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost"
            size="sm"
            className="text-sm text-gray-500 hover:text-gray-700 bg-white h-8 px-2 rounded border border-gray-200 shadow-sm"
          >
            <SmileIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-2">
          <div className="grid grid-cols-4 gap-2">
            {EMOJI_LIST.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                className="h-8 px-2"
                onClick={() => onEmojiSelect(messageId, emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 