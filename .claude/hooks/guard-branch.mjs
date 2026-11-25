// PreToolUse hook (Bash): blocks `git commit` and `git push` that would land on main/master.
// Every phase must live on its own branch and reach main only through a PR.
// Exit code 2 = block the command and show the message to Claude.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PROTECTED = ['main', 'master'];

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';

const isCommit = /\bgit\s+(-C\s+\S+\s+)?commit\b/.test(command);
const isPush = /\bgit\s+(-C\s+\S+\s+)?push\b/.test(command);
if (!isCommit && !isPush) process.exit(0);

function currentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: input.cwd, encoding: 'utf8' }).trim();
  } catch {
    return ''; // not a git repo: nothing to protect
  }
}

const onProtected = PROTECTED.includes(currentBranch());
// Catches `git push origin main`, `git push origin HEAD:master`, etc.
const pushNamesProtected = isPush && /\b(main|master)\b/.test(command.split(/\bpush\b/)[1] ?? '');

if (onProtected || pushNamesProtected) {
  console.error('Blocked: no direct commits/pushes to main or master. Create a phase branch and open a PR.');
  process.exit(2);
}
