import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wifi,
  Activity,
  Zap,
  Gauge,
  Cpu,
  Radio,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Laptop,
  Smartphone,
  Tv,
  Tablet,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Clock,
  Search,
  X,
  FileText,
  Printer,
  WifiOff,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  getFullMetrics,
  checkBackend,
  FALLBACK_METRICS,
} from './services/networkApi.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const CHART_MAX_POINTS = 20; // rolling window for performance chart
const POLL_INTERVAL_MS = 30000; // background poll every 30 s

// Analysis step messages shown in the scanning banner
const ANALYSIS_STEPS = [
  'Querying Wi-Fi interface via netsh...',
  'Sampling RF spectrum — 2.4 GHz / 5 GHz...',
  'Measuring round-trip latency...',
  'Scanning nearby access points...',
  'Running AI channel interference analysis...',
  'Computing network health score...',
  'Generating optimization recommendation...',
];

// ─────────────────────────────────────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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

function guessDeviceType(ip, mac) {
  if (!mac) return 'unknown';
  const prefix = mac.slice(0, 8).toUpperCase();
  // Very lightweight OUI heuristic — good enough for a demo
  const phoneOUIs = ['AC:37:43', 'A4:C3:F0', '98:01:A7', 'F8:E0:79', 'BC:9F:EF'];
  const tvOUIs = ['8C:57:9B', '00:24:32', 'FC:A1:83', 'B4:7C:9C'];
  if (phoneOUIs.some((o) => mac.startsWith(o))) return 'phone';
  if (tvOUIs.some((o) => mac.startsWith(o))) return 'tv';
  // .1 is almost always gateway/router
  if (ip.endsWith('.1') || ip.endsWith('.254')) return 'router';
  return 'laptop';
}

function DeviceIcon({ type, className = 'w-4 h-4' }) {
  switch (type) {
    case 'phone':   return <Smartphone className={`${className} text-emerald-400`} />;
    case 'tv':      return <Tv className={`${className} text-purple-400`} />;
    case 'tablet':  return <Tablet className={`${className} text-blue-400`} />;
    case 'router':  return <Wifi className={`${className} text-amber-400`} />;
    default:        return <Laptop className={`${className} text-cyan-400`} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ReportModal({ data, onClose }) {
  const ai = data.aiRecommendation;
  const lat = data.latency;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        id="report-modal"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d1322] border border-slate-700 rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#0d1322] border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Network Analysis Report</h2>
            {data.isFallback && (
              <span className="px-2 py-0.5 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 rounded-full uppercase tracking-wider">
                Demo Data
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 text-sm">
          {/* Timestamp */}
          <p className="text-xs text-slate-500">
            Generated: {data.timestamp ? fmtTime(data.timestamp) : 'N/A'} &nbsp;|&nbsp;
            {data.ssid ? `SSID: ${data.ssid}` : 'No Wi-Fi connection'}
          </p>

          {/* Status section */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
              Connection Status
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['SSID', data.ssid || '—'],
                ['Band', data.band || '—'],
                ['Radio Type', data.radioType || '—'],
                ['Channel', data.currentChannel ? `Ch ${data.currentChannel}` : '—'],
                ['Authentication', data.authentication || '—'],
                ['Status', data.connected ? 'Connected' : 'Disconnected'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-slate-400">{k}</span>
                  <span className="text-slate-100 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Metrics */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
              Network Metrics
            </h3>
            <div className="grid grid-cols-2 gap-3">
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
                <div key={k} className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-slate-400">{k}</span>
                  <span className="text-slate-100 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Channel Analysis */}
          {ai && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
                Channel Analysis &amp; AI Recommendation
              </h3>
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                <p className="font-semibold text-white">{ai.issue}</p>
                <p className="text-slate-300 text-xs leading-relaxed">{ai.issueDetail}</p>
                <div className="flex items-center gap-4 pt-2 text-xs">
                  <span className="text-slate-400">
                    Current: <span className="text-white font-semibold">Ch {ai.currentChannel}</span>
                    {' '}({ai.congestion}% congestion)
                  </span>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-400">
                    Recommended: <span className="text-cyan-300 font-semibold">Ch {ai.recommendedChannel}</span>
                  </span>
                </div>
                <p className="text-xs text-emerald-400 pt-1">
                  Expected: {ai.expectedResult}
                </p>
              </div>
            </section>
          )}

          {/* Nearby Networks */}
          {data.nearbyNetworks && data.nearbyNetworks.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
                Detected Nearby Networks ({data.nearbyNetworks.length})
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {data.nearbyNetworks.map((n, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 bg-slate-900/60 rounded-lg border border-slate-800 text-xs"
                  >
                    <span className="text-slate-200 font-medium truncate max-w-[140px]">{n.ssid || 'Hidden'}</span>
                    <div className="flex items-center gap-3 text-slate-400 shrink-0">
                      <span>Ch {n.channel ?? '?'}</span>
                      <span>{n.band || '—'}</span>
                      <span className={n.signalDbm >= -60 ? 'text-emerald-400' : n.signalDbm >= -70 ? 'text-amber-400' : 'text-rose-400'}>
                        {n.signalDbm != null ? `${n.signalDbm} dBm` : '—'}
                      </span>
                      <span className="text-slate-500">{n.authentication || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Disclaimer */}
          <p className="text-[11px] text-slate-600 border-t border-slate-800 pt-4">
            AI Wi-Fi Optimizer — B.Tech MDM Project. All data collected from local OS APIs (read-only).
            No router configuration is performed. Channel recommendations require manual router settings change.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // ── State ──
  const [metrics, setMetrics] = useState(null);           // current dashboard data
  const [chartHistory, setChartHistory] = useState([]);   // rolling performance chart
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [lastUpdated, setLastUpdated] = useState('Never');
  const [backendOnline, setBackendOnline] = useState(null); // null=checking, true, false
  const [showReport, setShowReport] = useState(false);
  const [showRecommendationApplied, setShowRecommendationApplied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [nearbyExpanded, setNearbyExpanded] = useState(false);

  const stepTimers = useRef([]);
  const pollTimer = useRef(null);

  // ── Derived ──
  const d = metrics || FALLBACK_METRICS;
  const ai = d.aiRecommendation;
  const lat = d.latency;

  // ── Backend health check on mount ──
  useEffect(() => {
    checkBackend().then((res) => {
      setBackendOnline(res.ok);
      if (res.ok) {
        // Auto-run first analysis
        runAnalysis();
      } else {
        // Show fallback immediately
        setMetrics(FALLBACK_METRICS);
        setLastUpdated(fmtTime(new Date()));
        seedChartHistory(FALLBACK_METRICS);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Background polling ──
  useEffect(() => {
    if (backendOnline) {
      pollTimer.current = setInterval(() => {
        if (!isAnalyzing) silentRefresh();
      }, POLL_INTERVAL_MS);
    }
    return () => clearInterval(pollTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendOnline, isAnalyzing]);

  // ── Helpers ──
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
    const pt = {
      time: fmtTime(new Date()),
      speed: m.rxRate ?? 0,
      latency: m.latency?.avg ?? 0,
    };
    setChartHistory((prev) => {
      const next = [...prev, pt];
      return next.length > CHART_MAX_POINTS ? next.slice(next.length - CHART_MAX_POINTS) : next;
    });
  }

  /** Full analysis triggered by button */
  const runAnalysis = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setShowRecommendationApplied(false);

    // Clear any existing step timers
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];

    // Animate through steps
    ANALYSIS_STEPS.forEach((step, i) => {
      const t = setTimeout(() => setScanStep(step), i * 350);
      stepTimers.current.push(t);
    });

    try {
      const { ok, data, error } = await getFullMetrics();

      if (ok && data?.ok) {
        setMetrics(data);
        setBackendOnline(true);
        appendChartPoint(data);
        if (chartHistory.length === 0) seedChartHistory(data);
      } else {
        // Backend responded but netsh may have failed — still show what we have
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

  /** Silent background refresh — no loading animation */
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

  // ── Search filtering ──
  const q = searchQuery.trim().toLowerCase();

  const filteredNearby = d.nearbyNetworks?.filter((n) => {
    if (!q) return true;
    return (
      (n.ssid || '').toLowerCase().includes(q) ||
      String(n.channel || '').includes(q) ||
      (n.band || '').toLowerCase().includes(q) ||
      (n.authentication || '').toLowerCase().includes(q)
    );
  }) ?? [];

  const filteredDevices = d.devices?.filter((dev) => {
    if (!q) return true;
    return (
      (dev.ip || '').includes(q) ||
      (dev.mac || '').toLowerCase().includes(q) ||
      guessDeviceType(dev.ip, dev.mac).includes(q)
    );
  }) ?? [];

  // Channels match
  const channelMatch = q && /ch\s*(\d+)|channel\s*(\d+)/i.test(q);

  // ── Congestion colour helper ──
  function congestionColor(pct) {
    if (pct > 50) return 'text-rose-400';
    if (pct > 25) return 'text-amber-400';
    return 'text-emerald-400';
  }
  function congestionBarColor(pct) {
    if (pct > 50) return 'bg-rose-500';
    if (pct > 25) return 'bg-amber-400';
    return 'bg-emerald-400';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">

      {/* Report Modal */}
      {showReport && (
        <ReportModal data={d} onClose={() => setShowReport(false)} />
      )}

      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">

        {/* ═══════════════════════════════════════════════════════════
            HEADER
        ════════════════════════════════════════════════════════════ */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/80">
          {/* Logo + title */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
              {d.connected
                ? <Wifi className="w-6 h-6 text-cyan-400 animate-pulse" />
                : <WifiOff className="w-6 h-6 text-slate-500" />}
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#090d16] ${d.connected ? 'bg-cyan-400' : 'bg-slate-600'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  AI Wi-Fi Optimizer
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 border border-cyan-800/50 rounded-full">
                  MDM Project
                </span>
                {d.isFallback && (
                  <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-500/40 rounded-full">
                    Demo Data
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                Intelligent Network Analysis
                {d.ssid && !d.isFallback && (
                  <span className="ml-2 text-cyan-400 font-semibold">{d.ssid}</span>
                )}
                {d.band && (
                  <span className="ml-2 text-slate-500">· {d.band}</span>
                )}
              </p>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Search */}
            <div className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${searchFocused ? 'border-cyan-500/60 bg-slate-900' : 'border-slate-800 bg-slate-900/60'}`}>
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search networks, devices…"
                className="bg-transparent outline-none text-slate-200 placeholder:text-slate-600 w-36 sm:w-44"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Online status */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
              <span className="relative flex h-2.5 w-2.5">
                {d.connected
                  ? <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </>
                  : <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-600" />
                }
              </span>
              <span className="font-medium">{d.connected ? 'Online' : 'Offline'}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastUpdated}
              </span>
            </div>

            {/* View Report */}
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm tracking-wide border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">View Report</span>
            </button>

            {/* Run Analysis */}
            <button
              id="run-analysis-btn"
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className={`relative flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm tracking-wide transition-all duration-200 shadow-md ${
                isAnalyzing
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing…' : 'Run Analysis'}</span>
            </button>
          </div>
        </header>

        {/* Backend offline notice */}
        {backendOnline === false && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Backend not reachable.</span>
              {' '}Start the API server with{' '}
              <code className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-amber-200">
                npm run dev:server
              </code>
              {' '}then{' '}
              <code className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-amber-200">
                npm run dev
              </code>
              {' '}in another terminal, or use{' '}
              <code className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-amber-200">
                npm run dev:all
              </code>
              {' '}to start both together. Showing demo data.
            </div>
          </div>
        )}

        {/* Scanning banner */}
        {isAnalyzing && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm">
            <Cpu className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
            <div className="flex-1 font-mono tracking-tight truncate">
              {scanStep || 'Initialising diagnostic engine…'}
            </div>
            <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono shrink-0">
              AI SCAN ACTIVE
            </span>
          </div>
        )}

        {/* Search results hint */}
        {q && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <Search className="w-3.5 h-3.5" />
            <span>
              Showing results for <span className="text-cyan-400 font-medium">"{searchQuery}"</span>
              {' '}— {filteredNearby.length} network{filteredNearby.length !== 1 ? 's' : ''},{' '}
              {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TOP METRIC CARDS
        ════════════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

          {/* Signal Strength */}
          <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-800/80 hover:border-slate-700 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Signal Strength</span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                <Wifi className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {d.signalDbm ?? '—'}
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-400">dBm</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className={`font-medium flex items-center gap-1 ${d.signalDbm >= -60 ? 'text-emerald-400' : d.signalDbm >= -70 ? 'text-amber-400' : 'text-rose-400'}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                {signalLabel(d.signalDbm)} RSSI
              </span>
              <div className="flex items-end gap-0.5 h-3.5">
                {[
                  d.signalDbm >= -75,
                  d.signalDbm >= -65,
                  d.signalDbm >= -55,
                  d.signalDbm >= -48,
                ].map((on, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full ${on ? 'bg-cyan-400' : 'bg-slate-700'}`}
                    style={{ height: `${(i + 1) * 3.5 + 1}px` }}
                  />
                ))}
              </div>
            </div>
            {!d.isFallback && d.signalPercent != null && (
              <div className="mt-2 text-[11px] text-slate-500">{d.signalPercent}% (Windows scale)</div>
            )}
          </div>

          {/* Speed */}
          <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-800/80 hover:border-slate-700 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Link Speed</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {d.rxRate ?? '—'}
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-400">Mbps</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Rx / {d.txRate != null ? `${d.txRate}` : '—'} Tx</span>
              <span className="text-cyan-400 font-medium">{d.radioType || '802.11'}</span>
            </div>
          </div>

          {/* Latency */}
          <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-800/80 hover:border-slate-700 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Latency</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {lat?.avg ?? '—'}
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-400">ms</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className={lat?.avg != null && lat.avg < 30 ? 'text-emerald-400' : 'text-amber-400'}>
                {lat?.avg != null ? (lat.avg < 30 ? 'Ultra-low' : lat.avg < 80 ? 'Good' : 'High') : '—'}
                {lat?.reachable === false && ' (offline)'}
              </span>
              <span className="text-slate-500 font-mono">
                {lat?.packetLoss != null ? `${lat.packetLoss}% loss` : '—'}
              </span>
            </div>
          </div>

          {/* Network Health */}
          <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-800/80 hover:border-slate-700 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Network Health</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <Gauge className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {d.healthScore ?? '—'}%
              </span>
            </div>
            <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  (d.healthScore ?? 0) >= 80
                    ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                    : 'bg-gradient-to-r from-amber-400 to-rose-400'
                }`}
                style={{ width: `${d.healthScore ?? 0}%` }}
              />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            MAIN SECTIONS
        ════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COL (span-2): Chart + AI Recommendation */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* ── Network Performance Chart ── */}
            <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Network Performance
                    {d.isFallback && (
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/50 border border-amber-500/30 px-1.5 py-0.5 rounded-full">DEMO</span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {d.isFallback
                      ? 'Demo data — start backend for real measurements'
                      : 'Live link speed (Mbps) & round-trip latency (ms)'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span className="text-slate-300">Speed (Mbps)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    <span className="text-slate-400">Latency (ms)</span>
                  </div>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0d1322',
                        borderColor: '#1e293b',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,.5)',
                      }}
                      itemStyle={{ padding: '2px 0' }}
                    />
                    <Area type="monotone" dataKey="speed" name="Speed (Mbps)" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#speedGrad)" />
                    <Area type="monotone" dataKey="latency" name="Latency (ms)" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#latencyGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── AI Recommendation ── */}
            {ai ? (
              <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 border border-cyan-500/40 bg-gradient-to-br from-[#0c1427] via-[#0e1830] to-[#12142e] shadow-xl shadow-cyan-950/20">
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                        Intelligent Diagnostic Engine
                      </span>
                      <h2 className="text-lg font-bold text-white">AI Optimization Recommendation</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {d.isFallback && (
                      <span className="self-start px-2.5 py-1 text-xs font-semibold rounded-full border bg-amber-950/60 border-amber-500/40 text-amber-400">Demo Data</span>
                    )}
                    <span
                      className={`self-start px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        ai.statusColor === 'emerald'
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                          : ai.statusColor === 'amber'
                          ? 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                          : 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                      }`}
                    >
                      {ai.statusTag}
                    </span>
                  </div>
                </div>

                {/* Issue box */}
                <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 mb-5">
                  <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                    {ai.statusColor === 'emerald'
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    <span className={ai.statusColor === 'emerald' ? 'text-emerald-300' : 'text-amber-300'}>
                      {ai.issue}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{ai.issueDetail}</p>
                  {/* Nearby network density */}
                  {ai.nearbyCount != null && (
                    <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      {ai.nearbyCount} nearby networks analysed
                    </p>
                  )}
                </div>

                {/* Channel comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center mb-5">
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Current Channel</span>
                    <div className="text-xl font-bold text-slate-200 mt-0.5">
                      Channel {ai.currentChannel}
                    </div>
                    <span className={`text-[11px] font-medium mt-1 inline-block ${congestionColor(ai.congestion)}`}>
                      {ai.congestion}% Congested
                    </span>
                  </div>
                  <div className="hidden sm:flex justify-center text-cyan-400">
                    <div className="p-2 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-center shadow-inner">
                    <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Recommended</span>
                    <div className="text-xl font-bold text-cyan-300 mt-0.5">
                      Channel {ai.recommendedChannel}
                    </div>
                    <span className="text-[11px] text-emerald-400 font-medium mt-1 inline-block">Optimal Spectrum</span>
                  </div>
                </div>

                {/* Scored channels breakdown */}
                {ai.scoredChannels && ai.scoredChannels.length > 0 && (
                  <div className="mb-5 p-3.5 bg-slate-900/50 rounded-xl border border-slate-800">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      AI Interference Scores (lower = better)
                    </p>
                    <div className="space-y-1.5">
                      {ai.scoredChannels.map((sc) => (
                        <div key={sc.channel} className="flex items-center gap-2 text-xs">
                          <span className={`w-14 font-mono font-semibold shrink-0 ${sc.channel === ai.recommendedChannel ? 'text-cyan-400' : sc.channel === ai.currentChannel ? 'text-slate-300' : 'text-slate-500'}`}>
                            Ch {sc.channel}
                          </span>
                          <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${sc.channel === ai.recommendedChannel ? 'bg-cyan-400' : sc.channel === ai.currentChannel ? 'bg-rose-400' : 'bg-slate-600'}`}
                              style={{ width: `${Math.min(100, sc.score)}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-slate-400 font-mono shrink-0">{sc.score}</span>
                          <span className="text-slate-500 truncate max-w-[160px] hidden sm:block">{sc.reasons[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expected result + apply button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <div className="text-xs text-slate-300 text-center sm:text-left">
                    <span className="text-slate-400 font-medium">Expected Result: </span>
                    <span className="text-cyan-300 font-semibold">{ai.expectedResult}</span>
                  </div>
                  <button
                    onClick={() => setShowRecommendationApplied(true)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Apply Recommendation
                  </button>
                </div>

                {showRecommendationApplied && (
                  <div className="mt-3 p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-semibold">Router configuration is not connected.</span>
                      {' '}To apply this recommendation, log in to your router admin panel and change the Wi-Fi channel to{' '}
                      <span className="font-bold text-white">Channel {ai.recommendedChannel}</span>.
                      This app performs read-only monitoring and cannot modify router settings.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl p-6 border border-slate-800/80 bg-[#101626]/90 text-center text-sm text-slate-400">
                <Sparkles className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                Run an analysis to generate AI recommendations.
              </div>
            )}
          </div>

          {/* RIGHT COL: Channel Analysis + Connected Devices */}
          <div className="flex flex-col gap-6">

            {/* ── Channel Analysis ── */}
            <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-800/80">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-cyan-400" />
                  Channel Analysis
                </h2>
                <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 bg-slate-800 rounded">
                  {d.band || '2.4 / 5 GHz'}
                </span>
              </div>

              <div className="space-y-4">
                {/* Active channel */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Active Channel</span>
                    <span className="text-xl font-bold text-white">
                      {d.currentChannel ? `Channel ${d.currentChannel}` : '—'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Band</span>
                    <span className="text-xs font-mono text-cyan-400 font-semibold">
                      {d.band || '—'}
                    </span>
                  </div>
                </div>

                {/* Congestion bar */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-300 font-medium">Channel Congestion</span>
                    <span className={`font-bold ${congestionColor(ai?.congestion ?? 0)}`}>
                      {ai?.congestion != null ? `${ai.congestion}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${congestionBarColor(ai?.congestion ?? 0)}`}
                      style={{ width: `${ai?.congestion ?? 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                    <span>Low (0%)</span>
                    <span>Moderate</span>
                    <span>Severe (100%)</span>
                  </div>
                </div>

                {/* Non-overlapping channel grid */}
                <div className="pt-1">
                  <div className="text-xs text-slate-400 mb-2 font-medium flex items-center justify-between">
                    <span>
                      {d.band === '5 GHz' ? '5 GHz Channels' : '2.4 GHz Non-overlapping'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {d.band === '5 GHz' ? 'Ch 36/40/44/48' : 'Ch 1/6/11'}
                    </span>
                  </div>
                  <div className={`grid gap-2 ${d.band === '5 GHz' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    {(d.band === '5 GHz' ? [36, 40, 44, 48] : [1, 6, 11]).map((ch) => {
                      const isActive = d.currentChannel === ch;
                      const isTarget = ai?.recommendedChannel === ch;
                      const countOnCh = d.nearbyNetworks?.filter((n) => n.channel === ch).length ?? 0;
                      return (
                        <div
                          key={ch}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            isActive
                              ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                              : isTarget
                              ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-400'
                              : 'border-slate-800 bg-slate-900/40 text-slate-400'
                          }`}
                        >
                          <span className="text-xs font-bold block">Ch {ch}</span>
                          <span className="text-[10px] block font-mono mt-0.5 opacity-80">
                            {isActive ? 'Active' : isTarget ? 'AI Target' : 'Free'}
                          </span>
                          {countOnCh > 0 && (
                            <span className="text-[9px] text-slate-500">{countOnCh} net</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Nearby networks (collapsible) */}
                {d.nearbyNetworks && d.nearbyNetworks.length > 0 && (
                  <div>
                    <button
                      onClick={() => setNearbyExpanded((v) => !v)}
                      className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors pt-1"
                    >
                      <span className="font-medium">
                        Nearby Networks ({q ? filteredNearby.length : d.nearbyNetworks.length})
                      </span>
                      {nearbyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {nearbyExpanded && (
                      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                        {(q ? filteredNearby : d.nearbyNetworks).map((n, i) => (
                          <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900/60 rounded-lg border border-slate-800/80 text-[11px]">
                            <span className="text-slate-200 font-medium truncate max-w-[100px]">{n.ssid || 'Hidden'}</span>
                            <div className="flex items-center gap-2 text-slate-500 shrink-0">
                              <span>Ch{n.channel ?? '?'}</span>
                              <span className={n.signalDbm >= -60 ? 'text-emerald-400' : n.signalDbm >= -70 ? 'text-amber-400' : 'text-rose-400'}>
                                {n.signalDbm != null ? `${n.signalDbm}` : '?'}dBm
                              </span>
                            </div>
                          </div>
                        ))}
                        {q && filteredNearby.length === 0 && (
                          <p className="text-xs text-slate-600 text-center py-2">No networks match "{searchQuery}"</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Connected Devices ── */}
            <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-800/80 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base sm:text-lg font-bold text-white">Connected Devices</h2>
                </div>
                <span className="px-2 py-0.5 text-xs font-semibold text-cyan-400 bg-cyan-950/80 border border-cyan-800/50 rounded-full">
                  {(q ? filteredDevices : d.devices)?.length ?? 0} found
                </span>
              </div>

              {d.devices && d.devices.length > 0 ? (
                <>
                  <div className="space-y-2.5">
                    {(q ? filteredDevices : d.devices).map((device, idx) => {
                      const type = guessDeviceType(device.ip, device.mac);
                      const isGateway = device.ip?.endsWith('.1') || device.ip?.endsWith('.254');
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                              <DeviceIcon type={type} />
                            </div>
                            <div>
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-200">
                                {isGateway ? 'Gateway / Router' : `Device ${idx + 1}`}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono flex-wrap">
                                <span>{device.ip}</span>
                                {device.mac && (
                                  <>
                                    <span>•</span>
                                    <span className="text-cyan-400">{device.mac}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="text-[10px] text-emerald-400 font-medium block">
                              {device.type === 'static' ? 'Static' : 'Active'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">ARP</span>
                          </div>
                        </div>
                      );
                    })}
                    {q && filteredDevices.length === 0 && (
                      <p className="text-xs text-slate-600 text-center py-3">No devices match "{searchQuery}"</p>
                    )}
                  </div>
                  {!d.isFallback && (
                    <p className="mt-3 text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Info className="w-3 h-3" />
                      Discovered via local ARP table. Only devices with recent network activity are shown.
                    </p>
                  )}
                  {d.isFallback && (
                    <p className="mt-3 text-[11px] text-amber-600 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" />
                      Demo device data — start backend for real ARP discovery.
                    </p>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Layers className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Device discovery unavailable</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {backendOnline === false
                      ? 'Start the backend to enable ARP scanning'
                      : 'No devices found on the local network'}
                  </p>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Discovery method</span>
                <span className="text-cyan-400 font-medium font-mono">
                  {d.isFallback ? 'Demo' : 'arp -a'}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════════════════ */}
        <footer className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© 2026 AI-Based Wi-Fi Network Optimization · B.Tech MDM Project</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              AI Channel Optimizer v1.0 · {d.isFallback ? 'Demo Mode' : 'Live Mode'}
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
}
