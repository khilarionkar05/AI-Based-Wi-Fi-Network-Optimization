import React, { useState } from 'react';
import {
  Settings, Monitor, Wifi, Activity, Info, CheckCircle2,
  Clock, RefreshCw, Shield, Code, Cpu,
} from 'lucide-react';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="p-1.5 rounded-lg bg-violet-50 border border-violet-100">
          <Icon className="w-4 h-4 text-violet-600" />
        </div>
        <h2 className="text-sm font-bold text-slate-700">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, note }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {note && <p className="text-xs text-slate-400 mt-0.5">{note}</p>}
      </div>
      <span className="text-sm font-semibold text-slate-600 ml-4 text-right">{value}</span>
    </div>
  );
}

function BadgeRow({ label, value, badge, note }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {note && <p className="text-xs text-slate-400 mt-0.5">{note}</p>}
      </div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge}`}>{value}</span>
    </div>
  );
}

export default function SettingsPage({ data, backendOnline, lastUpdated }) {
  const d = data;

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5 min-w-0">
      {/* Page title */}
      <div className="flex items-center gap-2 mb-1">
        <div className="p-2 rounded-xl bg-violet-50 border border-violet-100">
          <Settings className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-500">Application preferences and monitoring information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* General */}
        <Section title="General" icon={Monitor}>
          <InfoRow label="Application" value="AI Wi-Fi Optimizer" note="B.Tech MDM Final Project" />
          <BadgeRow
            label="Monitoring Status"
            value={backendOnline ? 'Active' : 'Demo Mode'}
            badge={backendOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}
            note="Real-time data collection via local backend"
          />
          <InfoRow label="Auto-Refresh Interval" value="30 seconds" note="Background silent refresh when backend is online" />
          <InfoRow label="Last Updated" value={lastUpdated !== 'Never' ? lastUpdated : '—'} note="Timestamp of last successful data fetch" />
        </Section>

        {/* Network */}
        <Section title="Network" icon={Wifi}>
          <InfoRow label="SSID" value={d?.ssid || 'Not connected'} note="Currently connected Wi-Fi network" />
          <InfoRow label="Band" value={d?.band || 'Unknown'} note="Frequency band in use" />
          <InfoRow label="Channel" value={d?.currentChannel ? `Channel ${d.currentChannel}` : 'Unknown'} note="Active Wi-Fi channel" />
          <InfoRow label="Radio Type" value={d?.radioType || 'Unknown'} note="IEEE 802.11 standard" />
          <InfoRow label="Authentication" value={d?.authentication || 'Unknown'} note="Security protocol" />
          <InfoRow label="Link Speed (Rx)" value={d?.rxRate != null ? `${d.rxRate} Mbps` : 'Unknown'} note="Current receive rate reported by adapter" />
          <InfoRow label="Link Speed (Tx)" value={d?.txRate != null ? `${d.txRate} Mbps` : 'Unknown'} note="Current transmit rate" />
          <InfoRow label="Signal Strength" value={d?.signalDbm != null ? `${d.signalDbm} dBm (${d.signalPercent ?? '?'}%)` : 'Unknown'} note="RSSI from Windows Wi-Fi adapter" />
        </Section>

        {/* Analysis */}
        <Section title="Analysis Engine" icon={Cpu}>
          <BadgeRow
            label="Backend Status"
            value={backendOnline ? 'Online' : 'Offline'}
            badge={backendOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-600'}
            note="Node.js / Express API on localhost:3001"
          />
          <InfoRow label="Channel Optimization" value="Rule-based scoring" note="Co-channel + adjacent-channel interference scoring per candidate" />
          <InfoRow label="Latency Measurement" value="HTTP round-trip (4 samples)" note="Measured via connectivitycheck.gstatic.com & msftconnecttest.com" />
          <InfoRow label="Device Discovery" value="ARP table (arp -a)" note="Read-only, local network only" />
          <InfoRow label="Wi-Fi Data Source" value="netsh wlan show interfaces" note="Windows netsh — read-only, no router modification" />
          <InfoRow label="Network Scan Source" value="netsh wlan show networks mode=bssid" note="Cached nearby network list from Windows" />
          <InfoRow label="Data Mode" value={d?.isFallback ? 'Demo / Fallback' : 'Live'} note={d?.isFallback ? 'Backend not reachable — showing fallback data' : 'Real data from local backend'} />
        </Section>

        {/* Appearance */}
        <Section title="Appearance" icon={Monitor}>
          <BadgeRow label="Theme" value="Light SaaS" badge="bg-violet-50 border-violet-200 text-violet-700" note="White main content, dark navy sidebar" />
          <InfoRow label="Primary Accent" value="Purple / Violet / Indigo" note="Used for interactive elements and AI features" />
          <InfoRow label="Font" value="Inter" note="Loaded from Google Fonts" />
          <InfoRow label="Card Style" value="Rounded 2xl, white, subtle shadow" note="Consistent across all pages" />
          <div className="px-5 py-3.5">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              Appearance settings are informational. Theme customization is not implemented in this version.
            </p>
          </div>
        </Section>

      </div>

      {/* About */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border border-violet-200 p-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-2xl border border-violet-200 shadow-sm shrink-0">
            <Wifi className="w-6 h-6 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-800 mb-1">About AI Wi-Fi Optimizer</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-600">
              {[
                ['Version',       'v1.0.0'],
                ['Project Type',  'B.Tech MDM Final Year Project'],
                ['Frontend',      'React 19 + Vite 8 + Tailwind CSS 3'],
                ['Backend',       'Node.js + Express (localhost:3001)'],
                ['Charts',        'Recharts'],
                ['Icons',         'Lucide React'],
                ['Data Source',   'Windows netsh / arp — Read-only'],
                ['Routing',       'State-based (no React Router)'],
                ['External APIs', 'None — fully local application'],
                ['ML/AI',         'Rule-based interference scoring algorithm'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-2">
                  <span className="text-slate-400 shrink-0">{k}:</span>
                  <span className="font-semibold text-slate-700">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              This application collects Wi-Fi network data locally using read-only OS commands.
              No data is transmitted to external servers. No router configuration is modified.
              All analysis is performed locally on the host machine.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
