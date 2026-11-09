import { test } from "node:test";
import assert from "node:assert/strict";
import { createSlowRegistry, formatAlert } from "../src/slow.js";

function fakeClock() {
	let now = 0; const timers = new Map(); let id = 0;
	return {
		now: () => now,
		setTimer: (fn, ms) => { timers.set(++id, { fn, at: now + ms }); return id; },
		clearTimer: (h) => timers.delete(h),
		advance(ms) { now += ms; for (const [h, t] of [...timers]) if (t.at <= now) { timers.delete(h); t.fn(); } },
		pending: () => timers.size,
	};
}

test("fires once after threshold", () => {
	const c = fakeClock(); const alerts = [];
	const r = createSlowRegistry({ thresholdS: 300, onAlert: (m) => alerts.push(m), ...c });
	r.start("a", "sleep 999");
	c.advance(299_000); assert.equal(alerts.length, 0);
	c.advance(1_000); assert.deepEqual(alerts, ["bash lleva 5 min: sleep 999"]);
	c.advance(600_000); assert.equal(alerts.length, 1);
});
test("finish before threshold cancels", () => {
	const c = fakeClock(); const alerts = [];
	const r = createSlowRegistry({ thresholdS: 10, onAlert: (m) => alerts.push(m), ...c });
	r.start("a", "ls"); r.finish("a"); c.advance(20_000);
	assert.equal(alerts.length, 0); assert.equal(c.pending(), 0);
});
test("clear cancels all", () => {
	const c = fakeClock(); const alerts = [];
	const r = createSlowRegistry({ thresholdS: 10, onAlert: (m) => alerts.push(m), ...c });
	r.start("a", "x"); r.start("b", "y"); r.clear(); c.advance(20_000);
	assert.equal(alerts.length, 0); assert.equal(c.pending(), 0);
});
test("restart same id does not double fire", () => {
	const c = fakeClock(); const alerts = [];
	const r = createSlowRegistry({ thresholdS: 10, onAlert: (m) => alerts.push(m), ...c });
	r.start("a", "x"); r.start("a", "x"); c.advance(20_000);
	assert.equal(alerts.length, 1);
});
test("format truncates to 80 chars and collapses whitespace", () => {
	const cmd = "x".repeat(100);
	assert.equal(formatAlert(90_000, cmd), `bash lleva 1 min: ${"x".repeat(80)}…`);
	assert.equal(formatAlert(30_000, "a\n  b"), "bash lleva 0 min: a b");
});
