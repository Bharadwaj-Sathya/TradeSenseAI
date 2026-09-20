import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import TradeSidebar from "./TradeSidebar";
import TradeHeader from "./TradeHeader";

export default function TradeLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("tradesense-theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("tradesense-theme", dark ? "dark" : "light");
    }
  }, [dark]);

  return (
    <div className={`trade-app ${dark ? "" : "light-mode"}`}>
      <TradeSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="trade-main">
        <TradeHeader
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
          onMenuOpen={() => setSidebarOpen(true)}
        />
        <div className="trade-page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
