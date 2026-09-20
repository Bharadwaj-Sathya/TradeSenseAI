import { useDispatch, useSelector } from 'react-redux'
import { GlobeLock, Landmark, Quote } from 'lucide-react'
import type { RootState } from '@/store/store'
import { setChatInput } from '@/store/slices/uiSlice'
import type { RecentQuery } from '@/store/slices/uiSlice'
import { Badge } from '@/components/ui/badge'

const SEED_QUERIES: RecentQuery[] = [
  { id: '1', text: 'What is Section 420?', timestamp: '2 minutes ago' },
  { id: '2', text: 'Explain Article 21', timestamp: '1 hour ago' },
  { id: '3', text: 'Difference between IPC and BNS', timestamp: '3 hours ago' },
  { id: '4', text: 'My rights if I am arrested', timestamp: '5 hours ago' },
  { id: '5', text: 'Consumer protection for online fraud', timestamp: '1 day ago' },
]

interface RecentQueryItemProps {
  text: string
  timestamp: string
  onClick: (text: string) => void
}

function RecentQueryItem({ text, timestamp, onClick }: RecentQueryItemProps) {
  return (
    <button
      onClick={() => onClick(text)}
      className="w-full text-left group py-4 first:pt-2"
    >
      <p className="text-sm text-foreground group-hover:text-primary transition-colors">
        {text}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{timestamp}</p>
    </button>
  )
}

export default function RightPanel() {
  const dispatch = useDispatch()
  const storeQueries = useSelector((state: RootState) => state.ui?.recentQueries ?? [])
  // Keep the panel visually useful even before a user has built a full history.
  // New queries remain first, with the supplied examples filling the remaining slots.
  const queries = [
    ...storeQueries,
    ...SEED_QUERIES.filter((seed) => !storeQueries.some((query) => query.text === seed.text)),
  ].slice(0, 5)

  const handleQueryClick = (text: string) => {
    dispatch(setChatInput(text))
  }

  // Format ISO timestamps to relative time for store queries
  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp.includes('T')) return timestamp // already relative (seed data)
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffHrs / 24)
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  }

  return (
    <aside
      className="scrollbar-hidden sticky top-0 h-full w-[292px] shrink-0 overflow-y-auto bg-muted/50 p-3 flex flex-col gap-4"
      aria-label="Right panel"
    >
      {/* Official Sources Badge */}
      <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
      <Badge variant="success" className="official-badge justify-center gap-2 text-center w-full rounded-lg border-transparent py-2 font-medium">
        <GlobeLock className="text-green-700 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-green-700">Powered by Official Sources</span>
      </Badge>

      {/* Law card */}
      <div className="flex items-center gap-3 pt-4">
          <div className="rounded-full bg-muted p-3"><Landmark className="h-7 w-7 text-muted-foreground shrink-0" /></div>
        <div>
          <span className="text-sm font-medium text-foreground">Constitution of India</span>
          <p className="text-xs text-muted-foreground mt-1">BNS • BNSS • BSA<br />and many more...</p>
        </div>
      </div>
      </div>

      {/* Recent Queries */}
      <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-base font-semibold text-foreground">Recent Queries</span>
          <button className="text-xs text-primary hover:text-primary/80 transition-colors">
            See all
          </button>
        </div>
        <div className="space-y-0 divide-y divide-border">
          {queries.slice(0, 5).map((q) => (
            <RecentQueryItem
              key={q.id}
              text={q.text}
              timestamp={formatTimestamp(q.timestamp)}
              onClick={handleQueryClick}
            />
          ))}
        </div>
      </div>

      {/* Quote card */}
      <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
        <div className="flex gap-3"><Quote className="h-7 w-7 shrink-0 fill-slate-300 text-slate-300" />
        <p className="text-sm text-muted-foreground italic leading-relaxed">
          A more informed citizenry is the foundation of a stronger India.
        </p></div>
        <p className="text-sm text-muted-foreground mt-3 font-medium text-right">
          — Constitution of India
        </p>
      </div>
    </aside>
  )
}
