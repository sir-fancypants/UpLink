# UpLink

A lightweight, dependency-free JavaScript library for monitoring real internet connectivity in the browser.

Unlike `navigator.onLine` and the native `online`/`offline` window events — which only detect whether a network interface is present — UpLink actively pings remote endpoints to verify actual internet access. This catches common failure cases like being connected to a router with no WAN access, sitting behind a captive portal, or having an intermittent mobile signal.

---

## What's new in v3.1.0

- **JSDoc throughout** — every public method, property, getter, and `debug` utility is now fully typed with JSDoc. IDE autocompletion, inline docs, and type checking all work out of the box with no separate type declaration file needed.
- **`noCors` config option documented** — the `noCors` option is now formally documented in the API reference. Use it when pointing UpLink at a custom endpoint that does not serve CORS headers. Note that enabling `noCors` disables data-usage tracking because the browser delivers an opaque response.
- **`debug.dataUsage()` added to the debug namespace** — previously accessible only via `debug.state()`, data usage is now directly callable as `UpLink.debug.dataUsage()`.
- **`debug.state()` includes `dataUsage`** — the state snapshot now includes the full data usage report inline.
- **Bug fixes** — a stray `console.log` that was leaking data-usage output on every stability check has been removed. The `destroy()` abort-order issue (where the main `AbortController` could be nulled before listeners were removed) has been corrected. The `noCors` + data tracking silent-corruption bug (where opaque responses still incremented usage counters) has been fixed at the call site.

---

## Features

- 📦 Zero dependencies
- 🔒 Fully encapsulated state — enforced by private class fields
- 🌐 Dual endpoint with automatic fallback and 60-second recovery checks
- 📡 Hybrid monitoring — active polling confirmed by native browser events
- 📶 Signal bars (0–5) and named condition states
- ⚡ Latency, jitter, and packet-loss tracking over a rolling 10-ping window
- 🔋 Tab-aware — pauses when the tab is hidden, resumes when visible
- 🎯 Event-driven API built on native `EventTarget`
- ⚙️ Fully configurable thresholds, intervals, and endpoints
- 🛠 Built-in debug namespace for development and testing
- 📝 Full JSDoc coverage for IDE autocompletion and inline documentation

---

## Browser Support

UpLink uses the following modern browser APIs:

| Feature | Chrome | Firefox | Safari |
|---|---|---|---|
| Private class fields (`#field`) | 74 | 90 | 14.1 (2021) |
| `AbortController` | 66 | 57 | 12.1 (2018) |
| `fetch` with `no-cors` | 42 | 39 | 10.1 (2016) |
| `EventTarget` constructor | 64 | 59 | 14 (2020) |
| `document.visibilityState` | 33 | 18 | 7 (2013) |

**Effective minimum:** all modern browsers released after mid-2021. Not compatible with Internet Explorer.

---

## Installation

Copy `UpLink.js` into your project and import it as an ES module:

```js
import UpLink from './UpLink.js';
```

Polling starts automatically on import with default settings.

---

## Important — Call `config()` First, and Only Once

`config()` should be the **very first call** after importing UpLink, before attaching any event listeners or reading any properties. It stops the current polling loop, applies your settings, then restarts cleanly.

`config()` can only be called **once per lifecycle**. Calling it a second time throws an `UpLinkError` with code `ALREADY_CONFIGURED`. This is intentional — re-configuring a live monitor mid-session would produce unpredictable metric snapshots. If you genuinely need to reconfigure, call `destroy()` first.

```js
// ✅ Correct — config first, then listeners
import UpLink from './UpLink.js';

UpLink.config({
  pollingIntervals: { stable: 10000 }
});

UpLink.on("ping", handler);
```

```js
// ⚠️ Avoid — listeners may fire with default settings before config runs
UpLink.on("ping", handler);
UpLink.config({ pollingIntervals: { stable: 10000 } });
```

```js
// ❌ Throws ALREADY_CONFIGURED
UpLink.config({ pollingIntervals: { stable: 10000 } });
UpLink.config({ latencyThresholds: { optimal: 50 } });
```

---

## Quick Start

```js
import UpLink from './UpLink.js';

UpLink.config({
  pollingIntervals: { stable: 8000 },
  latencyThresholds: { optimal: 80, stable: 200, highLatency: 400, degraded: 600 }
});

// Fires on every ping cycle
UpLink.on("ping", (e) => {
  console.log(e.detail.condition.label); // "Optimal", "Stable", "High Latency", etc.
  console.log(e.detail.latency);         // average ms over the rolling window
  console.log(e.detail.bars);            // 0–5
  console.log(e.detail.jitter);          // average jitter in ms
  console.log(e.detail.packetLoss);      // 0–100 percentage
});

// Fires only when the condition label changes
UpLink.on("networkConditionChange", (e) => {
  console.log(`Condition changed → ${e.detail.condition.label} (${e.detail.bars} bars)`);
});

// Fires once when connectivity is lost
UpLink.on("offline", () => {
  console.log("Connection lost");
});

// Fires once when connectivity is restored
UpLink.on("online", () => {
  console.log("Back online");
});
```

---

## API

### `UpLink.config(options)`

Configures UpLink. **Call once, before anything else.**

| Option | Type | Default | Description |
|---|---|---|---|
| `endPoints` | `Object` | See below | Custom polling endpoints |
| `latencyThresholds` | `Object` | See below | Override ms thresholds for condition classification |
| `pollingIntervals` | `Object` | See below | Override adaptive polling interval durations in ms |
| `silenceWarnings` | `boolean` | `false` | Suppress `console.warn` for unusually low thresholds |
| `noCors` | `boolean` | `false` | Set `mode: "no-cors"` on all fetch calls. Use only with custom endpoints that do not serve CORS headers. **Disables data-usage tracking** — responses are opaque in this mode. |

#### `endPoints`

```js
UpLink.config({
  endPoints: {
    main:   'https://my-server.com/ping',
    backup: 'https://1.1.1.1/cdn-cgi/trace'
  }
});
```

Defaults:
- `main`: `https://dns.google/resolve?name=a&type=A`
- `backup`: `https://cloudflare-dns.com/cdn-cgi/trace`

If `main` does not respond within 3.5 seconds, UpLink switches to `backup` and begins checking whether `main` has recovered every **60 seconds** in the background. When recovery is confirmed, the main endpoint is restored silently.

#### `latencyThresholds`

```js
UpLink.config({
  latencyThresholds: {
    optimal: 80,      // below 80ms   → Optimal      (5 bars)
    stable: 200,      // below 200ms  → Stable       (4 bars)
    highLatency: 400, // below 400ms  → High Latency (3 bars)
    degraded: 600     // below 600ms  → Degraded     (2 bars)
                      // ≥ 600ms      → Critical     (1 bar)
  }
});
```

Rules:
- All four keys must remain in **strictly ascending order**.
- Values must be positive numbers.
- Values **≤ 10ms** throw a `CONFIG_ERR` — sub-10ms latency is not physically plausible over a network.
- Values **≤ 30ms** log a `console.warn` unless `silenceWarnings: true`.

#### `pollingIntervals`

```js
UpLink.config({
  pollingIntervals: {
    unstable:    2000,  // condition is changing         (default: 2000ms)
    stabilising: 5000,  // 10 consecutive same readings  (default: 4000ms)
    stable:      10000  // 20 consecutive same readings  (default: 6000ms)
  }
});
```

Minimum allowed value is **500ms** per key to prevent network flooding. Any value below this throws a `CONFIG_ERR`.

---

### `UpLink.startPollingNetwork()`

Starts the polling loop and attaches the `visibilitychange`, `offline`, and `online` window/document listeners. If polling is already running, this is a no-op — no duplicate loops can be created.

Called automatically on import and after `config()`. Call manually to resume after a `stopPollingNetwork()`.

---

### `UpLink.stopPollingNetwork()`

Stops the polling loop, cancels all pending fetches and timers, and removes the `visibilitychange`, `offline`, and `online` listeners by aborting the shared `AbortController`. Accumulated metrics are preserved — the next call to `startPollingNetwork()` picks up where it left off.

---

### `UpLink.destroy()`

Full teardown. Stops polling, removes all window/document event listeners, and resets **all** internal state and metrics to initial values. Also resets the `configured` guard, so `config()` can be called again if needed after re-importing.

> **Note:** `destroy()` does not remove `"ping"`, `"online"`, or other `CustomEvent` listeners that external code attached via `on()`. Those must be removed manually with `off()`.

```js
// Clean up before unmounting a component
UpLink.destroy();
```

---

### `UpLink.getLatencyAs(format)`

Returns the current average latency converted to the requested unit. Returns `Infinity` when offline or all samples in the window are failures.

| Format | Unit |
|---|---|
| `"ms"` (default) | Milliseconds |
| `"s"` | Seconds |

```js
UpLink.getLatencyAs("ms"); // → 142
UpLink.getLatencyAs("s");  // → 0.142
```

---

### `UpLink.on(event, handler)` / `UpLink.off(event, handler)`

Ergonomic aliases for the native `addEventListener` and `removeEventListener`. All standard `EventTarget` options (e.g. `{ once: true }`) are supported.

```js
const handler = (e) => console.log(e.detail.bars);

UpLink.on("ping", handler);
UpLink.off("ping", handler);

// One-shot listener
UpLink.on("online", () => console.log("Recovered"), { once: true });
```

---

## Properties

All properties are read-only getters backed by private fields.

| Property | Type | Description |
|---|---|---|
| `online` | `boolean` | Whether UpLink has confirmed internet access via an actual fetch. Not the same as `navigator.onLine`. |
| `bars` | `number` | Signal strength from 0 (offline) to 5 (optimal). Maps directly to `networkCondition`. |
| `networkCondition` | `Object` | Current condition descriptor: `{ label, alias, code }`. |
| `latency` | `number` | Average latency in ms across successful pings in the current rolling window. `Infinity` if all samples failed. |
| `jitter` | `number` | Mean absolute deviation between consecutive latency samples in ms. `0` if fewer than 2 samples exist. `5000` if all consecutive pairs include a failure. |
| `packetLoss` | `number` | Estimated packet-loss percentage (0–100), based on the ratio of `Infinity` samples to total samples in the rolling window. |

---

## Network Conditions

| Condition | Bars | `label` | `alias` | `code` | Default threshold |
|---|---|---|---|---|---|
| Optimal | 5 | `"Optimal"` | `"Excellent"` | `"NET_EXCELLENT"` | < 100ms |
| Stable | 4 | `"Stable"` | `"Good"` | `"NET_GOOD"` | < 250ms |
| High Latency | 3 | `"High Latency"` | `"Slow"` | `"NET_SLOW"` | < 500ms |
| Degraded | 2 | `"Degraded"` | `"Bad"` | `"NET_BAD"` | < 700ms |
| Critical | 1 | `"Critical"` | `"Unacceptable"` | `"NET_CRITICAL"` | ≥ 700ms |
| Disconnected | 0 | `"Disconnected"` | `"Offline"` | `"NET_OFFLINE"` | 2+ consecutive failures |
| Syncing | — | `"Syncing"` | `"Calculating"` | `"NET_PENDING"` | Initial / post-reset state |

> **Disconnected override:** if two or more consecutive pings fail, the condition is forced to `Disconnected` (bars = 0) regardless of the rolling average. This catches sudden hard drops faster than waiting for the average to degrade.

```js
UpLink.on("ping", (e) => {
  if (e.detail.condition.code === "NET_OFFLINE") {
    showOfflineBanner();
  }
});
```

---

## Events

All events are `CustomEvent` instances dispatched on the `UpLink` instance.

### `ping`

Fires after every polling cycle, whether it succeeded or failed.

| Key | Type | Description |
|---|---|---|
| `online` | `boolean` | Current online status |
| `latency` | `number` | Average latency in ms (`Infinity` if offline) |
| `condition` | `Object` | `{ label, alias, code }` |
| `bars` | `number` | 0 to 5 |
| `jitter` | `number` | Average jitter in ms |
| `packetLoss` | `number` | 0 to 100 |

### `networkConditionChange`

Fires when the derived condition **label** transitions — e.g. from `"Stable"` to `"High Latency"`. Does not fire on every ping. The event detail shape is identical to `ping`.

Use this instead of diffing `condition.code` inside a `ping` handler when you only care about genuine state transitions.

```js
UpLink.on("networkConditionChange", (e) => {
  updateStatusBadge(e.detail.condition.alias, e.detail.bars);
});
```

### `online`

Fires once when UpLink transitions from offline to online — confirmed by a successful fetch, not by the native browser event alone.

### `offline`

Fires once when UpLink transitions from online to offline — confirmed by a failed fetch, not by the native browser event alone.

---

## Adaptive Polling

UpLink automatically backs off the polling interval as the connection proves consistent, reducing background traffic on stable connections:

| Phase | Trigger | Default interval |
|---|---|---|
| Unstable | Any condition change | 2000ms |
| Stabilising | 10 consecutive same-condition pings | 4000ms |
| Stable | 20 consecutive same-condition pings | 6000ms |

The interval resets to `unstable` whenever the condition label changes. All three thresholds are configurable via `config({ pollingIntervals })`.

---

## How It Works

**Active polling:** On every cycle, UpLink fetches a lightweight endpoint. The fetch is force-aborted after 3.5 seconds if it doesn't respond. On timeout, the active endpoint toggles between main and backup. When falling back to the backup, a background timer checks every 60 seconds whether the main endpoint has recovered and silently restores it if so.

**Rolling window:** Each ping result (round-trip ms, or `Infinity` on failure) is prepended to a 10-entry rolling log. The window average drives condition classification and bar count, smoothing out individual spikes and preventing rapid condition flickering.

**Disconnected override:** Rather than waiting for a degraded latency average to reach a "bad" threshold, UpLink declares the connection `Disconnected` the moment two consecutive pings fail. This makes sudden hard drops feel immediate.

**Native event hybrid:** UpLink also listens to the browser's native `online` and `offline` window events as early-warning signals — these often fire before the next scheduled poll. When either fires, UpLink immediately restarts its loop to run a confirmation ping. A 2-second debounce buffer on each event prevents flickering from causing repeated restarts while still allowing a genuine rapid offline → online transition to be detected cleanly.

**Tab awareness:** Polling pauses the moment the browser tab becomes hidden and resumes when it becomes visible again. The `visibilitychange`, `offline`, and `online` listeners all share a single `AbortController` and are torn down together whenever polling stops.

---

## Debugging

UpLink exposes a frozen `debug` namespace intended for development and testing only. Do not ship production code that calls these.

### `UpLink.debug.version()`

Prints the styled console banner and returns the version string.

```js
UpLink.debug.version(); // → "3.1.0"
```

### `UpLink.debug.logs()`

Returns a shallow copy of the internal latency log — the last ≤10 raw samples in ms, newest first. Failed pings appear as `Infinity`.

```js
UpLink.debug.logs(); // → [45, 67, Infinity, 102, 88, ...]
```

### `UpLink.debug.state()`

Returns a full snapshot of internal state at the time of the call, including a data usage report.

```js
const s = UpLink.debug.state();
// {
//   online: true,
//   bars: 4,
//   condition: { label: "Stable", alias: "Good", code: "NET_GOOD" },
//   latencyLog: [88, 91, 95, ...],
//   latency: 91.3,
//   jitter: 3.5,
//   packetLoss: 0,
//   endpoint: { endPoint: "https://...", type: "main" },
//   interval: 4000,
//   failures: 0,
//   dataUsage: { usage: { bytes, kb, mb, gb }, stability: 0.98, projections: { ... } }
// }
```

### `UpLink.debug.endpoints()`

Returns the configured endpoint URLs and which is currently active.

```js
UpLink.debug.endpoints();
// → { main: "https://...", backup: "https://...", current: { endPoint: "...", type: "main" } }
```

### `UpLink.debug.reset()`

Clears the latency log, stability log, and all derived metrics without stopping the polling loop. Useful for getting a clean slate during a testing session.

### `UpLink.debug.dataUsage()`

Returns a data usage report based on the response payload sizes observed so far. Useful for estimating the bandwidth cost of running UpLink over time.

```js
const usage = UpLink.debug.dataUsage();
// {
//   usage: { bytes: 14520, kb: 14.18, mb: 0.01, gb: 0 },
//   stability: 0.97,   // 0 = erratic payload sizes, 1 = perfectly consistent
//   projections: {
//     unstable:    { averagePayload: {...}, perMinute: {...}, hourly: {...}, daily: {...} },
//     stabilising: { ... },
//     stable:      { ... }
//   }
// }
```

> **Note:** Returns `{ usage: null, stability: 0, projections: null, note: "..." }` when `noCors: true` is set, because opaque responses have no readable body.

### `UpLink.debug.spike(mockLatency)`

Injects mock latency values directly into the rolling log and immediately re-evaluates the network condition. Use this to simulate degraded or failing conditions without touching the actual network.

```js
// Simulate high latency
UpLink.debug.spike([800, 750, 820]);

// Simulate packet loss
UpLink.debug.spike([Infinity, Infinity, Infinity]);
```

Throws a `DEBUG_ERR` if the argument is not an array of numbers.

### `UpLink.debug.stream(val?)`

Enables or disables the `"debug:ping"` event stream. When enabled, a `CustomEvent` is dispatched after every poll cycle with the following detail:

| Key | Type | Description |
|---|---|---|
| `endpoint` | `"main" \| "backup"` | Which endpoint was polled |
| `duration` | `number` | Raw round-trip time for this specific ping in ms |
| `snapshot` | `DebugState` | Full `debug.state()` snapshot at ping time |

```js
UpLink.debug.stream(true);

UpLink.on("debug:ping", ({ detail }) => {
  console.log(detail.endpoint, detail.duration, detail.snapshot.bars);
});

// Disable when done
UpLink.debug.stream(false);
```

---

## Error Handling

UpLink throws `UpLinkError` for invalid usage. Each error carries a `code` property for programmatic handling.

| Code | Thrown by | Reason |
|---|---|---|
| `ALREADY_CONFIGURED` | `config()` | `config()` was called more than once without a `destroy()` in between |
| `CONFIG_ERR` | `config()` | An option value is invalid, out of range, or the wrong type |
| `DEBUG_ERR` | `debug.spike()` | Argument is not an array of numbers |
| `GENERAL_ERROR` | Any | Unexpected internal error |

```js
try {
  UpLink.config({ latencyThresholds: { optimal: 5 } });
} catch (e) {
  if (e instanceof UpLinkError) {
    console.log(e.name);    // "UpLinkError"
    console.log(e.code);    // "CONFIG_ERR"
    console.log(e.message); // "impossible latency value set for 'optimal'..."
  }
}
```

---

## Limitations

Understanding what UpLink does not do — and cannot do — is as important as knowing what it does.

### It measures round-trip time to a fixed endpoint, not true network quality

UpLink's latency figure is the time taken to complete (or abort) a fetch to a single remote host. This includes DNS resolution, TCP handshake, TLS negotiation, server processing time, and the return trip. It is not a raw ICMP ping. Two connections with identical actual link quality may read differently depending on which endpoint is used.

### It cannot distinguish between network problems and endpoint problems

If the configured `main` and `backup` endpoints are both slow or unreliable, UpLink will report poor connectivity even if the user's actual internet connection is fine. Choosing stable, low-latency endpoints that are geographically close to your users matters.

### The default endpoints may be blocked in some regions

The default `main` endpoint (`dns.google`) is blocked in certain regions and corporate environments. If you are deploying to users in those contexts, configure a custom endpoint via `config({ endPoints })`.

### `no-cors` fetch does not validate response content

When `noCors: true` is set, the browser delivers an opaque response — UpLink only knows whether the request completed or timed out, not whether the server returned a 200, 500, or anything else. A server returning errors will still register as a successful ping. Data-usage tracking is also disabled in this mode.

### The rolling window lags behind sudden changes

Conditions are derived from a 10-sample rolling average. A sudden hard drop to zero is overridden immediately by the consecutive-failure check (2+ failures → `Disconnected`), but a gradual degradation takes up to 10 pings to fully register in the average. On the most aggressive polling interval (2000ms), that's up to 20 seconds of lag.

### Packet-loss figures are estimates, not measurements

`packetLoss` counts timed-out fetches as dropped packets. A fetch can time out for reasons unrelated to packet loss at the IP layer — server congestion, endpoint throttling, or a slow TLS handshake can all cause a timeout. The figure is a useful signal, not a precise network diagnostic.

### Jitter is capped at 5000ms when all consecutive pairs involve a failure

If the latency log contains only `Infinity` values or alternates such that no two consecutive non-`Infinity` values exist, `jitter` returns `5000` as a sentinel rather than `0` or `Infinity`. This is intentional to signal "unmeasurable" but may look odd if you display the raw number without handling this case.

### Polling pauses completely when the tab is hidden

This is intentional for battery and resource reasons, but it means UpLink has no awareness of what happened while the tab was in the background. The first ping after the tab becomes visible may reflect stale state until the rolling window refreshes.

### Not designed for Node.js or server-side rendering

UpLink references `window`, `document`, `navigator`, and `fetch` without guards (except in `printSignature`). Running it in a Node.js or SSR context will throw. It is a browser-only library.

### `config()` cannot be re-called on a live instance

Once `config()` has been called, it cannot be called again without first calling `destroy()`. There is no hot-reconfiguration path. If your use case requires changing thresholds at runtime, you will need to rebuild the metric logic outside of UpLink.

---

## License

MIT
