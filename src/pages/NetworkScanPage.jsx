import React, { useState } from 'react';
import {
  ScanLine, RefreshCw, Wifi, WifiOff, Signal, Shield, Radio,
  AlertCircle, CheckCircle2, AlertTriangle, Info, Search, X,
  Filter,
} from 'lucide-react';
import { getFullMetrics } from '../services/networkApi.js';

function signalLabel(dbm) {
  if (dbm == null) return 'Unknown';
  if (dbm >= -50) return 'Excellent';
  if (dbm >= -60) return 'Good';
  if (dbm >= -70) return 'Fair';
  return 'Weak';
}

function signalColor(dbm) {
  if (dbm == null) return 'text-slate-400';
  if (dbm >= -60) return 'text-emerald-600';
  if (dbm >= -70) return 'text-amber-500';
  return 'text-rose-500';
}

function SignalBars({ dbm }) {
  const bars = [dbm >= -75, dbm >= -65, dbm >= -55, dbm >= -48];
  return (
    <div className="flex items-end gap-0.5 h-4">
      {bars.map((on, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-sm ${on ? 'bg-violet-500' : 'bg-slate-200'}`}
          style={{ height: `${(i + 1) * 4}px` }}
        />
      ))}
    </div>
  );
}

export default function NetworkScanPage({ data, backendOnline }) {
  const [scanning, setScanning] = useState(false);
  const [scanData, setScanData] = useState(data);
  const [lastScan, setLastScan] = useState(data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all | 2.4 | 5 | strong | weak
  const [searchQ, setSearchQ] = useState('');

  const d = scanData || data;
  const networks = d?.nearbyNetworks || [];

  async function handleScan() {
    if (scanning) return;
    setScanning(true);
    setError(null);
    try {
      const { ok, data: fresh } = await getFullMetrics();
      if (ok && fresh?.ok) {
        setScanData(fresh);
        setLastScan(new Date().toLocaleTimeString());
      } else {
        setError('Scan completed but no network data was returned. Make sure the backend is running.');
      }
    } catch {
      setError('Unable to reach the backend. Run npm run dev:all to start both servers.');
    } finally {
      setScanning(false);
    }
  }

  // Filter + search
  const filtered = networks.filter((n) => {
    const q = searchQ.trim().toLowerCase();
    if (q && !(n.ssid || '').toLowerCase().includes(q) && !String(n.channel || '').includes(q) && !(n.band || '').toLowerCase().includes(q)) return false;
    if (filter === '2.4' && n.band !== '2.4 GHz') return false;
    if (filter === '5'   && n.band !== '5 GHz')   return false;
    if (filter === 'strong' && (n.signalDbm == null || n.signalDbm < -60)) return false;
    if (filter === 'weak'   && (n.signalDbm == null || n.signalDbm >= -70)) return false;
    return true;
  });

  // Summary stats
  const networks24 = networks.filter((n) => n.band === '2.4 GHz').length;
  const networks5  = networks.filter((n) => n.band === '5 GHz').length;
  const strongest  = networks.reduce((best, n) => (n.signalDbm != null && (best == null || n.signalDbm > best.signalDbm)) ? n : best, null);

  // Most congested channel among 2.4GHz
  const chCount = {};
  networks.filter(n => n.channel).forEach(n => { chCount[n.channel] = (chCount[n.channel] || 0) + 1; });
  const mostCongested = Object.entries(chCount).sort((a, b) => b[1] - a[1])[0];

  const FILTERS = [
    { id: 'all',    label: 'All' },
    { id: '2.4',   label: '2.4 GHz' },
    { id: '5',     label: '5 GHz' },
    { id: 'strong',label: 'Strong Signal' },
    { id: 'weak',  label: 'Weak Signal' },
  ];

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5 min-w-0">
      {/* Page title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-violet-50 border border-violet-100">
              <ScanLine className="w-5 h-5 text-violet-600" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-800">Network Scan</h1>
            {d?.isFallback && (
              <span className="px-2 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full uppercase">Demo Data</span>
            )}
          </div>
          <p className="text-sm text-slate-500 ml-0">Discover and analyze nearby Wi-Fi networks</p>
        </div>
        <div className="flex items-center gap-2">
          {lastScan && <span className="text-xs text-slate-400">Last scan: {lastScan}</span>}
          <button
            onClick={handleScan}
            disabled={scanning || !backendOnline}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              scanning || !backendOnline
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white hover:shadow-md active:scale-[0.98]'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning…' : 'Scan Networks'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Current connection */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 mb-3">Current Connection</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            ['SSID', d?.ssid || 'Unavailable'],
            ['Band', d?.band || 'Unavailable'],
            ['Channel', d?.currentChannel ? `Ch ${d.currentChannel}` : 'Unavailable'],
            ['Signal', d?.signalDbm != null ? `${d.signalDbm} dBm` : 'Unavailable'],
            ['Link Speed', d?.rxRate != null ? `${d.rxRate} Mbps` : 'Unavailable'],
            ['Radio', d?.radioType || 'Unavailable'],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{k}</p>
              <p className="text-sm font-bold text-slate-700 truncate">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Networks Found',      value: networks.length,                  color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-100' },
          { label: '2.4 GHz Networks',    value: networks24,                       color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100'   },
          { label: '5 GHz Networks',      value: networks5,                        color: 'text-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-100'   },
          { label: 'Strongest Signal',    value: strongest ? `${strongest.signalDbm} dBm` : '—',  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Most Congested Ch',   value: mostCongested ? `Ch ${mostCongested[0]} (${mostCongested[1]} nets)` : '—', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className={`p-4 rounded-2xl border ${border} ${bg} flex flex-col gap-1`}>
            <p className="text-[11px] font-semibold text-slate-500">{label}</p>
            <p className={`text-lg font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Nearby networks table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Nearby Networks</h2>
            <p className="text-xs text-slate-400 mt-0.5">{filtered.length} of {networks.length} networks shown</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search SSID, channel…"
                className="bg-transparent outline-none text-slate-700 placeholder:text-slate-400 w-28"
              />
              {searchQ && <button onClick={() => setSearchQ('')}><X className="w-3 h-3 text-slate-400" /></button>}
            </div>
            {/* Filters */}
            <div className="flex items-center gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors border ${
                    filter === f.id
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {networks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="p-4 bg-slate-100 rounded-2xl">
              <WifiOff className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">No networks found</p>
            <p className="text-xs text-slate-400">
              {backendOnline === false
                ? 'Start the backend server to enable network scanning.'
                : 'Click "Scan Networks" to discover nearby Wi-Fi networks.'}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No networks match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3">Network / SSID</th>
                  <th className="text-left px-4 py-3">Signal</th>
                  <th className="text-left px-4 py-3">Channel</th>
                  <th className="text-left px-4 py-3">Band</th>
                  <th className="text-left px-4 py-3">Security</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((n, i) => {
                  const isCurrent = n.ssid === d?.ssid;
                  const interference = (n.signalDbm != null && n.signalDbm >= -60) && !isCurrent;
                  return (
                    <tr key={i} className={`hover:bg-slate-50 transition-colors ${isCurrent ? 'bg-violet-50/50' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${isCurrent ? 'bg-violet-100' : 'bg-slate-100'}`}>
                            <Wifi className={`w-3.5 h-3.5 ${isCurrent ? 'text-violet-600' : 'text-slate-400'}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700">{n.ssid || 'Hidden Network'}</p>
                            {n.bssid && <p className="text-[11px] text-slate-400 font-mono">{n.bssid}</p>}
                          </div>
                          {isCurrent && <span className="px-1.5 py-0.5 text-[10px] font-bold text-violet-700 bg-violet-100 rounded-full">Connected</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <SignalBars dbm={n.signalDbm} />
                          <span className={`text-xs font-semibold ${signalColor(n.signalDbm)}`}>
                            {n.signalDbm != null ? `${n.signalDbm} dBm` : 'N/A'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{signalLabel(n.signalDbm)}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                        {n.channel != null ? `Ch ${n.channel}` : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                          n.band === '5 GHz'
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-100'
                            : n.band === '2.4 GHz'
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {n.band || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Shield className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-600">{n.authentication || n.encryption || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isCurrent ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : interference ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full w-fit">
                            <AlertTriangle className="w-3 h-3" /> Strong
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Nearby</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
          <Info className="w-3 h-3" />
          Data from Windows <code className="font-mono bg-slate-100 px-1 rounded">netsh wlan show networks mode=bssid</code>. Only cached networks are shown.
        </div>
      </div>
    </div>
  );
}
