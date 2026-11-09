// Settings from the environment, with safe defaults. Invalid values
// (non-numeric, non-positive, non-finite) fall back to the default.
// Pi's bash tool rejects timeouts above MAX_TIMEOUT_SECONDS
// (pi-coding-agent dist/core/tools/bash.js: 2_147_483_647 ms / 1000).
export const MAX_TIMEOUT_SECONDS = 2_147_483_647 / 1000;
export const DEFAULT_TIMEOUT_S = 120;
export const DEFAULT_SLOW_ALERT_S = 300;

function positive(raw, fallback) {
	if (typeof raw !== "string" || raw.trim() === "") return fallback;
	const value = Number(raw);
	return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function readConfig(env = process.env) {
	return {
		disabled: env.HANG_GUARD_DISABLE === "1",
		defaultTimeoutS: Math.min(positive(env.HANG_GUARD_DEFAULT_TIMEOUT_S, DEFAULT_TIMEOUT_S), MAX_TIMEOUT_SECONDS),
		slowAlertS: positive(env.HANG_GUARD_SLOW_ALERT_S, DEFAULT_SLOW_ALERT_S),
	};
}
