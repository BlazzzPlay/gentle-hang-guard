import { test } from "node:test";
import assert from "node:assert/strict";
import { readConfig, MAX_TIMEOUT_SECONDS } from "../src/config.js";

test("defaults", () => {
	assert.deepEqual(readConfig({}), { disabled: false, defaultTimeoutS: 120, slowAlertS: 300 });
});
test("valid overrides", () => {
	assert.deepEqual(readConfig({ HANG_GUARD_DEFAULT_TIMEOUT_S: "3", HANG_GUARD_SLOW_ALERT_S: "60" }), { disabled: false, defaultTimeoutS: 3, slowAlertS: 60 });
});
test("invalid values fall back to defaults", () => {
	for (const bad of ["0", "-5", "abc", "", "NaN", "Infinity"]) {
		const c = readConfig({ HANG_GUARD_DEFAULT_TIMEOUT_S: bad, HANG_GUARD_SLOW_ALERT_S: bad });
		assert.equal(c.defaultTimeoutS, 120, bad);
		assert.equal(c.slowAlertS, 300, bad);
	}
});
test("timeout capped at bash max", () => {
	assert.equal(readConfig({ HANG_GUARD_DEFAULT_TIMEOUT_S: "99999999" }).defaultTimeoutS, MAX_TIMEOUT_SECONDS);
});
test("disable", () => {
	assert.equal(readConfig({ HANG_GUARD_DISABLE: "1" }).disabled, true);
	assert.equal(readConfig({ HANG_GUARD_DISABLE: "0" }).disabled, false);
});
