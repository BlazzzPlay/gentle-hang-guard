// Detect bash commands known to hang: `--root /` (scans the whole filesystem)
// and a bare `wait` in a command that also starts background `&` jobs (waits
// on long-lived servers forever). A small shell lexer keeps quoted strings,
// comments, heredoc bodies, `&&` and redirections like `2>&1` out of the way.

function lex(src) {
	const tokens = [];
	const heredocs = [];
	let i = 0;
	let word = null; // { text, quoted }
	const flush = () => { if (word) tokens.push({ type: "word", ...word }); word = null; };
	const add = (ch, quoted = false) => { word ??= { text: "", quoted: false }; word.text += ch; word.quoted ||= quoted; };
	while (i < src.length) {
		const c = src[i];
		if (c === "\\" && i + 1 < src.length) { add(src[i + 1]); i += 2; continue; }
		if (c === "'") { const end = src.indexOf("'", i + 1); const stop = end < 0 ? src.length : end; add(src.slice(i + 1, stop), true); if (!word.text) word.quoted = true; i = stop + 1; continue; }
		if (c === '"') {
			let j = i + 1; let text = "";
			while (j < src.length && src[j] !== '"') { if (src[j] === "\\" && j + 1 < src.length) { text += src[j + 1]; j += 2; } else text += src[j++]; }
			word ??= { text: "", quoted: true }; word.text += text; word.quoted = true; i = j + 1; continue;
		}
		if (c === "#" && !word) { while (i < src.length && src[i] !== "\n") i++; continue; }
		if (c === "\n") {
			flush(); tokens.push({ type: "op", text: ";" }); i++;
			while (heredocs.length) {
				const delim = heredocs.shift();
				for (;;) {
					const nl = src.indexOf("\n", i);
					const line = src.slice(i, nl < 0 ? src.length : nl);
					i = nl < 0 ? src.length : nl + 1;
					if (line.replace(/^\t+/, "") === delim || nl < 0) break;
				}
			}
			continue;
		}
		if (c === " " || c === "\t") { flush(); i++; continue; }
		if (c === "<" && src[i + 1] === "<" && src[i + 2] !== "<") {
			flush(); i += 2; if (src[i] === "-") i++;
			while (src[i] === " " || src[i] === "\t") i++;
			let delim = "";
			while (i < src.length && !/[\s;&|<>()]/.test(src[i])) { if (src[i] !== "'" && src[i] !== '"' && src[i] !== "\\") delim += src[i]; i++; }
			heredocs.push(delim); tokens.push({ type: "redir" }); continue;
		}
		if (c === ">" || c === "<") {
			flush(); i++;
			if (src[i] === ">" || src[i] === "<" || src[i] === "|") i++;
			if (src[i] === "&") { i++; while (/[0-9-]/.test(src[i] ?? "")) i++; }
			tokens.push({ type: "redir" }); continue;
		}
		if (c === "&") {
			flush();
			if (src[i + 1] === "&") { tokens.push({ type: "op", text: "&&" }); i += 2; }
			else if (src[i + 1] === ">") { i += 2; if (src[i] === ">") i++; tokens.push({ type: "redir" }); }
			else { tokens.push({ type: "op", text: "&" }); i++; }
			continue;
		}
		if (c === "|" || c === ";" || c === "(" || c === ")") {
			flush();
			const two = src.slice(i, i + 2);
			if (two === "||" || two === ";;" || two === "|&") { tokens.push({ type: "op", text: two }); i += 2; }
			else { tokens.push({ type: "op", text: c }); i++; }
			continue;
		}
		add(c); i++;
	}
	flush();
	return tokens;
}

export const ROOT_REASON =
	"hang-guard: `--root /` makes the tool scan the whole filesystem and can hang for many minutes. Point --root at the project directory (for example `--root .`).";
export const WAIT_REASON =
	"hang-guard: bare `wait` with background `&` jobs waits for every job, including long-lived servers, and can hang forever. Save PIDs and wait on them explicitly (`cmd & pid=$!; …; wait $pid`), or run servers with bash_background.";

export function detectDangerous(command) {
	if (typeof command !== "string" || !command) return { block: false };
	const tokens = lex(command);
	for (let k = 0; k < tokens.length; k++) {
		const t = tokens[k];
		if (t.type !== "word") continue;
		if (t.text === "--root=/") return { block: true, reason: ROOT_REASON };
		if (t.text === "--root" && tokens[k + 1]?.type === "word" && tokens[k + 1].text === "/") return { block: true, reason: ROOT_REASON };
	}
	const background = tokens.some((t) => t.type === "op" && t.text === "&");
	if (background) {
		for (let k = 0; k < tokens.length; k++) {
			const t = tokens[k];
			if (t.type !== "word" || t.quoted || t.text !== "wait") continue;
			const prev = tokens[k - 1];
			if (prev && prev.type !== "op") continue; // not in command position
			let args = false;
			for (let j = k + 1; j < tokens.length && tokens[j].type !== "op"; j++) if (tokens[j].type === "word") { args = true; break; }
			if (!args) return { block: true, reason: WAIT_REASON };
		}
	}
	return { block: false };
}
