/**
 * networkApi.js — Frontend API service layer
 * All requests go to /api (proxied to localhost:3001 in dev, or same-origin in prod).
 * Every function handles errors gracefully and marks fallback data clearly.
 */

const BASE = '/api/network';

/**
 * Generic fetch helper — returns { ok, data, error, isFallback }
 */
async function apiFetch(path, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { ok: true, data, error: null };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err.name === 'AbortError';
    return {
      ok: false,
      data: null,
      error: isTimeout ? 'Request timed out' : err.message,
      backendDown: true,
    };
  }
}

/** Check if backend is reachable */
export async function checkBackend() {
  return apiFetch('/status', 4000);
}

/** GET /api/network/status */
export async function getNetworkStatus() {
  return apiFetch('/status');
}

/** GET /api/network/wifi — current Wi-Fi interface info */
export async function getWifiInfo() {
  return apiFetch('/wifi');
}

/** GET /api/network/interfaces — all interfaces */
export async function getInterfaces() {
  return apiFetch('/interfaces');
}

/** GET /api/network/scan — nearby Wi-Fi networks */
export async function scanNetworks() {
  return apiFetch('/scan', 20000);
}

/** GET /api/network/latency — real latency measurement */
export async function measureLatency() {
  return apiFetch('/latency', 15000);
}

/** GET /api/network/devices — ARP device discovery */
export async function getDevices() {
  return apiFetch('/devices');
}

/**
 * GET /api/network/metrics — full combined analysis
 * This is the primary call used by "Run Analysis".
 */
export async function getFullMetrics() {
  return apiFetch('/metrics', 30000);
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK DATA
// Shown when backend is unreachable. Always labelled as demo data.
// ─────────────────────────────────────────────────────────────────────────────

export const FALLBACK_METRICS = {
  isFallback: true,
  connected: true,
  ssid: 'Demo Network',
  band: '2.4 GHz',
  radioType: '802.11ax (Wi-Fi 6)',
  signalDbm: -48,
  signalPercent: 84,
  rxRate: 92,
  txRate: 72,
  latency: { avg: 18, min: 14, max: 24, packetLoss: 0, reachable: true },
  healthScore: 94,
  currentChannel: 6,
  nearbyCount: 7,
  nearbyNetworks: [
    { ssid: 'Neighbor_Net_1', channel: 6, signalDbm: -62, band: '2.4 GHz', authentication: 'WPA2' },
    { ssid: 'Neighbor_Net_2', channel: 6, signalDbm: -70, band: '2.4 GHz', authentication: 'WPA2' },
    { ssid: 'Neighbor_Net_3', channel: 1, signalDbm: -68, band: '2.4 GHz', authentication: 'WPA3' },
    { ssid: 'Neighbor_Net_4', channel: 11, signalDbm: -74, band: '2.4 GHz', authentication: 'WPA2' },
    { ssid: 'Neighbor_Net_5', channel: 6, signalDbm: -65, band: '2.4 GHz', authentication: 'WPA2' },
    { ssid: 'Neighbor_5G_1', channel: 36, signalDbm: -58, band: '5 GHz', authentication: 'WPA3' },
    { ssid: 'Neighbor_5G_2', channel: 149, signalDbm: -72, band: '5 GHz', authentication: 'WPA2' },
  ],
  aiRecommendation: {
    currentChannel: 6,
    recommendedChannel: 11,
    congestion: 32,
    issue: 'Channel congestion detected',
    issueDetail:
      'Channel 6: 3 networks on Ch 6, 0 adjacent-channel neighbours. Channel 11 has the lowest interference score (0) among 2.4 GHz non-overlapping channels.',
    expectedResult: '~75% interference reduction, improved stability',
    statusColor: 'amber',
    statusTag: 'Optimization Recommended',
    scoredChannels: [
      { channel: 11, score: 0, directCount: 1, adjacentCount: 0, reasons: ['1 network on Ch 11'] },
      { channel: 1, score: 15, directCount: 1, adjacentCount: 0, reasons: ['1 network on Ch 1'] },
      { channel: 6, score: 90, directCount: 3, adjacentCount: 0, reasons: ['3 networks on Ch 6'] },
    ],
    nearbyCount: 7,
  },
  devices: [
    { ip: '192.168.1.1', mac: 'AA:BB:CC:DD:EE:01', type: 'dynamic', via: '192.168.1.100' },
    { ip: '192.168.1.104', mac: 'AA:BB:CC:DD:EE:02', type: 'dynamic', via: '192.168.1.100' },
    { ip: '192.168.1.112', mac: 'AA:BB:CC:DD:EE:03', type: 'dynamic', via: '192.168.1.100' },
    { ip: '192.168.1.120', mac: 'AA:BB:CC:DD:EE:04', type: 'dynamic', via: '192.168.1.100' },
  ],
  deviceCount: 4,
  timestamp: new Date().toISOString(),
};
