import { useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Search, Sun, Moon, Bell, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export default function Header() {
  const searchRef = useRef<HTMLInputElement>(null)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="flex items-center justify-between px-10 py-3 bg-card h-[98px] shrink-0">
      {/* Search bar */}
      <div className="flex items-center gap-2 flex-1 max-w-[825px]">
        <div className="relative flex-1">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search sections, acts, keywords..."
            className={cn(
              "w-full rounded-lg border border-input bg-background px-12 py-3 text-sm shadow-sm",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            )}
          />
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5">
            Ctrl+K
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4 ml-4">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notification bell */}
        <button
          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* Account dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
              <div className="h-11 w-11 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-base font-semibold text-white">
                A
              </div>
              <span className="text-sm text-foreground">Account</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="account-dropdown">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
