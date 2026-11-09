<!-- DRAFT — not published. Target: Gentleman-Programming/gentle-shell. Publish only with explicit OK. -->

> Published as https://github.com/Gentleman-Programming/gentle-shell/issues/3040.

# feat(agents): default bash timeout and current tool elapsed time in subagent_status

## Before submitting

- [x] I searched open and closed issues for duplicates (queries and results below).
- [x] I read the related issues and this request is not covered by them.
- [x] Reports below are sanitized (no private paths or hostnames).

### Search evidence

Queries (`gh search issues --repo Gentleman-Programming/gentle-shell`, open and closed): `timeout`, `hang`, `stuck`, `watchdog`, `stall`, `subagent bash`, `long running`, `frozen`, `bash default timeout`, `foreground command timeout`, `tool_stall_timeout_ms`, `elapsed tool call subagent_status`, `bash timeout`.

| Issue | State | Relation |
| --- | --- | --- |
| #1034 | closed (completed) | related |
| #1070 | closed (completed) | related |
| #1323 | closed (not planned) | related |
| #1562 | closed (not planned) | related |
| #2676 | open | related |

None of them asks for a default `bash` timeout plus the in-flight tool's elapsed time in `subagent_status`.

## Problem

A `bash` call that never ends blocks a subagent for up to 30 minutes, and the parent cannot see what is hanging. Two real cases:

1. **Bare `wait` with a background server.** A subagent ran a script that started a dev server with `&` and then called `wait` without arguments. `wait` waits for every job, including the server, so the call hung for about **15 minutes**.
2. **`vitest run --root /`.** A subagent ran tests with `--root /`, which scanned the whole filesystem for about **23 minutes**.

In both cases the parent only saw `N tool calls · last: bash` in `subagent_status`, with no hint of how long the current call had been running.

## Current behavior

| Area | Behavior | Source |
| --- | --- | --- |
| Pi `bash` tool | `timeout` is optional and has **no default** | pi-coding-agent `dist/core/tools/bash.js` |
| Stall watchdog | 4 min idle / 30 min with a tool in flight (`DEFAULT_STALL_TIMEOUT_MS`, `DEFAULT_TOOL_STALL_TIMEOUT_MS`), configurable in `subagents.json` | `lib/agents-config.ts` (~L110-111) |
| Watchdog action | Stops the **whole** child (`TIMED_OUT`, "stalled for N min with tool … still running") | `lib/agents-runner.ts` `armStall` (~L741) |
| `subagent_status` | Shows only `N tool calls · last: bash`; no elapsed time for the in-flight tool | `extensions/gentle-agents.ts:504` |
| Child notifications | A child extension's `notify` messages are dropped, except those starting with the missing-tools prefix | `lib/agents-protocol.ts` (~L431, `extension_ui_request`) |

Consequences: the watchdog is the only stop; when it fires it throws away the child's work instead of just the hung command; and a child extension cannot warn the parent.

## Proposal

1. **Configurable default `bash` timeout** for subagents (and optionally the parent), for example in `subagents.json`, applied only when a call has no `timeout`. The hung command fails, the agent sees the error and continues.
2. **In-flight tool elapsed time** in `subagent_status` and the agents card, for example `12 tool calls · bash running 7m12s`.
3. **Optional parent notification** when a child tool runs longer than N minutes (or forward child `notify` warnings).

## Acceptance criteria

- [ ] A `bash` call without `timeout` in a subagent is stopped after the configured default; an explicit `timeout` is kept.
- [ ] The default is configurable and documented; it can be disabled.
- [ ] `subagent_status` and the agents card show the current tool's name and elapsed time while it runs.
- [ ] When enabled, the parent gets one notification when a child tool exceeds the configured threshold.
- [ ] The existing stall watchdog keeps its current defaults and behavior.

## Interim workaround

gentle-hang-guard — https://github.com/BlazzzPlay/gentle-hang-guard — a Pi extension that adds a default `bash` timeout (120 s), blocks `--root /` and bare `wait` with `&` jobs, and warns on slow commands. In subagents its warning cannot reach the parent (see "Child notifications" above), so only the default timeout helps there.

## Experiment: deliberately hung subagent

A subagent was deliberately told to run one foreground `bash` call without a `timeout`, with a command that only sleeps for 45 minutes.

- Start time: 23:57:40 (process confirmed running ~20 s later)
- Command: `python3 -c "import time; time.sleep(2700)"`
- Expected cut: ~30 min (`tool_stall_timeout_ms` default), around 00:27:40
- Observed: the parent received the task notification at about 00:27:50 with status `timed_out`
- Message: `stalled for 30 min with tool "bash" still running after: bash`
- Process check at 00:27:52: the `python3 … time.sleep(2700)` process was gone (no orphan left)
- Conclusion: the watchdog works as documented and cleans up the process, but only after 30 minutes and by ending the whole subagent task. Until then the parent sees nothing beyond `last: bash`, and all of the task's work is lost. A default per-command timeout would have ended only the command (as the interim plugin does), and an elapsed-time field would have made the hang visible much earlier.
