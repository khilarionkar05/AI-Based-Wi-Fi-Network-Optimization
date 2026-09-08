/**
 * AI Wi-Fi Optimizer — Local Backend Server
 * Node.js / Express — Windows-only network data collection
 * All operations are READ-ONLY. No router configuration is performed.
 */

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import https from 'https';

const execAsync = promisify(exec);
const app = express();
const PORT = 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Run a Windows shell command safely (read-only commands only). */
async function runCmd(command) {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 15000,
      windowsHide: true,
      shell: 'cmd.exe',
    });
    return { ok: true, out: stdout || '' };
  } catch (err) {
    return { ok: false, out: err.stdout || '', err: err.message };
  }
}

/**
 * Parse `netsh wlan show interfaces` output into a structured object.
 */
function parseWlanInterfaces(raw) {
  const interfaces = [];
  const blocks = raw.split(/\r?\n\r?\n/).filter((b) => b.trim().length > 0);

  for (const block of blocks) {
    if (!block.includes('SSID')) continue;
    const iface = {};
    const lines = block.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s+(.+?)\s*:\s*(.+)$/);
      if (!m) continue;
      const key = m[1].trim().toLowerCase();
      const val = m[2].trim();
      if (key === 'name') iface.name = val;
      else if (key === 'description') iface.description = val;
      else if (key === 'guid') iface.guid = val;
      else if (key === 'physical address') iface.mac = val;
      else if (key === 'state') iface.state = val;
      else if (key === 'ssid') iface.ssid = val;
      else if (key === 'bssid') iface.bssid = val;
      else if (key === 'network type') iface.networkType = val;
      else if (key === 'radio type') iface.radioType = val;
      else if (key === 'authentication') iface.authentication = val;
      else if (key === 'cipher') iface.cipher = val;
      else if (key === 'connection mode') iface.connectionMode = val;
      else if (key === 'channel') iface.channel = parseInt(val, 10) || null;
      else if (key === 'receive rate (mbps)') iface.rxRate = parseFloat(val) || null;
      else if (key === 'transmit rate (mbps)') iface.txRate = parseFloat(val) || null;
      else if (key === 'signal') {
        iface.signalPercent = parseInt(val, 10) || null;
        // Convert Windows signal% to approximate dBm: dBm = (signal% / 2) - 100
        iface.signalDbm = iface.signalPercent != null
          ? Math.round((iface.signalPercent / 2) - 100)
          : null;
      } else if (key === 'profile') iface.profile = val;
    }
    if (iface.ssid) interfaces.push(iface);
  }
  return interfaces;
}

/**
 * Parse `netsh wlan show networks mode=bssid` output.
 * Returns array of nearby network objects.
 */
function parseNearbyNetworks(raw) {
  const networks = [];
  const blocks = raw.split(/SSID\s+\d+\s*:/i).slice(1);

  for (const block of blocks) {
    const net = {};
    const lines = block.split(/\r?\n/);

    // First non-empty line is SSID value
    for (const line of lines) {
      if (line.trim()) { net.ssid = line.trim(); break; }
    }

    for (const line of lines) {
      const m = line.match(/^\s+(.+?)\s*:\s*(.+)$/);
      if (!m) continue;
      const key = m[1].trim().toLowerCase();
      const val = m[2].trim();
      if (key === 'network type') net.networkType = val;
      else if (key === 'authentication') net.authentication = val;
      else if (key === 'encryption') net.encryption = val;
      else if (key === 'bssid 1') net.bssid = val;
      else if (key === 'signal') net.signalPercent = parseInt(val, 10) || 0;
      else if (key === 'radio type') net.radioType = val;
      else if (key === 'channel') net.channel = parseInt(val, 10) || null;
    }

    // Convert signal% → dBm
    net.signalDbm = net.signalPercent != null
      ? Math.round((net.signalPercent / 2) - 100)
      : null;

    // Derive band from channel number
    if (net.channel != null) {
      net.band = net.channel <= 14 ? '2.4 GHz' : '5 GHz';
    } else {
      net.band = 'Unknown';
    }

    if (net.ssid) networks.push(net);
  }
  return networks;
}

/**
 * Parse `arp -a` output to get local ARP table (device discovery).
 */
function parseArpTable(raw) {
  const devices = [];
  const lines = raw.split(/\r?\n/);
  let currentInterface = null;

  for (const line of lines) {
    const ifaceMatch = line.match(/Interface:\s+([\d.]+)/i);
    if (ifaceMatch) { currentInterface = ifaceMatch[1]; continue; }

    const entryMatch = line.match(/([\d.]+)\s+([\da-fA-F-]+)\s+(dynamic|static)/i);
    if (entryMatch) {
      const ip = entryMatch[1];
      const mac = entryMatch[2].replace(/-/g, ':').toUpperCase();
      const type = entryMatch[3].toLowerCase();

      // Skip multicast/broadcast
      if (ip.startsWith('224.') || ip.startsWith('239.') || ip === '255.255.255.255') continue;

      devices.push({ ip, mac, type, via: currentInterface });
    }
  }
  return devices;
}

/**
 * Measure HTTP/S latency to a reliable endpoint.
 * Returns round-trip time in ms or null on failure.
 */
function measureLatency(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      res.resume(); // consume response body
      const elapsed = Date.now() - start;
      resolve(elapsed);
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/**
 * Run multiple latency samples and return average + packet loss %.
 */
async function sampleLatency(samples = 4) {
  const targets = [
    'http://connectivitycheck.gstatic.com/generate_204',
    'http://www.msftconnecttest.com/connecttest.txt',
  ];
  const results = [];

  for (let i = 0; i < samples; i++) {
    const url = targets[i % targets.length];
    const ms = await measureLatency(url);
    results.push(ms);
  }

  const successes = results.filter((r) => r !== null);
  const packetLoss = Math.round(((results.length - successes.length) / results.length) * 100);
  const avg = successes.length > 0
    ? Math.round(successes.reduce((a, b) => a + b, 0) / successes.length)
    : null;
  const min = successes.length > 0 ? Math.min(...successes) : null;
  const max = successes.length > 0 ? Math.max(...successes) : null;

  return { avg, min, max, packetLoss, samples: results.length, reachable: successes.length > 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI / ML — Lightweight Channel Optimization Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score each candidate channel based on nearby network data.
 * Returns scored channel list sorted best → worst.
 *
 * Algorithm:
 *  1. Count networks on each channel (direct occupancy)
 *  2. Add weighted overlap penalty for adjacent channels (2.4 GHz has 5-channel overlap radius)
 *  3. Penalize by average signal strength of occupants (stronger neighbours = more interference)
 *  4. Recommend the channel with the lowest total interference score
 *
 * This is a lightweight heuristic suitable for a B.Tech AIML project —
 * explainable, data-driven, and grounded in real RF overlap principles.
 */
function aiChannelOptimizer(nearbyNetworks, currentChannel, band) {
  const is24 = band === '2.4 GHz';
  const candidates = is24 ? [1, 6, 11] : [36, 40, 44, 48, 149, 153, 157, 161];

  // Build channel → networks mapping
  const channelMap = {};
  for (const net of nearbyNetworks) {
    if (!net.channel) continue;
    if (!channelMap[net.channel]) channelMap[net.channel] = [];
    channelMap[net.channel].push(net);
  }

  // Score each candidate
  const scored = candidates.map((ch) => {
    let score = 0;
    let reasons = [];
    const overlapRadius = is24 ? 4 : 0; // 2.4 GHz channels overlap ±4

    // Count direct & adjacent occupants
    const directCount = (channelMap[ch] || []).length;
    let adjacentCount = 0;

    for (const [occupiedCh, nets] of Object.entries(channelMap)) {
      const dist = Math.abs(parseInt(occupiedCh, 10) - ch);
      if (dist === 0) {
        // Direct co-channel interference — highest penalty
        const avgSignal = nets.reduce((s, n) => s + Math.abs(n.signalDbm || -80), 0) / nets.length;
        score += nets.length * 30 + (avgSignal * 0.3);
      } else if (dist <= overlapRadius) {
        // Adjacent channel interference — scaled by distance
        const penalty = Math.max(0, overlapRadius - dist + 1) / overlapRadius;
        score += nets.length * 15 * penalty;
        adjacentCount += nets.length;
      }
    }

    if (directCount > 0) {
      reasons.push(`${directCount} network${directCount > 1 ? 's' : ''} on Ch ${ch}`);
    }
    if (adjacentCount > 0) {
      reasons.push(`${adjacentCount} adjacent-channel neighbour${adjacentCount > 1 ? 's' : ''}`);
    }
    if (directCount === 0 && adjacentCount === 0) {
      reasons.push('No overlapping networks detected');
    }

    return { channel: ch, score: Math.round(score), directCount, adjacentCount, reasons };
  });

  scored.sort((a, b) => a.score - b.score);

  const best = scored[0];
  const current = scored.find((s) => s.channel === currentChannel) || {
    channel: currentChannel,
    score: 999,
    directCount: 0,
    adjacentCount: 0,
    reasons: ['Current channel not in standard non-overlapping set'],
  };

  // Calculate estimated congestion % for current channel
  const congestionPct = Math.min(100, Math.round((current.score / 120) * 100));
  const improvementPct = current.score > 0
    ? Math.round(((current.score - best.score) / Math.max(current.score, 1)) * 100)
    : 0;

  // Determine status
  let statusColor = 'emerald';
  let statusTag = 'Peak Network Health';
  let issue = 'Clear channel spectrum identified';
  if (best.channel !== currentChannel) {
    if (current.score > 60) {
      statusColor = 'rose';
      statusTag = 'Interference Warning';
      issue = 'Severe channel congestion detected';
    } else {
      statusColor = 'amber';
      statusTag = 'Optimization Recommended';
      issue = 'Channel congestion detected';
    }
  }

  const issueDetail = best.channel !== currentChannel
    ? `Channel ${currentChannel}: ${current.reasons.join(', ')}. ` +
      `Channel ${best.channel} has the lowest interference score (${best.score}) ` +
      `among ${is24 ? '2.4 GHz' : '5 GHz'} non-overlapping channels.`
    : `Channel ${currentChannel} is already operating at optimal spectrum conditions.`;

  const expectedResult = best.channel !== currentChannel
    ? `~${improvementPct}% interference reduction, improved stability`
    : 'Maximum bandwidth & ultra-low latency maintained';

  return {
    currentChannel,
    recommendedChannel: best.channel,
    congestion: congestionPct,
    issue,
    issueDetail,
    expectedResult,
    statusColor,
    statusTag,
    scoredChannels: scored,
    nearbyCount: nearbyNetworks.length,
  };
}

/**
 * Compute overall network health score (0–100) from available metrics.
 * Factors: signal strength, latency, packet loss, link speed.
 */
function computeHealthScore({ signalDbm, latencyMs, packetLoss, rxRate }) {
  let score = 100;

  // Signal penalty
  if (signalDbm != null) {
    if (signalDbm < -80) score -= 40;
    else if (signalDbm < -70) score -= 25;
    else if (signalDbm < -60) score -= 15;
    else if (signalDbm < -50) score -= 5;
  } else {
    score -= 10;
  }

  // Latency penalty
  if (latencyMs != null) {
    if (latencyMs > 200) score -= 30;
    else if (latencyMs > 100) score -= 20;
    else if (latencyMs > 50) score -= 10;
    else if (latencyMs > 30) score -= 4;
  } else {
    score -= 10;
  }

  // Packet loss penalty
  if (packetLoss != null) {
    score -= Math.min(30, packetLoss * 3);
  }

  // Speed bonus (relative to 100 Mbps baseline)
  if (rxRate != null && rxRate >= 100) {
    score = Math.min(100, score + 2);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─────────────────────────────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/network/status — overall connection state */
app.get('/api/network/status', async (req, res) => {
  try {
    const result = await runCmd('netsh wlan show interfaces');
    const ifaces = parseWlanInterfaces(result.out);
    const connected = ifaces.find((i) => i.state === 'connected');

    res.json({
      ok: true,
      connected: !!connected,
      ssid: connected?.ssid || null,
      state: connected?.state || 'disconnected',
      interface: connected?.name || null,
      radioType: connected?.radioType || null,
      authentication: connected?.authentication || null,
      connectionMode: connected?.connectionMode || null,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** GET /api/network/interfaces — all Wi-Fi interface details */
app.get('/api/network/interfaces', async (req, res) => {
  try {
    const result = await runCmd('netsh wlan show interfaces');
    const ifaces = parseWlanInterfaces(result.out);
    res.json({ ok: true, interfaces: ifaces, raw: result.ok ? undefined : result.out });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** GET /api/network/wifi — current Wi-Fi connection details */
app.get('/api/network/wifi', async (req, res) => {
  try {
    const result = await runCmd('netsh wlan show interfaces');
    if (!result.ok) {
      return res.json({ ok: false, error: 'netsh unavailable', isFallback: true });
    }

    const ifaces = parseWlanInterfaces(result.out);
    const connected = ifaces.find((i) => i.state === 'connected');

    if (!connected) {
      return res.json({
        ok: true,
        connected: false,
        message: 'No Wi-Fi interface currently connected',
        isFallback: false,
      });
    }

    res.json({
      ok: true,
      connected: true,
      ssid: connected.ssid,
      bssid: connected.bssid,
      channel: connected.channel,
      signalPercent: connected.signalPercent,
      signalDbm: connected.signalDbm,
      rxRate: connected.rxRate,
      txRate: connected.txRate,
      radioType: connected.radioType,
      authentication: connected.authentication,
      band: connected.channel
        ? (connected.channel <= 14 ? '2.4 GHz' : '5 GHz')
        : 'Unknown',
      isFallback: false,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** GET /api/network/scan — nearby Wi-Fi networks */
app.get('/api/network/scan', async (req, res) => {
  try {
    const result = await runCmd('netsh wlan show networks mode=bssid');
    if (!result.ok) {
      return res.json({ ok: false, error: 'Scan unavailable', networks: [], isFallback: true });
    }

    const networks = parseNearbyNetworks(result.out);
    res.json({ ok: true, networks, count: networks.length, isFallback: false });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, networks: [] });
  }
});

/** GET /api/network/latency — real latency measurement */
app.get('/api/network/latency', async (req, res) => {
  try {
    const latency = await sampleLatency(4);
    res.json({ ok: true, ...latency, isFallback: false });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, isFallback: true });
  }
});

/** GET /api/network/devices — ARP table device discovery */
app.get('/api/network/devices', async (req, res) => {
  try {
    const result = await runCmd('arp -a');
    if (!result.ok) {
      return res.json({ ok: false, error: 'ARP unavailable', devices: [], isFallback: true });
    }

    const devices = parseArpTable(result.out);
    res.json({ ok: true, devices, count: devices.length, isFallback: false });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, devices: [], isFallback: true });
  }
});

/**
 * GET /api/network/metrics — combined full analysis
 * Collects all data, runs AI optimizer, returns complete dashboard payload.
 */
app.get('/api/network/metrics', async (req, res) => {
  try {
    // Run all data collection in parallel
    const [wifiResult, scanResult, latencyResult, arpResult] = await Promise.all([
      runCmd('netsh wlan show interfaces'),
      runCmd('netsh wlan show networks mode=bssid'),
      sampleLatency(4),
      runCmd('arp -a'),
    ]);

    const ifaces = parseWlanInterfaces(wifiResult.out);
    const connected = ifaces.find((i) => i.state === 'connected');
    const nearbyNetworks = parseNearbyNetworks(scanResult.out);
    const devices = parseArpTable(arpResult.out);

    // ── Current Wi-Fi metrics ──
    const signalDbm = connected?.signalDbm ?? null;
    const rxRate = connected?.rxRate ?? null;
    const currentChannel = connected?.channel ?? null;
    const band = currentChannel
      ? (currentChannel <= 14 ? '2.4 GHz' : '5 GHz')
      : '2.4 GHz';

    // ── AI Channel Optimization ──
    const aiResult = (currentChannel && nearbyNetworks.length > 0)
      ? aiChannelOptimizer(nearbyNetworks, currentChannel, band)
      : null;

    // ── Health Score ──
    const healthScore = computeHealthScore({
      signalDbm,
      latencyMs: latencyResult.avg,
      packetLoss: latencyResult.packetLoss,
      rxRate,
    });

    // ── Determine isFallback ──
    const isFallback = !connected;

    res.json({
      ok: true,
      isFallback,
      timestamp: new Date().toISOString(),
      // Connection
      connected: !!connected,
      ssid: connected?.ssid || null,
      band,
      radioType: connected?.radioType || null,
      authentication: connected?.authentication || null,
      // Metrics
      signalDbm,
      signalPercent: connected?.signalPercent ?? null,
      rxRate,
      txRate: connected?.txRate ?? null,
      latency: latencyResult,
      healthScore,
      // Channel
      currentChannel,
      nearbyNetworks,
      nearbyCount: nearbyNetworks.length,
      // AI
      aiRecommendation: aiResult,
      // Devices
      devices,
      deviceCount: devices.length,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, isFallback: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  AI Wi-Fi Optimizer API`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Listening on http://localhost:${PORT}`);
  console.log(`  Endpoints:`);
  console.log(`    GET /api/network/status`);
  console.log(`    GET /api/network/interfaces`);
  console.log(`    GET /api/network/wifi`);
  console.log(`    GET /api/network/scan`);
  console.log(`    GET /api/network/latency`);
  console.log(`    GET /api/network/devices`);
  console.log(`    GET /api/network/metrics`);
  console.log(`  ─────────────────────────────────────────\n`);
});
