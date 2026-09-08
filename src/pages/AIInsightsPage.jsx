import React, { useState } from 'react';
import {
  BrainCircuit, Sparkles, RefreshCw, CheckCircle2, AlertTriangle,
  AlertCircle, Info, ArrowRight, Activity, Wifi, Zap, Gauge,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import { getFullMetrics } from '../services/networkApi.js';

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

function ConditionRow({ label, value, status, note }) {
  const colors = {
    good:    'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: 'bg-amber-50  border-amber-200  text-amber-700',
    bad:     'bg-rose-50   border-rose-200   text-rose-600',
    neutral: 'bg-slate-50  border-slate-200  text-slate-500',
  };
  const icons = {
    good:    <CheckCircle2 className="w-3.5 h-3.5" />,
    warning: <AlertTriangle className="w-3.5 h-3.5" />,
    bad:     <AlertCircle className="w-3.5 h-3.5" />,
    neutral: <Info className="w-3.5 h-3.5" />,
  };
  return (
    <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
      <div>
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        {note && <p className="text-[11px] text-slate-400 mt-0.5">{note}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-700">{value}</span>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${colors[status] || colors.neutral}`}>
          {icons[status] || icons.neutral}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
    </div>
  );
}

export default function AIInsightsPage({ data, backendOnline }) {
  const [refreshing, setRefreshing] = useState(false);
  const [localData, setLocalData]   = useState(data);
  const [error, setError]           = useState(null);
  const [applyMsg, setApplyMsg]     = useState(false);

  const d   = localData || data;
  const ai  = d?.aiRecommendation;
  const lat = d?.latency;

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    setApplyMsg(false);
    try {
      const { ok, data: fresh } = await getFullMetrics();
      if (ok && fresh?.ok) {
        setLocalData(fresh);
      } else {
        setError('Could not refresh. Ensure the backend is running.');
      }
    } catch {
      setError('Backend unreachable.');
    } finally {
      setRefreshing(false);
    }
  }

  // Compute condition statuses from real data
  const signalStatus = d?.signalDbm == null ? 'neutral' : d.signalDbm >= -60 ? 'good' : d.signalDbm >= -70 ? 'warning' : 'bad';
  const speedStatus  = d?.rxRate == null ? 'neutral' : d.rxRate >= 100 ? 'good' : d.rxRate >= 30 ? 'warning' : 'bad';
  const latStatus    = lat?.avg == null ? 'neutral' : lat.avg < 30 ? 'good' : lat.avg < 100 ? 'warning' : 'bad';
  const lossStatus   = lat?.packetLoss == null ? 'neutral' : lat.packetLoss === 0 ? 'good' : lat.packetLoss < 5 ? 'warning' : 'bad';
  const congStatus   = ai?.congestion == null ? 'neutral' : ai.congestion <= 25 ? 'good' : ai.congestion <= 50 ? 'warning' : 'bad';
  const healthStatus = d?.healthScore == null ? 'neutral' : d.healthScore >= 80 ? 'good' : d.healthScore >= 55 ? 'warning' : 'bad';

  const conditions = [
    { label: 'Signal Strength', value: d?.signalDbm != null ? `${d.signalDbm} dBm` : '—', status: signalStatus, note: signalLabel(d?.signalDbm) },
    { label: 'Link Speed',      value: d?.rxRate != null ? `${d.rxRate} Mbps` : '—',        status: speedStatus,  note: d?.radioType || '' },
    { label: 'Latency',         value: lat?.avg != null ? `${lat.avg} ms` : '—',             status: latStatus,    note: lat?.min != null ? `min ${lat.min}ms / max ${lat.max}ms` : '' },
    { label: 'Packet Loss',     value: lat?.packetLoss != null ? `${lat.packetLoss}%` : '—', status: lossStatus,   note: lat?.reachable === false ? 'Offline' : 'Internet reachable' },
    { label: 'Channel Congestion', value: ai?.congestion != null ? `${ai.congestion}%` : '—', status: congStatus, note: d?.currentChannel ? `Channel ${d.currentChannel}` : '' },
    { label: 'Overall Health',  value: d?.healthScore != null ? `${d.healthScore}%` : '—',  status: healthStatus, note: healthLabel(d?.healthScore) },
  ];

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5 min-w-0">
      {/* Page title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-violet-50 border border-violet-100">
              <BrainCircuit className="w-5 h-5 text-violet-600" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-800">AI Insights</h1>
            {d?.isFallback && (
              <span className="px-2 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full uppercase">Demo Data</span>
            )}
          </div>
          <p className="text-sm text-slate-500">Intelligent recommendations based on your network performance</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || !backendOnline}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            refreshing || !backendOnline
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white hover:shadow-md active:scale-[0.98]'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh Insights'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {/* Top metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Network Health',    value: d?.healthScore != null ? `${d?.healthScore}%` : '—',     status: healthStatus, Icon: Gauge    },
          { label: 'Signal Quality',    value: d?.signalDbm != null ? `${d?.signalDbm} dBm` : '—',      status: signalStatus, Icon: Wifi     },
          { label: 'Latency',           value: lat?.avg != null ? `${lat.avg} ms` : '—',                 status: latStatus,    Icon: Activity },
          { label: 'Channel Congestion',value: ai?.congestion != null ? `${ai.congestion}%` : '—',      status: congStatus,   Icon: Zap      },
        ].map(({ label, value, status, Icon }) => {
          const bg     = status === 'good' ? 'bg-emerald-50 border-emerald-100' : status === 'warning' ? 'bg-amber-50 border-amber-100' : status === 'bad' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200';
          const clr    = status === 'good' ? 'text-emerald-600' : status === 'warning' ? 'text-amber-600' : status === 'bad' ? 'text-rose-600' : 'text-slate-500';
          const iconBg = status === 'good' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : status === 'warning' ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-violet-100 border-violet-200 text-violet-600';
          return (
            <div key={label} className={`p-4 rounded-2xl border ${bg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                <div className={`p-1.5 rounded-lg border ${iconBg}`}><Icon className="w-3.5 h-3.5" /></div>
              </div>
              <p className={`text-2xl font-extrabold ${clr}`}>{value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Recommendation card */}
        <div className="lg:col-span-2">
          {ai ? (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 h-full">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-violet-50 border border-violet-100">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Intelligent Recommendation Engine</p>
                    <h2 className="text-base font-bold text-slate-800">Smart Analysis &amp; Suggestion</h2>
                  </div>
                </div>
                <span className={`shrink-0 px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                  ai.statusColor === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                  ai.statusColor === 'amber'   ? 'bg-amber-50  border-amber-200  text-amber-700'   :
                  'bg-rose-50 border-rose-200 text-rose-600'
                }`}>
                  {ai.statusTag}
                </span>
              </div>

              {/* Detected issue */}
              <div className={`rounded-xl p-3.5 border ${
                ai.statusColor === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
                ai.statusColor === 'amber'   ? 'bg-amber-50  border-amber-100'   :
                'bg-rose-50 border-rose-100'
              }`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {ai.statusColor === 'emerald'
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                  <span className={`text-sm font-bold ${ai.statusColor === 'emerald' ? 'text-emerald-700' : 'text-amber-700'}`}>{ai.issue}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{ai.issueDetail}</p>
                {ai.nearbyCount != null && (
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3" /> {ai.nearbyCount} nearby networks analysed
                  </p>
                )}
              </div>

              {/* Action */}
              <div className="grid grid-cols-3 gap-2 items-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Current Channel</p>
                  <p className="text-lg font-extrabold text-slate-700 mt-0.5">Ch {ai.currentChannel}</p>
                  <span className={`text-[10px] font-semibold ${ai.congestion > 50 ? 'text-rose-500' : ai.congestion > 25 ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {ai.congestion}% congestion
                  </span>
                </div>
                <div className="flex justify-center">
                  <div className="p-1.5 rounded-full bg-violet-50 border border-violet-100">
                    <ArrowRight className="w-4 h-4 text-violet-500" />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-center">
                  <p className="text-[10px] font-semibold text-violet-500 uppercase">Recommended</p>
                  <p className="text-lg font-extrabold text-violet-700 mt-0.5">Ch {ai.recommendedChannel}</p>
                  <span className="text-[10px] text-emerald-600 font-semibold">Lower Interference</span>
                </div>
              </div>

              {/* Reason & expected */}
              <div className="space-y-2">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                  <p className="font-semibold text-slate-500 mb-1">Reason</p>
                  <p className="text-slate-700 leading-relaxed">{ai.issueDetail}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-xs">
                  <p className="font-semibold text-emerald-600 mb-1">Expected Improvement</p>
                  <p className="text-slate-700">{ai.expectedResult}</p>
                </div>
              </div>

              {/* Scored channels */}
              {ai.scoredChannels && ai.scoredChannels.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Channel Interference Scores (lower = better)</p>
                  {ai.scoredChannels.slice(0, 5).map((sc) => (
                    <div key={sc.channel} className="flex items-center gap-2 text-xs">
                      <span className={`w-12 font-mono font-semibold shrink-0 ${sc.channel === ai.recommendedChannel ? 'text-violet-600' : sc.channel === ai.currentChannel ? 'text-slate-500' : 'text-slate-400'}`}>
                        Ch {sc.channel}
                      </span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${sc.channel === ai.recommendedChannel ? 'bg-violet-400' : sc.channel === ai.currentChannel ? 'bg-rose-400' : 'bg-slate-300'}`}
                          style={{ width: `${Math.min(100, sc.score)}%` }} />
                      </div>
                      <span className="w-7 text-right text-slate-400 font-mono shrink-0 text-[11px]">{sc.score}</span>
                      <span className="text-slate-400 truncate max-w-[200px] hidden sm:block text-[11px]">{sc.reasons?.[0]}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setApplyMsg(true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-sm active:scale-[0.98]"
              >
                Apply Recommendation
              </button>
              {applyMsg && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <span className="font-semibold">Router configuration not connected.</span>
                    {' '}This app is read-only. To apply, log in to your router admin panel and change the Wi-Fi channel to{' '}
                    <span className="font-bold text-amber-800">Channel {ai.recommendedChannel}</span>.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3 text-center h-full min-h-[240px]">
              <div className="p-3 bg-violet-50 rounded-2xl"><Sparkles className="w-6 h-6 text-violet-400" /></div>
              <p className="text-sm font-semibold text-slate-600">No recommendation yet</p>
              <p className="text-xs text-slate-400">Run analysis from the Dashboard or click Refresh Insights.</p>
            </div>
          )}
        </div>

        {/* Analysis Summary */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Analysis Summary</h2>
          <div className="space-y-2.5">
            {conditions.map((c) => (
              <ConditionRow key={c.label} {...c} />
            ))}
          </div>

          {/* Methodology note */}
          <div className="mt-4 p-3 bg-violet-50 rounded-xl border border-violet-100 text-[11px] text-violet-700 leading-relaxed">
            <p className="font-semibold mb-1">About the Recommendation Engine</p>
            <p>
              This system uses a rule-based interference scoring algorithm. It collects real Wi-Fi data via
              Windows <code className="font-mono bg-violet-100 px-0.5 rounded">netsh</code>, measures HTTP latency,
              and scores candidate channels by co-channel and adjacent-channel network density.
              No external AI API is used — all analysis runs locally.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
