"use strict"

const VERSION = "3.0.0";

/**
 * Prints a styled console signature/banner for UpLink when running in a browser environment.
 * Groups package metadata (version, description, author, license, repo) under a collapsed
 * console group. No-ops in non-browser (Node/SSR) environments.
 *
 * @private
 * @returns {void}
 */
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
 * Internal utility helpers.
 *
 * @private
 */
class Utility {
    /**
     * Returns `true` if `value` is a plain object (i.e. created via `{}` or `new Object()`).
     * Rejects arrays, class instances, `null`, and primitives.
     *
     * @param {*} value - The value to test.
     * @returns {boolean}
     */
    static isPlainObject(value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    }
}

/**
 * Custom error class used by UpLink for all thrown errors.
 * Extends the native `Error` with a machine-readable `code` property.
 *
 * @extends Error
 *
 * @example
 * try {
 *   UpLink.config({ endPoints: "bad value" });
 * } catch (err) {
 *   if (err instanceof UpLinkError) {
 *     console.error(err.code, err.message);
 *     // → "CONFIG_ERR" "'endpoints' option is expected to be a plain object"
 *   }
 * }
 */
class UpLinkError extends Error {

    /**
     * @param {string} message - Human-readable error description.
     * @param {string} [code="GENERAL_ERROR"] - Machine-readable error code.
     *   Known codes: `"GENERAL_ERROR"`, `"ALREADY_CONFIGURED"`, `"CONFIG_ERR"`, `"DEBUG_ERR"`.
     */
    constructor(message, code = "GENERAL_ERROR") {
        super(message);
        /** @type {string} The name of this error class. Always `"UpLinkError"`. */
        this.name = "UpLinkError";
        /** @type {string} Machine-readable code identifying the error category. */
        this.code = code;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, UpLinkError);
        }
    }
}

/**
 * @typedef {Object} NetworkCondition
 * @property {string} label   - Verbose human-readable label (e.g. `"High Latency"`).
 * @property {string} alias   - Short human-readable label (e.g. `"Slow"`).
 * @property {string} code    - Machine-readable status code. One of:
 *   `"NET_EXCELLENT"` | `"NET_GOOD"` | `"NET_SLOW"` | `"NET_BAD"` | `"NET_CRITICAL"` | `"NET_OFFLINE"` | `"NET_PENDING"`.
 */

/**
 * @typedef {Object} EndPointState
 * @property {string} endPoint - The URL currently being polled.
 * @property {"main"|"backup"} type - Whether the active endpoint is the main or backup.
 */

/**
 * @typedef {Object} DebugState
 * @property {boolean}          online         - Current online status.
 * @property {number}           bars           - Signal bar count (0–5).
 * @property {NetworkCondition} condition      - Current network condition object.
 * @property {number[]}         latencyLog     - Rolling window of the last ≤10 raw latency samples (ms). Failed pings are stored as `Infinity`.
 * @property {number}           latency        - Current average latency (ms), or `Infinity` when all samples failed.
 * @property {number}           jitter         - Current average jitter (ms).
 * @property {number}           packetLoss     - Estimated packet loss percentage (0–100).
 * @property {EndPointState}    endpoint       - Currently active endpoint info.
 * @property {number}           interval       - Active polling interval in ms.
 * @property {number}           failures       - Consecutive failed ping count.
 */

/**
 * @typedef {Object} PingEventDetail
 * @property {boolean}          online      - Whether the connection is considered online.
 * @property {number}           latency     - Average latency across the current log window (ms), or `Infinity`.
 * @property {NetworkCondition} condition   - Current network condition.
 * @property {number}           bars        - Signal strength bar count (0–5).
 * @property {number}           jitter      - Average jitter (ms).
 * @property {number}           packetLoss  - Estimated packet loss percentage (0–100).
 */

/**
 * @typedef {Object} DebugPingEventDetail
 * @property {"main"|"backup"} endpoint  - Which endpoint was polled.
 * @property {number}          duration  - Round-trip time for this specific ping in ms.
 * @property {DebugState}      snapshot  - Full debug state snapshot at the time of the ping.
 */

/**
 * Core network quality monitor. Extends `EventTarget` so consumers can subscribe to
 * real-time events using `on`/`off` (aliases for `addEventListener`/`removeEventListener`).
 *
 * UpLink polls a remote endpoint on a dynamic interval, derives latency, jitter, and
 * packet-loss metrics from a rolling 10-sample window, and maps those to a discrete
 * {@link NetworkCondition}. Polling automatically pauses when the browser tab is hidden
 * and resumes when it becomes visible again.
 *
 * The module exports a **singleton** instance. Do not call `new Monitor()` directly.
 *
 * ---
 *
 * ### Events
 *
 * | Event name              | `event.detail` type          | When it fires                                                     |
 * |-------------------------|------------------------------|-------------------------------------------------------------------|
 * | `"online"`              | —                            | UpLink transitions from offline → online.                         |
 * | `"offline"`             | —                            | UpLink transitions from online → offline.                         |
 * | `"ping"`                | {@link PingEventDetail}      | After every completed or failed poll cycle.                       |
 * | `"networkConditionChange"` | {@link PingEventDetail}   | When the derived {@link NetworkCondition} label changes.          |
 * | `"debug:ping"`          | {@link DebugPingEventDetail} | After every poll cycle **only** when the debug stream is enabled. |
 *
 * @extends EventTarget
 *
 * @example <caption>Basic usage</caption>
 * import UpLink from './uplink.js';
 *
 * UpLink.on('networkConditionChange', ({ detail }) => {
 *   console.log(detail.condition.label, detail.bars);
 * });
 *
 * @example <caption>Custom configuration</caption>
 * UpLink.config({
 *   endPoints: { main: 'https://my-healthcheck.example.com/ping' },
 *   latencyThresholds: { optimal: 80, stable: 200, highLatency: 400, degraded: 600 },
 *   pollingIntervals: { unstable: 1500, stabilising: 3000, stable: 5000 },
 * });
 */
class Monitor extends EventTarget {

    /** @type {number[]} Rolling window of the last ≤10 latency samples in ms. Failed pings are `Infinity`. @private */
    #latencyLog = [];

    /**
     * Lookup map of all possible network condition descriptor objects.
     * @type {Object.<string, NetworkCondition>}
     * @private
     */
    #networkConditionStates = {
        optimal: {
            label: "Optimal",
            alias: "Excellent",
            code: "NET_EXCELLENT",
        },
        stable: {
            label: "Stable",
            alias: "Good",
            code: "NET_GOOD",
        },
        highLatency: {
            label: "High Latency",
            alias: "Slow",
            code: "NET_SLOW",
        },
        degraded: {
            label: "Degraded",
            alias: "Bad",
            code: "NET_BAD",
        },
        critical: {
            label: "Critical",
            alias: "Unacceptable",
            code: "NET_CRITICAL",
        },
        disconnected: {
            label: "Disconnected",
            alias: "Offline",
            code: "NET_OFFLINE",
        },
        syncing: {
            label: "Syncing",
            alias: "Calculating",
            code: "NET_PENDING",
        }
    };

    /**
     * Default poll endpoints. `main` is tried first; `backup` is used on timeout.
     * Override via {@link Monitor#config}.
     * @type {{ main: string, backup: string }}
     * @private
     */
    #endPoints = {
        main: 'https://dns.google/resolve?name=.&type=NS',
        backup: 'https://1.1.1.1/cdn-cgi/trace',
    };

    /**
     * Tracks the URL and type ("main" | "backup") of the endpoint currently being polled.
     * @type {EndPointState}
     * @private
     */
    #currentEndPoint = {
        endPoint: 'https://dns.google/resolve?name=.&type=NS',
        type: "main"
    };

    /**
     * Adaptive polling interval durations in milliseconds.
     * UpLink starts at `unstable`, steps up to `stabilising` after 10 consecutive
     * identical condition readings, and to `stable` after 20.
     * Override via {@link Monitor#config}.
     * @type {{ unstable: number, stabilising: number, stable: number }}
     * @private
     */
    #pollingIntervals = {
        unstable: 2000,
        stabilising: 4000,
        stable: 6000,
    };

    /** @type {number} Active polling interval in ms. Starts at `unstable`. @private */
    #currentpollingInterval = 2000;

    /**
     * Latency boundaries (ms) used to classify the current {@link NetworkCondition}.
     * Override via {@link Monitor#config}.
     *
     * | Condition    | Latency range          |
     * |--------------|------------------------|
     * | optimal      | < 100 ms               |
     * | stable       | 100 ms – 250 ms        |
     * | highLatency  | 250 ms – 500 ms        |
     * | degraded     | 500 ms – 700 ms        |
     * | critical     | ≥ 700 ms               |
     *
     * @type {{ optimal: number, stable: number, highLatency: number, degraded: number }}
     * @private
     */
    #latencyThresholds = {
        optimal: 100,
        stable: 250,
        highLatency: 500,
        degraded: 700,
    };

    /** @type {ReturnType<typeof setTimeout>|false} Timeout ID for the main-endpoint pulse check. @private */
    #checkMainEndPointTimeOutId = false;

    /** @type {AbortController} AbortController used to cancel in-flight fetch requests. @private */
    #fetchAbortController;

    /** @type {boolean} Whether the polling loop is currently active. @private */
    #pollingNetwork = false;

    /** @type {boolean} Set to `true` when polling was paused by the `visibilitychange` listener. @private */
    #pollingPausedByVisibilityListener = false;

    /** @type {boolean} Guards against calling `config()` more than once. @private */
    #configured = false;

    /** @type {ReturnType<typeof setTimeout>} Timeout ID for the next polling cycle. @private */
    #pollingTimeOutId;

    /** @type {string|undefined} The last recorded condition label used to detect condition changes. @private */
    #stabilityLatencyLogLastEntry;

    /** @type {string[]} Rolling log of condition labels used to drive the adaptive polling interval. @private */
    #stabilityLatencyLog = [];

    /** @type {boolean} Whether to suppress non-critical `console.warn` messages from `config()`. @private */
    #silenceWarnings = false;

    /** @type {number} Current signal strength (0 = offline, 1–5 = poor → excellent). @private */
    #bars = 0;

    /** @type {NetworkCondition} Currently derived network condition descriptor. @private */
    #networkCondition = {
        label: "Syncing",
        alias: "Calculating",
        code: "NET_PENDING",
    };

    /** @type {boolean} Online status mirroring `navigator.onLine`, updated by polling results. @private */
    #online = navigator.onLine;

    /** @type {AbortController|null} Long-lived AbortController for `visibilitychange`, `online`, and `offline` window events. @private */
    #mainAbortController;

    /** @type {ReturnType<typeof setTimeout>} Timeout ID that forces a fetch abort after 3500ms. @private */
    #forceTimeOutOnNetworkRequest;

    /** @type {boolean} Buffer flag that debounces the native `offline` window event. @private */
    #nativeEventBufferOffline = false;

    /** @type {boolean} Buffer flag that debounces the native `online` window event. @private */
    #nativeEventBufferOnline = false;

    /** @type {number} Number of consecutive failed ping attempts since the last success. @private */
    #consecutiveFailures = 0;

    /** @type {boolean} When `true`, a `"debug:ping"` CustomEvent is dispatched after every poll cycle. @private */
    #debugStreamEnabled = false;

    constructor() {
        super();

        /**
         * Alias for `addEventListener`. Attach a listener to an UpLink event.
         *
         * @type {typeof EventTarget.prototype.addEventListener}
         *
         * @example
         * UpLink.on('ping', ({ detail }) => console.log(detail.latency));
         */
        this.on = this.addEventListener.bind(this);

        /**
         * Alias for `removeEventListener`. Remove a previously attached listener.
         *
         * @type {typeof EventTarget.prototype.removeEventListener}
         *
         * @example
         * const handler = ({ detail }) => console.log(detail.latency);
         * UpLink.on('ping', handler);
         * UpLink.off('ping', handler);
         */
        this.off = this.removeEventListener.bind(this);

        /**
         * Collection of debugging utilities. Intended for development use only.
         * All methods are read-only (the object is frozen).
         *
         * @namespace debug
         * @memberof Monitor
         */
        this.debug = Object.freeze({

            /**
             * Prints the UpLink console signature/banner and returns the current version string.
             *
             * @memberof Monitor#debug
             * @returns {string} The current UpLink version (e.g. `"3.0.0"`).
             *
             * @example
             * const v = UpLink.debug.version(); // → "3.0.0"
             */
            version: () => {
                printSignature();
                return VERSION;
            },

            /**
             * Returns a shallow copy of the internal latency log array.
             * Contains the last ≤10 raw latency samples in ms, newest first.
             * Failed pings are represented as `Infinity`.
             *
             * @memberof Monitor#debug
             * @returns {number[]}
             *
             * @example
             * UpLink.debug.logs(); // → [45, 67, Infinity, 102, ...]
             */
            logs: () => this.#latencyLog.slice(),

            /**
             * Returns a snapshot of the full internal state at the time of the call.
             *
             * @memberof Monitor#debug
             * @returns {DebugState}
             *
             * @example
             * const state = UpLink.debug.state();
             * console.log(state.bars, state.condition.code);
             */
            state: () => ({
                online: this.#online,
                bars: this.#bars,
                condition: { ...this.#networkCondition },
                latencyLog: [...this.#latencyLog],
                latency: this.latency,
                jitter: this.jitter,
                packetLoss: this.packetLoss,
                endpoint: { ...this.#currentEndPoint },
                interval: this.#currentpollingInterval,
                failures: this.#consecutiveFailures
            }),

            /**
             * Returns the configured endpoint URLs and which is currently active.
             *
             * @memberof Monitor#debug
             * @returns {{ main: string, backup: string, current: EndPointState }}
             *
             * @example
             * UpLink.debug.endpoints();
             * // → { main: "https://...", backup: "https://...", current: { endPoint: "...", type: "main" } }
             */
            endpoints: () => ({
                main: this.#endPoints.main,
                backup: this.#endPoints.backup,
                current: this.#currentEndPoint
            }),

            /**
             * Resets all internal metrics (latency log, stability log, condition, bars, failures)
             * back to their initial values without stopping the polling loop.
             * Useful for getting a clean slate during manual testing.
             *
             * @memberof Monitor#debug
             * @returns {void}
             *
             * @example
             * UpLink.debug.reset();
             */
            reset: () => this.#debugReset(),

            /**
             * Injects mock latency values directly into the latency log and immediately
             * re-evaluates the network condition. Use this to simulate poor network conditions
             * without needing actual network degradation.
             *
             * @memberof Monitor#debug
             * @param {number[]} mockLatency - Array of latency values in ms to inject (newest first).
             *   Use `Infinity` to simulate failed pings.
             * @throws {UpLinkError} Throws with code `"DEBUG_ERR"` if the argument is not an array of numbers.
             *
             * @example
             * // Simulate three high-latency samples
             * UpLink.debug.spike([800, 900, 750]);
             *
             * @example
             * // Simulate packet loss (failed pings)
             * UpLink.debug.spike([Infinity, Infinity, Infinity]);
             */
            spike: (mockLatency) => this.#injectLatency(mockLatency),

            /**
             * Enables or disables the `"debug:ping"` event stream.
             * When enabled, a {@link DebugPingEventDetail} `CustomEvent` is dispatched
             * on every poll cycle, regardless of whether the ping succeeded or failed.
             *
             * @memberof Monitor#debug
             * @param {boolean} [val=true] - Pass `true` to enable, `false` to disable.
             * @returns {void}
             *
             * @example
             * UpLink.debug.stream(true);
             * UpLink.on('debug:ping', ({ detail }) => {
             *   console.log(detail.endpoint, detail.duration, detail.snapshot);
             * });
             */
            stream: (val = true) => {
                this.#debugStreamEnabled = !!val;
            }

        });

        this.startPollingNetwork();
    };

    /**
     * Starts the polling loop if it is not already running.
     *
     * If the browser tab is currently hidden when this is called, polling will be deferred
     * until the tab becomes visible. Also attaches (once) the `visibilitychange`, `online`,
     * and `offline` window event listeners that automatically pause/resume polling.
     *
     * This method is called automatically by the constructor and after `config()`.
     * You only need to call it manually if you previously called `stopPollingNetwork()`.
     *
     * @returns {void}
     *
     * @example
     * UpLink.stopPollingNetwork();
     * // ... later ...
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
                    };
                } else {
                    if (this.#pollingNetwork) {
                        this.#pollingPausedByVisibilityListener = true;
                        this.stopPollingNetwork();
                    };
                };
            }, { signal: this.#mainAbortController.signal });

            window.addEventListener("offline", () => {

                if (this.#nativeEventBufferOffline || this.#pollingPausedByVisibilityListener) return;

                this.#nativeEventBufferOffline = true;

                setTimeout(() => {
                    this.#nativeEventBufferOffline = false;
                }, 2000);

                this.stopPollingNetwork();
                this.startPollingNetwork();
            }, { signal: this.#mainAbortController.signal });

            window.addEventListener("online", () => {

                if (this.#nativeEventBufferOnline || this.#pollingPausedByVisibilityListener) return;

                this.#nativeEventBufferOnline = true;

                setTimeout(() => {
                    this.#nativeEventBufferOnline = false;
                }, 2000);

                this.stopPollingNetwork();
                this.startPollingNetwork()

            }, { signal: this.#mainAbortController.signal });
        }

    }

    /**
     * Stops the polling loop and cancels any pending timeouts and in-flight fetch requests.
     *
     * If called for a reason other than a tab-visibility pause, this also aborts and
     * nullifies the main AbortController, removing the `visibilitychange`, `online`,
     * and `offline` window event listeners.
     *
     * Does **not** reset accumulated metrics — call {@link Monitor#destroy} for a full teardown
     * or {@link Monitor#debug.reset} to clear metrics while keeping listeners intact.
     *
     * @returns {void}
     *
     * @example
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
            this.#fetchAbortController.abort()
        }
        this.#pollingNetwork = false;
    }

    /**
     * Current signal bar count, derived from the average latency.
     * Maps directly to the active {@link NetworkCondition}.
     *
     * | Bars | Condition     |
     * |------|---------------|
     * | 5    | Optimal       |
     * | 4    | Stable        |
     * | 3    | High Latency  |
     * | 2    | Degraded      |
     * | 1    | Critical      |
     * | 0    | Disconnected  |
     *
     * @type {number}
     * @readonly
     *
     * @example
     * console.log(UpLink.bars); // → 5
     */
    get bars() {
        return this.#bars
    }

    /**
     * Whether UpLink currently considers the connection to be online.
     * This is based on actual fetch success/failure, **not** `navigator.onLine`.
     * Transitions fire `"online"` and `"offline"` events.
     *
     * @type {boolean}
     * @readonly
     *
     * @example
     * if (UpLink.online) {
     *   submitForm();
     * }
     */
    get online() {
        return this.#online
    }

    /**
     * The current network condition descriptor object.
     *
     * @type {NetworkCondition}
     * @readonly
     *
     * @example
     * const { label, alias, code } = UpLink.networkCondition;
     * // → { label: "High Latency", alias: "Slow", code: "NET_SLOW" }
     */
    get networkCondition() {
        return this.#networkCondition
    }

    /**
     * Average latency calculated from the successful (non-`Infinity`) samples in
     * the current rolling window of up to 10 pings.
     *
     * Returns `Infinity` if all samples in the current window are failures.
     *
     * @type {number}
     * @readonly
     *
     * @example
     * console.log(`Avg latency: ${UpLink.latency.toFixed(0)}ms`);
     */
    get latency() {
        const successful = this.#latencyLog.filter(v => v !== Infinity);
        if (successful.length === 0) return Infinity;
        return successful.reduce((sum, val) => sum + val, 0) / successful.length;
    }

    /**
     * Average jitter (mean absolute deviation between consecutive latency samples) in ms.
     * Calculated from the current rolling window.
     *
     * Returns `0` if fewer than 2 samples exist.
     * Returns `5000` if all consecutive pairs contain a failure (`Infinity`), signalling
     * that jitter is unmeasurable (effectively maxed out).
     *
     * @type {number}
     * @readonly
     *
     * @example
     * console.log(`Jitter: ${UpLink.jitter.toFixed(0)}ms`);
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
     * Estimated packet-loss percentage based on the ratio of `Infinity` samples to
     * total samples in the current rolling window. Rounded to the nearest whole number.
     *
     * Returns `0` when the log is empty.
     *
     * @type {number}
     * @readonly
     *
     * @example
     * if (UpLink.packetLoss > 20) {
     *   showUnstableConnectionWarning();
     * }
     */
    get packetLoss() {
        if (this.#latencyLog.length === 0) return 0;
        const failures = this.#latencyLog.filter(v => v === Infinity).length;
        return Math.round((failures / this.#latencyLog.length) * 100);
    }

    /**
     * Configures UpLink with custom options. **Must be called before any events are expected**
     * and can only be called **once** per lifecycle — attempting to reconfigure a running instance
     * throws an error. Call {@link Monitor#destroy} first if you need to reconfigure.
     *
     * Internally, `config()` stops the polling loop, applies all provided options, validates them,
     * then restarts polling from scratch.
     *
     * @param {Object}  [options={}]                       - Configuration options. All fields are optional.
     * @param {Object}  [options.endPoints]                - Custom polling endpoints.
     * @param {string}  [options.endPoints.main]           - Primary endpoint URL. Must be reachable via a `no-cors` fetch.
     * @param {string}  [options.endPoints.backup]         - Fallback endpoint URL, used when `main` times out (> 3500ms).
     * @param {Object}  [options.latencyThresholds]        - Override the ms boundaries for condition classification.
     *   All four keys (`optimal`, `stable`, `highLatency`, `degraded`) must remain in strictly ascending order.
     *   Values must be numbers > 0, and values ≤ 10ms are rejected as physically implausible.
     *   Values ≤ 30ms trigger a `console.warn` (suppressible via `silenceWarnings`).
     * @param {number}  [options.latencyThresholds.optimal]      - Upper bound for "Optimal" condition (default: 100).
     * @param {number}  [options.latencyThresholds.stable]       - Upper bound for "Stable" condition (default: 250).
     * @param {number}  [options.latencyThresholds.highLatency]  - Upper bound for "High Latency" condition (default: 500).
     * @param {number}  [options.latencyThresholds.degraded]     - Upper bound for "Degraded" condition (default: 700).
     * @param {Object}  [options.pollingIntervals]               - Override the adaptive polling step durations (ms).
     *   All values must be numbers ≥ 500ms to prevent network flooding.
     * @param {number}  [options.pollingIntervals.unstable]      - Interval used when condition is changing (default: 2000).
     * @param {number}  [options.pollingIntervals.stabilising]   - Interval after 10 stable readings (default: 4000).
     * @param {number}  [options.pollingIntervals.stable]        - Interval after 20 stable readings (default: 6000).
     * @param {boolean} [options.silenceWarnings=false]          - When `true`, suppresses non-critical `console.warn` calls inside `config()`.
     *
     * @throws {UpLinkError} `"ALREADY_CONFIGURED"` — if `config()` is called more than once.
     * @throws {UpLinkError} `"CONFIG_ERR"` — if any option value fails validation.
     *
     * @returns {void}
     *
     * @example
     * UpLink.config({
     *   endPoints: {
     *     main: 'https://api.example.com/health',
     *     backup: 'https://1.1.1.1/cdn-cgi/trace',
     *   },
     *   latencyThresholds: {
     *     optimal: 80,
     *     stable: 200,
     *     highLatency: 400,
     *     degraded: 600,
     *   },
     *   pollingIntervals: {
     *     unstable: 1500,
     *     stabilising: 3000,
     *     stable: 5000,
     *   },
     *   silenceWarnings: true,
     * });
     */
    config({ endPoints, pollingIntervals, latencyThresholds, silenceWarnings } = {}) {
        if (this.#configured) throw new UpLinkError(
            "UpLink configuration can only be set once. Re-initialization is not supported.",
            "ALREADY_CONFIGURED"
        );

        this.stopPollingNetwork();

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
            const invertedLatencyThresholds = {}

            Object.keys(this.#latencyThresholds).forEach(key => {
                invertedLatencyThresholds[this.#latencyThresholds[key]] = key;
            })

            let sequenceIntegrity = {
                value: 0,
                key: ""
            };

            thresholdValues.forEach(threshold => {

                let value;
                const invertedKey = invertedLatencyThresholds[threshold];

                if (latencyThresholds[invertedKey] !== undefined) {

                    const setValue = Number(latencyThresholds[invertedKey]);

                    if (!isNaN(setValue)) { value = setValue } else throw new UpLinkError(
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
                            `imposible latency value set for '${invertedKey}'. latency below 10ms is unlikly over a network`,
                            "CONFIG_ERR"
                        );

                        else if (value <= 30) {

                            !this.#silenceWarnings ? console.warn(
                                `The latency threshold for '${invertedKey}' is set to '${value}ms'. While technically possible on high-end local fiber, it is highly unusual for general network conditions. Are you sure this is the target you intended?`
                            ) : ""
                        }

                        this.#latencyThresholds[invertedKey] = value;
                    };

                } else throw new UpLinkError(
                    `the value set for '${invertedKey}' cannot be less than that set for ${sequenceIntegrity.key}`,
                    "CONFIG_ERR"
                );

                sequenceIntegrity.value = value;
                sequenceIntegrity.key = invertedKey;
            })

        };

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
                };
            };
        };

        this.#currentpollingInterval = this.#pollingIntervals.unstable;
        this.#currentEndPoint = {
            endPoint: this.#endPoints.main,
            type: "main"
        };

        this.#configured = true;

        this.startPollingNetwork();
    }

    /**
     * Schedules a periodic check to see if the main endpoint has recovered after UpLink
     * falls back to the backup endpoint. Runs every 60 seconds. If the main endpoint
     * responds, it is restored as the active endpoint. If it continues to time out,
     * the check reschedules itself.
     *
     * Only one check runs at a time; subsequent calls while a check is pending are no-ops.
     *
     * @private
     * @returns {void}
     */
    #checkMainEndPointForAPulse() {

        clearTimeout(this.#checkMainEndPointTimeOutId);

        this.#checkMainEndPointTimeOutId = setTimeout(async () => {

            const abortController = new AbortController()
            const timeout = setTimeout(() => {
                abortController.abort();
            }, 3500);

            try {
                await fetch(this.#endPoints.main, {
                    mode: 'no-cors',
                    cache: 'no-store',
                    signal: abortController.signal
                });

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

    /**
     * Fully tears down the UpLink instance: stops polling, removes all window/document
     * event listeners, and resets all internal state and metrics to their initial values.
     *
     * Also resets the `#configured` flag, allowing `config()` to be called again if needed.
     *
     * Note: This does **not** remove any `"ping"`, `"online"`, or other CustomEvent listeners
     * that external code attached via `on()`. Those must be removed manually with `off()`.
     *
     * @returns {void}
     *
     * @example
     * // Teardown before removing the component that uses UpLink
     * UpLink.destroy();
     */
    destroy() {

        this.stopPollingNetwork();
        if (this.#mainAbortController) {
            this.#mainAbortController.abort()
            this.#mainAbortController = null;
        }

        this.#latencyLog = [];
        this.#stabilityLatencyLog = [];
        this.#stabilityLatencyLogLastEntry = undefined;
        this.#consecutiveFailures = 0;
        this.#bars = 0;
        this.#online = navigator.onLine;
        this.#currentEndPoint = {
            endPoint: this.#endPoints.main,
            type: "main"
        };
        this.#checkMainEndPointTimeOutId = false;
        this.#pollingPausedByVisibilityListener = false;
        this.#networkCondition = this.#networkConditionStates.syncing;
        this.#nativeEventBufferOffline = false;
        this.#nativeEventBufferOnline = false;
        this.#configured = false;
        this.#currentpollingInterval = this.#pollingIntervals.unstable;
    }

    /**
     * The core polling loop. Fires a `no-cors` fetch to the current endpoint, records
     * the round-trip time (or `Infinity` on failure), updates the consecutive-failure counter,
     * dispatches `"online"` / `"offline"` transition events as appropriate, then schedules
     * the next cycle.
     *
     * Timing: the next iteration is scheduled so that the **wall-clock interval** between
     * the *start* of consecutive polls is approximately `#currentpollingInterval`. If a ping
     * takes longer than the interval, the next poll fires immediately (0ms delay).
     *
     * Endpoint failover: if the fetch does not complete within 3500ms, the abort controller
     * is triggered and the active endpoint is toggled between main and backup. When falling
     * back to backup, `#checkMainEndPointForAPulse()` is started to monitor recovery.
     *
     * @private
     * @async
     * @returns {Promise<void>}
     */
    async #pollingHandler() {
        const start = performance.now();

        const restart = () => {

            const timeoutDuration = this.#currentpollingInterval - (performance.now() - start);

            if (this.#pollingNetwork) {
                this.#pollingTimeOutId = setTimeout(() => {
                    this.#pollingHandler();
                }, (timeoutDuration < 0) ? 0 : timeoutDuration);
            };
        }

        this.#fetchAbortController = new AbortController();

        try {
            this.#forceTimeOutOnNetworkRequest = setTimeout(() => {
                this.#fetchAbortController.abort();

                if (this.#currentEndPoint.type === "main") {

                    this.#currentEndPoint.endPoint = this.#endPoints.backup;
                    this.#currentEndPoint.type = "backup";
                    (this.#checkMainEndPointTimeOutId === false) ? this.#checkMainEndPointForAPulse() : ""
                } else {

                    this.#currentEndPoint.endPoint = this.#endPoints.main;
                    this.#currentEndPoint.type = "main";
                    clearTimeout(this.#checkMainEndPointTimeOutId);
                    this.#checkMainEndPointTimeOutId = false;
                }

            }, 3500);

            await fetch(this.#currentEndPoint.endPoint, {
                mode: 'no-cors',
                cache: 'no-store',
                signal: this.#fetchAbortController.signal
            });

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
                        duration: performance.now() - start,
                        snapshot: this.debug.state()
                    }
                }));

            }
        }
    }

    /**
     * Evaluates the current average latency and consecutive-failure count, sets `#bars`
     * and `#networkCondition` accordingly, then calls `#stabilityCheck()` and dispatches
     * a `"ping"` event.
     *
     * **Disconnected override**: if `#consecutiveFailures >= 2`, the condition is forced to
     * `disconnected` (bars = 0) regardless of the latency average.
     *
     * This method is called after every polling cycle (both successful and failed).
     *
     * @private
     * @returns {void}
     */
    #networkConditionCheck() {
        const avg = this.latency;
        const isDisconnected = this.#consecutiveFailures >= 2;

        if (isDisconnected) {
            this.#bars = 0;
            this.#networkCondition = this.#networkConditionStates.disconnected;
        } else if (avg < this.#latencyThresholds.optimal) {
            this.#bars = 5;
            this.#networkCondition = this.#networkConditionStates.optimal;
        }
        else if (avg < this.#latencyThresholds.stable) {
            this.#bars = 4;
            this.#networkCondition = this.#networkConditionStates.stable;
        }
        else if (avg < this.#latencyThresholds.highLatency) {
            this.#bars = 3;
            this.#networkCondition = this.#networkConditionStates.highLatency;
        }
        else if (avg < this.#latencyThresholds.degraded) {
            this.#bars = 2;
            this.#networkCondition = this.#networkConditionStates.degraded;
        } else {
            this.#bars = 1;
            this.#networkCondition = this.#networkConditionStates.critical;
        }

        if (this.#pollingNetwork) {
            this.#stabilityCheck();

            this.dispatchEvent(new CustomEvent("ping", {
                detail: {
                    online: this.#online,
                    latency: avg,
                    condition: this.#networkCondition,
                    bars: this.#bars,
                    jitter: this.jitter,
                    packetLoss: this.packetLoss,
                }
            }));
        }
    }

    /**
     * Maintains the adaptive polling interval by tracking how long the condition label
     * has remained unchanged.
     *
     * - When the condition label **changes**: resets the stability log, resets the polling
     *   interval to `unstable`, and dispatches a `"networkConditionChange"` event.
     * - After **10** consecutive identical readings: steps up to `stabilising` interval.
     * - After **20** consecutive identical readings: steps up to `stable` interval and
     *   trims the stability log to cap at 20 entries.
     *
     * Called once per polling cycle, from `#networkConditionCheck()`.
     *
     * @private
     * @returns {void}
     */
    #stabilityCheck() {

        if (this.#stabilityLatencyLogLastEntry !== this.#networkCondition.label) {
            this.#stabilityLatencyLog = [];
            this.#currentpollingInterval = this.#pollingIntervals.unstable;

            this.dispatchEvent(new CustomEvent("networkConditionChange", {
                detail: {
                    online: this.#online,
                    latency: this.latency,
                    condition: this.#networkCondition,
                    bars: this.#bars,
                    jitter: this.jitter,
                    packetLoss: this.packetLoss,
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

    /**
     * Returns the current average latency converted to the requested unit.
     *
     * Supported formats:
     * - `"ms"` (default) — milliseconds, returned as-is.
     * - `"s"` — seconds (`latency / 1000`). Returns `0` when latency is exactly `0`.
     *
     * Returns `Infinity` in any format when the connection is offline or all samples failed.
     *
     * @param {"ms"|"s"} [format="ms"] - The unit to convert to.
     * @returns {number} Latency in the requested unit, or `Infinity`.
     * @throws {UpLinkError} `"CONFIG_ERR"` — if `format` is not a string.
     *
     * @example
     * UpLink.getLatencyAs("ms"); // → 142
     * UpLink.getLatencyAs("s");  // → 0.142
     * UpLink.getLatencyAs("s");  // → Infinity  (when offline)
     */
    getLatencyAs(format = "ms") {
        if (typeof format !== "string") {
            throw new UpLinkError(
                "'getLatencyAs()' only accepts a string, e.g. 'ms', 's'",
                "CONFIG_ERR"
            );
        }

        if (this.latency !== Infinity) {
            switch (format) {
                case "s": return (this.latency === 0) ? 0 : this.latency / 1000;
                default: return this.latency;
            }
        } else return Infinity;
    }

    // ─── Debug helpers ────────────────────────────────────────────────────────

    /**
     * Resets all runtime metrics and internal state to initial values without stopping
     * the polling loop or removing event listeners.
     *
     * Resets: `#latencyLog`, `#stabilityLatencyLog`, `#stabilityLatencyLogLastEntry`,
     * `#consecutiveFailures`, `#bars`, `#online`, and `#networkCondition`.
     *
     * Exposed publicly via {@link Monitor#debug.reset}.
     *
     * @private
     * @returns {void}
     */
    #debugReset() {
        this.#latencyLog = [];
        this.#stabilityLatencyLog = [];
        this.#stabilityLatencyLogLastEntry = undefined;
        this.#consecutiveFailures = 0;
        this.#bars = 0;
        this.#online = navigator.onLine;
        this.#networkCondition = this.#networkConditionStates.syncing;
    }

    /**
     * Injects mock latency values into the rolling log and immediately re-evaluates
     * the network condition. Does **not** affect `#consecutiveFailures` (resets it to 0).
     *
     * Exposed publicly via {@link Monitor#debug.spike}.
     *
     * @private
     * @param {number[]} [mockLatency=[2000]] - Latency values to prepend to the log.
     *   Each value is inserted at the front (`unshift`) in order, trimming the log to 10
     *   entries after each insertion. Use `Infinity` to simulate a failed ping.
     * @throws {UpLinkError} `"DEBUG_ERR"` — if `mockLatency` is not an array of numbers.
     * @returns {void}
     */
    #injectLatency(mockLatency = [2000]) {
        if (!Array.isArray(mockLatency) || mockLatency.some(v => typeof v !== 'number')) {
            throw new UpLinkError("'spike()' expects an array of numbers", "DEBUG_ERR");
        }

        // Reset, but then recount based on the injected mock data
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
}

/**
 * The UpLink singleton instance. Import and use this directly — do not instantiate `Monitor`.
 *
 * Polling starts automatically on import. Use `config()` to customise before your first
 * event listener if needed.
 *
 * @type {Monitor}
 *
 * @example
 * import UpLink from './uplink.js';
 *
 * UpLink.on('networkConditionChange', ({ detail }) => {
 *   document.title = `Network: ${detail.condition.alias} (${detail.bars} bars)`;
 * });
 */
const UpLink = new Monitor();
export default UpLink;