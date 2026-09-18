---
description: Diagnose why the Workday Developer Agent isn't reachable from Claude Code (wdcli, sign-in, IDE extension).
allowed-tools: Bash(node:*), Bash(wdcli:*), Read
---

# Developer Agent doctor

Run the checks below, then report a short pass/fail table and **the single most likely fix** —
not every possible fix. If `wdcli-installed` fails the script stops there; later checks depend on it.

## Run this

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dev-agent-doctor.mjs"
```

The script runs on the system `node` with no dependencies, and works the same on macOS, Linux, and
Windows.

If the script is missing, fall back to running the individual commands documented in
`skills/workday-developer-agent/references/setup.md`.

## How to read the output

The script prints one `CHECK <name> <PASS|FAIL|WARN> <detail>` line per check.

| Check             | Not passing means                                              | Fix                                                                 |
| ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `wdcli-installed` | FAIL: `wdcli` is not on `PATH`                                 | Install the Workday CLI, then **restart Claude Code**               |
| `wdcli-mcp`       | FAIL: this `wdcli` has no `mcp` command                        | Upgrade `wdcli`, then restart Claude Code                           |
| `wdcli-auth`      | FAIL: not signed in                                            | Call the `login_workday_extend` MCP tool, or run `wdcli auth login` |
| `ide-extension`   | WARN: `code`/`cursor` not on `PATH`, or extension not listed   | Install the Developer Agent extension in VS Code/Cursor             |
| `workday-dir`     | WARN: `~/.workday` is absent                                   | The extension has likely never run in this environment              |

The two IDE checks are soft signals only. `code`/`cursor` are often not on `PATH` even when the IDE
is installed, and in remote setups (WSL, devcontainers, Remote-SSH) the extension lives on the
remote side. Mention a WARN only if it lines up with what the user is seeing; otherwise the
`call_workday_developer_agent` tool's own error message is the authority on IDE and window problems.

The script does **not** check whether Claude Code currently has the MCP server connected — it can't
see that. Judge it yourself: if you have no `call_workday_developer_agent` tool in this session,
the server failed to spawn, and the caching note below applies.

## The caching note — say this to the user when it applies

`wdcli` is spawned as an MCP server at Claude Code **session start**. If it was missing or broken
then, Claude Code caches that failure and won't retry for ~15 minutes. So after any fix in the
`wdcli-installed` / `wdcli-mcp` rows, or when the MCP tools are missing, the user must **restart
Claude Code** — fixing the underlying problem in the current session is not enough. Do not tell them
to "just try again"; that will fail and waste their time.

Sign-in and IDE fixes take effect immediately — no restart needed.

## Reporting

Lead with the verdict, then the table. If everything passes but the user still reports a problem,
say so plainly and ask what the tool actually returned — do not invent a further diagnosis.
