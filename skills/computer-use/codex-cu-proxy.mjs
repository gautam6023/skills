// Stdio MCP proxy for Codex's cua-repl: injects the Codex turn metadata that its
// Chrome-extension browser backend requires, so background tabs work from Claude Code.
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const [cmd, ...args] = process.argv.slice(2);
const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'inherit'], env: process.env });
const sessionId = randomUUID();
let turn = 0;

let buf = '';
process.stdin.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    let line = buf.slice(0, i);
    buf = buf.slice(i + 1);
    try {
      const msg = JSON.parse(line);
      if (msg.method === 'tools/call') {
        msg.params ??= {};
        msg.params._meta = {
          ...msg.params._meta,
          'x-codex-turn-metadata': JSON.stringify({ session_id: sessionId, turn_id: `turn-${++turn}` }),
        };
        line = JSON.stringify(msg);
      }
    } catch {}
    child.stdin.write(line + '\n');
  }
});
process.stdin.on('end', () => child.stdin.end());
child.stdout.pipe(process.stdout);
child.on('exit', (code) => process.exit(code ?? 0));
