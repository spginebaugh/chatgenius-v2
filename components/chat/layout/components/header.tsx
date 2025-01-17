import type { User, Channel } from "@/types/database"
import type { ChatViewData } from "@/types/messages-ui"
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu"
import { useUsers } from "../../providers/users-provider"

interface HeaderProps {
  currentUser: User
  currentView: ChatViewData
  onProfileClick: () => void
  onLogout: () => void
}

function UserIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="18" 
      height="18" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function StatusDot({ status }: { status: User['status'] }) {
  return (
    <span className={`w-1.5 h-1.5 rounded-full ${status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'}`} />
  )
}

export function Header({ currentView, onProfileClick, onLogout }: HeaderProps) {
  // Get current user from context to ensure we have the latest status
  const { currentUser } = useUsers()

  return (
    <div className="h-14 bg-[#333F48] flex items-center justify-between px-4 flex-shrink-0">
      <div className="text-white font-semibold">
        {currentView.type === 'channel' ? (
          <span>#{(currentView.data as Channel).slug}</span>
        ) : (
          <span>{(currentView.data as User).username}</span>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 text-white hover:bg-gray-700 px-3 py-1.5 rounded transition-colors">
            <UserIcon />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium leading-none">
                {currentUser.username || 'User'}
              </span>
              <span className="text-xs text-gray-300 flex items-center gap-1">
                <StatusDot status={currentUser.status} />
                {currentUser.status?.toLowerCase() || 'offline'}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px] bg-gray-100 border-gray-400 text-gray-900">
          <DropdownMenuItem 
            className="hover:bg-gray-200 focus:bg-gray-200 cursor-pointer"
            onClick={onProfileClick}
          >
            Change Username
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="hover:bg-gray-200 focus:bg-gray-200 cursor-pointer text-gray-900" 
            onClick={onLogout}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 