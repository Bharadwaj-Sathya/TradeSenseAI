import { useEffect, useState } from "react";
import { Wifi, RefreshCw } from "lucide-react";

// ============================================
// TYPES
// ============================================

type SignalType = "BULLISH" | "BEARISH" | "NO_TRADE";

interface Signal {
  signal: SignalType;
  score: number;
}

interface MarketRow {
  index: string;
  oneMin: Signal;
  threeMin: Signal;
  fiveMin: Signal;
  fifteenMin: Signal;
}

// ============================================
// SAMPLE DATA
// ============================================

const initialMarketData: MarketRow[] = [
  {
    index: "NIFTY 50",

    oneMin: {
      signal: "BULLISH",
      score: 4,
    },

    threeMin: {
      signal: "BULLISH",
      score: 3,
    },

    fiveMin: {
      signal: "BULLISH",
      score: 3,
    },

    fifteenMin: {
      signal: "NO_TRADE",
      score: 2,
    },
  },

  {
    index: "SENSEX",

    oneMin: {
      signal: "BEARISH",
      score: -3,
    },

    threeMin: {
      signal: "BEARISH",
      score: -4,
    },

    fiveMin: {
      signal: "NO_TRADE",
      score: -2,
    },

    fifteenMin: {
      signal: "BEARISH",
      score: -3,
    },
  },
];

// ============================================
// SIGNAL CELL
// ============================================

function SignalCell({ data }: { data: Signal }) {
  const { signal, score } = data;

  if (signal === "BULLISH") {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-500" />

        <span className="text-xs font-medium text-green-400">BULLISH</span>

        <span className="text-xs text-slate-500">+{score}</span>
      </div>
    );
  }

  if (signal === "BEARISH") {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-500" />

        <span className="text-xs font-medium text-red-400">BEARISH</span>

        <span className="text-xs text-slate-500">{score}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-gray-500" />

      <span className="text-xs font-medium text-gray-400">NO TRADE</span>

      <span className="text-xs text-slate-500">{score}</span>
    </div>
  );
}

// ============================================
// LIVE MARKET PAGE
// ============================================

export default function LiveMarketPage() {
  const [marketData, setMarketData] = useState<MarketRow[]>(initialMarketData);

  const [loading, setLoading] = useState(false);

  const [connected, setConnected] = useState(true);

  // ============================================
  // WEBSOCKET
  // ============================================

  useEffect(() => {
    /*
      Replace this with your actual WebSocket.

      const ws = new WebSocket(
        "ws://localhost:8000/ws/live-market"
      );

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setMarketData(data);
      };

      ws.onclose = () => {
        setConnected(false);
      };

      ws.onerror = () => {
        setConnected(false);
      };

      return () => {
        ws.close();
      };
    */

    setConnected(true);
  }, []);

  // ============================================
  // UI
  // ============================================

  return (
    <div className="min-h-full w-full bg-[#0b1724] text-slate-200">
      {/* ========================================
          HEADER
      ======================================== */}

      <div className="flex items-start justify-between px-5 pb-4 pt-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Live Market</h1>

          <p className="mt-1 text-xs text-slate-500">
            Real-time market signals powered by live WebSocket data.
          </p>
        </div>

        {/* Connection */}

        <div
          className={`flex items-center gap-2 text-xs ${
            connected ? "text-green-400" : "text-gray-500"
          }`}
        >
          <Wifi size={14} />

          <span>{connected ? "Live Connected" : "Disconnected"}</span>
        </div>
      </div>

      {/* ========================================
          TABLE CONTAINER
      ======================================== */}

      <div className="px-5">
        <div className="w-full overflow-hidden rounded-lg border border-slate-800 bg-[#101e2d]">
          {loading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-xs text-slate-500">
              <RefreshCw size={15} className="animate-spin" />
              Loading market signals...
            </div>
          ) : marketData.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-xs text-slate-500">
              No market signals available.
            </div>
          ) : (
            <table className="w-full border-collapse">
              {/* ==================================
                  HEADER
              ================================== */}

              <thead>
                <tr className="border-b border-slate-800 bg-[#0d1a28]">
                  <th className="w-[20%] px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    Index
                  </th>

                  <th className="w-[20%] px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    1 Min
                  </th>

                  <th className="w-[20%] px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    3 Min
                  </th>

                  <th className="w-[20%] px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    5 Min
                  </th>

                  <th className="w-[20%] px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    15 Min
                  </th>
                </tr>
              </thead>

              {/* ==================================
                  BODY
              ================================== */}

              <tbody>
                {marketData.map((market) => (
                  <tr
                    key={market.index}
                    className="border-b border-slate-800/70 transition-colors hover:bg-slate-800/30"
                  >
                    {/* INDEX */}

                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-200">
                          {market.index}
                        </span>

                        <span className="mt-1 text-[9px] text-slate-600">
                          Market Index
                        </span>
                      </div>
                    </td>

                    {/* 1 MIN */}

                    <td className="px-4 py-4">
                      <SignalCell data={market.oneMin} />
                    </td>

                    {/* 3 MIN */}

                    <td className="px-4 py-4">
                      <SignalCell data={market.threeMin} />
                    </td>

                    {/* 5 MIN */}

                    <td className="px-4 py-4">
                      <SignalCell data={market.fiveMin} />
                    </td>

                    {/* 15 MIN */}

                    <td className="px-4 py-4">
                      <SignalCell data={market.fifteenMin} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
