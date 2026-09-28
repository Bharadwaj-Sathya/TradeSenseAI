import { useEffect, useState } from "react";
import { Bell, ChevronDown, Menu, Moon, Search, Sun } from "lucide-react";

const tickers = [
  { name: "NIFTY 50", key: "NIFTY" },
  { name: "BANKNIFTY", key: "BANKNIFTY" },
  { name: "SENSEX", key: "SENSEX" },
] as const;

interface IndexData {
  symbol: string;
  price: number | null;
  previous_close: number | null;
  change: number | null;
  change_percent: number | null;
  status: string;
  timestamp: string | null;
}

interface IndexResponse {
  data: IndexData[];
}

interface TradeHeaderProps {
  dark: boolean;
  onToggleDark: () => void;
  onMenuOpen: () => void;
}

export default function TradeHeader({
  dark,
  onToggleDark,
  onMenuOpen,
}: TradeHeaderProps) {
  const [now, setNow] = useState(() => new Date());

  const [indices, setIndices] = useState<Record<string, IndexData>>({});

  /*
   * Market status
   * NSE/BSE regular session:
   * 09:15 - 15:30 IST
   */
  const getMarketStatus = () => {
    const currentTime = new Date();

    const indiaTime = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(currentTime);

    const hour = Number(indiaTime.find((part) => part.type === "hour")?.value);

    const minute = Number(
      indiaTime.find((part) => part.type === "minute")?.value,
    );

    const currentMinutes = hour * 60 + minute;

    const preOpenStart = 9 * 60; // 09:00
    const marketOpen = 9 * 60 + 15; // 09:15
    const marketClose = 15 * 60 + 30; // 15:30

    if (currentMinutes >= preOpenStart && currentMinutes < marketOpen) {
      return "PRE_OPEN";
    }

    if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
      return "OPEN";
    }

    return "CLOSED";
  };

  const marketStatus = getMarketStatus();

  /*
   * Clock
   */
  useEffect(() => {
    const clock = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(clock);
  }, []);

  /*
   * Fetch live index data
   */
  useEffect(() => {
    let cancelled = false;

    const fetchIndices = async () => {
      try {
        const response = await fetch(
          "http://localhost:8000/api/v1/candles/indices",
          {
            headers: {
              Accept: "*/*",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Index API returned ${response.status}`);
        }

        const result: IndexResponse = await response.json();

        if (cancelled) {
          return;
        }

        const mapped: Record<string, IndexData> = {};

        for (const index of result.data) {
          mapped[index.symbol] = index;
        }

        setIndices(mapped);
      } catch (error) {
        console.error("Failed to fetch index data:", error);
      }
    };

    fetchIndices();

    const interval = window.setInterval(() => {
      fetchIndices();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const timeLabel = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header
      className="
        flex
        h-[62px]
        w-full
        items-center
        gap-0
        border-b
        border-slate-800/80
        bg-[#071321]
        px-3
        text-slate-300
      "
    >
      {/* Mobile hamburger */}
      <button
        className="
          mr-2
          hidden
          h-9
          w-9
          items-center
          justify-center
          rounded-md
          text-slate-400
          transition
          hover:bg-slate-800
          hover:text-white
          md:flex
        "
        onClick={onMenuOpen}
        aria-label="Open menu"
      >
        <Menu size={19} />
      </button>

      {/* Search */}
      <div
        className="
          flex
          h-[42px]
          w-[378px]
          shrink-0
          items-center
          rounded-md
          border
          border-slate-700
          bg-[#0b1b2d]
          px-3
          text-slate-500
        "
      >
        <Search size={15} className="mr-2 shrink-0" />

        <input
          className="
            min-w-0
            flex-1
            bg-transparent
            text-[13px]
            text-slate-300
            outline-none
            placeholder:text-slate-500
          "
          placeholder="Search symbols, strategies, or insights..."
        />

        <kbd
          className="
            ml-2
            hidden
            whitespace-nowrap
            text-[10px]
            text-slate-500
            lg:block
          "
        >
          Ctrl + K
        </kbd>
      </div>

      {/* ── Inline tickers ── */}
      <div
        className="
          flex
          min-w-0
          flex-1
          items-center
          overflow-hidden
        "
      >
        {tickers.map(({ name, key }) => {
          const index = indices[key];

          const price = index?.price;
          const changePercent = index?.change_percent;

          const isNegative =
            changePercent !== null &&
            changePercent !== undefined &&
            changePercent < 0;

          return (
            <div
              className="
                flex
                h-[34px]
                shrink-0
                items-center
                border-r
                border-slate-800
                px-3
                text-[11px]
              "
              key={name}
            >
              <span
                className="
                  mr-2
                  whitespace-nowrap
                  font-medium
                  text-slate-500
                "
              >
                {name}
              </span>

              <span
                className="
                  mr-2
                  whitespace-nowrap
                  font-semibold
                  tabular-nums
                  text-slate-200
                "
              >
                {price !== null && price !== undefined
                  ? price.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "--"}
              </span>

              <span
                className={`whitespace-nowrap font-semibold tabular-nums ${
                  isNegative ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {changePercent !== null && changePercent !== undefined
                  ? `${
                      changePercent >= 0 ? "+" : ""
                    }${changePercent.toFixed(2)}%`
                  : "--"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Date & time */}
      <time
        className="
          ml-5
          shrink-0
          whitespace-nowrap
          text-[11px]
          font-medium
          text-slate-400
        "
      >
        {dateLabel}&nbsp; {timeLabel}
      </time>

      {/* Market status */}
      <div
        className={`
    ml-3
    flex
    shrink-0
    items-center
    gap-1.5
    whitespace-nowrap
    text-[12px]
    font-medium
    ${
      marketStatus === "OPEN"
        ? "text-emerald-400"
        : marketStatus === "PRE_OPEN"
          ? "text-orange-400"
          : "text-red-400"
    }
  `}
      >
        <i
          className={`
      block
      h-1.5
      w-1.5
      rounded-full
      ${
        marketStatus === "OPEN"
          ? "bg-emerald-400"
          : marketStatus === "PRE_OPEN"
            ? "bg-orange-400"
            : "bg-red-400"
      }
    `}
        />

        {marketStatus === "OPEN"
          ? "Market Open"
          : marketStatus === "PRE_OPEN"
            ? "Pre-Open"
            : "Market Closed"}
      </div>

      {/* Theme toggle */}
      <button
        className="
          ml-5
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-md
          text-slate-400
          transition
          hover:bg-slate-800
          hover:text-slate-200
        "
        onClick={onToggleDark}
        aria-label="Toggle theme"
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Notifications */}
      <button
        className="
          relative
          ml-2
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-md
          text-slate-400
          transition
          hover:bg-slate-800
          hover:text-slate-200
        "
        aria-label="Notifications"
      >
        <Bell size={17} />

        <b
          className="
            absolute
            -right-0.5
            -top-0.5
            flex
            h-3.5
            min-w-3.5
            items-center
            justify-center
            rounded-full
            bg-red-500
            px-1
            text-[8px]
            font-bold
            leading-none
            text-white
          "
        >
          3
        </b>
      </button>

      {/* Profile */}
      <div
        className="
          ml-2
          flex
          shrink-0
          items-center
          gap-2
          pl-1
        "
      >
        <span
          className="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-full
            bg-blue-600
            text-[12px]
            font-semibold
            text-white
          "
        >
          BS
        </span>

        <strong
          className="
            hidden
            whitespace-nowrap
            text-[12px]
            font-medium
            text-slate-300
            xl:block
          "
        >
          Bharadwaj
        </strong>

        <ChevronDown size={13} className="text-slate-500" />
      </div>
    </header>
  );
}
