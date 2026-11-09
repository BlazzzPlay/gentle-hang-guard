import { test } from "node:test";
import assert from "node:assert/strict";
import { applyDefaultTimeout } from "../src/timeout.js";

const cfg = { defaultTimeoutS: 120 };
test("adds default when missing", () => {
	const input = { command: "ls" };
	const out = applyDefaultTimeout(input, cfg);
	assert.deepEqual(out, { command: "ls", timeout: 120 });
	assert.equal(input.timeout, undefined, "input not mutated");
});
test("replaces invalid timeout", () => {
	for (const t of [0, -1, NaN, "10", null, Infinity]) assert.equal(applyDefaultTimeout({ command: "x", timeout: t }, cfg).timeout, 120);
});
test("keeps explicit valid timeout, higher or lower", () => {
	assert.equal(applyDefaultTimeout({ command: "x", timeout: 5 }, cfg).timeout, 5);
	assert.equal(applyDefaultTimeout({ command: "x", timeout: 900 }, cfg).timeout, 900);
});
