# gentle-hang-guard

Pi / Gentle Shell extension that stops hung bash commands for the parent session and subagents.
Interim complement to Gentle Shell's subagent stall watchdog (kills the whole child after 30 min with a tool in flight; parent bash has no default timeout).

## Specs

- S1 Origin: "gentle shek tiene un salvaguarda para evitar estos prosesos pegados?" — two real hangs in subagents: a bash script with a bare `wait` that also waited on a background `pocketbase serve` (~15 min), and `vitest run --root / …` scanning the whole filesystem (~23 min); neither was cut automatically.
- S2 Repo: "en un repo nuevo como nuestro otro plugin revisa en engram" — same pattern as github.com/BlazzzPlay/gentle-canvas-tailscale (Pi extension, src/ + test/ with node --test, MIT, README, icon, Gentle Hub topics gentle-shell-package / gentle-shell-extension). Name: "gentle-hang-guard". Location ~/projects/gentle-hang-guard.
- S3 Scope v1 (user selected all three): "Tiempo máximo por defecto en bash" — if a bash call has no `timeout`, set a configurable default (e.g. 120 s); applies to parent and subagents.
- S4 "Bloquear comandos peligrosos" — `--root /` (e.g. vitest), bare `wait` (no PIDs) when the same command starts background `&` jobs; block with a reason that suggests bash_background / waiting on explicit PIDs.
- S5 "Aviso de comando lento" — when a bash call runs longer than N minutes (configurable), notify (in a subagent: reach the parent; in the parent: UI warning).
- S6 Issue: "Sí, junto al plugin"; "para el Issue para Gentle Shell recuerda revisa si hay algo acierto o cerrado, pero creamoremos el nuestro propio" — own issue in Gentleman-Programming/gentle-shell citing related #1034 #1070 #1323 #1562 #2676; asks for a default bash timeout and current-tool elapsed time in subagent_status. Draft only; publish only with explicit OK.
- S7 Timing/decision: "Plugin + issue, como acordamos (recomendado)" after T13/T14 of the bingo.

## Tasks

- [x] T1 S2 inline — scaffold repo, feature doc — commit: d136a07
- [x] T2 S3 S4 S5 worker — src libs (config, patterns, timers) + extension + node tests + real pi load check — commit: 24f7d0c
- [x] T3 S2 — README (en + es), icon — commit: 9cb190b
- [x] T4 S6 — issue draft (docs/issue-draft.md), not published — commit: 4317909
- [x] T5 S2 — publish repo + topics + tag (needs explicit user OK) — commit: n/a (v0.1.0)

## Log

- L1 Context: hangs observed in web-bingo session (see web-bingo odd/tasks/bingo-mvp.md L29-L31).
- L2 Gentle Shell findings: watchdog lib/agents-config.ts:110-111 (stall 4 min, tool stall 30 min, configurable in subagents.json, kills the whole child), agents-runner.ts:741; Pi bash `timeout` optional with no default (pi-coding-agent dist/core/tools/bash.js:30); hooks available: pi.on("tool_call") can mutate event.input / block; tool_execution_start/update; session events.
- L3 T2 (24f7d0c): 44/44 node tests. Real pi run: default timeout cut "sleep 999" at 3 s; "npx vitest run --root / nothing" blocked; timeout kills backgrounded & jobs (pi bash spawns its own process group and killProcessTree on timeout). S5 partial: a subagent cannot reach the parent from an extension (Gentle Shell lib/agents-protocol.ts:431 forwards only "missing tools" notify messages); in children the alert is ui.notify (dropped) and the default timeout is the real stop. → goes into the issue (S6). Bare-wait block covered by unit tests only.
- L4 T3 (9cb190b): READMEs en/es, icon, social preview SVG (GitHub upload needs a PNG for T5). T4 draft written in the same commit; search queries replaced with the real ones run by the parent; subagent_status format cited as extensions/gentle-agents.ts:504. T4 stays open until the hang experiment result is filled in.
- L5 Experiment: worker hung on python sleep(2700) from 23:57:40; parent notified ~00:27:50 timed_out "stalled for 30 min with tool \"bash\" still running after: bash"; python process gone at 00:27:52. Draft complete (4317909), not published.
- L6 Published: https://github.com/BlazzzPlay/gentle-hang-guard (public, tag v0.1.0, topics gentle-shell-package, gentle-shell-extension, pi-package, gentle-shell). Issue https://github.com/Gentleman-Programming/gentle-shell/issues/3040 created from feature_request form; requested form labels enhancement + status:needs-review did not appear on read-back (not retried). Social preview PNG must be uploaded in GitHub settings by the user.
- L7 "intalemoslo glovar y dejemoslo con un margen mas acotado como 10 minutos asi ganamos 20 en caso dd error": installed globally (pi install git:github.com/BlazzzPlay/gentle-hang-guard → ~/.gentle-shell/agent/git/...); HANG_GUARD_DEFAULT_TIMEOUT_S=600 exported in ~/.zshenv (backup ~/.zshenv.bak-hang-guard). Verified: installed config reads 600; real pi run with override 3 s → "Command timed out after 3 seconds". Takes effect in new sessions.
