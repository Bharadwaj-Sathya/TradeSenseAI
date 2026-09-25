import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  Bot,
  Database,
  FileText,
  Folder,
  Gauge,
  Home,
  Lightbulb,
  LineChart,
  Network,
  Newspaper,
  Settings,
  Shield,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import logo from "../assets/logo.png";

const navSections = [
  {
    label: "TRADING",
    items: [
      { label: "Strategies", icon: Network, href: "/strategies" },
      { label: "Live Market", icon: Activity, href: "/live-market" },
      { label: "Positions", icon: Shield, href: "/positions" },
      { label: "Orders", icon: Folder, href: "/orders" },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { label: "Backtesting", icon: Gauge, href: "/backtesting" },
      { label: "Performance", icon: LineChart, href: "/performance" },
      { label: "Reports", icon: FileText, href: "/reports" },
    ],
  },
  {
    label: "AI TOOLS",
    items: [
      { label: "AI Signals", icon: Sparkles, href: "/ai-signals" },
      { label: "Market Insights", icon: Lightbulb, href: "/market-insights" },
      { label: "News & Sentiment", icon: Newspaper, href: "/news" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Settings", icon: Settings, href: "/settings" },
      { label: "API & Data", icon: Database, href: "/api-data" },
      { label: "Account", icon: UserRound, href: "/account" },
    ],
  },
];

interface TradeSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function TradeSidebar({ isOpen = false, onClose }: TradeSidebarProps) {
  const location = useLocation();

  return (
    <aside className={`trade-sidebar ${isOpen ? "is-open" : ""}`}>
      <div className="brand">
        <div className="brand-mark logo-brand">
          <img className="brand-logo" src={logo} alt="TradeSense AI logo" />
        </div>
        <div>
          <strong>TradeSense AI</strong>
          <span>Trade Smarter. With AI.</span>
        </div>
        <button
          className="mobile-close"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <Link
          className={`nav-item ${location.pathname === "/" || location.pathname === "/dashboard" ? "active" : ""}`}
          to="/"
        >
          <Home size={16} />
          Dashboard
        </Link>
        {navSections.map((section) => (
          <div className="nav-section" key={section.label}>
            <span className="nav-label">{section.label}</span>
            {section.items.map(({ label, icon: Icon, href }) => (
              <Link
                className={`nav-item ${location.pathname === href ? "active" : ""}`}
                key={label}
                to={href}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="ai-card">
        <div className="ai-icon">
          <Bot size={21} />
        </div>
        <strong>TradeSense AI</strong>
        <b>
          <i /> Engine Online
        </b>
        <div className="ai-scan">
          <span>Scanning</span>
          <strong>1,250 instruments</strong>
        </div>
        <div className="ai-detections">
          <div>
            <strong>18</strong>
            <span>signals detected</span>
          </div>
          <div>
            <strong>4</strong>
            <span>high-confidence setups</span>
          </div>
        </div>
        <p>"Discipline is the real edge."</p>
      </div>
    </aside>
  );
}

export function useSidebarToggle() {
  const [open, setOpen] = useState(false);
  return { open, setOpen, toggle: () => setOpen((v) => !v) };
}
