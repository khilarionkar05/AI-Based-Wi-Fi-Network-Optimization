import React, { useState } from 'react';
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
  ArrowUpRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

// Preset realistic network states
const NETWORK_SCENARIOS = [
  {
    name: 'Moderate Congestion',
    signalStrength: -48,
    speed: 92,
    latency: 18,
    health: 94,
    currentChannel: 6,
    congestion: 32,
    frequency: '2.4 GHz (802.11ax)',
    issue: 'Channel congestion detected',
    issueDetail: 'Co-channel interference observed from 7 neighboring access points.',
    recommendedChannel: 11,
    expectedResult: 'Better stability & +28% throughput',
    statusTag: 'Optimization Recommended',
    statusColor: 'amber',
    chartData: [
      { time: '10:00', speed: 85, latency: 22 },
      { time: '10:02', speed: 89, latency: 20 },
      { time: '10:04', speed: 94, latency: 17 },
      { time: '10:06', speed: 91, latency: 19 },
      { time: '10:08', speed: 88, latency: 23 },
      { time: '10:10', speed: 95, latency: 16 },
      { time: '10:12', speed: 92, latency: 18 },
    ],
    devices: [
      { name: 'MacBook Pro 16"', type: 'laptop', ip: '192.168.1.104', signal: '-42 dBm', usage: '34.2 MB/s', active: true },
      { name: 'iPhone 15 Pro', type: 'phone', ip: '192.168.1.112', signal: '-49 dBm', usage: '12.8 MB/s', active: true },
      { name: 'Living Room 4K TV', type: 'tv', ip: '192.168.1.120', signal: '-58 dBm', usage: '26.4 MB/s', active: true },
      { name: 'iPad Air M2', type: 'tablet', ip: '192.168.1.145', signal: '-52 dBm', usage: '5.1 MB/s', active: false },
    ]
  },
  {
    name: 'Heavy Interference',
    signalStrength: -62,
    speed: 54,
    latency: 38,
    health: 76,
    currentChannel: 1,
    congestion: 68,
    frequency: '2.4 GHz (802.11n/ac)',
    issue: 'Severe RF overlap & packet jitter',
    issueDetail: 'Dense traffic cluster in Channel 1 causing 4.2% packet retry rate.',
    recommendedChannel: 9,
    expectedResult: 'Lower latency (-16ms) & jitter reduction',
    statusTag: 'Interference Warning',
    statusColor: 'rose',
    chartData: [
      { time: '10:00', speed: 72, latency: 28 },
      { time: '10:02', speed: 64, latency: 34 },
      { time: '10:04', speed: 51, latency: 42 },
      { time: '10:06', speed: 58, latency: 39 },
      { time: '10:08', speed: 49, latency: 45 },
      { time: '10:10', speed: 56, latency: 36 },
      { time: '10:12', speed: 54, latency: 38 },
    ],
    devices: [
      { name: 'MacBook Pro 16"', type: 'laptop', ip: '192.168.1.104', signal: '-58 dBm', usage: '18.4 MB/s', active: true },
      { name: 'iPhone 15 Pro', type: 'phone', ip: '192.168.1.112', signal: '-64 dBm', usage: '8.2 MB/s', active: true },
      { name: 'Living Room 4K TV', type: 'tv', ip: '192.168.1.120', signal: '-71 dBm', usage: '14.0 MB/s', active: true },
      { name: 'Office Workstation', type: 'laptop', ip: '192.168.1.155', signal: '-60 dBm', usage: '9.6 MB/s', active: true },
    ]
  },
  {
    name: 'Optimized Peak Performance',
    signalStrength: -38,
    speed: 138,
    latency: 9,
    health: 99,
    currentChannel: 11,
    congestion: 12,
    frequency: '5.0 GHz (Wi-Fi 6 AX)',
    issue: 'Clear channel spectrum identified',
    issueDetail: 'Zero co-channel overlap detected. Channel operating at optimum efficiency.',
    recommendedChannel: 11,
    expectedResult: 'Maximum bandwidth & ultra-low latency',
    statusTag: 'Peak Network Health',
    statusColor: 'emerald',
    chartData: [
      { time: '10:00', speed: 124, latency: 12 },
      { time: '10:02', speed: 130, latency: 10 },
      { time: '10:04', speed: 135, latency: 9 },
      { time: '10:06', speed: 132, latency: 11 },
      { time: '10:08', speed: 141, latency: 8 },
      { time: '10:10', speed: 137, latency: 10 },
      { time: '10:12', speed: 138, latency: 9 },
    ],
    devices: [
      { name: 'MacBook Pro 16"', type: 'laptop', ip: '192.168.1.104', signal: '-34 dBm', usage: '52.1 MB/s', active: true },
      { name: 'iPhone 15 Pro', type: 'phone', ip: '192.168.1.112', signal: '-39 dBm', usage: '28.4 MB/s', active: true },
      { name: 'Living Room 4K TV', type: 'tv', ip: '192.168.1.120', signal: '-45 dBm', usage: '38.0 MB/s', active: true },
      { name: 'Smart IoT Hub', type: 'laptop', ip: '192.168.1.189', signal: '-40 dBm', usage: '3.2 MB/s', active: true },
    ]
  }
];

export default function App() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [lastUpdated, setLastUpdated] = useState('Just now');
  const [optimizedApplied, setOptimizedApplied] = useState(false);

  const currentData = NETWORK_SCENARIOS[scenarioIndex];

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setScanStep('Sampling 2.4 / 5 GHz RF Spectrum...');

    setTimeout(() => {
      setScanStep('Evaluating Co-Channel & Adjacent Interference...');
    }, 600);

    setTimeout(() => {
      setScanStep('Executing Neural Channel Allocation Heuristic...');
    }, 1200);

    setTimeout(() => {
      // Cycle to the next scenario
      setScenarioIndex((prev) => (prev + 1) % NETWORK_SCENARIOS.length);
      setIsAnalyzing(false);
      setScanStep('');
      setOptimizedApplied(false);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1800);
  };

  const handleApplyOptimization = () => {
    // Jump straight to optimized scenario
    setIsAnalyzing(true);
    setScanStep('Reallocating router AP to target Channel 11...');
    setTimeout(() => {
      setScenarioIndex(2); // index 2 is Optimized
      setIsAnalyzing(false);
      setScanStep('');
      setOptimizedApplied(true);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'laptop':
        return <Laptop className="w-4 h-4 text-cyan-400" />;
      case 'phone':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'tv':
        return <Tv className="w-4 h-4 text-purple-400" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-blue-400" />;
      default:
        return <Wifi className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background ambient tech glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        {/* ================= HEADER ================= */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
              <Wifi className="w-6 h-6 text-cyan-400 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-[#090d16]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  AI Wi-Fi Optimizer
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 border border-cyan-800/50 rounded-full">
                  MDM Project
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                Intelligent Network Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Online Status Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-medium">Online</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastUpdated}
              </span>
            </div>

            {/* Run Analysis Button */}
            <button
              id="run-analysis-btn"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className={`relative flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm tracking-wide transition-all duration-200 shadow-md ${
                isAnalyzing
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : 'Run Analysis'}</span>
            </button>
          </div>
        </header>

        {/* Live scanning banner when analysis in progress */}
        {isAnalyzing && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm animate-pulse">
            <Cpu className="w-5 h-5 text-cyan-400 animate-spin" />
            <div className="flex-1 font-mono tracking-tight">
              {scanStep || 'Executing real-time telemetry diagnostics...'}
            </div>
            <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono">
              AI SCAN ACTIVE
            </span>
          </div>
        )}

        {/* ================= TOP METRIC CARDS ================= */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* 1. Signal Strength */}
          <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-800/80 hover:border-slate-700 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Signal Strength</span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                <Wifi className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {currentData.signalStrength}
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-400">dBm</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {currentData.signalStrength >= -50 ? 'Excellent RSSI' : currentData.signalStrength >= -65 ? 'Good RSSI' : 'Weak RSSI'}
              </span>
              <div className="flex items-end gap-0.5 h-3.5">
                <span className={`w-1 rounded-full ${currentData.signalStrength >= -75 ? 'h-1.5 bg-cyan-400' : 'h-1.5 bg-slate-700'}`}></span>
                <span className={`w-1 rounded-full ${currentData.signalStrength >= -65 ? 'h-2.5 bg-cyan-400' : 'h-2.5 bg-slate-700'}`}></span>
                <span className={`w-1 rounded-full ${currentData.signalStrength >= -55 ? 'h-3 bg-cyan-400' : 'h-3 bg-slate-700'}`}></span>
                <span className={`w-1 rounded-full ${currentData.signalStrength >= -48 ? 'h-3.5 bg-cyan-400' : 'h-3.5 bg-slate-700'}`}></span>
              </div>
            </div>
          </div>

          {/* 2. Speed */}
          <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-800/80 hover:border-slate-700 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Speed</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {currentData.speed}
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-400">Mbps</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span className="text-slate-400">Downlink Bandwidth</span>
              <span className="text-cyan-400 font-medium">802.11ax</span>
            </div>
          </div>

          {/* 3. Latency */}
          <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-800/80 hover:border-slate-700 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Latency</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {currentData.latency}
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-400">ms</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className={currentData.latency < 20 ? 'text-emerald-400' : 'text-amber-400'}>
                {currentData.latency < 20 ? 'Ultra-low Jitter' : 'Moderate Jitter'}
              </span>
              <span className="text-slate-500 font-mono">1.2ms var</span>
            </div>
          </div>

          {/* 4. Network Health */}
          <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-800/80 hover:border-slate-700 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Network Health</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <Gauge className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {currentData.health}%
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-400">Score</span>
            </div>
            <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  currentData.health >= 90
                    ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                    : 'bg-gradient-to-r from-amber-400 to-rose-400'
                }`}
                style={{ width: `${currentData.health}%` }}
              />
            </div>
          </div>
        </section>

        {/* ================= MAIN DASHBOARD SECTIONS ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT 2 COLUMNS: Network Performance Chart & AI Recommendation */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* 1. Network Performance Chart */}
            <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Network Performance
                  </h2>
                  <p className="text-xs text-slate-400">Real-time throughput (Mbps) & latency (ms) timeline</p>
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

              {/* Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#1e293b' }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0d1322',
                        borderColor: '#1e293b',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                      }}
                      itemStyle={{ padding: '2px 0' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="speed"
                      name="Speed (Mbps)"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#speedGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="latency"
                      name="Latency (ms)"
                      stroke="#818cf8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#latencyGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. AI Recommendation Section (Hero Card) */}
            <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 border border-cyan-500/40 bg-gradient-to-br from-[#0c1427] via-[#0e1830] to-[#12142e] shadow-xl shadow-cyan-950/20">
              {/* Subtle visual accent glow */}
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

                <span
                  className={`self-start px-2.5 py-1 text-xs font-semibold rounded-full border ${
                    currentData.statusColor === 'emerald'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                      : currentData.statusColor === 'amber'
                      ? 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                  }`}
                >
                  {currentData.statusTag}
                </span>
              </div>

              {/* Issue Description Box */}
              <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 mb-5">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-1">
                  {currentData.statusColor === 'emerald' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span>{currentData.issue}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentData.issueDetail}
                </p>
              </div>

              {/* Actionable Channel Switch Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center mb-5">
                {/* Current */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Current Channel
                  </span>
                  <div className="text-xl font-bold text-slate-200 mt-0.5">
                    Channel {currentData.currentChannel}
                  </div>
                  <span className="text-[11px] text-rose-400 font-medium mt-1 inline-block">
                    {currentData.congestion}% Congested
                  </span>
                </div>

                {/* Arrow indicator */}
                <div className="hidden sm:flex justify-center text-cyan-400">
                  <div className="p-2 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>

                {/* Recommended */}
                <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-center shadow-inner">
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                    Recommended Channel
                  </span>
                  <div className="text-xl font-bold text-cyan-300 mt-0.5">
                    Channel {currentData.recommendedChannel}
                  </div>
                  <span className="text-[11px] text-emerald-400 font-medium mt-1 inline-block">
                    Optimal Spectrum
                  </span>
                </div>
              </div>

              {/* Expected Result & Action Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                <div className="text-xs text-slate-300 text-center sm:text-left">
                  <span className="text-slate-400 font-medium">Expected Result: </span>
                  <span className="text-cyan-300 font-semibold">{currentData.expectedResult}</span>
                </div>

                <button
                  onClick={handleApplyOptimization}
                  disabled={isAnalyzing || currentData.currentChannel === currentData.recommendedChannel}
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    currentData.currentChannel === currentData.recommendedChannel
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {currentData.currentChannel === currentData.recommendedChannel
                    ? 'Channel Already Optimized'
                    : 'Apply Recommendation'}
                </button>
              </div>

              {optimizedApplied && (
                <div className="mt-3 p-2 bg-emerald-950/50 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Recommendation applied successfully. Re-routed to Channel 11.</span>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Channel Analysis & Connected Devices */}
          <div className="flex flex-col gap-6">

            {/* 2. Channel Analysis */}
            <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-800/80">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-cyan-400" />
                  Channel Analysis
                </h2>
                <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 bg-slate-800 rounded">
                  2.4 / 5 GHz
                </span>
              </div>

              {/* Current Channel & Congestion */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Active Channel</span>
                    <span className="text-xl font-bold text-white">Channel {currentData.currentChannel}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Band</span>
                    <span className="text-xs font-mono text-cyan-400 font-semibold">20 MHz Wide</span>
                  </div>
                </div>

                {/* Congestion Progress Bar */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-300 font-medium">Channel Congestion</span>
                    <span
                      className={`font-bold ${
                        currentData.congestion > 50
                          ? 'text-rose-400'
                          : currentData.congestion > 25
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {currentData.congestion}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        currentData.congestion > 50
                          ? 'bg-rose-500'
                          : currentData.congestion > 25
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${currentData.congestion}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                    <span>Low (0%)</span>
                    <span>Moderate</span>
                    <span>Severe (100%)</span>
                  </div>
                </div>

                {/* Channel spectrum mini visualization */}
                <div className="pt-2">
                  <div className="text-xs text-slate-400 mb-2 font-medium flex items-center justify-between">
                    <span>2.4 GHz Non-overlapping Spectrum</span>
                    <span className="text-[11px] text-slate-500">Ch 1 / 6 / 11</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 6, 11].map((ch) => {
                      const isActive = currentData.currentChannel === ch;
                      const isTarget = currentData.recommendedChannel === ch;
                      return (
                        <div
                          key={ch}
                          className={`p-2.5 rounded-lg border text-center transition-all ${
                            isActive
                              ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                              : isTarget
                              ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-400'
                              : 'border-slate-800 bg-slate-900/40 text-slate-400'
                          }`}
                        >
                          <span className="text-xs font-bold block">Ch {ch}</span>
                          <span className="text-[10px] block font-mono mt-0.5 opacity-80">
                            {isActive ? 'Active' : isTarget ? 'AI Target' : 'Available'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Connected Devices Indicator / List */}
            <div className="bg-[#101626]/90 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-800/80 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base sm:text-lg font-bold text-white">Connected Devices</h2>
                </div>
                <span className="px-2 py-0.5 text-xs font-semibold text-cyan-400 bg-cyan-950/80 border border-cyan-800/50 rounded-full">
                  {currentData.devices.length} Active
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {currentData.devices.map((device, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                        {getDeviceIcon(device.type)}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-200">
                          {device.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          <span>{device.ip}</span>
                          <span>•</span>
                          <span className="text-cyan-400">{device.signal}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-medium text-slate-300 block">
                        {device.usage}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium">Online</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Bandwidth Consumption</span>
                <span className="text-cyan-400 font-medium">81.5 MB/s total</span>
              </div>
            </div>

          </div>

        </div>

        {/* ================= FOOTER ================= */}
        <footer className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© 2026 AI-Based Wi-Fi Network Optimization • College MDM Project</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Machine Learning Heuristic V2.4
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
}
