import React, { useState } from 'react';
import {
  Radio, RefreshCw, ArrowRight, AlertTriangle, CheckCircle2,
  Info, AlertCircle, TrendingDown,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { getFullMetrics } from '../services/networkApi.js';

function congestionColor(pct) {
  if (pct > 50) return 'text-rose-500';
  if (pct > 25) return 'text-amber-500';
  return 'text-emerald-600';
}
function congestionBg(pct) {
  if (pct > 50) return 'bg-rose-50 border-rose-200';
  if (pct > 25) return 'bg-amber-50 border-amber-200';
  return 'bg-emerald-50 border-emerald-200';
}
function barFill(score, isRecommended, isCurrent) {
  if (isRecommended) return '#8b5cf6';
  if (isCurrent)     return '#f43f5e';
  if (score > 50)    return '#fb923c';
  return '#6ee7b7';
}

export default function ChannelAnalysisPage({ data, backendOnline }) {
  const [refreshing, setRefreshing] = useState(false);
  const [localData, setLocalData] = useState(data);
  const [applyMsg, setApplyMsg] = useState(false);
  const [error, setError] = useState(null);

  const d  = localData || data;
  const ai = d?.aiRecommendation;

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

  // Build chart data from scored channels
  const chartData = (ai?.scoredChannels || []).map((sc) => ({
    name: `Ch ${sc.channel}`,
    score: sc.score,
    channel: sc.channel,
  }));

  // Channel candidates for display
  const candidates = d?.band === '5 GHz'
    ? [36, 40, 44, 48, 149, 153, 157, 161]
    : [1, 6, 11];

  const nearbyByChannel = {};
  (d?.nearbyNetworks || []).forEach((n) => {
    if (n.channel) { nearbyByChannel[n.channel] = (nearbyByChannel[n.channel] || 0) + 1; }
  });

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5 min-w-0">
      {/* Page title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-violet-50 border border-violet-100">
              <Radio className="w-5 h-5 text-violet-600" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-800">Channel Analysis</h1>
            {d?.isFallback && (
              <span className="px-2 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full uppercase">Demo Data</span>
            )}
          </div>
          <p className="text-sm text-slate-500">Analyze Wi-Fi channel congestion and identify the optimal channel</p>
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
          {refreshing ? 'Refreshing…' : 'Refresh Analysis'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Current Channel',  value: d?.currentChannel ? `Channel ${d.currentChannel}` : '—',   color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200' },
          { label: 'Current Band',     value: d?.band || '—',                                             color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200'   },
          { label: 'Nearby Networks',  value: d?.nearbyCount ?? '—',                                      color: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-200'  },
          { label: 'Congestion Level', value: ai?.congestion != null ? `${ai.congestion}%` : '—',
            color: congestionColor(ai?.congestion ?? 0),
            bg: ai?.congestion > 50 ? 'bg-rose-50' : ai?.congestion > 25 ? 'bg-amber-50' : 'bg-emerald-50',
            border: ai?.congestion > 50 ? 'border-rose-200' : ai?.congestion > 25 ? 'border-amber-200' : 'border-emerald-200',
          },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className={`p-4 rounded-2xl border ${border} ${bg}`}>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Main analysis: current vs recommended */}
      {ai ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Current vs Recommended */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Channel Recommendation</h2>

            {/* Issue */}
            <div className={`rounded-xl p-3.5 border mb-4 ${
              ai.statusColor === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
              ai.statusColor === 'amber'   ? 'bg-amber-50  border-amber-100'   :
              'bg-rose-50 border-rose-100'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {ai.statusColor === 'emerald'
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                <span className={`text-xs font-semibold ${ai.statusColor === 'emerald' ? 'text-emerald-700' : 'text-amber-700'}`}>{ai.issue}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{ai.issueDetail}</p>
              {ai.nearbyCount != null && (
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <Info className="w-3 h-3" /> {ai.nearbyCount} networks analysed
                </p>
              )}
            </div>

            {/* Channel switch */}
            <div className="grid grid-cols-3 gap-2 items-center mb-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Current</p>
                <p className="text-lg font-extrabold text-slate-700 mt-0.5">Ch {ai.currentChannel}</p>
                <span className={`text-[10px] font-semibold ${congestionColor(ai.congestion)}`}>{ai.congestion}% congested</span>
              </div>
              <div className="flex justify-center">
                <div className="p-1.5 rounded-full bg-violet-50 border border-violet-100">
                  <ArrowRight className="w-4 h-4 text-violet-500" />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-center">
                <p className="text-[10px] font-semibold text-violet-500 uppercase">Recommended</p>
                <p className="text-lg font-extrabold text-violet-700 mt-0.5">Ch {ai.recommendedChannel}</p>
                <span className="text-[10px] text-emerald-600 font-semibold">Optimal</span>
              </div>
            </div>

            {/* Expected result */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs mb-4">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-semibold text-slate-600">Expected Improvement</span>
              </div>
              <p className="text-slate-700">{ai.expectedResult}</p>
            </div>

            {/* Apply button — honest */}
            <button
              onClick={() => setApplyMsg(true)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-sm active:scale-[0.98]"
            >
              Apply Recommendation
            </button>
            {applyMsg && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <span className="font-semibold">Router configuration is not connected.</span>
                  {' '}This application performs read-only monitoring and cannot modify router settings.
                  To apply this recommendation, log in to your router admin panel and manually change the Wi-Fi channel to{' '}
                  <span className="font-bold text-amber-800">Channel {ai.recommendedChannel}</span>.
                </span>
              </div>
            )}
          </div>

          {/* Interference chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 mb-1">Channel Interference Scores</h2>
            <p className="text-xs text-slate-400 mb-4">Lower score = less interference. Based on nearby network density and signal strength.</p>
            {chartData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} stroke="#cbd5e1" />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#cbd5e1" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                      formatter={(val, name, props) => [`Score: ${val}`, props.payload.name]}
                    />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.channel}
                          fill={barFill(entry.score, entry.channel === ai.recommendedChannel, entry.channel === ai.currentChannel)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-slate-400">
                Run Refresh Analysis to load channel data.
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-500 inline-block" /><span className="text-slate-500">Recommended</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-400 inline-block" /><span className="text-slate-500">Current</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-300 inline-block" /><span className="text-slate-500">Available</span></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3 text-center">
          <div className="p-3 bg-violet-50 rounded-2xl">
            <Radio className="w-6 h-6 text-violet-400" />
          </div>
          <p className="text-sm font-semibold text-slate-600">No channel analysis available</p>
          <p className="text-xs text-slate-400">Click "Refresh Analysis" to run channel scoring.</p>
        </div>
      )}

      {/* Channel grid */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 mb-1">
          {d?.band === '5 GHz' ? '5 GHz' : '2.4 GHz'} Non-overlapping Channel Map
        </h2>
        <p className="text-xs text-slate-400 mb-4">Each cell shows the number of detected nearby networks on that channel.</p>
        <div className={`grid gap-3 ${d?.band === '5 GHz' ? 'grid-cols-4 sm:grid-cols-8' : 'grid-cols-3'}`}>
          {candidates.map((ch) => {
            const isActive = d?.currentChannel === ch;
            const isTarget = ai?.recommendedChannel === ch;
            const cnt = nearbyByChannel[ch] || 0;
            const scoreEntry = (ai?.scoredChannels || []).find((s) => s.channel === ch);
            return (
              <div key={ch} className={`p-3 rounded-xl border text-center transition-all ${
                isActive ? 'border-violet-300 bg-violet-50 shadow-sm' :
                isTarget ? 'border-emerald-200 bg-emerald-50' :
                'border-slate-200 bg-slate-50'
              }`}>
                <p className={`text-sm font-bold ${isActive ? 'text-violet-700' : isTarget ? 'text-emerald-700' : 'text-slate-500'}`}>
                  Ch {ch}
                </p>
                <p className={`text-[10px] font-semibold mt-0.5 ${isActive ? 'text-violet-500' : isTarget ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {isActive ? 'Active' : isTarget ? 'AI Target' : 'Available'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">{cnt > 0 ? `${cnt} net${cnt > 1 ? 's' : ''}` : 'Clear'}</p>
                {scoreEntry && <p className="text-[10px] font-mono text-slate-400">Score: {scoreEntry.score}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info footer */}
      <div className="p-4 bg-violet-50 rounded-xl border border-violet-100 flex items-start gap-3 text-xs text-violet-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Channel recommendations are generated by a rule-based interference scoring engine. The algorithm
          counts co-channel and adjacent-channel network density and signal strength, then ranks candidates by lowest total interference score.
          This is a read-only analysis — no router configuration is modified.
        </span>
      </div>
    </div>
  );
}
