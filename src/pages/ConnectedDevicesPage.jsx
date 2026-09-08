import React, { useState } from 'react';
import {
  Layers, RefreshCw, Laptop, Smartphone, Tv, Tablet, Wifi,
  Search, X, AlertCircle, Info, CheckCircle2, Filter,
} from 'lucide-react';
import { getFullMetrics } from '../services/networkApi.js';

function guessDeviceType(ip, mac) {
  if (!mac) return 'unknown';
  const phoneOUIs = ['AC:37:43', 'A4:C3:F0', '98:01:A7', 'F8:E0:79', 'BC:9F:EF'];
  const tvOUIs    = ['8C:57:9B', '00:24:32', 'FC:A1:83', 'B4:7C:9C'];
  if (phoneOUIs.some((o) => mac.startsWith(o))) return 'phone';
  if (tvOUIs.some((o) => mac.startsWith(o))) return 'tv';
  if (ip.endsWith('.1') || ip.endsWith('.254')) return 'router';
  return 'laptop';
}

function DeviceRow({ device, idx }) {
  const type = guessDeviceType(device.ip, device.mac);
  const isGateway = device.ip?.endsWith('.1') || device.ip?.endsWith('.254');

  const configs = {
    phone:   { bg: 'bg-emerald-50', border: 'border-emerald-100', color: 'text-emerald-600', Icon: Smartphone },
    tv:      { bg: 'bg-purple-50',  border: 'border-purple-100',  color: 'text-purple-600',  Icon: Tv         },
    tablet:  { bg: 'bg-blue-50',    border: 'border-blue-100',    color: 'text-blue-600',    Icon: Tablet     },
    router:  { bg: 'bg-amber-50',   border: 'border-amber-100',   color: 'text-amber-600',   Icon: Wifi       },
    default: { bg: 'bg-indigo-50',  border: 'border-indigo-100',  color: 'text-indigo-600',  Icon: Laptop     },
  };
  const c = configs[type] || configs.default;

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${c.bg} border ${c.border} shrink-0`}>
            <c.Icon className={`w-4 h-4 ${c.color}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {isGateway ? 'Gateway / Router' : `Device ${idx + 1}`}
            </p>
            <p className="text-[11px] text-slate-400 capitalize">{isGateway ? 'Network Gateway' : type}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{device.ip}</td>
      <td className="px-4 py-3.5 font-mono text-xs text-violet-600">{device.mac || 'Unavailable'}</td>
      <td className="px-4 py-3.5 text-xs text-slate-500">Unavailable</td>
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
          device.type === 'static'
            ? 'bg-slate-100 text-slate-500 border-slate-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
        }`}>
          {device.type === 'static'
            ? 'Static'
            : <><CheckCircle2 className="w-3 h-3" /> Active</>}
        </span>
      </td>
      <td className="px-4 py-3.5 text-[11px] text-slate-400 font-mono">ARP</td>
    </tr>
  );
}

export default function ConnectedDevicesPage({ data, backendOnline }) {
  const [refreshing, setRefreshing] = useState(false);
  const [localData, setLocalData] = useState(data);
  const [error, setError]         = useState(null);
  const [searchQ, setSearchQ]     = useState('');
  const [filter, setFilter]       = useState('all'); // all | active | static

  const d = localData || data;
  const devices = d?.devices || [];

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const { ok, data: fresh } = await getFullMetrics();
      if (ok && fresh?.ok) {
        setLocalData(fresh);
      } else {
        setError('Could not refresh device list. Ensure the backend is running.');
      }
    } catch {
      setError('Backend unreachable.');
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = devices.filter((dev) => {
    const q = searchQ.trim().toLowerCase();
    if (q && !(dev.ip || '').includes(q) && !(dev.mac || '').toLowerCase().includes(q)) return false;
    if (filter === 'active' && dev.type !== 'dynamic') return false;
    if (filter === 'static' && dev.type !== 'static')  return false;
    return true;
  });

  const activeCount  = devices.filter((d) => d.type === 'dynamic').length;
  const staticCount  = devices.filter((d) => d.type === 'static').length;

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5 min-w-0">
      {/* Page title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
              <Layers className="w-5 h-5 text-indigo-600" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-800">Connected Devices</h1>
            {d?.isFallback && (
              <span className="px-2 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full uppercase">Demo Data</span>
            )}
          </div>
          <p className="text-sm text-slate-500">Monitor devices visible on your local network via ARP table</p>
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
          {refreshing ? 'Refreshing…' : 'Refresh Devices'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Devices Found',  value: devices.length,  color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200' },
          { label: 'Active (ARP)',   value: activeCount,      color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Static Entries', value: staticCount,      color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200'  },
          { label: 'Interface',      value: d?.devices?.[0]?.via || 'N/A', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className={`p-4 rounded-2xl border ${border} ${bg}`}>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-xl font-extrabold ${color} truncate`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Device table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Device List</h2>
            <p className="text-xs text-slate-400 mt-0.5">{filtered.length} of {devices.length} devices</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search IP or MAC…"
                className="bg-transparent outline-none text-slate-700 placeholder:text-slate-400 w-28"
              />
              {searchQ && <button onClick={() => setSearchQ('')}><X className="w-3 h-3 text-slate-400" /></button>}
            </div>
            {['all', 'active', 'static'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors border capitalize ${
                  filter === f
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600'
                }`}
              >
                {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Static'}
              </button>
            ))}
          </div>
        </div>

        {devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="p-4 bg-slate-100 rounded-2xl">
              <Layers className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">No devices detected</p>
            <p className="text-xs text-slate-400 max-w-xs">
              {backendOnline === false
                ? 'Start the backend server to enable ARP device discovery.'
                : 'Click "Refresh Devices" or run a network scan to discover devices.'}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No devices match the current filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3">Device</th>
                  <th className="text-left px-4 py-3">IP Address</th>
                  <th className="text-left px-4 py-3">MAC Address</th>
                  <th className="text-left px-4 py-3">Vendor</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((device, idx) => (
                  <DeviceRow key={idx} device={device} idx={idx} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
          <Info className="w-3 h-3 shrink-0" />
          Device discovery uses the local ARP table (<code className="font-mono bg-slate-100 px-1 rounded">arp -a</code>).
          Only devices that have recently communicated on the network are visible.
          Vendor lookup, hostnames, and real-time usage are not available via ARP.
        </div>
      </div>
    </div>
  );
}
