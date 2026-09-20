import { useEffect, useId, useState } from "react";
import {
  BarChart2,
  ChevronDown,
  Edit2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  ToggleRight,
  Zap,
} from "lucide-react";
import {
  fetchStrategies,
  type StrategyResponse,
} from "../api/strategies";
import StrategyDialog from "../components/StrategyDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type StrategyStatus = "Active" | "Paused" | "Backtest";

// ─── Static summary card config ───────────────────────────────────────────────

const summaryCardConfig = [
  {
    label: "Active Strategies",
    icon: ToggleRight,
    iconBg: "#064b48",
    iconColor: "#00d084",
    chartType: "line" as const,
    perfPoints: [5, 9, 7, 14, 10, 18, 14, 22, 19, 27],
    lineColor: "#00d084",
  },
  {
    label: "Total Strategies",
    icon: BarChart2,
    iconBg: "#123d70",
    iconColor: "#55a6ff",
    chartType: "line" as const,
    perfPoints: [4, 7, 5, 9, 7, 11, 8, 13, 10, 14],
    lineColor: "#55a6ff",
  },
  {
    label: "Signals Today",
    icon: Zap,
    iconBg: "#2b1f5c",
    iconColor: "#a78bfa",
    chartType: "bar" as const,
    perfPoints: [6, 10, 7, 14, 9, 16, 11, 19, 13, 22],
    lineColor: "#a78bfa",
  },
  {
    label: "Portfolio Contribution",
    icon: TrendingUp,
    iconBg: "#053d55",
    iconColor: "#16d0c2",
    chartType: "line" as const,
    perfPoints: [6, 10, 8, 14, 11, 17, 14, 21, 18, 26],
    lineColor: "#00d084",
  },
];

const detailTabs = ["Overview", "Parameters", "Entry & Exit", "Performance", "Backtest"];
const filterTabs = ["All", "Active", "Paused", "Backtest"];

// ─── Smooth path builder ─────────────────────────────────────────────────────

function buildPath(pts: number[], width: number, height: number, padY = 4) {
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const range = max - min || 1;
  const mapped = pts.map((v, i) => ({
    x: (i / (pts.length - 1)) * width,
    y: height - ((v - min) / range) * (height - padY * 2) - padY,
  }));
  let line = `M${mapped[0].x.toFixed(1)},${mapped[0].y.toFixed(1)}`;
  for (let i = 1; i < mapped.length; i++) {
    const p0 = mapped[Math.max(i - 2, 0)];
    const p1 = mapped[i - 1];
    const p2 = mapped[i];
    const p3 = mapped[Math.min(i + 1, mapped.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    line += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  const last = mapped[mapped.length - 1];
  const area = `${line} L${last.x.toFixed(1)},${height} L${mapped[0].x.toFixed(1)},${height} Z`;
  return { line, area };
}

// ─── LineSparkline ────────────────────────────────────────────────────────────

function LineSparkline({ points, color = "#00d084", width = 80, height = 32 }: {
  points: number[]; color?: string; width?: number; height?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const gradId = `lg-${uid}`;
  const { line, area } = buildPath(points, width, height);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}
      preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── BarSparkline ─────────────────────────────────────────────────────────────

function BarSparkline({ points, color = "#a78bfa", width = 80, height = 32 }: {
  points: number[]; color?: string; width?: number; height?: number;
}) {
  const n = points.length;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const gap = 2;
  const barW = (width - gap * (n - 1)) / n;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}
      preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      {points.map((v, i) => {
        const barH = Math.max(2, ((v - min) / range) * (height - 4));
        return (
          <rect key={i} x={i * (barW + gap)} y={height - barH}
            width={barW} height={barH} fill={color}
            opacity={0.55 + 0.45 * (i / (n - 1))} rx={1.5} />
        );
      })}
    </svg>
  );
}

// ─── TableSparkline ───────────────────────────────────────────────────────────

function TableSparkline({ points, down = false }: { points: number[]; down?: boolean }) {
  const color = down ? "#ff4d57" : "#00d084";
  return <LineSparkline points={points} color={color} width={72} height={26} />;
}

// ─── Detail equity chart ──────────────────────────────────────────────────────

const equityPts = [42, 40, 43, 38, 36, 33, 31, 28, 26, 22, 24, 19, 21, 16, 18];

function DetailEquityChart() {
  const uid = useId().replace(/:/g, "");
  const gradId = `deq-${uid}`;
  const W = 280; const H = 90;
  const { line, area } = buildPath(equityPts, W, H, 4);
  return (
    <div className="sdp-equity-chart">
      <div className="sdp-equity-labels">
        <span style={{ color: "#00d084", fontSize: 8 }}>+20%</span>
        <span style={{ color: "#7890aa", fontSize: 8 }}>0%</span>
        <span style={{ color: "#ff4d57", fontSize: 8 }}>-30%</span>
      </div>
      <div className="sdp-equity-area">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
          preserveAspectRatio="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00d084" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00d084" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke="#00d084" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="sdp-equity-axis">
          {["Aug 20", "Aug 27", "Sep 3", "Sep 10", "Sep 17"].map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, icon: Icon, iconBg, iconColor, chartType, perfPoints, lineColor }: {
  label: string; value: string; sub: string;
  icon: typeof TrendingUp; iconBg: string; iconColor: string;
  chartType: "line" | "bar"; perfPoints: number[]; lineColor: string;
}) {
  return (
    <article className="metric-card strat-summary-card">
      <div className="metric-icon" style={{ background: iconBg, color: iconColor }}>
        <Icon size={17} />
      </div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <div className="metric-change" style={{ color: iconColor }}>{sub}</div>
      </div>
      <div className="strat-card-chart">
        {chartType === "bar"
          ? <BarSparkline points={perfPoints} color={lineColor} width={80} height={32} />
          : <LineSparkline points={perfPoints} color={lineColor} width={80} height={32} />}
      </div>
    </article>
  );
}

// ─── StatusPill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: StrategyStatus }) {
  const map: Record<StrategyStatus, { cls: string; label: string }> = {
    Active:   { cls: "status-pill status-active",   label: "● Active" },
    Paused:   { cls: "status-pill status-paused",   label: "⏸ Paused" },
    Backtest: { cls: "status-pill status-backtest", label: "◎ Backtest" },
  };
  const { cls, label } = map[status];
  return <span className={cls}>{label}</span>;
}

// ─── DetailPanel ─────────────────────────────────────────────────────────────

function DetailPanel({
  strategy,
  onEdit,
}: {
  strategy: StrategyResponse;
  onEdit: (s: StrategyResponse) => void;
}) {
  const [activeTab, setActiveTab] = useState("Overview");
  const status: StrategyStatus = strategy.enabled ? "Active" : "Paused";

  return (
    <aside className="strategy-detail-panel">
      {/* Header */}
      <div className="sdp-header">
        <div className="sdp-title-row">
          <div className="sdp-icon"><TrendingUp size={18} /></div>
          <div className="sdp-title-text">
            <h3>{strategy.name}</h3>
            <p>{strategy.description ?? "No description provided"}</p>
          </div>
          <div className="sdp-status-badge">
            <i />
            {status}
          </div>
          <label className="sdp-toggle" aria-label="Toggle strategy">
            <input type="checkbox" checked={strategy.enabled} readOnly />
            <span />
          </label>
        </div>
        <div className="sdp-tabs">
          {detailTabs.map((tab) => (
            <button key={tab}
              className={`sdp-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {activeTab === "Overview" && (
        <div className="sdp-body">
          <div className="sdp-meta-grid">
            {[
              ["Type", strategy.strategy_type],
              ["Timeframe", strategy.timeframe],
              ["Created", new Date(strategy.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })],
              ["Last Updated", new Date(strategy.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })],
            ].map(([k, v]) => (
              <div className="sdp-meta-item" key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>

          <div className="sdp-section">
            <h4>Description</h4>
            <p>{strategy.description ?? "No description provided."}</p>
          </div>

          {Object.keys(strategy.parameters).length > 0 && (
            <div className="sdp-section">
              <div className="sdp-section-header">
                <h4>Key Parameters</h4>
                <button className="sdp-edit-btn" onClick={() => onEdit(strategy)}>
                  <Edit2 size={11} /> Edit Parameters
                </button>
              </div>
              <div className="sdp-params-grid">
                {Object.entries(strategy.parameters).map(([k, v]) => (
                  <div className="sdp-param" key={k}>
                    <span>{k}</span>
                    <strong>{String(v)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(strategy.parameters).length === 0 && (
            <div className="sdp-section">
              <div className="sdp-section-header">
                <h4>Key Parameters</h4>
                <button className="sdp-edit-btn" onClick={() => onEdit(strategy)}>
                  <Edit2 size={11} /> Edit Parameters
                </button>
              </div>
              <p style={{ color: "#7890aa", fontSize: 11 }}>
                No parameters configured yet.
              </p>
            </div>
          )}

          <div className="sdp-section">
            <h4>Performance (Last 30 Days)</h4>
            <div className="sdp-perf-stats">
              {[
                ["Win Rate", "—", false],
                ["Total Trades", "—", false],
                ["Total P&L", "—", false],
                ["Sharpe Ratio", "—", false],
              ].map(([label, val, green]) => (
                <div className="sdp-perf-stat" key={label as string}>
                  <span>{label}</span>
                  <strong className={green ? "positive" : ""}>{val}</strong>
                </div>
              ))}
            </div>
            <DetailEquityChart />
          </div>
        </div>
      )}

      {activeTab !== "Overview" && (
        <div className="sdp-body sdp-placeholder">
          <p>{activeTab} content coming soon.</p>
        </div>
      )}
    </aside>
  );
}

// ─── Helper: derive display perfPoints from strategy id (deterministic) ───────

function perfPointsForStrategy(id: number, down = false): number[] {
  const seed = id * 17;
  const pts = Array.from({ length: 10 }, (_, i) =>
    Math.abs((seed + i * 13 + i * i * 3) % 30) + (down ? 30 - i * 2.5 : 5 + i * 2.8)
  );
  return pts;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<StrategyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StrategyResponse | null>(null);

  // Load strategies from API
  const loadStrategies = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchStrategies();
      setStrategies(data);
      if (data.length > 0 && selectedId === null) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load strategies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStrategies(); }, []);

  // When a strategy is saved (created or updated), refresh list
  const handleSaved = (saved: StrategyResponse) => {
    setStrategies((prev) => {
      const exists = prev.find((s) => s.id === saved.id);
      if (exists) return prev.map((s) => (s.id === saved.id ? saved : s));
      return [...prev, saved];
    });
    setSelectedId(saved.id);
  };

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (s: StrategyResponse) => {
    setEditTarget(s);
    setDialogOpen(true);
  };

  // Derived state
  const statusOf = (s: StrategyResponse): StrategyStatus =>
    s.enabled ? "Active" : "Paused";

  const filtered = strategies.filter((s) => {
    const st = statusOf(s);
    const matchFilter = activeFilter === "All" || st === activeFilter;
    return matchFilter;
  });

  const displayRows = filtered.filter((s) =>
    !searchTerm ||
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.strategy_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStrategy = strategies.find((s) => s.id === selectedId) ?? null;
  // Summary values derived from real data
  const activeCount = strategies.filter((s) => s.enabled).length;
  const totalCount = strategies.length;

  const summaryValues = [
    { value: `${activeCount} / ${totalCount}`, sub: `${activeCount} running` },
    { value: String(totalCount), sub: `${totalCount} configured` },
    { value: "42", sub: "+27.3% vs yesterday" },
    { value: "+12.4%", sub: "+₹18,320" },
  ];

  const filterCounts: Record<string, number> = {
    All: strategies.length,
    Active: strategies.filter((s) => s.enabled).length,
    Paused: strategies.filter((s) => !s.enabled).length,
    Backtest: 0,
  };

  return (
    <div className="strategies-page">

      {/* ── Page header ── */}
      <div className="strat-page-header">
        <div>
          <h1 className="strat-page-title">Strategies</h1>
          <p className="strat-page-sub">
            Build, configure and monitor your trading strategies
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="strat-refresh-btn" onClick={loadStrategies}
            disabled={loading} aria-label="Refresh">
            <RefreshCw size={14} className={loading ? "sd-spinner" : ""} />
          </button>
          <button className="strat-create-btn" onClick={openCreate}>
            <Plus size={15} /> Create Strategy
          </button>
        </div>
      </div>

      {/* ── Load error ── */}
      {loadError && (
        <div className="strat-load-error">
          ⚠ {loadError} —{" "}
          <button onClick={loadStrategies} style={{ color: "#55a6ff", background: "none", border: "none", cursor: "pointer", fontSize: "inherit" }}>
            retry
          </button>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="metrics strat-summary-row">
        {summaryCardConfig.map((cfg, i) => (
          <SummaryCard
            key={cfg.label}
            {...cfg}
            value={summaryValues[i].value}
            sub={summaryValues[i].sub}
          />
        ))}
      </div>

      {/* ── Filter + search row ── */}
      <div className="strat-filter-row">
        <div className="strat-filter-tabs">
          {filterTabs.map((label) => (
            <button key={label}
              className={`strat-filter-tab ${activeFilter === label ? "active" : ""}`}
              onClick={() => setActiveFilter(label)}>
              {label} ({filterCounts[label] ?? 0})
            </button>
          ))}
        </div>
        <div className="strat-filter-right">
          <div className="strat-search-box">
            <Search size={12} />
            <input
              placeholder="Search strategies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="strat-select-btn">All Types <ChevronDown size={12} /></button>
          <button className="strat-select-btn">All Timeframes <ChevronDown size={12} /></button>
        </div>
      </div>

      {/* ── Table + Detail panel ── */}
      <div className="strat-body">

        {/* Table */}
        <div className="strat-table-wrap panel">
          {loading ? (
            <div className="strat-loading">
              <RefreshCw size={16} className="sd-spinner" />
              <span>Loading strategies…</span>
            </div>
          ) : displayRows.length === 0 ? (
            <div className="strat-empty">
              <p>No strategies found.</p>
              <button className="strat-create-btn" onClick={openCreate} style={{ marginTop: 12 }}>
                <Plus size={14} /> Create your first strategy
              </button>
            </div>
          ) : (
            <table className="stt">
              <thead>
                <tr>
                  <th style={{ width: "26%" }}>Strategy</th>
                  <th style={{ width: "9%" }}>Status</th>
                  <th style={{ width: "10%" }}>Type</th>
                  <th style={{ width: "8%" }}>Timeframe</th>
                  <th style={{ width: "8%" }}>Signals Today</th>
                  <th style={{ width: "7%" }}>Win Rate</th>
                  <th style={{ width: "10%" }}>P&amp;L (Today)</th>
                  <th style={{ width: "10%" }}>Performance</th>
                  <th style={{ width: "7%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((s) => {
                  const isDown = !s.enabled;
                  const pts = perfPointsForStrategy(s.id, isDown);
                  const selected = selectedId === s.id;
                  return (
                    <tr
                      key={s.id}
                      className={selected ? "stt-selected" : ""}
                      onClick={() => setSelectedId(s.id)}
                    >
                      <td>
                        <div className="stt-name">
                          <strong>{s.name}</strong>
                          <span>{s.description ?? "—"}</span>
                        </div>
                      </td>
                      <td><StatusPill status={statusOf(s)} /></td>
                      <td className="stt-muted">{s.strategy_type}</td>
                      <td className="stt-muted">{s.timeframe}</td>
                      <td className="stt-muted">—</td>
                      <td className="stt-muted">—</td>
                      <td className={s.enabled ? "positive" : "negative"}>—</td>
                      <td><TableSparkline points={pts} down={isDown} /></td>
                      <td>
                        <div className="strat-actions">
                          <button className="strat-action-btn"
                            onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                            aria-label="Edit">
                            <Edit2 size={12} />
                          </button>
                          <button className="strat-action-btn"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="More">
                            <MoreHorizontal size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selectedStrategy && (
          <DetailPanel strategy={selectedStrategy} onEdit={openEdit} />
        )}
        {!selectedStrategy && !loading && (
          <div className="strategy-detail-panel sdp-empty-state">
            <p>Select a strategy to view details</p>
          </div>
        )}
      </div>

      {/* ── Dialog ── */}
      <StrategyDialog
        open={dialogOpen}
        strategy={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
