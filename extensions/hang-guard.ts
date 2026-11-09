import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readConfig } from "../src/config.js";
import { detectDangerous } from "../src/patterns.js";
import { createSlowRegistry } from "../src/slow.js";
import { applyDefaultTimeout } from "../src/timeout.js";

// hang-guard: for every `bash` tool call (parent session and subagents)
//  - block `--root /` and bare `wait` alongside background `&` jobs;
//  - give calls without a timeout HANG_GUARD_DEFAULT_TIMEOUT_S (120 s);
//  - warn once when a call runs past HANG_GUARD_SLOW_ALERT_S (300 s).
// HANG_GUARD_DISABLE=1 turns everything off.
//
// Slow alerts use ctx.ui.notify. In a Gentle Shell subagent
// (GENTLE_PI_AGENTS_CHILD=1, `pi --mode rpc`) the runner currently drops
// generic notify requests, so the alert does not reach the parent; the
// default timeout is what actually stops the hang there.
type Notify = (text: string, level: "info" | "warning" | "error") => void;

export default function hangGuard(pi: ExtensionAPI): void {
	const cfg = readConfig(process.env);
	if (cfg.disabled) return;

	let notify: Notify | undefined;
	const slow = createSlowRegistry({
		thresholdS: cfg.slowAlertS,
		onAlert: (message: string) => notify?.(`hang-guard: ${message}`, "warning"),
	});

	pi.on("tool_call", (event, ctx) => {
		if (event.toolName !== "bash") return;
		notify = (text, level) => ctx.ui.notify(text, level);
		const input = event.input as { command?: string; timeout?: unknown };
		const verdict = detectDangerous(input.command ?? "");
		if (verdict.block) return { block: true, reason: verdict.reason };
		// Pi documents in-place mutation of event.input; later handlers see it.
		Object.assign(input, applyDefaultTimeout(input, cfg));
	});

	pi.on("tool_execution_start", (event, ctx) => {
		if (event.toolName !== "bash") return;
		notify = (text, level) => ctx.ui.notify(text, level);
		slow.start(event.toolCallId, (event.args as { command?: string })?.command ?? "");
	});
	pi.on("tool_execution_end", (event) => {
		if (event.toolName === "bash") slow.finish(event.toolCallId);
	});
	pi.on("session_shutdown", () => slow.clear());
}
