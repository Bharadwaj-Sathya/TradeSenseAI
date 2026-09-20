import { Link, useLocation } from 'react-router-dom'
import { Home, MessageCircle, BookOpen, GitCompare, Scale, FileText, ClipboardList, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItemData {
  label: string
  icon: LucideIcon
  href: string
}

interface LegalResourceData {
  label: string
  href: string
}

const NAV_ITEMS: NavItemData[] = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Chat', icon: MessageCircle, href: '/chat' },
  { label: 'Browse Laws', icon: BookOpen, href: '/browse-laws' },
  { label: 'Compare Laws', icon: GitCompare, href: '/compare-laws' },
]

const LEGAL_RESOURCES: LegalResourceData[] = [
  { label: 'Constitution of India', href: '/laws/constitution' },
  { label: 'BNS 2023', href: '/laws/bns-2023' },
  { label: 'BNSS 2023', href: '/laws/bnss-2023' },
  { label: 'BSA 2023', href: '/laws/bsa-2023' },
  { label: 'IPC 1860 (Historical)', href: '/laws/ipc-1860' },
  { label: 'CrPC 1973 (Historical)', href: '/laws/crpc-1973' },
  { label: 'Indian Evidence Act 1872', href: '/laws/evidence-1872' },
]

function SidebarBrand() {
  return (
    <div className="px-5 py-6">
      <div className="flex items-center gap-3 mb-1">
        <Scale className="h-11 w-11 text-amber-100" strokeWidth={1.5} />
        <span className="font-bold text-xl text-white">Indian Legal AI</span>
      </div>
      <p className="text-sm text-slate-300 pl-14">Law Made Simple</p>
    </div>
  )
}

function NavItemComponent({ item, isActive }: { item: NavItemData; isActive: boolean }) {
  const Icon = item.icon
  return (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-lg text-base transition-colors',
        isActive
          ? 'bg-slate-700/80 text-white font-medium shadow-sm'
          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

function SidebarNav() {
  const { pathname } = useLocation()
  return (
    <nav className="px-2 py-3 space-y-0.5">
      {NAV_ITEMS.map((item) => (
        <NavItemComponent
          key={item.href}
          item={item}
          isActive={pathname === item.href}
        />
      ))}
    </nav>
  )
}

function LegalResourcesSection() {
  return (
    <div className="px-5 py-5 border-t border-slate-700/80">
      <p className="text-xs font-medium tracking-wide text-slate-400 mb-4 uppercase">
        Legal Resources
      </p>
      <ul className="space-y-2">
        {LEGAL_RESOURCES.map((r) => (
          <li key={r.href}>
            <Link
              to={r.href}
              className="flex items-center gap-3 text-sm text-slate-100 hover:text-white transition-colors truncate"
            >
              <FileText className="h-4 w-4 shrink-0 text-slate-300" />
              {r.label}
            </Link>
          </li>
        ))}
        <li>
          <Link
            to="/browse-laws"
            className="flex items-center justify-between text-sm text-slate-100 hover:text-white transition-colors pt-1"
          >
            <span className="flex items-center gap-3"><ClipboardList className="h-4 w-4" />More Acts</span><ChevronRight className="h-4 w-4" />
          </Link>
        </li>
      </ul>
    </div>
  )
}

function SidebarBottomCard() {
  return (
    <div className="mx-5 mb-6 p-5 rounded-xl bg-slate-800/60 border border-slate-600/80 mt-auto">
      <p className="text-base font-medium text-white mb-4">Building a more<br />informed India</p>
      <p className="text-xs text-slate-100">🇮🇳 &nbsp; Accurate. Reliable. Accessible.</p>
    </div>
  )
}

export default function Sidebar() {
  return (
    <aside
      className="scrollbar-hidden sticky top-0 h-screen w-[278px] shrink-0 overflow-y-auto border-r border-slate-700/30 bg-[#0c2034] flex flex-col"
      aria-label="Sidebar navigation"
    >
      <SidebarBrand />
      <SidebarNav />
      <LegalResourcesSection />
      <div className="flex-1" />
      <SidebarBottomCard />
    </aside>
  )
}
