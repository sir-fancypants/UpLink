"use strict"

const VERSION = "3.0.0";

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

class Utility {
    static isPlainObject(value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    }
}

class UpLinkError extends Error {

    constructor(message, code = "GENERAL_ERROR") {
        super(message);
        this.name = "UpLinkError";
        this.code = code;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, UpLinkError);
        }
    }
}


class Monitor extends EventTarget {

    #latencyLog = [];

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

    #endPoints = {
        main: 'https://dns.google/resolve?name=.&type=NS',
        backup: 'https://1.1.1.1/cdn-cgi/trace',
    };

    #currentEndPoint = {
        endPoint: 'https://dns.google/resolve?name=.&type=NS',
        type: "main"
    };

    #pollingIntervals = {
        unstable: 2000,
        stabilising: 4000,
        stable: 6000,
    };

    #currentpollingInterval = 2000;

    #latencyThresholds = {
        optimal: 100,      // Below 100ms
        stable: 250,       // 100ms - 250ms
        highLatency: 500,// 250ms - 500ms
        degraded: 700,    // 500ms - 700ms
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

    #networkCondition = {
        label: "Syncing",
        alias: "Calculating",
        code: "NET_PENDING",
    };

    #online = navigator.onLine;

    #mainAbortController;

    #forceTimeOutOnNetworkRequest;

    #nativeEventBufferOffline = false;

    #nativeEventBufferOnline = false;

    #consecutiveFailures = 0;
    #debugStreamEnabled = false;
    constructor() {
        super();

        this.on = this.addEventListener.bind(this);

        this.off = this.removeEventListener.bind(this);

        this.debug = Object.freeze({
            version: () => {
                printSignature();
                return VERSION;
            },

            logs: () => this.#latencyLog.slice(),

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

            endpoints: () => ({
                main: this.#endPoints.main,
                backup: this.#endPoints.backup,
                current: this.#currentEndPoint
            }),

            reset: () => this.#debugReset(),

            spike: (mockLatency) => this.#injectLatency(mockLatency),
            stream: (val = true) => {
                this.#debugStreamEnabled = !!val;
            }

        });

        this.startPollingNetwork();
    };

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

    get bars() {
        return this.#bars
    }

    get online() {
        return this.#online
    }

    get networkCondition() {
        return this.#networkCondition
    }

    get latency() {
        const successful = this.#latencyLog.filter(v => v !== Infinity);
        if (successful.length === 0) return Infinity;
        return successful.reduce((sum, val) => sum + val, 0) / successful.length;
    }

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

    get packetLoss() {
        if (this.#latencyLog.length === 0) return 0; // denominator is always ≥ 1 past here
        const failures = this.#latencyLog.filter(v => v === Infinity).length;
        return Math.round((failures / this.#latencyLog.length) * 100);
    }

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

            // get threshold values and sort them A-Z
            const thresholdValues = Object.values(this.#latencyThresholds).sort((a, b) => a - b);
            const invertedLatencyThresholds = {}

            // invert the #latencyThresholds default object
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
            // Ping failed — record as Infinity and check if we just went offline
            this.#consecutiveFailures++;

            this.#latencyLog.unshift(Infinity);
            if (this.#latencyLog.length > 10) this.#latencyLog.pop();

            this.#networkConditionCheck();

            // Transition from online → offline
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

    //debug

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

const UpLink = new Monitor();
export default UpLink;