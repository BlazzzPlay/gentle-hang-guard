import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDangerous } from "../src/patterns.js";

const blocked = [
	"npx vitest run --root / src/foo.test.ts",
	"vitest run --root=/ ",
	"cd app && vitest --root / --run",
	"vitest --root '/'",
	'vitest --root="/"',
	"./pocketbase serve & sleep 2; curl localhost:8090; wait",
	"server & sleep 1; npm test; wait",
	"a & b &\nwait",
	"(srv &) ; wait",
	"srv & wait;",
	"srv &\nwait # all",
];
const allowed = [
	"vitest run --root /tmp/x",
	"vitest --root ./",
	"vitest --root /home/u/app",
	"vitest run --rootDir /",
	"ls / && echo ok",
	"npm test 2>&1 | tail",
	"a && b && wait",
	"wait",
	"echo wait",
	"srv & pid=$!; wait $pid",
	"srv & wait %1",
	"srv & wait 1234",
	'node -e "await foo(); waitFor()" &',
	"srv & echo 'wait'",
	"echo \"call wait later\" & true",
	"cat <<EOF\nrun & then wait\nEOF",
	"x &>/dev/null; wait",
	"git log >&2; wait",
	"timeout 60 sleep 999",
];
for (const c of blocked) test(`blocks: ${JSON.stringify(c)}`, () => {
	const r = detectDangerous(c);
	assert.equal(r.block, true);
	assert.ok(r.reason.length > 10);
});
for (const c of allowed) test(`allows: ${JSON.stringify(c)}`, () => assert.equal(detectDangerous(c).block, false));
test("reasons suggest alternatives", () => {
	assert.match(detectDangerous("vitest --root /").reason, /--root \//);
	const w = detectDangerous("srv & wait").reason;
	assert.match(w, /wait \$pid/);
	assert.match(w, /bash_background/);
});
