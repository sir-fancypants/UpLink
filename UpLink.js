"use strict"

const VERSION = "3.1.0";

function printSignature() {
    if (typeof window !== "undefined") {
        const pkg = {
            name: "UpLink",
            description: "A lightweight, event-driven network quality monitor that goes beyond navigator.onLine.",
            author: "Raymond Ngule",
            license: "MIT",
            version: VERSION,
            repo: "https://github.com/sir-fancypants/UpLink",
        };

        const c = {
            group: `color: #2898e2; font-weight: bold; font-family: monospace;`,
            banner: "color: #2898e2; font-family: monospace; font-size: 12px; line-height: 1.1; font-weight: bold;",
            dot: "color: #a03131; font-weight: bold;",
            key: "color: #20b9d4; font-family: monospace; font-size: 15px;",
            val: "font-family: monospace; font-size: 13px;",
            dim: "color: #20b9d4; font-family: monospace; font-size: 14px;",
            badge: "background: #2385c6; color: #ffffff; border: 2px solid #cccccc; border-radius: 5px; padding: 5px 6px; font-size: 14px; font-family: monospace; font-weight: bold;",
        };

        const bannerArt = [
            " ██╗   ██╗██████╗ ██╗     ██╗███╗   ██╗██╗  ██╗",
            " ██║   ██║██╔══██╗██║     ██║████╗  ██║██║ ██╔╝",
            " ██║   ██║██████╔╝██║     ██║██╔██╗ ██║█████╔╝ ",
            " ██║   ██║██╔═══╝ ██║     ██║██║╚██╗██║██╔═██╗ ",
            " ╚██████╔╝██║     ███████╗██║██║ ╚████║██║  ██╗",
            "  ╚═════╝ ╚═╝     ╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝",
        ].join("\n");

        const rows = [
            ["version", pkg.version],
            ["description", pkg.description],
            ["author", pkg.author],
            ["license", pkg.license],
            ["repository", pkg.repo],
        ];

        console.groupCollapsed(`%c ● SYSTEM READY %c v${pkg.version} %c© 2026 ${pkg.author}`, c.badge, c.dim, c.dim);
        console.log(`%c${bannerArt}`, c.banner);
        rows.forEach(([key, val]) => {
            const k = `◆ ${key}`.padEnd(16);
            console.log(`%c${k.slice(0, 1)}%c${k.slice(1)}%c${val}`, c.dot, c.key, c.val);
        });
        console.groupEnd();
    }
}

/**
 * @typedef {Object} NetworkCondition
 * @property {string} label   - Human-readable label (e.g. `"Optimal"`, `"Degraded"`).
 * @property {string} alias   - Short alias (e.g. `"Excellent"`, `"Bad"`).
 * @property {string} code    - Machine-readable code (e.g. `"NET_EXCELLENT"`, `"NET_OFFLINE"`).
 */

/**
 * @typedef {Object} EndPointConfig
 * @property {string} [main]   - URL for the primary polling endpoint.
 * @property {string} [backup] - URL for the fallback polling endpoint.
 */

/**
 * @typedef {Object} PollingIntervalsConfig
 * @property {number} [unstable]    - Interval (ms) used when the network condition is changing. Minimum 500ms.
 * @property {number} [stabilising] - Interval (ms) used after 10 consistent readings.
 * @property {number} [stable]      - Interval (ms) used after 20 consistent readings.
 */

/**
 * @typedef {Object} LatencyThresholdsConfig
 * @property {number} [optimal]     - Max ms to be considered optimal (default 100).
 * @property {number} [stable]      - Max ms to be considered stable (default 250).
 * @property {number} [highLatency] - Max ms to be considered high-latency (default 500).
 * @property {number} [degraded]    - Max ms to be considered degraded (default 700). Above this is critical.
 */

/**
 * @typedef {Object} UpLinkConfig
 * @property {EndPointConfig}          [endPoints]         - Override the default polling endpoints.
 * @property {PollingIntervalsConfig}  [pollingIntervals]  - Override the adaptive polling intervals.
 * @property {LatencyThresholdsConfig} [latencyThresholds] - Override the latency band thresholds.
 * @property {boolean}                 [silenceWarnings]   - Suppress all console warnings (default `false`).
 * @property {boolean}                 [noCors]            - Set `mode: "no-cors"` on all fetch calls.
 *   Use only with custom endpoints that do not support CORS. Disables data-usage tracking.
 */

/**
 * @typedef {Object} PingEventDetail
 * @property {boolean}          online       - Whether the network is currently reachable.
 * @property {number}           latency      - Rolling average latency in ms, or `Infinity` if offline.
 * @property {NetworkCondition} condition    - Current network condition object.
 * @property {number}           bars         - Signal bar count from 0 (offline) to 5 (optimal).
 * @property {number}           jitter       - Average absolute difference between consecutive latency readings (ms).
 * @property {number}           packetLoss   - Percentage of failed requests in the current log window (0–100).
 */

/**
 * @typedef {Object} DebugState
 * @property {boolean}          online           - Whether the network is currently reachable.
 * @property {number}           bars             - Signal bar count (0–5).
 * @property {NetworkCondition} condition        - Current network condition object.
 * @property {number[]}         latencyLog       - Raw latency log (up to 10 entries, `Infinity` for failures).
 * @property {number}           latency          - Rolling average latency in ms.
 * @property {number}           jitter           - Average jitter in ms.
 * @property {number}           packetLoss       - Packet loss percentage (0–100).
 * @property {{ endPoint: string, type: string }} endpoint - The active endpoint.
 * @property {number}           interval         - The current polling interval in ms.
 * @property {number}           failures         - Number of consecutive request failures.
 * @property {Object}           dataUsage        - Current data usage report.
 */

/**
 * @typedef {Object} FormatBytes
 * @property {number} bytes - Raw byte count.
 * @property {number} kb    - Kilobytes.
 * @property {number} mb    - Megabytes.
 * @property {number} gb    - Gigabytes.
 */

/**
 * @typedef {Object} DataUsageReport
 * @property {FormatBytes|null} usage       - Total bytes consumed since init. `null` in no-cors mode.
 * @property {number}           stability   - Payload consistency score from 0 (erratic) to 1 (perfectly consistent).
 * @property {Object|null}      projections - Projected usage per polling interval tier (`unstable`, `stabilising`, `stable`).
 * @property {string}           [note]      - Present only in no-cors mode explaining why tracking is disabled.
 */

class Utility {
    static isPlainObject(value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    }
}

/**
 * Custom error class for UpLink. Extends the native `Error` with a `code` property
 * for programmatic error handling.
 *
 * @extends Error
 *
 * @example
 * try {
 *   UpLink.config({ endPoints: "invalid" });
 * } catch (err) {
 *   if (err.code === "CONFIG_ERR") { ... }
 * }
 */
class UpLinkError extends Error {
    /**
     * @param {string} message - Human-readable error description.
     * @param {string} [code="GENERAL_ERROR"] - Machine-readable error code.
     */
    constructor(message, code = "GENERAL_ERROR") {
        super(message);
        this.name = "UpLinkError";
        this.code = code;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, UpLinkError);
        }
    }
}

/**
 * @class Monitor
 * @extends EventTarget
 *
 * @description
 * UpLink's core engine. Continuously polls a lightweight endpoint to measure
 * real network quality beyond the binary `navigator.onLine` flag. Exposes
 * latency, jitter, packet-loss, and a signal-bar rating, all surfaced through
 * a familiar `EventTarget` API.
 *
 * UpLink is exported as a ready-made singleton — you do not instantiate this
 * class directly.
 *
 * ---
 *
 * ### Events
 *
 * | Event                   | Detail shape          | Fired when                                              |
 * |-------------------------|-----------------------|---------------------------------------------------------|
 * | `ping`                  | `PingEventDetail`     | After every completed poll (success or failure).        |
 * | `online`                | —                     | Network transitions from offline → reachable.           |
 * | `offline`               | —                     | Network transitions from reachable → offline.           |
 * | `networkConditionChange`| `PingEventDetail`     | The network condition band changes (e.g. Good → Slow).  |
 * | `debug:ping`            | `{ endpoint, duration, snapshot }` | Every poll when `debug.stream(true)` is active. |
 *
 * ---
 *
 * ### Quick start
 * ```js
 * import UpLink from "./uplink.js";
 *
 * UpLink.on("networkConditionChange", ({ detail }) => {
 *   console.log(detail.condition.label); // "Optimal", "Degraded", etc.
 * });
 * ```
 */
class Monitor extends EventTarget {

    #latencyLog = [];

    #networkConditionStates = {
        optimal:     { label: "Optimal",      alias: "Excellent",   code: "NET_EXCELLENT" },
        stable:      { label: "Stable",        alias: "Good",        code: "NET_GOOD"      },
        highLatency: { label: "High Latency",  alias: "Slow",        code: "NET_SLOW"      },
        degraded:    { label: "Degraded",      alias: "Bad",         code: "NET_BAD"       },
        critical:    { label: "Critical",      alias: "Unacceptable",code: "NET_CRITICAL"  },
        disconnected:{ label: "Disconnected",  alias: "Offline",     code: "NET_OFFLINE"   },
        syncing:     { label: "Syncing",       alias: "Calculating", code: "NET_PENDING"   },
    };

    #endPoints = {
        main:   'https://dns.google/resolve?name=a&type=A',
        backup: 'https://cloudflare-dns.com/cdn-cgi/trace'
    };

    #currentEndPoint = {
        endPoint: 'https://dns.google/resolve?name=a&type=A',
        type: "main"
    };

    #pollingIntervals = {
        unstable:    2000,
        stabilising: 4000,
        stable:      6000,
    };

    #currentpollingInterval = 2000;

    #latencyThresholds = {
        optimal:     100,
        stable:      250,
        highLatency: 500,
        degraded:    700,
    };

    #checkMainEndPointTimeOutId = false;
    #fetchAbortController;
    #pollingNetwork = false;
    #pollingPausedByVisibilityListener = false;
    #configured = false;
    #pollingTimeOutId;
    #stabilityLatencyLogLastEntry;
    #stabilityLatencyLog = [];
    #silenceWarnings = false;
    #bars = 0;
    #noCors = false; // for custom endpoints
    #networkCondition = { label: "Syncing", alias: "Calculating", code: "NET_PENDING" };
    #online = navigator.onLine;
    #mainAbortController;
    #forceTimeOutOnNetworkRequest;
    #nativeEventBufferOffline = false;
    #nativeEventBufferOnline = false;
    #size = { bytes: 0, logs: [] };
    #consecutiveFailures = 0;
    #debugStreamEnabled = false;

    constructor() {
        super();

        /**
         * Alias for `addEventListener`. Attach an event listener to UpLink.
         *
         * @method on
         * @memberof Monitor
         * @param {string}   type     - Event name (e.g. `"ping"`, `"online"`, `"networkConditionChange"`).
         * @param {Function} listener - Callback receiving a `CustomEvent` whose `detail` matches the event's shape.
         *
         * @example
         * UpLink.on("ping", ({ detail }) => {
         *   console.log(`Latency: ${detail.latency}ms | Bars: ${detail.bars}`);
         * });
         */
        this.on = this.addEventListener.bind(this);

        /**
         * Alias for `removeEventListener`. Remove a previously attached listener.
         *
         * @method off
         * @memberof Monitor
         * @param {string}   type     - Event name.
         * @param {Function} listener - The same function reference passed to `on()`.
         *
         * @example
         * const handler = ({ detail }) => console.log(detail);
         * UpLink.on("ping", handler);
         * UpLink.off("ping", handler);
         */
        this.off = this.removeEventListener.bind(this);

        /**
         * Development and diagnostics utilities. All methods are read-only and
         * have no side effects on the monitor's state unless explicitly noted.
         *
         * @namespace debug
         * @memberof Monitor
         */
        this.debug = Object.freeze({
            /**
             * Print the UpLink signature banner to the console and return the version string.
             *
             * @memberof Monitor.debug
             * @returns {string} The current version string (e.g. `"3.1.0"`).
             */
            version: () => {
                printSignature();
                return VERSION;
            },

            /**
             * Return a shallow copy of the raw latency log (up to 10 entries).
             * Failed requests are recorded as `Infinity`.
             *
             * @memberof Monitor.debug
             * @returns {number[]} Array of latency values in ms.
             */
            logs: () => this.#latencyLog.slice(),

            /**
             * Return a full snapshot of UpLink's current internal state.
             *
             * @memberof Monitor.debug
             * @returns {DebugState}
             */
            state: () => ({
                online:      this.#online,
                bars:        this.#bars,
                condition:   { ...this.#networkCondition },
                latencyLog:  [...this.#latencyLog],
                latency:     this.latency,
                jitter:      this.jitter,
                packetLoss:  this.packetLoss,
                endpoint:    { ...this.#currentEndPoint },
                interval:    this.#currentpollingInterval,
                failures:    this.#consecutiveFailures,
                dataUsage:   this.#dataUsage()
            }),

            /**
             * Return the currently configured endpoints and which one is active.
             *
             * @memberof Monitor.debug
             * @returns {{ main: string, backup: string, current: { endPoint: string, type: string } }}
             */
            endpoints: () => ({
                main:    this.#endPoints.main,
                backup:  this.#endPoints.backup,
                current: this.#currentEndPoint
            }),

            /**
             * Reset all latency logs, failure counters, and bars without stopping the monitor.
             * Useful for testing or after a known network disruption.
             *
             * @memberof Monitor.debug
             */
            reset: () => this.#debugReset(),

            /**
             * Return the current data usage report.
             *
             * @memberof Monitor.debug
             * @returns {DataUsageReport}
             */
            dataUsage: () => this.#dataUsage(),

            /**
             * Inject mock latency values directly into the latency log and immediately
             * trigger a network condition evaluation. Useful for testing UI responses
             * to different network states without manipulating real traffic.
             *
             * @memberof Monitor.debug
             * @param {number[]} mockLatency - Array of latency values in ms. Use `Infinity` to simulate failures.
             *
             * @example
             * // Simulate two dropped packets then a 600ms reading
             * UpLink.debug.spike([Infinity, Infinity, 600]);
             */
            spike: (mockLatency) => this.#injectLatency(mockLatency),

            /**
             * Enable or disable the `debug:ping` event stream. When enabled, a
             * `debug:ping` event is dispatched after every poll with a full state snapshot.
             *
             * @memberof Monitor.debug
             * @param {boolean} [val=true] - Pass `false` to disable the stream.
             *
             * @example
             * UpLink.debug.stream(true);
             * UpLink.on("debug:ping", ({ detail }) => console.log(detail));
             */
            stream: (val = true) => {
                this.#debugStreamEnabled = !!val;
            }
        });

        this.startPollingNetwork();
    }

    /**
     * Configure UpLink before polling begins. Can only be called **once** — subsequent
     * calls throw an `UpLinkError` with code `"ALREADY_CONFIGURED"`.
     *
     * Calling `config()` stops any in-progress polling, applies the new settings,
     * and immediately restarts the monitor.
     *
     * @param {UpLinkConfig} [options={}]
     * @throws {UpLinkError} `ALREADY_CONFIGURED` — if called more than once.
     * @throws {UpLinkError} `CONFIG_ERR` — if any option value is invalid.
     *
     * @example
     * UpLink.config({
     *   endPoints: {
     *     main:   "https://my-api.com/ping",
     *     backup: "https://backup-api.com/ping"
     *   },
     *   pollingIntervals:  { unstable: 1000, stabilising: 3000, stable: 5000 },
     *   latencyThresholds: { optimal: 80, stable: 200, highLatency: 400, degraded: 600 },
     *   silenceWarnings: false,
     *   noCors: true
     * });
     */
    config({ endPoints, pollingIntervals, latencyThresholds, silenceWarnings, noCors = false } = {}) {
        if (this.#configured) throw new UpLinkError(
            "UpLink configuration can only be set once. Re-initialization is not supported.",
            "ALREADY_CONFIGURED"
        );

        this.stopPollingNetwork();

        this.#noCors = !!noCors;
        this.#silenceWarnings = (silenceWarnings !== undefined)
            ? !!silenceWarnings
            : this.#silenceWarnings;

        if (endPoints) {
            if (!Utility.isPlainObject(endPoints)) {
                throw new UpLinkError("'endpoints' option is expected to be a plain object", "CONFIG_ERR");
            }

            if (endPoints.main !== undefined) {
                if (typeof endPoints.main === "string") {
                    this.#endPoints.main = endPoints.main;
                } else {
                    throw new UpLinkError(`'main' endpoint value must be a string`, "CONFIG_ERR");
                }
            }

            if (endPoints.backup !== undefined) {
                if (typeof endPoints.backup === "string") {
                    this.#endPoints.backup = endPoints.backup;
                } else {
                    throw new UpLinkError("'backup' endpoint value must be a string", "CONFIG_ERR");
                }
            }
        }

        if (latencyThresholds) {
            if (!Utility.isPlainObject(latencyThresholds)) throw new UpLinkError(
                "'latencyThresholds' is expected to be a plain object",
                "CONFIG_ERR"
            );

            const thresholdValues = Object.values(this.#latencyThresholds).sort((a, b) => a - b);
            const invertedLatencyThresholds = {};

            Object.keys(this.#latencyThresholds).forEach(key => {
                invertedLatencyThresholds[this.#latencyThresholds[key]] = key;
            });

            let sequenceIntegrity = { value: 0, key: "" };

            thresholdValues.forEach(threshold => {
                let value;
                const invertedKey = invertedLatencyThresholds[threshold];

                if (latencyThresholds[invertedKey] !== undefined) {
                    const setValue = Number(latencyThresholds[invertedKey]);
                    if (!isNaN(setValue)) { value = setValue; } else throw new UpLinkError(
                        `the 'latencyThreshold' value '${invertedKey}' can only a number`,
                        "CONFIG_ERR"
                    );
                } else value = threshold;

                if (value < 0) throw new UpLinkError(
                    `'latencyThreshold' values cannot be less than 0`,
                    "CONFIG_ERR"
                );

                if (sequenceIntegrity.value <= value) {
                    if (latencyThresholds[invertedKey] !== undefined) {
                        if (value <= 10) throw new UpLinkError(
                            `impossible latency value set for '${invertedKey}'. latency below 10ms is unlikely over a network`,
                            "CONFIG_ERR"
                        );
                        else if (value <= 30) {
                            !this.#silenceWarnings ? console.warn(
                                `The latency threshold for '${invertedKey}' is set to '${value}ms'. While technically possible on high-end local fiber, it is highly unusual for general network conditions. Are you sure this is the target you intended?`
                            ) : "";
                        }
                        this.#latencyThresholds[invertedKey] = value;
                    }
                } else throw new UpLinkError(
                    `the value set for '${invertedKey}' cannot be less than that set for ${sequenceIntegrity.key}`,
                    "CONFIG_ERR"
                );

                sequenceIntegrity.value = value;
                sequenceIntegrity.key = invertedKey;
            });
        }

        if (pollingIntervals) {
            if (!Utility.isPlainObject(pollingIntervals)) throw new UpLinkError(
                "'pollingIntervals' is expected to be a plain object",
                "CONFIG_ERR"
            );

            for (const key in this.#pollingIntervals) {
                if (pollingIntervals[key] !== undefined) {
                    const setValue = Number(pollingIntervals[key]);
                    if (!isNaN(setValue)) {
                        if (setValue < 500) {
                            throw new UpLinkError(
                                `the 'pollingIntervals' value '${key}' is too low. Minimum allowed is 500ms to prevent network flooding.`,
                                "CONFIG_ERR"
                            );
                        }
                        this.#pollingIntervals[key] = setValue;
                    } else throw new UpLinkError(`the 'pollingIntervals' value '${key}' can only be a number`, "CONFIG_ERR");
                }
            }
        }

        this.#currentpollingInterval = this.#pollingIntervals.unstable;
        this.#currentEndPoint = {
            endPoint: this.#endPoints.main,
            type: "main"
        };

        this.#configured = true;
        this.startPollingNetwork();
    }

    /**
     * Start the network polling loop. Called automatically on instantiation.
     *
     * Polling is paused automatically when the page is hidden (`visibilitychange`)
     * and resumes when the page becomes visible again. Calling this method while
     * polling is already active is a no-op.
     *
     * @example
     * // Manually restart after calling stopPollingNetwork()
     * UpLink.startPollingNetwork();
     */
    startPollingNetwork() {
        if (this.#pollingNetwork) return;
        this.#pollingNetwork = true;

        if (document.hidden) {
            this.#pollingPausedByVisibilityListener = true;
            this.stopPollingNetwork();
        } else {
            this.#pollingHandler();
        }

        if (!this.#mainAbortController) {
            this.#mainAbortController = new AbortController();

            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === 'visible') {
                    if (this.#pollingPausedByVisibilityListener) {
                        this.#pollingPausedByVisibilityListener = false;
                        this.startPollingNetwork();
                    }
                } else {
                    if (this.#pollingNetwork) {
                        this.#pollingPausedByVisibilityListener = true;
                        this.stopPollingNetwork();
                    }
                }
            }, { signal: this.#mainAbortController.signal });

            window.addEventListener("offline", () => {
                if (this.#nativeEventBufferOffline || this.#pollingPausedByVisibilityListener) return;
                this.#nativeEventBufferOffline = true;
                setTimeout(() => { this.#nativeEventBufferOffline = false; }, 2000);
                this.stopPollingNetwork();
                this.startPollingNetwork();
            }, { signal: this.#mainAbortController.signal });

            window.addEventListener("online", () => {
                if (this.#nativeEventBufferOnline || this.#pollingPausedByVisibilityListener) return;
                this.#nativeEventBufferOnline = true;
                setTimeout(() => { this.#nativeEventBufferOnline = false; }, 2000);
                this.stopPollingNetwork();
                this.startPollingNetwork();
            }, { signal: this.#mainAbortController.signal });
        }
    }

    /**
     * Stop the network polling loop and abort any in-flight fetch requests.
     * All pending timeouts are cleared. The `visibilitychange`, `online`, and
     * `offline` listeners are also removed unless polling was paused by the
     * visibility listener (in which case they are retained for auto-resume).
     *
     * @example
     * // Pause monitoring while the user is on a metered connection
     * UpLink.stopPollingNetwork();
     */
    stopPollingNetwork() {
        clearTimeout(this.#checkMainEndPointTimeOutId);
        clearTimeout(this.#pollingTimeOutId);
        clearTimeout(this.#forceTimeOutOnNetworkRequest);

        if (this.#mainAbortController && !this.#pollingPausedByVisibilityListener) {
            this.#mainAbortController.abort();
            this.#mainAbortController = null;
        }

        if (this.#fetchAbortController) {
            this.#fetchAbortController.abort();
        }

        this.#pollingNetwork = false;
    }

    /**
     * Destroy the UpLink instance. Aborts all controllers, clears all timers,
     * and resets internal state to its initial values. After calling `destroy()`,
     * you may call `config()` again to reinitialise.
     *
     * @example
     * // Tear down before removing the instance reference
     * UpLink.destroy();
     */
    destroy() {
        if (this.#mainAbortController) {
            this.#mainAbortController.abort();
            this.#mainAbortController = null;
        }

        this.stopPollingNetwork();

        this.#latencyLog = [];
        this.#stabilityLatencyLog = [];
        this.#stabilityLatencyLogLastEntry = undefined;
        this.#consecutiveFailures = 0;
        this.#bars = 0;
        this.#online = navigator.onLine;
        this.#currentEndPoint = { endPoint: this.#endPoints.main, type: "main" };
        this.#checkMainEndPointTimeOutId = false;
        this.#pollingPausedByVisibilityListener = false;
        this.#networkCondition = this.#networkConditionStates.syncing;
        this.#nativeEventBufferOffline = false;
        this.#nativeEventBufferOnline = false;
        this.#configured = false;
        this.#currentpollingInterval = this.#pollingIntervals.unstable;
    }

    /**
     * The number of signal bars representing current network quality.
     *
     * | Value | Meaning      |
     * |-------|--------------|
     * | `5`   | Optimal      |
     * | `4`   | Stable       |
     * | `3`   | High Latency |
     * | `2`   | Degraded     |
     * | `1`   | Critical     |
     * | `0`   | Disconnected |
     *
     * @type {number}
     * @readonly
     */
    get bars() { return this.#bars; }

    /**
     * Whether the network is currently reachable. Updated on every poll cycle
     * and also reflects native `online`/`offline` browser events.
     *
     * @type {boolean}
     * @readonly
     */
    get online() { return this.#online; }

    /**
     * The current network condition object.
     *
     * @type {NetworkCondition}
     * @readonly
     *
     * @example
     * if (UpLink.networkCondition.code === "NET_OFFLINE") {
     *   showOfflineBanner();
     * }
     */
    get networkCondition() { return this.#networkCondition; }

    /**
     * Rolling average latency across the last 10 successful requests (ms).
     * Returns `Infinity` if all recent requests have failed.
     *
     * @type {number}
     * @readonly
     */
    get latency() {
        const successful = this.#latencyLog.filter(v => v !== Infinity);
        if (successful.length === 0) return Infinity;
        return successful.reduce((sum, val) => sum + val, 0) / successful.length;
    }

    /**
     * Average absolute difference between consecutive latency readings (ms).
     * A proxy for connection stability — higher jitter means a less predictable connection.
     * Returns `0` if fewer than 2 readings exist, or `5000` if all adjacent pairs include a failure.
     *
     * @type {number}
     * @readonly
     */
    get jitter() {
        if (this.#latencyLog.length < 2) return 0;
        let diffs = [];
        for (let i = 0; i < this.#latencyLog.length - 1; i++) {
            if (this.#latencyLog[i] !== Infinity && this.#latencyLog[i + 1] !== Infinity) {
                diffs.push(Math.abs(this.#latencyLog[i] - this.#latencyLog[i + 1]));
            }
        }
        return diffs.length ? (diffs.reduce((a, b) => a + b) / diffs.length) : 5000;
    }

    /**
     * Percentage of failed requests in the current 10-entry log window (0–100).
     *
     * @type {number}
     * @readonly
     *
     * @example
     * if (UpLink.packetLoss > 50) {
     *   console.warn("More than half of recent pings are failing.");
     * }
     */
    get packetLoss() {
        if (this.#latencyLog.length === 0) return 0;
        const failures = this.#latencyLog.filter(v => v === Infinity).length;
        return Math.round((failures / this.#latencyLog.length) * 100);
    }

    /**
     * Return the current rolling average latency in a specified unit.
     *
     * @param {"ms"|"s"} [format="ms"] - The unit to return. `"ms"` for milliseconds, `"s"` for seconds.
     * @returns {number} The latency in the requested unit, or `Infinity` if offline.
     *
     * @example
     * console.log(UpLink.getLatencyAs("s")); // e.g. 0.143
     */
    getLatencyAs(format = "ms") {
        if (this.latency !== Infinity) {
            switch (format) {
                case "s": return (this.latency === 0) ? 0 : this.latency / 1000;
                default:  return this.latency;
            }
        } else return Infinity;
    }

    // -------------------------------------------------------------------------
    // Private methods
    // -------------------------------------------------------------------------

    #checkMainEndPointForAPulse() {
        clearTimeout(this.#checkMainEndPointTimeOutId);

        this.#checkMainEndPointTimeOutId = setTimeout(async () => {
            const abortController = new AbortController();
            const timeout = setTimeout(() => { abortController.abort(); }, 3500);

            try {
                const response = await fetch(this.#endPoints.main, {
                    ...(this.#noCors ? { mode: "no-cors" } : {}),
                    cache: 'no-store',
                    signal: abortController.signal
                });

                response.text().then(text => this.#logDataUsage(text));
                clearTimeout(timeout);
                this.#currentEndPoint.endPoint = this.#endPoints.main;
                this.#currentEndPoint.type = "main";
            } catch (e) {
                clearTimeout(timeout);
                this.#checkMainEndPointForAPulse();
            }

            this.#checkMainEndPointTimeOutId = false;
        }, 60000);
    }

    #logDataUsage(response) {
        if (!this.#noCors) {
            const newBytes = new TextEncoder().encode(response).length;
            this.#size.bytes += newBytes;
            this.#size.logs.unshift(newBytes);

            if (this.#size.logs.length > 60) {
                this.#size.logs.pop();
                if (this.#size.logs.length > 60) {
                    this.#size.logs = this.#size.logs.slice(0, 60);
                }
            }
        }
    }

    async #pollingHandler() {
        const start = performance.now();

        const restart = () => {
            const timeoutDuration = this.#currentpollingInterval - (performance.now() - start);
            if (this.#pollingNetwork) {
                this.#pollingTimeOutId = setTimeout(() => {
                    this.#pollingHandler();
                }, (timeoutDuration < 0) ? 0 : timeoutDuration);
            }
        };

        this.#fetchAbortController = new AbortController();

        try {
            this.#forceTimeOutOnNetworkRequest = setTimeout(() => {
                this.#fetchAbortController.abort();

                if (this.#currentEndPoint.type === "main") {
                    this.#currentEndPoint.endPoint = this.#endPoints.backup;
                    this.#currentEndPoint.type = "backup";
                    (this.#checkMainEndPointTimeOutId === false) ? this.#checkMainEndPointForAPulse() : "";
                } else {
                    this.#currentEndPoint.endPoint = this.#endPoints.main;
                    this.#currentEndPoint.type = "main";
                    clearTimeout(this.#checkMainEndPointTimeOutId);
                    this.#checkMainEndPointTimeOutId = false;
                }
            }, 3500);

            const response = await fetch(this.#currentEndPoint.endPoint, {
                ...(this.#noCors ? { mode: "no-cors" } : {}),
                cache: 'no-store',
                signal: this.#fetchAbortController.signal
            });

            response.text().then(text => this.#logDataUsage(text));
            clearTimeout(this.#forceTimeOutOnNetworkRequest);

            if (!this.#online) {
                this.dispatchEvent(new CustomEvent("online", { cancelable: true }));
                this.#online = true;
            }

            this.#latencyLog.unshift(performance.now() - start);
            if (this.#latencyLog.length > 10) this.#latencyLog.pop();

            this.#consecutiveFailures = 0;
            this.#networkConditionCheck();

        } catch (error) {
            this.#consecutiveFailures++;
            this.#latencyLog.unshift(Infinity);
            if (this.#latencyLog.length > 10) this.#latencyLog.pop();

            this.#networkConditionCheck();

            if (this.#online) {
                this.dispatchEvent(new CustomEvent("offline", { cancelable: true }));
                this.#online = false;
            }
        } finally {
            if (this.#pollingNetwork) restart();

            if (this.#debugStreamEnabled) {
                this.dispatchEvent(new CustomEvent("debug:ping", {
                    detail: {
                        endpoint: this.#currentEndPoint.type,
                        duration:  performance.now() - start,
                        snapshot:  this.debug.state()
                    }
                }));
            }
        }
    }

    #networkConditionCheck() {
        const avg = this.latency;
        const isDisconnected = this.#consecutiveFailures >= 2;

        if      (isDisconnected)                            { this.#bars = 0; this.#networkCondition = this.#networkConditionStates.disconnected; }
        else if (avg < this.#latencyThresholds.optimal)     { this.#bars = 5; this.#networkCondition = this.#networkConditionStates.optimal;      }
        else if (avg < this.#latencyThresholds.stable)      { this.#bars = 4; this.#networkCondition = this.#networkConditionStates.stable;       }
        else if (avg < this.#latencyThresholds.highLatency) { this.#bars = 3; this.#networkCondition = this.#networkConditionStates.highLatency;  }
        else if (avg < this.#latencyThresholds.degraded)    { this.#bars = 2; this.#networkCondition = this.#networkConditionStates.degraded;     }
        else                                                 { this.#bars = 1; this.#networkCondition = this.#networkConditionStates.critical;     }

        if (this.#pollingNetwork) {
            this.#stabilityCheck();

            this.dispatchEvent(new CustomEvent("ping", {
                detail: {
                    online:      this.#online,
                    latency:     avg,
                    condition:   this.#networkCondition,
                    bars:        this.#bars,
                    jitter:      this.jitter,
                    packetLoss:  this.packetLoss,
                }
            }));
        }
    }

    #stabilityCheck() {
        if (this.#stabilityLatencyLogLastEntry !== this.#networkCondition.label) {
            this.#stabilityLatencyLog = [];
            this.#currentpollingInterval = this.#pollingIntervals.unstable;

            this.dispatchEvent(new CustomEvent("networkConditionChange", {
                detail: {
                    online:      this.#online,
                    latency:     this.latency,
                    condition:   this.#networkCondition,
                    bars:        this.#bars,
                    jitter:      this.jitter,
                    packetLoss:  this.packetLoss,
                }
            }));
        }

        this.#stabilityLatencyLog.unshift(this.#networkCondition.label);

        if (this.#stabilityLatencyLog.length > 10) {
            this.#currentpollingInterval = this.#pollingIntervals.stabilising;
            if (this.#stabilityLatencyLog.length > 20) {
                this.#stabilityLatencyLog.pop();
                this.#currentpollingInterval = this.#pollingIntervals.stable;
            }
        }

        this.#stabilityLatencyLogLastEntry = this.#networkCondition.label;
    }

    #debugReset() {
        this.#latencyLog = [];
        this.#stabilityLatencyLog = [];
        this.#stabilityLatencyLogLastEntry = undefined;
        this.#consecutiveFailures = 0;
        this.#bars = 0;
        this.#online = navigator.onLine;
        this.#networkCondition = this.#networkConditionStates.syncing;
    }

    #injectLatency(mockLatency = [2000]) {
        if (!Array.isArray(mockLatency) || mockLatency.some(v => typeof v !== 'number')) {
            throw new UpLinkError("'spike()' expects an array of numbers", "DEBUG_ERR");
        }

        this.#consecutiveFailures = 0;

        mockLatency.forEach(latency => {
            if (latency === Infinity) {
                this.#consecutiveFailures++;
            } else {
                this.#consecutiveFailures = 0;
            }
            this.#latencyLog.unshift(latency);
            if (this.#latencyLog.length > 10) this.#latencyLog.pop();
        });

        this.#networkConditionCheck();
    }

    #dataUsage() {
        if (this.#noCors) {
            return {
                usage:       null,
                stability:   0,
                projections: null,
                note: "no-cors mode enabled — response body is opaque, usage tracking disabled"
            };
        }

        const BYTES_IN_KB = 1024;
        const BYTES_IN_MB = BYTES_IN_KB * 1024;
        const BYTES_IN_GB = BYTES_IN_MB * 1024;
        const EPSILON     = 1e-6;

        const formatBytes = (byteCount) => ({
            bytes: Number(byteCount.toFixed(2)),
            kb:    Number((byteCount / BYTES_IN_KB).toFixed(2)),
            mb:    Number((byteCount / BYTES_IN_MB).toFixed(2)),
            gb:    Number((byteCount / BYTES_IN_GB).toFixed(4))
        });

        const payloadSamples = this.#size.logs;

        const averagePayloadBytes = payloadSamples.length
            ? payloadSamples.reduce((sum, value) => sum + value, 0) / payloadSamples.length
            : 0;

        const meanPayloadVariance = payloadSamples.length
            ? payloadSamples.reduce(
                (acc, value) => acc + Math.pow(value - averagePayloadBytes, 2), 0
              ) / payloadSamples.length
            : 0;

        const payloadStandardDeviation = Math.sqrt(meanPayloadVariance);
        const payloadVariationRatio    = payloadStandardDeviation / (averagePayloadBytes + EPSILON);
        const payloadStabilityScore    = Math.max(0, Math.min(1, 1 - payloadVariationRatio));

        const estimateRequests = (intervalMs) => {
            const requestsPerSecond = 1000 / intervalMs;
            const requestsPerMinute = requestsPerSecond * 60;
            const requestsPerHour   = requestsPerMinute * 60;
            const requestsPerDay    = requestsPerHour   * 24;

            return {
                averagePayload: formatBytes(averagePayloadBytes),
                perMinute: { requests: requestsPerMinute, ...formatBytes(averagePayloadBytes * requestsPerMinute), stability: Number(payloadStabilityScore.toFixed(3)) },
                hourly:    { requests: requestsPerHour,   ...formatBytes(averagePayloadBytes * requestsPerHour),   stability: Number(payloadStabilityScore.toFixed(3)) },
                daily:     { requests: requestsPerDay,    ...formatBytes(averagePayloadBytes * requestsPerDay),    stability: Number(payloadStabilityScore.toFixed(3)) },
            };
        };

        return {
            usage:       formatBytes(this.#size.bytes),
            stability:   Number(payloadStabilityScore.toFixed(3)),
            projections: Object.fromEntries(
                Object.entries(this.#pollingIntervals).map(
                    ([intervalName, intervalMs]) => [intervalName, estimateRequests(intervalMs)]
                )
            )
        };
    }
}

/**
 * The UpLink singleton. Import and use directly — no instantiation needed.
 *
 * @type {Monitor}
 *
 * @example
 * import UpLink from "./uplink.js";
 *
 * UpLink.on("online",  () => console.log("Back online"));
 * UpLink.on("offline", () => console.log("Gone offline"));
 *
 * UpLink.on("networkConditionChange", ({ detail }) => {
 *   console.log(detail.condition.label, `${detail.latency.toFixed(0)}ms`);
 * });
 */
const UpLink = new Monitor();
export default UpLink;