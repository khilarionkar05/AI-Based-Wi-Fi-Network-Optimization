import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wifi, Cpu, Search, X, FileText, Printer, WifiOff, AlertCircle,
  Clock, Bell, ChevronRight, ChevronDown, ArrowRight,
  LayoutDashboard, ScanLine, Settings, BrainCircuit, Radio, Layers,
  CheckCircle2, AlertTriangle, Info,
} from 'lucide-react';
import { getFullMetrics, checkBackend, FALLBACK_METRICS } from './services/networkApi.js';

// ── Pages ──────────────────────────────────────────────────────────────────
import DashboardPage       from './pages/DashboardPage.jsx';
import NetworkScanPage     from './pages/NetworkScanPage.jsx';
import ChannelAnalysisPage from './pages/ChannelAnalysisPage.jsx';
import ConnectedDevicesPage from './pages/ConnectedDevicesPage.jsx';
import AIInsightsPage      from './pages/AIInsightsPage.jsx';
import SettingsPage        from './pages/SettingsPage.jsx';

// ── Constants ──────────────────────────────────────────────────────────────
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
  { id: 'dashboard', label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'scan',      label: 'Network Scan',      icon: ScanLine        },
  { id: 'channel',   label: 'Channel Analysis',  icon: Radio           },
  { id: 'devices',   label: 'Connected Devices', icon: Layers          },
  { id: 'ai',        label: 'AI Insights',       icon: BrainCircuit    },
  { id: 'settings',  label: 'Settings',          icon: Settings        },
];

// ── Helpers ────────────────────────────────────────────────────────────────
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

// ── Report Modal ───────────────────────────────────────────────────────────
function ReportModal({ data, onClose }) {
  const ai  = data.aiRecommendation;
  const lat = data.latency;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-violet-100 rounded-lg"><FileText className="w-4 h-4 text-violet-600" /></div>
            <h2 className="text-base font-bold text-slate-800">Network Analysis Report</h2>
            {data.isFallback && <span className="px-2 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full uppercase">Demo Data</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-5 text-sm">
          <p className="text-xs text-slate-400">Generated: {data.timestamp ? fmtTime(data.timestamp) : 'N/A'} | {data.ssid ? `SSID: ${data.ssid}` : 'No connection'}</p>
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-3">Connection Status</h3>
            <div className="grid grid-cols-2 gap-2">
              {[['SSID', data.ssid || '—'], ['Band', data.band || '—'], ['Radio Type', data.radioType || '—'], ['Channel', data.currentChannel ? `Ch ${data.currentChannel}` : '—'], ['Authentication', data.authentication || '—'], ['Status', data.connected ? 'Connected' : 'Disconnected']].map(([k, v]) => (
                <div key={k} className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100"><span className="text-slate-500">{k}</span><span className="text-slate-800 font-semibold">{v}</span></div>
              ))}
            </div>
          </section>
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-3">Network Metrics</h3>
            <div className="grid grid-cols-2 gap-2">
              {[['Signal Strength', data.signalDbm != null ? `${data.signalDbm} dBm (${signalLabel(data.signalDbm)})` : '—'], ['Link Speed (Rx)', data.rxRate != null ? `${data.rxRate} Mbps` : '—'], ['Link Speed (Tx)', data.txRate != null ? `${data.txRate} Mbps` : '—'], ['Latency (avg)', lat?.avg != null ? `${lat.avg} ms` : '—'], ['Latency (min/max)', lat?.min != null ? `${lat.min} / ${lat.max} ms` : '—'], ['Packet Loss', lat?.packetLoss != null ? `${lat.packetLoss}%` : '—'], ['Network Health', data.healthScore != null ? `${data.healthScore}%` : '—'], ['Nearby Networks', data.nearbyCount ?? '—']].map(([k, v]) => (
                <div key={k} className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100"><span className="text-slate-500">{k}</span><span className="text-slate-800 font-semibold">{v}</span></div>
              ))}
            </div>
          </section>
          {ai && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-3">AI Recommendation</h3>
              <div className="p-4 bg-violet-50 rounded-xl border border-violet-100 space-y-2">
                <p className="font-semibold text-slate-800">{ai.issue}</p>
                <p className="text-slate-600 text-xs leading-relaxed">{ai.issueDetail}</p>
                <div className="flex items-center gap-4 pt-2 text-xs">
                  <span className="text-slate-500">Current: <span className="text-slate-800 font-semibold">Ch {ai.currentChannel}</span> ({ai.congestion}% congestion)</span>
                  <ArrowRight className="w-4 h-4 text-violet-500" />
                  <span className="text-slate-500">Recommended: <span className="text-violet-700 font-semibold">Ch {ai.recommendedChannel}</span></span>
                </div>
                <p className="text-xs text-emerald-600 pt-1 font-medium">Expected: {ai.expectedResult}</p>
              </div>
            </section>
          )}
          {data.nearbyNetworks?.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-3">Detected Nearby Networks ({data.nearbyNetworks.length})</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {data.nearbyNetworks.map((n, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <span className="text-slate-700 font-medium truncate max-w-[140px]">{n.ssid || 'Hidden'}</span>
                    <div className="flex items-center gap-3 text-slate-400 shrink-0">
                      <span>Ch {n.channel ?? '?'}</span><span>{n.band || '—'}</span>
                      <span className={n.signalDbm >= -60 ? 'text-emerald-600' : n.signalDbm >= -70 ? 'text-amber-600' : 'text-rose-500'}>{n.signalDbm != null ? `${n.signalDbm} dBm` : '—'}</span>
                      <span>{n.authentication || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-4">
            AI Wi-Fi Optimizer — B.Tech MDM Project. All data collected from local OS APIs (read-only). No router configuration is performed.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ activeNav, setActiveNav, sidebarOpen, setSidebarOpen }) {
  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={`fixed top-0 left-0 z-30 h-screen w-60 flex flex-col shrink-0 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: 'linear-gradient(160deg, #130d35 0%, #1a1144 40%, #221558 100%)', boxShadow: '4px 0 24px rgba(26,17,68,0.25)' }}
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${active ? 'nav-active text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.07]'}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-white/45 group-hover:text-white/70'}`} />
                <span>{label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/60" />}
              </button>
            );
          })}
        </nav>
        {/* Footer */}
        <div className="px-5 pt-4 pb-5 border-t border-white/10">
          <svg viewBox="0 0 180 28" className="w-full mb-3 opacity-25" fill="none">
            <path d="M0 14 Q22 4 44 14 Q66 24 88 14 Q110 4 132 14 Q154 24 180 14" stroke="url(#wg)" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M0 20 Q22 10 44 20 Q66 30 88 20 Q110 10 132 20 Q154 30 180 20" stroke="url(#wg)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
            <defs>
              <linearGradient id="wg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" /><stop offset="50%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <p className="text-[11px] text-white/35 leading-snug text-center">Better Connections for a Smarter Tomorrow</p>
          <p className="text-[10px] text-white/20 text-center mt-1.5">v1.0 · MDM Project</p>
        </div>
      </aside>
    </>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [metrics, setMetrics]         = useState(null);
  const [chartHistory, setChartHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStep, setScanStep]       = useState('');
  const [lastUpdated, setLastUpdated] = useState('Never');
  const [backendOnline, setBackendOnline] = useState(null);
  const [showReport, setShowReport]   = useState(false);
  const [showRecommendationApplied, setShowRecommendationApplied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [nearbyExpanded, setNearbyExpanded] = useState(false);
  const [activeNav, setActiveNav]     = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stepTimers = useRef([]);
  const pollTimer  = useRef(null);

  const d   = metrics || FALLBACK_METRICS;
  const ai  = d.aiRecommendation;
  const lat = d.latency;

  // Backend check on mount
  useEffect(() => {
    checkBackend().then((res) => {
      setBackendOnline(res.ok);
      if (res.ok) { runAnalysis(); }
      else {
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
      pollTimer.current = setInterval(() => { if (!isAnalyzing) silentRefresh(); }, POLL_INTERVAL_MS);
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
      const t = setTimeout(() => {
        setIsAnalyzing(false);
        setScanStep('');
        setLastUpdated(fmtTime(new Date()));
      }, ANALYSIS_STEPS.length * 350 + 200);
      stepTimers.current.push(t);
    }
  }, [isAnalyzing, chartHistory.length]);

  async function silentRefresh() {
    try {
      const { ok, data } = await getFullMetrics();
      if (ok && data?.ok) { setMetrics(data); appendChartPoint(data); setLastUpdated(fmtTime(new Date())); }
    } catch { /* silent */ }
  }

  // Search filtering
  const q = searchQuery.trim().toLowerCase();
  const filteredNearby  = d.nearbyNetworks?.filter((n) => !q || (n.ssid || '').toLowerCase().includes(q) || String(n.channel || '').includes(q) || (n.band || '').toLowerCase().includes(q) || (n.authentication || '').toLowerCase().includes(q)) ?? [];
  const filteredDevices = d.devices?.filter((dev) => !q || (dev.ip || '').includes(q) || (dev.mac || '').toLowerCase().includes(q)) ?? [];

  // Band badge for header
  const bandBadge = (() => {
    if (!d.band) return null;
    const radio = d.radioType || '';
    if (radio.includes('6') || radio.includes('ax')) return `${d.band} | Wi-Fi 6`;
    if (radio.includes('ac')) return `${d.band} | Wi-Fi 5`;
    if (radio.includes('n'))  return `${d.band} | Wi-Fi 4`;
    return d.band;
  })();

  // ── Page routing ──────────────────────────────────────────────────────────
  function renderPage() {
    switch (activeNav) {
      case 'scan':
        return <NetworkScanPage data={d} backendOnline={backendOnline} />;
      case 'channel':
        return <ChannelAnalysisPage data={d} backendOnline={backendOnline} />;
      case 'devices':
        return <ConnectedDevicesPage data={d} backendOnline={backendOnline} />;
      case 'ai':
        return <AIInsightsPage data={d} backendOnline={backendOnline} />;
      case 'settings':
        return <SettingsPage data={d} backendOnline={backendOnline} lastUpdated={lastUpdated} />;
      case 'dashboard':
      default:
        return (
          <DashboardPage
            d={d} ai={ai} lat={lat}
            chartHistory={chartHistory}
            isAnalyzing={isAnalyzing}
            lastUpdated={lastUpdated}
            backendOnline={backendOnline}
            runAnalysis={runAnalysis}
            showRecommendationApplied={showRecommendationApplied}
            setShowRecommendationApplied={setShowRecommendationApplied}
            setShowReport={setShowReport}
            searchQuery={searchQuery}
            filteredNearby={filteredNearby}
            filteredDevices={filteredDevices}
            nearbyExpanded={nearbyExpanded}
            setNearbyExpanded={setNearbyExpanded}
          />
        );
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-full overflow-hidden bg-slate-100 font-sans flex">
      {showReport && <ReportModal data={d} onClose={() => setShowReport(false)} />}

      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden h-screen lg:ml-60">

        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" onClick={() => setSidebarOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          {/* Search */}
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm transition-all flex-1 max-w-sm ${searchFocused ? 'border-violet-300 ring-2 ring-violet-100 bg-white' : 'border-slate-200 bg-slate-50'}`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholder="Search network, location or device..." className="bg-transparent outline-none text-slate-700 placeholder:text-slate-400 text-sm flex-1 min-w-0" />
            {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-3.5 h-3.5 text-slate-400" /></button>}
          </div>
          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
              Online &amp; Monitoring
            </div>
            {bandBadge && <div className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-xs font-semibold text-violet-700"><Wifi className="w-3 h-3" />{bandBadge}</div>}
            {d.isFallback && <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-600">Demo Data</div>}
            <button className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-violet-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-1.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">OK</div>
              <div className="hidden sm:block"><p className="text-xs font-semibold text-slate-800 leading-tight">Onkar</p></div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Backend offline notice */}
        {backendOnline === false && (
          <div className="mx-4 sm:mx-6 mt-3 flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs shrink-0">
            <AlertCircle className="w-[18px] h-[18px] shrink-0 mt-0.5" />
            <div><span className="font-semibold">Backend not reachable.</span>{' '}Run <code className="px-1 py-0.5 bg-amber-100 rounded font-mono">npm run dev:all</code> to start both servers. Showing demo data.</div>
          </div>
        )}

        {/* Scanning banner */}
        {isAnalyzing && (
          <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 text-xs scan-pulse shrink-0">
            <Cpu className="w-4 h-4 text-violet-500 animate-spin shrink-0" />
            <span className="flex-1 font-medium truncate">{scanStep || 'Initialising AI diagnostic engine…'}</span>
            <span className="px-2 py-0.5 bg-violet-100 border border-violet-200 text-violet-600 font-semibold rounded-full text-[11px] shrink-0">AI SCAN ACTIVE</span>
          </div>
        )}

        {/* Search hint */}
        {q && (
          <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-2 text-xs text-slate-500 shrink-0">
            <Search className="w-3.5 h-3.5" />
            <span>Results for <span className="text-violet-600 font-semibold">"{searchQuery}"</span> — {filteredNearby.length} networks, {filteredDevices.length} devices</span>
          </div>
        )}

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
