// Return a copy of a bash tool input with a default timeout when the call
// has none (or an invalid one). An explicit valid timeout is never changed.
export function applyDefaultTimeout(input, cfg) {
	const t = input?.timeout;
	if (typeof t === "number" && Number.isFinite(t) && t > 0) return { ...input };
	return { ...input, timeout: cfg.defaultTimeoutS };
}
