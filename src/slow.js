// One-shot "slow command" timers per tool call. Clock and scheduler are
// injectable so the behaviour is testable without real time.
export function formatAlert(elapsedMs, command) {
	const flat = String(command ?? "").replace(/\s+/g, " ").trim();
	const head = flat.length > 80 ? `${flat.slice(0, 80)}…` : flat;
	return `bash lleva ${Math.floor(elapsedMs / 60_000)} min: ${head}`;
}

export function createSlowRegistry({
	thresholdS,
	onAlert,
	now = Date.now,
	setTimer = (fn, ms) => { const h = setTimeout(fn, ms); h.unref?.(); return h; },
	clearTimer = clearTimeout,
}) {
	const timers = new Map();
	const finish = (callId) => {
		const h = timers.get(callId);
		if (h !== undefined) clearTimer(h);
		timers.delete(callId);
	};
	return {
		start(callId, command, startedAt = now()) {
			finish(callId);
			const delay = Math.max(0, thresholdS * 1000 - (now() - startedAt));
			timers.set(callId, setTimer(() => {
				timers.delete(callId);
				onAlert(formatAlert(now() - startedAt, command), callId);
			}, delay));
		},
		finish,
		clear() { for (const id of [...timers.keys()]) finish(id); },
		size: () => timers.size,
	};
}
