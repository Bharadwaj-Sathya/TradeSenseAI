import { useEffect, useState } from "react";
import { Bell, ChevronDown, Menu, Moon, Search, Sun } from "lucide-react";

// Only 3 tickers shown in the topbar (INDIA VIX hidden on smaller screens)
const tickers = [
  { name: "NIFTY 50",   base: 25482.30, change: "+0.82%", up: true  },
  { name: "BANKNIFTY",  base: 57214.65, change: "+1.11%", up: true  },
  { name: "SENSEX",     base: 83421.12, change: "+0.63%", up: true  },
] as const;

function livePrice(base: number, index: number, seconds: number) {
  const movement = ((seconds + index * 7) % 9 - 4) * 0.4;
  return (base + movement).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface TradeHeaderProps {
  dark: boolean;
  onToggleDark: () => void;
  onMenuOpen: () => void;
}

export default function TradeHeader({ dark, onToggleDark, onMenuOpen }: TradeHeaderProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
  const timeLabel = now.toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <header className="topbar">
      {/* Mobile hamburger */}
      <button className="mobile-menu" onClick={onMenuOpen} aria-label="Open menu">
        <Menu size={19} />
      </button>

      {/* Search */}
      <div className="search-box">
        <Search size={15} />
        <input placeholder="Search symbols, strategies, or insights..." />
        <kbd>Ctrl + K</kbd>
      </div>

      {/* ── Inline tickers ── */}
      <div className="topbar-tickers">
        {tickers.map(({ name, base, change, up }, index) => (
          <div className="topbar-ticker" key={name}>
            <span className="topbar-ticker-name">{name}</span>
            <span className="topbar-ticker-price">
              {livePrice(base, index, now.getSeconds())}
            </span>
            <span className={`topbar-ticker-change ${up ? "" : "negative"}`}>
              {change}
            </span>
          </div>
        ))}
      </div>

      {/* Market status */}
      <div className="market-status">
        <i />
        Market Open
      </div>

      {/* Date & time */}
      <time>{dateLabel}&nbsp; {timeLabel}</time>

      {/* Theme toggle */}
      <button className="icon-button" onClick={onToggleDark} aria-label="Toggle theme">
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Notifications */}
      <button className="notification icon-button" aria-label="Notifications">
        <Bell size={17} />
        <b>3</b>
      </button>

      {/* Profile */}
      <div className="profile">
        <span>BS</span>
        <strong>Bharadwaj</strong>
        <ChevronDown size={13} />
      </div>
    </header>
  );
}
