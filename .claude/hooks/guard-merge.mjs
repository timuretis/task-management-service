// PreToolUse hook: any PR merge or auto-merge needs the user's explicit approval.
// It returns an "ask" decision, so the user is prompted instead of Claude merging silently.
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';

const isMergeTool = input.tool_name?.startsWith('mcp__github__') ?? false;
const isMergeCommand = /\bgh\s+pr\s+merge\b|\bgh\s+api\b.*\/merge\b/.test(command);
if (!isMergeTool && !isMergeCommand) process.exit(0);

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'ask',
    permissionDecisionReason: 'Merging a PR needs your direct approval.',
  },
}));
