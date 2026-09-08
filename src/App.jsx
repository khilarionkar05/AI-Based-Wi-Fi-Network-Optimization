import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wifi, Activity, Zap, Gauge, Cpu, Radio, ArrowRight, Sparkles,
  RefreshCw, Laptop, Smartphone, Tv, Tablet, CheckCircle2,
  AlertTriangle, Layers, ShieldCheck, Clock, Search, X,
  FileText, Printer, WifiOff, AlertCircle, Info, ChevronDown,
  ChevronUp, LayoutDashboard, ScanLine, Settings, BrainCircuit,
  Bell, ChevronRight, TrendingUp, Zap as ZapIcon,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { getFullMetrics, checkBackend, FALLBACK_METRICS } from './services/networkApi.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const CHART_MAX_POINTS = 20;
const POLL_INTERVAL_MS = 30000;

const ANALYSIS_STEPS = [
  'Querying Wi-Fi interface via netsh...',
  'Sampling RF spectrum — 2.4 GHz / 5 GHz...',
  'Measuring round-trip latency...',
  'Scanning nearby access points...',
  'Running AI channel interference analysis...',
  'Computing network health score...',
  'Generating optimization recommendation...',
];

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'scan',       label: 'Network Scan',       icon: ScanLine        },
  { id: 'channel',    label: 'Channel Analysis',   icon: Radio           },
  { id: 'devices',    label: 'Connected Devices',  icon: Layers          },
  { id: 'ai',         label: 'AI Insights',        icon: BrainCircuit    },
  { id: 'settings',   label: 'Settings',           icon: Settings        },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtTime(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function signalLabel(dbm) {
  if (dbm == null) return 'Unknown';
  if (dbm >= -50) return 'Excellent';
  if (dbm >= -60) return 'Good';
  if (dbm >= -70) return 'Fair';
  return 'Weak';
}

function healthLabel(score) {
  if (score == null) return '—';
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 55) return 'Fair';
  return 'Poor';
}

function guessDeviceType(ip, mac) {
  if (!mac) return 'unknown';
  const phoneOUIs = ['AC:37:43', 'A4:C3:F0', '98:01:A7', 'F8:E0:79', 'BC:9F:EF'];
  const tvOUIs = ['8C:57:9B', '00:24:32', 'FC:A1:83', 'B4:7C:9C'];
  if (phoneOUIs.some((o) => mac.startsWith(o))) return 'phone';
  if (tvOUIs.some((o) => mac.startsWith(o))) return 'tv';
  if (ip.endsWith('.1') || ip.endsWith('.254')) return 'router';
  return 'laptop';
}

// ─── Device icon — light pastel containers ────────────────────────────────
function DeviceIcon({ type, size = 'md' }) {
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const wrap = size === 'sm' ? 'p-1.5' : 'p-2';
  const configs = {
    phone:   { bg: 'bg-emerald-50',  border: 'border-emerald-100', color: 'text-emerald-600', Icon: Smartphone },
    tv:      { bg: 'bg-purple-50',   border: 'border-purple-100',  color: 'text-purple-600',  Icon: Tv         },
    tablet:  { bg: 'bg-blue-50',     border: 'border-blue-100',    color: 'text-blue-600',    Icon: Tablet     },
    router:  { bg: 'bg-amber-50',    border: 'border-amber-100',   color: 'text-amber-600',   Icon: Wifi       },
    default: { bg: 'bg-indigo-50',   border: 'border-indigo-100',  color: 'text-indigo-600',  Icon: Laptop     },
  };
  const c = configs[type] || configs.default;
  return (
    <div className={`${wrap} rounded-lg ${c.bg} border ${c.border} shrink-0`}>
      <c.Icon className={`${sz} ${c.color}`} />
    </div>
  );
}

// ─── Router SVG — clean 3D-style illustration ────────────────────────────
function RouterVisual() {
  return (
    <div className="relative flex items-center justify-center w-full h-full select-none overflow-hidden">
      {/* Ambient glow rings — use % sizes so they never exceed the container */}
      <div className="absolute w-3/4 pb-[75%] rounded-full bg-violet-200/40 animate-ping [animation-duration:3s]" style={{ animationDelay: '0s' }} />
      <div className="absolute w-full pb-[100%] rounded-full bg-violet-100/20 animate-ping [animation-duration:3s]" style={{ animationDelay: '1s' }} />
      <div className="absolute w-1/2 pb-[50%] rounded-full bg-violet-300/20 blur-2xl" />

      {/* Router body */}
      <svg viewBox="0 0 200 160" className="relative z-10 w-48 h-auto drop-shadow-xl" fill="none">
        {/* Base shadow */}
        <ellipse cx="100" cy="148" rx="56" ry="7" fill="#e0e7ff" opacity="0.7" />
        {/* Body */}
        <rect x="32" y="100" width="136" height="38" rx="10" fill="url(#routerBody)" />
        <rect x="32" y="100" width="136" height="38" rx="10" stroke="#c7d2fe" strokeWidth="1" />
        {/* Top highlight */}
        <rect x="36" y="104" width="128" height="8" rx="4" fill="white" opacity="0.6" />
        {/* LED dots */}
        <circle cx="54" cy="119" r="3.5" fill="#34d399" />
        <circle cx="54" cy="119" r="3.5" fill="#34d399" opacity="0.5">
          <animate attributeName="r" values="3.5;5.5;3.5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="66" cy="119" r="3.5" fill="#818cf8" />
        <circle cx="78" cy="119" r="3.5" fill="#818cf8" opacity="0.6" />
        {/* Port slots */}
        <rect x="130" y="113" width="10" height="5" rx="1.5" fill="#a5b4fc" opacity="0.8" />
        <rect x="144" y="113" width="10" height="5" rx="1.5" fill="#a5b4fc" opacity="0.6" />
        <rect x="158" y="113" width="6" height="5" rx="1.5" fill="#c4b5fd" opacity="0.6" />
        {/* Antennas */}
        <line x1="58" y1="100" x2="52" y2="52" stroke="#c7d2fe" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="58" y1="100" x2="52" y2="52" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        <ellipse cx="52" cy="50" rx="5" ry="5" fill="#818cf8" />

        <line x1="80" y1="100" x2="76" y2="40" stroke="#c7d2fe" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="80" y1="100" x2="76" y2="40" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        <ellipse cx="76" cy="38" rx="5" ry="5" fill="#6366f1" />

        <line x1="120" y1="100" x2="124" y2="40" stroke="#c7d2fe" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="120" y1="100" x2="124" y2="40" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        <ellipse cx="124" cy="38" rx="5" ry="5" fill="#6366f1" />

        <line x1="142" y1="100" x2="148" y2="52" stroke="#c7d2fe" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="142" y1="100" x2="148" y2="52" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        <ellipse cx="148" cy="50" rx="5" ry="5" fill="#818cf8" />

        {/* Wi-Fi signal arcs */}
        <path d="M 80 80 Q 100 66 120 80" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />
        <path d="M 70 72 Q 100 52 130 72" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.55" />
        <path d="M 60 64 Q 100 38 140 64" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.28" />
        <circle cx="100" cy="87" r="3.5" fill="#8b5cf6" />

        {/* Gradient defs */}
        <defs>
          <linearGradient id="routerBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0f4ff" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ─── Floating Badge ───────────────────────────────────────────────────────
function FloatBadge({ icon, label, className = '' }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-md border border-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap ${className}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

// ─── Report Modal ─────────────────────────────────────────────────────────
function ReportModal({ data, onClose }) {
  const ai = data.aiRecommendation;
  const lat = data.latency;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        id="report-modal"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-violet-100 rounded-lg">
              <FileText className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Network Analysis Report</h2>
            {data.isFallback && (
              <span className="px-2 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full uppercase tracking-wider">
                Demo Data
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 text-sm">
          <p className="text-xs text-slate-400">
            Generated: {data.timestamp ? fmtTime(data.timestamp) : 'N/A'} &nbsp;|&nbsp;
            {data.ssid ? `SSID: ${data.ssid}` : 'No Wi-Fi connection'}
          </p>

          {/* Status */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-3">Connection Status</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['SSID', data.ssid || '—'],
                ['Band', data.band || '—'],
                ['Radio Type', data.radioType || '—'],
                ['Channel', data.currentChannel ? `Ch ${data.currentChannel}` : '—'],
                ['Authentication', data.authentication || '—'],
                ['Status', data.connected ? 'Connected' : 'Disconnected'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-800 font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Metrics */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-3">Network Metrics</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Signal Strength', data.signalDbm != null ? `${data.signalDbm} dBm (${signalLabel(data.signalDbm)})` : '—'],
                ['Link Speed (Rx)', data.rxRate != null ? `${data.rxRate} Mbps` : '—'],
                ['Link Speed (Tx)', data.txRate != null ? `${data.txRate} Mbps` : '—'],
                ['Latency (avg)', lat?.avg != null ? `${lat.avg} ms` : '—'],
                ['Latency (min/max)', lat?.min != null ? `${lat.min} / ${lat.max} ms` : '—'],
                ['Packet Loss', lat?.packetLoss != null ? `${lat.packetLoss}%` : '—'],
                ['Network Health', data.healthScore != null ? `${data.healthScore}%` : '—'],
                ['Nearby Networks', data.nearbyCount ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-800 font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </section>

          {/* AI Recommendation */}
          {ai && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-3">AI Recommendation</h3>
              <div className="p-4 bg-violet-50 rounded-xl border border-violet-100 space-y-2">
                <p className="font-semibold text-slate-800">{ai.issue}</p>
                <p className="text-slate-600 text-xs leading-relaxed">{ai.issueDetail}</p>
                <div className="flex items-center gap-4 pt-2 text-xs">
                  <span className="text-slate-500">
                    Current: <span className="text-slate-800 font-semibold">Ch {ai.currentChannel}</span> ({ai.congestion}% congestion)
                  </span>
                  <ArrowRight className="w-4 h-4 text-violet-500" />
                  <span className="text-slate-500">
                    Recommended: <span className="text-violet-700 font-semibold">Ch {ai.recommendedChannel}</span>
                  </span>
                </div>
                <p className="text-xs text-emerald-600 pt-1 font-medium">Expected: {ai.expectedResult}</p>
              </div>
            </section>
          )}

          {/* Nearby Networks */}
          {data.nearbyNetworks && data.nearbyNetworks.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-3">
                Detected Nearby Networks ({data.nearbyNetworks.length})
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto print-full">
                {data.nearbyNetworks.map((n, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <span className="text-slate-700 font-medium truncate max-w-[140px]">{n.ssid || 'Hidden'}</span>
                    <div className="flex items-center gap-3 text-slate-400 shrink-0">
                      <span>Ch {n.channel ?? '?'}</span>
                      <span>{n.band || '—'}</span>
                      <span className={n.signalDbm >= -60 ? 'text-emerald-600' : n.signalDbm >= -70 ? 'text-amber-600' : 'text-rose-500'}>
                        {n.signalDbm != null ? `${n.signalDbm} dBm` : '—'}
                      </span>
                      <span>{n.authentication || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-4">
            AI Wi-Fi Optimizer — B.Tech MDM Project. All data collected from local OS APIs (read-only).
            No router configuration is performed. Channel recommendations require manual router settings change.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────
function Sidebar({ activeNav, setActiveNav, sidebarOpen, setSidebarOpen }) {
  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-30 h-screen w-60 flex flex-col shrink-0
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: 'linear-gradient(160deg, #130d35 0%, #1a1144 40%, #221558 100%)',
          boxShadow: '4px 0 24px rgba(26,17,68,0.25)',
        }}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">AI Wi-Fi Optimizer</p>
              <p className="text-[11px] text-white/45 leading-tight mt-0.5">Intelligent Network Analysis</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scroll">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeNav === id;
            return (
              <button
                key={id}
                onClick={() => { setActiveNav(id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  active
                    ? 'nav-active text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/7'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-white/45 group-hover:text-white/70'}`} />
                <span>{label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/60" />}
              </button>
            );
          })}
        </nav>

        {/* Footer decoration */}
        <div className="px-5 pt-4 pb-5 border-t border-white/10">
          {/* Mini wave decoration */}
          <svg viewBox="0 0 180 28" className="w-full mb-3 opacity-25" fill="none">
            <path d="M0 14 Q22 4 44 14 Q66 24 88 14 Q110 4 132 14 Q154 24 180 14" stroke="url(#wg)" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M0 20 Q22 10 44 20 Q66 30 88 20 Q110 10 132 20 Q154 30 180 20" stroke="url(#wg)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
            <defs>
              <linearGradient id="wg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <p className="text-[11px] text-white/35 leading-snug text-center">
            Better Connections for a Smarter Tomorrow
          </p>
          <p className="text-[10px] text-white/20 text-center mt-1.5">v1.0 · MDM Project</p>
        </div>
      </aside>
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const [metrics, setMetrics] = useState(null);
  const [chartHistory, setChartHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [lastUpdated, setLastUpdated] = useState('Never');
  const [backendOnline, setBackendOnline] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [showRecommendationApplied, setShowRecommendationApplied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [nearbyExpanded, setNearbyExpanded] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stepTimers = useRef([]);
  const pollTimer = useRef(null);

  const d   = metrics || FALLBACK_METRICS;
  const ai  = d.aiRecommendation;
  const lat = d.latency;

  // Backend check on mount
  useEffect(() => {
    checkBackend().then((res) => {
      setBackendOnline(res.ok);
      if (res.ok) {
        runAnalysis();
      } else {
        setMetrics(FALLBACK_METRICS);
        setLastUpdated(fmtTime(new Date()));
        seedChartHistory(FALLBACK_METRICS);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background polling
  useEffect(() => {
    if (backendOnline) {
      pollTimer.current = setInterval(() => {
        if (!isAnalyzing) silentRefresh();
      }, POLL_INTERVAL_MS);
    }
    return () => clearInterval(pollTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendOnline, isAnalyzing]);

  function seedChartHistory(m) {
    if (!m) return;
    const speed = m.rxRate ?? 0;
    const latMs = m.latency?.avg ?? 0;
    const now = Date.now();
    const seed = Array.from({ length: 7 }, (_, i) => ({
      time: fmtTime(new Date(now - (6 - i) * 120000)),
      speed: Math.round(speed * (0.88 + Math.random() * 0.16)),
      latency: Math.round(latMs * (0.85 + Math.random() * 0.3)),
    }));
    setChartHistory(seed);
  }

  function appendChartPoint(m) {
    if (!m) return;
    const pt = { time: fmtTime(new Date()), speed: m.rxRate ?? 0, latency: m.latency?.avg ?? 0 };
    setChartHistory((prev) => {
      const next = [...prev, pt];
      return next.length > CHART_MAX_POINTS ? next.slice(next.length - CHART_MAX_POINTS) : next;
    });
  }

  const runAnalysis = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setShowRecommendationApplied(false);
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
    ANALYSIS_STEPS.forEach((step, i) => {
      const t = setTimeout(() => setScanStep(step), i * 350);
      stepTimers.current.push(t);
    });
    try {
      const { ok, data } = await getFullMetrics();
      if (ok && data?.ok) {
        setMetrics(data);
        setBackendOnline(true);
        appendChartPoint(data);
        if (chartHistory.length === 0) seedChartHistory(data);
      } else {
        if (ok && data) {
          setMetrics({ ...FALLBACK_METRICS, ...data, isFallback: true });
          appendChartPoint(data);
        } else {
          setBackendOnline(false);
          setMetrics(FALLBACK_METRICS);
          if (chartHistory.length === 0) seedChartHistory(FALLBACK_METRICS);
        }
      }
    } catch {
      setBackendOnline(false);
      setMetrics(FALLBACK_METRICS);
      if (chartHistory.length === 0) seedChartHistory(FALLBACK_METRICS);
    } finally {
      const finishDelay = ANALYSIS_STEPS.length * 350 + 200;
      const t = setTimeout(() => {
        setIsAnalyzing(false);
        setScanStep('');
        setLastUpdated(fmtTime(new Date()));
      }, finishDelay);
      stepTimers.current.push(t);
    }
  }, [isAnalyzing, chartHistory.length]);

  async function silentRefresh() {
    try {
      const { ok, data } = await getFullMetrics();
      if (ok && data?.ok) {
        setMetrics(data);
        appendChartPoint(data);
        setLastUpdated(fmtTime(new Date()));
      }
    } catch { /* silent */ }
  }

  // Search filtering — preserved exactly
  const q = searchQuery.trim().toLowerCase();
  const filteredNearby = d.nearbyNetworks?.filter((n) =>
    !q || (n.ssid || '').toLowerCase().includes(q) ||
    String(n.channel || '').includes(q) ||
    (n.band || '').toLowerCase().includes(q) ||
    (n.authentication || '').toLowerCase().includes(q)
  ) ?? [];
  const filteredDevices = d.devices?.filter((dev) =>
    !q || (dev.ip || '').includes(q) ||
    (dev.mac || '').toLowerCase().includes(q) ||
    guessDeviceType(dev.ip, dev.mac).includes(q)
  ) ?? [];

  function congestionColor(pct) {
    if (pct > 50) return 'text-rose-500';
    if (pct > 25) return 'text-amber-500';
    return 'text-emerald-600';
  }
  function congestionBarColor(pct) {
    if (pct > 50) return 'bg-rose-500';
    if (pct > 25) return 'bg-amber-400';
    return 'bg-emerald-500';
  }

  // Derived band label for header badge
  const bandBadge = (() => {
    if (!d.band) return null;
    const radio = d.radioType || '';
    if (radio.includes('6') || radio.includes('ax')) return `${d.band} | Wi-Fi 6`;
    if (radio.includes('ac')) return `${d.band} | Wi-Fi 5`;
    if (radio.includes('n'))  return `${d.band} | Wi-Fi 4`;
    return d.band;
  })();

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-full overflow-hidden bg-slate-100 font-sans flex">

      {showReport && <ReportModal data={d} onClose={() => setShowReport(false)} />}

      {/* ══ Sidebar ══════════════════════════════════════════════════ */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* ══ Main area ════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden h-screen lg:ml-60">

        {/* ── Top Header ─────────────────────────────────────────── */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Search */}
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm transition-all flex-1 max-w-sm ${
            searchFocused ? 'border-violet-300 ring-2 ring-violet-100 bg-white' : 'border-slate-200 bg-slate-50'
          }`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search network, location or device..."
              className="bg-transparent outline-none text-slate-700 placeholder:text-slate-400 text-sm flex-1 min-w-0"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Online & Monitoring pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Online &amp; Monitoring
            </div>

            {/* Band badge */}
            {bandBadge && (
              <div className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-xs font-semibold text-violet-700">
                <Wifi className="w-3 h-3" />
                {bandBadge}
              </div>
            )}

            {/* Demo Data pill */}
            {d.isFallback && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-600">
                Demo Data
              </div>
            )}

            {/* Notification */}
            <button className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
              <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-violet-500 rounded-full" />
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-2 pl-1.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                OK
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight">Onkar</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </header>

        {/* ── Backend offline notice ──────────────────────────────── */}
        {backendOnline === false && (
          <div className="mx-4 sm:mx-6 mt-3 flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs">
            <AlertCircle className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Backend not reachable.</span>
              {' '}Run <code className="px-1 py-0.5 bg-amber-100 rounded font-mono">npm run dev:all</code> in your terminal to start both servers. Showing demo data.
            </div>
          </div>
        )}

        {/* ── Scanning banner ─────────────────────────────────────── */}
        {isAnalyzing && (
          <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 text-xs scan-pulse">
            <Cpu className="w-4 h-4 text-violet-500 animate-spin shrink-0" />
            <span className="flex-1 font-medium truncate">{scanStep || 'Initialising AI diagnostic engine…'}</span>
            <span className="px-2 py-0.5 bg-violet-100 border border-violet-200 text-violet-600 font-semibold rounded-full text-[11px] shrink-0">
              AI SCAN ACTIVE
            </span>
          </div>
        )}

        {/* ── Search hint ─────────────────────────────────────────── */}
        {q && (
          <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Search className="w-3.5 h-3.5" />
            <span>
              Results for <span className="text-violet-600 font-semibold">"{searchQuery}"</span>
              {' '}— {filteredNearby.length} network{filteredNearby.length !== 1 ? 's' : ''}, {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* ── Dashboard scroll area ───────────────────────────────── */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-5 space-y-5 min-w-0">

          {/* ════════════════════════════════════════════════════════
              HERO SECTION
          ═══════════════════════════════════════════════════════════ */}
          <section className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-card-md"
            style={{ background: 'linear-gradient(135deg, #f8f7ff 0%, #f0effe 50%, #ede9fe 100%)' }}>

            {/* Soft ambient glow blobs */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-indigo-200/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 sm:p-8">
              {/* Left: text */}
              <div className="flex flex-col justify-center gap-4 z-10">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 border border-violet-200 text-violet-700 text-[11px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    AI-Powered Network Optimization
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 leading-tight">
                    Your Network,{' '}
                    <span
                      className="gradient-text"
                    >
                      Optimized by AI
                    </span>
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500 tracking-wide">
                    Analyze. Optimize. Connect Better.
                  </p>
                </div>

                <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                  Get real-time insights, detect network issues, and receive AI-driven recommendations
                  for the best Wi-Fi performance.
                </p>

                {/* SSID line */}
                {d.ssid && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Wifi className="w-3.5 h-3.5 text-violet-500" />
                    <span>Connected to</span>
                    <span className="font-semibold text-slate-700">{d.ssid}</span>
                    {d.band && <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-md font-semibold">{d.band}</span>}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                      isAnalyzing
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-200 hover:shadow-violet-300 hover:shadow-md active:scale-[0.98]'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    {isAnalyzing ? 'Analyzing…' : 'Run AI Analysis'}
                  </button>

                  <button
                    onClick={() => setShowReport(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-sm"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    View Report
                  </button>
                </div>

                {/* Last updated */}
                {lastUpdated !== 'Never' && (
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" /> Last updated: {lastUpdated}
                  </p>
                )}
              </div>

              {/* Right: router visual */}
              <div className="relative flex items-center justify-center min-h-[200px] lg:min-h-0">
                {/* Floating badges */}
                <div className="absolute top-2 left-2 z-20">
                  <FloatBadge icon="⚡" label="Faster Speed" />
                </div>
                <div className="absolute top-2 right-2 z-20">
                  <FloatBadge icon="🛡" label="Better Stability" />
                </div>
                <div className="absolute bottom-2 left-2 z-20">
                  <FloatBadge icon="📊" label="Lower Latency" />
                </div>
                <div className="absolute bottom-2 right-2 z-20">
                  <FloatBadge icon="✨" label="AI Optimized" />
                </div>

                <div className="w-full max-w-[260px] mx-auto h-52 relative z-10">
                  <RouterVisual />
                </div>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              FOUR METRIC CARDS
          ═══════════════════════════════════════════════════════════ */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Signal Strength */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-card card-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Signal Strength</span>
                <div className="p-2 rounded-xl bg-violet-50 border border-violet-100">
                  <Wifi className="w-4 h-4 text-violet-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-800">{d.signalDbm ?? '—'}</span>
                <span className="text-sm font-medium text-slate-400">dBm</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  d.signalDbm >= -60 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                  d.signalDbm >= -70 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                  'bg-rose-50 text-rose-600 border border-rose-100'
                }`}>
                  {signalLabel(d.signalDbm)}
                </span>
                {/* Signal bars */}
                <div className="flex items-end gap-0.5 h-4">
                  {[d.signalDbm >= -75, d.signalDbm >= -65, d.signalDbm >= -55, d.signalDbm >= -48].map((on, i) => (
                    <span key={i} className={`w-1.5 rounded-sm ${on ? 'bg-violet-500' : 'bg-slate-200'}`}
                      style={{ height: `${(i + 1) * 4}px` }} />
                  ))}
                </div>
              </div>
              {!d.isFallback && d.signalPercent != null && (
                <p className="mt-2 text-[11px] text-slate-400">{d.signalPercent}% Windows scale</p>
              )}
            </div>

            {/* Speed */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-card card-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Speed</span>
                <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-100">
                  <Zap className="w-4 h-4 text-cyan-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-800">{d.rxRate ?? '—'}</span>
                <span className="text-sm font-medium text-slate-400">Mbps</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100">
                  Stable
                </span>
                <span className="text-[11px] text-slate-400 font-mono">{d.radioType || '802.11'}</span>
              </div>
              {d.txRate != null && (
                <p className="mt-2 text-[11px] text-slate-400">Tx: {d.txRate} Mbps</p>
              )}
            </div>

            {/* Latency */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-card card-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latency</span>
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                  <Activity className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-800">{lat?.avg ?? '—'}</span>
                <span className="text-sm font-medium text-slate-400">ms</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  lat?.avg != null && lat.avg < 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  lat?.avg != null && lat.avg < 80 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                  'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  {lat?.avg != null ? (lat.avg < 30 ? 'Low' : lat.avg < 80 ? 'Moderate' : 'High') : '—'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {lat?.packetLoss != null ? `${lat.packetLoss}% loss` : ''}
                </span>
              </div>
              {lat?.min != null && (
                <p className="mt-2 text-[11px] text-slate-400">min {lat.min}ms / max {lat.max}ms</p>
              )}
            </div>

            {/* Network Health */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-card card-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Network Health</span>
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                  <Gauge className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-800">{d.healthScore ?? '—'}</span>
                <span className="text-sm font-medium text-slate-400">%</span>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    (d.healthScore ?? 0) >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {healthLabel(d.healthScore)}
                  </span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      (d.healthScore ?? 0) >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'
                    }`}
                    style={{ width: `${d.healthScore ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              ANALYTICS ROW: Chart + AI Recommendation
          ═══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* Network Performance Chart — spans 3 */}
            <div className="xl:col-span-3 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 w-[18px] h-[18px] text-violet-500" />
                    Network Performance
                    {d.isFallback && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">DEMO</span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Real-time Throughput &amp; Signal Stability</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                    <span className="text-slate-500">Speed (Mbps)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span className="text-slate-400">Latency (ms)</span>
                  </div>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="speedGradL" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}  />
                      </linearGradient>
                      <linearGradient id="latencyGradL" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}  />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="time" stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.75rem',
                        color: '#1e293b',
                        fontSize: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      }}
                      itemStyle={{ padding: '2px 0' }}
                    />
                    <Area type="monotone" dataKey="speed"   name="Speed (Mbps)"  stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#speedGradL)"   />
                    <Area type="monotone" dataKey="latency" name="Latency (ms)"  stroke="#06b6d4" strokeWidth={2}   fillOpacity={1} fill="url(#latencyGradL)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Recommendation — spans 2 */}
            <div className="xl:col-span-2">
              {ai ? (
                <div className="h-full bg-white rounded-2xl p-5 border border-slate-200 shadow-card flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-violet-50 border border-violet-100">
                        <Sparkles className="w-4 h-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">AI Recommendation</p>
                        <h3 className="text-sm font-bold text-slate-800">Smart Analysis &amp; Suggestions</h3>
                      </div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                      ai.statusColor === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                      ai.statusColor === 'amber'   ? 'bg-amber-50  border-amber-200  text-amber-700'  :
                      'bg-rose-50 border-rose-200 text-rose-600'
                    }`}>
                      {ai.statusTag}
                    </span>
                  </div>

                  {/* Issue box */}
                  <div className={`rounded-xl p-3.5 border ${
                    ai.statusColor === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
                    ai.statusColor === 'amber'   ? 'bg-amber-50  border-amber-100'   :
                    'bg-rose-50 border-rose-100'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {ai.statusColor === 'emerald'
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                      <span className={`text-xs font-semibold ${
                        ai.statusColor === 'emerald' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>{ai.issue}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{ai.issueDetail}</p>
                    {ai.nearbyCount != null && (
                      <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <Info className="w-3 h-3" /> {ai.nearbyCount} nearby networks analysed
                      </p>
                    )}
                  </div>

                  {/* Channel comparison */}
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Current</p>
                      <p className="text-base font-bold text-slate-700 mt-0.5">Ch {ai.currentChannel}</p>
                      <span className={`text-[10px] font-semibold ${congestionColor(ai.congestion)}`}>
                        {ai.congestion}% congested
                      </span>
                    </div>
                    <div className="flex justify-center">
                      <div className="p-1.5 rounded-full bg-violet-50 border border-violet-100">
                        <ArrowRight className="w-4 h-4 text-violet-500" />
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-violet-50 border border-violet-200 text-center">
                      <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider">Recommended</p>
                      <p className="text-base font-bold text-violet-700 mt-0.5">Ch {ai.recommendedChannel}</p>
                      <span className="text-[10px] text-emerald-600 font-semibold">Optimal</span>
                    </div>
                  </div>

                  {/* Scored channels */}
                  {ai.scoredChannels && ai.scoredChannels.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Interference Scores (lower = better)
                      </p>
                      {ai.scoredChannels.slice(0, 4).map((sc) => (
                        <div key={sc.channel} className="flex items-center gap-2 text-xs">
                          <span className={`w-10 font-mono font-semibold shrink-0 ${
                            sc.channel === ai.recommendedChannel ? 'text-violet-600' :
                            sc.channel === ai.currentChannel    ? 'text-slate-500'   : 'text-slate-400'
                          }`}>Ch {sc.channel}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                sc.channel === ai.recommendedChannel ? 'bg-violet-400' :
                                sc.channel === ai.currentChannel    ? 'bg-rose-400'    : 'bg-slate-300'
                              }`}
                              style={{ width: `${Math.min(100, sc.score)}%` }}
                            />
                          </div>
                          <span className="w-7 text-right text-slate-400 font-mono shrink-0 text-[11px]">{sc.score}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expected result */}
                  <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <span className="font-medium text-slate-400">Expected: </span>
                    <span className="font-semibold text-slate-700">{ai.expectedResult}</span>
                  </div>

                  {/* Apply button */}
                  <button
                    onClick={() => setShowRecommendationApplied(true)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                  >
                    Apply Recommendation
                  </button>

                  {showRecommendationApplied && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        <span className="font-semibold">Router configuration not connected.</span>
                        {' '}Please log in to your router admin panel and change the channel to{' '}
                        <span className="font-bold text-amber-800">Channel {ai.recommendedChannel}</span>.
                        This app performs read-only monitoring only.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full bg-white rounded-2xl p-6 border border-slate-200 shadow-card flex flex-col items-center justify-center gap-3 text-center min-h-[260px]">
                  <div className="p-3 bg-violet-50 rounded-2xl">
                    <Sparkles className="w-6 h-6 text-violet-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">Run AI Analysis to generate recommendations</p>
                  <button
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors"
                  >
                    Run Analysis
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              BOTTOM ROW: Channel Analysis + Connected Devices
          ═══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Channel Analysis */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-violet-50 border border-violet-100">
                    <Radio className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Channel Analysis</h3>
                    <p className="text-xs text-slate-400">Wi-Fi Channel Utilization</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg font-mono">
                  {d.band || '2.4 / 5 GHz'}
                </span>
              </div>

              <div className="space-y-4">
                {/* Active channel row */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Active Channel</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">
                      {d.currentChannel ? `Channel ${d.currentChannel}` : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium">Band</p>
                    <p className="text-sm font-bold text-violet-600 mt-0.5">{d.band || '—'}</p>
                  </div>
                </div>

                {/* Congestion bar */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-600 font-semibold">Channel Congestion</span>
                    <span className={`font-bold text-sm ${congestionColor(ai?.congestion ?? 0)}`}>
                      {ai?.congestion != null ? `${ai.congestion}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${congestionBarColor(ai?.congestion ?? 0)}`}
                      style={{ width: `${ai?.congestion ?? 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                    <span>Clear</span>
                    <span>Moderate</span>
                    <span>Congested</span>
                  </div>
                </div>

                {/* Channel grid */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
                    <span>{d.band === '5 GHz' ? '5 GHz Channels' : '2.4 GHz Non-overlapping'}</span>
                    <span className="text-[11px] text-slate-400">{d.band === '5 GHz' ? '36/40/44/48' : '1 / 6 / 11'}</span>
                  </div>
                  <div className={`grid gap-2 ${d.band === '5 GHz' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    {(d.band === '5 GHz' ? [36, 40, 44, 48] : [1, 6, 11]).map((ch) => {
                      const isActive = d.currentChannel === ch;
                      const isTarget = ai?.recommendedChannel === ch;
                      const cnt = d.nearbyNetworks?.filter((n) => n.channel === ch).length ?? 0;
                      return (
                        <div key={ch} className={`p-2.5 rounded-xl border text-center transition-all ${
                          isActive  ? 'border-violet-300 bg-violet-50 shadow-sm'  :
                          isTarget  ? 'border-emerald-200 bg-emerald-50'          :
                          'border-slate-200 bg-slate-50'
                        }`}>
                          <p className={`text-xs font-bold ${
                            isActive ? 'text-violet-700' : isTarget ? 'text-emerald-700' : 'text-slate-500'
                          }`}>Ch {ch}</p>
                          <p className={`text-[10px] mt-0.5 font-medium ${
                            isActive ? 'text-violet-500' : isTarget ? 'text-emerald-500' : 'text-slate-400'
                          }`}>
                            {isActive ? 'Active' : isTarget ? 'AI Target' : 'Free'}
                          </p>
                          {cnt > 0 && <p className="text-[9px] text-slate-400 mt-0.5">{cnt} net</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Nearby networks collapsible */}
                {d.nearbyNetworks && d.nearbyNetworks.length > 0 && (
                  <div>
                    <button
                      onClick={() => setNearbyExpanded((v) => !v)}
                      className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 transition-colors pt-1 font-medium"
                    >
                      <span>Nearby Networks ({q ? filteredNearby.length : d.nearbyNetworks.length})</span>
                      {nearbyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {nearbyExpanded && (
                      <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto">
                        {(q ? filteredNearby : d.nearbyNetworks).map((n, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                            <span className="text-slate-700 font-medium truncate max-w-[110px]">{n.ssid || 'Hidden'}</span>
                            <div className="flex items-center gap-2 text-slate-400 shrink-0">
                              <span className="text-slate-500">Ch{n.channel ?? '?'}</span>
                              <span className={n.signalDbm >= -60 ? 'text-emerald-600' : n.signalDbm >= -70 ? 'text-amber-600' : 'text-rose-500'}>
                                {n.signalDbm != null ? `${n.signalDbm}` : '?'}dBm
                              </span>
                            </div>
                          </div>
                        ))}
                        {q && filteredNearby.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-2">No networks match "{searchQuery}"</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Connected Devices */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-card flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                    <Layers className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Connected Devices</h3>
                    <p className="text-xs text-slate-400">
                      {(q ? filteredDevices : d.devices)?.length ?? 0} device{((q ? filteredDevices : d.devices)?.length ?? 0) !== 1 ? 's' : ''} detected
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full">
                  {(q ? filteredDevices : d.devices)?.length ?? 0} found
                </span>
              </div>

              {d.devices && d.devices.length > 0 ? (
                <>
                  <div className="space-y-2.5 flex-1">
                    {(q ? filteredDevices : d.devices).map((device, idx) => {
                      const type = guessDeviceType(device.ip, device.mac);
                      const isGateway = device.ip?.endsWith('.1') || device.ip?.endsWith('.254');
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-violet-200 hover:bg-violet-50/30 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <DeviceIcon type={type} />
                            <div>
                              <p className="text-sm font-semibold text-slate-700">
                                {isGateway ? 'Gateway / Router' : `Device ${idx + 1}`}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono flex-wrap mt-0.5">
                                <span>{device.ip}</span>
                                {device.mac && (
                                  <span className="text-violet-500">{device.mac}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              device.type === 'static'
                                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {device.type === 'static' ? 'Static' : 'Active'}
                            </span>
                            <p className="text-[10px] text-slate-400 font-mono mt-1">ARP</p>
                          </div>
                        </div>
                      );
                    })}
                    {q && filteredDevices.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-3">No devices match "{searchQuery}"</p>
                    )}
                  </div>

                  {!d.isFallback && (
                    <p className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Info className="w-3 h-3" />
                      Discovered via local ARP table. Only recently active devices shown.
                    </p>
                  )}
                  {d.isFallback && (
                    <p className="mt-4 text-[11px] text-amber-600 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" />
                      Demo data — start backend for real ARP discovery.
                    </p>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center gap-2">
                  <div className="p-3 bg-slate-100 rounded-2xl">
                    <Layers className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">Device discovery unavailable</p>
                  <p className="text-xs text-slate-400">
                    {backendOnline === false ? 'Start the backend to enable ARP scanning' : 'No devices found on local network'}
                  </p>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Discovery method</span>
                <span className="font-mono font-semibold text-violet-500">{d.isFallback ? 'Demo' : 'arp -a'}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="pt-2 pb-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 border-t border-slate-200">
            <p>© 2026 AI-Based Wi-Fi Network Optimization · B.Tech MDM Project</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span>AI Channel Optimizer v1.0 · {d.isFallback ? 'Demo Mode' : 'Live Mode'}</span>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}
