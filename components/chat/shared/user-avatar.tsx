import { THEME_COLORS } from './constants'

interface UserAvatarProps {
  username?: string | null
  size?: 'sm' | 'md' | 'lg'
  status?: 'ONLINE' | 'OFFLINE' | 'AWAY'
}

const SIZES = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-9 h-9 text-base',
  lg: 'w-10 h-10 text-lg'
} as const

export function UserAvatar({ username, size = 'md', status }: UserAvatarProps) {
  return (
    <div className="relative inline-flex">
      <div 
        className={`${SIZES[size]} rounded bg-[#333F48] text-white flex items-center justify-center uppercase font-medium relative`}
      >
        {username?.charAt(0) || '?'}
        {status && (
          <div 
            className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-white ${
              status === 'ONLINE' ? 'bg-green-500' :
              status === 'AWAY' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
          />
        )}
      </div>
    </div>
  )
} 