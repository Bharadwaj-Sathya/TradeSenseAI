import {
  Activity,
  ArrowDownRight,
  BarChart3,
  BriefcaseBusiness,
  ListFilter,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { type ComponentType, type ReactNode } from "react";
import afternoonBackground from "../assets/afternoon-bg.png";
import eveningBackground from "../assets/evening-bg.png";
import morningBackground from "../assets/morning-bg.png";
import { useEffect, useState } from "react";

const strategies = [
  ["VWAP Trend Following", "12", "+₹620", "(+2.4%)", "75%"],
  ["Opening Range Breakout", "8", "+₹410", "(+1.8%)", "62%"],
  ["Momentum Breakout", "15", "+₹980", "(+3.1%)", "73%"],
  ["EMA Trend Strategy", "6", "+₹230", "(+1.1%)", "67%"],
];
const signals = [
  ["09:52", "RELIANCE", "BUY", "VWAP", "₹2,842.10"],
  ["09:47", "HDFCBANK", "SELL", "ORB", "₹1,642.50"],
  ["09:41", "INFY", "BUY", "Momentum", "₹1,521.30"],
  ["09:36", "TCS", "SELL", "EMA", "₹4,312.20"],
  ["09:28", "ICICIBANK", "BUY", "VWAP", "₹1,186.75"],
];

function Sparkline({ down = false }: { down?: boolean }) {
  return (
    <svg
      className={`sparkline ${down ? "sparkline-down" : ""}`}
      viewBox="0 0 80 28"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={
          down
            ? "1,5 12,15 24,12 34,22 46,16 56,23 67,17 79,24"
            : "1,22 10,17 18,20 28,11 37,15 47,8 56,10 66,3 79,5"
        }
      />
    </svg>
  );
}

function LayersIcon(props: React.ComponentProps<typeof Activity>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  note,
  chart,
  tone = "green",
  ringProgress,
  ringColor = "#38d4b2",
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string;
  change: string;
  note?: string;
  chart?: boolean;
  tone?: string;
  ringProgress?: number;
  ringColor?: string;
}) {
  const hasRing = typeof ringProgress === "number";
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = hasRing
    ? circumference - (ringProgress / 100) * circumference
    : circumference;

  return (
    <article className={`metric-card ${hasRing ? "metric-card-with-ring" : ""}`}>
      <div className={`metric-icon ${tone}`}>
        <Icon size={17} />
      </div>
      <div className="metric-copy">
        <span>{label}</span>
        {!hasRing && <strong>{value}</strong>}
        <div className="metric-change">
          {change} {note && <small>{note}</small>}
        </div>
      </div>
      {hasRing ? (
        <div className="metric-ring" aria-label={`${label}: ${value}`}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className="metric-ring-bg" cx="50" cy="50" r={radius} />
            <circle
              className="metric-ring-progress"
              cx="50"
              cy="50"
              r={radius}
              style={{
                stroke: ringColor,
                strokeDasharray: circumference,
                strokeDashoffset: dashOffset,
              }}
            />
          </svg>
          <div className="metric-ring-inner">
            <span>{value}</span>
          </div>
        </div>
      ) : (
        chart && <Sparkline />
      )}
    </article>
  );
}

function PanelTitle({ title, action }: { title: string; action?: string }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      {action && <button>{action}</button>}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-wrap">
      <div className="table-row table-head">
        {headers.map((header) => (
          <span key={header}>{header}</span>
        ))}
      </div>
      {rows.map((row, index) => (
        <div className="table-row" key={index}>
          {row.map((cell, cellIndex) => (
            <span key={cellIndex}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Summary({
  icon: Icon,
  value,
  label,
  negative = false,
}: {
  icon: typeof Activity;
  value: string;
  label: string;
  negative?: boolean;
}) {
  return (
    <div className="summary-item">
      <div className={`summary-icon ${negative ? "red" : ""}`}>
        <Icon size={16} />
      </div>
      <div>
        <strong className={negative ? "negative" : ""}>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  const currentHour = now.getHours();
  const timeOfDay =
    currentHour >= 5 && currentHour < 12
      ? "morning"
      : currentHour >= 12 && currentHour < 18
        ? "afternoon"
        : currentHour >= 18
          ? "evening"
          : "night";

  const welcomeBackground = {
    morning: morningBackground,
    afternoon: afternoonBackground,
    evening: eveningBackground,
  }[timeOfDay as "morning" | "afternoon" | "evening"];

  const greeting =
    currentHour < 5
      ? "Good night"
      : timeOfDay === "morning"
        ? "Good morning"
        : timeOfDay === "afternoon"
          ? "Good afternoon"
          : "Good evening";

  const tickers = [
    ["NIFTY 50", "25,482.30", "+0.82%", "up"],
    ["BANKNIFTY", "57,214.65", "+1.11%", "up"],
    ["SENSEX", "83,421.12", "+0.63%", "up"],
    ["INDIA VIX", "11.24", "-2.18%", "down"],
  ] as const;

  return (
    <div className="dashboard-content">
      <section
        className={`welcome time-welcome ${timeOfDay}-welcome`}
        style={
          welcomeBackground
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(15, 42, 73, .92) 0%, rgba(15, 42, 73, .55) 52%, rgba(15, 42, 73, .12) 100%), url(${welcomeBackground})`,
              }
            : undefined
        }
      >
        <div>
          <h1>
            {greeting}, Bharadwaj <span>👋</span>
          </h1>
          <p>
            Your trading system is running smoothly. Here's your overview for
            today.
          </p>
        </div>
        <blockquote>
          <span>"Better decisions</span>
          <span>A brighter portfolio."</span>
        </blockquote>
      </section>

      <section className="metrics">
        <MetricCard
          icon={WalletCards}
          label="Portfolio Value"
          value="₹42,350"
          change="+₹2,350"
          note="(+5.86%)"
          chart
        />
        <MetricCard
          icon={BarChart3}
          label="Today's P&L"
          value="+₹1,240"
          change="+3.18%"
          chart
          tone="teal"
        />
        <MetricCard
          icon={Target}
          label="Win Rate"
          value="68.4%"
          change="17 / 25 trades"
          tone="blue"
          ringProgress={68.4}
          ringColor="#4ddbb5"
        />
        <MetricCard
          icon={LayersIcon}
          label="Active Strategies"
          value="4 / 8"
          change="● All Running"
          tone="blue"
        />
        <MetricCard
          icon={BriefcaseBusiness}
          label="Open Positions"
          value="3"
          change="1 Long   2 Short"
          tone="gold"
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel equity-panel">
          <PanelTitle
            title="Equity Curve"
            action="1D   1W   1M   3M   1Y   All"
          />
          <div className="chart-wrap">
            <svg viewBox="0 0 620 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#00d084" stopOpacity=".3" />
                  <stop offset="1" stopColor="#00d084" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                className="chart-area"
                d="M0 126 L28 123 47 126 72 119 95 115 118 110 140 99 162 103 188 91 210 83 232 88 256 73 280 81 302 68 326 61 347 65 369 53 390 60 414 54 440 61 462 51 486 47 510 55 534 42 557 45 580 32 620 40 L620 160 0 160Z"
              />
              <polyline
                className="chart-line"
                points="0,126 28,123 47,126 72,119 95,115 118,110 140,99 162,103 188,91 210,83 232,88 256,73 280,81 302,68 326,61 347,65 369,53 390,60 414,54 440,61 462,51 486,47 510,55 534,42 557,45 580,32 620,40"
              />
            </svg>
            <div className="chart-tooltip">
              <strong>₹42,350</strong>
              <span>+5.86%</span>
            </div>
            <div className="axis">
              <span>Aug 16</span>
              <span>Aug 23</span>
              <span>Aug 30</span>
              <span>Sep 6</span>
              <span>Sep 13</span>
            </div>
          </div>
          <div className="equity-stats">
            <span>
              Total Return <b>+5.86%</b>
            </span>
            <span>
              Max Drawdown <b className="negative">-2.14%</b>
            </span>
            <span>
              Sharpe Ratio <b>1.42</b>
            </span>
            <span>
              Total Trades <b>128</b>
            </span>
          </div>
        </section>

        <section className="panel market-panel">
          <PanelTitle title="Market Watch" action="View All →" />
          <Table
            headers={["Symbol", "LTP", "Change", "Chart"]}
            rows={tickers.map(([name, price, change, direction]) => [
              name,
              price,
              <span className={direction === "down" ? "negative" : "positive"}>
                {change}
              </span>,
              <Sparkline down={direction === "down"} />,
            ])}
          />
        </section>

        <section className="panel strategies-panel">
          <PanelTitle title="Active Strategies" action="View All →" />
          <Table
            headers={[
              "Strategy",
              "Status",
              "Signals (Today)",
              "P&L (Today)",
              "Win Rate",
            ]}
            rows={strategies.map(([name, signalsCount, pnl, note, rate]) => [
              name,
              <span className="status-pill">● Active</span>,
              signalsCount,
              <span className="positive">
                {pnl} <small>{note}</small>
              </span>,
              rate,
            ])}
          />
        </section>

        <section className="panel signals-panel">
          <PanelTitle title="Recent Signals" action="View All →" />
          <Table
            headers={["Time", "Symbol", "Signal", "Strategy", "Price"]}
            rows={signals.map(([time, symbol, signal, strategy, price]) => [
              time,
              symbol,
              <span className={`signal-pill ${signal.toLowerCase()}`}>
                {signal}
              </span>,
              strategy,
              price,
            ])}
          />
        </section>

        <section className="panel summary-panel">
          <PanelTitle title="Performance Summary" />
          <div className="summary-items">
            <Summary icon={TrendingUp} value="+5.86%" label="Total Return" />
            <Summary
              icon={ArrowDownRight}
              value="-2.14%"
              label="Max Drawdown"
              negative
            />
            <Summary icon={BarChart3} value="1.42" label="Sharpe Ratio" />
            <Summary icon={ListFilter} value="128" label="Total Trades" />
          </div>
        </section>

        <section className="panel news-panel">
          <PanelTitle title="News & Insights" action="View All →" />
          <ul className="news-list">
            <li>
              <time>09:30</time>Gens, Puts opens higher amid positive global cues
            </li>
            <li>
              <time>08:45</time>FIIs turn net buyers, add ₹3,200 cr in cash market
            </li>
            <li>
              <time>08:15</time>India VIX falls 2.1% - volatility eases
            </li>
            <li>
              <time>07:30</time>RBI signals steady rate outlook in latest meeting
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
